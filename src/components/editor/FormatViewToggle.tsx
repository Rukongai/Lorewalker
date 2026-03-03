interface FormatViewToggleProps {
  view: 'native' | 'sillytavern'
  onChange: (view: 'native' | 'sillytavern') => void
}

export function FormatViewToggle({ view, onChange }: FormatViewToggleProps) {
  return (
    <div className="flex items-center gap-1 px-3 pt-2">
      <span className="text-[10px] text-ctp-overlay1 mr-1">View as:</span>
      <div className="flex rounded border border-ctp-surface1 overflow-hidden text-[10px]">
        <button
          onClick={() => onChange('native')}
          className={`px-2 py-0.5 transition-colors ${
            view === 'native'
              ? 'bg-ctp-green/30 text-ctp-green font-semibold'
              : 'bg-ctp-surface0 text-ctp-subtext0 hover:text-ctp-text hover:bg-ctp-surface1'
          }`}
        >
          RoleCall
        </button>
        <button
          onClick={() => onChange('sillytavern')}
          className={`px-2 py-0.5 transition-colors ${
            view === 'sillytavern'
              ? 'bg-ctp-peach/30 text-ctp-yellow font-semibold'
              : 'bg-ctp-surface0 text-ctp-subtext0 hover:text-ctp-text hover:bg-ctp-surface1'
          }`}
        >
          ST
        </button>
      </div>
    </div>
  )
}
