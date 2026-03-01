import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { Finding, FindingSeverity } from '@/types'

interface FindingItemProps {
  finding: Finding
  onSelectEntry: (id: string) => void
}

function SeverityIcon({ severity }: { severity: FindingSeverity }) {
  if (severity === 'error') return <span className="text-ctp-red shrink-0">●</span>
  if (severity === 'warning') return <span className="text-ctp-yellow shrink-0">▲</span>
  return <span className="text-ctp-blue shrink-0">○</span>
}

export function FindingItem({ finding, onSelectEntry }: FindingItemProps) {
  const [expanded, setExpanded] = useState(false)
  const hasDetails = !!finding.details
  const clickable = finding.entryIds.length > 0

  return (
    <div className="border-b border-ctp-surface0 last:border-b-0">
      <div
        className={`flex items-start gap-2 px-3 py-2 text-xs ${clickable ? 'cursor-pointer hover:bg-ctp-surface0' : ''} transition-colors`}
        onClick={clickable ? () => onSelectEntry(finding.entryIds[0]) : undefined}
        onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') onSelectEntry(finding.entryIds[0]) } : undefined}
        tabIndex={clickable ? 0 : undefined}
        role={clickable ? 'button' : undefined}
      >
        <span className="mt-0.5"><SeverityIcon severity={finding.severity} /></span>
        <div className="flex-1 min-w-0">
          <p className="text-ctp-text leading-snug">{finding.message}</p>
          <p className="text-ctp-overlay1 text-[10px] mt-0.5">{finding.ruleId}</p>
        </div>
        {hasDetails && (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v) }}
            className="shrink-0 text-ctp-overlay1 hover:text-ctp-subtext1 transition-colors mt-0.5"
          >
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        )}
      </div>
      {expanded && finding.details && (
        <div className="px-3 pb-2 text-[10px] text-ctp-subtext0 leading-relaxed bg-ctp-surface0/50">
          {finding.details}
        </div>
      )}
    </div>
  )
}
