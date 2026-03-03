import { useState } from 'react'
import { Tooltip } from '@/components/ui/Tooltip'
import { DeepAnalysisDialog } from '@/components/analysis/DeepAnalysisDialog'
import type { AnalysisContext, Finding } from '@/types'

interface DeepAnalysisTriggerProps {
  hasLlmProvider: boolean
  providerId?: string
  context: AnalysisContext
  onComplete: (findings: Finding[]) => void
}

export function DeepAnalysisTrigger({ hasLlmProvider, providerId, context, onComplete }: DeepAnalysisTriggerProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Tooltip text={hasLlmProvider ? 'Run AI-powered analysis' : 'Add a provider in Settings → Providers to enable'}>
        <button
          onClick={() => setOpen(true)}
          disabled={!hasLlmProvider}
          className="px-2 py-1 rounded text-[10px] bg-ctp-accent text-ctp-base font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          Deep Analysis
        </button>
      </Tooltip>

      {open && providerId && (
        <DeepAnalysisDialog
          providerId={providerId}
          context={context}
          onComplete={(findings) => { onComplete(findings); setOpen(false) }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
