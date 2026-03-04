import { View, Text, Pressable, Switch, StyleSheet } from 'react-native'
import type { WorkingEntry, SelectiveLogic } from '@lorewalker/core'
import { Field } from '../primitives'
import { KeywordEditor } from '../KeywordEditor'
import { T } from '../../../theme/tokens'

type InsertionStrategy = 'constant' | 'normal' | 'vectorized'

interface Props {
  entry: WorkingEntry
  onChange: (patch: Partial<WorkingEntry>) => void
}

export function ActivationFields({ entry, onChange }: Props) {
  const strategy: InsertionStrategy = entry.constant ? 'constant' : entry.vectorized ? 'vectorized' : 'normal'

  function handleStrategyChange(s: InsertionStrategy) {
    if (s === 'constant') onChange({ constant: true, vectorized: false })
    else if (s === 'vectorized') onChange({ constant: false, vectorized: true })
    else onChange({ constant: false, vectorized: false })
  }

  function handleSecondaryKeysChange(secondaryKeys: string[]) {
    const patch: Partial<WorkingEntry> = { secondaryKeys }
    if (secondaryKeys.length === 0) patch.selective = false
    onChange(patch)
  }

  const strategies: InsertionStrategy[] = ['constant', 'normal', 'vectorized']
  const strategyColors: Record<InsertionStrategy, string> = {
    constant: T.accent,
    normal: T.selective,
    vectorized: '#74c7ec',  // sky blue — unique, not in T
  }

  return (
    <View style={styles.container}>
      <Field label="Insertion Strategy">
        <View style={styles.segmentRow}>
          {strategies.map((s) => (
            <Pressable
              key={s}
              style={[
                styles.segmentBtn,
                strategy === s && { backgroundColor: strategyColors[s] + '33', borderColor: strategyColors[s] },
              ]}
              onPress={() => handleStrategyChange(s)}
            >
              <Text
                style={[
                  styles.segmentText,
                  strategy === s ? { color: strategyColors[s], fontWeight: '600' } : styles.segmentTextInactive,
                ]}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </Field>

      <View style={styles.switchRow}>
        <Switch
          value={entry.selective}
          onValueChange={(val) => onChange({ selective: val })}
          trackColor={{ false: T.overlay, true: T.selective }}
          thumbColor={T.textPrimary}
        />
        <Text style={styles.switchLabel}>Selective (requires secondary key match)</Text>
      </View>

      {entry.selective && (
        <>
          <Field label="Selective Logic">
            <View style={styles.pickerWrap}>
              {([
                [0, 'AND ANY (any secondary matches)'],
                [1, 'AND ALL (all must match)'],
                [2, 'NOT ANY (blocks if any secondary matches)'],
                [3, 'NOT ALL (blocks only if all match)'],
              ] as [SelectiveLogic, string][]).map(([val, label]) => (
                <Pressable
                  key={val}
                  style={[styles.pickerOption, entry.selectiveLogic === val && styles.pickerOptionActive]}
                  onPress={() => onChange({ selectiveLogic: val })}
                >
                  <Text style={[styles.pickerText, entry.selectiveLogic === val && styles.pickerTextActive]}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Field>
          <Field label="Secondary Keywords">
            <KeywordEditor
              value={entry.secondaryKeys}
              onChange={handleSecondaryKeysChange}
              placeholder="Add secondary keyword…"
              variant="secondary"
            />
          </Field>
        </>
      )}

      <View style={styles.switchRow}>
        <Switch
          value={entry.enabled}
          onValueChange={(val) => onChange({ enabled: val })}
          trackColor={{ false: T.overlay, true: T.success }}
          thumbColor={T.textPrimary}
        />
        <Text style={styles.switchLabel}>Enabled</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 8, flexDirection: 'column' },
  segmentRow: { flexDirection: 'row', borderWidth: 1, borderColor: T.muted, borderRadius: 6, overflow: 'hidden' },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: T.overlay,
    borderWidth: 0,
  },
  segmentText: { fontSize: 12 },
  segmentTextInactive: { color: T.textMuted },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  switchLabel: { color: T.textSecondary, fontSize: 13, flex: 1 },
  pickerWrap: { gap: 4, flexDirection: 'column' },
  pickerOption: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: T.overlay,
    borderWidth: 1,
    borderColor: T.muted,
  },
  pickerOptionActive: { backgroundColor: '#1e3a5f', borderColor: T.selective },
  pickerText: { color: T.textMuted, fontSize: 12 },
  pickerTextActive: { color: T.selective, fontWeight: '600' },
})
