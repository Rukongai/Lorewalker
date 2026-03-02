import { Tooltip } from '@/components/ui/Tooltip'
import { HelpCircle } from 'lucide-react'

export function HelpTooltip({ text }: { text: string }) {
  return (
    <Tooltip text={text}>
      <div className="inline-flex items-center ml-1 cursor-help">
        <HelpCircle size={12} className="text-ctp-overlay0 hover:text-ctp-subtext0" />
      </div>
    </Tooltip>
  )
}
