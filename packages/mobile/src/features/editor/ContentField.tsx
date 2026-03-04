import { View, TextInput, Text, StyleSheet } from 'react-native'
import { T } from '../../theme/tokens'

interface ContentFieldProps {
  value: string
  onChange: (value: string) => void
  preventRecursion?: boolean
}

export function ContentField({ value, onChange, preventRecursion = false }: ContentFieldProps) {
  return (
    <View style={styles.container}>
      <TextInput
        style={[styles.input, preventRecursion && styles.inputDisabled]}
        value={value}
        onChangeText={onChange}
        multiline
        textAlignVertical="top"
        placeholder="Entry content…"
        placeholderTextColor={T.textSubtle}
        editable={!preventRecursion}
      />
      <View style={styles.footer}>
        {preventRecursion && (
          <Text style={styles.warningText}>Recursion prevention active</Text>
        )}
        <Text style={styles.charCount}>{value.length} chars</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
    flexDirection: 'column',
  },
  input: {
    backgroundColor: T.overlay,
    borderWidth: 1,
    borderColor: T.muted,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: T.textPrimary,
    minHeight: 120,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  charCount: {
    color: T.textMuted,
    fontSize: 11,
    textAlign: 'right',
    flex: 1,
  },
  warningText: {
    color: T.error,
    fontSize: 11,
  },
})
