import { useEffect, useState } from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useWorkspaceStore, createDocumentStore, documentStoreRegistry } from '@lorewalker/core'
import type { PersistedDocument } from '@lorewalker/core'
import { AsyncStorageAdapter } from './storage/async-storage-adapter'
import { AppNavigator } from './layouts/mobile/AppNavigator'
import { useDerivedState } from './hooks/useDerivedState'

function DerivedStateProvider({ children }: { children: React.ReactNode }) {
  const activeTabId = useWorkspaceStore((s) => s.activeTabId)
  useDerivedState(activeTabId)
  return <>{children}</>
}

const storage = new AsyncStorageAdapter()

export default function App() {
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    hydrate().finally(() => setHydrated(true))
  }, [])

  if (!hydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#cba6f7" />
      </View>
    )
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <DerivedStateProvider>
          <AppNavigator />
        </DerivedStateProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  )
}

async function hydrate() {
  try {
    const workspace = await storage.loadWorkspace()
    if (!workspace) return

    const { tabs, activeTabId } = workspace as { tabs?: Array<{ id: string; name: string; fileMeta: unknown }>; activeTabId?: string | null }
    if (!tabs || tabs.length === 0) return

    // Restore each tab's document store
    for (const tab of tabs) {
      const persisted = await storage.loadDocument(tab.id)
      if (!persisted) continue

      const doc = persisted as PersistedDocument
      const store = createDocumentStore({
        entries: doc.entries,
        bookMeta: doc.bookMeta,
        initialFormat: doc.activeFormat,
        ruleOverrides: doc.ruleOverrides,
      })
      documentStoreRegistry.set(tab.id, store)

      const fileMeta = doc.fileMeta
      useWorkspaceStore.getState().openTab(tab.id, tab.name, fileMeta)
    }

    // Restore active tab
    if (activeTabId) {
      useWorkspaceStore.getState().switchTab(activeTabId)
    }
  } catch {
    // Hydration failure is non-fatal — start fresh
  }
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1e1e2e' },
})
