import { describe, it, expect } from 'vitest'
import {
  resolveVariable,
  evaluateLeaf,
  evaluateGroup,
  evaluateCondition,
  interpolateMessage,
} from './evaluation-engine'
import type { EvaluationContext } from './evaluation-engine'
import type { WorkingEntry, BookMeta } from '@/types'

// --- Fixtures ---

function makeEntry(overrides: Partial<WorkingEntry> = {}): WorkingEntry {
  return {
    id: 'test-entry',
    uid: 0,
    name: 'Test Entry',
    content: 'Hello world',
    keys: ['foo', 'bar'],
    secondaryKeys: ['baz'],
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
    tokenCount: 50,
    extensions: {},
    ...overrides,
  }
}

function makeBookMeta(overrides: Partial<BookMeta> = {}): BookMeta {
  return {
    name: 'Test Book',
    description: '',
    scanDepth: 4,
    tokenBudget: 4096,
    contextSize: 200000,
    recursiveScan: false,
    caseSensitive: false,
    matchWholeWords: false,
    extensions: {},
    minActivations: 0,
    maxDepth: 0,
    maxRecursionSteps: 0,
    insertionStrategy: 'evenly',
    includeNames: false,
    useGroupScoring: false,
    alertOnOverflow: false,
    budgetCap: 0,
    ...overrides,
  }
}

function makeCtx(entryOverrides?: Partial<WorkingEntry>, bookOverrides?: Partial<BookMeta>): EvaluationContext {
  return {
    entry: makeEntry(entryOverrides),
    book: makeBookMeta(bookOverrides),
  }
}

// --- resolveVariable ---

describe('resolveVariable', () => {
  it('resolves entry.name', () => {
    const ctx = makeCtx({ name: 'MyEntry' })
    expect(resolveVariable('entry.name', ctx)).toBe('MyEntry')
  })

  it('resolves entry.keys.length', () => {
    const ctx = makeCtx({ keys: ['a', 'b', 'c'] })
    expect(resolveVariable('entry.keys.length', ctx)).toBe(3)
  })

  it('resolves book.scanDepth', () => {
    const ctx = makeCtx({}, { scanDepth: 6 })
    expect(resolveVariable('book.scanDepth', ctx)).toBe(6)
  })

  it('returns undefined for unknown path', () => {
    const ctx = makeCtx()
    expect(resolveVariable('entry.nonexistent.field', ctx)).toBeUndefined()
  })

  it('resolves nested boolean entry.constant', () => {
    const ctx = makeCtx({ constant: true })
    expect(resolveVariable('entry.constant', ctx)).toBe(true)
  })
})

// --- evaluateLeaf ---

describe('evaluateLeaf', () => {
  it('== operator matches equal number', () => {
    const ctx = makeCtx({ keys: ['a', 'b'] })
    expect(evaluateLeaf({ type: 'leaf', left: 'entry.keys.length', operator: '==', right: '2' }, ctx)).toBe(true)
  })

  it('!= operator does not match equal value', () => {
    const ctx = makeCtx({ keys: ['a'] })
    expect(evaluateLeaf({ type: 'leaf', left: 'entry.keys.length', operator: '!=', right: '2' }, ctx)).toBe(true)
  })

  it('< operator: 1 < 2 is true', () => {
    const ctx = makeCtx({ keys: ['a'] })
    expect(evaluateLeaf({ type: 'leaf', left: 'entry.keys.length', operator: '<', right: '2' }, ctx)).toBe(true)
  })

  it('< operator: 3 < 2 is false', () => {
    const ctx = makeCtx({ keys: ['a', 'b', 'c'] })
    expect(evaluateLeaf({ type: 'leaf', left: 'entry.keys.length', operator: '<', right: '2' }, ctx)).toBe(false)
  })

  it('>= operator: 2 >= 2 is true', () => {
    const ctx = makeCtx({ tokenCount: 100 })
    expect(evaluateLeaf({ type: 'leaf', left: 'entry.tokenCount', operator: '>=', right: '100' }, ctx)).toBe(true)
  })

  it('includes operator: string contains', () => {
    const ctx = makeCtx({ content: 'Hello world foo' })
    expect(evaluateLeaf({ type: 'leaf', left: 'entry.content', operator: 'includes', right: 'world' }, ctx)).toBe(true)
  })

  it('includes operator: string does not contain', () => {
    const ctx = makeCtx({ content: 'Hello world' })
    expect(evaluateLeaf({ type: 'leaf', left: 'entry.content', operator: 'includes', right: 'xyz' }, ctx)).toBe(false)
  })

  it('not-includes operator', () => {
    const ctx = makeCtx({ content: 'Hello world' })
    expect(evaluateLeaf({ type: 'leaf', left: 'entry.content', operator: 'not-includes', right: 'xyz' }, ctx)).toBe(true)
  })

  it('matches operator with valid regex', () => {
    const ctx = makeCtx({ name: 'Entry123' })
    expect(evaluateLeaf({ type: 'leaf', left: 'entry.name', operator: 'matches', right: '\\d+' }, ctx)).toBe(true)
  })

  it('matches operator with invalid regex returns false', () => {
    const ctx = makeCtx({ name: 'abc' })
    expect(evaluateLeaf({ type: 'leaf', left: 'entry.name', operator: 'matches', right: '[invalid' }, ctx)).toBe(false)
  })

  it('boolean == true', () => {
    const ctx = makeCtx({ constant: true })
    expect(evaluateLeaf({ type: 'leaf', left: 'entry.constant', operator: '==', right: 'true' }, ctx)).toBe(true)
  })

  it('boolean == false', () => {
    const ctx = makeCtx({ constant: false })
    expect(evaluateLeaf({ type: 'leaf', left: 'entry.constant', operator: '==', right: 'false' }, ctx)).toBe(true)
  })
})

