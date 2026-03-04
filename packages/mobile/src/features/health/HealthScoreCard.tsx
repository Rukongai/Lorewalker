import { View, Text, StyleSheet } from 'react-native'
import type { HealthScore, RuleCategory } from '@lorewalker/core'
import { T } from '../../theme/tokens'

const CATEGORIES: RuleCategory[] = ['structure', 'config', 'keywords', 'recursion', 'budget', 'content']

function scoreColor(score: number): string {
  if (score < 60) return T.error
  if (score < 80) return T.warning
  return T.success
}

interface HealthScoreCardProps {
  score: number
  summary?: string
  categories?: HealthScore['categories']
  size?: 'sm' | 'lg'
}

export function HealthScoreCard({ score, summary, categories, size = 'sm' }: HealthScoreCardProps) {
  const color = scoreColor(score)
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={[styles.score, { color, fontSize: size === 'lg' ? 40 : 28 }]}>
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
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${catScore.score}%`, backgroundColor: barColor }]} />
                </View>
                <Text style={styles.catScore}>{catScore.score}</Text>
              </View>
            )
          })}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 8 },
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
