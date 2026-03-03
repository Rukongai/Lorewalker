# Lorewalker — Type Definitions

All types are defined here. This is the canonical source. No type should be duplicated or redefined elsewhere. Implementation files import from a central `types/` directory that mirrors this document.

---

## Core Domain Types

### WorkingEntry

The flattened, editor-friendly representation of a lorebook entry. This is the primary data type the entire application operates on. Created by TransformService.inflate(), consumed by everything else.

```typescript
interface WorkingEntry {
  // === Identity ===
  id: string;                     // Internal stable UUID, assigned on import, never changes
  uid: number;                    // Format-specific UID (ST uid, CCv3 numeric id). Reconstructed on export.

  // === Content ===
  name: string;                   // Display label (ST "comment", CCv3 "name")
  content: string;                // The lore text injected into context
  keys: string[];                 // Primary activation keywords
  secondaryKeys: string[];        // Secondary keywords for selective activation

  // === Activation ===
  constant: boolean;              // Always active regardless of keywords
  selective: boolean;             // Requires both primary + secondary key match
  selectiveLogic: SelectiveLogic; // How secondary keys combine
  enabled: boolean;               // Master toggle (ST "disable" inverted)

  // === Priority ===
  position: EntryPosition;        // Where in context the entry is injected (0–7)
  order: number;                  // Priority within position (higher = inserted first)
  depth: number;                  // Context depth for injection

  // === Timed Effects ===
  delay: number | null;           // Messages before entry can activate (null = use global default, 0 = immediate)
  cooldown: number | null;        // Messages entry can't activate after deactivation (null = use global default)
  sticky: number | null;          // Messages entry stays active after trigger (null = use global default, 0 = keyword-only)
  probability: number;            // Percent chance to activate when triggered (1–100)

  // === Recursion Control ===
  preventRecursion: boolean;      // If true, this entry's content won't be scanned during recursive passes
  excludeRecursion: boolean;      // If true, this entry's keys can't be triggered by recursion

  // === Budget ===
  ignoreBudget: boolean;          // If true, ignores token budget limits

  // === Group System ===
  group: string;                  // Group name for inclusion groups
  groupOverride: boolean;         // If true, always includes this entry when the group activates
  groupWeight: number;            // Weight for probabilistic group selection (default 100)
  useGroupScoring: boolean | null; // null = use global setting

  // === Per-entry Scan Overrides ===
  scanDepth: number | null;       // null = use book default
  caseSensitive: boolean | null;  // null = use book default
  matchWholeWords: boolean | null; // null = use book default

  // === Match Sources ===
  matchPersonaDescription: boolean;
  matchCharacterDescription: boolean;
  matchCharacterPersonality: boolean;
  matchCharacterDepthPrompt: boolean;
  matchScenario: boolean;
  matchCreatorNotes: boolean;

  // === Advanced ST Fields ===
  role: number;                   // 0 = system, 1 = user, 2 = assistant (used at position 4 @ Depth)
  automationId: string;           // ST automation ID for scripting
  outletName: string;             // Used when position = 7 (Outlet)
  vectorized: boolean;            // Whether entry is in the vector DB
  useProbability: boolean;        // Whether probability roll is applied (default true)
  addMemo: boolean;               // Whether entry is shown in the World Info Memory panel
  displayIndex: number | null;    // Visual sort index in ST's WI panel (null = unset)
  delayUntilRecursion: number;    // Messages before entry activates during recursion
  triggers: string[];             // ST trigger list (alternative activation mechanism)
  characterFilter: CharacterFilter; // Restrict entry to specific characters

  // === Computed (read-only, set by TransformService) ===
  tokenCount: number;             // Estimated token count of content field

  // === Lorewalker-specific ===
  userCategory?: string;          // Manual or LLM-assigned category override (stored in extensions.lorewalker.userCategory)

  // === Passthrough ===
  extensions: Record<string, unknown>;  // Preserves unknown platform-specific extensions for round-trip fidelity
}
```

