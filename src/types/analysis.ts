import type { BookMeta, WorkingEntry, LorebookFormat } from './entry'
import type { RecursionGraph } from './graph'

export type RuleCategory =
  | 'structure'
  | 'config'
  | 'keywords'
  | 'content'
  | 'recursion'
  | 'budget';

export type FindingSeverity = 'error' | 'warning' | 'suggestion';

export interface AnalysisContext {
  entries: WorkingEntry[];
  bookMeta: BookMeta;
  graph: RecursionGraph;
  llmService?: unknown;           // Only provided during LLM analysis runs (typed as LLMService in llm.ts)
}

export interface Rule {
  id: string;                         // Unique, e.g., "recursion/circular-references"
  name: string;                       // Human-readable, e.g., "Circular References"
  description: string;                // What this rule checks and why it matters
  category: RuleCategory;
  severity: FindingSeverity;          // Default severity (individual findings can override)
  requiresLLM: boolean;
  formatCompatibility?: LorebookFormat[];  // undefined = applies to all formats
  evaluate(context: AnalysisContext): Promise<Finding[]>;
}

export interface SuggestedFix {
  description: string;                // What the fix will do
  apply(entries: WorkingEntry[]): WorkingEntry[];  // Returns modified entries
}

export interface Finding {
  id: string;                         // Unique per finding instance (uuid)
  ruleId: string;                     // Which rule generated this
  severity: FindingSeverity;
  category: RuleCategory;
  message: string;                    // Human-readable description of the issue
  entryIds: string[];                 // Affected entries (may be empty for book-level findings)
  details?: string;                   // Extended explanation (shown on expand)
  fix?: SuggestedFix;                 // Optional auto-fix
  relatedKeywords?: string[];         // Populated by cross-entry keyword rules to enable navigation to the keyword analyzer
}

export interface CategoryScore {
  score: number;                      // 0-100
  errorCount: number;
  warningCount: number;
  suggestionCount: number;
}

export interface HealthScore {
  overall: number;                    // 0-100
  categories: Record<RuleCategory, CategoryScore>;
  summary: string;                    // One-line qualitative assessment
}

export interface Rubric {
  id: string;
  name: string;
  description: string;
  rules: Rule[];
  scoringWeights: Record<RuleCategory, number>;  // Category weights for overall score
}

export interface RubricRegistry {
  rubrics: Map<string, Rubric>;
  activeRubricId: string;
  getActiveRubric(): Rubric;
  register(rubric: Rubric): void;
}

// --- Custom Rules ---

export type ComparisonOp =
  | '=='
  | '!='
  | '>'
  | '<'
  | '>='
  | '<='
  | 'includes'
  | 'not-includes'
  | 'matches';

export type LogicOp = 'AND' | 'OR';

export interface ConditionLeaf {
  type: 'leaf';
  left: string;      // variable path, e.g. "entry.keys.length"
  operator: ComparisonOp;
  right: string;     // literal value as string
}

export interface ConditionGroup {
  type: 'group';
  negate: boolean;
  logic: LogicOp;
  conditions: ConditionLeaf[];
}

export interface SerializedEvaluation {
  logic: LogicOp;
  items: Array<ConditionLeaf | ConditionGroup>;
}

export interface CustomRule {
  id: string;
  name: string;
  description: string;
  category: RuleCategory;
  severity: FindingSeverity;
  enabled: boolean;
  requiresLLM: boolean;
  evaluation?: SerializedEvaluation;   // deterministic rules only
  message: string;                     // supports {{entry.name}}, {{entry.keys.length}}, etc.
  systemPrompt?: string;               // LLM rules only
  userPrompt?: string;                 // LLM rules only
  createdAt: string;
  updatedAt: string;
}

export interface DocumentRuleOverrides {
  disabledRuleIds: string[];   // workspace/default rule IDs disabled for this doc
  customRules: CustomRule[];   // doc-specific custom rules
}
