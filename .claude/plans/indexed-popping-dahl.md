# Fix: Wrong position labels (2, 3, 5, 6) + makeDefaultEntry defaults

## Context

ST's `world_info_position` enum:
```
before:    0  — Before Char Defs (↑Char)
after:     1  — After Char Defs  (↓Char)
ANTop:     2  — Before Author's Note  (↑AT)
ANBottom:  3  — After Author's Note   (↓AT)
atDepth:   4  — @ Depth
EMTop:     5  — Before Example Messages (↑EM)
EMBottom:  6  — After Example Messages  (↓EM)
outlet:    7  — Outlet
```

Commit 8ec2446 fixed the CCv3 string mapping but introduced wrong labels for positions 2, 3, 5, 6 — it swapped Author's Note and Example Messages. Currently our labels say:
- 2 → "Before Example Messages" (WRONG — should be "Before Author's Note")
- 3 → "After Example Messages"  (WRONG — should be "After Author's Note")
- 5 → "Top of Author's Note"    (WRONG — should be "Before Example Messages")
- 6 → "Bottom of Author's Note" (WRONG — should be "After Example Messages")

The "@Depth" display for "Before Char Defs" entries is caused by **stale IndexedDB data** from the old wrong mapping (`'before_char'` → `4`). Those entries need re-import (code is now correct). But the label fix will prevent future confusion.

`makeDefaultEntry` in document-store.ts also still uses old defaults (`delay/cooldown/sticky: ?? 0`, `addMemo: ?? true`) that need updating to match the Fix 2/3 changes made today.

## Files to Modify

| File | Change |
|------|--------|
| `src/components/editor/EntryEditor.tsx` | Fix option labels for positions 2, 3, 5, 6 + update help text |
| `src/types/entry.ts` | Fix position comments for 2, 3, 5, 6 |
| `src/services/transform-service.ts` | Fix position comments in normalizePosition docblock |
| `src/stores/document-store.ts` | Fix makeDefaultEntry: delay/cooldown/sticky → null, addMemo → false |

## Changes

### EntryEditor.tsx — dropdown labels
```tsx
<option value={2}>2 — Before Author's Note</option>
<option value={3}>3 — After Author's Note</option>
<option value={4}>4 — @ Depth</option>
<option value={5}>5 — Before Example Messages</option>
<option value={6}>6 — After Example Messages</option>
```

### entry.ts — position comments
```ts
| 2   // Before Author's Note — injected at top of the Author's Note block
| 3   // After Author's Note — injected at bottom of the Author's Note block
| 4   // @ Depth — inserted at a specific chat depth (uses depth + role fields)
| 5   // Before Example Messages — injected as authored dialogue before examples
| 6   // After Example Messages — injected as authored dialogue after examples
```

### transform-service.ts — normalizePosition docblock comments
Same corrections as entry.ts.

### document-store.ts — makeDefaultEntry
```ts
delay: partial.delay ?? null,
cooldown: partial.cooldown ?? null,
sticky: partial.sticky ?? null,
addMemo: partial.addMemo ?? false,
```

## User Action Required
For existing entries already stored in IndexedDB with wrong positions (from old `before_char → 4` mapping): user must close and re-import their lorebook file to get correct positions. The import code is now correct.

## Verification
- `npx tsc --noEmit` — clean
- `npx vitest run` — all 66 project tests pass
- UI: dropdown shows "Before Author's Note" for position 2, "After Author's Note" for 3, "Before Example Messages" for 5, "After Example Messages" for 6
