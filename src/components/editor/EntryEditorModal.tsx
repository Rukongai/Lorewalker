import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { useDerivedState } from '@/hooks/useDerivedState'
import { EntryEditor } from './EntryEditor'
import { ActivationLinks } from './ActivationLinks'
import { ModalFindingsPane } from '@/components/analysis/ModalFindingsPane'

interface EntryEditorModalProps {
  entryId: string
  onClose: () => void
}

export function EntryEditorModal({ entryId, onClose }: EntryEditorModalProps) {
  const [currentEntryId, setCurrentEntryId] = useState(entryId)
  const activeTabId = useWorkspaceStore((s) => s.activeTabId)
  const { graph } = useDerivedState(activeTabId ?? '')

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-ctp-mantle border border-ctp-surface1 rounded-lg shadow-2xl flex flex-col overflow-hidden"
        style={{ width: '90vw', minWidth: '640px', height: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-ctp-surface1 shrink-0">
          <span className="text-xs font-medium text-ctp-subtext0 uppercase tracking-wider">
            Entry
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded text-ctp-overlay1 hover:text-ctp-text hover:bg-ctp-surface0 transition-colors"
            title="Close (Esc)"
          >
            <X size={14} />
          </button>
        </div>

        {/* Quadrant editor */}
        <div className="flex-1 overflow-hidden">
          <EntryEditor
            entryId={currentEntryId}
            layout="quadrant"
            onNavigate={setCurrentEntryId}
            renderBottomLeft={() => (
              <ActivationLinks
                entryId={currentEntryId}
                graph={graph}
                onNavigate={setCurrentEntryId}
              />
            )}
            renderBottomRight={() => (
              <ModalFindingsPane
                tabId={activeTabId}
                entryId={currentEntryId}
              />
            )}
          />
        </div>
      </div>
    </div>
  )
}
