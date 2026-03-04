import { useState, useEffect, useCallback } from 'react'
import { T } from '../../theme/tokens'
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Switch,
  StyleSheet,
  Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import {
  useWorkspaceStore,
  documentStoreRegistry,
  llmService,
  AnthropicProvider,
  OpenAICompatibleProvider,
  generateId,
} from '@lorewalker/core'
import type { PersistedProvider, LLMProviderType, BookMeta, DocumentStore } from '@lorewalker/core'
import type { TabParamList } from './AppNavigator'
import { ImportScreen } from './ImportScreen'
import { AsyncStorageAdapter } from '../../storage/async-storage-adapter'
import { Feather } from '@expo/vector-icons'

type Props = BottomTabScreenProps<TabParamList, 'Settings'>

const storage = new AsyncStorageAdapter()

// ─── Collapsible Section ────────────────────────────────────────────────────

function CollapsibleSection({
  icon,
  label,
  children,
  defaultExpanded = false,
}: {
  icon: string
  label: string
  children: React.ReactNode
  defaultExpanded?: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  return (
    <View style={styles.collapsibleSection}>
      <Pressable
        onPress={() => setExpanded((e) => !e)}
        style={({ pressed }) => [styles.collapsibleHeader, pressed && styles.collapsibleHeaderPressed]}
      >
        <Feather name={icon as any} size={15} color={T.accent} />
        <Text style={styles.collapsibleLabel}>{label}</Text>
        <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={15} color={T.textMuted} />
      </Pressable>
      {expanded && <View style={styles.collapsibleBody}>{children}</View>}
    </View>
  )
}

// ─── Book Tab ──────────────────────────────────────────────────────────────

function BookTab() {
  const activeTabId = useWorkspaceStore((s) => s.activeTabId)
  const store = activeTabId ? documentStoreRegistry.get(activeTabId) : null

  if (!store) {
    return (
      <View style={styles.emptyCenter}>
        <Text style={styles.emptyText}>No lorebook loaded</Text>
        <Text style={styles.emptySubtext}>Import a lorebook from the Import section</Text>
      </View>
    )
  }

  return <BookContent store={store} />
}

function BookContent({ store }: { store: DocumentStore }) {
  const bookMeta = store((s) => s.bookMeta)

  function update(patch: Partial<BookMeta>) {
    store.getState().updateBookMeta(patch)
  }

  return (
    <View style={styles.bookContent}>
      <Section label="Identity">
        <FieldText label="Name" value={bookMeta.name} onChangeText={(v) => update({ name: v })} />
        <FieldText
          label="Description"
          value={bookMeta.description}
          onChangeText={(v) => update({ description: v })}
          multiline
        />
      </Section>

      <Section label="Scanning">
        <FieldNumber label="Scan Depth" value={bookMeta.scanDepth} onChange={(v) => update({ scanDepth: v })} />
        <FieldNumber label="Token Budget" value={bookMeta.tokenBudget} onChange={(v) => update({ tokenBudget: v })} />
        <FieldNumber label="Context Size" value={bookMeta.contextSize} onChange={(v) => update({ contextSize: v })} />
        <FieldNumber label="Recursion Steps" value={bookMeta.maxRecursionSteps} onChange={(v) => update({ maxRecursionSteps: v })} />
        <FieldNumber label="Budget Cap" value={bookMeta.budgetCap} onChange={(v) => update({ budgetCap: v })} />
      </Section>

      <Section label="Options">
        <FieldToggle label="Recursive Scan" value={bookMeta.recursiveScan} onChange={(v) => update({ recursiveScan: v })} />
        <FieldToggle label="Case Sensitive" value={bookMeta.caseSensitive} onChange={(v) => update({ caseSensitive: v })} />
        <FieldToggle label="Match Whole Words" value={bookMeta.matchWholeWords} onChange={(v) => update({ matchWholeWords: v })} />
        <FieldToggle label="Include Names" value={bookMeta.includeNames} onChange={(v) => update({ includeNames: v })} />
        <FieldToggle label="Use Group Scoring" value={bookMeta.useGroupScoring} onChange={(v) => update({ useGroupScoring: v })} />
        <FieldToggle label="Alert on Overflow" value={bookMeta.alertOnOverflow} onChange={(v) => update({ alertOnOverflow: v })} />
      </Section>
    </View>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  )
}

function FieldText({
  label,
  value,
  onChangeText,
  multiline,
}: {
  label: string
  value: string
  onChangeText: (v: string) => void
  multiline?: boolean
}) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, multiline && styles.fieldInputMulti]}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={T.textMuted}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  )
}

