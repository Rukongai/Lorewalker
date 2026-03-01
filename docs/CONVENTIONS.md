# Lorewalker — Conventions

Standards for code style, file organization, error handling, and other patterns that keep the codebase consistent. Follow these unless there's a documented reason to deviate.

---

## File Structure

```
lorewalker/
├── public/
│   └── favicon.svg
├── src/
│   ├── main.tsx                          # App entry point
│   ├── App.tsx                           # Root component, workspace shell
│   │
│   ├── types/                            # Canonical type definitions
│   │   ├── index.ts                      # Re-exports everything
│   │   ├── entry.ts                      # WorkingEntry, BookMeta, enums
│   │   ├── graph.ts                      # RecursionGraph, EdgeMeta, query results
│   │   ├── analysis.ts                   # Rule, Finding, HealthScore, Rubric
│   │   ├── simulator.ts                  # SimulationContext, ActivationResult, engine types
│   │   ├── llm.ts                        # LLMProvider, CompletionRequest/Response
│   │   ├── persistence.ts                # Persisted* types
│   │   └── ui.ts                         # FileMeta, TabMeta, filters, layout
│   │
│   ├── services/                         # Business logic, no React dependencies
│   │   ├── file-service.ts
│   │   ├── transform-service.ts
│   │   ├── graph-service.ts
│   │   ├── analysis-service.ts
│   │   ├── simulator-service.ts
│   │   ├── llm-service.ts
│   │   └── persistence-service.ts
│   │
│   ├── services/analysis/                # Analysis rules organized by category
│   │   ├── rules/
│   │   │   ├── structure-rules.ts
│   │   │   ├── config-rules.ts
│   │   │   ├── keyword-rules.ts
│   │   │   ├── recursion-rules.ts
│   │   │   ├── budget-rules.ts
│   │   │   └── content-rules.ts          # LLM-powered rules
│   │   ├── default-rubric.ts
│   │   └── scoring.ts                    # Health score computation
│   │
│   ├── services/simulator/               # Activation engines
│   │   ├── engines/
│   │   │   └── sillytavern-engine.ts
│   │   └── keyword-matching.ts           # Shared matching logic
│   │
│   ├── services/llm/                     # LLM provider implementations
│   │   ├── providers/
│   │   │   ├── openai-compatible.ts
│   │   │   └── anthropic.ts
│   │   └── prompt-templates.ts           # Reusable prompt fragments
│   │
│   ├── stores/                           # Zustand stores
│   │   ├── workspace-store.ts
│   │   ├── document-store.ts             # Factory function, creates per-tab stores
│   │   └── hooks.ts                      # Custom hooks for store access
│   │
│   ├── components/                       # React components
│   │   ├── workspace/                    # Shell, tab bar, menu
│   │   │   ├── WorkspaceShell.tsx
│   │   │   ├── TabBar.tsx
│   │   │   └── GlobalActions.tsx
│   │   │
│   │   ├── entry-list/                   # Left panel
│   │   │   ├── EntryList.tsx
│   │   │   ├── EntryListItem.tsx
│   │   │   └── EntryListFilter.tsx
│   │   │
│   │   ├── graph/                        # Center panel
│   │   │   ├── GraphCanvas.tsx
│   │   │   ├── EntryNode.tsx             # Custom xyflow node
│   │   │   ├── RecursionEdge.tsx         # Custom xyflow edge
│   │   │   └── GraphControls.tsx
│   │   │
│   │   ├── editor/                       # Entry form editor
│   │   │   ├── EntryEditor.tsx
│   │   │   ├── KeywordInput.tsx
│   │   │   ├── ContentEditor.tsx
│   │   │   └── FieldGroup.tsx
│   │   │
│   │   ├── analysis/                     # Analysis panel
│   │   │   ├── AnalysisPanel.tsx
│   │   │   ├── HealthBadge.tsx
│   │   │   ├── FindingList.tsx
│   │   │   └── FindingItem.tsx
│   │   │
│   │   ├── simulator/                    # Simulator panel
│   │   │   ├── SimulatorPanel.tsx
│   │   │   ├── MessageInput.tsx
│   │   │   ├── SimulatorSettings.tsx
│   │   │   ├── ActivationResults.tsx
│   │   │   └── RecursionTrace.tsx
│   │   │
│   │   ├── inspector/                    # Inspector panel
│   │   │   └── InspectorPanel.tsx
│   │   │
│   │   ├── settings/                     # Settings dialog
│   │   │   ├── SettingsDialog.tsx
│   │   │   ├── ProviderSettings.tsx
│   │   │   └── PreferenceSettings.tsx
│   │   │
│   │   └── shared/                       # Reusable UI primitives
│   │       ├── SeverityBadge.tsx
│   │       ├── TokenCounter.tsx
│   │       └── ConfirmDialog.tsx
│   │
│   ├── hooks/                            # Custom React hooks
│   │   ├── useAutosave.ts
│   │   ├── useFileImport.ts
│   │   ├── useFileExport.ts
│   │   ├── useDerivedState.ts            # Graph + analysis recomputation
│   │   └── useKeyboardShortcuts.ts
│   │
│   ├── lib/                              # Pure utility functions
│   │   ├── uuid.ts
│   │   ├── debounce.ts
│   │   └── token-estimate.ts
│   │
│   └── styles/                           # Global styles, theme
│       ├── globals.css
│       └── theme.ts
│
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── ARCHITECTURE.md
├── AGENTS.md
├── PLAN.md
├── CONVENTIONS.md
├── TYPES.md
└── PROJECT-BRIEF.md
```

