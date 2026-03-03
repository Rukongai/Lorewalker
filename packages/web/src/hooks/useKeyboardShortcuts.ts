import { useEffect } from 'react'

interface KeyboardShortcutsOptions {
  activeTabId: string | null
  onSave: () => void
  onUndo: () => void
  onRedo: () => void
  onNewEntry: () => void
  onClearSelection: () => void
  onOpenFile: () => void
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false
  const tag = target.tagName.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
  if (target.isContentEditable) return true
  return false
}

export function useKeyboardShortcuts({
  activeTabId,
  onSave,
  onUndo,
  onRedo,
  onNewEntry,
  onClearSelection,
  onOpenFile,
}: KeyboardShortcutsOptions) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return

      const isMod = e.ctrlKey || e.metaKey

      if (isMod && !e.shiftKey && e.key === 'z') {
        e.preventDefault()
        onUndo()
        return
      }

      if (isMod && e.shiftKey && e.key === 'z') {
        e.preventDefault()
        onRedo()
        return
      }

      if (isMod && e.key === 's') {
        e.preventDefault()
        onSave()
        return
      }

      if (isMod && e.key === 'o') {
        e.preventDefault()
        onOpenFile()
        return
      }

      if (isMod && e.key === 'n' && activeTabId) {
        e.preventDefault()
        onNewEntry()
        return
      }

      if (e.key === 'Escape' && activeTabId) {
        onClearSelection()
        return
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activeTabId, onSave, onUndo, onRedo, onNewEntry, onClearSelection, onOpenFile])
}