function FieldNumber({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, styles.fieldInputNumber]}
        value={String(value)}
        onChangeText={(t) => {
          const n = parseInt(t, 10)
          if (!isNaN(n)) onChange(n)
        }}
        keyboardType="number-pad"
        placeholderTextColor={T.textMuted}
      />
    </View>
  )
}

function FieldToggle({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <View style={styles.fieldRowToggle}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        thumbColor={value ? T.accent : T.textMuted}
        trackColor={{ false: T.overlay, true: T.muted }}
      />
    </View>
  )
}

// ─── Providers Tab ─────────────────────────────────────────────────────────

interface ProviderFormState {
  name: string
  type: LLMProviderType
  apiBase: string
  apiKey: string
  model: string
  maxTokens: string
  temperature: string
}

const DEFAULTS_BY_TYPE: Record<LLMProviderType, Partial<ProviderFormState>> = {
  'openai-compatible': {
    apiBase: 'http://localhost:11434/v1',
    model: 'llama3',
    maxTokens: '2048',
    temperature: '0.7',
  },
  anthropic: {
    apiBase: 'https://api.anthropic.com',
    model: 'claude-haiku-4-5-20251001',
    maxTokens: '2048',
    temperature: '0.7',
  },
}

function emptyForm(type: LLMProviderType = 'openai-compatible'): ProviderFormState {
  return {
    name: '',
    type,
    apiKey: '',
    ...DEFAULTS_BY_TYPE[type],
  } as ProviderFormState
}

