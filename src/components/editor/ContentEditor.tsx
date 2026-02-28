import { useState, useMemo } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import type { RecursionGraph } from '@/types'

interface Segment {
  text: string
  highlighted: boolean
}

function buildSegments(content: string, keywords: string[]): Segment[] {
  if (keywords.length === 0) return [{ text: content, highlighted: false }]

  // Build a regex that matches any of the keywords (case-insensitive, word-boundary)
  const escaped = keywords
    .filter((k) => k.length > 0)
    .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  if (escaped.length === 0) return [{ text: content, highlighted: false }]

  const pattern = new RegExp(`(${escaped.join('|')})`, 'gi')
  const parts = content.split(pattern)
  const lowerKeywords = new Set(keywords.map((k) => k.toLowerCase()))

  return parts.map((part) => ({
    text: part,
    highlighted: lowerKeywords.has(part.toLowerCase()),
  }))
}

interface ContentEditorProps {
  value: string
  entryId: string
  graph: RecursionGraph
  onChange: (value: string) => void
  inputClass: string
}

export function ContentEditor({ value, entryId, graph, onChange, inputClass }: ContentEditorProps) {
  const [highlight, setHighlight] = useState(false)

  const keywords = useMemo(() => {
    const targets = graph.edges.get(entryId)
    if (!targets) return []
    const result: string[] = []
    for (const targetId of targets) {
      const edgeKey = `${entryId}\u2192${targetId}`
      const meta = graph.edgeMeta.get(edgeKey)
      if (meta) {
        for (const kw of meta.matchedKeywords) {
          result.push(kw)
        }
      }
    }
    return result
  }, [graph, entryId])

  const segments = useMemo(() => buildSegments(value, keywords), [value, keywords])

  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        className={`${inputClass} resize-y font-mono`}
        placeholder="Lore text…"
      />
      <button
        type="button"
        onClick={() => setHighlight((v) => !v)}
        title={highlight ? 'Hide keyword highlights' : 'Show keyword highlights'}
        className="absolute top-1.5 right-1.5 p-1 rounded text-gray-500 hover:text-gray-300 hover:bg-gray-700 transition-colors"
      >
        {highlight ? <Eye size={11} /> : <EyeOff size={11} />}
      </button>

      {highlight && keywords.length > 0 && (
        <div
          className="mt-1 p-2 bg-gray-900 border border-gray-700 rounded font-mono text-xs text-gray-300 whitespace-pre-wrap break-words leading-relaxed"
          aria-label="Content with keyword highlights"
        >
          {segments.map((seg, i) =>
            seg.highlighted ? (
              <mark
                key={i}
                className="bg-indigo-900/60 text-indigo-200 rounded px-0.5 underline"
              >
                {seg.text}
              </mark>
            ) : (
              <span key={i}>{seg.text}</span>
            ),
          )}
        </div>
      )}
      {highlight && keywords.length === 0 && (
        <p className="mt-1 text-[10px] text-gray-600 italic">
          No outgoing keyword matches found for this entry.
        </p>
      )}
    </div>
  )
}
