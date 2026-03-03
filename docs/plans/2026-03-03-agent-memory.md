# Agent Memory Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add per-agent memory files so each custom agent persists learnings across sessions.

**Architecture:** Create `.claude/agents/memory/<agent>.md` files seeded with current project knowledge. Add `Write` tool to read-only agents. Append memory read/write instructions to all four agent system prompts.

**Tech Stack:** Markdown files, `.claude/agents/` frontmatter YAML

---

### Task 1: Create memory directory and seed system-architect memory

**Files:**
- Create: `.claude/agents/memory/system-architect.md`

**Step 1: Create the file**

```markdown
# System Architect Memory

## Decisions Made

- **EMPTY_STORE pattern** — Components that need a DocumentStore but must handle "no active tab" import `EMPTY_STORE` from `src/hooks/useDerivedState.ts`. Keeps Zustand hook calls unconditional (Rules of Hooks). Never write to EMPTY_STORE.
- **RecursionGraph is derived, not stored** — Recomputed via `useDerivedState` (debounced 150ms). Never persist it.
- **One Zustand store per tab** — Undo/redo scoped per document. `documentStoreRegistry` in `src/stores/document-store-registry.ts`.
- **Keyword matching is shared** — Lives in `services/simulator/keyword-matching.ts`. Never duplicate.
- **Services are pure functions** — Except LLMService (singleton). Data in, data out. State lives in Zustand.
- **Three-layer rubric assembly** — `defaultRubric` (filtered by disabled IDs) + workspace `customRules` + per-document `ruleOverrides`. Assembled in `useDerivedState`.
- **Graph positions bypass zundo** — Written via `store.setState(...)` directly. Dragging nodes IS undo-able (goes through immer+temporal).
- **Modal z-index hierarchy** — z-9999 portal tooltips, z-50 EntryWorkspace/SettingsDialog, z-40 LorebookWorkspace.

## Phase Status

- Phases 0–5: COMPLETE
- Phase 6 (LLM integration): NEXT
- Phase 7 (Polish/graph editing): Pending
- Phase 8 (Desktop/Tauri): Deferred

## Docs I Own

- `docs/ARCHITECTURE.md` — source of truth
- `docs/TYPES.md` — canonical type definitions
- `docs/CONVENTIONS.md` — coding standards
- `docs/PLAN.md` — phased implementation plan

## Known Drift / Things to Watch

- RoleCall format fields (`triggerMode`, `keywordObjects`, `triggerConditions`, `positionRoleCall`) only populated when `activeFormat === 'rolecall'`. Any new editor work must respect this.
- `CategorizeService` takes `llmService` as a parameter — stateless, not a provider manager.
- Custom rules use `SerializedEvaluation` JSON tree resolved by `evaluation-engine.ts`.
```

**Step 2: Commit**

```bash
git add .claude/agents/memory/system-architect.md
git commit -m "chore(agents): seed system-architect memory file"
```

---

### Task 2: Seed debugger-reviewer memory

**Files:**
- Create: `.claude/agents/memory/debugger-reviewer.md`

**Step 1: Create the file**

```markdown
# Debugger / Reviewer Memory

## TypeScript Gotchas (always check)

- `verbatimModuleSyntax: true` → must use `import type` for type-only imports
- `erasableSyntaxOnly: true` → no TypeScript parameter properties (`public readonly` in constructors)
- `noUnusedLocals` + `noUnusedParameters: true` → any unused variable is a compile error

## Recurring Bug Patterns

- **Undo boundary violations** — UI selection state leaking into zundo-tracked state, or undo-tracked state being written via `setState` bypassing temporal. Check: only `entries`, `graphPositions`, `bookMeta` are tracked by zundo.
- **Graph position writes** — Must use `store.setState(...)` directly (not immer action) to bypass zundo. Check `useDerivedState.ts` `persistMissingPositions`.
- **Stale closures in hooks** — Particularly in `useAutosave` and any debounced callback that closes over store state.
- **EMPTY_STORE misuse** — Components should read from `EMPTY_STORE` but never write to it. Flag any write path that could reach the empty store.
- **Keyword matching duplication** — Logic must live only in `services/simulator/keyword-matching.ts`. Any copy anywhere else is drift.

## Phase Review Summaries

- **Phase 5 (Persistence):** Clean. PersistenceService correctly isolated to IndexedDB. Autosave doesn't trigger unnecessary re-renders. Recovery dialog works.

## Known Hotspots

- `useDerivedState.ts` — complex logic for incremental graph updates, debounce, position persistence. Read carefully before signing off changes here.
- `document-store.ts` — partialize config determines what zundo tracks. Changes here affect undo/redo scope.
- `sillytavern-engine.ts` — keyword scan, selective logic, delay/cooldown/sticky/probability. Phase-specific focus area for Phase 4.
```

