# Lorewalker — Conventions

Standards for code style, file organization, error handling, and other patterns that keep the codebase consistent. Follow these unless there's a documented reason to deviate.

---

## File Structure

```
lorewalker/
├── public/
│   └── favicon.svg
├── src/
│   ├── main.tsx                          # App entry point
│   ├── App.tsx                           # Root component
│   │
│   ├── types/                            # Canonical type definitions
│   │   ├── index.ts                      # Re-exports everything
│   │   ├── entry.ts                      # WorkingEntry, BookMeta, enums, CharacterFilter
│   │   ├── graph.ts                      # RecursionGraph, EdgeMeta, query results
│   │   ├── analysis.ts                   # Rule, Finding, HealthScore, Rubric, CustomRule, DocumentRuleOverrides
│   │   ├── simulator.ts                  # SimulationContext, ActivationResult, engine types, SimulatorState
│   │   ├── llm.ts                        # LLMProvider, CompletionRequest/Response, ProviderConfig
│   │   ├── persistence.ts                # Persisted* types, PersistedSnapshot
│   │   └── ui.ts                         # FileMeta, TabMeta, filters, layout, PanelLayout, ThemeId
│   │
│   ├── services/                         # Business logic, no React dependencies
│   │   ├── file-service.ts
│   │   ├── transform-service.ts
│   │   ├── graph-service.ts
│   │   ├── persistence-service.ts
│   │   ├── categorize-service.ts
│   │   │
│   │   ├── analysis/                     # Analysis pipeline
│   │   │   ├── analysis-service.ts       # runDeterministic, runLLMRules, computeHealthScore
│   │   │   ├── default-rubric.ts         # scoringWeights, rule array assembly
│   │   │   ├── evaluation-engine.ts      # resolveVariable, evaluateLeaf, evaluateGroup
│   │   │   ├── custom-rule-adapter.ts    # customRuleToRule() adapter
│   │   │   ├── copy-compatibility.ts
│   │   │   ├── copy-seeds.ts
│   │   │   └── rules/
│   │   │       ├── structure-rules.ts
│   │   │       ├── config-rules.ts
│   │   │       ├── keyword-rules.ts
│   │   │       ├── recursion-rules.ts
│   │   │       ├── budget-rules.ts
│   │   │       └── llm-rules.ts
│   │   │
│   │   ├── simulator/                    # Activation engines
│   │   │   ├── keyword-matching.ts       # Shared matching logic (used by GraphService + SimulatorService)
│   │   │   ├── activation-engine.ts      # ActivationEngine interface
│   │   │   ├── sillytavern-engine.ts
│   │   │   └── simulator-service.ts
│   │   │
│   │   └── llm/                          # LLM provider implementations
│   │       ├── llm-service.ts            # LLMService class + singleton export
│   │       └── providers/
│   │           ├── openai-compatible.ts
│   │           └── anthropic.ts
│   │
│   ├── stores/                           # Zustand stores
│   │   ├── workspace-store.ts
│   │   ├── document-store.ts             # Factory function, creates per-tab stores
│   │   ├── document-store-registry.ts    # Map of tabId → DocumentStore
│   │   └── hooks.ts                      # Custom hooks for store access
│   │
│   ├── components/                       # React components
│   │   ├── workspace/                    # Shell, tab bar, panels
│   │   │   ├── WorkspaceShell.tsx
│   │   │   ├── TabBar.tsx
│   │   │   ├── FilesPanel.tsx
│   │   │   ├── WelcomeScreen.tsx
│   │   │   ├── StatusBar.tsx
│   │   │   ├── SaveSnapshotDialog.tsx
│   │   │   └── LorebookPickerDialog.tsx
│   │   │
│   │   ├── entry-list/                   # Left panel entries tab
│   │   │   ├── EntryList.tsx
│   │   │   ├── EntryListItem.tsx
│   │   │   └── CategoryMenu.tsx
│   │   │
│   │   ├── graph/                        # Center panel
│   │   │   ├── GraphCanvas.tsx
│   │   │   ├── EntryNode.tsx             # Custom xyflow node
│   │   │   ├── RecursionEdge.tsx         # Custom xyflow edge
│   │   │   ├── GraphControls.tsx
│   │   │   ├── GraphLegend.tsx
│   │   │   ├── GraphAddButton.tsx
│   │   │   └── EdgeConnectDialog.tsx
│   │   │
│   │   ├── editor/                       # Entry form editor
│   │   │   ├── EntryEditor.tsx
│   │   │   ├── EntryEditorModal.tsx      # Modal variant (z-50)
│   │   │   ├── BookMetaEditor.tsx        # Book-level metadata form
│   │   │   ├── ActivationLinks.tsx       # Inline incoming/outgoing edge display
│   │   │   ├── ContentEditor.tsx
│   │   │   └── KeywordInput.tsx
│   │   │
│   │   ├── analysis/                     # Analysis panel and findings
│   │   │   ├── AnalysisPanel.tsx
│   │   │   ├── FindingItem.tsx
│   │   │   ├── InspectorPanel.tsx
│   │   │   ├── DeepAnalysisDialog.tsx
│   │   │   └── ModalFindingsPane.tsx
│   │   │
│   │   ├── simulator/                    # Simulator panel
│   │   │   ├── SimulatorPanel.tsx
│   │   │   ├── MessageInput.tsx
│   │   │   ├── ActivationResults.tsx
│   │   │   └── RecursionTrace.tsx
│   │   │
│   │   ├── tools-modal/                  # WorkspaceToolsModal (z-40) and sub-components
│   │   │   ├── WorkspaceToolsModal.tsx
│   │   │   ├── AnalysisTabContent.tsx
│   │   │   ├── AnalysisFindingList.tsx
│   │   │   ├── AnalysisDetailPane.tsx
│   │   │   ├── ChainDiagram.tsx
│   │   │   ├── SimulatorTabContent.tsx
│   │   │   ├── SimulatorConversationPane.tsx
│   │   │   ├── SimulatorResultsPane.tsx
│   │   │   ├── RulesTabContent.tsx
│   │   │   ├── RuleEditorModal.tsx
│   │   │   ├── RuleTestingPane.tsx
│   │   │   ├── ConditionBuilder.tsx
│   │   │   ├── VariablePicker.tsx
│   │   │   └── TemplateField.tsx
│   │   │
│   │   ├── settings/                     # Settings dialog and sub-panels
│   │   │   ├── SettingsDialog.tsx        # z-50
│   │   │   ├── LorebookSettingsPanel.tsx
│   │   │   ├── ProviderSettingsPanel.tsx
│   │   │   └── LlmToolsPanel.tsx
│   │   │
│   │   ├── shared/                       # Reusable UI primitives
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── ToastStack.tsx
│   │   │   └── Toggle.tsx
│   │   │
│   │   └── ui/                           # Low-level UI components
│   │       ├── Tooltip.tsx               # Portal-based, z-9999
│   │       └── HelpTooltip.tsx
│   │
│   ├── hooks/                            # Custom React hooks
│   │   ├── useDerivedState.ts            # Graph recomputation + EMPTY_STORE export
│   │   ├── useAutosave.ts
│   │   ├── useKeyboardShortcuts.ts
│   │   └── useWorkspacePersistence.ts
│   │
│   ├── lib/                              # Pure utility functions
│   │   ├── cn.ts                         # Tailwind class merging (clsx + tailwind-merge)
│   │   ├── debounce.ts                   # Generic debounce utility
│   │   ├── edge-edit.ts                  # addKeywordMention, removeKeywordMention
│   │   ├── entry-badge.ts                # getTypeBadge() — shared badge label/color utility
│   │   ├── entry-type.ts                 # EntryCategory, FIXED_CATEGORIES, CATEGORY_ICON, getEntryIcon
│   │   ├── platform.ts                   # isMac, modKey ('Cmd' | 'Ctrl')
│   │   ├── severity-color.ts             # severityColor() — maps FindingSeverity → CSS var
│   │   ├── token-estimate.ts             # estimateTokenCount() (~4 chars/token)
│   │   └── undo-describe.ts             # describeStateChange() — human-readable undo labels
│   │
│   └── styles/                           # Global styles and theme tokens
│       └── globals.css
│
├── docs/                                 # Project documentation
│   ├── ARCHITECTURE.md
│   ├── TYPES.md
│   ├── CONVENTIONS.md
│   ├── PLAN.md
│   ├── AGENTS.md
│   └── plans/                            # Design documents for approved features
│
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Naming Conventions

### Files

- **Components:** PascalCase, `.tsx` extension. One component per file. File name matches component name. `EntryEditor.tsx` exports `EntryEditor`.
- **Services:** kebab-case, `.ts` extension. `graph-service.ts` exports functions or a class.
- **Types:** kebab-case, `.ts` extension. `entry.ts` exports types/interfaces.
- **Hooks:** camelCase prefixed with `use`, `.ts` extension. `useAutosave.ts` exports `useAutosave`.
- **Tests:** Same name as the file being tested, `.test.ts` or `.test.tsx` suffix. Co-located next to the file being tested.

### Code

- **Types/Interfaces:** PascalCase. `WorkingEntry`, `RecursionGraph`, `Finding`.
- **Functions:** camelCase. `buildGraph`, `matchKeywordsInText`, `inflateEntry`.
- **Constants:** UPPER_SNAKE_CASE only for true constants (magic numbers, config defaults). Otherwise camelCase.
- **Enum-like types:** Use TypeScript union types, not enums. `type Severity = 'error' | 'warning' | 'suggestion'`.
- **Boolean variables:** Prefix with `is`, `has`, `can`, `should` where it improves clarity. `isDirty`, `hasLLMProvider`, `canUndo`.
- **Event handlers in components:** Prefix with `handle`. `handleEntrySelect`, `handleSave`.
- **Callback props:** Prefix with `on`. `onEntrySelect`, `onSave`.

### IDs

- **Entry IDs (internal):** UUID v4, generated by TransformService on import. Stable across edits within a session.
- **Entry UIDs (format-specific):** Numeric, reconstructed by TransformService on export. Not used internally except for round-trip.
- **Tab IDs:** UUID v4, generated by WorkspaceStore on tab creation.
- **Finding IDs:** UUID v4, generated by AnalysisService per finding instance.
- **Edge keys in RecursionGraph.edgeMeta:** String format `"${sourceId}→${targetId}"`. Use the Unicode arrow character `→`, not `->`.

---

## Component Conventions

### Component Structure

```typescript
// 1. Imports (React, libraries, local)
import { useState, useCallback } from 'react';
import { useDocumentStore } from '@/stores/hooks';
import type { WorkingEntry } from '@/types';

