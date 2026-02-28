# Phase 2: Graph Visualization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the recursion graph canvas — entries as nodes, keyword-triggered links as directed edges, auto-layout via dagre, bidirectional selection sync.

**Architecture:** `GraphService` (pure functions) computes the `RecursionGraph` from `WorkingEntry[]` using shared keyword matching. `useDerivedState` hook subscribes to entries, recomputes the graph with debounce, and auto-persists layout positions. `GraphCanvas` renders the graph using `@xyflow/react` with custom `EntryNode` and `RecursionEdge` components.

**Tech Stack:** `@xyflow/react` v12 (already installed), `dagre` + `@types/dagre` (to install), Vitest for tests, Tailwind CSS for styling, Zustand DocumentStore for positions and selection.

**Design doc:** `docs/plans/2026-02-27-phase2-graph-design.md`

---

## Pre-Flight

Before starting any task, confirm the project builds and tests pass:
```bash
cd /Users/josephrankin/projects/RP/Lorewalker
npm test
npm run build
```
Both should succeed. If not, fix before proceeding.

---

### Task 1: Install dagre

**Files:**
- Modify: `package.json` (via npm install)

**Step 1: Install**

```bash
npm install dagre
npm install --save-dev @types/dagre
```

**Step 2: Verify**

```bash
node -e "const dagre = require('dagre'); console.log('dagre ok:', typeof dagre.graphlib.Graph)"
```
Expected: `dagre ok: function`

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "config: install dagre for graph layout"
```

---

### Task 2: Keyword Matching — Tests

**Files:**
- Create: `src/services/simulator/keyword-matching.ts`
- Create: `src/services/simulator/keyword-matching.test.ts`

**Step 1: Create the test file first (TDD)**

Create `src/services/simulator/keyword-matching.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { doesEntryMatchText, matchKeywordsInText } from './keyword-matching'
import type { WorkingEntry } from '@/types'

function makeEntry(overrides: Partial<WorkingEntry> = {}): WorkingEntry {
  return {
    id: overrides.id ?? 'test-id',
    uid: 0,
    name: 'Test Entry',
    content: '',
    keys: overrides.keys ?? [],
    secondaryKeys: [],
    constant: false,
    selective: false,
    selectiveLogic: 0,
    enabled: true,
    position: 0,
    order: 100,
    depth: 4,
    delay: 0,
    cooldown: 0,
    sticky: 0,
    probability: 100,
    preventRecursion: false,
    excludeRecursion: false,
    ignoreBudget: false,
    tokenCount: 0,
    extensions: {},
    ...overrides,
  }
}

const DEFAULT_OPTS = { caseSensitive: false, matchWholeWords: false }
const CASE_SENSITIVE_OPTS = { caseSensitive: true, matchWholeWords: false }
const WHOLE_WORD_OPTS = { caseSensitive: false, matchWholeWords: true }

describe('doesEntryMatchText', () => {
  it('returns empty array when entry has no keys', () => {
    const entry = makeEntry({ keys: [] })
    expect(doesEntryMatchText(entry, 'some text', DEFAULT_OPTS)).toEqual([])
  })

  it('returns empty array when text does not contain keyword', () => {
    const entry = makeEntry({ keys: ['dragon'] })
    expect(doesEntryMatchText(entry, 'the knight rode on', DEFAULT_OPTS)).toEqual([])
  })

  it('matches keyword in text (case-insensitive)', () => {
    const entry = makeEntry({ keys: ['dragon'] })
    const matches = doesEntryMatchText(entry, 'The Dragon flew over', DEFAULT_OPTS)
    expect(matches).toHaveLength(1)
    expect(matches[0].keyword).toBe('dragon')
    expect(matches[0].isRegex).toBe(false)
  })

  it('respects case-sensitive option', () => {
    const entry = makeEntry({ keys: ['Dragon'] })
    expect(doesEntryMatchText(entry, 'the dragon flew', CASE_SENSITIVE_OPTS)).toEqual([])
    expect(doesEntryMatchText(entry, 'the Dragon flew', CASE_SENSITIVE_OPTS)).toHaveLength(1)
  })

  it('matches whole words only when matchWholeWords is true', () => {
    const entry = makeEntry({ keys: ['drag'] })
    expect(doesEntryMatchText(entry, 'the dragon flew', WHOLE_WORD_OPTS)).toEqual([])
    expect(doesEntryMatchText(entry, 'we drag the net', WHOLE_WORD_OPTS)).toHaveLength(1)
  })

  it('returns multiple matches for multiple keyword occurrences', () => {
    const entry = makeEntry({ keys: ['wolf'] })
    const matches = doesEntryMatchText(entry, 'the wolf howled and the wolf slept', DEFAULT_OPTS)
    expect(matches).toHaveLength(2)
  })

  it('handles regex keys', () => {
    const entry = makeEntry({ keys: ['/drag(on)?/i'] })
    const matches = doesEntryMatchText(entry, 'the dragon and a drag', DEFAULT_OPTS)
    expect(matches).toHaveLength(2)
    expect(matches[0].isRegex).toBe(true)
  })

  it('skips malformed regex keys gracefully', () => {
    const entry = makeEntry({ keys: ['/[unclosed/'] })
    expect(() => doesEntryMatchText(entry, 'some text', DEFAULT_OPTS)).not.toThrow()
  })
})

describe('matchKeywordsInText', () => {
  it('returns matches across all entries', () => {
    const entries = [
      makeEntry({ id: 'a', keys: ['wolf'] }),
      makeEntry({ id: 'b', keys: ['castle'] }),
    ]
    const matches = matchKeywordsInText('the wolf entered the castle', entries, DEFAULT_OPTS)
    expect(matches).toHaveLength(2)
    expect(matches.map(m => m.entryId)).toContain('a')
    expect(matches.map(m => m.entryId)).toContain('b')
  })
})
```

**Step 2: Run tests — expect failure (module not found)**

```bash
npm test -- keyword-matching
```
Expected: FAIL — "Cannot find module './keyword-matching'"

**Step 3: Create the implementation**

Create `src/services/simulator/keyword-matching.ts`:

```typescript
import type { WorkingEntry, KeywordMatch, KeywordMatchOptions } from '@/types'

