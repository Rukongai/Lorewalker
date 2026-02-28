---
name: lorebook-creator
description: >
  Create, review, and optimize World Books and Lore Books for AI roleplay platforms
  like SillyTavern. Use this skill whenever the user mentions "lorebook", "lore book",
  "world book", "worldbook", "WI entries", "world info", or asks about creating structured
  lore for AI storytelling. Also trigger when a user wants to convert worldbuilding notes,
  character bios, wiki articles, or setting descriptions into importable JSON for
  SillyTavern or similar narrative AI systems. Trigger equally when a user uploads an
  existing lorebook JSON and wants it reviewed, audited, fixed, improved, or optimized —
  phrases like "check my lorebook", "fix my world book", "optimize my entries", or
  "review this JSON" all apply. Even if the user just says something like "I need entries
  for my RP setting" or "help me organize my lore", this skill applies.
---

# Lorebook Creator

This skill transforms worldbuilding content into structured JSON lorebook files that
narrative AI systems (primarily SillyTavern) use to inject contextual world information
during story generation. It also reviews and improves existing lorebooks. The output is
always an importable `.json` file.

Before generating or reviewing entries, read the reference files in `references/` — they
contain the SillyTavern JSON schema, entry templates by category, worked examples, and
the review audit checklist.

## How lorebooks work (context for decision-making)

Lorebook entries are injected into the AI's context window during roleplay based on
keyword matching. When a user or AI message contains a keyword from an entry, that
entry's content gets inserted at a specific position in the context. This means:

- **Keywords are the primary activation mechanism.** Bad keywords = entries never fire
  or fire too often. Think about what words will naturally appear in conversation.
- **Position controls priority.** Higher positions (4) get prime context real estate.
  Lower positions (0) are supplemental. Budget accordingly.
- **Token budget is finite.** Every active entry competes for context space. Constant
  entries cost tokens on every single message. Lean content wins.
- **Recursion creates information cascades.** When Entry A's content mentions a keyword
  from Entry B, Entry B activates too. This is powerful for building interconnected
  worlds but dangerous if it creates loops.
- **Selective activation adds contextual filtering.** Secondary keywords combined with
  primary keywords let entries fire only in the right context — a monster entry that
  only activates when its region is also mentioned.
- **Supplemental activation methods exist.** Vector/semantic matching, additional
  matching sources (character card fields), and inclusion groups can fill gaps where
  keyword matching alone leaves the world feeling sparse. These are opt-in tools, not
  defaults — use them when keywords genuinely can't cover the use case.

Understanding these mechanics is what separates a good lorebook from a great one.

## Workflow

When a user asks for lorebook help, determine which path fits:

**Quick Mode** — The user provides lore (descriptions, wiki text, character bios, raw
notes) and you generate the complete lorebook JSON directly. Best for users who know
what they want or have substantial existing material. This is the default recommendation
for most creation requests.

**Guided Mode** — A collaborative multi-turn process: analyze the lore, present a
structured plan, generate in batches with explanations, then optimize. Best for users
building from scratch or who want to understand the decisions being made.

**Review Mode** — The user uploads an existing lorebook `.json` file and wants it
audited, fixed, or improved. Read `references/review-checklist.md` for the full audit
process. This mode parses the existing file, runs it through a comprehensive set of
checks, and produces a report with specific fixes.

There's also an optional **Entry Planning** step (works with Quick or Guided mode):
before generating, help the user figure out *what entries they need*. Analyze their
setting and suggest entries across categories. This is especially useful when users have
a broad concept but haven't broken it down yet.

### Entry Planning (optional pre-step)

If the user wants help figuring out what entries to create, analyze their setting
across these categories (only include categories with actual suggestions):

