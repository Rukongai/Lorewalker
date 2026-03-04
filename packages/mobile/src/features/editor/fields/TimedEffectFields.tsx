import { View, TextInput, Switch, Text, StyleSheet } from 'react-native'
import type { WorkingEntry } from '@lorewalker/core'
import { Field, inputStyle } from '../primitives'
import { T } from '../../../theme/tokens'

interface Props {
  entry: WorkingEntry
  isSillyTavern: boolean
  onChange: (patch: Partial<WorkingEntry>) => void
}

export function TimedEffectFields({ entry, isSillyTavern, onChange }: Props) {
  function handleProbabilityChange(value: number) {
    onChange({ probability: value, useProbability: value < 100 })
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.half}>
          <Field label="Trigger %">
            <TextInput
              style={inputStyle}
              value={String(entry.probability)}
              onChangeText={(v) => handleProbabilityChange(Math.min(100, Math.max(1, Number(v) || 1)))}
              keyboardType="numeric"
              selectTextOnFocus
            />
          </Field>
        </View>
        <View style={styles.half}>
          <Field label="Delay">
            <TextInput
              style={inputStyle}
              value={entry.delay === null ? '' : String(entry.delay)}
              onChangeText={(v) => onChange({ delay: v === '' ? null : Number(v) || 0 })}
              keyboardType="numeric"
              placeholder="Global default"
              placeholderTextColor={T.textSubtle}
              selectTextOnFocus
            />
          </Field>
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.half}>
          <Field label="Cooldown">
            <TextInput
              style={inputStyle}
              value={entry.cooldown === null ? '' : String(entry.cooldown)}
              onChangeText={(v) => onChange({ cooldown: v === '' ? null : Number(v) || 0 })}
              keyboardType="numeric"
              placeholder="Global default"
              placeholderTextColor={T.textSubtle}
              selectTextOnFocus
            />
          </Field>
        </View>
        <View style={styles.half}>
          <Field label="Sticky">
            <TextInput
              style={inputStyle}
              value={entry.sticky === null ? '' : String(entry.sticky)}
              onChangeText={(v) => onChange({ sticky: v === '' ? null : Number(v) || 0 })}
              keyboardType="numeric"
              placeholder="Global default"
              placeholderTextColor={T.textSubtle}
              selectTextOnFocus
            />
          </Field>
        </View>
      </View>
      {isSillyTavern && (
        <View style={styles.switchRow}>
          <Switch
            value={entry.useProbability}
            onValueChange={(val) => onChange({ useProbability: val })}
            trackColor={{ false: T.overlay, true: T.selective }}
            thumbColor={T.textPrimary}
          />
          <Text style={styles.switchLabel}>Enable Trigger %</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 8, flexDirection: 'column' },
  row: { flexDirection: 'row', gap: 8 },
  half: { flex: 1 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  switchLabel: { color: T.textSecondary, fontSize: 13, flex: 1 },
})
