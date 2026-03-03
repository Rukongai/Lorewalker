import type {
  WorkingEntry,
  ActivationEngine,
  ActivationResult,
  SimMessage,
  SimulationContext,
  SimulationSettings,
  TimedEffectState,
  ConversationStep,
} from '../types'
import { sillyTavernEngine } from './simulator/engines/sillytavern-engine'

export function simulate(
  entries: WorkingEntry[],
  context: SimulationContext,
  priorState?: TimedEffectState,
  engine: ActivationEngine = sillyTavernEngine,
): ActivationResult {
  return engine.simulate(entries, context, priorState)
}

export function simulateConversation(
  entries: WorkingEntry[],
  messages: SimMessage[],
  settings: SimulationSettings,
  engine: ActivationEngine = sillyTavernEngine,
): ConversationStep[] {
  const steps: ConversationStep[] = []
  let timedState: TimedEffectState | undefined = undefined

  for (let i = 0; i < messages.length; i++) {
    const messageSlice = messages.slice(0, i + 1)
    const context: SimulationContext = {
      messages: messageSlice,
      scanDepth: settings.defaultScanDepth,
      tokenBudget: settings.defaultTokenBudget,
      caseSensitive: settings.defaultCaseSensitive,
      matchWholeWords: settings.defaultMatchWholeWords,
      maxRecursionSteps: settings.defaultMaxRecursionSteps,
      includeNames: settings.defaultIncludeNames,
    }
    const result = engine.simulate(entries, context, timedState)
    timedState = result.timedEffectState
    steps.push({
      messageIndex: i,
      message: messages[i],
      result,
    })
  }

  return steps
}
