import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- In-memory idb-keyval mock ---

const memStore = new Map<string, unknown>()

vi.mock('idb-keyval', () => {
  return {
    createStore: vi.fn(() => ({})),
    get: vi.fn(async (key: string) => memStore.get(key)),
    set: vi.fn(async (key: string, value: unknown) => { memStore.set(key, value) }),
    del: vi.fn(async (key: string) => { memStore.delete(key) }),
    keys: vi.fn(async () => Array.from(memStore.keys())),
  }
})

import {
  saveDocument,
  loadDocument,
  deleteDocument,
  listDocuments,
  saveWorkspace,
  loadWorkspace,
  cleanupStaleDocuments,
} from './persistence-service'
import type { PersistedDocument, PersistedWorkspace } from '@/types'

function makeDoc(overrides: Partial<PersistedDocument> = {}): PersistedDocument {
  return {
    tabId: 'tab-1',
    entries: [
      {
        id: 'e1',
        uid: 1,
        name: 'Entry 1',
        content: 'hello world',
        keys: ['hello'],
        secondaryKeys: [],
        constant: false,
        selective: false,
        selectiveLogic: 0,
        enabled: true,
        position: 0,
        order: 100,
        depth: 4,
        delay: 0,
        cooldown: 0,
        sticky: 0,
        probability: 100,
        preventRecursion: false,
        excludeRecursion: false,
        ignoreBudget: false,
        group: '',
        groupOverride: false,
        groupWeight: 100,
        useGroupScoring: null,
        scanDepth: null,
        caseSensitive: null,
        matchWholeWords: null,
        matchPersonaDescription: false,
        matchCharacterDescription: false,
        matchCharacterPersonality: false,
        matchCharacterDepthPrompt: false,
        matchScenario: false,
        matchCreatorNotes: false,
        role: 0,
        automationId: '',
        outletName: '',
        vectorized: false,
        useProbability: true,
        addMemo: true,
        displayIndex: null,
        delayUntilRecursion: 0,
        triggers: [],
        characterFilter: { isExclude: false, names: [], tags: [] },
        tokenCount: 5,
        extensions: {},
      },
    ],
    graphPositions: { 'e1': { x: 100, y: 200 } },
    bookMeta: {
      name: 'Test Book',
      description: '',
      scanDepth: 4,
      tokenBudget: 4096,
      recursiveScan: false,
      caseSensitive: false,
      matchWholeWords: false,
      extensions: {},
    },
    fileMeta: {
      fileName: 'test.json',
      originalFormat: 'st-json',
      lastSavedAt: null,
      sourceType: 'standalone',
    },
    simulatorState: {
      messages: [],
      settings: {
        defaultScanDepth: 4,
        defaultTokenBudget: 4096,
        defaultCaseSensitive: false,
        defaultMatchWholeWords: false,
        defaultMaxRecursionSteps: 0,
        defaultIncludeNames: false,
      },
      lastResult: null,
      conversationHistory: [],
    },
    savedAt: new Date().toISOString(),
    ...overrides,
  }
}

beforeEach(() => {
  memStore.clear()
})

