import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { WorkingEntry, ActivationResult } from '@/types'
import { EntryActivationProfile } from './EntryActivationProfile'

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

describe('EntryActivationProfile', () => {
  it('shows "run a simulation" prompt when result is null', () => {
    const entry = makeEntry()
    render(<EntryActivationProfile entry={entry} entries={[entry]} result={null} />)
    expect(screen.getByText(/run a simulation/i)).toBeInTheDocument()
  })

  it('shows "Activated via constant" badge when entry activated as constant', () => {
    const entry = makeEntry({ id: 'a' })
    const result = makeResult({
      activatedEntries: [
        {
          entryId: 'a',
          activatedBy: 'constant',
          triggerChain: [],
          matchedKeywords: [],
          matchedInMessage: 0,
          tokenCost: 42,
          insertionPosition: 1,
          insertionOrder: 0,
        },
      ],
    })
    render(<EntryActivationProfile entry={entry} entries={[entry]} result={result} />)
    expect(screen.getByText(/activated via constant/i)).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('After Char Defs')).toBeInTheDocument()
  })

  it('shows keyword chips when activated via keyword', () => {
    const entry = makeEntry({ id: 'a' })
    const result = makeResult({
      activatedEntries: [
        {
          entryId: 'a',
          activatedBy: 'keyword',
          triggerChain: [],
          matchedKeywords: ['wolf', 'castle'],
          matchedInMessage: 0,
          tokenCost: 10,
          insertionPosition: 1,
          insertionOrder: 0,
        },
      ],
    })
    render(<EntryActivationProfile entry={entry} entries={[entry]} result={result} />)
    expect(screen.getByText(/activated via keyword/i)).toBeInTheDocument()
    expect(screen.getByText('wolf')).toBeInTheDocument()
    expect(screen.getByText('castle')).toBeInTheDocument()
  })

  it('shows trigger chain breadcrumb when activated via recursion', () => {
    const entryA = makeEntry({ id: 'a', name: 'Entry A' })
    const entryB = makeEntry({ id: 'b', name: 'Entry B' })
    const result = makeResult({
      activatedEntries: [
        {
          entryId: 'b',
          activatedBy: 'recursion',
          triggerChain: ['a', 'b'],
          matchedKeywords: [],
          matchedInMessage: 0,
          tokenCost: 5,
          insertionPosition: 1,
          insertionOrder: 0,
        },
      ],
    })
    render(<EntryActivationProfile entry={entryB} entries={[entryA, entryB]} result={result} />)
    expect(screen.getByText(/activated via recursion/i)).toBeInTheDocument()
    expect(screen.getByText('Entry A')).toBeInTheDocument()
    expect(screen.getByText('Entry B')).toBeInTheDocument()
  })

  it('shows skipped badge with "Budget exhausted" reason', () => {
    const entry = makeEntry({ id: 'a' })
    const result = makeResult({
      skippedEntries: [
        {
          entryId: 'a',
          reason: 'budget-exhausted',
          matchedKeywords: [],
        },
      ],
    })
    render(<EntryActivationProfile entry={entry} entries={[entry]} result={result} />)
    expect(screen.getByText(/skipped — budget exhausted/i)).toBeInTheDocument()
  })

  it('shows skipped keywords when skipped entry has matchedKeywords', () => {
    const entry = makeEntry({ id: 'a' })
    const result = makeResult({
      skippedEntries: [
        {
          entryId: 'a',
          reason: 'probability-failed',
          matchedKeywords: ['dragon'],
        },
      ],
    })
    render(<EntryActivationProfile entry={entry} entries={[entry]} result={result} />)
    expect(screen.getByText(/skipped — probability failed/i)).toBeInTheDocument()
    expect(screen.getByText('dragon')).toBeInTheDocument()
  })

  it('shows "not triggered" state when entry is in neither list', () => {
    const entry = makeEntry({ id: 'a' })
    const result = makeResult()
    render(<EntryActivationProfile entry={entry} entries={[entry]} result={result} />)
    expect(screen.getByText(/not triggered/i)).toBeInTheDocument()
  })
})
