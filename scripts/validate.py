"""Check data/*.json parses and every cross-reference points at a real id."""
import json, pathlib, sys
D = pathlib.Path(__file__).resolve().parent.parent / "data"
load = lambda n: json.loads((D / f"{n}.json").read_text(encoding="utf-8"))
chars, npcs, quests, myst = load("characters"), load("npcs"), load("quests"), load("mysteries")
items, locs, facs, lore, ledger, sessions = (load(n) for n in ("items", "locations", "factions", "lore", "ledger", "sessions"))
ids = {}
errs_dup = []
for name, coll in [("character", chars), ("npc", npcs), ("quest", quests), ("mystery", myst),
                   ("item", items), ("location", locs), ("faction", facs), ("lore", lore)]:
    for e in coll:
        if e["id"] in ids: errs_dup.append(f"duplicate id {e['id']} ({ids[e['id']]} / {name})")
        ids.setdefault(e["id"], name)
nums = {s["number"] for s in sessions}
errs = errs_dup
def ref(x, where, ok=lambda v: v in ids):
    if x is not None and not ok(x): errs.append(f"{where}: unknown ref {x!r}")
for c in chars:
    for i in c["notable_items"]: ref(i, c["id"])
    for q in c["personal_quests"]: ref(q, c["id"])
for n in npcs:
    ref(n["location"], n["id"])
    for f in n["factions"]: ref(f, n["id"])
for q in quests:
    ref(q.get("giver"), q["id"]); ref(q.get("character"), q["id"])
for m in myst:
    for r in m["related"]: ref(r, m["id"])
for i in items:
    ref(i["holder"], i["id"], lambda v: v in ids or v == "party")
for l in locs: ref(l["parent"], l["id"])
for f in facs:
    for m in f["members"]: ref(m, f["id"])
def walk(o, where):
    if isinstance(o, dict):
        for k, v in o.items():
            if k in ("sessions",) and isinstance(v, list):
                for s in v:
                    if s not in nums: errs.append(f"{where}: bad session {s}")
            elif k in ("session", "raised", "resolved", "started", "completed", "first_session", "last_session") and isinstance(v, int):
                if v not in nums: errs.append(f"{where}: bad session {v}")
            else: walk(v, where)
    elif isinstance(o, list):
        for x in o: walk(x, where)
for n, coll in [("characters", chars), ("npcs", npcs), ("quests", quests), ("mysteries", myst), ("items", items), ("locations", locs), ("factions", facs), ("lore", lore), ("ledger", ledger)]:
    walk(coll, n)
print("\n".join(errs) or f"OK: {len(sessions)} sessions, {len(chars)} characters, {len(npcs)} NPCs, {len(quests)} quests, {len(myst)} mysteries, {len(items)} items, {len(locs)} locations, {len(facs)} factions, {len(lore)} lore entries")
sys.exit(1 if errs else 0)
