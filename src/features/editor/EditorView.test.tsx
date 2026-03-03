import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import type { WorkingEntry, BookMeta } from '@/types'
import { EditorView } from './EditorView'

// ---- Mock lazy variants ----

vi.mock('./variants/sillytavern/STEntryFields', () => ({
  STEntryFields: () => <div data-testid="st-entry-fields" />,
}))
vi.mock('./variants/sillytavern/STBookMetaFields', () => ({
  STBookMetaFields: () => <div data-testid="st-book-meta-fields" />,
}))
vi.mock('./variants/rolecall/RCEntryFields', () => ({
  RCEntryFields: () => <div data-testid="rc-entry-fields" />,
}))
vi.mock('./variants/rolecall/RCBookMetaFields', () => ({
  RCBookMetaFields: () => <div data-testid="rc-book-meta-fields" />,
}))

// ---- Mock ContentField to avoid CodeMirror in jsdom ----

vi.mock('./ContentField', () => ({
  ContentField: () => <div data-testid="content-field" />,
}))

// ---- Fixture factories ----

function makeEntry(overrides: Partial<WorkingEntry> = {}): WorkingEntry {
  return {
    id: overrides.id ?? 'test-id',
    uid: 0,
    name: overrides.name ?? 'Test Entry',
    content: overrides.content ?? 'Some content',
    keys: overrides.keys ?? ['testkey'],
    secondaryKeys: overrides.secondaryKeys ?? [],
    constant: overrides.constant ?? false,
    selective: overrides.selective ?? false,
    selectiveLogic: 0,
    enabled: overrides.enabled ?? true,
    position: overrides.position ?? 0,
    order: overrides.order ?? 100,
    depth: 4,
    delay: 0,
    cooldown: 0,
    sticky: 0,
    probability: 100,
    preventRecursion: overrides.preventRecursion ?? false,
    excludeRecursion: false,
    ignoreBudget: overrides.ignoreBudget ?? false,
    group: '',
    groupOverride: false,
    groupWeight: 100,
    useGroupScoring: null,
    scanDepth: null,
    caseSensitive: null,
    matchWholeWords: null,
    matchPersonaDescription: false,
    matchCharacterDescription: false,
    matchCharacterPersonality: false,
    matchCharacterDepthPrompt: false,
    matchScenario: false,
    matchCreatorNotes: false,
    role: 0,
    automationId: '',
    outletName: '',
    vectorized: overrides.vectorized ?? false,
    useProbability: overrides.useProbability ?? true,
    addMemo: overrides.addMemo ?? true,
    displayIndex: null,
    delayUntilRecursion: 0,
    triggers: [],
    characterFilter: { isExclude: false, names: [], tags: [] },
    tokenCount: overrides.tokenCount ?? 0,
    extensions: {},
    ...overrides,
  }
}

function makeBookMeta(overrides: Partial<BookMeta> = {}): BookMeta {
  return {
    name: '',
    description: '',
    scanDepth: 4,
    tokenBudget: 2048,
    contextSize: 200000,
    recursiveScan: false,
    caseSensitive: false,
    matchWholeWords: false,
    extensions: {},
    minActivations: 0,
    maxDepth: 0,
    maxRecursionSteps: 0,
    insertionStrategy: 'evenly',
    includeNames: false,
    useGroupScoring: false,
    alertOnOverflow: false,
    budgetCap: 0,
    ...overrides,
  }
}

// ---- Tests ----

