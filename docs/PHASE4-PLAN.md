# Lorewalker Phase 4 — Monorepo + Mobile App

## Goal

Extract shared business logic into `packages/core`, set up React Native + Expo mobile app, build mobile navigation shell and initial feature screens. The web app continues working exactly as-is throughout.

---

## Target Monorepo Structure

```
lorewalker/
├── packages/
│   ├── core/                          — shared business logic, no React DOM
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── types/                 — all shared types (moved from src/types/)
│   │   │   ├── services/              — all services (moved from src/services/)
│   │   │   ├── stores/                — Zustand stores (moved from src/stores/)
│   │   │   └── index.ts              — barrel export
│   │   └── __tests__/
│   │
│   ├── web/                           — Vite web app
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   ├── index.html
│   │   ├── src/
│   │   │   ├── features/              — web component implementations (current src/features/)
│   │   │   ├── layouts/
│   │   │   │   └── desktop/           — current src/layouts/desktop/
│   │   │   ├── hooks/                 — React DOM-specific hooks (useDerivedState, useAutosave, etc.)
│   │   │   ├── components/            — remaining shared web components (settings, ui, graph/)
│   │   │   ├── lib/                   — web-specific utilities
│   │   │   ├── styles/                — CSS, theme files
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   └── public/
│   │
│   └── mobile/                        — Expo React Native app
│       ├── package.json
│       ├── tsconfig.json
│       ├── app.json                   — Expo config
│       ├── src/
│       │   ├── features/              — React Native feature implementations
│       │   │   ├── health/
│       │   │   ├── simulator/
│       │   │   ├── keywords/
│       │   │   ├── editor/
│       │   │   └── rules/
│       │   ├── layouts/
│       │   │   └── mobile/
│       │   │       ├── AppNavigator.tsx    — bottom tab + stack navigation
│       │   │       ├── EntryScreen.tsx     — entry workspace (full screen, tabs)
│       │   │       ├── EntryListScreen.tsx — entry list with search/filter
│       │   │       ├── SettingsScreen.tsx  — BookMeta + provider config + app settings
│       │   │       └── ImportScreen.tsx    — file import (document picker)
│       │   ├── hooks/                 — React Native-specific hooks
│       │   ├── components/            — shared mobile UI primitives
│       │   └── styles/                — React Native styling
│       └── assets/
│
├── package.json                       — workspace root
├── tsconfig.base.json                — shared TypeScript config
└── docs/                              — architecture docs (unchanged)
```

---

## What Goes Where

### packages/core (no React DOM, no React Native)

Everything that has zero dependency on rendering:

**Move from current src/:**
- `types/` — all type definitions, interfaces, enums
- `services/` — all services (AnalysisService, SimulatorService, GraphService, TransformService, FileService, TokenCountService, CategorizeService, KeywordAnalysisService, LLMService)
- `stores/` — WorkspaceStore, DocumentStore (Zustand works in both web and RN)

**Important:** `useDerivedState.ts` does NOT move to core. It's a React hook with DOM-specific timing (debounce, layout effects). Each platform gets its own derived state hook that calls the same core services.

**Core's package.json:**
- Dependencies: zustand, zundo, elkjs, idb (IndexedDB — web-only, needs abstraction, see Storage section)
- No react-dom, no @xyflow/react, no React Native deps
- Exports: types, services, stores as named exports

### packages/web (Vite + React DOM)

Everything currently rendering in the browser:

- `features/` — all web feature module components (HealthView, SimulatorView, etc.)
- `layouts/desktop/` — WorkspaceShell, SidebarPanel, workspaces, GraphCanvas, etc.
- `hooks/` — useDerivedState, useAutosave, useKeyboardShortcuts, other DOM hooks
- `components/` — settings, UI primitives (Tooltip, Toggle, ErrorBoundary), graph components
- `lib/` — web utilities
- `styles/` — CSS, themes

### packages/mobile (Expo + React Native)

