import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type {
  WorkingEntry,
  BookMeta,
  RecursionGraph,
  SimulatorState,
  SimulationSettings,
  ActivationResult,
} from '@/types'
import { SimulatorView } from './SimulatorView'

// ---- Factories ----

function makeEntry(overrides: Partial<WorkingEntry> = {}): WorkingEntry {
  return {
    id: overrides.id ?? 'test-id',
    uid: 0,
    name: overrides.name ?? 'Test Entry',
    content: '',
    keys: [],
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

function makeBookMeta(overrides: Partial<BookMeta> = {}): BookMeta {
  return {
    name: 'Test Book',
    description: '',
    scanDepth: 5,
    tokenBudget: 2048,
    contextSize: 200000,
    recursiveScan: true,
    caseSensitive: false,
    matchWholeWords: false,
    extensions: {},
    minActivations: 0,
    maxDepth: 0,
    maxRecursionSteps: 3,
    insertionStrategy: 'evenly',
    includeNames: false,
    useGroupScoring: false,
    alertOnOverflow: false,
    budgetCap: 0,
    ...overrides,
  }
}

function makeSettings(overrides: Partial<SimulationSettings> = {}): SimulationSettings {
  return {
    defaultScanDepth: 5,
    defaultTokenBudget: 2048,
    defaultCaseSensitive: false,
    defaultMatchWholeWords: false,
    defaultMaxRecursionSteps: 3,
    defaultIncludeNames: false,
    ...overrides,
  }
}

function makeSimulatorState(overrides: Partial<SimulatorState> = {}): SimulatorState {
  return {
    messages: [],
    settings: makeSettings(),
    lastResult: null,
    conversationHistory: [],
    connectionsMode: false,
    ...overrides,
  }
}

function makeResult(overrides: Partial<ActivationResult> = {}): ActivationResult {
  return {
    activatedEntries: [],
    skippedEntries: [],
    totalTokens: 0,
    budgetRemaining: 2048,
    budgetExhausted: false,
    recursionTrace: [],
    timedEffectState: {
      stickyEntries: new Map(),
      cooldownEntries: new Map(),
      messageCount: 0,
    },
    ...overrides,
  }
}

function makeGraph(): RecursionGraph {
  return { edges: new Map(), reverseEdges: new Map(), edgeMeta: new Map() }
}

// ---- Tests ----

const baseProps = {
  entries: [],
  bookMeta: makeBookMeta(),
  graph: makeGraph(),
  onRunSimulation: vi.fn(),
  onUpdateSettings: vi.fn(),
  onSetMessages: vi.fn(),
}

describe('SimulatorView — lorebook scope', () => {
  it('renders MessageComposer in lorebook scope', () => {
    render(
      <SimulatorView
        {...baseProps}
        scope="lorebook"
        simulatorState={makeSimulatorState()}
      />,
    )
    // MessageComposer renders "Add message" button
    expect(screen.getByText(/add message/i)).toBeInTheDocument()
  })

  it('renders Run button and calls onRunSimulation on click', () => {
    const onRun = vi.fn()
    render(
      <SimulatorView
        {...baseProps}
        scope="lorebook"
        simulatorState={makeSimulatorState()}
        onRunSimulation={onRun}
      />,
    )
    fireEvent.click(screen.getByText(/run simulation/i))
    expect(onRun).toHaveBeenCalledTimes(1)
  })

  it('renders settings fields', () => {
    render(
      <SimulatorView
        {...baseProps}
        scope="lorebook"
        simulatorState={makeSimulatorState()}
      />,
    )
    expect(screen.getByText(/scan depth/i)).toBeInTheDocument()
    expect(screen.getByText(/token budget/i)).toBeInTheDocument()
    expect(screen.getByText(/max recursion steps/i)).toBeInTheDocument()
  })

  it('renders ActivationResultList when result exists', () => {
    const result = makeResult({
      activatedEntries: [
        {
          entryId: 'a',
          activatedBy: 'constant',
          triggerChain: [],
          matchedKeywords: [],
          matchedInMessage: 0,
          tokenCost: 10,
          insertionPosition: 1,
          insertionOrder: 0,
        },
      ],
    })
    const entry = makeEntry({ id: 'a', name: 'My Entry' })
    render(
      <SimulatorView
        {...baseProps}
        scope="lorebook"
        entries={[entry]}
        simulatorState={makeSimulatorState({ lastResult: result })}
      />,
    )
    expect(screen.getByText('My Entry')).toBeInTheDocument()
  })
})

describe('SimulatorView — entry scope', () => {
  it('renders EntryActivationProfile in entry scope', () => {
    const entry = makeEntry({ id: 'a', name: 'My Entry' })
    render(
      <SimulatorView
        {...baseProps}
        scope="entry"
        entry={entry}
        entries={[entry]}
        simulatorState={makeSimulatorState()}
      />,
    )
    // EntryActivationProfile renders "Run a simulation" prompt when no result
    expect(screen.getByText(/run a simulation to see this entry/i)).toBeInTheDocument()
  })

  it('renders ReachAnalysis in entry scope', () => {
    const entry = makeEntry({ id: 'a' })
    render(
      <SimulatorView
        {...baseProps}
        scope="entry"
        entry={entry}
        entries={[entry]}
        simulatorState={makeSimulatorState()}
      />,
    )
    // ReachAnalysis renders "no other entries" when no outgoing edges
    expect(screen.getByText(/triggers no other entries/i)).toBeInTheDocument()
  })

  it('renders null when scope is entry but entry is undefined', () => {
    const { container } = render(
      <SimulatorView
        {...baseProps}
        scope="entry"
        entry={undefined}
        simulatorState={makeSimulatorState()}
      />,
    )
    expect(container.firstChild).toBeNull()
  })
})
