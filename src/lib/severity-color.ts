import type { FindingSeverity } from '@/types'

export function severityColor(severity: FindingSeverity | null): string {
  if (severity === 'error') return 'var(--ctp-red)'
  if (severity === 'warning') return 'var(--ctp-yellow)'
  if (severity === 'suggestion') return 'var(--ctp-blue)'
  return 'var(--ctp-overlay0)'
}
