# Lorewalker — Architecture Reference

This document is the source of truth for Lorewalker's design. Implementation agents must consult this before making structural decisions. If something doesn't have a clear home here, that's a signal to propose an architecture update — not to improvise.

---

## Component Map

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Lorewalker Application                        │
├──────────┬──────────┬──────────┬──────────┬──────────┬───────────────┤
│   File   │Transform │  Graph   │ Analysis │Simulator │    LLM        │
│  Service │ Service  │ Service  │ Service  │ Service  │  Service      │
├──────────┴──────────┴──────────┴──────────┴──────────┴───────────────┤
│                          State Layer                                   │
│  ┌──────────────────┐  ┌────────────────────────────────────────────┐ │
│  │ WorkspaceStore    │  │ DocumentStore (one per tab)                │ │
│  │ - tabs            │  │ - entries: WorkingEntry[]                  │ │
│  │ - activeTabId     │  │ - graphPositions: Map<id, {x,y}>          │ │
│  │ - theme           │  │ - bookMeta: BookMeta                      │ │
│  │ - graphSettings   │  │ - findings: Finding[]                     │ │
│  │ - customRules     │  │ - llmFindings: Finding[]                  │ │
│  │ - llmConfig       │  │ - ruleOverrides: DocumentRuleOverrides    │ │
│  │                   │  │ - selection: SelectionState               │ │
│  │                   │  │ - simulatorState: SimulatorState          │ │
│  │                   │  │ - temporal: undo/redo via zundo           │ │
│  └──────────────────┘  └────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────────┤
│                       Persistence Layer                                │
│  IndexedDB: autosave, session recovery, preferences, API keys        │
├──────────────────────────────────────────────────────────────────────┤
│                         UI Layer                                       │
│  WorkspaceShell, TabBar, FilesPanel, EntryList, GraphCanvas,         │
│  SidebarPanel, LorebookWorkspace, EntryWorkspace, StatusBar,         │
│  SettingsDialog; feature modules: HealthView, SimulatorView,         │
│  EditorView, KeywordsView, RulesView, InsightsView                   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## File Structure

> **Monorepo note:** The codebase lives in `packages/web/src/` (React web app) and `packages/core/src/` (shared types, stores, storage abstraction — no React DOM). The paths below show the web package layout (`packages/web/src/`). Canonical types and stores are defined in `packages/core/src/`; `packages/web/src/types/` and `packages/web/src/stores/` re-export from there.

```
packages/web/src/
├── assets/
├── components/
│   ├── analysis/          — DeepAnalysisDialog
│   ├── editor/            — KeywordInput, KeywordObjectsEditor, RoleCallPositionSelect
│   ├── entry-list/        — EntryList, EntryListItem, CategoryMenu
│   ├── graph/             — GraphCanvas, GraphControls, GraphLegend, EntryNode, RecursionEdge,
│   │                        GraphAddButton, EdgeConnectDialog
│   ├── settings/          — SettingsDialog, LlmToolsPanel, ProviderSettingsPanel, LorebookSettingsPanel
│   ├── shared/            — ErrorBoundary, ToastStack, Toggle
│   ├── simulator/         — ActivationResults
│   ├── ui/                — Tooltip, HelpTooltip
│   └── workspace/         — WorkspaceShell, TabBar, FilesPanel, WelcomeScreen, StatusBar,
│                            ExportButton, LorebookPickerDialog, SaveSnapshotDialog,
│                            WhatsNewDialog, KeywordNameDialog
├── features/
│   ├── editor/            — EditorView (scope-aware: entry fields | BookMeta),
│   │   │                    CategoryAssign, ContentField, KeywordEditor, KeywordObjectsEditor,
│   │   │                    primitives
│   │   ├── fields/        — ActivationFields, PriorityFields, TimedEffectFields, RecursionFields,
│   │   │                    GroupFields, ScanOverrideFields, MatchSourceFields, CharFilterFields,
│   │   │                    BudgetFields, AdvancedFields, TriggersFields
│   │   └── variants/
│   │       ├── sillytavern/ — STEntryFields, STBookMetaFields
│   │       └── rolecall/    — RCEntryFields, RCBookMetaFields, ConditionsEditor, ConditionsViewer
│   ├── health/            — HealthView (scope-aware), FindingsList, FindingItem, FindingDetail,
│   │                        HealthScoreCard, ConnectionsList, ChainDiagram, DeepAnalysisTrigger
│   ├── keywords/          — KeywordsView (scope-aware), KeywordTable, KeywordTag,
│   │                        KeywordContextCard, KeywordReachTable
│   ├── insights/          — InsightsView (scope-aware: entry reach + simulate-this-entry |
│   │                        lorebook categorize-all + simulator), EntrySimulation
│   ├── rules/             — RulesView, RuleEditor, ConditionBuilder, VariablePicker,
│   │                        TemplateField, RuleTestingPane
│   └── simulator/         — SimulatorView (scope-aware), MessageComposer, ActivationResultList,
│                            RecursionTraceView, EntryActivationProfile
├── layouts/
│   └── desktop/           — SidebarPanel, LorebookWorkspace, EntryWorkspace
├── hooks/
│   ├── useDerivedState.ts     — debounced graph + analysis recomputation, exports EMPTY_STORE
│   ├── useAutosave.ts         — 2s debounced autosave to IndexedDB
│   ├── useWorkspacePersistence.ts — workspace/panel layout save + restore on mount
│   └── useKeyboardShortcuts.ts    — global keyboard shortcut handler (Cmd+Z, Cmd+S, Cmd+N, Escape, etc.)
├── lib/
│   ├── cn.ts              — Tailwind class merging utility
│   ├── debounce.ts        — generic debounce
│   ├── edge-edit.ts       — addKeywordMention, removeKeywordMention (graph edge helpers)
│   ├── entry-badge.ts     — getTypeBadge() — shared badge label + color for entry types
│   ├── entry-type.ts      — entry type classification utilities
│   ├── platform.ts        — platform detection (macOS/Windows for modifier key display)
│   ├── severity-color.ts  — severity → CSS class mapping for findings
│   ├── token-estimate.ts  — lightweight token estimator
│   ├── undo-describe.ts   — describeStateChange() — human-readable undo toast messages
│   └── uuid.ts            — uuid v4 generator
├── services/
│   ├── analysis/          — see Analysis Service section
│   ├── llm/               — llm-service.ts, providers/anthropic.ts, providers/openai-compatible.ts
│   ├── simulator/         — engines/sillytavern-engine.ts, keyword-matching.ts
│   ├── categorize-service.ts
│   ├── file-service.ts
│   ├── graph-service.ts
│   ├── keyword-analysis-service.ts
│   ├── persistence-service.ts
│   ├── simulator-service.ts
│   └── transform-service.ts
├── stores/
│   ├── document-store-registry.ts  — Map<tabId, DocumentStore> singleton
│   ├── document-store.ts           — DocumentStore factory + slice definitions
│   ├── hooks.ts                    — useDocumentStore, useWorkspaceStore convenience hooks
│   └── workspace-store.ts          — WorkspaceStore singleton
├── styles/
│   └── globals.css        — CSS custom properties: --edge-*, --node-*, --theme-*
├── types/
│   ├── analysis.ts        — Rule, Finding, HealthScore, Rubric, CustomRule, SerializedEvaluation
│   ├── entry.ts           — WorkingEntry, BookMeta, LorebookFormat, RoleCallKeyword, RoleCallCondition
│   ├── graph.ts           — RecursionGraph, EdgeMeta, GraphNode, GraphEdge
│   ├── keywords.ts        — KeywordStat
│   ├── llm.ts             — LLMProvider, CompletionRequest, CompletionResponse
│   ├── persistence.ts     — PersistedDocument, PersistedWorkspace, PersistedSnapshot
│   ├── simulator.ts       — SimulatorState, ActivationResult, RecursionTrace, ActivationEngine
│   ├── ui.ts              — ThemeId, TabMeta, SelectionState, PanelLayout, GraphDisplayDefaults
│   └── index.ts           — re-exports all types
├── App.tsx
├── changelog.ts           — changelog entries for WhatsNewDialog
├── main.tsx
└── test-setup.ts
```

