import { View, Text, StyleSheet } from 'react-native'

export function KeywordsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Keywords — coming soon</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1e1e2e' },
  text: { color: '#cdd6f4', fontSize: 16 },
})
