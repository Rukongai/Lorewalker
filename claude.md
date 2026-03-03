# Lorewalker

Lorewalker is a local-first lorebook editor, visualizer, and analysis tool for AI roleplay platforms. It transforms flat JSON lorebook files into an interactive graph-based editing experience with health analysis and activation simulation.

## Before You Start

Read these files in `docs/` in order before making any changes:

1. `ARCHITECTURE.md` — Source of truth for system design. Every component, service boundary, data flow, and design decision is documented here. Consult it before making structural decisions.
2. `TYPES.md` — Canonical type definitions. Import from `src/types/`, never redefine.
3. `CONVENTIONS.md` — Coding standards, file structure, naming rules, state management patterns.
4. `PLAN.md` — Phased implementation plan with milestones and dependencies.
5. `AGENTS.md` — Agent team definitions. Use the right agent for the right job.

When you resume after a context reset, re-read `ARCHITECTURE.md`, check recent git history (`git log --oneline -20`), and run the test suite before continuing. The architecture doc is your primary anchor — trust it over memory.

## Working Principles

**Follow the architecture, don't improvise.** If logic doesn't have a clear home in `ARCHITECTURE.md`, that's a signal to propose an architecture update — not to stuff it somewhere convenient. Describe the issue and suggest a specific change.

**Minimum necessary changes.** Only make changes directly requested or clearly necessary for the current task. Don't add features, refactor code, create abstractions, or build in flexibility beyond what the task requires. The architecture already accounts for extensibility where it matters.

**Investigate before acting.** Never speculate about code you haven't read. If you reference a file, open it first. If you claim a function exists or behaves a certain way, verify by reading it.

**Commit as checkpoints.** Commit after each meaningful unit of work with descriptive messages following the convention in `CONVENTIONS.md` (`<scope>: <description>`). Commits are your recovery mechanism when context resets.

**Summarize progress.** After completing a task, briefly state what was done and what comes next. This aids context management and keeps work visible.

## Agent Usage

This project uses specialized agents. See `AGENTS.md` for full definitions.

**When to use agents:**
- Tasks that can run in parallel with independent contexts (multiple analysis rules, multiple UI components, multiple test files)
- Tasks requiring deep focused context that would bloat the main session (gathering codebase context, running full test suites)
- Code review and architecture compliance checks

**When NOT to use agents:**
- Sequential tasks where step 2 depends on step 1
- Single-file edits
- Tasks requiring shared state across multiple related changes
- Quick operations where agent overhead exceeds time saved

**Prefer swarms** when implementing independent, parallel work items (e.g., "implement all 7 keyword rules" → spawn agents for each rule or small batches).

## Tech Stack

- **Framework:** React + TypeScript + Vite
- **State:** Zustand + immer + zundo (undo/redo)
- **Graph:** @xyflow/react (React Flow v12)
- **Layout:** elkjs (ELK auto-layout for directed graphs)
- **UI:** Tailwind CSS + shadcn/ui (dark mode default, 14 theme options)
- **Persistence:** IndexedDB via idb-keyval
- **Format I/O:** @character-foundry/character-foundry
- **Testing:** Vitest + React Testing Library
- **Desktop (deferred):** Tauri

## Key Architecture Concepts

- **WorkingEntry** is the core data type — a flattened representation of CCv3 lorebook entries optimized for editing. TransformService handles inflation/deflation. Optional RoleCall fields (`triggerMode`, `keywordObjects`, `triggerConditions`, `positionRoleCall`) are populated only when `activeFormat === 'rolecall'`.

- **One Zustand store per tab** — undo/redo is scoped per document. Don't share stores across tabs. Only `entries`, `bookMeta`, and `graphPositions` are tracked by zundo. Graph positions are in the partialize list but writes bypass zundo via `store.setState(...)`.

- **EMPTY_STORE pattern** — Components that need a DocumentStore but must handle "no active tab" import `EMPTY_STORE` from `src/hooks/useDerivedState.ts` as a fallback. This keeps Zustand `useStore` calls unconditional (Rules of Hooks). Never write to `EMPTY_STORE`.

- **RecursionGraph is derived, not stored** — recomputed incrementally when entries change via `useDerivedState` (debounced 150ms). Never persist it.

- **Keyword matching is shared** — defined in `services/simulator/keyword-matching.ts`, imported by both GraphService and SimulatorService. Never duplicate this logic.