function isRegexKey(key: string): boolean {
  return key.startsWith('/') && key.length > 2
}

function parseRegexKey(key: string): RegExp | null {
  const match = /^\/(.+)\/([gimsuy]*)$/.exec(key)
  if (!match) return null
  try {
    return new RegExp(match[1], match[2])
  } catch {
    return null
  }
}

export function doesEntryMatchText(
  entry: WorkingEntry,
  text: string,
  options: KeywordMatchOptions,
): KeywordMatch[] {
  const matches: KeywordMatch[] = []

  for (const key of entry.keys) {
    if (!key.trim()) continue

    if (isRegexKey(key)) {
      const regex = parseRegexKey(key)
      if (!regex) continue
      const flags = regex.flags.includes('g') ? regex.flags : regex.flags + 'g'
      const globalRegex = new RegExp(regex.source, flags)
      for (const m of text.matchAll(globalRegex)) {
        matches.push({ keyword: key, entryId: entry.id, position: m.index ?? 0, isRegex: true })
      }
    } else {
      const searchText = options.caseSensitive ? text : text.toLowerCase()
      const searchKey = options.caseSensitive ? key : key.toLowerCase()

      let startIdx = 0
      while (true) {
        const idx = searchText.indexOf(searchKey, startIdx)
        if (idx === -1) break

        if (options.matchWholeWords) {
          const before = idx > 0 ? searchText[idx - 1] : ''
          const after =
            idx + searchKey.length < searchText.length ? searchText[idx + searchKey.length] : ''
          const okBefore = !before || /\W/.test(before)
          const okAfter = !after || /\W/.test(after)
          if (okBefore && okAfter) {
            matches.push({ keyword: key, entryId: entry.id, position: idx, isRegex: false })
          }
        } else {
          matches.push({ keyword: key, entryId: entry.id, position: idx, isRegex: false })
        }

        startIdx = idx + 1
      }
    }
  }

  return matches
}

export function matchKeywordsInText(
  text: string,
  entries: WorkingEntry[],
  options: KeywordMatchOptions,
): KeywordMatch[] {
  return entries.flatMap((entry) => doesEntryMatchText(entry, text, options))
}
```

**Step 4: Run tests — expect pass**

```bash
npm test -- keyword-matching
```
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/services/simulator/keyword-matching.ts src/services/simulator/keyword-matching.test.ts
git commit -m "graph: keyword matching service with tests"
```

---

### Task 3: GraphService — buildGraph with Tests

**Files:**
- Create: `src/services/graph-service.ts`
- Create: `src/services/graph-service.test.ts`

**Step 1: Create the test file**

Create `src/services/graph-service.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { buildGraph } from './graph-service'
import type { WorkingEntry } from '@/types'

function makeEntry(overrides: Partial<WorkingEntry> = {}): WorkingEntry {
  return {
    id: overrides.id ?? 'test-id',
    uid: 0,
    name: overrides.name ?? 'Test Entry',
    content: overrides.content ?? '',
    keys: overrides.keys ?? [],
    secondaryKeys: [],
    constant: overrides.constant ?? false,
    selective: false,
    selectiveLogic: 0,
    enabled: true,
    position: 0,
    order: 100,
    depth: 4,
    delay: 0,
    cooldown: 0,
    sticky: 0,
    probability: 100,
    preventRecursion: overrides.preventRecursion ?? false,
    excludeRecursion: false,
    ignoreBudget: false,
    tokenCount: 0,
    extensions: {},
    ...overrides,
  }
}

const opts = { caseSensitive: false, matchWholeWords: false }

describe('buildGraph', () => {
  it('returns empty graph for entries with no content or keys', () => {
    const entries = [makeEntry({ id: 'a' }), makeEntry({ id: 'b' })]
    const graph = buildGraph(entries, opts)
    expect(graph.edges.get('a')?.size).toBe(0)
    expect(graph.edges.get('b')?.size).toBe(0)
  })

  it('creates edge when source content matches target keys', () => {
    const entries = [
      makeEntry({ id: 'location', content: 'You enter the dark castle.', keys: [] }),
      makeEntry({ id: 'castle', content: '', keys: ['castle'] }),
    ]
    const graph = buildGraph(entries, opts)
    expect(graph.edges.get('location')?.has('castle')).toBe(true)
    expect(graph.reverseEdges.get('castle')?.has('location')).toBe(true)
  })

  it('stores matched keywords in edge metadata', () => {
    const entries = [
      makeEntry({ id: 'src', content: 'the wolf howled', keys: [] }),
      makeEntry({ id: 'tgt', keys: ['wolf'] }),
    ]
    const graph = buildGraph(entries, opts)
    const meta = graph.edgeMeta.get('src\u2192tgt')
    expect(meta?.matchedKeywords).toContain('wolf')
  })

  it('marks edge as blocked when target has preventRecursion:true', () => {
    const entries = [
      makeEntry({ id: 'src', content: 'the wolf appeared', keys: [] }),
      makeEntry({ id: 'tgt', keys: ['wolf'], preventRecursion: true }),
    ]
    const graph = buildGraph(entries, opts)
    const meta = graph.edgeMeta.get('src\u2192tgt')
    expect(meta?.blockedByPreventRecursion).toBe(true)
  })

  it('does not create self-edges', () => {
    const entries = [
      makeEntry({ id: 'a', content: 'mentions wolf', keys: ['wolf'] }),
    ]
    const graph = buildGraph(entries, opts)
    expect(graph.edges.get('a')?.has('a')).toBe(false)
  })

  it('does not create edges for entries with no keys', () => {
    const entries = [
      makeEntry({ id: 'src', content: 'some text', keys: [] }),
      makeEntry({ id: 'tgt', content: '', keys: [] }),
    ]
    const graph = buildGraph(entries, opts)
    expect(graph.edges.get('src')?.size).toBe(0)
  })
})
```

