# Lorewalker — Implementation Plan

## Phase 0: Project Scaffold ✓ Complete
**Goal:** Buildable, runnable shell with all tooling configured.

**Tasks:**
1. Initialize Vite + React + TypeScript project
2. Install and configure: Tailwind CSS, shadcn/ui (dark mode default), @xyflow/react, zustand, immer, zundo, idb-keyval or Dexie, @character-foundry/character-foundry, vitest
3. Configure path aliases (`@/` → `src/`)
4. Set up file structure per CONVENTIONS.md
5. Create the `types/` directory with all type definitions from TYPES.md
6. Create a minimal WorkspaceShell that renders with a dark theme
7. Verify build, dev server, and test runner all work

**Delivers:** Empty app shell that starts, shows a dark-themed workspace, and has all dependencies available.

**Dependencies:** None.

---

## Phase 1: Core Pipeline (File → Model → File) ✓ Complete
**Goal:** Import a SillyTavern lorebook JSON, see entries in a list, edit one, export back. The minimal end-to-end proof that the architecture works.

**Tasks:**
1. Implement TransformService: inflate (CCv3 → WorkingEntry[]) and deflate (WorkingEntry[] → CCv3)
2. Implement FileService: import (file picker + drag-drop), export (browser download)
3. Implement WorkspaceStore: tab management (open, close, switch, dirty tracking)
4. Implement DocumentStore factory: create per-tab stores with entries, basic actions (updateEntry, addEntry, removeEntry)
5. Wire up zundo for undo/redo on entries
6. Build EntryList component: display all entries with name, type badge, token count
7. Build EntryEditor component: form for all WorkingEntry fields with basic validation
8. Build TabBar component: show open tabs, dirty indicator, close button
9. Wire up selection: clicking entry in list opens it in editor
10. Write round-trip tests: import ST JSON → inflate → edit → deflate → serialize → verify output

**Delivers:** You can open a SillyTavern lorebook, see entries in a list, click to edit, make changes, undo/redo, and save back to a file. The core data pipeline is proven.

**Dependencies:** Phase 0.

**Milestone check:** Open a real lorebook, edit an entry's keywords, save, re-import the saved file, verify the edit persisted and no data was lost.

---

## Phase 2: Graph Visualization ✓ Complete
**Goal:** See the recursion graph. Entries are nodes, keyword-triggered links are edges.

**Tasks:**
1. Implement keyword matching functions in `services/simulator/keyword-matching.ts` (substring, case sensitivity, whole word, regex)
2. Implement GraphService: buildGraph, incremental update
3. Implement graph queries: findCycles, findOrphans, findDeadLinks (needed for edge styling)
4. Integrate useDerivedState hook: recompute graph when entries change
5. Build GraphCanvas component with @xyflow/react
6. Build custom EntryNode: name, type badge, health indicator
7. Build custom RecursionEdge: solid (active), dashed (blocked by preventRecursion), red (cycle)
8. Implement auto-layout using dagre
9. Wire up bidirectional selection: selecting in list highlights in graph and vice versa
10. Add graph controls: minimap, zoom, fit-to-view, auto-layout button
11. Graph position persistence in DocumentStore (so layout survives tab switches)

**Delivers:** The visual graph showing how entries connect. Cycles highlighted in red, blocked links shown as dashed. Clicking a node selects the entry for editing.

**Dependencies:** Phase 1 (entries and stores exist), keyword matching (shared with Phase 4).

**Milestone check:** Open a lorebook with known recursion links. Verify the graph shows the expected edges. Verify a known circular reference is highlighted red.

**Also built in Phase 2 (beyond original spec):**
- Theme system: ThemeId union with 14 themes (Catppuccin variants, Nord, Nord Aurora, One Dark, Dracula, Dracula Soft, Rosé Pine, Tokyo Night + light variants). CSS variable swap approach.
- GraphDisplayDefaults (connectionVisibility, showBlockedEdges, edgeStyle) in WorkspaceStore
- GraphLayoutSettings (dagre ranker, acyclicer, align, rankdir, edgeDirection) in WorkspaceStore
- EMPTY_STORE pattern (exported from useDerivedState.ts) for unconditional Zustand hook calls
- EntryEditorModal (double-click node to edit)
- BookMetaEditor (book-level metadata form)
- ActivationLinks (inline edge display within editor)
- GraphAddButton (add entry from graph canvas)
- LorebookDefaults in WorkspaceStore
- document-store-registry.ts (Map of tabId → DocumentStore)

