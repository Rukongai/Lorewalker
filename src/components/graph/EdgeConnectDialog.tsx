import { useState } from 'react'
import type { WorkingEntry } from '@/types'
import { X } from 'lucide-react'

interface EdgeConnectDialogProps {
  sourceId: string
  targetId: string
  entries: WorkingEntry[]
  onConfirm: (keyword: string) => void
  onCancel: () => void
}

export function EdgeConnectDialog({ sourceId, targetId, entries, onConfirm, onCancel }: EdgeConnectDialogProps) {
  const sourceEntry = entries.find((e) => e.id === sourceId)
  const targetEntry = entries.find((e) => e.id === targetId)

  const [selectedKey, setSelectedKey] = useState(targetEntry?.keys[0] ?? '')
  const [customKeyword, setCustomKeyword] = useState('')

  const keyword = customKeyword.trim() || selectedKey

  if (!sourceEntry || !targetEntry) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-ctp-mantle border border-ctp-surface1 rounded-lg shadow-xl p-4 w-72 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-ctp-text">
            Connect entries
          </h3>
          <button onClick={onCancel} className="text-ctp-overlay1 hover:text-ctp-subtext1 mt-0.5">
            <X size={14} />
          </button>
        </div>

        <p className="text-xs text-ctp-subtext0">
          Add a keyword from <span className="text-ctp-accent">{targetEntry.name || 'target'}</span> to{' '}
          <span className="text-ctp-accent">{sourceEntry.name || 'source'}</span>'s content.
        </p>

        {targetEntry.keys.length > 0 && (
          <div className="space-y-1">
            <label className="text-[10px] text-ctp-overlay1 uppercase tracking-wider">Select keyword</label>
            <select
              value={selectedKey}
              onChange={(e) => { setSelectedKey(e.target.value); setCustomKeyword('') }}
              className="w-full bg-ctp-surface0 border border-ctp-surface1 rounded px-2 py-1 text-xs text-ctp-text outline-none"
            >
              {targetEntry.keys.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-[10px] text-ctp-overlay1 uppercase tracking-wider">Or type custom keyword</label>
          <input
            type="text"
            value={customKeyword}
            onChange={(e) => setCustomKeyword(e.target.value)}
            placeholder="Enter keyword…"
            className="w-full bg-ctp-surface0 border border-ctp-surface1 rounded px-2 py-1 text-xs text-ctp-text outline-none placeholder-ctp-overlay0"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={() => { if (keyword) onConfirm(keyword) }}
            disabled={!keyword}
            className="flex-1 px-3 py-1.5 text-xs bg-ctp-accent text-ctp-base rounded hover:bg-ctp-accent/80 disabled:opacity-40 transition-colors font-medium"
          >
            Add Link
          </button>
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs bg-ctp-surface0 border border-ctp-surface1 rounded text-ctp-subtext1 hover:bg-ctp-surface1 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
