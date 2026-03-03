import type { PersistedDocument, PersistedWorkspace, PersistedPreferences, PersistedProvider, PersistedSnapshot } from '../types'
import type { CustomRule } from '../types'

export interface StorageAdapter {
  // Documents
  saveDocument(doc: PersistedDocument): Promise<void>
  loadDocument(tabId: string): Promise<PersistedDocument | undefined>
  deleteDocument(tabId: string): Promise<void>
  listDocuments(): Promise<PersistedDocument[]>

  // Workspace
  saveWorkspace(state: PersistedWorkspace): Promise<void>
  loadWorkspace(): Promise<PersistedWorkspace | undefined>

  // Preferences
  savePreferences(prefs: PersistedPreferences): Promise<void>
  loadPreferences(): Promise<PersistedPreferences | undefined>

  // Providers
  saveProviders(providers: PersistedProvider[]): Promise<void>
  loadProviders(): Promise<PersistedProvider[]>

  // Snapshots
  saveSnapshot(snapshot: PersistedSnapshot): Promise<void>
  listSnapshots(tabId?: string): Promise<PersistedSnapshot[]>
  deleteSnapshot(tabId: string, snapshotId: string): Promise<void>

  // Custom Rules
  saveCustomRules(rules: CustomRule[], disabledBuiltinIds: string[]): Promise<void>
  loadCustomRules(): Promise<{ rules: CustomRule[]; disabledBuiltinIds: string[] }>

  // Cleanup
  cleanupStaleDocuments(retentionDays: number): Promise<void>
}
