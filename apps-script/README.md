# Deploying the Sheet endpoint

Fifteen minutes, once. After this you never touch it again — the schema is
generic, so new activities need no changes here.

## 1. Make the Sheet

1. New Google Sheet. Name it `ISG Learns 2026 — responses`.
2. **Extensions ▸ Apps Script**.
3. Delete whatever's in `Code.gs`, paste in this folder's `Code.gs`.
4. Set `ROOM` and `PRESENTER_KEY` at the top to match `config.js`.
5. Save.

## 2. Deploy it

1. **Deploy ▸ New deployment ▸** gear icon **▸ Web app**.
2. Description: `v1`
3. Execute as: **Me**
4. Who has access: **Anyone** ← must be "Anyone", not "Anyone with Google account".
   Teachers on personal phones won't be signed in.
5. **Deploy**, authorise, copy the URL ending in `/exec`.
6. Paste it into `config.js` as `endpoint`.

## 3. Test

Open `present/index.html?key=…` and the audience page side by side.
Tap segment 1, answer on the audience page, watch the presenter count go to 1.
The `responses` tab should have a row.

## Things worth knowing

- **Re-deploying.** Editing `Code.gs` does *not* change what's live. You must
  **Deploy ▸ Manage deployments ▸ edit ▸ Version: New version ▸ Deploy**, and
  the `/exec` URL stays the same. Forgetting this is the #1 way to lose an hour.
- **Quota.** Apps Script allows ~20k URL-fetch-free executions/day for consumer
  accounts and handles bursts fine with the script lock. 80 people polling every
  1.5s for 75 minutes is roughly 240k reads — **too many.** See below.
- **`clear` shifts row numbers**, so reload the screen page after clearing.

## Polling load — read this before the session

Each device polls every `pollMs`. 80 devices × 75 min ÷ 1.5s ≈ 240,000 GETs.
That will hit the quota. Three fixes, in order of preference:

1. **Only the screen and presenter poll** (2 devices). Phones don't need to
   listen — they only submit. This is the default assumption of the architecture
   *except* that phones need to know which activity is current.
2. **Phones poll slowly.** Set `pollMs: 1500` for the screen and let phones use
   5000ms. A phone finding out 5 seconds late is invisible; the screen isn't.
3. **Cache the state.** Use `CacheService` in `doGet` so repeat polls don't
   re-read the sheet.

Do the arithmetic for your real headcount before the dry run.
