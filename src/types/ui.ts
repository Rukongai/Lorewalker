import type { LorebookFormat } from './entry'
import type { SimMessage, SimulationSettings, ActivationResult, ConversationStep } from './simulator'

export interface FileMeta {
  fileName: string;
  originalFormat: LorebookFormat;
  lastSavedAt: string | null;
  sourceType: 'standalone' | 'embedded-in-card';
}

export interface TabMeta {
  id: string;
  name: string;
  fileMeta: FileMeta;
  dirty: boolean;
}

export type EntryTypeFilter =
  | 'constant'
  | 'keyword'
  | 'selective'
  | 'sticky'
  | 'disabled';

export interface EntryListFilter {
  search: string;
  showDisabled: boolean;
  filterByType: EntryTypeFilter | null;
  sortBy: 'name' | 'order' | 'position' | 'tokenCount' | 'health';
  sortDirection: 'asc' | 'desc';
}

export interface GraphFilter {
  showBlockedEdges: boolean;
  highlightCycles: boolean;
  filterByEntryType: EntryTypeFilter | null;
  dimUnconnected: boolean;
}

export interface PanelLayout {
  leftPanelWidth: number;
  rightPanelWidth: number;
  rightPanelTab: 'editor' | 'analysis' | 'simulator' | 'inspector';
}

export interface SimulatorState {
  messages: SimMessage[];
  settings: SimulationSettings;
  lastResult: ActivationResult | null;
  conversationHistory: ConversationStep[];
}

// Re-export SimulationSettings for use in persistence types
export type { SimulationSettings }

export interface GraphLayoutSettings {
  acyclicer: 'greedy' | 'none'
  ranker: 'network-simplex' | 'tight-tree' | 'longest-path'
  align: 'UL' | 'UR' | 'DL' | 'DR'
  rankdir: 'LR' | 'TB' | 'RL' | 'BT'
  edgeDirection: 'LR' | 'TB'
}

export interface GraphDisplayDefaults {
  connectionVisibility: 'all' | 'selected' | 'none'
  showBlockedEdges: boolean
  edgeStyle: 'bezier' | 'straight' | 'smoothstep'
}

export interface EditorDefaults {
  showKeywordHighlights: boolean
}
