# Entry Templates by Category

Each template below shows the configurable fields and content structure for a specific
entry type. Fields not shown use the fixed defaults from `sillytavern-schema.md`.

## Template 1: World Rule / Mechanic

For fundamental laws, power limitations, mandatory protocols, physics constraints.
These are the load-bearing rules that the AI must never forget.

**Configuration:**
- `constant: true` — always active
- `position: 4` — highest priority injection
- `order: 280-300` — 300 for absolute physics, 280 for important but not world-breaking
- `preventRecursion: true` — rules shouldn't cascade into related system entries
- `key`: System name + related terms (even though constant entries don't need keywords
  to activate, keywords help with recursive triggering from other entries)

**Content structure:**
```
RULE: [ABSOLUTE STATEMENT]. [How the mechanism works]. [What happens on violation]
WILL INSTANTLY [consequence]. [Additional context or edge cases].
[ requirement(value); mechanism(value); restriction(value); consequence(value);
  exception(if any); ]
```

Rules should use direct, forceful language because the AI treats "MUST", "CANNOT", and
"WILL INSTANTLY" as harder constraints than softer phrasing. This isn't about being
dramatic — it's about reliability of enforcement.

**Content budget:** Keep under 100 tokens. Constant entries cost tokens every message,
so brevity directly impacts performance.

---

## Template 2: Character Core

For personality, relationships, motivations, backstory, core traits.

**Configuration:**
- `constant: false` — keyword-activated
- `position: 1` — character information gets high-priority placement
- `order`: 250 (protagonist), 200 (major supporting), 150 (standard)
- `preventRecursion: true` — prevents relationship mention loops
- `key`: Full name, first name, nickname, title, possessive forms
  (e.g., `["Marcus Thorn", "Marcus", "Marcus's", "Thorn", "the blacksmith"]`)

**Content structure:**
```
[Name] [vivid action/description that establishes character essence].
[ role(value); personality(trait1, trait2, trait3); background(origin/history);
  relationships(Name1(dynamic); Name2(dynamic)); appearance(physical details);
  age(value); skills(skill1, skill2); ]
[Emotional core or driving motivation]. [Behavioral pattern or mannerism].
```

The opening sentence should make the AI *feel* who this character is, not just list
facts. "Marcus Thorn hammers steel with the same stubborn intensity he brings to
everything" tells the AI more about personality than a trait list alone.

---

## Template 3: Location

For cities, buildings, landmarks, districts, regions.

**Configuration:**
- `constant: false` — keyword-activated
- `position: 0` — general world context
- `order`: 120 (critical locations), 100 (standard)
- `preventRecursion: false` — locations should trigger NPC and item entries mentioned
  within them; this is the primary mechanism for building rich scenes
- `key`: Proper name, descriptor variations, associated NPC name, unique features
  (e.g., `["Rusty Flagon", "the flagon", "the tavern", "Patches' place"]`)

**Content structure:**
```
[Location] [vivid sensory description with action verb].
[ owner(name); atmosphere(sensory details); notable_features(feature1; feature2);
  history(brief context); population(demographics); threat_level(value); ]
[Middle prose with additional detail]. [Mention NPCs or items present by name].
[Mention regional creatures/threats by name for recursive activation].
```

The final mention of related entities is critical — it's what makes recursion work.
When the location entry fires and its content mentions "Patches", the Patches character
entry activates too, giving the AI a rich scene with both setting and inhabitants.

**For region-level locations** (swamps, forests, mountain ranges), mention the creatures
and threats native to that region by name. This seeds the recursive chain for regional
encounter entries. "The swamp is stalked by Naga and haunted by Bog Witches" causes
both creature entries to activate if they pass their selective filters.

---

## Template 4: Item / Weapon

For artifacts, weapons, significant objects, magical items.

**Configuration:**
- `constant: false` — keyword-activated
- `position: 0` — general world context
- `order`: 120 (plot-critical items), 100 (standard)
- `preventRecursion: true` — items are terminal nodes in the recursion chain
- `key`: Proper name, descriptor, visual feature, type, owner reference
  (e.g., `["Bloodfang", "the crimson blade", "cursed sword", "Kael's blade"]`)

