import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { temporal } from 'zundo'
import { generateId } from '@/lib/uuid'
import { debounce } from '@/lib/debounce'
import type { WorkingEntry, BookMeta, SimulatorState, SimulationSettings, Finding, HealthScore, SimMessage, ActivationResult, ConversationStep, CustomRule, DocumentRuleOverrides, CardPayload } from '@/types'

// --- Selection state ---

interface SelectionState {
  selectedEntryId: string | null
  multiSelect: string[]
}

// --- Simulator state defaults ---

const DEFAULT_SIMULATION_SETTINGS: SimulationSettings = {
  defaultScanDepth: 4,
  defaultTokenBudget: 50000,
  defaultCaseSensitive: false,
  defaultMatchWholeWords: false,
  defaultMaxRecursionSteps: 0,
  defaultIncludeNames: false,
}

const DEFAULT_SIMULATOR_STATE: SimulatorState = {
  messages: [],
  settings: DEFAULT_SIMULATION_SETTINGS,
  lastResult: null,
  conversationHistory: [],
  connectionsMode: false,
}

// --- DocumentStore type ---

export interface DocumentState {
  // Persisted (tracked by zundo for undo/redo)
  entries: WorkingEntry[]
  graphPositions: Map<string, { x: number; y: number }>
  bookMeta: BookMeta

  // Derived state (not in undo history)
  findings: Finding[]
  healthScore: HealthScore

  // LLM findings (user-triggered, not cleared on entry edits)
  llmFindings: Finding[]

  // Rule overrides (excluded from undo)
  ruleOverrides: DocumentRuleOverrides

  // Card payload (excluded from undo)
  cardPayload: CardPayload | null

  // UI state (excluded from undo)
  selection: SelectionState
  simulatorState: SimulatorState

  setCardPayload(payload: CardPayload | null): void
  setLlmFindings(findings: Finding[]): void
  setDocumentRuleOverride(ruleId: string, disabled: boolean): void
  addDocumentRule(rule: CustomRule): void
  updateDocumentRule(id: string, updates: Partial<CustomRule>): void
  removeDocumentRule(id: string): void

  // Undo / redo (provided by zundo)
  undo(): void
  redo(): void
  canUndo: boolean
  canRedo: boolean

  // Entry actions
  updateEntry(id: string, changes: Partial<WorkingEntry>): void
  addEntry(partial?: Partial<WorkingEntry>): string
  removeEntry(id: string): void
  reorderEntries(ids: string[]): void
  batchUpdate(updates: Map<string, Partial<WorkingEntry>>): void
  setEntryCategory(entryId: string, category: string | undefined): void
  setCategoryBatch(updates: Record<string, string>): void

  // BookMeta actions
  updateBookMeta(changes: Partial<BookMeta>): void

  // Graph position actions
  setGraphPosition(id: string, pos: { x: number; y: number }): void

  // Bulk actions
  bulkEnable(ids: string[]): void
  bulkDisable(ids: string[]): void
  bulkRemove(ids: string[]): void
  clearMultiSelect(): void

  // Selection actions
  selectEntry(id: string | null): void
  toggleMultiSelect(id: string): void
  clearSelection(): void

  // Simulator actions (excluded from undo)
  setSimulatorMessages(messages: SimMessage[]): void
  updateSimulatorSettings(patch: Partial<SimulationSettings>): void
  setSimulatorResult(result: ActivationResult | null): void
  appendConversationStep(step: ConversationStep): void
  clearConversationHistory(): void
  clearSimulation(): void
  setConnectionsMode(enabled: boolean): void
}

