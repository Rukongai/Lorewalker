import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { T } from '../../theme/tokens'
import { EmptyState } from '../../components/EmptyState'
import {
  useWorkspaceStore,
  documentStoreRegistry,
  simulate,
} from '@lorewalker/core'
import type { ActivationResult, ActivatedEntry, SkippedEntry } from '@lorewalker/core'

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true)
}

interface SimSettings {
  scanDepth: number
  tokenBudget: number
  maxRecursionSteps: number
  caseSensitive: boolean
  matchWholeWords: boolean
  includeNames: boolean
}

function activationBadgeColor(activatedBy: ActivatedEntry['activatedBy']): string {
  if (activatedBy === 'constant') return T.keyword
  if (activatedBy === 'recursion') return T.accent
  return T.selective
}

function skipBadgeColor(reason: SkippedEntry['reason']): string {
  if (reason === 'budget-exhausted') return T.error
  if (reason === 'probability-failed') return T.peach
  if (reason === 'cooldown') return T.warning
  return T.textMuted
}

function TokenBudgetBar({ used, budget }: { used: number; budget: number }) {
  const pct = budget > 0 ? Math.min(used / budget, 1) : 0
  const barColor = pct >= 0.95 ? T.error : pct >= 0.8 ? T.warning : T.success
  return (
    <View style={styles.budgetContainer}>
      <View style={styles.budgetTrack}>
        <View style={[styles.budgetFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: barColor }]} />
      </View>
      <Text style={[styles.budgetLabel, { color: barColor }]}>
        {used} / {budget} tokens
      </Text>
    </View>
  )
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <View style={styles.numberStepper}>
        <Pressable
          onPress={() => onChange(Math.max(0, value - 1))}
          style={styles.stepBtn}
        >
          <Text style={styles.stepBtnText}>−</Text>
        </Pressable>
        <Text style={styles.stepValue}>{value}</Text>
        <Pressable onPress={() => onChange(value + 1)} style={styles.stepBtn}>
          <Text style={styles.stepBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  )
}

function ToggleField({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Pressable
        onPress={() => onChange(!value)}
        style={[styles.toggle, value && styles.toggleOn]}
      >
        <Text style={[styles.toggleText, value && styles.toggleTextOn]}>
          {value ? 'On' : 'Off'}
        </Text>
      </Pressable>
    </View>
  )
}

