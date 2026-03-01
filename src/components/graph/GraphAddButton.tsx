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
        className="flex items-center justify-center w-7 h-7 bg-gray-800 border border-gray-700 rounded text-gray-400 hover:bg-gray-700 hover:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <Plus size={13} />
      </button>
    </div>
  )
}
