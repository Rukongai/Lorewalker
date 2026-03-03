import { useState } from 'react'
import { Play } from 'lucide-react'
import { documentStoreRegistry } from '@/stores/document-store-registry'
import { EMPTY_STORE } from '@/hooks/useDerivedState'
import { evaluateCondition, interpolateMessage } from '@/services/analysis/evaluation-engine'
import type { EvaluationContext } from '@/services/analysis/evaluation-engine'
import type { SerializedEvaluation, WorkingEntry } from '@/types'

interface TestResult {
  entry: WorkingEntry
  pass: boolean
  message: string
}

interface RuleTestingPaneProps {
  tabId: string | null
  evaluation: SerializedEvaluation | undefined
  messageTemplate: string
}

export function RuleTestingPane({ tabId, evaluation, messageTemplate }: RuleTestingPaneProps) {
  const [results, setResults] = useState<TestResult[] | null>(null)
  const [selectedEntryId, setSelectedEntryId] = useState<string>('__all__')

  const realStore = tabId ? documentStoreRegistry.get(tabId) : undefined
  const activeStore = realStore ?? EMPTY_STORE
  const entries = activeStore((s) => s.entries)
  const bookMeta = activeStore((s) => s.bookMeta)

  function handleRunTest() {
    if (!evaluation || evaluation.items.length === 0) {
      setResults([])
      return
    }

    const entriesToTest =
      selectedEntryId === '__all__' ? entries : entries.filter((e) => e.id === selectedEntryId)

    const testResults: TestResult[] = entriesToTest.map((entry) => {
      const ctx: EvaluationContext = { entry, book: bookMeta }
      const pass = evaluateCondition(evaluation, ctx)
      const message = pass ? interpolateMessage(messageTemplate, ctx) : ''
      return { entry, pass, message }
    })

    setResults(testResults)
  }

  if (!tabId || !realStore) {
    return (
      <div className="flex items-center justify-center h-full text-ctp-overlay0 text-sm">
        Open a lorebook to test this rule
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <label className="text-xs text-ctp-subtext1 shrink-0">Test against</label>
        <select
          value={selectedEntryId}
          onChange={(e) => setSelectedEntryId(e.target.value)}
          className="flex-1 px-2 py-1 rounded text-xs text-ctp-text bg-ctp-surface1 border border-ctp-surface2 focus:outline-none focus:border-ctp-accent"
        >
          <option value="__all__">All entries ({entries.length})</option>
          {entries.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleRunTest}
          disabled={!evaluation || evaluation.items.length === 0}
          className="flex items-center gap-1 px-3 py-1 rounded text-xs font-medium bg-ctp-accent text-ctp-base hover:bg-ctp-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Play size={11} />
          Run Test
        </button>
      </div>

      {!evaluation || evaluation.items.length === 0 ? (
        <p className="text-xs text-ctp-overlay0">Add at least one condition to run a test.</p>
      ) : results === null ? (
        <p className="text-xs text-ctp-overlay0">Click Run Test to evaluate the rule.</p>
      ) : results.length === 0 ? (
        <p className="text-xs text-ctp-overlay0">No entries to test.</p>
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-ctp-surface1">
                <th className="text-left px-2 py-1.5 text-ctp-overlay1 font-medium">Entry</th>
                <th className="text-left px-2 py-1.5 text-ctp-overlay1 font-medium w-16">Result</th>
                <th className="text-left px-2 py-1.5 text-ctp-overlay1 font-medium">Message</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.entry.id} className="border-b border-ctp-surface0/50 hover:bg-ctp-surface0/30">
                  <td className="px-2 py-1.5 text-ctp-text font-medium truncate max-w-[160px]">
                    {r.entry.name}
                  </td>
                  <td className="px-2 py-1.5">
                    <span
                      className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        r.pass
                          ? 'bg-ctp-red/10 text-ctp-red border border-ctp-red/30'
                          : 'bg-ctp-green/10 text-ctp-green border border-ctp-green/30'
                      }`}
                    >
                      {r.pass ? 'FAIL' : 'PASS'}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-ctp-subtext0 max-w-xs truncate">
                    {r.pass ? r.message : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[11px] text-ctp-overlay0">
            {results.filter((r) => r.pass).length} of {results.length} entries match the condition (would generate a finding)
          </p>
        </div>
      )}
    </div>
  )
}
