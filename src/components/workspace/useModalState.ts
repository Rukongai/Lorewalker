import { useState } from 'react'
import type { LorebookWorkspaceTab } from '@/layouts/desktop/LorebookWorkspace'

/**
 * Owns all modal visibility state for WorkspaceShell:
 * entry editor, lorebook tools, settings, snapshot save dialog.
 */
export function useModalState() {
  const [modalEntryId, setModalEntryId] = useState<string | null>(null)
  const [toolsModalOpen, setToolsModalOpen] = useState(false)
  const [toolsModalTab, setToolsModalTab] = useState<LorebookWorkspaceTab>('health')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [showSnapshotDialog, setShowSnapshotDialog] = useState(false)
  const [snapshotSaveCount, setSnapshotSaveCount] = useState(0)

  return {
    modalEntryId, setModalEntryId,
    toolsModalOpen, setToolsModalOpen,
    toolsModalTab, setToolsModalTab,
    settingsOpen, setSettingsOpen,
    showSnapshotDialog, setShowSnapshotDialog,
    snapshotSaveCount, setSnapshotSaveCount,
  }
}
