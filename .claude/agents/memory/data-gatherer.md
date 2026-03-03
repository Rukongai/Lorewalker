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
- Components are organized by feature panel, not by type
- `docs/ARCHITECTURE.md` maps service boundaries and data flows — read it first for any cross-service research

## Frequently Researched Patterns

- **Entry data flow:** `FileService` → `TransformService.inflate()` → `DocumentStore.entries[]` → components
- **Graph recomputation:** `entries` change → `useDerivedState` (debounced 150ms) → `GraphService.buildGraph()` or `incrementalUpdate()` → ReactFlow nodes/edges
- **Analysis flow:** `useDerivedState` → `AnalysisService.analyze(entries, rubric)` → findings stored in derived state (not persisted)
