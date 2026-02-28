/**
 * TransformService — bidirectional conversion between CCv3CharacterBook and WorkingEntry[].
 *
 * Pure functions, no state. Synchronous.
 * Dependencies: @character-foundry/character-foundry (countTokens), uuid
 */

import { countTokens } from '@character-foundry/character-foundry/tokenizers'
import type { CCv3CharacterBook } from '@character-foundry/character-foundry/loader'
import { generateId } from '@/lib/uuid'
import type {
  WorkingEntry,
  BookMeta,
  SelectiveLogic,
  EntryPosition,
  CharacterFilter,
} from '@/types'

// SillyTavern-specific fields stored in extensions.sillytavern after normalization
interface STExtensions {
  delay?: number
  cooldown?: number
  sticky?: number
  ignoreBudget?: boolean
  excludeRecursion?: boolean
  preventRecursion?: boolean
  addMemo?: boolean
  useProbability?: boolean
  vectorized?: boolean
  group?: string
  groupOverride?: boolean
  groupWeight?: number
  useGroupScoring?: boolean | null
  scanDepth?: number | null
  caseSensitive?: boolean | null
  matchWholeWords?: boolean | null
  matchPersonaDescription?: boolean
  matchCharacterDescription?: boolean
  matchCharacterPersonality?: boolean
  matchCharacterDepthPrompt?: boolean
  matchScenario?: boolean
  matchCreatorNotes?: boolean
  role?: number
  automationId?: string
  outletName?: string
  displayIndex?: number
  delayUntilRecursion?: number
  triggers?: string[]
  characterFilter?: CharacterFilter
}

// Result of inflate, includes the book-level metadata
export interface InflateResult {
  entries: WorkingEntry[]
  bookMeta: BookMeta
}

/**
 * Converts a CCv3 position value to the EntryPosition (0-4) used internally.
 * CCv3 uses strings ('before_char', 'after_char', 'in_chat') or numeric values.
 * SillyTavern format passes through numeric values directly.
 */
function normalizePosition(
  pos: 'before_char' | 'after_char' | 'in_chat' | number | '' | null | undefined
): EntryPosition {
  if (pos === 'before_char') return 4      // Highest priority, before char
  if (pos === 'after_char') return 0       // After char (default)
  if (pos === 'in_chat') return 3          // At scene depth
  if (typeof pos === 'number' && pos >= 0 && pos <= 4) return pos as EntryPosition
  return 0
}

/**
 * Converts internal EntryPosition (0-4) back to CCv3 numeric position.
 * We store as numeric since that's what SillyTavern reads back.
 */
function denormalizePosition(pos: EntryPosition): number {
  return pos
}

/**
 * Normalizes selectiveLogic from CCv3 ('AND', 'NOT', number) to SelectiveLogic (0-3).
 * SillyTavern uses numeric values 0-3 directly.
 */
function normalizeSelectiveLogic(
  logic: 'AND' | 'NOT' | number | null | undefined
): SelectiveLogic {
  if (logic === 'AND') return 0
  if (logic === 'NOT') return 2
  if (typeof logic === 'number' && logic >= 0 && logic <= 3) return logic as SelectiveLogic
  return 0
}

/**
 * inflate: CCv3CharacterBook → InflateResult
 *
 * Assigns stable UUIDs, computes token counts, flattens SillyTavern extensions.
 */
