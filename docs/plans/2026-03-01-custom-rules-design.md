# Custom Rules Feature — Design Document

**Date:** 2026-03-01
**Status:** Approved
**Feature:** User-defined health-check rules

---

## Overview

Users need to define their own health-check rules beyond the built-in set. A rule author should be able to describe which entry conditions constitute a problem, set severity, and write a message template that reports the issue. Rules run automatically alongside the default rubric.

This is a workspace-level feature (like LLM providers) with per-document override capability.

---

## Architecture

### Storage Scope

- **Workspace-level custom rules**: stored in IndexedDB key `'custom-rules'` (persists across all documents)
- **Per-document overrides**: stored in `PersistedDocument.ruleOverrides` (can disable workspace/default rules, add doc-specific rules)

### Evaluation System

Structured condition tree serialized to JSON, executed by a pure `evaluateCondition()` function. No parser required — conditions are built via UI and stored as data.

### UI Entry Point

Third tab ("Rules") in `WorkspaceToolsModal`.

### Rule Editor

Separate `RuleEditorModal` at z-50, opened from the Rules tab.

### Rule Execution

`CustomRule` objects are adapted to the existing `Rule` interface via `customRuleToRule()`.

---

## Data Model

### Condition Types

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
  | 'matches';

type LogicOp = 'AND' | 'OR';

