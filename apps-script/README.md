# Deploying the Sheet endpoint

Fifteen minutes, once. After this you never touch it again — the schema is
generic, so new activities need no changes here.

## 0. The Sheet already exists

**<https://docs.google.com/spreadsheets/d/1yUobrvzhAh-LKi4hi_9r6LyljTBGqvcSlRld2zJla6k/edit>**

`ISG Learns 2026 — responses`, in the **ISG Learns Presentations** folder on the
ISG account (`smith.m.04@isg.edu.sa`), next to the Aug 2026 notes doc. The
`responses` and `control` tabs create themselves on first run — don't add them
by hand.

## 1. Attach the script

1. Open the Sheet ▸ **Extensions ▸ Apps Script**.
2. Delete whatever's in `Code.gs`, paste in this folder's `Code.gs`
   (`~/Documents/isg-2026/apps-script/Code.gs`).
3. `ROOM` and `PRESENTER_KEY` at the top already match `config.js`
   (`isg26` / `backstage`). If you change one, change both.
4. Save.

## 2. Deploy it

1. **Deploy ▸ New deployment ▸** gear icon **▸ Web app**.
2. Description: `v1`
3. Execute as: **Me**
4. Who has access: **Anyone** ← must be "Anyone". Not "Anyone with Google
   account", and **not "Anyone within International Schools Group"**. Teachers
   will be on personal phones, not signed into an ISG account.

   ### ⚠️ The ISG-account risk — check this first

   This is deployed from a Workspace account, and many Workspace domains
   **remove the "Anyone" option entirely** from that dropdown. If the most open
   choice you're offered is *"Anyone within International Schools Group"*, stop:
   the endpoint will work on your laptop and silently fail on every personal
   phone in the room — the worst possible way to find out.

   If that happens, in order of preference:

   1. **Deploy the same script from a personal Gmail account.** Make a copy of
      the Sheet there (File ▸ Make a copy), attach `Code.gs`, deploy. Nothing
      sensitive is stored — anonymous answers and optional first names.
   2. Ask ISG IT to allow web-app publishing for your account. Slow, but it's
      a real setting they can flip.
   3. Run the session in **offline mode**, which is already built and working.
      You lose real audience devices; the fallback data still drives every
      display. This is the floor, not the plan.
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
