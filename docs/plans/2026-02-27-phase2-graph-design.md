# Phase 2: Graph Visualization — Design Document

**Date:** 2026-02-27
**Status:** Approved
**Phase:** 2 of 8

---

## Overview

Phase 2 adds the recursion graph canvas to the center panel. Entries become nodes, keyword-triggered activation links become directed edges. The graph is derived state — recomputed from entries via `GraphService`, never persisted directly.

---

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Graph layout library | dagre | Already specified in PLAN.md; simpler than elkjs; sufficient for lorebook-scale graphs |
| Derived state pattern | `useDerivedState` hook (Approach A) | Follows ARCHITECTURE.md; store stays simple; hook extends naturally in Phase 3 for findings |
| Initial layout behavior | Auto-layout immediately | Dagre runs the moment entries load; no manual trigger needed for first open |
| Node color scheme | By activation type | Purple=constant, blue=keyword, amber=selective, gray=disabled; maps directly to `WorkingEntry` fields without entity-type inference (deferred to Phase 7) |
| Edge routing | `getSmoothStepPath` | Clean routing for directed graphs |

---

## Service Layer

### `services/simulator/keyword-matching.ts`

Shared keyword matching module used by both GraphService (Phase 2) and SimulatorService (Phase 4). Pure functions, no state.

**Exports:**
- `matchKeywordsInText(text, entries, options: KeywordMatchOptions): KeywordMatch[]`
- `doesEntryMatchText(entry, text, options: KeywordMatchOptions): KeywordMatch[]`

**Match modes supported:**
- Exact substring (default)
- Case-insensitive (when `options.caseSensitive = false`)
- Whole-word boundary (regex `\b` wrapping)
- Regex keys: keys that start with `/` and end with `/` or `/flags` are treated as regex patterns

### `services/graph-service.ts`

Pure functions, no state. Data in, data out.

**Exports:**
- `buildGraph(entries: WorkingEntry[], options: KeywordMatchOptions): RecursionGraph`
  - Scans each entry's `content` for matches against all other entries' `keys`
  - Records `blockedByPreventRecursion: true` on edges where target has `preventRecursion: true`
  - No self-edges (entry cannot trigger itself)