describe('EditorView', () => {
  // --- entry scope — no entry ---

  describe('entry scope — no entry', () => {
    it('renders empty state', () => {
      render(
        <EditorView
          scope="entry"
          activeFormat="sillytavern"
          onEntryChange={vi.fn()}
        />
      )
      expect(screen.getByText('Select an entry to edit')).toBeInTheDocument()
    })
  })

  // --- entry scope — sillytavern format ---

  describe('entry scope — sillytavern format', () => {
    function renderST() {
      return render(
        <EditorView
          scope="entry"
          activeFormat="sillytavern"
          entry={makeEntry()}
          onEntryChange={vi.fn()}
        />
      )
    }

    it('renders ContentField', () => {
      renderST()
      expect(screen.getByTestId('content-field')).toBeInTheDocument()
    })

    it('renders ActivationFields (not RCEntryFields)', () => {
      renderST()
      // ActivationFields renders "Insertion Strategy" label
      expect(screen.getByText(/Insertion Strategy/i)).toBeInTheDocument()
    })

    it('renders PriorityFields', () => {
      renderST()
      // PriorityFields renders inside "Insertion" FieldGroup
      expect(screen.getByText('Insertion')).toBeInTheDocument()
    })

    it('renders TimedEffectFields (isPlatform)', () => {
      renderST()
      // TimedEffectFields renders "Delay" label
      expect(screen.getByText('Timed Effects')).toBeInTheDocument()
    })

    it('renders RecursionFields', () => {
      renderST()
      expect(screen.getByText('Recursion')).toBeInTheDocument()
    })

    it('renders BudgetFields (ST-only)', () => {
      renderST()
      // BudgetFields is in a FieldGroup labeled "Budget" (ST-only)
      expect(screen.getByText('Budget')).toBeInTheDocument()
    })

    it('renders AdvancedFields (ST-only)', () => {
      renderST()
      expect(screen.getByText('Advanced')).toBeInTheDocument()
    })

    it('renders STEntryFields lazy (Triggers)', async () => {
      renderST()
      expect(await screen.findByTestId('st-entry-fields')).toBeInTheDocument()
    })

    it('does not render rc-entry-fields', async () => {
      renderST()
      // Give lazy loading a chance to resolve, then check absence
      await screen.findByTestId('st-entry-fields')
      expect(screen.queryByTestId('rc-entry-fields')).not.toBeInTheDocument()
    })
  })

  // --- entry scope — rolecall format ---

  describe('entry scope — rolecall format', () => {
    function renderRC() {
      return render(
        <EditorView
          scope="entry"
          activeFormat="rolecall"
          entry={makeEntry()}
          onEntryChange={vi.fn()}
        />
      )
    }

    it('renders RCEntryFields (replaces ActivationFields)', async () => {
      renderRC()
      expect(await screen.findByTestId('rc-entry-fields')).toBeInTheDocument()
    })

    it('does not render st-entry-fields', async () => {
      renderRC()
      // Give RC entry fields a tick to resolve, then check ST absence
      await screen.findByTestId('rc-entry-fields')
      expect(screen.queryByTestId('st-entry-fields')).not.toBeInTheDocument()
    })

    it('does not render BudgetFields', () => {
      renderRC()
      // BudgetFields contains "Ignore Budget" label - only ST renders it
      expect(screen.queryByText('Ignore Budget')).not.toBeInTheDocument()
    })

    it('does not render AdvancedFields', () => {
      renderRC()
      // AdvancedFields contains "Automation ID" - only ST renders it
      expect(screen.queryByText('Automation ID')).not.toBeInTheDocument()
    })
  })

  // --- entry scope — ccv3 format ---

  describe('entry scope — ccv3 format', () => {
    function renderCCv3() {
      return render(
        <EditorView
          scope="entry"
          activeFormat="ccv3"
          entry={makeEntry()}
          onEntryChange={vi.fn()}
        />
      )
    }

    it('renders ActivationFields', () => {
      renderCCv3()
      expect(screen.getByText(/Insertion Strategy/i)).toBeInTheDocument()
    })

    it('does not render st-entry-fields', () => {
      renderCCv3()
      expect(screen.queryByTestId('st-entry-fields')).not.toBeInTheDocument()
    })

    it('does not render rc-entry-fields', () => {
      renderCCv3()
      expect(screen.queryByTestId('rc-entry-fields')).not.toBeInTheDocument()
    })

    it('does not render BudgetFields (not ST)', () => {
      renderCCv3()
      expect(screen.queryByText('Ignore Budget')).not.toBeInTheDocument()
    })
  })

  // --- lorebook scope — no bookMeta ---

  describe('lorebook scope — no bookMeta', () => {
    it('renders empty state', () => {
      render(
        <EditorView
          scope="lorebook"
          activeFormat="sillytavern"
          onBookMetaChange={vi.fn()}
        />
      )
      expect(screen.getByText('No book open')).toBeInTheDocument()
    })
  })

  // --- lorebook scope — sillytavern format ---

  describe('lorebook scope — sillytavern format', () => {
    function renderSTBook() {
      return render(
        <EditorView
          scope="lorebook"
          activeFormat="sillytavern"
          bookMeta={makeBookMeta()}
          onBookMetaChange={vi.fn()}
          onFormatChange={vi.fn()}
        />
      )
    }

    it('renders format toggle', () => {
      renderSTBook()
      expect(screen.getByText('SillyTavern')).toBeInTheDocument()
    })

    it('renders Book Info fields', () => {
      renderSTBook()
      expect(screen.getByText('Book Info')).toBeInTheDocument()
    })

    it('renders shared Scanning fields', () => {
      renderSTBook()
      expect(screen.getByText('Scanning')).toBeInTheDocument()
    })

    it('renders shared Budget fields', () => {
      renderSTBook()
      expect(screen.getByText('Budget')).toBeInTheDocument()
    })

    it('renders STBookMetaFields', async () => {
      renderSTBook()
      expect(await screen.findByTestId('st-book-meta-fields')).toBeInTheDocument()
    })

    it('does not render rc-book-meta-fields', async () => {
      renderSTBook()
      await screen.findByTestId('st-book-meta-fields')
      expect(screen.queryByTestId('rc-book-meta-fields')).not.toBeInTheDocument()
    })
  })

  // --- lorebook scope — rolecall format ---

  describe('lorebook scope — rolecall format', () => {
    function renderRCBook() {
      return render(
        <EditorView
          scope="lorebook"
          activeFormat="rolecall"
          bookMeta={makeBookMeta()}
          onBookMetaChange={vi.fn()}
          onFormatChange={vi.fn()}
        />
      )
    }

    it('renders shared fields', () => {
      renderRCBook()
      expect(screen.getByText('Scanning')).toBeInTheDocument()
    })

    it('renders RCBookMetaFields', async () => {
      renderRCBook()
      expect(await screen.findByTestId('rc-book-meta-fields')).toBeInTheDocument()
    })

    it('does not render st-book-meta-fields', async () => {
      renderRCBook()
      await screen.findByTestId('rc-book-meta-fields')
      expect(screen.queryByTestId('st-book-meta-fields')).not.toBeInTheDocument()
    })
  })

  // --- lorebook scope — ccv3 format ---

  describe('lorebook scope — ccv3 format', () => {
    function renderCCv3Book() {
      return render(
        <EditorView
          scope="lorebook"
          activeFormat="ccv3"
          bookMeta={makeBookMeta()}
          onBookMetaChange={vi.fn()}
          onFormatChange={vi.fn()}
        />
      )
    }

    it('renders shared fields only', () => {
      renderCCv3Book()
      expect(screen.getByText('Scanning')).toBeInTheDocument()
    })

    it('does not render STBookMetaFields', () => {
      renderCCv3Book()
      expect(screen.queryByTestId('st-book-meta-fields')).not.toBeInTheDocument()
    })

    it('does not render RCBookMetaFields', () => {
      renderCCv3Book()
      expect(screen.queryByTestId('rc-book-meta-fields')).not.toBeInTheDocument()
    })
  })
})
