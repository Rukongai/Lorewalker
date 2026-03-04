import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LorebookSimulatorView } from '../../features/simulator'

export function SimulatorScreen() {
  const insets = useSafeAreaInsets()
  return <LorebookSimulatorView topInset={insets.top} bottomInset={insets.bottom} />
}
