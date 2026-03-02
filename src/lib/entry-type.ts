import type { WorkingEntry } from '@/types'

export type EntryCategory = 'character' | 'location' | 'rule' | 'event' | 'faction' | 'item' | 'lore' | 'generic'

export const FIXED_CATEGORIES: EntryCategory[] = [
  'character', 'location', 'rule', 'event', 'faction', 'item', 'lore', 'generic',
]

export function isFixedCategory(s: string): s is EntryCategory {
  return (FIXED_CATEGORIES as string[]).includes(s)
}

const LOCATION_WORDS = [
  'location', 'place', 'area', 'city', 'region', 'realm',
  'dungeon', 'tavern', 'forest', 'tower', 'ruins', 'inn', 'village',
]

const CHARACTER_PATTERNS = [
  'she is', 'he is', 'they are', 'character', 'npc', 'person',
]

function containsAny(text: string, terms: string[]): boolean {
  const lower = text.toLowerCase()
  return terms.some((t) => lower.includes(t))
}

export function inferEntryCategory(entry: WorkingEntry): EntryCategory {
  const nameLower = entry.name.toLowerCase()
  const contentLower = entry.content.toLowerCase()
  const combined = `${nameLower} ${contentLower}`

  // 1. Rule: constant entries that start with structured markers
  if (entry.constant && (entry.content.startsWith('RULE:') || entry.content.startsWith('['))) {
    return 'rule'
  }

  // 2. Event: sticky entries
  if ((entry.sticky ?? 0) > 0) {
    return 'event'
  }

  // 3. Location
  if (containsAny(combined, LOCATION_WORDS)) {
    return 'location'
  }

  // 4. Character
  if (containsAny(combined, CHARACTER_PATTERNS)) {
    return 'character'
  }

  return 'generic'
}

export const CATEGORY_ICON: Record<EntryCategory, string> = {
  character: '👤',
  location: '📍',
  rule: '📜',
  event: '⚡',
  faction: '⚔️',
  item: '🎒',
  lore: '📖',
  generic: '',
}

export function getEntryIcon(category: string): string {
  if (isFixedCategory(category)) return CATEGORY_ICON[category]
  return '🏷️'  // Custom category
}