function ProvidersContent() {
  const activeProviderId = useWorkspaceStore((s) => s.activeLlmProviderId)
  const [providers, setProviders] = useState<PersistedProvider[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<ProviderFormState>(emptyForm())
  const [testStatus, setTestStatus] = useState<Map<string, 'testing' | 'ok' | 'error'>>(new Map())
  const [testError, setTestError] = useState<Map<string, string>>(new Map())

  const loadProviders = useCallback(async () => {
    const loaded = await storage.loadProviders()
    setProviders(loaded)
  }, [])

  useEffect(() => {
    void loadProviders()
  }, [loadProviders])

  async function saveProviders(updated: PersistedProvider[]) {
    await storage.saveProviders(updated)
    setProviders(updated)
  }

  function patchForm(patch: Partial<ProviderFormState>) {
    setForm((prev) => ({ ...prev, ...patch }))
  }

  function handleTypeChange(type: LLMProviderType) {
    setForm({ ...emptyForm(type), name: form.name, apiKey: form.apiKey })
  }

  async function handleAdd() {
    if (!form.name.trim()) {
      Alert.alert('Validation', 'Provider name is required.')
      return
    }
    if (!form.model.trim()) {
      Alert.alert('Validation', 'Model is required.')
      return
    }

    const id = generateId()
    const persisted: PersistedProvider = {
      id,
      name: form.name.trim(),
      type: form.type,
      apiKey: form.apiKey,
      config: {
        apiBase: form.apiBase,
        model: form.model.trim(),
        maxTokens: parseInt(form.maxTokens, 10) || 2048,
        temperature: parseFloat(form.temperature) || 0.7,
      },
    }

    const inst =
      form.type === 'anthropic'
        ? new AnthropicProvider(id, persisted.name, { ...persisted.config, apiKey: persisted.apiKey })
        : new OpenAICompatibleProvider(id, persisted.name, { ...persisted.config, apiKey: persisted.apiKey })

    llmService.registerProvider(inst)
    await saveProviders([...providers, persisted])
    setShowForm(false)
    setForm(emptyForm())
  }

  async function handleDelete(id: string) {
    llmService.removeProvider(id)
    const updated = providers.filter((p) => p.id !== id)
    await saveProviders(updated)
    if (activeProviderId === id) {
      useWorkspaceStore.getState().setActiveLlmProviderId(null)
    }
  }

  async function handleSetActive(id: string) {
    useWorkspaceStore.getState().setActiveLlmProviderId(id)
    const { tabs, activeTabId, theme } = useWorkspaceStore.getState()
    await storage.saveWorkspace({
      tabs,
      activeTabId,
      theme,
      panelLayout: { leftPanelWidth: 256, rightPanelWidth: 320, leftCollapsed: false, rightCollapsed: false, rightPanelTab: 'entry', leftPanelTab: 'entries' },
      activeLlmProviderId: id,
    }).catch(() => { /* non-fatal */ })
  }

  async function handleTest(id: string) {
    setTestStatus((m) => new Map(m).set(id, 'testing'))
    const result = await llmService.testConnection(id)
    setTestStatus((m) => new Map(m).set(id, result.success ? 'ok' : 'error'))
    if (!result.success) {
      setTestError((m) => new Map(m).set(id, result.error ?? 'Unknown error'))
    }
  }

  return (
    <View style={styles.providersContent}>
      {providers.length === 0 && !showForm && (
        <Text style={styles.emptySubtext}>No providers configured. Add one below.</Text>
      )}

      {providers.map((p) => {
        const isActive = activeProviderId === p.id
        const status = testStatus.get(p.id)
        const err = testError.get(p.id)
        return (
          <View key={p.id} style={[styles.providerCard, isActive && styles.providerCardActive]}>
            <View style={styles.providerHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.providerName} numberOfLines={1}>{p.name}</Text>
                <View style={styles.providerMeta}>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>{p.type}</Text>
                  </View>
                  <Text style={styles.providerModel} numberOfLines={1}>{p.config.model}</Text>
                  {isActive && <Text style={styles.activeLabel}>ACTIVE</Text>}
                </View>
              </View>
            </View>

            {status === 'ok' && <Text style={styles.testOk}>✓ Connection OK</Text>}
            {status === 'error' && (
              <Text style={styles.testErr} numberOfLines={2}>{err ?? 'Connection failed'}</Text>
            )}

            <View style={styles.providerActions}>
              <Pressable
                onPress={() => void handleTest(p.id)}
                style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
              >
                <Text style={styles.actionBtnText}>
                  {status === 'testing' ? 'Testing…' : 'Test'}
                </Text>
              </Pressable>
              {!isActive && (
                <Pressable
                  onPress={() => void handleSetActive(p.id)}
                  style={({ pressed }) => [styles.actionBtn, styles.actionBtnAccent, pressed && styles.actionBtnPressed]}
                >
                  <Text style={[styles.actionBtnText, { color: T.accent }]}>Set Active</Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => void handleDelete(p.id)}
                style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
              >
                <Text style={[styles.actionBtnText, { color: T.error }]}>Delete</Text>
              </Pressable>
            </View>
          </View>
        )
      })}

      {showForm ? (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Add Provider</Text>

          <Text style={styles.formLabel}>Type</Text>
          <View style={styles.typeSelector}>
            {(['openai-compatible', 'anthropic'] as LLMProviderType[]).map((t) => (
              <Pressable
                key={t}
                onPress={() => handleTypeChange(t)}
                style={[styles.typeOption, form.type === t && styles.typeOptionActive]}
              >
                <Text style={[styles.typeOptionText, form.type === t && styles.typeOptionTextActive]}>
                  {t === 'openai-compatible' ? 'OpenAI-Compatible' : 'Anthropic'}
                </Text>
              </Pressable>
            ))}
          </View>

          <FormField label="Name" value={form.name} onChangeText={(v) => patchForm({ name: v })} placeholder="e.g. Ollama Local" />
          <FormField label="API Base" value={form.apiBase} onChangeText={(v) => patchForm({ apiBase: v })} placeholder="http://..." />
          <FormField label="API Key" value={form.apiKey} onChangeText={(v) => patchForm({ apiKey: v })} placeholder="(leave empty for keyless)" secureTextEntry />
          <FormField label="Model" value={form.model} onChangeText={(v) => patchForm({ model: v })} placeholder="e.g. llama3" />
          <FormField label="Max Tokens" value={form.maxTokens} onChangeText={(v) => patchForm({ maxTokens: v })} keyboardType="number-pad" />
          <FormField label="Temperature" value={form.temperature} onChangeText={(v) => patchForm({ temperature: v })} keyboardType="decimal-pad" />

          <View style={styles.formActions}>
            <Pressable
              onPress={() => { setShowForm(false); setForm(emptyForm()) }}
              style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
            >
              <Text style={styles.actionBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => void handleAdd()}
              style={({ pressed }) => [styles.actionBtn, styles.actionBtnAccent, pressed && styles.actionBtnPressed]}
            >
              <Text style={[styles.actionBtnText, { color: T.accent }]}>Save</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={() => setShowForm(true)}
          style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
        >
          <Text style={styles.addBtnText}>+ Add Provider</Text>
        </Pressable>
      )}
    </View>
  )
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secureTextEntry,
}: {
  label: string
  value: string
  onChangeText: (v: string) => void
  placeholder?: string
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad'
  secureTextEntry?: boolean
}) {
  return (
    <View style={styles.formFieldRow}>
      <Text style={styles.formLabel}>{label}</Text>
      <TextInput
        style={styles.formInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={T.textMuted}
        keyboardType={keyboardType ?? 'default'}
        secureTextEntry={secureTextEntry}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  )
}

// ─── Main SettingsScreen ────────────────────────────────────────────────────

export function SettingsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets()

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 12 }]}
    >
      <CollapsibleSection icon="book-open" label="Book" defaultExpanded={false}>
        <BookTab />
      </CollapsibleSection>

      <CollapsibleSection icon="server" label="Providers" defaultExpanded={false}>
        <ProvidersContent />
      </CollapsibleSection>

      <CollapsibleSection icon="upload" label="Import" defaultExpanded={false}>
        <ImportScreen onImportSuccess={() => navigation.navigate('Entries')} />
      </CollapsibleSection>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  scrollContent: { padding: 12, gap: 12, paddingBottom: 40 },

  // Collapsible section
  collapsibleSection: {
    backgroundColor: T.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: T.overlay,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  collapsibleHeaderPressed: { backgroundColor: T.overlay },
  collapsibleLabel: { flex: 1, color: T.textPrimary, fontSize: 14, fontWeight: '600' },
  collapsibleBody: { padding: 12, gap: 12, borderTopWidth: 1, borderTopColor: T.overlay },

  // Empty state
  emptyCenter: { alignItems: 'center', padding: 24 },
  emptyText: { color: T.textPrimary, fontSize: 16, marginBottom: 8 },
  emptySubtext: { color: T.textMuted, fontSize: 13, marginBottom: 16 },

  // Book content
  bookContent: { gap: 12 },

  // Section (Book tab)
  section: { gap: 0 },
  sectionLabel: {
    color: T.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  sectionBody: {
    backgroundColor: T.surface,
    borderRadius: 10,
    overflow: 'hidden',
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: T.overlay,
    gap: 12,
  },
  fieldRowToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: T.overlay,
  },
  fieldLabel: { color: T.textPrimary, fontSize: 13, flex: 1 },
  fieldInput: {
    flex: 1,
    color: T.textPrimary,
    fontSize: 13,
    textAlign: 'right',
    paddingVertical: 4,
  },
  fieldInputMulti: {
    textAlign: 'left',
    minHeight: 56,
    paddingTop: 4,
  },
  fieldInputNumber: { maxWidth: 80 },

  // Providers content
  providersContent: { gap: 12 },
  providerCard: {
    backgroundColor: T.surface,
    borderRadius: 10,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: T.overlay,
    ...T.shadows.card,
  },
  providerCardActive: { borderColor: T.accent },
  providerHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  providerName: { color: T.textPrimary, fontSize: 15, fontWeight: '600', marginBottom: 4 },
  providerMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  typeBadge: {
    backgroundColor: T.overlay,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  typeBadgeText: { color: T.textSecondary, fontSize: 11 },
  providerModel: { color: T.textMuted, fontSize: 12, flex: 1 },
  activeLabel: { color: T.accent, fontSize: 11, fontWeight: '700' },
  testOk: { color: T.success, fontSize: 12 },
  testErr: { color: T.error, fontSize: 12 },
  providerActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: T.overlay,
    borderRadius: 6,
  },
  actionBtnAccent: { borderWidth: 1, borderColor: T.muted },
  actionBtnPressed: { backgroundColor: T.muted },
  actionBtnText: { color: T.textPrimary, fontSize: 13 },
  addBtn: {
    backgroundColor: T.overlay,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addBtnPressed: { backgroundColor: T.muted },
  addBtnText: { color: T.accent, fontSize: 14, fontWeight: '600' },

  // Provider form
  formCard: {
    backgroundColor: T.surface,
    borderRadius: 10,
    padding: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: T.overlay,
  },
  formTitle: { color: T.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  formLabel: { color: T.textSecondary, fontSize: 12, marginBottom: 4, marginTop: 8 },
  formFieldRow: { gap: 4 },
  formInput: {
    backgroundColor: T.overlay,
    borderRadius: 7,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: T.textPrimary,
    fontSize: 13,
  },
  typeSelector: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  typeOption: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: T.overlay,
    borderRadius: 7,
    alignItems: 'center',
  },
  typeOptionActive: { backgroundColor: T.muted },
  typeOptionText: { color: T.textMuted, fontSize: 12 },
  typeOptionTextActive: { color: T.textPrimary },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 16, justifyContent: 'flex-end' },
})
