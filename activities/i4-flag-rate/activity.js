/* ============================================================
   I-4 · GUESS THE FLAG RATE  (segment 7, ~4 min)

   The slide (07-turnitin) has just set it up: 44 documents Michael
   knew the authorship of — a mix of essays, all written before
   ChatGPT existed, none by AI — run through Turnitin. Beat 0 was an
   oral hands-up ("who actually trusts Turnitin's AI detector?"), so
   the room has just admitted, on the record, that it doesn't.

   THE GUESS: how many of the 44 came back flagged? Slider 0–44.
   Reveal: HOLD → then ZERO. Not one false positive. The room's own
   fear, disarmed by its own number.

   THE COUNTER-PUNCH (Michael's call): the reveal also lands the one
   paper he DID write with AI and slipped into the test — Turnitin
   caught it at 100%. So it isn't blind: it clears real writing AND
   catches the fake. It appears a beat after the 0 (staged CSS delay).

   Data is REAL (Michael's classroom research): 44 known-authorship
   docs → 0 flagged; 1 planted AI paper → caught.

   No fake data: if nobody guessed (interaction skipped / offline),
   the finding still lands, but the "this room guessed N" line is
   dropped rather than inventing a number.
   ============================================================ */

import { h, mount, countUp } from '../../assets/js/ui.js';

const N_DOCS   = 44;
const QUESTION = `Of ${N_DOCS} documents I knew weren’t written with AI, how many did Turnitin flag?`;

/* The reveal re-renders on resize (the screen forces it when the
   projector re-negotiates). Guard the count-up so the room's average
   doesn't visibly re-tick from zero mid-sentence — same fix as i0. */
let counted = null;

function ensureStyle() {
  if (document.getElementById('i4-style')) return;
  const s = document.createElement('style');
  s.id = 'i4-style';
  s.textContent = `
    @keyframes i4-zpop { from{opacity:0;transform:scale(.6)} to{opacity:1;transform:none} }
    @keyframes i4-rise { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:none} }
    .i4-zero  { animation:i4-zpop .7s var(--ease) both; }
    .i4-caught{ animation:i4-rise .7s var(--ease) 1.35s both; }
  `;
  document.head.append(s);
}

export default {

  id: 'i4-flag-rate',

  /* ---------- PHONE ---------------------------------------- */
  phone: {
    render({ root, phase, mine, submit }) {

      const already = mine();

      if (already != null) {
        return mount(root, h('div', { class: 'state-msg fade-in' },
          h('p', { class: 'muted' }, 'You guessed'),
          h('p', { class: 'big' }, String(already.value)),
          h('p', { class: 'muted' }, 'Look up.')));
      }

      if (phase !== 'input') {
        return mount(root, h('div', { class: 'state-msg' },
          h('div', { class: 'pill' }, phase === 'idle' ? 'stand by' : 'answers closed')));
      }

      const out = h('div', { class: 'big center mono' }, '6');
      const slider = h('input', {
        type: 'range', min: '0', max: String(N_DOCS), step: '1', value: '6',
        style: 'width:100%;accent-color:var(--accent);height:2.5rem',
        oninput: e => { out.textContent = e.target.value; }
      });

      mount(root,
        h('h2', {}, QUESTION),
        h('div', { class: 'card' }, out, slider,
          h('div', { class: 'faint', style: 'display:flex;justify-content:space-between;font-size:var(--t-xs)' },
            h('span', {}, '0 flagged'), h('span', {}, `all ${N_DOCS} flagged`))),
        h('button', {
          class: 'btn btn--primary',
          onclick: async e => {
            e.target.disabled = true;
            e.target.textContent = 'sending…';
            await submit({ value: Number(slider.value) });
            mount(root, h('div', { class: 'state-msg fade-in' },
              h('p', { class: 'muted' }, 'You guessed'),
              h('p', { class: 'big' }, slider.value),
              h('p', { class: 'muted' }, 'Look up.')));
          }
        }, 'Lock in my guess')
      );
    }
  },

  /* ---------- SCREEN --------------------------------------- */
  screen: {
    render({ root, phase, unique, total }) {

      ensureStyle();

      const guesses = unique.map(r => Number(r.payload?.value)).filter(n => !isNaN(n));

      if (phase === 'idle') {
        counted = null;
        return mount(root, h('div', { class: 'center' },
          h('h1', { style: 'max-width:20ch;margin-inline:auto' }, QUESTION),
          h('p', { class: 'muted' }, 'scan the code to guess')));
      }

      /* HOLD — count the room in without leaking the answer. */
      if (phase === 'input' || phase === 'locked') {
        return mount(root, h('div', { class: 'center' },
          h('h1', { style: 'max-width:20ch;margin-inline:auto' }, QUESTION),
          h('div', { class: 'big mono', style: 'margin:var(--s-6) 0' }, total),
          h('p', { class: 'muted' }, phase === 'locked' ? 'guesses closed' : 'guesses in')));
      }

      /* REVEAL — zero, then the AI paper it caught. */
      const avg = guesses.length
        ? Math.round(guesses.reduce((a, b) => a + b, 0) / guesses.length)
        : null;
      const avgEl = h('span', { class: 'mono', style: 'color:var(--ink)' }, '0');

      mount(root, h('div', { class: 'center' },

        h('p', { class: 'muted', style: 'font-size:var(--t-lg);letter-spacing:.02em' },
          `Documents Turnitin flagged — out of ${N_DOCS}:`),

        h('div', { class: 'i4-zero mono',
          style: 'font-size:clamp(5rem,15vw,15rem);line-height:.9;font-weight:800;color:var(--accent-cool);margin:var(--s-4) 0' },
          '0'),

        h('p', { style: 'font-size:var(--t-xl);color:var(--ink)' },
          'Not one false positive. All ', h('b', { style: 'color:var(--accent-cool)' }, `${N_DOCS} cleared`), '.'),

        /* Only if the room actually guessed — no invented numbers. */
        avg != null
          ? h('p', { class: 'muted', style: 'font-size:var(--t-lg);margin-top:var(--s-3)' },
              'This room guessed ', avgEl, ' would be flagged.')
          : null,

        /* The counter-punch, a beat later: it caught the one it should. */
        h('div', { class: 'i4-caught',
          style: `margin:var(--s-7) auto 0;max-width:44ch;padding:var(--s-4) var(--s-5);
                  border:2px solid var(--accent-hot);border-radius:var(--radius);
                  background:rgba(255,92,92,.08)` },
          h('div', { class: 'mono', style: 'color:var(--accent-hot);font-weight:700;letter-spacing:.06em;font-size:var(--t-sm)' },
            'AND THE ONE I WROTE WITH AI?'),
          h('div', { style: 'font-size:var(--t-xl);margin-top:var(--s-2)' },
            'Caught — flagged at ', h('b', { style: 'color:var(--accent-hot)' }, '100%'), '.'))
      ));

      /* Animate the room's guess (guarded so resize doesn't re-tick). */
      if (avg != null) {
        if (counted === avg) avgEl.textContent = String(avg);
        else { counted = avg; countUp(avgEl, avg, 1000); }
      }
    }
  }
};
