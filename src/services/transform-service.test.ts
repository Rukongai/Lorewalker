import { describe, it, expect } from 'vitest'
import { inflate, deflate, inflateFromRawST, inflateFromRoleCall, deflateToRoleCall } from './transform-service'
import type { RawSTBook, RawSTEntry, RawRoleCallBook } from './transform-service'
import type { CCv3CharacterBook } from '@character-foundry/character-foundry/loader'

function makeBook(overrides: Partial<CCv3CharacterBook> = {}): CCv3CharacterBook {
  return {
    name: 'Test Book',
    description: 'A test lorebook',
    scan_depth: 4,
    token_budget: 4096,
    recursive_scanning: false,
    extensions: {},
    entries: [
      {
        keys: ['dragon', 'wyrm'],
        content: 'Dragons are ancient winged creatures.',
        enabled: true,
        insertion_order: 100,
        name: 'Dragon',
        id: 0,
        selective: false,
        secondary_keys: [],
        constant: false,
        position: 0,
        extensions: {
          sillytavern: {
            delay: 0,
            cooldown: 0,
            sticky: 0,
            ignoreBudget: false,
            excludeRecursion: false,
            preventRecursion: false,
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
          },
        },
        probability: 100,
        depth: 4,
        selective_logic: 0,
      },
      {
        keys: ['castle'],
        content: 'The castle of Thornhaven looms large.',
        enabled: true,
        insertion_order: 90,
        name: 'Thornhaven Castle',
        id: 1,
        selective: true,
        secondary_keys: ['region', 'north'],
        constant: false,
        position: 1,
        extensions: {
          sillytavern: {
            delay: 2,
            cooldown: 1,
            sticky: 3,
            ignoreBudget: false,
            excludeRecursion: false,
            preventRecursion: true,
            group: 'knights',
            groupOverride: false,
            groupWeight: 100,
            useGroupScoring: null,
            scanDepth: 2,
            caseSensitive: true,
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
            triggers: ['combat', 'siege'],
            characterFilter: { isExclude: false, names: ['Arthur'], tags: [] },
          },
        },
        probability: 80,
        depth: 4,
        selective_logic: 0,
      },
    ],
    ...overrides,
  }
}

function makeRawRoleCallBook(): RawRoleCallBook {
  return {
    schemaVersion: '1.0',
    lorebook: {
      settings: {
        lorebookType: 'standard',
        globalScanDepth: 5,
        tokenBudget: 2048,
        globalRecursion: true,
      },
      metadata: {
        genre: 'fantasy',
        fandom: 'original',
        tags: ['magic', 'dragons'],
      },
      entries: [
        {
          // Simple mode entry
          id: 'rc-entry-1',
          title: 'Simple Entry',
          content: 'Simple entry content.',
          enabled: true,
          comment: 'A plain comment',
          priority: { sortOrder: 0, priority: 10 },
          injection: { position: 'world' },
          constant: false,
          triggers: {
            mode: 'simple',
            primary: ['dragon', 'wyrm'],
            secondary: ['fire', 'scales'],
            selectiveLogic: 'and_any',
          },
          timing: { delay: 2, cooldown: 3, sticky: 1 },
        },
        {
          // Advanced mode entry with keyword objects and conditions
          id: 'rc-entry-2',
          title: 'Advanced Entry',
          content: 'Advanced entry content.',
          enabled: true,
          priority: { sortOrder: 0, priority: 20 },
          injection: { position: 'character' },
          constant: false,
          triggers: {
            mode: 'advanced',
            primary: [
              { keyword: 'magic', isRegex: false, probability: 80, frequency: 2 },
              { keyword: '/spell\\b/', isRegex: true, probability: 100 },
              { type: 'emotion', value: 'happy' },
              { type: 'randomChance', value: 50 },
            ],
            secondary: [],
            selectiveLogic: 'not_all',
          },
          timing: { delay: 0, cooldown: 0, sticky: 0 },
        },
        {
          // Wildcard entry (should become constant=true)
          id: 'rc-entry-3',
          title: 'Wildcard Entry',
          content: 'Always active.',
          enabled: true,
          priority: { sortOrder: 0, priority: 1 },
          injection: { position: 'scene' },
          constant: false,
          triggers: {
            mode: 'simple',
            primary: ['*'],
            secondary: [],
            selectiveLogic: 'and_any',
          },
          timing: { delay: 0, cooldown: 0, sticky: 0 },
        },
        {
          // Depth position entry
          id: 'rc-entry-4',
          title: 'Depth Entry',
          content: 'Inserted at depth.',
          enabled: false,
          priority: { sortOrder: 0, priority: 5 },
          injection: { position: 'depth' },
          constant: false,
          triggers: {
            mode: 'simple',
            primary: ['lore'],
            secondary: [],
            selectiveLogic: 'and_all',
          },
          timing: { delay: 0, cooldown: 0, sticky: 0 },
        },
      ],
    },
  }
}

