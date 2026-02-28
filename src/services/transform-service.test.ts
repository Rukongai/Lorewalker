import { describe, it, expect } from 'vitest'
import { inflate, deflate } from './transform-service'
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
      expect(entries[0].delay).toBe(0)
      expect(entries[0].cooldown).toBe(0)
      expect(entries[0].sticky).toBe(0)
      expect(entries[0].constant).toBe(false)
      expect(entries[0].probability).toBe(100)
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
