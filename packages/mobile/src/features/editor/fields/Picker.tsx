import { useState } from 'react'
import { View, Text, Pressable, Modal, FlatList, StyleSheet } from 'react-native'

interface PickerOption<T> {
  label: string
  value: T
}

interface PickerProps<T> {
  value: T
  options: PickerOption<T>[]
  onChange: (value: T) => void
  placeholder?: string
}

export function Picker<T>({ value, options, onChange }: PickerProps<T>) {
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.value === value)

  return (
    <>
      <Pressable style={styles.trigger} onPress={() => setOpen(true)}>
        <Text style={styles.triggerText} numberOfLines={1}>
          {selected?.label ?? '—'}
        </Text>
        <Text style={styles.arrow}>▾</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <FlatList
              data={options}
              keyExtractor={(item) => String(item.value)}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.option, item.value === value && styles.optionActive]}
                  onPress={() => {
                    onChange(item.value)
                    setOpen(false)
                  }}
                >
                  <Text style={[styles.optionText, item.value === value && styles.optionTextActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#313244',
    borderWidth: 1,
    borderColor: '#45475a',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  triggerText: {
    flex: 1,
    color: '#cdd6f4',
    fontSize: 13,
  },
  arrow: {
    color: '#6c7086',
    fontSize: 11,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1e1e2e',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: 320,
    paddingBottom: 16,
  },
  option: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#313244',
  },
  optionActive: {
    backgroundColor: '#1e3a5f',
  },
  optionText: {
    color: '#cdd6f4',
    fontSize: 14,
  },
  optionTextActive: {
    color: '#89b4fa',
    fontWeight: '600',
  },
})
