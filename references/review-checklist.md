# Lorebook Review Checklist

Use this checklist when auditing an existing lorebook JSON. Work through each section
and collect findings by severity: **Error** (breaks functionality), **Warning**
(degrades quality), **Suggestion** (opportunity to improve).

Write a Python script to handle the structural and mechanical checks (sections 1-3
and parts of 4-5). This catches issues reliably and produces exact counts. Layer the
qualitative analysis (content quality, recursion architecture, keyword strategy) on
top using judgment.

---

## 1. Structure validation

These are import-breaking issues — check them first.

### Wrapper format
- [ ] File is valid JSON (parses without error)
- [ ] Top-level object has an `"entries"` key
- [ ] `entries` value is an object (not an array)
- [ ] Entry keys are strings (`"0"`, `"1"`, `"2"`) not integers
- [ ] Entry keys match their `uid` values (entry `"3"` has `uid: 3`)
- [ ] No duplicate UIDs
- [ ] UIDs are sequential starting from 0 (not required for import, but indicates
  clean bookkeeping — flag as suggestion if gaps exist)

**Severity:** All errors. Malformed JSON or missing wrapper will fail import.

### Required fields
Every entry must have all of these fields. Missing any one can cause import errors or
unpredictable behavior.

```
uid, key, keysecondary, comment, content, constant, selective, selectiveLogic,
addMemo, order, position, disable, probability, useProbability, depth, delay,
cooldown, sticky, vectorized, ignoreBudget, excludeRecursion, preventRecursion
```

- [ ] Every entry contains every required field
- [ ] Field types are correct:
  - `uid`: integer
  - `key`: array of strings
  - `keysecondary`: array of strings
  - `comment`: string
  - `content`: string
  - `constant`: boolean
  - `selective`: boolean
  - `selectiveLogic`: integer (0-3)
  - `addMemo`: boolean
  - `order`: integer
  - `position`: integer (0-4)
  - `disable`: boolean
  - `probability`: integer (1-100)
  - `useProbability`: boolean
  - `depth`: integer
  - `delay`: integer (≥0)
  - `cooldown`: integer (≥0)
  - `sticky`: integer (≥0)
  - `vectorized`: boolean
  - `ignoreBudget`: boolean
  - `excludeRecursion`: boolean
  - `preventRecursion`: boolean

**Severity:** Missing fields are errors. Wrong types are errors.

---

## 2. Fixed value compliance

These fields should almost always have specific values. Deviations aren't import-breaking
but may indicate mistakes — or may be intentional depending on context.

| Field | Expected | When deviation is a problem | When deviation is OK |
|-------|----------|---------------------------|---------------------|
| `vectorized` | `false` | Entry has strong keywords that cover its activation needs — vectorized adds unpredictability for no benefit | Entry describes broad themes/vibes where keywords can't cover natural phrasings |
| `useProbability` | `true` | When false, probability field is ignored entirely, defeating randomization | Virtually never OK to deviate |
| `excludeRecursion` | `false` | When true, this entry becomes invisible to recursive scanning, silently breaking linking chains | Ali:Chat/example dialogue entries whose example text contains keywords that would falsely trigger other entries |
| `addMemo` | `true` | When false, entry has no label in the UI | Virtually never OK to deviate |
| `disable` | `false` | A disabled entry never fires | User intentionally wants it off temporarily |
| `depth` | `4` | Non-standard depth causes inconsistent injection behavior | Very rarely — specific prompt engineering reasons |

- [ ] Check every entry for deviations from expected fixed values
- [ ] Flag `disable: true` entries — ask user if intentional or leftover
- [ ] Flag `vectorized: true` entries — check if the entry has a legitimate reason
  (broad themes, atmospheric entries). If it also has strong keywords, ask if the
  vectorized flag is intentional or accidental
- [ ] Flag `excludeRecursion: true` entries — check if they contain example dialogue
  or other content where recursion would cause false triggers

