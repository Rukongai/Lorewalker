import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { HelpTooltip } from '@/components/ui/HelpTooltip'

export function FieldGroup({ label, stOnly, rcOnly, defaultCollapsed = false, labelSuffix, headerRight, children }: {
  label: string
  stOnly?: boolean
  rcOnly?: boolean
  defaultCollapsed?: boolean
  labelSuffix?: React.ReactNode
  headerRight?: React.ReactNode
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(!defaultCollapsed)
  return (
    <div className="mb-4">
      <div className="flex items-center">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex-1 min-w-0 text-left text-[11px] font-semibold tracking-wider text-ctp-subtext0 px-3 pt-2 pb-1 flex items-center gap-1.5 hover:text-ctp-subtext1 transition-colors"
        >
          {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          <span className="truncate">{label}</span>
          {stOnly && <span className="text-[9px] font-semibold bg-ctp-peach/15 text-ctp-yellow border border-ctp-peach/30 rounded px-1 py-0.5 normal-case tracking-normal shrink-0">ST</span>}
          {rcOnly && <span className="text-[9px] font-semibold bg-ctp-teal/15 text-ctp-teal border border-ctp-teal/30 rounded px-1 py-0.5 normal-case tracking-normal shrink-0">RC</span>}
          {labelSuffix}
        </button>
        {headerRight}
      </div>
      {open && <div className="px-3 space-y-2 pb-2">{children}</div>}
    </div>
  )
}

export function Field({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] text-ctp-subtext0 flex items-center">
        {label}
        {help && <HelpTooltip text={help} />}
      </span>
      {children}
    </div>
  )
}

export const inputClass =
  'w-full bg-ctp-surface0 border border-ctp-surface2 rounded px-2 py-1.5 text-xs text-ctp-subtext1 outline-none focus:border-ctp-accent transition-colors placeholder:text-ctp-overlay1'