describe('PersistenceService', () => {
  describe('saveDocument / loadDocument round-trip', () => {
    it('saves and loads entries correctly', async () => {
      const doc = makeDoc()
      await saveDocument(doc)
      const loaded = await loadDocument('tab-1')
      expect(loaded).toBeDefined()
      expect(loaded!.entries).toHaveLength(1)
      expect(loaded!.entries[0].name).toBe('Entry 1')
    })

    it('saves and loads bookMeta correctly', async () => {
      const doc = makeDoc()
      await saveDocument(doc)
      const loaded = await loadDocument('tab-1')
      expect(loaded!.bookMeta.name).toBe('Test Book')
    })

    it('saves and loads fileMeta correctly', async () => {
      const doc = makeDoc()
      await saveDocument(doc)
      const loaded = await loadDocument('tab-1')
      expect(loaded!.fileMeta.fileName).toBe('test.json')
    })
  })

  describe('graphPositions Record serialization round-trip', () => {
    it('saves and loads graphPositions as Record', async () => {
      const doc = makeDoc({ graphPositions: { 'e1': { x: 50, y: 75 } } })
      await saveDocument(doc)
      const loaded = await loadDocument('tab-1')
      expect(loaded!.graphPositions['e1']).toEqual({ x: 50, y: 75 })
    })

    it('preserves multiple positions', async () => {
      const doc = makeDoc({
        graphPositions: {
          'e1': { x: 10, y: 20 },
          'e2': { x: 30, y: 40 },
        },
      })
      await saveDocument(doc)
      const loaded = await loadDocument('tab-1')
      expect(loaded!.graphPositions['e2']).toEqual({ x: 30, y: 40 })
    })
  })

  describe('listDocuments', () => {
    it('returns all saved documents', async () => {
      await saveDocument(makeDoc({ tabId: 'tab-1' }))
      await saveDocument(makeDoc({ tabId: 'tab-2' }))
      const docs = await listDocuments()
      expect(docs).toHaveLength(2)
    })

    it('does not include non-document keys', async () => {
      await saveWorkspace({ tabs: [], activeTabId: null, theme: 'dark', panelLayout: { leftPanelWidth: 256, rightPanelWidth: 320, leftCollapsed: false, rightCollapsed: false, rightPanelTab: 'editor' } })
      await saveDocument(makeDoc({ tabId: 'tab-1' }))
      const docs = await listDocuments()
      expect(docs).toHaveLength(1)
    })
  })

  describe('deleteDocument', () => {
    it('removes a document by tabId', async () => {
      await saveDocument(makeDoc({ tabId: 'tab-1' }))
      await deleteDocument('tab-1')
      const loaded = await loadDocument('tab-1')
      expect(loaded).toBeUndefined()
    })

    it('does not affect other documents', async () => {
      await saveDocument(makeDoc({ tabId: 'tab-1' }))
      await saveDocument(makeDoc({ tabId: 'tab-2' }))
      await deleteDocument('tab-1')
      const docs = await listDocuments()
      expect(docs).toHaveLength(1)
      expect(docs[0].tabId).toBe('tab-2')
    })
  })

  describe('cleanupStaleDocuments', () => {
    it('removes docs older than retentionDays', async () => {
      const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
      await saveDocument(makeDoc({ tabId: 'tab-old', savedAt: oldDate }))
      await cleanupStaleDocuments(7)
      const docs = await listDocuments()
      expect(docs).toHaveLength(0)
    })

    it('keeps docs newer than retentionDays', async () => {
      const recentDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      await saveDocument(makeDoc({ tabId: 'tab-recent', savedAt: recentDate }))
      await cleanupStaleDocuments(7)
      const docs = await listDocuments()
      expect(docs).toHaveLength(1)
    })

    it('removes only stale docs, keeps fresh ones', async () => {
      const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
      const recentDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      await saveDocument(makeDoc({ tabId: 'tab-old', savedAt: oldDate }))
      await saveDocument(makeDoc({ tabId: 'tab-new', savedAt: recentDate }))
      await cleanupStaleDocuments(7)
      const docs = await listDocuments()
      expect(docs).toHaveLength(1)
      expect(docs[0].tabId).toBe('tab-new')
    })
  })

  describe('loadWorkspace on fresh install', () => {
    it('returns undefined when nothing is saved', async () => {
      const workspace = await loadWorkspace()
      expect(workspace).toBeUndefined()
    })

    it('saves and loads workspace correctly', async () => {
      const ws: PersistedWorkspace = {
        tabs: [],
        activeTabId: null,
        theme: 'dark',
        panelLayout: {
          leftPanelWidth: 256,
          rightPanelWidth: 320,
          leftCollapsed: false,
          rightCollapsed: false,
          rightPanelTab: 'editor',
        },
      }
      await saveWorkspace(ws)
      const loaded = await loadWorkspace()
      expect(loaded).toEqual(ws)
    })
  })
})
