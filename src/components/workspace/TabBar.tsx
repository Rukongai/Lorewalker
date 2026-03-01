import { X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { documentStoreRegistry } from '@/stores/document-store-registry'

export function TabBar() {
  const tabs = useWorkspaceStore((s) => s.tabs)
  const activeTabId = useWorkspaceStore((s) => s.activeTabId)
  const switchTab = useWorkspaceStore((s) => s.switchTab)
  const closeTab = useWorkspaceStore((s) => s.closeTab)

  function handleClose(e: React.MouseEvent, tabId: string) {
    e.stopPropagation()
    documentStoreRegistry.delete(tabId)
    closeTab(tabId)
  }

  if (tabs.length === 0) {
    return (
      <div className="flex items-center px-2 bg-ctp-mantle border-b border-ctp-surface0 h-9">
        <span className="text-xs text-ctp-overlay0 px-2">No file open</span>
      </div>
    )
  }

  return (
    <div className="flex items-center bg-ctp-mantle border-b border-ctp-surface0 h-9 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => switchTab(tab.id)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1 text-sm border-r border-ctp-surface0 h-full whitespace-nowrap shrink-0 transition-colors',
            activeTabId === tab.id
              ? 'bg-ctp-base text-ctp-text'
              : 'bg-ctp-mantle text-ctp-overlay1 hover:bg-ctp-surface0 hover:text-ctp-subtext1'
          )}
        >
          {/* Dirty indicator */}
          {tab.dirty && (
            <span className="w-1.5 h-1.5 rounded-full bg-ctp-yellow shrink-0" />
          )}
          <span className="max-w-[160px] truncate">{tab.name}</span>
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => handleClose(e, tab.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') handleClose(e as unknown as React.MouseEvent, tab.id)
            }}
            className="ml-1 p-0.5 rounded hover:bg-ctp-surface1 text-ctp-overlay1 hover:text-ctp-subtext0 transition-colors"
            aria-label={`Close ${tab.name}`}
          >
            <X size={12} />
          </span>
        </button>
      ))}
    </div>
  )
}
