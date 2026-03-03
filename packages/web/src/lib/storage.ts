import type { StorageAdapter } from '@lorewalker/core/storage'
import { IdbStorageAdapter } from '@/services/idb-storage-adapter'

export const storageAdapter: StorageAdapter = new IdbStorageAdapter()
