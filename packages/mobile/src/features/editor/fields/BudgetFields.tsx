import { View, Text, Switch, StyleSheet } from 'react-native'
import type { WorkingEntry } from '@lorewalker/core'

interface Props {
  entry: WorkingEntry
  onChange: (patch: Partial<WorkingEntry>) => void
}

export function BudgetFields({ entry, onChange }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.tokenCount}>{entry.tokenCount} tokens</Text>
      <View style={styles.switchRow}>
        <Switch
          value={entry.ignoreBudget}
          onValueChange={(val) => onChange({ ignoreBudget: val })}
          trackColor={{ false: '#313244', true: '#f38ba8' }}
          thumbColor="#cdd6f4"
        />
        <Text style={styles.switchLabel}>Ignore Budget</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 8, flexDirection: 'column' },
  tokenCount: { color: '#6c7086', fontSize: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  switchLabel: { color: '#a6adc8', fontSize: 13, flex: 1 },
})
