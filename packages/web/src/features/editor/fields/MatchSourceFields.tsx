import type { WorkingEntry } from '@/types'
import { HelpTooltip } from '@/components/ui/HelpTooltip'
import { Toggle } from '@/components/shared/Toggle'
import { FieldGroup } from '@/features/editor/primitives'

interface MatchSourceFieldsProps {
  entry: WorkingEntry
  isSillyTavern: boolean
  onChange: (patch: Partial<WorkingEntry>) => void
}

export function MatchSourceFields({ entry, isSillyTavern, onChange }: MatchSourceFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex items-center gap-2 text-xs text-ctp-subtext0">
          <Toggle checked={entry.matchPersonaDescription} onChange={(val) => onChange({ matchPersonaDescription: val })} />
          Persona Description
          <HelpTooltip text="Scan the user's persona description for trigger keywords." />
        </label>
        <label className="flex items-center gap-2 text-xs text-ctp-subtext0">
          <Toggle checked={entry.matchCharacterDescription} onChange={(val) => onChange({ matchCharacterDescription: val })} />
          Char Description
          <HelpTooltip text="Scan the character's description field for trigger keywords." />
        </label>
        <label className="flex items-center gap-2 text-xs text-ctp-subtext0">
          <Toggle checked={entry.matchCharacterPersonality} onChange={(val) => onChange({ matchCharacterPersonality: val })} />
          Char Personality
          <HelpTooltip text="Scan the character's personality field for trigger keywords." />
        </label>
        <label className="flex items-center gap-2 text-xs text-ctp-subtext0">
          <Toggle checked={entry.matchScenario} onChange={(val) => onChange({ matchScenario: val })} />
          Scenario
          <HelpTooltip text="Scan the scenario field for trigger keywords." />
        </label>
      </div>
      {isSillyTavern && (
        <FieldGroup label="Extended Sources" stOnly>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-2 text-xs text-ctp-subtext0">
              <Toggle checked={entry.matchCharacterDepthPrompt} onChange={(val) => onChange({ matchCharacterDepthPrompt: val })} />
              Depth Prompt
              <HelpTooltip text="Scan the character's depth prompt / author's note field for trigger keywords." />
            </label>
            <label className="flex items-center gap-2 text-xs text-ctp-subtext0">
              <Toggle checked={entry.matchCreatorNotes} onChange={(val) => onChange({ matchCreatorNotes: val })} />
              Creator Notes
              <HelpTooltip text="Scan the creator notes field for trigger keywords." />
            </label>
          </div>
        </FieldGroup>
      )}
    </>
  )
}
