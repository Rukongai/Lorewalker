import { useState, useMemo } from 'react'
import { Plus, Edit2, Trash2, Copy } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import { INCOMPATIBLE_RULE_IDS } from '@/services/analysis/copy-compatibility'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { documentStoreRegistry } from '@/stores/document-store-registry'
import { EMPTY_STORE } from '@/hooks/useDerivedState'
import { defaultRubric } from '@/services/analysis/default-rubric'
import { generateId } from '@/lib/uuid'
import type { CustomRule, Rule, FindingSeverity, RuleCategory } from '@/types'
import { RuleEditor } from './RuleEditor'

type RuleFilter = 'all' | 'default' | 'custom'

const SEVERITY_COLORS: Record<FindingSeverity, string> = {
  error: 'text-ctp-red bg-ctp-red/10 border-ctp-red/30',
  warning: 'text-ctp-yellow bg-ctp-yellow/10 border-ctp-yellow/30',
  suggestion: 'text-ctp-sapphire bg-ctp-sapphire/10 border-ctp-sapphire/30',
}

const CATEGORY_ORDER: RuleCategory[] = ['structure', 'config', 'keywords', 'recursion', 'budget', 'content']
const SEVERITY_ORDER: FindingSeverity[] = ['error', 'warning', 'suggestion']

interface DefaultRuleRow {
  kind: 'default'
  rule: Rule
}

interface CustomRuleRow {
  kind: 'custom'
  rule: CustomRule
  scope: 'workspace' | 'document'
}

type RuleRow = DefaultRuleRow | CustomRuleRow

export interface RulesViewProps {
  tabId: string | null
  onOpenEntry?: (entryId: string) => void
}

