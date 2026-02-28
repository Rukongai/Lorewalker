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

  it('includes edges from excludeRecursion:true entries (graph is structural; simulator enforces this flag at runtime)', () => {
    const entries = [
      makeEntry({ id: 'src', content: 'the wolf appeared', keys: [], excludeRecursion: true }),
      makeEntry({ id: 'tgt', keys: ['wolf'] }),
    ]
    const graph = buildGraph(entries, opts)
    expect(graph.edges.get('src')?.has('tgt')).toBe(true)
  })
})