---

## Naming Conventions

### Files

- **Components:** PascalCase, `.tsx` extension. One component per file. File name matches component name. `EntryEditor.tsx` exports `EntryEditor`.
- **Services:** kebab-case, `.ts` extension. `graph-service.ts` exports functions or a class.
- **Types:** kebab-case, `.ts` extension. `entry.ts` exports types/interfaces.
- **Hooks:** camelCase prefixed with `use`, `.ts` extension. `useAutosave.ts` exports `useAutosave`.
- **Tests:** Same name as the file being tested, `.test.ts` or `.test.tsx` suffix. Co-located next to the file being tested.

### Code

- **Types/Interfaces:** PascalCase. `WorkingEntry`, `RecursionGraph`, `Finding`.
- **Functions:** camelCase. `buildGraph`, `matchKeywordsInText`, `inflateEntry`.
- **Constants:** UPPER_SNAKE_CASE only for true constants (magic numbers, config defaults). Otherwise camelCase.
- **Enum-like types:** Use TypeScript union types, not enums. `type Severity = 'error' | 'warning' | 'suggestion'`.
- **Boolean variables:** Prefix with `is`, `has`, `can`, `should` where it improves clarity. `isDirty`, `hasLLMProvider`, `canUndo`.
- **Event handlers in components:** Prefix with `handle`. `handleEntrySelect`, `handleSave`.
- **Callback props:** Prefix with `on`. `onEntrySelect`, `onSave`.

### IDs

- **Entry IDs (internal):** UUID v4, generated by TransformService on import. Stable across edits within a session.
- **Entry UIDs (format-specific):** Numeric, reconstructed by TransformService on export. Not used internally except for round-trip.
- **Tab IDs:** UUID v4, generated by WorkspaceStore on tab creation.
- **Finding IDs:** UUID v4, generated by AnalysisService per finding instance.
- **Edge keys in RecursionGraph.edgeMeta:** String format `"${sourceId}→${targetId}"`. Use the arrow character, not `->`.

---

## Component Conventions

### Component Structure

