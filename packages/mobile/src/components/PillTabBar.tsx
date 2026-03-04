import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { T } from '../theme/tokens'

interface Tab<T extends string> {
  id: T
  label: string
  icon?: string
}

interface PillTabBarProps<T extends string> {
  tabs: Tab<T>[]
  active: T
  onSelect: (id: T) => void
}

export function PillTabBar<T extends string>({ tabs, active, onSelect }: PillTabBarProps<T>) {
  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = active === tab.id
        return (
          <Pressable
            key={tab.id}
            onPress={() => onSelect(tab.id)}
            style={[styles.pill, isActive && styles.pillActive]}
          >
            <View style={styles.pillInner}>
              {tab.icon && (
                <Feather
                  name={tab.icon as any}
                  size={11}
                  color={isActive ? T.accent : T.textMuted}
                />
              )}
              <Text style={[styles.label, isActive && styles.labelActive]}>
                {tab.label.toUpperCase()}
              </Text>
            </View>
          </Pressable>
        )
      })}
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
  pillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    color: T.textMuted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  labelActive: {
    color: T.accent,
  },
})
