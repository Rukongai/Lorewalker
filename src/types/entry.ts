export type SelectiveLogic =
  | 0   // AND ANY: primary + any one secondary
  | 1   // AND ALL: primary + all secondary
  | 2   // NOT ANY: primary + none of secondary
  | 3;  // NOT ALL: primary, but not all secondary

export type EntryPosition =
  | 0   // After character card (locations, general lore, items, flavor)
  | 1   // After character card, higher priority (character backgrounds, relationships)
  | 2   // After character card (speech patterns, dialogue quirks)
  | 3   // At scene depth (combat events, weather, injuries, temporary conditions)
  | 4;  // Highest priority (fundamental world rules, physics, absolute laws)

export type LorebookFormat =
  | 'ccv3'
  | 'sillytavern'
  | 'agnai'
  | 'risu'
  | 'wyvern'
  | 'unknown';

export interface WorkingEntry {
  // === Identity ===
  id: string;                     // Internal stable UUID, assigned on import, never changes
  uid: number;                    // Format-specific UID (ST uid, CCv3 numeric id). Reconstructed on export.

  // === Content ===
  name: string;                   // Display label (ST "comment", CCv3 "name")
  content: string;                // The lore text injected into context
  keys: string[];                 // Primary activation keywords
  secondaryKeys: string[];        // Secondary keywords for selective activation

  // === Activation ===
  constant: boolean;              // Always active regardless of keywords
  selective: boolean;             // Requires both primary + secondary key match
  selectiveLogic: SelectiveLogic; // How secondary keys combine
  enabled: boolean;               // Master toggle (ST "disable" inverted)

  // === Priority ===
  position: EntryPosition;        // Where in context the entry is injected (0-4)
  order: number;                  // Priority within position (higher = inserted first)
  depth: number;                  // Context depth for injection

  // === Timed Effects ===
  delay: number;                  // Messages before entry can activate (0 = immediate)
  cooldown: number;               // Messages entry can't activate after deactivation
  sticky: number;                 // Messages entry stays active after trigger (0 = keyword-only)
  probability: number;            // Percent chance to activate when triggered (1-100)

  // === Recursion Control ===
  preventRecursion: boolean;      // If true, this entry's keys can't be triggered by other entries' content
  excludeRecursion: boolean;      // If true, this entry's content is invisible to recursive scanning

  // === Budget ===
  ignoreBudget: boolean;          // If true, ignores token budget limits

  // === Computed (read-only, set by TransformService) ===
  tokenCount: number;             // Estimated token count of content field

  // === Passthrough ===
  extensions: Record<string, unknown>;  // Preserves unknown platform-specific extensions for round-trip fidelity
}

export interface BookMeta {
  name: string;
  description: string;
  scanDepth: number;
  tokenBudget: number;
  recursiveScan: boolean;
  caseSensitive: boolean;
  matchWholeWords: boolean;
  extensions: Record<string, unknown>;
}
