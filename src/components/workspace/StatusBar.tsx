import { useMemo } from 'react'
import { documentStoreRegistry } from '@/stores/document-store-registry'
import { EMPTY_STORE } from '@/hooks/useDerivedState'

interface StatusBarProps {
  activeTabId: string | null
  fileName?: string
}

export function StatusBar({ activeTabId, fileName }: StatusBarProps) {
  const realStore = activeTabId ? documentStoreRegistry.get(activeTabId) : undefined
  const store = realStore ?? EMPTY_STORE

  const entries = store((s) => s.entries)
  const healthScore = store((s) => s.healthScore)

  const { totalTokens, constantTokens } = useMemo(() => {
    let total = 0
    let constant = 0
    for (const e of entries) {
      total += e.tokenCount
      if (e.constant) constant += e.tokenCount
    }
    return { totalTokens: total, constantTokens: constant }
  }, [entries])

  const healthColor =
    healthScore.overall >= 80
      ? 'text-ctp-green'
      : healthScore.overall >= 50
      ? 'text-ctp-yellow'
      : 'text-ctp-red'

  return (
    <div className="h-6 flex items-center gap-3 px-3 bg-ctp-mantle border-t border-ctp-surface0 shrink-0 text-[10px] text-ctp-overlay1 select-none">
      {activeTabId ? (
        <>
          <span>
            Health:{' '}
            <span className={healthColor}>{healthScore.overall}/100</span>
          </span>
          <span className="text-ctp-surface1">|</span>
          <span>
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </span>
          <span className="text-ctp-surface1">|</span>
          <span>{totalTokens.toLocaleString()} tokens total</span>
          <span className="text-ctp-surface1">|</span>
          <span>{constantTokens.toLocaleString()}t constant overhead</span>
          {fileName && (
            <>
              <span className="text-ctp-surface1">|</span>
              <span className="text-ctp-subtext0 truncate">{fileName}</span>
            </>
          )}
        </>
      ) : (
        <span>No file open</span>
      )}
    </div>
  )
}
