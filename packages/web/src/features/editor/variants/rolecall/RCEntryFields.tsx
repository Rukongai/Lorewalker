import type { WorkingEntry, RoleCallKeyword } from '@/types'
import { KeywordInput } from '@/components/editor/KeywordInput'
import { KeywordObjectsEditor } from '@/components/editor/KeywordObjectsEditor'
import { ConditionsEditor } from './ConditionsEditor'

interface RCEntryFieldsProps {
  entry: WorkingEntry
  onChange: (patch: Partial<WorkingEntry>) => void
}

export function RCEntryFields({ entry, onChange }: RCEntryFieldsProps) {
  const isConstant = entry.constant
  const isAdvanced = entry.triggerMode === 'advanced'

  function handleModeChange(constant: boolean) {
    onChange({ constant })
  }

  function handleTriggerModeChange(advanced: boolean) {
    if (advanced) {
      // Simple → Advanced: convert keys[] to keywordObjects[]
      const keywordObjects: RoleCallKeyword[] = entry.keys.map((k) => ({
        keyword: k,
        isRegex: false,
        probability: 100,
        frequency: 1,
      }))
      onChange({ triggerMode: 'advanced', keywordObjects })
    } else {
      // Advanced → Simple: extract keyword strings back to keys[]
      const keys = (entry.keywordObjects ?? []).map((kw) => kw.keyword).filter((k) => k.trim() !== '')
      onChange({ triggerMode: 'simple', keys, keywordObjects: [] })
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Mode toggle */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-ctp-subtext0 w-12 shrink-0">Mode</span>
        <div className="flex rounded overflow-hidden border border-ctp-surface2">
          <button
            onClick={() => handleModeChange(true)}
            className={[
              'px-3 py-1 text-[11px] transition-colors',
              isConstant
                ? 'bg-ctp-peach/20 text-ctp-peach border-r border-ctp-surface2'
                : 'bg-ctp-surface0 text-ctp-subtext1 hover:text-ctp-text border-r border-ctp-surface2',
            ].join(' ')}
          >
            Constant
          </button>
          <button
            onClick={() => handleModeChange(false)}
            className={[
              'px-3 py-1 text-[11px] transition-colors',
              !isConstant
                ? 'bg-ctp-blue/20 text-ctp-blue'
                : 'bg-ctp-surface0 text-ctp-subtext1 hover:text-ctp-text',
            ].join(' ')}
          >
            Selective
          </button>
        </div>
      </div>

      {/* Selective-only controls */}
      {!isConstant && (
        <>
          {/* Trigger mode toggle */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-ctp-subtext0 w-12 shrink-0">Trigger</span>
            <div className="flex rounded overflow-hidden border border-ctp-surface2">
              <button
                onClick={() => handleTriggerModeChange(false)}
                className={[
                  'px-3 py-1 text-[11px] transition-colors',
                  !isAdvanced
                    ? 'bg-ctp-blue/20 text-ctp-blue border-r border-ctp-surface2'
                    : 'bg-ctp-surface0 text-ctp-subtext1 hover:text-ctp-text border-r border-ctp-surface2',
                ].join(' ')}
              >
                Simple
              </button>
              <button
                onClick={() => handleTriggerModeChange(true)}
                className={[
                  'px-3 py-1 text-[11px] transition-colors',
                  isAdvanced
                    ? 'bg-ctp-blue/20 text-ctp-blue'
                    : 'bg-ctp-surface0 text-ctp-subtext1 hover:text-ctp-text',
                ].join(' ')}
              >
                Advanced
              </button>
            </div>
          </div>

          {/* Keywords */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] text-ctp-subtext0">Keywords</span>
            {isAdvanced ? (
              <KeywordObjectsEditor
                keywords={entry.keywordObjects ?? []}
                onChange={(keywordObjects) => onChange({ keywordObjects })}
              />
            ) : (
              <KeywordInput
                value={entry.keys}
                onChange={(keys) => onChange({ keys })}
                placeholder="Add keyword..."
              />
            )}
          </div>
        </>
      )}

      {/* Conditions (shown for selective mode) */}
      {!isConstant && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] text-ctp-subtext0">Conditions</span>
          <ConditionsEditor
            conditions={entry.triggerConditions ?? []}
            onChange={(triggerConditions) => onChange({ triggerConditions })}
          />
        </div>
      )}
    </div>
  )
}
