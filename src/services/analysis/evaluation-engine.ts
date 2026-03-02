import type { WorkingEntry, BookMeta } from '@/types'
import type {
  ComparisonOp,
  ConditionLeaf,
  ConditionGroup,
  SerializedEvaluation,
} from '@/types'

export interface EvaluationContext {
  entry: WorkingEntry;
  book: BookMeta;
}

/**
 * Resolves a dot-path variable like "entry.keys.length" against an EvaluationContext.
 * Returns undefined if the path cannot be resolved.
 */
export function resolveVariable(path: string, ctx: EvaluationContext): unknown {
  const parts = path.split('.')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = ctx
  for (const part of parts) {
    if (current === null || current === undefined) return undefined
    current = current[part]
  }
  return current
}

/**
 * Coerces a string literal to match the type of the left-hand value for numeric comparisons.
 */
function coerce(left: unknown, right: string): unknown {
  if (typeof left === 'number') {
    const n = Number(right)
    return isNaN(n) ? right : n
  }
  if (typeof left === 'boolean') {
    if (right === 'true') return true
    if (right === 'false') return false
  }
  return right
}

/** Evaluates a single leaf condition. */
export function evaluateLeaf(leaf: ConditionLeaf, ctx: EvaluationContext): boolean {
  const left = resolveVariable(leaf.left, ctx)
  const op: ComparisonOp = leaf.operator
  const rightRaw = leaf.right

  switch (op) {
    case '==':
      // eslint-disable-next-line eqeqeq
      return left == coerce(left, rightRaw)
    case '!=':
      // eslint-disable-next-line eqeqeq
      return left != coerce(left, rightRaw)
    case '>':
      return typeof left === 'number' && left > Number(rightRaw)
    case '<':
      return typeof left === 'number' && left < Number(rightRaw)
    case '>=':
      return typeof left === 'number' && left >= Number(rightRaw)
    case '<=':
      return typeof left === 'number' && left <= Number(rightRaw)
    case 'includes':
      return typeof left === 'string' && left.includes(rightRaw)
    case 'not-includes':
      return typeof left === 'string' && !left.includes(rightRaw)
    case 'matches': {
      if (typeof left !== 'string') return false
      try {
        return new RegExp(rightRaw).test(left)
      } catch {
        return false
      }
    }
    default:
      return false
  }
}

/** Evaluates a group of conditions joined by AND or OR, with optional negation. */
export function evaluateGroup(group: ConditionGroup, ctx: EvaluationContext): boolean {
  let result: boolean
  if (group.logic === 'AND') {
    result = group.conditions.every((leaf) => evaluateLeaf(leaf, ctx))
  } else {
    result = group.conditions.some((leaf) => evaluateLeaf(leaf, ctx))
  }
  return group.negate ? !result : result
}

/**
 * Evaluates a full SerializedEvaluation (root-level AND/OR of leaves and groups).
 * Returns true if the evaluation passes (i.e. the condition is met / issue is detected).
 */
export function evaluateCondition(
  evaluation: SerializedEvaluation,
  ctx: EvaluationContext
): boolean {
  if (evaluation.items.length === 0) return false

  const results = evaluation.items.map((item) => {
    if (item.type === 'leaf') return evaluateLeaf(item, ctx)
    return evaluateGroup(item, ctx)
  })

  if (evaluation.logic === 'AND') {
    return results.every(Boolean)
  }
  return results.some(Boolean)
}

/**
 * Interpolates a message template string by replacing {{variable.path}} tokens
 * with resolved values from the EvaluationContext.
 */
export function interpolateMessage(template: string, ctx: EvaluationContext): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, path: string) => {
    const value = resolveVariable(path.trim(), ctx)
    if (value === undefined || value === null) return ''
    return String(value)
  })
}