**Content structure:**
```
[Item] [physical description with sensory details].
[ type(category); origin(creation/discovery); power(mechanical effect);
  limitation(restriction/cost); current_status(location/owner);
  appearance(visual details); material(substance); ]
[Sensory qualities — texture, sound, visual effects]. [Historical significance].
```

Balance mechanical information (what it does) with sensory texture (what it looks/feels
like). The AI uses both to write compelling scenes.

---

## Template 5: Scene Event

For combat, weather, injuries, temporary conditions, ongoing events.

**Configuration:**
- `constant: false` — keyword-activated
- `position: 3` — scene-level depth injection
- `order: 100`
- `sticky`: 5 (brief events), 8 (standard combat/scenes), 12 (extended conditions)
- `preventRecursion: true` — events shouldn't cascade
- `key`: Event name, trigger phrases, condition descriptors
  (e.g., `["warehouse fire", "the fire", "burning warehouse"]`)

**Content structure:**
```
[DRAMATIC OPENING IN PRESENT TENSE].
[ threat_level(value); participants(list); terrain(environmental constraints);
  duration(expected length); consequences(immediate effects);
  conditions(active states); ]
[Specific tactical/environmental details]. [Active sensory descriptions].
```

Scene events should read like stage directions — present tense, active, urgent.
The sticky duration keeps the event in context for multiple messages so the AI
maintains consistency throughout a scene rather than forgetting mid-combat.

---

## Template 6: Dialogue Pattern

For speech quirks, accents, verbal tics, distinctive communication styles.

**Configuration:**
- `constant: false` — keyword-activated
- `position: 2` — dialogue-specific placement
- `order: 100`
- `preventRecursion: true`
- `excludeRecursion: false` — leave default; set `true` only if the example dialogue
  phrases contain keywords that would falsely trigger other entries
- `key`: Character name, first name, speech style descriptor

**Content structure:**
```
When [Character Name] speaks, [description of pattern].
[ pattern(specific quirk); vocabulary(word choices); grammar(structural peculiarities);
  tone(emotional quality); pace(speed); ]
[2-3 example phrases in quotes]. [Context when pattern intensifies or changes].
```

Only create separate dialogue entries when a character's speech pattern is distinctive
enough to warrant its own entry. If a character just "speaks formally," that can go in
their character core entry instead. Reserve this template for truly unique speech —
accents, verbal tics, code-switching, unusual syntax.

---

## Template 7: Organization / Faction

For governments, guilds, corporations, military units, secret societies.

**Configuration:**
- `constant: false` — keyword-activated
- `position: 0` — general world context
- `order`: 120 (major factions), 100 (minor)
- `preventRecursion: false` — organizations should trigger their member entries
- `key`: Full name, acronym/short form, colloquial name
  (e.g., `["Obsidian Consortium", "the Consortium", "Obsidian Corp"]`)

**Content structure:**
```
[Organization] [defining characteristic or reputation].
[ type(government/guild/corporation/etc); leadership(names/structure);
  headquarters(location); size(scale); goals(primary objectives);
  methods(how they operate); reputation(public perception);
  resources(capabilities); ]
[Historical context]. [Mention key members by name].
```

Like locations, organizations should mention their key members by name to enable
recursive activation. When someone mentions the faction, the AI should also get
context about its leaders.

---

## Template 8: System Component

For specific spells, abilities, technologies — components of larger systems, not
the fundamental rules themselves.

**Configuration:**
- `constant: false` — keyword-activated (unlike the parent rule, which may be constant)
- `position: 0` — general context
- `order: 100`
- `preventRecursion: true`
- `key`: Ability name, informal name, visual effect descriptor

**Content structure:**
```
[Ability] [dramatic description of effect].
[ type(category within parent system); cost(resource/requirement);
  effect(mechanical result); duration(how long); range(distance/area);
  limitation(restrictions); visual(sensory description); ]
[Tactical applications or common uses]. [Known practitioners].
```

These entries reference their parent system in content for thematic consistency but
are keyword-activated so they only fire when specifically relevant, unlike the parent
rule which may be constant.

---

## Template 9: Regional Encounter

For creatures, NPCs, hazards, or events that should only appear in specific regions.
Uses selective activation to bind the encounter to its home territory.

