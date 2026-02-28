import { describe, it, expect } from 'vitest'
import { buildGraph, findCycles, findOrphans, findDeadLinks } from './graph-service'
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

  it('includes edges from excludeRecursion:true entries (graph is structural; simulator enforces this flag at runtime)', () => {
    const entries = [
      makeEntry({ id: 'src', content: 'the wolf appeared', keys: [], excludeRecursion: true }),
      makeEntry({ id: 'tgt', keys: ['wolf'] }),
    ]
    const graph = buildGraph(entries, opts)
    expect(graph.edges.get('src')?.has('tgt')).toBe(true)
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
