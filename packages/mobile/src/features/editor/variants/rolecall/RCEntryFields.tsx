import { View, Text, Pressable, StyleSheet } from 'react-native'
import type { WorkingEntry, RoleCallKeyword } from '@lorewalker/core'
import { KeywordEditor } from '../../KeywordEditor'
import { KeywordObjectsEditor } from './KeywordObjectsEditor'

interface Props {
  entry: WorkingEntry
  onChange: (patch: Partial<WorkingEntry>) => void
}

export function RCEntryFields({ entry, onChange }: Props) {
  const isConstant = entry.constant
  const isAdvanced = entry.triggerMode === 'advanced'

  function handleModeChange(constant: boolean) {
    onChange({ constant })
  }

  function handleTriggerModeChange(advanced: boolean) {
    if (advanced) {
      const keywordObjects: RoleCallKeyword[] = entry.keys.map((k) => ({
        keyword: k,
        isRegex: false,
        probability: 100,
        frequency: 1,
      }))
      onChange({ triggerMode: 'advanced', keywordObjects })
    } else {
      const keys = (entry.keywordObjects ?? []).map((kw) => kw.keyword).filter((k) => k.trim() !== '')
      onChange({ triggerMode: 'simple', keys, keywordObjects: [] })
    }
  }

  return (
    <View style={styles.container}>
      {/* Mode toggle */}
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Mode</Text>
        <View style={styles.segmentRow}>
          <Pressable
            style={[styles.segmentBtn, isConstant && styles.segmentBtnActiveOrange]}
            onPress={() => handleModeChange(true)}
          >
            <Text style={[styles.segmentText, isConstant && styles.segmentTextOrange]}>Constant</Text>
          </Pressable>
          <Pressable
            style={[styles.segmentBtn, !isConstant && styles.segmentBtnActiveBlue]}
            onPress={() => handleModeChange(false)}
          >
            <Text style={[styles.segmentText, !isConstant && styles.segmentTextBlue]}>Selective</Text>
          </Pressable>
        </View>
      </View>

      {/* Selective controls */}
      {!isConstant && (
        <>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Trigger</Text>
            <View style={styles.segmentRow}>
              <Pressable
                style={[styles.segmentBtn, !isAdvanced && styles.segmentBtnActiveBlue]}
                onPress={() => handleTriggerModeChange(false)}
              >
                <Text style={[styles.segmentText, !isAdvanced && styles.segmentTextBlue]}>Simple</Text>
              </Pressable>
              <Pressable
                style={[styles.segmentBtn, isAdvanced && styles.segmentBtnActiveBlue]}
                onPress={() => handleTriggerModeChange(true)}
              >
                <Text style={[styles.segmentText, isAdvanced && styles.segmentTextBlue]}>Advanced</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Keywords</Text>
            {isAdvanced ? (
              <KeywordObjectsEditor
                keywords={entry.keywordObjects ?? []}
                onChange={(keywordObjects) => onChange({ keywordObjects })}
              />
            ) : (
              <KeywordEditor
                value={entry.keys}
                onChange={(keys) => onChange({ keys })}
                placeholder="Add keyword…"
              />
            )}
          </View>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 10, flexDirection: 'column' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toggleLabel: { color: '#a6adc8', fontSize: 11, width: 48 },
  segmentRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#45475a',
    borderRadius: 6,
    overflow: 'hidden',
  },
  segmentBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#313244',
  },
  segmentBtnActiveBlue: { backgroundColor: 'rgba(137,180,250,0.15)' },
  segmentBtnActiveOrange: { backgroundColor: 'rgba(249,226,175,0.15)' },
  segmentText: { color: '#6c7086', fontSize: 12 },
  segmentTextBlue: { color: '#89b4fa', fontWeight: '600' },
  segmentTextOrange: { color: '#f9e2af', fontWeight: '600' },
  section: { gap: 6, flexDirection: 'column' },
  sectionLabel: { color: '#a6adc8', fontSize: 11 },
})
