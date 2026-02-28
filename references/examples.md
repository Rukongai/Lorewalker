# Worked Examples & Edge Cases

## Example 1: Simple location with NPC

**Input:**
"The Crimson Library is an ancient repository of forbidden knowledge. It's guarded by
magical wards and contains books on dark magic. The head librarian is a lich named Mordain."

**Analysis:**
- 2 distinct concepts: Location (library) + Character (Mordain)
- The library should mention Mordain to enable recursive activation
- Mordain gets his own entry because he's a named character with agency

**Output:**
```json
{
  "entries": {
    "0": {
      "uid": 0,
      "key": ["Crimson Library", "the library", "forbidden repository", "Mordain's library"],
      "keysecondary": [],
      "comment": "Crimson Library",
      "content": "The Crimson Library looms in perpetual shadow, its walls thrumming with ancient ward-magic. [ purpose(Repository of forbidden knowledge); security(Magical wards, defensive enchantments); contents(Dark magic tomes, necromantic scrolls, banned histories); atmosphere(Oppressive, silent, smells of old parchment and decay); curator(Mordain the Lich); access(Restricted); ] Mordain, the lich head librarian, guards its secrets with undead vigilance.",
      "constant": false,
      "selective": false,
      "selectiveLogic": 0,
      "addMemo": true,
      "order": 120,
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
    },
    "1": {
      "uid": 1,
      "key": ["Mordain", "the lich", "head librarian", "Mordain the Lich"],
      "keysecondary": [],
      "comment": "Mordain - Lich Librarian",
      "content": "Mordain is an ancient lich who serves as head librarian of the Crimson Library. [ race(Undead lich); role(Head librarian, keeper of forbidden knowledge); personality(Obsessively organized, coldly intellectual, disdainful of the living); appearance(Skeletal frame in tattered crimson robes, eye sockets glow with green witch-light); motivation(Preservation of knowledge above all else); power(Necromantic magic, ward-crafting); ] Mordain views visitors as potential thieves and greets them with barely concealed hostility.",
      "constant": false,
      "selective": false,
      "selectiveLogic": 0,
      "addMemo": true,
      "order": 150,
      "position": 1,
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
      "preventRecursion": true
    }
  }
}
```

**Why this works:**
- Library entry mentions "Mordain" → triggers Mordain's entry recursively
- Library has `preventRecursion: false` (location → triggers NPCs)
- Mordain has `preventRecursion: true` (character → prevents loops)
- Mordain's entry mentions "Crimson Library" but since his `preventRecursion` is true,
  it won't re-trigger the library entry in a loop

---

## Example 2: World rule with absolute limitation

**Input:**
"In this world, necromancy requires a human sacrifice to work. The sacrifice must be
willing. Forced sacrifices cause the spell to backfire and kill the caster instantly.
This is an absolute law of magic that cannot be circumvented."

**Analysis:**
- Type: Fundamental world rule with clear consequences
- Contains absolute language: "must", "cannot", "instantly"
- Should be constant — forgetting this for one message could create a plot hole

**Output:**
```json
{
  "entries": {
    "0": {
      "uid": 0,
      "key": ["necromancy", "necromantic magic", "raising dead", "death magic"],
      "keysecondary": [],
      "comment": "Necromancy - Sacrifice Requirement",
      "content": "RULE: Necromancy REQUIRES a willing human sacrifice to function. The sacrifice MUST consent freely and without coercion. Any attempt to use a forced sacrifice WILL INSTANTLY cause catastrophic spell backfire, killing the caster immediately. This is an ABSOLUTE law of magic that CANNOT be circumvented by any means. [ requirement(Willing human sacrifice); consent(Must be freely given); violation_consequence(Instant caster death); bypass_possibility(Impossible); ]",
      "constant": true,
      "selective": false,
      "selectiveLogic": 0,
      "addMemo": true,
      "order": 290,
      "position": 4,
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
      "preventRecursion": true
    }
  }
}
```

---

## Example 3: Temporary combat event

**Input:**
"The warehouse is on fire. Smoke fills the upper levels. Visibility is reduced to 10 feet.
The fire is spreading rapidly toward the chemical storage area. Characters have
approximately 5 minutes before the chemicals explode."

