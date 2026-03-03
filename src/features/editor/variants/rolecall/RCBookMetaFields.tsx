import type { BookMeta } from '@/types'
import { FieldGroup } from '@/features/editor/primitives'

interface RCBookMetaFieldsProps {
  bookMeta: BookMeta
  onChange: <K extends keyof BookMeta>(field: K, value: BookMeta[K]) => void
}

export function RCBookMetaFields({ bookMeta: _bookMeta, onChange: _onChange }: RCBookMetaFieldsProps) {
  return (
    <FieldGroup label="RoleCall" rcOnly>
      <p className="text-xs text-ctp-subtext0 italic">
        No RoleCall-specific global settings defined yet.
      </p>
    </FieldGroup>
  )
}
