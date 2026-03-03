import { useMemo } from 'react'
import type { WorkingEntry } from '@/types'

interface KeywordNameDialogProps {
  entries: WorkingEntry[]
  onConfirm: () => void
  onCancel: () => void
}

export function KeywordNameDialog({ entries, onConfirm, onCancel }: KeywordNameDialogProps) {
  const unnamedEntries = useMemo(
    () => entries.filter(e => e.name === '' && e.keys.length > 0),
    [entries]
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-ctp-mantle border border-ctp-surface1 rounded-lg shadow-xl w-full max-w-md mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-ctp-surface1">
          <h2 className="text-ctp-text font-semibold text-sm">Unnamed Entries Detected</h2>
          <button
            onClick={onCancel}
            className="text-ctp-subtext0 hover:text-ctp-text transition-colors"
            aria-label="Cancel"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-3 space-y-3">
          <p className="text-ctp-subtext1 text-sm">
            {unnamedEntries.length === 1
              ? '1 entry has no name.'
              : `${unnamedEntries.length} entries have no name.`}{' '}
            Use the first keyword as the display name?
          </p>

          {/* Preview table */}
          <div className="bg-ctp-base border border-ctp-surface0 rounded max-h-48 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-ctp-mantle border-b border-ctp-surface0">
                <tr>
                  <th className="text-left px-3 py-2 text-ctp-subtext0 font-medium">Entry</th>
                  <th className="text-left px-3 py-2 text-ctp-subtext0 font-medium">→ Proposed Name</th>
                </tr>
              </thead>
              <tbody>
                {unnamedEntries.map((entry, i) => (
                  <tr key={entry.id} className={i % 2 === 0 ? 'bg-ctp-base' : 'bg-ctp-mantle'}>
                    <td className="px-3 py-1.5 text-ctp-subtext1">(unnamed)</td>
                    <td className="px-3 py-1.5 text-ctp-text font-medium">{entry.keys[0]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-ctp-surface1">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-ctp-subtext1 hover:text-ctp-text transition-colors"
          >
            Keep Empty
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 text-sm bg-ctp-accent text-ctp-base rounded hover:opacity-90 transition-opacity font-medium"
          >
            Use First Keyword
          </button>
        </div>
      </div>
    </div>
  )
}