function makeDefaultEntry(partial: Partial<WorkingEntry> = {}): WorkingEntry {
  return {
    id: generateId(),
    uid: partial.uid ?? 0,
    name: partial.name ?? 'New Entry',
    content: partial.content ?? '',
    keys: partial.keys ?? [],
    secondaryKeys: partial.secondaryKeys ?? [],
    constant: partial.constant ?? false,
    selective: partial.selective ?? false,
    selectiveLogic: partial.selectiveLogic ?? 0,
    enabled: partial.enabled ?? true,
    position: partial.position ?? 0,
    order: partial.order ?? 100,
    depth: partial.depth ?? 4,
    delay: partial.delay ?? 0,
    cooldown: partial.cooldown ?? 0,
    sticky: partial.sticky ?? 0,
    probability: partial.probability ?? 100,
    preventRecursion: partial.preventRecursion ?? false,
    excludeRecursion: partial.excludeRecursion ?? false,
    ignoreBudget: partial.ignoreBudget ?? false,
    group: partial.group ?? '',
    groupOverride: partial.groupOverride ?? false,
    groupWeight: partial.groupWeight ?? 100,
    useGroupScoring: partial.useGroupScoring ?? null,
    scanDepth: partial.scanDepth ?? null,
    caseSensitive: partial.caseSensitive ?? null,
    matchWholeWords: partial.matchWholeWords ?? null,
    matchPersonaDescription: partial.matchPersonaDescription ?? false,
    matchCharacterDescription: partial.matchCharacterDescription ?? false,
    matchCharacterPersonality: partial.matchCharacterPersonality ?? false,
    matchCharacterDepthPrompt: partial.matchCharacterDepthPrompt ?? false,
    matchScenario: partial.matchScenario ?? false,
    matchCreatorNotes: partial.matchCreatorNotes ?? false,
    role: partial.role ?? 0,
    automationId: partial.automationId ?? '',
    outletName: partial.outletName ?? '',
    vectorized: partial.vectorized ?? false,
    useProbability: partial.useProbability ?? true,
    addMemo: partial.addMemo ?? true,
    displayIndex: partial.displayIndex ?? null,
    delayUntilRecursion: partial.delayUntilRecursion ?? 0,
    triggers: partial.triggers ?? [],
    characterFilter: partial.characterFilter ?? { isExclude: false, names: [], tags: [] },
    tokenCount: partial.tokenCount ?? 0,
    extensions: partial.extensions ?? {},
  }
}

export interface DocumentStoreInit {
  entries: WorkingEntry[]
  bookMeta: BookMeta
  graphPositions?: Map<string, { x: number; y: number }>
  simulatorState?: SimulatorState
  ruleOverrides?: DocumentRuleOverrides
  cardPayload?: CardPayload | null
}

const DEFAULT_RULE_OVERRIDES: DocumentRuleOverrides = {
  disabledRuleIds: [],
  customRules: [],
}

/**
 * Factory: creates a fresh Zustand store for a document tab.
 * Each tab gets its own store so undo/redo is scoped per document.
 */
