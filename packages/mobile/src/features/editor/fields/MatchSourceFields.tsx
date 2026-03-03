import { View, Text, Switch, StyleSheet } from 'react-native'
import type { WorkingEntry } from '@lorewalker/core'

interface Props {
  entry: WorkingEntry
  isSillyTavern: boolean
  onChange: (patch: Partial<WorkingEntry>) => void
}

export function MatchSourceFields({ entry, isSillyTavern, onChange }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        <SwitchRow
          label="Persona Description"
          value={entry.matchPersonaDescription}
          onChange={(val) => onChange({ matchPersonaDescription: val })}
        />
        <SwitchRow
          label="Char Description"
          value={entry.matchCharacterDescription}
          onChange={(val) => onChange({ matchCharacterDescription: val })}
        />
        <SwitchRow
          label="Char Personality"
          value={entry.matchCharacterPersonality}
          onChange={(val) => onChange({ matchCharacterPersonality: val })}
        />
        <SwitchRow
          label="Scenario"
          value={entry.matchScenario}
          onChange={(val) => onChange({ matchScenario: val })}
        />
      </View>
      {isSillyTavern && (
        <View style={styles.grid}>
          <SwitchRow
            label="Depth Prompt"
            value={entry.matchCharacterDepthPrompt}
            onChange={(val) => onChange({ matchCharacterDepthPrompt: val })}
          />
          <SwitchRow
            label="Creator Notes"
            value={entry.matchCreatorNotes}
            onChange={(val) => onChange({ matchCreatorNotes: val })}
          />
        </View>
      )}
    </View>
  )
}

function SwitchRow({ label, value, onChange }: { label: string; value: boolean; onChange: (val: boolean) => void }) {
  return (
    <View style={switchStyles.row}>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#313244', true: '#89b4fa' }}
        thumbColor="#cdd6f4"
      />
      <Text style={switchStyles.label}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 8, flexDirection: 'column' },
  grid: { gap: 8, flexDirection: 'column' },
})

const switchStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { color: '#a6adc8', fontSize: 13, flex: 1 },
})
