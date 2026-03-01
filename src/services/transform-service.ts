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
  LorebookDefaults,
} from '@/types'

// SillyTavern-specific fields stored in extensions.sillytavern after normalization
interface STExtensions {
  delay?: number | null
  cooldown?: number | null
  sticky?: number | null
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
  displayIndex?: number | null
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
 * Converts a CCv3 position value to the EntryPosition (0–7) used internally.
 * CCv3 uses strings ('before_char', 'after_char', 'in_chat') or numeric values.
 * SillyTavern format passes through numeric values (0–7) directly.
 *
 * Position semantics:
 *   0 — Before Char Defs
 *   1 — After Char Defs (default)
 *   2 — Before Example Messages
 *   3 — After Example Messages
 *   4 — @ Depth (uses depth + role fields)
 *   5 — Top of Author's Note
 *   6 — Bottom of Author's Note
 *   7 — Outlet (manual placement via {{outlet::Name}} macro)
 */
function normalizePosition(
  pos: 'before_char' | 'after_char' | 'in_chat' | number | '' | null | undefined
): EntryPosition {
  if (pos === 'before_char') return 0      // Before Char Defs
  if (pos === 'after_char') return 1       // After Char Defs (default)
  if (pos === 'in_chat') return 4          // @ Depth
  if (typeof pos === 'number' && pos >= 0 && pos <= 7) return pos as EntryPosition
  return 1
}

/**
 * Converts internal EntryPosition (0–7) back to CCv3 numeric position.
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

// Raw SillyTavern entry as it appears in the JSON lorebook file
export type RawSTEntry = {
  uid?: number
  key?: string[]
  keysecondary?: string[]
  comment?: string
  content?: string
  constant?: boolean
  selective?: boolean
  selectiveLogic?: number
  addMemo?: boolean
  order?: number
  position?: number
  disable?: boolean
  probability?: number
  useProbability?: boolean
  depth?: number
  delay?: number
  cooldown?: number
  sticky?: number
  vectorized?: boolean
  ignoreBudget?: boolean
  excludeRecursion?: boolean
  preventRecursion?: boolean
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
  displayIndex?: number | null
  delayUntilRecursion?: number
  triggers?: string[]
  characterFilter?: { isExclude: boolean; names: string[]; tags: string[] }
}

// Raw SillyTavern lorebook (top-level JSON structure)
export type RawSTBook = {
  name?: string
  description?: string
  scan_depth?: number
  token_budget?: number
  recursive_scanning?: boolean
  extensions?: {
    sillytavern?: Record<string, unknown>
    [key: string]: unknown
  }
  entries?: Record<string, RawSTEntry>
}

/**
 * inflate: CCv3CharacterBook → InflateResult
 *
 * Assigns stable UUIDs, computes token counts, flattens SillyTavern extensions.
 * Optional defaults fill in missing book-level fields from the imported file.
 */
export function inflate(book: CCv3CharacterBook, defaults?: LorebookDefaults): InflateResult {
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
      selective: (raw.selective ?? false) && (raw.secondary_keys?.length ?? 0) > 0,
      selectiveLogic: normalizeSelectiveLogic(raw.selective_logic),
      enabled: raw.enabled,

      position: normalizePosition(raw.position),
      order: raw.insertion_order,
      depth: raw.depth ?? 4,

      delay: stExt.delay ?? null,
      cooldown: stExt.cooldown ?? null,
      sticky: stExt.sticky ?? null,
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
      addMemo: stExt.addMemo ?? false,
      displayIndex: stExt.displayIndex ?? null,
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
    scanDepth: book.scan_depth ?? defaults?.scanDepth ?? 4,
    tokenBudget: book.token_budget ?? 4096,
    recursiveScan: book.recursive_scanning ?? defaults?.recursiveScan ?? false,
    caseSensitive: (stBookExt['case_sensitive'] as boolean | undefined) ?? defaults?.caseSensitive ?? false,
    matchWholeWords: (stBookExt['match_whole_words'] as boolean | undefined) ?? defaults?.matchWholeWords ?? false,
    minActivations: (stBookExt['min_activations'] as number | undefined) ?? defaults?.minActivations ?? 0,
    maxDepth: (stBookExt['max_depth'] as number | undefined) ?? defaults?.maxDepth ?? 0,
    maxRecursionSteps: (stBookExt['max_recursion_steps'] as number | undefined) ?? defaults?.maxRecursionSteps ?? 0,
    insertionStrategy: (() => {
      const s = stBookExt['insertion_strategy'] as string | undefined
      if (s === 'character_lore_first') return 'character_lore_first'
      if (s === 'global_lore_first') return 'global_lore_first'
      if (s !== undefined) return 'evenly'
      return defaults?.insertionStrategy ?? 'evenly'
    })(),
    includeNames: (stBookExt['include_names'] as boolean | undefined) ?? defaults?.includeNames ?? false,
    useGroupScoring: (stBookExt['use_group_scoring'] as boolean | undefined) ?? defaults?.useGroupScoring ?? false,
    alertOnOverflow: (stBookExt['alert_on_overflow'] as boolean | undefined) ?? defaults?.alertOnOverflow ?? false,
    budgetCap: (stBookExt['budget_cap'] as number | undefined) ?? defaults?.budgetCap ?? 0,
    extensions: book.extensions ?? {},
  }

