import type { Finding, RecursionGraph, WorkingEntry } from '@/types'

interface ChainDiagramProps {
  finding: Finding
  entries: WorkingEntry[]
  graph: RecursionGraph
  onOpenEntry: (entryId: string) => void
  onSelectEntry: (entryId: string) => void
}

function entryName(entries: WorkingEntry[], id: string): string {
  return entries.find((e) => e.id === id)?.name ?? id
}

export function ChainDiagram({ finding, entries, graph, onOpenEntry, onSelectEntry }: ChainDiagramProps) {
  const ids = finding.entryIds

  if (ids.length < 2) return null

  return (
    <div className="flex flex-col items-center gap-0">
      {ids.map((id, index) => {
        const prevId = index > 0 ? ids[index - 1] : null
        const edgeKey = prevId ? `${prevId}\u2192${id}` : null
        const keywords = edgeKey ? (graph.edgeMeta.get(edgeKey)?.matchedKeywords ?? []) : []

        return (
          <div key={id} className="flex flex-col items-center w-full">
            {/* Arrow from previous entry with keyword labels */}
            {index > 0 && (
              <div className="flex flex-col items-center py-1">
                <div className="flex flex-wrap justify-center gap-1 mb-0.5">
                  {keywords.map((kw, i) => (
                    <span
                      key={i}
                      className="text-[9px] bg-ctp-accent/20 text-ctp-accent rounded px-1 py-px"
                    >
                      {kw}
                    </span>
                  ))}
                  {keywords.length === 0 && (
                    <span className="text-[9px] text-ctp-overlay0">→</span>
                  )}
                </div>
                <div className="w-px h-3 bg-ctp-surface1" />
              </div>
            )}

            {/* Entry card */}
            <button
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey) {
                  onSelectEntry(id)
                } else {
                  onOpenEntry(id)
                }
              }}
              className="w-full text-left px-3 py-2 rounded border border-ctp-surface1 bg-ctp-surface0 hover:border-ctp-accent hover:bg-ctp-surface1 transition-colors"
            >
              <span className="text-xs text-ctp-text font-medium">{entryName(entries, id)}</span>
              <span className="ml-2 text-[9px] text-ctp-overlay1">{id.slice(0, 8)}</span>
            </button>
          </div>
        )
      })}
    </div>
  )
}
