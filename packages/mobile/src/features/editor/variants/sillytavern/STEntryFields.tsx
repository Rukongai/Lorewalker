import { View, Text, Pressable, StyleSheet } from 'react-native'
import type { WorkingEntry } from '@lorewalker/core'
import { T } from '../../../../theme/tokens'

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
  label: { color: T.textSecondary, fontSize: 11 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: T.overlay,
    borderWidth: 1,
    borderColor: T.muted,
  },
  pillActive: {
    backgroundColor: '#3d2c5f',
    borderColor: T.accent,
  },
  pillText: { color: T.textMuted, fontSize: 12 },
  pillTextActive: { color: T.accent, fontWeight: '600' },
})
