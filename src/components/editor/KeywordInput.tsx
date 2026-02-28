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
      className="w-full bg-gray-800 border border-gray-700 rounded px-1.5 py-1 flex flex-wrap gap-1 items-center focus-within:border-indigo-500 transition-colors cursor-text min-h-[30px]"
    >
      {value.map((kw, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-0.5 pl-1.5 pr-0.5 py-0.5 rounded text-[10px] bg-indigo-900/50 border border-indigo-700/40 text-indigo-200 select-none"
        >
          {kw}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); removeAt(i) }}
            className="text-indigo-400 hover:text-indigo-200 hover:bg-indigo-800/50 rounded px-0.5 leading-none"
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
        className="bg-transparent outline-none text-xs text-gray-200 placeholder-gray-600 flex-1 min-w-[80px]"
      />
    </div>
  )
}
