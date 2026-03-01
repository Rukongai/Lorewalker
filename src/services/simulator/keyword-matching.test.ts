import { describe, it, expect } from 'vitest'
import { doesEntryMatchText, matchKeywordsInText } from './keyword-matching'
import type { WorkingEntry } from '@/types'

function makeEntry(overrides: Partial<WorkingEntry> = {}): WorkingEntry {
  return {
    id: 'test-id',
    uid: 0,
    name: 'Test Entry',
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
    useProbability: true,
    addMemo: false,
    displayIndex: null,
    delayUntilRecursion: 0,
    triggers: [],
    characterFilter: { isExclude: false, names: [], tags: [] },
    tokenCount: 0,
    extensions: {},
    ...overrides,
  } as WorkingEntry
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

  it('treats slash-prefixed key with no closing slash as literal match', () => {
    // Key '/castle' is not a valid regex (no closing '/') — should match literally
    const entry = makeEntry({ keys: ['/castle'] })
    const matches = doesEntryMatchText(entry, 'visited /castle today', DEFAULT_OPTS)
    expect(matches).toHaveLength(1)
    expect(matches[0].keyword).toBe('/castle')
    expect(matches[0].isRegex).toBe(false)
  })

  it('does not produce overlapping matches for repeated characters', () => {
    const entry = makeEntry({ keys: ['aa'] })
    // 'aaa' has one non-overlapping match at position 0, not two at 0 and 1
    const matches = doesEntryMatchText(entry, 'aaa', DEFAULT_OPTS)
    expect(matches).toHaveLength(1)
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