  return { entries, bookMeta }
}

/**
 * inflateFromRawST: RawSTBook → InflateResult
 *
 * Parses a SillyTavern lorebook JSON directly, bypassing parseLorebook() normalization.
 * Avoids lossy position mapping and missing-field gaps in character-foundry's ST normalizer.
 * Optional defaults fill in missing book-level fields from the imported file.
 */
export function inflateFromRawST(raw: RawSTBook, defaults?: LorebookDefaults): InflateResult {
  const rawEntries = raw.entries ?? {}
  const entries: WorkingEntry[] = Object.values(rawEntries).map((e, index) => {
    const content = e.content ?? ''
    const tokenCount = safeCountTokens(content)

    const entry: WorkingEntry = {
      id: generateId(),
      uid: e.uid ?? index,

      name: e.comment ?? '',
      content,
      keys: e.key ?? [],
      secondaryKeys: e.keysecondary ?? [],

      constant: e.constant ?? false,
      selective: (e.selective ?? false) && (e.keysecondary?.length ?? 0) > 0,
      selectiveLogic: normalizeSelectiveLogic(e.selectiveLogic ?? 0),
      enabled: !(e.disable ?? false),

      position: normalizePosition(e.position ?? 0),
      order: e.order ?? 0,
      depth: e.depth ?? 4,

      delay: e.delay ?? null,
      cooldown: e.cooldown ?? null,
      sticky: e.sticky ?? null,
      probability: e.probability ?? 100,

      preventRecursion: e.preventRecursion ?? false,
      excludeRecursion: e.excludeRecursion ?? false,
      ignoreBudget: e.ignoreBudget ?? false,

      group: e.group ?? '',
      groupOverride: e.groupOverride ?? false,
      groupWeight: e.groupWeight ?? 100,
      useGroupScoring: e.useGroupScoring ?? null,

      scanDepth: e.scanDepth ?? null,
      caseSensitive: e.caseSensitive ?? null,
      matchWholeWords: e.matchWholeWords ?? null,

      matchPersonaDescription: e.matchPersonaDescription ?? false,
      matchCharacterDescription: e.matchCharacterDescription ?? false,
      matchCharacterPersonality: e.matchCharacterPersonality ?? false,
      matchCharacterDepthPrompt: e.matchCharacterDepthPrompt ?? false,
      matchScenario: e.matchScenario ?? false,
      matchCreatorNotes: e.matchCreatorNotes ?? false,

      role: e.role ?? 0,
      automationId: e.automationId ?? '',
      outletName: e.outletName ?? '',
      vectorized: e.vectorized ?? false,
      useProbability: e.useProbability ?? true,
      addMemo: e.addMemo ?? false,
      displayIndex: e.displayIndex ?? null,
      delayUntilRecursion: e.delayUntilRecursion ?? 0,
      triggers: Array.isArray(e.triggers) ? e.triggers : [],
      characterFilter: e.characterFilter ?? { isExclude: false, names: [], tags: [] },

      tokenCount,
      extensions: {},
    }

    return entry
  })

  const stBookExt = (raw.extensions?.sillytavern ?? {}) as Record<string, unknown>

  const bookMeta: BookMeta = {
    name: raw.name ?? '',
    description: raw.description ?? '',
    scanDepth: raw.scan_depth ?? defaults?.scanDepth ?? 4,
    tokenBudget: raw.token_budget ?? 4096,
    recursiveScan: raw.recursive_scanning ?? defaults?.recursiveScan ?? false,
    caseSensitive: (stBookExt['case_sensitive'] as boolean | undefined) ?? defaults?.caseSensitive ?? false,
    matchWholeWords: (stBookExt['match_whole_words'] as boolean | undefined) ?? defaults?.matchWholeWords ?? false,
    minActivations: (stBookExt['min_activations'] as number | undefined) ?? defaults?.minActivations ?? 0,
    maxDepth: (stBookExt['max_depth'] as number | undefined) ?? defaults?.maxDepth ?? 0,
    maxRecursionSteps: (stBookExt['max_recursion_steps'] as number | undefined) ?? defaults?.maxRecursionSteps ?? 0,
    insertionStrategy: (() => {
      const s = stBookExt['insertion_strategy'] as string | undefined
      if (s === 'character_lore_first') return 'character_lore_first'
      if (s === 'global_lore_first') return 'global_lore_first'
      if (s !== undefined) return 'evenly'
      return defaults?.insertionStrategy ?? 'evenly'
    })(),
    includeNames: (stBookExt['include_names'] as boolean | undefined) ?? defaults?.includeNames ?? false,
    useGroupScoring: (stBookExt['use_group_scoring'] as boolean | undefined) ?? defaults?.useGroupScoring ?? false,
    alertOnOverflow: (stBookExt['alert_on_overflow'] as boolean | undefined) ?? defaults?.alertOnOverflow ?? false,
    budgetCap: (stBookExt['budget_cap'] as number | undefined) ?? defaults?.budgetCap ?? 0,
    extensions: raw.extensions ?? {},
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
