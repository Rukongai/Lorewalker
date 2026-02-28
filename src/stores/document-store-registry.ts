/**
 * Registry that maps tabId → DocumentStore instance.
 * Created when a tab opens, deleted when a tab closes.
 */

import { createDocumentStore, type DocumentStore, type DocumentStoreInit } from './document-store'

class DocumentStoreRegistry {
  private stores = new Map<string, DocumentStore>()

  create(tabId: string, init: DocumentStoreInit): DocumentStore {
    const store = createDocumentStore(init)
    this.stores.set(tabId, store)
    return store
  }

  get(tabId: string): DocumentStore | undefined {
    return this.stores.get(tabId)
  }

  delete(tabId: string): void {
    this.stores.delete(tabId)
  }

  has(tabId: string): boolean {
    return this.stores.has(tabId)
  }
}

export const documentStoreRegistry = new DocumentStoreRegistry()
