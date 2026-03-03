import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import type { TabParamList } from './AppNavigator'
import { ImportScreen } from './ImportScreen'

type Props = BottomTabScreenProps<TabParamList, 'Settings'>

export function SettingsScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Settings</Text>
      <ImportScreen
        onImportSuccess={() => {
          navigation.navigate('Entries')
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e1e2e', padding: 20 },
  header: { color: '#cdd6f4', fontSize: 22, fontWeight: '700', marginBottom: 24 },
})