**Output:**
```json
{
  "entries": {
    "0": {
      "uid": 0,
      "key": ["warehouse fire", "the fire", "burning warehouse", "chemical explosion"],
      "keysecondary": [],
      "comment": "Warehouse Fire Event",
      "content": "THE WAREHOUSE IS ABLAZE. Thick black smoke chokes the upper levels, reducing visibility to barely ten feet. [ threat_level(Critical - imminent explosion); visibility(10 feet maximum); smoke_effects(Choking, disorienting); fire_spread(Rapid, moving toward chemical storage); time_limit(~5 minutes until chemical explosion); terrain(Cluttered with crates and debris); escape_routes(Main entrance blocked; side door accessible; loading dock uncertain); ] The fire roars louder by the second. Heat is intense and growing. Every moment counts.",
      "constant": false,
      "selective": false,
      "selectiveLogic": 0,
      "addMemo": true,
      "order": 100,
      "position": 3,
      "disable": false,
      "probability": 100,
      "useProbability": true,
      "depth": 4,
      "delay": 0,
      "cooldown": 0,
      "sticky": 8,
      "vectorized": false,
      "ignoreBudget": false,
      "excludeRecursion": false,
      "preventRecursion": true
    }
  }
}
```

**Why sticky 8:** Combat/crisis scenes typically last 5-10 messages. Sticky 8 keeps
the fire conditions in context throughout the scene so the AI doesn't suddenly forget
the building is burning mid-escape.

---

## Example 4: Organization with key members

**Input:**
"The Obsidian Consortium is a megacorporation that controls 40% of galactic shipping.
Led by CEO Valeria Kross. Known for ruthless business practices and political
manipulation. Headquartered on Station Omega-7. Has three divisions: Logistics,
Security, and Research. The Security Division is run by Director Kaelen Rourke,
a former military officer."

**Analysis:**
- 3 distinct concepts: Organization + CEO + Security Director
- Organization entry should mention both leaders by name for recursion
- Each named character gets their own entry

**Output:**
```json
{
  "entries": {
    "0": {
      "uid": 0,
      "key": ["Obsidian Consortium", "the Consortium", "Obsidian Corp"],
      "keysecondary": [],
      "comment": "Obsidian Consortium",
      "content": "The Obsidian Consortium controls forty percent of galactic shipping through shrewd acquisitions and brutal market manipulation. [ type(Megacorporation); market_share(40% galactic shipping); leadership(CEO Valeria Kross); headquarters(Station Omega-7); divisions(Logistics, Security under Director Kaelen Rourke, Research); reputation(Ruthless, politically influential); methods(Hostile takeovers, political bribes, industrial espionage); ] The Consortium's black-and-gold logo is recognized and feared across civilized space.",
      "constant": false,
      "selective": false,
      "selectiveLogic": 0,
      "addMemo": true,
      "order": 120,
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
    },
    "1": {
      "uid": 1,
      "key": ["Valeria Kross", "CEO Kross", "Kross", "Valeria"],
      "keysecondary": [],
      "comment": "Valeria Kross - CEO",
      "content": "Valeria Kross clawed her way to the top of the Obsidian Consortium through calculated ruthlessness. [ role(CEO, Obsidian Consortium); personality(Coldly calculating, charismatic when needed, utterly pragmatic); background(Rose from middle management through strategic betrayals); appearance(Immaculately dressed, sharp features, eyes like cold steel); methods(Political manipulation, leveraged blackmail); ] Kross views people as assets or obstacles, nothing more.",
      "constant": false,
      "selective": false,
      "selectiveLogic": 0,
      "addMemo": true,
      "order": 150,
      "position": 1,
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
      "preventRecursion": true
    },
    "2": {
      "uid": 2,
      "key": ["Kaelen Rourke", "Director Rourke", "Rourke", "Security Director"],
      "keysecondary": [],
      "comment": "Kaelen Rourke - Security Director",
      "content": "Director Kaelen Rourke commands the Obsidian Consortium's Security Division with military precision. [ role(Security Division Director, Obsidian Consortium); background(Former military officer, Colonial Wars veteran); personality(Disciplined, loyal to the Consortium, pragmatically violent); capabilities(Tactical expertise, intelligence operations); relationship(Reports to CEO Valeria Kross, one of her most trusted operatives); appearance(Scarred face, military bearing, always armed); ] Rourke executes orders without moral hesitation.",
      "constant": false,
      "selective": false,
      "selectiveLogic": 0,
      "addMemo": true,
      "order": 150,
      "position": 1,
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
      "preventRecursion": true
    }
  }
}
```

