import { useState } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native'
import { T } from '../../theme/tokens'
import * as DocumentPicker from 'expo-document-picker'
import { File as FSFile } from 'expo-file-system'
import { parseLorebook } from '@character-foundry/character-foundry/loader'
import { inflate, generateId, documentStoreRegistry, useWorkspaceStore } from '@lorewalker/core'
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

      const file = new FSFile(uri)
      let buffer: Uint8Array
      if (isPng) {
        buffer = await file.bytes()
      } else {
        const text = await file.text()
        buffer = new TextEncoder().encode(text)
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

      const tabId = generateId()
      documentStoreRegistry.create(tabId, {
        entries,
        bookMeta: { ...bookMeta, name: displayName },
        initialFormat: lorebookFormat,
      })
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
          <ActivityIndicator color={T.black} />
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
  label: { color: T.textPrimary, fontSize: 17, fontWeight: '600' },
  sub: { color: T.textMuted, fontSize: 13 },
  button: {
    backgroundColor: T.accent,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  buttonText: { color: T.black, fontSize: 16, fontWeight: '700' },
  error: { color: T.error, fontSize: 13 },
})
