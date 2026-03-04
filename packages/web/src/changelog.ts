export interface ChangelogSection {
  label: string
  items: string[]
}

export interface ChangelogEntry {
  date: string
  sections: ChangelogSection[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: '2026-03-03',
    sections: [
      {
        label: 'RoleCall Format',
        items: [
          'RoleCall lorebook format is now fully supported — open, edit, and export RoleCall files alongside SillyTavern and CharacterBook formats',
          'RoleCall activation settings (roles, position, depth, chance) are editable directly in the entry editor',
        ],
      },
      {
        label: 'Export',
        items: [
          'Character cards can now be exported as PNG, .charx, or JSON from the Files panel',
          'Export filenames and format labels corrected',
        ],
      },
      {
        label: 'Analysis',
        items: [
          'Analysis panel redesigned with three-column layout — categories on the left, violations in the center, full details on the right',
          'Analysis findings now show the entry name in every message for easier navigation',
          'Duplicate and overlapping keyword findings are now grouped by entry, reducing noise',
          'Long recursion-chain warnings are consolidated to one finding per chain root instead of flooding the list',
          'Analysis categories are collapsible',
          'Non-standard field severity lowered; probability and memo checks adjusted to reduce false positives',
        ],
      },
      {
        label: 'Keywords',
        items: [
          'New Keyword Inventory tab in the tools modal — browse every keyword across your lorebook with usage counts',
          'Simulator tab now shows a per-entry keyword match breakdown',
        ],
      },
      {
        label: 'Graph',
        items: [
          'Graph view has two new layout modes: Skeleton (simplified) and Clustered (grouped by activation type)',
          'Inactive edges dim when hovering a node, making connection paths easier to read',
        ],
      },
      {
        label: 'Version History',
        items: [
          'Version history is now shown inline under each open tab in the Files panel',
          'Lorewalker auto-saves before restoring a snapshot so your current state is never lost',
          'History filenames are clickable to restore directly',
          'Autosave now correctly clears the unsaved-changes indicator after saving',
        ],
      },
      {
        label: 'Editor',
        items: [
          'Entry editor header now shows separate overall lorebook health and per-entry health chips',
          'Blocked links in the editor are hidden by default with clearer toggle labels',
        ],
      },
      {
        label: 'Import',
        items: [
          'Importing a lorebook with unnamed entries now prompts you to assign keyword-based names before opening',
        ],
      },
      {
        label: 'Fixes & QoL',
        items: [
          'Cmd+O (Mac) / Ctrl+O (Win) now opens the Lorewalker file picker instead of the browser dialog',
          'Settings modal now closes on Escape key',
          'Fixed a tab hang that could occur when opening lorebooks with very dense recursion graphs',
          'Collapsed side-panel chevrons re-centered and made larger',
          "What's New dialog added — you're reading it!",
        ],
      },
      {
        label: 'Workspace Redesign',
        items: [
          'The tools modal has been replaced by two dedicated workspace overlays — the Lorebook Workspace (health, rules, insights) and the Entry Workspace (edit, insights)',
          'Each workspace opens as a large full-screen overlay, keeping the graph and entry list visible in the background',
        ],
      },
      {
        label: 'Sidebar',
        items: [
          'The right-side panel has been redesigned with four unified tabs: Edit, Health, Simulator, and Keywords',
          '"Analysis" has been renamed to "Health" throughout the sidebar and workspace',
          'Keywords tab is now read-only — browse keywords and keyword reach without accidentally editing',
          'Keyword editing has moved into the Edit tab, alongside the rest of entry field editing',
          'Simulator tab now includes a "Simulate this entry" button for quick per-entry activation testing',
        ],
      },
      {
        label: 'Insights',
        items: [
          'New Insights tab in both workspaces',
          'Entry Workspace Insights: keyword reach percentage table and simulate-this-entry panel',
          'Lorebook Workspace Insights: full lorebook simulator and bulk LLM categorization',
        ],
      },
      {
        label: 'Settings',
        items: [
          'Settings dialog navigation items now show icons alongside section labels',
          'Active section is highlighted with a left-edge accent indicator',
        ],
      },
      {
        label: 'Performance',
        items: [
          'Entry list is now virtualized — lorebooks with hundreds of entries scroll smoothly without rendering every row',
        ],
      },
    ],
  },
  // older entries below as history builds up
]

/** ISO date string of the newest entry */
export const LATEST_CHANGELOG_DATE: string = CHANGELOG[0].date
