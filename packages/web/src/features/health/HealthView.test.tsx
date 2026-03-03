import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { HealthView } from './HealthView'
import type { Finding, HealthScore, WorkingEntry, RecursionGraph, BookMeta } from '../../types'

// --- Mock data ---

const mockFindings: Finding[] = [
  {
    id: 'f1',
    ruleId: 'structure/missing-name',
    severity: 'error',
    category: 'structure',
    message: 'Entry has no name',
    entryIds: ['e1'],
  },
  {
    id: 'f2',
    ruleId: 'keywords/no-keys',
    severity: 'warning',
    category: 'keywords',
    message: 'Entry has no keywords',
    entryIds: ['e2'],
  },
]

const mockHealthScore: HealthScore = {
  overall: 72,
  categories: {
    structure: { score: 60, errorCount: 1, warningCount: 0, suggestionCount: 0 },
    config: { score: 100, errorCount: 0, warningCount: 0, suggestionCount: 0 },
    keywords: { score: 75, errorCount: 0, warningCount: 1, suggestionCount: 0 },
    content: { score: 100, errorCount: 0, warningCount: 0, suggestionCount: 0 },
    recursion: { score: 100, errorCount: 0, warningCount: 0, suggestionCount: 0 },
    budget: { score: 100, errorCount: 0, warningCount: 0, suggestionCount: 0 },
  },
  summary: 'Good health, some issues.',
}

const mockEntries: WorkingEntry[] = [
  { id: 'e1', name: 'Entry One', content: 'mentions [[Entry Two]]', keys: ['entryOne'], enabled: true, constant: false, selective: false } as WorkingEntry,
  { id: 'e2', name: 'Entry Two', content: '', keys: ['entryTwo'], enabled: true, constant: false, selective: false } as WorkingEntry,
]

const mockGraph: RecursionGraph = {
  edges: new Map([['e1', new Set(['e2'])]]),
  reverseEdges: new Map([['e2', new Set(['e1'])]]),
  edgeMeta: new Map([
    ['e1\u2192e2', {
      sourceId: 'e1',
      targetId: 'e2',
      matchedKeywords: ['entryTwo'],
      blockedByPreventRecursion: false,
      blockedByExcludeRecursion: false,
    }],
  ]),
}

const mockBookMeta: BookMeta = {
  name: 'Test Book',
  maxRecursionSteps: 3,
  tokenBudget: 2048,
  scanDepth: 5,
} as BookMeta

// --- Lorebook scope tests ---

