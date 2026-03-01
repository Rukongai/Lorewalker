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
  delay: number;                  // Messages before entry can activate (0 = immediate)
  cooldown: number;               // Messages entry can't activate after deactivation
  sticky: number;                 // Messages entry stays active after trigger (0 = keyword-only)
  probability: number;            // Percent chance to activate when triggered (1-100)

  // === Recursion Control ===
  preventRecursion: boolean;      // If true, this entry's keys can't be triggered by other entries' content
  excludeRecursion: boolean;      // If true, this entry's content is invisible to recursive scanning

  // === Budget ===
  ignoreBudget: boolean;          // If true, ignores token budget limits

  // === Computed (read-only, set by TransformService) ===
  tokenCount: number;             // Estimated token count of content field

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

### BookMeta

Book-level metadata that applies to the lorebook as a whole, not individual entries.

```typescript
interface BookMeta {
  name: string;
  description: string;
  scanDepth: number;
  tokenBudget: number;
  recursiveScan: boolean;
  caseSensitive: boolean;
  matchWholeWords: boolean;
  extensions: Record<string, unknown>;  // Book-level extension passthrough
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
  scoringWeights: Record<RuleCategory, number>;  // Category weights for overall score
}

interface RubricRegistry {
  rubrics: Map<string, Rubric>;
  activeRubricId: string;
  getActiveRubric(): Rubric;
  register(rubric: Rubric): void;
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
  activatedEntryIds: string[];
  matchDetails: { entryId: string; keyword: string }[];
}

interface TimedEffectState {
  stickyEntries: Map<string, number>;
  cooldownEntries: Map<string, number>;
  messageCount: number;
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

## Persistence Types

```typescript
interface PersistedWorkspace {
  tabs: TabMeta[];
  activeTabId: string | null;
  theme: 'dark' | 'light';
  panelLayout: PanelLayout;
}

interface PersistedDocument {
  tabId: string;
  entries: WorkingEntry[];
  graphPositions: Record<string, { x: number; y: number }>;
  bookMeta: BookMeta;
  fileMeta: FileMeta;
  simulatorState: SimulatorState;
  savedAt: string;  // ISO timestamp
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
  rightPanelTab: 'editor' | 'analysis' | 'simulator' | 'inspector';
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

// Function signatures (implemented in GraphService, imported by SimulatorService)
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
