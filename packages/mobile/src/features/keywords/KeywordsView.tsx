import { useState, useMemo } from 'react'
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
} from 'react-native'
import { T } from '../../theme/tokens'
import {
  useWorkspaceStore,
  documentStoreRegistry,
  buildKeywordInventory,
  simulateKeyword,
} from '@lorewalker/core'
import type { KeywordStat, ActivationResult } from '@lorewalker/core'

const OVERLAP_THRESHOLD = 3

function SkipReasonBadge({ reason }: { reason: string }) {
  const color =
    reason === 'budget-exhausted' ? T.error
    : reason === 'probability-failed' ? T.peach
    : reason === 'cooldown' ? T.warning
    : T.textMuted
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={styles.badgeDark}>{reason}</Text>
    </View>
  )
}

interface KeywordRowProps {
  stat: KeywordStat
  expanded: boolean
  onToggle: () => void
  entryMap: Map<string, { name: string }>
  onSimulate: (keyword: string) => void
  simResult: ActivationResult | null
  isSimulating: boolean
}

function KeywordRow({ stat, expanded, onToggle, entryMap, onSimulate, simResult, isSimulating }: KeywordRowProps) {
  const isOverlap = stat.entryIds.length >= OVERLAP_THRESHOLD

  return (
    <View style={styles.keywordCard}>
      <Pressable onPress={onToggle} style={styles.keywordHeader}>
        <View style={styles.keywordPill}>
          <Text style={styles.keywordText} numberOfLines={1}>
            {stat.keyword}
          </Text>
          {stat.isSecondary && (
            <View style={styles.secondaryBadge}>
              <Text style={styles.secondaryBadgeText}>2°</Text>
            </View>
          )}
          {stat.isRegex && (
            <View style={styles.regexBadge}>
              <Text style={styles.regexBadgeText}>RE</Text>
            </View>
          )}
        </View>
        <View style={styles.keywordMeta}>
          <Text style={styles.entryCount}>{stat.entryIds.length} entries</Text>
          {isOverlap && (
            <View style={styles.overlapBadge}>
              <Text style={styles.overlapBadgeText}>⚠ overlap</Text>
            </View>
          )}
          <Text style={styles.expandCaret}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </Pressable>

      {expanded && (
        <View style={styles.expandedContent}>
          <Text style={styles.subsectionLabel}>Used by</Text>
          {stat.entryIds.map((id) => (
            <Text key={id} style={styles.entryName} numberOfLines={1}>
              • {entryMap.get(id)?.name ?? id}
            </Text>
          ))}

          <Pressable
            onPress={() => onSimulate(stat.keyword)}
            style={({ pressed }) => [styles.simulateBtn, pressed && styles.simulateBtnPressed]}
          >
            <Text style={styles.simulateBtnText}>
              {isSimulating ? 'Simulating…' : 'Simulate'}
            </Text>
          </Pressable>

          {simResult !== null && (
            <View style={styles.simResults}>
              <Text style={styles.simResultCount}>
                {simResult.activatedEntries.length} activated · {simResult.totalTokens} tokens
              </Text>
              {simResult.activatedEntries.map((ae) => (
                <View key={ae.entryId} style={styles.simRow}>
                  <Text style={styles.simEntryName} numberOfLines={1}>
                    {entryMap.get(ae.entryId)?.name ?? ae.entryId}
                  </Text>
                  <Text style={styles.simTokens}>{ae.tokenCost}tk</Text>
                </View>
              ))}
              {simResult.skippedEntries.filter((s) => s.reason !== 'disabled').map((se) => (
                <View key={se.entryId} style={styles.simRow}>
                  <Text style={[styles.simEntryName, { color: T.textMuted }]} numberOfLines={1}>
                    {entryMap.get(se.entryId)?.name ?? se.entryId}
                  </Text>
                  <SkipReasonBadge reason={se.reason} />
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  )
}

export function LorebookKeywordsView() {
  const activeTabId = useWorkspaceStore((s) => s.activeTabId)
  const store = activeTabId ? documentStoreRegistry.get(activeTabId) : null
  const entries = store?.getState().entries ?? []
  const bookMeta = store?.getState().bookMeta

  const [search, setSearch] = useState('')
  const [expandedKeyword, setExpandedKeyword] = useState<string | null>(null)
  const [simResults, setSimResults] = useState<Map<string, ActivationResult>>(new Map())
  const [simulatingKeyword, setSimulatingKeyword] = useState<string | null>(null)

  const inventory = useMemo(() => buildKeywordInventory(entries), [entries])

  const entryMap = useMemo(
    () => new Map(entries.map((e) => [e.id, e])),
    [entries],
  )

  const filtered = useMemo(() => {
    if (!search.trim()) return inventory
    const q = search.toLowerCase()
    return inventory.filter((s) => s.keyword.toLowerCase().includes(q))
  }, [inventory, search])

  function handleToggle(key: string) {
    setExpandedKeyword((prev) => (prev === key ? null : key))
  }

  function handleSimulate(keyword: string) {
    if (!store || !bookMeta) return
    setSimulatingKeyword(keyword)
    try {
      const result = simulateKeyword(keyword, entries, bookMeta)
      setSimResults((prev) => new Map(prev).set(keyword, result))
    } finally {
      setSimulatingKeyword(null)
    }
  }

  if (!store) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No lorebook loaded</Text>
        <Text style={styles.emptySubtext}>Import a lorebook from Settings → Import</Text>
      </View>
    )
  }

  const rowKey = (stat: KeywordStat) => `${stat.keyword}:${stat.isSecondary ? '2' : '1'}`

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search keywords…"
          placeholderTextColor={T.textMuted}
          clearButtonMode="while-editing"
        />
      </View>
      <Text style={styles.countLabel}>
        {filtered.length} keyword{filtered.length !== 1 ? 's' : ''}
        {search ? ` matching "${search}"` : ''}
      </Text>
      <FlatList
        data={filtered}
        keyExtractor={rowKey}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const key = rowKey(item)
          return (
            <KeywordRow
              stat={item}
              expanded={expandedKeyword === key}
              onToggle={() => handleToggle(key)}
              entryMap={entryMap}
              onSimulate={handleSimulate}
              simResult={simResults.get(item.keyword) ?? null}
              isSimulating={simulatingKeyword === item.keyword}
            />
          )
        }}
        ListEmptyComponent={
          <Text style={styles.emptyState}>No keywords found.</Text>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: T.bg },
  emptyText: { color: T.textPrimary, fontSize: 16, marginBottom: 8 },
  emptySubtext: { color: T.textMuted, fontSize: 13 },
  searchRow: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.overlay,
  },
  searchInput: {
    backgroundColor: T.overlay,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: T.textPrimary,
    fontSize: 14,
  },
  countLabel: {
    color: T.textMuted,
    fontSize: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 24, gap: 6 },
  keywordCard: {
    backgroundColor: T.surface,
    borderRadius: 8,
    overflow: 'hidden',
  },
  keywordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  keywordPill: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  keywordText: { color: T.textPrimary, fontSize: 13, fontWeight: '500', flex: 1 },
  secondaryBadge: {
    backgroundColor: T.overlay,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  secondaryBadgeText: { color: T.textSecondary, fontSize: 10 },
  regexBadge: {
    backgroundColor: T.bg,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  regexBadgeText: { color: T.selective, fontSize: 10 },
  keywordMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  entryCount: { color: T.textMuted, fontSize: 12 },
  overlapBadge: {
    backgroundColor: 'rgba(249,226,175,0.13)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  overlapBadgeText: { color: T.warning, fontSize: 11 },
  expandCaret: { color: T.textMuted, fontSize: 11 },
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: T.overlay,
    padding: 12,
    gap: 6,
  },
  subsectionLabel: {
    color: T.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  entryName: { color: T.textSecondary, fontSize: 13 },
  simulateBtn: {
    alignSelf: 'flex-start',
    backgroundColor: T.overlay,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 6,
  },
  simulateBtnPressed: { backgroundColor: T.muted },
  simulateBtnText: { color: T.textPrimary, fontSize: 13 },
  simResults: { marginTop: 8, gap: 4 },
  simResultCount: { color: T.success, fontSize: 12, marginBottom: 2 },
  simRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    gap: 8,
  },
  simEntryName: { flex: 1, color: T.textPrimary, fontSize: 12 },
  simTokens: { color: T.textMuted, fontSize: 11 },
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10 },
  badgeDark: { color: T.badgeDark, fontSize: 10, fontWeight: '600' },
  emptyState: { color: T.textMuted, fontSize: 13, padding: 16, textAlign: 'center' },
})