- **World Rules & Mechanics** — Fundamental laws, magic systems, hard limitations
- **Characters** — Protagonists, NPCs, entities with agency
- **Relationships** — Connections between characters (alliances, rivalries, bonds)
- **Locations** — Cities, buildings, landmarks, significant places
- **Items & Objects** — Weapons, artifacts, equipment, significant possessions
- **Factions & Organizations** — Groups, corporations, military units, societies
- **Events & History** — Past catastrophes, wars, founding moments, ongoing conflicts
- **Concepts & Terms** — Jargon, technical terminology, cultural practices
- **Protocols & Procedures** — Step-by-step processes, mission rules, rituals
- **Active Scenes** — Temporary conditions, weather, injuries, in-progress events
- **Regional Encounter Pools** — Creatures, NPCs, or events tied to specific areas
  (use selective activation + inclusion groups to filter by region)

Present the categorized list with a configuration preview (how many constant entries,
character entries, world context entries, regional pools) and let the user adjust
before generating.

### Quick Mode

1. Read and analyze all provided lore material
2. Identify distinct concepts and categorize them
3. Read `references/templates.md` and select the right template for each concept
4. Read `references/sillytavern-schema.md` for field rules and format requirements
5. Generate the complete lorebook JSON
6. Save as a `.json` file and present to the user
7. Offer to adjust anything

### Guided Mode

**Phase 1 — Analysis:** Parse the lore, identify distinct concepts, categorize them,
assess complexity, and present findings. Ask the user to review, add missing concepts,
and set priorities before proceeding.

**Phase 2 — Generation:** Generate entries in batches of 2-4. For each entry, briefly
explain the reasoning (why these keywords, why this position, why constant or not).
Ask for feedback before continuing to the next batch.

**Phase 3 — Optimization:** Review all entries for linking opportunities (mentions that
trigger recursion), field consistency, keyword coverage, and regional filtering needs.
Present the final lorebook.

### Review Mode

When a user uploads an existing lorebook JSON, run the full audit from
`references/review-checklist.md`. The workflow is:

1. Parse the uploaded JSON and validate structure (wrapper format, required fields)
2. Run each audit category: field validation, keyword analysis, content quality,
   recursion mapping, token budget, configuration logic, and activation architecture
3. Present findings organized by severity:
   - **Errors** — Things that will break import or cause entries to malfunction
     (missing fields, `selective: true` with empty `keysecondary`, etc.)
   - **Warnings** — Things that will degrade quality but won't break anything
     (generic keywords, oversized entries, likely recursion loops)
   - **Suggestions** — Opportunities for improvement (missing keyword variations,
     entries that could benefit from recursion linking, content that could be more
     evocative, regional filtering opportunities)
4. For each finding, explain *what's wrong* and *why it matters* in terms of how it
   affects the AI's behavior during roleplay
5. Offer to generate a corrected version of the lorebook with all fixes applied
6. Save the corrected `.json` file and present it

The review should feel like a knowledgeable collaborator explaining what they found, not
a linter dumping raw error codes. Prioritize the findings that will have the biggest
impact on roleplay quality.

When reviewing, write a Python script to parse and validate the JSON programmatically.
This catches structural issues reliably (missing fields, type mismatches, duplicate UIDs)
and produces exact counts (token estimates, entry statistics) that would be error-prone
to do by reading alone. Use the script output as the foundation, then layer on the
qualitative analysis (content quality, keyword strategy, recursion architecture) that
requires judgment.

## Core decision logic

These are the key decisions that determine entry quality. Read `references/templates.md`
for the full template details — this section covers the reasoning.

### How to split input into entries

Each distinct concept gets its own entry. The goal is modularity — entries should be
independently activatable and recombinable. A location and the NPC who lives there are
separate entries, because sometimes the NPC will be mentioned without the location and
vice versa.

- One focused concept that fits in ~150 tokens → 1 entry
- Location + NPCs mentioned → 1 location entry + 1 entry per significant NPC
- Organization + key members → 1 org entry + 1 entry per key member
- A concept too big for 200 tokens → Split into overview + detail entries linked by recursion
- A rule with specific examples → 1 constant rule entry + keyword-activated example entries
- Multiple unrelated concepts → 1 entry per concept, always
- Creatures/encounters tied to a region → 1 entry per creature with selective activation
  using region names as secondary keys

