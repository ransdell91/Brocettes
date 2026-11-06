# Data Model

The goal: anything a player might ask mid-session ("who was that dwarf?",
"what did the priest want us to do?", "how much do we owe the Guild?") should
be answerable in under 10 seconds from a phone.

## Design rules that apply to everything

1. **Every fact cites its session.** Each entry records `first_seen` and a list
   of `sources` (session number + optional transcript timestamp/quote). This lets
   people check the original and settles "did they actually say that?" debates.
2. **Aliases are first-class.** Transcription bots mishear fantasy names
   ("Xyrra" / "Zeera" / "Kira"). Every named entity has an `aliases` list, used
   both for search and for matching new transcript mentions to existing entries.
3. **What the party believes vs. what is true.** Lore and NPC motives are often
   lies, rumours or partial truths. Facts carry a `confidence`:
   `confirmed | claimed | rumoured | disproven`, plus *who* claimed it.
4. **Visibility.** Each entry (or field) is `public` (players) or `dm` (hidden).
   Lets the DM keep secrets in the same place without spoiling anything.
   Because the source is a transcript of what was said at the table, almost all
   imported content is `public` by default.
5. **Status changes over time, keep the history.** A quest goes rumoured →
   active → completed; an NPC goes ally → enemy → dead. Store the current status
   *and* a dated log of changes ("Session 14: betrayed the party").
6. **Everything links to everything.** Relationships are stored as typed links
   (`npc ↔ faction: member`, `quest ↔ npc: giver`), so every page shows
   "appears in", "related quests", etc. automatically.

## Entities

### Session
The backbone; everything else hangs off it.
| Field | Notes |
|---|---|
| number, real-world date | |
| in-game date / days elapsed | if the campaign tracks a calendar |
| title | short, fun ("The One Where Brog Ate the Map") |
| recap (short) | 3–5 bullets — the "previously on…" read aloud at the start of next session |
| recap (full) | a few paragraphs |
| locations visited, NPCs met, quests touched | links |
| loot & rewards | items, gold, XP/level-ups |
| memorable quotes / moments | the fun stuff players love rereading |
| cliffhanger / where we left off | the single most-used field at the start of a session |
| source | link + section of the Google Doc transcript |

### Player Character
| Field | Notes |
|---|---|
| name, player, pronouns | |
| race, class/subclass, level | level history by session |
| portrait | optional |
| backstory summary, goals, bonds, flaws | |
| personal quests | links to Quests |
| key relationships | to NPCs and other PCs |
| notable items | links to Items |
| status | active / retired / dead (+ how, which session) |
| secrets | `dm` visibility |

### NPC
| Field | Notes |
|---|---|
| name, aliases, pronunciation | pronunciation is gold for transcripts |
| title / role / occupation | |
| race, appearance, voice & mannerisms | helps the DM stay consistent |
| location (usual / last seen) | links |
| factions | links with role |
| disposition toward party | hostile → friendly scale, with history |
| what the party knows | bullet facts with sources |
| status | alive / dead / missing / unknown |
| first & last appearance | session links |
| true motives | `dm` visibility |

### Faction / Organization
Name, aliases, type (guild, cult, noble house, nation), goals (known vs. true),
leader, notable members, base of operations, allies/rivals, party's standing
with them (with history).

### Location
Hierarchical (plane → region → city → district → building), with description,
notable NPCs, controlling faction, points of interest, sessions visited,
and an optional map image + pin.

### Quest
| Field | Notes |
|---|---|
| title, type | main / side / personal (per PC) / faction |
| status | rumoured / available / active / completed / failed / abandoned |
| giver, reward (promised vs. received) | |
| objectives | checklist, each with its own status |
| deadline | in-game, if any |
| related NPCs, locations, items | |
| storyline | link to parent Storyline |
| log | dated status changes |

### Storyline / Arc
Groups quests, mysteries and events into the big narrative threads
("The Sunken Crown", "Brog's Family Curse"). Summary, status, the quests and
mysteries inside it, key sessions.

### Lore Entry
Topic types: history, religion & deities, magic, cosmology, culture, creatures,
legends/prophecies. Each statement carries `confidence` + who told the party.
Prophecies get their exact wording preserved.

### Item
Name, type, rarity, magical properties (known vs. unidentified), current holder,
provenance (where/when found), attunement, charges. Separate flag for plot
items/artifacts.

### Mystery / Open Thread ⭐
Probably the most useful thing for the DM and the most often forgotten.
A question the story has raised and not answered yet: "Who hired the
assassins?", "What's in the locked box from Session 3?". Fields: question,
raised in session, clues collected (linked to sessions), party theories,
status (open / resolved + answer + session).

### Party Ledger
Shared state that's hard to remember: party gold & shared inventory,
**debts, favours and promises** (both directions — "we promised the Baron we'd
return the ring"), bounties on the party, owned property/vehicles/mounts,
reputation.

### Timeline Event
In-game dated events — both things the party did and historical lore events —
so the app can render a campaign timeline.

## In-session features this data enables

- **Global quick search** (name *or* alias, fuzzy) from any page.
- **"Last time on…"** card: previous session's short recap + cliffhanger.
- **Who's that?** — NPC card with first appearance, last seen, what we know.
- **Active quests** board grouped by storyline, with outstanding objectives.
- **Open mysteries** list with clues so far.
- **Ledger** — who owes whom.
- **Session timeline** — scroll back through the whole campaign.