describe('TransformService', () => {
  describe('inflate', () => {
    it('creates a WorkingEntry for each book entry', () => {
      const book = makeBook()
      const { entries } = inflate(book)
      expect(entries).toHaveLength(2)
    })

    it('assigns stable UUIDs to entries', () => {
      const book = makeBook()
      const { entries } = inflate(book)
      expect(entries[0].id).toMatch(/^[0-9a-f-]{36}$/)
      expect(entries[1].id).toMatch(/^[0-9a-f-]{36}$/)
      expect(entries[0].id).not.toBe(entries[1].id)
    })

    it('maps required fields correctly', () => {
      const book = makeBook()
      const { entries } = inflate(book)
      const dragon = entries[0]

      expect(dragon.name).toBe('Dragon')
      expect(dragon.content).toBe('Dragons are ancient winged creatures.')
      expect(dragon.keys).toEqual(['dragon', 'wyrm'])
      expect(dragon.enabled).toBe(true)
      expect(dragon.order).toBe(100)
      expect(dragon.constant).toBe(false)
      expect(dragon.selective).toBe(false)
      expect(dragon.position).toBe(0)
    })

    it('extracts SillyTavern extension fields', () => {
      const book = makeBook()
      const { entries } = inflate(book)
      const castle = entries[1]

      expect(castle.delay).toBe(2)
      expect(castle.cooldown).toBe(1)
      expect(castle.sticky).toBe(3)
      expect(castle.preventRecursion).toBe(true)
      expect(castle.probability).toBe(80)
      expect(castle.selective).toBe(true)
      expect(castle.secondaryKeys).toEqual(['region', 'north'])
      // New fields
      expect(castle.group).toBe('knights')
      expect(castle.scanDepth).toBe(2)
      expect(castle.caseSensitive).toBe(true)
      expect(castle.triggers).toEqual(['combat', 'siege'])
      expect(castle.characterFilter).toEqual({ isExclude: false, names: ['Arthur'], tags: [] })
    })

    it('computes a non-zero token count for non-empty content', () => {
      const book = makeBook()
      const { entries } = inflate(book)
      expect(entries[0].tokenCount).toBeGreaterThan(0)
    })

    it('produces correct bookMeta', () => {
      const book = makeBook()
      const { bookMeta } = inflate(book)
      expect(bookMeta.name).toBe('Test Book')
      expect(bookMeta.scanDepth).toBe(4)
      expect(bookMeta.tokenBudget).toBe(4096)
    })

    it('uses default values for missing optional fields', () => {
      const book: CCv3CharacterBook = {
        name: 'Minimal',
        entries: [
          {
            content: 'Minimal entry',
            enabled: true,
            insertion_order: 0,
            extensions: {},
          } as CCv3CharacterBook['entries'][0],
        ],
      }
      const { entries } = inflate(book)
      expect(entries[0].delay).toBe(null)
      expect(entries[0].cooldown).toBe(null)
      expect(entries[0].sticky).toBe(null)
      expect(entries[0].addMemo).toBe(false)
      expect(entries[0].constant).toBe(false)
      expect(entries[0].probability).toBe(100)
    })

    it('maps ST preventRecursion directly to WorkingEntry preventRecursion', () => {
      const book = makeBook({
        entries: [
          {
            keys: ['test'],
            content: 'Test entry',
            enabled: true,
            insertion_order: 0,
            extensions: { sillytavern: { preventRecursion: true, excludeRecursion: false } },
          } as CCv3CharacterBook['entries'][0],
        ],
      })
      const { entries } = inflate(book)
      expect(entries[0].preventRecursion).toBe(true)
      expect(entries[0].excludeRecursion).toBe(false)
    })

    it('preserves non-default depth values', () => {
      const book = makeBook()
      const entry = book.entries[0] as CCv3CharacterBook['entries'][0] & { depth: number }
      entry.depth = 2
      const { entries } = inflate(book)
      expect(entries[0].depth).toBe(2)
    })

    it('maps ST excludeRecursion directly to WorkingEntry excludeRecursion', () => {
      const book = makeBook({
        entries: [
          {
            keys: ['test'],
            content: 'Test entry',
            enabled: true,
            insertion_order: 0,
            extensions: { sillytavern: { excludeRecursion: true, preventRecursion: false } },
          } as CCv3CharacterBook['entries'][0],
        ],
      })
      const { entries } = inflate(book)
      expect(entries[0].excludeRecursion).toBe(true)
      expect(entries[0].preventRecursion).toBe(false)
    })
  })

describe('inflateFromRawST', () => {
  function makeRawSTBook(entryOverrides: Partial<RawSTEntry> = {}): RawSTBook {
    return {
      name: 'ST Book',
      description: 'A SillyTavern lorebook',
      scan_depth: 4,
      token_budget: 4096,
      recursive_scanning: false,
      entries: {
        '0': {
          uid: 0,
          key: ['dragon', 'wyrm'],
          keysecondary: [],
          comment: 'Dragon',
          content: 'Dragons are ancient winged creatures.',
          constant: false,
          selective: false,
          selectiveLogic: 0,
          addMemo: true,
          order: 100,
          position: 1,
          disable: false,
          probability: 100,
          useProbability: true,
          depth: 4,
          delay: 0,
          cooldown: 0,
          sticky: 0,
          vectorized: false,
          ignoreBudget: false,
          excludeRecursion: false,
          preventRecursion: false,
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
          displayIndex: null,
          delayUntilRecursion: 0,
          triggers: [],
          characterFilter: { isExclude: false, names: [], tags: [] },
          ...entryOverrides,
        },
      },
    }
  }

  it('maps core fields correctly (comment→name, key→keys, disable→enabled inversion)', () => {
    const raw = makeRawSTBook({ comment: 'My Entry', key: ['hero'], disable: false })
    const { entries } = inflateFromRawST(raw)
    expect(entries[0].name).toBe('My Entry')
    expect(entries[0].keys).toEqual(['hero'])
    expect(entries[0].enabled).toBe(true)
  })

  it('inverts disable flag for enabled field', () => {
    const raw = makeRawSTBook({ disable: true })
    const { entries } = inflateFromRawST(raw)
    expect(entries[0].enabled).toBe(false)
  })

  it('preserves position 4 (@ Depth) correctly — regression for mapSTPosition bug', () => {
    const raw = makeRawSTBook({ position: 4 })
    const { entries } = inflateFromRawST(raw)
    expect(entries[0].position).toBe(4)
  })

  it('preserves all ST position values 0–7', () => {
    for (let pos = 0; pos <= 7; pos++) {
      const raw = makeRawSTBook({ position: pos })
      const { entries } = inflateFromRawST(raw)
      expect(entries[0].position).toBe(pos)
    }
  })

  it('preserves non-default depth values — regression for depth bug', () => {
    const raw = makeRawSTBook({ depth: 2 })
    const { entries } = inflateFromRawST(raw)
    expect(entries[0].depth).toBe(2)
  })

  it('reads preventRecursion and ignoreBudget directly from ST entry', () => {
    const raw = makeRawSTBook({ preventRecursion: true, ignoreBudget: true })
    const { entries } = inflateFromRawST(raw)
    expect(entries[0].preventRecursion).toBe(true)
    expect(entries[0].ignoreBudget).toBe(true)
  })

  it('applies defaults for missing optional fields', () => {
    const raw: RawSTBook = {
      entries: {
        '0': { content: 'Minimal' },
      },
    }
    const { entries } = inflateFromRawST(raw)
    expect(entries[0].delay).toBe(null)
    expect(entries[0].cooldown).toBe(null)
    expect(entries[0].sticky).toBe(null)
    expect(entries[0].addMemo).toBe(false)
    expect(entries[0].constant).toBe(false)
    expect(entries[0].probability).toBe(100)
    expect(entries[0].preventRecursion).toBe(false)
    expect(entries[0].ignoreBudget).toBe(false)
    expect(entries[0].enabled).toBe(true)
    expect(entries[0].position).toBe(0)
    expect(entries[0].depth).toBe(4)
    expect(entries[0].group).toBe('')
    expect(entries[0].triggers).toEqual([])
    expect(entries[0].characterFilter).toEqual({ isExclude: false, names: [], tags: [] })
  })

  it('preserves sticky: null through inflate (null = use global default)', () => {
    const raw: RawSTBook = {
      entries: {
        '0': { content: 'Test', sticky: undefined, delay: undefined, cooldown: undefined },
      },
    }
    const { entries } = inflateFromRawST(raw)
    expect(entries[0].sticky).toBe(null)
    expect(entries[0].delay).toBe(null)
    expect(entries[0].cooldown).toBe(null)
  })

  it('maps book-level metadata correctly', () => {
    const raw = makeRawSTBook()
    const { bookMeta } = inflateFromRawST(raw)
    expect(bookMeta.name).toBe('ST Book')
    expect(bookMeta.description).toBe('A SillyTavern lorebook')
    expect(bookMeta.scanDepth).toBe(4)
    expect(bookMeta.tokenBudget).toBe(4096)
    expect(bookMeta.recursiveScan).toBe(false)
  })

  it('assigns stable UUIDs and uses uid from entry', () => {
    const raw = makeRawSTBook({ uid: 42 })
    const { entries } = inflateFromRawST(raw)
    expect(entries[0].id).toMatch(/^[0-9a-f-]{36}$/)
    expect(entries[0].uid).toBe(42)
  })

  it('computes a non-zero token count for non-empty content', () => {
    const raw = makeRawSTBook({ content: 'Dragons are ancient winged creatures.' })
    const { entries } = inflateFromRawST(raw)
    expect(entries[0].tokenCount).toBeGreaterThan(0)
  })

  it('maps all Category B fields correctly', () => {
    const raw = makeRawSTBook({
      displayIndex: 5,
      matchPersonaDescription: true,
      matchCharacterDescription: true,
      matchCharacterPersonality: true,
      matchCharacterDepthPrompt: true,
      matchScenario: true,
      matchCreatorNotes: true,
      delayUntilRecursion: 2,
      outletName: 'sidebar',
      useGroupScoring: true,
      addMemo: false,
      triggers: ['combat', 'stealth'],
      characterFilter: { isExclude: true, names: ['Mordred'], tags: ['villain'] },
    })
    const { entries } = inflateFromRawST(raw)
    const e = entries[0]
    expect(e.displayIndex).toBe(5)
    expect(e.matchPersonaDescription).toBe(true)
    expect(e.matchCharacterDescription).toBe(true)
    expect(e.matchCharacterPersonality).toBe(true)
    expect(e.matchCharacterDepthPrompt).toBe(true)
    expect(e.matchScenario).toBe(true)
    expect(e.matchCreatorNotes).toBe(true)
    expect(e.delayUntilRecursion).toBe(2)
    expect(e.outletName).toBe('sidebar')
    expect(e.useGroupScoring).toBe(true)
    expect(e.addMemo).toBe(false)
    expect(e.triggers).toEqual(['combat', 'stealth'])
    expect(e.characterFilter).toEqual({ isExclude: true, names: ['Mordred'], tags: ['villain'] })
  })
})

  describe('deflate', () => {
    it('produces an entry for each WorkingEntry', () => {
      const book = makeBook()
      const { entries, bookMeta } = inflate(book)
      const deflated = deflate(entries, bookMeta)
      expect(deflated.entries).toHaveLength(2)
    })

    it('maps fields back to CCv3 structure', () => {
      const book = makeBook()
      const { entries, bookMeta } = inflate(book)
      const deflated = deflate(entries, bookMeta)
      const first = deflated.entries[0]

      expect(first.name).toBe('Dragon')
      expect(first.content).toBe('Dragons are ancient winged creatures.')
      expect(first.keys).toEqual(['dragon', 'wyrm'])
      expect(first.enabled).toBe(true)
      expect(first.insertion_order).toBe(100)
    })

    it('rebuilds sillytavern extensions', () => {
      const book = makeBook()
      const { entries, bookMeta } = inflate(book)
      const deflated = deflate(entries, bookMeta)
      const castleEntry = deflated.entries[1]
      const stExt = castleEntry.extensions?.['sillytavern'] as Record<string, unknown>

      expect(stExt.delay).toBe(2)
      expect(stExt.cooldown).toBe(1)
      expect(stExt.sticky).toBe(3)
      expect(stExt.preventRecursion).toBe(true)
    })

    it('assigns sequential UIDs on deflate', () => {
      const book = makeBook()
      const { entries, bookMeta } = inflate(book)
      const deflated = deflate(entries, bookMeta)
      expect(deflated.entries[0].id).toBe(0)
      expect(deflated.entries[1].id).toBe(1)
    })
  })

  describe('round-trip fidelity', () => {
    it('preserves all content through inflate → deflate', () => {
      const book = makeBook()
      const { entries, bookMeta } = inflate(book)
      const deflated = deflate(entries, bookMeta)
      const { entries: roundTripped } = inflate(deflated)

      // Content preserved
      expect(roundTripped[0].content).toBe(book.entries[0].content)
      expect(roundTripped[1].content).toBe(book.entries[1].content)

      // Keys preserved
      expect(roundTripped[0].keys).toEqual(book.entries[0].keys)
      expect(roundTripped[1].secondaryKeys).toEqual(book.entries[1].secondary_keys)

      // Timed effects preserved
      expect(roundTripped[1].delay).toBe(2)
      expect(roundTripped[1].sticky).toBe(3)
      expect(roundTripped[1].preventRecursion).toBe(true)
    })

    it('preserves passthrough extensions', () => {
      const book = makeBook()
      // Add a custom extension to the first entry
      book.entries[0].extensions = {
        ...book.entries[0].extensions,
        customPlatform: { specialField: 'value' },
      }

      const { entries, bookMeta } = inflate(book)
      const deflated = deflate(entries, bookMeta)

      expect(
        (deflated.entries[0].extensions?.['customPlatform'] as Record<string, unknown>)?.specialField
      ).toBe('value')
    })

    it('round-trips userCategory via extensions.lorewalker.userCategory', () => {
      const book = makeBook()
      // Simulate a previously saved lorewalker extension with userCategory
      book.entries[0].extensions = {
        ...book.entries[0].extensions,
        lorewalker: { userCategory: 'faction' },
      }

      const { entries, bookMeta } = inflate(book)
      expect(entries[0].userCategory).toBe('faction')

      // Deflate preserves it
      const deflated = deflate(entries, bookMeta)
      const lwExt = deflated.entries[0].extensions?.['lorewalker'] as Record<string, unknown> | undefined
      expect(lwExt?.userCategory).toBe('faction')
    })

    it('omits lorewalker extension when userCategory is not set', () => {
      const book = makeBook()
      const { entries, bookMeta } = inflate(book)
      expect(entries[0].userCategory).toBeUndefined()

      const deflated = deflate(entries, bookMeta)
      expect(deflated.entries[0].extensions?.['lorewalker']).toBeUndefined()
    })
  })
})