---

## Service Inventory

### FileService

**Owns:** File import, file export, format detection, file-system interaction (browser File API and future Tauri FS API).

**Does not own:** Data transformation (delegates to TransformService), working model management (that's the store).

**Responsibilities:**
- Accept files from drag-drop, file picker, or clipboard
- Detect whether input is a standalone lorebook or a character card containing lorebooks
- For character cards: extract lorebook collection, present available lorebooks to user for selection (LorebookPickerDialog)
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

**RoleCall format:** When `lorebookFormat === 'rolecall'`, inflate maps `entry.positionRoleCall`, `entry.keywordObjects`, `entry.triggerConditions`, and `entry.triggerMode` from RoleCall-specific extensions into WorkingEntry. Deflate reconstructs these fields. `DocumentStore.activeFormat` is set at import time and preserved in autosave — it controls which editor panels render.

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
- Auto-layout: compute node positions using ELK (Eclipse Layout Kernel via `elkjs`) for directed graph layout

**Dependencies:** None (pure computation, receives data as arguments)

**Shared logic:** The keyword matching functions are defined in `services/simulator/keyword-matching.ts` and imported by both GraphService and SimulatorService. This prevents duplicate matching implementations and ensures "what the graph shows" and "what the simulator does" are always in sync.

---

### AnalysisService

**Owns:** Health scoring, issue detection, rubric management, finding generation.

**Does not own:** Graph computation (delegates to GraphService), entry editing, LLM calls (delegates to LLMService).

**File:** `src/services/analysis/analysis-service.ts`

**Public API:**
- `runDeterministic(context: AnalysisContext, rubric: Rubric): Promise<Finding[]>` — runs all non-LLM rules in parallel, returns flattened findings
- `runLLMRules(context: AnalysisContext, rubric: Rubric): Promise<Finding[]>` — runs LLM rules sequentially, returns findings
- `computeHealthScore(findings: Finding[], rubric: Rubric): HealthScore` — computes weighted score from findings

**Scoring logic (per category):**
- Error: -25 points
- Warning: -10 points
- Suggestion: -3 points
- Floor: 0 (category score never goes negative)
- Overall = weighted average using `rubric.scoringWeights`

**Scoring weights (defaultRubric):**

| Category | Weight | Notes |
|----------|--------|-------|
| structure | 0.25 | |
| config | 0.20 | |
| keywords | 0.25 | |
| content | 0.0 | LLM findings don't affect the numeric score |
| recursion | 0.15 | |
| budget | 0.15 | |

**Directory structure:**
```
src/services/analysis/
  analysis-service.ts         — runDeterministic, runLLMRules, computeHealthScore
  default-rubric.ts           — scoringWeights, rule array assembly
  evaluation-engine.ts        — resolveVariable, evaluateLeaf, evaluateGroup, evaluateCondition
  custom-rule-adapter.ts      — customRuleToRule() adapter
  copy-compatibility.ts
  copy-seeds.ts
  rules/
    structure-rules.ts
    config-rules.ts
    keyword-rules.ts
    recursion-rules.ts
    budget-rules.ts
    llm-rules.ts
```

---

### Custom Rules System

**Owns:** Visual condition builder, serialized evaluation tree, custom rule adapter, workspace and per-document rule scoping.

**Three-layer active rubric assembly** (performed in `useDerivedState`):
1. **Base:** `defaultRubric` with built-in rules, filtered by `WorkspaceStore.disabledBuiltinRuleIds`
2. **Workspace:** `WorkspaceStore.customRules` (enabled rules only), appended via `customRuleToRule()`
3. **Per-document:** `DocumentStore.ruleOverrides.customRules` (enabled rules only) + `ruleOverrides.disabledRuleIds` applied on top

The `customRuleToRule()` adapter in `custom-rule-adapter.ts` converts a `CustomRule` (serialized evaluation tree) into a `Rule` (live `evaluate()` function) by wiring it through the evaluation engine.

**Evaluation engine** (`evaluation-engine.ts`):
- `resolveVariable(entry, path)` — resolves variable paths like `"entry.keys.length"` against a WorkingEntry
- `evaluateLeaf(leaf, entry)` — applies ComparisonOp
- `evaluateGroup(group, entry)` — applies LogicOp over an array of ConditionLeafs
- `evaluateCondition(item, entry)` — dispatches to leaf or group

**Available condition variables** (paths resolvable against WorkingEntry):
- `entry.keys.length`, `entry.secondaryKeys.length`
- `entry.tokenCount`, `entry.order`, `entry.depth`, `entry.probability`
- `entry.constant`, `entry.selective`, `entry.enabled`, `entry.preventRecursion`, `entry.excludeRecursion`
- `entry.position`, `entry.role`, `entry.sticky`, `entry.delay`, `entry.cooldown`
- `entry.group`, `entry.name`, `entry.content`

**Persistence scope:**
- Workspace custom rules persist via `useWorkspacePersistence` to IndexedDB
- Per-document rule overrides persist via `useAutosave` as part of PersistedDocument

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
1. Scan messages within scanDepth for primary keyword matches (using shared keyword matching)
2. Apply selective/secondary key logic (AND ANY, AND ALL, NOT ANY, NOT ALL)
3. Filter by timed effects (delay, cooldown state)
4. Apply probability rolls
5. Sort activated entries: constant first, then by order value descending
6. Begin recursion: scan activated entries' content for keywords of non-activated entries
7. Respect preventRecursion and excludeRecursion flags
8. Repeat recursion up to maxRecursionSteps
9. Apply token budget: insert entries in priority order until budget exhausted
10. Apply sticky durations for multi-message mode

**Dependencies:** GraphService (shared keyword matching functions)

**Design note:** Engines are pure functions. SimulatorService manages state (conversation history for multi-message mode, timed effect tracking) and delegates the per-step activation logic to the engine.

---

### LLMService

**Owns:** Provider management, API key storage, request construction, response parsing, cost estimation.

**Does not own:** Prompt content for specific analysis rules (that's defined in the rules themselves), when to call an LLM (that's AnalysisService's decision).

**File:** `src/services/llm/llm-service.ts` — exports singleton `llmService`

**Public API:**

| Method | Signature | Purpose |
|--------|-----------|---------|
| `registerProvider` | `(provider: LLMProvider): void` | Register a provider |
| `removeProvider` | `(id: string): void` | Unregister a provider |
| `listProviders` | `(): LLMProvider[]` | Get all registered providers |
| `getProvider` | `(id: string): LLMProvider \| undefined` | Get a provider by ID |
| `complete` | `(providerId: string, request: CompletionRequest): Promise<CompletionResponse>` | Generate completion |
| `estimateTokens` | `(providerId: string, text: string): number` | Estimate token count |
| `testConnection` | `(providerId: string): Promise<{success: boolean, error?: string}>` | Test provider connectivity |
| `estimateBulkCost` | `(providerId: string, texts: string[]): number` | Sum token estimates |

**Provider types:** `OpenAICompatibleProvider` (works with OpenAI, Ollama, LM Studio, Together, Groq, etc.) and `AnthropicProvider`. No separate OllamaProvider — Ollama is handled by configuring an OpenAI-compatible endpoint pointing at localhost.

**Dependencies:** PersistenceService (for key storage)

**Security:** API keys stored in IndexedDB. On Tauri, platform keychain integration is planned. Keys are never sent anywhere except the configured API endpoint.

---

### PersistenceService

**Owns:** IndexedDB operations, autosave scheduling, session recovery, preferences storage.

**Does not own:** File export (that's FileService), working model logic (that's the store).

**Responsibilities:**
- Autosave each tab's document store to IndexedDB on a debounced interval (2s)
- Persist workspace state (open tabs, active tab, panel sizes, theme preference)
- Detect recovery sessions on app launch and offer restoration (RecoveryDialog)
- Store LLM provider configurations and API keys
- Store user preferences (default simulator settings, rubric selections, UI state)
- Clean up stale recovery data
- Save and restore named snapshots (SaveSnapshotDialog, FilesPanel)

**Storage schema (IndexedDB):**
```
lorewalker-db/
  workspace/          → single record: tab list, active tab, panel layout
  documents/{tabId}/  → per-tab: entries, graphPositions, simulatorState, fileMeta, ruleOverrides
  preferences/        → user preferences, theme, defaults, custom rules
  providers/          → LLM provider configurations
  snapshots/          → named snapshot records (PersistedSnapshot)
```

**Dependencies:** idb-keyval (IndexedDB wrapper)

---

### CategorizeService

**Owns:** LLM-powered entry categorization.

**Does not own:** Category storage (that's DocumentStore.setEntryCategory), LLM calls (delegates to LLMService).

**File:** `src/services/categorize-service.ts`

**Public API:**
- `categorizeEntry(entry: WorkingEntry, llmService: LLMService, providerId: string): Promise<string>` — returns one of 8 fixed category labels

**Eight fixed categories:** Character, Location, Event, Item, Concept, Rule, Faction, Other

**Controlled by:** `WorkspaceStore.llmCategorization` — enabled flag, provider selection, skip-manual-overrides flag.

---

### KeywordAnalysisService

**Owns:** Keyword inventory analysis across all entries.

**Does not own:** Entry editing, graph computation.

**File:** `src/services/keyword-analysis-service.ts`

**Public API:**
- `buildKeywordInventory(entries: WorkingEntry[]): KeywordStat[]` — returns per-keyword usage statistics across the lorebook

**Used by:** `KeywordsView` in `LorebookWorkspace` and `EntryWorkspace`.

---

## State Architecture

### WorkspaceStore (Zustand)

Global singleton. Not included in any undo history.

```typescript
interface WorkspaceState {
  tabs: TabMeta[];
  activeTabId: string | null;
  theme: ThemeId;
  graphSettings: GraphLayoutSettings;
  checkRecursionLoops: boolean;
  graphDisplayDefaults: GraphDisplayDefaults;
  editorDefaults: EditorDefaults;
  entriesListDefaults: EntriesListDefaults;
  lorebookDefaults: LorebookDefaults;
  activeLlmProviderId: string | null;
  llmCategorization: LlmCategorizationSettings;
  customRules: CustomRule[];
  disabledBuiltinRuleIds: string[];
  lastSeenChangelogDate: string | null;  // ISO date — tracks WhatsNewDialog visibility

  // Actions — see TYPES.md WorkspaceState for full list
}
```

### DocumentStore (Zustand + zundo, one per tab)

Created when a tab opens, destroyed when it closes.

```typescript
interface DocumentState {
  // In undo history (partialize)
  entries: WorkingEntry[];
  graphPositions: Map<string, { x: number; y: number }>;
  bookMeta: BookMeta;

  // NOT in undo history
  findings: Finding[];
  healthScore: HealthScore;
  llmFindings: Finding[];
  ruleOverrides: DocumentRuleOverrides;
  selection: SelectionState;
  simulatorState: SimulatorState;
  cardPayload: CardPayload | null;        // Full card context when imported from a character card
  activeFormat: LorebookFormat;           // Format at time of import/load

  // Actions — see TYPES.md DocumentState for full list
}
```

**zundo partialize:** Only `entries`, `graphPositions`, `bookMeta` are tracked. All other fields are excluded. `graphPositions` is in the partialize list but position writes always use `store.setState(...)` to bypass temporal — positions are cosmetic layout state, not content.

### EMPTY_STORE Pattern

Components that need a DocumentStore but must handle the "no active tab" case use a module-level `EMPTY_STORE` constant exported from `src/hooks/useDerivedState.ts`. This is a real DocumentStore instance initialized with empty defaults. It is used as a fallback so that Zustand `useStore` hooks are always called unconditionally (Rules of Hooks).

```typescript
const realStore = activeTabId ? documentStoreRegistry.get(activeTabId) : undefined
const activeStore = realStore ?? EMPTY_STORE
const entries = activeStore((s) => s.entries)  // always safe — never conditional
```

**Important:** Never use `EMPTY_STORE` as a real store for mutations. Always check that the active tab has a real store before writing.

### Undo/Redo Scoping

Zundo wraps only `entries`, `bookMeta`. UI state (selection, simulator state), derived state (findings, health score), rule overrides, and graph positions are all excluded. Position writes always use `store.setState(...)` to bypass temporal.

---

## Hooks

### useDerivedState (`src/hooks/useDerivedState.ts`)

Orchestrates graph recomputation and analysis on every entry change.

- Subscribes to the active DocumentStore's `entries`
- On change (debounced 150ms): calls `GraphService.incrementalUpdate` or `buildGraph`, then assembles the three-layer active rubric, then calls `AnalysisService.runDeterministic`
- Writes results back to the store via `setState` (bypasses zundo — findings are derived, not content)
- **Exports `EMPTY_STORE`** — a stable fallback DocumentStore for unconditional hook calls across the app
- Handles missing positions: `persistMissingPositions` writes layout positions for newly-added nodes via a single `store.setState(...)` call to bypass zundo

### useAutosave (`src/hooks/useAutosave.ts`)

- Subscribes to the active DocumentStore
- On any state change (debounced 2s): calls `PersistenceService.saveDocument(tabId)`
- Also marks the tab dirty in WorkspaceStore

### useWorkspacePersistence (`src/hooks/useWorkspacePersistence.ts`)

- On mount: restores panel layout, theme, open tabs, active tab from IndexedDB
- On WorkspaceStore change: saves current workspace state to IndexedDB (debounced)

### useKeyboardShortcuts (`src/hooks/useKeyboardShortcuts.ts`)

- Global `window.addEventListener('keydown', ...)` handler
- Binds: Cmd/Ctrl+Z (undo), Cmd/Ctrl+Shift+Z (redo), Cmd/Ctrl+S (save snapshot), Cmd/Ctrl+N (new entry), Escape (clear selection)

---

## Data Flow

### Import Flow

```
User drops file
  → FileService.import(file)
    → character-foundry parseLorebook(buffer) or parseCard(buffer)
    → If card: getLorebookCollection() → LorebookPickerDialog → user selects which book
    → TransformService.inflate(ccv3Book)
      → Flatten each entry to WorkingEntry
      → Assign stable UUIDs
      → Compute token counts
    → WorkspaceStore.openTab(importedData)
    → DocumentStore created with entries + default positions
    → useDerivedState runs: GraphService.buildGraph → AnalysisService.runDeterministic
```

### Edit Flow

```
User edits entry (via form editor or graph interaction)
  → DocumentStore.updateEntry(id, changes)
    → Immer produces new state
    → Zundo records undo checkpoint
    → useDerivedState (debounced 150ms):
      → GraphService.incrementalUpdate(changedEntry, entries)
      → Assemble active rubric (defaultRubric + workspace rules + doc rules)
      → AnalysisService.runDeterministic(entries, graph, activeRubric)
      → Store findings + healthScore back to DocumentStore (bypassing zundo)
    → useAutosave (debounced 2s) → PersistenceService.saveDocument(tabId)
    → WorkspaceStore.markDirty(tabId, true)
```

### Export Flow

```
User clicks Export
  → FileService.export(entries, format, fileMeta)
    → TransformService.deflate(entries)
    → character-foundry serializeLorebook(ccv3Book, targetFormat)
    → Browser download dialog
    → On success: WorkspaceStore.markDirty(tabId, false), update lastSavedAt
```

### LLM Analysis Flow

```
User clicks "Deep Analysis"
  → DeepAnalysisDialog shows cost estimate (LLMService.estimateTokens)
  → User confirms
  → AnalysisService.runLLMRules(context, activeRubric)
    → Each LLM rule constructs its prompt
    → LLMService.complete(providerId, request)
    → Rule parses response into Finding[]
  → DocumentStore.setLlmFindings(findings) — stored separately, not cleared on next edit
  → HealthView displays combined deterministic + LLM findings
```

### Snapshot Flow

```
User presses Cmd/Ctrl+S (or toolbar button)
  → SaveSnapshotDialog prompts for name
  → PersistenceService.saveSnapshot(tabId, name, { entries, bookMeta })
  → FilesPanel.snapshots list updates
  → User can restore any snapshot from FilesPanel
```

---

## Analysis Rules Catalog

### Deterministic Rules (auto-run)

**Structure category:**
- `structure/valid-json`: Verify entries have all required fields with correct types
- `structure/uid-consistency`: Check that UIDs are sequential and non-duplicate
- `structure/field-types`: Validate field value ranges (position 0–7, probability 1-100, etc.)

**Configuration category:**
- `config/selective-logic`: Flag selective:true with empty keysecondary (error)
- `config/unused-secondary`: Flag non-empty keysecondary with selective:false (suggestion)
- `config/position-alignment`: Constant entries should use positions 0–3; sticky entries expected at position 4. Mismatches flagged as warning.
- `config/rule-content-mismatch`: Content starts with RULE: but constant is false (warning)
- `config/fixed-value-deviations`: Check vectorized, useProbability, excludeRecursion, addMemo against expected defaults (warning)
- `config/disabled-entries`: Flag enable:false entries (suggestion — might be intentional)
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
- `recursion/circular-references`: Detect cycles where neither participant has preventRecursion:true (error)
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
```

### Computation

The graph is built by scanning each entry's `content` field for substrings matching other entries' `keys`. Edges where the source has `preventRecursion: true` are recorded as `blockedByPreventRecursion`. Edges where the target has `excludeRecursion: true` are recorded as `blockedByExcludeRecursion`. Both show as dashed in the graph — the link exists but won't fire.

### Incremental Update

- Content changes: rescan only the changed entry's outgoing edges
- Keys change: rescan ALL entries' content for matches against the new keys (incoming edges)
- Add/remove entry: full rebuild

---

## UI Component Map

### WorkspaceShell (`src/components/workspace/WorkspaceShell.tsx`)
Root layout component. Manages panel arrangement, modal state, tab bar, and global actions. Lazy-loads heavy components (GraphCanvas, EntryWorkspace, LorebookWorkspace, SettingsDialog).

**Modal state managed here:**
- `modalEntryId: string | null` — entry open in EntryWorkspace
- `settingsOpen: boolean` — SettingsDialog visibility
- `toolsModalOpen: boolean` — LorebookWorkspace visibility
- `toolsModalTab: 'health' | 'rules' | 'insights'` — active lorebook workspace tab

**Toolbar buttons:** Undo, Redo, Export, Open File, Save Snapshot, Settings, Open Lorebook Tool (BookOpen — opens LorebookWorkspace), Open Entry Tool (FileEdit — opens EntryWorkspace for selected entry; shows a transient hint if no entry is selected)

### TabBar (`src/components/workspace/TabBar.tsx`)
Displays open document tabs with dirty indicator, close button.

### FilesPanel (`src/components/workspace/FilesPanel.tsx`)
Left panel "Files" tab. Shows open file metadata and snapshot history with restore/delete actions.

### WelcomeScreen (`src/components/workspace/WelcomeScreen.tsx`)
Empty state shown when no file is open. Guides user to drag-drop or open a file.

### StatusBar (`src/components/workspace/StatusBar.tsx`)
Bottom bar. Shows entry count, total token count, health score summary for the active document.

### EntryList (`src/components/entry-list/EntryList.tsx`)
Left panel "Entries" tab. Filterable, sortable list of all entries. Each row shows: name, type badge, mini health indicator, token count, enabled state. Supports multi-select for bulk operations.

### GraphCanvas (`src/components/graph/GraphCanvas.tsx`)
Center panel. The @xyflow/react node editor surface.

**Features:**
- Drag-to-create edges (EdgeConnectDialog selects which keyword to add)
- Delete edges (removes keyword mention from source content)
- Right-click context menu for adding entries
- Graph search: `searchQuery` dims non-matching nodes in real time
- Simulator highlighting: `activationStatusMap` colors nodes by activation type; recursion depth coloring for edges
- Light theme detection: sets React Flow `colorMode` based on `LIGHT_THEMES` constant

**EMPTY_STORE fallback:** Uses `EMPTY_STORE` from `useDerivedState.ts` when no active tab.

**Node/edge types defined at module level** (outside component) — required by React Flow.

### GraphControls (`src/components/graph/GraphControls.tsx`)
Graph toolbar: search input, auto-layout, fit-to-view, connection visibility, show/hide blocked edges, edge style toggle, legend toggle.

### GraphLegend (`src/components/graph/GraphLegend.tsx`)
Toggleable legend explaining node types, edge styles, and simulator activation states.

### EntryNode (`src/components/graph/EntryNode.tsx`)
Custom React Flow node. Shows entry name, type badge, health indicator, activation status in simulator mode.

### RecursionEdge (`src/components/graph/RecursionEdge.tsx`)
Custom React Flow edge. Solid (active), dashed (blocked), red (cycle).

### GraphAddButton (`src/components/graph/GraphAddButton.tsx`)
Floating "add entry" button on the graph canvas.

### EdgeConnectDialog (`src/components/graph/EdgeConnectDialog.tsx`)
Dialog shown when user drags an edge between nodes. Lets user choose which keyword mention to add to the source entry's content.

### EntryWorkspace (`src/layouts/desktop/EntryWorkspace.tsx`)
Full-screen layout container for per-entry editing and analysis. **z-50.** Opened by double-clicking a node or from LorebookWorkspace's `onOpenEntry` callback.

**Escape handling:** capture phase + `stopImmediatePropagation()` — fires before LorebookWorkspace's bubble handler, preventing Escape from closing both.

**Navigation:** browser-style back/forward history stack within the modal session.

**Two tabs:**
- **Edit** — entry fields (content, category, all field groups, format variants), connection health summary (ConnectionsList, HealthScoreCard, FindingsList for this entry), and reach indicator inline. CategoryAssign (individual LLM categorization) lives here.
- **Insights** — InsightsView scope="entry": keyword reach table (reach % at depths 1/2/3/Max via graph edges) + simulate-this-entry (EntrySimulation, runs the lorebook simulator with this entry's content as the message).

**Dimensions:** `90vw` × `90vh`, min-width `640px`.

### KeywordInput (`src/components/editor/KeywordInput.tsx`)
Tag-style input for primary and secondary keyword arrays. Used by `features/editor/fields/ActivationFields`, `CharFilterFields`, and `features/editor/variants/rolecall/RCEntryFields`.

### RoleCallPositionSelect (`src/components/editor/RoleCallPositionSelect.tsx`)
Dropdown for `positionRoleCall` field: `world | character | scene | depth`. Used by `features/editor/fields/PriorityFields`.

### KeywordObjectsEditor (`src/components/editor/KeywordObjectsEditor.tsx`)
Edit `keywordObjects: RoleCallKeyword[]` (per-keyword probability, frequency, regex flag). Used by `features/editor/variants/rolecall/RCEntryFields`.

### SidebarPanel (`src/layouts/desktop/SidebarPanel.tsx`)
Right sidebar with 4 tabs: Edit, Health, Simulator, Keywords. Infers scope from `selectedEntryId`: entry scope when an entry is selected, lorebook scope otherwise. Each tab renders the corresponding `*View` feature module. Manages all entry and book-meta mutations internally via store hooks.

### DeepAnalysisDialog (`src/components/analysis/DeepAnalysisDialog.tsx`)
Modal for confirming LLM deep analysis. Shows token estimate, provider selection, and runs the analysis. Consumed by `features/health/DeepAnalysisTrigger`.

### ActivationResults (`src/components/simulator/ActivationResults.tsx`)
Displays list of activated entries with trigger details, matched keywords, token cost. Consumed by `features/keywords/KeywordContextCard`.

---

## Feature Modules (`src/features/`)

Feature modules are scope-aware view components that replace the old per-panel components. Each module renders either an entry-scoped or lorebook-scoped variant depending on the `scope` prop passed by the container (SidebarPanel, EntryWorkspace, or LorebookWorkspace).

### EditorView (`src/features/editor/EditorView.tsx`)
Scope-aware editor. `scope="entry"` renders entry fields organized by format (sillytavern vs rolecall variants); `scope="lorebook"` renders BookMeta fields. Delegates to field subcomponents in `fields/` and format-specific variants in `variants/`.

### HealthView (`src/features/health/HealthView.tsx`)
Scope-aware health panel. `scope="entry"` shows per-entry findings, connections, and token count. `scope="lorebook"` shows the full finding list, health score card, chain diagram, and deep analysis trigger.

### SimulatorView (`src/features/simulator/SimulatorView.tsx`)
Scope-aware simulator panel. `scope="lorebook"` renders the full message composer, settings, results list, and recursion trace. `scope="entry"` renders the entry activation profile and reach analysis for a single entry.

### KeywordsView (`src/features/keywords/KeywordsView.tsx`)
Scope-aware keyword panel. `scope="lorebook"` renders the full keyword inventory table with detail pane and usage stats. `scope="entry"` renders a per-entry keyword context card with activation results.

### InsightsView (`src/features/insights/InsightsView.tsx`)
Scope-aware insights panel. `scope="entry"` renders the keyword reach table (per-keyword reach % at depths 1/2/3/Max, sourced from RecursionGraph outgoing edges) and EntrySimulation (simulate-this-entry trigger + ActivationResultList results). `scope="lorebook"` renders a bulk categorize-all button (LLM via CategorizeService) plus the full lorebook simulator inline (MessageComposer, results, conversation history). CategoryAssign for individual entries lives in EditorView (Edit tab), not here.

### RulesView (`src/features/rules/RulesView.tsx`)
Lorebook-scoped only. Renders the built-in rule list with enable/disable toggles, custom rules with CRUD, the rule editor (ConditionBuilder + VariablePicker), and the rule testing pane.

---

## Sidebar UX Principle

**Edit is write. All other tabs are read-only analytical.**

The SidebarPanel has four tabs: Edit, Health, Simulator, Keywords.

- **Edit** — the only tab that mutates entry data or BookMeta. Keyword editing (add/remove keys) lives here via `KeywordEditor` embedded in `EditorView`. At lorebook scope it renders BookMeta fields; at entry scope it renders all entry fields.
- **Health** — read-only. Displays findings, health score, connections. Never mutates entries.
- **Simulator** — read-only. Runs activation simulation, shows results. Never mutates entries.
- **Keywords** — read-only. Analytical view of the lorebook's keyword inventory (lorebook scope) or a keyword reach/context view (entry scope). Does not provide keyword editing controls.

This principle prevents scope confusion: users who want to change something go to Edit; all other tabs are safe to browse without side effects.

---

### LorebookWorkspace (`src/layouts/desktop/LorebookWorkspace.tsx`)
Large layout container for lorebook-wide analysis, simulation, rules, and keywords workflows. **z-40.**

**Dimensions:** `95vw` × `90vh`

**Three tabs:**
1. **health** — `HealthView` scope="lorebook" (full finding list grouped by rule, health score card, deep analysis trigger); three-column layout: rule list | violations for selected rule | finding detail + chain diagram
2. **rules** — `RulesView` (built-in rule list with enable/disable toggles, custom rules with CRUD, rule editor)
3. **insights** — `InsightsView` scope="lorebook": bulk categorize-all button (calls CategorizeService via LLM) in the top pane + full lorebook simulator (MessageComposer, engine settings, ActivationResultList, conversation history)

**Escape handling:** bubble phase (standard `window.addEventListener('keydown', handler)` without capture flag). Escape closes LorebookWorkspace only when EntryWorkspace is not open (because EntryWorkspace at z-50 captures Escape first and calls `stopImmediatePropagation()`).

**Navigation callbacks:**
- `onOpenEntry(entryId)` — open the entry in EntryWorkspace (which overlays at z-50 on top of LorebookWorkspace)
- `onSelectEntry(entryId)` — select the entry in the sidebar and close LorebookWorkspace

### SettingsDialog (`src/components/settings/SettingsDialog.tsx`)
Settings modal. **z-50.** Two-column layout: category sidebar (draggable width, 100px–300px) + content panel.

**Seven settings categories:**
1. **General** — color theme (14 options), recursion loop detection toggle
2. **Workspace Settings** — auto-layout (acyclicer, ranker, align, rankdir, edges), connection visibility, blocked edges, edge style
3. **Editor** — keyword highlights toggle, category behavior (remember/reset)
4. **Entries** — sort-by, sort direction, secondary sort, pin constants to top
5. **Lorebook** — `LorebookSettingsPanel` sub-component (scan depth, budget, recursion, insertion strategy, etc.)
6. **Providers** — `ProviderSettingsPanel` sub-component (add/edit/remove LLM providers, test connection)
7. **LLM Tools** — `LlmToolsPanel` sub-component (auto-categorization enable/provider/skip-manual-overrides)

### LorebookPickerDialog (`src/components/workspace/LorebookPickerDialog.tsx`)
Multi-lorebook selection dialog shown when importing a character card containing multiple lorebooks.

### SaveSnapshotDialog (`src/components/workspace/SaveSnapshotDialog.tsx`)
Dialog for naming and saving a snapshot of the current document state.

### WhatsNewDialog (`src/components/workspace/WhatsNewDialog.tsx`)
Changelog viewer. Shows release notes with a "New" badge when the user hasn't seen the latest version. Tracks visibility via `WorkspaceStore.lastSeenChangelogDate`.

### ExportButton (`src/components/workspace/ExportButton.tsx`)
Toolbar dropdown for selecting export format: `json | png | charx`. Delegates to `FileService.export()`.

### KeywordNameDialog (`src/components/workspace/KeywordNameDialog.tsx`)
Quick-action dialog for bulk-renaming unnamed entries using their first keyword as the display name.

### CategoryMenu (`src/components/shared/CategoryMenu.tsx`)
Portal-based context menu for assigning or clearing an entry's `userCategory`. Triggered from entry list item right-click and EntryNode context menu.

### ErrorBoundary (`src/components/shared/ErrorBoundary.tsx`)
React error boundary wrapping major UI regions. Shows a user-facing error message with reload option.

### ToastStack (`src/components/shared/ToastStack.tsx`)
Undo/redo feedback toasts shown after Cmd+Z / Cmd+Shift+Z. Uses `describeStateChange()` from `undo-describe.ts`.

### Tooltip (`src/components/ui/Tooltip.tsx`)
Portal-based tooltip rendered into the document root (avoids z-index clipping). Used in toolbars and graph controls. **z-9999.**

### HelpTooltip (`src/components/ui/HelpTooltip.tsx`)
Inline `?` icon that wraps `Tooltip`. Used in form fields for contextual help. Never use native `title` attribute.

---

## Modal Layering Pattern

```
z-9999  Tooltip portal               — never clipped, always on top
z-50    EntryWorkspace               — capture Escape + stopImmediatePropagation
z-50    SettingsDialog               — standard close
z-40    LorebookWorkspace            — bubble Escape (blocked by z-50 if both open)
```

**Rules for adding new modals:**
- Modals that should close *before* EntryWorkspace → use z-40, bubble Escape
- Modals that should close *instead of* LorebookWorkspace → use z-50, capture Escape + `stopImmediatePropagation()`
- Portals that must never be clipped → use z-9999

**Never hardcode z-index values in components.** Define them in Tailwind config or use the class system (`z-40`, `z-50`, `z-[9999]`).

---

## Navigation Delegation Pattern

LorebookWorkspace and EntryWorkspace cannot directly control WorkspaceShell's modal state. They delegate through callbacks:

- `onOpenEntry(entryId)` — called when user clicks an entry that should be opened for editing. WorkspaceShell sets `modalEntryId = entryId`, opening EntryWorkspace on top of LorebookWorkspace.
- `onSelectEntry(entryId)` — called when user wants to navigate to the entry in the sidebar. WorkspaceShell closes LorebookWorkspace and sets the selection.

This pattern prevents layout components from importing WorkspaceShell internals.

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
| 16 | ThemeId as a union of named theme strings (not just dark/light) | Supports user-selectable themes via CSS variable swap. Light themes identified by a `LIGHT_THEMES` constant. | Phase 2 |
| 17 | Graph display preferences (connectionVisibility, showBlockedEdges, edgeStyle) in WorkspaceStore | These are presentation choices, not content. Belongs in workspace-level prefs, not per-document state. | Phase 2 |
| 18 | Panel layout (widths, collapse state) persisted to IndexedDB via PersistenceService | Cosmetic UI state — not in Zustand. Stored as PersistedWorkspace.panelLayout. Restored on mount in WorkspaceShell. | Phase 5 |
| 19 | EMPTY_STORE for unconditional hook calls | React's Rules of Hooks prohibit conditional hook calls. A stable fallback store lets components subscribe unconditionally even when no tab is active. | Phase 2 |
| 20 | LorebookWorkspace as a z-40 overlay (not a sidebar panel) | Analysis and simulator tools need enough screen space to be genuinely useful. The right panel is too narrow for multi-pane tool UX. Modal overlay allows 95vw × 90vh surface. (Note: previously WorkspaceToolsModal — replaced in Phase 3 Stream B / Phase 3 Completion) | Phase 7b |
| 21 | Custom rules stored workspace-wide + per-document overrides | Workspace rules are reusable across lorebooks. Per-document overrides allow disabling rules that don't apply to a specific file. | Phase 7b |
| 22 | SerializedEvaluation as a JSON tree (not a string expression) | Enables round-trip persistence, visual editing in ConditionBuilder, and structured evaluation without dynamic code execution. | Phase 7b |
| 23 | getTypeBadge in entry-badge.ts as shared utility | Badge label and color are rendered in EntryListItem, EntryNode, and EntryWorkspace. A single source prevents divergence. | Phase 7b |
| 24 | Portal-based Tooltip at z-9999 | Toolbar buttons inside fixed panels were clipping standard Tooltip z-indexes. Portal renders into document root, always visible. | Phase 7b |
| 25 | Escape capture + stopImmediatePropagation for EntryWorkspace (z-50) | When both LorebookWorkspace and EntryWorkspace are open, Escape should close only EntryWorkspace. Capture phase fires before LorebookWorkspace's bubble handler and stopImmediatePropagation prevents it from also closing the lorebook workspace. | Phase 7b |
| 26 | src/layouts/desktop/ for layout containers | Feature modules (features/*) are portable and scope-aware. Layout containers (layouts/desktop/) read from stores and wire features together. Separation prevents feature modules from being coupled to the shell's navigation model. | Phase 3 Stream B |
| 27 | Replace WorkspaceToolsModal/EntryEditorModal with LorebookWorkspace/EntryWorkspace | Old modals delegated to ad-hoc component wrappers. New layout containers compose the feature *View modules directly, making each tab independently testable and eliminating 18 redundant wrapper files. | Phase 3 Stream B |
| 28 | SidebarPanel with implicit scope inference | The old right panel had 5 tabs ('lorebook', 'entry', 'analysis', 'inspector', 'simulator') backed by thin wrappers. SidebarPanel infers scope from selectedEntryId and uses the same *View feature modules as the overlay workspaces, consolidating to 4 unified tabs. | Phase 3 Completion |