**Recursion flow:** Mentioning "Obsidian Consortium" → triggers org entry → content
mentions "Valeria Kross" and "Kaelen Rourke" → triggers both character entries. The
org has `preventRecursion: false` so this cascade works. The characters have
`preventRecursion: true` so they don't loop back.

---

## Example 5: Regional encounter pool with selective activation

**Input:**
"Darkwater Swamp is a dangerous wetland. Naga lurk beneath the murky waters — serpentine
predators that hunt in packs. Bog Witches haunt the deeper reaches, using illusion magic
to lure travelers off safe paths. Marsh Elementals form during storms, violent and
mindless. The swamp also contains Swamp Lotus, a rare alchemical ingredient."

**Analysis:**
- 5 distinct concepts: Location (swamp) + 3 creatures + 1 item
- The swamp is a hub entry that should mention all creatures by name
- Each creature needs selective activation tied to swamp region keywords
- Creatures form a regional encounter pool (inclusion group)
- The item is a standard entry, not part of the encounter pool

**Output:**
```json
{
  "entries": {
    "0": {
      "uid": 0,
      "key": ["Darkwater Swamp", "the swamp", "Darkwater", "swamplands", "wetlands"],
      "keysecondary": [],
      "comment": "Darkwater Swamp - Region Hub",
      "content": "Darkwater Swamp sprawls for miles, a fetid maze of black water and gnarled cypress. [ terrain(Wetland, treacherous footing, deep pools); atmosphere(Perpetual mist, sulfurous stench, buzzing insects); threats(Naga hunting parties, Bog Witches, Marsh Elementals during storms); resources(Swamp Lotus, rare alchemical plants); navigation(Extremely difficult, paths shift with water levels); ] Naga dominate the waterways. Bog Witches claim the deeper reaches. During storms, Marsh Elementals rise from the muck without warning.",
      "constant": false,
      "selective": false,
      "selectiveLogic": 0,
      "addMemo": true,
      "order": 120,
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
    },
    "1": {
      "uid": 1,
      "key": ["Naga", "naga", "serpent folk", "snake people"],
      "keysecondary": ["Darkwater Swamp", "Darkwater", "swamp", "marsh", "wetland"],
      "comment": "Naga - Swamp Predator",
      "content": "Naga are territorial serpentine predators that dominate the waterways of Darkwater Swamp. [ type(Hostile creature); habitat(Swamps, marshes, deep water); behavior(Pack hunters, ambush from underwater, drag prey beneath surface); appearance(Upper body humanoid with scaled skin, lower body massive serpent tail, 12-15 feet total length); abilities(Aquatic speed, constriction, venomous bite); weakness(Slow on dry land, sensitive to cold); threat_level(Dangerous in groups); ] Naga strike from below without warning, wrapping prey in crushing coils.",
      "constant": false,
      "selective": true,
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
      "preventRecursion": true,
      "group": "swamp_encounters",
      "groupWeight": 100
    },
    "2": {
      "uid": 2,
      "key": ["Bog Witch", "Bog Witches", "bog witch", "swamp witch"],
      "keysecondary": ["Darkwater Swamp", "Darkwater", "swamp", "marsh", "wetland"],
      "comment": "Bog Witch - Swamp Illusionist",
      "content": "Bog Witches haunt the deepest reaches of Darkwater Swamp, rarely seen but always felt. [ type(Hostile creature, magic user); habitat(Deep swamp, ancient trees, stagnant pools); behavior(Solitary, uses illusion magic to lure travelers off safe paths); appearance(Gaunt humanoid draped in moss and hanging vines, face obscured, moves silently); abilities(Illusion magic, terrain manipulation, curse-weaving); weakness(Vulnerable when illusions are broken, afraid of fire); threat_level(Lethal if illusions succeed); ] Travelers hear whispered promises from the mist. Those who follow never return.",
      "constant": false,
      "selective": true,
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
      "preventRecursion": true,
      "group": "swamp_encounters",
      "groupWeight": 60
    },
    "3": {
      "uid": 3,
      "key": ["Marsh Elemental", "Marsh Elementals", "marsh elemental"],
      "keysecondary": ["Darkwater Swamp", "Darkwater", "swamp", "marsh", "storm", "storms"],
      "comment": "Marsh Elemental - Storm Creature",
      "content": "Marsh Elementals coalesce from swamp mud and stormwater during severe weather over Darkwater Swamp. [ type(Hostile elemental); habitat(Swamps during storms only); behavior(Mindless, violent, attacks anything nearby); appearance(Towering humanoid shape of churning mud and black water, 8-10 feet tall); abilities(Crushing strength, reforms when damaged, drowning attacks); weakness(Dissipates when storm passes, vulnerable to drying magic); trigger(Only appears during storms); threat_level(Extremely dangerous but temporary); ] When thunder rolls over the swamp, the mud itself rises to kill.",
      "constant": false,
      "selective": true,
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
      "preventRecursion": true,
      "group": "swamp_encounters",
      "groupWeight": 40
    },
    "4": {
      "uid": 4,
      "key": ["Swamp Lotus", "swamp lotus", "lotus flower", "alchemical flower"],
      "keysecondary": [],
      "comment": "Swamp Lotus - Alchemical Ingredient",
      "content": "The Swamp Lotus blooms only in the stagnant pools of Darkwater Swamp, its petals an iridescent blue that glows faintly at night. [ type(Rare alchemical ingredient); location(Darkwater Swamp, deepest pools); properties(Potent healing catalyst, poison neutralizer); rarity(Extremely rare); harvesting(Must be picked at night during bloom, dissolves in sunlight); value(Worth a small fortune to alchemists); ] Harvesters risk Naga-infested waters for a single bloom.",
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
      "preventRecursion": true
    }
  }
}
```

