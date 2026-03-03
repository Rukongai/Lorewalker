import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import type { CustomRule, Rule, RuleCategory, FindingSeverity } from '@/types'
import { ConditionBuilder } from './ConditionBuilder'
import { RuleTestingPane } from './RuleTestingPane'
import { TemplateField } from './TemplateField'
import { VariablePicker } from './VariablePicker'
import type { SerializedEvaluation } from '@/types'
import { RULE_SEEDS } from '@/services/analysis/copy-seeds'

const CATEGORIES: RuleCategory[] = ['structure', 'config', 'keywords', 'content', 'recursion', 'budget']
const SEVERITIES: FindingSeverity[] = ['error', 'warning', 'suggestion']
const SCOPES = [
  { value: 'workspace', label: 'Workspace (all documents)' },
  { value: 'document', label: 'This document only' },
] as const

type RuleScope = 'workspace' | 'document'
type EditorTab = 'metadata' | 'conditions' | 'test'

const EMPTY_EVALUATION: SerializedEvaluation = { logic: 'AND', items: [] }

export interface RuleEditorProps {
  initialRule: CustomRule | null
  copySource?: Rule
  tabId: string | null
  onSave: (rule: CustomRule, scope: RuleScope) => void
  onClose: () => void
}

export function RuleEditor({ initialRule, copySource, tabId, onSave, onClose }: RuleEditorProps) {
  const isEditing = initialRule !== null

  const [activeTab, setActiveTab] = useState<EditorTab>('metadata')
  const [scope, setScope] = useState<RuleScope>('workspace')
  const [name, setName] = useState(initialRule?.name ?? copySource?.name ?? '')
  const [description, setDescription] = useState(initialRule?.description ?? copySource?.description ?? '')
  const [category, setCategory] = useState<RuleCategory>(initialRule?.category ?? copySource?.category ?? 'keywords')
  const [severity, setSeverity] = useState<FindingSeverity>(initialRule?.severity ?? copySource?.severity ?? 'warning')
  const [requiresLLM, setRequiresLLM] = useState(initialRule?.requiresLLM ?? copySource?.requiresLLM ?? false)
  const [enabled, setEnabled] = useState(initialRule?.enabled ?? true)
  const [evaluation, setEvaluation] = useState<SerializedEvaluation>(
    initialRule?.evaluation ??
    (copySource ? (RULE_SEEDS[copySource.id]?.evaluation ?? EMPTY_EVALUATION) : EMPTY_EVALUATION)
  )
  const [message, setMessage] = useState(
    initialRule?.message ??
    (copySource ? (RULE_SEEDS[copySource.id]?.message ?? '') : '')
  )
  const [systemPrompt, setSystemPrompt] = useState(initialRule?.systemPrompt ?? '')
  const [userPrompt, setUserPrompt] = useState(initialRule?.userPrompt ?? '')
  const [errors, setErrors] = useState<string[]>([])

  // Cursor tracking for each template field
  const messageCursorRef = useRef(0)
  const systemCursorRef = useRef(0)
  const userCursorRef = useRef(0)
  const messageFieldRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
  const systemFieldRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
  const userFieldRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)

  function insertVariable(path: string, target: 'message' | 'user' | 'system') {
    const text = `{{${path}}}`

    if (target === 'message') {
      const cursor = messageCursorRef.current
      const before = message.slice(0, cursor)
      const after = message.slice(cursor)
      setMessage(before + text + after)
      const newCursor = cursor + text.length
      requestAnimationFrame(() => {
        const el = messageFieldRef.current
        if (el) { el.focus(); el.setSelectionRange(newCursor, newCursor) }
        messageCursorRef.current = newCursor
      })
    } else if (target === 'system') {
      const cursor = systemCursorRef.current
      const before = systemPrompt.slice(0, cursor)
      const after = systemPrompt.slice(cursor)
      setSystemPrompt(before + text + after)
      const newCursor = cursor + text.length
      requestAnimationFrame(() => {
        const el = systemFieldRef.current
        if (el) { el.focus(); el.setSelectionRange(newCursor, newCursor) }
        systemCursorRef.current = newCursor
      })
    } else {
      const cursor = userCursorRef.current
      const before = userPrompt.slice(0, cursor)
      const after = userPrompt.slice(cursor)
      setUserPrompt(before + text + after)
      const newCursor = cursor + text.length
      requestAnimationFrame(() => {
        const el = userFieldRef.current
        if (el) { el.focus(); el.setSelectionRange(newCursor, newCursor) }
        userCursorRef.current = newCursor
      })
    }
  }

  function handleCopy(path: string) {
    void navigator.clipboard.writeText(`{{${path}}}`)
  }

  // Escape key — capture phase so it fires before WorkspaceToolsModal's handler
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

  function validate(): string[] {
    const errs: string[] = []
    if (!name.trim()) errs.push('Name is required.')
    if (!requiresLLM && evaluation.items.length === 0) {
      errs.push('At least one condition is required for deterministic rules.')
    }
    if (!message.trim()) errs.push('Message template is required.')
    return errs
  }

  function handleSave() {
    const errs = validate()
    if (errs.length > 0) {
      setErrors(errs)
      return
    }
    setErrors([])

    const now = new Date().toISOString()
    const rule: CustomRule = {
      id: initialRule?.id ?? '',
      name: name.trim(),
      description: description.trim(),
      category,
      severity,
      enabled,
      requiresLLM,
      evaluation: requiresLLM ? undefined : evaluation,
      message: message.trim(),
      systemPrompt: requiresLLM ? systemPrompt.trim() || undefined : undefined,
      userPrompt: requiresLLM ? userPrompt.trim() || undefined : undefined,
      createdAt: initialRule?.createdAt ?? now,
      updatedAt: now,
    }

    onSave(rule, scope)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="bg-ctp-mantle border border-ctp-surface1 rounded-lg shadow-2xl flex flex-col overflow-hidden"
        style={{ width: '700px', maxWidth: '95vw', height: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-ctp-surface1 shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-ctp-text">
              {isEditing ? 'Edit Rule' : 'New Custom Rule'}
            </h2>
            {/* Tab bar */}
            <div className="flex gap-1 ml-2">
              {([
                { id: 'metadata', label: 'Metadata' },
                { id: 'conditions', label: requiresLLM ? 'Prompts' : 'Conditions' },
                { id: 'test', label: 'Test' },
              ] as Array<{ id: EditorTab; label: string }>).map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    activeTab === id
                      ? 'bg-ctp-accent text-ctp-base'
                      : 'text-ctp-subtext1 hover:text-ctp-text hover:bg-ctp-surface0'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <Tooltip text="Close (Esc)">
            <button
              onClick={onClose}
              className="p-1.5 rounded text-ctp-overlay1 hover:text-ctp-text hover:bg-ctp-surface0 transition-colors"
            >
              <X size={14} />
            </button>
          </Tooltip>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Validation errors */}
          {errors.length > 0 && (
            <div className="mb-3 p-2 rounded bg-ctp-red/10 border border-ctp-red/30 text-xs text-ctp-red space-y-0.5">
              {errors.map((e, i) => <p key={i}>{e}</p>)}
            </div>
          )}

          {activeTab === 'metadata' && (
            <div className="space-y-4 max-w-lg">
              <div>
                <label className="block text-xs font-medium text-ctp-subtext1 mb-1">
                  Name <span className="text-ctp-red">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Missing primary keys"
                  className="w-full px-2.5 py-1.5 rounded text-sm text-ctp-text bg-ctp-surface0 border border-ctp-surface2 focus:outline-none focus:border-ctp-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ctp-subtext1 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does this rule check and why?"
                  rows={2}
                  className="w-full px-2.5 py-1.5 rounded text-sm text-ctp-text bg-ctp-surface0 border border-ctp-surface2 focus:outline-none focus:border-ctp-accent resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ctp-subtext1 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as RuleCategory)}
                    className="w-full px-2.5 py-1.5 rounded text-sm text-ctp-text bg-ctp-surface0 border border-ctp-surface2 focus:outline-none focus:border-ctp-accent"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-ctp-subtext1 mb-1">Severity</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as FindingSeverity)}
                    className="w-full px-2.5 py-1.5 rounded text-sm text-ctp-text bg-ctp-surface0 border border-ctp-surface2 focus:outline-none focus:border-ctp-accent"
                  >
                    {SEVERITIES.map((s) => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-ctp-subtext1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="accent-ctp-accent"
                  />
                  Enabled
                </label>
                <label className="flex items-center gap-2 text-xs text-ctp-subtext1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requiresLLM}
                    onChange={(e) => setRequiresLLM(e.target.checked)}
                    className="accent-ctp-accent"
                  />
                  LLM-powered rule
                </label>
              </div>

              {!isEditing && (
                <div>
                  <label className="block text-xs font-medium text-ctp-subtext1 mb-1">Save to</label>
                  <select
                    value={scope}
                    onChange={(e) => setScope(e.target.value as RuleScope)}
                    className="w-full px-2.5 py-1.5 rounded text-sm text-ctp-text bg-ctp-surface0 border border-ctp-surface2 focus:outline-none focus:border-ctp-accent"
                  >
                    {SCOPES.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  {scope === 'document' && !tabId && (
                    <p className="mt-1 text-xs text-ctp-yellow">No document is currently open.</p>
                  )}
                  {copySource && (
                    <p className="mt-2 text-xs text-ctp-peach bg-ctp-peach/10 border border-ctp-peach/30 rounded px-2 py-1.5">
                      Saving will also disable <strong>{copySource.name}</strong> at the selected scope.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'conditions' && !requiresLLM && (
            <div className="space-y-4 max-w-2xl">
              <div>
                <h3 className="text-xs font-semibold text-ctp-subtext1 uppercase tracking-wide mb-2">
                  Conditions
                </h3>
                <p className="text-xs text-ctp-overlay1 mb-3">
                  Entry matches if the condition tree is true. A finding is generated for each matching entry.
                </p>
                {copySource && !RULE_SEEDS[copySource.id]?.evaluation && evaluation.items.length === 0 && (
                  <p className="text-xs text-ctp-overlay1 bg-ctp-surface0 border border-ctp-surface1 rounded px-2 py-1.5 mb-3">
                    This rule's logic can't be auto-translated. Build conditions manually that replicate what{' '}
                    <strong className="text-ctp-subtext1">{copySource.name}</strong> checks.
                  </p>
                )}
                <ConditionBuilder value={evaluation} onChange={setEvaluation} />
              </div>

              <div>
                <label className="block text-xs font-medium text-ctp-subtext1 mb-1">
                  Message template <span className="text-ctp-red">*</span>
                </label>
                <p className="text-[11px] text-ctp-overlay0 mb-1">
                  Type {'{{'}  to autocomplete variable references.
                </p>
                <TemplateField
                  value={message}
                  onChange={setMessage}
                  placeholder="e.g. Entry '{{entry.name}}' has only {{entry.keys.length}} key(s)"
                  fieldRef={messageFieldRef}
                  onCursorChange={(pos) => { messageCursorRef.current = pos }}
                />
              </div>

              <VariablePicker
                mode="deterministic"
                onInsert={insertVariable}
                onCopy={handleCopy}
              />
            </div>
          )}

          {activeTab === 'conditions' && requiresLLM && (
            <div className="space-y-4 max-w-2xl">
              <div>
                <label className="block text-xs font-medium text-ctp-subtext1 mb-1">System Prompt</label>
                <TemplateField
                  value={systemPrompt}
                  onChange={setSystemPrompt}
                  multiline
                  rows={6}
                  placeholder="Instructions for the LLM evaluator..."
                  fieldRef={systemFieldRef}
                  onCursorChange={(pos) => { systemCursorRef.current = pos }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ctp-subtext1 mb-1">User Prompt</label>
                <TemplateField
                  value={userPrompt}
                  onChange={setUserPrompt}
                  multiline
                  rows={4}
                  placeholder="Per-entry prompt template..."
                  fieldRef={userFieldRef}
                  onCursorChange={(pos) => { userCursorRef.current = pos }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ctp-subtext1 mb-1">
                  Message template <span className="text-ctp-red">*</span>
                </label>
                <TemplateField
                  value={message}
                  onChange={setMessage}
                  placeholder="Finding message when rule triggers"
                  fieldRef={messageFieldRef}
                  onCursorChange={(pos) => { messageCursorRef.current = pos }}
                />
              </div>

              <VariablePicker
                mode="llm"
                onInsert={insertVariable}
                onCopy={handleCopy}
              />
            </div>
          )}

          {activeTab === 'test' && (
            <RuleTestingPane
              tabId={tabId}
              evaluation={requiresLLM ? undefined : evaluation}
              messageTemplate={message}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-2.5 border-t border-ctp-surface1 shrink-0">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded text-xs font-medium text-ctp-subtext1 hover:text-ctp-text hover:bg-ctp-surface0 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded text-xs font-medium bg-ctp-accent text-ctp-base hover:bg-ctp-accent/90 transition-colors"
          >
            {isEditing ? 'Save Changes' : 'Create Rule'}
          </button>
        </div>
      </div>
    </div>
  )
}
