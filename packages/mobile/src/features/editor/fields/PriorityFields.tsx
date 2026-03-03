import { View, TextInput, StyleSheet } from 'react-native'
import type { WorkingEntry, EntryPosition, RoleCallPosition } from '@lorewalker/core'
import { Field, inputStyle } from '../primitives'
import { Picker } from './Picker'

const POSITION_OPTIONS: { label: string; value: EntryPosition }[] = [
  { label: '0 — Before Char Defs', value: 0 },
  { label: '1 — After Char Defs', value: 1 },
  { label: '2 — Before Examples', value: 2 },
  { label: '3 — After Examples', value: 3 },
  { label: '4 — @ Depth', value: 4 },
  { label: '5 — Top of AN', value: 5 },
  { label: '6 — Bottom of AN', value: 6 },
  { label: '7 — Outlet', value: 7 },
]

const RC_POSITION_OPTIONS: { label: string; value: RoleCallPosition }[] = [
  { label: 'World', value: 'world' },
  { label: 'Character', value: 'character' },
  { label: 'Scene', value: 'scene' },
  { label: '@ Depth', value: 'depth' },
]

const ROLE_OPTIONS = [
  { label: 'System', value: 0 },
  { label: 'User', value: 1 },
  { label: 'Assistant', value: 2 },
]

interface Props {
  entry: WorkingEntry
  isRoleCall: boolean
  onChange: (patch: Partial<WorkingEntry>) => void
}

export function PriorityFields({ entry, isRoleCall, onChange }: Props) {
  const showDepth = isRoleCall
    ? entry.positionRoleCall === 'depth'
    : entry.position === 4

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.half}>
          <Field label="Position">
            {isRoleCall ? (
              <Picker
                value={entry.positionRoleCall ?? 'depth'}
                options={RC_POSITION_OPTIONS}
                onChange={(val) => onChange({ positionRoleCall: val as RoleCallPosition })}
              />
            ) : (
              <Picker
                value={entry.position}
                options={POSITION_OPTIONS}
                onChange={(val) => onChange({ position: val as EntryPosition })}
              />
            )}
          </Field>
        </View>
        <View style={styles.half}>
          <Field label="Order">
            <TextInput
              style={inputStyle}
              value={String(entry.order)}
              onChangeText={(v) => onChange({ order: Number(v) || 0 })}
              keyboardType="numeric"
              selectTextOnFocus
            />
          </Field>
        </View>
      </View>

      {showDepth && (
        <View style={styles.row}>
          <View style={styles.half}>
            <Field label="Role">
              <Picker
                value={entry.role}
                options={ROLE_OPTIONS}
                onChange={(val) => onChange({ role: val as number })}
              />
            </Field>
          </View>
          <View style={styles.half}>
            <Field label="Context Depth">
              <TextInput
                style={inputStyle}
                value={String(entry.depth)}
                onChangeText={(v) => onChange({ depth: Number(v) || 0 })}
                keyboardType="numeric"
                selectTextOnFocus
              />
            </Field>
          </View>
        </View>
      )}

      {entry.position === 7 && !isRoleCall && (
        <Field label="Outlet Name">
          <TextInput
            style={inputStyle}
            value={entry.outletName}
            onChangeText={(v) => onChange({ outletName: v })}
            placeholder="Outlet name"
            placeholderTextColor="#585b70"
          />
        </Field>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 8, flexDirection: 'column' },
  row: { flexDirection: 'row', gap: 8 },
  half: { flex: 1 },
})
