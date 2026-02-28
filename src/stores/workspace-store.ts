import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { TabMeta, FileMeta } from '@/types'

interface WorkspaceState {
  tabs: TabMeta[]
  activeTabId: string | null
  theme: 'dark' | 'light'

  // Actions
  openTab(tabId: string, name: string, fileMeta: FileMeta): void
  closeTab(tabId: string): void
  switchTab(tabId: string): void
  markDirty(tabId: string, isDirty: boolean): void
  setTheme(theme: 'dark' | 'light'): void
}

export const useWorkspaceStore = create<WorkspaceState>()(
  immer((set) => ({
    tabs: [],
    activeTabId: null,
    theme: 'dark' as const,

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
  }))
)