- `incrementalUpdate(graph: RecursionGraph, changedEntry: WorkingEntry, allEntries: WorkingEntry[], options: KeywordMatchOptions, changeType: 'content' | 'keys'): RecursionGraph`
  - `content` changed: recompute only outgoing edges from that entry
  - `keys` changed: recompute all incoming edges to that entry (rescan all other entries' content)
- `findCycles(graph: RecursionGraph): CycleResult`
  - DFS-based cycle detection; returns `cycles: string[][]` (arrays of entryIds forming loops)
- `findOrphans(entries: WorkingEntry[], graph: RecursionGraph): string[]`
  - Entry IDs with no incoming edges, excluding constants
- `findDeadLinks(entries: WorkingEntry[], graph: RecursionGraph): DeadLink[]`
  - Names mentioned in content that don't match any entry's keys
- `computeLayout(entries: WorkingEntry[], graph: RecursionGraph, existingPositions?: Map<string, {x: number; y: number}>): Map<string, {x: number; y: number}>`
  - Wraps dagre; produces node positions for a left-to-right directed layout
  - If `existingPositions` has positions for ALL nodes, returns them unchanged (preserves manual layout)
  - Disconnected nodes (orphans, islands) are placed in a separate row below the main graph

---

## Derived State Hook

### `hooks/useDerivedState.ts`

```
useDerivedState(tabId: string) → { graph: RecursionGraph }
```

**Behavior:**
1. Subscribes to `entries` from DocumentStore
2. Debounces recomputation by 150ms
3. On entries change: compares entry IDs and changed fields to determine whether to call `buildGraph` (full) or `incrementalUpdate` (fast path)
4. After graph is computed: calls `computeLayout` with `store.graphPositions` as `existingPositions`
5. For any node with no existing position, calls `store.setGraphPosition()` to persist the auto-computed position
6. Returns `{ graph }` as local React state

**Incremental update logic:**
- Track previous entries via a ref
- If an entry was added or removed: full `buildGraph` rebuild
- If an entry's `content` changed: `incrementalUpdate` with `changeType: 'content'`
- If an entry's `keys` changed: `incrementalUpdate` with `changeType: 'keys'`
- If multiple entries changed: full rebuild (batched edits)

---

## UI Components

### `components/graph/GraphCanvas.tsx`

Main canvas component. Wraps `ReactFlow` from `@xyflow/react`.

- Calls `useDerivedState(tabId)` to get the graph
- Converts `RecursionGraph` + `graphPositions` from store → xyflow `Node[]` and `Edge[]` (memoized)
- Passes `nodeTypes={{ entryNode: EntryNode }}` and `edgeTypes={{ recursionEdge: RecursionEdge }}`
- On node drag end: calls `store.setGraphPosition(id, newPos)`
- On node click: calls `store.selectEntry(id)`
- Reads `store.selection.selectedEntryId` → sets `selected: true` on matching node (bidirectional sync)
- Calls `fitView()` after auto-layout via `useEffect` watching a layout-trigger ref
- Contains `<MiniMap>`, `<Controls>` (built-in zoom), and `<GraphControls>` (custom toolbar)

**Node → xyflow Node conversion:**
```
{ id, type: 'entryNode', position: graphPositions.get(id), data: { entry, isCyclic } }
```

**Edge → xyflow Edge conversion:**
```
{
  id: `${sourceId}→${targetId}`,
  source: sourceId,
  target: targetId,
  type: 'recursionEdge',
  data: { blocked: edgeMeta.blockedByPreventRecursion, isCyclic }
}
```

`isCyclic` is derived by calling `findCycles(graph)` and checking if source or target appears in any cycle.

### `components/graph/EntryNode.tsx`

Custom xyflow node component.

**Displays:**
- Entry name (max ~24 chars, truncated with ellipsis)
- Activation-type badge: `C` (constant, purple), `K` (keyword, blue), `S` (selective, amber), `D` (disabled, gray)
- Token count (small, muted)
- Health dot: gray circle placeholder (Phase 3 will fill with real severity color)
- Left border stripe colored by activation type
- `Handle` top (target) and bottom (source)

**Selection state:** node gets a ring/glow when `selected: true`

### `components/graph/RecursionEdge.tsx`

Custom xyflow edge component using `getSmoothStepPath`.

- Solid line, normal weight: active recursion link
- Dashed line (`strokeDasharray`): `blockedByPreventRecursion: true`
- Red color: edge is part of a cycle
- Default color: `edge-active` semantic token (blue-ish)
- Blocked-but-not-cyclic color: `edge-blocked` semantic token (gray)
- Animated arrow marker at target end

### `components/graph/GraphControls.tsx`

Small overlay toolbar on the canvas (top-right corner).

**Controls:**
- "Auto Layout" button: re-runs `computeLayout` ignoring all existing positions (full re-layout)
- "Fit View" button: calls `fitView()` via `useReactFlow()`
- Toggle: "Show Blocked Edges" (show/hide dashed preventRecursion edges)

---

## Tailwind Semantic Tokens

Add to `tailwind.config.ts` (or CSS variables in `globals.css`):

```
edge-active:    indigo-400 / indigo-500
edge-blocked:   gray-500 / gray-600
edge-cycle:     red-500 / red-600

node-constant:  purple-500
node-keyword:   indigo-500
node-selective: amber-500
node-disabled:  gray-500
```

---

## Integration Changes

### Files added (new):
- `src/services/simulator/keyword-matching.ts`
- `src/services/simulator/keyword-matching.test.ts`
- `src/services/graph-service.ts`
- `src/services/graph-service.test.ts`
- `src/hooks/useDerivedState.ts`
- `src/components/graph/GraphCanvas.tsx`
- `src/components/graph/EntryNode.tsx`
- `src/components/graph/RecursionEdge.tsx`
- `src/components/graph/GraphControls.tsx`

### Files modified (existing):
- `src/components/workspace/WorkspaceShell.tsx`: replace center panel placeholder with `<GraphCanvas />`
- `tailwind.config.ts`: add semantic color tokens (or extend `globals.css` CSS variables)

### Dependencies to install:
- `dagre` + `@types/dagre` (not yet in package.json)

### No changes to:
- Any Phase 1 files (stores, services, entry list, entry editor, tab bar)
- Type files (all required types already exist in `types/graph.ts`, `types/ui.ts`)

---

## Tests

### `keyword-matching.test.ts`
- Exact substring match (case-sensitive default)
- Case-insensitive match
- Whole-word boundary (doesn't match "dragon" when keyword is "drag")
- Regex key match (`/drag(on)?/i`)
- No match when content is empty
- No match when entry has empty keys
- Multiple matches returned when content contains multiple keywords

### `graph-service.test.ts`
- `buildGraph`: creates edges when content matches another entry's keys
- `buildGraph`: marks edge as blocked when target has `preventRecursion: true`
- `buildGraph`: does not create self-edges
- `buildGraph`: returns empty graph for entries with no cross-references
- `findCycles`: detects simple A→B→A cycle
- `findCycles`: detects longer cycle (A→B→C→A)
- `findCycles`: returns empty for acyclic graph
- `findOrphans`: excludes constants, excludes entries with incoming edges
- `incrementalUpdate` (content): changing content updates only outgoing edges
- `incrementalUpdate` (keys): changing keys triggers incoming edge rescan

---

## Milestone Check

Open a lorebook with known recursion links. Verify:
1. Graph renders with entries as nodes and links as edges
2. A known circular reference is highlighted red
3. A preventRecursion link appears dashed
4. Clicking a node in the graph selects the entry in the list and editor
5. Clicking an entry in the list highlights the corresponding graph node
6. Auto-layout runs on first open; manual drag positions persist across tab switches
7. "Auto Layout" button resets all positions to a fresh dagre layout