export function inflate(book: CCv3CharacterBook): InflateResult {
  const entries: WorkingEntry[] = book.entries.map((raw, index) => {
    // Pull SillyTavern-specific extensions if present
    const stExt = (raw.extensions?.['sillytavern'] ?? {}) as STExtensions

    const content = raw.content ?? ''
    const tokenCount = safeCountTokens(content)

    const entry: WorkingEntry = {
      id: generateId(),
      uid: typeof raw.id === 'number' ? raw.id : index,

      name: raw.name ?? raw.comment ?? '',
      content,
      keys: raw.keys ?? [],
      secondaryKeys: raw.secondary_keys ?? [],

      constant: raw.constant ?? false,
      selective: raw.selective ?? false,
      selectiveLogic: normalizeSelectiveLogic(raw.selective_logic),
      enabled: raw.enabled,

      position: normalizePosition(raw.position),
      order: raw.insertion_order,
      depth: raw.depth ?? 4,

      delay: stExt.delay ?? 0,
      cooldown: stExt.cooldown ?? 0,
      sticky: stExt.sticky ?? 0,
      probability: raw.probability ?? 100,

      preventRecursion: stExt.preventRecursion ?? false,
      excludeRecursion: stExt.excludeRecursion ?? false,
      ignoreBudget: stExt.ignoreBudget ?? false,

      group: stExt.group ?? '',
      groupOverride: stExt.groupOverride ?? false,
      groupWeight: stExt.groupWeight ?? 100,
      useGroupScoring: stExt.useGroupScoring ?? null,

      scanDepth: stExt.scanDepth ?? null,
      caseSensitive: stExt.caseSensitive ?? null,
      matchWholeWords: stExt.matchWholeWords ?? null,

      matchPersonaDescription: stExt.matchPersonaDescription ?? false,
      matchCharacterDescription: stExt.matchCharacterDescription ?? false,
      matchCharacterPersonality: stExt.matchCharacterPersonality ?? false,
      matchCharacterDepthPrompt: stExt.matchCharacterDepthPrompt ?? false,
      matchScenario: stExt.matchScenario ?? false,
      matchCreatorNotes: stExt.matchCreatorNotes ?? false,

      role: stExt.role ?? 0,
      automationId: stExt.automationId ?? '',
      outletName: stExt.outletName ?? '',
      vectorized: stExt.vectorized ?? false,
      useProbability: stExt.useProbability ?? true,
      addMemo: stExt.addMemo ?? true,
      displayIndex: stExt.displayIndex ?? 0,
      delayUntilRecursion: stExt.delayUntilRecursion ?? 0,
      triggers: Array.isArray(stExt.triggers) ? stExt.triggers : [],
      characterFilter: stExt.characterFilter ?? { isExclude: false, names: [], tags: [] },

      tokenCount,

      // Passthrough: store everything except 'sillytavern' key for round-trip
      extensions: buildPassthrough(raw.extensions),
    }

    return entry
  })

  const stBookExt = (book.extensions?.['sillytavern'] ?? {}) as Record<string, unknown>

  const bookMeta: BookMeta = {
    name: book.name ?? '',
    description: book.description ?? '',
    scanDepth: book.scan_depth ?? 4,
    tokenBudget: book.token_budget ?? 4096,
    recursiveScan: book.recursive_scanning ?? false,
    caseSensitive: (stBookExt['case_sensitive'] as boolean | undefined) ?? false,
    matchWholeWords: (stBookExt['match_whole_words'] as boolean | undefined) ?? false,
    minActivations: (stBookExt['min_activations'] as number | undefined) ?? 0,
    maxDepth: (stBookExt['max_depth'] as number | undefined) ?? 0,
    maxRecursionSteps: (stBookExt['max_recursion_steps'] as number | undefined) ?? 0,
    insertionStrategy: ((stBookExt['insertion_strategy'] as string | undefined) === 'evenly' ? 'evenly' : 'none'),
    includeNames: (stBookExt['include_names'] as boolean | undefined) ?? false,
    useGroupScoring: (stBookExt['use_group_scoring'] as boolean | undefined) ?? false,
    alertOnOverflow: (stBookExt['alert_on_overflow'] as boolean | undefined) ?? false,
    budgetCap: (stBookExt['budget_cap'] as number | undefined) ?? 0,
    extensions: book.extensions ?? {},
  }

  return { entries, bookMeta }
}

/**
 * deflate: WorkingEntry[] + BookMeta → CCv3CharacterBook
 *
 * Reconstructs CCv3 structure, rebuilds extensions.sillytavern, assigns sequential UIDs.
 */
