/* Brocettes Companion: a static, data-driven campaign wiki.
   Everything renders from data/*.json; routes live in the URL hash. */
(() => {
  const FILES = ["sessions", "characters", "npcs", "quests", "mysteries", "items", "locations", "factions", "lore", "ledger"];
  const D = {};
  const ALL = new Map(); // id -> { type, obj, name }
  const app = document.getElementById("app");

  // ---------- helpers ----------
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : "");
  const nameOf = (id) => ALL.get(id)?.name ?? id;
  const link = (id, label) => (ALL.has(id) ? `<a href="#/e/${encodeURIComponent(id)}">${esc(label ?? nameOf(id))}</a>` : esc(label ?? id));
  const chip = (id, prefix = "") => (ALL.has(id) ? `<a class="chip" href="#/e/${encodeURIComponent(id)}">${esc(prefix)}${esc(nameOf(id))}</a>` : "");
  const sess = (list) => (list || []).map((n) => `<a class="sess" href="#/s/${n}">S${n}</a>`).join(" ");
  const badge = (text, kind) => `<span class="badge b-${esc(kind || text)}">${esc(cap(text))}</span>`;
  const section = (title, body) => (body ? `<section class="stack"><h2>${esc(title)}</h2>${body}</section>` : "");
  const lastSession = () => D.sessions[D.sessions.length - 1];
  const fmtDate = (iso) => new Date(iso + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const tokenOf = (pc, pose = "standing") => pc?.tokens?.[pose] || pc?.tokens?.standing;
  const KIND = { character: "Party", npc: "NPC", quest: "Quest", mystery: "Mystery", item: "Item", location: "Place", faction: "Faction", lore: "Lore" };
  const CHECK = `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg>`;
  const RING = `<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="7.5"/></svg>`;

  function sessionsOf(obj) {
    const out = new Set();
    (function walk(o) {
      if (Array.isArray(o)) return o.forEach(walk);
      if (o && typeof o === "object") {
        for (const [k, v] of Object.entries(o)) {
          if (k === "sessions" && Array.isArray(v)) v.forEach((n) => out.add(n));
          else if (["session", "raised", "resolved", "started", "completed", "first_session", "last_session"].includes(k) && Number.isInteger(v)) out.add(v);
          else walk(v);
        }
      }
    })(obj);
    return [...out].sort((a, b) => a - b);
  }
  // things that point at id (backlinks)
  function backlinks(id) {
    const hits = [];
    for (const [oid, e] of ALL) {
      if (oid === id) continue;
      const o = e.obj;
      const refs = [o.giver, o.holder, o.location, o.parent, o.character, ...(o.related || []), ...(o.factions || []), ...(o.members || []), ...(o.notable_items || []), ...(o.personal_quests || [])];
      if (refs.includes(id)) hits.push(oid);
    }
    return hits;
  }

  // ---------- views ----------
  function home() {
    const s = lastSession();
    const active = D.quests.filter((q) => q.status === "active" && q.type !== "personal").length;
    const open = D.mysteries.filter((m) => m.status === "open").length;
    const seen = D.npcs.filter((n) => sessionsOf(n).includes(s.number)).map((n) => n.id);
    const pcs = D.characters.filter((c) => c.status === "active");
    return `
      <div class="stack" style="gap:4px">
        <span class="eyebrow">Next up · Session ${s.number + 1}</span>
        <h1>The Brocettes</h1>
        <span class="sub">${esc(D.ledger.in_game_date?.value || "")} · Level ${esc(D.ledger.level?.value ?? "")}</span>
      </div>
      <div class="party small">${pcs.map(pcLink).join("")}</div>
      <div class="card">
        <div class="between"><h3 style="color:var(--red)">Last time on…</h3><a class="sess" href="#/s/${s.number}">Session ${s.number} · ${fmtDate(s.date)}</a></div>
        <p class="prose">${esc(s.overview)}</p>
        ${s.where_we_left_off ? `<div class="inset"><span class="eyebrow">Where we left off</span><span>${esc(s.where_we_left_off)}</span></div>` : ""}
        <a href="#/s/${s.number}">Full session →</a>
      </div>
      <div class="tiles">
        <a class="tile" href="#/quests"><b>${active}</b><span>Active quests</span></a>
        <a class="tile" href="#/codex/mysteries"><b>${open}</b><span>Open mysteries</span></a>
        <a class="tile" href="#/party"><b>${D.ledger.party_owes.length}</b><span>Promises owed</span></a>
      </div>
      ${section("Seen last session", seen.length ? `<div class="chips">${seen.map((id) => chip(id)).join("")}</div>` : "")}
      ${section("Every session", `<a class="card" href="#/sessions"><span>All ${D.sessions.length} sessions, newest first →</span></a>`)}`;
  }

  function pcLink(c) {
    const img = tokenOf(c);
    return `<a class="pc" href="#/e/${c.id}">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : ""}<b>${esc(c.name)}</b><span>${esc((c.class || "").split(" (")[0])} ${esc(c.level ?? "")}</span></a>`;
  }

  function sessionsList() {
    return `<h1>Sessions</h1><div class="stack">${[...D.sessions].reverse().map((s) => `
      <a class="card" href="#/s/${s.number}">
        <div class="between"><span class="eyebrow">Session ${s.number}</span><span class="sub">${fmtDate(s.date)}</span></div>
        <h3>${esc(s.title)}</h3>
      </a>`).join("")}</div>`;
  }

  function sessionView(n) {
    const s = D.sessions.find((x) => x.number === n);
    if (!s) return notFound();
    const prev = D.sessions.find((x) => x.number === n - 1), next = D.sessions.find((x) => x.number === n + 1);
    const mentioned = [...ALL.entries()].filter(([, e]) => sessionsOf(e.obj).includes(n));
    const groups = {};
    for (const [id, e] of mentioned) (groups[e.type] ||= []).push(id);
    const order = ["character", "npc", "quest", "mystery", "item", "location", "faction", "lore"];
    return `
      <a class="back" href="#/sessions">‹ All sessions</a>
      <div class="stack" style="gap:4px"><span class="eyebrow">Session ${s.number} · ${fmtDate(s.date)}</span><h1>${esc(s.title)}</h1></div>
      ${s.overview ? `<div class="card"><p class="prose">${esc(s.overview)}</p></div>` : ""}
      ${s.where_we_left_off ? `<div class="inset"><span class="eyebrow">Where we left off</span><span>${esc(s.where_we_left_off)}</span></div>` : ""}
      ${section("Scenes", s.scenes.length ? `<ul style="margin:0;padding-left:20px">${s.scenes.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "")}
      ${order.filter((t) => groups[t]).map((t) => section(KIND[t] === "Party" ? "Party" : KIND[t] + (t === "mystery" ? " threads" : t === "lore" ? "" : "s"), `<div class="chips">${groups[t].map((id) => chip(id)).join("")}</div>`)).join("")}
      <div class="between">${prev ? `<a href="#/s/${prev.number}">‹ Session ${prev.number}</a>` : "<span></span>"}${next ? `<a href="#/s/${next.number}">Session ${next.number} ›</a>` : ""}</div>`;
  }

  function search(q = "") {
    setTimeout(() => {
      const input = document.getElementById("q");
      if (!input) return;
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
      input.addEventListener("input", () => {
        history.replaceState(null, "", "#/search/" + encodeURIComponent(input.value));
        document.getElementById("results").innerHTML = results(input.value);
      });
    });
    return `
      <h1>Who was that?</h1>
      <label class="search"><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <span class="sr" style="position:absolute;left:-9999px">Search the campaign</span>
        <input id="q" type="search" autocomplete="off" placeholder="Name, place, item, anything…" value="${esc(q)}"></label>
      <div id="results" class="stack">${results(q)}</div>`;
  }

  function hl(text, q) {
    const t = esc(text);
    if (!q) return t;
    const i = t.toLowerCase().indexOf(esc(q).toLowerCase());
    return i < 0 ? t : t.slice(0, i) + "<mark>" + t.slice(i, i + esc(q).length) + "</mark>" + t.slice(i + esc(q).length);
  }
  function snippet(text, q) {
    const i = text.toLowerCase().indexOf(q);
    if (i < 0) return "";
    const a = Math.max(0, i - 50), b = Math.min(text.length, i + q.length + 70);
    return (a ? "…" : "") + text.slice(a, b) + (b < text.length ? "…" : "");
  }
  function results(raw) {
    const q = raw.trim().toLowerCase();
    if (q.length < 2) return `<p class="empty">Type at least two letters. Search covers names, other spellings, and everything written about them.</p>`;
    const scored = [];
    for (const [id, e] of ALL) {
      const name = e.name.toLowerCase();
      const aliases = (e.obj.aliases || []).map((a) => a.toLowerCase());
      const alias = aliases.find((a) => a.includes(q));
      const body = JSON.stringify(e.obj).toLowerCase();
      let score = name.startsWith(q) ? 100 : name.includes(q) ? 80 : alias ? 70 : body.includes(q) ? 20 : 0;
      if (!score) continue;
      if (e.type === "npc" || e.type === "character") score += 5;
      let sub = alias && !name.includes(q) ? `Also written “${e.obj.aliases.find((a) => a.toLowerCase().includes(q))}”` : describe(e);
      if (score === 20 || score === 25) { const textBits = Object.values(e.obj).filter((v) => typeof v === "string").join(" · "); sub = snippet(textBits, q) || sub; }
      scored.push({ id, e, score, sub });
    }
    for (const s of D.sessions) {
      const text = [s.title, s.overview, s.where_we_left_off, ...s.scenes].filter(Boolean).join(" · ");
      if (text.toLowerCase().includes(q)) scored.push({ session: s, score: 10, sub: snippet(text, q) });
    }
    scored.sort((a, b) => b.score - a.score);
    if (!scored.length) return `<p class="empty">Nothing found for “${esc(raw)}”.</p>`;
    return scored.slice(0, 40).map((r) => r.session
      ? `<a class="card result" href="#/s/${r.session.number}"><div class="grow"><div class="between"><b>Session ${r.session.number}: ${hl(r.session.title, q)}</b><span class="kind">Notes</span></div><span class="sub">${hl(r.sub, q)}</span></div></a>`
      : `<a class="card result" href="#/e/${encodeURIComponent(r.id)}">${r.e.type === "character" && tokenOf(r.e.obj) ? `<img src="${esc(tokenOf(r.e.obj))}" alt="" width="48" height="48">` : ""}<div class="grow"><div class="between"><b>${hl(r.e.name, q)}</b><span class="kind">${KIND[r.e.type]}</span></div><span class="sub">${hl(r.sub, q)}</span></div></a>`).join("");
  }
  function describe(e) {
    const o = e.obj;
    switch (e.type) {
      case "character": return o.class;
      case "npc": return [o.role, cap(o.status)].filter(Boolean).join(" · ");
      case "quest": return `${cap(o.type)} quest · ${cap(o.status)}`;
      case "mystery": return o.status === "open" ? `Open since Session ${o.raised}` : `Solved: ${o.answer || ""}`;
      case "item": return [o.type, o.holder && o.holder !== "party" ? "held by " + nameOf(o.holder) : o.holder === "party" ? "party loot" : ""].filter(Boolean).join(" · ");
      case "location": return o.type;
      case "faction": return `${o.type} · ${o.standing}`;
      case "lore": return cap(o.category);
    }
    return "";
  }

  function questCard(q) {
    const done = q.objectives.filter((o) => o.done).length;
    return `<a class="card" href="#/e/${q.id}">
      <div class="between"><h3>${esc(q.title)}</h3>${q.objectives.length ? `<span class="badge b-${q.status}">${done} of ${q.objectives.length}</span>` : badge(q.status)}</div>
      <span class="sub">${esc(cap(q.type))} quest${q.giver ? " · from " + esc(nameOf(q.giver)) : q.character ? " · " + esc(nameOf(q.character)) : ""} · since S${q.started}</span>
      ${q.status === "active" && q.objectives.length ? `<div class="stack" style="gap:6px">${q.objectives.map(objective).join("")}</div>` : `<span>${esc(q.summary)}</span>`}
    </a>`;
  }
  const objective = (o) => `<div class="obj ${o.done ? "done" : ""}">${o.done ? CHECK : RING}<span>${esc(o.text)}</span></div>`;

  function quests(tab = "active") {
    const tabs = { active: ["Active", (q) => q.status === "active" && q.type !== "personal"], leads: ["Open leads", (q) => q.status === "available"], personal: ["Personal", (q) => q.type === "personal"], done: ["Done", (q) => ["completed", "failed"].includes(q.status)] };
    const list = D.quests.filter(tabs[tab]?.[1] || tabs.active[1]);
    return `<h1>Quest Board</h1>
      <nav class="seg" aria-label="Quest filter">${Object.entries(tabs).map(([k, [label, f]]) => `<a href="#/quests/${k}" aria-current="${k === tab}">${label} · ${D.quests.filter(f).length}</a>`).join("")}</nav>
      <div class="stack">${list.map(questCard).join("") || `<p class="empty">Nothing here.</p>`}</div>`;
  }

  function codex(tab = "people") {
    const tabs = {
      people: ["People", () => D.npcs.map((n) => card(n.id, describe(ALL.get(n.id)), badge(n.status, n.status)))],
      places: ["Places", () => D.locations.map((l) => card(l.id, (l.parent ? nameOf(l.parent) + " · " : "") + l.type))],
      mysteries: ["Mysteries", () => [...D.mysteries].sort((a, b) => (a.status === "open" ? 0 : 1) - (b.status === "open" ? 0 : 1) || b.raised - a.raised).map(mysteryCard)],
      lore: ["Lore", () => D.lore.map((l) => card(l.id, l.text))],
      items: ["Items", () => D.items.map((i) => card(i.id, describe(ALL.get(i.id))))],
      factions: ["Factions", () => D.factions.map((f) => card(f.id, describe(ALL.get(f.id))))],
    };
    const t = tabs[tab] ? tab : "people";
    return `<h1>Codex</h1>
      <nav class="seg" aria-label="Codex section">${Object.entries(tabs).map(([k, [label]]) => `<a href="#/codex/${k}" aria-current="${k === t}">${label}</a>`).join("")}</nav>
      <div class="stack">${tabs[t][1]().join("")}</div>`;
  }
  const card = (id, sub, right = "") => `<a class="card" href="#/e/${encodeURIComponent(id)}"><div class="between"><b>${esc(nameOf(id))}</b>${right}</div>${sub ? `<span class="sub">${esc(sub)}</span>` : ""}</a>`;
  function mysteryCard(m) {
    return `<a class="card" href="#/e/${m.id}" ${m.status === "open" ? "" : 'style="opacity:.8"'}>
      <span class="sub">${m.status === "open" ? `Open since Session ${m.raised} · ${m.clues.length} clue${m.clues.length === 1 ? "" : "s"}` : `Solved in Session ${m.resolved}`}</span>
      <h3>${esc(m.question)}</h3>${m.answer ? `<span>${esc(m.answer)}</span>` : ""}</a>`;
  }

  function party() {
    const L = D.ledger;
    const pcs = D.characters.filter((c) => c.status === "active");
    const gone = D.characters.filter((c) => c.status !== "active");
    const list = (arr, who) => arr.map((x) => `<div class="card"><div class="between"><b>${esc(x.text)}</b><span>${sess(x.sessions)}</span></div>${x[who] ? `<span class="sub">${link(x[who])}</span>` : ""}</div>`).join("");
    return `<h1>The Party</h1>
      <span class="sub" style="margin-top:-10px">Level ${esc(L.level.value)} · ${esc(L.in_game_date.value)}</span>
      <div class="party big">${pcs.map(pcLink).join("")}</div>
      ${gone.length ? `<p class="sub">Former companions: ${gone.map((c) => link(c.id)).join(", ")}</p>` : ""}
      ${section("Owed to us", list(L.owed_to_party, "from"))}
      ${section("We owe", list(L.party_owes, "to"))}
      ${section("Property", L.property.map((p) => `<div class="card"><div class="between"><b>${esc(p.text)}</b><span>${sess(p.sessions)}</span></div></div>`).join(""))}
      ${section("Gold log", `<div class="card">${L.gold_log.map((g) => `<div class="between"><span>${esc(g.text)}</span><span style="white-space:nowrap;color:${g.amount_gp < 0 ? "var(--bad)" : "var(--ok)"}">${g.amount_gp > 0 ? "+" : ""}${g.amount_gp} gp <a class="sess" href="#/s/${g.session}">S${g.session}</a></span></div>`).join("")}</div>`)}
      ${L.party_name ? `<p class="sub">${esc(L.party_name.note)}</p>` : ""}`;
  }

  // ---------- entity pages ----------
  function entity(id) {
    const e = ALL.get(id);
    if (!e) return notFound();
    const o = e.obj;
    const back = { character: "#/party", npc: "#/codex/people", quest: "#/quests", mystery: "#/codex/mysteries", item: "#/codex/items", location: "#/codex/places", faction: "#/codex/factions", lore: "#/codex/lore" }[e.type];
    const related = backlinks(id).filter((x) => !(e.type === "character" && ALL.get(x).type === "item"));
    const head = `<a class="back" href="${back}">‹ Back</a>`;
    const appears = sessionsOf(o);
    const foot = `${section("Connected to", related.length ? `<div class="chips">${related.map((r) => chip(r, KIND[ALL.get(r).type] + " · ")).join("")}</div>` : "")}
      ${section("Appears in", appears.length ? `<p>${sess(appears)}</p>` : "")}`;
    const facts = (arr) => (arr || []).map((f) => `<div class="fact">${f.confidence ? badge(f.confidence) : ""}<span>${esc(f.text)}${f.claimed_by ? ` <span class="sub">(${esc(f.claimed_by)}'s word)</span>` : ""} ${sess(f.sessions)}</span></div>`).join("");

    switch (e.type) {
      case "character": {
        const poses = Object.keys(o.tokens || {});
        setTimeout(() => document.querySelectorAll("[data-pose]").forEach((b) => b.addEventListener("click", () => {
          document.getElementById("token").src = o.tokens[b.dataset.pose];
          document.querySelectorAll("[data-pose]").forEach((x) => x.setAttribute("aria-current", x === b));
        })));
        return `${head}
          <div class="hero">${o.tokens ? `<img id="token" src="${esc(tokenOf(o))}" alt="${esc(o.name)}'s token">` : ""}
            ${poses.length > 1 ? `<div class="seg" role="group" aria-label="Token pose">${poses.map((p, i) => `<a href="javascript:void 0" role="button" data-pose="${p}" aria-current="${i === 0}">${cap(p)}</a>`).join("")}</div>` : ""}</div>
          <div class="stack" style="gap:4px"><h1>${esc(o.name)}</h1><span class="sub">${esc(o.class)}${o.ancestry ? " · " + esc(o.ancestry) : ""}${o.level ? " · Level " + o.level : ""}${o.status !== "active" ? " · " + cap(o.status) : ""}</span>
            ${o.aliases?.length ? `<span class="sub">Also written: ${o.aliases.map(esc).join(", ")}</span>` : ""}</div>
          <p class="prose">${esc(o.summary)}</p>
          ${sheetView(o.sheet)}
          ${section("Backstory", facts(o.backstory))}
          ${section("Notable items", o.notable_items.length ? `<div class="chips">${o.notable_items.map((i) => chip(i)).join("")}</div>` : "")}
          ${section("Personal quests", o.personal_quests.length ? `<div class="chips">${o.personal_quests.map((i) => chip(i)).join("")}</div>` : "")}
          ${section("Companions", (o.companions || []).map((c) => `<div class="fact"><b>${esc(c.name)}</b><span>${esc(c.text)} ${sess(c.sessions)}</span></div>`).join(""))}
          ${section("Notes", facts(o.notes))}
          ${section("Appears in", `<p>${sess(appears)}</p>`)}`;
      }
      case "npc":
        return `${head}
          <div class="stack" style="gap:4px"><h1>${esc(o.name)}</h1><span class="sub">${esc(o.role)}</span>
            ${o.aliases?.length ? `<span class="sub">Also written: ${o.aliases.map(esc).join(", ")}</span>` : ""}</div>
          <div class="tiles">
            <div class="tile"><span>Status</span><b style="font-size:18px">${esc(cap(o.status))}</b></div>
            <a class="tile" href="#/s/${o.first_session}"><span>First seen</span><b style="font-size:18px">S${o.first_session}</b></a>
            <a class="tile" href="#/s/${o.last_session}"><span>Last seen</span><b style="font-size:18px">S${o.last_session}</b></a>
          </div>
          ${o.attitude ? `<p><span class="sub">Attitude toward us:</span> <b>${esc(cap(o.attitude))}</b></p>` : ""}
          ${o.location ? `<p><span class="sub">Usually found:</span> ${link(o.location)}</p>` : ""}
          ${o.factions.length ? `<p><span class="sub">Factions:</span> ${o.factions.map((f) => link(f)).join(", ")}</p>` : ""}
          ${section("What we know", `<div class="card">${facts(o.facts)}</div>`)}
          ${foot}`;
      case "quest":
        return `${head}
          <div class="stack" style="gap:4px"><span class="eyebrow">${esc(cap(o.type))} quest</span><h1>${esc(o.title)}</h1></div>
          <div class="row">${badge(o.status)}<span class="sub">Started S${o.started}${o.completed ? ` · done S${o.completed}` : ""}${o.giver ? " · from " : ""}</span>${o.giver ? link(o.giver) : ""}</div>
          <p class="prose">${esc(o.summary)}</p>
          ${section("Objectives", o.objectives.length ? `<div class="card">${o.objectives.map(objective).join("")}</div>` : "")}
          ${o.reward ? `<p><span class="sub">Reward:</span> ${esc(o.reward)}</p>` : ""}
          ${o.character ? `<p><span class="sub">Whose:</span> ${link(o.character)}</p>` : ""}
          ${foot}`;
      case "mystery":
        return `${head}
          <div class="stack" style="gap:4px"><span class="eyebrow">${o.status === "open" ? `Open since Session ${o.raised}` : `Solved in Session ${o.resolved}`}</span><h1 style="font-size:28px">${esc(o.question)}</h1></div>
          ${o.answer ? `<div class="inset"><span class="eyebrow">Answer</span><span>${esc(o.answer)}</span></div>` : ""}
          ${section("Clues", o.clues.length ? `<div class="card">${o.clues.map((c) => `<div class="fact"><a class="sess" href="#/s/${c.session}" style="min-width:32px">S${c.session}</a><span>${esc(c.text)}</span></div>`).join("")}</div>` : `<p class="empty">No clues yet.</p>`)}
          ${section("Party theories", o.theories.map((t) => `<div class="inset"><b>${esc(t.by)}</b><span>${esc(t.text)}</span></div>`).join(""))}
          ${section("Related", o.related.length ? `<div class="chips">${o.related.map((r) => chip(r)).join("")}</div>` : "")}`;
      case "item":
        return `${head}
          <div class="stack" style="gap:4px"><span class="eyebrow">${esc(o.type)}${o.magical ? " · magical" : ""}</span><h1>${esc(o.name)}</h1></div>
          <p class="prose">${esc(o.description)}</p>
          <p><span class="sub">Held by:</span> ${o.holder === "party" ? "Party loot" : link(o.holder)}</p>
          ${o.found ? `<p><span class="sub">Found:</span> ${esc(o.found.where)} ${sess([o.found.session])}</p>` : ""}`;
      case "location":
        return `${head}
          <div class="stack" style="gap:4px"><span class="eyebrow">${esc(o.type)}</span><h1>${esc(o.name)}</h1></div>
          ${o.parent ? `<p><span class="sub">In:</span> ${link(o.parent)}</p>` : ""}
          <p class="prose">${esc(o.description)}</p>${foot}`;
      case "faction":
        return `${head}
          <div class="stack" style="gap:4px"><span class="eyebrow">${esc(o.type)} · ${esc(o.standing)}</span><h1>${esc(o.name)}</h1></div>
          <p class="prose">${esc(o.description)}</p>
          ${section("Members", `<div class="chips">${o.members.map((m) => chip(m)).join("")}</div>`)}
          ${section("Appears in", `<p>${sess(appears)}</p>`)}`;
      case "lore":
        return `${head}
          <div class="stack" style="gap:4px"><span class="eyebrow">${esc(cap(o.category))}</span><h1>${esc(o.topic)}</h1></div>
          <div class="fact">${badge(o.confidence)}<p class="prose">${esc(o.text)}${o.claimed_by ? ` <span class="sub">(${esc(o.claimed_by)})</span>` : ""}</p></div>
          ${section("Appears in", `<p>${sess(appears)}</p>`)}`;
    }
  }

  // Character sheet stats (from D&D Beyond), shown on a PC's profile.
  function sheetView(s) {
    if (!s) return "";
    const ABIL = ["str", "dex", "con", "int", "wis", "cha"];
    const sign = (n) => (n < 0 ? "−" + Math.abs(n) : "+" + n);
    const list = (arr) => (arr || []).length ? `<ul class="sheet-list">${arr.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "";
    const fold = (title, body, open = false) => (body ? `<details class="sheet-fold"${open ? " open" : ""}><summary>${esc(title)}</summary><div class="stack" style="gap:8px">${body}</div></details>` : "");
    const line = (label, text) => (text ? `<p><span class="sub">${esc(label)}:</span> ${esc(text)}</p>` : "");
    const sc = s.spellcasting;
    const tiles = [["AC", s.ac, s.ac_note], ["HP", s.hp], ["Speed", s.speed], ["Initiative", s.initiative], ["Proficiency", s.prof], ["Passive Perc.", s.passive?.perception]];
    return section("Character sheet", `
      <div class="tiles">${tiles.map(([k, v, note]) => `<div class="tile"><span>${esc(k)}</span><b>${esc(v)}</b>${note ? `<span>${esc(note)}</span>` : ""}</div>`).join("")}</div>
      <div class="abil">${ABIL.map((a) => `<div><span>${a.toUpperCase()}</span><b>${sign(s.abilities[a][1])}</b><span>${s.abilities[a][0]}</span></div>`).join("")}</div>
      ${sc ? `<div class="inset"><span class="eyebrow">Spellcasting</span><span>${esc(sc.ability)} · Spell attack ${esc(sc.attack)} · Save DC ${esc(sc.dc)}${sc.extra ? " · " + esc(sc.extra) : ""}</span></div>` : ""}
      ${fold("Attacks", list(s.attacks), true)}
      ${fold("Saves & skills", `<p>${ABIL.map((a) => `<b>${a.toUpperCase()}</b> ${esc(s.saves[a])}`).join(" · ")}</p>${list(s.save_notes)}
        <p><span class="sub">Skills:</span> ${esc(s.skills.join(", "))}</p>
        <p><span class="sub">Passive:</span> Perception ${esc(s.passive.perception)} · Investigation ${esc(s.passive.investigation)} · Insight ${esc(s.passive.insight)}</p>`)}
      ${fold("Spells", s.spells?.length ? s.spells.map(([lvl, names]) => `<p><b>${esc(lvl)}:</b> ${esc(names)}</p>`).join("") : "")}
      ${fold("Features & feats", `${list(s.features)}${line("Feats", (s.feats || []).join(", "))}`)}
      ${fold("Background, senses & gear", `${line("Ancestry", s.ancestry)}${line("Background", s.background)}${line("Senses", s.senses)}${line("Proficiencies", s.proficiencies)}${line("Languages", s.languages)}${line("Gear", s.gear)}`)}
      <p class="sub">From ${esc(s.source)}${s.url ? ` · <a href="${esc(s.url)}" target="_blank" rel="noopener">Full sheet</a>` : ""}. Loot from recent sessions may not be on it yet.</p>`);
  }

  const notFound = () => `<h1>Lost in the dark</h1><p>That page doesn't exist. <a href="#/">Back home</a></p>`;

  // ---------- router ----------
  function route() {
    const parts = location.hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent);
    const [page, arg] = parts;
    let html, tab = page || "home";
    switch (page) {
      case "": case undefined: html = home(); tab = "home"; break;
      case "search": html = search(arg || ""); break;
      case "quests": html = quests(arg); break;
      case "codex": html = codex(arg); break;
      case "party": html = party(); break;
      case "sessions": html = sessionsList(); tab = "home"; break;
      case "s": html = sessionView(Number(arg)); tab = "home"; break;
      case "e": {
        html = entity(arg);
        const t = ALL.get(arg)?.type;
        tab = t === "character" ? "party" : t === "quest" ? "quests" : "codex";
        break;
      }
      default: html = notFound();
    }
    app.innerHTML = html;
    document.querySelectorAll(".tabs a").forEach((a) => a.setAttribute("aria-current", a.dataset.tab === tab ? "page" : "false"));
    const title = app.querySelector("h1")?.textContent;
    document.title = title && page ? `${title} · Brocettes` : "Brocettes Companion";
    if (page !== "search") window.scrollTo(0, 0);
  }

  // ---------- boot ----------
  Promise.all(FILES.map((f) => fetch(`data/${f}.json`).then((r) => { if (!r.ok) throw new Error(f); return r.json(); })))
    .then((loaded) => {
      FILES.forEach((f, i) => (D[f] = loaded[i]));
      D.sessions.sort((a, b) => a.number - b.number);
      const add = (type, arr, nameKey) => arr.forEach((o) => ALL.set(o.id, { type, obj: o, name: o[nameKey] }));
      add("character", D.characters, "name"); add("npc", D.npcs, "name"); add("quest", D.quests, "title");
      add("mystery", D.mysteries, "question"); add("item", D.items, "name"); add("location", D.locations, "name");
      add("faction", D.factions, "name"); add("lore", D.lore, "topic");
      window.addEventListener("hashchange", route);
      route();
    })
    .catch((err) => { app.innerHTML = `<h1>The tome won't open</h1><p>Couldn't load the campaign data (${esc(err.message)}). Try refreshing.</p>`; });
})();
