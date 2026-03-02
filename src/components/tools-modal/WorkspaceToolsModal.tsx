import { useEffect } from 'react'
import { X } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import { useDerivedState } from '@/hooks/useDerivedState'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { AnalysisTabContent } from './AnalysisTabContent'
import { SimulatorTabContent } from './SimulatorTabContent'
import { RulesTabContent } from './RulesTabContent'

export type ToolsTab = 'analysis' | 'simulator' | 'rules'

const TAB_LABELS: Record<ToolsTab, string> = {
  analysis: 'Analysis',
  simulator: 'Simulator',
  rules: 'Rules',
}

interface WorkspaceToolsModalProps {
  tab: ToolsTab
  onTabChange: (tab: ToolsTab) => void
  onClose: () => void
  onOpenEntry: (entryId: string) => void
  onSelectEntry: (entryId: string) => void
}

export function WorkspaceToolsModal({
  tab,
  onTabChange,
  onClose,
  onOpenEntry,
  onSelectEntry,
}: WorkspaceToolsModalProps) {
  const activeTabId = useWorkspaceStore((s) => s.activeTabId)
  const { graph } = useDerivedState(activeTabId ?? '')

  // Close on Escape (EntryEditorModal uses capture+stopImmediatePropagation, so it fires first)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-ctp-mantle border border-ctp-surface1 rounded-lg shadow-2xl flex flex-col overflow-hidden"
        style={{ width: '95vw', height: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-ctp-surface1 shrink-0">
          {/* Tab bar */}
          <div className="flex items-center gap-1">
            {(['analysis', 'simulator', 'rules'] as ToolsTab[]).map((t) => (
              <button
                key={t}
                onClick={() => onTabChange(t)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  tab === t
                    ? 'bg-ctp-accent text-ctp-base'
                    : 'text-ctp-subtext1 hover:text-ctp-text hover:bg-ctp-surface0'
                }`}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>

          {/* Close button */}
          <Tooltip text="Close (Esc)">
            <button
              onClick={onClose}
              className="p-1.5 rounded text-ctp-overlay1 hover:text-ctp-text hover:bg-ctp-surface0 transition-colors"
            >
              <X size={16} />
            </button>
          </Tooltip>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {tab === 'analysis' && (
            <AnalysisTabContent
              tabId={activeTabId}
              graph={graph}
              onOpenEntry={onOpenEntry}
              onSelectEntry={onSelectEntry}
            />
          )}
          {tab === 'simulator' && (
            <SimulatorTabContent
              tabId={activeTabId}
              onOpenEntry={onOpenEntry}
              onSelectEntry={onSelectEntry}
            />
          )}
          {tab === 'rules' && (
            <RulesTabContent tabId={activeTabId} />
          )}
        </div>
      </div>
    </div>
  )
}
