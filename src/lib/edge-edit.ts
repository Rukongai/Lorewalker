/**
 * Removes the first occurrence of keyword from content.
 * Tries whole-word removal first, falls back to plain substring removal.
 */
export function removeKeywordMention(content: string, keyword: string): string {
  if (!keyword) return content

  // Attempt whole-word removal via regex
  try {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = new RegExp(`\\b${escaped}\\b`, 'i')
    const match = pattern.exec(content)
    if (match) {
      const before = content.slice(0, match.index).trimEnd()
      const after = content.slice(match.index + match[0].length).trimStart()
      return [before, after].filter(Boolean).join(' ')
    }
  } catch {
    // Regex failed for special chars — fall through to plain removal
  }

  // Plain substring removal (first occurrence)
  const idx = content.toLowerCase().indexOf(keyword.toLowerCase())
  if (idx === -1) return content
  return (content.slice(0, idx) + content.slice(idx + keyword.length)).replace(/\s{2,}/g, ' ').trim()
}

/**
 * Appends keyword to content if it is not already present (case-insensitive).
 */
export function addKeywordMention(content: string, keyword: string): string {
  if (!keyword) return content
  const lower = content.toLowerCase()
  if (lower.includes(keyword.toLowerCase())) return content
  return content ? `${content}\n${keyword}` : keyword
}
