/* ============================================================
   Transport to the Google Sheet, via an Apps Script Web App.

   The whole session uses ONE generic message shape, so adding an
   activity never means touching the Apps Script or the Sheet:

     { room, activity, slot, deviceId, name, payload }

   `payload` is any JSON object. The sheet stores it as a string in
   one column. Decide what goes in it per activity; the plumbing
   never changes.

   POSTs use Content-Type: text/plain deliberately — that keeps the
   browser from sending a CORS preflight, which Apps Script cannot
   answer. Do not "fix" this to application/json.
   ============================================================ */

import { device } from './device.js';

const CFG = window.ISG_CONFIG;

export const OFFLINE =
  CFG.forceOffline ||
  !CFG.endpoint ||
  CFG.endpoint.indexOf('PASTE_') === 0;

/* ---------- offline simulator -------------------------------
   Backs the whole site when there's no endpoint. Lets you build
   and rehearse activities with zero network — and doubles as the
   dead-wifi fallback on the day.

   Deliberately localStorage, not sessionStorage: localStorage is
   shared across tabs on the same origin, so three tabs on your
   laptop (presenter / screen / phone) behave exactly like three
   devices. sessionStorage is per-tab and would break that.

   Every read reloads first, because another tab may have written. */

const SIM_KEY = 'isg.sim';

const sim = {
  rows: [],
  state: { activity: null, phase: 'idle', seq: 0 },
  load() {
    try {
      const d = JSON.parse(localStorage.getItem(SIM_KEY) || 'null');
      if (d) { this.rows = d.rows || []; this.state = d.state || this.state; }
    } catch {}
    return this;
  },
  save() {
    localStorage.setItem(SIM_KEY, JSON.stringify({ rows: this.rows, state: this.state }));
  }
};
if (OFFLINE) sim.load();

/* Wipe the offline session — call from the console between dry runs:
     localStorage.removeItem('isg.sim') */
export function resetOffline() {
  localStorage.removeItem(SIM_KEY);
  sim.rows = [];
  sim.state = { activity: null, phase: 'idle', seq: 0 };
}

/* ---------- helpers ---------------------------------------- */

async function post(body) {
  const res = await fetch(CFG.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ room: CFG.room, ...body })
  });
  if (!res.ok) throw new Error('POST ' + res.status);
  return res.json();
}

async function get(params) {
  const url = new URL(CFG.endpoint);
  url.searchParams.set('room', CFG.room);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) throw new Error('GET ' + res.status);
  return res.json();
}

/* ---------- public API -------------------------------------- */

export const api = {

  OFFLINE,

  /* Audience submits an answer. */
  async submit(activity, payload, slot = 'a') {
    device.remember(activity, payload, slot);

    const row = {
      ts: new Date().toISOString(),
      activity, slot,
      deviceId: device.id,
      name: device.name,
      payload
    };

    if (OFFLINE) { sim.load().rows.push(row); sim.save(); return { ok: true, offline: true }; }

    try {
      return await post({ action: 'submit', ...row, payload: JSON.stringify(payload) });
    } catch (err) {
      /* Queue and retry once on the next poll rather than losing the vote. */
      retryQueue.push(row);
      console.warn('[isg] submit failed, queued', err);
      return { ok: false, queued: true };
    }
  },

  /* Everything since `cursor`. Returns { rows, cursor, state }. */
  async since(cursor = 0) {
    if (OFFLINE) {
      sim.load();
      return { ok: true, rows: sim.rows.slice(cursor), cursor: sim.rows.length, state: sim.state };
    }
    flushRetries();
    const r = await get({ action: 'since', cursor });
    return {
      ok: true,
      rows: (r.rows || []).map(x => ({ ...x, payload: safeParse(x.payload) })),
      cursor: r.cursor ?? cursor,
      state: r.state || { activity: null, phase: 'idle', seq: 0 }
    };
  },

  /* Presenter drives the room: which activity, and which phase.
     phase: 'idle' | 'input' | 'locked' | 'reveal' */
  async setState(next) {
    if (OFFLINE) {
      sim.load();
      sim.state = { ...sim.state, ...next, seq: sim.state.seq + 1 };
      sim.save();
      return { ok: true, state: sim.state };
    }
    return post({ action: 'setState', ...next, key: CFG.presenterKey });
  },

  /* Drop pre-loaded sample rows in — bad wifi, low scan rate, or a dry run. */
  async injectFallback(activity, rows) {
    const stamped = rows.map((p, i) => ({
      ts: new Date().toISOString(),
      activity,
      slot: p.__slot || 'a',
      deviceId: 'demo-' + i,
      name: p.__name || '',
      payload: p
    }));

    if (OFFLINE) { sim.load().rows.push(...stamped); sim.save(); return { ok: true }; }
    return post({
      action: 'inject',
      key: CFG.presenterKey,
      rows: stamped.map(r => ({ ...r, payload: JSON.stringify(r.payload) }))
    });
  },

  /* Clear one activity's responses. Use between the dry run and the session. */
  async clear(activity) {
    if (OFFLINE) {
      sim.load();
      sim.rows = sim.rows.filter(r => r.activity !== activity);
      sim.save();
      return { ok: true };
    }
    return post({ action: 'clear', activity, key: CFG.presenterKey });
  }
};

/* ---------- retry queue ------------------------------------- */

const retryQueue = [];

function flushRetries() {
  if (!retryQueue.length) return;
  const batch = retryQueue.splice(0, retryQueue.length);
  post({ action: 'submitBatch', rows: batch.map(r => ({ ...r, payload: JSON.stringify(r.payload) })) })
    .catch(() => retryQueue.push(...batch));
}

function safeParse(s) {
  if (typeof s !== 'string') return s;
  try { return JSON.parse(s); } catch { return s; }
}
