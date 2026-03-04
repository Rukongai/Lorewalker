import { useState } from 'react'
import { View, Text, TextInput, ScrollView, Pressable, ActivityIndicator, StyleSheet } from 'react-native'
import { EmptyState } from '../../components/EmptyState'
import { useWorkspaceStore, categorizeEntry, llmService } from '@lorewalker/core'
import type { WorkingEntry, BookMeta, LorebookFormat } from '@lorewalker/core'
import { T } from '../../theme/tokens'
import { FieldGroup, Field, inputStyle } from './primitives'
import { ContentField } from './ContentField'
import { KeywordEditor } from './KeywordEditor'
import { ActivationFields } from './fields/ActivationFields'
import { PriorityFields } from './fields/PriorityFields'
import { TimedEffectFields } from './fields/TimedEffectFields'
import { RecursionFields } from './fields/RecursionFields'
import { GroupFields } from './fields/GroupFields'
import { ScanOverrideFields } from './fields/ScanOverrideFields'
import { MatchSourceFields } from './fields/MatchSourceFields'
import { BudgetFields } from './fields/BudgetFields'
import { AdvancedFields } from './fields/AdvancedFields'
import { STEntryFields } from './variants/sillytavern/STEntryFields'
import { KeywordObjectsEditor } from './variants/rolecall/KeywordObjectsEditor'
import { RCEntryFields } from './variants/rolecall/RCEntryFields'

export interface EditorViewProps {
  scope: 'lorebook' | 'entry'
  activeFormat: LorebookFormat

  // Entry scope
  entry?: WorkingEntry
  onEntryChange?: (patch: Partial<WorkingEntry>) => void

  // Lorebook scope
  bookMeta?: BookMeta
  onBookMetaChange?: <K extends keyof BookMeta>(field: K, value: BookMeta[K]) => void
}

