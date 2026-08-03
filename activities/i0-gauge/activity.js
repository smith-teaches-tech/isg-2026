/* ============================================================
   I-0 · GUT-CHECK GAUGE  (segment 1, ~1 min)

   "What percentage of the at-home writing you receive do you
    think is AI-assisted?"

   Its real job is the scan-in — getting every device onto the
   site before the session starts. The number is a bonus, and a
   good one: the room's own estimate is the opening premise.

   Reveal: HOLD. Nothing goes up until the presenter reveals.
   ============================================================ */

import { h, mount, countUp } from '../../assets/js/ui.js';

/* The reveal re-renders on any resize — and the screen page forces
   exactly that when the projector re-negotiates or fullscreen is
   toggled. Without this the room's average visibly counted up from
   zero again, mid-sentence, while Michael was saying the number. */
let counted = null;

const QUESTION = 'What % of the at-home writing you receive do you think is AI-assisted?';

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

      const out = h('div', { class: 'big center mono' }, '50%');
      const slider = h('input', {
        type: 'range', min: '0', max: '100', step: '5', value: '50',
        style: 'width:100%;accent-color:var(--accent);height:2.5rem',
        oninput: e => { out.textContent = e.target.value + '%'; }
      });

      mount(root,
        h('h2', {}, QUESTION),
        h('div', { class: 'card' }, out, slider,
          h('div', { class: 'faint', style: 'display:flex;justify-content:space-between;font-size:var(--t-xs)' },
            h('span', {}, 'none of it'), h('span', {}, 'all of it'))),
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
          'This room says ', avgEl, ' of at-home writing is AI-assisted.')
      ));

      if (counted === avg) avgEl.textContent = avg + '%';
      else { counted = avg; countUp(avgEl, avg, 1100, '%'); }
    }
  }
};