```typescript
// 1. Imports (React, libraries, local)
import { useState, useCallback } from 'react';
import { useDocumentStore } from '@/stores/hooks';
import type { WorkingEntry } from '@/types';

// 2. Props interface (if the component takes props)
interface EntryEditorProps {
  entryId: string;
  onClose: () => void;
}

// 3. Component
export function EntryEditor({ entryId, onClose }: EntryEditorProps) {
  // hooks first
  // derived values
  // handlers
  // render
}
```

- Use function declarations, not arrow functions, for components.
- Export components as named exports, not default exports.
- Props interface is defined in the same file, directly above the component.
- Do not destructure store selectors inline — use a named selector for readability.

### Store Access

```typescript
// Good: named selector, minimal subscription
const entries = useDocumentStore(state => state.entries);
const updateEntry = useDocumentStore(state => state.updateEntry);

// Bad: subscribes to entire store, re-renders on any change
const store = useDocumentStore();
```

### Component Size

If a component exceeds ~200 lines, it likely needs to be split. Extract logical sub-sections into child components. The parent orchestrates, children render.

---

## Service Conventions

### Pure Functions Preferred

Services should export pure functions whenever possible. State lives in Zustand stores, not in services. A service function takes data in and returns data out.

```typescript
// Good: pure function
export function buildGraph(entries: WorkingEntry[]): RecursionGraph { ... }

// Acceptable: needs external dependency (LLM)
export async function evaluateContentQuality(
  entries: WorkingEntry[],
  llmService: LLMService
): Promise<Finding[]> { ... }

// Bad: service holds mutable state
class GraphService {
  private graph: RecursionGraph;  // Don't do this
}
```

Exception: LLMService manages provider instances and their configurations. This is acceptable because providers have identity (configured API keys, base URLs) that belongs with the service, not in a React store.

### Error Handling

Services throw typed errors. UI components catch and display them.

```typescript
// Define specific error types per service
export class FileImportError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
    public readonly fileName?: string
  ) {
    super(message);
    this.name = 'FileImportError';
  }
}

// Services throw these
export function importFile(file: File): WorkingEntry[] {
  try {
    const buffer = /* read file */;
    const { book } = parseLorebook(buffer);
    return inflate(book);
  } catch (err) {
    throw new FileImportError(
      `Failed to parse ${file.name}: unsupported format or invalid JSON`,
      err,
      file.name
    );
  }
}
```

Never swallow errors silently. If a function can fail, it either throws or returns a result type. Do not use `try/catch` to hide failures.

### Async Patterns

- Use async/await, not raw promises.
- LLM calls and file reads are the primary async operations. Everything else should be synchronous.
- Never `await` inside a Zustand action. Perform async work outside the store, then call a synchronous store action with the result.

---

## State Conventions

### What Goes in Stores

- **WorkspaceStore:** Tab list, active tab, theme. Global, singleton.
- **DocumentStore (per tab):** Entries, graph positions, book metadata, selection, simulator state. Created/destroyed with tabs.
- **Derived state:** Graph, findings, health score. Computed by hooks, not stored. Recomputed when dependencies change.

### What Does NOT Go in Stores

- LLM provider configurations → PersistenceService (IndexedDB)
- File system state → FileService (ephemeral)
- Transient UI state (dropdown open, tooltip visible) → Component-local useState

### Undo Boundary

Only these fields are tracked by zundo (undo/redo):
- `entries`
- `bookMeta`

Everything else (selection, filters, simulator state, graph positions) is excluded. Selection is excluded because undo-ing a selection is confusing. Simulator state is excluded because it's exploratory. Graph positions (`graphPositions`) are excluded because they are cosmetic/layout state — position writes always use `store.setState(...)` to bypass temporal.

### Batching

Multiple entry changes that represent one logical operation must be batched into a single store update (one undo step).

```typescript
// Good: single undo step for "fix all keyword warnings"
store.batchUpdate(new Map([
  [id1, { keys: [...] }],
  [id2, { keys: [...] }],
  [id3, { keys: [...] }],
]));

// Bad: three undo steps
store.updateEntry(id1, { keys: [...] });
store.updateEntry(id2, { keys: [...] });
store.updateEntry(id3, { keys: [...] });
```

