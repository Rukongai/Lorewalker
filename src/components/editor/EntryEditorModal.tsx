import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { useDerivedState, EMPTY_STORE } from '@/hooks/useDerivedState'
import { documentStoreRegistry } from '@/stores/document-store-registry'
import { EntryEditor } from './EntryEditor'
import { ActivationLinks } from './ActivationLinks'
import { ModalFindingsPane } from '@/components/analysis/ModalFindingsPane'

interface EntryEditorModalProps {
  entryId: string
  onClose: () => void
}

export function EntryEditorModal({ entryId, onClose }: EntryEditorModalProps) {
  const [currentEntryId, setCurrentEntryId] = useState(entryId)
  const [backStack, setBackStack] = useState<string[]>([])
  const [forwardStack, setForwardStack] = useState<string[]>([])
  const activeTabId = useWorkspaceStore((s) => s.activeTabId)
  const { graph } = useDerivedState(activeTabId ?? '')

  const realStore = activeTabId ? documentStoreRegistry.get(activeTabId) : undefined
  const activeStore = realStore ?? EMPTY_STORE
  const entries = activeStore((s) => s.entries)
  const entryMap = new Map(entries.map((e) => [e.id, e.name]))

  const navigate = useCallback((id: string) => {
    setBackStack(prev => [...prev, currentEntryId])
    setCurrentEntryId(id)
    setForwardStack([])
  }, [currentEntryId])

  const goBack = useCallback(() => {
    if (backStack.length === 0) return
    const prev = backStack[backStack.length - 1]
    setBackStack(s => s.slice(0, -1))
    setForwardStack(s => [currentEntryId, ...s])
    setCurrentEntryId(prev)
  }, [backStack, currentEntryId])

  const goForward = useCallback(() => {
    if (forwardStack.length === 0) return
    const next = forwardStack[0]
    setBackStack(s => [...s, currentEntryId])
    setForwardStack(s => s.slice(1))
    setCurrentEntryId(next)
  }, [forwardStack, currentEntryId])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true })
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
          <div className="flex items-center gap-1">
            <Tooltip text={backStack.length > 0 ? `Back: ${entryMap.get(backStack[backStack.length - 1]) ?? '...'}` : 'No history'}>
              <button
                onClick={goBack}
                disabled={backStack.length === 0}
                className="p-1 rounded text-ctp-overlay1 hover:text-ctp-text hover:bg-ctp-surface0 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
            </Tooltip>
            <Tooltip text={forwardStack.length > 0 ? `Forward: ${entryMap.get(forwardStack[0]) ?? '...'}` : 'No forward history'}>
              <button
                onClick={goForward}
                disabled={forwardStack.length === 0}
                className="p-1 rounded text-ctp-overlay1 hover:text-ctp-text hover:bg-ctp-surface0 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </Tooltip>
            <span className="text-xs font-medium text-ctp-subtext0 uppercase tracking-wider">Entry</span>
          </div>
          <Tooltip text="Close (Esc)">
            <button
              onClick={onClose}
              className="p-1 rounded text-ctp-overlay1 hover:text-ctp-text hover:bg-ctp-surface0 transition-colors"
            >
              <X size={14} />
            </button>
          </Tooltip>
        </div>

        {/* Quadrant editor */}
        <div className="flex-1 overflow-hidden">
          <EntryEditor
            entryId={currentEntryId}
            layout="quadrant"
            onNavigate={navigate}
            renderBottomLeft={() => (
              <ActivationLinks
                entryId={currentEntryId}
                graph={graph}
                onNavigate={navigate}
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