describe('RoleCall round-trip fidelity', () => {
  function rcId(entry: { extensions: Record<string, unknown> }): string | undefined {
    return ((entry.extensions['rolecall'] ?? {}) as Record<string, unknown>)['id'] as string | undefined
  }

  it('preserves simple-mode keys, position, timing, and comment', () => {
    const raw = makeRawRoleCallBook()
    const { entries, bookMeta } = inflateFromRoleCall(raw)
    const deflated = deflateToRoleCall(entries, bookMeta)
    const { entries: entries2 } = inflateFromRoleCall(deflated)

    const e1 = entries.find(e => rcId(e) === 'rc-entry-1')!
    const e1b = entries2.find(e => rcId(e) === 'rc-entry-1')!

    expect(e1b.content).toBe(e1.content)
    expect(e1b.keys).toEqual(e1.keys)
    expect(e1b.secondaryKeys).toEqual(e1.secondaryKeys)
    expect(e1b.position).toBe(e1.position)
    expect(e1b.positionRoleCall).toBe('world')
    expect(e1b.delay).toBe(2)
    expect(e1b.cooldown).toBe(3)
    expect(e1b.sticky).toBe(1)
    expect(e1b.rolecallComment).toBe('A plain comment')
    expect(e1b.triggerMode).toBe('simple')
  })

  it('preserves advanced-mode keywordObjects and triggerConditions', () => {
    const raw = makeRawRoleCallBook()
    const { entries, bookMeta } = inflateFromRoleCall(raw)
    const deflated = deflateToRoleCall(entries, bookMeta)
    const { entries: entries2 } = inflateFromRoleCall(deflated)

    const e2b = entries2.find(e => rcId(e) === 'rc-entry-2')!

    expect(e2b.triggerMode).toBe('advanced')

    // keyword objects preserved
    expect(e2b.keywordObjects).toHaveLength(2)
    expect(e2b.keywordObjects![0]).toEqual({ keyword: 'magic', isRegex: false, probability: 80, frequency: 2 })
    expect(e2b.keywordObjects![1]).toEqual({ keyword: '/spell\\b/', isRegex: true, probability: 100 })

    // condition objects preserved
    expect(e2b.triggerConditions).toHaveLength(2)
    expect(e2b.triggerConditions![0]).toMatchObject({ type: 'emotion', value: 'happy' })
    expect(e2b.triggerConditions![1]).toMatchObject({ type: 'randomChance', value: 50 })

    // keys array still populated (extracted from keywordObjects)
    expect(e2b.keys).toContain('magic')
    expect(e2b.keys).toContain('/spell\\b/')
  })

  it('wildcard primary trigger produces constant=true and round-trips', () => {
    const raw = makeRawRoleCallBook()
    const { entries, bookMeta } = inflateFromRoleCall(raw)
    const deflated = deflateToRoleCall(entries, bookMeta)
    const { entries: entries2 } = inflateFromRoleCall(deflated)

    const e3 = entries.find(e => rcId(e) === 'rc-entry-3')!
    const e3b = entries2.find(e => rcId(e) === 'rc-entry-3')!

    expect(e3.constant).toBe(true)
    expect(e3b.constant).toBe(true)
  })

  it('preserves all four RoleCall positions through round-trip', () => {
    const raw = makeRawRoleCallBook()
    const { entries, bookMeta } = inflateFromRoleCall(raw)
    const deflated = deflateToRoleCall(entries, bookMeta)
    const { entries: entries2 } = inflateFromRoleCall(deflated)

    const positionMap: Record<string, string> = {
      'rc-entry-1': 'world',
      'rc-entry-2': 'character',
      'rc-entry-3': 'scene',
      'rc-entry-4': 'depth',
    }

    for (const [id, expectedRCPos] of Object.entries(positionMap)) {
      const e = entries2.find(e => rcId(e) === id)!
      expect(e.positionRoleCall).toBe(expectedRCPos)
    }
  })

  it('preserves selectiveLogic values through round-trip', () => {
    const raw = makeRawRoleCallBook()
    const { entries, bookMeta } = inflateFromRoleCall(raw)
    const deflated = deflateToRoleCall(entries, bookMeta)
    const { entries: entries2 } = inflateFromRoleCall(deflated)

    const e1b = entries2.find(e => rcId(e) === 'rc-entry-1')!
    const e2b = entries2.find(e => rcId(e) === 'rc-entry-2')!
    const e4b = entries2.find(e => rcId(e) === 'rc-entry-4')!

    // selectiveLogic 0='and_any', 1='and_all', 2='not_any', 3='not_all'
    expect(e1b.selectiveLogic).toBe(0) // and_any
    expect(e2b.selectiveLogic).toBe(3) // not_all
    expect(e4b.selectiveLogic).toBe(1) // and_all
  })

  it('preserves book metadata (genre, fandom, tags, schema version) through round-trip', () => {
    const raw = makeRawRoleCallBook()
    const { entries, bookMeta } = inflateFromRoleCall(raw)
    const deflated = deflateToRoleCall(entries, bookMeta)
    const { bookMeta: bookMeta2 } = inflateFromRoleCall(deflated)

    const rcExt = (bookMeta2.extensions['rolecall'] ?? {}) as Record<string, unknown>
    const rcMeta = (rcExt['metadata'] ?? {}) as Record<string, unknown>

    expect(rcExt['schemaVersion']).toBe('1.0')
    expect(rcExt['lorebookType']).toBe('standard')
    expect(rcMeta['genre']).toBe('fantasy')
    expect(rcMeta['fandom']).toBe('original')
    expect(rcMeta['tags']).toEqual(['magic', 'dragons'])
    expect(bookMeta2.scanDepth).toBe(5)
    expect(bookMeta2.tokenBudget).toBe(2048)
  })

  it('preserves RoleCall entry IDs and priorities through round-trip', () => {
    const raw = makeRawRoleCallBook()
    const { entries, bookMeta } = inflateFromRoleCall(raw)
    const deflated = deflateToRoleCall(entries, bookMeta)
    const { entries: entries2 } = inflateFromRoleCall(deflated)

    for (const original of entries) {
      const id = rcId(original)
      if (!id) continue
      const roundTripped = entries2.find(e => rcId(e) === id)!
      expect(roundTripped).toBeDefined()
      const origPriority = ((original.extensions['rolecall'] ?? {}) as Record<string, unknown>)['priority']
      const rtPriority = ((roundTripped.extensions['rolecall'] ?? {}) as Record<string, unknown>)['priority']
      expect(rtPriority).toBe(origPriority)
    }
  })
})
