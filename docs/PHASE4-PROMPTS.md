# Consolidation Phase 4 — Session Prompts

For use with plan mode → approve with auto-edits.

Phase 4 streams are mostly sequential. Stream A must complete before B starts. Stream B must complete before C starts. Stream D is polish after C.

---

## Stream A: Monorepo Setup + Core Extraction

Split into 5 short sessions to avoid context compaction. Run sequentially. Web app must build after each session.

### A1: Workspace Root

```
Read claude.md, then read docs/PHASE4-PLAN.md — Stream A overview.

Set up the monorepo workspace root only. Create root package.json with workspaces config, tsconfig.base.json with shared compiler options. Create packages/core/ with its package.json and tsconfig extending base. Create packages/web/ with its package.json and tsconfig extending base.

Don't move any code yet. Just the scaffolding. Verify the workspace resolves with npm install.
```

### A2: Extract Types to Core

```
Read claude.md, then read docs/PHASE4-PLAN.md — Stream A.

Move src/types/ into packages/core/src/types/. Create packages/core/src/index.ts barrel export. Update every import in the web app to reference @lorewalker/core (or the workspace package name). 

Only types. Don't move services or stores yet. Build must pass.
```

### A3: Extract Services to Core

```
Read claude.md, then read docs/PHASE4-PLAN.md — Stream A.

Move src/services/ into packages/core/src/services/. Update the core barrel export. Update every import in the web app.

Only services. Don't move stores yet. Build must pass.
```

### A4: Extract Stores + Storage Abstraction

```
Read claude.md, then read docs/PHASE4-PLAN.md — Stream A, especially the Storage Abstraction section.

Move src/stores/ into packages/core/src/stores/. Create the StorageAdapter interface in core. Create the web StorageAdapter implementation wrapping the existing idb calls. Wire the web app to use StorageAdapter.

Build must pass. All tests must pass.
```

### A5: Finalize Web Package

```
Read claude.md, then read docs/PHASE4-PLAN.md — Stream A final steps.

Move all remaining src/ contents (features/, layouts/, hooks/, components/, lib/, styles/, App.tsx, main.tsx) into packages/web/src/. Update vite.config, index.html, and any remaining import paths.

Build must pass. All tests must pass. The web app should work identically to before the monorepo migration.
```

## Stream B: Mobile App Shell

**Run after Stream A is complete.**

```
Read claude.md, then read docs/PHASE4-PLAN.md — focus on Stream B (Mobile App Shell).

Execute Stream B. Set up the Expo project, navigation shell, entry list, file import, and storage adapter.

Milestone: importing a lorebook file and seeing entries in a list on mobile.
```

## Stream C: Mobile Feature Screens

Split into focused sessions per feature. Run sequentially. Each builds on the previous.

### C1: Entry Editor

```
Read claude.md, then read docs/PHASE4-PLAN.md — Stream C. Also read docs/CONSOLIDATION-PLAN.md — Editor module spec and Sidebar UX Principle.

Build the mobile EntryScreen with tab navigation (Edit, Health, Insights) and the Edit tab. React Native form fields for all shared entry fields + keyword editing + format variants. Read the web EditorView and field group components to understand the structure, then build React Native equivalents.

Edit is the write tab — keyword editing lives here. Milestone: can edit an entry's fields on mobile.
```

### C2: Health

```
Read claude.md, then read docs/PHASE4-PLAN.md — Stream C. Also read docs/CONSOLIDATION-PLAN.md — Health module spec.

Build mobile HealthView for both lorebook scope (Health bottom tab) and entry scope (Health tab within EntryScreen). Read the web HealthView to understand both scope renderings.

Milestone: health score, findings list, and entry connections visible on mobile.
```

### C3: Insights

```
Read claude.md, then read docs/PHASE4-PLAN.md — Stream C. Also read docs/CONSOLIDATION-PLAN.md — Insights module spec.

Build mobile InsightsView for entry scope (Insights tab within EntryScreen). Two sections: keyword reach table (per-keyword reach % at depths 1/2/3/Max, computed from RecursionGraph outgoing edges) and simulate-this-entry (run simulation with entry content as prompt, show full results).

Read the web InsightsView if it exists, otherwise build from the spec. Milestone: can see keyword reach and run entry simulation on mobile.
```

### C4: Lorebook Simulator + Keywords + Settings

```
Read claude.md, then read docs/PHASE4-PLAN.md — Stream C. Also read docs/CONSOLIDATION-PLAN.md — Simulator and Keywords module specs.

Build mobile SimulatorView for lorebook scope only (bottom tab). Build mobile KeywordsView for lorebook scope only (bottom tab, compact view). Build SettingsScreen: BookMeta editor and provider configuration.

Entry-scope simulation and keyword reach are handled by Insights in the entry screen — these modules are lorebook-scope only on mobile.

Milestone: full edit → analyze → simulate → keywords workflow on mobile.
```

## Stream D: Mobile Polish

**Run after Stream C is complete.**

```
Read claude.md, then read docs/PHASE4-PLAN.md — focus on Stream D (Mobile Polish).

Execute Stream D. Theme system, touch interactions, performance with large lorebooks, offline handling, app icons and splash screen.
```

---

## After All Streams Complete

```
Read docs/PHASE4-PLAN.md and docs/CONSOLIDATION-PLAN.md.

Verify:
1. packages/core exists with types, services, stores — no React DOM dependencies
2. packages/web builds and all tests pass
3. packages/mobile builds for both iOS and Android
4. Web app behavior is unchanged from before Phase 4
5. Mobile app can import a lorebook, list entries, edit entries, view health, view insights (keyword reach + entry simulation), run lorebook-scope simulator, view keywords
6. StorageAdapter interface is in core with web and mobile implementations
7. No circular dependencies between packages

Report issues without fixing them.
```
