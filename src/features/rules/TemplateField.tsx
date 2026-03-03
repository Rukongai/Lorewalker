import { useRef, useState, useCallback } from 'react'
import { VARIABLE_DEFS } from './ConditionBuilder'

export interface TemplateFieldProps {
  value: string
  onChange: (value: string) => void
  multiline?: boolean
  rows?: number
  placeholder?: string
  className?: string
  fieldRef?: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>
  onCursorChange?: (pos: number) => void
}

export function TemplateField({
  value,
  onChange,
  multiline = false,
  rows = 3,
  placeholder,
  className = '',
  fieldRef,
  onCursorChange,
}: TemplateFieldProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [filterText, setFilterText] = useState('')
  const [dropdownAnchorIndex, setDropdownAnchorIndex] = useState<number | null>(null)
  const internalRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)

  const elRef = (fieldRef ?? internalRef) as React.RefObject<HTMLInputElement & HTMLTextAreaElement>

  const filteredVars = VARIABLE_DEFS.filter(
    (v) =>
      filterText === '' ||
      v.path.toLowerCase().includes(filterText.toLowerCase()) ||
      v.label.toLowerCase().includes(filterText.toLowerCase())
  )

  const groupedVars: Array<{ group: string; vars: typeof filteredVars }> = []
  for (const group of ['Entry', 'Book'] as const) {
    const vars = filteredVars.filter((v) => v.group === group)
    if (vars.length > 0) groupedVars.push({ group, vars })
  }

  function emitCursor() {
    const el = elRef.current
    if (el && onCursorChange) {
      onCursorChange(el.selectionStart ?? 0)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (e.key === 'Escape' && dropdownOpen) {
      e.preventDefault()
      setDropdownOpen(false)
      return
    }

    if (e.key === '{') {
      const el = elRef.current
      if (!el) return
      const cursor = el.selectionStart ?? 0
      const before = value.slice(0, cursor)

      if (before.endsWith('{')) {
        e.preventDefault()
        const after = value.slice(cursor)
        const newValue = before + '{}' + after
        onChange(newValue)
        const newCursor = cursor + 1
        requestAnimationFrame(() => {
          el.focus()
          el.setSelectionRange(newCursor, newCursor)
          if (onCursorChange) onCursorChange(newCursor)
        })
        setDropdownAnchorIndex(cursor - 1)
        setFilterText('')
        setDropdownOpen(true)
      }
    }
  }

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const newValue = e.target.value
      onChange(newValue)

      if (dropdownOpen) {
        const cursor = e.target.selectionStart ?? 0
        const beforeCursor = newValue.slice(0, cursor)
        const anchorIdx = dropdownAnchorIndex ?? 0
        const typed = beforeCursor.slice(anchorIdx + 2)
        if (typed.includes('}')) {
          setDropdownOpen(false)
        } else {
          setFilterText(typed)
        }
      }

      if (onCursorChange) onCursorChange(e.target.selectionStart ?? 0)
    },
    [onChange, dropdownOpen, dropdownAnchorIndex, onCursorChange]
  )

  function selectVariable(path: string) {
    const el = elRef.current
    if (!el) return
    const anchorIdx = dropdownAnchorIndex ?? 0
    const cursor = el.selectionStart ?? 0
    const before = value.slice(0, anchorIdx)
    const after = value.slice(cursor)
    const inserted = `{{${path}}}`
    const newValue = before + inserted + after
    onChange(newValue)
    setDropdownOpen(false)
    setFilterText('')
    const newCursor = anchorIdx + inserted.length
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(newCursor, newCursor)
      if (onCursorChange) onCursorChange(newCursor)
    })
  }

  const baseClass = `w-full px-2.5 py-1.5 rounded text-sm text-ctp-text bg-ctp-surface0 border border-ctp-surface2 focus:outline-none focus:border-ctp-accent font-mono ${className}`

  return (
    <div className="relative">
      {multiline ? (
        <textarea
          ref={elRef as React.RefObject<HTMLTextAreaElement>}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onSelect={emitCursor}
          onKeyUp={emitCursor}
          rows={rows}
          placeholder={placeholder}
          className={`${baseClass} resize-none`}
        />
      ) : (
        <input
          ref={elRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onSelect={emitCursor}
          onKeyUp={emitCursor}
          placeholder={placeholder}
          className={baseClass}
        />
      )}

      {dropdownOpen && filteredVars.length > 0 && (
        <div className="absolute z-50 mt-1 w-64 bg-ctp-mantle border border-ctp-surface2 rounded shadow-lg max-h-52 overflow-y-auto py-1">
          {groupedVars.map(({ group, vars }) => (
            <div key={group}>
              <div className="px-2 py-0.5 text-[10px] font-semibold uppercase text-ctp-overlay0">{group}</div>
              {vars.map((v) => (
                <button
                  key={v.path}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    selectVariable(v.path)
                  }}
                  className="w-full flex items-center justify-between px-3 py-1 text-xs text-ctp-text hover:bg-ctp-surface1 text-left"
                >
                  <span className="font-mono text-ctp-subtext1">{`{{${v.path}}}`}</span>
                  <span className="text-[10px] text-ctp-overlay1 ml-2 shrink-0">{v.type}</span>
                </button>
              ))}
            </div>
          ))}
          {groupedVars.length === 0 && (
            <div className="px-3 py-2 text-xs text-ctp-overlay0">No matches</div>
          )}
        </div>
      )}
    </div>
  )
}