// --- evaluateGroup ---

describe('evaluateGroup', () => {
  it('AND: both conditions true → true', () => {
    const ctx = makeCtx({ keys: ['a'], tokenCount: 10 })
    expect(evaluateGroup({
      type: 'group', negate: false, logic: 'AND',
      conditions: [
        { type: 'leaf', left: 'entry.keys.length', operator: '==', right: '1' },
        { type: 'leaf', left: 'entry.tokenCount', operator: '==', right: '10' },
      ],
    }, ctx)).toBe(true)
  })

  it('AND: one condition false → false', () => {
    const ctx = makeCtx({ keys: ['a'], tokenCount: 20 })
    expect(evaluateGroup({
      type: 'group', negate: false, logic: 'AND',
      conditions: [
        { type: 'leaf', left: 'entry.keys.length', operator: '==', right: '1' },
        { type: 'leaf', left: 'entry.tokenCount', operator: '==', right: '10' },
      ],
    }, ctx)).toBe(false)
  })

  it('OR: one condition true → true', () => {
    const ctx = makeCtx({ keys: ['a'], tokenCount: 20 })
    expect(evaluateGroup({
      type: 'group', negate: false, logic: 'OR',
      conditions: [
        { type: 'leaf', left: 'entry.keys.length', operator: '==', right: '1' },
        { type: 'leaf', left: 'entry.tokenCount', operator: '==', right: '10' },
      ],
    }, ctx)).toBe(true)
  })

  it('negate flips result', () => {
    const ctx = makeCtx({ keys: ['a'] })
    expect(evaluateGroup({
      type: 'group', negate: true, logic: 'AND',
      conditions: [
        { type: 'leaf', left: 'entry.keys.length', operator: '==', right: '1' },
      ],
    }, ctx)).toBe(false)
  })
})

// --- evaluateCondition ---

describe('evaluateCondition', () => {
  it('empty items → false', () => {
    const ctx = makeCtx()
    expect(evaluateCondition({ logic: 'AND', items: [] }, ctx)).toBe(false)
  })

  it('single leaf AND matches', () => {
    const ctx = makeCtx({ keys: ['a'] })
    expect(evaluateCondition({
      logic: 'AND',
      items: [{ type: 'leaf', left: 'entry.keys.length', operator: '<', right: '2' }],
    }, ctx)).toBe(true)
  })

  it('single leaf OR matches', () => {
    const ctx = makeCtx({ keys: ['a'] })
    expect(evaluateCondition({
      logic: 'OR',
      items: [{ type: 'leaf', left: 'entry.keys.length', operator: '<', right: '2' }],
    }, ctx)).toBe(true)
  })

  it('AND with leaf and group', () => {
    const ctx = makeCtx({ keys: ['a'], content: 'hello' })
    expect(evaluateCondition({
      logic: 'AND',
      items: [
        { type: 'leaf', left: 'entry.keys.length', operator: '<', right: '2' },
        { type: 'group', negate: false, logic: 'OR', conditions: [
          { type: 'leaf', left: 'entry.content', operator: 'includes', right: 'hello' },
        ]},
      ],
    }, ctx)).toBe(true)
  })

  it('OR: first item fails, second passes', () => {
    const ctx = makeCtx({ keys: ['a', 'b', 'c'] })
    expect(evaluateCondition({
      logic: 'OR',
      items: [
        { type: 'leaf', left: 'entry.keys.length', operator: '<', right: '2' },
        { type: 'leaf', left: 'entry.keys.length', operator: '>', right: '2' },
      ],
    }, ctx)).toBe(true)
  })
})

// --- interpolateMessage ---

describe('interpolateMessage', () => {
  it('replaces simple variable', () => {
    const ctx = makeCtx({ name: 'Dragon' })
    expect(interpolateMessage("Entry '{{entry.name}}' has an issue", ctx)).toBe("Entry 'Dragon' has an issue")
  })

  it('replaces numeric variable', () => {
    const ctx = makeCtx({ keys: ['a', 'b'] })
    expect(interpolateMessage('Keys: {{entry.keys.length}}', ctx)).toBe('Keys: 2')
  })

  it('replaces multiple variables', () => {
    const ctx = makeCtx({ name: 'Foo', tokenCount: 42 })
    expect(interpolateMessage('{{entry.name}} uses {{entry.tokenCount}} tokens', ctx)).toBe('Foo uses 42 tokens')
  })

  it('unknown variable becomes empty string', () => {
    const ctx = makeCtx()
    expect(interpolateMessage('{{entry.nonexistent}}', ctx)).toBe('')
  })

  it('no template variables returns as-is', () => {
    const ctx = makeCtx()
    expect(interpolateMessage('No variables here', ctx)).toBe('No variables here')
  })

  it('trims whitespace around path', () => {
    const ctx = makeCtx({ name: 'Test' })
    expect(interpolateMessage('{{ entry.name }}', ctx)).toBe('Test')
  })
})
