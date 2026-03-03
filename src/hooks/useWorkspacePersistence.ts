import { useEffect, useRef } from 'react'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { saveWorkspace, loadCustomRules, saveCustomRules, loadWorkspace } from '@/services/persistence-service'
import type { PanelLayout } from '@/types'

const DEBOUNCE_MS = 500

export function useWorkspacePersistence(panelLayout: PanelLayout): void {
  const tabs = useWorkspaceStore((s) => s.tabs)
  const activeTabId = useWorkspaceStore((s) => s.activeTabId)
  const theme = useWorkspaceStore((s) => s.theme)
  const lastSeenChangelogDate = useWorkspaceStore((s) => s.lastSeenChangelogDate)
  const customRules = useWorkspaceStore((s) => s.customRules)
  const disabledBuiltinRuleIds = useWorkspaceStore((s) => s.disabledBuiltinRuleIds)
  const setCustomRules = useWorkspaceStore((s) => s.setCustomRules)
  const setDisabledBuiltinRuleIds = useWorkspaceStore((s) => s.setDisabledBuiltinRuleIds)
  const setLastSeenChangelogDate = useWorkspaceStore((s) => s.setLastSeenChangelogDate)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rulesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialLoadDone = useRef(false)

  // Load custom rules and lastSeenChangelogDate on mount
  useEffect(() => {
    if (initialLoadDone.current) return
    initialLoadDone.current = true
    loadCustomRules().then(({ rules, disabledBuiltinIds }) => {
      setCustomRules(rules)
      setDisabledBuiltinRuleIds(disabledBuiltinIds)
    }).catch(() => {
      // Non-fatal: start with empty rules
    })
    loadWorkspace().then((workspace) => {
      if (workspace?.lastSeenChangelogDate !== undefined) {
        setLastSeenChangelogDate(workspace.lastSeenChangelogDate)
      }
    }).catch(() => {
      // Non-fatal
    })
  }, [setCustomRules, setDisabledBuiltinRuleIds, setLastSeenChangelogDate])

  // Save workspace (tabs/theme/layout) when it changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      try {
        await saveWorkspace({ tabs, activeTabId, theme, panelLayout, lastSeenChangelogDate: lastSeenChangelogDate ?? undefined })
      } catch {
        // Workspace persistence failures are non-fatal
      }
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [tabs, activeTabId, theme, panelLayout, lastSeenChangelogDate])

  // Save custom rules when they change (after initial load)
  useEffect(() => {
    if (!initialLoadDone.current) return

    if (rulesDebounceRef.current) clearTimeout(rulesDebounceRef.current)

    rulesDebounceRef.current = setTimeout(async () => {
      try {
        await saveCustomRules(customRules, disabledBuiltinRuleIds)
      } catch {
        // Custom rules persistence failures are non-fatal
      }
    }, DEBOUNCE_MS)

    return () => {
      if (rulesDebounceRef.current) clearTimeout(rulesDebounceRef.current)
    }
  }, [customRules, disabledBuiltinRuleIds])
}
