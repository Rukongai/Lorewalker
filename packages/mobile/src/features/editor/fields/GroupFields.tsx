import { View, TextInput, Switch, Text, StyleSheet } from 'react-native'
import type { WorkingEntry } from '@lorewalker/core'
import { Field, inputStyle } from '../primitives'
import { Picker } from './Picker'
import { T } from '../../../theme/tokens'

interface Props {
  entry: WorkingEntry
  isSillyTavern: boolean
  onChange: (patch: Partial<WorkingEntry>) => void
}

const GROUP_SCORING_OPTIONS = [
  { label: 'Default', value: '' },
  { label: 'Yes', value: 'true' },
  { label: 'No', value: 'false' },
]

export function GroupFields({ entry, isSillyTavern, onChange }: Props) {
  return (
    <View style={styles.container}>
      <Field label="Inclusion Group">
        <TextInput
          style={inputStyle}
          value={entry.group}
          onChangeText={(v) => onChange({ group: v })}
          placeholder="Group name"
          placeholderTextColor={T.textSubtle}
        />
      </Field>
      <Field label="Group Weight">
        <TextInput
          style={inputStyle}
          value={String(entry.groupWeight)}
          onChangeText={(v) => onChange({ groupWeight: Number(v) || 0 })}
          keyboardType="numeric"
          selectTextOnFocus
        />
      </Field>
      {isSillyTavern && (
        <>
          <Field label="Use Group Scoring">
            <Picker
              value={entry.useGroupScoring === null ? '' : String(entry.useGroupScoring)}
              options={GROUP_SCORING_OPTIONS}
              onChange={(val) =>
                onChange({ useGroupScoring: val === '' ? null : val === 'true' })
              }
            />
          </Field>
          <View style={styles.switchRow}>
            <Switch
              value={entry.groupOverride}
              onValueChange={(val) => onChange({ groupOverride: val })}
              trackColor={{ false: T.overlay, true: T.selective }}
              thumbColor={T.textPrimary}
            />
            <Text style={styles.switchLabel}>Prioritize Inclusion</Text>
          </View>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 8, flexDirection: 'column' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  switchLabel: { color: T.textSecondary, fontSize: 13, flex: 1 },
})
