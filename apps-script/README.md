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

## Polling load — the arithmetic

Sized for **~30 people**, which is the realistic number for this room.

Audience devices poll every **4s** (`pollMsAudience`), jittered ±20% so they
don't synchronise into spikes. The big screen polls every **1.5s** (`pollMs`)
because that one has to feel live.

- 30 phones ÷ 4s ≈ **7.5 requests/second**
- Each `doGet` is a small sheet read, roughly 100–200ms
- Average concurrent executions ≈ **1**, against a limit of 30

That's comfortable. Writes are trivial by comparison — about 30 submissions per
activity, nine activities, ~270 writes for the whole session, and `LockService`
serialises them.

**If the room is much bigger than expected**, the single most effective lever is
raising `pollMsAudience` to 8000. Nobody will notice.

**What to actually watch in the dry run:** not the quota — the *burst*. All 30
people answering within the same 10 seconds is the only moment of real
concurrency in the session. If submissions get dropped there, the client-side
retry queue in `api.js` should catch them; confirm it does.
