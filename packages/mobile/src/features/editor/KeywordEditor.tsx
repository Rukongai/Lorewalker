import { useState, useRef } from 'react'
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native'
import { T } from '../../theme/tokens'

interface KeywordEditorProps {
  value: string[]
  onChange: (keywords: string[]) => void
  placeholder?: string
  variant?: 'primary' | 'secondary'
}

export function KeywordEditor({
  value,
  onChange,
  placeholder = 'Add keyword…',
  variant = 'primary',
}: KeywordEditorProps) {
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<TextInput>(null)

  function commitInput(text?: string) {
    const raw = (text ?? inputValue).trim()
    if (!raw) return
    const isDuplicate = value.some((k) => k.toLowerCase() === raw.toLowerCase())
    setInputValue('')
    if (isDuplicate) return
    onChange([...value, raw])
  }

  function handleSubmitEditing() {
    commitInput()
  }

  function handleChangeText(text: string) {
    if (text.endsWith(',')) {
      commitInput(text.slice(0, -1))
    } else {
      setInputValue(text)
    }
  }

  function removeKeyword(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  const pillBg = variant === 'primary' ? T.selectiveBg : T.accentBg
  const pillBorder = variant === 'primary' ? T.selective : T.accent
  const pillText = variant === 'primary' ? T.selective : T.accent

  return (
    <Pressable style={styles.container} onPress={() => inputRef.current?.focus()}>
      <ScrollView
        horizontal={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.pillRow}>
          {value.map((kw, i) => (
            <View key={`${kw}-${i}`} style={[styles.pill, { backgroundColor: pillBg, borderColor: pillBorder }]}>
              <Text style={[styles.pillText, { color: pillText }]}>{kw}</Text>
              <Pressable onPress={() => removeKeyword(i)} style={styles.removeBtn} hitSlop={6}>
                <Text style={[styles.removeText, { color: pillText }]}>×</Text>
              </Pressable>
            </View>
          ))}
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={inputValue}
            onChangeText={handleChangeText}
            onSubmitEditing={handleSubmitEditing}
            placeholder={value.length === 0 ? placeholder : undefined}
            placeholderTextColor={T.textSubtle}
            returnKeyType="done"
            blurOnSubmit={false}
          />
        </View>
      </ScrollView>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: T.overlay,
    borderWidth: 1,
    borderColor: T.muted,
    borderRadius: 6,
    minHeight: 38,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  scroll: {
    maxHeight: 120,
  },
  scrollContent: {
    flexGrow: 1,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 4,
  },
  pillText: {
    fontSize: 12,
  },
  removeBtn: {
    paddingHorizontal: 2,
  },
  removeText: {
    fontSize: 14,
    lineHeight: 16,
  },
  input: {
    color: T.textPrimary,
    fontSize: 13,
    minWidth: 80,
    flex: 1,
    paddingVertical: 2,
  },
})
