import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { WorkingEntry, BookMeta } from '@/types'
import { KeywordsView } from './KeywordsView'

// Copy makeEntry/makeBookMeta verbatim from analysis-service.test.ts
function makeEntry(overrides: Partial<WorkingEntry> = {}): WorkingEntry {
  return {
    id: overrides.id ?? 'test-id',
    uid: 0,
    name: overrides.name ?? 'Test Entry',
    content: overrides.content ?? 'Some content',
    keys: overrides.keys ?? ['testkey'],
    secondaryKeys: overrides.secondaryKeys ?? [],
    constant: overrides.constant ?? false,
    selective: overrides.selective ?? false,
    selectiveLogic: 0,
    enabled: overrides.enabled ?? true,
    position: overrides.position ?? 0,
    order: overrides.order ?? 100,
    depth: 4,
    delay: 0,
    cooldown: 0,
    sticky: overrides.sticky ?? 0,
    probability: overrides.probability ?? 100,
    preventRecursion: overrides.preventRecursion ?? false,
    excludeRecursion: false,
    ignoreBudget: overrides.ignoreBudget ?? false,
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
    vectorized: overrides.vectorized ?? false,
    useProbability: overrides.useProbability ?? true,
    addMemo: overrides.addMemo ?? true,
    displayIndex: null,
    delayUntilRecursion: 0,
    triggers: [],
    characterFilter: { isExclude: false, names: [], tags: [] },
    tokenCount: overrides.tokenCount ?? 0,
    extensions: {},
    ...overrides,
  }
}

function makeBookMeta(overrides: Partial<BookMeta> = {}): BookMeta {
  return {
    name: '',
    description: '',
    scanDepth: 4,
    tokenBudget: 2048,
    contextSize: 200000,
    recursiveScan: false,
    caseSensitive: false,
    matchWholeWords: false,
    extensions: {},
    minActivations: 0,
    maxDepth: 0,
    maxRecursionSteps: 0,
    insertionStrategy: 'evenly',
    includeNames: false,
    useGroupScoring: false,
    alertOnOverflow: false,
    budgetCap: 0,
    ...overrides,
  }
}

describe('KeywordsView — lorebook scope', () => {
  it('renders keyword filter input', () => {
    render(
      <KeywordsView
        scope="lorebook"
        entries={[makeEntry({ keys: ['dragon', 'fire'] })]}
        bookMeta={makeBookMeta()}
      />
    )
    expect(screen.getByPlaceholderText('Filter keywords…')).toBeInTheDocument()
  })

  it('shows empty state when entries array is empty', () => {
    render(
      <KeywordsView scope="lorebook" entries={[]} bookMeta={makeBookMeta()} />
    )
    expect(screen.getByText(/no keywords/i)).toBeInTheDocument()
  })
})

describe('KeywordsView — entry scope', () => {
  it('renders primary keyword label', () => {
    const entry = makeEntry({ keys: ['fire'] })
    render(
      <KeywordsView
        scope="entry"
        entries={[entry]}
        entry={entry}
        activeFormat="sillytavern"
        onUpdateEntry={() => undefined}
      />
    )
    expect(screen.getByText(/primary keywords/i)).toBeInTheDocument()
  })

  it('renders KeywordObjectsEditor for rolecall format', () => {
    const entry = makeEntry({
      keys: ['fire'],
      keywordObjects: [{ keyword: 'fire', isRegex: false, probability: 100 }],
    })
    render(
      <KeywordsView
        scope="entry"
        entries={[entry]}
        entry={entry}
        activeFormat="rolecall"
        onUpdateEntry={() => undefined}
      />
    )
    // KeywordObjectsEditor renders "Prob %" column header
    expect(screen.getByText('Prob %')).toBeInTheDocument()
  })

  it('does NOT render KeywordObjectsEditor for sillytavern format', () => {
    const entry = makeEntry({ keys: ['fire'] })
    render(
      <KeywordsView
        scope="entry"
        entries={[entry]}
        entry={entry}
        activeFormat="sillytavern"
        onUpdateEntry={() => undefined}
      />
    )
    expect(screen.queryByText('Prob %')).not.toBeInTheDocument()
  })
})