export function EditorView({
  scope,
  activeFormat,
  entry,
  onEntryChange,
  bookMeta,
  onBookMetaChange,
}: EditorViewProps) {
  const activeLlmProviderId = useWorkspaceStore((s) => s.activeLlmProviderId)
  const [categorizing, setCategorizing] = useState(false)
  const isRoleCall = activeFormat === 'rolecall'
  const isSillyTavern = activeFormat !== 'rolecall' && activeFormat !== 'ccv3'
  const isPlatform = isRoleCall || isSillyTavern

  if (scope === 'entry') {
    if (!entry || !onEntryChange) {
      return <EmptyState icon="edit-2" title="Select an Entry" subtitle="Choose an entry from the list to edit." />
    }

    async function handleCategorize() {
      if (!activeLlmProviderId || !entry || !onEntryChange) return
      setCategorizing(true)
      try {
        const category = await categorizeEntry(entry, llmService, activeLlmProviderId)
        onEntryChange({ userCategory: category })
      } catch (err) {
        console.warn('[EditorView] Categorize failed:', err)
      } finally {
        setCategorizing(false)
      }
    }

    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Name */}
        <View style={styles.topSection}>
          <Field label="Name">
            <TextInput
              style={inputStyle}
              value={entry.name}
              onChangeText={(v) => onEntryChange({ name: v })}
              placeholder="Entry name"
              placeholderTextColor={T.textSubtle}
            />
          </Field>

          {isRoleCall && (
            <Field label="Notes">
              <TextInput
                style={inputStyle}
                value={entry.rolecallComment ?? ''}
                onChangeText={(v) => onEntryChange({ rolecallComment: v || undefined })}
                placeholder="Optional notes…"
                placeholderTextColor={T.textSubtle}
              />
            </Field>
          )}

          {/* Category */}
          <View style={styles.categoryRow}>
            {entry.userCategory ? (
              <Text style={styles.categoryText}>Category: {entry.userCategory}</Text>
            ) : (
              <Text style={styles.categoryText}>No category</Text>
            )}
            {activeLlmProviderId && (
              <Pressable
                onPress={() => void handleCategorize()}
                disabled={categorizing}
                style={({ pressed }) => [styles.categorizeBtn, pressed && styles.categorizeBtnPressed]}
              >
                {categorizing
                  ? <ActivityIndicator size="small" color={T.accent} />
                  : <Text style={styles.categorizeBtnText}>Categorize</Text>
                }
              </Pressable>
            )}
          </View>

          {/* Content */}
          <Field label={`Content (${entry.tokenCount} tokens)`}>
            <ContentField
              value={entry.content}
              onChange={(v) => onEntryChange({ content: v })}
              preventRecursion={entry.preventRecursion}
            />
          </Field>
        </View>

        {/* Keywords */}
        <FieldGroup label="Keywords">
          <View style={styles.kwSection}>
            <Text style={styles.kwLabel}>Primary</Text>
            <KeywordEditor
              value={entry.keys}
              onChange={(keys) => onEntryChange({ keys })}
              placeholder="Add primary keyword…"
              variant="primary"
            />
          </View>
          <View style={styles.kwSection}>
            <Text style={styles.kwLabel}>Secondary</Text>
            <KeywordEditor
              value={entry.secondaryKeys}
              onChange={(secondaryKeys) => onEntryChange({ secondaryKeys })}
              placeholder="Add secondary keyword…"
              variant="secondary"
            />
          </View>
          {isRoleCall && (
            <View style={styles.kwSection}>
              <Text style={styles.kwLabel}>Keyword Objects (RoleCall)</Text>
              <KeywordObjectsEditor
                keywords={entry.keywordObjects ?? []}
                onChange={(keywordObjects) => onEntryChange({ keywordObjects })}
              />
            </View>
          )}
        </FieldGroup>

        {/* Activation */}
        <FieldGroup label="Activation" rcOnly={isRoleCall}>
          {isRoleCall ? (
            <RCEntryFields entry={entry} onChange={onEntryChange} />
          ) : (
            <ActivationFields entry={entry} onChange={onEntryChange} />
          )}
        </FieldGroup>

        {/* Insertion */}
        <FieldGroup label="Insertion">
          <PriorityFields entry={entry} isRoleCall={isRoleCall} onChange={onEntryChange} />
        </FieldGroup>

        {isPlatform && (
          <FieldGroup label="Timed Effects" defaultCollapsed>
            <TimedEffectFields entry={entry} isSillyTavern={isSillyTavern} onChange={onEntryChange} />
          </FieldGroup>
        )}

        {isPlatform && (
          <FieldGroup label="Recursion" defaultCollapsed>
            <RecursionFields entry={entry} onChange={onEntryChange} />
          </FieldGroup>
        )}

        {isPlatform && (
          <FieldGroup label="Inclusion Group" defaultCollapsed>
            <GroupFields entry={entry} isSillyTavern={isSillyTavern} onChange={onEntryChange} />
          </FieldGroup>
        )}

        {isPlatform && (
          <FieldGroup label="Scan Settings" defaultCollapsed>
            <ScanOverrideFields entry={entry} onChange={onEntryChange} />
          </FieldGroup>
        )}

        {isPlatform && (
          <FieldGroup label="Match Sources" defaultCollapsed>
            <MatchSourceFields entry={entry} isSillyTavern={isSillyTavern} onChange={onEntryChange} />
          </FieldGroup>
        )}

        {isSillyTavern && (
          <FieldGroup label="Triggers" stOnly defaultCollapsed>
            <STEntryFields entry={entry} onChange={onEntryChange} />
          </FieldGroup>
        )}

        {isSillyTavern && (
          <FieldGroup label="Budget" stOnly defaultCollapsed>
            <BudgetFields entry={entry} onChange={onEntryChange} />
          </FieldGroup>
        )}

        {isSillyTavern && (
          <FieldGroup label="Advanced" stOnly defaultCollapsed>
            <AdvancedFields entry={entry} onChange={onEntryChange} />
          </FieldGroup>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>
    )
  }

  // Lorebook scope
  if (!bookMeta || !onBookMetaChange) {
    return <EmptyState icon="book-open" title="No Book Open" />
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      <FieldGroup label="Book Info">
        <Field label="Name">
          <TextInput
            style={inputStyle}
            value={bookMeta.name}
            onChangeText={(v) => onBookMetaChange('name', v)}
            placeholder="Lorebook name"
            placeholderTextColor={T.textSubtle}
          />
        </Field>
        <Field label="Description">
          <TextInput
            style={[inputStyle, styles.textArea]}
            value={bookMeta.description}
            onChangeText={(v) => onBookMetaChange('description', v)}
            multiline
            textAlignVertical="top"
            placeholder="Lorebook description"
            placeholderTextColor={T.textSubtle}
          />
        </Field>
      </FieldGroup>
      <View style={styles.bottomPad} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  topSection: {
    paddingHorizontal: 12,
    paddingTop: 12,
    gap: 10,
    flexDirection: 'column',
    paddingBottom: 4,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  categoryText: {
    color: T.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
    flex: 1,
  },
  categorizeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: T.overlay,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  categorizeBtnPressed: { backgroundColor: T.muted },
  categorizeBtnText: { color: T.accent, fontSize: 12, fontWeight: '600' },
  kwSection: { gap: 4, flexDirection: 'column' },
  kwLabel: { color: T.textMuted, fontSize: 10 },
  textArea: { minHeight: 80 },
  bottomPad: { height: 40 },
})
