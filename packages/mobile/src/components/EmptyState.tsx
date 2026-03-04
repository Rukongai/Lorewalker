import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { T } from '../theme/tokens'

interface EmptyStateProps {
  icon: React.ComponentProps<typeof Feather>['name']
  title: string
  subtitle?: string
  action?: { label: string; onPress: () => void }
}

export function EmptyState({ icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Feather name={icon} size={48} color={T.textSubtle} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {action && (
        <Pressable
          onPress={action.onPress}
          style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
        >
          <Text style={styles.actionText}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: T.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    ...T.shadows.card,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: T.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: T.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  actionBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: T.overlay,
    borderRadius: 20,
  },
  actionBtnPressed: { backgroundColor: T.muted },
  actionText: { color: T.accent, fontSize: 14, fontWeight: '600' },
})
