import { llmService } from '@/services/llm/llm-service'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { Toggle } from '@/components/shared/Toggle'
import { HelpTooltip } from '@/components/ui/HelpTooltip'

const inputClass =
  'bg-ctp-surface0 border border-ctp-surface1 rounded px-2 py-1 text-xs text-ctp-subtext1 outline-none focus:border-ctp-accent transition-colors'

function SubcategoryHeader({ title }: { title: string }) {
  return (
    <p className="text-[10px] font-semibold text-ctp-overlay0 uppercase tracking-widest mb-3">
      {title}
    </p>
  )
}

export function LlmToolsPanel() {
  const llmCategorization = useWorkspaceStore((s) => s.llmCategorization)
  const setLlmCategorizationSettings = useWorkspaceStore((s) => s.setLlmCategorizationSettings)
  const activeLlmProviderId = useWorkspaceStore((s) => s.activeLlmProviderId)

  const providers = llmService.listProviders()

  const effectiveProviderId = llmCategorization.providerId ?? activeLlmProviderId ?? ''

  return (
    <div className="flex flex-col gap-3">
      <SubcategoryHeader title="Categorization" />

      {/* Enable toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center text-xs text-ctp-subtext0">
          Enable LLM categorization
          <HelpTooltip text="When enabled, the 'Categorize Entries' button in the Analysis panel sends entries to an LLM for automatic categorization." />
        </div>
        <Toggle
          checked={llmCategorization.enabled}
          onChange={(v) => setLlmCategorizationSettings({ enabled: v })}
        />
      </div>

      {/* Provider selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center text-xs text-ctp-subtext0">
          Provider
          <HelpTooltip text="Which LLM provider to use for categorization. Defaults to the active provider if not set." />
        </div>
        <select
          className={inputClass}
          value={effectiveProviderId}
          disabled={!llmCategorization.enabled}
          onChange={(e) =>
            setLlmCategorizationSettings({ providerId: e.target.value || undefined })
          }
        >
          <option value="">— Use active provider —</option>
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Skip manual overrides */}
      <div className="flex items-center justify-between">
        <div className="flex items-center text-xs text-ctp-subtext0">
          Skip manual overrides
          <HelpTooltip text="When enabled, entries that already have a manually assigned category will be skipped during LLM categorization." />
        </div>
        <Toggle
          checked={llmCategorization.skipManualOverrides}
          onChange={(v) => setLlmCategorizationSettings({ skipManualOverrides: v })}
          disabled={!llmCategorization.enabled}
        />
      </div>

      {providers.length === 0 && (
        <p className="text-[10px] text-ctp-overlay1 mt-1">
          No providers configured. Add one in the Providers tab first.
        </p>
      )}
    </div>
  )
}