- **Services are pure functions** (except LLMService which manages provider instances). Data in, data out. State lives in Zustand stores. CategorizeService takes `llmService` as a parameter — it is stateless, not a provider manager.

- **Analysis rules** implement a uniform Rule interface regardless of whether they're deterministic or LLM-powered. The `requiresLLM` flag controls when they execute.

- **Three-layer rubric assembly** — Active rubric = `defaultRubric` (filtered by `WorkspaceStore.disabledBuiltinRuleIds`) + workspace-level `customRules` (via `customRuleToRule()` adapter) + per-document `ruleOverrides`. Assembled in `useDerivedState` before each analysis run. Never run analysis with just the default rubric.

- **Custom Rules System** — Users build rules visually via ConditionBuilder, which produces a `SerializedEvaluation` JSON tree. The `evaluation-engine.ts` resolves variable paths (e.g., `entry.keys.length`) against WorkingEntry fields at runtime. Custom rules are workspace-scoped with per-document overrides for disabling.

- **RoleCall format** — Two format families: standard (sillytavern/ccv3/agnai/risu/wyvern) and `rolecall`. `DocumentStore.activeFormat` determines which editor panels render. When `activeFormat === 'rolecall'`, EditorView loads RoleCall-specific variant fields from `features/editor/variants/rolecall/`.

## UI Patterns

- **Modal layering** — z-9999 for portal tooltips (never clipped), z-50 for EntryWorkspace and SettingsDialog (capture Escape + stopImmediatePropagation), z-40 for LorebookWorkspace (bubble Escape, blocked by z-50). New modals must follow this hierarchy. See ARCHITECTURE.md "Modal Layering Pattern".

- **Navigation delegation** — Components inside LorebookWorkspace use `onOpenEntry(entryId)` and `onSelectEntry(entryId)` callbacks from WorkspaceShell. They never import WorkspaceShell internals. See CONVENTIONS.md "Navigation Delegation".

- **LorebookWorkspace** — Large overlay (95vw × 90vh, z-40) with four tabs: health (findings + score + chain diagram), simulator (conversation + results), rules (built-in toggles + custom rule CRUD + editor), keywords (inventory table + reach table). This is where complex lorebook-wide workflows live.

- **Sidebar UX principle** — Edit is write; all other tabs are read-only analytical. The SidebarPanel has four tabs: Edit (entry fields + keyword editing), Health (findings, score, connections — read-only), Simulator (activation results — read-only), Keywords (keyword inventory + context — read-only). Keyword editing lives exclusively in the Edit tab via `KeywordEditor` inside `EditorView`. Never add mutation controls to Health, Simulator, or Keywords tabs.

- **Theme system** — 14 themes defined as CSS variable blocks in `globals.css`. ThemeId set as class on `<html>`. Color tokens use `--ctp-*` (palette), `--edge-*` (graph edges), `--node-*` (graph nodes). Light themes (`catppuccin-latte`, `nord-aurora`, `rose-pine-dawn`, `tokyo-night-day`) set React Flow `colorMode: 'light'`. Never use Tailwind `dark:` variant — use CSS variables.

- **Graph edge editing** — Users can drag-to-create edges (EdgeConnectDialog picks which keyword to add to source content) and delete edges (removes keyword mention). Helpers in `src/lib/edge-edit.ts`.

- **Shared utilities** — `getTypeBadge()` in `entry-badge.ts` for entry type badges (used in EntryListItem, EntryNode, EntryWorkspace), `modKey` in `platform.ts` for platform-aware shortcut labels, `severityColor()` for finding severity styling, `cn()` for Tailwind class merging. See CONVENTIONS.md "Shared Utility Patterns" before reimplementing any of these.

## Service Inventory (Quick Reference)

| Service | Owns | Stateful? |
|---------|------|-----------|
| FileService | Import, export, format detection, file dialogs | No |
| TransformService | CCv3 ↔ WorkingEntry[] conversion (both ST and RoleCall) | No |
| GraphService | Recursion graph, keyword matching, graph queries, ELK layout | No |
| AnalysisService | Health scoring, rule execution, finding generation | No |
| SimulatorService | Activation simulation, multi-message replay, engine management | No |
| LLMService | Provider management, API calls, cost estimation | Yes (singleton) |
| CategorizeService | LLM-powered entry categorization (8 fixed categories) | No |
| KeywordAnalysisService | Keyword inventory stats across all entries | No |
| PersistenceService | IndexedDB autosave, recovery, snapshots, preferences | No |