// 2. Props interface (if the component takes props)
interface EntryEditorProps {
  entryId: string;
  onClose: () => void;
}

// 3. Component
export function EntryEditor({ entryId, onClose }: EntryEditorProps) {
  // hooks first
  // derived values
  // handlers
  // render
}
```

- Use function declarations, not arrow functions, for components.
- Export components as named exports, not default exports.
- Props interface is defined in the same file, directly above the component.
- Do not destructure store selectors inline — use a named selector for readability.

### Store Access

```typescript
// Good: named selector, minimal subscription
const entries = useDocumentStore(state => state.entries);
const updateEntry = useDocumentStore(state => state.updateEntry);

// Bad: subscribes to entire store, re-renders on any change
const store = useDocumentStore();
```

### Component Size

If a component exceeds ~200 lines, it likely needs to be split. Extract logical sub-sections into child components. The parent orchestrates, children render.

---

## Service Conventions

### Pure Functions Preferred

Services should export pure functions whenever possible. State lives in Zustand stores, not in services. A service function takes data in and returns data out.

```typescript
// Good: pure function
export function buildGraph(entries: WorkingEntry[]): RecursionGraph { ... }

// Acceptable: needs external dependency (LLM)
export async function evaluateContentQuality(
  entries: WorkingEntry[],
  llmService: LLMService
): Promise<Finding[]> { ... }

