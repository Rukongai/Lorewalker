import type { RoleCallCondition } from '@/types'

const CONDITION_LABELS: Record<string, string> = {
  emotion: 'Emotion',
  messageCount: 'Msg Count',
  randomChance: 'Random %',
  isGroupChat: 'Group Chat',
  generationType: 'Gen Type',
  swipeCount: 'Swipe Count',
  lorebookActive: 'Entry Active',
  recency: 'Recency',
}

interface ConditionsViewerProps {
  conditions: RoleCallCondition[]
}

export function ConditionsViewer({ conditions }: ConditionsViewerProps) {
  if (conditions.length === 0) return null

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] text-ctp-subtext0">Trigger Conditions</span>
      <div className="flex flex-wrap gap-1">
        {conditions.map((cond, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-ctp-teal/15 text-ctp-teal border border-ctp-teal/30"
            title={`type: ${cond.type}, value: ${String(cond.value)}`}
          >
            <span className="font-medium">{CONDITION_LABELS[cond.type] ?? cond.type}</span>
            <span className="text-ctp-teal/70">= {String(cond.value)}</span>
          </span>
        ))}
      </div>
      <span className="text-[10px] text-ctp-overlay1">Read-only — evaluated by future RoleCall engine</span>
    </div>
  )
}
