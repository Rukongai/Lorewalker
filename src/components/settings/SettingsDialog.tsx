import { useState, useRef } from 'react'
import { useWorkspaceStore } from '@/stores/workspace-store'
import type { ThemeId } from '@/types'
import { HelpTooltip } from '@/components/ui/HelpTooltip'
import { Toggle } from '@/components/shared/Toggle'
import { LorebookSettingsPanel } from './LorebookSettingsPanel'
import type { GraphLayoutSettings, GraphDisplayDefaults, EditorDefaults, EntriesListDefaults } from '@/types'

const inputClass =
  'bg-ctp-surface0 border border-ctp-surface1 rounded px-2 py-1 text-xs text-ctp-subtext1 outline-none focus:border-ctp-accent transition-colors'


function SubcategoryHeader({ title }: { title: string }) {
  return (
    <p className="text-[10px] font-semibold text-ctp-overlay0 uppercase tracking-widest mb-3">
      {title}
    </p>
  )
}

function GeneralSettingsPanel() {
  const checkRecursionLoops = useWorkspaceStore((s) => s.checkRecursionLoops)
  const setCheckRecursionLoops = useWorkspaceStore((s) => s.setCheckRecursionLoops)
  const theme = useWorkspaceStore((s) => s.theme)
  const setTheme = useWorkspaceStore((s) => s.setTheme)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center text-xs text-ctp-subtext0">
          Color Theme
          <HelpTooltip text="Color scheme for the entire application." />
        </div>
        <select
          className={inputClass}
          value={theme}
          onChange={(e) => setTheme(e.target.value as ThemeId)}
        >
          <option value="dark">Default Dark</option>
          <option value="catppuccin-latte">Catppuccin Latte</option>
          <option value="catppuccin-frappe">Catppuccin Frappé</option>
          <option value="catppuccin-macchiato">Catppuccin Macchiato</option>
          <option value="catppuccin-mocha">Catppuccin Mocha</option>
          <option value="nord">Nord</option>
          <option value="nord-aurora">Nord Aurora</option>
          <option value="one-dark">One Dark</option>
          <option value="rose-pine">Rosé Pine</option>
          <option value="rose-pine-dawn">Rosé Pine Dawn</option>
          <option value="tokyo-night">Tokyo Night</option>
          <option value="tokyo-night-day">Tokyo Night Day</option>
          <option value="dracula">Dracula</option>
          <option value="dracula-soft">Dracula Soft</option>
        </select>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center text-xs text-ctp-subtext0">
          Check for recursion loops
          <HelpTooltip text="Highlights circular references in the graph. SillyTavern breaks loops automatically, so this is off by default." />
        </div>
        <Toggle checked={checkRecursionLoops} onChange={setCheckRecursionLoops} />
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
        <div className="flex items-center text-xs text-ctp-subtext0">
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
        <div className="flex items-center text-xs text-ctp-subtext0">
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
        <div className="flex items-center text-xs text-ctp-subtext0">
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
        <div className="flex items-center text-xs text-ctp-subtext0">
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
        <div className="flex items-center text-xs text-ctp-subtext0">
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

      <div className="border-t border-ctp-surface0 my-2" />
      <SubcategoryHeader title="Workspace Defaults" />

      {/* Connections */}
      <div className="flex items-center justify-between">
        <div className="flex items-center text-xs text-ctp-subtext0">
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
        <div className="flex items-center text-xs text-ctp-subtext0">
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
        <div className="flex items-center text-xs text-ctp-subtext0">
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
        <div className="flex items-center text-xs text-ctp-subtext0">
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

function EntriesSettingsPanel() {
  const entriesListDefaults = useWorkspaceStore((s) => s.entriesListDefaults)
  const setEntriesListDefaults = useWorkspaceStore((s) => s.setEntriesListDefaults)

  function update<K extends keyof EntriesListDefaults>(key: K, value: EntriesListDefaults[K]) {
    setEntriesListDefaults({ ...entriesListDefaults, [key]: value })
  }

  return (
    <div className="flex flex-col gap-3">
      <SubcategoryHeader title="Entries List Defaults" />

      {/* Sort By */}
      <div className="flex items-center justify-between">
        <div className="flex items-center text-xs text-ctp-subtext0">
          Sort By
          <HelpTooltip text="Default sort order for the entries list." />
        </div>
        <select
          className={inputClass}
          value={entriesListDefaults.sortBy}
          onChange={(e) => update('sortBy', e.target.value as EntriesListDefaults['sortBy'])}
        >
          <option value="uid">UID</option>
          <option value="name">Name</option>
          <option value="tokenCount">Tokens</option>
          <option value="order">Order</option>
          <option value="displayIndex">Display Index</option>
        </select>
      </div>

      {/* Sort Direction */}
      <div className="flex items-center justify-between">
        <div className="flex items-center text-xs text-ctp-subtext0">
          Sort Direction
          <HelpTooltip text="Default sort direction for the entries list." />
        </div>
        <select
          className={inputClass}
          value={entriesListDefaults.sortDirection}
          onChange={(e) => update('sortDirection', e.target.value as EntriesListDefaults['sortDirection'])}
        >
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
      </div>

      {/* Secondary Sort By */}
      <div className="flex items-center justify-between">
        <div className="flex items-center text-xs text-ctp-subtext0">
          Secondary Sort
          <HelpTooltip text="Tiebreak key applied when the primary sort produces a tie. Set to None to disable." />
        </div>
        <select
          className={inputClass}
          value={entriesListDefaults.sortBy2 ?? ''}
          onChange={(e) => update('sortBy2', e.target.value === '' ? null : e.target.value as EntriesListDefaults['sortBy'])}
        >
          <option value="">— None —</option>
          <option value="uid">UID</option>
          <option value="name">Name</option>
          <option value="tokenCount">Tokens</option>
          <option value="order">Order</option>
          <option value="displayIndex">Display Index</option>
        </select>
      </div>

      {/* Secondary Sort Direction */}
      <div className="flex items-center justify-between">
        <div className="flex items-center text-xs text-ctp-subtext0">
          Secondary Direction
          <HelpTooltip text="Sort direction for the secondary sort key." />
        </div>
        <select
          className={inputClass}
          value={entriesListDefaults.sortDir2}
          disabled={entriesListDefaults.sortBy2 === null}
          onChange={(e) => update('sortDir2', e.target.value as EntriesListDefaults['sortDir2'])}
        >
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
      </div>

      {/* Pin Constants to Top */}
      <div className="flex items-center justify-between">
        <div className="flex items-center text-xs text-ctp-subtext0">
          Pin Constants to Top
          <HelpTooltip text="Always show Constant (always-active) entries at the top of the list, regardless of sort order." />
        </div>
        <select
          className={inputClass}
          value={String(entriesListDefaults.pinConstantsToTop)}
          onChange={(e) => update('pinConstantsToTop', e.target.value === 'true')}
        >
          <option value="true">Enabled</option>
          <option value="false">Disabled</option>
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
  const [activeCategory, setActiveCategory] = useState<'general' | 'graph' | 'editor' | 'entries' | 'lorebook'>('general')
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
        className="bg-ctp-mantle border border-ctp-surface1 rounded-lg shadow-xl flex flex-col"
        style={{ width: 'min(640px, 80vw)', height: 'min(540px, 75vw)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-ctp-surface0">
          <span className="text-sm font-semibold text-ctp-subtext1">Settings</span>
          <button
            onClick={onClose}
            className="text-ctp-overlay0 hover:text-ctp-subtext0 transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: category list */}
          <div className="shrink-0 border-r border-ctp-surface0 p-2 overflow-y-auto" style={{ width: leftWidth }}>
            {(['general', 'graph', 'editor', 'entries', 'lorebook'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`w-full text-left px-2 py-1.5 rounded text-xs font-medium ${
                  activeCategory === cat
                    ? 'text-ctp-accent bg-ctp-surface0'
                    : 'text-ctp-overlay1 hover:text-ctp-subtext1 hover:bg-ctp-surface0/50'
                } transition-colors`}
              >
                {cat === 'general' ? 'General' : cat === 'graph' ? 'Workspace Settings' : cat === 'editor' ? 'Editor' : cat === 'entries' ? 'Entries' : 'Lorebook'}
              </button>
            ))}
          </div>

          {/* Drag divider */}
          <div
            className="w-1 shrink-0 cursor-col-resize bg-ctp-surface0 hover:bg-ctp-accent transition-colors"
            onMouseDown={startDrag}
          />

          {/* Right: content */}
          <div className="flex-1 p-4 overflow-y-auto">
            {activeCategory === 'general' && <GeneralSettingsPanel />}
            {activeCategory === 'graph' && <GraphSettingsPanel />}
            {activeCategory === 'editor' && <EditorSettingsPanel />}
            {activeCategory === 'entries' && <EntriesSettingsPanel />}
            {activeCategory === 'lorebook' && <LorebookSettingsPanel />}
          </div>
        </div>
      </div>
    </div>
  )
}