**How the regional filtering works in practice:**

1. User writes: "We approach the edge of Darkwater Swamp."
2. "Darkwater Swamp" matches the swamp hub entry (uid 0) → fires
3. Hub content mentions "Naga", "Bog Witches", "Marsh Elementals", "Swamp Lotus"
4. Recursion scan checks these against other entries:
   - "Naga" matches uid 1's primary key. Is "Darkwater Swamp" in scan buffer?
     Yes → secondary key satisfied → Naga entry activates
   - "Bog Witches" matches uid 2. Secondary check passes → activates
   - "Marsh Elementals" matches uid 3. Secondary check passes → activates
   - "Swamp Lotus" matches uid 4. No selective filter → activates normally
5. BUT: Naga, Bog Witch, and Marsh Elemental all share `group: "swamp_encounters"`
   → only ONE is selected (weighted random: Naga most likely, Elemental least)
6. Final context gets: Swamp description + one random encounter + Swamp Lotus info

**What happens in a different region:**
1. User writes: "We enter the Thornwood Forest."
2. Thornwood entry fires. Its content mentions "Dire Wolves" and "Wood Sprites"
3. "Naga" never appears in the scan buffer → Naga entry stays dormant
4. Even if someone says "Watch out for Naga!" in the forest, the secondary key
   "Darkwater Swamp" / "swamp" / "marsh" is not in the scan buffer → still dormant

---

## Edge case patterns

### Ambiguous input

**Problem:** "The Shadow" — person, organization, or phenomenon?

**Approach:** Default to the most specific interpretation. Use the `comment` field to
clarify (`"The Shadow - Criminal Syndicate"`). Add context in content that disambiguates.
Make keywords specific enough to avoid false triggers:
`["The Shadow", "Shadow syndicate", "criminal organization"]`

### Overlapping keywords

**Problem:** Two entries share generic keywords like "the Keep."

