import { View, Text, TextInput, Switch, Pressable, StyleSheet } from 'react-native'
import type { RoleCallKeyword } from '@lorewalker/core'
import { inputStyle } from '../../primitives'

interface Props {
  keywords: RoleCallKeyword[]
  onChange: (keywords: RoleCallKeyword[]) => void
}

export function KeywordObjectsEditor({ keywords, onChange }: Props) {
  function updateKeyword(index: number, patch: Partial<RoleCallKeyword>) {
    const next = keywords.map((kw, i) => (i === index ? { ...kw, ...patch } : kw))
    onChange(next)
  }

  function removeKeyword(index: number) {
    onChange(keywords.filter((_, i) => i !== index))
  }

  function addKeyword() {
    onChange([...keywords, { keyword: '', isRegex: false, probability: 100, frequency: 1 }])
  }

  return (
    <View style={styles.container}>
      {keywords.map((kw, i) => (
        <KeywordRow
          key={i}
          keyword={kw}
          onChange={(patch) => updateKeyword(i, patch)}
          onRemove={() => removeKeyword(i)}
        />
      ))}
      <Pressable onPress={addKeyword} style={styles.addBtn}>
        <Text style={styles.addText}>+ Add Keyword</Text>
      </Pressable>
    </View>
  )
}

function KeywordRow({
  keyword,
  onChange,
  onRemove,
}: {
  keyword: RoleCallKeyword
  onChange: (patch: Partial<RoleCallKeyword>) => void
  onRemove: () => void
}) {
  return (
    <View style={rowStyles.container}>
      <View style={rowStyles.main}>
        <TextInput
          style={[inputStyle, rowStyles.keywordInput]}
          value={keyword.keyword}
          onChangeText={(v) => onChange({ keyword: v })}
          placeholder="keyword"
          placeholderTextColor="#585b70"
        />
        <Pressable onPress={onRemove} style={rowStyles.removeBtn} hitSlop={8}>
          <Text style={rowStyles.removeText}>✕</Text>
        </Pressable>
      </View>
      <View style={rowStyles.numbers}>
        <View style={rowStyles.numField}>
          <Text style={rowStyles.numLabel}>Prob %</Text>
          <TextInput
            style={[inputStyle, rowStyles.numInput]}
            value={String(keyword.probability)}
            onChangeText={(v) =>
              onChange({ probability: Math.min(100, Math.max(0, Number(v) || 0)) })
            }
            keyboardType="numeric"
            selectTextOnFocus
          />
        </View>
        <View style={rowStyles.numField}>
          <Text style={rowStyles.numLabel}>Cooldown</Text>
          <TextInput
            style={[inputStyle, rowStyles.numInput]}
            value={String(keyword.frequency ?? 1)}
            onChangeText={(v) => onChange({ frequency: Math.max(0, Number(v) || 0) })}
            keyboardType="numeric"
            selectTextOnFocus
          />
        </View>
        <View style={rowStyles.switchField}>
          <Text style={rowStyles.numLabel}>Regex</Text>
          <Switch
            value={keyword.isRegex}
            onValueChange={(val) => onChange({ isRegex: val })}
            trackColor={{ false: '#313244', true: '#89b4fa' }}
            thumbColor="#cdd6f4"
          />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 8, flexDirection: 'column' },
  addBtn: { paddingVertical: 6 },
  addText: { color: '#89b4fa', fontSize: 13 },
})

const rowStyles = StyleSheet.create({
  container: {
    gap: 6,
    flexDirection: 'column',
    backgroundColor: '#181825',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#313244',
  },
  main: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  keywordInput: { flex: 1 },
  removeBtn: { padding: 4 },
  removeText: { color: '#f38ba8', fontSize: 14 },
  numbers: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  numField: { flex: 1, gap: 4, flexDirection: 'column' },
  numLabel: { color: '#6c7086', fontSize: 10 },
  numInput: { textAlign: 'center' },
  switchField: { alignItems: 'center', gap: 4, flexDirection: 'column' },
})
