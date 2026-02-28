import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { HelpCircle } from 'lucide-react'
import { useWorkspaceStore } from '@/stores/workspace-store'
import type { GraphLayoutSettings, GraphDisplayDefaults, EditorDefaults } from '@/types'

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

function SubcategoryHeader({ title }: { title: string }) {
  return (
    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">
      {title}
    </p>
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
  const graphDisplayDefaults = useWorkspaceStore((s) => s.graphDisplayDefaults)
  const setGraphDisplayDefaults = useWorkspaceStore((s) => s.setGraphDisplayDefaults)

  function updateLayout<K extends keyof GraphLayoutSettings>(key: K, value: GraphLayoutSettings[K]) {
    setGraphSettings({ ...graphSettings, [key]: value })
  }

  function updateDisplay<K extends keyof GraphDisplayDefaults>(key: K, value: GraphDisplayDefaults[K]) {
    setGraphDisplayDefaults({ ...graphDisplayDefaults, [key]: value })
  }

  return (
    <div className="flex flex-col gap-3">
      <SubcategoryHeader title="Auto-Layout" />

      {/* Acyclicer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center text-xs text-gray-300">
          Acyclicer
          <HelpTooltip text="How dagre handles cycles. Greedy removes feedback edges before layout; Disabled may produce unexpected results with circular graphs." />
        </div>
        <select
          className={inputClass}
          value={graphSettings.acyclicer}
          onChange={(e) => updateLayout('acyclicer', e.target.value as GraphLayoutSettings['acyclicer'])}
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
          onChange={(e) => updateLayout('ranker', e.target.value as GraphLayoutSettings['ranker'])}
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
          onChange={(e) => updateLayout('align', e.target.value as GraphLayoutSettings['align'])}
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
          onChange={(e) => updateLayout('rankdir', e.target.value as GraphLayoutSettings['rankdir'])}
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
          onChange={(e) => updateLayout('edgeDirection', e.target.value as GraphLayoutSettings['edgeDirection'])}
        >
          <option value="LR">LR</option>
          <option value="TB">TB</option>
        </select>
      </div>

      <div className="border-t border-gray-800 my-2" />
      <SubcategoryHeader title="Defaults" />

      {/* Connections */}
      <div className="flex items-center justify-between">
        <div className="flex items-center text-xs text-gray-300">
          Connections
          <HelpTooltip text="Default connection visibility when opening a graph. 'Show for Selected Node' only shows edges connected to the selected entry." />
        </div>
        <select
          className={inputClass}
          value={graphDisplayDefaults.connectionVisibility}
          onChange={(e) => updateDisplay('connectionVisibility', e.target.value as GraphDisplayDefaults['connectionVisibility'])}
        >
          <option value="all">Show All Connections</option>
          <option value="selected">Show for Selected Node</option>
          <option value="none">Connections Hidden</option>
        </select>
      </div>

      {/* Blocked Edges */}
      <div className="flex items-center justify-between">
        <div className="flex items-center text-xs text-gray-300">
          Blocked Edges
          <HelpTooltip text="Whether to show edges blocked by prevent_recursion or exclude_recursion by default." />
        </div>
        <select
          className={inputClass}
          value={String(graphDisplayDefaults.showBlockedEdges)}
          onChange={(e) => updateDisplay('showBlockedEdges', e.target.value === 'true')}
        >
          <option value="false">Hide</option>
          <option value="true">Show</option>
        </select>
      </div>

      {/* Edge Style */}
      <div className="flex items-center justify-between">
        <div className="flex items-center text-xs text-gray-300">
          Style
          <HelpTooltip text="Default edge rendering style. Bezier uses curved noodle paths; Straight uses direct lines; Smoothed Paths uses rounded corner paths." />
        </div>
        <select
          className={inputClass}
          value={graphDisplayDefaults.edgeStyle}
          onChange={(e) => updateDisplay('edgeStyle', e.target.value as GraphDisplayDefaults['edgeStyle'])}
        >
          <option value="bezier">Bezier</option>
          <option value="straight">Straight</option>
          <option value="smoothstep">Smoothed Paths</option>
        </select>
      </div>
    </div>
  )
}

function EditorSettingsPanel() {
  const editorDefaults = useWorkspaceStore((s) => s.editorDefaults)
  const setEditorDefaults = useWorkspaceStore((s) => s.setEditorDefaults)

  function updateEditor<K extends keyof EditorDefaults>(key: K, value: EditorDefaults[K]) {
    setEditorDefaults({ ...editorDefaults, [key]: value })
  }

  return (
    <div className="flex flex-col gap-3">
      <SubcategoryHeader title="Defaults" />

      {/* Keyword Highlights */}
      <div className="flex items-center justify-between">
        <div className="flex items-center text-xs text-gray-300">
          Keyword Highlights
          <HelpTooltip text="Whether the keyword highlight toggle in the content editor starts on or off by default." />
        </div>
        <select
          className={inputClass}
          value={String(editorDefaults.showKeywordHighlights)}
          onChange={(e) => updateEditor('showKeywordHighlights', e.target.value === 'true')}
        >
          <option value="true">Show</option>
          <option value="false">Hide</option>
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
  const [activeCategory, setActiveCategory] = useState<'general' | 'graph' | 'editor'>('general')
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
            {(['general', 'graph', 'editor'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`w-full text-left px-2 py-1.5 rounded text-xs font-medium ${
                  activeCategory === cat
                    ? 'text-indigo-400 bg-gray-800'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                } transition-colors`}
              >
                {cat === 'general' ? 'General' : cat === 'graph' ? 'Graph Settings' : 'Editor'}
              </button>
            ))}
          </div>

          {/* Drag divider */}
          <div
            className="w-1 shrink-0 cursor-col-resize bg-gray-800 hover:bg-indigo-600 transition-colors"
            onMouseDown={startDrag}
          />

          {/* Right: content */}
          <div className="flex-1 p-4 overflow-y-auto">
            {activeCategory === 'general' && <GeneralSettingsPanel />}
            {activeCategory === 'graph' && <GraphSettingsPanel />}
            {activeCategory === 'editor' && <EditorSettingsPanel />}
          </div>
        </div>
      </div>
    </div>
  )
}
