import { View, Text, StyleSheet } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { EntriesStackParamList } from './AppNavigator'

type Props = NativeStackScreenProps<EntriesStackParamList, 'Entry'>

export function EntryScreen({ route }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Entry Detail</Text>
      <Text style={styles.sub}>{route.params.entryId}</Text>
      <Text style={styles.text}>Entry editor — coming soon</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1e1e2e', padding: 16 },
  title: { color: '#cdd6f4', fontSize: 20, fontWeight: '600', marginBottom: 8 },
  sub: { color: '#6c7086', fontSize: 12, marginBottom: 16 },
  text: { color: '#cdd6f4', fontSize: 16 },
})
