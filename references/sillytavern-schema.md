# SillyTavern Lorebook JSON Schema

## Import wrapper

Every lorebook file must be wrapped in this structure. Raw entries cannot be imported.

```json
{
  "entries": {
    "0": { ... entry object ... },
    "1": { ... entry object ... },
    "2": { ... entry object ... }
  }
}
```

- The `entries` object uses **string keys** (`"0"`, `"1"`, `"2"`) that match each
  entry's `uid` value.
- Single entry: `{"entries": {"0": {...}}}`
- Multiple entries: `{"entries": {"0": {...}, "1": {...}, "2": {...}}}`

## Required fields

Every entry must include all of these fields. Missing fields cause import failures.

```json
{
  "uid": 0,
  "key": ["keyword1", "keyword2"],
  "keysecondary": [],
  "comment": "Entry Title",
  "content": "Entry content here...",
  "constant": false,
  "selective": false,
  "selectiveLogic": 0,
  "addMemo": true,
  "order": 100,
  "position": 0,
  "disable": false,
  "probability": 100,
  "useProbability": true,
  "depth": 4,
  "delay": 0,
  "cooldown": 0,
  "sticky": 0,
  "vectorized": false,
  "ignoreBudget": false,
  "excludeRecursion": false,
  "preventRecursion": false
}
```

## Optional fields

These fields are not required for import but enable advanced features. Include them
when the lorebook uses these patterns.

```json
{
  "group": "",
  "groupWeight": 100,
  "groupOverride": false
}
```

## Field reference

### Fixed values (always use these defaults unless noted)

| Field | Default | When to deviate |
|-------|---------|-----------------|
| `vectorized` | `false` | Set `true` only for entries describing broad themes/vibes where keywords can't cover natural phrasings. See SKILL.md supplemental activation section. |
| `useProbability` | `true` | Virtually never deviate — when false, the probability field is ignored entirely |
| `excludeRecursion` | `false` | Set `true` only for Ali:Chat/example dialogue entries that shouldn't cascade (see recursion scalability in SKILL.md) |
| `addMemo` | `true` | Virtually never deviate — displays the comment field as a label in the UI |
| `disable` | `false` | Only set true if the user specifically wants an entry temporarily off |
| `depth` | `4` | Standard context depth for injection; changing this without specific reason causes inconsistent behavior |

### Configurable fields

**`uid`** (integer): Unique identifier. Must match the string key in the entries object.
Entry "0" has uid 0, entry "1" has uid 1, etc.

**`key`** (string array): Primary activation keywords. Use 2-5 keywords covering natural
variations. Supports plain text and JavaScript regex (delimited with `/`).
See keyword strategy in SKILL.md.

**`keysecondary`** (string array): Secondary keywords for selective activation. When
populated AND `selective` is true, the entry only activates when BOTH a primary AND
secondary keyword are present. Supports regex. Leave as `[]` for standard keyword
activation. Primary use case: regional filtering (creature names as primary keys,
region names as secondary keys).

**`comment`** (string): Entry title/label shown in the SillyTavern UI. Use format:
`"Entity Name"` or `"Entity Name - Descriptor"` (e.g., `"Marcus Thorn - Blacksmith"`).

**`content`** (string): The actual lore text injected into context. Target 30-200 tokens.
See content writing principles in SKILL.md.

**`constant`** (boolean): When `true`, entry is always active regardless of keywords.
Reserve for fundamental world rules that must never be forgotten. Constant entries
consume tokens on every generation.

**`selective`** (boolean): When `true`, requires both primary and secondary keywords to
activate. Must be `false` when `keysecondary` is empty.

**`selectiveLogic`** (integer): Controls how secondary keywords combine.
- `0` = AND ANY (OR logic) — entry fires if primary + any one secondary match
- `1` = AND ALL — entry fires only if primary + ALL secondary keys match
- `2` = NOT ANY — entry fires when primary matches but NO secondary keys are present
- `3` = NOT ALL — entry fires when primary matches but not ALL secondary keys are present
Set to `0` when not using secondary keys.

