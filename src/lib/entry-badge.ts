import type { WorkingEntry } from '@/types'

export function getTypeBadge(entry: WorkingEntry): { label: string; color: string } {
  if (!entry.enabled) return { label: 'OFF', color: 'bg-ctp-surface1 text-ctp-overlay0 ring-1 ring-ctp-surface2' }
  if (entry.constant) return { label: 'CONST', color: 'bg-ctp-mauve/50 text-ctp-mauve ring-1 ring-ctp-mauve/40' }
  if (entry.selective) return { label: 'SEL', color: 'bg-ctp-teal/50 text-ctp-teal ring-1 ring-ctp-teal/40' }
  if ((entry.sticky ?? 0) > 0) return { label: 'STICKY', color: 'bg-ctp-blue/50 text-ctp-blue ring-1 ring-ctp-blue/40' }
  return { label: 'KW', color: 'bg-ctp-blue/50 text-ctp-blue ring-1 ring-ctp-blue/40' }
}
