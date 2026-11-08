import { describe, it, expect } from 'vitest'
import { createDocumentStore } from './document-store'

function makeStore() {
  return createDocumentStore({
    entries: [],
    bookMeta: {} as never,
  })
}

describe('DocumentStore tokenCount', () => {
  it('recomputes tokenCount when content is updated', () => {
    const store = makeStore()
    const id = store.getState().addEntry({ content: '' })
    expect(store.getState().entries[0].tokenCount).toBe(0)

    store.getState().updateEntry(id, { content: 'The quick brown fox jumps over the lazy dog.' })
    expect(store.getState().entries[0].tokenCount).toBeGreaterThan(0)
  })

  it('recomputes tokenCount in batchUpdate', () => {
    const store = makeStore()
    const id = store.getState().addEntry({ content: '' })
    store.getState().batchUpdate(new Map([[id, { content: 'Some lore content here.' }]]))
    expect(store.getState().entries[0].tokenCount).toBeGreaterThan(0)
  })

  it('computes tokenCount for new entries with content', () => {
    const store = makeStore()
    store.getState().addEntry({ content: 'Initial content for a fresh entry.' })
    expect(store.getState().entries[0].tokenCount).toBeGreaterThan(0)
  })

  it('leaves tokenCount untouched when content is not changed', () => {
    const store = makeStore()
    const id = store.getState().addEntry({ content: 'abc', tokenCount: 42 })
    store.getState().updateEntry(id, { name: 'renamed' })
    expect(store.getState().entries[0].tokenCount).toBe(42)
  })
})