export function RulesView({ tabId }: RulesViewProps) {
  const [filter, setFilter] = useState<RuleFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<CustomRule | null>(null)
  const [copySourceId, setCopySourceId] = useState<string | null>(null)

  const wsCustomRules = useWorkspaceStore((s) => s.customRules)
  const disabledBuiltinRuleIds = useWorkspaceStore((s) => s.disabledBuiltinRuleIds)
  const toggleBuiltinRule = useWorkspaceStore((s) => s.toggleBuiltinRule)
  const deleteCustomRule = useWorkspaceStore((s) => s.deleteCustomRule)
  const updateCustomRule = useWorkspaceStore((s) => s.updateCustomRule)
  const addCustomRule = useWorkspaceStore((s) => s.addCustomRule)

  const realStore = tabId ? documentStoreRegistry.get(tabId) : undefined
  const activeStore = realStore ?? EMPTY_STORE
  const ruleOverrides = activeStore((s) => s.ruleOverrides)
  const setDocumentRuleOverride = activeStore((s) => s.setDocumentRuleOverride)
  const removeDocumentRule = activeStore((s) => s.removeDocumentRule)
  const updateDocumentRule = activeStore((s) => s.updateDocumentRule)
  const addDocumentRule = activeStore((s) => s.addDocumentRule)

  // Build unified list — memoized to avoid rebuilding on unrelated re-renders
  const allRows = useMemo((): RuleRow[] => {
    const rows: RuleRow[] = []
    if (filter === 'all' || filter === 'default') {
      for (const rule of defaultRubric.rules) {
        rows.push({ kind: 'default', rule })
      }
    }
    if (filter === 'all' || filter === 'custom') {
      for (const rule of wsCustomRules) {
        rows.push({ kind: 'custom', rule, scope: 'workspace' })
      }
      for (const rule of ruleOverrides.customRules) {
        rows.push({ kind: 'custom', rule, scope: 'document' })
      }
    }
    return rows
  }, [filter, wsCustomRules, ruleOverrides.customRules])

  // Find selected row
  const selectedRow = allRows.find((r) => {
    if (r.kind === 'default') return `default:${r.rule.id}` === selectedId
    return `custom:${r.rule.id}` === selectedId
  })

  function isRuleEnabled(row: RuleRow): boolean {
    if (row.kind === 'default') {
      return !disabledBuiltinRuleIds.includes(row.rule.id) &&
        !ruleOverrides.disabledRuleIds.includes(row.rule.id)
    }
    return row.rule.enabled
  }

  function handleToggle(row: RuleRow, enabled: boolean) {
    if (row.kind === 'default') {
      toggleBuiltinRule(row.rule.id, enabled)
    } else if (row.kind === 'custom') {
      if (row.scope === 'workspace') {
        updateCustomRule(row.rule.id, { enabled })
      } else {
        updateDocumentRule(row.rule.id, { enabled })
      }
    }
  }

  function handleDeleteCustom(row: CustomRuleRow) {
    if (!window.confirm(`Delete rule "${row.rule.name}"?`)) return
    if (row.scope === 'workspace') {
      deleteCustomRule(row.rule.id)
    } else {
      removeDocumentRule(row.rule.id)
    }
    if (selectedId === `custom:${row.rule.id}`) setSelectedId(null)
  }

  function handleNewRule() {
    setCopySourceId(null)
    setEditingRule(null)
    setEditorOpen(true)
  }

  function handleEditRule(rule: CustomRule) {
    setEditingRule(rule)
    setEditorOpen(true)
  }

  function handleCopyRule(rule: Rule) {
    setCopySourceId(rule.id)
    setEditingRule(null)
    setEditorOpen(true)
  }

  function handleEditorClose() {
    setCopySourceId(null)
    setEditorOpen(false)
  }

  function handleSaveRule(rule: CustomRule, scope: 'workspace' | 'document') {
    if (editingRule) {
      if (scope === 'workspace') {
        updateCustomRule(rule.id, rule)
      } else {
        updateDocumentRule(rule.id, rule)
      }
    } else {
      const now = new Date().toISOString()
      const newId = generateId()
      if (scope === 'workspace') {
        addCustomRule({ ...rule, id: newId, createdAt: now, updatedAt: now })
        if (copySourceId) toggleBuiltinRule(copySourceId, false)
      } else {
        addDocumentRule({ ...rule, id: newId, createdAt: now, updatedAt: now })
        if (copySourceId) setDocumentRuleOverride(copySourceId, true)
      }
    }
    setCopySourceId(null)
    setEditorOpen(false)
  }

  const getCategoryLabel = (cat: RuleCategory): string => {
    const labels: Record<RuleCategory, string> = {
      structure: 'Structure',
      config: 'Config',
      keywords: 'Keywords',
      content: 'Content',
      recursion: 'Recursion',
      budget: 'Budget',
    }
    return labels[cat]
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left pane: rule list */}
      <div className="w-72 shrink-0 flex flex-col border-r border-ctp-surface1">
        {/* Filter + New Rule */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-ctp-surface1 shrink-0">
          <div className="flex gap-1 flex-1">
            {(['all', 'default', 'custom'] as RuleFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                  filter === f
                    ? 'bg-ctp-accent text-ctp-base'
                    : 'text-ctp-subtext1 hover:text-ctp-text hover:bg-ctp-surface0'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <Tooltip text="New custom rule">
            <button
              onClick={handleNewRule}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-ctp-accent/10 text-ctp-accent hover:bg-ctp-accent/20 transition-colors"
            >
              <Plus size={11} />
              New
            </button>
          </Tooltip>
        </div>

        {/* Rule list */}
        <div className="flex-1 overflow-y-auto">
          {allRows.length === 0 && (
            <p className="px-4 py-4 text-xs text-ctp-overlay0">No rules</p>
          )}
          {CATEGORY_ORDER.map((cat) => {
            const rows = SEVERITY_ORDER.flatMap((sev) =>
              allRows.filter((r) => r.rule.category === cat && r.rule.severity === sev)
            )
            if (rows.length === 0) return null
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 px-3 py-1.5 sticky top-0 bg-ctp-mantle border-b border-t border-ctp-surface0 z-10">
                  <span className="text-[11px] font-semibold text-ctp-subtext0 uppercase tracking-wide">
                    {getCategoryLabel(cat)}
                  </span>
                  <span className="text-[10px] text-ctp-overlay0 bg-ctp-surface0 rounded px-1">
                    {rows.length}
                  </span>
                </div>
                {rows.map((row) => {
                  const rowId = row.kind === 'default' ? `default:${row.rule.id}` : `custom:${row.rule.id}`
                  const enabled = isRuleEnabled(row)
                  const name = row.rule.name
                  const severity = row.rule.severity
                  const isSelected = selectedId === rowId

                  return (
                    <button
                      key={rowId}
                      onClick={() => setSelectedId(isSelected ? null : rowId)}
                      className={`w-full flex items-start gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-ctp-surface0 ${
                        isSelected ? 'bg-ctp-surface0/70' : ''
                      } ${!enabled ? 'opacity-50' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => {
                          e.stopPropagation()
                          handleToggle(row, e.target.checked)
                        }}
                        className="mt-0.5 shrink-0 accent-ctp-accent"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-ctp-text font-medium truncate">{name}</span>
                          {row.kind === 'custom' && (
                            <span className="text-[10px] text-ctp-mauve border border-ctp-mauve/30 px-1 rounded">
                              {row.scope === 'document' ? 'doc' : 'ws'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className={`text-[10px] border px-1 rounded font-medium ${SEVERITY_COLORS[severity]}`}>
                            {severity}
                          </span>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Right pane: rule detail */}
      <div className="flex-1 overflow-y-auto p-4">
        {!selectedRow ? (
          <div className="flex flex-col items-center justify-center h-full text-ctp-overlay0 text-sm gap-2">
            <p>Select a rule to view details</p>
            <p className="text-xs">or click <span className="text-ctp-accent font-medium">+ New</span> to create one</p>
          </div>
        ) : (
          <div className="max-w-xl">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h2 className="text-sm font-semibold text-ctp-text">{selectedRow.rule.name}</h2>
                <p className="text-xs text-ctp-subtext0 mt-0.5">{selectedRow.rule.description}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                {selectedRow.kind === 'custom' && (
                  <>
                    <Tooltip text="Edit rule">
                      <button
                        onClick={() => handleEditRule((selectedRow as CustomRuleRow).rule)}
                        className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-ctp-subtext1 hover:text-ctp-text hover:bg-ctp-surface0 transition-colors"
                      >
                        <Edit2 size={11} />
                        Edit
                      </button>
                    </Tooltip>
                    <Tooltip text="Delete rule">
                      <button
                        onClick={() => handleDeleteCustom(selectedRow as CustomRuleRow)}
                        className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-ctp-red/70 hover:text-ctp-red hover:bg-ctp-red/10 transition-colors"
                      >
                        <Trash2 size={11} />
                        Delete
                      </button>
                    </Tooltip>
                  </>
                )}
                {selectedRow.kind === 'default' && (() => {
                  const compatible = !INCOMPATIBLE_RULE_IDS.has(selectedRow.rule.id)
                  return (
                    <Tooltip text={compatible
                      ? 'Copy and customize this rule'
                      : 'Incompatible — this rule uses complex multi-entry or graph analysis that cannot be expressed in the Rule Editor'}>
                      <button
                        onClick={compatible ? () => handleCopyRule(selectedRow.rule) : undefined}
                        disabled={!compatible}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                          compatible
                            ? 'text-ctp-subtext1 hover:text-ctp-text hover:bg-ctp-surface0'
                            : 'text-ctp-overlay0 cursor-not-allowed opacity-50'
                        }`}
                      >
                        <Copy size={11} />
                        Copy
                      </button>
                    </Tooltip>
                  )
                })()}
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <dt className="text-ctp-overlay1">ID</dt>
              <dd className="text-ctp-text font-mono">
                {selectedRow.kind === 'default' ? selectedRow.rule.id : `custom/${selectedRow.rule.id}`}
              </dd>

              <dt className="text-ctp-overlay1">Category</dt>
              <dd className="text-ctp-text">{getCategoryLabel(selectedRow.rule.category)}</dd>

              <dt className="text-ctp-overlay1">Severity</dt>
              <dd>
                <span className={`text-[10px] border px-1 rounded font-medium ${SEVERITY_COLORS[selectedRow.rule.severity]}`}>
                  {selectedRow.rule.severity}
                </span>
              </dd>

              <dt className="text-ctp-overlay1">Type</dt>
              <dd className="text-ctp-text">{selectedRow.rule.requiresLLM ? 'LLM-powered' : 'Deterministic'}</dd>

              {selectedRow.kind === 'custom' && (
                <>
                  <dt className="text-ctp-overlay1">Scope</dt>
                  <dd className="text-ctp-text capitalize">{(selectedRow as CustomRuleRow).scope}</dd>

                  <dt className="text-ctp-overlay1">Message</dt>
                  <dd className="text-ctp-text col-span-2 font-mono text-[11px] bg-ctp-surface0 rounded p-2 mt-1">
                    {selectedRow.rule.message}
                  </dd>
                </>
              )}

              {selectedRow.kind === 'default' && (
                <>
                  <dt className="text-ctp-overlay1">Disable for doc</dt>
                  <dd>
                    <button
                      className="text-[11px] text-ctp-subtext1 hover:text-ctp-text underline"
                      onClick={() => {
                        if (!realStore) return
                        const isDocDisabled = ruleOverrides.disabledRuleIds.includes(selectedRow.rule.id)
                        setDocumentRuleOverride(selectedRow.rule.id, !isDocDisabled)
                      }}
                      disabled={!realStore}
                      title={!realStore ? 'No document open' : undefined}
                    >
                      {ruleOverrides.disabledRuleIds.includes(selectedRow.rule.id)
                        ? 'Re-enable for this doc'
                        : 'Disable for this doc only'}
                    </button>
                  </dd>
                </>
              )}
            </dl>
          </div>
        )}
      </div>

      {/* Rule editor modal */}
      {editorOpen && (
        <RuleEditor
          initialRule={editingRule}
          copySource={copySourceId ? defaultRubric.rules.find((r) => r.id === copySourceId) : undefined}
          tabId={tabId}
          onSave={handleSaveRule}
          onClose={handleEditorClose}
        />
      )}
    </div>
  )
}
