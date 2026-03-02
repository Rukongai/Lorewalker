import type { SerializedEvaluation } from '@/types'

export interface RuleSeed {
  evaluation: SerializedEvaluation
  message: string
}

export const RULE_SEEDS: Record<string, RuleSeed> = {
  'keywords/empty-keys': {
    evaluation: {
      logic: 'AND',
      items: [
        { type: 'leaf', left: 'entry.constant', operator: '==', right: 'false' },
        { type: 'leaf', left: 'entry.keys.length', operator: '==', right: '0' },
      ],
    },
    message: 'Entry has no keywords and is not constant',
  },
  'keywords/keyword-count': {
    evaluation: {
      logic: 'AND',
      items: [
        { type: 'leaf', left: 'entry.constant', operator: '==', right: 'false' },
        {
          type: 'group', negate: false, logic: 'OR',
          conditions: [
            { type: 'leaf', left: 'entry.keys.length', operator: '<', right: '2' },
            { type: 'leaf', left: 'entry.keys.length', operator: '>', right: '5' },
          ],
        },
      ],
    },
    message: 'Entry "{{entry.name}}" has {{entry.keys.length}} keyword(s); 2–5 is recommended',
  },
  'keywords/redundant-constant-keys': {
    evaluation: {
      logic: 'AND',
      items: [
        { type: 'leaf', left: 'entry.constant', operator: '==', right: 'true' },
        { type: 'leaf', left: 'entry.keys.length', operator: '>', right: '0' },
      ],
    },
    message: 'Constant entry has keywords; they serve no direct activation purpose',
  },
  'structure/blank-name': {
    evaluation: {
      logic: 'AND',
      items: [
        { type: 'leaf', left: 'entry.name', operator: '==', right: '' },
      ],
    },
    message: 'Entry has an empty or whitespace-only name.',
  },
  'config/selective-logic': {
    evaluation: {
      logic: 'AND',
      items: [
        { type: 'leaf', left: 'entry.selective', operator: '==', right: 'true' },
        { type: 'leaf', left: 'entry.secondaryKeys.length', operator: '==', right: '0' },
      ],
    },
    message: 'Entry "{{entry.name}}" is marked selective but has no secondary keys.',
  },
  'config/unused-secondary': {
    evaluation: {
      logic: 'AND',
      items: [
        { type: 'leaf', left: 'entry.secondaryKeys.length', operator: '>', right: '0' },
        { type: 'leaf', left: 'entry.selective', operator: '==', right: 'false' },
      ],
    },
    message: 'Entry "{{entry.name}}" has secondary keys but selective mode is off — secondary keys are ignored.',
  },
  'config/rule-content-mismatch': {
    evaluation: {
      logic: 'AND',
      items: [
        { type: 'leaf', left: 'entry.content', operator: 'matches', right: '^\\s*RULE:' },
        { type: 'leaf', left: 'entry.constant', operator: '==', right: 'false' },
      ],
    },
    message: 'Entry "{{entry.name}}" has rule-style content (starts with "RULE:") but is not marked constant.',
  },
  'config/disabled-entries': {
    evaluation: {
      logic: 'AND',
      items: [
        { type: 'leaf', left: 'entry.enabled', operator: '==', right: 'false' },
      ],
    },
    message: 'Entry "{{entry.name}}" is disabled and will never activate.',
  },
  'config/sticky-on-non-events': {
    evaluation: {
      logic: 'AND',
      items: [
        { type: 'leaf', left: 'entry.sticky', operator: '>', right: '0' },
        { type: 'leaf', left: 'entry.selective', operator: '==', right: 'false' },
        { type: 'leaf', left: 'entry.position', operator: '<', right: '4' },
      ],
    },
    message: 'Entry "{{entry.name}}" has sticky={{entry.sticky}} but is not selective and is at position {{entry.position}}.',
  },
  'budget/constant-token-cost': {
    evaluation: {
      logic: 'AND',
      items: [
        { type: 'leaf', left: 'entry.constant', operator: '==', right: 'true' },
        { type: 'leaf', left: 'entry.tokenCount', operator: '>', right: '100' },
      ],
    },
    message: 'Constant entry uses {{entry.tokenCount}} tokens (always included in context)',
  },
  'budget/ignore-budget-usage': {
    evaluation: {
      logic: 'AND',
      items: [
        { type: 'leaf', left: 'entry.ignoreBudget', operator: '==', right: 'true' },
      ],
    },
    message: 'Entry ignores token budget limits',
  },
}