**Selective logic use cases:**
- `0` (AND ANY): Regional filtering — creature + any matching region keyword
- `1` (AND ALL): Very specific contexts — requires all conditions present
- `2` (NOT ANY): Exclusion — entry fires UNLESS certain words appear (e.g., a
  character's normal behavior that suppresses when anger keywords are present)
- `3` (NOT ALL): Partial exclusion — suppresses only when all exclusion words appear

**`order`** (integer): Priority within position. Higher = injected first. Range 80-300.
See order value strategy in SKILL.md. Also determines winner in inclusion groups when
`groupOverride` is true.

**`position`** (integer): Where in context the entry is injected. See position table in
SKILL.md. Values 0-4.

**`probability`** (integer): Percentage chance to activate when keywords match (1-100).
Use `100` for standard entries. Lower values create randomized activation — useful for
random encounters, mood variations, or environmental flavor.

**`delay`** (integer): Entry cannot activate until this many messages have passed in the
chat. Use `0` for standard entries. Useful for story beats that need setup time.
- Delay = 0 → can activate any time
- Delay = 1 → can't activate if chat is empty (no greeting)
- Delay = 2 → needs at least 2 messages in chat, etc.

**`cooldown`** (integer): After an entry deactivates (including after sticky duration),
it cannot reactivate for this many messages. Use `0` for standard entries. Useful for
preventing repetitive activation. Cooldown starts when sticky ends.

**`sticky`** (integer): Once activated, entry stays active for this many messages
regardless of keyword presence. Use `0` for standard entries (keyword-activated only).
Useful for temporary conditions like combat, weather, or injuries. Stickied entries
ignore probability checks on consequent scans until they expire.

| Sticky duration | Use case |
|-----------------|----------|
| 0 | Default — keyword-activated only |
| 3-5 | Brief scene elements (sudden weather, momentary emotions) |
| 5-8 | Medium events (combat encounters, conversations) |
| 8-12 | Extended conditions (serious injuries, ongoing quests) |
| 15+ | Semi-permanent states (curses, major character changes) |

**`vectorized`** (boolean): When `true`, entry can be activated by semantic similarity
via the Vector Storage extension in addition to keyword matching. Default `false`.
See SKILL.md supplemental activation section for when to use this.

**`ignoreBudget`** (boolean): When `true`, entry ignores the token budget limit and
always injects if activated. Use sparingly — it can overflow context.

**`excludeRecursion`** (boolean): When `true`, this entry's content is invisible to
recursive keyword scanning. Other entries' content cannot trigger this entry through
recursion. Useful for Ali:Chat example dialogue entries that shouldn't cascade but
should still fire on direct keyword mention.

**`preventRecursion`** (boolean): When `true`, this entry's content cannot trigger
other entries through recursion. Controls the outgoing side of the recursive linking
cascade.

**`group`** (string, optional): Inclusion group label. When multiple entries share
the same group label and activate simultaneously, only one is selected for injection.
Leave empty string `""` or omit for entries not in a group.

**`groupWeight`** (integer, optional): Selection weight within an inclusion group.
Higher = more likely to be chosen. Default 100. Only relevant when `group` is set.

**`groupOverride`** (boolean, optional): When `true`, the entry with the highest
`order` value in the group wins deterministically instead of random selection.
Default `false`. Only relevant when `group` is set.

### preventRecursion vs excludeRecursion

These control different directions of the recursion chain:

| Field | Direction | What it controls |
|-------|-----------|-----------------|
| `preventRecursion` | Outgoing | This entry's content can/cannot trigger OTHER entries |
| `excludeRecursion` | Incoming | OTHER entries' content can/cannot trigger THIS entry |

- `preventRecursion: true` = "My content won't activate other entries"
- `excludeRecursion: true` = "Other entries' content won't activate me"

Most entries should have both set to `false` (allows full bidirectional recursion) or
`preventRecursion: true` only (can be triggered by others, but won't trigger further).

### preventRecursion strategy by entity type

This is critical for avoiding infinite loops while maintaining useful information cascades.

| Entity type | preventRecursion | Reasoning |
|-------------|-----------------|-----------|
| Locations | `false` | Locations should trigger NPCs and items mentioned within them — this is the primary mechanism for building rich scenes |
| Characters | `true` | Characters frequently mention each other; without prevention, mutual references create infinite activation loops |
| Items | `true` | Items are typically terminal nodes — they get referenced by locations and characters but rarely need to cascade further |
| Rules | `true` | Rules describe systems; allowing recursion from rules would trigger related system entries unnecessarily |
| Organizations | `false` | Organizations should trigger their member entries when mentioned, building out faction context |
| Events | `true` | Events describe situations; recursion from events would over-activate related entries during scenes |
| Dialogue patterns | `true` | Speech entries are character-specific and shouldn't cascade |
| Hub entries | `false` | Hubs exist specifically to trigger satellite entries via recursion |
| Regional encounters | `true` | Creatures/encounters are terminal nodes activated by location hubs |

### Single-event technique

For one-time story moments that should fire once and never repeat:

```json
{
  "constant": true,
  "delay": 15,
  "cooldown": 9999,
  "probability": 100
}
```

This creates a guaranteed trigger at message 15 that effectively never repeats.
Useful for plot twists, character arrivals, or world-changing events.

### Selective activation examples

**Regional monster filtering:**
```json
{
  "key": ["Naga", "naga", "serpent folk", "snake people"],
  "keysecondary": ["Darkwater Swamp", "Blackfen", "swamp", "marsh", "wetland"],
  "selective": true,
  "selectiveLogic": 0,
  "content": "Naga are territorial serpentine predators native to swamplands..."
}
```
Activates only when BOTH a Naga keyword AND a swamp-region keyword are present.
The swamp location entry's content mentioning "Naga" provides the primary key; the
swamp name already in the scan buffer provides the secondary key.

**Character mood states:**
```json
{
  "key": ["Character Name"],
  "keysecondary": ["angry", "furious", "enraged"],
  "selective": true,
  "selectiveLogic": 0,
  "content": "When Character Name is angry, [behavioral changes]..."
}
```
Activates only when BOTH the character name AND an anger keyword appear.

**Exclusion pattern (NOT ANY):**
```json
{
  "key": ["Character Name"],
  "keysecondary": ["angry", "furious", "combat", "fighting"],
  "selective": true,
  "selectiveLogic": 2,
  "content": "Character Name's default calm demeanor..."
}
```
Activates when Character Name is mentioned but NONE of the exclusion keywords are
present. Pair this with AND ANY entries for the non-default states.

### Inclusion group example

**Random swamp encounter pool:**
```json
{
  "key": ["Naga"],
  "keysecondary": ["Darkwater Swamp", "swamp", "marsh"],
  "selective": true,
  "group": "swamp_encounters",
  "groupWeight": 100,
  "content": "A Naga surfaces from the murky water..."
}
```
```json
{
  "key": ["Bog Witch"],
  "keysecondary": ["Darkwater Swamp", "swamp", "marsh"],
  "selective": true,
  "group": "swamp_encounters",
  "groupWeight": 60,
  "content": "A Bog Witch watches from the treeline..."
}
```
If both activate simultaneously (e.g., the swamp hub mentions both), only one injects.
Naga has higher weight, so it's more likely to be selected.

## Validation checklist

Before outputting JSON, verify:

**Structure:** Wrapped in `{"entries": {...}}`; keys are strings matching UIDs.

**All fields present:** Every entry has every required field. No exceptions.

**Fixed values correct:** `useProbability: true`, `addMemo: true`, `disable: false`,
`depth: 4`. Check `vectorized` and `excludeRecursion` — these should be `false`
unless there's a specific documented reason for deviation.

**Logic consistency:**
- `keysecondary: []` → `selective: false`
- `selective: true` → `keysecondary` must be non-empty
- `constant: true` → `position: 4` (rules belong at highest priority)
- `sticky > 0` → `position: 3` (sticky entries are scene-level)
- Location/org/hub entries → `preventRecursion: false`
- Character/item/event/encounter entries → `preventRecursion: true`
- Regional encounters → `selective: true` with region names in `keysecondary`
- Inclusion group entries → all share the same `group` value

**Content quality:** 30-200 tokens, uses bracketed data format, opens with vivid
language, mentions related entities for recursion where appropriate.

**Keywords:** 2-5 per entry, cover natural variations, no overly generic terms.