**Configuration:**
- `constant: false` — keyword-activated with selective filter
- `selective: true` — requires BOTH creature keyword AND region keyword
- `selectiveLogic: 0` — AND ANY (any matching region keyword satisfies the filter)
- `position: 0` — general world context
- `order: 100`
- `preventRecursion: true` — encounters are terminal nodes
- `key`: Creature/encounter name, common name, descriptors
- `keysecondary`: Region names, terrain types, location-specific keywords
- `group`: (optional) Regional encounter pool name for random selection
- `groupWeight`: (optional) Selection weight within the pool (default 100)

**Content structure:**
```
[Creature/encounter] [vivid action that establishes threat or presence].
[ type(creature/hazard/NPC); habitat(terrain types); threat_level(value);
  behavior(hunting patterns, territorial habits); weaknesses(if any);
  appearance(physical description); abilities(combat relevant details); ]
[Sensory details of encounter]. [Behavioral patterns the AI should roleplay].
```

**How the regional filter works:**
The creature entry sits dormant until BOTH conditions are met:
1. A primary keyword appears (creature name — typically seeded by a location hub entry
   mentioning the creature)
2. A secondary keyword appears (region name — already in the scan buffer because the
   location entry that mentioned the creature also contains the region name)

This prevents creatures from appearing outside their natural habitat. A forest
creature won't activate in a swamp scene because the swamp location entry doesn't
mention forest creatures, and even if the creature name appeared in conversation,
the forest region keywords wouldn't be in the scan buffer.

**Inclusion group pattern:** To create a random encounter pool for a region, give all
regional creatures the same `group` value (e.g., `"swamp_encounters"`). Adjust
`groupWeight` to make common creatures more likely and rare ones less likely. When
the location hub triggers multiple creatures from the pool, only one injects.

---

## Template 10: Hub Entry

For overview/index entries whose primary purpose is to seed recursive activation of
satellite entries. Hubs are the connective tissue that makes a world feel populated.

**Configuration:**
- `constant: false` — keyword-activated (or constant if it's a top-level world hub)
- `position: 0` — general world context
- `order: 120`
- `preventRecursion: false` — hubs MUST allow recursion; their entire purpose is to
  trigger satellite entries
- `key`: Broad category keywords, region names, topic keywords

**Content structure:**
```
[Brief overview establishing the concept — 1-2 sentences max].
[ category(type); scope(what this covers); key_elements(list); ]
[Mention specific sub-entities by their exact keyword-matchable names].
```

**Content budget:** Keep hubs lean — 50-80 tokens. The hub's job is to seed keywords,
not to carry detailed information. The detail lives in the satellite entries.

**Example:**
```
Darkwater Swamp teems with hostile life.
[ region(Swamplands); threats(Naga, Bog Witch, Marsh Elemental);
  resources(Swamp Lotus, Blackwater Extract); landmarks(Sunken Temple); ]
Travelers are warned about Naga hunting parties and the elusive Bog Witches.
```

This entry is ~50 tokens but seeds keywords for 5 satellite entries (3 creatures,
2 items/locations). Each satellite carries its own 80-150 tokens of detail, activated
only when the hub fires or when mentioned directly.

---

## Template selection logic

When analyzing input, determine the template by asking:

1. Does it contain hard rules with "must", "cannot", "forbidden"? → **Template 1** (World Rule)
2. Is it a person or character? → Does it focus on speech patterns specifically? → **Template 6** (Dialogue). Otherwise → **Template 2** (Character Core)
3. Is it a place? → **Template 3** (Location)
4. Is it an object, weapon, or artifact? → **Template 4** (Item)
5. Is it a temporary condition or event? → **Template 5** (Scene Event)
6. Is it a group, faction, or organization? → **Template 7** (Organization)
7. Is it a specific ability or technology within a larger system? → **Template 8** (System Component)
8. Is it a creature, hazard, or encounter tied to a specific region? → **Template 9** (Regional Encounter)
9. Is it a broad category or overview that references many sub-entities? → **Template 10** (Hub Entry)

When in doubt, prefer the more specific template. A character who owns a shop gets a
character entry AND a location entry — don't try to force both into one template.

**When to create hub entries:** If you find yourself writing a location or organization
entry that's trying to describe 5+ sub-entities in detail, split it. The parent becomes
a hub (lean overview + keyword seeds) and each sub-entity gets its own satellite entry.
