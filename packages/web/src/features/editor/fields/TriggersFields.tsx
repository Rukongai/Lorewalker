import { HelpTooltip } from '@/components/ui/HelpTooltip'

const TRIGGER_OPTIONS = ['Normal', 'Continue', 'Impersonate', 'Swipe', 'Regenerate', 'Quiet'] as const

interface TriggersFieldsProps {
  triggers: string[]
  onChange: (triggers: string[]) => void
}

export function TriggersFields({ triggers, onChange }: TriggersFieldsProps) {
  function handleToggle(trigger: string) {
    const next = triggers.includes(trigger)
      ? triggers.filter((t) => t !== trigger)
      : [...triggers, trigger]
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] text-ctp-subtext0 flex items-center">
        Generation Types
        <HelpTooltip text="Restrict activation to specific generation types. If none are selected, the entry activates for all generation types." />
      </span>
      <div className="flex flex-wrap gap-1.5">
        {TRIGGER_OPTIONS.map((trigger) => {
          const active = triggers.includes(trigger)
          return (
            <button
              key={trigger}
              onClick={() => handleToggle(trigger)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                active
                  ? 'bg-ctp-mauve text-ctp-base font-medium'
                  : 'bg-ctp-surface1 text-ctp-subtext0 hover:bg-ctp-surface2 hover:text-ctp-text'
              }`}
            >
              {trigger}
            </button>
          )
        })}
      </div>
    </div>
  )
}
