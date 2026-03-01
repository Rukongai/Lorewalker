import { ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import type { SimulationSettings } from '@/types'

interface SimulatorSettingsProps {
  settings: SimulationSettings
  onChange: (patch: Partial<SimulationSettings>) => void
}

export function SimulatorSettings({ settings, onChange }: SimulatorSettingsProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-ctp-surface0 shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full px-3 py-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-ctp-overlay1 hover:text-ctp-subtext0 transition-colors"
      >
        {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        Settings
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2.5">
          <label className="flex items-center justify-between gap-2">
            <span className="text-xs text-ctp-subtext0">Scan Depth</span>
            <input
              type="number"
              min={1}
              max={50}
              value={settings.defaultScanDepth}
              onChange={(e) => onChange({ defaultScanDepth: Math.max(1, Math.min(50, Number(e.target.value))) })}
              className="w-16 text-xs bg-ctp-surface0 border border-ctp-surface1 rounded px-1.5 py-0.5 text-ctp-text text-right"
            />
          </label>

          <label className="flex items-center justify-between gap-2">
            <span className="text-xs text-ctp-subtext0">Token Budget</span>
            <input
              type="number"
              min={0}
              value={settings.defaultTokenBudget}
              onChange={(e) => onChange({ defaultTokenBudget: Math.max(0, Number(e.target.value)) })}
              className="w-20 text-xs bg-ctp-surface0 border border-ctp-surface1 rounded px-1.5 py-0.5 text-ctp-text text-right"
            />
          </label>

          <label className="flex items-center justify-between gap-2">
            <span className="text-xs text-ctp-subtext0">Max Recursion Steps</span>
            <input
              type="number"
              min={0}
              value={settings.defaultMaxRecursionSteps}
              onChange={(e) => onChange({ defaultMaxRecursionSteps: Math.max(0, Number(e.target.value)) })}
              className="w-16 text-xs bg-ctp-surface0 border border-ctp-surface1 rounded px-1.5 py-0.5 text-ctp-text text-right"
            />
          </label>

          <label className="flex items-center justify-between gap-2">
            <span className="text-xs text-ctp-subtext0">Case Sensitive</span>
            <input
              type="checkbox"
              checked={settings.defaultCaseSensitive}
              onChange={(e) => onChange({ defaultCaseSensitive: e.target.checked })}
              className="accent-ctp-accent"
            />
          </label>

          <label className="flex items-center justify-between gap-2">
            <span className="text-xs text-ctp-subtext0">Match Whole Words</span>
            <input
              type="checkbox"
              checked={settings.defaultMatchWholeWords}
              onChange={(e) => onChange({ defaultMatchWholeWords: e.target.checked })}
              className="accent-ctp-accent"
            />
          </label>

          <label className="flex items-center justify-between gap-2">
            <span className="text-xs text-ctp-subtext0">Include Names</span>
            <input
              type="checkbox"
              checked={settings.defaultIncludeNames}
              onChange={(e) => onChange({ defaultIncludeNames: e.target.checked })}
              className="accent-ctp-accent"
            />
          </label>

          {settings.defaultIncludeNames && (
            <>
              <label className="flex items-center justify-between gap-2">
                <span className="text-xs text-ctp-subtext0">Character Name</span>
                <input
                  type="text"
                  value={''}
                  placeholder="Character"
                  readOnly
                  className="w-24 text-xs bg-ctp-surface0 border border-ctp-surface1 rounded px-1.5 py-0.5 text-ctp-text"
                />
              </label>
              <label className="flex items-center justify-between gap-2">
                <span className="text-xs text-ctp-subtext0">User Name</span>
                <input
                  type="text"
                  value={''}
                  placeholder="User"
                  readOnly
                  className="w-24 text-xs bg-ctp-surface0 border border-ctp-surface1 rounded px-1.5 py-0.5 text-ctp-text"
                />
              </label>
            </>
          )}
        </div>
      )}
    </div>
  )
}