// Bad: service holds mutable state
class GraphService {
  private graph: RecursionGraph;  // Don't do this
}
```

Exception: LLMService manages provider instances and their configurations. This is acceptable because providers have identity (configured API keys, base URLs) that belongs with the service, not in a React store.

### Error Handling

Services throw typed errors. UI components catch and display them.

```typescript
export class FileImportError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
    public readonly fileName?: string
  ) {
    super(message);
    this.name = 'FileImportError';
  }
}
```

Never swallow errors silently. If a function can fail, it either throws or returns a result type. Do not use `try/catch` to hide failures.

### Async Patterns

- Use async/await, not raw promises.
- LLM calls and file reads are the primary async operations. Everything else should be synchronous.
- Never `await` inside a Zustand action. Perform async work outside the store, then call a synchronous store action with the result.

---

## State Conventions

### What Goes in Stores

- **WorkspaceStore:** Tab list, active tab, theme, graph settings, custom rules, LLM provider config. Global, singleton.
- **DocumentStore (per tab):** Entries, graph positions, book metadata, findings, rule overrides, selection, simulator state. Created/destroyed with tabs.
- **Derived state:** Graph, findings, health score. Computed by hooks, not stored. Recomputed when dependencies change.

### What Does NOT Go in Stores

- LLM provider API keys → PersistenceService (IndexedDB)
- File system state → FileService (ephemeral)
- Transient UI state (dropdown open, tooltip visible) → Component-local useState

### EMPTY_STORE Pattern

When a component subscribes to a DocumentStore but must handle the case where no tab is active, use the exported `EMPTY_STORE` from `src/hooks/useDerivedState.ts` as a fallback. This ensures Zustand hook calls remain unconditional (Rules of Hooks). Never write to `EMPTY_STORE`.

```typescript
const realStore = activeTabId ? documentStoreRegistry.get(activeTabId) : undefined
const activeStore = realStore ?? EMPTY_STORE
const entries = activeStore((s) => s.entries)  // always safe to call
```

### Undo Boundary

Only these fields are tracked by zundo (undo/redo):
- `entries`
- `bookMeta`
- `graphPositions` (in partialize list, but writes bypass zundo via `store.setState(...)`)

Everything else (selection, rule overrides, simulator state, LLM findings, health score) is excluded.

### Batching

Multiple entry changes that represent one logical operation must be batched into a single store update (one undo step).

```typescript
// Good: single undo step
store.batchUpdate(new Map([
  [id1, { keys: [...] }],
  [id2, { keys: [...] }],
]));

