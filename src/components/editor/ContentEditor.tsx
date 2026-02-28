import { useState, useMemo, useRef, useEffect } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { EditorState, StateEffect, StateField, RangeSetBuilder } from '@codemirror/state'
import { EditorView, Decoration, type DecorationSet } from '@codemirror/view'
import type { RecursionGraph } from '@/types'
import { findCycles } from '@/services/graph-service'
import { useWorkspaceStore } from '@/stores/workspace-store'

// ---------------------------------------------------------------------------
// Decoration computation (pure, module-level)
// ---------------------------------------------------------------------------

type KeywordMeta = Map<string, { count: number; isCycle: boolean }>

function buildDecorations(doc: string, meta: KeywordMeta): DecorationSet {
  const keywords = Array.from(meta.keys()).filter((k) => k.length > 0)
  if (keywords.length === 0) return Decoration.none

  const escaped = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const pattern = new RegExp(escaped.join('|'), 'gi')

  // Collect matches in order (regex exec produces them sorted by index)
  const builder = new RangeSetBuilder<Decoration>()
  let match: RegExpExecArray | null
  while ((match = pattern.exec(doc)) !== null) {
    const from = match.index
    const to = from + match[0].length
    const lowerMatch = match[0].toLowerCase()
    let kwMeta: { count: number; isCycle: boolean } | undefined
    for (const [kw, m] of meta) {
      if (kw.toLowerCase() === lowerMatch) {
        kwMeta = m
        break
      }
    }
    if (!kwMeta) continue
    const cls = kwMeta.isCycle ? 'cm-kw-cycle' : 'cm-kw-normal'
    builder.add(
      from,
      to,
      Decoration.mark({ class: cls, attributes: { 'data-count': String(kwMeta.count) } }),
    )
  }
  return builder.finish()
}

// ---------------------------------------------------------------------------
// StateEffect + StateField
// ---------------------------------------------------------------------------

const setKeywordEffect = StateEffect.define<KeywordMeta>()

const keywordField = StateField.define<{ meta: KeywordMeta; deco: DecorationSet }>({
  create() {
    return { meta: new Map(), deco: Decoration.none }
  },
  update(value, tr) {
    let { meta, deco } = value

    for (const effect of tr.effects) {
      if (effect.is(setKeywordEffect)) {
        meta = effect.value
        deco = buildDecorations(tr.newDoc.toString(), meta)
        return { meta, deco }
      }
    }

    if (tr.docChanged) {
      deco = buildDecorations(tr.newDoc.toString(), meta)
    }

    return { meta, deco }
  },
  provide: (f) => EditorView.decorations.from(f, (s) => s.deco),
})

// ---------------------------------------------------------------------------
// CM theme (defined at module level — stable reference)
// ---------------------------------------------------------------------------

const cmTheme = EditorView.theme({
  '.cm-content': {
    fontFamily: 'ui-monospace, monospace',
    fontSize: '12px',
    color: '#e5e7eb',
    padding: '4px 8px',
    caretColor: '#e5e7eb',
    minHeight: '9rem',
  },
  '.cm-cursor': { borderLeftColor: '#e5e7eb' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { outline: 'none' },
})

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ContentEditorProps {
  value: string
  entryId: string
  graph: RecursionGraph
  onChange: (value: string) => void
  inputClass: string
}

export function ContentEditor({ value, entryId, graph, onChange }: ContentEditorProps) {
  const showKeywordHighlightsByDefault = useWorkspaceStore((s) => s.editorDefaults.showKeywordHighlights)
  const [highlight, setHighlight] = useState(showKeywordHighlightsByDefault)
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const checkRecursionLoops = useWorkspaceStore((s) => s.checkRecursionLoops)

  // --- derived keyword metadata ---

  const cycleTargetIds = useMemo(() => {
    if (!checkRecursionLoops) return new Set<string>()
    const { cycles } = findCycles(graph)
    const ids = new Set<string>()
    for (const cycle of cycles) {
      if (cycle.includes(entryId)) {
        for (const id of cycle) ids.add(id)
      }
    }
    return ids
  }, [graph, entryId, checkRecursionLoops])

  const keywordMeta = useMemo(() => {
    const targets = graph.edges.get(entryId)
    if (!targets) return new Map<string, { count: number; isCycle: boolean }>()

    const meta = new Map<string, { count: number; isCycle: boolean }>()
    for (const targetId of targets) {
      const edgeKey = `${entryId}\u2192${targetId}`
      const edgeMeta = graph.edgeMeta.get(edgeKey)
      if (!edgeMeta) continue
      const isCycle = cycleTargetIds.has(targetId)
      for (const kw of edgeMeta.matchedKeywords) {
        const existing = meta.get(kw)
        if (existing) {
          existing.count += 1
          if (isCycle) existing.isCycle = true
        } else {
          meta.set(kw, { count: 1, isCycle })
        }
      }
    }
    return meta
  }, [graph, entryId, cycleTargetIds])

  const hasMatches = keywordMeta.size > 0

  // --- create editor once on mount ---

  useEffect(() => {
    if (!containerRef.current) return

    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [
          keywordField,
          cmTheme,
          EditorView.lineWrapping,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChangeRef.current(update.state.doc.toString())
            }
          }),
        ],
      }),
      parent: containerRef.current,
    })

    viewRef.current = view
    return () => {
      view.destroy()
      viewRef.current = null
    }
    // Mount-only effect: value and onChangeRef.current are handled by other effects
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- sync external value → CM (for undo/redo from outside) ---

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current === value) return
    view.dispatch({
      changes: { from: 0, to: current.length, insert: value },
    })
  }, [value])

  // --- sync highlights whenever meta or toggle changes ---

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({
      effects: setKeywordEffect.of(highlight ? keywordMeta : new Map()),
    })
  }, [highlight, keywordMeta])

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <div
        ref={containerRef}
        className="w-full bg-gray-800 border border-gray-700 rounded focus-within:border-indigo-500 transition-colors"
      />

      <button
        type="button"
        onClick={() => setHighlight((v) => !v)}
        title={highlight ? 'Hide keyword highlights' : 'Show keyword highlights'}
        className="absolute top-1.5 right-1.5 p-1 rounded text-gray-500 hover:text-gray-300 hover:bg-gray-700 transition-colors z-10"
      >
        {highlight ? <Eye size={11} /> : <EyeOff size={11} />}
      </button>

      {highlight && hasMatches && (
        <div className="mt-1 flex flex-wrap gap-1">
          {Array.from(keywordMeta.entries()).map(([kw, m]) => (
            <span
              key={kw}
              className={
                m.isCycle
                  ? 'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-red-900/50 text-red-200'
                  : 'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-indigo-900/50 text-indigo-200'
              }
            >
              <span className={m.isCycle ? 'text-red-300 font-bold' : 'text-indigo-300 font-bold'}>
                ×{m.count}
              </span>
              {kw}
            </span>
          ))}
        </div>
      )}

      {highlight && !hasMatches && (
        <p className="mt-1 text-[10px] text-gray-600 italic">
          No outgoing keyword matches found for this entry.
        </p>
      )}
    </div>
  )
}
