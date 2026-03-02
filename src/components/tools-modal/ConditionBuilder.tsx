import { Plus, Trash2, ChevronDown } from 'lucide-react'
import type { ComparisonOp, LogicOp, ConditionLeaf, ConditionGroup, SerializedEvaluation } from '@/types'
import { useState } from 'react'

// --- Variable registry ---

interface VarDef {
  path: string
  label: string
  type: 'string' | 'number' | 'boolean'
  group: 'Entry' | 'Book'
}

export const VARIABLE_DEFS: VarDef[] = [
  { path: 'entry.name', label: 'Name', type: 'string', group: 'Entry' },
  { path: 'entry.content', label: 'Content', type: 'string', group: 'Entry' },
  { path: 'entry.tokenCount', label: 'Token Count', type: 'number', group: 'Entry' },
  { path: 'entry.constant', label: 'Constant', type: 'boolean', group: 'Entry' },
  { path: 'entry.enabled', label: 'Enabled', type: 'boolean', group: 'Entry' },
  { path: 'entry.selective', label: 'Selective', type: 'boolean', group: 'Entry' },
  { path: 'entry.selectiveLogic', label: 'Selective Logic', type: 'number', group: 'Entry' },
  { path: 'entry.keys.length', label: 'Key Count', type: 'number', group: 'Entry' },
  { path: 'entry.secondaryKeys.length', label: 'Secondary Key Count', type: 'number', group: 'Entry' },
  { path: 'entry.position', label: 'Position', type: 'number', group: 'Entry' },
  { path: 'entry.order', label: 'Order', type: 'number', group: 'Entry' },
  { path: 'entry.depth', label: 'Depth', type: 'number', group: 'Entry' },
  { path: 'entry.delay', label: 'Delay', type: 'number', group: 'Entry' },
  { path: 'entry.cooldown', label: 'Cooldown', type: 'number', group: 'Entry' },
  { path: 'entry.sticky', label: 'Sticky', type: 'number', group: 'Entry' },
  { path: 'entry.probability', label: 'Probability', type: 'number', group: 'Entry' },
  { path: 'entry.preventRecursion', label: 'Prevent Recursion', type: 'boolean', group: 'Entry' },
  { path: 'entry.excludeRecursion', label: 'Exclude Recursion', type: 'boolean', group: 'Entry' },
  { path: 'entry.ignoreBudget', label: 'Ignore Budget', type: 'boolean', group: 'Entry' },
  { path: 'book.scanDepth', label: 'Scan Depth', type: 'number', group: 'Book' },
  { path: 'book.tokenBudget', label: 'Token Budget', type: 'number', group: 'Book' },
  { path: 'book.recursiveScan', label: 'Recursive Scan', type: 'boolean', group: 'Book' },
  { path: 'book.caseSensitive', label: 'Case Sensitive', type: 'boolean', group: 'Book' },
  { path: 'book.matchWholeWords', label: 'Match Whole Words', type: 'boolean', group: 'Book' },
]

const NUMERIC_OPS: Array<{ op: ComparisonOp; label: string }> = [
  { op: '==', label: '==' },
  { op: '!=', label: '!=' },
  { op: '>', label: '>' },
  { op: '<', label: '<' },
  { op: '>=', label: '>=' },
  { op: '<=', label: '<=' },
]

const STRING_OPS: Array<{ op: ComparisonOp; label: string }> = [
  { op: '==', label: 'equals' },
  { op: '!=', label: 'not equals' },
  { op: 'includes', label: 'contains' },
  { op: 'not-includes', label: 'not contains' },
  { op: 'matches', label: 'matches regex' },
]

const BOOLEAN_OPS: Array<{ op: ComparisonOp; label: string }> = [
  { op: '==', label: '==' },
  { op: '!=', label: '!=' },
]

function getOpsForType(type: 'string' | 'number' | 'boolean') {
  if (type === 'number') return NUMERIC_OPS
  if (type === 'boolean') return BOOLEAN_OPS
  return STRING_OPS
}

function getDefaultRight(type: 'string' | 'number' | 'boolean', op: ComparisonOp): string {
  if (type === 'boolean') return 'true'
  if (type === 'number') return '0'
  if (op === 'matches') return '.*'
  return ''
}

function varLabel(path: string): string {
  const def = VARIABLE_DEFS.find((v) => v.path === path)
  return def ? `${def.group}: ${def.label}` : path
}

// --- Sub-components ---

interface LeafRowProps {
  leaf: ConditionLeaf
  onChange: (leaf: ConditionLeaf) => void
  onDelete: () => void
}

