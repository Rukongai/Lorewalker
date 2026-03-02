import { Analytics } from '@vercel/analytics/react'
import { WorkspaceShell } from '@/components/workspace/WorkspaceShell'

export function App() {
  return (
    <>
      <WorkspaceShell />
      <Analytics />
    </>
  )
}
