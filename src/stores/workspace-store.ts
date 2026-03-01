import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { TabMeta, FileMeta, GraphLayoutSettings, GraphDisplayDefaults, EditorDefaults, EntriesListDefaults, LorebookDefaults } from '@/types'

const DEFAULT_GRAPH_SETTINGS: GraphLayoutSettings = {
  acyclicer: 'greedy',
  ranker: 'network-simplex',
  align: 'UR',
  rankdir: 'LR',
  edgeDirection: 'LR',
}

const DEFAULT_GRAPH_DISPLAY_DEFAULTS: GraphDisplayDefaults = {
  connectionVisibility: 'selected',
  showBlockedEdges: false,
  edgeStyle: 'bezier',
}

const DEFAULT_EDITOR_DEFAULTS: EditorDefaults = {
  showKeywordHighlights: true,
}

const DEFAULT_ENTRIES_LIST_DEFAULTS: EntriesListDefaults = {
  sortBy: 'order',
  sortDirection: 'asc',
  sortBy2: null,
  sortDir2: 'asc',
  pinConstantsToTop: true,
}

const DEFAULT_LOREBOOK_DEFAULTS: LorebookDefaults = {
  scanDepth: 2,
  contextBudgetPercent: 25,
  budgetCap: 0,
  minActivations: 0,
  maxDepth: 0,
  maxRecursionSteps: 0,
  includeNames: true,
  recursiveScan: true,
  caseSensitive: false,
  matchWholeWords: true,
  useGroupScoring: false,
  alertOnOverflow: false,
  insertionStrategy: 'evenly',
}

interface WorkspaceState {
  tabs: TabMeta[]
  activeTabId: string | null
  theme: 'dark' | 'catppuccin-macchiato'
  graphSettings: GraphLayoutSettings
  checkRecursionLoops: boolean
  graphDisplayDefaults: GraphDisplayDefaults
  editorDefaults: EditorDefaults
  entriesListDefaults: EntriesListDefaults
  lorebookDefaults: LorebookDefaults

  // Actions
  openTab(tabId: string, name: string, fileMeta: FileMeta): void
  closeTab(tabId: string): void
  switchTab(tabId: string): void
  markDirty(tabId: string, isDirty: boolean): void
  setTheme(theme: 'dark' | 'catppuccin-macchiato'): void
  setGraphSettings(settings: GraphLayoutSettings): void
  setCheckRecursionLoops(value: boolean): void
  setGraphDisplayDefaults(settings: GraphDisplayDefaults): void
  setEditorDefaults(settings: EditorDefaults): void
  setEntriesListDefaults(settings: EntriesListDefaults): void
  setLorebookDefaults(patch: Partial<LorebookDefaults>): void
}

export const useWorkspaceStore = create<WorkspaceState>()(
  immer((set) => ({
    tabs: [],
    activeTabId: null,
    theme: 'dark' as const,
    graphSettings: DEFAULT_GRAPH_SETTINGS,
    checkRecursionLoops: false,
    graphDisplayDefaults: DEFAULT_GRAPH_DISPLAY_DEFAULTS,
    editorDefaults: DEFAULT_EDITOR_DEFAULTS,
    entriesListDefaults: DEFAULT_ENTRIES_LIST_DEFAULTS,
    lorebookDefaults: DEFAULT_LOREBOOK_DEFAULTS,

    openTab(tabId, name, fileMeta) {
      set((state) => {
        // Don't open duplicate tabs for the same file (by fileName)
        const existing = state.tabs.find((t) => t.fileMeta.fileName === fileMeta.fileName)
        if (existing) {
          state.activeTabId = existing.id
          return
        }
        state.tabs.push({ id: tabId, name, fileMeta, dirty: false })
        state.activeTabId = tabId
      })
    },

    closeTab(tabId) {
      set((state) => {
        const index = state.tabs.findIndex((t) => t.id === tabId)
        if (index === -1) return

        state.tabs.splice(index, 1)

        if (state.activeTabId === tabId) {
          // Activate neighboring tab or null
          const nextTab = state.tabs[index] ?? state.tabs[index - 1] ?? null
          state.activeTabId = nextTab?.id ?? null
        }
      })
    },

    switchTab(tabId) {
      set((state) => {
        if (state.tabs.some((t) => t.id === tabId)) {
          state.activeTabId = tabId
        }
      })
    },

    markDirty(tabId, isDirty) {
      set((state) => {
        const tab = state.tabs.find((t) => t.id === tabId)
        if (tab) tab.dirty = isDirty
      })
    },

    setTheme(theme) {
      set((state) => {
        state.theme = theme
      })
    },

    setGraphSettings(settings) {
      set((state) => { state.graphSettings = settings })
    },

    setCheckRecursionLoops(value) {
      set((state) => { state.checkRecursionLoops = value })
    },

    setGraphDisplayDefaults(settings) {
      set((state) => { state.graphDisplayDefaults = settings })
    },

    setEditorDefaults(settings) {
      set((state) => { state.editorDefaults = settings })
    },

    setEntriesListDefaults(settings) {
      set((state) => { state.entriesListDefaults = settings })
    },

    setLorebookDefaults(patch) {
      set((state) => { state.lorebookDefaults = { ...state.lorebookDefaults, ...patch } })
    },
  }))
)