New code, built against core:

- `features/` — React Native implementations of feature modules
- `layouts/mobile/` — navigation, screens
- Mobile-specific hooks, components, styling

---

## Storage Abstraction

The web app uses IndexedDB (via `idb` library) for persistence. React Native can't use IndexedDB. Core needs a storage abstraction so both platforms can persist data.

```typescript
// packages/core/src/storage/storage-interface.ts
interface StorageAdapter {
  getDocument(id: string): Promise<SerializedDocument | null>;
  saveDocument(doc: SerializedDocument): Promise<void>;
  deleteDocument(id: string): Promise<void>;
  listDocuments(): Promise<DocumentMeta[]>;
  getWorkspace(): Promise<WorkspaceState | null>;
  saveWorkspace(state: WorkspaceState): Promise<void>;
  getPreferences(): Promise<UserPreferences | null>;
  savePreferences(prefs: UserPreferences): Promise<void>;
}
```

**Web implementation:** Wraps the existing `idb` calls. Drop-in replacement.

**Mobile implementation:** AsyncStorage or expo-sqlite. Same interface, different backend.

Core's stores and services call `StorageAdapter` methods. Each platform provides its implementation at app startup.

---

## Mobile App — Feature Scope

### Launch features (Phase 4):
- File import (document picker → TransformService)
- Entry list with search, filter, sort
- Entry editing (all fields, format variants)
- Health dashboard (lorebook + entry scope)
- Simulator (lorebook + entry scope)
- Keywords (lorebook + entry scope, read-only analytical)
- BookMeta editing (settings screen)
- Provider configuration (LLM settings)

### Not included in Phase 4:
- Graph visualization (desktop-only, explicitly excluded)
- Custom rules editor (ConditionBuilder is complex touch UI — defer)
- File export (defer — editing + viewing first)
- Insights module (not built yet on any platform)

---

## Mobile Navigation

```
Bottom Tabs:
├── Entries (EntryListScreen)
│   └── → Entry (EntryScreen — push on tap)
│       ├── Edit tab
│       ├── Health tab
│       └── Insights tab
├── Health (HealthView at lorebook scope)
├── Simulator (SimulatorView at lorebook scope)
├── Keywords (KeywordsView at lorebook scope)
└── Settings (SettingsScreen)
    ├── Book Meta
    ├── Provider Config
    └── Import File
```

Navigation uses React Navigation (@react-navigation/native + @react-navigation/bottom-tabs + @react-navigation/native-stack).

Entry list → Entry is a stack push (full screen). Back button returns to list. Within an entry, three tabs: **Edit** (all fields + keyword editing), **Health** (entry findings, connections, health score), **Insights** (keyword reach table, simulate-this-entry, future LLM analysis). Mobile includes Health in the entry screen because there's no sidebar visible alongside it (unlike desktop where the sidebar Health tab is always accessible).

---

## Execution Streams

### Stream A: Monorepo Setup + Core Extraction

Set up the monorepo workspace, move shared code to packages/core, rewire packages/web to import from core. **Web app must keep working throughout.**

1. Initialize workspace root (package.json with workspaces, tsconfig.base.json)
2. Create packages/core with package.json, tsconfig extending base
3. Move src/types/ → packages/core/src/types/ (update all imports in web)
4. Move src/services/ → packages/core/src/services/ (update all imports in web)
5. Move src/stores/ → packages/core/src/stores/ (update all imports in web)
6. Create StorageAdapter interface in core
7. Create web StorageAdapter implementation wrapping existing idb calls
8. Wire web app to use StorageAdapter
9. Create packages/web with its own package.json, vite.config, tsconfig
10. Move remaining src/ contents into packages/web/src/
11. Verify web app builds and all tests pass from the new structure

### Stream B: Mobile App Shell

**Depends on Stream A completing steps 1–5 minimum** (core package exists with types, services, stores).

