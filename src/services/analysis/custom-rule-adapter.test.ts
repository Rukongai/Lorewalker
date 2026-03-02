import { describe, it, expect } from 'vitest'
import { customRuleToRule } from './custom-rule-adapter'
import type { CustomRule, AnalysisContext, WorkingEntry, BookMeta } from '@/types'

// --- Fixtures ---

function makeEntry(overrides: Partial<WorkingEntry> = {}): WorkingEntry {
  return {
    id: `entry-${Math.random()}`,
    uid: 0,
    name: 'Test Entry',
    content: 'test content',
    keys: ['foo'],
    secondaryKeys: [],
    constant: false,
    selective: false,
    selectiveLogic: 0,
    enabled: true,
    position: 0,
    order: 100,
    depth: 4,
    delay: 0,
    cooldown: 0,
    sticky: 0,
    probability: 100,
    preventRecursion: false,
    excludeRecursion: false,
    ignoreBudget: false,
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
    vectorized: false,
    useProbability: true,
    addMemo: true,
    displayIndex: null,
    delayUntilRecursion: 0,
    triggers: [],
    characterFilter: { isExclude: false, names: [], tags: [] },
    tokenCount: 10,
    extensions: {},
    ...overrides,
  }
}

function makeBookMeta(): BookMeta {
  return {
    name: '', description: '',
    scanDepth: 4, tokenBudget: 4096, contextSize: 200000,
    recursiveScan: false, caseSensitive: false, matchWholeWords: false,
    extensions: {}, minActivations: 0, maxDepth: 0, maxRecursionSteps: 0,
    insertionStrategy: 'evenly', includeNames: false, useGroupScoring: false,
    alertOnOverflow: false, budgetCap: 0,
  }
}

function makeCustomRule(overrides: Partial<CustomRule> = {}): CustomRule {
  return {
    id: 'rule-1',
    name: 'Test Rule',
    description: 'A test rule',
    category: 'keywords',
    severity: 'warning',
    enabled: true,
    requiresLLM: false,
    evaluation: {
      logic: 'AND',
      items: [{ type: 'leaf', left: 'entry.keys.length', operator: '<', right: '2' }],
    },
    message: "Entry '{{entry.name}}' has fewer than 2 keys",
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeContext(entries: WorkingEntry[]): AnalysisContext {
  return {
    entries,
    bookMeta: makeBookMeta(),
    graph: {
      edges: new Map(),
      reverseEdges: new Map(),
      edgeMeta: new Map(),
    },
  }
}

// --- Tests ---

describe('customRuleToRule', () => {
  it('returns a rule with prefixed id', () => {
    const cr = makeCustomRule({ id: 'my-rule' })
    const rule = customRuleToRule(cr)
    expect(rule.id).toBe('custom/my-rule')
  })

  it('copies name, category, severity, requiresLLM', () => {
    const cr = makeCustomRule({ name: 'My Rule', category: 'structure', severity: 'error', requiresLLM: false })
    const rule = customRuleToRule(cr)
    expect(rule.name).toBe('My Rule')
    expect(rule.category).toBe('structure')
    expect(rule.severity).toBe('error')
    expect(rule.requiresLLM).toBe(false)
  })

  it('generates a finding for each matching entry', async () => {
    const entries = [
      makeEntry({ id: 'e1', name: 'Entry A', keys: ['a'] }),      // 1 key → matches (< 2)
      makeEntry({ id: 'e2', name: 'Entry B', keys: ['a', 'b'] }), // 2 keys → no match
      makeEntry({ id: 'e3', name: 'Entry C', keys: [] }),          // 0 keys → matches
    ]
    const cr = makeCustomRule()
    const rule = customRuleToRule(cr)
    const findings = await rule.evaluate(makeContext(entries))

    expect(findings).toHaveLength(2)
    const ids = findings.map((f) => f.entryIds[0])
    expect(ids).toContain('e1')
    expect(ids).toContain('e3')
  })

  it('interpolates message with entry variables', async () => {
    const entries = [makeEntry({ id: 'e1', name: 'MyEntry', keys: ['a'] })]
    const cr = makeCustomRule({ message: "Entry '{{entry.name}}' has only {{entry.keys.length}} key(s)" })
    const rule = customRuleToRule(cr)
    const findings = await rule.evaluate(makeContext(entries))

    expect(findings).toHaveLength(1)
    expect(findings[0].message).toBe("Entry 'MyEntry' has only 1 key(s)")
  })

  it('returns empty array when rule is disabled', async () => {
    const entries = [makeEntry({ keys: ['a'] })]
    const cr = makeCustomRule({ enabled: false })
    const rule = customRuleToRule(cr)
    const findings = await rule.evaluate(makeContext(entries))
    expect(findings).toHaveLength(0)
  })

  it('returns empty array for LLM rules', async () => {
    const entries = [makeEntry({ keys: ['a'] })]
    const cr = makeCustomRule({ requiresLLM: true })
    const rule = customRuleToRule(cr)
    const findings = await rule.evaluate(makeContext(entries))
    expect(findings).toHaveLength(0)
  })

  it('returns empty array when evaluation has no items', async () => {
    const entries = [makeEntry({ keys: ['a'] })]
    const cr = makeCustomRule({ evaluation: { logic: 'AND', items: [] } })
    const rule = customRuleToRule(cr)
    const findings = await rule.evaluate(makeContext(entries))
    expect(findings).toHaveLength(0)
  })

  it('returns empty array when no entries match', async () => {
    const entries = [
      makeEntry({ keys: ['a', 'b', 'c'] }), // 3 keys, not < 2
    ]
    const cr = makeCustomRule()
    const rule = customRuleToRule(cr)
    const findings = await rule.evaluate(makeContext(entries))
    expect(findings).toHaveLength(0)
  })

  it('assigns correct ruleId, severity, and category to findings', async () => {
    const entries = [makeEntry({ keys: [] })]
    const cr = makeCustomRule({ id: 'abc', severity: 'error', category: 'structure' })
    const rule = customRuleToRule(cr)
    const findings = await rule.evaluate(makeContext(entries))

    expect(findings[0].ruleId).toBe('custom/abc')
    expect(findings[0].severity).toBe('error')
    expect(findings[0].category).toBe('structure')
  })

  it('returns empty array when evaluation is undefined (non-LLM)', async () => {
    const entries = [makeEntry()]
    const cr = makeCustomRule({ evaluation: undefined })
    const rule = customRuleToRule(cr)
    const findings = await rule.evaluate(makeContext(entries))
    expect(findings).toHaveLength(0)
  })
})
