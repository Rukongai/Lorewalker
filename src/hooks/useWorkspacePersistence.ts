import { useEffect, useRef } from 'react'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { saveWorkspace } from '@/services/persistence-service'
import type { PanelLayout } from '@/types'

const DEBOUNCE_MS = 500

export function useWorkspacePersistence(panelLayout: PanelLayout): void {
  const tabs = useWorkspaceStore((s) => s.tabs)
  const activeTabId = useWorkspaceStore((s) => s.activeTabId)
  const theme = useWorkspaceStore((s) => s.theme)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      try {
        await saveWorkspace({ tabs, activeTabId, theme, panelLayout })
      } catch {
        // Workspace persistence failures are non-fatal
      }
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [tabs, activeTabId, theme, panelLayout])
}