**Step 2: Commit**

```bash
git add .claude/agents/memory/debugger-reviewer.md
git commit -m "chore(agents): seed debugger-reviewer memory file"
```

---

### Task 3: Seed data-gatherer memory

**Files:**
- Create: `.claude/agents/memory/data-gatherer.md`

**Step 1: Create the file**

```markdown
# Data Gatherer Memory

## Key File Locations

| What | Where |
|------|-------|
| All types (re-exported) | `src/types/index.ts` |
| WorkingEntry, CCv3 types | `src/types/lorebook.ts` |
| Zustand stores | `src/stores/` |
| DocumentStore factory | `src/stores/document-store.ts` |
| DocumentStore registry | `src/stores/document-store-registry.ts` |
| WorkspaceStore | `src/stores/workspace-store.ts` |
| Store hooks | `src/stores/hooks.ts` |
| Services | `src/services/` |
| Shared keyword matching | `src/services/simulator/keyword-matching.ts` |
| Derived state + EMPTY_STORE | `src/hooks/useDerivedState.ts` |
| Graph components | `src/components/graph/` |
| Analysis components | `src/components/analysis/` |
| Simulator components | `src/components/simulator/` |
| CSS variables + themes | `src/styles/globals.css` |
| Shared utilities | `src/lib/` (uuid, debounce, token-estimate, cn, edge-edit, entry-badge, platform) |

## Stable Structural Notes

- `src/types/` is the single source of truth for types — never look for type definitions elsewhere
- Services are pure functions (stateless) except `LLMService` (singleton in WorkspaceStore)
- Components are organized by feature panel, not by type (no global `components/ui/` dumping ground beyond shadcn)
- `docs/ARCHITECTURE.md` maps service boundaries and data flows — read it first for any cross-service research

## Frequently Researched Patterns

- **Entry data flow:** `FileService` → `TransformService.inflate()` → `DocumentStore.entries[]` → components
- **Graph recomputation:** `entries` change → `useDerivedState` (debounced 150ms) → `GraphService.buildGraph()` or `incrementalUpdate()` → ReactFlow nodes/edges
- **Analysis flow:** `useDerivedState` → `AnalysisService.analyze(entries, rubric)` → findings stored in derived state (not persisted)
```

**Step 2: Commit**

```bash
git add .claude/agents/memory/data-gatherer.md
git commit -m "chore(agents): seed data-gatherer memory file"
```

---

### Task 4: Seed build-test-engineer memory

**Files:**
- Create: `.claude/agents/memory/build-test-engineer.md`

**Step 1: Create the file**

```markdown
# Build / Test Engineer Memory

## Commands

```bash
npm run build          # TypeScript compilation + Vite build
npm run test           # Vitest watch mode
npm run test -- --run  # Single run (no watch) — use this for CI-style checks
npm run lint           # ESLint
npx tsc --noEmit       # Type check only (fast, no emit)
```

## Test Suite State

- Phases 0–5 complete. 45+ tests passing as of Phase 2 baseline.
- Test files live alongside source in `src/` or in `src/__tests__/`
- Framework: Vitest + React Testing Library

## Known Quirks

- `npm run test` (watch mode) blocks — always use `-- --run` for automated checks
- TypeScript is strict: `verbatimModuleSyntax`, `erasableSyntaxOnly`, `noUnusedLocals`, `noUnusedParameters` — build fails on any violation

## Round-Trip Validation Pattern

For TransformService or FileService changes:
1. Import lorebook JSON fixture
2. `TransformService.inflate()` → `WorkingEntry[]`
3. `TransformService.deflate()` → CCv3
4. Serialize → JSON
5. Diff against original — flag data loss or field changes
```

**Step 2: Commit**

```bash
git add .claude/agents/memory/build-test-engineer.md
git commit -m "chore(agents): seed build-test-engineer memory file"
```

---

### Task 5: Add Write tool and memory instructions to data-gatherer

**Files:**
- Modify: `.claude/agents/data-gatherer.md`

**Step 1: Add `Write` to the tools frontmatter line**