**Approach:** Remove the generic keyword from both and use specific variations instead.
`["Iron Keep", "the Iron Keep"]` and `["Keep of Storms", "Storm Keep"]`. If both
genuinely could be called "the Keep," add contextual keywords that differentiate:
`["the Keep", "northern fortress"]` vs `["the Keep", "eastern citadel"]`.

### Character with multiple roles

**Problem:** Character is a shop owner AND a quest-giver AND has combat abilities.

**Approach:** Split by function. Character core entry (personality, background,
relationships) at position 1. Their shop/location as a separate entry at position 0.
Combat abilities only need a separate entry if they're complex enough to warrant one.

### Very long input (500+ tokens of lore)

**Approach:** Create a hub entry (50-80 tokens) with the overview, then detail entries
for sub-components linked by recursion. The hub mentions sub-component keywords so
they cascade naturally.

Example: "Arcane College" hub entry mentions "four schools: Evocation, Abjuration,
Divination, and Necromancy" → each school gets its own entry that activates when the
hub fires or when mentioned directly.

### Contradictory information

**Approach:** Acknowledge the ambiguity in the entry content rather than picking a side.
`"Bloodfang's origins are disputed. [ claimed_age(Ancient); actual_age(Possibly modern); mystery(Origin uncertain); ]"`

### Extremely brief input

**Problem:** User just says "A haunted forest."

**Approach:** Expand minimally with atmosphere and sensory details, but do not fabricate
specific names, backstories, or major plot points that aren't in the input.
```
"The forest is said to be haunted. [ atmosphere(Eerie, unsettling);
reputation(Locals avoid it); phenomena(Strange sounds, unexplained lights); ]
Travelers report feeling watched among the twisted trees."
```

### Input is purely mechanical rules

**Problem:** "Magic costs mana. Mana regenerates at 10/hour. Max mana is 100."

**Approach:** Wrap in rule format with absolute language. Make it a constant entry if
the rule is fundamental enough. Keep the mechanical data in bracketed format for AI parsing.

### Meta-information in input

**Problem:** Input says "This character should be mysterious" or "Don't reveal this yet."

**Approach:** Convert the meta-instruction into in-world mechanical behavior:
`"The Stranger's past remains shrouded in secrecy. They deflect personal questions.
[ identity(Unknown - intentionally obscured); background(Deliberately vague); ]"`

### Temporal events (past/present/future states)

**Approach A — Current state focus:** Describe current state with historical context in
bracketed data: `"The ruins of Castle Blackmoor stand abandoned.
[ current_state(Ruined); former_state(Mighty fortress); fall_date(50 years ago); ]"`

**Approach B — Multiple time-state entries:** Create separate entries with different
keywords. The current state entry uses present-day keywords (`"Blackmoor", "the ruins"`).
The historical entry uses history-specific keywords
(`"Blackmoor history", "Castle's fall"`).

### Circular character references

**Problem:** Character A and B are rivals who reference each other.

**Approach — Asymmetric linking:** Character A's entry mentions B by name,
`preventRecursion: true`. Character B's entry describes the rivalry without using A's
exact keyword-matchable name (e.g., "their rival" instead of "Character A"), also
`preventRecursion: true`. This way A can trigger B (through the location or other entry
that mentions A), but they won't trigger each other in a loop.

### Creatures that span multiple regions

**Problem:** Wolves appear in both forests and mountains.

**Approach:** Use broad terrain keywords in `keysecondary` rather than specific location
names: `keysecondary: ["forest", "woods", "mountain", "highlands", "wilderness"]`. Or
create region-specific variants: "Timber Wolf" for forests, "Mountain Wolf" for peaks,
each with their own regional secondary keys and different behavioral descriptions.

### Encounter pools that should always fire one entry

**Problem:** You want the swamp to ALWAYS present a threat, not just when the random
encounter pool selects one.

**Approach:** Separate the ambient threat description from the specific encounter. The
hub entry's own content should describe the general atmosphere of danger ("something
moves beneath the water, eyes watch from the mist"). The inclusion group handles which
*specific* threat materializes. The atmosphere is always present via the hub; the
specific creature is randomized via the group.