---

## Styling Conventions

### Tailwind + shadcn/ui

- Use Tailwind utility classes for layout, spacing, sizing, colors.
- Use shadcn/ui components for interactive elements (buttons, inputs, selects, dialogs, tabs, tooltips).
- Do not write custom CSS unless Tailwind cannot express the style (rare).
- Do not use inline `style` props unless absolutely necessary (dynamic values from state, like panel widths from drag-resize).

### Dark Mode

Dark mode is the default. Use Tailwind's `dark:` variant for any light-mode overrides. The theme class is set on `<html>` and toggled by WorkspaceStore.

### Color Semantics

Define semantic color tokens in the Tailwind config, not raw color values in components.

```
// In tailwind config, extend theme:
health-error:    red
health-warning:  amber/yellow
health-ok:       green
health-info:     blue

edge-active:     color for active recursion edges
edge-blocked:    color for preventRecursion-blocked edges
edge-cycle:      color for circular reference edges

entry-constant:  badge color for constant entries
entry-keyword:   badge color for keyword entries
entry-selective: badge color for selective entries
entry-disabled:  badge color for disabled entries
```

### Spacing

Use Tailwind's default spacing scale. Don't invent custom spacing values. If the default scale doesn't work, the design needs adjustment, not the scale.

---

## Testing Conventions

### What to Test

- **Services:** Unit test all pure functions. Test edge cases for keyword matching, graph computation, analysis rules, and the activation simulator.
- **Transform:** Test inflate/deflate round-trip fidelity. For each supported format, a test should parse → inflate → deflate → serialize and verify the output matches expectations.
- **Analysis rules:** Each rule gets its own test with entries crafted to trigger and not trigger the rule.
- **Simulator engine:** Test each step of the activation loop. Test known scenarios against expected activation results.
- **Components:** Test complex interactive components (entry editor validation, graph canvas interactions). Don't test trivial display components.

### Test Structure

```typescript
describe('buildGraph', () => {
  it('creates edges when content matches keywords', () => { ... });
  it('marks edges as blocked when target has preventRecursion', () => { ... });
  it('handles case-insensitive matching', () => { ... });
  it('handles regex keywords', () => { ... });
  it('returns empty graph for entries with no cross-references', () => { ... });
});
```

### Test Files

Co-located with source: `graph-service.ts` → `graph-service.test.ts` in the same directory.

### Test Framework

Vitest (ships with Vite). React Testing Library for component tests.

---

## Import Conventions

### Path Aliases

Use `@/` as the path alias for `src/`.

```typescript
import type { WorkingEntry } from '@/types';
import { buildGraph } from '@/services/graph-service';
import { EntryEditor } from '@/components/editor/EntryEditor';
```

### Import Order

1. React / library imports
2. Local types (import type)
3. Local services / utilities
4. Local components
5. Local styles

Separated by blank lines between groups.

### Type-Only Imports

Always use `import type` for type-only imports. This ensures types are erased at compile time and prevents circular dependency issues.

```typescript
import type { WorkingEntry, RecursionGraph } from '@/types';
import { buildGraph } from '@/services/graph-service';
```

---

## Git Conventions

### Commit Messages

Format: `<scope>: <description>`

Scopes: `file`, `transform`, `graph`, `analysis`, `simulator`, `llm`, `persist`, `ui`, `types`, `config`, `docs`, `test`

Examples:
- `graph: implement cycle detection`
- `analysis: add keyword overlap rule`
- `ui: entry editor form validation`
- `types: add SimulatorState interface`
- `config: vite + tailwind setup`

### Branching

- `main`: stable, passes all tests
- Feature branches: `feature/<scope>-<description>`, e.g., `feature/graph-cycle-detection`

### Commit Frequency

Commit after each meaningful unit of work. A commit should represent a coherent change that could be understood in isolation. Don't accumulate a day's work in one commit, and don't commit every single line change.
