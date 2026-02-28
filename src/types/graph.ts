export interface RecursionGraph {
  edges: Map<string, Set<string>>;          // entryId → Set of entryIds this entry triggers
  reverseEdges: Map<string, Set<string>>;   // entryId → Set of entryIds that trigger this entry
  edgeMeta: Map<string, EdgeMeta>;          // key: "sourceId→targetId"
}

export interface EdgeMeta {
  sourceId: string;
  targetId: string;
  matchedKeywords: string[];                // Keywords in source's content that matched target's keys
  blockedByPreventRecursion: boolean;       // True if target has preventRecursion: true
}

export interface CycleResult {
  cycles: string[][];   // Each cycle is an array of entryIds forming the loop
}

export interface ChainDepthResult {
  depths: Map<string, number>;   // entryId → max chain depth reachable
  longestChains: string[][];     // Chains exceeding the threshold
}

export interface DeadLink {
  sourceEntryId: string;
  mentionedName: string;         // The name found in content that doesn't match any entry
  contextSnippet: string;        // Surrounding text for display
}

export interface KeywordMatchOptions {
  caseSensitive: boolean;
  matchWholeWords: boolean;
}

export interface KeywordMatch {
  keyword: string;          // The keyword that matched
  entryId: string;          // The entry whose key matched
  position: number;         // Character offset in the scanned text
  isRegex: boolean;         // Whether this was a regex match
}
