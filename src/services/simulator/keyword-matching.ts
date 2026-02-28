import type { WorkingEntry, KeywordMatch, KeywordMatchOptions } from '@/types'

function isRegexKey(key: string): boolean {
  return key.startsWith('/') && key.length > 2
}

function parseRegexKey(key: string): RegExp | null {
  const regexPattern = /^\/(.+)\/([gimsuy]*)$/
  const parts = regexPattern.exec(key)
  if (!parts) return null
  try {
    return new RegExp(parts[1], parts[2])
  } catch {
    return null
  }
}

export function doesEntryMatchText(
  entry: WorkingEntry,
  text: string,
  options: KeywordMatchOptions,
): KeywordMatch[] {
  const matches: KeywordMatch[] = []

  for (const key of entry.keys) {
    if (!key.trim()) continue

    if (isRegexKey(key)) {
      const regex = parseRegexKey(key)
      if (!regex) continue
      const flags = regex.flags.includes('g') ? regex.flags : regex.flags + 'g'
      const globalRegex = new RegExp(regex.source, flags)
      for (const m of text.matchAll(globalRegex)) {
        matches.push({ keyword: key, entryId: entry.id, position: m.index ?? 0, isRegex: true })
      }
    } else {
      const searchText = options.caseSensitive ? text : text.toLowerCase()
      const searchKey = options.caseSensitive ? key : key.toLowerCase()

      let startIdx = 0
      while (true) {
        const idx = searchText.indexOf(searchKey, startIdx)
        if (idx === -1) break

        if (options.matchWholeWords) {
          const before = idx > 0 ? searchText[idx - 1] : ''
          const after =
            idx + searchKey.length < searchText.length ? searchText[idx + searchKey.length] : ''
          const okBefore = !before || /\W/.test(before)
          const okAfter = !after || /\W/.test(after)
          if (okBefore && okAfter) {
            matches.push({ keyword: key, entryId: entry.id, position: idx, isRegex: false })
          }
        } else {
          matches.push({ keyword: key, entryId: entry.id, position: idx, isRegex: false })
        }

        startIdx = idx + 1
      }
    }
  }

  return matches
}

export function matchKeywordsInText(
  text: string,
  entries: WorkingEntry[],
  options: KeywordMatchOptions,
): KeywordMatch[] {
  return entries.flatMap((entry) => doesEntryMatchText(entry, text, options))
}
