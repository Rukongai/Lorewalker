import { View, Text, Pressable, StyleSheet } from 'react-native'
import { T } from '../theme/tokens'

interface Tab<T extends string> {
  id: T
  label: string
}

interface PillTabBarProps<T extends string> {
  tabs: Tab<T>[]
  active: T
  onSelect: (id: T) => void
}

export function PillTabBar<T extends string>({ tabs, active, onSelect }: PillTabBarProps<T>) {
  return (
    <View style={styles.container}>
      {tabs.map((tab) => (
        <Pressable
          key={tab.id}
          onPress={() => onSelect(tab.id)}
          style={[styles.pill, active === tab.id && styles.pillActive]}
        >
          <Text style={[styles.label, active === tab.id && styles.labelActive]}>
            {tab.label.toUpperCase()}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
  },
  pill: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: T.overlay,
    alignItems: 'center',
  },
  pillActive: {
    backgroundColor: T.muted,
  },
  label: {
    color: T.textMuted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  labelActive: {
    color: T.textPrimary,
  },
})