Change:
```
tools: Read, Grep, Glob, LS, Bash(find:*), Bash(wc:*), Bash(head:*), Bash(tail:*), Bash(cat:*), Bash(git log:*), Bash(git diff:*)
```

To:
```
tools: Read, Write, Grep, Glob, LS, Bash(find:*), Bash(wc:*), Bash(head:*), Bash(tail:*), Bash(cat:*), Bash(git log:*), Bash(git diff:*)
```

**Step 2: Append memory instructions to the system prompt body**

Add at the end of the file:

```markdown
## Memory

At the start of every session, read `.claude/agents/memory/data-gatherer.md` and use it to orient yourself — frequently accessed files, known structural patterns, research shortcuts.

At the end of every session, update the file with new learnings. Save:
- Stable file paths and their roles that came up during research
- Structural patterns confirmed across multiple tasks
- Shortcuts that saved time (e.g., "this type is always found here")

Do NOT save:
- Session-specific task details or in-progress work
- Speculative conclusions from a single file read
- Anything that duplicates what's already written
```

**Step 3: Commit**

```bash
git add .claude/agents/data-gatherer.md
git commit -m "chore(agents): add Write tool and memory instructions to data-gatherer"
```

---

### Task 6: Add Write tool and memory instructions to debugger-reviewer

**Files:**
- Modify: `.claude/agents/debugger-reviewer.md`

**Step 1: Add `Write` to the tools frontmatter line**

Change:
```
tools: Read, Grep, Glob, LS, Bash(git:*), Bash(npm run test:*), Bash(npm run lint:*), Bash(npx tsc:*)
```

To:
```
tools: Read, Write, Grep, Glob, LS, Bash(git:*), Bash(npm run test:*), Bash(npm run lint:*), Bash(npx tsc:*)
```

**Step 2: Append memory instructions to the system prompt body**

Add at the end of the file:

```markdown
## Memory

At the start of every session, read `.claude/agents/memory/debugger-reviewer.md` and use it to orient yourself — known bug patterns, recurring drift, previous phase review summaries.

At the end of every session, update the file with new learnings. Save:
- New recurring bug patterns discovered
- Drift hotspots confirmed in this session
- Phase review summary (brief: what passed, what was flagged, how it was resolved)
- Any TypeScript/convention gotchas that tripped up implementation

Do NOT save:
- Session-specific task details
- Findings that were already fixed (resolved findings don't need to persist)
- Speculative issues that weren't confirmed
```

**Step 3: Commit**

```bash
git add .claude/agents/debugger-reviewer.md
git commit -m "chore(agents): add Write tool and memory instructions to debugger-reviewer"
```

---

### Task 7: Add memory instructions to system-architect

**Files:**
- Modify: `.claude/agents/system-architect.md`

**Step 1: Append memory instructions to the system prompt body**

Add at the end of the file:

```markdown
## Memory

At the start of every session, read `.claude/agents/memory/system-architect.md` and use it to orient yourself — previous decisions, current phase status, known drift, docs you own.

At the end of every session, update the file with new learnings. Save:
- Architecture decisions made and their rationale
- Drift detected and how it was resolved
- Phase milestones reached
- Design patterns added or changed

Do NOT save:
- Session-specific task details
- Decisions that were immediately reversed
- Speculative options that weren't chosen
```

**Step 2: Commit**

```bash
git add .claude/agents/system-architect.md
git commit -m "chore(agents): add memory instructions to system-architect"
```

---

### Task 8: Add memory instructions to build-test-engineer

**Files:**
- Modify: `.claude/agents/build-test-engineer.md`

**Step 1: Append memory instructions to the system prompt body**

Add at the end of the file:

```markdown
## Memory

At the start of every session, read `.claude/agents/memory/build-test-engineer.md` and use it to orient yourself — test suite health, known quirks, validated commands.

At the end of every session, update the file with new learnings. Save:
- New test failures that were diagnosed and their root cause
- Build quirks or command variations that were needed
- Test suite count / health changes after a phase

Do NOT save:
- Session-specific pass/fail details for tasks that are now complete
- Transient errors that were already resolved
```

**Step 2: Commit**

```bash
git add .claude/agents/build-test-engineer.md
git commit -m "chore(agents): add memory instructions to build-test-engineer"
```

---

### Task 9: Commit design doc

**Step 1: Commit**

```bash
git add docs/plans/2026-03-03-agent-memory-design.md docs/plans/2026-03-03-agent-memory.md
git commit -m "docs(plans): add agent memory design and implementation plan"
```
