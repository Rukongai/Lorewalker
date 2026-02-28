import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { HelpCircle } from 'lucide-react'
import { useWorkspaceStore } from '@/stores/workspace-store'
import type { GraphLayoutSettings } from '@/types'

const inputClass =
  'bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 outline-none focus:border-indigo-500 transition-colors'

function HelpTooltip({ text }: { text: string }) {
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const iconRef = useRef<HTMLDivElement>(null)

  function handleMouseEnter() {
    if (iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect()
      setPos({ top: rect.top, left: rect.left + rect.width / 2 })
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
      <HelpCircle size={12} className="text-gray-600 hover:text-gray-400" />
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

function GeneralSettingsPanel() {
  const checkRecursionLoops = useWorkspaceStore((s) => s.checkRecursionLoops)
  const setCheckRecursionLoops = useWorkspaceStore((s) => s.setCheckRecursionLoops)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center text-xs text-gray-300">
          Check for recursion loops
          <HelpTooltip text="Highlights circular references in the graph. SillyTavern breaks loops automatically, so this is off by default." />
        </div>
        <input
          type="checkbox"
          checked={checkRecursionLoops}
          onChange={(e) => setCheckRecursionLoops(e.target.checked)}
          className="accent-indigo-500 w-4 h-4 cursor-pointer"
        />
      </div>
    </div>
  )
}

function GraphSettingsPanel() {
  const graphSettings = useWorkspaceStore((s) => s.graphSettings)
  const setGraphSettings = useWorkspaceStore((s) => s.setGraphSettings)

  function update<K extends keyof GraphLayoutSettings>(key: K, value: GraphLayoutSettings[K]) {
    setGraphSettings({ ...graphSettings, [key]: value })
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Acyclicer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center text-xs text-gray-300">
          Acyclicer
          <HelpTooltip text="How dagre handles cycles. Greedy removes feedback edges before layout; Disabled may produce unexpected results with circular graphs." />
        </div>
        <select
          className={inputClass}
          value={graphSettings.acyclicer}
          onChange={(e) => update('acyclicer', e.target.value as GraphLayoutSettings['acyclicer'])}
        >
          <option value="greedy">Greedy</option>
          <option value="none">Disabled</option>
        </select>
      </div>

      {/* Ranker */}
      <div className="flex items-center justify-between">
        <div className="flex items-center text-xs text-gray-300">
          Ranker
          <HelpTooltip text="Algorithm for assigning nodes to ranks. Network Simplex gives compact results; Tight Tree is faster; Longest Path pushes nodes as far right as possible." />
        </div>
        <select
          className={inputClass}
          value={graphSettings.ranker}
          onChange={(e) => update('ranker', e.target.value as GraphLayoutSettings['ranker'])}
        >
          <option value="network-simplex">Network Simplex</option>
          <option value="tight-tree">Tight Tree</option>
          <option value="longest-path">Longest Path</option>
        </select>
      </div>

      {/* Align */}
      <div className="flex items-center justify-between">
        <div className="flex items-center text-xs text-gray-300">
          Align
          <HelpTooltip text="Alignment of nodes within their rank. U=Up, D=Down, L=Left, R=Right. Controls which corner nodes snap toward within their rank slot." />
        </div>
        <select
          className={inputClass}
          value={graphSettings.align}
          onChange={(e) => update('align', e.target.value as GraphLayoutSettings['align'])}
        >
          <option value="UL">UL</option>
          <option value="UR">UR</option>
          <option value="DL">DL</option>
          <option value="DR">DR</option>
        </select>
      </div>

      {/* Rank Direction */}
      <div className="flex items-center justify-between">
        <div className="flex items-center text-xs text-gray-300">
          Rank Direction
          <HelpTooltip text="Direction the graph flows. LR=Left→Right, TB=Top→Bottom, RL=Right→Left, BT=Bottom→Top." />
        </div>
        <select
          className={inputClass}
          value={graphSettings.rankdir}
          onChange={(e) => update('rankdir', e.target.value as GraphLayoutSettings['rankdir'])}
        >
          <option value="LR">LR</option>
          <option value="TB">TB</option>
          <option value="RL">RL</option>
          <option value="BT">BT</option>
        </select>
      </div>

      {/* Edge Direction */}
      <div className="flex items-center justify-between">
        <div className="flex items-center text-xs text-gray-300">
          Edges
          <HelpTooltip text="Where edges attach to nodes. LR uses left/right handles (pair with LR or RL rank direction); TB uses top/bottom handles (pair with TB or BT)." />
        </div>
        <select
          className={inputClass}
          value={graphSettings.edgeDirection}
          onChange={(e) => update('edgeDirection', e.target.value as GraphLayoutSettings['edgeDirection'])}
        >
          <option value="LR">LR</option>
          <option value="TB">TB</option>
        </select>
      </div>
    </div>
  )
}

interface SettingsDialogProps {
  open: boolean
  onClose: () => void
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const [activeCategory, setActiveCategory] = useState<'general' | 'graph'>('general')
  const [leftWidth, setLeftWidth] = useState(140)
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null)

  function startDrag(e: React.MouseEvent) {
    e.preventDefault()
    dragRef.current = { startX: e.clientX, startWidth: leftWidth }
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      const delta = ev.clientX - dragRef.current.startX
      setLeftWidth(Math.min(300, Math.max(100, dragRef.current.startWidth + delta)))
    }
    const onUp = () => {
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl flex flex-col"
        style={{ width: 'min(640px, 80vw)', height: 'min(540px, 75vw)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <span className="text-sm font-semibold text-gray-200">Settings</span>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: category list */}
          <div className="shrink-0 border-r border-gray-800 p-2 overflow-y-auto" style={{ width: leftWidth }}>
            <button
              onClick={() => setActiveCategory('general')}
              className={`w-full text-left px-2 py-1.5 rounded text-xs font-medium ${
                activeCategory === 'general'
                  ? 'text-indigo-400 bg-gray-800'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              } transition-colors`}
            >
              General
            </button>
            <button
              onClick={() => setActiveCategory('graph')}
              className={`w-full text-left px-2 py-1.5 rounded text-xs font-medium ${
                activeCategory === 'graph'
                  ? 'text-indigo-400 bg-gray-800'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              } transition-colors`}
            >
              Graph Settings
            </button>
          </div>

          {/* Drag divider */}
          <div
            className="w-1 shrink-0 cursor-col-resize bg-gray-800 hover:bg-indigo-600 transition-colors"
            onMouseDown={startDrag}
          />

          {/* Right: content */}
          <div className="flex-1 p-4 overflow-y-auto">
            {activeCategory === 'general' ? <GeneralSettingsPanel /> : <GraphSettingsPanel />}
          </div>
        </div>
      </div>
    </div>
  )
}
