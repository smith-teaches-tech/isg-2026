# ISG Learns 2026 — Taking Back At-Home Writing

Interactive session site. Static HTML on GitHub Pages, responses in a Google
Sheet via Apps Script. No build step, no dependencies, no npm.

## The three URLs

| Who | Where | Notes |
|---|---|---|
| Audience | `/` | The one URL that gets scanned. Phone or laptop, same address. |
| Big screen | `/screen/` | Fullscreen on the projector. **Your clicker talks to this.** |
| Presenter | `/present/?key=backstage` | Second device. Optional — for out-of-band moves only. |

## The forward button

The whole 75 minutes sits on one axis. Your clicker sends → to `/screen/`, and
that single key walks everything:

```
slide beat 1 → beat 2 → beat 3
  → open the interaction → lock it → reveal it
  → next segment
```

← goes back. Segments with no interaction just run out of beats and move on.
Clicking the mouse anywhere on the screen also advances.

`/present/` on your phone is for the things that aren't on that line: jump to a
segment, inject fallback data, unlock a vote, clear a dry run. You can run the
entire session without it.

## Writing a slide

Slides are **plain HTML fragments** in `slides/`. No `<head>`, no `<script>`,
no boilerplate — just content, using the shared classes. Write them yourself.

```html
<div class="center">
  <h1>What happens to student brains</h1>
  <p data-step="1">MIT Media Lab, 54 participants, four months.</p>
  <p data-step="2">Lower connectivity in every band measured.</p>
  <img data-step="3" src="../assets/img/slides/04-brain-scan.png">
</div>
```

`data-step="N"` means "appears on the Nth click." Anything without it is
visible immediately. The file name must match the `slide` field in
`session.json`.

**A segment with no slide file still works** — it shows its title as a
placeholder. So you can walk the full 22-segment running order and rehearse
timing before writing a single slide.

## Run it locally

```bash
python3 -m http.server 8000
```

Then <http://localhost:8000>. **Opening `index.html` from the filesystem will
not work** — ES modules and `fetch()` need a real server.

With no endpoint set in `config.js`, everything runs in **offline mode**: no
network calls, responses live in `sessionStorage`, fallback data works. Build
and rehearse entirely offline, then paste in the endpoint at the end.

## Layout

```
config.js            endpoint, room code, presenter key, short URL
session.json         ← SINGLE SOURCE OF TRUTH: run of show + activity registry
index.html           audience app
screen/              projector display
present/             presenter control
activities/
  _template/         copy this to start a new activity
  i0-gauge/          worked example: slider in, histogram out
assets/
  css/tokens.css     every colour and size in the session
  css/base.css       shared components (.btn .card .bar .field)
  js/api.js          Sheet transport + offline simulator
  js/bus.js          one polling loop, shared
  js/device.js       device ID, optional name, answer memory
  js/ui.js           h() / mount() / tally() / countUp()
  img/               see assets/img/README.md
data/fallback/       pre-loaded sample responses, one file per activity
apps-script/         the Sheet endpoint + deploy instructions
slides/              narrative segments (no interaction)
```

## Adding an activity

1. `cp -r activities/_template activities/i3-how-much`
2. Write `phone.render()` and `screen.render()`. Nothing else.
3. Register it in `session.json` under `activities`, set `built: true`.
4. Add `data/fallback/i3-how-much.json` — an array of payload objects.

You never touch `api.js`, `bus.js`, or `Code.gs`. The message shape is generic:
`{ activity, slot, deviceId, name, payload }` where `payload` is any JSON.

## Phases

The presenter moves each activity through `idle → input → locked → reveal`.
Hold-then-reveal activities render nothing on screen until `reveal`; live ones
(I-1, I-7, I-8) draw during `input` too.

`slot` lets one activity take two answers — I-5 votes before and after the
migration, as `slot: 'a'` and `slot: 'b'`.

## Before the session

- [ ] Change `room` and `presenterKey` in `config.js`
- [ ] Make the TinyURL, point it at the Pages URL, put it in `config.js` as `shortUrl`
- [ ] Generate the QR code from the TinyURL, save to `assets/img/ui/qr.png`
- [ ] Fallback JSON exists for every activity
- [ ] Read `apps-script/README.md` § polling load and do the headcount arithmetic
- [ ] Clear the `responses` tab after the dry run
- [ ] `?v=` bumped on any CSS/JS you changed today (Pages caches aggressively)

## Publishing

Settings ▸ Pages ▸ Source: `main`, folder: `/ (root)`. Live in ~40 seconds at
`https://smith-teaches-tech.github.io/isg-2026/`.

`.nojekyll` is in the repo root and must stay — without it, Pages hides any
folder starting with `_`, including `activities/_template/`.
