import type { Rule } from '../../types'
import type { LorebookFormat } from '../../types'

/**
 * Filters rules by format compatibility.
 * Rules without formatCompatibility pass through for any format.
 * Rules with formatCompatibility only pass when format is in the array.
 */
export function filterRulesByFormat(rules: Rule[], format: LorebookFormat): Rule[] {
  return rules.filter((rule) => {
    if (rule.formatCompatibility === undefined) return true
    return rule.formatCompatibility.includes(format)
  })
}
