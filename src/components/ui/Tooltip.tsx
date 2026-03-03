import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

interface TooltipProps {
  text: string
  children: ReactNode
  placement?: 'above' | 'below'
}

export function Tooltip({ text, children, placement = 'above' }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const ref = useRef<HTMLSpanElement>(null)

  function handleMouseEnter() {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      const tooltipWidth = 224
      const margin = 8
      const centerX = rect.left + rect.width / 2
      const clampedLeft = Math.min(
        Math.max(centerX, tooltipWidth / 2 + margin),
        window.innerWidth - tooltipWidth / 2 - margin
      )
      setPos({
        top: placement === 'below' ? rect.bottom : rect.top,
        left: clampedLeft,
      })
    }
    setVisible(true)
  }

  return (
    <span ref={ref} className="inline-flex" onMouseEnter={handleMouseEnter} onMouseLeave={() => setVisible(false)}>
      {children}
      {visible && createPortal(
        <div
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            transform: placement === 'below'
              ? 'translate(-50%, 6px)'
              : 'translate(-50%, calc(-100% - 6px))',
          }}
          className="z-[9999] w-max max-w-56 px-2 py-1.5 text-xs bg-ctp-surface0 border border-ctp-surface1 rounded text-ctp-subtext0 pointer-events-none whitespace-normal leading-relaxed shadow-lg"
        >
          {text}
        </div>,
        document.body,
      )}
    </span>
  )
}
