import type { WorkingEntry } from './entry'
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
