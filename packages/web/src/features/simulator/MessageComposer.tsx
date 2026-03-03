import { Plus, Trash2 } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import type { SimMessage } from '@/types'

export interface MessageComposerProps {
  messages: SimMessage[]
  onChange: (messages: SimMessage[]) => void
}

const ROLES: SimMessage['role'][] = ['user', 'assistant', 'system']

const ROLE_COLORS: Record<SimMessage['role'], string> = {
  user: 'text-ctp-blue',
  assistant: 'text-ctp-green',
  system: 'text-ctp-yellow',
}

export function MessageComposer({ messages, onChange }: MessageComposerProps) {
  function addMessage() {
    onChange([...messages, { role: 'user', content: '' }])
  }

  function removeMessage(index: number) {
    onChange(messages.filter((_, i) => i !== index))
  }

  function updateRole(index: number, role: SimMessage['role']) {
    onChange(messages.map((m, i) => (i === index ? { ...m, role } : m)))
  }

  function updateContent(index: number, content: string) {
    onChange(messages.map((m, i) => (i === index ? { ...m, content } : m)))
  }

  return (
    <div className="flex flex-col gap-2">
      {messages.length === 0 && (
        <p className="text-xs text-ctp-overlay1 text-center py-2">No messages. Add one below.</p>
      )}

      {messages.map((msg, i) => (
        <div key={i} className="flex flex-col gap-1 bg-ctp-surface0 rounded p-2">
          <div className="flex items-center justify-between gap-2">
            <select
              value={msg.role}
              onChange={(e) => updateRole(i, e.target.value as SimMessage['role'])}
              className={`text-[10px] font-semibold uppercase bg-transparent border-none outline-none cursor-pointer ${ROLE_COLORS[msg.role]}`}
            >
              {ROLES.map((r) => (
                <option key={r} value={r} className="text-ctp-text bg-ctp-surface1">
                  {r}
                </option>
              ))}
            </select>
            <Tooltip text="Remove message">
              <button
                onClick={() => removeMessage(i)}
                className="p-0.5 rounded text-ctp-overlay1 hover:text-ctp-red transition-colors"
              >
                <Trash2 size={10} />
              </button>
            </Tooltip>
          </div>
          <textarea
            value={msg.content}
            onChange={(e) => updateContent(i, e.target.value)}
            placeholder="Message content…"
            rows={2}
            className="w-full text-xs bg-ctp-base border border-ctp-surface1 rounded px-2 py-1 text-ctp-text placeholder:text-ctp-overlay0 resize-y focus:outline-none focus:border-ctp-accent"
          />
        </div>
      ))}

      <button
        onClick={addMessage}
        className="flex items-center justify-center gap-1 py-1.5 text-xs text-ctp-overlay1 hover:text-ctp-subtext0 border border-dashed border-ctp-surface1 hover:border-ctp-surface2 rounded transition-colors"
      >
        <Plus size={10} />
        Add message
      </button>
    </div>
  )
}
