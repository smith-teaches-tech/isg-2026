/* ============================================================
   Transport to Supabase (PostgREST).

   Swapped in for the Apps Script Web App on 2026-08-03: the Sheet
   endpoint was too slow/flaky for the room to follow the presenter.
   Same ONE generic message shape as before, so adding an activity
   still never touches the backend. Two isolated tables:

     isg_responses : id | ts | room | activity | slot | device_id | name | payload(jsonb)
     isg_control   : room | segment | step | phase | seq

   THE BUS CONTRACT IS PRESERVED EXACTLY. since() returns
   { ok, rows, cursor, state } where `cursor` is the room's total
   response COUNT (so a `clear` shrinks it and the bus resets its
   cache + signals `cleared`), and each row carries
   { ts, activity, slot, deviceId, name, payload }. Because the
   contract is identical, bus.js is untouched.

   The anon key is public by design. Security is explicitly out of
   scope; RLS on both tables allows anon full access, and the DB is
   dropped/paused after 2026-08-11.
   ============================================================ */

import { device } from './device.js';

const CFG  = window.ISG_CONFIG;
const SB   = (CFG.supabaseUrl || '').replace(/\/+$/, '');
const KEY  = CFG.supabaseKey || '';
const ROOM = CFG.room || 'isg';
const REST = `${SB}/rest/v1`;

export const OFFLINE =
  CFG.forceOffline || !SB || !KEY || SB.indexOf('PASTE_') !== -1;

/* ---------- offline simulator (BUILD mode only) -------------
   localStorage, shared across tabs, so presenter/screen/phone tabs
   on one laptop behave like separate devices. No fake data in the
   room — if an interaction fails, Michael asks out loud. */
const SIM_KEY = 'isg.sim';
const sim = {
  rows: [],
  state: { segment: 0, step: 0, phase: 'idle', seq: 0 },
  load() {
    try { const d = JSON.parse(localStorage.getItem(SIM_KEY) || 'null');
      if (d) { this.rows = d.rows || []; this.state = d.state || this.state; } } catch {}
    return this;
  },
  save() { localStorage.setItem(SIM_KEY, JSON.stringify({ rows: this.rows, state: this.state })); }
};
if (OFFLINE) sim.load();

export function resetOffline() {
  localStorage.removeItem(SIM_KEY);
  sim.rows = []; sim.state = { segment: 0, step: 0, phase: 'idle', seq: 0 };
}

/* ---------- helpers ---------------------------------------- */
const HDR = () => ({ apikey: KEY, Authorization: `Bearer ${KEY}` });
const q = encodeURIComponent;

/* Supabase row (snake_case) -> the shape the bus + activities expect. */
function normalize(r) {
  return { ts: r.ts, activity: r.activity, slot: r.slot,
           deviceId: r.device_id, name: r.name, payload: r.payload };
}

