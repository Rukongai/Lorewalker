import { View, Text, Switch, TextInput, StyleSheet } from 'react-native'
import type { WorkingEntry } from '@lorewalker/core'
import { inputStyle } from '../primitives'

interface Props {
  entry: WorkingEntry
  onChange: (patch: Partial<WorkingEntry>) => void
}

export function RecursionFields({ entry, onChange }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.switchRow}>
        <Switch
          value={entry.preventRecursion}
          onValueChange={(val) => onChange({ preventRecursion: val })}
          trackColor={{ false: '#313244', true: '#f38ba8' }}
          thumbColor="#cdd6f4"
        />
        <Text style={styles.switchLabel}>Prevent Further Recursion</Text>
      </View>
      <View style={styles.switchRow}>
        <Switch
          value={entry.excludeRecursion}
          onValueChange={(val) => onChange({ excludeRecursion: val })}
          trackColor={{ false: '#313244', true: '#f38ba8' }}
          thumbColor="#cdd6f4"
        />
        <Text style={styles.switchLabel}>Non-recursable</Text>
      </View>
      <View style={styles.delayRow}>
        <Switch
          value={entry.delayUntilRecursion > 0}
          onValueChange={(val) => onChange({ delayUntilRecursion: val ? 1 : 0 })}
          trackColor={{ false: '#313244', true: '#89b4fa' }}
          thumbColor="#cdd6f4"
        />
        <Text style={styles.switchLabel}>Delay Until Recursion</Text>
        {entry.delayUntilRecursion > 0 && (
          <TextInput
            style={[inputStyle, styles.delayInput]}
            value={String(entry.delayUntilRecursion)}
            onChangeText={(v) => onChange({ delayUntilRecursion: Math.max(1, Number(v) || 1) })}
            keyboardType="numeric"
            selectTextOnFocus
          />
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 8, flexDirection: 'column' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  switchLabel: { color: '#a6adc8', fontSize: 13, flex: 1 },
  delayRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  delayInput: { width: 64 },
})