### Enums and Literal Types

```typescript
type SelectiveLogic =
  | 0   // AND ANY: primary + any one secondary
  | 1   // AND ALL: primary + all secondary
  | 2   // NOT ANY: primary + none of secondary
  | 3;  // NOT ALL: primary, but not all secondary

type EntryPosition =
  | 0   // Before Char Defs — inserted before character description and scenario
  | 1   // After Char Defs — inserted after character description and scenario (default)
  | 2   // Before Example Messages — injected as authored dialogue before examples
  | 3   // After Example Messages — injected as authored dialogue after examples
  | 4   // @ Depth — inserted at a specific chat depth (uses depth + role fields)
  | 5   // Top of Author's Note — inserted at top of AN content
  | 6   // Bottom of Author's Note — inserted at bottom of AN content
  | 7;  // Outlet — not injected automatically; placed via {{outlet::Name}} macro

type LorebookFormat =
  | 'ccv3'
  | 'sillytavern'
  | 'agnai'
  | 'risu'
  | 'wyvern'
  | 'unknown';
```

### CharacterFilter

```typescript
interface CharacterFilter {
  isExclude: boolean;   // If true, entry is excluded for these characters; if false, only included for them
  names: string[];      // Character names this filter applies to
  tags: string[];       // Character tags this filter applies to
}
```

### BookMeta

Book-level metadata that applies to the lorebook as a whole, not individual entries.

```typescript
interface BookMeta {
  name: string;
  description: string;
  scanDepth: number;
  tokenBudget: number;
  contextSize: number;         // Lorewalker-only display field (default 200000), not exported
  recursiveScan: boolean;
  caseSensitive: boolean;
  matchWholeWords: boolean;
  extensions: Record<string, unknown>;  // Book-level extension passthrough

  // ST-specific global settings
  minActivations: number;      // Minimum entries to activate per message (0 = disabled)
  maxDepth: number;            // Max message depth for minActivations (0 = unlimited)
  maxRecursionSteps: number;   // Max recursion passes per message (0 = unlimited)
  insertionStrategy: 'evenly' | 'character_lore_first' | 'global_lore_first';
  includeNames: boolean;       // Include participant names in keyword scan
  useGroupScoring: boolean;    // Global default for group scoring
  alertOnOverflow: boolean;    // Show alert when WI exceeds token budget
  budgetCap: number;           // Hard token cap (0 = no cap)
}
```

---

## Graph Types

### RecursionGraph

The computed directed graph of keyword-triggered activation links.

```typescript
interface RecursionGraph {
  edges: Map<string, Set<string>>;          // entryId → Set of entryIds this entry triggers
  reverseEdges: Map<string, Set<string>>;   // entryId → Set of entryIds that trigger this entry
  edgeMeta: Map<string, EdgeMeta>;          // key: "sourceId→targetId"
}

interface EdgeMeta {
  sourceId: string;
  targetId: string;
  matchedKeywords: string[];                // Keywords in source's content that matched target's keys
  blockedByPreventRecursion: boolean;       // True if source has preventRecursion: true
  blockedByExcludeRecursion: boolean;       // True if target has excludeRecursion: true
}
```

### Graph Query Results

```typescript
interface CycleResult {
  cycles: string[][];   // Each cycle is an array of entryIds forming the loop
}

interface ChainDepthResult {
  depths: Map<string, number>;   // entryId → max chain depth reachable
  longestChains: string[][];     // Chains exceeding the threshold
}

interface DeadLink {
  sourceEntryId: string;
  mentionedName: string;         // The name found in content that doesn't match any entry
  contextSnippet: string;        // Surrounding text for display
}
```

---

## Analysis Types

### Rule System

