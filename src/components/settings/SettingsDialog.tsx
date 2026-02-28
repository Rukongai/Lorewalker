import { HelpCircle } from 'lucide-react'
import { useWorkspaceStore } from '@/stores/workspace-store'
import type { GraphLayoutSettings } from '@/types'

const inputClass =
  'bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 outline-none focus:border-indigo-500 transition-colors'

function HelpTooltip({ text }: { text: string }) {
  return (
    <div className="relative group inline-flex items-center ml-1">
      <HelpCircle size={12} className="text-gray-600 hover:text-gray-400 cursor-help" />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-52 px-2 py-1.5
        text-xs bg-gray-800 border border-gray-700 rounded text-gray-300 z-50
        pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity
        whitespace-normal leading-relaxed">
        {text}
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
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl w-[480px]"
        style={{ maxHeight: '460px' }}
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
        <div className="flex" style={{ minHeight: '360px' }}>
          {/* Left: category list */}
          <div className="w-28 border-r border-gray-800 p-2 shrink-0">
            <button className="w-full text-left px-2 py-1.5 rounded text-xs text-indigo-400 bg-gray-800 font-medium">
              Graph Settings
            </button>
          </div>

          {/* Right: content */}
          <div className="flex-1 p-4 overflow-y-auto">
            <GraphSettingsPanel />
          </div>
        </div>
      </div>
    </div>
  )
}
