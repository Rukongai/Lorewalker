import { useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'

export function FieldGroup({
  label,
  stOnly,
  rcOnly,
  defaultCollapsed = false,
  children,
}: {
  label: string
  stOnly?: boolean
  rcOnly?: boolean
  defaultCollapsed?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(!defaultCollapsed)
  return (
    <View style={styles.group}>
      <Pressable onPress={() => setOpen((o) => !o)} style={styles.groupHeader}>
        <Text style={styles.chevron}>{open ? '▾' : '▸'}</Text>
        <Text style={styles.groupLabel}>{label}</Text>
        {stOnly && <Text style={styles.stBadge}>ST</Text>}
        {rcOnly && <Text style={styles.rcBadge}>RC</Text>}
      </Pressable>
      {open && <View style={styles.groupBody}>{children}</View>}
    </View>
  )
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  )
}

export const inputStyle: object = {
  backgroundColor: '#313244',
  borderWidth: 1,
  borderColor: '#45475a',
  borderRadius: 6,
  paddingHorizontal: 10,
  paddingVertical: 8,
  fontSize: 13,
  color: '#cdd6f4',
}

const styles = StyleSheet.create({
  group: {
    marginBottom: 4,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  chevron: {
    color: '#6c7086',
    fontSize: 11,
    width: 12,
  },
  groupLabel: {
    flex: 1,
    color: '#a6adc8',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  stBadge: {
    color: '#f9e2af',
    fontSize: 9,
    fontWeight: '700',
    backgroundColor: 'rgba(249,226,175,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(249,226,175,0.3)',
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  rcBadge: {
    color: '#94e2d5',
    fontSize: 9,
    fontWeight: '700',
    backgroundColor: 'rgba(148,226,213,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(148,226,213,0.3)',
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  groupBody: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
    flexDirection: 'column',
  },
  field: {
    gap: 4,
    flexDirection: 'column',
  },
  fieldLabel: {
    color: '#a6adc8',
    fontSize: 11,
  },
})
