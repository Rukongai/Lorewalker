import { describe, it, expect } from 'vitest'
import { buildGraph, findCycles, findOrphans, findDeadLinks, incrementalUpdate } from './graph-service'
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
    excludeRecursion: overrides.excludeRecursion ?? false,
    ignoreBudget: false,
    caseSensitive: null,
    matchWholeWords: null,
    scanDepth: null,
    group: '',
    groupOverride: false,
    groupWeight: 100,
    useGroupScoring: null,
    matchPersonaDescription: false,
    matchCharacterDescription: false,
    matchCharacterPersonality: false,
    matchCharacterDepthPrompt: false,
    matchScenario: false,
    matchCreatorNotes: false,
    role: 0,
    automationId: '',
    outletName: '',
    vectorized: false,
    useProbability: false,
    addMemo: false,
    displayIndex: 0,
    delayUntilRecursion: 0,
    triggers: [],
    characterFilter: { isExclude: false, names: [], tags: [] },
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

  it('marks edge as blocked (blockedByPreventRecursion) when source has preventRecursion:true', () => {
    const entries = [
      makeEntry({ id: 'src', content: 'the wolf appeared', keys: [], preventRecursion: true }),
      makeEntry({ id: 'tgt', keys: ['wolf'] }),
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

  it('includes edges from entries with preventRecursion:true (graph is structural; simulator enforces this flag at runtime)', () => {
    const entries = [
      makeEntry({ id: 'src', content: 'the wolf appeared', keys: [], preventRecursion: true }),
      makeEntry({ id: 'tgt', keys: ['wolf'] }),
    ]
    const graph = buildGraph(entries, opts)
    expect(graph.edges.get('src')?.has('tgt')).toBe(true)
  })

  it('does not form edge when book has caseSensitive:true and content uses wrong case', () => {
    const entries = [
      makeEntry({ id: 'src', content: 'The Dragon roared', keys: [] }),
      makeEntry({ id: 'tgt', keys: ['dragon'] }),
    ]
    const graph = buildGraph(entries, { caseSensitive: true, matchWholeWords: false })
    expect(graph.edges.get('src')?.has('tgt')).toBe(false)
  })

  it('forms edge when per-entry caseSensitive:false overrides book caseSensitive:true', () => {
    const entries = [
      makeEntry({ id: 'src', content: 'The Dragon roared', keys: [] }),
      makeEntry({ id: 'tgt', keys: ['dragon'], caseSensitive: false }),
    ]
    const graph = buildGraph(entries, { caseSensitive: true, matchWholeWords: false })
    expect(graph.edges.get('src')?.has('tgt')).toBe(true)
  })

  it('sets blockedByExcludeRecursion:true on edges when target has excludeRecursion:true', () => {
    const entries = [
      makeEntry({ id: 'src', content: 'the wolf appeared', keys: [] }),
      makeEntry({ id: 'tgt', keys: ['wolf'], excludeRecursion: true }),
    ]
    const graph = buildGraph(entries, opts)
    const meta = graph.edgeMeta.get('src\u2192tgt')
    expect(meta?.blockedByExcludeRecursion).toBe(true)
  })

  it('sets blockedByExcludeRecursion:false on edges when target does not have excludeRecursion', () => {
    const entries = [
      makeEntry({ id: 'src', content: 'the wolf appeared', keys: [] }),
      makeEntry({ id: 'tgt', keys: ['wolf'], excludeRecursion: false }),
    ]
    const graph = buildGraph(entries, opts)
    const meta = graph.edgeMeta.get('src\u2192tgt')
    expect(meta?.blockedByExcludeRecursion).toBe(false)
  })
})

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

  it('does not detect cycle when the only cycle-completing edge is blocked by preventRecursion', () => {
    // A→B is blocked (A has preventRecursion). B→A is active. No real cycle.
    const entries = [
      makeEntry({ id: 'a', content: 'see the wolf', keys: ['castle'], preventRecursion: true }),
      makeEntry({ id: 'b', content: 'see the castle', keys: ['wolf'] }),
    ]
    const graph = buildGraph(entries, opts)
    expect(findCycles(graph).cycles).toHaveLength(0)
  })

  it('does not detect cycle when the only cycle-completing edge is blocked by excludeRecursion', () => {
    // A→B is blocked (B has excludeRecursion). B→A is active. No real cycle.
    const entries = [
      makeEntry({ id: 'a', content: 'see the wolf', keys: ['castle'] }),
      makeEntry({ id: 'b', content: 'see the castle', keys: ['wolf'], excludeRecursion: true }),
    ]
    const graph = buildGraph(entries, opts)
    expect(findCycles(graph).cycles).toHaveLength(0)
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
    expect(result.cycles[0]).toHaveLength(4)
  })
})

describe('findOrphans', () => {
  it('returns entries with no incoming edges (non-constants)', () => {
    const entries = [
      makeEntry({ id: 'tgt', content: '', keys: ['wolf'] }),
      makeEntry({ id: 'src', content: 'see the wolf', keys: [] }),
    ]
    const graph = buildGraph(entries, opts)
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

describe('incrementalUpdate', () => {
  it('removes outgoing edge when content changes to no longer match', () => {
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
    expect(newGraph.edgeMeta.has('src\u2192tgt')).toBe(false)
  })

  it('adds outgoing edge when content changes to match a new entry', () => {
    const entries = [
      makeEntry({ id: 'src', content: 'see the knight', keys: [] }),
      makeEntry({ id: 'tgt', keys: ['wolf'] }),
    ]
    const graph = buildGraph(entries, opts)
    expect(graph.edges.get('src')?.has('tgt')).toBe(false)

    const updatedSrc = { ...entries[0], content: 'see the wolf' }
    const updated = [updatedSrc, entries[1]]
    const newGraph = incrementalUpdate(graph, updatedSrc, updated, opts, 'content')

    expect(newGraph.edges.get('src')?.has('tgt')).toBe(true)
    expect(newGraph.reverseEdges.get('tgt')?.has('src')).toBe(true)
  })

  it('removes incoming edge when keys change to no longer match', () => {
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
    expect(newGraph.edgeMeta.has('src\u2192tgt')).toBe(false)
  })

  it('adds incoming edge when keys change to match existing content', () => {
    const entries = [
      makeEntry({ id: 'src', content: 'see the wolf', keys: [] }),
      makeEntry({ id: 'tgt', keys: ['dragon'] }),
    ]
    const graph = buildGraph(entries, opts)
    expect(graph.reverseEdges.get('tgt')?.has('src')).toBe(false)

    const updatedTgt = { ...entries[1], keys: ['wolf'] }
    const updated = [entries[0], updatedTgt]
    const newGraph = incrementalUpdate(graph, updatedTgt, updated, opts, 'keys')

    expect(newGraph.reverseEdges.get('tgt')?.has('src')).toBe(true)
    expect(newGraph.edges.get('src')?.has('tgt')).toBe(true)
  })

  it('does not mutate the original graph', () => {
    const entries = [
      makeEntry({ id: 'src', content: 'see the wolf', keys: [] }),
      makeEntry({ id: 'tgt', keys: ['wolf'] }),
    ]
    const graph = buildGraph(entries, opts)
    const originalEdgeSize = graph.edges.get('src')?.size

    const updatedSrc = { ...entries[0], content: 'see the knight' }
    incrementalUpdate(graph, updatedSrc, [updatedSrc, entries[1]], opts, 'content')

    // Original graph unchanged
    expect(graph.edges.get('src')?.size).toBe(originalEdgeSize)
  })
})