```typescript
interface Rule {
  id: string;                         // Unique, e.g., "recursion/circular-references"
  name: string;                       // Human-readable, e.g., "Circular References"
  description: string;                // What this rule checks and why it matters
  category: RuleCategory;
  severity: FindingSeverity;          // Default severity (individual findings can override)
  requiresLLM: boolean;
  evaluate(context: AnalysisContext): Promise<Finding[]>;
}

type RuleCategory =
  | 'structure'
  | 'config'
  | 'keywords'
  | 'content'
  | 'recursion'
  | 'budget';

type FindingSeverity = 'error' | 'warning' | 'suggestion';

interface AnalysisContext {
  entries: WorkingEntry[];
  bookMeta: BookMeta;
  graph: RecursionGraph;
  llmService?: LLMService;           // Only provided during LLM analysis runs
}
```

### Findings

```typescript
interface Finding {
  id: string;                         // Unique per finding instance (uuid)
  ruleId: string;                     // Which rule generated this
  severity: FindingSeverity;
  category: RuleCategory;
  message: string;                    // Human-readable description of the issue
  entryIds: string[];                 // Affected entries (may be empty for book-level findings)
  details?: string;                   // Extended explanation (shown on expand)
  fix?: SuggestedFix;                 // Optional auto-fix
  relatedKeywords?: string[];         // Populated by cross-entry keyword rules to enable navigation to the keyword analyzer
}

interface SuggestedFix {
  description: string;                // What the fix will do
  apply(entries: WorkingEntry[]): WorkingEntry[];  // Returns modified entries
}
```

### Health Score

```typescript
interface HealthScore {
  overall: number;                    // 0-100
  categories: Record<RuleCategory, CategoryScore>;
  summary: string;                    // One-line qualitative assessment
}

interface CategoryScore {
  score: number;                      // 0-100
  errorCount: number;
  warningCount: number;
  suggestionCount: number;
}
```

### Rubric

```typescript
interface Rubric {
  id: string;
  name: string;
  description: string;
  rules: Rule[];
  scoringWeights: Record<RuleCategory, number>;  // Category weights for overall score; must sum to 1.0
}

interface RubricRegistry {
  rubrics: Map<string, Rubric>;
  activeRubricId: string;
  getActiveRubric(): Rubric;
  register(rubric: Rubric): void;
}
```

### Custom Rule Types

Custom rules let users define their own per-entry checks using a visual condition builder.

```typescript
type ComparisonOp =
  | '=='
  | '!='
  | '>'
  | '<'
  | '>='
  | '<='
  | 'includes'
  | 'not-includes'
  | 'matches';   // regex

type LogicOp = 'AND' | 'OR';

interface ConditionLeaf {
  type: 'leaf';
  left: string;          // Variable path, e.g., "entry.keys.length", "entry.tokenCount"
  operator: ComparisonOp;
  right: string;         // Literal value as string (parsed at evaluation time)
}

interface ConditionGroup {
  type: 'group';
  negate: boolean;
  logic: LogicOp;
  conditions: ConditionLeaf[];
}

interface SerializedEvaluation {
  logic: LogicOp;
  items: Array<ConditionLeaf | ConditionGroup>;
}

interface CustomRule {
  id: string;
  name: string;
  description: string;
  category: RuleCategory;
  severity: FindingSeverity;
  enabled: boolean;
  requiresLLM: boolean;
  evaluation?: SerializedEvaluation;  // Deterministic rules only
  message: string;                     // Supports {{entry.name}}, {{entry.keys.length}}, etc.
  systemPrompt?: string;               // LLM rules only
  userPrompt?: string;                 // LLM rules only
  createdAt: string;
  updatedAt: string;
}

// Per-document rule overrides (stored in DocumentStore, excluded from undo)
interface DocumentRuleOverrides {
  disabledRuleIds: string[];    // Disable specific built-in or workspace rules for this document
  customRules: CustomRule[];    // Document-scoped custom rules (not shared across workspace)
}
```

---

## Simulator Types

### Context and Configuration

