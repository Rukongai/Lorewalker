import { describe, it, expect, vi } from 'vitest'
import { sillyTavernEngine } from './sillytavern-engine'
import { simulateConversation } from '../../simulator-service'
import type { WorkingEntry, SimulationContext } from '@/types'

function makeEntry(overrides: Partial<WorkingEntry> = {}): WorkingEntry {
  return {
    id: `entry-${Math.random().toString(36).slice(2, 8)}`,
    uid: 0,
    name: 'Test Entry',
    content: '',
    keys: [],
    secondaryKeys: [],
    constant: false,
    selective: false,
    selectiveLogic: 0,
    enabled: true,
    position: 1,
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
    addMemo: true,
    displayIndex: null,
    delayUntilRecursion: 0,
    triggers: [],
    characterFilter: { isExclude: false, names: [], tags: [] },
    tokenCount: 10,
    extensions: {},
    ...overrides,
  }
}

function makeContext(overrides: Partial<SimulationContext> = {}): SimulationContext {
  return {
    messages: [{ role: 'user', content: 'Hello world' }],
    scanDepth: 4,
    tokenBudget: 10000,
    caseSensitive: false,
    matchWholeWords: false,
    maxRecursionSteps: 0,
    includeNames: false,
    ...overrides,
  }
}

describe('SillyTavernEngine', () => {
  describe('Core activation', () => {
    it('activates constant entries always', () => {
      const entry = makeEntry({ constant: true, keys: [] })
      const ctx = makeContext({ messages: [{ role: 'user', content: 'nothing relevant' }] })
      const result = sillyTavernEngine.simulate([entry], ctx)
      expect(result.activatedEntries).toHaveLength(1)
      expect(result.activatedEntries[0].entryId).toBe(entry.id)
      expect(result.activatedEntries[0].activatedBy).toBe('constant')
    })

    it('activates keyword-matched entries', () => {
      const entry = makeEntry({ keys: ['forest'] })
      const ctx = makeContext({ messages: [{ role: 'user', content: 'We enter the forest.' }] })
      const result = sillyTavernEngine.simulate([entry], ctx)
      expect(result.activatedEntries).toHaveLength(1)
      expect(result.activatedEntries[0].activatedBy).toBe('keyword')
      expect(result.activatedEntries[0].matchedKeywords).toContain('forest')
    })

    it('does not activate non-matching entries', () => {
      const entry = makeEntry({ keys: ['dragon'] })
      const ctx = makeContext({ messages: [{ role: 'user', content: 'We enter the forest.' }] })
      const result = sillyTavernEngine.simulate([entry], ctx)
      expect(result.activatedEntries).toHaveLength(0)
    })
  })

  describe('Selective logic', () => {
    it('applies AND ANY selective logic (selectiveLogic=0)', () => {
      const entry = makeEntry({
        keys: ['forest'],
        selective: true,
        selectiveLogic: 0,
        secondaryKeys: ['dark', 'ancient'],
      })
      // Has "forest" + one secondary key
      const ctx = makeContext({ messages: [{ role: 'user', content: 'We enter the dark forest.' }] })
      const result = sillyTavernEngine.simulate([entry], ctx)
      expect(result.activatedEntries).toHaveLength(1)
    })

    it('filters out AND ANY when no secondary matches', () => {
      const entry = makeEntry({
        keys: ['forest'],
        selective: true,
        selectiveLogic: 0,
        secondaryKeys: ['dark', 'ancient'],
      })
      const ctx = makeContext({ messages: [{ role: 'user', content: 'We enter the bright forest.' }] })
      const result = sillyTavernEngine.simulate([entry], ctx)
      expect(result.activatedEntries).toHaveLength(0)
    })

    it('applies AND ALL selective logic (selectiveLogic=1)', () => {
      const entry = makeEntry({
        keys: ['forest'],
        selective: true,
        selectiveLogic: 1,
        secondaryKeys: ['dark', 'ancient'],
      })
      // Both secondary keys present
      const ctx = makeContext({ messages: [{ role: 'user', content: 'We enter the dark ancient forest.' }] })
      const result = sillyTavernEngine.simulate([entry], ctx)
      expect(result.activatedEntries).toHaveLength(1)
    })

    it('filters out AND ALL when not all secondary match', () => {
      const entry = makeEntry({
        keys: ['forest'],
        selective: true,
        selectiveLogic: 1,
        secondaryKeys: ['dark', 'ancient'],
      })
      const ctx = makeContext({ messages: [{ role: 'user', content: 'We enter the dark forest.' }] })
      const result = sillyTavernEngine.simulate([entry], ctx)
      expect(result.activatedEntries).toHaveLength(0)
    })

    it('applies NOT ANY selective logic (selectiveLogic=2)', () => {
      const entry = makeEntry({
        keys: ['forest'],
        selective: true,
        selectiveLogic: 2,
        secondaryKeys: ['dark', 'ancient'],
      })
      // No secondary keys present
      const ctx = makeContext({ messages: [{ role: 'user', content: 'We enter the bright forest.' }] })
      const result = sillyTavernEngine.simulate([entry], ctx)
      expect(result.activatedEntries).toHaveLength(1)
    })

    it('filters out NOT ANY when secondary key is present', () => {
      const entry = makeEntry({
        keys: ['forest'],
        selective: true,
        selectiveLogic: 2,
        secondaryKeys: ['dark'],
      })
      const ctx = makeContext({ messages: [{ role: 'user', content: 'We enter the dark forest.' }] })
      const result = sillyTavernEngine.simulate([entry], ctx)
      expect(result.activatedEntries).toHaveLength(0)
    })

    it('applies NOT ALL selective logic (selectiveLogic=3)', () => {
      const entry = makeEntry({
        keys: ['forest'],
        selective: true,
        selectiveLogic: 3,
        secondaryKeys: ['dark', 'ancient'],
      })
      // Only one secondary key → not all match → passes NOT ALL
      const ctx = makeContext({ messages: [{ role: 'user', content: 'We enter the dark forest.' }] })
      const result = sillyTavernEngine.simulate([entry], ctx)
      expect(result.activatedEntries).toHaveLength(1)
    })

    it('filters out NOT ALL when all secondary keys match', () => {
      const entry = makeEntry({
        keys: ['forest'],
        selective: true,
        selectiveLogic: 3,
        secondaryKeys: ['dark', 'ancient'],
      })
      const ctx = makeContext({ messages: [{ role: 'user', content: 'We enter the dark ancient forest.' }] })
      const result = sillyTavernEngine.simulate([entry], ctx)
      expect(result.activatedEntries).toHaveLength(0)
    })
  })

  describe('Recursion', () => {
    it('activates entries via recursion from activated entry content', () => {
      // Location entry: activated by "forest", content mentions "dryad"
      const location = makeEntry({
        id: 'location',
        name: 'Forest Location',
        keys: ['forest'],
        content: 'A forest filled with a dryad.',
        tokenCount: 10,
      })
      // NPC entry: activated by "dryad"
      const npc = makeEntry({
        id: 'npc',
        name: 'Dryad NPC',
        keys: ['dryad'],
        content: 'A forest spirit.',
        tokenCount: 5,
      })
      const ctx = makeContext({ messages: [{ role: 'user', content: 'We enter the forest.' }] })
      const result = sillyTavernEngine.simulate([location, npc], ctx)

      const activatedIds = result.activatedEntries.map((e) => e.entryId)
      expect(activatedIds).toContain('location')
      expect(activatedIds).toContain('npc')

      const npcEntry = result.activatedEntries.find((e) => e.entryId === 'npc')
      expect(npcEntry?.activatedBy).toBe('recursion')
      expect(result.recursionTrace).toHaveLength(1)
      expect(result.recursionTrace[0].scannedEntryId).toBe('location')
      expect(result.recursionTrace[0].triggeredByEntryId).toBeNull()
      expect(result.recursionTrace[0].activatedEntryIds).toContain('npc')
    })

    it('respects preventRecursion: does not scan entry content during recursion', () => {
      const location = makeEntry({
        id: 'location',
        keys: ['forest'],
        content: 'A forest filled with a dryad.',
        preventRecursion: true,
      })
      const npc = makeEntry({
        id: 'npc',
        keys: ['dryad'],
        content: 'A forest spirit.',
      })
      const ctx = makeContext({ messages: [{ role: 'user', content: 'We enter the forest.' }] })
      const result = sillyTavernEngine.simulate([location, npc], ctx)

      const activatedIds = result.activatedEntries.map((e) => e.entryId)
      expect(activatedIds).toContain('location')
      expect(activatedIds).not.toContain('npc')
    })

    it('respects excludeRecursion: entry keys cannot be triggered by recursion', () => {
      const location = makeEntry({
        id: 'location',
        keys: ['forest'],
        content: 'A forest filled with a dryad.',
      })
      const npc = makeEntry({
        id: 'npc',
        keys: ['dryad'],
        content: 'A forest spirit.',
        excludeRecursion: true, // cannot be triggered via recursion
      })
      const ctx = makeContext({ messages: [{ role: 'user', content: 'We enter the forest.' }] })
      const result = sillyTavernEngine.simulate([location, npc], ctx)

      const activatedIds = result.activatedEntries.map((e) => e.entryId)
      expect(activatedIds).toContain('location')
      expect(activatedIds).not.toContain('npc')
    })

    it('respects maxRecursionSteps limit', () => {
      // A → B → C chain, but maxRecursionSteps=1 means only A→B fires
      const entryA = makeEntry({ id: 'a', keys: ['alpha'], content: 'beta is here.' })
      const entryB = makeEntry({ id: 'b', keys: ['beta'], content: 'gamma is here.' })
      const entryC = makeEntry({ id: 'c', keys: ['gamma'], content: '' })

      const ctx = makeContext({
        messages: [{ role: 'user', content: 'alpha appears.' }],
        maxRecursionSteps: 1,
      })
      const result = sillyTavernEngine.simulate([entryA, entryB, entryC], ctx)
      const activatedIds = result.activatedEntries.map((e) => e.entryId)
      expect(activatedIds).toContain('a')
      expect(activatedIds).toContain('b')
      expect(activatedIds).not.toContain('c')
    })

    it('sets triggeredByEntryId correctly for multi-level recursion', () => {
      // A (keyword) → B (scan 0) → C (scan 1)
      const entryA = makeEntry({ id: 'a', keys: ['alpha'], content: 'beta is here.' })
      const entryB = makeEntry({ id: 'b', keys: ['beta'], content: 'gamma is here.' })
      const entryC = makeEntry({ id: 'c', keys: ['gamma'], content: '' })

      const ctx = makeContext({
        messages: [{ role: 'user', content: 'alpha appears.' }],
      })
      const result = sillyTavernEngine.simulate([entryA, entryB, entryC], ctx)

      // Scan 0: A is scanned, activates B — A was keyword-activated so triggeredByEntryId is null
      const scan0Step = result.recursionTrace.find((s) => s.step === 0 && s.scannedEntryId === 'a')
      expect(scan0Step).toBeDefined()
      expect(scan0Step?.triggeredByEntryId).toBeNull()
      expect(scan0Step?.activatedEntryIds).toContain('b')

      // Scan 1: B is scanned, activates C — B was recursion-activated by A
      const scan1Step = result.recursionTrace.find((s) => s.step === 1 && s.scannedEntryId === 'b')
      expect(scan1Step).toBeDefined()
      expect(scan1Step?.triggeredByEntryId).toBe('a')
      expect(scan1Step?.activatedEntryIds).toContain('c')
    })
  })

  describe('Budget', () => {
    it('skips entries when token budget exhausted', () => {
      const entry1 = makeEntry({ id: 'e1', keys: ['alpha'], tokenCount: 50 })
      const entry2 = makeEntry({ id: 'e2', keys: ['beta'], tokenCount: 60 })

      const ctx = makeContext({
        messages: [{ role: 'user', content: 'alpha beta here.' }],
        tokenBudget: 80, // only room for one entry
      })
      const result = sillyTavernEngine.simulate([entry1, entry2], ctx)
      expect(result.activatedEntries).toHaveLength(1)
      expect(result.skippedEntries.some((e) => e.reason === 'budget-exhausted')).toBe(true)
      expect(result.budgetExhausted).toBe(true)
    })

    it('ignoreBudget entries skip budget check', () => {
      const entry1 = makeEntry({ id: 'e1', keys: ['alpha'], tokenCount: 90 })
      const entry2 = makeEntry({ id: 'e2', keys: ['beta'], tokenCount: 20, ignoreBudget: true })

      const ctx = makeContext({
        messages: [{ role: 'user', content: 'alpha beta here.' }],
        tokenBudget: 100,
      })
      const result = sillyTavernEngine.simulate([entry1, entry2], ctx)
      const activatedIds = result.activatedEntries.map((e) => e.entryId)
      // Both should activate (e2 ignores budget)
      expect(activatedIds).toContain('e2')
    })
  })

  describe('Timed effects', () => {
    it('skips disabled entries', () => {
      const entry = makeEntry({ keys: ['forest'], enabled: false })
      const ctx = makeContext({ messages: [{ role: 'user', content: 'We enter the forest.' }] })
      const result = sillyTavernEngine.simulate([entry], ctx)
      expect(result.activatedEntries).toHaveLength(0)
    })

    it('applies probability roll (0% never activates)', () => {
      const entry = makeEntry({ keys: ['forest'], probability: 0, useProbability: true })
      const ctx = makeContext({ messages: [{ role: 'user', content: 'We enter the forest.' }] })
      const result = sillyTavernEngine.simulate([entry], ctx)
      expect(result.activatedEntries).toHaveLength(0)
      expect(result.skippedEntries[0].reason).toBe('probability-failed')
    })

    it('applies probability roll (100% always activates)', () => {
      const entry = makeEntry({ keys: ['forest'], probability: 100, useProbability: true })
      const ctx = makeContext({ messages: [{ role: 'user', content: 'We enter the forest.' }] })
      const result = sillyTavernEngine.simulate([entry], ctx)
      expect(result.activatedEntries).toHaveLength(1)
    })

    it('mocks Math.random for probability test', () => {
      const spy = vi.spyOn(Math, 'random').mockReturnValue(0.5) // roll = 50
      const entry = makeEntry({ keys: ['forest'], probability: 40, useProbability: true })
      const ctx = makeContext({ messages: [{ role: 'user', content: 'We enter the forest.' }] })
      const result = sillyTavernEngine.simulate([entry], ctx)
      // roll (50) >= probability (40), so should fail
      expect(result.activatedEntries).toHaveLength(0)
      spy.mockRestore()
    })
  })

  describe('Multi-message (via simulateConversation)', () => {
    it('threads TimedEffectState across conversation steps', () => {
      const entry = makeEntry({
        id: 'sticky-entry',
        keys: ['forest'],
        sticky: 2, // stays active for 2 messages after activation
        probability: 100,
      })

      const messages = [
        { role: 'user' as const, content: 'We enter the forest.' },
        { role: 'user' as const, content: 'We walk around.' },  // no keyword, but sticky keeps it
      ]
      const settings = {
        defaultScanDepth: 4,
        defaultTokenBudget: 10000,
        defaultCaseSensitive: false,
        defaultMatchWholeWords: false,
        defaultMaxRecursionSteps: 0,
        defaultIncludeNames: false,
      }

      const steps = simulateConversation([entry], messages, settings)
      expect(steps).toHaveLength(2)
      // Step 0: activated by keyword
      expect(steps[0].result.activatedEntries.some((e) => e.entryId === 'sticky-entry')).toBe(true)
      // Step 1: still active via sticky
      expect(steps[1].result.activatedEntries.some((e) => e.entryId === 'sticky-entry')).toBe(true)
      // Verify message is threaded correctly
      expect(steps[0].message.content).toBe('We enter the forest.')
      expect(steps[1].message.content).toBe('We walk around.')
    })
  })
})
