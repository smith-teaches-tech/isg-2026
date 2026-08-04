/* ============================================================
   I-0 · GUESS THE TOK FLAG RATE  (segment 10, ~1.5 min)

   Reframed 2026-08-04. The slide (10-gauge) just delivered the
   consequence (flagged students rewrote the flagged sections in their
   own words) and the IB warning (a flagged essay can cost the diploma).
   Now the room guesses: after all that, what % of the NEXT semester's
   TOK essays came back flagged?

   The room guesses LOW — they expect the consequence + warning worked.
   Reveal = HOLD → the room's EXPECTATION (histogram + "expects X%
   flagged"). The truth (38.2%, UP +63%) lands on seg 11 — the dissonance.
   (Was the "% of at-home writing that's AI-assisted" gut-check; Michael
   cut that wording 2026-08-04 — it made no sense at this spot.)
   ============================================================ */

import { h, mount, countUp } from '../../assets/js/ui.js';

/* The reveal re-renders on any resize — and the screen page forces
   exactly that when the projector re-negotiates or fullscreen is
   toggled. Without this the room's average visibly counted up from
   zero again, mid-sentence, while Michael was saying the number. */
let counted = null;

const QUESTION = 'After the rewrite and the IB warning — what % of TOK essays came back flagged?';

export default {

  id: 'i0-gauge',

  phone: {
    render({ root, phase, mine, submit }) {

      const already = mine();

      if (already != null) {
        return mount(root, h('div', { class: 'state-msg fade-in' },
          h('p', { class: 'muted' }, 'You said'),
          h('p', { class: 'big' }, already.value + '%'),
          h('p', { class: 'muted' }, 'Look up.')));
      }

      if (phase !== 'input') {
        return mount(root, h('div', { class: 'state-msg' },
          h('div', { class: 'pill' }, phase === 'idle' ? 'stand by' : 'answers closed')));
      }

      const out = h('div', { class: 'big center mono' }, '15%');
      const slider = h('input', {
        type: 'range', min: '0', max: '100', step: '5', value: '15',
        style: 'width:100%;accent-color:var(--accent);height:2.5rem',
        oninput: e => { out.textContent = e.target.value + '%'; }
      });

      mount(root,
        h('h2', {}, QUESTION),
        h('div', { class: 'card' }, out, slider,
          h('div', { class: 'faint', style: 'display:flex;justify-content:space-between;font-size:var(--t-xs)' },
            h('span', {}, 'none flagged'), h('span', {}, 'all flagged'))),
        h('button', {
          class: 'btn btn--primary',
          onclick: async e => {
            e.target.disabled = true;
            e.target.textContent = 'sending…';
            await submit({ value: Number(slider.value) });
            mount(root, h('div', { class: 'state-msg fade-in' },
              h('p', { class: 'muted' }, 'You said'),
              h('p', { class: 'big' }, slider.value + '%'),
              h('p', { class: 'muted' }, 'Look up.')));
          }
        }, 'Lock it in')
      );
    }
  },

  screen: {
    render({ root, phase, unique, total }) {

      const values = unique.map(r => Number(r.payload?.value)).filter(n => !isNaN(n));

      if (phase === 'idle') {
        counted = null;
        return mount(root, h('div', { class: 'center' },
          h('h1', {}, QUESTION),
          h('p', { class: 'muted' }, 'scan the code to answer')));
      }

      /* HOLD — the counter builds anticipation without leaking the answer. */
      if (phase === 'input' || phase === 'locked') {
        return mount(root, h('div', { class: 'center' },
          h('h1', {}, QUESTION),
          h('div', { class: 'big mono', style: 'margin:var(--s-6) 0' }, total),
          h('p', { class: 'muted' }, phase === 'locked' ? 'answers closed' : 'answers in')));
      }

      /* REVEAL — histogram in 10-point buckets, plus the room's average. */
      const buckets = new Array(10).fill(0);
      for (const v of values) buckets[Math.min(9, Math.floor(v / 10))]++;
      const peak = Math.max(1, ...buckets);
      const avg  = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;

      const avgEl = h('span', { class: 'mono' }, '0%');

      mount(root, h('div', { class: 'fade-in' },
        h('h2', { class: 'center', style: 'color:var(--ink-dim)' }, QUESTION),

        h('div', {
          style: `display:grid;grid-template-columns:repeat(10,1fr);gap:var(--s-2);
                  align-items:end;height:38vh;margin:var(--s-6) 0`
        },
          ...buckets.map((n, i) => h('div', { style: 'display:flex;flex-direction:column;justify-content:flex-end;height:100%' },
            h('div', { class: 'center mono faint', style: 'font-size:var(--t-sm)' }, n || ''),
            h('div', {
              style: `height:${(n / peak) * 100}%;min-height:${n ? '4px' : '0'};
                      background:var(--accent);border-radius:6px 6px 0 0;
                      transition:height .7s var(--ease)`
            }),
            h('div', { class: 'center faint mono', style: 'font-size:var(--t-xs);margin-top:var(--s-2)' },
              `${i * 10}–${i * 10 + 9}`)
          ))
        ),

        h('p', { class: 'center', style: 'font-size:var(--t-xl)' },
          'The room expects ', avgEl, ' came back flagged.'),
        h('p', { class: 'center muted', style: 'font-size:var(--t-base);margin-top:var(--s-2)' },
          'The truth is next…')
      ));

      if (counted === avg) avgEl.textContent = avg + '%';
      else { counted = avg; countUp(avgEl, avg, 1100, '%'); }
    }
  }
};
