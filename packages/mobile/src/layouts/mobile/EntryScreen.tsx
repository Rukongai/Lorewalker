import { useState, useEffect } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useWorkspaceStore, documentStoreRegistry } from '@lorewalker/core'
import type { WorkingEntry } from '@lorewalker/core'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { EntriesStackParamList } from './AppNavigator'
import { EditorView } from '../../features/editor'
import { EntryHealthView } from '../../features/health'
import { EntryInsightsView } from '../../features/insights'
import { T } from '../../theme/tokens'

type Props = NativeStackScreenProps<EntriesStackParamList, 'Entry'>

type TabId = 'edit' | 'health' | 'insights'

const TABS: { id: TabId; label: string }[] = [
  { id: 'edit', label: 'Edit' },
  { id: 'health', label: 'Health' },
  { id: 'insights', label: 'Insights' },
]

export function EntryScreen({ route, navigation }: Props) {
  const { entryId, entryIndex } = route.params
  const [activeTab, setActiveTab] = useState<TabId>('edit')

  const activeTabId = useWorkspaceStore((s) => s.activeTabId)
  const store = activeTabId ? documentStoreRegistry.get(activeTabId) : null

  // Reactively track the entry so updates (e.g. name edits) re-render the screen
  const [entry, setEntry] = useState<WorkingEntry | undefined>(() =>
    store ? store.getState().entries.find((e) => e.id === entryId) : undefined,
  )
  const [activeFormat, setActiveFormat] = useState<string>(() =>
    store ? store.getState().activeFormat : 'unknown',
  )
  const [allEntries, setAllEntries] = useState<WorkingEntry[]>(() =>
    store ? store.getState().entries : [],
  )

  useEffect(() => {
    if (!store) {
      setEntry(undefined)
      setActiveFormat('unknown')
      setAllEntries([])
      return
    }
    // Sync immediately (store may have changed since useState initializer ran)
    setEntry(store.getState().entries.find((e) => e.id === entryId))
    setActiveFormat(store.getState().activeFormat)
    setAllEntries(store.getState().entries)
    // Subscribe so the screen re-renders when entries are updated
    return store.subscribe((state) => {
      setEntry(state.entries.find((e) => e.id === entryId))
      setActiveFormat(state.activeFormat)
      setAllEntries(state.entries)
    })
  }, [store, entryId])

  // Update header title when entry name changes
  useEffect(() => {
    if (entry?.name) {
      navigation.setOptions({ title: entry.name })
    }
  }, [entry?.name, navigation])

  function handleEntryChange(patch: Partial<WorkingEntry>) {
    if (!store || !entry) return
    store.getState().updateEntry(entryId, patch)
  }

  function navigateToEntry(idx: number) {
    const target = allEntries[idx]
    if (!target) return
    navigation.replace('Entry', { entryId: target.id, entryIndex: idx })
  }

  const hasPrev = entryIndex > 0
  const hasNext = entryIndex < allEntries.length - 1

  if (!activeTabId || !store) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No Lorebook Loaded</Text>
        <Text style={styles.emptySub}>Go to Settings to import a lorebook file.</Text>
      </View>
    )
  }

  if (!entry) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Entry Not Found</Text>
        <Text style={styles.emptySub}>This entry may have been deleted.</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Tab bar with prev/next navigation */}
      <View style={styles.tabBar}>
        <Pressable
          onPress={() => navigateToEntry(entryIndex - 1)}
          disabled={!hasPrev}
          style={[styles.navBtn, !hasPrev && styles.navBtnDisabled]}
        >
          <Text style={[styles.navBtnText, !hasPrev && styles.navBtnTextDisabled]}>←</Text>
        </Pressable>

        {TABS.map((tab) => (
          <Pressable
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}

        <Pressable
          onPress={() => navigateToEntry(entryIndex + 1)}
          disabled={!hasNext}
          style={[styles.navBtn, !hasNext && styles.navBtnDisabled]}
        >
          <Text style={[styles.navBtnText, !hasNext && styles.navBtnTextDisabled]}>→</Text>
        </Pressable>
      </View>

      {/* Tab content */}
      <View style={styles.content}>
        {activeTab === 'edit' && (
          <EditorView
            scope="entry"
            activeFormat={activeFormat}
            entry={entry}
            onEntryChange={handleEntryChange}
          />
        )}
        {activeTab === 'health' && (
          <EntryHealthView entryId={entryId} />
        )}
        {activeTab === 'insights' && (
          <EntryInsightsView entryId={entryId} />
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bg,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.overlay,
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 4,
    alignItems: 'center',
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: T.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnDisabled: {
    opacity: 0.3,
  },
  navBtnText: {
    color: T.textPrimary,
    fontSize: 16,
  },
  navBtnTextDisabled: {
    color: T.textMuted,
  },
  tab: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: T.overlay,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: T.muted,
  },
  tabText: {
    color: T.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  tabTextActive: {
    color: T.textPrimary,
  },
  content: {
    flex: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.bg,
    padding: 32,
  },
  emptyTitle: {
    color: T.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySub: {
    color: T.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
})
