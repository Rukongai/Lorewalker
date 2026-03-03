import { useState } from 'react'
import { BookOpen, X } from 'lucide-react'

export interface LorebookMeta {
  name: string
  entryCount: number
}

interface LorebookPickerDialogProps {
  cardName: string
  lorebooks: LorebookMeta[]
  onSelect: (indices: number[]) => void
  onCancel: () => void
}

export function LorebookPickerDialog({ cardName, lorebooks, onSelect, onCancel }: LorebookPickerDialogProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set([0]))

  function toggleIndex(i: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(i)) {
        next.delete(i)
      } else {
        next.add(i)
      }
      return next
    })
  }

  function handleSelectAll() {
    setSelected(new Set(lorebooks.map((_, i) => i)))
  }

  function handleConfirm() {
    const indices = Array.from(selected).sort((a, b) => a - b)
    if (indices.length > 0) onSelect(indices)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-ctp-mantle border border-ctp-surface1 rounded-lg shadow-xl p-5 w-80 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-ctp-text">Select Lorebooks</h3>
            <p className="text-xs text-ctp-subtext0 mt-0.5 truncate">{cardName}</p>
          </div>
          <button onClick={onCancel} className="text-ctp-overlay1 hover:text-ctp-subtext1 mt-0.5">
            <X size={14} />
          </button>
        </div>

        <div className="space-y-1 max-h-48 overflow-y-auto">
          {lorebooks.map((lb, i) => (
            <label
              key={i}
              className="flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-ctp-surface0 transition-colors"
            >
              <input
                type="checkbox"
                checked={selected.has(i)}
                onChange={() => toggleIndex(i)}
                className="accent-ctp-accent"
              />
              <BookOpen size={13} className="text-ctp-overlay1 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-xs text-ctp-text truncate block">{lb.name || `Lorebook ${i + 1}`}</span>
                <span className="text-[10px] text-ctp-overlay1">{lb.entryCount} entries</span>
              </div>
            </label>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleConfirm}
            disabled={selected.size === 0}
            className="flex-1 px-3 py-1.5 text-xs bg-ctp-accent text-ctp-base rounded hover:bg-ctp-accent/80 disabled:opacity-40 transition-colors font-medium"
          >
            Import Selected ({selected.size})
          </button>
          <button
            onClick={handleSelectAll}
            className="px-3 py-1.5 text-xs bg-ctp-surface0 border border-ctp-surface1 rounded text-ctp-subtext1 hover:bg-ctp-surface1 transition-colors"
          >
            All
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
