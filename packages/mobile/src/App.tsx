import { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native'
import { useFonts } from 'expo-font'
import { Sora_400Regular, Sora_600SemiBold, Sora_700Bold } from '@expo-google-fonts/sora'
import { JetBrainsMono_400Regular, JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono'
import { Feather } from '@expo/vector-icons'
import { NavigationContainer } from '@react-navigation/native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useWorkspaceStore, createDocumentStore, documentStoreRegistry } from '@lorewalker/core'
import type { PersistedDocument } from '@lorewalker/core'
import { AsyncStorageAdapter } from './storage/async-storage-adapter'
import { AppNavigator } from './layouts/mobile/AppNavigator'
import { useDerivedState } from './hooks/useDerivedState'
import { T } from './theme/tokens'

function DerivedStateProvider({ children }: { children: React.ReactNode }) {
  const activeTabId = useWorkspaceStore((s) => s.activeTabId)
  useDerivedState(activeTabId)
  return <>{children}</>
}

const storage = new AsyncStorageAdapter()

export default function App() {
  const [hydrated, setHydrated] = useState(false)

  const [fontsLoaded] = useFonts({
    Sora_400Regular,
    Sora_600SemiBold,
    Sora_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  })

  useEffect(() => {
    hydrate().finally(() => setHydrated(true))
  }, [])

  if (!hydrated || !fontsLoaded) {
    return (
      <View style={styles.loading}>
        <Feather name="book-open" size={56} color={T.accent} style={styles.brandIcon} />
        <Text style={styles.brandName}>Lorewalker</Text>
        <Text style={styles.brandSub}>Lorebook Editor</Text>
        <ActivityIndicator size="small" color={T.accent} style={styles.spinner} />
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
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.bg,
    gap: 8,
  },
  brandIcon: {
    marginBottom: 8,
  },
  brandName: {
    fontSize: 18,
    fontWeight: '600',
    color: T.textPrimary,
  },
  brandSub: {
    fontSize: 12,
    color: T.textMuted,
  },
  spinner: {
    marginTop: 16,
  },
})
