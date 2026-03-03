import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { FindingItem } from './FindingItem'
import type { Finding, FindingSeverity, RuleCategory } from '@/types'

const CATEGORIES: RuleCategory[] = ['structure', 'config', 'keywords', 'recursion', 'budget', 'content']
const SEVERITY_ORDER: Record<FindingSeverity, number> = { error: 0, warning: 1, suggestion: 2 }

const LLM_RULE_IDS = new Set([
  'content/quality-assessment',
  'content/structure-check',
  'content/scope-check',
  'keywords/missing-variations',
])

function AiBadge() {
  return (
    <span className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-semibold bg-ctp-accent/20 text-ctp-accent leading-none">
      AI
    </span>
  )
}

function SeverityIcon({ severity }: { severity: FindingSeverity }) {
  if (severity === 'error') return <span className="text-ctp-red shrink-0">●</span>
  if (severity === 'warning') return <span className="text-ctp-yellow shrink-0">▲</span>
  return <span className="text-ctp-blue shrink-0">○</span>
}

function ruleDisplayName(ruleId: string): string {
  const slug = ruleId.split('/').pop() ?? ruleId
  return slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

interface FindingsListProps {
  findings: Finding[]
  /** Sidebar mode: click finding → select entry */
  onSelectEntry?: (entryId: string) => void
  /** Rule-select mode: click rule row → select rule */
  onSelectRule?: (ruleId: string) => void
  /** Highlight this rule row (rule-select mode) */
  selectedRuleId?: string | null
  /** When true, groups to cat→rule level (tools modal); when false, groups to cat→finding level (sidebar) */
  groupByRule?: boolean
}

export function FindingsList({
  findings,
  onSelectEntry,
  onSelectRule,
  selectedRuleId,
  groupByRule = false,
}: FindingsListProps) {
  const [filter, setFilter] = useState<FindingSeverity | 'all'>('all')
  const [collapsedCats, setCollapsedCats] = useState<Set<RuleCategory>>(new Set())

  const sorted = [...findings].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
  const errorCount = sorted.filter((f) => f.severity === 'error').length
  const warningCount = sorted.filter((f) => f.severity === 'warning').length
  const suggestionCount = sorted.filter((f) => f.severity === 'suggestion').length
  const filtered = filter === 'all' ? sorted : sorted.filter((f) => f.severity === filter)

  function toggleCategory(cat: RuleCategory) {
    setCollapsedCats((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  // Build category → findings map
  const byCategory = new Map<RuleCategory, Finding[]>()
  for (const finding of filtered) {
    if (!byCategory.has(finding.category)) byCategory.set(finding.category, [])
    byCategory.get(finding.category)!.push(finding)
  }

  // Build category → rule → findings map (for groupByRule mode)
  const byCategoryRule = new Map<RuleCategory, Map<string, Finding[]>>()
  if (groupByRule) {
    for (const finding of filtered) {
      if (!byCategoryRule.has(finding.category)) byCategoryRule.set(finding.category, new Map())
      const ruleMap = byCategoryRule.get(finding.category)!
      if (!ruleMap.has(finding.ruleId)) ruleMap.set(finding.ruleId, [])
      ruleMap.get(finding.ruleId)!.push(finding)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Severity filter bar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-ctp-surface0 shrink-0 flex-wrap">
        {(['all', 'error', 'warning', 'suggestion'] as const).map((f) => {
          const count = f === 'all' ? sorted.length : f === 'error' ? errorCount : f === 'warning' ? warningCount : suggestionCount
          const active = filter === f
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                active ? 'bg-ctp-accent text-ctp-base' : 'text-ctp-overlay1 hover:text-ctp-subtext1 hover:bg-ctp-surface0'
              }`}
            >
              {f === 'all' ? `All (${count})` : f === 'error' ? `Errors (${count})` : f === 'warning' ? `Warnings (${count})` : `Hints (${count})`}
            </button>
          )
        })}
      </div>

      {/* Finding list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-16">
            <p className="text-xs text-ctp-overlay1">
              {sorted.length === 0 ? 'No issues detected' : 'No findings match filter'}
            </p>
          </div>
        ) : (
          CATEGORIES.map((cat) => {
            if (groupByRule) {
              const ruleMap = byCategoryRule.get(cat)
              if (!ruleMap || ruleMap.size === 0) return null
              const collapsed = collapsedCats.has(cat)
              const totalForCat = Array.from(ruleMap.values()).reduce((sum, arr) => sum + arr.length, 0)

              return (
                <div key={cat}>
                  <button
                    onClick={() => toggleCategory(cat)}
                    className="w-full flex items-center gap-1.5 px-3 py-1.5 bg-ctp-surface0 border-b border-ctp-surface1 text-left hover:bg-ctp-surface1 transition-colors"
                  >
                    {collapsed ? <ChevronRight size={11} className="text-ctp-overlay1 shrink-0" /> : <ChevronDown size={11} className="text-ctp-overlay1 shrink-0" />}
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-ctp-subtext0 capitalize">{cat}</span>
                    <span className="ml-auto text-[10px] text-ctp-overlay1">{totalForCat}</span>
                  </button>
                  {!collapsed && Array.from(ruleMap.entries()).map(([ruleId, ruleFindings]) => {
                    const isSelected = ruleId === selectedRuleId
                    const topSeverity = ruleFindings[0].severity
                    const isLlm = LLM_RULE_IDS.has(ruleId)
                    return (
                      <button
                        key={ruleId}
                        onClick={() => onSelectRule?.(ruleId)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-left border-b border-ctp-surface0 last:border-b-0 transition-colors ${
                          isSelected ? 'bg-ctp-surface1 border-l-2 border-l-ctp-accent' : 'hover:bg-ctp-surface0'
                        }`}
                      >
                        <SeverityIcon severity={topSeverity} />
                        <span className="flex-1 text-xs text-ctp-text truncate">{ruleDisplayName(ruleId)}</span>
                        {isLlm && <AiBadge />}
                        <span className="text-[10px] text-ctp-overlay1 tabular-nums shrink-0">{ruleFindings.length}</span>
                      </button>
                    )
                  })}
                </div>
              )
            } else {
              // finding-click mode
              const catFindings = byCategory.get(cat)
              if (!catFindings || catFindings.length === 0) return null
              const collapsed = collapsedCats.has(cat)
              return (
                <div key={cat}>
                  <button
                    onClick={() => toggleCategory(cat)}
                    className="w-full flex items-center gap-1.5 px-2 py-1 bg-ctp-surface0 border-b border-ctp-surface1 text-left hover:bg-ctp-surface1 transition-colors"
                  >
                    {collapsed ? <ChevronRight size={10} className="text-ctp-overlay1 shrink-0" /> : <ChevronDown size={10} className="text-ctp-overlay1 shrink-0" />}
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-ctp-subtext0 capitalize">{cat}</span>
                    <span className="ml-auto text-[10px] text-ctp-overlay1">{catFindings.length}</span>
                  </button>
                  {!collapsed && catFindings.map((finding) => (
                    <div key={finding.id} className="relative">
                      {LLM_RULE_IDS.has(finding.ruleId) && (
                        <span className="absolute top-2 right-2 z-10"><AiBadge /></span>
                      )}
                      <FindingItem
                        finding={finding}
                        onSelectEntry={onSelectEntry ?? (() => {})}
                      />
                    </div>
                  ))}
                </div>
              )
            }
          })
        )}
      </div>
    </div>
  )
}
