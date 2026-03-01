import type {
  WorkingEntry,
  ActivationEngine,
  ActivationResult,
  ActivatedEntry,
  SkippedEntry,
  RecursionStep,
  SimulationContext,
  TimedEffectState,
  EngineFeature,
} from '@/types'
import { doesEntryMatchText } from '../keyword-matching'

function makeEmptyTimedEffectState(): TimedEffectState {
  return {
    stickyEntries: new Map(),
    cooldownEntries: new Map(),
    messageCount: 0,
  }
}

function buildScanText(context: SimulationContext): string {
  const { messages, scanDepth, includeNames, characterName, userName } = context
  // Take last scanDepth messages (newest-to-oldest order for scanning)
  const relevant = messages.slice(-scanDepth)
  return relevant
    .map((msg) => {
      if (!includeNames) return msg.content
      let prefix = ''
      if (msg.name) {
        prefix = `${msg.name}: `
      } else if (msg.role === 'user') {
        prefix = userName ? `${userName}: ` : ''
      } else if (msg.role === 'assistant') {
        prefix = characterName ? `${characterName}: ` : ''
      }
      return prefix + msg.content
    })
    .join('\n')
}

function rollProbability(probability: number): boolean {
  return Math.random() * 100 < probability
}

function passesSelectiveLogic(
  entry: WorkingEntry,
  scanText: string,
  context: SimulationContext,
): boolean {
  if (!entry.selective) return true

  const opts = {
    caseSensitive: context.caseSensitive,
    matchWholeWords: context.matchWholeWords,
  }

  // Build a temporary entry-like object for secondary key matching
  const secondaryEntry: WorkingEntry = { ...entry, keys: entry.secondaryKeys }
  const secondaryMatches = doesEntryMatchText(secondaryEntry, scanText, opts)
  const matchedSecondaryKeys = new Set(secondaryMatches.map((m) => m.keyword))

  switch (entry.selectiveLogic) {
    case 0: // AND ANY: at least one secondary key matches
      return matchedSecondaryKeys.size > 0
    case 1: // AND ALL: all secondary keys match
      return entry.secondaryKeys.every((k) => matchedSecondaryKeys.has(k))
    case 2: // NOT ANY: no secondary key matches
      return matchedSecondaryKeys.size === 0
    case 3: // NOT ALL: not all secondary keys match
      return !entry.secondaryKeys.every((k) => matchedSecondaryKeys.has(k))
    default:
      return true
  }
}