export function LorebookSimulatorView({ topInset = 0, bottomInset = 0 }: { topInset?: number; bottomInset?: number }) {
  const activeTabId = useWorkspaceStore((s) => s.activeTabId)
  const store = activeTabId ? documentStoreRegistry.get(activeTabId) : null
  const entries = store?.getState().entries ?? []
  const bookMeta = store?.getState().bookMeta

  const [message, setMessage] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [result, setResult] = useState<ActivationResult | null>(null)

  const [settings, setSettings] = useState<SimSettings | null>(null)

  // Lazily initialize settings from bookMeta once available
  const effectiveSettings: SimSettings = settings ?? {
    scanDepth: bookMeta?.scanDepth ?? 4,
    tokenBudget: bookMeta?.tokenBudget ?? 4096,
    maxRecursionSteps: bookMeta?.maxRecursionSteps ?? 3,
    caseSensitive: bookMeta?.caseSensitive ?? false,
    matchWholeWords: bookMeta?.matchWholeWords ?? false,
    includeNames: bookMeta?.includeNames ?? false,
  }

  function patchSettings(patch: Partial<SimSettings>) {
    setSettings({ ...effectiveSettings, ...patch })
  }

  function handleRun() {
    if (!store || entries.length === 0) return
    const context = {
      messages: [{ role: 'user' as const, content: message }],
      scanDepth: effectiveSettings.scanDepth,
      tokenBudget: effectiveSettings.tokenBudget,
      caseSensitive: effectiveSettings.caseSensitive,
      matchWholeWords: effectiveSettings.matchWholeWords,
      maxRecursionSteps: effectiveSettings.maxRecursionSteps,
      includeNames: effectiveSettings.includeNames,
    }
    setResult(simulate(entries, context))
  }

  if (!store) {
    return <EmptyState icon="play-circle" title="No Lorebook Loaded" subtitle="Import a lorebook from Settings → Import" />
  }

  const entryMap = new Map(entries.map((e) => [e.id, e]))

  const constants = result?.activatedEntries.filter((ae) => ae.activatedBy === 'constant') ?? []
  const keywords = result?.activatedEntries.filter((ae) => ae.activatedBy === 'keyword') ?? []
  const recursion = result?.activatedEntries.filter((ae) => ae.activatedBy === 'recursion') ?? []
  const skipped = result?.skippedEntries.filter((se) => se.reason !== 'disabled') ?? []

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingTop: 16 + topInset, paddingBottom: 16 + bottomInset }]} keyboardShouldPersistTaps="handled">
      {/* Message Input */}
      <Text style={styles.sectionHeader}>Message</Text>
      <TextInput
        style={styles.messageInput}
        value={message}
        onChangeText={setMessage}
        placeholder="Type a message to simulate..."
        placeholderTextColor={T.textMuted}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      {/* Run Button */}
      <Pressable
        onPress={handleRun}
        style={({ pressed }) => [styles.runButton, pressed && styles.runButtonPressed]}
      >
        <Text style={styles.runButtonText}>Run Simulation</Text>
      </Pressable>

      {/* Settings Toggle */}
      <Pressable
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
          setSettingsOpen((v) => !v)
        }}
        style={styles.settingsToggle}
      >
        <Feather
          name={settingsOpen ? 'chevron-up' : 'sliders'}
          size={14}
          color={T.textSecondary}
          style={styles.settingsIcon}
        />
        <Text style={styles.settingsToggleText}>
          {settingsOpen ? 'Hide Settings' : 'Settings'}
        </Text>
      </Pressable>

      {settingsOpen && (
        <View style={[styles.settingsPanel, T.shadows.card]}>
          <NumberField
            label="Scan Depth"
            value={effectiveSettings.scanDepth}
            onChange={(v) => patchSettings({ scanDepth: v })}
          />
          <NumberField
            label="Token Budget"
            value={effectiveSettings.tokenBudget}
            onChange={(v) => patchSettings({ tokenBudget: v })}
          />
          <NumberField
            label="Recursion Steps"
            value={effectiveSettings.maxRecursionSteps}
            onChange={(v) => patchSettings({ maxRecursionSteps: v })}
          />
          <ToggleField
            label="Case Sensitive"
            value={effectiveSettings.caseSensitive}
            onChange={(v) => patchSettings({ caseSensitive: v })}
          />
          <ToggleField
            label="Whole Words"
            value={effectiveSettings.matchWholeWords}
            onChange={(v) => patchSettings({ matchWholeWords: v })}
          />
          <ToggleField
            label="Include Names"
            value={effectiveSettings.includeNames}
            onChange={(v) => patchSettings({ includeNames: v })}
          />
        </View>
      )}

      {/* Results */}
      {result !== null && (
        <>
          <View style={styles.divider} />
          <Text style={styles.sectionHeader}>Results</Text>

          <TokenBudgetBar used={result.totalTokens} budget={effectiveSettings.tokenBudget} />

          {result.activatedEntries.length === 0 ? (
            <Text style={styles.emptyState}>No entries activated.</Text>
          ) : (
            <>
              {constants.length > 0 && (
                <ActivationGroup label="Constants" entries={constants} entryMap={entryMap} />
              )}
              {keywords.length > 0 && (
                <ActivationGroup label="Keywords" entries={keywords} entryMap={entryMap} />
              )}
              {recursion.length > 0 && (
                <ActivationGroup label="Recursion" entries={recursion} entryMap={entryMap} />
              )}
            </>
          )}

          {skipped.length > 0 && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionHeader}>Skipped</Text>
              {skipped.map((se) => {
                const e = entryMap.get(se.entryId)
                return (
                  <View key={se.entryId} style={styles.resultRow}>
                    <Text style={styles.resultName} numberOfLines={1}>
                      {e?.name ?? se.entryId}
                    </Text>
                    <View style={[styles.badge, { backgroundColor: skipBadgeColor(se.reason) }]}>
                      <Text style={styles.badgeText}>{se.reason}</Text>
                    </View>
                  </View>
                )
              })}
            </>
          )}
        </>
      )}
    </ScrollView>
  )
}

