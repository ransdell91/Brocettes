# Brocettes — Campaign Companion

A player-facing companion for our *Phandelver and Below: The Shattered Obelisk* campaign:
searchable characters, NPCs, quests, mysteries, lore and session recaps, built from the
session notes our bot writes to Google Docs.

**Live site:** https://ransdell91.github.io/brocettes/

## How it works
- `index.html`, `app.css` and `app.js` are the whole app: no build step. It reads `data/*.json` in the browser.
- `data/` holds the campaign data (see [`data/README.md`](data/README.md)); `assets/tokens/` holds character tokens.
- Edit a JSON file, push, and the site updates within a minute or two.

## Turning on GitHub Pages (one time)
Repo **Settings → Pages → Build and deployment**: Source **Deploy from a branch**, Branch
**`claude/dnd-campaign-companion-sca7i1`**, folder **`/ (root)`**, then **Save**.

## Running it locally
```
python3 -m http.server
```
then open http://localhost:8000.

## More
- [`docs/data-model.md`](docs/data-model.md) — what we track and why
- [`docs/ingestion.md`](docs/ingestion.md) — how the weekly Google Doc import will work
