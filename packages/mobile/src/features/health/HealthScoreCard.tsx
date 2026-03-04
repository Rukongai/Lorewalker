import { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'
import type { HealthScore, RuleCategory } from '@lorewalker/core'
import { T } from '../../theme/tokens'
import { FontFamily } from '../../theme/typography'

const CATEGORIES: RuleCategory[] = ['structure', 'config', 'keywords', 'recursion', 'budget', 'content']

function scoreColor(score: number): string {
  if (score < 60) return T.error
  if (score < 80) return T.warning
  return T.success
}

interface AnimatedBarProps {
  score: number
  color: string
}

function AnimatedBar({ score, color }: AnimatedBarProps) {
  const animVal = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(animVal, {
      toValue: score / 100,
      duration: 600,
      useNativeDriver: false,
    }).start()
  }, [score, animVal])

  const width = animVal.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  })

  return (
    <View style={styles.barTrack}>
      <Animated.View style={[styles.barFill, { width, backgroundColor: color }]} />
    </View>
  )
}

interface HealthScoreCardProps {
  score: number
  summary?: string
  categories?: HealthScore['categories']
  size?: 'sm' | 'lg'
}

export function HealthScoreCard({ score, summary, categories, size = 'sm' }: HealthScoreCardProps) {
  const color = scoreColor(score)
  const scoreAnimVal = useRef(new Animated.Value(0)).current
  const displayScore = useRef(0)

  useEffect(() => {
    Animated.timing(scoreAnimVal, {
      toValue: score,
      duration: 600,
      useNativeDriver: false,
    }).start()

    const id = scoreAnimVal.addListener(({ value }) => {
      displayScore.current = Math.round(value)
    })
    return () => scoreAnimVal.removeListener(id)
  }, [score, scoreAnimVal])

  return (
    <View style={[styles.container, T.shadows.card]}>
      <View style={styles.row}>
        <Text style={[styles.score, { color, fontSize: size === 'lg' ? 40 : 28, fontFamily: FontFamily.mono }]}>
          {score}
        </Text>
        {summary && (
          <Text style={styles.summary} numberOfLines={2}>
            {summary}
          </Text>
        )}
      </View>

      {categories && (
        <View style={styles.categories}>
          {CATEGORIES.map((cat) => {
            const catScore = categories[cat]
            if (!catScore) return null
            const barColor = scoreColor(catScore.score)
            return (
              <View key={cat} style={styles.catRow}>
                <Text style={styles.catLabel}>{cat}</Text>
                <AnimatedBar score={catScore.score} color={barColor} />
                <Text style={[styles.catScore, { fontFamily: FontFamily.mono }]}>{catScore.score}</Text>
              </View>
            )
          })}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 8, backgroundColor: T.surface, borderRadius: 8, padding: 12 },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  score: { fontWeight: '700', fontVariant: ['tabular-nums'] },
  summary: { flex: 1, color: T.textSecondary, fontSize: 12, lineHeight: 16 },
  categories: { gap: 4 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  catLabel: { width: 64, fontSize: 10, color: T.textMuted, textTransform: 'capitalize' },
  barTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: T.muted, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 2 },
  catScore: { width: 24, fontSize: 10, color: T.textMuted, textAlign: 'right', fontVariant: ['tabular-nums'] },
})