// Bad: three undo steps
store.updateEntry(id1, { keys: [...] });
store.updateEntry(id2, { keys: [...] });
```

---

## Modal Layering

z-index hierarchy for modals and overlays:

```
z-9999  Tooltip portal               — portal-rendered, never clipped
z-50    EntryEditorModal             — entry editor modal, capture Escape
z-50    SettingsDialog               — settings modal, standard close
z-40    WorkspaceToolsModal          — tools overlay, bubble Escape
```

**Rules:**
- New modals that should close before EntryEditorModal → z-40, bubble Escape
- New modals that should take priority over WorkspaceToolsModal → z-50, capture Escape + `stopImmediatePropagation()`
- Elements that must never be z-clipped (tooltips) → portal at z-9999

**Never use inline `style={{ zIndex: ... }}`** for modal layering. Use Tailwind z-classes (`z-40`, `z-50`, `z-[9999]`).

---

## Navigation Delegation

Components inside WorkspaceToolsModal that want to navigate to an entry must use the callbacks provided by WorkspaceShell — never import or reach into WorkspaceShell internals.

| Callback | When to use |
|----------|-------------|
| `onOpenEntry(entryId)` | User wants to open the full entry editor (opens EntryEditorModal on top of WorkspaceToolsModal) |
| `onSelectEntry(entryId)` | User wants to jump to the entry in the sidebar (closes WorkspaceToolsModal, sets selection) |

---

## Tooltip Usage

Two tooltip components exist for different contexts:

| Component | When to use | How it works |
|-----------|-------------|--------------|
| `Tooltip` (`src/components/ui/Tooltip.tsx`) | Toolbar buttons, graph controls, icon buttons | Portal-rendered at root, z-9999. Avoids clipping inside fixed/overflow containers. |
| `HelpTooltip` (`src/components/ui/HelpTooltip.tsx`) | Form fields, inline help icons, `?` next to labels | Wraps `Tooltip`, renders a `?` icon trigger |

**Never use the native `title` attribute for tooltips.** It bypasses the theme system and looks inconsistent.

---

## Theme System

Themes are defined as CSS variable blocks in `src/styles/globals.css`. Each theme overrides the `--ctp-*` palette tokens and the semantic graph tokens.

**ThemeId values** (14 total):
- Dark: `dark`
- Catppuccin: `catppuccin-macchiato`, `catppuccin-latte`, `catppuccin-frappe`, `catppuccin-mocha`
- Nord: `nord`, `nord-aurora`
- Other dark: `one-dark`, `dracula`, `dracula-soft`, `rose-pine`, `tokyo-night`
- Light: `catppuccin-latte`, `nord-aurora`, `rose-pine-dawn`, `tokyo-night-day`

**Light themes** (those requiring React Flow `colorMode: 'light'`):
```typescript
const LIGHT_THEMES: ThemeId[] = ['catppuccin-latte', 'nord-aurora', 'rose-pine-dawn', 'tokyo-night-day']
```

**Theme class application:** The active `ThemeId` is set as a class on `<html>` by WorkspaceShell when `WorkspaceStore.theme` changes.

**CSS variable namespaces:**
- `--ctp-*` — Catppuccin palette tokens (base, mantle, text, subtext0, overlay0, surface0, lavender, red, etc.)
- `--edge-*` — Semantic graph edge colors (`--edge-active`, `--edge-blocked`, `--edge-cycle`, `--edge-incoming`, `--edge-selected`)
- `--node-*` — Semantic node colors (`--node-constant`, `--node-keyword`, `--node-selective`, `--node-disabled`)

In Tailwind classNames, use `bg-ctp-base`, `text-ctp-text`, `border-ctp-surface1`, etc. — Catppuccin tokens are registered as Tailwind theme extensions.

---

## Shared Utility Patterns

Prefer these shared utilities over reimplementing inline:

| Utility | Location | Use for |
|---------|----------|---------|
| `getTypeBadge(entry)` | `src/lib/entry-badge.ts` | Entry type badge label + color. Used in EntryListItem, EntryNode, EntryEditorModal. Never reimplement badge logic inline. |
| `modKey` | `src/lib/platform.ts` | Platform-aware modifier key label ('Cmd' on Mac, 'Ctrl' elsewhere). Use for tooltip labels on keyboard shortcuts. |
| `describeStateChange(prev, next)` | `src/lib/undo-describe.ts` | Human-readable undo/redo action labels for ToastStack. |
| `severityColor(severity)` | `src/lib/severity-color.ts` | Maps `FindingSeverity` → CSS color variable. |
| `cn(...classes)` | `src/lib/cn.ts` | Tailwind class merging. All dynamic className composition uses this. |
| `debounce(fn, ms)` | `src/lib/debounce.ts` | Debounce. Used by useAutosave, useWorkspacePersistence. |
| `estimateTokenCount(text)` | `src/lib/token-estimate.ts` | Quick ~4 chars/token approximation for display purposes. |
| `addKeywordMention / removeKeywordMention` | `src/lib/edge-edit.ts` | Modify entry content to add/remove keyword references (used for graph edge drag-create/delete). |

---

## Styling Conventions

### Tailwind + shadcn/ui

- Use Tailwind utility classes for layout, spacing, sizing, colors.
- Use shadcn/ui components for interactive elements (buttons, inputs, selects, dialogs, tabs).
- Do not write custom CSS unless Tailwind cannot express the style (rare).
- Do not use inline `style` props unless absolutely necessary (e.g., dynamic panel widths from drag-resize state).

### Dark Mode

Dark mode is the default. The theme class is set on `<html>` and toggled by WorkspaceStore. Do not rely on Tailwind's `dark:` variant — all color values come from `--ctp-*` CSS variables.

### Color Semantics

Define semantic color tokens in the Tailwind config, not raw color values in components.

```
health-error:    red       (error severity)
health-warning:  amber     (warning severity)
health-ok:       green     (no issues)

