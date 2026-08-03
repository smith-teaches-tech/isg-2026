/* ============================================================
   I-3 · HOW MUCH SHOULD STUDENTS WRITE?  (segment 4, ~4 min)

   The rebuttal to "just make them write in class." The slide sets
   it up: writing is thinking (Emig), and the volume students need
   can't fit in class time. Then this poll makes the room commit to
   the OTHER half — how much they can actually keep up with — and
   the reveal multiplies it by four.

   The number the room gives is their grading capacity. The finding
   is the ratio: students should write ~4x what a teacher can grade
   (Kelly Gallagher, via EdWeek). So whatever they can grade, the
   real target is four times bigger — and that only happens at home.

   Reveal: HOLD. Nothing on screen but a count until the presenter
   reveals. No fake data — if nobody answers, the reveal falls back
   to stating the ratio and Michael asks the room out loud.
   ============================================================ */

import { h, mount, countUp } from '../../assets/js/ui.js';

const QUESTION =
  'Realistically, how many pieces of writing can you give real feedback on — per student, a semester?';

/* Single representative numbers so the x4 lands cleanly. */
const OPTIONS = [2, 4, 6, 8];

/* Guard so countUp doesn't replay from zero on a resize re-render
   (the screen forces a redraw when the projector re-negotiates). */
let counted = null;

export default {

  id: 'i3-how-much',

  phone: {
    render({ root, phase, mine, submit }) {

      const already = mine();

      if (already != null) {
        return mount(root, h('div', { class: 'state-msg fade-in' },
          h('p', { class: 'muted' }, 'You said'),
          h('p', { class: 'big' }, String(already.value)),
          h('p', { class: 'muted' }, 'per student, a semester · look up.')));
      }

      if (phase !== 'input') {
        return mount(root, h('div', { class: 'state-msg' },
          h('div', { class: 'pill' }, phase === 'idle' ? 'stand by' : 'answers closed')));
      }

      mount(root,
        h('h2', {}, QUESTION),
        h('p', { class: 'muted', style: 'margin-top:calc(-1*var(--s-2))' },
          'Pieces you can actually read closely and respond to — not just collect.'),
        h('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:var(--s-3);margin-top:var(--s-4)' },
          ...OPTIONS.map(n => h('button', {
            class: 'btn btn--primary',
            style: 'font-size:var(--t-2xl);padding:var(--s-5)',
            onclick: async e => {
              for (const b of root.querySelectorAll('button')) b.disabled = true;
              await submit({ value: n });
              mount(root, h('div', { class: 'state-msg fade-in' },
                h('p', { class: 'muted' }, 'You said'),
                h('p', { class: 'big' }, String(n)),
                h('p', { class: 'muted' }, 'per student, a semester · look up.')));
            }
          }, n === 8 ? '8+' : String(n))))
      );
    }
  },

  screen: {
    render({ root, phase, unique, total }) {

      const values = unique.map(r => Number(r.payload?.value)).filter(n => !isNaN(n));

      if (phase === 'idle') {
        counted = null;
        return mount(root, h('div', { class: 'center' },
          h('h1', {}, 'How much should students write?'),
          h('p', { class: 'muted' }, 'scan the code to answer')));
      }

      /* HOLD — a count builds anticipation without leaking the split. */
      if (phase === 'input' || phase === 'locked') {
        return mount(root, h('div', { class: 'center' },
          h('h1', { style: 'max-width:22ch;margin:0 auto' },
            'How many can you give real feedback on?'),
          h('div', { class: 'big mono', style: 'margin:var(--s-6) 0' }, total),
          h('p', { class: 'muted' }, phase === 'locked' ? 'answers closed' : 'answers in')));
      }

      /* ---- REVEAL ---------------------------------------------- */
      const counts = OPTIONS.map(n => values.filter(v => v === n).length);
      const peak   = Math.max(1, ...counts);

      /* the room's leading answer (ties -> the larger, charitable) */
      let modal = null, best = -1;
      OPTIONS.forEach((n, i) => { if (counts[i] >= best) { best = counts[i]; modal = n; } });

      /* No votes: don't invent a number. State the rule instead. */
      if (!values.length) {
        return mount(root, h('div', { class: 'fade-in center' },
          h('h2', { style: 'color:var(--ink-dim)' }, QUESTION),
          h('p', { class: 'lead', style: 'font-size:var(--t-2xl);max-width:26ch;margin:var(--s-6) auto 0' },
            'Whatever the number — research says students should write ',
            h('b', { style: 'color:var(--accent-hot)' }, 'four times'), ' what you can grade.'),
          h('p', { class: 'faint', style: 'margin-top:var(--s-5)' },
            'Kelly Gallagher · writing is thinking, not the record of it (Emig, 1977)')));
      }

      const target = modal * 4;
      const bigEl  = h('span', { class: 'mono', style: 'color:var(--accent-hot)' }, '0');

      mount(root, h('div', { class: 'fade-in center' },

        h('h2', { style: 'color:var(--ink-dim);margin-bottom:var(--s-5)' },
          'How many can you give real feedback on, per student, a semester?'),

        /* the room's four-way split */
        h('div', {
          style: `display:grid;grid-template-columns:repeat(4,1fr);gap:var(--s-5);
                  align-items:end;height:26vh;max-width:60vw;margin:0 auto var(--s-5)`
        },
          ...OPTIONS.map((n, i) => h('div', {
            style: 'display:flex;flex-direction:column;justify-content:flex-end;height:100%'
          },
            h('div', { class: 'center mono faint', style: 'font-size:var(--t-sm)' }, counts[i] || ''),
            h('div', {
              style: `height:${(counts[i] / peak) * 100}%;min-height:${counts[i] ? '4px' : '0'};
                      background:${n === modal ? 'var(--accent)' : 'var(--line-strong)'};
                      border-radius:6px 6px 0 0;transition:height .7s var(--ease)`
            }),
            h('div', { class: 'center mono', style: `font-size:var(--t-lg);margin-top:var(--s-2);
                      color:${n === modal ? 'var(--ink)' : 'var(--ink-faint)'}` },
              n === 8 ? '8+' : String(n))
          ))
        ),

        /* the finding: x4 */
        h('p', { style: 'font-size:var(--t-2xl);margin:0' },
          'This room can grade about ',
          h('b', { class: 'mono' }, String(modal)),
          '. Research says they should write ', bigEl, '.'),
        h('p', { class: 'lead', style: 'font-size:var(--t-xl);max-width:34ch;margin:var(--s-4) auto 0' },
          'Four times what you can grade — because writing is ',
          h('b', { style: 'color:var(--accent-cool)' }, 'thinking'), ', not the record of it.'),
        h('p', { class: 'faint', style: 'font-size:var(--t-sm);margin-top:var(--s-4)' },
          'Kelly Gallagher (EdWeek, 2018) · Janet Emig, “Writing as a Mode of Learning,” 1977')
      ));

      if (counted === target) bigEl.textContent = String(target);
      else { counted = target; countUp(bigEl, target, 1200); }
    }
  }
};
