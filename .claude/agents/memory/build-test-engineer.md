# Build / Test Engineer Memory

## Commands

```bash
npm run build          # TypeScript compilation + Vite build
npm run test           # Vitest watch mode
npm run test -- --run  # Single run (no watch) — use this for CI-style checks
npm run lint           # ESLint
npx tsc --noEmit       # Type check only (fast, no emit)
```

## Test Suite State

- Phases 0–5 complete. 45+ tests passing as of Phase 2 baseline.
- Test files live alongside source in `src/` or in `src/__tests__/`
- Framework: Vitest + React Testing Library

## Known Quirks

- `npm run test` (watch mode) blocks — always use `-- --run` for automated checks
- TypeScript is strict: `verbatimModuleSyntax`, `erasableSyntaxOnly`, `noUnusedLocals`, `noUnusedParameters` — build fails on any violation

## Round-Trip Validation Pattern

For TransformService or FileService changes:
1. Import lorebook JSON fixture
2. `TransformService.inflate()` → `WorkingEntry[]`
3. `TransformService.deflate()` → CCv3
4. Serialize → JSON
5. Diff against original — flag data loss or field changes
