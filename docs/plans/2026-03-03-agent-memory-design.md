# Agent Memory Design

**Date:** 2026-03-03
**Status:** Approved

## Problem

Custom agents in `.claude/agents/` start cold every session — no recollection of previous decisions, drift flagged, patterns found, or build state. This forces agents to re-read docs from scratch and repeat research that was done in prior sessions.

## Solution

Add per-agent memory files at `.claude/agents/memory/<agent-name>.md`. Each agent reads its memory file at session start and updates it at session end with stable learnings.

## Storage

**Location:** `.claude/agents/memory/`
**Format:** Markdown, version-controlled with the repo
**One file per agent:** `system-architect.md`, `debugger-reviewer.md`, `data-gatherer.md`, `build-test-engineer.md`

Files are seeded with project-specific starting content so agents aren't blank on first use.

## Tools Changes

Add `Write` to `data-gatherer` and `debugger-reviewer` frontmatter so they can self-update. `system-architect` already has `Write, Edit`. `build-test-engineer` already has unrestricted `Bash`.

## System Prompt Addition

Each agent gets this block appended to its system prompt:

```
At the start of every session, read `.claude/agents/memory/<name>.md` and use it to orient yourself — previous decisions, known patterns, recurring issues.

At the end of every session, update the file with new learnings. Save:
- Stable patterns confirmed in this session
- Decisions made and their rationale
- Recurring issues and how they were resolved
- Useful file paths or structural notes

Do NOT save:
- Session-specific task details or in-progress work
- Speculative conclusions from a single file read
- Information that duplicates what's already there
```

## Memory Content Per Agent

| Agent | Remembers |
|-------|-----------|
| `system-architect` | Architecture decisions, drift previously flagged, documentation milestones, key design choices + rationale |
| `debugger-reviewer` | Recurring bug patterns, known drift hotspots, phase review summaries, things to watch for |
| `data-gatherer` | Frequently accessed files, stable structural notes, key patterns that repeat across research tasks |
| `build-test-engineer` | Test suite health, known quirks, common failure patterns, validated commands |

## Implementation Steps

1. Create `.claude/agents/memory/` directory with 4 seeded memory files
2. Add `Write` to `data-gatherer` and `debugger-reviewer` toolsets
3. Append memory read/write instructions to all 4 agent system prompts
