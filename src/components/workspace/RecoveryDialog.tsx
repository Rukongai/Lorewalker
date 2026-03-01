import * as Dialog from '@radix-ui/react-dialog'
import type { PersistedDocument } from '@/types'

interface RecoveryDialogProps {
  documents: PersistedDocument[]
  onRestore: (docs: PersistedDocument[]) => void
  onDismiss: () => void
}

function relativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`
  const diffDays = Math.floor(diffHr / 24)
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
}

export function RecoveryDialog({ documents, onRestore, onDismiss }: RecoveryDialogProps) {
  return (
    <Dialog.Root open>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-ctp-mantle border border-ctp-surface1 rounded-lg shadow-xl p-6 space-y-4">
          <Dialog.Title className="text-base font-semibold text-ctp-text">
            Recover unsaved sessions?
          </Dialog.Title>
          <Dialog.Description className="text-xs text-ctp-overlay1">
            {documents.length === 1
              ? 'An unsaved session was found from a previous browser session.'
              : `${documents.length} unsaved sessions were found from a previous browser session.`}
          </Dialog.Description>

          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {documents.map((doc) => (
              <li
                key={doc.tabId}
                className="flex items-center justify-between px-3 py-2 rounded bg-ctp-surface0 border border-ctp-surface1"
              >
                <span className="text-xs font-medium text-ctp-text truncate max-w-[60%]">
                  {doc.fileMeta.fileName}
                </span>
                <span className="text-xs text-ctp-overlay1 shrink-0 ml-2">
                  {relativeTime(doc.savedAt)}
                </span>
              </li>
            ))}
          </ul>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onDismiss}
              className="px-3 py-1.5 text-xs rounded text-ctp-subtext1 hover:text-ctp-text hover:bg-ctp-surface0 border border-ctp-surface1 transition-colors"
            >
              Discard
            </button>
            <button
              onClick={() => onRestore(documents)}
              className="px-3 py-1.5 text-xs rounded bg-ctp-accent text-ctp-base font-medium hover:opacity-90 transition-opacity"
            >
              Restore All
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
