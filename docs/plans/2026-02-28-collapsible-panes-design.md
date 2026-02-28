# Collapsible Panels Design

**Date:** 2026-02-28
**Scope:** WorkspaceShell UI — left (entry list) and right (editor) panel collapse/expand

---

## Context

The left and right panels currently support drag-to-resize but cannot be hidden. When working primarily in the graph or on a small screen, the side panels consume space that the user may not need. Adding collapse/expand functionality lets users maximize the graph canvas or editor focus area.

---

## Design

### Behavior

- Each panel can be independently collapsed to a 28px vertical strip.
- Clicking the strip expands the panel back to its last saved width.
- Collapse and expand animate with a 200ms ease-in-out width transition.
- The transition is disabled during drag-resize (so dragging stays snappy).
- The drag-resize divider is hidden when a panel is collapsed.

### Chevron Placement

| Panel | When expanded | When collapsed (strip) |
|-------|---------------|------------------------|
| Left | `ChevronLeft` button in header (right side, after Settings icon) | `ChevronRight` centered in strip |
| Right | `ChevronRight` button in header (left side, before title) | `ChevronLeft` centered in strip |

Chevron direction indicates which way the panel will move.

### Strip Appearance

- Width: 28px
- Full height of the panel area
- Background: `bg-gray-950` (matches panel)
- Border retained (`border-r` for left, `border-l` for right)
- Chevron button: `flex-1 flex items-center justify-center`, `text-gray-500 hover:text-gray-300 hover:bg-gray-900 transition-colors`

---

## Implementation

### File Modified

`src/components/workspace/WorkspaceShell.tsx` — only file changed.

### New Imports

Add `ChevronLeft`, `ChevronRight` to the existing `lucide-react` import.

### New State

```typescript
const COLLAPSED_WIDTH = 28
const [leftCollapsed, setLeftCollapsed] = useState(false)
const [rightCollapsed, setRightCollapsed] = useState(false)
const [isResizing, setIsResizing] = useState(false)
```

### Modified: `startDrag`

- Add `setIsResizing(true)` before attaching listeners.
- Add `setIsResizing(false)` in the `onMouseUp` cleanup.
- Guard: if the target panel is collapsed, return early without starting drag.

### Modified: Left `<aside>`

```tsx
<aside
  className="shrink-0 border-r border-gray-800 bg-gray-950 flex flex-col overflow-hidden"
  style={{
    width: leftCollapsed ? COLLAPSED_WIDTH : leftWidth,
    transition: isResizing ? 'none' : 'width 200ms ease-in-out',
  }}
>
  {leftCollapsed ? (
    <button
      className="flex-1 flex items-center justify-center text-gray-500 hover:text-gray-300 hover:bg-gray-900 transition-colors w-full"
      onClick={() => setLeftCollapsed(false)}
      title="Expand entries panel"
    >
      <ChevronRight size={16} />
    </button>
  ) : (
    <>
      <div className="p-3 border-b border-gray-800 shrink-0 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Entries</span>
        <div className="flex items-center gap-1">
          {activeTabId && (
            <button onClick={clearSelection} title="Book Settings" ...>
              <Settings size={14} />
            </button>
          )}
          <button
            onClick={() => setLeftCollapsed(true)}
            title="Collapse panel"
            className="p-1 rounded text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
        </div>
      </div>
      <EntryList />
    </>
  )}
</aside>
```

### Modified: Left drag divider

Wrap with `{!leftCollapsed && <div ... />}`.

### Modified: Right `<aside>`

Mirror of left: collapsed → 28px strip with `ChevronLeft` centered; expanded → normal content with `ChevronRight` collapse button in the header.

### Modified: Right drag divider

Wrap with `{!rightCollapsed && <div ... />}`.

---

## Conventions Notes

- Inline `style` props are acceptable for dynamic layout values (panel widths). ✓
- `isResizing` boolean disables transition during drag — same pattern as the existing width state. ✓
- Lucide icons already used throughout — `ChevronLeft` / `ChevronRight` are standard lucide exports. ✓
- No new files needed. WorkspaceShell will grow by ~35-40 lines, staying under the 200-line soft limit for refactoring consideration (currently 265 lines, a modest increase).

---

## Verification

1. `npm run dev` — open app, verify both panels collapse/expand with animation.
2. Verify drag-resize still works on expanded panels; no animation lag during drag.
3. Verify collapsed state doesn't interfere with graph canvas layout (graph fills available space).
4. Verify the dividers are hidden when panels are collapsed.
5. `npm run test` — no existing tests should break (WorkspaceShell has no unit tests; graph and transform service tests are unaffected).
