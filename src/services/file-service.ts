/**
 * FileService — file import, export, format detection.
 *
 * Owns: File import (file picker, drag-drop), export (browser download).
 * Delegates: Data transformation (TransformService), format parsing (character-foundry).
 * Does not own: Working model management (that's the store).
 */

import { parseLorebook, parseCard } from '@character-foundry/character-foundry/loader'
import { generateId } from '@/lib/uuid'
import { inflate, deflate } from './transform-service'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { documentStoreRegistry } from '@/stores/document-store-registry'
import type { FileMeta, LorebookFormat } from '@/types'

export class FileImportError extends Error {
  readonly cause: unknown
  readonly fileName: string | undefined

  constructor(message: string, cause?: unknown, fileName?: string) {
    super(message)
    this.name = 'FileImportError'
    this.cause = cause
    this.fileName = fileName
  }
}

export class FileExportError extends Error {
  readonly cause: unknown

  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'FileExportError'
    this.cause = cause
  }
}

/**
 * Reads a File object as a Uint8Array.
 */
async function readFileBuffer(file: File): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer()
  return new Uint8Array(arrayBuffer)
}

/**
 * Detect human-readable format name from character-foundry LorebookFormat.
 */
function resolveFormat(fmt: string): LorebookFormat {
  const valid: LorebookFormat[] = ['ccv3', 'sillytavern', 'agnai', 'risu', 'wyvern', 'unknown']
  return valid.includes(fmt as LorebookFormat) ? (fmt as LorebookFormat) : 'unknown'
}

/**
 * Import a lorebook from a File object.
 * - Supports standalone lorebook JSON and character card (PNG/charx) formats.
 * - For character cards, uses the first available lorebook.
 * - Inflates the CCv3 book to WorkingEntry[], creates a new tab.
 *
 * Returns the tabId of the newly opened tab.
 */
export async function importFile(file: File): Promise<string> {
  let buffer: Uint8Array
  try {
    buffer = await readFileBuffer(file)
  } catch (err) {
    throw new FileImportError(`Failed to read file: ${file.name}`, err, file.name)
  }

  // Detect whether this is a card or standalone lorebook
  const isCard = file.name.endsWith('.png') || file.name.endsWith('.charx')

  try {
    if (isCard) {
      // Character card: extract the embedded lorebook
      const cardResult = parseCard(buffer)
      const cardData = cardResult.card?.data
      const book = cardData?.character_book
      if (!book) {
        throw new FileImportError(
          `No lorebook found in character card: ${file.name}`,
          undefined,
          file.name
        )
      }

      const { entries, bookMeta } = inflate(book)
      const tabId = generateId()
      const fileMeta: FileMeta = {
        fileName: file.name,
        originalFormat: 'ccv3',
        lastSavedAt: null,
        sourceType: 'embedded-in-card',
      }

      documentStoreRegistry.create(tabId, { entries, bookMeta })
      useWorkspaceStore.getState().openTab(tabId, bookMeta.name || file.name, fileMeta)
      return tabId
    } else {
      // Standalone lorebook JSON
      const result = parseLorebook(buffer)
      const { entries, bookMeta } = inflate(result.book)

      const tabId = generateId()
      const fileMeta: FileMeta = {
        fileName: file.name,
        originalFormat: resolveFormat(result.lorebookFormat),
        lastSavedAt: null,
        sourceType: 'standalone',
      }

      documentStoreRegistry.create(tabId, { entries, bookMeta })
      useWorkspaceStore.getState().openTab(tabId, bookMeta.name || file.name, fileMeta)
      return tabId
    }
  } catch (err) {
    if (err instanceof FileImportError) throw err
    throw new FileImportError(
      `Failed to parse ${file.name}: unsupported format or invalid data`,
      err,
      file.name
    )
  }
}

/**
 * Export the active document as a downloadable JSON lorebook file.
 *
 * @param tabId - The tab whose document to export
 */
export function exportFile(tabId: string, fileName?: string): void {
  const store = documentStoreRegistry.get(tabId)
  if (!store) throw new FileExportError(`No document found for tab: ${tabId}`)

  const { entries, bookMeta } = store.getState()

  let book
  try {
    book = deflate(entries, bookMeta)
  } catch (err) {
    throw new FileExportError('Failed to deflate entries for export', err)
  }

  // Serialize to the SillyTavern lorebook format (entries keyed by UID)
  const stExport: { entries: Record<string, unknown> } = { entries: {} }
  book.entries.forEach((entry, index) => {
    const stEntry = {
      uid: index,
      key: entry.keys ?? [],
      keysecondary: entry.secondary_keys ?? [],
      comment: entry.name ?? '',
      content: entry.content,
      constant: entry.constant ?? false,
      selective: entry.selective ?? false,
      selectiveLogic: entry.selective_logic ?? 0,
      addMemo: true,
      order: entry.insertion_order,
      position: entry.position,
      disable: !entry.enabled,
      probability: entry.probability ?? 100,
      useProbability: true,
      depth: entry.depth ?? 4,
      delay: (entry.extensions?.['sillytavern'] as Record<string, unknown>)?.delay ?? 0,
      cooldown: (entry.extensions?.['sillytavern'] as Record<string, unknown>)?.cooldown ?? 0,
      sticky: (entry.extensions?.['sillytavern'] as Record<string, unknown>)?.sticky ?? 0,
      vectorized: false,
      ignoreBudget: (entry.extensions?.['sillytavern'] as Record<string, unknown>)?.ignoreBudget ?? false,
      excludeRecursion: (entry.extensions?.['sillytavern'] as Record<string, unknown>)?.excludeRecursion ?? false,
      preventRecursion: (entry.extensions?.['sillytavern'] as Record<string, unknown>)?.preventRecursion ?? false,
    }
    stExport.entries[String(index)] = stEntry
  })

  const json = JSON.stringify(stExport, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = fileName ?? `${bookMeta.name || 'lorebook'}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  // Mark tab as clean after save
  useWorkspaceStore.getState().markDirty(tabId, false)
}
