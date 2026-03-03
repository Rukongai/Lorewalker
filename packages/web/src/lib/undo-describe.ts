import type { WorkingEntry, BookMeta } from '@/types'

interface PartialDocState {
  entries: WorkingEntry[]
  bookMeta: BookMeta
}

export function describeStateChange(from: PartialDocState, to: PartialDocState): string {
  const fromIds = new Set(from.entries.map((e) => e.id))
  const toIds = new Set(to.entries.map((e) => e.id))

  const added = to.entries.filter((e) => !fromIds.has(e.id))
  const removed = from.entries.filter((e) => !toIds.has(e.id))

  if (added.length === 1 && removed.length === 0) return `Added entry '${added[0].name}'`
  if (added.length > 1 && removed.length === 0) return `Added ${added.length} entries`
  if (removed.length === 1 && added.length === 0) return `Deleted entry '${removed[0].name}'`
  if (removed.length > 1 && added.length === 0) return `Deleted ${removed.length} entries`

  // Same entry set — find first changed field
  for (const toEntry of to.entries) {
    const fromEntry = from.entries.find((e) => e.id === toEntry.id)
    if (!fromEntry) continue
    if (fromEntry.content !== toEntry.content) return `Content edit on '${toEntry.name}'`
    if (fromEntry.name !== toEntry.name) return `Renamed entry`
    if (JSON.stringify(fromEntry.keys) !== JSON.stringify(toEntry.keys)) return `Keyword edit on '${toEntry.name}'`
    if (JSON.stringify(fromEntry.secondaryKeys) !== JSON.stringify(toEntry.secondaryKeys)) return `Secondary key edit on '${toEntry.name}'`
    if (fromEntry.enabled !== toEntry.enabled) return toEntry.enabled ? `Enabled '${toEntry.name}'` : `Disabled '${toEntry.name}'`
    if (fromEntry.constant !== toEntry.constant) return `Toggle constant on '${toEntry.name}'`
    if (fromEntry.position !== toEntry.position || fromEntry.order !== toEntry.order || fromEntry.depth !== toEntry.depth) return `Priority change on '${toEntry.name}'`
  }

  // Check order change (same entries, different order)
  const fromOrder = from.entries.map((e) => e.id).join(',')
  const toOrder = to.entries.map((e) => e.id).join(',')
  if (fromOrder !== toOrder) return 'Reordered entries'

  // Check bookMeta
  if (JSON.stringify(from.bookMeta) !== JSON.stringify(to.bookMeta)) return 'Book settings change'

  return 'Edit'
}
