import { useRef, useState } from 'react'
import { KeywordTag } from '@/features/keywords/KeywordTag'

interface KeywordEditorProps {
  value: string[]
  onChange: (keywords: string[]) => void
  placeholder?: string
  variant?: 'primary' | 'secondary'
}

export function KeywordEditor({ value, onChange, placeholder, variant = 'primary' }: KeywordEditorProps) {
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function commitInput() {
    const trimmed = inputValue.trim()
    if (!trimmed) return
    const isDuplicate = value.some((k) => k.toLowerCase() === trimmed.toLowerCase())
    setInputValue('')
    if (isDuplicate) return
    onChange([...value, trimmed])
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      commitInput()
    } else if (e.key === ',') {
      e.preventDefault()
      commitInput()
    } else if (e.key === 'Backspace' && inputValue === '') {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className="w-full bg-ctp-surface0 border border-ctp-surface1 rounded px-1.5 py-1 flex flex-wrap gap-1 items-center focus-within:border-ctp-sky transition-colors cursor-text min-h-[30px]"
    >
      {value.map((kw, i) => (
        <KeywordTag
          key={kw}
          keyword={kw}
          variant={variant}
          onRemove={() => onChange(value.filter((_, j) => j !== i))}
        />
      ))}
      <input
        ref={inputRef}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commitInput}
        placeholder={value.length === 0 ? placeholder : undefined}
        className="bg-transparent outline-none text-xs text-ctp-subtext1 placeholder-ctp-overlay0 flex-1 min-w-[80px]"
      />
    </div>
  )
}
