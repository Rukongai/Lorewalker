// Rules that cannot be copied into the Rule Editor because their logic depends on
// cross-entry comparisons, graph traversal, or LLM evaluation — none of which can
// be expressed in the ConditionBuilder.
export const INCOMPATIBLE_RULE_IDS: ReadonlySet<string> = new Set([
  // Structure — cross-entry
  'structure/uid-consistency',
  // Keywords — cross-entry
  'keywords/duplicate-keywords',
  'keywords/substring-overlap',
  // Recursion — graph-based (all 5)
  'recursion/long-chains',
  'recursion/orphaned-entries',
  'recursion/dead-links',
  'recursion/prevent-recursion-correctness',
  'recursion/island-entries',
  // Budget — multi-entry aggregate
  'budget/total-constant-cost',
  'budget/constant-count',
  // Content + keyword LLM rules
  'content/quality-assessment',
  'content/structure-check',
  'content/scope-check',
  'keywords/missing-variations',
])
