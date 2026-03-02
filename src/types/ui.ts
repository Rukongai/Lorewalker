import type { LorebookFormat } from './entry'
import type { SimMessage, SimulationSettings, ActivationResult, ConversationStep } from './simulator'
import type { CCv3Data, ExtractedAsset, ContainerFormat, Spec } from '@character-foundry/character-foundry/loader'

export interface CardPayload {
  card: CCv3Data
  assets: ExtractedAsset[]
  containerFormat: ContainerFormat
  spec: Spec
}

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
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  rightPanelTab: 'lorebook' | 'entry' | 'analysis' | 'inspector' | 'simulator';
  leftPanelTab: 'files' | 'entries';
}

export type ThemeId =
  | 'dark'
  | 'catppuccin-macchiato' | 'catppuccin-latte' | 'catppuccin-frappe' | 'catppuccin-mocha'
  | 'nord' | 'nord-aurora' | 'one-dark'
  | 'rose-pine' | 'rose-pine-dawn'
  | 'tokyo-night' | 'tokyo-night-day'
  | 'dracula' | 'dracula-soft'

export interface SimulatorState {
  messages: SimMessage[];
  settings: SimulationSettings;
  lastResult: ActivationResult | null;
  conversationHistory: ConversationStep[];
  connectionsMode: boolean;
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
  categoryBehavior: 'remember' | 'reset'
  lastEditorCategory: string
}

export type SortKey = 'uid' | 'name' | 'tokenCount' | 'order' | 'displayIndex'

export interface EntriesListDefaults {
  sortBy: SortKey
  sortDirection: 'asc' | 'desc'
  sortBy2: SortKey | null
  sortDir2: 'asc' | 'desc'
  pinConstantsToTop: boolean
}

export interface LorebookDefaults {
  scanDepth: number;              // 0–1000, SillyTavern default: 2
  contextBudgetPercent: number;   // 0–100 %, SillyTavern default: 25
  budgetCap: number;              // 0–65536, 0 = disabled, default: 0
  minActivations: number;         // 0–100, 0 = disabled, default: 0
  maxDepth: number;               // 0–100, 0 = unlimited, default: 0
  maxRecursionSteps: number;      // 0–10, 0 = unlimited, default: 0
  includeNames: boolean;          // default: true
  recursiveScan: boolean;         // default: true
  caseSensitive: boolean;         // default: false
  matchWholeWords: boolean;       // default: true
  useGroupScoring: boolean;       // default: false
  alertOnOverflow: boolean;       // default: false
  insertionStrategy: 'evenly' | 'character_lore_first' | 'global_lore_first'; // default: 'evenly'
}
