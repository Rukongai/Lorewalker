# Background Task Service

## Problem

Long-running LLM operations (deep analysis, bulk categorization, future LLM tasks) block the user because they're tied to modal UI that has to stay open. Users wait 5–15 minutes staring at a spinner instead of continuing to edit. This is the single biggest usability issue with the deep analysis feature.

## Solution

A general-purpose background task runner in `packages/core` that decouples task execution from UI. Tasks run asynchronously, report progress to a Zustand store, and deposit results where consuming features already look for them. Users keep working while tasks run. A persistent status bar shows progress without blocking any UI.

---

## Architecture

### Core Layer (packages/core)

```
packages/core/src/
├── tasks/
│   ├── task-runner.ts           — TaskRunner: queue, execute, cancel, progress
│   ├── task-store.ts            — Zustand store for task state
│   ├── task-types.ts            — TaskDefinition, TaskStatus, TaskProgress interfaces
│   ├── definitions/
│   │   ├── deep-analysis.ts     — DeepAnalysisTask definition
│   │   ├── bulk-categorize.ts   — BulkCategorizeTask definition
│   │   └── index.ts             — task registry
│   └── index.ts                 — barrel export
```

### Web Layer (packages/web)

```
packages/web/src/
├── components/
│   └── TaskStatusBar.tsx        — persistent bottom bar + dropdown
```

### Mobile Layer (packages/mobile)

```
packages/mobile/src/
├── components/
│   └── TaskStatusBar.tsx        — React Native equivalent
```

---

## Types

```typescript
// task-types.ts

type TaskId = string;  // uuid

type TaskType = 'deep-analysis' | 'bulk-categorize';
// New task types added here as the system grows

type TaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

interface TaskProgress {
  current: number;        // items completed
  total: number;          // total items
  percent: number;        // 0–100, derived
  currentItem?: string;   // human-readable: "Analyzing: Kafka" or "Categorizing: Astral Express"
  startedAt: number;      // timestamp
  estimatedRemaining?: number;  // ms, computed from rate
}

interface TaskResult {
  type: TaskType;
  success: boolean;
  summary: string;        // "Analyzed 47 entries, found 12 new findings"
  errorMessage?: string;  // if failed
  navigateTo?: string;    // feature/tab to open for results: 'health', 'insights', etc.
  documentId?: string;    // which document the results belong to
}

interface TaskState {
  id: TaskId;
  type: TaskType;
  label: string;          // "Deep Analysis — MyLorebook.json"
  status: TaskStatus;
  progress: TaskProgress;
  result?: TaskResult;
  createdAt: number;
  completedAt?: number;
}

interface TaskDefinition<TParams = unknown> {
  type: TaskType;
  label: (params: TParams) => string;
  estimateTotal: (params: TParams) => number;
  execute: (
    params: TParams,
    context: TaskContext
  ) => Promise<TaskResult>;
}

interface TaskContext {
  reportProgress: (current: number, currentItem?: string) => void;
  isCancelled: () => boolean;
  llmService: LLMService;
}
```

---

## TaskRunner

```typescript
// task-runner.ts

class TaskRunner {
  private activeTasks: Map<TaskId, AbortController> = new Map();
  private concurrencyLimit: number = 1;  // LLM operations are rate-limited, serialize by default

  /**
   * Submit a task. Returns immediately with a TaskId.
   * Task executes in the background. Progress updates flow through TaskStore.
   */
  submit<TParams>(
    definition: TaskDefinition<TParams>,
    params: TParams,
    llmService: LLMService
  ): TaskId;

  /**
   * Cancel a running task. Sets isCancelled flag, task checks on next iteration.
   * Does not abort mid-LLM-call — waits for current item to finish, then stops.
   */
  cancel(taskId: TaskId): void;

  /**
   * Remove a completed/failed/cancelled task from the store.
   */
  dismiss(taskId: TaskId): void;

  /**
   * Cancel all running tasks. Used on document close / app shutdown.
   */
  cancelAll(): void;
}
```

### Concurrency

Default concurrency is 1 — LLM API calls are rate-limited and serializing prevents hitting provider limits. If a user submits a second task while one is running, it queues. The queue is visible in the status bar.