interface ConditionLeaf {
  type: 'leaf';
  left: string;        // variable path, e.g. "entry.keys.length"
  operator: ComparisonOp;
  right: string;       // literal value as string
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
```

### CustomRule

```typescript
interface CustomRule {
  id: string;
  name: string;
  description: string;
  category: RuleCategory;
  severity: FindingSeverity;
  enabled: boolean;
  requiresLLM: boolean;
  evaluation?: SerializedEvaluation;   // deterministic rules only
  message: string;                     // supports {{entry.name}}, etc.
  systemPrompt?: string;               // LLM rules only
  userPrompt?: string;                 // LLM rules only
  createdAt: string;
  updatedAt: string;
}
```

### DocumentRuleOverrides

```typescript
interface DocumentRuleOverrides {
  disabledRuleIds: string[];   // workspace/default rule IDs disabled for this doc
  customRules: CustomRule[];   // doc-specific custom rules
}
```

---

## Active Rubric Assembly

Computed in `useDerivedState` before running analysis:

```
active rules =
  defaultRubric.rules
    (minus workspace.disabledBuiltinRuleIds)
    (minus doc.ruleOverrides.disabledRuleIds)
  + workspaceStore.customRules
      (filter: enabled=true, not in doc.ruleOverrides.disabledRuleIds)
  + docStore.ruleOverrides.customRules
      (filter: enabled=true)
```

---

## Available Variables in Conditions

### Entry variables

| Variable | Type | Description |
|----------|------|-------------|
| `entry.name` | string | Entry display name |
| `entry.content` | string | Entry content text |
| `entry.tokenCount` | number | Estimated token count |
| `entry.constant` | boolean | Always-active flag |
| `entry.enabled` | boolean | Enabled flag |
| `entry.selective` | boolean | Selective activation flag |
| `entry.selectiveLogic` | number | Selective logic mode (0=any, 1=all, etc.) |
| `entry.keys.length` | number | Number of primary keys |
| `entry.secondaryKeys.length` | number | Number of secondary keys |
| `entry.position` | string/number | Insertion position |
| `entry.order` | number | Sort order |
| `entry.depth` | number | Scan depth |
| `entry.delay` | number | Delay turns (ST extension) |
| `entry.cooldown` | number | Cooldown turns (ST extension) |
| `entry.sticky` | number | Sticky turns (ST extension) |
| `entry.probability` | number | Activation probability (0–100) |
| `entry.preventRecursion` | boolean | Prevent recursion flag |
| `entry.excludeRecursion` | boolean | Exclude from recursion flag |
| `entry.ignoreBudget` | boolean | Ignore token budget flag |

### Book variables

| Variable | Type | Description |
|----------|------|-------------|
| `book.scanDepth` | number | Max scan depth |
| `book.tokenBudget` | number | Total token budget |
| `book.recursiveScan` | boolean | Recursive scan enabled |
| `book.caseSensitive` | boolean | Case-sensitive matching |
| `book.matchWholeWords` | boolean | Whole-word matching |

---

## Message Template Syntax

Message templates support `{{variable.path}}` interpolation, resolving the same variables as condition evaluation.

Examples:
- `"Entry '{{entry.name}}' has only {{entry.keys.length}} key(s)"`
- `"Content is {{entry.tokenCount}} tokens — near the budget limit"`

---

## Evaluation Engine

**File:** `src/services/analysis/evaluation-engine.ts`

Pure functions, no side effects:

- `resolveVariable(path: string, ctx: EvaluationContext): unknown` — dot-path resolver
- `evaluateLeaf(leaf: ConditionLeaf, ctx: EvaluationContext): boolean`
- `evaluateGroup(group: ConditionGroup, ctx: EvaluationContext): boolean`
- `evaluateCondition(eval: SerializedEvaluation, ctx: EvaluationContext): boolean`
- `interpolateMessage(template: string, ctx: EvaluationContext): string`

### EvaluationContext

```typescript
interface EvaluationContext {
  entry: WorkingEntry;
  book: BookMeta;
}
```

### Operator Semantics

| Operator | Types | Behavior |
|----------|-------|---------|
| `==` | any | Loose equality after coercion |
| `!=` | any | Not loose equal |
| `>` `<` `>=` `<=` | number | Numeric comparison |
| `includes` | string | `left.includes(right)` |
| `not-includes` | string | `!left.includes(right)` |
| `matches` | string | `new RegExp(right).test(left)` |

---

## Store Changes

### WorkspaceStore additions

```typescript
customRules: CustomRule[]          // default []
disabledBuiltinRuleIds: string[]   // default []

// Actions
addCustomRule(rule: CustomRule): void
updateCustomRule(id: string, updates: Partial<CustomRule>): void
deleteCustomRule(id: string): void
toggleBuiltinRule(ruleId: string, enabled: boolean): void
```

### DocumentStore additions

```typescript
ruleOverrides: DocumentRuleOverrides  // default { disabledRuleIds: [], customRules: [] }

// Actions
setDocumentRuleOverride(ruleId: string, disabled: boolean): void
addDocumentRule(rule: CustomRule): void
updateDocumentRule(id: string, updates: Partial<CustomRule>): void
removeDocumentRule(id: string): void
```

---

## Persistence

### IndexedDB keys

- `'custom-rules'` → `{ rules: CustomRule[]; disabledBuiltinIds: string[] }`
- Existing `'doc-<id>'` → extended with `ruleOverrides: DocumentRuleOverrides`

### PersistenceService additions

```typescript
saveCustomRules(rules: CustomRule[], disabledIds: string[]): Promise<void>
loadCustomRules(): Promise<{ rules: CustomRule[]; disabledBuiltinIds: string[] }>
```

---

## UI Components

### WorkspaceToolsModal (modified)

- Add `'rules'` tab type
- Add "Rules" button to tab bar
- Render `<RulesTabContent />` for rules tab

### RulesTabContent (new)

Two-pane layout:

**Left pane (rule list):**
- Filter buttons: All / Default / Custom
- Each rule row: enable/disable checkbox, name, severity badge
- "New Rule" button at top

**Right pane (rule detail):**
- Read-only view for default rules
- Edit + Delete buttons for custom rules
- Rule metadata display

### ConditionBuilder (new)

Visual editor for `SerializedEvaluation`:
- Root-level AND/OR connector
- Leaf condition rows: [variable picker] [operator select] [value input] [delete]
- Group blocks: [NOT toggle] [AND/OR] bordered block with leaf rows
- "Add Condition" / "Add Group" buttons
- Live expression preview (read-only text below builder)
- Variable picker: searchable dropdown, grouped by "Entry" / "Book"

### RuleTestingPane (new)

- Entry selector: "All entries" or specific entry from active document
- "Run Test" button
- Results table: entry name | pass/fail | resolved variable values
- Handles no-document-open state

### RuleEditorModal (new, z-50)

Three-panel layout: **Metadata** | **Conditions/Prompts** | **Test**

**Metadata panel:**
- Name input (required)
- Description textarea
- Category select
- Severity select
- requiresLLM toggle
- Enabled toggle

**Conditions panel (deterministic):**
- `<ConditionBuilder />`
- Message template input with interpolation hint

**Prompts panel (LLM):**
- System prompt textarea
- User prompt textarea
- Message template input

**Test panel:**
- `<RuleTestingPane />`

**Save validation:**
- Name required
- If deterministic: at least 1 condition required

**Escape key:** `capture: true` + `stopImmediatePropagation()` (same pattern as EntryEditorModal)

---

## Implementation Order

1. Write design doc (this file)
2. Extend types (`analysis.ts`, `persistence.ts`, `index.ts`)
3. Evaluation engine (`evaluation-engine.ts`, `custom-rule-adapter.ts`)
4. Store changes (`workspace-store.ts`, `document-store.ts`)
5. Persistence (`persistence-service.ts`, `useWorkspacePersistence.ts`)
6. Wire into analysis (`useDerivedState.ts`)
7. UI: `RulesTabContent.tsx`
8. UI: `ConditionBuilder.tsx`
9. UI: `RuleTestingPane.tsx`
10. UI: `RuleEditorModal.tsx`
11. Add Rules tab to `WorkspaceToolsModal.tsx`
12. Tests (`evaluation-engine.test.ts`, `custom-rule-adapter.test.ts`)

---

## Verification Checklist

1. Evaluation engine tests pass
2. Custom rule adapter tests pass
3. Manual: create a rule — Open WorkspaceToolsModal → Rules tab → New Rule → set name + category + severity + condition (`entry.keys.length < 2`) → Save
4. Manual: rule fires — Open a lorebook with an entry that has 1 key → verify a new finding appears in AnalysisPanel
5. Manual: enable/disable — Disable the rule → verify finding disappears
6. Manual: per-doc override — Disable a default rule with doc open → reload → still disabled for that doc but enabled for new doc
7. Manual: persistence — Create custom rule → refresh → still there
8. Manual: testing pane — Run test against all entries → verify pass/fail rows show correct variable values
9. Full test suite: all 142+ existing tests still pass
