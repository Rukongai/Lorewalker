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
    ],
  },
  // older entries below as history builds up
]

/** ISO date string of the newest entry */
export const LATEST_CHANGELOG_DATE: string = CHANGELOG[0].date