function simulate(
  entries: WorkingEntry[],
  context: SimulationContext,
  priorState?: TimedEffectState,
): ActivationResult {
  const timedState = priorState ?? makeEmptyTimedEffectState()
  const newMessageCount = timedState.messageCount + 1

  const matchOpts = {
    caseSensitive: context.caseSensitive,
    matchWholeWords: context.matchWholeWords,
  }

  const scanText = buildScanText(context)

  const activatedEntries: ActivatedEntry[] = []
  const skippedEntries: SkippedEntry[] = []
  const recursionTrace: RecursionStep[] = []

  const activatedIds = new Set<string>()

  // Step 1: Separate constants from keyword-candidates
  const constants = entries.filter((e) => e.constant && e.enabled)
  const candidates = entries.filter((e) => !e.constant && e.enabled)

  // Activate constants immediately
  for (const entry of constants) {
    activatedIds.add(entry.id)
    activatedEntries.push({
      entryId: entry.id,
      activatedBy: 'constant',
      triggerChain: [],
      matchedKeywords: [],
      matchedInMessage: -1,
      tokenCost: entry.tokenCount,
      insertionPosition: entry.position,
      insertionOrder: entry.order,
    })
  }

  // Step 2: Primary keyword scan on candidates
  const primaryActivated: { entry: WorkingEntry; matchedKeywords: string[] }[] = []

  for (const entry of candidates) {
    // Check timed effects: disabled
    if (!entry.enabled) {
      skippedEntries.push({ entryId: entry.id, reason: 'disabled', matchedKeywords: [] })
      continue
    }

    // Check cooldown
    const cooldownVal = entry.cooldown ?? 0
    if (cooldownVal > 0) {
      const lastDeactivated = timedState.cooldownEntries.get(entry.id)
      if (lastDeactivated !== undefined && newMessageCount - lastDeactivated <= cooldownVal) {
        skippedEntries.push({ entryId: entry.id, reason: 'cooldown', matchedKeywords: [] })
        continue
      }
    }

    // Check delay
    const delayVal = entry.delay ?? 0
    if (delayVal > 0 && newMessageCount <= delayVal) {
      skippedEntries.push({ entryId: entry.id, reason: 'delay', matchedKeywords: [] })
      continue
    }

    // Check sticky (carry forward regardless of keywords)
    const stickyRemaining = timedState.stickyEntries.get(entry.id)
    if (stickyRemaining !== undefined && stickyRemaining > 0) {
      activatedIds.add(entry.id)
      activatedEntries.push({
        entryId: entry.id,
        activatedBy: 'keyword',
        triggerChain: [],
        matchedKeywords: ['[sticky]'],
        matchedInMessage: -1,
        tokenCost: entry.tokenCount,
        insertionPosition: entry.position,
        insertionOrder: entry.order,
      })
      continue
    }

    // Primary keyword match
    const matches = doesEntryMatchText(entry, scanText, matchOpts)
    if (matches.length === 0) continue

    const matchedKeywords = [...new Set(matches.map((m) => m.keyword))]

    // Step 3: Selective logic filtering
    if (!passesSelectiveLogic(entry, scanText, context)) continue

    primaryActivated.push({ entry, matchedKeywords })
  }

  // Step 5: Probability rolls for primary candidates
  for (const { entry, matchedKeywords } of primaryActivated) {
    if (entry.useProbability && entry.probability < 100) {
      if (!rollProbability(entry.probability)) {
        skippedEntries.push({ entryId: entry.id, reason: 'probability-failed', matchedKeywords })
        continue
      }
    }
    activatedIds.add(entry.id)
    activatedEntries.push({
      entryId: entry.id,
      activatedBy: 'keyword',
      triggerChain: [],
      matchedKeywords,
      matchedInMessage: 0,
      tokenCost: entry.tokenCount,
      insertionPosition: entry.position,
      insertionOrder: entry.order,
    })
  }

  // Step 6: Priority sort — constants first, then by order descending
  activatedEntries.sort((a, b) => {
    if (a.activatedBy === 'constant' && b.activatedBy !== 'constant') return -1
    if (a.activatedBy !== 'constant' && b.activatedBy === 'constant') return 1
    return b.insertionOrder - a.insertionOrder
  })

  // Step 7: Recursion scan
  const maxSteps = context.maxRecursionSteps === 0 ? Infinity : context.maxRecursionSteps
  const notYetActivated = () => entries.filter((e) => !activatedIds.has(e.id) && e.enabled && !e.excludeRecursion)

  // We'll scan newly activated entries' content for additional keyword triggers
  let toScan = activatedEntries.filter((ae) => {
    const entry = entries.find((e) => e.id === ae.entryId)
    return entry && !entry.preventRecursion
  })

  let stepIndex = 0
  while (toScan.length > 0 && stepIndex < maxSteps) {
    const newlyActivated: ActivatedEntry[] = []

    for (const activatedEntry of toScan) {
      const sourceEntry = entries.find((e) => e.id === activatedEntry.entryId)
      if (!sourceEntry || sourceEntry.preventRecursion) continue

      const contentText = sourceEntry.content
      const stepActivated: string[] = []
      const matchDetails: { entryId: string; keyword: string }[] = []

      for (const candidate of notYetActivated()) {
        const matches = doesEntryMatchText(candidate, contentText, matchOpts)
        if (matches.length === 0) continue

        const matchedKeywords = [...new Set(matches.map((m) => m.keyword))]

        // Selective logic
        if (!passesSelectiveLogic(candidate, contentText, context)) continue

        // Probability roll
        if (candidate.useProbability && candidate.probability < 100) {
          if (!rollProbability(candidate.probability)) {
            skippedEntries.push({ entryId: candidate.id, reason: 'probability-failed', matchedKeywords })
            continue
          }
        }

        activatedIds.add(candidate.id)
        const newEntry: ActivatedEntry = {
          entryId: candidate.id,
          activatedBy: 'recursion',
          triggerChain: [sourceEntry.id],
          matchedKeywords,
          matchedInMessage: -1,
          tokenCost: candidate.tokenCount,
          insertionPosition: candidate.position,
          insertionOrder: candidate.order,
        }
        newlyActivated.push(newEntry)
        stepActivated.push(candidate.id)
        for (const kw of matchedKeywords) {
          matchDetails.push({ entryId: candidate.id, keyword: kw })
        }
      }

      if (stepActivated.length > 0) {
        recursionTrace.push({
          step: stepIndex,
          scannedEntryId: sourceEntry.id,
          activatedEntryIds: stepActivated,
          matchDetails,
        })
      }
    }

    if (newlyActivated.length === 0) break

    activatedEntries.push(...newlyActivated)
    // Only scan newly activated entries that don't prevent recursion
    toScan = newlyActivated.filter((ae) => {
      const entry = entries.find((e) => e.id === ae.entryId)
      return entry && !entry.preventRecursion
    })
    stepIndex++
  }

  // Step 8: Token budget
  let totalTokens = 0
  let budgetExhausted = false
  const finalActivated: ActivatedEntry[] = []
  const budgetSkipped: SkippedEntry[] = []

  for (const ae of activatedEntries) {
    const entry = entries.find((e) => e.id === ae.entryId)
    if (!entry) continue

    if (!entry.ignoreBudget && totalTokens + ae.tokenCost > context.tokenBudget) {
      budgetExhausted = true
      budgetSkipped.push({
        entryId: ae.entryId,
        reason: 'budget-exhausted',
        matchedKeywords: ae.matchedKeywords,
      })
      continue
    }

    totalTokens += ae.tokenCost
    finalActivated.push(ae)
  }

  skippedEntries.push(...budgetSkipped)

  // Update timed effect state
  const newTimedState: TimedEffectState = {
    stickyEntries: new Map(timedState.stickyEntries),
    cooldownEntries: new Map(timedState.cooldownEntries),
    messageCount: newMessageCount,
  }

  // Update sticky entries
  for (const ae of finalActivated) {
    const entry = entries.find((e) => e.id === ae.entryId)
    if (!entry) continue
    const stickyVal = entry.sticky ?? 0
    if (stickyVal > 0) {
      newTimedState.stickyEntries.set(entry.id, stickyVal)
    }
  }
  // Decrement sticky counters for entries NOT activated this turn
  for (const [id, remaining] of newTimedState.stickyEntries) {
    if (!activatedIds.has(id)) {
      if (remaining <= 1) {
        newTimedState.stickyEntries.delete(id)
        newTimedState.cooldownEntries.set(id, newMessageCount)
      } else {
        newTimedState.stickyEntries.set(id, remaining - 1)
      }
    }
  }

  return {
    activatedEntries: finalActivated,
    skippedEntries,
    totalTokens,
    budgetRemaining: context.tokenBudget - totalTokens,
    budgetExhausted,
    recursionTrace,
    timedEffectState: newTimedState,
  }
}

export const sillyTavernEngine: ActivationEngine = {
  id: 'sillytavern',
  name: 'SillyTavern',
  description: 'Simulates SillyTavern lorebook activation logic',
  supportedFeatures: [
    'selective-logic',
    'recursion',
    'prevent-recursion',
    'timed-effects',
    'probability',
    'budget-management',
    'regex-keys',
  ] as EngineFeature[],
  simulate,
}
