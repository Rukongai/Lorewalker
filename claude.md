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
- **UI:** Tailwind CSS + shadcn/ui (dark mode default)
- **Persistence:** IndexedDB via idb-keyval or Dexie
- **Format I/O:** @character-foundry/character-foundry
- **Testing:** Vitest + React Testing Library
- **Desktop (deferred):** Tauri

## Key Architecture Concepts

- **WorkingEntry** is the core data type — a flattened representation of CCv3 lorebook entries optimized for editing. TransformService handles inflation/deflation.
- **One Zustand store per tab** — undo/redo is scoped per document. Don't share stores across tabs.
- **RecursionGraph is derived, not stored** — recomputed incrementally when entries change. Never persist it.
- **Keyword matching is shared** — defined in `services/simulator/keyword-matching.ts`, imported by both GraphService and SimulatorService. Never duplicate this logic.
- **Services are pure functions** (except LLMService which manages provider state). Data in, data out. State lives in Zustand stores.
- **Analysis rules** implement a uniform Rule interface regardless of whether they're deterministic or LLM-powered. The `requiresLLM` flag controls when they execute.
