import type { Finding, RecursionGraph, WorkingEntry } from '@/types'
import { ChainDiagram } from './ChainDiagram'

interface AnalysisDetailPaneProps {
  finding: Finding | null
  entries: WorkingEntry[]
  graph: RecursionGraph
  onOpenEntry: (entryId: string) => void
  onSelectEntry: (entryId: string) => void
  onNavigateToKeyword?: (keyword: string) => void
}

const SEVERITY_BADGE: Record<string, string> = {
  error: 'bg-ctp-red/20 text-ctp-red border border-ctp-red/30',
  warning: 'bg-ctp-yellow/20 text-ctp-yellow border border-ctp-yellow/30',
  suggestion: 'bg-ctp-blue/20 text-ctp-blue border border-ctp-blue/30',
}

const CATEGORY_BADGE = 'bg-ctp-surface1 text-ctp-subtext0 border border-ctp-surface2'

function entryName(entries: WorkingEntry[], id: string): string {
  return entries.find((e) => e.id === id)?.name ?? id
}

export function AnalysisDetailPane({
  finding,
  entries,
  graph,
  onOpenEntry,
  onSelectEntry,
  onNavigateToKeyword,
}: AnalysisDetailPaneProps) {
  if (!finding) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <p className="text-sm text-ctp-overlay1">Select a finding to see details</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 gap-4">
      {/* Header: severity badge + category chip + message */}
      <div>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded capitalize ${SEVERITY_BADGE[finding.severity] ?? ''}`}>
            {finding.severity}
          </span>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded capitalize ${CATEGORY_BADGE}`}>
            {finding.category}
          </span>
          <span className="text-[10px] text-ctp-overlay1 font-mono">{finding.ruleId}</span>
        </div>
        <p className="text-sm text-ctp-text leading-relaxed">{finding.message}</p>
      </div>

      {/* Details block */}
      {finding.details && (
        <div className="bg-ctp-surface0 rounded p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1 mb-1.5">Details</p>
          <p className="text-xs text-ctp-subtext0 leading-relaxed whitespace-pre-wrap">{finding.details}</p>
        </div>
      )}

      {/* Affected entries */}
      {finding.entryIds.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1 mb-2">
            Affected Entries ({finding.entryIds.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {finding.entryIds.map((id) => (
              <button
                key={id}
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey) {
                    onSelectEntry(id)
                  } else {
                    onOpenEntry(id)
                  }
                }}
                title="Click to open in editor · Cmd/Ctrl+click to select in list"
                className="px-2.5 py-1 rounded border border-ctp-surface1 bg-ctp-surface0 hover:border-ctp-accent hover:bg-ctp-surface1 text-xs text-ctp-text transition-colors"
              >
                {entryName(entries, id)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chain diagram (only when multiple entries form a chain) */}
      {finding.entryIds.length > 1 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1 mb-2">
            Chain Diagram
          </p>
          <ChainDiagram
            finding={finding}
            entries={entries}
            graph={graph}
            onOpenEntry={onOpenEntry}
            onSelectEntry={onSelectEntry}
          />
        </div>
      )}

      {/* Related keywords with navigate-to links */}
      {finding.relatedKeywords && finding.relatedKeywords.length > 0 && onNavigateToKeyword && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1 mb-2">
            Related Keywords
          </p>
          <div className="flex flex-wrap gap-2">
            {finding.relatedKeywords.map((kw) => (
              <div
                key={kw}
                className="flex items-center gap-1 px-2 py-1 rounded border border-ctp-surface1 bg-ctp-surface0 text-xs"
              >
                <span className="text-ctp-text font-mono">{kw}</span>
                <button
                  onClick={() => onNavigateToKeyword(kw)}
                  title="View in Keyword Analyzer"
                  className="text-ctp-accent hover:text-ctp-accent/80 transition-colors ml-1"
                >
                  → Keywords
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
