import { Plus } from 'lucide-react'

interface GraphAddButtonProps {
  onAdd: () => void
  disabled?: boolean
}

export function GraphAddButton({ onAdd, disabled }: GraphAddButtonProps) {
  return (
    <div className="absolute top-3 left-3 z-10">
      <button
        onClick={onAdd}
        disabled={disabled}
        title="Add new entry"
        className="flex items-center justify-center w-7 h-7 bg-ctp-surface0 border border-ctp-surface1 rounded text-ctp-overlay1 hover:bg-ctp-surface1 hover:text-ctp-subtext1 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <Plus size={13} />
      </button>
    </div>
  )
}
