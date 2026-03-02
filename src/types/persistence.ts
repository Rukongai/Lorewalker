import type { WorkingEntry, BookMeta } from './entry'
import type { FileMeta, TabMeta, PanelLayout, ThemeId } from './ui'
import type { SimulationSettings, SimulatorState } from './ui'
import type { LLMProviderType, ProviderConfig } from './llm'
import type { DocumentRuleOverrides } from './analysis'

export interface PersistedWorkspace {
  tabs: TabMeta[];
  activeTabId: string | null;
  theme: ThemeId;
  panelLayout: PanelLayout;
}

export interface PersistedDocument {
  tabId: string;
  entries: WorkingEntry[];
  graphPositions: Record<string, { x: number; y: number }>;
  bookMeta: BookMeta;
  fileMeta: FileMeta;
  simulatorState: SimulatorState;
  ruleOverrides: DocumentRuleOverrides;
  savedAt: string;  // ISO timestamp
}

export interface PersistedPreferences {
  simulationDefaults: SimulationSettings;
  autosaveIntervalMs: number;
  recoveryRetentionDays: number;
}

export interface PersistedSnapshot {
  id: string;
  tabId: string;
  name: string;
  savedAt: string;  // ISO timestamp
  entries: WorkingEntry[];
  bookMeta: BookMeta;
}

export interface PersistedProvider {
  id: string;
  name: string;
  type: LLMProviderType;
  config: Omit<ProviderConfig, 'apiKey'>;  // Key stored separately for Tauri keychain
  apiKey: string;                           // Stored in same record for browser IndexedDB
}
