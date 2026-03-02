import { useState } from 'react'
import { ChevronDown, ChevronRight, Copy, CornerDownLeft } from 'lucide-react'
import { VARIABLE_DEFS } from './ConditionBuilder'

interface VariablePickerProps {
  mode: 'deterministic' | 'llm'
  onInsert: (variable: string, target: 'message' | 'user' | 'system') => void
  onCopy: (variable: string) => void
}

const TYPE_COLORS: Record<string, string> = {
  string: 'text-ctp-green',
  number: 'text-ctp-peach',
  boolean: 'text-ctp-mauve',
}

export function VariablePicker({ mode, onInsert, onCopy }: VariablePickerProps) {
  const [expanded, setExpanded] = useState(false)

  const groups: Array<{ group: string; vars: typeof VARIABLE_DEFS }> = []
  for (const group of ['Entry', 'Book'] as const) {
    const vars = VARIABLE_DEFS.filter((v) => v.group === group)
    if (vars.length > 0) groups.push({ group, vars })
  }

  return (
    <div className="border border-ctp-surface2 rounded">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-1.5 px-3 py-2 text-xs text-ctp-subtext1 hover:text-ctp-text hover:bg-ctp-surface0/50 transition-colors rounded"
      >
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span className="font-medium">Variable Reference</span>
        <span className="ml-auto text-[10px] text-ctp-overlay0">{VARIABLE_DEFS.length} variables</span>
      </button>

      {expanded && (
        <div className="border-t border-ctp-surface2 px-2 pb-2 space-y-2 pt-2">
          {groups.map(({ group, vars }) => (
            <div key={group}>
              <div className="px-1 pb-1 text-[10px] font-semibold uppercase text-ctp-overlay0 tracking-wide">
                {group}
              </div>
              <div className="space-y-0.5">
                {vars.map((v) => (
                  <div
                    key={v.path}
                    className="flex items-center gap-1.5 px-1.5 py-1 rounded hover:bg-ctp-surface0/50 group"
                  >
                    <span className="font-mono text-[11px] text-ctp-text flex-1 min-w-0 truncate">
                      {`{{${v.path}}}`}
                    </span>
                    <span className={`text-[10px] shrink-0 ${TYPE_COLORS[v.type] ?? 'text-ctp-subtext1'}`}>
                      {v.type}
                    </span>
                    <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        title="Copy to clipboard"
                        onClick={() => onCopy(v.path)}
                        className="p-0.5 rounded text-ctp-overlay1 hover:text-ctp-text hover:bg-ctp-surface1 transition-colors"
                      >
                        <Copy size={10} />
                      </button>
                      {mode === 'deterministic' ? (
                        <button
                          type="button"
                          title="Insert into message template"
                          onClick={() => onInsert(v.path, 'message')}
                          className="p-0.5 rounded text-ctp-overlay1 hover:text-ctp-accent hover:bg-ctp-surface1 transition-colors"
                        >
                          <CornerDownLeft size={10} />
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            title="Insert into system prompt"
                            onClick={() => onInsert(v.path, 'system')}
                            className="px-1 py-0.5 rounded text-[9px] text-ctp-overlay1 hover:text-ctp-blue hover:bg-ctp-surface1 transition-colors font-medium"
                          >
                            Sys
                          </button>
                          <button
                            type="button"
                            title="Insert into user prompt"
                            onClick={() => onInsert(v.path, 'user')}
                            className="px-1 py-0.5 rounded text-[9px] text-ctp-overlay1 hover:text-ctp-green hover:bg-ctp-surface1 transition-colors font-medium"
                          >
                            User
                          </button>
                          <button
                            type="button"
                            title="Insert into message template"
                            onClick={() => onInsert(v.path, 'message')}
                            className="px-1 py-0.5 rounded text-[9px] text-ctp-overlay1 hover:text-ctp-accent hover:bg-ctp-surface1 transition-colors font-medium"
                          >
                            Msg
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
