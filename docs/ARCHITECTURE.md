# Lorewalker — Architecture Reference

This document is the source of truth for Lorewalker's design. Implementation agents must consult this before making structural decisions. If something doesn't have a clear home here, that's a signal to propose an architecture update — not to improvise.

---

## Component Map

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Lorewalker Application                       │
├──────────┬──────────┬──────────┬──────────┬──────────┬──────────────┤
│   File   │Transform │  Graph   │ Analysis │Simulator │    LLM       │
│  Service │ Service  │ Service  │ Service  │ Service  │  Service     │
├──────────┴──────────┴──────────┴──────────┴──────────┴──────────────┤
│                         State Layer                                  │
│  ┌─────────────────┐  ┌──────────────────────────────────────────┐  │
│  │ WorkspaceStore   │  │ DocumentStore (one per tab)              │  │
│  │ - tabs           │  │ - entries: WorkingEntry[]                │  │
│  │ - activeTabId    │  │ - graphPositions: Map<id, {x,y}>        │  │
│  │ - preferences    │  │ - selection: SelectionState              │  │
│  │ - llmConfig      │  │ - simulatorState: SimulatorState         │  │
│  │                  │  │ - derived: { graph, findings, health }   │  │
│  │                  │  │ - temporal: undo/redo via zundo          │  │
│  └─────────────────┘  └──────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│                      Persistence Layer                               │
│  IndexedDB: autosave, session recovery, preferences, API keys       │
├─────────────────────────────────────────────────────────────────────┤
│                        UI Layer                                      │
│  WorkspaceShell > TabBar, EntryList, GraphCanvas, EntryEditor,      │
│  AnalysisPanel, SimulatorPanel, Inspector, SettingsDialog            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Service Inventory

### FileService

**Owns:** File import, file export, format detection, file-system interaction (browser File API and future Tauri FS API).

