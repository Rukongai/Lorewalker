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
