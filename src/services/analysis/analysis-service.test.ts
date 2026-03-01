import { describe, it, expect } from 'vitest'
import { runDeterministic, computeHealthScore } from './analysis-service'
import { defaultRubric } from './default-rubric'
import { buildGraph } from '@/services/graph-service'
import type { WorkingEntry, Finding, AnalysisContext } from '@/types'

// Minimal WorkingEntry factory
function makeEntry(overrides: Partial<WorkingEntry> = {}): WorkingEntry {
  return {
    id: overrides.id ?? 'test-id',
    uid: 0,
    name: overrides.name ?? 'Test Entry',
    content: overrides.content ?? 'Some content',
    keys: overrides.keys ?? ['testkey'],
    secondaryKeys: overrides.secondaryKeys ?? [],
    constant: overrides.constant ?? false,
    selective: overrides.selective ?? false,
    selectiveLogic: 0,
    enabled: overrides.enabled ?? true,
    position: overrides.position ?? 0,
    order: overrides.order ?? 100,
    depth: 4,
    delay: 0,
    cooldown: 0,
    sticky: overrides.sticky ?? 0,
    probability: overrides.probability ?? 100,
    preventRecursion: overrides.preventRecursion ?? false,
    excludeRecursion: false,
    ignoreBudget: overrides.ignoreBudget ?? false,
    group: '',
    groupOverride: false,
    groupWeight: 100,
    useGroupScoring: null,
    scanDepth: null,
    caseSensitive: null,
    matchWholeWords: null,
    matchPersonaDescription: false,
    matchCharacterDescription: false,
    matchCharacterPersonality: false,
    matchCharacterDepthPrompt: false,
    matchScenario: false,
    matchCreatorNotes: false,
    role: 0,
    automationId: '',
    outletName: '',
    vectorized: overrides.vectorized ?? false,
    useProbability: overrides.useProbability ?? true,
    addMemo: overrides.addMemo ?? true,
    displayIndex: null,
    delayUntilRecursion: 0,
    triggers: [],
    characterFilter: { isExclude: false, names: [], tags: [] },
    tokenCount: overrides.tokenCount ?? 0,
    extensions: {},
    ...overrides,
  }
}

function makeContext(entries: WorkingEntry[]): AnalysisContext {
  return { entries, graph: buildGraph(entries) }
}

// ─── computeHealthScore ──────────────────────────────────────────────────────

describe('computeHealthScore', () => {
  it('returns overall 100 with all categories at 100 when no findings', () => {
    const score = computeHealthScore([], defaultRubric)
    expect(score.overall).toBe(100)
    for (const cat of Object.values(score.categories)) {
      expect(cat.score).toBe(100)
      expect(cat.errorCount).toBe(0)
      expect(cat.warningCount).toBe(0)
      expect(cat.suggestionCount).toBe(0)
    }
  })

  it('deducts 25 per error from the affected category', () => {
    const findings: Finding[] = [{
      id: 'f1',
      ruleId: 'structure/blank-name',
      severity: 'error',
      category: 'structure',
      message: 'test',
      entryIds: ['e1'],
    }]
    const score = computeHealthScore(findings, defaultRubric)
    expect(score.categories.structure.score).toBe(75)
    expect(score.categories.structure.errorCount).toBe(1)
    expect(score.overall).toBeLessThan(100)
  })

  it('deducts 10 per warning from the affected category', () => {
    const findings: Finding[] = [{
      id: 'f1',
      ruleId: 'config/selective-logic',
      severity: 'warning',
      category: 'config',
      message: 'test',
      entryIds: ['e1'],
    }]
    const score = computeHealthScore(findings, defaultRubric)
    expect(score.categories.config.score).toBe(90)
    expect(score.categories.config.warningCount).toBe(1)
  })

  it('deducts 3 per suggestion', () => {
    const findings: Finding[] = [{
      id: 'f1',
      ruleId: 'keywords/keyword-count',
      severity: 'suggestion',
      category: 'keywords',
      message: 'test',
      entryIds: ['e1'],
    }]
    const score = computeHealthScore(findings, defaultRubric)
    expect(score.categories.keywords.score).toBe(97)
  })

  it('summary says "N errors require attention" when errors present', () => {
    const findings: Finding[] = [
      { id: 'f1', ruleId: 'r', severity: 'error', category: 'structure', message: 'e', entryIds: [] },
      { id: 'f2', ruleId: 'r', severity: 'error', category: 'keywords', message: 'e', entryIds: [] },
    ]
    const score = computeHealthScore(findings, defaultRubric)
    expect(score.summary).toContain('2 errors')
  })

  it('summary says "No issues detected" with empty findings', () => {
    const score = computeHealthScore([], defaultRubric)
    expect(score.summary).toBe('No issues detected')
  })
})

// ─── runDeterministic — config/selective-logic ───────────────────────────────