export function deflate(entries: WorkingEntry[], bookMeta: BookMeta): CCv3CharacterBook {
  // Reassign UIDs sequentially (0, 1, 2, ...) to maintain consistency
  const deflatedEntries = entries.map((entry, index) => {
    const stExt: STExtensions & Record<string, unknown> = {
      delay: entry.delay,
      cooldown: entry.cooldown,
      sticky: entry.sticky,
      ignoreBudget: entry.ignoreBudget,
      excludeRecursion: entry.excludeRecursion,
      preventRecursion: entry.preventRecursion,
      group: entry.group,
      groupOverride: entry.groupOverride,
      groupWeight: entry.groupWeight,
      useGroupScoring: entry.useGroupScoring,
      scanDepth: entry.scanDepth,
      caseSensitive: entry.caseSensitive,
      matchWholeWords: entry.matchWholeWords,
      matchPersonaDescription: entry.matchPersonaDescription,
      matchCharacterDescription: entry.matchCharacterDescription,
      matchCharacterPersonality: entry.matchCharacterPersonality,
      matchCharacterDepthPrompt: entry.matchCharacterDepthPrompt,
      matchScenario: entry.matchScenario,
      matchCreatorNotes: entry.matchCreatorNotes,
      role: entry.role,
      automationId: entry.automationId,
      outletName: entry.outletName,
      vectorized: entry.vectorized,
      useProbability: entry.useProbability,
      addMemo: entry.addMemo,
      displayIndex: entry.displayIndex,
      delayUntilRecursion: entry.delayUntilRecursion,
      triggers: entry.triggers,
      characterFilter: entry.characterFilter,
    }

    // Rebuild extensions: passthrough + sillytavern
    const extensions: Record<string, unknown> = {
      ...entry.extensions,
      sillytavern: stExt,
    }

    return {
      keys: entry.keys,
      content: entry.content,
      enabled: entry.enabled,
      insertion_order: entry.order,
      name: entry.name,
      id: index,           // Sequential UID for round-trip fidelity
      selective: entry.selective,
      secondary_keys: entry.secondaryKeys,
      constant: entry.constant,
      position: denormalizePosition(entry.position),
      extensions,
      probability: entry.probability,
      depth: entry.depth,
      selective_logic: entry.selectiveLogic,
    }
  })

  const stBookExt: Record<string, unknown> = {
    ...((bookMeta.extensions['sillytavern'] as Record<string, unknown> | undefined) ?? {}),
    case_sensitive: bookMeta.caseSensitive,
    match_whole_words: bookMeta.matchWholeWords,
    min_activations: bookMeta.minActivations,
    max_depth: bookMeta.maxDepth,
    max_recursion_steps: bookMeta.maxRecursionSteps,
    insertion_strategy: bookMeta.insertionStrategy,
    include_names: bookMeta.includeNames,
    use_group_scoring: bookMeta.useGroupScoring,
    alert_on_overflow: bookMeta.alertOnOverflow,
    budget_cap: bookMeta.budgetCap,
  }

  const bookExtensions: Record<string, unknown> = {
    ...bookMeta.extensions,
    sillytavern: stBookExt,
  }

  const book: CCv3CharacterBook = {
    name: bookMeta.name,
    description: bookMeta.description,
    scan_depth: bookMeta.scanDepth,
    token_budget: bookMeta.tokenBudget,
    recursive_scanning: bookMeta.recursiveScan,
    extensions: bookExtensions,
    entries: deflatedEntries as CCv3CharacterBook['entries'],
  }

  return book
}

/**
 * Counts tokens in content, falling back to simple estimate if library throws.
 */
function safeCountTokens(text: string): number {
  try {
    return countTokens(text)
  } catch {
    // Fallback: ~4 chars per token
    return Math.ceil(text.length / 4)
  }
}

/**
 * Extracts passthrough extensions (all keys except 'sillytavern').
 * This preserves unknown extensions for round-trip fidelity.
 */
function buildPassthrough(
  extensions: Record<string, unknown> | undefined
): Record<string, unknown> {
  if (!extensions) return {}
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(extensions)) {
    if (key !== 'sillytavern') {
      result[key] = value
    }
  }
  return result
}
