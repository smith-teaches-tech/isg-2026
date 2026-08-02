/* Device-local identity + answer memory.
   Limits repeat voting and lets a phone restore state on reload —
   both standing requirements. All localStorage, nothing server-side. */

const KEY_ID   = 'isg.deviceId';
const KEY_NAME = 'isg.name';
const KEY_ANS  = 'isg.answers';

function uid() {
  if (crypto.randomUUID) return crypto.randomUUID().slice(0, 8);
  return Math.random().toString(36).slice(2, 10);
}

export const device = {

  get id() {
    let v = localStorage.getItem(KEY_ID);
    if (!v) { v = uid(); localStorage.setItem(KEY_ID, v); }
    return v;
  },

  /* Optional name — so a good answer can be called on to elaborate. */
  get name()  { return localStorage.getItem(KEY_NAME) || ''; },
  set name(v) { localStorage.setItem(KEY_NAME, (v || '').trim().slice(0, 40)); },

  _all() {
    try { return JSON.parse(localStorage.getItem(KEY_ANS) || '{}'); }
    catch { return {}; }
  },

  /* Has this device already answered `activity`? Returns the payload or null.
     `slot` lets one activity hold two answers (I-5 votes before and after). */
  answer(activity, slot = 'a') {
    return this._all()[activity + ':' + slot] ?? null;
  },

  remember(activity, payload, slot = 'a') {
    const all = this._all();
    all[activity + ':' + slot] = payload;
    localStorage.setItem(KEY_ANS, JSON.stringify(all));
  },

  /* Wipe between the dry run and the real session. */
  reset() {
    localStorage.removeItem(KEY_ANS);
  }
};
