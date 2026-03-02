import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { WorkspaceShell } from '@/components/workspace/WorkspaceShell'

export function App() {
  return (
    <>
      <WorkspaceShell />
      <Analytics />
      <SpeedInsights />
    </>
  )
}
