import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RulesView } from './RulesView'

// WorkspaceStore is real Zustand singleton with default state:
//   customRules: [], disabledBuiltinRuleIds: []
// tabId={null} → EMPTY_STORE → ruleOverrides has empty arrays
// Default rubric always has rules across all categories

describe('RulesView', () => {
  it('renders without crashing with tabId={null}', () => {
    render(<RulesView tabId={null} />)
    expect(screen.getByText('All')).toBeInTheDocument()
  })

  it('shows category headers from default rubric', () => {
    render(<RulesView tabId={null} />)
    expect(screen.getByText('Keywords')).toBeInTheDocument()
  })

  it('shows New button for custom rule creation', () => {
    render(<RulesView tabId={null} />)
    expect(screen.getByText('New')).toBeInTheDocument()
  })

  it('shows empty selection state by default', () => {
    render(<RulesView tabId={null} />)
    expect(screen.getByText(/Select a rule/)).toBeInTheDocument()
  })
})
