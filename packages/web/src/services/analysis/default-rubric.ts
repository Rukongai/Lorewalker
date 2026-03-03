import type { Rubric } from '@/types'
import { structureRules } from './rules/structure-rules'
import { configRules } from './rules/config-rules'
import { keywordRules } from './rules/keyword-rules'
import { recursionRules } from './rules/recursion-rules'
import { budgetRules } from './rules/budget-rules'
import { llmRules } from './rules/llm-rules'

export const defaultRubric: Rubric = {
  id: 'default',
  name: 'Default Rubric',
  description: 'Comprehensive health check for SillyTavern lorebooks.',
  rules: [...structureRules, ...configRules, ...keywordRules, ...recursionRules, ...budgetRules, ...llmRules],
  scoringWeights: {
    structure: 0.25,
    config: 0.20,
    keywords: 0.25,
    content: 0.0,
    recursion: 0.15,
    budget: 0.15,
  },
}
