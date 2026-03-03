import { View, TextInput, StyleSheet } from 'react-native'
import type { WorkingEntry } from '@lorewalker/core'
import { Field, inputStyle } from '../primitives'
import { Picker } from './Picker'

const TRISTATE_OPTIONS = [
  { label: 'Default (book setting)', value: '' },
  { label: 'Yes', value: 'true' },
  { label: 'No', value: 'false' },
]

interface Props {
  entry: WorkingEntry
  onChange: (patch: Partial<WorkingEntry>) => void
}

export function ScanOverrideFields({ entry, onChange }: Props) {
  return (
    <View style={styles.container}>
      <Field label="Scan Depth (empty = book default)">
        <TextInput
          style={inputStyle}
          value={entry.scanDepth === null ? '' : String(entry.scanDepth)}
          onChangeText={(v) => onChange({ scanDepth: v === '' ? null : Number(v) || 0 })}
          keyboardType="numeric"
          placeholder="Default"
          placeholderTextColor="#585b70"
          selectTextOnFocus
        />
      </Field>
      <Field label="Case Sensitive">
        <Picker
          value={entry.caseSensitive === null ? '' : String(entry.caseSensitive)}
          options={TRISTATE_OPTIONS}
          onChange={(val) =>
            onChange({ caseSensitive: val === '' ? null : val === 'true' })
          }
        />
      </Field>
      <Field label="Match Whole Words">
        <Picker
          value={entry.matchWholeWords === null ? '' : String(entry.matchWholeWords)}
          options={TRISTATE_OPTIONS}
          onChange={(val) =>
            onChange({ matchWholeWords: val === '' ? null : val === 'true' })
          }
        />
      </Field>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 8, flexDirection: 'column' },
})
