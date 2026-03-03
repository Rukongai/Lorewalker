import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { FIXED_CATEGORIES, CATEGORY_ICON, getEntryIcon } from '@/lib/entry-type'
import type { EntryCategory } from '@/lib/entry-type'

interface CategoryMenuProps {
  x: number
  y: number
  currentCategory?: string
  onSelect: (category: string | undefined) => void
  onClose: () => void
}

export function CategoryMenu({ x, y, currentCategory, onSelect, onClose }: CategoryMenuProps) {
  const [customMode, setCustomMode] = useState(false)
  const [customValue, setCustomValue] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Close on outside click or Escape
  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  // Focus input when custom mode opens
  useEffect(() => {
    if (customMode) inputRef.current?.focus()
  }, [customMode])

  // Adjust position to keep menu on screen
  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(x, window.innerWidth - 180),
    top: Math.min(y, window.innerHeight - 320),
    zIndex: 9999,
  }

  function handleCategoryClick(cat: EntryCategory) {
    onSelect(cat)
    onClose()
  }

  function handleCustomSubmit() {
    const trimmed = customValue.trim()
    if (trimmed) {
      onSelect(trimmed)
      onClose()
    }
  }

  function handleClear() {
    onSelect(undefined)
    onClose()
  }

  return createPortal(
    <div
      ref={menuRef}
      style={menuStyle}
      className="bg-ctp-mantle border border-ctp-surface1 rounded shadow-xl py-1 min-w-[160px]"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="px-2 py-1 text-[10px] font-semibold text-ctp-overlay0 uppercase tracking-widest">
        Set Category
      </div>

      {FIXED_CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => handleCategoryClick(cat)}
          className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors ${
            currentCategory === cat
              ? 'text-ctp-accent bg-ctp-accent/10'
              : 'text-ctp-subtext1 hover:bg-ctp-surface0 hover:text-ctp-text'
          }`}
        >
          <span className="text-[11px] w-4 text-center">{CATEGORY_ICON[cat] || '·'}</span>
          <span className="capitalize">{cat}</span>
          {currentCategory === cat && <span className="ml-auto text-[9px] text-ctp-accent">✓</span>}
        </button>
      ))}

      <div className="border-t border-ctp-surface0 my-1" />

      {customMode ? (
        <div className="px-2 py-1 flex gap-1">
          <input
            ref={inputRef}
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCustomSubmit()
              if (e.key === 'Escape') { setCustomMode(false); setCustomValue('') }
            }}
            placeholder="Custom category…"
            className="flex-1 bg-ctp-surface0 border border-ctp-surface1 rounded px-2 py-0.5 text-xs text-ctp-text outline-none focus:border-ctp-accent"
          />
          <button
            onClick={handleCustomSubmit}
            className="px-2 py-0.5 rounded text-[10px] bg-ctp-accent text-ctp-base font-medium"
          >
            OK
          </button>
        </div>
      ) : (
        <button
          onClick={() => setCustomMode(true)}
          className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 text-ctp-subtext1 hover:bg-ctp-surface0 hover:text-ctp-text transition-colors"
        >
          <span className="text-[11px] w-4 text-center">
            {currentCategory && !FIXED_CATEGORIES.includes(currentCategory as EntryCategory)
              ? getEntryIcon(currentCategory)
              : '🏷️'}
          </span>
          Custom…
        </button>
      )}

      {currentCategory && (
        <button
          onClick={handleClear}
          className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 text-ctp-overlay1 hover:bg-ctp-surface0 hover:text-ctp-red transition-colors"
        >
          <span className="text-[11px] w-4 text-center">✕</span>
          Clear override
        </button>
      )}
    </div>,
    document.body
  )
}

/**
 * Hook to manage CategoryMenu open state triggered by right-click.
 */
export function useCategoryMenu(onSelect: (category: string | undefined) => void) {
  const [menu, setMenu] = useState<{ x: number; y: number; currentCategory?: string } | null>(null)

  function openMenu(e: React.MouseEvent, currentCategory?: string) {
    e.preventDefault()
    e.stopPropagation()
    setMenu({ x: e.clientX, y: e.clientY, currentCategory })
  }

  function closeMenu() {
    setMenu(null)
  }

  function handleSelect(category: string | undefined) {
    onSelect(category)
    closeMenu()
  }

  const menuElement = menu ? (
    <CategoryMenu
      x={menu.x}
      y={menu.y}
      currentCategory={menu.currentCategory}
      onSelect={handleSelect}
      onClose={closeMenu}
    />
  ) : null

  return { openMenu, closeMenu, menuElement }
}
