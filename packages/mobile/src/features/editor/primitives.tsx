import { useState } from 'react'
import { View, Text, Pressable, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { T } from '../../theme/tokens'

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true)
}

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
      <Pressable
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
          setOpen((o) => !o)
        }}
        style={styles.groupHeader}
      >
        <Feather
          name={open ? 'chevron-down' : 'chevron-right'}
          size={14}
          color={T.textMuted}
          style={styles.chevronIcon}
        />
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
  backgroundColor: T.overlay,
  borderWidth: 1,
  borderColor: T.muted,
  borderRadius: 6,
  paddingHorizontal: 10,
  paddingVertical: 8,
  fontSize: 13,
  color: T.textPrimary,
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
  chevronIcon: {
    width: 14,
  },
  groupLabel: {
    flex: 1,
    color: T.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  stBadge: {
    color: T.keyword,
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
    color: T.teal,
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
    color: T.textSecondary,
    fontSize: 11,
  },
})
