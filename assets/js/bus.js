/* ============================================================
   The bus: one polling loop shared by the audience page and the
   big screen. It holds every response received so far and the
   presenter's current state, and tells subscribers when either
   changes. Activities never poll for themselves.
   ============================================================ */

import { api } from './api.js';

const CFG = window.ISG_CONFIG;

const listeners = new Set();
let cursor = 0;
let timer  = null;

export const bus = {

  rows:  [],
  state: { activity: null, phase: 'idle', seq: -1 },
  connected: true,

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

  start() {
    if (timer) return;
    const tick = async () => {
      try {
        const res = await api.since(cursor);
        this.connected = true;
        cursor = res.cursor;

        const changedState = res.state.seq !== this.state.seq;
        const gotRows = res.rows.length > 0;

        if (gotRows) this.rows.push(...res.rows);
        if (changedState) this.state = res.state;

        if (gotRows || changedState) emit({ rows: this.rows, state: this.state, changedState });
      } catch (err) {
        this.connected = false;
        console.warn('[isg] poll failed', err);
      }
      timer = setTimeout(tick, CFG.pollMs);
    };
    tick();
  },

  stop() { clearTimeout(timer); timer = null; },

  /* Presenter calls this; everyone else finds out on the next poll. */
  async setState(next) {
    const res = await api.setState(next);
    if (res && res.state) { this.state = res.state; emit({ rows: this.rows, state: this.state, changedState: true }); }
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

export async function loadFallback(id, base = '') {
  try {
    const res = await fetch(`${base}data/fallback/${id}.json`, { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}