**Does not own:** Data transformation (delegates to TransformService), working model management (that's the store).

**Responsibilities:**
- Accept files from drag-drop, file picker, or clipboard
- Detect whether input is a standalone lorebook or a character card containing lorebooks
- For character cards: extract lorebook collection, present available lorebooks to user for selection
- Call TransformService.inflate() to produce WorkingEntry[] from parsed data
- Call TransformService.deflate() to produce CCv3 from WorkingEntry[]
- Call character-foundry serializeLorebook() for final format conversion
- Trigger browser download or Tauri save dialog for export
- Track original file metadata (name, format, source format) for round-trip fidelity

**Dependencies:** @character-foundry/character-foundry (parseLorebook, parseCard, serializeLorebook, getLorebookCollection), TransformService

**Does not:**
- Fetch lorebooks from URLs (no network requests to external sources)
- Store files (that's PersistenceService for recovery, or the user's filesystem for saves)

---

### TransformService

**Owns:** Bidirectional conversion between CCv3CharacterBook and WorkingEntry[].

**Does not own:** File I/O, format detection, CCv3-to-platform serialization (FileService handles those).

**Responsibilities:**
- Inflate: CCv3CharacterBook → WorkingEntry[]
  - Flatten entry fields + extensions.sillytavern fields into WorkingEntry
  - Assign stable internal IDs (uuid v4)
  - Compute token counts via character-foundry countTokens()
  - Preserve unknown extensions in a passthrough bucket for round-trip
- Deflate: WorkingEntry[] → CCv3CharacterBook
  - Reconstruct CCv3 entry structure from flat WorkingEntry
  - Rebuild extensions.sillytavern from flattened fields
  - Restore passthrough extensions
  - Reconstruct book-level metadata (name, description, etc.)

**Dependencies:** @character-foundry/character-foundry (countTokens)

**Design note:** This service is pure functions with no state. It's a transformation layer, not a stateful service. All functions are synchronous.

---

### GraphService

**Owns:** Recursion graph computation, keyword matching logic, graph queries, layout computation.

**Does not own:** Entry data, editing, display, or activation simulation (though it shares matching logic with SimulatorService).

**Responsibilities:**
- Build RecursionGraph from WorkingEntry[] by scanning each entry's content for matches against other entries' keys
- Incremental update: when entries change, recompute only affected edges
- Keyword matching: exact substring, case sensitivity, whole word boundary, regex support
- Graph queries:
  - findCycles(): detect circular references, return the cycle paths
  - computeChainDepths(): for each entry, compute max depth reachable
  - findOrphans(): entries with no incoming edges and not constant
  - findIslands(): entries with no incoming or outgoing edges and not constant
  - findHubs(): entries with high outgoing edge count
  - findLeaves(): entries with incoming edges but no outgoing
  - findDeadLinks(): names mentioned in content that don't match any entry's keys
  - getAncestors(entryId): all entries that can reach this entry
  - getDescendants(entryId): all entries reachable from this entry
- Auto-layout: compute node positions using dagre or elkjs for directed graph layout

**Dependencies:** None (pure computation, receives data as arguments)

**Shared logic:** The keyword matching functions (matchKeyword, matchKeywordInContent) are defined in GraphService and imported by SimulatorService. This prevents duplicate matching implementations.

---

### AnalysisService

**Owns:** Health scoring, issue detection, rubric management, finding generation.

**Does not own:** Graph computation (delegates to GraphService), entry editing, LLM calls (delegates to LLMService).

**Responsibilities:**
- Maintain a RubricRegistry containing rule collections
- Ship a DefaultRubric implementing the review checklist (see Rules Catalog below)
- Execute rubrics: run all rules against (entries, graph) → Finding[]
- Compute HealthScore from aggregate findings
- Support two execution modes:
  - Deterministic: runs automatically when entries change (debounced)
  - LLM-powered: runs on explicit user request only
- Provide filtered/grouped finding views (by severity, category, entry)

**Rule interface:**
```typescript
interface Rule {
  id: string;
  name: string;
  description: string;
  category: RuleCategory;
  severity: 'error' | 'warning' | 'suggestion';
  requiresLLM: boolean;
  evaluate(context: AnalysisContext): Promise<Finding[]>;
}
```

Rules that require LLM set `requiresLLM: true`. The AnalysisService skips these during automatic runs and only executes them when the user triggers a "Deep Analysis."

**Dependencies:** GraphService (for graph queries), LLMService (for LLM-powered rules)

---

### SimulatorService

**Owns:** Entry activation simulation, multi-message replay, platform-specific activation logic.

**Does not own:** Entry editing, analysis findings, graph computation (though it uses shared keyword matching).

**Responsibilities:**
- Define the ActivationEngine interface for pluggable platform support
- Ship SillyTavernEngine as the first implementation
- Execute simulation: given messages + settings + entries → ActivationResult
- Support single-message and multi-message (conversation replay) modes
- Produce detailed recursion traces for UI visualization
- Handle timed effects (delay, sticky, cooldown) across multi-message simulations

**SillyTavernEngine activation loop:**
1. Scan messages within scanDepth for primary keyword matches (using shared keyword matching from GraphService)
2. Apply selective/secondary key logic (AND ANY, AND ALL, NOT ANY, NOT ALL)
3. Filter by timed effects (delay, cooldown state)
4. Apply probability rolls
5. Sort activated entries: constant first, then by order value descending
6. Begin recursion: scan activated entries' content for keywords of non-activated entries
7. Respect preventRecursion and excludeRecursion flags
8. Repeat recursion up to maxRecursionSteps
9. Apply token budget: insert entries in priority order until budget exhausted
10. Apply sticky durations for multi-message mode

**Engine interface:**
```typescript
interface ActivationEngine {
  id: string;
  name: string;
  simulate(
    entries: WorkingEntry[],
    context: SimulationContext
  ): ActivationResult;
}
```

**Dependencies:** GraphService (shared keyword matching functions)

**Design note:** Engines are pure functions. SimulatorService manages state (conversation history for multi-message mode, timed effect tracking) and delegates the per-step activation logic to the engine.

---

### LLMService

**Owns:** Provider management, API key storage, request construction, response parsing, cost estimation.

**Does not own:** Prompt content for specific analysis rules (that's defined in the rules themselves), when to call an LLM (that's AnalysisService's decision).

**Responsibilities:**
- Maintain a ProviderRegistry with configured providers
- Ship three provider types:
  1. OpenAICompatibleProvider: works with any OpenAI-compatible API (OpenAI, Ollama, LM Studio, Together, Groq, custom)
  2. AnthropicProvider: Anthropic's message API
  3. OllamaProvider (convenience): pre-configured OpenAICompatible pointing at localhost
- Execute completion requests: send messages, receive text responses
- Handle streaming responses (for UI feedback during long analysis)
- Estimate token costs before execution (for user confirmation on bulk operations)
- Store API keys securely (PersistenceService handles the actual storage)

**Provider interface:**
```typescript
interface LLMProvider {
  id: string;
  name: string;
  type: 'openai-compatible' | 'anthropic';
  config: ProviderConfig;
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  estimateTokens(text: string): number;
}

interface ProviderConfig {
  apiBase: string;
  apiKey: string;       // empty string for keyless (Ollama)
  model: string;
  maxTokens: number;
  temperature: number;
}

interface CompletionRequest {
  systemPrompt: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  maxTokens?: number;
  temperature?: number;
  responseFormat?: 'text' | 'json';
}

interface CompletionResponse {
  content: string;
  usage: { promptTokens: number; completionTokens: number };
  model: string;
}
```

**Dependencies:** PersistenceService (for key storage)

**Security:** API keys are stored in IndexedDB. On Tauri, they use the platform keychain when available. Keys are never sent to any server except the configured API endpoint. The UI warns users that keys are stored locally.

---

### PersistenceService

**Owns:** IndexedDB operations, autosave scheduling, session recovery, preferences storage.

**Does not own:** File export (that's FileService), working model logic (that's the store).

**Responsibilities:**
- Autosave each tab's document store to IndexedDB on a debounced interval (2-3 seconds after last edit)
- Persist workspace state (open tabs, active tab, panel sizes, theme preference)
- Detect recovery sessions on app launch and offer restoration
- Store LLM provider configurations and API keys
- Store user preferences (default simulator settings, rubric selections, UI state)
- Clean up stale recovery data (older than N days, configurable)

**Storage schema (IndexedDB):**
```
lorewalker-db/
  workspace/          → single record: tab list, active tab, panel layout
  documents/{tabId}/  → per-tab: entries, graphPositions, simulatorState, fileMeta
  preferences/        → user preferences, theme, defaults
  providers/          → LLM provider configurations (keys encrypted on Tauri)
```

**Dependencies:** idb-keyval or Dexie (IndexedDB wrapper)

---

## State Architecture

### WorkspaceStore (Zustand)

Global singleton. Not included in any undo history.

```typescript
interface WorkspaceState {
  tabs: TabMeta[];
  activeTabId: string | null;
  recentFiles: FileMeta[];
  theme: 'dark' | 'light';

  // Actions
  openTab(file: ImportedFile): string;  // returns tabId
  closeTab(tabId: string): void;
  switchTab(tabId: string): void;
  setTheme(theme: 'dark' | 'light'): void;
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

### DocumentStore (Zustand + zundo, one per tab)

Created when a tab opens, destroyed when it closes.

```typescript
interface DocumentState {
  // Persisted state (included in undo history)
  entries: WorkingEntry[];
  graphPositions: Map<string, { x: number; y: number }>;
  bookMeta: BookMeta;

  // UI state (not in undo history)
  selection: SelectionState;
  simulatorState: SimulatorState;
  entryListFilter: EntryListFilter;
  graphFilter: GraphFilter;

  // Derived state (recomputed, not stored, not in undo)
  graph: RecursionGraph;
  findings: Finding[];
  healthScore: HealthScore;

  // Actions
  updateEntry(id: string, changes: Partial<WorkingEntry>): void;
  addEntry(entry: Partial<WorkingEntry>): string;
  removeEntry(id: string): void;
  reorderEntries(ids: string[]): void;
  batchUpdate(updates: Map<string, Partial<WorkingEntry>>): void;
  setGraphPosition(id: string, pos: { x: number; y: number }): void;
  selectEntry(id: string | null): void;

  // Temporal
  undo(): void;
  redo(): void;
  canUndo: boolean;
  canRedo: boolean;
}

interface BookMeta {
  name: string;
  description: string;
  scanDepth: number;
  tokenBudget: number;
  recursiveScan: boolean;
  extensions: Record<string, unknown>;
}

interface SelectionState {
  selectedEntryId: string | null;
  selectedEdge: { source: string; target: string } | null;
  multiSelect: string[];
}

interface SimulatorState {
  messages: SimMessage[];
  settings: SimulationSettings;
  lastResult: ActivationResult | null;
  conversationHistory: ConversationStep[];  // for multi-message replay
}
```

### Undo/Redo Scoping

Zundo (temporal middleware) wraps only the persisted state fields: `entries`, `graphPositions`, `bookMeta`. UI state (selection, filters, simulator state) and derived state (graph, findings) are excluded.

The undo history stores state diffs, not full snapshots. For lorebooks in the typical size range (20-500 entries), this is memory-efficient.

Actions that modify entries should be batched when they represent a single logical operation. For example, "auto-fix all keyword warnings" is one undo step, not 50.

---

## Data Flow

### Import Flow

```
User drops file
  → FileService.import(file)
    → character-foundry parseLorebook(buffer) or parseCard(buffer)
    → If card: getLorebookCollection() → user selects which book
    → TransformService.inflate(ccv3Book)
      → Flatten each entry to WorkingEntry
      → Assign stable UUIDs
      → Compute token counts
    → WorkspaceStore.openTab(importedData)
    → DocumentStore created with entries + default positions
    → GraphService.buildGraph(entries) → stored as derived state
    → AnalysisService.runDeterministic(entries, graph) → findings + health
```

### Edit Flow

```
User edits entry (via form editor or graph interaction)
  → DocumentStore.updateEntry(id, changes)
    → Immer produces new state
    → Zundo records undo checkpoint
    → Derived state recomputes:
      → GraphService.incrementalUpdate(changedEntry, entries)
      → AnalysisService.runDeterministic(entries, graph)
    → PersistenceService.scheduleAutosave(tabId)
    → WorkspaceStore marks tab dirty
```

### Export Flow

```
User clicks Save/Export
  → FileService.export(entries, format, fileMeta)
    → TransformService.deflate(entries)
    → character-foundry serializeLorebook(ccv3Book, targetFormat)
    → Browser download dialog or Tauri save dialog
    → On success: clear dirty flag, update lastSavedAt
```

### LLM Analysis Flow

```
User clicks "Deep Analysis"
  → UI shows cost estimate (LLMService.estimateTokens)
  → User confirms
  → AnalysisService.runLLMRules(entries, graph, llmService)
    → Each LLM rule constructs its prompt
    → LLMService.complete(request)
    → Rule parses response into Finding[]
  → Findings merged with deterministic findings
  → Health score recomputed
```

---

## Analysis Rules Catalog

### Deterministic Rules (auto-run)

**Structure category:**
- `structure/valid-json`: Verify entries have all required fields with correct types
- `structure/uid-consistency`: Check that UIDs are sequential and non-duplicate
- `structure/field-types`: Validate field value ranges (position 0-4, probability 1-100, etc.)

**Configuration category:**
- `config/selective-logic`: Flag selective:true with empty keysecondary (error)
- `config/unused-secondary`: Flag non-empty keysecondary with selective:false (suggestion)
- `config/position-alignment`: Constant entries should have position 4; sticky entries should have position 3 (warning)
- `config/rule-content-mismatch`: Content starts with RULE: but constant is false (warning)
- `config/fixed-value-deviations`: Check vectorized, useProbability, excludeRecursion, addMemo against expected defaults (warning)
- `config/disabled-entries`: Flag disable:true entries (suggestion — might be intentional)
- `config/sticky-on-non-events`: Sticky > 0 on character/location entries (warning)

**Keyword category:**
- `keywords/empty-keys`: Non-constant entry with empty key array (error)
- `keywords/generic-keywords`: Flag common overly-generic keywords like "sword", "magic", "the" (warning)
- `keywords/overly-specific`: Flag keywords longer than N words that require exact phrase match (suggestion)
- `keywords/duplicate-keywords`: Two entries sharing identical keywords (warning)
- `keywords/substring-overlap`: One entry's keyword is a substring of another's (warning)
- `keywords/keyword-count`: Flag entries with fewer than 2 or more than 5 keywords (suggestion)
- `keywords/redundant-constant-keys`: Constant entries where keywords serve no recursion purpose (suggestion)

**Recursion category:**
- `recursion/circular-references`: Detect cycles in the recursion graph where neither participant has preventRecursion:true (error)
- `recursion/long-chains`: Chains longer than 3 hops (suggestion)
- `recursion/orphaned-entries`: Non-constant entries never referenced by any other entry's content (suggestion)
- `recursion/dead-links`: Content mentions names that don't match any entry's keywords (warning)
- `recursion/prevent-recursion-correctness`: Check preventRecursion against entity type conventions (suggestion)
- `recursion/island-entries`: Entries with no incoming or outgoing edges, not constant (suggestion)

**Budget category:**
- `budget/constant-token-cost`: Flag constant entries over 100 tokens (warning)
- `budget/entry-token-size`: Flag entries over 200 tokens (warning), under 30 tokens (suggestion)
- `budget/total-constant-cost`: Flag when total constant token cost exceeds threshold (warning)
- `budget/constant-count`: Flag when more than 7 constant entries exist (warning)
- `budget/ignore-budget-usage`: Flag ignoreBudget:true entries (warning)

### LLM-Powered Rules (on-demand)

**Content category:**
- `content/quality-assessment`: Evaluate if content is evocative vs flat prose
- `content/structure-check`: Check if entries use bracketed data format effectively
- `content/rule-language`: Evaluate if rule entries use sufficiently forceful language
- `content/scope-check`: Detect entries covering multiple concepts that should be split
- `content/contradiction-detection`: Find factual contradictions between entries
- `content/relationship-consistency`: Check bidirectional relationship references

**Keyword category (LLM-enhanced):**
- `keywords/missing-variations`: Suggest natural keyword variations the author might have missed
- `keywords/keyword-quality`: Assess if keywords match how people naturally reference the concept

**Architecture category:**
- `content/splitting-suggestions`: For oversized entries, suggest how to split them
- `content/dead-link-resolution`: For dead links, draft suggested new entries

---

## Recursion Graph

### Data Structure

```typescript
interface RecursionGraph {
  edges: Map<string, Set<string>>;         // entryId → Set of triggered entryIds
  reverseEdges: Map<string, Set<string>>;  // entryId → Set of triggering entryIds
  edgeMeta: Map<string, EdgeMeta>;         // "sourceId→targetId" → metadata
}

interface EdgeMeta {
  sourceId: string;
  targetId: string;
  matchedKeywords: string[];                // which keywords in content triggered this
  blockedByPreventRecursion: boolean;       // True if source has preventRecursion: true (source's content won't be scanned)
  blockedByExcludeRecursion: boolean;       // True if target has excludeRecursion: true (target's keys can't be triggered by recursion)
}
```

### Computation

The graph is built by scanning each entry's `content` field for substrings matching other entries' `keys`. The matching uses the same logic as the activation simulator (case sensitivity, whole word, regex). Per-entry `caseSensitive` and `matchWholeWords` overrides are resolved at edge-build time: the target entry's setting takes precedence over the book-level default (null = use book default).

Edges where the target entry has `preventRecursion: true` are still recorded but marked as `blockedByPreventRecursion`. Edges where the source entry has `excludeRecursion: true` are still recorded but marked as `blockedByExcludeRecursion`. Both flags render the edge as dashed in the graph. This is important for visualization — the user should see that the link *exists* but is *blocked*, which is different from the link not existing at all.

### Incremental Update

When an entry's `content` changes: rescan only that entry's outgoing edges.

When an entry's `keys` change: rescan ALL entries' content for matches against the new keys (incoming edges to the changed entry).

When an entry is added or removed: full graph rebuild. (This is infrequent enough that optimization isn't needed.)

---

## Activation Simulator Detail

### SimulationContext

```typescript
interface SimulationContext {
  messages: SimMessage[];
  scanDepth: number;
  tokenBudget: number;
  caseSensitive: boolean;
  matchWholeWords: boolean;
  maxRecursionSteps: number;      // 0 = unlimited (budget-limited only)
  includeNames: boolean;          // prefix messages with character names
  characterName?: string;         // for name prefixing
  userName?: string;
}

interface SimMessage {
  role: 'user' | 'assistant' | 'system';
  name?: string;
  content: string;
}

interface SimulationSettings {
  // Persisted user defaults
  defaultScanDepth: number;
  defaultTokenBudget: number;
  defaultCaseSensitive: boolean;
  defaultMatchWholeWords: boolean;
  defaultMaxRecursionSteps: number;
  defaultIncludeNames: boolean;
}
```

### ActivationResult

```typescript
interface ActivationResult {
  activatedEntries: ActivatedEntry[];
  skippedEntries: SkippedEntry[];      // entries that matched but were budget-cut or probability-failed
  totalTokens: number;
  budgetRemaining: number;
  budgetExhausted: boolean;
  recursionTrace: RecursionStep[];
  timedEffectState: TimedEffectState;  // for multi-message continuity
}

interface ActivatedEntry {
  entryId: string;
  activatedBy: 'constant' | 'keyword' | 'recursion';
  triggerChain: string[];              // [sourceEntryId, ..., thisEntryId]
  matchedKeywords: string[];
  matchedInMessage: number;            // index of message that triggered
  tokenCost: number;
  insertionPosition: number;
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
  stickyEntries: Map<string, number>;    // entryId → messages remaining
  cooldownEntries: Map<string, number>;  // entryId → messages remaining
  messageCount: number;
}
```

---

## UI Component Map

### WorkspaceShell
The root layout component. Manages the panel arrangement, tab bar, and global actions (new, open, save, export, settings).

### TabBar
Displays open document tabs. Shows dirty indicator (dot), close button, tab name. Supports drag-to-reorder.

### EntryList
Left panel. Filterable, sortable list of all entries in the active document. Each row shows: name, type badge, mini health indicator (colored dot for worst finding severity), token count, enabled/disabled state. Clicking selects the entry (syncs with graph selection). Supports multi-select for bulk operations.

### GraphCanvas
Center panel. The @xyflow/react node editor surface.

**Custom node:** EntryNode — displays entry name, type badge (color-coded by entity type), health indicator, constant/keyword badge, token count. Compact enough to show many at once but informative enough to be useful without selecting.

**Edges:** Directed arrows from triggering entry to triggered entry. Styling:
- Solid lines: active recursion links
- Dashed lines: blocked by preventRecursion (the link exists but won't fire)
- Red highlight: part of a circular reference
- Colored by source entry type (locations trigger NPCs → specific color scheme)

**Controls:** Minimap, zoom, fit-to-view, auto-layout button, filter by entry type, search/highlight.

### EntryEditor
Right panel (or modal, TBD during implementation). Form-based editor for the selected entry. All WorkingEntry fields organized in logical groups:
- Identity: name, content (with token counter)
- Activation: keys, secondaryKeys, selective, selectiveLogic, constant
- Priority: position, order, depth
- Timed: delay, cooldown, sticky, probability
- Recursion: preventRecursion, excludeRecursion
- Budget: ignoreBudget
- Meta: enabled, token count (read-only, computed)

Validation feedback inline (from AnalysisService findings for this entry).

### AnalysisPanel
Right panel tab. Health score display (overall grade), finding count by severity, expandable finding list. Each finding is clickable → selects the affected entry. Filter by severity, category. "Deep Analysis" button for LLM-powered rules (shows cost estimate before running).

### SimulatorPanel
Right panel tab. Message input area (add user/assistant messages), settings controls (scan depth, budget, etc., populated from defaults), engine selector dropdown, "Run" button. Results area shows activated entries with recursion trace visualization. Step-through mode (advance one recursion step at a time) for debugging.

### Inspector
Right panel tab. Shows computed metadata for the selected entry: incoming edges (what triggers this entry), outgoing edges (what this entry triggers), full activation chain analysis, token count breakdown, all findings for this entry.

### SettingsDialog
Modal. Tabs for:
- LLM Providers (add/edit/remove, test connection)
- Preferences (theme, autosave interval, default simulator settings)
- About / version info

---

## Decision Log

| # | Decision | Rationale | Date |
|---|----------|-----------|------|
| 1 | Local-first, no backend | Simplicity, privacy, personal-tool nature | Design phase |
| 2 | Zustand + immer + zundo for state | Lightweight, works well with derived state, zundo gives undo/redo with minimal setup | Design phase |
| 3 | One store per tab | Undo/redo must be scoped per document. Shared store would entangle histories. | Design phase |
| 4 | Flatten CCv3 to WorkingEntry | Clean interface for editor and analysis. Transformation layer handles the complexity. | Design phase |
| 5 | Derived graph, not stored | Prevents sync bugs between entries and graph. Incremental recomputation is fast enough. | Design phase |
| 6 | Shared keyword matching between GraphService and SimulatorService | Prevents behavior divergence between "what the graph shows" and "what the simulator does" | Design phase |
| 7 | Pluggable ActivationEngine interface | SillyTavern first, but designed for adding Agnai/Risu without refactoring | Design phase |
| 8 | Pluggable Rule interface with requiresLLM flag | Unified analysis pipeline regardless of whether rule uses code or LLM | Design phase |
| 9 | LLM analysis on-demand only | No surprise API costs. Deterministic runs automatically, LLM runs on explicit request. | Design phase |
| 10 | OpenAI-compatible as first LLM provider | Covers widest ground: OpenAI, Ollama, LM Studio, Together, Groq | Design phase |
| 11 | character-foundry for all format I/O | Battle-tested library handles format detection, parsing, normalization, serialization, token counting. We don't reinvent this. | Design phase |
| 12 | Dark mode default | User preference. | Design phase |
| 13 | Tauri for desktop, deferred | Web-first. Tauri wraps it later. Architecture is wrapper-agnostic. | Design phase |
| 14 | Autosave to IndexedDB, explicit save to file | Recovery protection without changing the file-based mental model | Design phase |
| 15 | Edges for blocked recursion links shown as dashed | Users need to see links that exist but are prevented, not just active links | Design phase |
