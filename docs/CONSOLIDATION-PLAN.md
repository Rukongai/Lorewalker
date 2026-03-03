# Lorewalker — Feature Module Consolidation Plan

This document is the execution plan for consolidating Lorewalker's UI into scope-aware feature modules. It replaces the current container-oriented component structure with a module-per-feature architecture that supports implicit scope transitions, eliminates duplication, and enables a future mobile app.

This plan is designed for parallel execution across multiple Claude Code sessions.

---

## Problem

The current UI has three containers (sidebar panels, WorkspaceToolsModal, EntryEditorModal) with features assigned by container rather than by scope. This causes duplication (analysis findings rendered in 4 components, simulator in 2, entry editing in 2), inconsistent scope transitions, and a component structure that can't be ported to mobile without rebuilding everything.

## Solution Summary

Every feature operates at **lorebook scope** or **entry scope**. Feature modules are self-contained components that accept a scope and render accordingly. Layout containers set the scope and arrange modules — they don't implement features. Scope is **implicit**: selecting an entry shifts relevant modules to entry scope; deselecting shifts back. The user never thinks about scope.

---

## Naming

| Old Name | New Name | Reason |
|----------|----------|--------|
| Analysis (rule engine + findings + health score) | **Health** | Diagnostic — tells you the state of things |
| Smart Analysis (future LLM dashboard) | **Insights** | Interprets and advises — recommendations, metrics, impact |
| Inspector | *(eliminated)* | Replaced by Health at entry scope |
| Deep Analysis (LLM button) | Migrates to **Insights** when built; stays in Health until then |
| Simulator | **Simulator** | Unchanged |
| CategorizeService (LLM auto-categorize) | Lives in **Editor** | Output is a field on the entry, not an insight |

---

## Target Directory Structure