**Step 2: Run tests — expect failure**

```bash
npm test -- graph-service
```
Expected: FAIL — "Cannot find module './graph-service'"

**Step 3: Create graph-service.ts (buildGraph only for now)**

Create `src/services/graph-service.ts`:

```typescript
import type {
  WorkingEntry,
  RecursionGraph,
  EdgeMeta,
  CycleResult,
  DeadLink,
  KeywordMatchOptions,
} from '@/types'
import { doesEntryMatchText } from '@/services/simulator/keyword-matching'

const DEFAULT_OPTIONS: KeywordMatchOptions = {
  caseSensitive: false,
  matchWholeWords: false,
}

export function buildGraph(
  entries: WorkingEntry[],
  options: KeywordMatchOptions = DEFAULT_OPTIONS,
): RecursionGraph {
  const edges = new Map<string, Set<string>>()
  const reverseEdges = new Map<string, Set<string>>()
  const edgeMeta = new Map<string, EdgeMeta>()

  for (const entry of entries) {
    edges.set(entry.id, new Set())
    reverseEdges.set(entry.id, new Set())
  }

  for (const source of entries) {
    if (!source.content) continue

    for (const target of entries) {
      if (source.id === target.id) continue
      if (target.keys.length === 0) continue

      const matches = doesEntryMatchText(target, source.content, options)
      if (matches.length === 0) continue

      edges.get(source.id)!.add(target.id)
      reverseEdges.get(target.id)!.add(source.id)

      const edgeKey = `${source.id}\u2192${target.id}`
      edgeMeta.set(edgeKey, {
        sourceId: source.id,
        targetId: target.id,
        matchedKeywords: [...new Set(matches.map((m) => m.keyword))],
        blockedByPreventRecursion: target.preventRecursion,
      })
    }
  }

  return { edges, reverseEdges, edgeMeta }
}
```

**Step 4: Run tests — expect pass**

```bash
npm test -- graph-service
```
Expected: All PASS

**Step 5: Commit**

```bash
git add src/services/graph-service.ts src/services/graph-service.test.ts
git commit -m "graph: buildGraph with keyword matching"
```

---

### Task 4: GraphService — Queries (findCycles, findOrphans, findDeadLinks)

**Files:**
- Modify: `src/services/graph-service.ts`
- Modify: `src/services/graph-service.test.ts`

**Step 1: Add tests for graph queries**

Append to `src/services/graph-service.test.ts`. Update the import line to include the new functions:

```typescript
import { buildGraph, findCycles, findOrphans, findDeadLinks } from './graph-service'
```

Then add:

```typescript
describe('findCycles', () => {
  it('returns empty for acyclic graph', () => {
    const entries = [
      makeEntry({ id: 'a', content: 'mentions wolf', keys: [] }),
      makeEntry({ id: 'b', keys: ['wolf'] }),
    ]
    const graph = buildGraph(entries, opts)
    expect(findCycles(graph).cycles).toHaveLength(0)
  })

  it('detects simple A-B-A cycle', () => {
    // A content matches B key, B content matches A key
    const entries = [
      makeEntry({ id: 'a', content: 'see the wolf', keys: ['castle'] }),
      makeEntry({ id: 'b', content: 'see the castle', keys: ['wolf'] }),
    ]
    const graph = buildGraph(entries, opts)
    const result = findCycles(graph)
    expect(result.cycles).toHaveLength(1)
    expect(result.cycles[0]).toContain('a')
    expect(result.cycles[0]).toContain('b')
  })

  it('detects longer cycle A-B-C-A', () => {
    const entries = [
      makeEntry({ id: 'a', content: 'mentions beta', keys: ['alpha'] }),
      makeEntry({ id: 'b', content: 'mentions gamma', keys: ['beta'] }),
      makeEntry({ id: 'c', content: 'mentions alpha', keys: ['gamma'] }),
    ]
    const graph = buildGraph(entries, opts)
    const result = findCycles(graph)
    expect(result.cycles).toHaveLength(1)
    expect(result.cycles[0]).toHaveLength(3)
  })
})

describe('findOrphans', () => {
  it('returns entries with no incoming edges (non-constants)', () => {
    const entries = [
      makeEntry({ id: 'tgt', content: '', keys: ['wolf'] }),
      makeEntry({ id: 'src', content: 'see the wolf', keys: [] }),
    ]
    const graph = buildGraph(entries, opts)
    // 'src' has no incoming edges; 'tgt' has incoming from 'src'
    const orphans = findOrphans(entries, graph)
    expect(orphans).toContain('src')
    expect(orphans).not.toContain('tgt')
  })

  it('excludes constant entries from orphan list', () => {
    const entries = [
      makeEntry({ id: 'const', constant: true, keys: [] }),
    ]
    const graph = buildGraph(entries, opts)
    expect(findOrphans(entries, graph)).not.toContain('const')
  })
})

describe('findDeadLinks', () => {
  it('returns empty when all entry names are reachable via keywords', () => {
    const entries = [
      makeEntry({ id: 'a', name: 'The Wolf', content: '', keys: ['wolf'] }),
      makeEntry({ id: 'b', content: 'see the wolf', keys: [] }),
    ]
    const graph = buildGraph(entries, opts)
    expect(findDeadLinks(entries, graph)).toHaveLength(0)
  })

  it('returns dead link when entry name appears in content but has no matching key', () => {
    // Entry 'a' has name 'Dragon Keep' but key 'fortress' — no edge from 'b' to 'a'
    const entries = [
      makeEntry({ id: 'a', name: 'Dragon Keep', content: '', keys: ['fortress'] }),
      makeEntry({ id: 'b', name: 'Explorer', content: 'She visited Dragon Keep.', keys: [] }),
    ]
    const graph = buildGraph(entries, opts)
    const deadLinks = findDeadLinks(entries, graph)
    expect(deadLinks.length).toBeGreaterThan(0)
    expect(deadLinks[0].sourceEntryId).toBe('b')
    expect(deadLinks[0].mentionedName).toBe('Dragon Keep')
  })
})
```