1. Create packages/mobile with Expo setup (npx create-expo-app or manual)
2. Configure tsconfig to reference packages/core
3. Install React Navigation dependencies
4. Build AppNavigator with bottom tabs (placeholder screens)
5. Build EntryListScreen — list entries from a loaded document, search, filter, sort
6. Build ImportScreen — document picker, TransformService to load lorebook, store in DocumentStore
7. Create mobile StorageAdapter (AsyncStorage or expo-sqlite)
8. Wire store hydration on app launch
9. Verify: can import a lorebook file and see entries in the list

### Stream C: Mobile Feature Screens

**Depends on Stream B completing** (app shell works, can import + list entries).

1. Build EntryScreen with tab navigation (Edit, Health, Insights)
2. Build mobile EditorView — React Native form fields for all entry fields + keyword editing + format variants
3. Build mobile HealthView — lorebook and entry scope
4. Build mobile InsightsView — entry scope: keyword reach table + simulate-this-entry
5. Build mobile SimulatorView — lorebook scope only (entry-scope simulation is in Insights)
6. Build mobile KeywordsView — lorebook scope compact view (entry-scope reach is in Insights)
7. Build SettingsScreen — BookMeta editor, provider config
8. Verify: full edit → analyze → simulate workflow works on mobile

### Stream D: Mobile Polish

**Depends on Stream C completing** (all feature screens functional).

1. Theme system — port CSS variable themes to React Native StyleSheet equivalents
2. Touch interactions — swipe to navigate entries, pull to refresh
3. Performance — ensure large lorebooks (100+ entries) scroll smoothly (FlatList already virtualizes)
4. Offline handling — graceful behavior when LLM provider unreachable
5. App icons, splash screen, store listing metadata
6. Build for both platforms: `eas build --platform ios` and `eas build --platform android`

---

## Key Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Expo, not bare React Native | Managed workflow handles native build config. EAS Build for store submissions. Can eject later if needed. |
| 2 | StorageAdapter abstraction in core | Cleanest way to share stores between IndexedDB (web) and AsyncStorage/SQLite (mobile) without platform conditionals in business logic. |
| 3 | useDerivedState stays platform-specific | It's tightly coupled to rendering timing. Each platform needs its own version calling the same core services. |
| 4 | React Navigation for mobile | Industry standard for RN navigation. Bottom tabs + native stack matches the app structure perfectly. |
| 5 | No graph on mobile | React Flow is DOM-only. Graph visualization is a desktop power-user feature. Mobile is for editing + analysis on the go. |
| 6 | Defer custom rules editor | ConditionBuilder is a complex drag-and-drop tree editor. Building a good touch version is a separate project. Rules still apply (they're in core), you just can't edit custom rules on mobile initially. |
| 7 | Stream A is sequential, not parallel | Moving shared code to core while keeping web working requires careful import rewiring. Parallelizing this creates merge conflicts on every import path. |

---

## Risk: useDerivedState

This is the most complex hook and it's platform-specific. The web version uses:
- `useEffect` with 150ms debounce for analysis
- `void computeLayout(...)` for ELK (web-only — mobile has no graph)
- DOM-specific timing for store updates

The mobile version needs:
- Same debounced analysis trigger (useEffect works the same in RN)
- No layout computation (no graph)
- Same store update pattern

Approach: extract the analysis orchestration logic into a core utility function that both platform hooks call. The hook is platform-specific, the logic it calls is shared.

```typescript
// packages/core/src/analysis/run-derived-analysis.ts
export async function runDerivedAnalysis(
  entries: WorkingEntry[],
  bookMeta: BookMeta,
  rubric: AssembledRubric,
  graph: RecursionGraph,
  llmService?: LLMService
): Promise<{ findings: Finding[]; healthScore: HealthScore }> {
  // deterministic analysis + optional LLM analysis
  // pure function, no React, no DOM
}
```

Both useDerivedState (web) and useDerivedState (mobile) call this. Web additionally runs ELK layout. Mobile doesn't.
