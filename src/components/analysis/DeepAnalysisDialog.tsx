import { useState } from 'react'
import { llmService } from '@/services/llm/llm-service'
import { runLLMRules } from '@/services/analysis/analysis-service'
import { defaultRubric } from '@/services/analysis/default-rubric'
import type { AnalysisContext, Finding } from '@/types'

interface DeepAnalysisDialogProps {
  providerId: string
  context: AnalysisContext
  onComplete(findings: Finding[]): void
  onClose(): void
}

export function DeepAnalysisDialog({ providerId, context, onComplete, onClose }: DeepAnalysisDialogProps) {
  const [state, setState] = useState<'confirm' | 'loading' | 'error'>('confirm')
  const [error, setError] = useState<string | null>(null)

  const provider = llmService.getProvider(providerId)
  const entryCount = context.entries.filter((e) => e.content.trim().length > 0).length

  // Estimate tokens: rough sum of entry content + prompts overhead
  const contentText = context.entries.map((e) => e.content).join('\n')
  const estimatedTokens = llmService.estimateTokens(providerId, contentText)

  async function handleRun() {
    setState('loading')
    setError(null)
    try {
      const contextWithLLM: AnalysisContext = { ...context, llmService }
      const findings = await runLLMRules(contextWithLLM, defaultRubric)
      onComplete(findings)
      onClose()
    } catch (err) {
      setState('error')
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-ctp-mantle border border-ctp-surface1 rounded-lg shadow-xl p-5 flex flex-col gap-4"
        style={{ width: 'min(420px, 90vw)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-ctp-subtext1">Deep Analysis</span>
          <button
            onClick={onClose}
            className="text-ctp-overlay0 hover:text-ctp-subtext0 transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {state === 'confirm' && (
          <>
            <div className="space-y-2 text-xs text-ctp-subtext0">
              <div className="flex items-center justify-between border-b border-ctp-surface0 pb-2">
                <span className="text-ctp-overlay1">Provider</span>
                <span className="font-medium text-ctp-text">{provider?.name ?? providerId}</span>
              </div>
              <div className="flex items-center justify-between border-b border-ctp-surface0 pb-2">
                <span className="text-ctp-overlay1">Entries to analyze</span>
                <span className="font-medium text-ctp-text">{entryCount}</span>
              </div>
              <div className="flex items-center justify-between border-b border-ctp-surface0 pb-2">
                <span className="text-ctp-overlay1">Estimated tokens</span>
                <span className="font-medium text-ctp-text">~{estimatedTokens.toLocaleString()}</span>
              </div>
              <p className="text-ctp-overlay1 text-[11px] pt-1">
                Cost depends on your provider's pricing. Ollama and other local endpoints are free.
                The analysis runs 4 AI-powered rules sequentially.
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded text-xs text-ctp-overlay1 hover:text-ctp-subtext1 hover:bg-ctp-surface0 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRun}
                className="px-3 py-1.5 rounded text-xs bg-ctp-accent text-ctp-base font-medium hover:opacity-90 transition-opacity"
              >
                Run Deep Analysis
              </button>
            </div>
          </>
        )}

        {state === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-6 h-6 border-2 border-ctp-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-ctp-subtext0">Analyzing {entryCount} entries…</p>
            <p className="text-[10px] text-ctp-overlay1">This may take a moment depending on your provider.</p>
          </div>
        )}

        {state === 'error' && (
          <>
            <div className="text-xs text-ctp-red bg-ctp-red/10 rounded p-3">
              <p className="font-medium mb-1">Analysis failed</p>
              <p className="text-ctp-overlay1">{error}</p>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded text-xs text-ctp-overlay1 hover:text-ctp-subtext1 hover:bg-ctp-surface0 transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleRun}
                className="px-3 py-1.5 rounded text-xs bg-ctp-accent text-ctp-base font-medium hover:opacity-90 transition-opacity"
              >
                Retry
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