```
src/
├── features/
│   ├── health/
│   │   ├── index.ts                    — public exports
│   │   ├── HealthView.tsx              — scope-aware root: lorebook | entry
│   │   ├── FindingsList.tsx            — filterable findings list (both scopes)
│   │   ├── FindingDetail.tsx           — expanded finding + chain diagram + fix
│   │   ├── HealthScoreCard.tsx         — score display (overall or entry contribution)
│   │   ├── ConnectionsList.tsx         — incoming/outgoing edges for an entry
│   │   ├── ChainDiagram.tsx            — recursion chain visualization
│   │   └── DeepAnalysisTrigger.tsx     — LLM analysis button + cost estimate
│   │
│   ├── simulator/
│   │   ├── index.ts
│   │   ├── SimulatorView.tsx           — scope-aware root: lorebook | entry
│   │   ├── MessageComposer.tsx         — message input (single + conversation)
│   │   ├── ActivationResultList.tsx    — activated/skipped entries with details
│   │   ├── RecursionTraceView.tsx      — step-by-step recursion display
│   │   └── EntryActivationProfile.tsx  — entry-scope: will this entry activate?
│   │
│   ├── keywords/
│   │   ├── index.ts
│   │   ├── KeywordsView.tsx            — scope-aware root: lorebook | entry (read-only)
│   │   ├── KeywordTable.tsx            — sortable/searchable keyword inventory
│   │   ├── KeywordTag.tsx              — individual keyword with context indicators
│   │   └── KeywordContextCard.tsx      — per-keyword overlap/usage summary
│   │
│   ├── insights/
│   │   ├── index.ts
│   │   ├── InsightsView.tsx            — scope-aware root: entry (now) | lorebook (future)
│   │   ├── KeywordReachTable.tsx       — per-keyword reach % at depths 1/2/3/Max
│   │   └── EntrySimulation.tsx         — simulate-this-entry trigger + results display
│   │
│   ├── editor/
│   │   ├── index.ts
│   │   ├── EditorView.tsx              — scope-aware root: lorebook (BookMeta) | entry (fields)
│   │   ├── CategoryAssign.tsx          — LLM categorization button + manual override
│   │   ├── ContentField.tsx            — textarea with keyword highlighting
│   │   ├── KeywordEditor.tsx           — tag-style keyword input (primary + secondary)
│   │   ├── KeywordObjectsEditor.tsx    — RoleCall per-keyword config (advanced mode)
│   │   ├── fields/
│   │   │   ├── ActivationFields.tsx    — constant, selective, selectiveLogic, enabled, probability
│   │   │   ├── PriorityFields.tsx      — position, order, depth, role
│   │   │   ├── TimedEffectFields.tsx   — delay, sticky, cooldown
│   │   │   ├── RecursionFields.tsx     — preventRecursion, excludeRecursion
│   │   │   ├── BudgetFields.tsx        — ignoreBudget, token count display
│   │   │   ├── GroupFields.tsx         — group, groupOverride, groupWeight, useGroupScoring
│   │   │   ├── ScanOverrideFields.tsx  — per-entry caseSensitive, matchWholeWords, scanDepth
│   │   │   ├── MatchSourceFields.tsx   — matchPersonaDescription, matchCharacterDescription, etc.
│   │   │   └── AdvancedFields.tsx      — automationId, outletName, vectorized, characterFilter, triggers
│   │   └── variants/
│   │       ├── sillytavern/
│   │       │   ├── STEntryFields.tsx   — ST-specific field groups (overrides/extends shared fields)
│   │       │   └── STBookMetaFields.tsx — ST-specific global settings
│   │       └── rolecall/
│   │           ├── RCEntryFields.tsx   — positionRoleCall, triggerMode, conditions
│   │           ├── RCBookMetaFields.tsx — RC-specific global settings
│   │           ├── ConditionsEditor.tsx — triggerConditions editing
│   │           └── ConditionsViewer.tsx — read-only conditions display
│   │
│   └── rules/
│       ├── index.ts
│       ├── RulesView.tsx               — lorebook scope only
│       ├── RuleList.tsx                — built-in + custom rule list with toggles
│       ├── RuleEditor.tsx              — condition builder + template field
│       ├── RuleTestingPane.tsx         — live preview of matching entries
│       ├── ConditionBuilder.tsx        — SerializedEvaluation tree builder
│       ├── VariablePicker.tsx          — condition variable dropdown
│       └── TemplateField.tsx           — message template with variable interpolation
│
├── layouts/
│   └── desktop/
│       ├── WorkspaceShell.tsx          — root layout (exists, refactored in Phase 3)
│       ├── LorebookWorkspace.tsx       — replaces WorkspaceToolsModal (z-40, lorebook scope)
│       ├── EntryWorkspace.tsx          — replaces EntryEditorModal (z-50, entry scope)
│       ├── SidebarPanel.tsx            — right panel rendering feature modules with implicit scope
│       ├── TabBar.tsx                  — exists, moves here
│       ├── FilesPanel.tsx              — exists, moves here
│       ├── StatusBar.tsx               — exists, moves here
│       ├── WelcomeScreen.tsx           — exists, moves here
│       └── GraphCanvas.tsx             — exists, moves here (desktop-only)
│
├── services/                           — unchanged
├── stores/                             — unchanged
├── types/                              — unchanged
├── hooks/                              — unchanged
├── lib/                                — unchanged
└── styles/                             — unchanged
```

---

## Scopes

**Lorebook scope** — operates across all entries. Driven by `entries[]`, `bookMeta`, `graph`, `findings[]`, `healthScore`, `simulatorState`. BookMeta settings (maxRecursionSteps, tokenBudget, scanDepth) actively constrain health checks and simulation.

