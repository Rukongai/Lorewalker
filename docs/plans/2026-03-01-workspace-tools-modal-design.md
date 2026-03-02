# WorkspaceTools Modal — Design Document

**Date:** 2026-03-01
**Status:** Approved

---

## Problem

The Analysis and Simulator sidebar panels (~320px) are too narrow to present their full data richness. Users need a wide-canvas, two-pane experience for deep lorebook analysis and activation simulation.

---

## Solution

Add a dedicated `WorkspaceToolsModal` (95vw × 90vh) accessible via two toolbar icon buttons (Analysis, Simulator). The modal provides purpose-built two-pane layouts for each tool. Existing sidebar panels are left untouched.

---

## Component Tree

```
WorkspaceToolsModal
├── AnalysisTabContent
│   ├── AnalysisFindingList   (left ~35%)
│   └── AnalysisDetailPane   (right ~65%)
│       └── ChainDiagram
└── SimulatorTabContent
    ├── SimulatorConversationPane  (left ~40%)
    └── SimulatorResultsPane       (right ~60%)
```

Files created in `src/components/tools-modal/`.

---

## Modal Shell

- **Size:** 95vw × 90vh, centered
- **z-index:** z-40 (EntryEditorModal at z-50 stacks on top when an entry is opened)
- **Overlay:** `bg-black/60`
- **Header:** left tab bar (Analysis | Simulator), right close (×) button
- **Escape:** closes modal via window keydown listener
- **State:** `toolsModalOpen: boolean`, `toolsModalTab: 'analysis' | 'simulator'` — local to WorkspaceShell, NOT persisted

---

## WorkspaceShell Changes

- Two new toolbar buttons added to header: Analysis (BarChart2 icon), Simulator (Zap icon)
- Clicking Analysis button → opens modal on Analysis tab
- Clicking Simulator button → opens modal on Simulator tab
- `onOpenEntry(entryId)` → sets `modalEntryId` (opens EntryEditorModal on top)
- `onSelectEntry(entryId)` → closes tools modal + calls `realStore.getState().selectEntry(id)`

---

## Analysis Tab

### Left Pane (~35%)
- Health score header: large score (colored red/yellow/green) + summary text
- Severity filter bar: All | Errors | Warnings | Suggestions with live counts
- Scrollable finding list grouped by category, collapsible
- Each row: severity icon + message + rule ID (muted) + "AI" badge for LLM findings
- Selected finding highlighted
- Deep Analysis button (disabled without LLM provider)

### Right Pane (~65%)
- Empty state when no finding selected
- When finding selected:
  - Severity badge + message + category chip
  - `details` text block
  - Affected entries: clickable chips (regular click → EntryEditorModal, Cmd/Ctrl+click → close modal + select)
  - Chain Diagram (only when `entryIds.length > 1`): vertical flow of entry cards with keyword-labeled arrows

### ChainDiagram
- Renders a vertical sequence of entry cards for the `entryIds` in the finding
- Arrow between each pair shows `graph.edgeMeta.get(\`${idA}→${idB}\`)?.matchedKeywords`
- Each card is clickable with the same regular/Cmd+click navigation

---

## Simulator Tab

### Left Pane (~40%)
- Engine badge
- Message composer (role selector + content textarea + Add button)
- Staged messages list (editable/deletable)
- Run (primary) + Reset buttons
- Conversation history: previous steps with message preview + activated count + token cost
  - Click step → loads that result into right pane
  - Add to Conversation + Clear History buttons

### Right Pane (~60%)
- Empty state when no result
- When result available:
  - Summary bar: tokens / budget + budget-exhausted warning
  - Activated entries (constant / keyword / recursion sections)
  - Skipped entries (collapsible)
  - Recursion trace (collapsible)
- Entry names: regular click → EntryEditorModal, Cmd/Ctrl+click → close modal + select

---

## Store Access Pattern

All new components use the same EMPTY_STORE pattern as existing panels:

```typescript
const activeTabId = useWorkspaceStore((s) => s.activeTabId)
const realStore = activeTabId ? documentStoreRegistry.get(activeTabId) : undefined
const activeStore = realStore ?? EMPTY_STORE
```

---

## Navigation Behavior

```typescript
// Regular click
onOpenEntry(entryId)  // → WorkspaceShell sets modalEntryId → EntryEditorModal opens

// Cmd/Ctrl+click
onSelectEntry(entryId)  // → WorkspaceShell closes tools modal + selectEntry(id)
```
