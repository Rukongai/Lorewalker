import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Download, ChevronDown } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import type { FileMeta, CardPayload } from '@/types'

interface ExportButtonProps {
  tabId: string | null
  fileMeta: FileMeta | null
  cardPayload: CardPayload | null
  onExport: (format: 'json' | 'png' | 'charx') => void
}

export function ExportButton({ tabId, fileMeta, cardPayload, onExport }: ExportButtonProps) {
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const isCard = fileMeta?.sourceType === 'embedded-in-card' && cardPayload !== null
  const disabled = !tabId

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        (!menuRef.current || !menuRef.current.contains(e.target as Node))
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function openMenu() {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setMenuPos({ top: rect.bottom + 4, left: rect.left })
    setOpen(true)
  }

  function handleSelect(format: 'json' | 'png' | 'charx') {
    setOpen(false)
    onExport(format)
  }

  if (!isCard) {
    return (
      <Tooltip text="Export" placement="below">
        <button
          onClick={() => onExport('json')}
          disabled={disabled}
          className="p-1.5 rounded text-ctp-subtext1 hover:text-ctp-text hover:bg-ctp-surface0 disabled:opacity-40 transition-colors"
        >
          <Download size={16} />
        </button>
      </Tooltip>
    )
  }

  const originalFormat = cardPayload?.containerFormat

  return (
    <>
      <Tooltip text="Export" placement="below">
        <button
          ref={triggerRef}
          onClick={disabled ? undefined : openMenu}
          disabled={disabled}
          className="p-1.5 rounded text-ctp-subtext1 hover:text-ctp-text hover:bg-ctp-surface0 disabled:opacity-40 transition-colors flex items-center gap-0.5"
        >
          <Download size={16} />
          <ChevronDown size={10} />
        </button>
      </Tooltip>

      {open && createPortal(
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, zIndex: 9999 }}
          className="min-w-52 bg-ctp-surface0 border border-ctp-surface1 rounded shadow-lg py-1 text-xs"
        >
          <button
            className="w-full text-left px-3 py-1.5 text-ctp-text hover:bg-ctp-surface1 transition-colors"
            onClick={() => handleSelect('json')}
          >
            Export Lorebook Only <span className="text-ctp-subtext0">· .json</span>
          </button>
          <button
            className="w-full text-left px-3 py-1.5 text-ctp-text hover:bg-ctp-surface1 transition-colors"
            onClick={() => handleSelect('png')}
          >
            Export as PNG{' '}
            <span className="text-ctp-subtext0">
              {originalFormat === 'png' ? '(character card · original format)' : '(character card)'}
            </span>
          </button>
          <button
            className="w-full text-left px-3 py-1.5 text-ctp-text hover:bg-ctp-surface1 transition-colors"
            onClick={() => handleSelect('charx')}
          >
            Export as charx{' '}
            <span className="text-ctp-subtext0">
              {originalFormat === 'charx' ? '(character card · original format)' : '(character card)'}
            </span>
          </button>
        </div>,
        document.body,
      )}
    </>
  )
}
