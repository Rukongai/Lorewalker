export interface ChangelogEntry {
  date: string   // 'YYYY-MM-DD'
  changes: string[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: '2026-03-03',
    changes: [
      'Analysis modal redesigned with three-column layout — categories, violations, details',
      'Keyword inventory tab added to tools modal',
      'Simulator breakdown view improved',
    ],
  },
  // older entries below as history builds up
]

/** ISO date string of the newest entry */
export const LATEST_CHANGELOG_DATE: string = CHANGELOG[0].date