/* ---------- public API -------------------------------------- */
export const api = {

  OFFLINE,

  /* Audience submits an answer. */
  async submit(activity, payload, slot = 'a') {
    device.remember(activity, payload, slot);
    const row = { room: ROOM, activity, slot, device_id: device.id, name: device.name, payload };

    if (OFFLINE) {
      sim.load().rows.push({ ts: new Date().toISOString(), activity, slot, deviceId: device.id, name: device.name, payload });
      sim.save(); return { ok: true, offline: true };
    }
    try {
      const res = await fetch(`${REST}/isg_responses`, {
        method: 'POST',
        headers: { ...HDR(), 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(row)
      });
      if (!res.ok) throw new Error('POST ' + res.status);
      return { ok: true };
    } catch (err) {
      queueRetry(row);                 // survive the reload, retry next poll
      console.warn('[isg] submit failed, queued', err);
      return { ok: false, queued: true };
    }
  },

  /* Everything since `cursor` (= room's total response count), plus the
     presenter's current state. Two quick reads; Supabase is fast. */
  async since(cursor = 0) {
    if (OFFLINE) {
      sim.load();
      return { ok: true, rows: sim.rows.slice(cursor), cursor: sim.rows.length, state: sim.state };
    }
    flushRetries();

    const rowsRes = await fetch(
      `${REST}/isg_responses?room=eq.${q(ROOM)}&select=ts,activity,slot,device_id,name,payload&order=id.asc&offset=${cursor}`,
      { headers: { ...HDR(), Prefer: 'count=exact' } });
    if (!rowsRes.ok) throw new Error('GET rows ' + rowsRes.status);
    const rows = await rowsRes.json();

    /* total count rides in the Content-Range header (e.g. "0-24/25", or
       "star/25" when the offset is past the end). */
    const cr = rowsRes.headers.get('content-range') || '';
    const total = parseInt((cr.split('/')[1] || ''), 10);
    const nextCursor = Number.isFinite(total) ? total : cursor + rows.length;

    const stRes = await fetch(
      `${REST}/isg_control?room=eq.${q(ROOM)}&select=segment,step,phase,seq&limit=1`,
      { headers: HDR() });
    if (!stRes.ok) throw new Error('GET state ' + stRes.status);
    const st = await stRes.json();
    const state = st[0] || { segment: 0, step: 0, phase: 'idle', seq: 0 };

    return { ok: true, rows: rows.map(normalize), cursor: nextCursor, state };
  },

  /* Presenter drives the room. Upsert so any room works without seeding;
     seq = a client timestamp (one presenter, so it's monotonic) — the
     bus only needs it to CHANGE for followers to notice. */
  async setState(next) {
    if (OFFLINE) {
      sim.load(); sim.state = { ...sim.state, ...next, seq: sim.state.seq + 1 }; sim.save();
      return { ok: true, state: sim.state };
    }
    const body = {
      room: ROOM,
      segment: next.segment ?? 0,
      step: next.step ?? 0,
      phase: next.phase ?? 'idle',
      seq: Date.now()
    };
    let err;
    for (let i = 0; i < 3; i++) {   // a dropped packet must not cost a beat
      try {
        const res = await fetch(`${REST}/isg_control?on_conflict=room`, {
          method: 'POST',
          headers: { ...HDR(), 'Content-Type': 'application/json',
                     Prefer: 'resolution=merge-duplicates,return=representation' },
          body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error('upsert ' + res.status);
        const j = await res.json();
        return { ok: true, state: j[0] || body };
      } catch (e) { err = e; await new Promise(r => setTimeout(r, 250 * (i + 1))); }
    }
    throw err;
  },

  /* Clear one activity's responses (between your testing and the room). */
  async clear(activity) {
    if (OFFLINE) {
      sim.load(); sim.rows = sim.rows.filter(r => r.activity !== activity); sim.save();
      return { ok: true };
    }
    const res = await fetch(
      `${REST}/isg_responses?room=eq.${q(ROOM)}&activity=eq.${q(activity)}`,
      { method: 'DELETE', headers: { ...HDR(), Prefer: 'return=minimal' } });
    if (!res.ok) throw new Error('DELETE ' + res.status);
    return { ok: true };
  }
};

/* ---------- retry queue (persisted) ------------------------- */
const RETRY_KEY = 'isg.retry';
function loadRetries() { try { return JSON.parse(localStorage.getItem(RETRY_KEY) || '[]'); } catch { return []; } }
function saveRetries(qd) { try { localStorage.setItem(RETRY_KEY, JSON.stringify(qd)); } catch {} }
const retryQueue = OFFLINE ? [] : loadRetries();
function queueRetry(row) { retryQueue.push(row); saveRetries(retryQueue); }
function flushRetries() {
  if (!retryQueue.length) return;
  const batch = retryQueue.splice(0, retryQueue.length);
  saveRetries(retryQueue);
  fetch(`${REST}/isg_responses`, {
    method: 'POST',
    headers: { ...HDR(), 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(batch)          // PostgREST accepts an array insert
  }).then(res => { if (!res.ok) throw new Error('batch ' + res.status); })
    .catch(() => { retryQueue.push(...batch); saveRetries(retryQueue); });
}
