import { useEffect, useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'

interface SaveSnapshotDialogProps {
  open: boolean
  defaultName: string
  onSave: (name: string) => void
  onCancel: () => void
}

export function SaveSnapshotDialog({ open, defaultName, onSave, onCancel }: SaveSnapshotDialogProps) {
  const [name, setName] = useState(defaultName)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setName(defaultName)
      setTimeout(() => inputRef.current?.select(), 50)
    }
  }, [open, defaultName])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed) onSave(trimmed)
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!v) onCancel() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-ctp-mantle border border-ctp-surface1 rounded-lg shadow-xl p-5 space-y-4">
          <Dialog.Title className="text-sm font-semibold text-ctp-text">
            Save Snapshot
          </Dialog.Title>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Snapshot name"
              className="w-full px-3 py-1.5 text-xs rounded bg-ctp-surface0 border border-ctp-surface1 text-ctp-text placeholder-ctp-overlay0 focus:outline-none focus:border-ctp-accent"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="px-3 py-1.5 text-xs rounded text-ctp-subtext1 hover:text-ctp-text hover:bg-ctp-surface0 border border-ctp-surface1 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim()}
                className="px-3 py-1.5 text-xs rounded bg-ctp-accent text-ctp-base font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                Save
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
