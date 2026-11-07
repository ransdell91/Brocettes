"""Split the bot's Google Doc export (markdown text) into per-session records.

Usage: python3 scripts/parse_sessions.py notes.md > data/sessions.json
"""
import json, re, sys

HEAD = re.compile(r"^# \*\*Session (\d+) – (.+?) – ([\d/]+)\*\*\s*$")
SUB = re.compile(r"^## \*\*(.+?)\*\*\s*$")

def clean(s):
    s = re.sub(r"\\([!*_])", r"\1", s)
    return re.sub(r"\s+", " ", s).strip()

def norm_date(d):
    m, day, y = d.split("/")
    y = int(y); y = y + 2000 if y < 100 else y
    return f"{y:04d}-{int(m):02d}-{int(day):02d}"

def parse(text):
    sessions, cur, sec = [], None, None
    for line in text.splitlines():
        h = HEAD.match(line)
        if h:
            cur = {"number": int(h[1]), "title": clean(h[2]), "date": norm_date(h[3]),
                   "sections": []}
            sessions.append(cur); sec = None; continue
        if cur is None: continue
        s = SUB.match(line)
        if s:
            sec = {"heading": clean(s[1]), "text": ""}; cur["sections"].append(sec); continue
        if line.strip():
            if sec is None:
                sec = {"heading": "Notes", "text": ""}; cur["sections"].append(sec)
            sec["text"] += line.strip() + "\n"
    out = []
    for c in sessions:
        secs = [{"heading": x["heading"], "text": clean(x["text"])} for x in c["sections"]]
        get = lambda name: next((x["text"] for x in secs if x["heading"] == name), None)
        out.append({
            "number": c["number"], "title": c["title"], "date": c["date"],
            "overview": get("Overview"),
            "where_we_left_off": get("End of Session"),
            "scenes": [x["heading"] for x in secs if x["heading"] not in ("Overview", "End of Session")],
        })
    return sorted(out, key=lambda x: x["number"])

if __name__ == "__main__":
    print(json.dumps(parse(open(sys.argv[1], encoding="utf-8").read()), indent=2, ensure_ascii=False))