**Entry scope** — operates on a single entry. Driven by `entry`, plus its slice of lorebook data (this entry's findings, edges, activation behavior). BookMeta still influences via budget rules, chain thresholds, recursion limits.

**Scope is implicit.** Selecting an entry in the list or graph shifts context-sensitive modules to entry scope. Deselecting returns to lorebook scope. Full-screen workspaces are scope-locked: Entry Workspace is always entry scope, Lorebook Workspace is always lorebook scope.

---

## Feature Module Specifications

### `features/health/`

**Replaces:** AnalysisPanel, AnalysisTabContent, AnalysisFindingList, AnalysisDetailPane, InspectorPanel, ModalFindingsPane, ChainDiagram, ActivationLinks, FindingItem

**Lorebook scope renders:**
- HealthScoreCard (overall grade, category breakdown)
- FindingsList with severity/category filtering
- FindingDetail (expanded explanation, affected entries, chain diagram, suggested fix)
- DeepAnalysisTrigger (LLM rules — migrates to Insights when that module exists)

**Entry scope renders:**
- FindingsList filtered to this entry's findings
- HealthScoreCard showing entry health contribution
- ConnectionsList (incoming/outgoing edges from graph)
- Entry impact context (what changes if this entry is modified/removed)

**Data contract:**
```typescript
interface HealthViewProps {
  scope: 'lorebook' | 'entry';
  // Lorebook scope
  findings?: Finding[];
  healthScore?: HealthScore;
  entries?: WorkingEntry[];
  graph?: RecursionGraph;
  bookMeta?: BookMeta;
  // Entry scope
  entry?: WorkingEntry;
  entryFindings?: Finding[];
  entryEdges?: { incoming: EdgeMeta[]; outgoing: EdgeMeta[] };
  // Shared
  onEntrySelect?: (entryId: string) => void;
  onEntryOpen?: (entryId: string) => void;
}
```

---

### `features/simulator/`

**Replaces:** SimulatorPanel, SimulatorTabContent, SimulatorConversationPane, SimulatorResultsPane, ActivationResults, RecursionTrace, MessageInput

**Lorebook scope renders:**
- MessageComposer (single + conversation mode)
- Engine selector + settings (defaults from BookMeta)
- ActivationResultList (all activated/skipped entries)
- RecursionTraceView (step-by-step)
- Token budget visualization
- Multi-message conversation replay

**Entry scope renders:**
- "Simulate this entry" button — runs a simulation using this entry's content as the prompt, shows full results with the same quality as lorebook scope (badges, colors, keyword match indicators, token counts)
- EntryActivationProfile: will this entry activate for the current sim state? why/why not?
- Activation history across conversation steps

**Design note:** Entry-scope simulator answers "what happens when this entry fires?" with a real simulation, not abstract reach analysis. ReachAnalysis (keyword reach at N steps) lives in `features/keywords/` — reach is a keyword concept, not a simulation concept.

**Data contract:**
```typescript
interface SimulatorViewProps {
  scope: 'lorebook' | 'entry';
  entries: WorkingEntry[];
  bookMeta: BookMeta;
  simulatorState: SimulatorState;
  graph: RecursionGraph;
  // Entry scope
  entry?: WorkingEntry;
  // Actions
  onRunSimulation: () => void;
  onUpdateSettings: (patch: Partial<SimulationSettings>) => void;
  onSetMessages: (messages: SimMessage[]) => void;
  onEntrySelect?: (entryId: string) => void;
  onEntryOpen?: (entryId: string) => void;
}
```

---

### `features/keywords/`

**Replaces:** KeywordInput, KeywordsTabContent, KeywordTable (old location), KeywordDetailPane, KeywordObjectsEditor

**Lorebook scope renders:**
- Compact keyword dropdown (not two-panel master-detail — that layout belongs in Lorebook Workspace)
- Selected keyword shows entries that use it + simulate button
- Overlap/duplicate detection highlights

**Entry scope renders (read-only analytical):**
- This entry's keywords listed with lorebook context (uniqueness, overlap, gaps)
- Keyword reach at 1/2/3 steps of recursion (bounded by BookMeta.maxRecursionSteps): at step 1 these keywords reach entries X, Y; at step 2 Z, W; etc.
- Per-keyword overlap indicators

**Lorebook Workspace scope renders (full space):**
- KeywordTable (full inventory, sortable, searchable)
- KeywordContextCard per keyword (which entries use it, overlap, occurrence count)
- Overlap/duplicate detection highlights

**Design note:** Entry-scope Keywords is purely analytical — "understand what your keywords do." Keyword editing (primary/secondary tags, RoleCall keyword objects) lives in `features/editor/` under the Edit tab. Sidebar tabs are read views (Health, Simulator, Keywords). The Edit tab is the write view.

**Data contract:**
```typescript
interface KeywordsViewProps {
  scope: 'lorebook' | 'entry' | 'lorebook-workspace';
  entries: WorkingEntry[];
  graph: RecursionGraph;
  bookMeta: BookMeta;
  // Entry scope
  entry?: WorkingEntry;
  // Shared
  onEntrySelect?: (entryId: string) => void;
  onEntryOpen?: (entryId: string) => void;
  onSimulateKeyword?: (keyword: string) => void;
}
```

---

### `features/editor/`

**Replaces:** EntryEditor, EntryEditorModal (the form parts — modal chrome moves to layouts/), BookMetaEditor, ContentEditor, RCActivationSection, RoleCallPositionSelect, ConditionsEditor, ConditionsViewer

**Entry scope renders:**
- ContentField with keyword highlighting
- Shared field groups (Activation, Priority, TimedEffects, Recursion, Budget, Group, ScanOverrides, MatchSources, Advanced)
- Format variant fields loaded by `activeFormat`
- CategoryAssign (LLM categorization)
- Keyword editing (KeywordEditor for primary/secondary tags, KeywordObjectsEditor for RoleCall advanced mode)
- Composes ConnectionsList from `features/health/` at entry scope

**Design note:** Keyword editing lives in Editor, not Keywords. The sidebar pattern is: Edit tab is the write view, all other tabs (Health, Simulator, Keywords) are read/analytical views.

**Lorebook scope renders:**
- BookMeta editor: shared settings + format variant BookMeta fields

**Variant loading:**
```typescript
// EditorView.tsx
const VariantEntryFields = useMemo(() => {
  switch (activeFormat) {
    case 'sillytavern': return lazy(() => import('./variants/sillytavern/STEntryFields'));
    case 'rolecall': return lazy(() => import('./variants/rolecall/RCEntryFields'));
    default: return null;
  }
}, [activeFormat]);
```

---

### `features/rules/`

**Replaces:** RulesTabContent, RuleEditorModal, ConditionBuilder, RuleTestingPane, VariablePicker, TemplateField

**Lorebook scope only.** Entry-scope rule interaction is through Health findings.

---

### `features/insights/`

Entry-scope impact analysis and lorebook-scope intelligence dashboard.

**Entry scope renders (build now — used in EntryWorkspace Insights tab):**
- Keyword reach table: for each keyword in this entry's outgoing edges (keywords in content that match other entries' keys), show reach % at depths 1, 2, 3, and Max. Max = the depth where activation % stops changing. If Max is reached after 1–2 steps, omit the corresponding columns with a dash.
- Simulate-this-entry: button to run a simulation using this entry's content as the prompt, showing full results (badges, colors, keyword matches, token counts) — same quality as lorebook-scope Simulator.
- Future: LLM-specific insights (content quality, keyword effectiveness, structural role, comparison to similar entries)