```typescript
interface SimulationContext {
  messages: SimMessage[];
  scanDepth: number;
  tokenBudget: number;
  caseSensitive: boolean;
  matchWholeWords: boolean;
  maxRecursionSteps: number;
  includeNames: boolean;
  characterName?: string;
  userName?: string;
}

interface SimMessage {
  role: 'user' | 'assistant' | 'system';
  name?: string;
  content: string;
}

interface SimulationSettings {
  defaultScanDepth: number;
  defaultTokenBudget: number;
  defaultCaseSensitive: boolean;
  defaultMatchWholeWords: boolean;
  defaultMaxRecursionSteps: number;
  defaultIncludeNames: boolean;
}
```

### Engine Interface

```typescript
interface ActivationEngine {
  id: string;
  name: string;
  description: string;
  supportedFeatures: EngineFeature[];
  simulate(
    entries: WorkingEntry[],
    context: SimulationContext,
    priorState?: TimedEffectState
  ): ActivationResult;
}

type EngineFeature =
  | 'selective-logic'
  | 'recursion'
  | 'prevent-recursion'
  | 'timed-effects'
  | 'probability'
  | 'budget-management'
  | 'regex-keys'
  | 'inclusion-groups';
```

### Results

```typescript
interface ActivationResult {
  activatedEntries: ActivatedEntry[];
  skippedEntries: SkippedEntry[];
  totalTokens: number;
  budgetRemaining: number;
  budgetExhausted: boolean;
  recursionTrace: RecursionStep[];
  timedEffectState: TimedEffectState;
}

interface ActivatedEntry {
  entryId: string;
  activatedBy: 'constant' | 'keyword' | 'recursion';
  triggerChain: string[];
  matchedKeywords: string[];
  matchedInMessage: number;
  tokenCost: number;
  insertionPosition: EntryPosition;
  insertionOrder: number;
}

interface SkippedEntry {
  entryId: string;
  reason: 'budget-exhausted' | 'probability-failed' | 'cooldown' | 'delay' | 'disabled';
  matchedKeywords: string[];
}

interface RecursionStep {
  step: number;
  scannedEntryId: string;
  triggeredByEntryId: string | null;
  activatedEntryIds: string[];
  matchDetails: { entryId: string; keyword: string }[];
}

interface TimedEffectState {
  stickyEntries: Map<string, number>;
  cooldownEntries: Map<string, number>;
  messageCount: number;
}

// Stored in DocumentStore for multi-message replay
interface SimulatorState {
  messages: SimMessage[];
  settings: SimulationSettings;
  lastResult: ActivationResult | null;
  conversationHistory: ConversationStep[];
  connectionsMode: boolean;  // When true, graph shows simulator activation state
}

interface ConversationStep {
  messageIndex: number;
  message: SimMessage;
  result: ActivationResult;
}
```

---

## LLM Types

### Provider System

```typescript
interface LLMProvider {
  id: string;
  name: string;
  type: LLMProviderType;
  config: ProviderConfig;
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  streamComplete?(request: CompletionRequest): AsyncIterable<string>;
  estimateTokens(text: string): number;
  testConnection(): Promise<{ success: boolean; error?: string }>;
}

type LLMProviderType = 'openai-compatible' | 'anthropic';

interface ProviderConfig {
  apiBase: string;         // e.g., "https://api.openai.com/v1" or "http://localhost:11434/v1"
  apiKey: string;          // Empty string for keyless endpoints (Ollama)
  model: string;           // e.g., "gpt-4o", "claude-sonnet-4-20250514", "llama3"
  maxTokens: number;
  temperature: number;
}
```

### Request/Response

```typescript
interface CompletionRequest {
  systemPrompt: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  maxTokens?: number;
  temperature?: number;
  responseFormat?: 'text' | 'json';
}

interface CompletionResponse {
  content: string;
  usage: TokenUsage;
  model: string;
}

interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}
```

---

## Workspace Types

### ThemeId

