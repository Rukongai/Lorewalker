import { useState, useMemo } from 'react'
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { useWorkspaceStore, documentStoreRegistry } from '@lorewalker/core'
import type { WorkingEntry } from '@lorewalker/core'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { EntriesStackParamList } from './AppNavigator'

type Props = NativeStackScreenProps<EntriesStackParamList, 'EntryList'>

const TYPE_BADGE: Record<string, string> = {
  constant: 'C',
  selective: 'S',
  keyword: 'K',
  disabled: 'D',
}

const BADGE_COLOR: Record<string, string> = {
  constant: '#a6e3a1',
  selective: '#89b4fa',
  keyword: '#f9e2af',
  disabled: '#6c7086',
}

function getEntryType(entry: WorkingEntry): string {
  if (!entry.enabled) return 'disabled'
  if (entry.constant) return 'constant'
  if (entry.selectiveLogic !== undefined && entry.secondaryKeys && entry.secondaryKeys.length > 0) return 'selective'
  return 'keyword'
}

function EntryRow({
  entry,
  onPress,
}: {
  entry: WorkingEntry
  onPress: () => void
}) {
  const type = getEntryType(entry)
  const badgeColor = BADGE_COLOR[type] ?? '#6c7086'
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
}

export function EntryListScreen({ navigation }: Props) {
  const activeTabId = useWorkspaceStore((s) => s.activeTabId)
  const [query, setQuery] = useState('')

  const entries = useMemo<WorkingEntry[]>(() => {
    if (!activeTabId) return []
    const store = documentStoreRegistry.get(activeTabId)
    if (!store) return []
    return store.getState().entries
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
        placeholderTextColor="#585b70"
        value={query}
        onChangeText={setQuery}
      />
      <Text style={styles.count}>{filtered.length} entries</Text>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.uid}
        renderItem={({ item }) => (
          <EntryRow
            entry={item}
            onPress={() => navigation.push('Entry', { entryId: item.uid })}
          />
        )}
        contentContainerStyle={styles.list}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e1e2e' },
  search: {
    margin: 12,
    backgroundColor: '#313244',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#cdd6f4',
    fontSize: 15,
  },
  count: { color: '#6c7086', fontSize: 12, marginHorizontal: 12, marginBottom: 4 },
  list: { paddingBottom: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#313244',
    gap: 10,
  },
  badge: {
    width: 22,
    height: 22,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#1e1e2e' },
  rowContent: { flex: 1 },
  entryName: { color: '#cdd6f4', fontSize: 15, fontWeight: '500' },
  keywords: { color: '#6c7086', fontSize: 12, marginTop: 2 },
  disabledTag: {
    color: '#6c7086',
    fontSize: 11,
    backgroundColor: '#313244',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1e1e2e', padding: 32 },
  emptyTitle: { color: '#cdd6f4', fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptySub: { color: '#6c7086', fontSize: 14, textAlign: 'center' },
})