**Step 2: Run tests — expect failure on new tests**

```bash
npm test -- graph-service
```
Expected: FAIL on findCycles, findOrphans, findDeadLinks (not exported yet)

**Step 3: Add query functions to graph-service.ts**

Append to `src/services/graph-service.ts`:

```typescript
export function findCycles(graph: RecursionGraph): CycleResult {
  const cycles: string[][] = []
  const visited = new Set<string>()
  const onStack = new Set<string>()
  const path: string[] = []

  function dfs(nodeId: string): void {
    visited.add(nodeId)
    onStack.add(nodeId)
    path.push(nodeId)

    for (const neighbor of graph.edges.get(nodeId) ?? new Set()) {
      if (!visited.has(neighbor)) {
        dfs(neighbor)
      } else if (onStack.has(neighbor)) {
        const cycleStart = path.lastIndexOf(neighbor)
        cycles.push(path.slice(cycleStart))
      }
    }

    path.pop()
    onStack.delete(nodeId)
  }

  for (const nodeId of graph.edges.keys()) {
    if (!visited.has(nodeId)) dfs(nodeId)
  }

  return { cycles }
}

export function findOrphans(entries: WorkingEntry[], graph: RecursionGraph): string[] {
  return entries
    .filter((e) => !e.constant && (graph.reverseEdges.get(e.id)?.size ?? 0) === 0)
    .map((e) => e.id)
}

export function findDeadLinks(entries: WorkingEntry[], graph: RecursionGraph): DeadLink[] {
  const deadLinks: DeadLink[] = []

  for (const source of entries) {
    if (!source.content) continue

    for (const target of entries) {
      if (source.id === target.id) continue
      if (!target.name) continue

      // Skip if an edge already exists (keywords matched correctly)
      if (graph.edges.get(source.id)?.has(target.id)) continue

      // Check if target's display name appears in source's content
      const lowerContent = source.content.toLowerCase()
      const lowerName = target.name.toLowerCase()
      const idx = lowerContent.indexOf(lowerName)
      if (idx === -1) continue

      const snippetStart = Math.max(0, idx - 20)
      const snippetEnd = Math.min(source.content.length, idx + target.name.length + 20)

      deadLinks.push({
        sourceEntryId: source.id,
        mentionedName: target.name,
        contextSnippet: source.content.slice(snippetStart, snippetEnd),
      })
    }
  }

  return deadLinks
}
```

**Step 4: Run all graph-service tests — expect all pass**

```bash
npm test -- graph-service
```
Expected: All PASS

**Step 5: Commit**

```bash
git add src/services/graph-service.ts src/services/graph-service.test.ts
git commit -m "graph: findCycles, findOrphans, findDeadLinks queries"
```

---

### Task 5: GraphService — incrementalUpdate with Tests

**Files:**
- Modify: `src/services/graph-service.ts`
- Modify: `src/services/graph-service.test.ts`

**Step 1: Add tests for incrementalUpdate**

Update the import at the top of `src/services/graph-service.test.ts`:

```typescript
import { buildGraph, findCycles, findOrphans, findDeadLinks, incrementalUpdate } from './graph-service'
```

Then append:

```typescript
describe('incrementalUpdate', () => {
  it('recomputes outgoing edges when content changes', () => {
    const entries = [
      makeEntry({ id: 'src', content: 'see the wolf', keys: [] }),
      makeEntry({ id: 'tgt', keys: ['wolf'] }),
    ]
    const graph = buildGraph(entries, opts)
    expect(graph.edges.get('src')?.has('tgt')).toBe(true)

    const updatedSrc = { ...entries[0], content: 'see the knight' }
    const updated = [updatedSrc, entries[1]]
    const newGraph = incrementalUpdate(graph, updatedSrc, updated, opts, 'content')

    expect(newGraph.edges.get('src')?.has('tgt')).toBe(false)
    expect(newGraph.reverseEdges.get('tgt')?.has('src')).toBe(false)
  })

  it('recomputes incoming edges when keys change', () => {
    const entries = [
      makeEntry({ id: 'src', content: 'see the wolf', keys: [] }),
      makeEntry({ id: 'tgt', keys: ['wolf'] }),
    ]
    const graph = buildGraph(entries, opts)
    expect(graph.reverseEdges.get('tgt')?.has('src')).toBe(true)

    const updatedTgt = { ...entries[1], keys: ['dragon'] }
    const updated = [entries[0], updatedTgt]
    const newGraph = incrementalUpdate(graph, updatedTgt, updated, opts, 'keys')

    expect(newGraph.reverseEdges.get('tgt')?.has('src')).toBe(false)
    expect(newGraph.edges.get('src')?.has('tgt')).toBe(false)
  })
})
```

**Step 2: Run tests — expect failure**

```bash
npm test -- graph-service
```
Expected: FAIL on incrementalUpdate

**Step 3: Add incrementalUpdate to graph-service.ts**

Append to `src/services/graph-service.ts`:

