import { describe, it, expect } from 'vitest'
import { filterRulesByFormat } from './format-filter'
import type { Rule } from '@/types'

function makeRule(overrides: Partial<Rule> = {}): Rule {
  return {
    id: 'test/rule',
    name: 'Test Rule',
    description: 'A test rule.',
    category: 'keywords',
    severity: 'warning',
    requiresLLM: false,
    evaluate: async () => [],
    ...overrides,
  }
}

describe('filterRulesByFormat', () => {
  it('passes a rule with no formatCompatibility for any format', () => {
    const rule = makeRule()
    expect(filterRulesByFormat([rule], 'sillytavern')).toContain(rule)
    expect(filterRulesByFormat([rule], 'rolecall')).toContain(rule)
  })

  it('passes a rule tagged [sillytavern] for sillytavern', () => {
    const rule = makeRule({ formatCompatibility: ['sillytavern'] })
    expect(filterRulesByFormat([rule], 'sillytavern')).toContain(rule)
  })

  it('blocks a rule tagged [sillytavern] for rolecall', () => {
    const rule = makeRule({ formatCompatibility: ['sillytavern'] })
    expect(filterRulesByFormat([rule], 'rolecall')).toHaveLength(0)
  })

  it('passes a rule tagged [rolecall] for rolecall', () => {
    const rule = makeRule({ formatCompatibility: ['rolecall'] })
    expect(filterRulesByFormat([rule], 'rolecall')).toContain(rule)
  })

  it('blocks a rule tagged [rolecall] for sillytavern', () => {
    const rule = makeRule({ formatCompatibility: ['rolecall'] })
    expect(filterRulesByFormat([rule], 'sillytavern')).toHaveLength(0)
  })

  it('blocks a rule with empty formatCompatibility for any format', () => {
    const rule = makeRule({ formatCompatibility: [] })
    expect(filterRulesByFormat([rule], 'sillytavern')).toHaveLength(0)
    expect(filterRulesByFormat([rule], 'rolecall')).toHaveLength(0)
  })

  it('passes a multi-format rule when format matches any', () => {
    const rule = makeRule({ formatCompatibility: ['sillytavern', 'ccv3'] })
    expect(filterRulesByFormat([rule], 'sillytavern')).toContain(rule)
    expect(filterRulesByFormat([rule], 'ccv3')).toContain(rule)
    expect(filterRulesByFormat([rule], 'rolecall')).toHaveLength(0)
  })

  it('handles mixed array — untagged passes, tagged filtered', () => {
    const untagged = makeRule({ id: 'a' })
    const tagged = makeRule({ id: 'b', formatCompatibility: ['rolecall'] })
    const result = filterRulesByFormat([untagged, tagged], 'sillytavern')
    expect(result).toContain(untagged)
    expect(result).not.toContain(tagged)
  })
})