Future: concurrency can be increased per task type if non-LLM tasks are added (e.g., a batch export task that's purely local computation).

### Cancellation Pattern

Tasks are cooperative-cancellation. The runner sets a flag, the task checks `isCancelled()` between items:

```typescript
// Inside a task's execute function
for (const entry of entries) {
  if (context.isCancelled()) {
    return { type: 'deep-analysis', success: false, summary: `Cancelled after ${i} of ${total} entries` };
  }
  const result = await analyzeEntry(entry, context.llmService);
  context.reportProgress(i + 1, entry.name);
}
```

This means cancellation is not instant — it finishes the current LLM call, then stops. The status bar shows "Cancelling..." during this window.

### Estimated Time Remaining

Computed from rolling average of per-item duration:

```typescript
const elapsed = Date.now() - progress.startedAt;
const rate = progress.current / elapsed;  // items per ms
const remaining = (progress.total - progress.current) / rate;
```

Updated every progress tick. Not shown for the first 3 items (not enough data for a reliable estimate).

---

## TaskStore

```typescript
// task-store.ts

interface TaskStoreState {
  tasks: Map<TaskId, TaskState>;

  // Actions
  addTask: (task: TaskState) => void;
  updateProgress: (taskId: TaskId, progress: Partial<TaskProgress>) => void;
  updateStatus: (taskId: TaskId, status: TaskStatus, result?: TaskResult) => void;
  removeTask: (taskId: TaskId) => void;
  clearCompleted: () => void;

  // Derived
  activeTasks: () => TaskState[];       // running + queued
  hasActiveTasks: () => boolean;        // controls status bar visibility
  completedTasks: () => TaskState[];    // completed + failed + cancelled, most recent first
}
```

This is a standalone Zustand store in core — not part of WorkspaceStore or DocumentStore. Tasks are transient (not persisted to IndexedDB). If the app closes, running tasks are lost. This is acceptable because:
- LLM results are written to DocumentStore incrementally (each analyzed entry updates immediately)
- Restarting a cancelled/interrupted deep analysis skips already-analyzed entries
- Persisting task queue state adds complexity for minimal benefit

---

## Task Definitions

### Deep Analysis

```typescript
// definitions/deep-analysis.ts

interface DeepAnalysisParams {
  documentId: string;
  entries: WorkingEntry[];
  bookMeta: BookMeta;
  rubric: AssembledRubric;
  skipAlreadyAnalyzed: boolean;  // true by default — skip entries with existing LLM findings
}

const deepAnalysisTask: TaskDefinition<DeepAnalysisParams> = {
  type: 'deep-analysis',
  label: (params) => `Deep Analysis — ${params.entries.length} entries`,
  estimateTotal: (params) => {
    if (params.skipAlreadyAnalyzed) {
      return params.entries.filter(e => !hasExistingLlmFindings(e)).length;
    }
    return params.entries.length;
  },
  execute: async (params, context) => {
    const { entries, bookMeta, rubric, skipAlreadyAnalyzed } = params;
    const toAnalyze = skipAlreadyAnalyzed
      ? entries.filter(e => !hasExistingLlmFindings(e))
      : entries;
    
    let analyzed = 0;
    let newFindings = 0;

    for (const entry of toAnalyze) {
      if (context.isCancelled()) {
        return {
          type: 'deep-analysis',
          success: false,
          summary: `Cancelled after ${analyzed} of ${toAnalyze.length} entries (${newFindings} findings)`,
          navigateTo: 'health',
          documentId: params.documentId,
        };
      }

      const findings = await runLlmAnalysis(entry, bookMeta, rubric, context.llmService);
      newFindings += findings.length;
      
      // Write findings immediately — user sees results incrementally
      writeEntryFindings(params.documentId, entry.id, findings);
      
      analyzed++;
      context.reportProgress(analyzed, entry.name);
    }

    return {
      type: 'deep-analysis',
      success: true,
      summary: `Analyzed ${analyzed} entries, found ${newFindings} findings`,
      navigateTo: 'health',
      documentId: params.documentId,
    };
  },
};
```

### Bulk Categorize

```typescript
// definitions/bulk-categorize.ts

interface BulkCategorizeParams {
  documentId: string;
  entries: WorkingEntry[];
  skipAlreadyCategorized: boolean;
}

const bulkCategorizeTask: TaskDefinition<BulkCategorizeParams> = {
  type: 'bulk-categorize',
  label: (params) => `Categorize — ${params.entries.length} entries`,
  estimateTotal: (params) => {
    if (params.skipAlreadyCategorized) {
      return params.entries.filter(e => !e.userCategory).length;
    }
    return params.entries.length;
  },
  execute: async (params, context) => {
    const toProcess = params.skipAlreadyCategorized
      ? params.entries.filter(e => !e.userCategory)
      : params.entries;
    
    let processed = 0;

    for (const entry of toProcess) {
      if (context.isCancelled()) {
        return {
          type: 'bulk-categorize',
          success: false,
          summary: `Cancelled after ${processed} of ${toProcess.length} entries`,
          documentId: params.documentId,
        };
      }

      const category = await categorizeEntry(entry, context.llmService);
      writeCategoryResult(params.documentId, entry.id, category);
      
      processed++;
      context.reportProgress(processed, entry.name);
    }

    return {
      type: 'bulk-categorize',
      success: true,
      summary: `Categorized ${processed} entries`,
      documentId: params.documentId,
    };
  },
};
```

### Adding New Task Types

1. Add the type string to the `TaskType` union
2. Create a file in `definitions/` implementing `TaskDefinition<YourParams>`
3. Register it in `definitions/index.ts`
4. Wire the trigger button to call `taskRunner.submit(yourTask, params, llmService)`

No changes to TaskRunner, TaskStore, or status bar UI needed.

---

## Status Bar UI

### Behavior

- **Hidden** when no tasks exist (active or recently completed)
- **Visible** when any task is running, queued, completed, failed, or cancelled
- **Persistent** — fixed to the bottom of the viewport, above all content, below modals
- **Collapsed state** — single line: icon + most relevant task status + count if multiple
- **Expanded state** — dropdown (upward) showing all tasks

### Collapsed State

```
[spinner] Deep Analysis — 23/47 entries · ~2:30 remaining        [v]
```

or if multiple tasks:

```
[spinner] 2 tasks running · 1 completed                          [v]
```

or if all done:

```
[check] Deep Analysis complete — 47 entries, 12 findings    [Go to results] [x]
```

### Expanded State (dropdown opens upward)

```
┌─────────────────────────────────────────────────────────────────┐
│ TASKS                                                    [Clear all] │
│                                                                 │
│ [spinner] Deep Analysis — MyLorebook.json                       │
│           23 of 47 · Analyzing: Kafka · ~2:30 remaining         │
│           ████████████░░░░░░░░░░                    [Cancel]    │
│                                                                 │
│ [queued]  Categorize — MyLorebook.json                          │
│           Queued (waiting for Deep Analysis)            [Cancel] │
│                                                                 │
│ [check]   Categorize — OtherBook.json — Completed               │
│           Categorized 34 entries                [Go to results] │
│                                                                 │
│ [x]       Deep Analysis — OldBook.json — Failed                 │
│           Error: API rate limit exceeded after 12 entries        │
│                                                    [Retry] [x]  │
└─────────────────────────────────────────────────────────────────┘
```

### Web z-index

Status bar: `z-30` (below lorebook workspace z-40, below entry workspace z-50, below tooltips z-[9999]). Dropdown: `z-35`. This keeps it visible during normal editing but doesn't overlay modals.

### Mobile

Same concept, adapted to React Native: a bottom bar above the tab navigator. Tapping expands an animated sheet showing task list. Same data, same TaskStore subscription, different rendering.

---

## Integration Points

### Where tasks are triggered

| Task | Current trigger | New trigger |
|------|----------------|-------------|
| Deep Analysis | DeepAnalysisTrigger button (in HealthView) | Same button, but calls `taskRunner.submit()` instead of inline async |
| Bulk Categorize | Categorize All button (in InsightsView) | Same button, calls `taskRunner.submit()` |

The trigger buttons change from "start async operation and show spinner in this component" to "submit to task runner and close/continue." The button can show the task status inline too ("Running... 23/47") by subscribing to TaskStore for its task type.

### Where results land

Deep analysis findings → written to DocumentStore incrementally via `writeEntryFindings()`. HealthView already subscribes to DocumentStore findings. Results appear in real-time as each entry is analyzed.

Bulk categorization → written to DocumentStore incrementally via `writeCategoryResult()`. Entry list already re-renders on category changes.

No new wiring needed for results. The consuming features already react to DocumentStore changes.

### Incremental writes

Both task definitions write results per-entry, not at the end. If a task is cancelled after 30 of 50 entries, 30 entries have results. Rerunning with `skipAlreadyAnalyzed: true` picks up where it left off.

---

## Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Core service, not web worker | LLM calls are I/O-bound, not CPU-bound. Web workers add complexity (message passing, serialization) for no performance benefit. Both platforms use the same async code. |
| 2 | Cooperative cancellation | Can't abort a mid-flight LLM API call cleanly. Checking between items is reliable and simple. |
| 3 | Default concurrency 1 | LLM providers rate-limit. Parallel calls would either fail or cost more. Serialize by default, allow override per task type later. |
| 4 | Transient task state (not persisted) | Results are persisted incrementally to DocumentStore. Task queue state is cheap to reconstruct. Persistence adds complexity for a feature that runs for minutes, not days. |
| 5 | Standalone Zustand store | Tasks are cross-document (you could analyze one lorebook while editing another). Doesn't belong in DocumentStore (per-tab) or WorkspaceStore (UI state). |
| 6 | Status bar at z-30 | Below all modals (z-40, z-50) so it doesn't interfere, above normal content so it's always visible during editing. |
| 7 | Incremental result writes | User sees results appearing in real-time. Cancellation doesn't lose work. Skip-already-analyzed enables resume. |
| 8 | Task definitions are data + function | Adding a new task type doesn't touch the runner, store, or UI. Just define params, estimate, and execute. Register it. Wire a button. |

---

## Implementation Order

1. **Types + TaskStore** — types, store, no execution yet. Test store state transitions.
2. **TaskRunner** — submit, cancel, progress reporting, concurrency queue. Test with a mock task definition.
3. **Deep Analysis task definition** — extract current inline deep analysis logic into the task definition pattern. Wire DeepAnalysisTrigger to submit.
4. **Bulk Categorize task definition** — same extraction for the categorize flow.
5. **Web TaskStatusBar** — collapsed bar, expanded dropdown, cancel/dismiss/go-to-results interactions.
6. **Mobile TaskStatusBar** — React Native equivalent.
7. **Remove old inline async** — delete the modal-blocking spinner patterns from HealthView and InsightsView.