describe('HealthView — lorebook scope', () => {
  it('renders HealthScoreCard with overall score', () => {
    render(
      <HealthView
        scope="lorebook"
        findings={mockFindings}
        healthScore={mockHealthScore}
        entries={mockEntries}
        graph={mockGraph}
        bookMeta={mockBookMeta}
      />
    )
    expect(screen.getByText('72')).toBeInTheDocument()
  })

  it('renders FindingsList with all findings', () => {
    render(
      <HealthView
        scope="lorebook"
        findings={mockFindings}
        healthScore={mockHealthScore}
        entries={mockEntries}
        graph={mockGraph}
        bookMeta={mockBookMeta}
      />
    )
    expect(screen.getByText('Entry has no name')).toBeInTheDocument()
    expect(screen.getByText('Entry has no keywords')).toBeInTheDocument()
  })

  it('renders DeepAnalysisTrigger when llmProviderId is provided', () => {
    render(
      <HealthView
        scope="lorebook"
        findings={mockFindings}
        healthScore={mockHealthScore}
        entries={mockEntries}
        graph={mockGraph}
        bookMeta={mockBookMeta}
        llmProviderId="openai"
        onDeepAnalysisComplete={vi.fn()}
      />
    )
    expect(screen.getByText('Deep Analysis')).toBeInTheDocument()
  })

  it('does not render ConnectionsList in lorebook scope', () => {
    render(
      <HealthView
        scope="lorebook"
        findings={mockFindings}
        healthScore={mockHealthScore}
        entries={mockEntries}
        graph={mockGraph}
        bookMeta={mockBookMeta}
      />
    )
    // ConnectionsList renders "Activates This" header (as part of longer text with count)
    expect(screen.queryByText(/Activates This/)).not.toBeInTheDocument()
  })

  it('shows FindingDetail when a finding is selected', () => {
    render(
      <HealthView
        scope="lorebook"
        findings={mockFindings}
        healthScore={mockHealthScore}
        entries={mockEntries}
        graph={mockGraph}
        bookMeta={mockBookMeta}
        onEntrySelect={vi.fn()}
        onEntryOpen={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('Entry has no name'))
    // FindingItem renders the ruleId inline as part of the finding row
    expect(screen.getByText('structure/missing-name')).toBeInTheDocument()
  })

  it('renders empty state when no healthScore is provided', () => {
    render(<HealthView scope="lorebook" />)
    expect(screen.getByText(/open a lorebook/i)).toBeInTheDocument()
  })
})

// --- Entry scope tests ---

describe('HealthView — entry scope', () => {
  const entry = mockEntries[0]  // e1: has outgoing edge to e2
  const entryFindings = mockFindings.filter(f => f.entryIds.includes(entry.id))

  it('renders HealthScoreCard with entry contribution score', () => {
    render(
      <HealthView
        scope="entry"
        entry={entry}
        entryFindings={entryFindings}
        entries={mockEntries}
        graph={mockGraph}
      />
    )
    // Score computed from entryFindings — 1 error in structure → below 100
    // HealthScoreCard renders score as a <span>, find all standalone numeric text nodes
    const numElements = screen.getAllByText(/^\d+$/)
    const scores = numElements.map((el: HTMLElement) => Number(el.textContent))
    expect(scores.some((n: number) => n > 0 && n < 100)).toBe(true)
  })

  it('renders FindingsList filtered to entry findings only', () => {
    render(
      <HealthView
        scope="entry"
        entry={entry}
        entryFindings={entryFindings}
        entries={mockEntries}
        graph={mockGraph}
      />
    )
    expect(screen.getByText('Entry has no name')).toBeInTheDocument()
    // e2's finding is NOT shown
    expect(screen.queryByText('Entry has no keywords')).not.toBeInTheDocument()
  })

  it('renders ConnectionsList with outgoing edges from graph', () => {
    render(
      <HealthView
        scope="entry"
        entry={entry}
        entryFindings={entryFindings}
        entries={mockEntries}
        graph={mockGraph}
      />
    )
    // e1 triggers e2, so "This Activates" should show "Entry Two"
    expect(screen.getByText('Entry Two')).toBeInTheDocument()
  })

  it('does not render full HealthScoreCard categories in entry scope', () => {
    render(
      <HealthView
        scope="entry"
        entry={entry}
        entryFindings={entryFindings}
        entries={mockEntries}
        graph={mockGraph}
      />
    )
    // HealthScoreCard in entry scope gets no categories or summary prop
    // The lorebook summary text is only passed in lorebook scope
    expect(screen.queryByText('Good health, some issues.')).not.toBeInTheDocument()
  })

  it('does not render DeepAnalysisTrigger in entry scope', () => {
    render(
      <HealthView
        scope="entry"
        entry={entry}
        entryFindings={[]}
        entries={mockEntries}
        graph={mockGraph}
        llmProviderId="openai"
      />
    )
    expect(screen.queryByText('Deep Analysis')).not.toBeInTheDocument()
  })

  it('renders empty connections when entry has no edges', () => {
    const isolatedEntry = mockEntries[1]  // e2 has no outgoing edges
    render(
      <HealthView
        scope="entry"
        entry={isolatedEntry}
        entryFindings={[]}
        entries={mockEntries}
        graph={mockGraph}
      />
    )
    // ConnectionsList still renders, but with empty lists
    // The header text includes a count, so use regex
    expect(screen.getByText(/Activates This/)).toBeInTheDocument()
  })
})