```typescript
type ThemeId =
  | 'dark'
  | 'catppuccin-macchiato'
  | 'catppuccin-latte'
  | 'catppuccin-frappe'
  | 'catppuccin-mocha'
  | 'nord'
  | 'nord-aurora'
  | 'one-dark'
  | 'dracula'
  | 'dracula-soft'
  | 'rose-pine'
  | 'rose-pine-dawn'
  | 'tokyo-night'
  | 'tokyo-night-day';

// Light themes — affect colorMode in React Flow, MiniMap mask colors, etc.
const LIGHT_THEMES: ThemeId[] = [
  'catppuccin-latte', 'nord-aurora', 'rose-pine-dawn', 'tokyo-night-day'
];
```

### GraphLayoutSettings

```typescript
interface GraphLayoutSettings {
  acyclicer: 'greedy' | 'none';
  ranker: 'network-simplex' | 'tight-tree' | 'longest-path';
  align: 'UL' | 'UR' | 'DL' | 'DR';
  rankdir: 'LR' | 'TB' | 'RL' | 'BT';
  edgeDirection: 'LR' | 'TB';  // used by EntryNode to orient handles
}
```

### GraphDisplayDefaults

```typescript
interface GraphDisplayDefaults {
  connectionVisibility: 'all' | 'selected' | 'none';
  showBlockedEdges: boolean;
  edgeStyle: 'bezier' | 'straight' | 'smoothstep';
}
```

### EditorDefaults

```typescript
interface EditorDefaults {
  showKeywordHighlights: boolean;
  categoryBehavior: 'remember' | 'reset';  // Whether editor tab selection persists between entries
  lastEditorCategory: string;              // The last category the user was viewing in the editor
}
```

### SortKey

```typescript
type SortKey = 'uid' | 'name' | 'tokenCount' | 'order' | 'displayIndex';
```

### EntriesListDefaults

```typescript
interface EntriesListDefaults {
  sortBy: SortKey;
  sortDirection: 'asc' | 'desc';
  sortBy2: SortKey | null;
  sortDir2: 'asc' | 'desc';
  pinConstantsToTop: boolean;
}
```

### LorebookDefaults

Workspace-level default settings applied when creating new lorebooks or as fallback values in the simulator.

```typescript
interface LorebookDefaults {
  scanDepth: number;              // 0–1000, default: 2
  contextBudgetPercent: number;   // 0–100%, default: 25
  budgetCap: number;              // 0 = disabled, default: 0
  minActivations: number;         // 0 = disabled, default: 0
  maxDepth: number;               // 0 = unlimited, default: 0
  maxRecursionSteps: number;      // 0 = unlimited, default: 0
  includeNames: boolean;          // default: true
  recursiveScan: boolean;         // default: true
  caseSensitive: boolean;         // default: false
  matchWholeWords: boolean;       // default: true
  useGroupScoring: boolean;       // default: false
  alertOnOverflow: boolean;       // default: false
  insertionStrategy: 'evenly' | 'character_lore_first' | 'global_lore_first';
}
```

### LlmCategorizationSettings

```typescript
interface LlmCategorizationSettings {
  enabled: boolean;
  providerId?: string;
  skipManualOverrides: boolean;
}
```

### WorkspaceState

The actual shape of WorkspaceStore (Zustand).

