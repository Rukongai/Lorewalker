import type { Rule, Finding, AnalysisContext } from '@/types/analysis'
import { generateId } from '@/lib/uuid'
import {
  // findCycles,
  findOrphans,
  findDeadLinks,
  findIslands,
  computeChainDepths,
} from '@/services/graph-service'

// const circularReferences: Rule = {
//   id: 'recursion/circular-references',
//   name: 'Circular References',
//   description:
//     'Detects entries that form circular trigger chains. Cycles can cause infinite recursion loops during activation unless all participants have preventRecursion enabled.',
//   category: 'recursion',
//   severity: 'error',
//   requiresLLM: false,
//   async evaluate(context: AnalysisContext): Promise<Finding[]> {
//     const { cycles } = findCycles(context.graph)
//     const findings: Finding[] = []
//     const entryNameMap = new Map(context.entries.map((e) => [e.id, e.name]))

//     for (const cycle of cycles) {
//       // Deduplicate: the cycle array includes the start node at both ends
//       const participantIds = [...new Set(cycle)]

//       // Skip cycles where every participant has preventRecursion === true
//       const allPrevented = participantIds.every((id) => {
//         const entry = context.entries.find((e) => e.id === id)
//         return entry?.preventRecursion === true
//       })
//       if (allPrevented) continue

//       const names = participantIds.map((id) => entryNameMap.get(id) ?? id)
//       const arrowNames = [...names, names[0]]

//       findings.push({
//         id: generateId(),
//         ruleId: 'recursion/circular-references',
//         severity: 'error',
//         category: 'recursion',
//         message: `Circular reference detected: ${arrowNames.join(' → ')}`,
//         entryIds: participantIds,
//       })
//     }

//     return findings
//   },
// }

const longChains: Rule = {
  id: 'recursion/long-chains',
  name: 'Long Trigger Chains',
  description:
    'Flags entries that initiate trigger chains exceeding 3 hops deep. Long chains are harder to reason about and may cause unexpected activations.',
  category: 'recursion',
  severity: 'suggestion',
  requiresLLM: false,
  async evaluate(context: AnalysisContext): Promise<Finding[]> {
    const depths = computeChainDepths(context.graph, context.entries)
    const findings: Finding[] = []

    for (const entry of context.entries) {
      const depth = depths.get(entry.id) ?? 0
      if (depth > 3) {
        findings.push({
          id: generateId(),
          ruleId: 'recursion/long-chains',
          severity: 'suggestion',
          category: 'recursion',
          message: `Entry triggers a chain of ${depth} hops (consider flattening)`,
          entryIds: [entry.id],
        })
      }
    }

    return findings
  },
}

const orphanedEntries: Rule = {
  id: 'recursion/orphaned-entries',
  name: 'Orphaned Entries',
  description:
    'Identifies non-constant entries with no incoming edges. These entries can only activate via direct keyword match in the chat and will never be triggered by other lorebook entries.',
  category: 'recursion',
  severity: 'suggestion',
  requiresLLM: false,
  async evaluate(context: AnalysisContext): Promise<Finding[]> {
    const orphanIds = findOrphans(context.entries, context.graph)
    return orphanIds.map((id) => ({
      id: generateId(),
      ruleId: 'recursion/orphaned-entries',
      severity: 'suggestion' as const,
      category: 'recursion' as const,
      message: 'Entry has no incoming edges and is not constant (may never activate)',
      entryIds: [id],
    }))
  },
}

const deadLinks: Rule = {
  id: 'recursion/dead-links',
  name: 'Dead Links',
  description:
    "Detects entries whose content mentions another entry's display name but lacks a keyword edge to it. This usually means the keywords are misconfigured or missing.",
  category: 'recursion',
  severity: 'warning',
  requiresLLM: false,
  async evaluate(context: AnalysisContext): Promise<Finding[]> {
    const links = findDeadLinks(context.entries, context.graph)
    return links.map((link) => ({
      id: generateId(),
      ruleId: 'recursion/dead-links',
      severity: 'warning' as const,
      category: 'recursion' as const,
      message: `Entry mentions '${link.mentionedName}' by name but has no keyword edge to it`,
      entryIds: [link.sourceEntryId],
    }))
  },
}

const preventRecursionCorrectness: Rule = {
  id: 'recursion/prevent-recursion-correctness',
  name: 'Ineffective preventRecursion Flag',
  description:
    'Flags entries that have preventRecursion enabled but no outgoing edges. The flag has no effect when an entry does not trigger any other entries.',
  category: 'recursion',
  severity: 'suggestion',
  requiresLLM: false,
  async evaluate(context: AnalysisContext): Promise<Finding[]> {
    const findings: Finding[] = []

    for (const entry of context.entries) {
      if (!entry.preventRecursion) continue
      const outgoingCount = context.graph.edges.get(entry.id)?.size ?? 0
      if (outgoingCount === 0) {
        findings.push({
          id: generateId(),
          ruleId: 'recursion/prevent-recursion-correctness',
          severity: 'suggestion',
          category: 'recursion',
          message: 'preventRecursion has no effect: entry content does not trigger any other entries',
          entryIds: [entry.id],
        })
      }
    }

    return findings
  },
}

const islandEntries: Rule = {
  id: 'recursion/island-entries',
  name: 'Island Entries',
  description:
    'Identifies non-constant entries with no incoming or outgoing edges. Islands are completely disconnected from the recursion graph and will never participate in trigger chains.',
  category: 'recursion',
  severity: 'suggestion',
  requiresLLM: false,
  async evaluate(context: AnalysisContext): Promise<Finding[]> {
    const islandIds = findIslands(context.entries, context.graph)
    return islandIds.map((id) => ({
      id: generateId(),
      ruleId: 'recursion/island-entries',
      severity: 'suggestion' as const,
      category: 'recursion' as const,
      message: 'Entry has no incoming or outgoing edges and is not constant',
      entryIds: [id],
    }))
  },
}

export const recursionRules: Rule[] = [
  // circularReferences,
  longChains,
  orphanedEntries,
  deadLinks,
  preventRecursionCorrectness,
  islandEntries,
]
