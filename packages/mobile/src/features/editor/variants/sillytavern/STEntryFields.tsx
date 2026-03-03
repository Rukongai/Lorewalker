import { View, Text, Pressable, StyleSheet } from 'react-native'
import type { WorkingEntry } from '@lorewalker/core'

const TRIGGER_OPTIONS = ['Normal', 'Continue', 'Impersonate', 'Swipe', 'Regenerate', 'Quiet'] as const

interface Props {
  entry: WorkingEntry
  onChange: (patch: Partial<WorkingEntry>) => void
}

export function STEntryFields({ entry, onChange }: Props) {
  function handleToggle(trigger: string) {
    const next = entry.triggers.includes(trigger)
      ? entry.triggers.filter((t) => t !== trigger)
      : [...entry.triggers, trigger]
    onChange({ triggers: next })
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Generation Types</Text>
      <View style={styles.pillRow}>
        {TRIGGER_OPTIONS.map((trigger) => {
          const active = entry.triggers.includes(trigger)
          return (
            <Pressable
              key={trigger}
              onPress={() => handleToggle(trigger)}
              style={[styles.pill, active && styles.pillActive]}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>{trigger}</Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 8, flexDirection: 'column' },
  label: { color: '#a6adc8', fontSize: 11 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#313244',
    borderWidth: 1,
    borderColor: '#45475a',
  },
  pillActive: {
    backgroundColor: '#3d2c5f',
    borderColor: '#cba6f7',
  },
  pillText: { color: '#6c7086', fontSize: 12 },
  pillTextActive: { color: '#cba6f7', fontWeight: '600' },
})
