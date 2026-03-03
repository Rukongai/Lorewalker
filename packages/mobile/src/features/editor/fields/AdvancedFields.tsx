import { View, TextInput, StyleSheet } from 'react-native'
import type { WorkingEntry } from '@lorewalker/core'
import { Field, inputStyle } from '../primitives'

interface Props {
  entry: WorkingEntry
  onChange: (patch: Partial<WorkingEntry>) => void
}

export function AdvancedFields({ entry, onChange }: Props) {
  return (
    <View style={styles.container}>
      <Field label="Automation ID">
        <TextInput
          style={inputStyle}
          value={entry.automationId}
          onChangeText={(v) => onChange({ automationId: v })}
          placeholder="Automation ID"
          placeholderTextColor="#585b70"
        />
      </Field>
      <Field label="Display Index">
        <TextInput
          style={inputStyle}
          value={entry.displayIndex === null ? '' : String(entry.displayIndex)}
          onChangeText={(v) => onChange({ displayIndex: v === '' ? null : Number(v) || 0 })}
          keyboardType="numeric"
          placeholder="—"
          placeholderTextColor="#585b70"
          selectTextOnFocus
        />
      </Field>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 8, flexDirection: 'column' },
})