edge-active:     active recursion edge color
edge-blocked:    preventRecursion/excludeRecursion edge color
edge-cycle:      circular reference edge color

node-constant:   constant entry badge color
node-keyword:    keyword entry badge color
node-selective:  selective entry badge color
node-disabled:   disabled entry badge color
```

### Spacing

Use Tailwind's default spacing scale. Don't invent custom spacing values. If the default scale doesn't work, the design needs adjustment, not the scale.

---

## Testing Conventions

### What to Test

- **Services:** Unit test all pure functions. Test edge cases for keyword matching, graph computation, analysis rules, and the activation simulator.
- **Transform:** Test inflate/deflate round-trip fidelity. For each supported format, a test should parse → inflate → deflate → serialize and verify the output matches expectations.
- **Analysis rules:** Each rule gets its own test with entries crafted to trigger and not trigger the rule.
- **Simulator engine:** Test each step of the activation loop. Test known scenarios against expected activation results.
- **Components:** Test complex interactive components (entry editor validation, graph canvas interactions). Don't test trivial display components.

### Test Structure

```typescript
describe('buildGraph', () => {
  it('creates edges when content matches keywords', () => { ... });
  it('marks edges as blocked when target has preventRecursion', () => { ... });
  it('handles case-insensitive matching', () => { ... });
  it('handles regex keywords', () => { ... });
  it('returns empty graph for entries with no cross-references', () => { ... });
});
```

### Test Files

Co-located with source: `graph-service.ts` → `graph-service.test.ts` in the same directory.

### Test Framework

Vitest (ships with Vite). React Testing Library for component tests.

---

## Import Conventions

### Path Aliases

Use `@/` as the path alias for `src/`.

```typescript
import type { WorkingEntry } from '@/types';
import { buildGraph } from '@/services/graph-service';
import { EntryEditor } from '@/components/editor/EntryEditor';
```

### Import Order

1. React / library imports
2. Local types (import type)
3. Local services / utilities
4. Local components
5. Local styles

Separated by blank lines between groups.

### Type-Only Imports

Always use `import type` for type-only imports. This ensures types are erased at compile time and prevents circular dependency issues.

```typescript
import type { WorkingEntry, RecursionGraph } from '@/types';
import { buildGraph } from '@/services/graph-service';
```

---

## Git Conventions

### Commit Messages

Format: `<scope>: <description>`

Scopes: `file`, `transform`, `graph`, `analysis`, `simulator`, `llm`, `persist`, `ui`, `types`, `config`, `docs`, `test`, `theme`, `rules`

Examples:
- `graph: implement cycle detection`
- `analysis: add keyword overlap rule`
- `ui: entry editor form validation`
- `rules: add custom rule condition builder`
- `docs: sync TYPES.md to Phase 7 implementation`

### Branching

- `main`: stable, passes all tests
- Feature branches: `feature/<scope>-<description>`, e.g., `feature/graph-cycle-detection`

### Commit Frequency

Commit after each meaningful unit of work. A commit should represent a coherent change that could be understood in isolation.
