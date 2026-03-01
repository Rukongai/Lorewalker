import type { EntryPosition } from './entry'

export type EngineFeature =
  | 'selective-logic'
  | 'recursion'
  | 'prevent-recursion'
  | 'timed-effects'
  | 'probability'
  | 'budget-management'
  | 'regex-keys'
  | 'inclusion-groups';

export interface SimulationContext {
  messages: SimMessage[];
  scanDepth: number;
  tokenBudget: number;
  caseSensitive: boolean;
  matchWholeWords: boolean;
  maxRecursionSteps: number;
  includeNames: boolean;
  characterName?: string;
  userName?: string;
}

export interface SimMessage {
  role: 'user' | 'assistant' | 'system';
  name?: string;
  content: string;
}

export interface SimulationSettings {
  defaultScanDepth: number;
  defaultTokenBudget: number;
  defaultCaseSensitive: boolean;
  defaultMatchWholeWords: boolean;
  defaultMaxRecursionSteps: number;
  defaultIncludeNames: boolean;
}

export interface TimedEffectState {
  stickyEntries: Map<string, number>;
  cooldownEntries: Map<string, number>;
  messageCount: number;
}

export interface ActivatedEntry {
  entryId: string;
  activatedBy: 'constant' | 'keyword' | 'recursion';
  triggerChain: string[];
  matchedKeywords: string[];
  matchedInMessage: number;
  tokenCost: number;
  insertionPosition: EntryPosition;
  insertionOrder: number;
}

export interface SkippedEntry {
  entryId: string;
  reason: 'budget-exhausted' | 'probability-failed' | 'cooldown' | 'delay' | 'disabled';
  matchedKeywords: string[];
}

export interface RecursionStep {
  step: number;
  scannedEntryId: string;
  activatedEntryIds: string[];
  matchDetails: { entryId: string; keyword: string }[];
}

export interface ActivationResult {
  activatedEntries: ActivatedEntry[];
  skippedEntries: SkippedEntry[];
  totalTokens: number;
  budgetRemaining: number;
  budgetExhausted: boolean;
  recursionTrace: RecursionStep[];
  timedEffectState: TimedEffectState;
}

export interface ConversationStep {
  messageIndex: number;
  message: SimMessage;
  result: ActivationResult;
}

export interface ActivationEngine {
  id: string;
  name: string;
  description: string;
  supportedFeatures: EngineFeature[];
  simulate(
    entries: import('./entry').WorkingEntry[],
    context: SimulationContext,
    priorState?: TimedEffectState,
  ): ActivationResult;
}
