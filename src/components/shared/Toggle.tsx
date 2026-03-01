import { cn } from '@/lib/cn'

interface ToggleProps {
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
  'aria-label'?: string
}

export function Toggle({ checked, onChange, disabled, 'aria-label': ariaLabel }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ctp-accent',
        checked ? 'bg-ctp-accent' : 'bg-ctp-surface1',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-3 w-3 transform rounded-full bg-ctp-base shadow transition-transform duration-200',
          checked ? 'translate-x-3' : 'translate-x-0'
        )}
      />
    </button>
  )
}
