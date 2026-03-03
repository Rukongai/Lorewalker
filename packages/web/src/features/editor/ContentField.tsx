import { useState, useMemo, useRef, useEffect } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import { EditorState, StateEffect, StateField, RangeSetBuilder } from '@codemirror/state'
import { EditorView, Decoration, type DecorationSet } from '@codemirror/view'
import type { RecursionGraph } from '@/types'
import { findCycles } from '@lorewalker/core'
import { useWorkspaceStore } from '@/stores/workspace-store'

type KeywordMeta = Map<string, { count: number; isCycle: boolean }>

function buildDecorations(doc: string, meta: KeywordMeta, matchWholeWords: boolean): DecorationSet {
  const keywords = Array.from(meta.keys()).filter((k) => k.length > 0)
  if (keywords.length === 0) return Decoration.none

  const escaped = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const parts = escaped.map((k) => (matchWholeWords ? `\\b${k}\\b` : k))
  const pattern = new RegExp(parts.join('|'), 'gi')

  const builder = new RangeSetBuilder<Decoration>()
  let match: RegExpExecArray | null
  while ((match = pattern.exec(doc)) !== null) {
    const from = match.index
    const to = from + match[0].length
    const lowerMatch = match[0].toLowerCase()
    let kwMeta: { count: number; isCycle: boolean } | undefined
    for (const [kw, m] of meta) {
      if (kw.toLowerCase() === lowerMatch) { kwMeta = m; break }
    }
    if (!kwMeta) continue
    const cls = kwMeta.isCycle ? 'cm-kw-cycle' : 'cm-kw-normal'
    builder.add(from, to, Decoration.mark({ class: cls, attributes: { 'data-count': String(kwMeta.count) } }))
  }
  return builder.finish()
}

const setKeywordEffect = StateEffect.define<{ meta: KeywordMeta; matchWholeWords: boolean }>()

const keywordField = StateField.define<{ meta: KeywordMeta; matchWholeWords: boolean; deco: DecorationSet }>({
  create() { return { meta: new Map(), matchWholeWords: false, deco: Decoration.none } },
  update(value, tr) {
    let { meta, matchWholeWords, deco } = value
    for (const effect of tr.effects) {
      if (effect.is(setKeywordEffect)) {
        meta = effect.value.meta
        matchWholeWords = effect.value.matchWholeWords
        deco = buildDecorations(tr.newDoc.toString(), meta, matchWholeWords)
        return { meta, matchWholeWords, deco }
      }
    }
    if (tr.docChanged) { deco = buildDecorations(tr.newDoc.toString(), meta, matchWholeWords) }
    return { meta, matchWholeWords, deco }
  },
  provide: (f) => EditorView.decorations.from(f, (s) => s.deco),
})

const cmTheme = EditorView.theme({
  '.cm-content': { fontFamily: 'ui-monospace, monospace', fontSize: '12px', color: 'var(--color-ctp-text)', padding: '4px 8px', caretColor: 'var(--color-ctp-text)', minHeight: '9rem' },
  '.cm-cursor': { borderLeftColor: 'var(--color-ctp-text)' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { outline: 'none' },
})

interface ContentFieldProps {
  value: string
  entryId: string
  graph: RecursionGraph
  onChange: (value: string) => void
  inputClass: string
  preventRecursion?: boolean
  matchWholeWords?: boolean
}

export function ContentField({ value, entryId, graph, onChange, preventRecursion = false, matchWholeWords = false }: ContentFieldProps) {
  const showKeywordHighlightsByDefault = useWorkspaceStore((s) => s.editorDefaults.showKeywordHighlights)
  const [highlight, setHighlight] = useState(showKeywordHighlightsByDefault)
  const effectiveHighlight = highlight && !preventRecursion
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const checkRecursionLoops = useWorkspaceStore((s) => s.checkRecursionLoops)

  const cycleTargetIds = useMemo(() => {
    if (!checkRecursionLoops) return new Set<string>()
    const { cycles } = findCycles(graph)
    const ids = new Set<string>()
    for (const cycle of cycles) { if (cycle.includes(entryId)) { for (const id of cycle) ids.add(id) } }
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
        if (existing) { existing.count += 1; if (isCycle) existing.isCycle = true }
        else { meta.set(kw, { count: 1, isCycle }) }
      }
    }
    return meta
  }, [graph, entryId, cycleTargetIds])

  const hasMatches = keywordMeta.size > 0

  useEffect(() => {
    if (!containerRef.current) return
    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [keywordField, cmTheme, EditorView.lineWrapping, EditorView.updateListener.of((update) => { if (update.docChanged) { onChangeRef.current(update.state.doc.toString()) } })],
      }),
      parent: containerRef.current,
    })
    viewRef.current = view
    return () => { view.destroy(); viewRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current === value) return
    view.dispatch({ changes: { from: 0, to: current.length, insert: value } })
  }, [value])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({ effects: setKeywordEffect.of({ meta: effectiveHighlight ? keywordMeta : new Map(), matchWholeWords }) })
  }, [effectiveHighlight, keywordMeta, matchWholeWords])

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <div ref={containerRef} className="w-full bg-ctp-surface0 border border-ctp-surface1 rounded focus-within:border-ctp-accent transition-colors" />
      <Tooltip text={preventRecursion ? 'Keyword highlighting disabled: Prevent Further Recursion is enabled' : effectiveHighlight ? 'Hide keyword highlights' : 'Show keyword highlights'}>
        <button type="button" onClick={() => !preventRecursion && setHighlight((v) => !v)} disabled={preventRecursion}
          className={`absolute top-1.5 right-1.5 p-1 rounded transition-colors z-10 ${preventRecursion ? 'text-ctp-surface1 cursor-not-allowed' : 'text-ctp-overlay0 hover:text-ctp-subtext0 hover:bg-ctp-surface1'}`}>
          {effectiveHighlight ? <Eye size={11} /> : <EyeOff size={11} />}
        </button>
      </Tooltip>
      {effectiveHighlight && hasMatches && (
        <div className="mt-1 flex flex-wrap gap-1">
          {Array.from(keywordMeta.entries()).map(([kw, m]) => (
            <span key={kw} className={m.isCycle ? 'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-ctp-red/15 border border-ctp-red/50 text-ctp-maroon' : 'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-ctp-accent/15 border border-ctp-accent/50 text-ctp-accent'}>
              <span className={m.isCycle ? 'text-ctp-red font-bold' : 'text-ctp-accent font-bold'}>×{m.count}</span>
              {kw}
            </span>
          ))}
        </div>
      )}
      {effectiveHighlight && !hasMatches && (<p className="mt-1 text-[10px] text-ctp-overlay0 italic">No outgoing keyword matches found for this entry.</p>)}
    </div>
  )
}
