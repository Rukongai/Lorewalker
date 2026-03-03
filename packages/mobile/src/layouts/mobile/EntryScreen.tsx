import { useState, useEffect } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useWorkspaceStore, documentStoreRegistry } from '@lorewalker/core'
import type { WorkingEntry } from '@lorewalker/core'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { EntriesStackParamList } from './AppNavigator'
import { EditorView } from '../../features/editor'

type Props = NativeStackScreenProps<EntriesStackParamList, 'Entry'>

type TabId = 'edit' | 'health' | 'insights'

const TABS: { id: TabId; label: string }[] = [
  { id: 'edit', label: 'Edit' },
  { id: 'health', label: 'Health' },
  { id: 'insights', label: 'Insights' },
]

export function EntryScreen({ route, navigation }: Props) {
  const { entryId } = route.params
  const [activeTab, setActiveTab] = useState<TabId>('edit')

  const activeTabId = useWorkspaceStore((s) => s.activeTabId)

  // Get the entry from the document store
  const store = activeTabId ? documentStoreRegistry.get(activeTabId) : null
  const entry = store ? store.getState().entries.find((e) => e.id === entryId) : undefined
  const activeFormat = store ? store.getState().activeFormat : 'unknown'

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
      {/* Tab bar */}
      <View style={styles.tabBar}>
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
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Health — coming soon</Text>
          </View>
        )}
        {activeTab === 'insights' && (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Insights — coming soon</Text>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e2e',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#181825',
    borderBottomWidth: 1,
    borderBottomColor: '#313244',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#313244',
  },
  tabActive: {
    backgroundColor: '#45475a',
  },
  tabText: {
    color: '#6c7086',
    fontSize: 13,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#cdd6f4',
  },
  content: {
    flex: 1,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#6c7086',
    fontSize: 14,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e1e2e',
    padding: 32,
  },
  emptyTitle: {
    color: '#cdd6f4',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySub: {
    color: '#6c7086',
    fontSize: 14,
    textAlign: 'center',
  },
})
