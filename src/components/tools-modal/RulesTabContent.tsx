import { RulesView } from '@/features/rules/RulesView'

interface RulesTabContentProps {
  tabId: string | null
}

export function RulesTabContent({ tabId }: RulesTabContentProps) {
  return <RulesView tabId={tabId} />
}
