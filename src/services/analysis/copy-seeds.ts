import type { SerializedEvaluation } from '@/types'

export const RULE_SEEDS: Record<string, SerializedEvaluation> = {
  'keywords/empty-keys': {
    logic: 'AND',
    items: [
      { type: 'leaf', left: 'entry.constant', operator: '==', right: 'false' },
      { type: 'leaf', left: 'entry.keys.length', operator: '==', right: '0' },
    ],
  },
  'keywords/keyword-count': {
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
  'keywords/redundant-constant-keys': {
    logic: 'AND',
    items: [
      { type: 'leaf', left: 'entry.constant', operator: '==', right: 'true' },
      { type: 'leaf', left: 'entry.keys.length', operator: '>', right: '0' },
    ],
  },
  'structure/blank-name': {
    logic: 'AND',
    items: [
      { type: 'leaf', left: 'entry.name', operator: '==', right: '' },
    ],
  },
  'config/selective-logic': {
    logic: 'AND',
    items: [
      { type: 'leaf', left: 'entry.selective', operator: '==', right: 'true' },
      { type: 'leaf', left: 'entry.secondaryKeys.length', operator: '==', right: '0' },
    ],
  },
  'config/unused-secondary': {
    logic: 'AND',
    items: [
      { type: 'leaf', left: 'entry.secondaryKeys.length', operator: '>', right: '0' },
      { type: 'leaf', left: 'entry.selective', operator: '==', right: 'false' },
    ],
  },
  'config/rule-content-mismatch': {
    logic: 'AND',
    items: [
      { type: 'leaf', left: 'entry.content', operator: 'matches', right: '^\\s*RULE:' },
      { type: 'leaf', left: 'entry.constant', operator: '==', right: 'false' },
    ],
  },
  'config/disabled-entries': {
    logic: 'AND',
    items: [
      { type: 'leaf', left: 'entry.enabled', operator: '==', right: 'false' },
    ],
  },
  'config/sticky-on-non-events': {
    logic: 'AND',
    items: [
      { type: 'leaf', left: 'entry.sticky', operator: '>', right: '0' },
      { type: 'leaf', left: 'entry.selective', operator: '==', right: 'false' },
      { type: 'leaf', left: 'entry.position', operator: '<', right: '4' },
    ],
  },
  'budget/constant-token-cost': {
    logic: 'AND',
    items: [
      { type: 'leaf', left: 'entry.constant', operator: '==', right: 'true' },
      { type: 'leaf', left: 'entry.tokenCount', operator: '>', right: '100' },
    ],
  },
  'budget/ignore-budget-usage': {
    logic: 'AND',
    items: [
      { type: 'leaf', left: 'entry.ignoreBudget', operator: '==', right: 'true' },
    ],
  },
}
