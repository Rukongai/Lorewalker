import { useState } from 'react'
import { Tooltip } from '@/components/ui/Tooltip'
import { useCategoryMenu } from '@/components/entry-list/CategoryMenu'
import { getEntryIcon } from '@/lib/entry-type'

interface CategoryAssignProps {
  userCategory: string | undefined
  onSetCategory: (category: string | undefined) => void
  onCategorize?: () => Promise<void>
}

export function CategoryAssign({ userCategory, onSetCategory, onCategorize }: CategoryAssignProps) {
  const [categorizing, setCategorizing] = useState(false)
  const effectiveCategory = userCategory ?? 'generic'
  const categoryIcon = getEntryIcon(effectiveCategory)
  const { openMenu, menuElement } = useCategoryMenu(onSetCategory)

  async function handleCategorize() {
    if (!onCategorize || categorizing) return
    setCategorizing(true)
    try {
      await onCategorize()
    } finally {
      setCategorizing(false)
    }
  }

  return (
    <div className="flex items-center gap-2 px-0.5">
      <span className="text-[11px] text-ctp-subtext0">Category</span>
      <Tooltip text="Click to change category">
        <button
          onClick={(e) => openMenu(e, userCategory)}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded text-xs bg-ctp-surface0 hover:bg-ctp-surface1 border border-ctp-surface2 transition-colors"
        >
          {categoryIcon && <span className="text-[11px]">{categoryIcon}</span>}
          <span className="text-ctp-subtext1 capitalize">{effectiveCategory}</span>
        </button>
      </Tooltip>
      {userCategory && (
        <Tooltip text="Clear category override">
          <button
            onClick={() => onSetCategory(undefined)}
            className="text-[9px] text-ctp-overlay1 hover:text-ctp-red transition-colors"
          >
            ✕
          </button>
        </Tooltip>
      )}
      {onCategorize && (
        <Tooltip text="Auto-categorize with LLM">
          <button
            onClick={handleCategorize}
            disabled={categorizing}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] bg-ctp-accent/20 text-ctp-accent hover:bg-ctp-accent/30 transition-colors disabled:opacity-40"
          >
            {categorizing ? (
              <span className="inline-block w-2.5 h-2.5 border border-ctp-accent border-t-transparent rounded-full animate-spin" />
            ) : (
              '✦'
            )}
            Auto
          </button>
        </Tooltip>
      )}
      {menuElement}
    </div>
  )
}