**Lorebook scope renders (future — design for, don't build yet):**
- LLM assessment of overall lorebook quality with explanations
- Actionable recommendations prioritized by impact
- Metrics dashboard: entry reach at N steps, token efficiency, coverage gaps, activation probability distribution
- Impact analysis: "if you fix these 3 issues, your Health score improves by X"

**Data source for keyword reach:** RecursionGraph outgoing edges, NOT the entry's assigned primary/secondary keys. The reach table shows "if keyword X fires, how far does the cascade go?" — a structural property of the lorebook.

**Relationship to Simulator module:** Entry-scope Insights contains a simulation trigger and results display, but it does NOT depend on Simulator having been run. The keyword reach table is always computed from the graph (Approach 1). The simulate-this-entry feature is self-contained within Insights — it calls SimulatorService directly.

Persistent metadata stored in `extensions.lorewalker.insights` per entry.

---

## Extensions Namespace

`extensions.lorewalker` is Lorewalker's reserved namespace within the lorebook extensions passthrough.

**Current:** `extensions.lorewalker.userCategory` — manual or LLM-assigned category.

**Future:** `extensions.lorewalker.insights` — persisted LLM analysis results, structural metrics.

**Rules:** Format-native fields are top-level on WorkingEntry. Lorewalker metadata lives in `extensions.lorewalker.*`. TransformService inflates/deflates known fields. Unknown extensions from other tools pass through untouched.

---

## Editor Variant Pattern

Format-specific fields are organized as variants. Shared fields render for every format. Variant fields render in a "Format-Specific" section.

Adding a new format = adding a variant directory with entry and book-meta field components. No modification to shared code.

**Health rules are format-aware.** Rubric assembly in `useDerivedState` filters rules by format compatibility. ST-specific rules don't run against RoleCall lorebooks.

---

## Format I/O Ownership (Future Decision)

Evaluate building Lorewalker-native format I/O to replace `@character-foundry/character-foundry`. Known gaps: ST fidelity issues, no RC support in character-foundry, field mapping mismatches. Not part of consolidation scope. The variant pattern will make format gaps more visible.

---

## Sidebar UX Principle

Sidebar tabs follow a read/write split. The **Edit** tab is the only write view — it's where you change entry fields, keywords, content, settings. All other tabs (**Health**, **Simulator**, **Keywords**) are read/analytical views — they show you information about the entry or lorebook but don't modify anything.

This means: keyword editing is in Edit, not Keywords. Simulation trigger is in Simulator, not Edit. Health findings are in Health, not Edit. Each tab has a clear purpose.

---

## Dependency Rules

```
features/health/       → types/, services/, stores/
features/simulator/    → types/, services/, stores/
features/keywords/     → types/, services/, stores/
features/editor/       → types/, services/, stores/
                         + features/health/   (entry-scope ConnectionsList)
features/rules/        → types/, services/, stores/
features/insights/     → types/, services/, stores/

layouts/desktop/       → features/*, stores/
layouts/mobile/        → features/*, stores/  (future)
```

Keyword editing components (KeywordEditor, KeywordObjectsEditor) live in `features/editor/`, not `features/keywords/`. Keywords module is read-only.

Insights does NOT depend on Simulator module. It calls SimulatorService directly for the entry simulation feature.

No other cross-feature imports without updating this list.

---

## Execution Plan

### Phase 1: Extract Shared Primitives

**Goal:** Create `src/features/` directories, extract reusable display components from current locations. Old components become thin wrappers importing from new locations. **No layout changes. No behavior changes. App looks identical.**

**Four parallel work streams:**

#### Stream A: Health Primitives

Create `src/features/health/`.

1. **FindingsList** — Extract the findings list rendering logic shared between AnalysisPanel and AnalysisTabContent/AnalysisFindingList. The new component accepts `findings: Finding[]`, filter state, and click handlers. Supports severity/category filtering. Both scopes use the same list — lorebook scope passes all findings, entry scope passes filtered-by-entryId findings.

2. **FindingDetail** — Extract from AnalysisDetailPane. Accepts a single `Finding`, renders expanded explanation, affected entries, suggested fix. Include ChainDiagram rendering (extract ChainDiagram as a sub-component within health/).

3. **HealthScoreCard** — Extract from AnalysisPanel's health score display. Accepts `HealthScore` + optional `RuleCategory` filter. At lorebook scope shows overall + category breakdown. At entry scope shows this entry's contribution (computed from its findings).

4. **ConnectionsList** — Merge ActivationLinks (from editor/) and InspectorPanel's edge display into one component. Accepts incoming and outgoing `EdgeMeta[]`, renders both directions with entry name resolution. Click handler for navigating to connected entries.

5. **DeepAnalysisTrigger** — Extract the "Deep Analysis" button + cost estimate dialog from AnalysisPanel/DeepAnalysisDialog. Self-contained trigger component.

After extraction: AnalysisPanel, InspectorPanel, ModalFindingsPane, AnalysisTabContent, AnalysisFindingList, AnalysisDetailPane, ChainDiagram, FindingItem, ActivationLinks all become thin wrappers importing from `features/health/`. Verify app behavior unchanged.

#### Stream B: Simulator Primitives

Create `src/features/simulator/`.

1. **MessageComposer** — Extract message input logic shared between SimulatorPanel and SimulatorConversationPane. Accepts message list, add/remove/edit handlers. Supports single-message and conversation modes.

2. **ActivationResultList** — Extract from ActivationResults. Accepts `ActivationResult`, renders activated + skipped entries with trigger details, matched keywords, token cost. Click handler for entry navigation.

3. **RecursionTraceView** — Extract from RecursionTrace. Accepts `RecursionStep[]`, renders step-by-step. Entry name resolution via entries prop.

After extraction: SimulatorPanel, SimulatorTabContent, SimulatorConversationPane, SimulatorResultsPane, ActivationResults, RecursionTrace become thin wrappers. Verify app behavior unchanged.

#### Stream C: Keyword Primitives

Create `src/features/keywords/`.

1. **KeywordTable** — Move existing KeywordTable from `components/keywords/` to `features/keywords/`. Update imports. No logic changes needed — it's already a standalone component.

2. **KeywordTag** — Extract individual keyword display from KeywordInput's tag rendering. Accepts keyword string + context indicators (overlap warning, uniqueness). Reusable at both scopes.

3. **KeywordContextCard** — Extract from KeywordDetailPane. Per-keyword summary: which entries use it, match options, occurrence count, overlap indicators.

4. **KeywordEditor** — Extract the tag-style input (add/remove keywords, primary/secondary) from KeywordInput. This is the entry-scope editing component.

5. **KeywordObjectsEditor** — Move from `components/editor/` to `features/keywords/`. It's keyword-domain, not editor-domain. Update imports.

After extraction: KeywordsTabContent, KeywordDetailPane, KeywordInput become thin wrappers. Verify app behavior unchanged.

#### Stream D: Editor Field Extraction

Create `src/features/editor/` with `fields/` and `variants/` subdirectories.

1. **Extract shared field groups from EntryEditor** — Break the current monolithic EntryEditor form into logical field group components:
   - `ActivationFields` — constant, selective, selectiveLogic, enabled, probability
   - `PriorityFields` — position, order, depth, role
   - `TimedEffectFields` — delay, sticky, cooldown
   - `RecursionFields` — preventRecursion, excludeRecursion
   - `BudgetFields` — ignoreBudget, token count display
   - `GroupFields` — group, groupOverride, groupWeight, useGroupScoring
   - `ScanOverrideFields` — per-entry caseSensitive, matchWholeWords, scanDepth
   - `MatchSourceFields` — all matchPersona/Character/Scenario/etc. toggles
   - `AdvancedFields` — automationId, outletName, vectorized, characterFilter, triggers

   Each field group accepts the relevant slice of WorkingEntry + an update handler. EntryEditor becomes a composition of these field groups.

2. **ContentField** — Extract ContentEditor to `features/editor/ContentField.tsx`. Same component, new home.

3. **CategoryAssign** — Extract the LLM categorization UI (button + manual override dropdown) into its own component.

4. **Create variant directories:**
   - `variants/sillytavern/` — Move ST-specific field rendering (if any is currently split out) or stub `STEntryFields.tsx` and `STBookMetaFields.tsx` for Phase 2.
   - `variants/rolecall/` — Move RCActivationSection, RoleCallPositionSelect, ConditionsEditor, ConditionsViewer here. Rename RCActivationSection → `RCEntryFields.tsx`. Stub `RCBookMetaFields.tsx`.

After extraction: EntryEditor is a composition of field groups from `features/editor/fields/`. EntryEditorModal still wraps EntryEditor (unchanged). BookMetaEditor still exists (refactored in Phase 2). Verify app behavior unchanged.

#### Phase 1 Completion Criteria

- All `src/features/` directories exist with extracted primitives
- All old components are thin wrappers importing from features/
- No layout changes — sidebar, WorkspaceToolsModal, EntryEditorModal unchanged
- All tests pass
- App looks and behaves identically
- `git log` shows clean extraction commits per stream

---

### Phase 2: Scope-Aware Module Roots + Variant Wiring

**Goal:** Create the `*View.tsx` root component for each feature module that handles scope switching. Wire the editor variant pattern. **Old wrapper components still exist but new module roots are usable.**

**Four parallel work streams:**

#### Stream A: HealthView

Build `features/health/HealthView.tsx`:
- Accepts `HealthViewProps` (see data contract above)
- When `scope === 'lorebook'`: renders HealthScoreCard (full), FindingsList (all findings), FindingDetail for selected finding, DeepAnalysisTrigger
- When `scope === 'entry'`: renders HealthScoreCard (entry contribution), FindingsList (filtered to entry), ConnectionsList, entry impact summary
- All data transformation (filtering findings by entry, extracting edges from graph) happens inside HealthView or its hooks — callers pass raw data

Write unit tests for HealthView at both scopes with mock data.

#### Stream B: SimulatorView

Build `features/simulator/SimulatorView.tsx`:
- When `scope === 'lorebook'`: renders MessageComposer, engine settings, ActivationResultList, RecursionTraceView, budget visualization
- When `scope === 'entry'`: renders EntryActivationProfile (new — "will this entry activate?"), ReachAnalysis (new — "what does this entry trigger at N steps?"), activation history

Build `EntryActivationProfile.tsx`:
- Takes an entry + the last activation result
- Shows: activated/not activated, why (keyword match, constant, recursion, or skip reason), matched keywords, trigger chain
- If no sim has been run yet, shows a prompt to run one

Build `ReachAnalysis.tsx`:
- Takes an entry + graph + BookMeta.maxRecursionSteps
- Computes and displays reachable entries at each step depth (uses GraphService.getDescendants or similar)
- Bounded by maxRecursionSteps — doesn't show step 4 if maxRecursionSteps is 3

Write unit tests for SimulatorView, EntryActivationProfile, ReachAnalysis.

#### Stream C: KeywordsView + RulesView

Build `features/keywords/KeywordsView.tsx`:
- When `scope === 'lorebook'`: renders KeywordTable + KeywordContextCard for selected keyword
- When `scope === 'entry'`: renders KeywordEditor (primary/secondary editing) + keyword context for this entry's keywords + KeywordObjectsEditor (when RC advanced mode)

Build `features/rules/RulesView.tsx`:
- Lorebook scope only
- Renders RuleList (built-in toggles + custom CRUD), launches RuleEditor modal
- Incorporates format-aware rule filtering (rules have a `formatCompatibility` or the rubric assembly filters by activeFormat)

Move ConditionBuilder, VariablePicker, TemplateField, RuleTestingPane into `features/rules/`.

Write unit tests.

#### Stream D: EditorView + Variant Wiring

Build `features/editor/EditorView.tsx`:
- When `scope === 'entry'`: composes field groups from `fields/`, ContentField, CategoryAssign, lazy-loads variant by activeFormat, includes KeywordEditor from `features/keywords/` and ConnectionsList from `features/health/`
- When `scope === 'lorebook'`: renders BookMeta editor with shared settings + format variant BookMeta fields
- Variant loading uses `React.lazy` + `Suspense` per the pattern in the spec

Refactor BookMetaEditor into EditorView's lorebook scope path:
- Shared BookMeta fields render always
- `STBookMetaFields` renders for ST format (minActivations, maxDepth, insertionStrategy, etc.)
- `RCBookMetaFields` renders for RC format

Verify entry editing works through EditorView at entry scope with all field groups. Verify BookMeta editing works at lorebook scope.

Write integration tests for EditorView at both scopes.

#### Phase 2 Completion Criteria

- All `*View.tsx` roots exist and render correctly at both scopes
- Editor variant pattern works (ST and RC field groups load by format)
- New entry-scope simulator components (EntryActivationProfile, ReachAnalysis) work
- Format-aware rule filtering implemented
- Tests pass for all module roots
- Old wrapper components still exist (not yet removed)

---

### Phase 3: Rewire Containers

**Goal:** Replace the old container components with the new layout structure. Remove all thin wrappers and eliminated components. Rename Analysis → Health in UI. **This is where the app visibly changes internally, but user-facing behavior remains the same.**

This phase has more interdependencies — work in 2 larger streams rather than 4 small ones.

#### Stream A: Sidebar + Workspace Shell

1. **Create `layouts/desktop/SidebarPanel.tsx`** — the right panel that renders feature modules with implicit scope:
   - Determines scope from selection state (entry selected → entry, none → lorebook)
   - Tabs: Edit, Health, Simulator, Keywords
   - "Edit" tab (write view): EditorView at entry scope (entry fields + keyword editing) or lorebook scope (BookMeta)
   - "Health" tab (read view): HealthView at inferred scope
   - "Simulator" tab (read view): SimulatorView at inferred scope — entry scope includes "simulate with this entry's content" trigger
   - "Keywords" tab (read view): KeywordsView at inferred scope — lorebook scope is compact dropdown, entry scope is keyword reach analysis

2. **Refactor WorkspaceShell:**
   - Move to `layouts/desktop/WorkspaceShell.tsx`
   - Replace right-panel tab rendering with SidebarPanel
   - Remove old panel component imports (AnalysisPanel, InspectorPanel, SimulatorPanel, EntryEditor, BookMetaEditor)
   - Keep: left panel (EntryList, FilesPanel), center panel (GraphCanvas), toolbar, tab bar, modal state management
   - Move remaining `components/workspace/` files to `layouts/desktop/` (TabBar, FilesPanel, StatusBar, WelcomeScreen)

3. **Move GraphCanvas + graph sub-components** to `layouts/desktop/` (desktop-only feature, not a portable feature module)

4. **Update toolbar:** Rename "Analysis" button to "Health", update icon/tooltip if needed. Update keyboard shortcut labels.

5. **Update StatusBar** to use Health naming.

#### Stream B: Workspaces (Modal Replacements)

1. **Create `layouts/desktop/LorebookWorkspace.tsx`** — replaces WorkspaceToolsModal:
   - z-40, 95vw × 90vh (same dimensions)
   - Tabs: Health, Simulator, Rules, Keywords (Insights tab added later)
   - Each tab renders the corresponding `*View` at lorebook scope
   - Same Escape handling (bubble phase)
   - Navigation callbacks: `onEntryOpen(entryId)` opens Entry Workspace, `onEntrySelect(entryId)` closes workspace and selects entry

2. **Create `layouts/desktop/EntryWorkspace.tsx`** — replaces EntryEditorModal:
   - z-50, 90vw × 90vh (same dimensions)
   - Two tabs:
     - **Edit** — EditorView at entry scope (all entry fields, keyword editing, format variants)
     - **Insights** — entry-scope Insights: keyword reach table, simulate-this-entry results, future LLM analysis
   - Back/forward navigation stack preserved
   - Escape handling (capture + stopImmediatePropagation) preserved
   - Health findings are NOT in the modal — they're on the sidebar Health tab

3. **Remove old components:**
   - Delete: WorkspaceToolsModal, AnalysisTabContent, AnalysisFindingList, AnalysisDetailPane, SimulatorTabContent, SimulatorConversationPane, SimulatorResultsPane, AnalysisPanel, InspectorPanel, ModalFindingsPane, SimulatorPanel, FindingItem, ActivationResults, RecursionTrace, ActivationLinks, EntryEditor, EntryEditorModal, BookMetaEditor, ContentEditor, KeywordInput, RCActivationSection, RoleCallPositionSelect
   - Delete: `components/analysis/`, `components/simulator/`, `components/inspector/`, `components/tools-modal/` (except any shared components that moved elsewhere), `components/keywords/` (moved to features/)
   - Keep: `components/shared/` (ErrorBoundary, ToastStack, Toggle), `components/ui/` (Tooltip, HelpTooltip), `components/settings/` (SettingsDialog and sub-panels)

4. **Update imports throughout** — grep for any remaining imports from deleted paths.

5. **Update ARCHITECTURE.md, CONVENTIONS.md** — document the new structure, update component map, file structure, naming.

#### Phase 3 Completion Criteria

- All old container components removed
- Sidebar renders feature modules with implicit scope
- LorebookWorkspace replaces WorkspaceToolsModal
- EntryWorkspace replaces EntryEditorModal
- Modal layering preserved (z-40/z-50/z-9999)
- Navigation delegation preserved (onEntryOpen, onEntrySelect)
- All Analysis → Health renaming complete in UI
- All tests pass
- Architecture docs updated
- No remaining imports from deleted component paths

---

### Phase 4: Monorepo + Mobile Setup

**Goal:** Extract shared business logic into `packages/core`, set up React Native + Expo project, build mobile navigation shell and initial feature screens.

**See `docs/PHASE4-PLAN.md` for the full execution plan** including monorepo structure, storage abstraction, mobile navigation, feature scope, four sequential streams, and key decisions.

**High-level structure:**
```
packages/
  core/          — types/, services/, stores/ (no React DOM, no React Native)
  web/           — Vite app, layouts/desktop/, features/ (web component implementations)
  mobile/        — Expo app, layouts/mobile/, features/ (React Native implementations)
```

---

## Implementation Notes for All Phases

**BookMeta influences health and simulation.** When wiring HealthView and SimulatorView, ensure BookMeta values (maxRecursionSteps, tokenBudget, scanDepth, etc.) flow through. The long chains rule should evaluate against BookMeta.maxRecursionSteps, not a hardcoded threshold. The simulator should use BookMeta defaults for settings the user hasn't overridden.

**Format-aware rubric assembly.** In `useDerivedState`, when assembling the active rubric, filter rules by format compatibility. Add a `formatCompatibility?: LorebookFormat[]` field to Rule (if not present, rule applies to all formats). ST-specific rules include `formatCompatibility: ['sillytavern', 'ccv3']`. RC-specific rules include `formatCompatibility: ['rolecall']`.

**EMPTY_STORE pattern unchanged.** Feature modules that need DocumentStore access use the same EMPTY_STORE fallback pattern. This doesn't change.

**Graph is desktop-only.** GraphCanvas and all graph sub-components (EntryNode, RecursionEdge, GraphControls, GraphLegend, GraphAddButton, EdgeConnectDialog) move to `layouts/desktop/` not to `features/`. They're not portable to mobile. Graph data (RecursionGraph) is still available to feature modules — ConnectionsList, ReachAnalysis, ChainDiagram all consume graph data. But the interactive canvas is desktop layout.

**No new features during consolidation.** Phases 1–3 are pure refactoring. If a component needs a bug fix during extraction, fix it, but don't add features, improve UX, or refactor logic. The goal is structural change with behavioral equivalence.