---

## Phase 3: Deterministic Analysis
**Goal:** Health scoring and issue detection for everything that doesn't need an LLM.

**Tasks:**
1. Implement the Rule interface and AnalysisContext
2. Implement all deterministic rules (see ARCHITECTURE.md Rules Catalog):
   - Structure rules (3 rules)
   - Configuration rules (7 rules)
   - Keyword rules (7 rules)
   - Recursion rules (6 rules)
   - Budget rules (5 rules)
3. Implement DefaultRubric assembling all deterministic rules
4. Implement health score computation from findings
5. Integrate into useDerivedState: run deterministic analysis when entries or graph change (debounced)
6. Build AnalysisPanel: health score display, finding list with severity filtering
7. Build FindingItem: clickable findings that select affected entries
8. Add health indicators to EntryListItem and EntryNode (colored dot for worst severity)
9. Build InspectorPanel: per-entry findings list, incoming/outgoing edges, token count
10. Wire up finding → entry navigation in both list and graph views

**Delivers:** Real-time health scoring as you edit. Structural issues, configuration mistakes, keyword problems, and recursion architecture issues are all surfaced with actionable messages.

**Dependencies:** Phase 2 (graph queries — already complete; keyword matching and findCycles/findOrphans/findDeadLinks queries implemented).

**Milestone check:** Open a lorebook with a known circular reference, a selective:true entry with empty keysecondary, and an entry over 200 tokens. Verify all three are detected as findings with correct severities.

---

## Phase 4: Activation Simulator
**Goal:** Test how entries activate against mock messages.

**Tasks:**
1. Implement ActivationEngine interface
2. Implement SillyTavernEngine:
   - Step 1: Keyword scanning within scan depth
   - Step 2: Selective/secondary key logic
   - Step 3: Timed effect filtering (delay, cooldown)
   - Step 4: Probability rolls
   - Step 5: Priority sorting (constant first, then by order)
   - Step 6: Recursion scanning (with depth limits, preventRecursion, excludeRecursion)
   - Step 7: Token budget enforcement
   - Step 8: Sticky duration tracking
3. Implement SimulatorService: manage conversation state, timed effect state across messages
4. Build SimulatorPanel: message input, settings controls, engine selector
5. Build ActivationResults display: list of activated entries with trigger details
6. Build RecursionTrace visualization: step-by-step display of the recursion unfolding
7. Implement step-through mode: advance one recursion step at a time
8. Build multi-message mode: add messages to a conversation and see cumulative activation
9. Write simulator tests against known activation scenarios

**Delivers:** Interactive testing of lorebook activation. Enter a message, see which entries fire and why.

**Dependencies:** Phase 1 (entries), keyword matching from Phase 2.

**Milestone check:** Create a simple lorebook with a location that mentions an NPC name. Simulate a message mentioning the location. Verify the location activates via keyword and the NPC activates via recursion. Verify the recursion trace shows both steps.

---

## Phase 5: Persistence and Recovery ✓ Complete
**Goal:** Autosave, crash recovery, and preferences.

**Tasks:**
1. Implement PersistenceService: IndexedDB operations for documents, workspace, preferences
2. Implement autosave hook: debounced save of DocumentStore to IndexedDB (2-3 second delay)
3. Implement workspace persistence: save/restore open tabs, active tab, panel layout
4. Implement recovery detection: on app launch, check for unsaved sessions, offer restore dialog
5. Implement preference persistence: simulator defaults, theme, autosave interval
6. Implement stale recovery cleanup
7. Add "unsaved changes" confirmation when closing tabs or the browser window
8. Test recovery: make edits, kill the tab, reopen, verify recovery prompt and data integrity

**Delivers:** Protection against data loss. Close the browser, reopen, pick up where you left off.

**Dependencies:** Phases 1-4 (all stores and state exist to be persisted).

**Milestone check:** Open a lorebook, make edits, force-close the browser tab. Reopen. Verify the recovery dialog appears and restoring brings back the exact state.

---

## Phase 6: LLM Integration
**Goal:** BYOK LLM support for qualitative analysis.

