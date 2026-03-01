import { describe, it, expect } from 'vitest'
import { inflate, deflate, inflateFromRawST } from './transform-service'
import type { RawSTBook, RawSTEntry } from './transform-service'
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
  })
})
