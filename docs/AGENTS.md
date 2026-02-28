# Lorewalker — Agent Team

Agent definitions live in `.claude/agents/`. Each file is a standalone agent with its own model, tools, and system prompt.

## Team

| Agent | File | Model | Role |
|-------|------|-------|------|
| **Data Gatherer** | `data-gatherer.md` | haiku | Read-only codebase research and context consolidation. Fast, cheap, high-volume file reads. Use before implementation or swarm setup. |
| **Debugger / Reviewer** | `debugger-reviewer.md` | sonnet | Code review, bug detection, architecture compliance, drift detection. Needs solid reasoning to catch subtle issues. Read-only. |
| **System Architect** | `system-architect.md` | opus | Architecture decisions, documentation, drift resolution. Highest reasoning quality for design work that everything else depends on. |
| **Build / Test Engineer** | `build-test-engineer.md` | haiku | Run tests, builds, linting. Reports concise results. Doesn't need deep reasoning — just fast execution and clean reporting. |

### Model Rationale

- **Haiku** for Data Gatherer and Build/Test Engineer — these agents do volume work (reading many files, running commands) where speed matters more than depth. They don't make design decisions.
- **Sonnet** for Debugger/Reviewer — needs enough reasoning to catch architecture violations, undo boundary bugs, and race conditions, but doesn't need opus-level thinking. Good cost/quality balance for a task that runs at every phase boundary.
- **Opus** for System Architect — architectural decisions compound. A bad call here ripples through the entire codebase. Worth the cost for the handful of times this agent is invoked (design changes, documentation milestones).

---

## When to Invoke

| Situation | Agent |
|-----------|-------|
| Starting a task that touches unfamiliar code | Data Gatherer |
| Preparing context before spawning a swarm | Data Gatherer |
| Searching for all usages of a type or function | Data Gatherer |
| End of an implementation phase (mandatory) | Debugger / Reviewer |
| After a complex feature touching multiple services | Debugger / Reviewer |
| Something broke and you need focused analysis | Debugger / Reviewer |
| Spot-checking swarm output for consistency | Debugger / Reviewer |
| Logic doesn't have a clear home in the architecture | System Architect |
| Reviewer flagged drift that needs a design decision | System Architect |
| Documentation milestones (Phases 1, 3, 6, 8) | System Architect |
| Adding a dependency or changing a pattern | System Architect |
| Validating a feature works after implementation | Build / Test Engineer |
| Full test suite before phase sign-off | Build / Test Engineer |
| Build broke and you need focused diagnostics | Build / Test Engineer |
| Round-trip fidelity check after transform changes | Build / Test Engineer |

---

## Swarm Patterns

Swarms are groups of agents spawned in parallel for independent work items. Use them when the task decomposes into pieces that don't share state.

### When Swarms Work Well

- **Analysis rules** (Phase 3): Each rule is independent. Spawn agents per category or per rule.
- **UI components** (Phases 1-4): Components in different panels are independent once shared types and store interfaces exist.
- **LLM providers** (Phase 6): OpenAI-compatible and Anthropic providers implement the same interface independently.
- **Test files**: Test suites for independent services can be written in parallel.

### When Swarms Don't Work

- Sequential data flow (FileService → TransformService → store wiring)
- Store design (affects everything, must be centralized)
- Anything where agents would coordinate on shared files

### Swarm Setup

1. **Gather context** — Use Data Gatherer to produce a focused summary of types, interfaces, and patterns the swarm agents need.
2. **Define work items** — List the independent pieces with clear boundaries.
3. **Provide each agent with** the relevant ARCHITECTURE.md section, types from TYPES.md, context summary, and specific acceptance criteria.
4. **Collect and review** — Use Debugger/Reviewer to check consistency across outputs. Use Build/Test Engineer to run the test suite.

### Example: Analysis Rule Swarm (Phase 3)

```
Pre-swarm: Data Gatherer summarizes Rule interface, AnalysisContext, Finding type,
and any existing rule implementations as patterns.

Agent 1: structure-rules.ts (3 rules)
Agent 2: config-rules.ts (7 rules)
Agent 3: keyword-rules.ts (7 rules)
Agent 4: recursion-rules.ts (6 rules)
Agent 5: budget-rules.ts (5 rules)

Post-swarm: Debugger/Reviewer checks consistency. Build/Test Engineer runs tests.
```

### Example: UI Component Swarm (Phase 2-3)

```
Pre-swarm: Data Gatherer maps store interfaces and types each component group needs.

Agent 1: GraphCanvas + EntryNode + RecursionEdge + GraphControls
Agent 2: AnalysisPanel + HealthBadge + FindingList + FindingItem
Agent 3: InspectorPanel

Post-swarm: Debugger/Reviewer checks patterns. Build/Test Engineer runs build + lint.
```