### Choosing constant vs keyword activation

The question is: "Does the narrative break if the AI forgets this for even one message?"

Constant entries consume tokens on every generation, so they're expensive. Reserve them
for rules that are genuinely load-bearing — magic system laws, character death conditions,
power caps, universal prohibitions. If forgetting something for a message just means a
minor detail gets missed, that's a keyword-activated entry.

A good constant entry is: under 100 tokens, context-independent (applies everywhere),
and would create plot holes if forgotten.

### Position assignment

Position determines where in the AI's context the entry gets injected:

| Position | Placement | Use for |
|----------|-----------|---------|
| 0 | After character card | Locations, general lore, items, flavor |
| 1 | After character card (higher priority) | Character backgrounds, relationships, personalities |
| 2 | After character card | Speech patterns, dialogue quirks |
| 3 | At scene depth | Combat events, weather, injuries, temporary conditions |
| 4 | Highest priority | Fundamental world rules, physics, absolute laws |

### Order value (priority within position)

Think of order as importance ranking. Higher order = injected first = more likely to
survive token budget cuts.

- 280-300: Absolute world laws, physics-breaking rules
- 250: Protagonist / central character
- 200: Major supporting characters
- 150: Standard characters
- 120: Important locations, major factions
- 100: General locations, standard items, flavor
- 80: Minor items, background flavor

### Keyword strategy

Keywords are how entries activate. The goal is to match natural conversational mentions
without being so broad that entries fire constantly on irrelevant messages.

Good keywords cover natural variations of how people reference something:
`["Marcus Thorn", "Marcus", "Marcus's", "Thorn", "the blacksmith"]`

Bad keywords are either too generic (`["sword", "weapon"]` — fires on any sword) or
too specific (`["The Rusty Flagon Tavern and Inn"]` — only matches the exact phrase).

Include: proper names, nicknames, titles, possessive forms, role descriptors, and
informal references people would actually use in conversation.

**Regex keys** are supported for advanced matching. A key wrapped in `/` delimiters is
treated as a JavaScript regular expression. This is useful when keyword lists can't
cover all natural phrasings:

- `/(?:ancient|old|forbidden)\s+(?:library|archive|repository)/i` matches variations
  like "ancient library," "old archive," or "forbidden repository"
- `/\bblood\s?fang\b/i` matches "Bloodfang" and "Blood Fang" and "blood fang"

Use regex sparingly — plain keywords are easier to maintain and debug. Regex is best
for entries where the concept is described in many natural ways that aren't predictable
as a flat list.

### Recursive linking

When an entry's content mentions keywords from another entry, the second entry
activates automatically. This is the backbone of interconnected worldbuilding.

**Locations should trigger their inhabitants:** Write location content that mentions
NPC names → set `preventRecursion: false` on locations.