function LeafRow({ leaf, onChange, onDelete }: LeafRowProps) {
  const varDef = VARIABLE_DEFS.find((v) => v.path === leaf.left)
  const varType = varDef?.type ?? 'string'
  const ops = getOpsForType(varType)

  const [varSearch, setVarSearch] = useState('')
  const [showVarPicker, setShowVarPicker] = useState(false)

  const filteredVars = VARIABLE_DEFS.filter(
    (v) =>
      varSearch === '' ||
      v.label.toLowerCase().includes(varSearch.toLowerCase()) ||
      v.path.toLowerCase().includes(varSearch.toLowerCase())
  )

  const groupedVars: Array<{ group: string; vars: VarDef[] }> = []
  for (const group of ['Entry', 'Book'] as const) {
    const vars = filteredVars.filter((v) => v.group === group)
    if (vars.length > 0) groupedVars.push({ group, vars })
  }

  function handleLeftChange(path: string) {
    const def = VARIABLE_DEFS.find((v) => v.path === path)
    const newType = def?.type ?? 'string'
    const newOps = getOpsForType(newType)
    const newOp = newOps.find((o) => o.op === leaf.operator)?.op ?? newOps[0].op
    const newRight = getDefaultRight(newType, newOp)
    const right = newType === varType ? leaf.right : newRight
    onChange({ ...leaf, left: path, operator: newOp, right })
    setShowVarPicker(false)
    setVarSearch('')
  }

  function handleOpChange(op: ComparisonOp) {
    onChange({ ...leaf, operator: op })
  }

  function handleRightChange(right: string) {
    onChange({ ...leaf, right })
  }

  return (
    <div className="flex items-center gap-1.5 p-1.5 rounded bg-ctp-surface0/50 group">
      {/* Variable picker */}
      <div className="relative flex-shrink-0" style={{ minWidth: 160 }}>
        <button
          type="button"
          onClick={() => setShowVarPicker((v) => !v)}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs text-ctp-text bg-ctp-surface1 hover:bg-ctp-surface2 border border-ctp-surface2 w-full min-w-0"
          title={leaf.left}
        >
          <span className="truncate flex-1 text-left">{varLabel(leaf.left) || 'Select variable'}</span>
          <ChevronDown size={10} className="shrink-0" />
        </button>
        {showVarPicker && (
          <div className="absolute z-50 mt-1 w-56 bg-ctp-mantle border border-ctp-surface2 rounded shadow-lg">
            <input
              autoFocus
              type="text"
              placeholder="Search..."
              value={varSearch}
              onChange={(e) => setVarSearch(e.target.value)}
              className="w-full px-2 py-1.5 text-xs bg-ctp-surface0 border-b border-ctp-surface2 text-ctp-text placeholder-ctp-overlay0 focus:outline-none"
            />
            <div className="max-h-48 overflow-y-auto py-1">
              {groupedVars.map(({ group, vars }) => (
                <div key={group}>
                  <div className="px-2 py-0.5 text-[10px] font-semibold uppercase text-ctp-overlay0">{group}</div>
                  {vars.map((v) => (
                    <button
                      key={v.path}
                      type="button"
                      onClick={() => handleLeftChange(v.path)}
                      className="w-full flex items-center justify-between px-3 py-1 text-xs text-ctp-text hover:bg-ctp-surface1 text-left"
                    >
                      <span>{v.label}</span>
                      <span className="text-[10px] text-ctp-overlay1 ml-2">{v.type}</span>
                    </button>
                  ))}
                </div>
              ))}
              {groupedVars.length === 0 && (
                <div className="px-3 py-2 text-xs text-ctp-overlay0">No matches</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Operator */}
      <select
        value={leaf.operator}
        onChange={(e) => handleOpChange(e.target.value as ComparisonOp)}
        className="px-1.5 py-1 rounded text-xs text-ctp-text bg-ctp-surface1 border border-ctp-surface2 shrink-0"
      >
        {ops.map(({ op, label }) => (
          <option key={op} value={op}>{label}</option>
        ))}
      </select>

      {/* Right value */}
      {varType === 'boolean' ? (
        <select
          value={leaf.right}
          onChange={(e) => handleRightChange(e.target.value)}
          className="px-1.5 py-1 rounded text-xs text-ctp-text bg-ctp-surface1 border border-ctp-surface2 flex-1 min-w-0"
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      ) : (
        <input
          type={varType === 'number' ? 'number' : 'text'}
          value={leaf.right}
          onChange={(e) => handleRightChange(e.target.value)}
          placeholder="value"
          className="px-1.5 py-1 rounded text-xs text-ctp-text bg-ctp-surface1 border border-ctp-surface2 flex-1 min-w-0 focus:outline-none focus:border-ctp-accent"
        />
      )}

      {/* Delete */}
      <button
        type="button"
        onClick={onDelete}
        className="p-1 rounded text-ctp-overlay0 hover:text-ctp-red hover:bg-ctp-red/10 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
        title="Remove condition"
      >
        <Trash2 size={11} />
      </button>
    </div>
  )
}

// --- ConditionBuilder ---

function makeLeaf(): ConditionLeaf {
  return { type: 'leaf', left: 'entry.keys.length', operator: '<', right: '2' }
}

function makeGroup(): ConditionGroup {
  return { type: 'group', negate: false, logic: 'AND', conditions: [makeLeaf()] }
}

function serializationToPreview(ev: SerializedEvaluation): string {
  if (ev.items.length === 0) return '(empty)'

  const itemStr = (item: ConditionLeaf | ConditionGroup): string => {
    if (item.type === 'leaf') {
      return `${item.left} ${item.operator} ${item.right}`
    }
    const parts = item.conditions.map((c) => `${c.left} ${c.operator} ${c.right}`)
    const joined = parts.join(` ${item.logic} `)
    const base = item.conditions.length > 1 ? `(${joined})` : joined
    return item.negate ? `NOT ${base}` : base
  }

  return ev.items.map(itemStr).join(` ${ev.logic} `)
}

interface ConditionBuilderProps {
  value: SerializedEvaluation
  onChange: (value: SerializedEvaluation) => void
}

export function ConditionBuilder({ value, onChange }: ConditionBuilderProps) {
  function updateItem(index: number, item: ConditionLeaf | ConditionGroup) {
    const items = [...value.items]
    items[index] = item
    onChange({ ...value, items })
  }

  function removeItem(index: number) {
    const items = value.items.filter((_, i) => i !== index)
    onChange({ ...value, items })
  }

  function addLeaf() {
    onChange({ ...value, items: [...value.items, makeLeaf()] })
  }

  function addGroup() {
    onChange({ ...value, items: [...value.items, makeGroup()] })
  }

  return (
    <div className="space-y-2">
      {/* Root logic selector */}
      {value.items.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-ctp-overlay1">Match</span>
          <div className="flex gap-1">
            {(['AND', 'OR'] as LogicOp[]).map((op) => (
              <button
                key={op}
                type="button"
                onClick={() => onChange({ ...value, logic: op })}
                className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors ${
                  value.logic === op
                    ? 'bg-ctp-accent text-ctp-base'
                    : 'bg-ctp-surface0 text-ctp-subtext1 hover:text-ctp-text'
                }`}
              >
                {op}
              </button>
            ))}
          </div>
          <span className="text-xs text-ctp-overlay1">of the following</span>
        </div>
      )}

      {/* Items */}
      <div className="space-y-2">
        {value.items.map((item, index) => {
          if (item.type === 'leaf') {
            return (
              <LeafRow
                key={index}
                leaf={item}
                onChange={(leaf) => updateItem(index, leaf)}
                onDelete={() => removeItem(index)}
              />
            )
          }

          // Group
          const group = item
          return (
            <div key={index} className="border border-ctp-surface2 rounded p-2 space-y-1.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateItem(index, { ...group, negate: !group.negate })}
                  className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold transition-colors ${
                    group.negate
                      ? 'bg-ctp-red/10 text-ctp-red border-ctp-red/30'
                      : 'text-ctp-overlay1 border-ctp-surface2 hover:text-ctp-text'
                  }`}
                >
                  NOT
                </button>
                <div className="flex gap-1">
                  {(['AND', 'OR'] as LogicOp[]).map((op) => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => updateItem(index, { ...group, logic: op })}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                        group.logic === op
                          ? 'bg-ctp-accent text-ctp-base'
                          : 'bg-ctp-surface0 text-ctp-subtext1 hover:text-ctp-text'
                      }`}
                    >
                      {op}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="ml-auto p-0.5 rounded text-ctp-overlay0 hover:text-ctp-red hover:bg-ctp-red/10 transition-colors"
                  title="Remove group"
                >
                  <Trash2 size={11} />
                </button>
              </div>
              {group.conditions.map((leaf, li) => (
                <LeafRow
                  key={li}
                  leaf={leaf}
                  onChange={(newLeaf) => {
                    const conditions = [...group.conditions]
                    conditions[li] = newLeaf
                    updateItem(index, { ...group, conditions })
                  }}
                  onDelete={() => {
                    const conditions = group.conditions.filter((_, i) => i !== li)
                    updateItem(index, { ...group, conditions })
                  }}
                />
              ))}
              <button
                type="button"
                onClick={() => {
                  updateItem(index, { ...group, conditions: [...group.conditions, makeLeaf()] })
                }}
                className="flex items-center gap-1 px-2 py-0.5 text-xs text-ctp-overlay1 hover:text-ctp-text transition-colors"
              >
                <Plus size={10} />
                Add condition
              </button>
            </div>
          )
        })}
      </div>

      {/* Add buttons */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={addLeaf}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs text-ctp-subtext1 hover:text-ctp-text hover:bg-ctp-surface0 border border-ctp-surface2 transition-colors"
        >
          <Plus size={11} />
          Add Condition
        </button>
        <button
          type="button"
          onClick={addGroup}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs text-ctp-subtext1 hover:text-ctp-text hover:bg-ctp-surface0 border border-ctp-surface2 transition-colors"
        >
          <Plus size={11} />
          Add Group
        </button>
      </div>

      {/* Preview */}
      {value.items.length > 0 && (
        <div className="mt-2 p-2 bg-ctp-crust rounded text-[11px] font-mono text-ctp-subtext0 break-all">
          {serializationToPreview(value)}
        </div>
      )}
    </div>
  )
}
