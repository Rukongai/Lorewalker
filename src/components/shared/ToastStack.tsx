import { useEffect, useState } from 'react'
import { Undo2, Redo2 } from 'lucide-react'

export interface UndoToast {
  id: string
  message: string
  type: 'undo' | 'redo'
}

interface ToastItemProps {
  toast: UndoToast
}

function ToastItem({ toast }: ToastItemProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Next tick: trigger fade-in
    const t = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(t)
  }, [])

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-ctp-surface1 border border-ctp-surface2 text-ctp-text text-xs shadow-lg transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {toast.type === 'undo' ? (
        <Undo2 size={12} className="text-ctp-subtext1 shrink-0" />
      ) : (
        <Redo2 size={12} className="text-ctp-subtext1 shrink-0" />
      )}
      <span>{toast.message}</span>
    </div>
  )
}

interface ToastStackProps {
  toasts: UndoToast[]
}

export function ToastStack({ toasts }: ToastStackProps) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col-reverse gap-2 items-center pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  )
}
