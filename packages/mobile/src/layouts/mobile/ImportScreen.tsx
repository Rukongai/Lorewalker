import { useState } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system'
import { parseLorebook } from '@character-foundry/character-foundry/loader'
import { inflate, generateId, createDocumentStore, documentStoreRegistry, useWorkspaceStore } from '@lorewalker/core'
import type { FileMeta } from '@lorewalker/core'

interface ImportScreenProps {
  onImportSuccess?: () => void
}

export function ImportScreen({ onImportSuccess }: ImportScreenProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleImport() {
    setError(null)
    setLoading(true)
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'image/png', 'application/octet-stream'],
        copyToCacheDirectory: true,
      })

      if (result.canceled) {
        setLoading(false)
        return
      }

      const asset = result.assets[0]
      if (!asset) {
        setLoading(false)
        return
      }

      const uri = asset.uri
      const isPng = asset.name?.toLowerCase().endsWith('.png') || asset.mimeType === 'image/png'

      let buffer: Uint8Array
      if (isPng) {
        const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 })
        const binary = atob(b64)
        buffer = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) {
          buffer[i] = binary.charCodeAt(i)
        }
      } else {
        const text = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 })
        const encoder = new TextEncoder()
        buffer = encoder.encode(text)
      }

      const { book, lorebookFormat } = parseLorebook(buffer)
      const { entries, bookMeta } = inflate(book)

      const displayName = bookMeta.name || asset.name?.replace(/\.(json|png|charx)$/i, '') || 'Imported Lorebook'

      const fileMeta: FileMeta = {
        fileName: asset.name ?? 'lorebook.json',
        originalFormat: lorebookFormat,
        lastSavedAt: null,
        sourceType: isPng ? 'embedded-in-card' : 'standalone',
      }

      const store = createDocumentStore({
        entries,
        bookMeta: { ...bookMeta, name: displayName },
        initialFormat: lorebookFormat,
      })

      const tabId = generateId()
      documentStoreRegistry.set(tabId, store)
      useWorkspaceStore.getState().openTab(tabId, displayName, fileMeta)

      onImportSuccess?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Import failed'
      setError(msg)
      Alert.alert('Import Error', msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Import a Lorebook</Text>
      <Text style={styles.sub}>Supports .json SillyTavern lorebooks and .png character cards</Text>
      <TouchableOpacity style={styles.button} onPress={handleImport} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#1e1e2e" />
        ) : (
          <Text style={styles.buttonText}>Choose File</Text>
        )}
      </TouchableOpacity>
      {error !== null && <Text style={styles.error}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  label: { color: '#cdd6f4', fontSize: 17, fontWeight: '600' },
  sub: { color: '#6c7086', fontSize: 13 },
  button: {
    backgroundColor: '#cba6f7',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  buttonText: { color: '#1e1e2e', fontSize: 16, fontWeight: '700' },
  error: { color: '#f38ba8', fontSize: 13 },
})