export function createDocumentStore(init: DocumentStoreInit) {
  const store = create<DocumentState>()(
    temporal(
      immer((set, get) => ({
        // --- Initial state ---
        entries: init.entries,
        graphPositions: init.graphPositions ?? new Map(),
        bookMeta: init.bookMeta,
        cardPayload: init.cardPayload ?? null,

        findings: [],
        llmFindings: [],
        healthScore: {
          overall: 100,
          categories: {
            structure: { score: 100, errorCount: 0, warningCount: 0, suggestionCount: 0 },
            config: { score: 100, errorCount: 0, warningCount: 0, suggestionCount: 0 },
            keywords: { score: 100, errorCount: 0, warningCount: 0, suggestionCount: 0 },
            content: { score: 100, errorCount: 0, warningCount: 0, suggestionCount: 0 },
            recursion: { score: 100, errorCount: 0, warningCount: 0, suggestionCount: 0 },
            budget: { score: 100, errorCount: 0, warningCount: 0, suggestionCount: 0 },
          },
          summary: 'No file open',
        },

        ruleOverrides: init.ruleOverrides ?? DEFAULT_RULE_OVERRIDES,
        selection: { selectedEntryId: null, multiSelect: [] },
        simulatorState: init.simulatorState ?? DEFAULT_SIMULATOR_STATE,

        // Temporal placeholders — zundo injects actual undo/redo
        undo() { /* provided by temporal */ },
        redo() { /* provided by temporal */ },
        canUndo: false,
        canRedo: false,

        // --- Entry actions ---

        updateEntry(id, changes) {
          set((state) => {
            const entry = state.entries.find((e) => e.id === id)
            if (!entry) return
            Object.assign(entry, changes)
          })
        },

        addEntry(partial = {}) {
          const newEntry = makeDefaultEntry(partial)
          set((state) => {
            state.entries.push(newEntry)
          })
          return newEntry.id
        },

        removeEntry(id) {
          set((state) => {
            const idx = state.entries.findIndex((e) => e.id === id)
            if (idx !== -1) state.entries.splice(idx, 1)

            // Clean up graph position for removed entry
            state.graphPositions.delete(id)

            // Clear selection if removed entry was selected
            if (state.selection.selectedEntryId === id) {
              state.selection.selectedEntryId = null
            }
            state.selection.multiSelect = state.selection.multiSelect.filter((sid) => sid !== id)
          })
        },

        reorderEntries(ids) {
          set((state) => {
            const entryMap = new Map(state.entries.map((e) => [e.id, e]))
            const reordered = ids.map((id) => entryMap.get(id)).filter(Boolean) as WorkingEntry[]
            state.entries = reordered
          })
        },

        batchUpdate(updates) {
          set((state) => {
            for (const [id, changes] of updates) {
              const entry = state.entries.find((e) => e.id === id)
              if (entry) Object.assign(entry, changes)
            }
          })
        },

        setEntryCategory(entryId, category) {
          set((state) => {
            const entry = state.entries.find((e) => e.id === entryId)
            if (!entry) return
            entry.userCategory = category
          })
        },

        setCategoryBatch(updates) {
          set((state) => {
            for (const [id, category] of Object.entries(updates)) {
              const entry = state.entries.find((e) => e.id === id)
              if (entry) entry.userCategory = category
            }
          })
        },

        // --- Bulk actions ---

        bulkEnable(ids) {
          set((state) => {
            const idSet = new Set(ids)
            for (const entry of state.entries) {
              if (idSet.has(entry.id)) entry.enabled = true
            }
          })
        },

        bulkDisable(ids) {
          set((state) => {
            const idSet = new Set(ids)
            for (const entry of state.entries) {
              if (idSet.has(entry.id)) entry.enabled = false
            }
          })
        },

        bulkRemove(ids) {
          set((state) => {
            const idSet = new Set(ids)
            state.entries = state.entries.filter((e) => !idSet.has(e.id))
            for (const id of ids) state.graphPositions.delete(id)
            if (state.selection.selectedEntryId && idSet.has(state.selection.selectedEntryId)) {
              state.selection.selectedEntryId = null
            }
            state.selection.multiSelect = []
          })
        },

        clearMultiSelect() {
          store.setState((state) => ({
            ...state,
            selection: { ...state.selection, multiSelect: [] },
          }))
        },

        // --- BookMeta actions ---

        updateBookMeta(changes) {
          set((state) => {
            Object.assign(state.bookMeta, changes)
          })
        },

        // --- Graph position actions ---

        setGraphPosition(id, pos) {
          store.setState((state) => ({
            ...state,
            graphPositions: new Map(state.graphPositions).set(id, pos),
          }))
        },

        // --- Selection actions (excluded from undo) ---

        selectEntry(id) {
          // Update selection without touching undo history
          const current = get()
          // Bypass immer + temporal by modifying state directly outside temporal scope
          store.setState((state) => ({
            ...state,
            selection: { selectedEntryId: id, multiSelect: [] },
          }))
          void current // suppress unused warning
        },

        toggleMultiSelect(id) {
          store.setState((state) => {
            const multiSelect = state.selection.multiSelect.includes(id)
              ? state.selection.multiSelect.filter((sid) => sid !== id)
              : [...state.selection.multiSelect, id]
            return { ...state, selection: { ...state.selection, multiSelect } }
          })
        },

        clearSelection() {
          store.setState((state) => ({
            ...state,
            selection: { selectedEntryId: null, multiSelect: [] },
          }))
        },

        // --- Simulator actions (excluded from undo) ---

        setSimulatorMessages(messages) {
          store.setState((state) => ({
            ...state,
            simulatorState: { ...state.simulatorState, messages },
          }))
        },

        updateSimulatorSettings(patch) {
          store.setState((state) => ({
            ...state,
            simulatorState: {
              ...state.simulatorState,
              settings: { ...state.simulatorState.settings, ...patch },
            },
          }))
        },

        setSimulatorResult(result) {
          store.setState((state) => ({
            ...state,
            simulatorState: { ...state.simulatorState, lastResult: result },
          }))
        },

        appendConversationStep(step) {
          store.setState((state) => ({
            ...state,
            simulatorState: {
              ...state.simulatorState,
              conversationHistory: [...state.simulatorState.conversationHistory, step],
            },
          }))
        },

        clearConversationHistory() {
          store.setState((state) => ({
            ...state,
            simulatorState: { ...state.simulatorState, conversationHistory: [] },
          }))
        },

        clearSimulation() {
          store.setState((state) => ({
            ...state,
            simulatorState: { ...state.simulatorState, lastResult: null, connectionsMode: false },
          }))
        },

        setConnectionsMode(enabled) {
          store.setState((state) => ({
            ...state,
            simulatorState: { ...state.simulatorState, connectionsMode: enabled },
          }))
        },

        // --- Rule override actions (excluded from undo) ---

        setDocumentRuleOverride(ruleId, disabled) {
          store.setState((state) => {
            const current = state.ruleOverrides
            if (disabled) {
              if (!current.disabledRuleIds.includes(ruleId)) {
                return {
                  ...state,
                  ruleOverrides: {
                    ...current,
                    disabledRuleIds: [...current.disabledRuleIds, ruleId],
                  },
                }
              }
            } else {
              return {
                ...state,
                ruleOverrides: {
                  ...current,
                  disabledRuleIds: current.disabledRuleIds.filter((id) => id !== ruleId),
                },
              }
            }
            return state
          })
        },

        addDocumentRule(rule) {
          store.setState((state) => ({
            ...state,
            ruleOverrides: {
              ...state.ruleOverrides,
              customRules: [...state.ruleOverrides.customRules, rule],
            },
          }))
        },

        updateDocumentRule(id, updates) {
          store.setState((state) => ({
            ...state,
            ruleOverrides: {
              ...state.ruleOverrides,
              customRules: state.ruleOverrides.customRules.map((r) =>
                r.id === id ? { ...r, ...updates } : r
              ),
            },
          }))
        },

        removeDocumentRule(id) {
          store.setState((state) => ({
            ...state,
            ruleOverrides: {
              ...state.ruleOverrides,
              customRules: state.ruleOverrides.customRules.filter((r) => r.id !== id),
            },
          }))
        },

        // --- Card payload (excluded from undo) ---

        setCardPayload(payload) {
          store.setState((state) => ({ ...state, cardPayload: payload }))
        },

        // --- LLM findings (excluded from undo) ---

        setLlmFindings(findings) {
          store.setState((state) => ({ ...state, llmFindings: findings }))
        },
      })),
      {
        // Only track persisted fields for undo/redo
        partialize: (state) => ({
          entries: state.entries,
          bookMeta: state.bookMeta,
        }),
        limit: 100,    // max undo steps
        equality: (a, b) =>
          a.entries === b.entries && a.bookMeta === b.bookMeta,
        handleSet: (handleSet) => {
          // Debounce temporal checkpoint recording so rapid keystrokes
          // collapse into a single undo step (500ms trailing window).
          // Actual immer state updates immediately — only checkpoint recording is debounced.
          const debouncedHandleSet = debounce(
            handleSet as (...args: unknown[]) => void,
            500
          )
          return (state) => debouncedHandleSet(state)
        },
      }
    )
  )

  return store
}

export type DocumentStore = ReturnType<typeof createDocumentStore>
