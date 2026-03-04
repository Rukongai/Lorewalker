import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LorebookHealthView } from '../../features/health'

export function HealthScreen() {
  const insets = useSafeAreaInsets()
  return <LorebookHealthView topInset={insets.top} bottomInset={insets.bottom} />
}
