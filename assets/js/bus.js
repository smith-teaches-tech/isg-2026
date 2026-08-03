/* ============================================================
   The bus: one polling loop shared by the audience page and the
   big screen. It holds every response received so far and the
   presenter's current state, and tells subscribers when either
   changes. Activities never poll for themselves.
   ============================================================ */

import { api } from './api.js';

const CFG = window.ISG_CONFIG;

const listeners = new Set();
let cursor  = 0;
let timer   = null;
let writing = 0;   // setState calls in flight — see setState() below
let writeId = 0;   // monotonic id per setState; only the latest may adopt a response

export const bus = {

  rows:  [],

  /* segment 0 = pre-session title card.
     step    = which beat of the current slide is showing.
     phase   = idle (slide) | input | locked | reveal (interaction). */
  state: { segment: 0, step: 0, phase: 'idle', seq: -1 },
  connected: true,

  /* False until the first poll lands. The screen page must not accept
     a keypress before this: bus.state starts at the title card, so a
     press during that window would advance FROM segment 0 and throw
     the whole room back to the start. Reloading the screen laptop
     mid-session is exactly when that happens. */
  synced: false,

  /* fn({ rows, state, changedState }) — called on every tick that
     brought news, and once immediately on subscribe. */
  subscribe(fn) {
    listeners.add(fn);
    fn({ rows: this.rows, state: this.state, changedState: true });
    return () => listeners.delete(fn);
  },

  /* Only this activity's rows, newest last. */
  rowsFor(activity, slot = null) {
    return this.rows.filter(r =>
      r.activity === activity && (slot === null || r.slot === slot));
  },

  /* One row per device — the last one wins, so a re-vote replaces. */
  uniqueFor(activity, slot = null) {
    const byDevice = new Map();
    for (const r of this.rowsFor(activity, slot)) byDevice.set(r.deviceId, r);
    return [...byDevice.values()];
  },

  /* role 'screen'   — must feel live, polls fast.
     role 'audience' — a phone finding out 4s late is invisible, and
                       30 phones polling fast is the one thing that
                       could actually overload the Apps Script. */
  start(role = 'audience') {
    if (timer) return;
    const base = role === 'screen'
      ? (CFG.pollMs || 1500)
      : (CFG.pollMsAudience || 4000);

    /* Jitter so 30 devices don't all hit the endpoint on the same
       tick. Without this they synchronise and you get spikes. */
    const wait = () => base * (0.8 + Math.random() * 0.4);

    const tick = async () => {
      try {
        const res = await api.since(cursor);
        this.connected = true;

        /* The sheet can SHRINK — `clear` deletes rows. When the server
           hands back a cursor lower than ours it has reset us to the
           top, so replace what we hold instead of appending to it.
           Without this the screen keeps displaying cleared test
           answers and silently drops the first real ones. */
        const shrank = res.cursor < cursor;
        cursor = res.cursor;

        const changedState = writing === 0 && res.state.seq !== this.state.seq;
        const gotRows = res.rows.length > 0;

        if (shrank)        this.rows = res.rows.slice();
        else if (gotRows)  this.rows.push(...res.rows);
        if (changedState)  this.state = res.state;

        this.synced = true;

        if (shrank || gotRows || changedState)
          return emit({ rows: this.rows, state: this.state, changedState: true });

      } catch (err) {
        this.connected = false;
        console.warn('[isg] poll failed', err);
      }
      timer = setTimeout(tick, wait());
    };
    tick();
  },

  stop() { clearTimeout(timer); timer = null; },

  /* Presenter calls this; everyone else finds out on the next poll.

     OPTIMISTIC. The projector redraws immediately and the write to the
     sheet happens behind it. Waiting for the round trip made every
     press feel like a half-second of nothing, which on stage reads as
     a broken clicker and makes you press again.

     While a write is in flight we ignore incoming state from polls —
     otherwise a poll that started before the write lands would carry
     the OLD state and snap the screen backwards. If the write fails
     outright we roll back deliberately, and the "lost the sheet"
     warning is already on screen to explain it. */
  async setState(next) {
    const mine = ++writeId;
    this.state = { ...this.state, ...next, seq: this.state.seq + 1 };
    writing++;
    emit({ rows: this.rows, state: this.state, changedState: true });

    try {
      const res = await api.setState(next);

      /* Only the MOST RECENT press may adopt a server response.

         The old guard compared res.state.seq against our own seq, but
         those are different clocks — the server numbers by arrival
         order, so a retried write that lands late gets a HIGHER seq
         than the newer press it is overtaking, sails past a `>=` test,
         and drags the room back a beat permanently. Comparing local
         call ids is the only comparison that means anything here. */
      if (mine === writeId && res && res.state) {
        this.state = res.state;
        emit({ rows: this.rows, state: this.state, changedState: true });
      }
      return res;
    } catch (err) {
      /* Deliberately NO rollback. `prev` captured at call time can be
         several presses stale by the time three retries have failed,
         so restoring it clobbered presses that had already succeeded.
         Leave the optimistic state alone and let the next poll
         reconcile against the sheet, which is the real authority. */
      throw err;
    } finally {
      writing--;
    }
  }
};

function emit(evt) {
  for (const fn of listeners) {
    try { fn(evt); } catch (e) { console.error('[isg] listener error', e); }
  }
}

/* ---------- activity loading -------------------------------- */

const cache = new Map();

/* Activities are ES modules at /activities/<id>/activity.js.
   Loaded on demand — a phone only downloads the activity it's shown.

   The URL is resolved against document.baseURI, NOT against this
   module. A bare or './' specifier would resolve relative to
   /assets/js/ and 404. Don't simplify this line. */
export async function loadActivity(id, base = '') {
  if (!id) return null;
  if (cache.has(id)) return cache.get(id);
  const url = new URL(`${base}activities/${id}/activity.js`, document.baseURI).href;
  const mod = await import(url);
  cache.set(id, mod.default || mod);
  return cache.get(id);
}

export async function loadSession(base = '') {
  const res = await fetch(`${base}session.json`, { cache: 'no-store' });
  return res.json();
}
