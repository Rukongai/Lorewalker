import { X } from 'lucide-react'
import type { RoleCallKeyword } from '@/types'

interface KeywordObjectsEditorProps {
  keywords: RoleCallKeyword[]
  onChange: (keywords: RoleCallKeyword[]) => void
}

export function KeywordObjectsEditor({ keywords, onChange }: KeywordObjectsEditorProps) {
  function updateKeyword(index: number, patch: Partial<RoleCallKeyword>) {
    const next = keywords.map((kw, i) => i === index ? { ...kw, ...patch } : kw)
    onChange(next)
  }

  function removeKeyword(index: number) {
    onChange(keywords.filter((_, i) => i !== index))
  }

  function addKeyword() {
    onChange([...keywords, { keyword: '', isRegex: false, probability: 100, frequency: 1 }])
  }

  return (
    <div className="flex flex-col gap-1">
      {keywords.length > 0 && (
        <div className="grid gap-1" style={{ gridTemplateColumns: '1fr 56px 56px auto auto' }}>
          <span className="text-[10px] text-ctp-subtext0 px-1">Keyword</span>
          <span className="text-[10px] text-ctp-subtext0 text-center">Prob %</span>
          <span className="text-[10px] text-ctp-subtext0 text-center">Cooldown</span>
          <span className="text-[10px] text-ctp-subtext0 text-center">Regex</span>
          <span className="w-6" />
          {keywords.map((kw, i) => (
            <KeywordRow
              key={i}
              keyword={kw}
              onChange={(patch) => updateKeyword(i, patch)}
              onRemove={() => removeKeyword(i)}
            />
          ))}
        </div>
      )}
      <button
        onClick={addKeyword}
        className="self-start text-[11px] text-ctp-blue hover:text-ctp-sapphire transition-colors px-1 py-0.5"
      >
        + Add Keyword
      </button>
    </div>
  )
}

function KeywordRow({ keyword, onChange, onRemove }: {
  keyword: RoleCallKeyword
  onChange: (patch: Partial<RoleCallKeyword>) => void
  onRemove: () => void
}) {
  return (
    <>
      <input
        type="text"
        value={keyword.keyword}
        onChange={(e) => onChange({ keyword: e.target.value })}
        placeholder="keyword"
        className="w-full px-2 py-0.5 rounded text-[11px] bg-ctp-surface0 border border-ctp-surface2 text-ctp-text placeholder:text-ctp-overlay0 focus:outline-none focus:border-ctp-blue"
      />
      <input
        type="number"
        min={0}
        max={100}
        value={keyword.probability}
        onChange={(e) => onChange({ probability: Math.min(100, Math.max(0, Number(e.target.value))) })}
        className="w-full px-1 py-0.5 rounded text-[11px] bg-ctp-surface0 border border-ctp-surface2 text-ctp-text text-center focus:outline-none focus:border-ctp-blue"
      />
      <input
        type="number"
        min={0}
        value={keyword.frequency ?? 1}
        onChange={(e) => onChange({ frequency: Math.max(0, Number(e.target.value)) })}
        className="w-full px-1 py-0.5 rounded text-[11px] bg-ctp-surface0 border border-ctp-surface2 text-ctp-text text-center focus:outline-none focus:border-ctp-blue"
      />
      <div className="flex items-center justify-center">
        <input
          type="checkbox"
          checked={keyword.isRegex}
          onChange={(e) => onChange({ isRegex: e.target.checked })}
          className="w-3.5 h-3.5 accent-ctp-blue"
          title="Is Regex"
        />
      </div>
      <button
        onClick={onRemove}
        className="flex items-center justify-center w-6 h-6 rounded text-ctp-overlay1 hover:text-ctp-red hover:bg-ctp-red/10 transition-colors"
        title="Remove"
      >
        <X size={12} />
      </button>
    </>
  )
}