**Severity:** `useProbability: false` is a warning (likely bug). `vectorized: true`
is a suggestion (ask user for intent — may be deliberate). `disable: true` is a
suggestion (might be intentional). Others are warnings.

---

## 3. Configuration logic

These are combinations of field values that contradict each other or indicate
misconfiguration.

### Selective logic
- [ ] If `keysecondary` is empty `[]`, then `selective` must be `false`
  (selective with no secondary keys means the entry can never activate)
- [ ] If `selective` is `true`, then `keysecondary` must be non-empty
- [ ] If `keysecondary` is non-empty but `selective` is `false`, flag as suggestion
  (secondary keys are defined but aren't being used — was this intentional?)
- [ ] If `selective` is `true`, check that `selectiveLogic` makes sense for the use
  case (0 for regional filtering, 2 for exclusion patterns, etc.)

### Position-type alignment
- [ ] Entries with `constant: true` should have `position: 4`
  (constant entries are rules; rules belong at highest priority)
- [ ] Entries with `sticky > 0` should have `position: 3`
  (sticky entries are scene-level events; position 3 is scene depth)
- [ ] Content starting with `RULE:` should have `constant: true` and `position: 4`
  (if someone wrote rule-style content but didn't configure it as constant, that's
  likely a mistake)

### Budget concerns
- [ ] Constant entries with content over 100 tokens — flag as warning
  (constant entries cost tokens every message; long ones are expensive)
- [ ] Entries with `ignoreBudget: true` — flag as warning unless there's a clear reason
  (bypassing budget can overflow context)
- [ ] Count total constant entries — if more than 5-7, flag as warning
  (too many constant entries eat into the token budget for everything else)

### Probability and timing
- [ ] `probability` values below 100 on entries without clear randomization purpose —
  flag as suggestion (was this intentional or a leftover?)
- [ ] `delay` or `cooldown` values on entries where timing doesn't seem relevant —
  flag as suggestion
- [ ] `sticky > 0` on non-event entries (characters, locations) — flag as warning
  (sticky is for temporary conditions, not persistent information)

### Inclusion group consistency
- [ ] If `group` field is present and non-empty, check that at least one other entry
  shares the same group value (a group of one is meaningless)
- [ ] Entries in the same inclusion group should have compatible `selective` and
  `keysecondary` settings (they should all filter to the same context)
- [ ] If `groupOverride` is true, check that entries in the group have distinct
  `order` values (otherwise the winner is arbitrary)
- [ ] `groupWeight` of 0 on an entry in a group — flag as warning (entry can never
  be selected randomly)

**Severity:** Selective/keysecondary mismatches are errors. Position misalignment is
a warning. Budget concerns are warnings. Timing oddities are suggestions. Group
configuration issues are warnings.

---

## 4. Keyword analysis

Keywords determine whether entries actually activate in practice. Bad keywords are one
of the most common lorebook problems.

### Per-entry keyword checks
- [ ] Every entry has 2-5 primary keywords (fewer than 2 is fragile; more than 5
  often includes overly generic terms)
- [ ] No overly generic keywords that would trigger on unrelated messages:
  common offenders include `"sword"`, `"house"`, `"the"`, `"magic"`, `"fight"`,
  `"city"`, `"man"`, `"woman"`, `"door"`, `"room"`
- [ ] No overly specific keywords that require exact long phrases:
  e.g., `"The Grand Imperial Library of the Northern Kingdoms"` — nobody will type this
  exactly in conversation
- [ ] Keywords include natural variations: proper name + first name + nickname + title +
  possessive form where applicable
- [ ] Keywords are properly capitalized to match how they'd appear in conversation
- [ ] If regex keys are used, verify they are valid JavaScript regex syntax
  (delimited with `/`, flags after closing `/`)

### Cross-entry keyword checks
- [ ] No two entries share identical keywords (this causes both to activate when only
  one should — wastes budget and can confuse the AI)
- [ ] Flag keyword overlaps where one entry's keyword is a substring of another's
  (e.g., entry A has `"Keep"` and entry B has `"Iron Keep"` — both fire when
  someone mentions Iron Keep)
- [ ] Constant entries with keywords — note that the keywords are redundant for
  activation (constant entries are always active) but still serve a purpose for
  recursive triggering. Flag only if the keywords are clearly vestigial

### Selective keyword checks
- [ ] For entries with `selective: true`, check that secondary keywords are realistic
  (will they actually appear in the scan buffer when this entry should fire?)
- [ ] For regional encounter entries, check that the secondary keywords include both
  specific location names AND generic terrain terms
  (e.g., both `"Darkwater Swamp"` AND `"swamp"` / `"marsh"`)
- [ ] Verify that hub/location entries mention the satellite entries' primary keywords
  in their content (this is what makes the selective filter work via recursion)

**Severity:** Empty keyword arrays are errors (entry can never activate unless constant).
Generic keywords are warnings. Missing variations are suggestions. Overlaps are warnings.
Selective filter mismatches are warnings.

---

## 5. Content quality

These checks require reading the actual content of each entry and applying judgment.

### Token budget
- [ ] Estimate token count for each entry (roughly: character count ÷ 4, or word count ÷ 0.75)
- [ ] Flag entries over 200 tokens as warnings
- [ ] Flag entries under 30 tokens as suggestions (may be too sparse to be useful)
- [ ] Flag hub entries over 80 tokens as suggestions (hubs should be lean)
- [ ] Calculate total token cost of all constant entries combined
- [ ] Provide overall budget summary: total entries, constant vs keyword-activated,
  estimated total tokens if all entries activated simultaneously

### Content structure
- [ ] Entries use bracketed data format for structured information
  `[ key(value); key(value); ]` — if entries are pure prose with no structure, suggest
  adding bracketed data for better AI parsing
- [ ] Rule entries start with `RULE:` and use absolute language (`MUST`, `CANNOT`,
  `WILL INSTANTLY`) — soft phrasing in rules gets ignored by the AI
- [ ] Content is transformed/evocative rather than flat description
  ("The forge blazes with eternal heat" vs "This is a forge")
- [ ] Entries that describe characters open with a vivid, characterizing sentence
  rather than just listing traits

### Factual consistency
- [ ] No contradictions between entries (character age in one entry vs another,
  location descriptions that conflict)
- [ ] Relationship references are bidirectional where appropriate (if A's entry says
  they're B's rival, B's entry should acknowledge the rivalry)
- [ ] Organization entries mention their members; location entries mention their
  inhabitants — check that the referenced entities actually have their own entries

### Content scope
- [ ] Each entry covers one focused concept (not a location + character + item crammed
  together)
- [ ] No entries that would be better split into multiple entries
- [ ] No duplicate information across entries (same facts repeated in multiple places
  waste tokens)

### Hub entry quality
- [ ] Hub entries are lean (50-80 tokens) and focused on keyword seeding
- [ ] Hub entries mention satellite entity names using their exact keyword-matchable
  forms (not paraphrases or pronouns)
- [ ] Location/region entries that describe 3+ sub-entities by name are functioning
  as hubs — check that they have `preventRecursion: false`

**Severity:** Over-200-token entries are warnings. Missing structure and flat content
are suggestions. Contradictions are warnings. Scope issues are suggestions. Hub entries
over 100 tokens are suggestions.

---

## 6. Recursion architecture

This is where lorebooks go from a flat list of facts to an interconnected world.
Analyzing the recursion graph reveals dead ends, loops, and missed opportunities.

### Build the recursion map
For each entry, scan its content for keywords that match other entries' `key` arrays.
Record which entries would trigger which other entries. This produces a directed graph.
Account for `preventRecursion` and `excludeRecursion` flags when building the map.

### Check for issues
- [ ] **Circular references:** Entry A triggers B, and B triggers A. If neither has
  `preventRecursion: true`, this is an infinite loop. Flag as error.
- [ ] **Long chains:** A triggers B triggers C triggers D — chains longer than 3 are
  unusual and may indicate over-linking. Flag as suggestion to review.
- [ ] **Orphaned entries:** Entries whose keywords never appear in any other entry's
  content AND are not constant AND are not using selective activation tied to a
  location hub. These only activate on direct user/AI mention, never through
  recursion. Not necessarily wrong (some entries are standalone) but worth flagging
  as suggestions for the user to consider.
- [ ] **Dead links:** An entry's content mentions something by name that doesn't match
  any other entry's keywords. The author may have intended recursion but the target
  entry doesn't exist or its keywords don't match. Flag as warning.
- [ ] **preventRecursion correctness:**
  - Locations should have `preventRecursion: false` (they're hubs that trigger NPCs/items)
  - Characters should have `preventRecursion: true` (prevents mutual reference loops)
  - Items should have `preventRecursion: true` (terminal nodes)
  - Organizations should have `preventRecursion: false` (trigger member entries)
  - Hub entries must have `preventRecursion: false` (their entire purpose is recursion)
  - Regional encounters should have `preventRecursion: true` (terminal nodes)
  - Flag deviations as suggestions with explanation of why the default matters

### Check selective activation chains
- [ ] For entries with `selective: true`, verify the activation chain works:
  1. Is there a hub/location entry that mentions this entry's primary keywords?
  2. Does that hub/location entry also contain (or get triggered alongside) the
     secondary keywords?
  3. If not, this entry may be unreachable via recursion
- [ ] Flag regional encounter entries whose secondary keywords don't appear in any
  hub/location entry's keywords — the selective filter will prevent activation

### Present the recursion map
Show the user a summary of the linking architecture:
- Which entries are hubs (trigger many others)
- Which entries are leaves (triggered by others but don't trigger further)
- Which entries are islands (no incoming or outgoing links)
- Which entries use selective activation and what their activation chain looks like
- Any loops or problematic chains
- Any inclusion groups and their composition

This gives the user a birds-eye view of how their world is interconnected and where
the gaps are.

---

## 7. Overall assessment

After running all checks, provide a summary:

### Statistics
- Total entries
- Entries by type (constant vs keyword-activated vs selective)
- Estimated total token budget (all entries active)
- Estimated constant token cost (per-message overhead)
- Entry count by position (0/1/2/3/4)
- Inclusion groups (if any) with member counts
- Hub entries and their satellite counts

### Health score
Give a qualitative assessment of the lorebook's overall quality:
- **Structure:** Is the JSON clean and import-ready?
- **Configuration:** Are fields set correctly and consistently?
- **Keywords:** Will entries activate when they should and stay quiet when they shouldn't?
- **Content:** Is it evocative, well-structured, and right-sized?
- **Architecture:** Does recursion create a coherent, loop-free information network?
- **World population:** Does the hub + satellite structure ensure scenes feel populated?
  Are regional encounters properly filtered to their biomes?

### Priority fixes
List the top 3-5 most impactful changes the user could make, ordered by how much they'd
improve the lorebook's effectiveness in actual roleplay. Focus on changes that affect
the AI's behavior, not cosmetic cleanup.

---

## Generating the corrected version

After presenting the review, offer to generate a corrected lorebook with all fixes
applied. When generating corrections:

- Fix all errors unconditionally (these break things)
- Apply warning fixes with brief explanations of what changed
- For suggestions, ask the user which ones they want applied — these are judgment calls
- Preserve the user's creative content and intent; corrections should improve the
  mechanical configuration without rewriting their lore unless they ask for content
  improvements too
- Save the corrected file as a new `.json` and present both the original findings
  and the corrected file
