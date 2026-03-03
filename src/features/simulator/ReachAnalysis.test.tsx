import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { WorkingEntry, RecursionGraph } from '@/types'
import { buildGraph } from '@/services/graph-service'
import { ReachAnalysis } from './ReachAnalysis'

function makeEntry(overrides: Partial<WorkingEntry> = {}): WorkingEntry {
  return {
    id: overrides.id ?? 'test-id',
    uid: 0,
    name: overrides.name ?? (overrides.id ? `Entry ${overrides.id.toUpperCase()}` : 'Test Entry'),
    content: overrides.content ?? '',
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
    preventRecursion: overrides.preventRecursion ?? false,
    excludeRecursion: overrides.excludeRecursion ?? false,
    ignoreBudget: false,
    group: '',
    groupOverride: false,
    groupWeight: 100,
    useGroupScoring: null,
    scanDepth: null,
    caseSensitive: null,
    matchWholeWords: null,
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
    displayIndex: null,
    delayUntilRecursion: 0,
    triggers: [],
    characterFilter: { isExclude: false, names: [], tags: [] },
    tokenCount: 0,
    extensions: {},
    ...overrides,
  }
}

const opts = { caseSensitive: false, matchWholeWords: false }

function emptyGraph(): RecursionGraph {
  return { edges: new Map(), reverseEdges: new Map(), edgeMeta: new Map() }
}

describe('ReachAnalysis', () => {
  it('renders "no other entries" when entry has no outgoing edges', () => {
    const entry = makeEntry({ id: 'a' })
    const graph = emptyGraph()
    graph.edges.set('a', new Set())

    render(
      <ReachAnalysis entry={entry} entries={[entry]} graph={graph} maxRecursionSteps={3} />,
    )
    expect(screen.getByText(/triggers no other entries/i)).toBeInTheDocument()
  })

  it('renders "no other entries" when graph has no entry node at all', () => {
    const entry = makeEntry({ id: 'a' })
    render(
      <ReachAnalysis entry={entry} entries={[entry]} graph={emptyGraph()} maxRecursionSteps={3} />,
    )
    expect(screen.getByText(/triggers no other entries/i)).toBeInTheDocument()
  })

  it('shows Step 1 with direct neighbor for a single-step chain', () => {
    const entryA = makeEntry({ id: 'a', content: 'mentions beta' })
    const entryB = makeEntry({ id: 'b', name: 'Entry Beta', keys: ['beta'] })
    const graph = buildGraph([entryA, entryB], opts)

    render(
      <ReachAnalysis entry={entryA} entries={[entryA, entryB]} graph={graph} maxRecursionSteps={3} />,
    )
    expect(screen.getByText(/step 1/i)).toBeInTheDocument()
    // Step 1 is expanded by default — entry B name should be visible
    expect(screen.getByText('Entry Beta')).toBeInTheDocument()
  })

  it('shows Step 1 and Step 2 for a two-step chain A→B→C', () => {
    const entryA = makeEntry({ id: 'a', content: 'mentions beta', name: 'Entry A' })
    const entryB = makeEntry({ id: 'b', content: 'mentions gamma', keys: ['beta'], name: 'Entry B' })
    const entryC = makeEntry({ id: 'c', keys: ['gamma'], name: 'Entry C' })
    const graph = buildGraph([entryA, entryB, entryC], opts)

    render(
      <ReachAnalysis
        entry={entryA}
        entries={[entryA, entryB, entryC]}
        graph={graph}
        maxRecursionSteps={2}
      />,
    )
    expect(screen.getByText(/step 1/i)).toBeInTheDocument()
    expect(screen.getByText(/step 2/i)).toBeInTheDocument()
    // Expand step 2 to verify C appears there
    fireEvent.click(screen.getByText(/step 2/i))
    expect(screen.getByText('Entry C')).toBeInTheDocument()
  })

  it('excludes blocked edges (preventRecursion) from reach calculation', () => {
    // A has preventRecursion, so A→B edge is blocked; B won't appear
    const entryA = makeEntry({ id: 'a', content: 'mentions beta', preventRecursion: true, name: 'Entry A' })
    const entryB = makeEntry({ id: 'b', keys: ['beta'], name: 'Entry B' })
    const graph = buildGraph([entryA, entryB], opts)

    render(
      <ReachAnalysis entry={entryA} entries={[entryA, entryB]} graph={graph} maxRecursionSteps={3} />,
    )
    expect(screen.getByText(/triggers no other entries/i)).toBeInTheDocument()
  })

  it('terminates correctly for maxRecursionSteps=0 with a finite chain', () => {
    const entryA = makeEntry({ id: 'a', content: 'mentions beta', name: 'Entry A' })
    const entryB = makeEntry({ id: 'b', content: 'mentions gamma', keys: ['beta'], name: 'Entry B' })
    const entryC = makeEntry({ id: 'c', keys: ['gamma'], name: 'Entry C' })
    const graph = buildGraph([entryA, entryB, entryC], opts)

    render(
      <ReachAnalysis
        entry={entryA}
        entries={[entryA, entryB, entryC]}
        graph={graph}
        maxRecursionSteps={0}
      />,
    )
    // All reachable entries should appear (capped at 10 steps max, but finite chain stops earlier)
    expect(screen.getByText(/step 1/i)).toBeInTheDocument()
    expect(screen.getByText(/step 2/i)).toBeInTheDocument()
  })

  it('does not show steps beyond maxRecursionSteps', () => {
    const entryA = makeEntry({ id: 'a', content: 'mentions beta', name: 'Entry A' })
    const entryB = makeEntry({ id: 'b', content: 'mentions gamma', keys: ['beta'], name: 'Entry B' })
    const entryC = makeEntry({ id: 'c', keys: ['gamma'], name: 'Entry C' })
    const graph = buildGraph([entryA, entryB, entryC], opts)

    render(
      <ReachAnalysis
        entry={entryA}
        entries={[entryA, entryB, entryC]}
        graph={graph}
        maxRecursionSteps={1}
      />,
    )
    expect(screen.getByText(/step 1/i)).toBeInTheDocument()
    expect(screen.queryByText(/step 2/i)).not.toBeInTheDocument()
  })

  it('calls onEntrySelect when an entry row is clicked', () => {
    const entryA = makeEntry({ id: 'a', content: 'mentions beta', name: 'Entry A' })
    const entryB = makeEntry({ id: 'b', keys: ['beta'], name: 'Entry Beta' })
    const graph = buildGraph([entryA, entryB], opts)
    const onSelect = vi.fn()

    render(
      <ReachAnalysis
        entry={entryA}
        entries={[entryA, entryB]}
        graph={graph}
        maxRecursionSteps={3}
        onEntrySelect={onSelect}
      />,
    )
    fireEvent.click(screen.getByText('Entry Beta'))
    expect(onSelect).toHaveBeenCalledWith('b')
  })
})
