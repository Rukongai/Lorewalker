import type { Rule, Finding, AnalysisContext } from '@/types/analysis'
import { generateId } from '@/lib/uuid'

const selectiveLogicRule: Rule = {
  id: 'config/selective-logic',
  name: 'Selective Entry Missing Secondary Keys',
  description: 'A selective entry requires at least one secondary key to filter activation. Without secondary keys, selectivity has no effect.',
  category: 'config',
  severity: 'error',
  requiresLLM: false,
  async evaluate(context: AnalysisContext): Promise<Finding[]> {
    const findings: Finding[] = []
    for (const entry of context.entries) {
      if (entry.selective === true && entry.secondaryKeys.length === 0) {
        findings.push({
          id: generateId(),
          ruleId: 'config/selective-logic',
          severity: 'error',
          category: 'config',
          message: `Entry "${entry.name}" is marked selective but has no secondary keys.`,
          entryIds: [entry.id],
          details: 'Selective mode requires at least one secondary key to function. Add secondary keys or disable selective mode.',
        })
      }
    }
    return findings
  },
}

const unusedSecondaryRule: Rule = {
  id: 'config/unused-secondary',
  name: 'Secondary Keys Without Selective Mode',
  description: 'Secondary keys are defined but selective mode is disabled, so they have no effect.',
  category: 'config',
  severity: 'suggestion',
  requiresLLM: false,
  async evaluate(context: AnalysisContext): Promise<Finding[]> {
    const findings: Finding[] = []
    for (const entry of context.entries) {
      if (entry.secondaryKeys.length > 0 && !entry.selective) {
        findings.push({
          id: generateId(),
          ruleId: 'config/unused-secondary',
          severity: 'suggestion',
          category: 'config',
          message: `Entry "${entry.name}" has secondary keys but selective mode is off — secondary keys are ignored.`,
          entryIds: [entry.id],
          details: 'Enable selective mode to activate secondary key filtering, or remove the secondary keys if they are not needed.',
        })
      }
    }
    return findings
  },
}

const positionAlignmentRule: Rule = {
  id: 'config/position-alignment',
  name: 'Position Alignment Mismatch',
  description: 'Constant entries work best at positions 0–3 (before system prompt). Sticky entries are intended for position 4 (after system prompt).',
  category: 'config',
  severity: 'warning',
  requiresLLM: false,
  async evaluate(context: AnalysisContext): Promise<Finding[]> {
    const findings: Finding[] = []
    for (const entry of context.entries) {
      if ((entry.constant === true && entry.position > 3) || ((entry.sticky ?? 0) > 0 && entry.position !== 4)) {
        const reason =
          entry.constant === true && entry.position > 3
            ? `constant entry is at position ${entry.position} (expected 0–3)`
            : `sticky entry (sticky=${entry.sticky}) is at position ${entry.position} (expected 4)`
        findings.push({
          id: generateId(),
          ruleId: 'config/position-alignment',
          severity: 'warning',
          category: 'config',
          message: `Entry "${entry.name}" has a position mismatch: ${reason}.`,
          entryIds: [entry.id],
          details: 'Misaligned positions may cause entries to inject in unexpected locations relative to the system prompt and chat history.',
        })
      }
    }
    return findings
  },
}

const ruleContentMismatchRule: Rule = {
  id: 'config/rule-content-mismatch',
  name: 'Rule-Style Content Without Constant Flag',
  description: 'Entry content begins with "RULE:" (a convention for permanent instructions) but the entry is not marked constant.',
  category: 'config',
  severity: 'warning',
  requiresLLM: false,
  async evaluate(context: AnalysisContext): Promise<Finding[]> {
    const findings: Finding[] = []
    for (const entry of context.entries) {
      if (entry.content.trimStart().toUpperCase().startsWith('RULE:') && !entry.constant) {
        findings.push({
          id: generateId(),
          ruleId: 'config/rule-content-mismatch',
          severity: 'warning',
          category: 'config',
          message: `Entry "${entry.name}" has rule-style content (starts with "RULE:") but is not marked constant.`,
          entryIds: [entry.id],
          details: 'Entries beginning with "RULE:" are typically intended as permanent instructions and should be marked constant so they always inject.',
        })
      }
    }
    return findings
  },
}

const fixedValueDeviationsRule: Rule = {
  id: 'config/fixed-value-deviations',
  name: 'Non-Default Fixed Values',
  description: 'Flags entries where vectorized is enabled, useProbability is disabled, or addMemo is disabled — deviations from standard defaults.',
  category: 'config',
  severity: 'warning',
  requiresLLM: false,
  async evaluate(context: AnalysisContext): Promise<Finding[]> {
    const findings: Finding[] = []
    for (const entry of context.entries) {
      const deviations: string[] = []
      if (entry.vectorized === true) {
        deviations.push('vectorized is enabled')
      }
      if (entry.useProbability === false) {
        deviations.push('useProbability is disabled')
      }
      if (entry.addMemo === false) {
        deviations.push('addMemo is disabled')
      }
      if (deviations.length > 0) {
        findings.push({
          id: generateId(),
          ruleId: 'config/fixed-value-deviations',
          severity: 'warning',
          category: 'config',
          message: `Entry "${entry.name}" has non-default fixed values: ${deviations.join('; ')}.`,
          entryIds: [entry.id],
          details: 'These values deviate from standard lorebook defaults. Verify they are intentional.',
        })
      }
    }
    return findings
  },
}

const disabledEntriesRule: Rule = {
  id: 'config/disabled-entries',
  name: 'Disabled Entry',
  description: 'Entry is disabled and will never inject into the context.',
  category: 'config',
  severity: 'suggestion',
  requiresLLM: false,
  async evaluate(context: AnalysisContext): Promise<Finding[]> {
    const findings: Finding[] = []
    for (const entry of context.entries) {
      if (entry.enabled === false) {
        findings.push({
          id: generateId(),
          ruleId: 'config/disabled-entries',
          severity: 'suggestion',
          category: 'config',
          message: `Entry "${entry.name}" is disabled and will never activate.`,
          entryIds: [entry.id],
          details: 'Disabled entries contribute to lorebook size but never inject. Consider removing them if they are no longer needed.',
        })
      }
    }
    return findings
  },
}

const stickyOnNonEventsRule: Rule = {
  id: 'config/sticky-on-non-events',
  name: 'Sticky Entry on Non-Event Position',
  description: 'Sticky is set on an entry that is not selective and is at a position below 4, which is an unusual configuration.',
  category: 'config',
  severity: 'warning',
  requiresLLM: false,
  async evaluate(context: AnalysisContext): Promise<Finding[]> {
    const findings: Finding[] = []
    for (const entry of context.entries) {
      if ((entry.sticky ?? 0) > 0 && !entry.selective && entry.position < 4) {
        findings.push({
          id: generateId(),
          ruleId: 'config/sticky-on-non-events',
          severity: 'warning',
          category: 'config',
          message: `Entry "${entry.name}" has sticky=${entry.sticky} but is not selective and is at position ${entry.position}.`,
          entryIds: [entry.id],
          details: 'Sticky behavior is most meaningful on selective event-style entries at position 4. This combination may not behave as intended.',
        })
      }
    }
    return findings
  },
}

export const configRules: Rule[] = [
  selectiveLogicRule,
  unusedSecondaryRule,
  positionAlignmentRule,
  ruleContentMismatchRule,
  fixedValueDeviationsRule,
  disabledEntriesRule,
  stickyOnNonEventsRule,
]
