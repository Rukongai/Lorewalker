import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { HelpCircle } from 'lucide-react'

export function HelpTooltip({ text }: { text: string }) {
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const iconRef = useRef<HTMLDivElement>(null)

  function handleMouseEnter() {
    if (iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect()
      const tooltipWidth = 224 // w-56 = 14rem × 16px
      const margin = 8
      const centerX = rect.left + rect.width / 2
      const clampedLeft = Math.min(
        Math.max(centerX, tooltipWidth / 2 + margin),
        window.innerWidth - tooltipWidth / 2 - margin
      )
      setPos({ top: rect.top, left: clampedLeft })
    }
    setVisible(true)
  }

  return (
    <div
      ref={iconRef}
      className="inline-flex items-center ml-1 cursor-help"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setVisible(false)}
    >
      <HelpCircle size={12} className="text-gray-500 hover:text-gray-300" />
      {visible && createPortal(
        <div
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            transform: 'translate(-50%, calc(-100% - 6px))',
            zIndex: 9999,
          }}
          className="w-56 px-2 py-1.5 text-xs bg-gray-800 border border-gray-700 rounded text-gray-300 pointer-events-none whitespace-normal leading-relaxed shadow-lg"
        >
          {text}
        </div>,
        document.body,
      )}
    </div>
  )
}
