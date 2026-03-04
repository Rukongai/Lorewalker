import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { T } from '../../theme/tokens'

export interface ConnectionRow {
  id: string
  name: string
  keywords: string[]
  blocked: boolean
}

interface ConnectionsListProps {
  incoming: ConnectionRow[]
  outgoing: ConnectionRow[]
}

function LinkEntry({ name, keywords, blocked }: ConnectionRow) {
  return (
    <View style={styles.linkEntry}>
      <Text style={[styles.entryName, blocked && styles.blocked]} numberOfLines={1}>
        {name}
      </Text>
      <View style={styles.keywords}>
        {keywords.map((kw, i) => (
          <Text key={i} style={styles.keywordChip}>{kw}</Text>
        ))}
        {blocked && <Text style={styles.blockedLabel}>blocked</Text>}
      </View>
    </View>
  )
}

function Column({ title, rows }: { title: string; rows: ConnectionRow[] }) {
  const visible = rows.filter((r) => !r.blocked)
  return (
    <View style={styles.column}>
      <Text style={styles.colHeader}>{title} [{visible.length}/{rows.length}]</Text>
      <ScrollView>
        {visible.length === 0 ? (
          <Text style={styles.empty}>None</Text>
        ) : (
          visible.map((row) => <LinkEntry key={row.id} {...row} />)
        )}
      </ScrollView>
    </View>
  )
}

export function ConnectionsList({ incoming, outgoing }: ConnectionsListProps) {
  return (
    <View style={styles.container}>
      <Column title="Activates This" rows={incoming} />
      <View style={styles.divider} />
      <Column title="This Activates" rows={outgoing} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', flex: 1 },
  column: { flex: 1, padding: 10 },
  colHeader: { fontSize: 10, fontWeight: '700', color: T.textMuted, letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' },
  divider: { width: 1, backgroundColor: T.overlay },
  linkEntry: { marginBottom: 10 },
  entryName: { fontSize: 12, color: T.textPrimary, marginBottom: 3 },
  blocked: { textDecorationLine: 'line-through', color: T.textSubtle },
  keywords: { flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  keywordChip: { fontSize: 10, paddingHorizontal: 5, paddingVertical: 2, backgroundColor: T.selectiveChip, color: T.selective, borderRadius: 4 },
  blockedLabel: { fontSize: 9, color: T.warning },
  empty: { fontSize: 11, color: T.textSubtle, fontStyle: 'italic' },
})