```typescript
interface WorkspaceState {
  tabs: TabMeta[];
  activeTabId: string | null;
  theme: ThemeId;
  graphSettings: GraphLayoutSettings;
  checkRecursionLoops: boolean;         // whether to compute cycle detection
  graphDisplayDefaults: GraphDisplayDefaults;
  editorDefaults: EditorDefaults;
  entriesListDefaults: EntriesListDefaults;
  lorebookDefaults: LorebookDefaults;
  activeLlmProviderId: string | null;   // Currently selected provider for deep analysis
  llmCategorization: LlmCategorizationSettings;
  customRules: CustomRule[];            // Workspace-scoped custom rules (shared across all docs)
  disabledBuiltinRuleIds: string[];     // Built-in rule IDs disabled globally

  // Actions
  openTab(tabId: string, name: string, fileMeta: FileMeta): void;
  closeTab(tabId: string): void;
  switchTab(tabId: string): void;
  markDirty(tabId: string, isDirty: boolean): void;
  setTheme(theme: ThemeId): void;
  setGraphSettings(settings: GraphLayoutSettings): void;
  setCheckRecursionLoops(value: boolean): void;
  setGraphDisplayDefaults(settings: GraphDisplayDefaults): void;
  setEditorDefaults(settings: EditorDefaults): void;
  setEntriesListDefaults(settings: EntriesListDefaults): void;
  setLorebookDefaults(patch: Partial<LorebookDefaults>): void;
  setActiveLlmProviderId(id: string | null): void;
  setLlmCategorizationSettings(patch: Partial<LlmCategorizationSettings>): void;
  addCustomRule(rule: CustomRule): void;
  updateCustomRule(id: string, updates: Partial<CustomRule>): void;
  deleteCustomRule(id: string): void;
  toggleBuiltinRule(ruleId: string, enabled: boolean): void;
  setCustomRules(rules: CustomRule[]): void;
  setDisabledBuiltinRuleIds(ids: string[]): void;
}

interface TabMeta {
  id: string;
  name: string;
  fileMeta: FileMeta;
  dirty: boolean;
}

interface FileMeta {
  fileName: string;
  originalFormat: LorebookFormat;
  lastSavedAt: string | null;
  sourceType: 'standalone' | 'embedded-in-card';
}
```

### DocumentState

Created by the DocumentStore factory. One instance per open tab.

```typescript
interface SelectionState {
  selectedEntryId: string | null;
  multiSelect: string[];
}

interface DocumentState {
  // Persisted state (included in undo history via zundo partialize)
  entries: WorkingEntry[];
  graphPositions: Map<string, { x: number; y: number }>;
  bookMeta: BookMeta;

  // Analysis state (derived — NOT in undo history, NOT cleared by entry edits)
  findings: Finding[];
  healthScore: HealthScore;

  // LLM findings (user-triggered — NOT in undo history, NOT cleared on entry edits)
  llmFindings: Finding[];

  // Rule overrides (excluded from undo)
  ruleOverrides: DocumentRuleOverrides;

  // UI state (excluded from undo)
  selection: SelectionState;
  simulatorState: SimulatorState;

  // Actions — Entry
  updateEntry(id: string, changes: Partial<WorkingEntry>): void;
  addEntry(partial?: Partial<WorkingEntry>): string;
  removeEntry(id: string): void;
  reorderEntries(ids: string[]): void;
  batchUpdate(updates: Map<string, Partial<WorkingEntry>>): void;
  setEntryCategory(entryId: string, category: string | undefined): void;
  setCategoryBatch(updates: Record<string, string>): void;

  // Actions — BookMeta
  updateBookMeta(changes: Partial<BookMeta>): void;

  // Actions — Graph positions (bypass zundo)
  setGraphPosition(id: string, pos: { x: number; y: number }): void;

  // Actions — Bulk operations
  bulkEnable(ids: string[]): void;
  bulkDisable(ids: string[]): void;
  bulkRemove(ids: string[]): void;
  clearMultiSelect(): void;

  // Actions — Selection (bypass zundo)
  selectEntry(id: string | null): void;
  toggleMultiSelect(id: string): void;
  clearSelection(): void;

  // Actions — Simulator (bypass zundo)
  setSimulatorMessages(messages: SimMessage[]): void;
  updateSimulatorSettings(patch: Partial<SimulationSettings>): void;
  setSimulatorResult(result: ActivationResult | null): void;
  appendConversationStep(step: ConversationStep): void;
  clearConversationHistory(): void;
  clearSimulation(): void;
  setConnectionsMode(enabled: boolean): void;

  // Actions — Rule overrides (bypass zundo)
  setDocumentRuleOverride(ruleId: string, disabled: boolean): void;
  addDocumentRule(rule: CustomRule): void;
  updateDocumentRule(id: string, updates: Partial<CustomRule>): void;
  removeDocumentRule(id: string): void;

  // Actions — LLM findings (bypass zundo)
  setLlmFindings(findings: Finding[]): void;

  // Temporal (provided by zundo)
  undo(): void;
  redo(): void;
  canUndo: boolean;
  canRedo: boolean;
}
```

