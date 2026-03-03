import type { HealthScore, RuleCategory } from '@/types'

const CATEGORIES: RuleCategory[] = ['structure', 'config', 'keywords', 'recursion', 'budget', 'content']

function scoreColor(score: number): string {
  if (score < 60) return 'text-ctp-red'
  if (score < 80) return 'text-ctp-yellow'
  return 'text-ctp-green'
}

function scoreBarColor(score: number): string {
  if (score < 60) return 'bg-ctp-red'
  if (score < 80) return 'bg-ctp-yellow'
  return 'bg-ctp-green'
}

interface HealthScoreCardProps {
  score: number
  summary?: string
  /** When provided, renders per-category progress bars */
  categories?: HealthScore['categories']
  /** Visual size variant */
  size?: 'sm' | 'lg'
}

export function HealthScoreCard({ score, summary, categories, size = 'sm' }: HealthScoreCardProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2">
        <span className={`font-bold tabular-nums ${size === 'lg' ? 'text-4xl' : 'text-2xl'} ${scoreColor(score)}`}>
          {score}
        </span>
        {summary && (
          <span className={`flex-1 leading-snug ${size === 'lg' ? 'text-sm text-ctp-subtext0' : 'text-xs text-ctp-overlay1'}`}>
            {summary}
          </span>
        )}
      </div>

      {categories && (
        <div className="space-y-1">
          {CATEGORIES.map((cat) => {
            const catScore = categories[cat]
            if (!catScore) return null
            return (
              <div key={cat} className="flex items-center gap-2">
                <span className="text-[10px] text-ctp-overlay1 w-16 shrink-0 capitalize">{cat}</span>
                <div className="flex-1 h-1 rounded bg-ctp-surface1 overflow-hidden">
                  <div
                    className={`h-full rounded transition-all ${scoreBarColor(catScore.score)}`}
                    style={{ width: `${catScore.score}%` }}
                  />
                </div>
                <span className="text-[10px] text-ctp-overlay1 w-6 text-right tabular-nums">{catScore.score}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
