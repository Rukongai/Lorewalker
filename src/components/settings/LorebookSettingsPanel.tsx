import { useWorkspaceStore } from '@/stores/workspace-store'
import { HelpTooltip } from '@/components/ui/HelpTooltip'
import { Toggle } from '@/components/shared/Toggle'

const inputClass =
  'bg-ctp-surface0 border border-ctp-surface1 rounded px-2 py-1 text-xs text-ctp-subtext1 outline-none focus:border-ctp-lavender transition-colors'

const numericInputClass =
  'bg-ctp-surface0 border border-ctp-surface1 rounded px-2 py-1 text-xs text-ctp-subtext1 outline-none focus:border-ctp-lavender transition-colors w-20 text-right disabled:opacity-50 disabled:cursor-not-allowed'

function SubcategoryHeader({ title }: { title: string }) {
  return (
    <p className="text-[10px] font-semibold text-ctp-overlay0 uppercase tracking-widest mb-3">
      {title}
    </p>
  )
}

export function LorebookSettingsPanel() {
  const lorebookDefaults = useWorkspaceStore((s) => s.lorebookDefaults)
  const setLorebookDefaults = useWorkspaceStore((s) => s.setLorebookDefaults)

  const minActivationsDisabled = lorebookDefaults.maxRecursionSteps > 0
  const maxRecursionStepsDisabled = lorebookDefaults.minActivations > 0

  return (
    <div className="flex flex-col gap-3">
      <SubcategoryHeader title="Scanning" />

      {/* Scan Depth */}
      <div className="flex items-center justify-between">
        <div className="flex items-center text-xs text-ctp-subtext0">
          Scan Depth
          <HelpTooltip text="Number of recent chat messages to scan for keyword matches. Applied when the imported file doesn't specify a value." />
        </div>
        <input
          type="number"
          className={numericInputClass}
          min={0}
          max={1000}
          value={lorebookDefaults.scanDepth}
          onChange={(e) => setLorebookDefaults({ scanDepth: Math.max(0, Math.min(1000, Number(e.target.value))) })}
        />
      </div>

      {/* Recursive Scan */}
      <div className="flex items-center justify-between">
        <div className="flex items-center text-xs text-ctp-subtext0">
          Recursive Scan
          <HelpTooltip text="Allow lorebook entries activated by other entries to trigger further keyword matching." />
        </div>
        <Toggle
          checked={lorebookDefaults.recursiveScan}
          onChange={(v) => setLorebookDefaults({ recursiveScan: v })}
        />
      </div>

      {/* Include Names */}
      <div className="flex items-center justify-between">
        <div className="flex items-center text-xs text-ctp-subtext0">
          Include Names
          <HelpTooltip text="Include character and persona names in keyword scanning." />
        </div>
        <Toggle
          checked={lorebookDefaults.includeNames}
          onChange={(v) => setLorebookDefaults({ includeNames: v })}
        />
      </div>

      {/* Case Sensitive */}
      <div className="flex items-center justify-between">
        <div className="flex items-center text-xs text-ctp-subtext0">
          Case-Sensitive
          <HelpTooltip text="Require keyword matches to match the exact letter case." />
        </div>
        <Toggle
          checked={lorebookDefaults.caseSensitive}
          onChange={(v) => setLorebookDefaults({ caseSensitive: v })}
        />
      </div>

      {/* Match Whole Words */}
      <div className="flex items-center justify-between">
        <div className="flex items-center text-xs text-ctp-subtext0">
          Match Whole Words
          <HelpTooltip text="Only match keywords that appear as whole words, not as substrings inside other words." />
        </div>
        <Toggle
          checked={lorebookDefaults.matchWholeWords}
          onChange={(v) => setLorebookDefaults({ matchWholeWords: v })}
        />
      </div>

      <div className="border-t border-ctp-surface0 my-2" />
      <SubcategoryHeader title="Budget" />

      {/* Context % */}
      <div className="flex items-center justify-between">
        <div className="flex items-center text-xs text-ctp-subtext0">
          Context %
          <HelpTooltip text="Percentage of the context window to reserve for lorebook entries." />
        </div>
        <div className="flex items-center gap-1">
          <input
            type="number"
            className={numericInputClass}
            min={0}
            max={100}
            value={lorebookDefaults.contextBudgetPercent}
            onChange={(e) => setLorebookDefaults({ contextBudgetPercent: Math.max(0, Math.min(100, Number(e.target.value))) })}
          />
          <span className="text-xs text-ctp-overlay0">%</span>
        </div>
      </div>

      {/* Budget Cap */}
      <div className="flex items-center justify-between">
        <div className="flex items-center text-xs text-ctp-subtext0">
          Budget Cap
          <HelpTooltip text="Maximum token budget for lorebook entries. 0 = disabled." />
        </div>
        <input
          type="number"
          className={numericInputClass}
          min={0}
          max={65536}
          value={lorebookDefaults.budgetCap}
          onChange={(e) => setLorebookDefaults({ budgetCap: Math.max(0, Math.min(65536, Number(e.target.value))) })}
        />
      </div>

      <div className="border-t border-ctp-surface0 my-2" />
      <SubcategoryHeader title="Activation" />

      {/* Min Activations */}
      <div className="flex items-center justify-between">
        <div className="flex items-center text-xs text-ctp-subtext0">
          Minimum Activations
          <HelpTooltip text="Minimum number of entries to activate per turn. 0 = disabled. Mutually exclusive with Max Recursion Steps." />
        </div>
        <input
          type="number"
          className={numericInputClass}
          min={0}
          max={100}
          disabled={minActivationsDisabled}
          value={lorebookDefaults.minActivations}
          onChange={(e) => setLorebookDefaults({ minActivations: Math.max(0, Math.min(100, Number(e.target.value))) })}
          title={minActivationsDisabled ? 'Disabled when Max Recursion Steps are used' : undefined}
        />
      </div>
      {minActivationsDisabled && (
        <p className="text-[10px] text-ctp-overlay0 -mt-2">Disabled when Max Recursion Steps are used</p>
      )}

      {/* Max Recursion Steps */}
      <div className="flex items-center justify-between">
        <div className="flex items-center text-xs text-ctp-subtext0">
          Max Recursion Steps
          <HelpTooltip text="Maximum number of recursive scanning passes. 0 = unlimited. Mutually exclusive with Minimum Activations." />
        </div>
        <input
          type="number"
          className={numericInputClass}
          min={0}
          max={10}
          disabled={maxRecursionStepsDisabled}
          value={lorebookDefaults.maxRecursionSteps}
          onChange={(e) => setLorebookDefaults({ maxRecursionSteps: Math.max(0, Math.min(10, Number(e.target.value))) })}
          title={maxRecursionStepsDisabled ? 'Disabled when Minimum Activations are used' : undefined}
        />
      </div>
      {maxRecursionStepsDisabled && (
        <p className="text-[10px] text-ctp-overlay0 -mt-2">Disabled when Minimum Activations are used</p>
      )}

      {/* Max Depth */}
      <div className="flex items-center justify-between">
        <div className="flex items-center text-xs text-ctp-subtext0">
          Max Depth
          <HelpTooltip text="Maximum recursion depth for lorebook scanning. 0 = unlimited." />
        </div>
        <input
          type="number"
          className={numericInputClass}
          min={0}
          max={100}
          value={lorebookDefaults.maxDepth}
          onChange={(e) => setLorebookDefaults({ maxDepth: Math.max(0, Math.min(100, Number(e.target.value))) })}
        />
      </div>

      <div className="border-t border-ctp-surface0 my-2" />
      <SubcategoryHeader title="Grouping" />

      {/* Use Group Scoring */}
      <div className="flex items-center justify-between">
        <div className="flex items-center text-xs text-ctp-subtext0">
          Use Group Scoring
          <HelpTooltip text="Use weighted scoring to select entries from groups instead of random selection." />
        </div>
        <Toggle
          checked={lorebookDefaults.useGroupScoring}
          onChange={(v) => setLorebookDefaults({ useGroupScoring: v })}
        />
      </div>

      {/* Alert on Overflow */}
      <div className="flex items-center justify-between">
        <div className="flex items-center text-xs text-ctp-subtext0">
          Alert on Overflow
          <HelpTooltip text="Show a warning when the lorebook budget is exceeded." />
        </div>
        <Toggle
          checked={lorebookDefaults.alertOnOverflow}
          onChange={(v) => setLorebookDefaults({ alertOnOverflow: v })}
        />
      </div>

      <div className="border-t border-ctp-surface0 my-2" />
      <SubcategoryHeader title="Insertion" />

      {/* Insertion Strategy */}
      <div className="flex items-center justify-between">
        <div className="flex items-center text-xs text-ctp-subtext0">
          Insertion Strategy
          <HelpTooltip text="Order in which lorebook entries are inserted into the context when multiple are active." />
        </div>
        <select
          className={inputClass}
          value={lorebookDefaults.insertionStrategy}
          onChange={(e) => setLorebookDefaults({ insertionStrategy: e.target.value as typeof lorebookDefaults.insertionStrategy })}
        >
          <option value="evenly">Sorted Evenly</option>
          <option value="character_lore_first">Character Lore First</option>
          <option value="global_lore_first">Global Lore First</option>
        </select>
      </div>
    </div>
  )
}
