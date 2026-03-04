import { useState } from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native'
import type { Finding, FindingSeverity, RuleCategory } from '@lorewalker/core'
import { T } from '../../theme/tokens'

const CATEGORIES: RuleCategory[] = ['structure', 'config', 'keywords', 'recursion', 'budget', 'content']
const SEVERITY_ORDER: Record<FindingSeverity, number> = { error: 0, warning: 1, suggestion: 2 }

function severityColor(severity: FindingSeverity): string {
  if (severity === 'error') return T.error
  if (severity === 'warning') return T.warning
  return T.info
}

function severitySymbol(severity: FindingSeverity): string {
  if (severity === 'error') return '●'
  if (severity === 'warning') return '▲'
  return '○'
}

interface FindingsListProps {
  findings: Finding[]
  onSelectEntry?: (entryId: string) => void
}

export function FindingsList({ findings, onSelectEntry }: FindingsListProps) {
  const [filter, setFilter] = useState<FindingSeverity | 'all'>('all')
  const [collapsed, setCollapsed] = useState<Set<RuleCategory>>(new Set())

  const sorted = [...findings].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
  const filtered = filter === 'all' ? sorted : sorted.filter((f) => f.severity === filter)

  const errorCount = sorted.filter((f) => f.severity === 'error').length
  const warnCount = sorted.filter((f) => f.severity === 'warning').length
  const hintCount = sorted.filter((f) => f.severity === 'suggestion').length

  const byCategory = new Map<RuleCategory, Finding[]>()
  for (const f of filtered) {
    if (!byCategory.has(f.category)) byCategory.set(f.category, [])
    byCategory.get(f.category)!.push(f)
  }

  function toggleCategory(cat: RuleCategory) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  return (
    <View style={styles.container}>
      {/* Severity filter chips */}
      <View style={styles.filterRow}>
        {(['all', 'error', 'warning', 'suggestion'] as const).map((f) => {
          const count = f === 'all' ? sorted.length : f === 'error' ? errorCount : f === 'warning' ? warnCount : hintCount
          const label = f === 'all' ? `All (${count})` : f === 'error' ? `Errors (${count})` : f === 'warning' ? `Warnings (${count})` : `Hints (${count})`
          return (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.chip, filter === f && styles.chipActive]}
            >
              <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>{label}</Text>
            </Pressable>
          )
        })}
      </View>

      {/* Findings */}
      <ScrollView>
        {filtered.length === 0 ? (
          <Text style={styles.empty}>
            {sorted.length === 0 ? 'No issues detected' : 'No findings match filter'}
          </Text>
        ) : (
          CATEGORIES.map((cat) => {
            const catFindings = byCategory.get(cat)
            if (!catFindings || catFindings.length === 0) return null
            const isCollapsed = collapsed.has(cat)
            return (
              <View key={cat}>
                <Pressable style={styles.catHeader} onPress={() => toggleCategory(cat)}>
                  <Text style={styles.catTitle}>{cat.toUpperCase()}</Text>
                  <Text style={styles.catCount}>{catFindings.length}</Text>
                </Pressable>
                {!isCollapsed && catFindings.map((f) => (
                  <Pressable
                    key={f.id}
                    style={styles.findingRow}
                    onPress={() => {
                      if (f.entryIds.length > 0 && onSelectEntry) onSelectEntry(f.entryIds[0])
                    }}
                  >
                    <Text style={[styles.severityIcon, { color: severityColor(f.severity) }]}>
                      {severitySymbol(f.severity)}
                    </Text>
                    <Text style={styles.findingMessage} numberOfLines={2}>{f.message}</Text>
                  </Pressable>
                ))}
              </View>
            )
          })
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: T.overlay },
  chip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: T.overlay },
  chipActive: { backgroundColor: T.accent },
  chipText: { fontSize: 11, color: T.textMuted },
  chipTextActive: { color: T.black, fontWeight: '600' },
  empty: { textAlign: 'center', color: T.textMuted, fontSize: 13, paddingVertical: 24 },
  catHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.overlay },
  catTitle: { flex: 1, fontSize: 10, fontWeight: '700', color: T.textSecondary, letterSpacing: 1 },
  catCount: { fontSize: 10, color: T.textMuted },
  findingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: T.bg },
  severityIcon: { fontSize: 10, marginTop: 2 },
  findingMessage: { flex: 1, fontSize: 12, color: T.textPrimary, lineHeight: 17 },
})