function ActivationGroup({
  label,
  entries,
  entryMap,
}: {
  label: string
  entries: ActivatedEntry[]
  entryMap: Map<string, { name: string }>
}) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label}</Text>
      {entries.map((ae) => {
        const e = entryMap.get(ae.entryId)
        return (
          <View key={ae.entryId} style={styles.resultRow}>
            <Text style={styles.resultName} numberOfLines={1}>
              {e?.name ?? ae.entryId}
            </Text>
            {ae.matchedKeywords.length > 0 && (
              <Text style={styles.resultKeywords} numberOfLines={1}>
                {ae.matchedKeywords.join(', ')}
              </Text>
            )}
            <View style={[styles.badge, { backgroundColor: activationBadgeColor(ae.activatedBy) }]}>
              <Text style={styles.badgeDark}>{ae.activatedBy}</Text>
            </View>
            <Text style={styles.resultTokens}>{ae.tokenCost}tk</Text>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: T.bg },
  content: { padding: 16, gap: 0 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: T.bg },
  emptyText: { color: T.textPrimary, fontSize: 16, marginBottom: 8 },
  emptySubtext: { color: T.textMuted, fontSize: 13 },
  sectionHeader: {
    color: T.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 4,
  },
  messageInput: {
    backgroundColor: T.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.overlay,
    color: T.textPrimary,
    fontSize: 14,
    padding: 12,
    minHeight: 96,
    marginBottom: 12,
  },
  runButton: {
    backgroundColor: T.accent,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  runButtonPressed: { backgroundColor: T.accentAlt },
  runButtonText: { color: T.black, fontSize: 15, fontWeight: '700' },
  settingsToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 6, marginBottom: 4 },
  settingsIcon: {},
  settingsToggleText: { color: T.textSecondary, fontSize: 13 },
  settingsPanel: {
    backgroundColor: T.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLabel: { color: T.textPrimary, fontSize: 13 },
  numberStepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: {
    width: 28,
    height: 28,
    backgroundColor: T.overlay,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { color: T.textPrimary, fontSize: 16 },
  stepValue: { color: T.textPrimary, fontSize: 14, minWidth: 32, textAlign: 'center' },
  toggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: T.overlay,
    borderRadius: 6,
  },
  toggleOn: { backgroundColor: T.muted },
  toggleText: { color: T.textMuted, fontSize: 13 },
  toggleTextOn: { color: T.textPrimary },
  divider: { height: 1, backgroundColor: T.overlay, marginVertical: 14 },
  budgetContainer: { marginBottom: 12, gap: 6 },
  budgetTrack: {
    height: 6,
    backgroundColor: T.overlay,
    borderRadius: 3,
    overflow: 'hidden',
  },
  budgetFill: { height: 6, borderRadius: 3 },
  budgetLabel: { fontSize: 12 },
  emptyState: { color: T.textMuted, fontSize: 13, paddingVertical: 4 },
  group: { marginBottom: 10 },
  groupLabel: {
    color: T.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.surface,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
    marginBottom: 4,
  },
  resultName: { flex: 1, color: T.textPrimary, fontSize: 13 },
  resultKeywords: { color: T.selective, fontSize: 11, maxWidth: 100 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { color: T.black, fontSize: 10, fontWeight: '600' },
  badgeDark: { color: T.badgeDark, fontSize: 10, fontWeight: '600' },
  resultTokens: { color: T.textMuted, fontSize: 11, minWidth: 36, textAlign: 'right' },
})
