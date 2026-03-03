export interface KeywordStat {
  keyword: string
  isRegex: boolean
  isSecondary: boolean  // true if from entry.secondaryKeys, false if from entry.keys
  entryIds: string[]    // IDs of entries that carry this keyword
}
