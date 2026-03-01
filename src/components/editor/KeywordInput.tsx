import { useRef, useState } from 'react'

interface KeywordInputProps {
  value: string[]
  onChange: (keywords: string[]) => void
  placeholder?: string
}

export function KeywordInput({ value, onChange, placeholder }: KeywordInputProps) {
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

  function removeAt(idx: number) {
    onChange(value.filter((_, i) => i !== idx))
  }

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className="w-full bg-ctp-surface0 border border-ctp-surface1 rounded px-1.5 py-1 flex flex-wrap gap-1 items-center focus-within:border-ctp-lavender transition-colors cursor-text min-h-[30px]"
    >
      {value.map((kw, i) => (
        <span
          key={kw}
          className="inline-flex items-center gap-0.5 pl-1.5 pr-0.5 py-0.5 rounded text-[10px] bg-ctp-lavender/15 border border-ctp-lavender/60 text-ctp-lavender select-none"
        >
          {kw}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); removeAt(i) }}
            className="text-ctp-lavender hover:text-ctp-lavender hover:bg-ctp-lavender/20 rounded px-0.5 leading-none"
          >
            ×
          </button>
        </span>
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
