import { useState, useEffect, useMemo, memo } from 'react'
import { View, Text, FlatList, TextInput, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native'
import { useWorkspaceStore, documentStoreRegistry } from '@lorewalker/core'
import type { WorkingEntry } from '@lorewalker/core'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { EntriesStackParamList } from './AppNavigator'
import { T } from '../../theme/tokens'

type Props = NativeStackScreenProps<EntriesStackParamList, 'EntryList'>

const TYPE_BADGE: Record<string, string> = {
  constant: 'C',
  selective: 'S',
  keyword: 'K',
  disabled: 'D',
}

const BADGE_COLOR: Record<string, string> = {
  constant: T.constant,
  selective: T.selective,
  keyword: T.keyword,
  disabled: T.textMuted,
}

function getEntryType(entry: WorkingEntry): string {
  if (!entry.enabled) return 'disabled'
  if (entry.constant) return 'constant'
  if (entry.selectiveLogic !== undefined && entry.secondaryKeys && entry.secondaryKeys.length > 0) return 'selective'
  return 'keyword'
}

const EntryRow = memo(function EntryRow({
  entry,
  onPress,
}: {
  entry: WorkingEntry
  onPress: () => void
}) {
  const type = getEntryType(entry)
  const badgeColor = BADGE_COLOR[type] ?? T.textMuted
  const badgeLabel = TYPE_BADGE[type] ?? '?'

  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <View style={[styles.badge, { backgroundColor: badgeColor }]}>
        <Text style={styles.badgeText}>{badgeLabel}</Text>
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.entryName} numberOfLines={1}>
          {entry.name || '(unnamed)'}
        </Text>
        {entry.keys.length > 0 && (
          <Text style={styles.keywords} numberOfLines={1}>
            {entry.keys.slice(0, 4).join(', ')}
          </Text>
        )}
      </View>
      {!entry.enabled && <Text style={styles.disabledTag}>off</Text>}
    </TouchableOpacity>
  )
})

export function EntryListScreen({ navigation }: Props) {
  const activeTabId = useWorkspaceStore((s) => s.activeTabId)
  const [query, setQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  // Reactively subscribe to the document store so edits reflect in the list
  const [entries, setEntries] = useState<WorkingEntry[]>(() => {
    if (!activeTabId) return []
    const store = documentStoreRegistry.get(activeTabId)
    return store ? store.getState().entries : []
  })

  useEffect(() => {
    if (!activeTabId) {
      setEntries([])
      return
    }
    const store = documentStoreRegistry.get(activeTabId)
    if (!store) {
      setEntries([])
      return
    }
    // Sync immediately in case store changed since useState initializer ran
    setEntries(store.getState().entries)
    // Subscribe so list re-renders reactively when entries are mutated
    return store.subscribe((state) => setEntries(state.entries))
  }, [activeTabId])

  const filtered = useMemo(() => {
    if (!query.trim()) return entries
    const q = query.toLowerCase()
    return entries.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.keys.some((k) => k.toLowerCase().includes(q)),
    )
  }, [entries, query])

  function handleRefresh() {
    setRefreshing(true)
    if (activeTabId) {
      const store = documentStoreRegistry.get(activeTabId)
      if (store) setEntries(store.getState().entries)
    }
    setRefreshing(false)
  }

  if (!activeTabId) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No Lorebook Loaded</Text>
        <Text style={styles.emptySub}>Go to Settings to import a lorebook file.</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Search entries or keywords…"
        placeholderTextColor={T.textSubtle}
        value={query}
        onChangeText={setQuery}
      />
      <Text style={styles.count}>{filtered.length} entries</Text>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <EntryRow
            entry={item}
            onPress={() => navigation.push('Entry', { entryId: item.id, entryIndex: index })}
          />
        )}
        contentContainerStyle={styles.list}
        removeClippedSubviews={true}
        maxToRenderPerBatch={15}
        windowSize={10}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={T.accent}
          />
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  search: {
    margin: 12,
    backgroundColor: T.overlay,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: T.textPrimary,
    fontSize: 15,
  },
  count: { color: T.textMuted, fontSize: 12, marginHorizontal: 12, marginBottom: 4 },
  list: { paddingBottom: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: T.overlay,
    gap: 10,
  },
  badge: {
    width: 22,
    height: 22,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: T.black },
  rowContent: { flex: 1 },
  entryName: { color: T.textPrimary, fontSize: 15, fontWeight: '500' },
  keywords: { color: T.textMuted, fontSize: 12, marginTop: 2 },
  disabledTag: {
    color: T.textMuted,
    fontSize: 11,
    backgroundColor: T.overlay,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: T.bg, padding: 32 },
  emptyTitle: { color: T.textPrimary, fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptySub: { color: T.textMuted, fontSize: 14, textAlign: 'center' },
})
