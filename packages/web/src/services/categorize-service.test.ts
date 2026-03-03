import { describe, it, expect, vi } from 'vitest'
import { categorizeEntry, categorizeAll } from './categorize-service'
import type { WorkingEntry } from '@/types'
import type { LLMService } from '@/services/llm/llm-service'

function makeEntry(overrides: Partial<WorkingEntry> = {}): WorkingEntry {
  return {
    id: 'test-id',
    uid: 0,
    name: 'Test Entry',
    content: 'A warrior from the northern realm.',
    keys: ['warrior', 'northern'],
    secondaryKeys: [],
    constant: false,
    selective: false,
    selectiveLogic: 0,
    enabled: true,
    position: 1,
    order: 100,
    depth: 4,
    delay: null,
    cooldown: null,
    sticky: null,
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
    tokenCount: 8,
    extensions: {},
    ...overrides,
  }
}

function makeMockLLMService(responseContent: string): LLMService {
  return {
    complete: vi.fn().mockResolvedValue({
      content: responseContent,
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      model: 'test-model',
    }),
  } as unknown as LLMService
}

describe('categorizeEntry', () => {
  it('returns the category from a valid LLM response', async () => {
    const llm = makeMockLLMService('{"category":"character"}')
    const entry = makeEntry()
    const result = await categorizeEntry(entry, llm, 'provider-1')
    expect(result).toBe('character')
  })

  it('returns "generic" when LLM returns invalid JSON', async () => {
    const llm = makeMockLLMService('not valid json')
    const entry = makeEntry()
    const result = await categorizeEntry(entry, llm, 'provider-1')
    expect(result).toBe('generic')
  })

  it('returns "generic" when LLM returns unknown category', async () => {
    const llm = makeMockLLMService('{"category":"planet"}')
    const entry = makeEntry()
    const result = await categorizeEntry(entry, llm, 'provider-1')
    expect(result).toBe('generic')
  })

  it('returns "generic" when LLM throws', async () => {
    const llm = {
      complete: vi.fn().mockRejectedValue(new Error('Network error')),
    } as unknown as LLMService
    const entry = makeEntry()
    const result = await categorizeEntry(entry, llm, 'provider-1')
    expect(result).toBe('generic')
  })

  it('handles all 8 fixed categories', async () => {
    const categories = ['character', 'location', 'rule', 'event', 'faction', 'item', 'lore', 'generic']
    for (const cat of categories) {
      const llm = makeMockLLMService(`{"category":"${cat}"}`)
      const result = await categorizeEntry(makeEntry(), llm, 'p1')
      expect(result).toBe(cat)
    }
  })
})

describe('categorizeAll', () => {
  it('processes all entries and returns id → category map', async () => {
    const llm = makeMockLLMService('{"category":"location"}')
    const entries = [makeEntry({ id: 'a' }), makeEntry({ id: 'b' })]
    const progress: Array<[number, number]> = []
    const result = await categorizeAll(entries, llm, 'p1', (d, t) => progress.push([d, t]))
    expect(result).toEqual({ a: 'location', b: 'location' })
    expect(progress).toEqual([[1, 2], [2, 2]])
  })

  it('skips entries with existing userCategory when skipManualOverrides=true', async () => {
    const llm = makeMockLLMService('{"category":"faction"}')
    const entries = [
      makeEntry({ id: 'a', userCategory: 'character' }),
      makeEntry({ id: 'b' }),
    ]
    const result = await categorizeAll(entries, llm, 'p1', () => {}, true)
    expect(result).toEqual({ b: 'faction' })
    expect(result['a']).toBeUndefined()
  })

  it('processes all entries when skipManualOverrides=false', async () => {
    const llm = makeMockLLMService('{"category":"item"}')
    const entries = [
      makeEntry({ id: 'a', userCategory: 'character' }),
      makeEntry({ id: 'b' }),
    ]
    const result = await categorizeAll(entries, llm, 'p1', () => {}, false)
    expect(result).toEqual({ a: 'item', b: 'item' })
  })
})
