import * as Dialog from '@radix-ui/react-dialog'
import { CHANGELOG } from '@/changelog'

interface WhatsNewDialogProps {
  open: boolean
  lastSeenDate: string | null
  onClose: () => void
}

export function WhatsNewDialog({ open, lastSeenDate, onClose }: WhatsNewDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-ctp-mantle border border-ctp-surface1 rounded-lg shadow-xl flex flex-col max-h-[80vh]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-ctp-surface0 shrink-0">
            <Dialog.Title className="text-sm font-semibold text-ctp-text">
              What's New
            </Dialog.Title>
            <button
              onClick={onClose}
              className="p-1 rounded text-ctp-overlay1 hover:text-ctp-text hover:bg-ctp-surface0 transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="overflow-y-auto flex-1 px-5 py-4 space-y-6">
            {CHANGELOG.map((entry) => {
              const isNew = lastSeenDate === null || entry.date > lastSeenDate
              return (
                <div
                  key={entry.date}
                  className={`rounded-md p-3 space-y-2 ${isNew ? 'bg-ctp-surface0' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-ctp-subtext1">{entry.date}</span>
                    {isNew && (
                      <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-ctp-peach/20 text-ctp-peach border border-ctp-peach/30">
                        New
                      </span>
                    )}
                  </div>
                  <ul className="space-y-1 pl-3">
                    {entry.changes.map((change, i) => (
                      <li key={i} className="text-xs text-ctp-text list-disc list-inside">
                        {change}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>

          <div className="px-5 py-3 border-t border-ctp-surface0 shrink-0 flex justify-end">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs rounded bg-ctp-accent text-ctp-base font-medium hover:opacity-90 transition-opacity"
            >
              Got it
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