**Tasks:**
1. Implement LLMService: provider registry, request/response handling
2. Implement OpenAICompatibleProvider: request construction, streaming, error handling
3. Implement AnthropicProvider: Anthropic message API adaptation
4. Build ProviderSettings UI: add/edit/remove providers, test connection, model selection
5. Implement secure API key storage in PersistenceService
6. Implement cost estimation (token counting for prompt + expected response)
7. Implement LLM-powered analysis rules:
   - content/quality-assessment
   - content/structure-check
   - content/scope-check
   - keywords/missing-variations
8. Build "Deep Analysis" flow: cost estimate → user confirmation → run → merge findings
9. Add prompt templates for each LLM rule
10. Wire LLM findings into AnalysisPanel alongside deterministic findings

**Delivers:** Qualitative analysis powered by the user's own LLM. Content quality assessment, keyword suggestions, entry splitting recommendations.

**Dependencies:** Phase 3 (analysis pipeline), Phase 5 (key storage).

**Milestone check:** Configure an OpenAI-compatible provider (e.g., Ollama running locally). Run Deep Analysis on a lorebook. Verify content quality findings appear with actionable suggestions.

---

## Phase 7: Polish and Graph Editing
**Goal:** Make the graph interactive for editing, not just viewing. Polish the overall UX.

**Tasks:**
1. Graph editing: drag to create edges (adds keyword to source content mentioning target)
2. Graph editing: delete edge (remove the keyword mention from source content)
3. Graph editing: create new entry from graph (right-click canvas → new entry node)
4. Entry type inference: auto-detect entry type (character, location, rule, etc.) from content/configuration patterns for visual styling
5. Keyboard shortcuts: Cmd/Ctrl+Z undo, Cmd/Ctrl+Shift+Z redo, Cmd/Ctrl+S save, etc.
6. Search and filter in graph: highlight matching entries, dim others
7. Multi-select operations: bulk enable/disable, bulk delete, bulk position change
8. Import from character card: when a card is dropped, show picker for which lorebook to extract
9. Status bar: health score, entry count, total token count, constant token overhead
10. Welcome/empty state: guidance when no file is open
11. Error boundaries and user-facing error messages
12. Responsive panel resizing
13. Panel state persistence (widths, collapse) was completed in Phase 5. Phase 7 focus: keyboard shortcuts, multi-select operations, welcome/empty state UX

**Delivers:** A polished, productive editor. The graph becomes a real editing surface, not just a viewer.

**Dependencies:** All prior phases.

---

## Phase 8: Desktop (Tauri)
**Goal:** Wrap the web app as a desktop application.

**Tasks:**
1. Add Tauri to the project (tauri init)
2. Implement native file dialogs (open/save) via Tauri file API
3. Implement native keychain integration for API key storage
4. Window management: remember size/position
5. Native menu bar
6. Build and test on macOS, Windows, Linux
7. Auto-update infrastructure (optional)

**Delivers:** A native desktop application with proper file system integration.

**Dependencies:** Phase 7 (web app is polished and complete).

---

## Parallelization Notes

- **Phases 2 and 4** share keyword matching logic. Implement keyword matching first (it's in Phase 2's task list), then both phases can proceed.
- **Phase 3** depends on Phase 2's graph queries, but the rule implementations that don't need the graph (structure, config, keyword, budget) can be written in parallel with Phase 2.
- **Phase 5** can overlap with Phase 4 if needed — autosave doesn't depend on the simulator.
- **Phase 6** depends on the analysis pipeline from Phase 3 but not on Phases 4 or 5 for core functionality.
- **Phases 7 and 8** are sequential and depend on everything before them.

---

## Agent Assignment

| Phase | Primary Agent | Notes |
|-------|---------------|-------|
| 0 | Orchestrator | Scaffold only, fast |
| 1 | Orchestrator | Core pipeline, must be solid before anything else |
| 2 | Orchestrator + subagent for graph components | Graph layout and xyflow setup can be parallelized with graph service logic |
| 3 | Orchestrator + subagent for rule implementations | Rules are independent and can be written in parallel |
| 4 | Orchestrator | Simulator is sequential and interdependent |
| 5 | Orchestrator | Persistence touches many parts, needs full context |
| 6 | Orchestrator + subagent for provider implementations | OpenAI-compatible and Anthropic providers are independent |
| 7 | Orchestrator | Polish requires holistic view |
| 8 | Orchestrator | Tauri integration is sequential |

Reviewer should be invoked at the end of each phase. Documentation agent at Phases 1, 3, 6, and 8 (major milestones).
