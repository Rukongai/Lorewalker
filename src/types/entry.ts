export type SelectiveLogic =
  | 0   // AND ANY: primary + any one secondary
  | 1   // AND ALL: primary + all secondary
  | 2   // NOT ANY: primary + none of secondary
  | 3;  // NOT ALL: primary, but not all secondary

export type EntryPosition =
  | 0   // Before Char Defs — inserted before character description and scenario
  | 1   // After Char Defs — inserted after character description and scenario (default)
  | 2   // Before Example Messages — injected as authored dialogue before examples
  | 3   // After Example Messages — injected as authored dialogue after examples
  | 4   // @ Depth — inserted at a specific chat depth (uses depth + role fields)
  | 5   // Top of Author's Note — inserted at top of AN content
  | 6   // Bottom of Author's Note — inserted at bottom of AN content
  | 7;  // Outlet — not injected automatically; placed via {{outlet::Name}} macro

export type LorebookFormat =
  | 'ccv3'
  | 'sillytavern'
  | 'agnai'
  | 'risu'
  | 'wyvern'
  | 'rolecall'
  | 'unknown';

export type RoleCallPosition = 'world' | 'character' | 'scene' | 'depth';

export interface RoleCallKeyword {
  keyword: string;
  isRegex: boolean;
  probability: number;  // per-keyword probability (0-100)
}

export type RoleCallConditionType =
  | 'emotion'
  | 'messageCount'
  | 'randomChance'
  | 'isGroupChat'
  | 'generationType'
  | 'swipeCount'
  | 'lorebookActive'
  | 'recency';

export interface RoleCallCondition {
  type: RoleCallConditionType;
  value: string | boolean | number;
}

export interface CharacterFilter {
  isExclude: boolean;
  names: string[];
  tags: string[];
}

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
  position: EntryPosition;        // Where in context the entry is injected (0–7)
  order: number;                  // Priority within position (higher = inserted first)
  depth: number;                  // Context depth for injection

  // === Timed Effects ===
  delay: number | null;           // Messages before entry can activate (null = use global default, 0 = immediate)
  cooldown: number | null;        // Messages entry can't activate after deactivation (null = use global default)
  sticky: number | null;          // Messages entry stays active after trigger (null = use global default, 0 = keyword-only)
  probability: number;            // Percent chance to activate when triggered (1-100)

  // === Recursion Control ===
  preventRecursion: boolean;      // If true, this entry's content won't be scanned during recursive passes (ST: "Prevent Further Recursion")
  excludeRecursion: boolean;      // If true, this entry's keys can't be triggered by recursion (ST: "Non-recursable")

  // === Budget ===
  ignoreBudget: boolean;          // If true, ignores token budget limits

  // === Group System ===
  group: string;
  groupOverride: boolean;
  groupWeight: number;               // default 100
  useGroupScoring: boolean | null;   // null = use global setting

  // === Per-entry Scan Overrides ===
  scanDepth: number | null;          // null = use book default
  caseSensitive: boolean | null;     // null = use book default
  matchWholeWords: boolean | null;   // null = use book default

  // === Match Sources ===
  matchPersonaDescription: boolean;
  matchCharacterDescription: boolean;
  matchCharacterPersonality: boolean;
  matchCharacterDepthPrompt: boolean;
  matchScenario: boolean;
  matchCreatorNotes: boolean;

  // === Advanced ST Fields ===
  role: number;                      // 0=system, 1=user, 2=assistant
  automationId: string;
  outletName: string;
  vectorized: boolean;
  useProbability: boolean;
  addMemo: boolean;
  displayIndex: number | null;
  delayUntilRecursion: number;
  triggers: string[];
  characterFilter: CharacterFilter;

  // === Computed (read-only, set by TransformService) ===
  tokenCount: number;             // Estimated token count of content field

  // === Lorewalker-specific ===
  userCategory?: string;          // Manual or LLM-assigned category override (stored in extensions.lorewalker.userCategory)

  // === RoleCall-specific ===
  triggerMode?: 'simple' | 'advanced';           // RoleCall trigger mode
  keywordObjects?: RoleCallKeyword[];            // RoleCall per-keyword objects (advanced mode, preserved for simulation)
  triggerConditions?: RoleCallCondition[];       // RoleCall condition triggers (read-only, for future RoleCallEngine)
  positionRoleCall?: RoleCallPosition;           // RoleCall injection position (native)
  rolecallComment?: string;                      // RoleCall comment/notes field (distinct from title/name)

  // === Passthrough ===
  extensions: Record<string, unknown>;  // Preserves unknown platform-specific extensions for round-trip fidelity
}

export interface BookMeta {
  name: string;
  description: string;
  scanDepth: number;
  tokenBudget: number;
  contextSize: number;   // Lorewalker-only display field (not exported). Default 200000.
  recursiveScan: boolean;
  caseSensitive: boolean;
  matchWholeWords: boolean;
  extensions: Record<string, unknown>;

  // ST-specific global settings
  minActivations: number;       // Min entries to activate; 0 = disabled
  maxDepth: number;             // Max message depth for minActivations; 0 = unlimited
  maxRecursionSteps: number;    // Max recursion passes; 0 = unlimited
  insertionStrategy: 'evenly' | 'character_lore_first' | 'global_lore_first'; // How entries are distributed in context
  includeNames: boolean;        // Include chat participant names in keyword scan
  useGroupScoring: boolean;     // Global default for group scoring
  alertOnOverflow: boolean;     // Show alert when WI exceeds token budget
  budgetCap: number;            // Hard token cap; 0 = no cap
}
