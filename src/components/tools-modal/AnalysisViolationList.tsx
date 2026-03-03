import type { Finding, FindingSeverity } from '@/types'

interface AnalysisViolationListProps {
  findings: Finding[]
  ruleId: string | null
  selectedFindingId: string | null
  onSelectFinding: (finding: Finding) => void
}

function ruleDisplayName(ruleId: string): string {
  const slug = ruleId.split('/').pop() ?? ruleId
  return slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function SeverityIcon({ severity }: { severity: FindingSeverity }) {
  if (severity === 'error') return <span className="text-ctp-red shrink-0">●</span>
  if (severity === 'warning') return <span className="text-ctp-yellow shrink-0">▲</span>
  return <span className="text-ctp-blue shrink-0">○</span>
}

export function AnalysisViolationList({
  findings,
  ruleId,
  selectedFindingId,
  onSelectFinding,
}: AnalysisViolationListProps) {
  if (ruleId === null) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-ctp-overlay1">Select a rule to see violations</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-ctp-surface0 shrink-0">
        <p className="text-xs font-semibold text-ctp-text">{ruleDisplayName(ruleId)}</p>
        <p className="text-[10px] text-ctp-overlay1 mt-0.5">
          {findings.length} {findings.length === 1 ? 'violation' : 'violations'}
        </p>
      </div>

      {/* Violation list */}
      <div className="flex-1 overflow-y-auto">
        {findings.length === 0 ? (
          <div className="flex items-center justify-center h-16">
            <p className="text-xs text-ctp-overlay1">No violations</p>
          </div>
        ) : (
          findings.map((finding) => (
            <button
              key={finding.id}
              onClick={() => onSelectFinding(finding)}
              className={`w-full flex items-start gap-2 px-3 py-2.5 text-left border-b border-ctp-surface0 last:border-b-0 transition-colors ${
                finding.id === selectedFindingId
                  ? 'bg-ctp-surface1'
                  : 'hover:bg-ctp-surface0'
              }`}
            >
              <span className="mt-0.5 shrink-0">
                <SeverityIcon severity={finding.severity} />
              </span>
              <p className="text-xs text-ctp-text leading-snug">{finding.message}</p>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
