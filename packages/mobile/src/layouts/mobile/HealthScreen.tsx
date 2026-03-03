import { View, Text, StyleSheet } from 'react-native'

export function HealthScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Health — coming soon</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1e1e2e' },
  text: { color: '#cdd6f4', fontSize: 16 },
})