describe('runDeterministic — config/selective-logic', () => {
  it('flags selective:true entries with empty secondaryKeys as error', async () => {
    const entry = makeEntry({ id: 'e1', selective: true, secondaryKeys: [] })
    const ctx = makeContext([entry])
    const findings = await runDeterministic(ctx, defaultRubric)
    const match = findings.find((f) => f.ruleId === 'config/selective-logic')
    expect(match).toBeDefined()
    expect(match?.severity).toBe('error')
    expect(match?.entryIds).toContain('e1')
  })

  it('does NOT flag selective:true entries with non-empty secondaryKeys', async () => {
    const entry = makeEntry({ id: 'e1', selective: true, secondaryKeys: ['some-key'] })
    const ctx = makeContext([entry])
    const findings = await runDeterministic(ctx, defaultRubric)
    expect(findings.find((f) => f.ruleId === 'config/selective-logic')).toBeUndefined()
  })
})

// ─── runDeterministic — budget/constant-token-cost ───────────────────────────

describe('runDeterministic — budget/constant-token-cost', () => {
  it('flags constant entries with tokenCount > 100 as warning', async () => {
    const entry = makeEntry({ id: 'e1', constant: true, tokenCount: 150 })
    const ctx = makeContext([entry])
    const findings = await runDeterministic(ctx, defaultRubric)
    const match = findings.find((f) => f.ruleId === 'budget/constant-token-cost')
    expect(match).toBeDefined()
    expect(match?.severity).toBe('warning')
    expect(match?.entryIds).toContain('e1')
  })

  it('does NOT flag constant entries with tokenCount <= 100', async () => {
    const entry = makeEntry({ id: 'e1', constant: true, tokenCount: 100 })
    const ctx = makeContext([entry])
    const findings = await runDeterministic(ctx, defaultRubric)
    expect(findings.find((f) => f.ruleId === 'budget/constant-token-cost')).toBeUndefined()
  })
})

// ─── runDeterministic — recursion/circular-references ────────────────────────

describe('runDeterministic — recursion/circular-references', () => {
  it('detects a simple A→B→A cycle as error', async () => {
    // Entry A mentions "entryb" in content; Entry B has key "entryb"
    // Entry B mentions "entrya" in content; Entry A has key "entrya"
    const entryA = makeEntry({ id: 'a', name: 'Entry A', keys: ['entrya'], content: 'see entryb for more' })
    const entryB = makeEntry({ id: 'b', name: 'Entry B', keys: ['entryb'], content: 'see entrya for more' })
    const ctx = makeContext([entryA, entryB])
    const findings = await runDeterministic(ctx, defaultRubric)
    const match = findings.find((f) => f.ruleId === 'recursion/circular-references')
    expect(match).toBeDefined()
    expect(match?.severity).toBe('error')
    expect(match?.entryIds).toContain('a')
    expect(match?.entryIds).toContain('b')
  })

  it('does NOT flag cycles where all participants have preventRecursion', async () => {
    const entryA = makeEntry({ id: 'a', keys: ['entrya'], content: 'see entryb', preventRecursion: true })
    const entryB = makeEntry({ id: 'b', keys: ['entryb'], content: 'see entrya', preventRecursion: true })
    const ctx = makeContext([entryA, entryB])
    const findings = await runDeterministic(ctx, defaultRubric)
    expect(findings.find((f) => f.ruleId === 'recursion/circular-references')).toBeUndefined()
  })
})

// ─── runDeterministic — keywords/empty-keys ──────────────────────────────────

describe('runDeterministic — keywords/empty-keys', () => {
  it('flags non-constant entries with no keys as error', async () => {
    const entry = makeEntry({ id: 'e1', keys: [], constant: false })
    const ctx = makeContext([entry])
    const findings = await runDeterministic(ctx, defaultRubric)
    const match = findings.find((f) => f.ruleId === 'keywords/empty-keys')
    expect(match).toBeDefined()
    expect(match?.severity).toBe('error')
  })

  it('does NOT flag constant entries with no keys', async () => {
    const entry = makeEntry({ id: 'e1', keys: [], constant: true })
    const ctx = makeContext([entry])
    const findings = await runDeterministic(ctx, defaultRubric)
    expect(findings.find((f) => f.ruleId === 'keywords/empty-keys')).toBeUndefined()
  })
})

// ─── runDeterministic — structure/uid-consistency ────────────────────────────

describe('runDeterministic — structure/uid-consistency', () => {
  it('flags duplicate positive UIDs', async () => {
    const a = makeEntry({ id: 'a', uid: 5 })
    const b = makeEntry({ id: 'b', uid: 5 })
    const ctx = makeContext([a, b])
    const findings = await runDeterministic(ctx, defaultRubric)
    const match = findings.find((f) => f.ruleId === 'structure/uid-consistency')
    expect(match).toBeDefined()
    expect(match?.entryIds).toContain('a')
    expect(match?.entryIds).toContain('b')
  })

  it('does NOT flag uid=0 shared across multiple entries', async () => {
    const a = makeEntry({ id: 'a', uid: 0 })
    const b = makeEntry({ id: 'b', uid: 0 })
    const ctx = makeContext([a, b])
    const findings = await runDeterministic(ctx, defaultRubric)
    expect(findings.find((f) => f.ruleId === 'structure/uid-consistency')).toBeUndefined()
  })
})
