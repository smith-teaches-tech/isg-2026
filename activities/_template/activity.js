/* ============================================================
   ACTIVITY TEMPLATE — copy this folder to start a new activity.

   An activity is one file with two views:
     phone.render()   what the audience holds
     screen.render()  what the room sees

   You never write networking, polling, or storage. You get
   `submit()` on the phone side and `rows` on the screen side.

   PHASES (the presenter drives these):
     idle    — not open yet
     input   — audience can answer
     locked  — answers closed, nothing shown yet
     reveal  — the finding goes up

   Hold-then-reveal activities show nothing on screen until
   'reveal'. Live activities draw during 'input' too.
   ============================================================ */

import { h, mount, tally, pct } from '../../assets/js/ui.js';

export default {

  id: '_template',

  /* ---------- PHONE -------------------------------------------
     ctx = { root, phase, session, device, mine(slot), submit(payload, slot) }
     Called once when the activity opens and again on every phase
     change. `mine()` returns this device's saved answer, so a
     reload restores state instead of asking twice.            */
  phone: {
    render({ root, phase, mine, submit }) {

      if (phase === 'idle') {
        return mount(root, h('div', { class: 'state-msg' },
          h('div', { class: 'pill' }, 'stand by')));
      }

      const already = mine();

      if (already || phase !== 'input') {
        return mount(root, h('div', { class: 'state-msg' },
          h('p', {}, already ? 'Answer received.' : 'Answers are closed.'),
          h('p', { class: 'muted' }, 'Look up.')));
      }

      mount(root,
        h('h2', {}, 'Your question here'),
        h('button', {
          class: 'btn btn--primary',
          onclick: async e => {
            e.target.disabled = true;
            await submit({ value: 'example' });
            render_thanks(root);
          }
        }, 'Submit')
      );
    }
  },

  /* ---------- SCREEN ------------------------------------------
     ctx = { root, phase, rows, unique, total, session }
     `unique` is one row per device (a re-vote replaces the first).
     Redrawn whenever new responses land or the phase changes.  */
  screen: {
    render({ root, phase, unique, total }) {

      if (phase === 'idle') {
        return mount(root, h('div', { class: 'center' }, h('h1', {}, 'Your question here')));
      }

      /* Hold: show that the room is answering, not what they said. */
      if (phase === 'input' || phase === 'locked') {
        return mount(root, h('div', { class: 'center' },
          h('h1', {}, 'Your question here'),
          h('p', { class: 'big mono' }, total),
          h('p', { class: 'muted' }, phase === 'locked' ? 'answers closed' : 'responses in')));
      }

      const counts = tally(unique, 'value');
      mount(root, h('div', { class: 'fade-in' },
        h('h1', { class: 'center' }, 'The finding'),
        ...[...counts].map(([k, n]) =>
          h('div', { style: 'margin-bottom:var(--s-4)' },
            h('div', {}, `${k} — ${pct(n, total)}%`),
            h('div', { class: 'bar' }, h('i', { style: `width:${pct(n, total)}%` }))))
      ));
    }
  }
};

function render_thanks(root) {
  mount(root, h('div', { class: 'state-msg fade-in' },
    h('p', {}, 'Answer received.'), h('p', { class: 'muted' }, 'Look up.')));
}