---

## Graph Component Types

### EntryNodeData

Data shape for the `EntryNode` React Flow custom node.

```typescript
interface EntryNodeData {
  entry: WorkingEntry;
  isCyclic: boolean;
  isDimmed: boolean;           // True when graph search is active and this node doesn't match
  activationStatus?: 'activated-constant' | 'activated-keyword' | 'activated-recursion' | 'skipped';
  edgeDirection: 'LR' | 'TB';
  [key: string]: unknown;  // React Flow requires open indexer on node data
}
```

---

## Persistence Types

```typescript
interface PersistedWorkspace {
  tabs: TabMeta[];
  activeTabId: string | null;
  theme: ThemeId;
  panelLayout: PanelLayout;
}

interface PersistedDocument {
  tabId: string;
  entries: WorkingEntry[];
  graphPositions: Record<string, { x: number; y: number }>;
  bookMeta: BookMeta;
  fileMeta: FileMeta;
  simulatorState: SimulatorState;
  ruleOverrides: DocumentRuleOverrides;
  savedAt: string;  // ISO timestamp
}

interface PersistedSnapshot {
  id: string;
  tabId: string;
  name: string;
  savedAt: string;  // ISO timestamp
  entries: WorkingEntry[];
  bookMeta: BookMeta;
}

interface PersistedPreferences {
  simulationDefaults: SimulationSettings;
  autosaveIntervalMs: number;
  recoveryRetentionDays: number;
}

interface PersistedProvider {
  id: string;
  name: string;
  type: LLMProviderType;
  config: Omit<ProviderConfig, 'apiKey'>;  // Key stored separately for Tauri keychain
  apiKey: string;                           // Stored in same record for browser IndexedDB
}
```

---

## UI State Types

```typescript
interface FileMeta {
  fileName: string;
  originalFormat: LorebookFormat;
  lastSavedAt: string | null;
  sourceType: 'standalone' | 'embedded-in-card';
}

interface TabMeta {
  id: string;
  name: string;
  fileMeta: FileMeta;
  dirty: boolean;
}

interface EntryListFilter {
  search: string;
  showDisabled: boolean;
  filterByType: EntryTypeFilter | null;
  sortBy: 'name' | 'order' | 'position' | 'tokenCount' | 'health';
  sortDirection: 'asc' | 'desc';
}

type EntryTypeFilter =
  | 'constant'
  | 'keyword'
  | 'selective'
  | 'sticky'
  | 'disabled';

interface GraphFilter {
  showBlockedEdges: boolean;
  highlightCycles: boolean;
  filterByEntryType: EntryTypeFilter | null;
  dimUnconnected: boolean;
}

interface PanelLayout {
  leftPanelWidth: number;
  rightPanelWidth: number;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  rightPanelTab: 'lorebook' | 'entry' | 'analysis' | 'inspector' | 'simulator';
  leftPanelTab: 'files' | 'entries';
}
```

---

## Keyword Matching Types

Shared between GraphService and SimulatorService.

```typescript
interface KeywordMatchOptions {
  caseSensitive: boolean;
  matchWholeWords: boolean;
}

interface KeywordMatch {
  keyword: string;          // The keyword that matched
  entryId: string;          // The entry whose key matched
  position: number;         // Character offset in the scanned text
  isRegex: boolean;         // Whether this was a regex match
}

// Function signatures (implemented in services/simulator/keyword-matching.ts, imported by both GraphService and SimulatorService)
type MatchKeywordsInText = (
  text: string,
  entries: WorkingEntry[],
  options: KeywordMatchOptions
) => KeywordMatch[];

type DoesEntryMatchText = (
  entry: WorkingEntry,
  text: string,
  options: KeywordMatchOptions
) => KeywordMatch[];
```
