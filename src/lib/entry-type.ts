import type { EntryCategory } from '@/types'
export type { EntryCategory }

export const FIXED_CATEGORIES: EntryCategory[] = [
  'character', 'location', 'rule', 'event', 'faction', 'item', 'lore', 'generic',
]

export function isFixedCategory(s: string): s is EntryCategory {
  return (FIXED_CATEGORIES as string[]).includes(s)
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
