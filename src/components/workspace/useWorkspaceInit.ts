import { useState, useEffect } from 'react'
import type { SidebarPanelTab } from '@/layouts/desktop/SidebarPanel'
import { loadWorkspace, loadPreferences, cleanupStaleDocuments, loadProviders } from '@/services/persistence-service'
import { llmService } from '@/services/llm/llm-service'
import { OpenAICompatibleProvider } from '@/services/llm/providers/openai-compatible'
import { AnthropicProvider } from '@/services/llm/providers/anthropic'
import { useWorkspaceStore } from '@/stores/workspace-store'

export type RightPanelTab = SidebarPanelTab
export type LeftPanelTab = 'files' | 'entries'

const DEFAULT_PREFERENCES = { autosaveIntervalMs: 2000, recoveryRetentionDays: 7, simulationDefaults: { defaultScanDepth: 4, defaultTokenBudget: 50000, defaultCaseSensitive: false, defaultMatchWholeWords: false, defaultMaxRecursionSteps: 0, defaultIncludeNames: false } }

/**
 * Handles workspace initialization: loads persisted state from IndexedDB,
 * bootstraps LLM providers, and restores panel layout on mount.
 * Also owns the panel layout state that init populates.
 */
export function useWorkspaceInit() {
  const [leftWidth, setLeftWidth] = useState(256)
  const [rightWidth, setRightWidth] = useState(320)
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('edit')
  const [leftPanelTab, setLeftPanelTab] = useState<LeftPanelTab>('entries')

  useEffect(() => {
    async function init() {
      // Bootstrap LLMService from IndexedDB
      try {
        const persistedProviders = await loadProviders()
        for (const p of persistedProviders) {
          const config = { ...p.config, apiKey: p.apiKey }
          const provider = p.type === 'anthropic'
            ? new AnthropicProvider(p.id, p.name, config)
            : new OpenAICompatibleProvider(p.id, p.name, config)
          llmService.registerProvider(provider)
        }
        if (persistedProviders.length > 0) {
          const firstId = persistedProviders[0].id
          if (!useWorkspaceStore.getState().activeLlmProviderId) {
            useWorkspaceStore.getState().setActiveLlmProviderId(firstId)
          }
        }
      } catch {
        // Non-fatal — app works without LLM
      }

      const prefs = await loadPreferences() ?? DEFAULT_PREFERENCES
      const workspace = await loadWorkspace()
      if (workspace) {
        useWorkspaceStore.getState().setTheme(workspace.theme)
        setLeftWidth(workspace.panelLayout.leftPanelWidth)
        setRightWidth(workspace.panelLayout.rightPanelWidth)
        setLeftCollapsed(workspace.panelLayout.leftCollapsed)
        setRightCollapsed(workspace.panelLayout.rightCollapsed)
        const storedTab = workspace.panelLayout.rightPanelTab
        const validTabs: RightPanelTab[] = ['edit', 'health', 'simulator', 'keywords']
        setRightPanelTab(validTabs.includes(storedTab as RightPanelTab) ? (storedTab as RightPanelTab) : 'edit')
        setLeftPanelTab(workspace.panelLayout.leftPanelTab ?? 'entries')
      }
      await cleanupStaleDocuments(prefs.recoveryRetentionDays)
    }
    init().catch((err) => {
      console.error('[WorkspaceShell] init failed:', err)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    leftWidth, setLeftWidth,
    rightWidth, setRightWidth,
    leftCollapsed, setLeftCollapsed,
    rightCollapsed, setRightCollapsed,
    rightPanelTab, setRightPanelTab,
    leftPanelTab, setLeftPanelTab,
  }
}