**Characters should NOT trigger infinite loops:** If Character A mentions Character B
and B mentions A, you get a loop. Set `preventRecursion: true` on characters, or use
asymmetric linking (A mentions B, but B doesn't mention A by keyword-matchable name).

**Items are usually terminal nodes:** They get mentioned by other entries but rarely
need to trigger further entries themselves. Set `preventRecursion: true`.

Read `references/sillytavern-schema.md` for the full `preventRecursion` strategy table.

### Hub + satellite pattern

For large or complex concepts, use a **hub entry** that provides an overview and
mentions sub-component keywords, causing satellite entries to activate via recursion.

This is the primary mechanism for making the world feel populated. When a hub fires,
it seeds the context with keywords that pull in related detail entries automatically.

**How it works:**
- Hub entry has broad keywords and `preventRecursion: false`
- Hub content mentions specific names/terms that match satellite entry keywords
- Satellite entries have `preventRecursion: true` (terminal nodes)

**Example:** A "Farlandia Monsters" hub entry contains the text "Common threats include
Naga, Bog Witches, and Marsh Elementals." When the hub fires, it triggers all three
creature entries. The hub itself is lightweight (50-80 tokens); the detail lives in
the satellites.

**Scaling:** For very large worlds, hubs can be layered. A region hub triggers
sub-region hubs, which trigger individual entries. Keep chains to 2-3 levels maximum
to avoid over-activation and budget exhaustion.

### Regional filtering with selective activation

When creatures, NPCs, or events should only appear in specific regions, use
**selective activation** to bind them to their location context.

**Architecture:**
- Monster/encounter entry uses creature name as primary keys
- Region/location names go in `keysecondary`
- Set `selective: true` and `selectiveLogic: 0` (AND ANY)
- The creature only activates when BOTH a creature keyword AND a region keyword
  are present in the scan buffer

**How recursion makes this work naturally:**
1. User mentions "Darkwater Swamp"
2. Swamp location entry fires (keyword match)
3. Swamp entry content mentions "Naga hunting grounds" and "Bog Witch territory"
4. "Naga" matches the Naga entry's primary key
5. "Darkwater Swamp" is already in the scan buffer, satisfying the secondary key
6. Naga entry activates — correctly filtered to its home region

**Why this prevents Naga-in-the-woods:** If someone mentions "Thornwood Forest"
instead, the forest location entry fires but its content doesn't mention "Naga."
Even if "Naga" appeared in conversation, the secondary key "Darkwater Swamp" wouldn't
be present, so the Naga entry stays dormant. The creature is locked to its biome.

**Combining with inclusion groups:** For random encounters within a region, give all
regional creatures the same `group` value. When someone enters the swamp, all swamp
creatures' primary keys might appear via the hub, but only one from the group actually
injects into context. This creates variety without overwhelming the token budget.

See `references/templates.md` Template 9 for the full regional encounter template.
See `references/examples.md` for a worked regional filtering example.

### Inclusion groups

Inclusion groups control entry selection when multiple entries with the same group
label activate simultaneously. Only one entry from the group injects into context.

**Use cases:**
- Random encounters: pool of creatures for an area, one fires per scene
- Weather variation: pool of weather conditions, one active at a time
- NPC mood states: different behavioral entries for the same character
- Ambient flavor: rotating environmental descriptions to prevent repetition

**Configuration:** Add a `group` field (string) to entries sharing a pool. The
`groupWeight` field (integer, default 100) controls selection probability — higher
weight = more likely to be chosen. If `groupOverride` is true, the entry with the
highest `order` value wins deterministically instead of random selection.

**With Group Scoring enabled:** The entry with the most keyword matches wins. This
lets you have a generic fallback entry (matches on just the region name) and specific
entries (match on region + creature type). The specific match takes priority.

Note: Inclusion groups are a SillyTavern UI/activation feature. The `group`,
`groupWeight`, and `groupOverride` fields should be included in the JSON when the
user's lorebook uses this pattern, but they are not required for basic lorebooks.

## Supplemental activation methods

Keywords + recursion are the backbone. These methods fill specific gaps where keywords
alone leave the world feeling sparse. Use them deliberately, not as defaults.

### Vectorized / semantic matching

When `vectorized` is set to `true` (shown as the 🔗 status in SillyTavern), an entry
can be activated by **semantic similarity** between recent chat messages and the entry's
content, using the Vector Storage extension's embedding model.

**When to use it:**
- Entries describing broad themes, atmospheres, or vibes that don't have predictable
  keywords (e.g., "the world feels oppressive and hopeless" — what keyword covers that?)
- Cultural practices or concepts that get referenced indirectly
- Supplemental flavor entries where occasional misfires are acceptable

**When NOT to use it:**
- Named entities with clear keywords (characters, locations, items) — keywords are
  more reliable
- Rules or constraints that must fire precisely when relevant — vector matching is
  probabilistic
- Any entry where a false positive would cause narrative problems

**Critical caveat:** Vector matching depends entirely on the embedding model. You
cannot predict exactly what will fire. It replaces only the keyword check — all other
filters (probability, character filter, inclusion groups) still apply. If you need
deterministic, predictable activation, use keywords.

**Architecture pattern:** An entry can have BOTH keywords AND vectorized status. The
keywords provide deterministic activation for direct mentions; the vector matching
catches indirect/thematic references. Remove keywords entirely only if you want
pure semantic activation.

**Default remains `false`.** Only set to `true` when there's a specific reason keyword
matching can't cover the entry's activation needs.

### Additional matching sources

By default, entries match only against chat messages. SillyTavern can also match
against character card fields: Description, Personality, Scenario, Persona Description,
Character's Note, and Creator's Notes.

**Why this matters:** If a character's description mentions "necromancer," any entry
with "necromancer" as a keyword activates automatically for that character without
anyone typing it in chat. This is powerful for character-specific world context.

**This is a SillyTavern-side setting, not a per-entry JSON field.** When building
lorebooks intended for specific characters, note which keywords appear in the character
card and which entries would benefit from this implicit activation. Mention this in
the lorebook's documentation or comments if the lorebook depends on it.

### Character filters

Entries can be restricted to activate only for specific characters (or excluded from
specific characters). This is useful in group chat lorebooks where different characters
should have access to different lore.

**This is configured per-entry in the SillyTavern UI.** When building lorebooks that
are character-specific, note in the `comment` field which character(s) the entry is
intended for, so the user can set up filters after import.

## Content writing principles

Lorebook content should be **compressed, evocative, and structured**. The AI reading
these entries needs to extract character, tone, and facts quickly from limited tokens.

**Use bracketed data format** for structured information:
`[ role(Blacksmith); personality(gruff, loyal, secretive); age(52); ]`

This gives the AI parseable data points while keeping token count low.

**Open with a vivid, active sentence** that establishes the entity immediately:
- Good: "The Rusty Flagon hunches at the district's edge, reeking of spilled ale."
- Weak: "The Rusty Flagon is a tavern in the merchant district."

**Prefix hard rules** with `RULE:` and use absolute language (`MUST`, `CANNOT`,
`WILL INSTANTLY`) — this signals to the AI that these constraints are non-negotiable,
not narrative suggestions.

**Stay within 30-200 tokens per entry.** Under 30 is too sparse to be useful. Over 200
wastes budget. Most entries should land in the 60-150 range.

**Never fabricate** major plot points, character deaths, named entities, or details
that aren't in the source material. You can add sensory texture and atmosphere, but
the facts come from the user's input.

**End entries with mentions of related entities** when appropriate — this enables
recursive activation and builds the interconnected feel of a living world.

**For location entries, mention regional inhabitants and threats by name** — this is
how the hub + satellite pattern populates scenes. "The swamp is stalked by Naga and
Bog Witches" seeds two creature entries for recursive activation.

## Output format

The final output is always a `.json` file in SillyTavern import format. Read
`references/sillytavern-schema.md` for the exact structure and every required field.

The wrapper structure is:
```json
{
  "entries": {
    "0": { ... },
    "1": { ... }
  }
}
```

Keys in the `entries` object are strings (`"0"`, `"1"`, `"2"`) matching each entry's
`uid` value. Every entry must include all required fields — see the schema reference
for the complete field list and which values are fixed vs configurable.

## Reference files

Read these before generating or reviewing entries:

- `references/sillytavern-schema.md` — Complete JSON format specification, all required
  fields, fixed values, and the preventRecursion strategy table
- `references/templates.md` — Entry templates for each category (rules, characters,
  locations, items, events, dialogue, organizations, system components, regional
  encounters) with customization guidance
- `references/examples.md` — Worked transformation examples showing input → analysis →
  output, plus edge case handling patterns including regional filtering
- `references/review-checklist.md` — Comprehensive audit checklist for reviewing existing
  lorebooks, organized by category with severity levels and fix guidance