```typescript
export function incrementalUpdate(
  graph: RecursionGraph,
  changedEntry: WorkingEntry,
  allEntries: WorkingEntry[],
  options: KeywordMatchOptions,
  changeType: 'content' | 'keys',
): RecursionGraph {
  const edges = new Map<string, Set<string>>()
  const reverseEdges = new Map<string, Set<string>>()
  const edgeMeta = new Map<string, EdgeMeta>(graph.edgeMeta)

  for (const [id, set] of graph.edges) edges.set(id, new Set(set))
  for (const [id, set] of graph.reverseEdges) reverseEdges.set(id, new Set(set))

  if (changeType === 'content') {
    const oldOutgoing = new Set(edges.get(changedEntry.id) ?? [])
    for (const targetId of oldOutgoing) {
      reverseEdges.get(targetId)?.delete(changedEntry.id)
      edgeMeta.delete(`${changedEntry.id}\u2192${targetId}`)
    }
    edges.set(changedEntry.id, new Set())

    if (changedEntry.content) {
      for (const target of allEntries) {
        if (target.id === changedEntry.id || target.keys.length === 0) continue
        const matches = doesEntryMatchText(target, changedEntry.content, options)
        if (!matches.length) continue
        edges.get(changedEntry.id)!.add(target.id)
        reverseEdges.get(target.id)?.add(changedEntry.id)
        edgeMeta.set(`${changedEntry.id}\u2192${target.id}`, {
          sourceId: changedEntry.id,
          targetId: target.id,
          matchedKeywords: [...new Set(matches.map((m) => m.keyword))],
          blockedByPreventRecursion: target.preventRecursion,
        })
      }
    }
  } else {
    const oldIncoming = new Set(reverseEdges.get(changedEntry.id) ?? [])
    for (const sourceId of oldIncoming) {
      edges.get(sourceId)?.delete(changedEntry.id)
      edgeMeta.delete(`${sourceId}\u2192${changedEntry.id}`)
    }
    reverseEdges.set(changedEntry.id, new Set())

    for (const source of allEntries) {
      if (source.id === changedEntry.id || !source.content || changedEntry.keys.length === 0) continue
      const matches = doesEntryMatchText(changedEntry, source.content, options)
      if (!matches.length) continue
      edges.get(source.id)?.add(changedEntry.id)
      reverseEdges.get(changedEntry.id)!.add(source.id)
      edgeMeta.set(`${source.id}\u2192${changedEntry.id}`, {
        sourceId: source.id,
        targetId: changedEntry.id,
        matchedKeywords: [...new Set(matches.map((m) => m.keyword))],
        blockedByPreventRecursion: changedEntry.preventRecursion,
      })
    }
  }

  return { edges, reverseEdges, edgeMeta }
}
```

**Step 4: Run all graph-service tests — expect all pass**

```bash
npm test -- graph-service
```
Expected: All PASS

**Step 5: Commit**

```bash
git add src/services/graph-service.ts src/services/graph-service.test.ts
git commit -m "graph: incrementalUpdate for content and key changes"
```

---

### Task 6: GraphService — computeLayout (dagre)

**Files:**
- Modify: `src/services/graph-service.ts`

No unit test for this (dagre internals are not worth mocking; correctness verified visually).

**Step 1: Add the dagre import and computeLayout to graph-service.ts**

At the top of `src/services/graph-service.ts`, add the dagre import after the existing imports:

```typescript
import dagre from 'dagre'
```

Then append the function:

```typescript
const NODE_WIDTH = 180
const NODE_HEIGHT = 60

export function computeLayout(
  entries: WorkingEntry[],
  graph: RecursionGraph,
  existingPositions?: Map<string, { x: number; y: number }>,
): Map<string, { x: number; y: number }> {
  // If all entries already have positions, return them unchanged
  if (existingPositions && entries.every((e) => existingPositions.has(e.id))) {
    return new Map(existingPositions)
  }

  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 80, marginx: 20, marginy: 20 })
  g.setDefaultEdgeLabel(() => ({}))

  for (const entry of entries) {
    g.setNode(entry.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  }

  for (const [sourceId, targets] of graph.edges) {
    for (const targetId of targets) {
      g.setEdge(sourceId, targetId)
    }
  }

  dagre.layout(g)

  const positions = new Map<string, { x: number; y: number }>()
  for (const entry of entries) {
    const node = g.node(entry.id)
    // dagre centers nodes; React Flow uses top-left corner
    positions.set(entry.id, {
      x: node ? node.x - NODE_WIDTH / 2 : 0,
      y: node ? node.y - NODE_HEIGHT / 2 : 0,
    })
  }

  // Preserve any existing positions (don't overwrite manual layout)
  if (existingPositions) {
    for (const [id, pos] of existingPositions) {
      positions.set(id, pos)
    }
  }

  return positions
}
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: No errors. If you see "Cannot find module 'dagre'", verify `@types/dagre` is installed.

**Step 3: Run all tests to confirm nothing broke**

```bash
npm test
```
Expected: All PASS

**Step 4: Commit**

```bash
git add src/services/graph-service.ts
git commit -m "graph: computeLayout via dagre"
```

---

### Task 7: useDerivedState Hook

**Files:**
- Create: `src/hooks/useDerivedState.ts`

**Step 1: Create the hook**

Create `src/hooks/useDerivedState.ts`:

```typescript
import { useState, useEffect, useRef, useCallback } from 'react'
import type { RecursionGraph, WorkingEntry, KeywordMatchOptions } from '@/types'
import { buildGraph, incrementalUpdate, computeLayout } from '@/services/graph-service'
import { documentStoreRegistry } from '@/stores/document-store-registry'

export interface DerivedState {
  graph: RecursionGraph
}

const DEFAULT_OPTIONS: KeywordMatchOptions = {
  caseSensitive: false,
  matchWholeWords: false,
}

function emptyGraph(): RecursionGraph {
  return {
    edges: new Map(),
    reverseEdges: new Map(),
    edgeMeta: new Map(),
  }
}

