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
