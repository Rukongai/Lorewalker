import { documentStoreRegistry } from '@/stores/document-store-registry'
import { EMPTY_STORE } from '@/hooks/useDerivedState'
import { computeHealthScore } from '@/services/analysis/analysis-service'
import { defaultRubric } from '@/services/analysis/default-rubric'
import { FindingItem } from './FindingItem'

interface ModalFindingsPaneProps {
  tabId: string | null
  entryId: string
}

function healthColor(score: number): string {
  if (score >= 80) return 'text-ctp-green'
  if (score >= 60) return 'text-ctp-yellow'
  if (score >= 40) return 'text-ctp-peach'
  return 'text-ctp-red'
}

function healthBarColor(score: number): string {
  if (score >= 80) return 'bg-ctp-green'
  if (score >= 60) return 'bg-ctp-yellow'
  if (score >= 40) return 'bg-ctp-peach'
  return 'bg-ctp-red'
}

interface ModalFindingsPaneHeaderProps {
  tabId: string | null
  entryId: string
}

export function ModalFindingsPaneHeader({ tabId, entryId }: ModalFindingsPaneHeaderProps) {
  const realStore = tabId ? documentStoreRegistry.get(tabId) : undefined
  const activeStore = realStore ?? EMPTY_STORE
  const healthScore = activeStore((s) => s.healthScore)
  const findings = activeStore((s) => s.findings)
  const overallScore = healthScore.overall
  const entryFindings = findings.filter((f) => f.entryIds.includes(entryId))
  const entryScore = computeHealthScore(entryFindings, defaultRubric).overall

  function scoreChip(label: string, score: number) {
    return (
      <div className="px-3 py-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] text-ctp-overlay1 uppercase tracking-wider">{label}</span>
          <span className={`text-sm font-bold ${healthColor(score)}`}>{score}</span>
        </div>
        <div className="h-1.5 bg-ctp-surface1 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${healthBarColor(score)}`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 divide-x divide-ctp-surface1">
      {scoreChip('Overall Health', overallScore)}
      {scoreChip('Entry Health', entryScore)}
    </div>
  )
}

export function ModalFindingsPane({ tabId, entryId }: ModalFindingsPaneProps) {
  const realStore = tabId ? documentStoreRegistry.get(tabId) : undefined
  const activeStore = realStore ?? EMPTY_STORE
  const findings = activeStore((s) => s.findings)

  const entryFindings = findings.filter((f) => f.entryIds.includes(entryId))

  function handleSelectEntry(id: string) {
    realStore?.getState().selectEntry(id)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden text-sm">
      {/* Issues section */}
      <div className="px-3 py-1.5 border-b border-ctp-surface0 shrink-0">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1">
          Issues for this entry ({entryFindings.length})
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {entryFindings.length === 0 ? (
          <div className="flex items-center justify-center h-16">
            <p className="text-xs text-ctp-overlay1">No issues found</p>
          </div>
        ) : (
          entryFindings.map((f) => (
            <FindingItem key={f.id} finding={f} onSelectEntry={handleSelectEntry} />
          ))
        )}
      </div>
    </div>
  )
}
