import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LorebookKeywordsView } from '../../features/keywords'

export function KeywordsScreen() {
  const insets = useSafeAreaInsets()
  return <LorebookKeywordsView topInset={insets.top} bottomInset={insets.bottom} />
}
