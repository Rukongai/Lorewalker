import { Tooltip } from '@/components/ui/Tooltip'
import { useCategoryMenu } from '@/components/entry-list/CategoryMenu'
import { getEntryIcon } from '@/lib/entry-type'

interface CategoryAssignProps {
  userCategory: string | undefined
  onSetCategory: (category: string | undefined) => void
}

export function CategoryAssign({ userCategory, onSetCategory }: CategoryAssignProps) {
  const effectiveCategory = userCategory ?? 'generic'
  const categoryIcon = getEntryIcon(effectiveCategory)
  const { openMenu, menuElement } = useCategoryMenu(onSetCategory)

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
      {menuElement}
    </div>
  )
}
