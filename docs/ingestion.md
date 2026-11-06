# Weekly Google Doc Ingestion (proposed)

```
Google Doc (bot appends each session)
        │  1. fetch — weekly scheduled job (GitHub Actions cron)
        ▼
Split into sessions, hash each; only new/changed sessions continue
        │  2. extract — LLM reads the transcript/notes with the current
        │     entity index (names + aliases) and returns structured JSON:
        │     session recap, new entities, updates to existing ones,
        │     quest status changes, new mysteries/clues, quotes
        ▼
Merge — entity matching via aliases; ambiguous matches are flagged,
        never silently merged
        │  3. review — the job opens a pull request with the changes and a
        │     human-readable summary; a player or the DM skims & merges
        ▼
Site rebuilds and deploys automatically
```

## Why a review step
Transcripts mishear names and an LLM will occasionally invent a connection.
A 2-minute skim of a PR each week keeps the wiki trustworthy, and git history
means any mistake can be undone.

## Access to the Google Doc
Options, simplest first:
1. **Service account** — create a Google Cloud service account, share the doc
   with its email (view only), store its key as a GitHub Actions secret. Most
   robust; recommended.
2. **"Anyone with the link can view"** + plain-text export URL. No setup, but the
   transcript is effectively public to anyone with the link.

## Backfill
The existing campaign history is processed once, session by session in order,
so later sessions are matched against entities created by earlier ones.