export function useDerivedState(tabId: string | null): DerivedState {
  const [graph, setGraph] = useState<RecursionGraph>(emptyGraph)
  const prevEntriesRef = useRef<WorkingEntry[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const store = tabId ? documentStoreRegistry.get(tabId) : undefined
  const entries = store ? store((s) => s.entries) : []

  const persistMissingPositions = useCallback(
    (currentEntries: WorkingEntry[], newGraph: RecursionGraph) => {
      if (!store) return
      const storeState = store.getState()
      const existing = storeState.graphPositions
      const missing = currentEntries.filter((e) => !existing.has(e.id))
      if (missing.length === 0) return
      const allPositions = computeLayout(currentEntries, newGraph, existing)
      for (const entry of missing) {
        const pos = allPositions.get(entry.id)
        if (pos) storeState.setGraphPosition(entry.id, pos)
      }
    },
    [store],
  )

  const recompute = useCallback(
    (currentEntries: WorkingEntry[], prevEntries: WorkingEntry[]) => {
      const hasStructuralChange =
        currentEntries.length !== prevEntries.length ||
        currentEntries.some((e, i) => prevEntries[i]?.id !== e.id)

      if (hasStructuralChange || prevEntries.length === 0) {
        const newGraph = buildGraph(currentEntries, DEFAULT_OPTIONS)
        setGraph(newGraph)
        persistMissingPositions(currentEntries, newGraph)
        return
      }

      // Detect single-entry change for incremental update
      let changedEntry: WorkingEntry | null = null
      let changeType: 'content' | 'keys' | null = null
      let multipleChanged = false

      for (let i = 0; i < currentEntries.length; i++) {
        const curr = currentEntries[i]
        const prev = prevEntries[i]
        const contentChanged = curr.content !== prev.content
        const keysChanged = curr.keys !== prev.keys
        if (contentChanged || keysChanged) {
          if (changedEntry !== null) { multipleChanged = true; break }
          changedEntry = curr
          changeType = keysChanged ? 'keys' : 'content'
        }
      }

      if (!multipleChanged && changedEntry && changeType) {
        const type = changeType
        const entry = changedEntry
        setGraph((prev) => incrementalUpdate(prev, entry, currentEntries, DEFAULT_OPTIONS, type))
      } else {
        const newGraph = buildGraph(currentEntries, DEFAULT_OPTIONS)
        setGraph(newGraph)
        persistMissingPositions(currentEntries, newGraph)
      }
    },
    [persistMissingPositions],
  )

  useEffect(() => {
    if (!tabId) {
      setGraph(emptyGraph())
      prevEntriesRef.current = []
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    const prev = prevEntriesRef.current
    prevEntriesRef.current = entries

    debounceRef.current = setTimeout(() => {
      recompute(entries, prev)
    }, 150)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [entries, tabId, recompute])

  return { graph }
}
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: No errors

**Step 3: Run all tests**

```bash
npm test
```
Expected: All PASS

**Step 4: Commit**

```bash
git add src/hooks/useDerivedState.ts
git commit -m "graph: useDerivedState hook with incremental graph updates"
```

---

### Task 8: Semantic Color Tokens

**Files:**
- Modify: `src/styles/globals.css`

**Step 1: Add CSS custom properties for graph colors**

Open `src/styles/globals.css`. Find the `:root` block or add one. Add these variables:

```css
:root {
  /* Graph edge colors */
  --edge-active: #818cf8;
  --edge-blocked: #6b7280;
  --edge-cycle: #ef4444;

  /* Node activation type colors */
  --node-constant: #a855f7;
  --node-keyword: #6366f1;
  --node-selective: #f59e0b;
  --node-disabled: #6b7280;
}
```

These are used as inline styles in `EntryNode` and `RecursionEdge` since React Flow renders into a canvas context where Tailwind classes don't apply to SVG edges.

**Step 2: Verify build**

```bash
npm run build
```
Expected: No errors

**Step 3: Commit**

```bash
git add src/styles/globals.css
git commit -m "ui: graph semantic color tokens"
```

---

### Task 9: EntryNode Component

**Files:**
- Create: `src/components/graph/EntryNode.tsx`

**Step 1: Create EntryNode**

Create `src/components/graph/EntryNode.tsx`:

```typescript
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import type { WorkingEntry } from '@/types'

export interface EntryNodeData {
  entry: WorkingEntry
  isCyclic: boolean
  [key: string]: unknown
}

type ActivationType = 'constant' | 'keyword' | 'selective' | 'disabled'

function getActivationType(entry: WorkingEntry): ActivationType {
  if (!entry.enabled) return 'disabled'
  if (entry.constant) return 'constant'
  if (entry.selective) return 'selective'
  return 'keyword'
}

const ACTIVATION_COLORS: Record<ActivationType, string> = {
  constant: 'var(--node-constant)',
  keyword: 'var(--node-keyword)',
  selective: 'var(--node-selective)',
  disabled: 'var(--node-disabled)',
}

const ACTIVATION_BADGE: Record<ActivationType, string> = {
  constant: 'C',
  keyword: 'K',
  selective: 'S',
  disabled: 'D',
}

export function EntryNode({ data, selected }: NodeProps<EntryNodeData>) {
  const { entry, isCyclic } = data
  const activationType = getActivationType(entry)
  const accentColor = ACTIVATION_COLORS[activationType]

  const outlineColor = selected
    ? accentColor
    : isCyclic
    ? 'var(--edge-cycle)'
    : 'transparent'

  return (
    <div
      style={{
        borderLeft: `3px solid ${accentColor}`,
        outline: `2px solid ${outlineColor}`,
        outlineOffset: '2px',
      }}
      className="bg-gray-900 border border-gray-700 rounded px-3 py-2 w-[180px] min-h-[60px] flex flex-col gap-1 cursor-pointer shadow-md"
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-600 !border-gray-500" />

      <div className="flex items-center justify-between gap-1">
        <span className="text-xs font-medium text-gray-100 truncate flex-1" title={entry.name}>
          {entry.name || '(unnamed)'}
        </span>
        <span
          className="text-[10px] font-bold px-1 rounded shrink-0"
          style={{ color: accentColor, border: `1px solid ${accentColor}` }}
        >
          {ACTIVATION_BADGE[activationType]}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-500">{entry.tokenCount}t</span>
        {/* Health dot placeholder — Phase 3 fills this with real severity */}
        <span className="w-2 h-2 rounded-full bg-gray-600" title="Health (Phase 3)" />
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-gray-600 !border-gray-500" />
    </div>
  )
}
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/graph/EntryNode.tsx
git commit -m "ui: EntryNode custom React Flow node"
```

---

### Task 10: RecursionEdge Component

**Files:**
- Create: `src/components/graph/RecursionEdge.tsx`

**Step 1: Create RecursionEdge**

Create `src/components/graph/RecursionEdge.tsx`:

```typescript
import { getSmoothStepPath, EdgeLabelRenderer } from '@xyflow/react'
import type { EdgeProps } from '@xyflow/react'

export interface RecursionEdgeData {
  blocked: boolean
  isCyclic: boolean
  [key: string]: unknown
}

export function RecursionEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps<RecursionEdgeData>) {
  const blocked = data?.blocked ?? false
  const isCyclic = data?.isCyclic ?? false

  const color = isCyclic
    ? 'var(--edge-cycle)'
    : blocked
    ? 'var(--edge-blocked)'
    : 'var(--edge-active)'

  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  return (
    <>
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeDasharray={blocked ? '5 3' : undefined}
        markerEnd={markerEnd}
        className="react-flow__edge-path"
      />
      {/* Wider transparent path for easier interaction */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={10}
        className="react-flow__edge-interaction"
      />
      <EdgeLabelRenderer>{/* keyword label placeholder for Phase 3 */}</EdgeLabelRenderer>
    </>
  )
}
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/graph/RecursionEdge.tsx
git commit -m "ui: RecursionEdge custom React Flow edge"
```

---

### Task 11: GraphControls Component

**Files:**
- Create: `src/components/graph/GraphControls.tsx`

**Step 1: Create GraphControls**

Create `src/components/graph/GraphControls.tsx`:

```typescript
import { useReactFlow } from '@xyflow/react'
import { LayoutGrid, Maximize2, Eye, EyeOff } from 'lucide-react'

interface GraphControlsProps {
  onAutoLayout: () => void
  showBlockedEdges: boolean
  onToggleBlockedEdges: () => void
}

export function GraphControls({
  onAutoLayout,
  showBlockedEdges,
  onToggleBlockedEdges,
}: GraphControlsProps) {
  const { fitView } = useReactFlow()

  return (
    <div className="absolute top-3 right-3 z-10 flex gap-1">
      <button
        onClick={onAutoLayout}
        title="Auto Layout"
        className="flex items-center gap-1.5 px-2 py-1.5 text-xs bg-gray-800 border border-gray-700 rounded text-gray-300 hover:bg-gray-700 hover:text-gray-100 transition-colors"
      >
        <LayoutGrid size={13} />
        Layout
      </button>

      <button
        onClick={() => fitView({ padding: 0.15, duration: 300 })}
        title="Fit to view"
        className="p-1.5 bg-gray-800 border border-gray-700 rounded text-gray-300 hover:bg-gray-700 hover:text-gray-100 transition-colors"
      >
        <Maximize2 size={13} />
      </button>

      <button
        onClick={onToggleBlockedEdges}
        title={showBlockedEdges ? 'Hide blocked edges' : 'Show blocked edges'}
        className="p-1.5 bg-gray-800 border border-gray-700 rounded text-gray-300 hover:bg-gray-700 hover:text-gray-100 transition-colors"
      >
        {showBlockedEdges ? <Eye size={13} /> : <EyeOff size={13} />}
      </button>
    </div>
  )
}
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/graph/GraphControls.tsx
git commit -m "ui: GraphControls toolbar overlay"
```

---

### Task 12: GraphCanvas Component

**Files:**
- Create: `src/components/graph/GraphCanvas.tsx`

**Step 1: Create GraphCanvas**

Create `src/components/graph/GraphCanvas.tsx`:

```typescript
import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  MiniMap,
  Controls,
  useNodesState,
  useEdgesState,
  useReactFlow,
  MarkerType,
  ReactFlowProvider,
} from '@xyflow/react'
import type { Node, Edge, NodeChange, EdgeChange } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { EntryNode } from './EntryNode'
import { RecursionEdge } from './RecursionEdge'
import { GraphControls } from './GraphControls'
import { useDerivedState } from '@/hooks/useDerivedState'
import { computeLayout, findCycles } from '@/services/graph-service'
import { documentStoreRegistry } from '@/stores/document-store-registry'
import type { EntryNodeData } from './EntryNode'
import type { RecursionEdgeData } from './RecursionEdge'

const nodeTypes = { entryNode: EntryNode }
const edgeTypes = { recursionEdge: RecursionEdge }

interface GraphCanvasInnerProps {
  tabId: string
}

function GraphCanvasInner({ tabId }: GraphCanvasInnerProps) {
  const store = documentStoreRegistry.get(tabId)!
  const entries = store((s) => s.entries)
  const graphPositions = store((s) => s.graphPositions)
  const selectedEntryId = store((s) => s.selection.selectedEntryId)
  const { graph } = useDerivedState(tabId)
  const { fitView } = useReactFlow()

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<EntryNodeData>>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<RecursionEdgeData>>([])
  const [showBlockedEdges, setShowBlockedEdges] = useState(true)
  const didInitialFitRef = useRef(false)

  const cycleInfo = useMemo(() => {
    const result = findCycles(graph)
    const cycleNodeIds = new Set<string>()
    const cycleEdgeIds = new Set<string>()
    for (const cycle of result.cycles) {
      for (let i = 0; i < cycle.length; i++) {
        cycleNodeIds.add(cycle[i])
        const nextId = cycle[(i + 1) % cycle.length]
        cycleEdgeIds.add(`${cycle[i]}\u2192${nextId}`)
      }
    }
    return { cycleNodeIds, cycleEdgeIds }
  }, [graph])

  // Sync entries + positions + selection → React Flow nodes
  useEffect(() => {
    const newNodes: Node<EntryNodeData>[] = entries.map((entry) => ({
      id: entry.id,
      type: 'entryNode',
      position: graphPositions.get(entry.id) ?? { x: 0, y: 0 },
      selected: entry.id === selectedEntryId,
      data: { entry, isCyclic: cycleInfo.cycleNodeIds.has(entry.id) },
    }))
    setNodes(newNodes)
  }, [entries, graphPositions, selectedEntryId, cycleInfo, setNodes])

  // Sync graph → React Flow edges
  useEffect(() => {
    const newEdges: Edge<RecursionEdgeData>[] = []
    for (const [sourceId, targets] of graph.edges) {
      for (const targetId of targets) {
        const edgeKey = `${sourceId}\u2192${targetId}`
        const meta = graph.edgeMeta.get(edgeKey)
        const blocked = meta?.blockedByPreventRecursion ?? false
        const isCyclic = cycleInfo.cycleEdgeIds.has(edgeKey)
        if (!showBlockedEdges && blocked) continue
        newEdges.push({
          id: edgeKey,
          source: sourceId,
          target: targetId,
          type: 'recursionEdge',
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isCyclic
              ? 'var(--edge-cycle)'
              : blocked
              ? 'var(--edge-blocked)'
              : 'var(--edge-active)',
          },
          data: { blocked, isCyclic },
        })
      }
    }
    setEdges(newEdges)
  }, [graph, cycleInfo, showBlockedEdges, setEdges])

  // Fit view on first load
  useEffect(() => {
    if (entries.length > 0 && !didInitialFitRef.current) {
      didInitialFitRef.current = true
      setTimeout(() => fitView({ padding: 0.15, duration: 400 }), 150)
    }
  }, [entries.length, fitView])

  const handleNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      store.getState().setGraphPosition(node.id, { x: node.position.x, y: node.position.y })
    },
    [store],
  )

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      store.getState().selectEntry(node.id)
    },
    [store],
  )

  const handlePaneClick = useCallback(() => {
    store.getState().clearSelection()
  }, [store])

  const handleAutoLayout = useCallback(() => {
    const newPositions = computeLayout(entries, graph)
    const storeState = store.getState()
    for (const [id, pos] of newPositions) {
      storeState.setGraphPosition(id, pos)
    }
    setTimeout(() => fitView({ padding: 0.15, duration: 400 }), 50)
  }, [entries, graph, store, fitView])

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => { onNodesChange(changes) },
    [onNodesChange],
  )

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => { onEdgesChange(changes) },
    [onEdgesChange],
  )

  if (entries.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
        No entries to display
      </div>
    )
  }

  return (
    <div className="relative flex-1 h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onNodeDragStop={handleNodeDragStop}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        fitView={false}
        colorMode="dark"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#374151" gap={20} size={1} />
        <MiniMap
          nodeColor={(node) => {
            const d = node.data as EntryNodeData
            if (!d?.entry) return '#374151'
            if (!d.entry.enabled) return 'var(--node-disabled)'
            if (d.entry.constant) return 'var(--node-constant)'
            if (d.entry.selective) return 'var(--node-selective)'
            return 'var(--node-keyword)'
          }}
          maskColor="rgba(0,0,0,0.6)"
          className="!bg-gray-900 !border-gray-700"
        />
        <Controls className="!bg-gray-800 !border-gray-700 [&_button]:!bg-gray-800 [&_button]:!border-gray-600 [&_button]:!text-gray-300 [&_button:hover]:!bg-gray-700" />
        <GraphControls
          onAutoLayout={handleAutoLayout}
          showBlockedEdges={showBlockedEdges}
          onToggleBlockedEdges={() => setShowBlockedEdges((v) => !v)}
        />
      </ReactFlow>
    </div>
  )
}

interface GraphCanvasProps {
  tabId: string
}

export function GraphCanvas({ tabId }: GraphCanvasProps) {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner tabId={tabId} />
    </ReactFlowProvider>
  )
}
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: No errors. Common issues to fix if they arise:
- `colorMode` prop: optional in some React Flow v12 versions; remove if type error
- `NodeChange` / `EdgeChange` generics: adjust if version differs

**Step 3: Run all tests**

```bash
npm test
```
Expected: All PASS

**Step 4: Commit**

```bash
git add src/components/graph/GraphCanvas.tsx
git commit -m "ui: GraphCanvas with auto-layout, bidirectional selection, controls"
```

---

### Task 13: Wire GraphCanvas into WorkspaceShell

**Files:**
- Modify: `src/components/workspace/WorkspaceShell.tsx`

**Step 1: Add the import**

At the top of `src/components/workspace/WorkspaceShell.tsx`, add:

```typescript
import { GraphCanvas } from '@/components/graph/GraphCanvas'
```

**Step 2: Replace the center panel placeholder**

Find the `{/* Center panel: graph canvas placeholder */}` comment block. Replace the entire `<main>` element with:

```tsx
{/* Center panel: graph canvas */}
<main className="flex-1 bg-gray-950 flex overflow-hidden">
  {!activeTabId ? (
    <div className="flex-1 flex items-center justify-center pointer-events-none">
      <div className="text-center space-y-3">
        <div className="text-5xl text-gray-700">&#x2B21;</div>
        <p className="text-sm text-gray-500">Drag a SillyTavern JSON file here</p>
        <p className="text-xs text-gray-600">or click the upload icon above</p>
      </div>
    </div>
  ) : (
    <GraphCanvas tabId={activeTabId} />
  )}
</main>
```

**Step 3: Remove the `cn` import if now unused**

Check whether `cn` is used anywhere else in `WorkspaceShell.tsx`. If the only usage was in the old `<main>` block, remove:
```typescript
import { cn } from '@/lib/cn'
```

**Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: No errors

**Step 5: Run all tests**

```bash
npm test
```
Expected: All PASS

**Step 6: Visual verification via dev server**

```bash
npm run dev
```

Open the app, drag in a SillyTavern JSON lorebook. Verify:

- [ ] Graph renders with entries as labeled nodes
- [ ] Nodes show name, badge (C/K/S/D), and token count
- [ ] Edges connect entries that have keyword relationships
- [ ] Cyclic edges appear red (red border on node + red edge)
- [ ] PreventRecursion edges appear dashed
- [ ] Clicking a node selects it (highlighted) and shows it in the editor
- [ ] Clicking an entry in the left list highlights the graph node
- [ ] Dragging a node updates its position persistently
- [ ] "Layout" button re-runs dagre
- [ ] "Fit" button fits all nodes in view
- [ ] Blocked edge toggle shows/hides dashed edges
- [ ] MiniMap shows activation-type colors

**Step 7: Commit**

```bash
git add src/components/workspace/WorkspaceShell.tsx
git commit -m "ui: wire GraphCanvas into WorkspaceShell center panel"
```

---

## Final Verification

```bash
npm test
npm run build
```

Both must pass cleanly. Then tag:

```bash
git tag phase-2-complete
```
