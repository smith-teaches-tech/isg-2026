/* ============================================================
   I-2 · CAN A REVISION HISTORY BE FAKED?  (segment 3, ~4 min)

   The vote sits between the two halves of the argument, and that
   placement is the whole design. Slide 03 spends four beats making
   the case FOR revision history — what it shows, how well, how
   obvious a paste looks — so the room is committed to it before
   they answer. Then they watch what defeats it.

   PHASES
     input   — Yes / No. Nothing shown on screen but a count.
     locked  — THE AUTOTYPER RUNS. This is the segment.
     reveal  — the answer, the room's split, and the line.

   The autotyper is a SIMULATION. It types a string that is already
   in this file. It does not automate anything, drive any editor, or
   work on any real document — and it must stay that way. The point
   is to show teachers what exists, not to hand anyone a tool.

   The document it produces is the same paragraph shown in slide
   03 beat 1, and it ends on the same Inspect report: 34% deletion
   ratio, three sessions, zero paste events, "consistent with human
   composition". That is the kill shot — not the typing.
   ============================================================ */

import { h, mount, tally, pct } from '../../assets/js/ui.js';

const QUESTION = 'Can a revision history be faked?';

/* The script the autotyper "runs". Deliberately a fixed list of
   instructions rather than anything generative:
     {t:'…'}  type this
     {b:n}    backspace n characters, then carry on
     {p:ms}   pause
     {para:1} start a new paragraph
   The backspaces and pauses are what make the output look human —
   which is exactly the claim being demonstrated. */
const SCRIPT = [
  { t: 'Friar Laurence is the only adult in the play who knows every' },
  { p: 700 }, { t: 'thing, and at every turn he ' },
  { t: 'hides the truth', p: 400 }, { b: 15 },
  { t: 'conceals rather than intervenes.' }, { p: 1400 },

  { para: 1 },
  { t: 'His knowledge and authority make him complicit in a way the feuding families are not' },
  { p: 900 }, { t: ': they act out of ignorance, he acts out of calc' },
  { b: 4 }, { t: 'calculation.' }, { p: 1200 },

  { para: 1 },
  { t: 'By the time he arrives at the tomb, the secret he kept has already done the work the poison only finishes.' }
];

/* What gets "pasted" into the sidebar is the FINISHED text — what a
   student would actually copy out of a chatbot. Deriving it by
   replaying the script (applying the backspaces, honouring the
   paragraph breaks) rather than concatenating the fragments, which
   would show the discarded keystrokes: "…he hides the truthconceals
   rather than…". The whole illusion depends on the paste being clean
   and the typing being messy. */
function finalText() {
  const paras = [''];
  for (const ins of SCRIPT) {
    if (ins.para) { paras.push(''); continue; }
    if (ins.b !== undefined) {
      paras[paras.length - 1] = paras[paras.length - 1].slice(0, -ins.b);
      continue;
    }
    if (ins.t) paras[paras.length - 1] += ins.t;
  }
  return paras.filter(Boolean).join('\n\n');
}

/* Module-level, because the screen page re-renders on every poll and
   a late-arriving row must not restart a running animation. `run.el`
   is a STABLE wrapper the screen re-parents each poll; the mock is
   rebuilt inside it on every loop, so re-parenting never interrupts
   anything and the element the screen holds never changes. */
let run = null;

/* Timer helper. Fires only while the current run is alive, so a stop()
   between scheduling and firing is a clean no-op. */
const schedule = (ms, fn) => {
  if (!run) return;
  run.timers.push(setTimeout(() => { if (run && !run.dead) fn(); }, ms));
};

function stop() {
  if (run) { run.dead = true; run.timers.forEach(clearTimeout); run = null; }
}

export default {

  id: 'i2-fake-history',

  /* ---------- PHONE ---------------------------------------- */
  phone: {
    render({ root, phase, mine, submit }) {

      const already = mine();

      if (already) {
        return mount(root, h('div', { class: 'state-msg fade-in' },
          h('p', { class: 'muted' }, 'You said'),
          h('p', { class: 'big' }, already.value === 'yes' ? 'Yes' : 'No'),
          h('p', { class: 'faint' }, 'Look up.')));
      }

      if (phase !== 'input') {
        return mount(root, h('div', { class: 'state-msg' },
          h('div', { class: 'pill' }, phase === 'idle' ? 'stand by' : 'answers closed'),
          phase !== 'idle' && h('p', { class: 'faint' }, 'Look up.')));
      }

      const pick = async (value, label, el) => {
        el.disabled = true;
        await submit({ value });
        mount(root, h('div', { class: 'state-msg fade-in' },
          h('p', { class: 'muted' }, 'You said'),
          h('p', { class: 'big' }, label),
          h('p', { class: 'faint' }, 'Look up.')));
      };

      mount(root,
        h('h2', {}, QUESTION),
        h('p', { class: 'muted' },
          'A student hands in a document. The revision history shows typing, edits and pauses.'),
        h('button', {
          class: 'btn btn--primary', style: 'margin-bottom:var(--s-3)',
          onclick: e => pick('yes', 'Yes', e.target)
        }, 'Yes — it can be faked'),
        h('button', {
          class: 'btn',
          onclick: e => pick('no', 'No', e.target)
        }, 'No — it would show')
      );
    }
  },

  /* ---------- SCREEN --------------------------------------- */
  screen: {
    render({ root, phase, unique, total }) {

      injectCSS();

      if (phase === 'input') {
        stop();          // a genuine restart: the vote is open again
        return mount(root, h('div', { class: 'center' },
          h('h1', {}, QUESTION),
          h('div', { class: 'big mono', style: 'margin:var(--s-6) 0' }, total),
          h('p', { class: 'muted' }, 'answers in')));
      }

      /* ---- LOCKED: the autotyper ---- */
      if (phase === 'locked') {
        /* The screen page hands us a NEW root on every poll and mounts
           it over the old one, so checking whether our element is still
           connected is useless — it never is. A single late vote
           arriving mid-animation was starting the whole thing again
           from a blank page, thirty seconds in, in front of the room.

           So the mock lives at module level and gets re-parented into
           whatever root we are given. The timers hold element
           references, so moving it does not interrupt anything. */
        if (run && !run.dead) { mount(root, run.el); return; }
        stop();
        run = { dead: false, timers: [], el: h('div', { style: 'width:100%' }) };
        mount(root, run.el);
        cycle();
        return;
      }

      /* ---- REVEAL ----
         Stop the loop here. It now repeats until you advance (Michael's
         rule for moving beats), so there is nothing to preserve across
         a back-press — landing on `locked` again just restarts it from
         the top, which is what you want anyway. Stopping also means the
         typing timers aren't left running invisibly behind the reveal. */
      stop();

      const counts = tally(unique, 'value');
      const yes = counts.get('yes') || 0;
      const no  = counts.get('no')  || 0;
      const yesPct = pct(yes, total);

      /* The line has to work whichever way the room broke. A room that
         already said "yes" is not wrong — it has just conceded the
         thing it was relying on, which is the better sting. */
      let line;
      if (!total)            line = 'It takes a browser extension and about nine dollars.';
      else if (yesPct >= 60) line = 'Most of you already knew. So what have we been relying on?';
      else if (yesPct <= 40) line = 'It took a browser extension and about nine dollars.';
      else                   line = 'The room was split. The answer is not.';

      mount(root, h('div', { class: 'fade-in center' },
        h('p', { class: 'muted', style: 'font-size:var(--t-lg)' }, QUESTION),
        h('p', { class: 'big', style: 'color:var(--accent-hot);margin:var(--s-4) 0' }, 'Yes.'),

        total ? h('div', { style: 'max-width:52ch;margin:0 auto var(--s-6)' },
          h('div', { class: 'i2-split' },
            h('div', {},
              h('div', { class: 'mono', style: 'font-size:var(--t-lg)' }, yesPct + '%'),
              h('div', { class: 'faint', style: 'font-size:var(--t-sm)' }, 'said yes'),
              h('div', { class: 'bar', style: 'margin-top:var(--s-2)' },
                h('i', { style: `width:${yesPct}%` }))),
            h('div', {},
              h('div', { class: 'mono', style: 'font-size:var(--t-lg)' }, (100 - yesPct) + '%'),
              h('div', { class: 'faint', style: 'font-size:var(--t-sm)' }, 'said no'),
              h('div', { class: 'bar', style: 'margin-top:var(--s-2)' },
                h('i', { style: `width:${100 - yesPct}%;background:var(--ink-faint)` }))))) : null,

        h('p', { class: 'lead', style: 'font-size:var(--t-xl);max-width:40ch;margin:0 auto' }, line)
      ));
    }
  }
};

/* ---------- the mock ----------------------------------------
   Same document chrome as slide 03, different sidebar. That is the
   argument made visually: one document, two sidebars, opposite
   purposes. The Inspect panel it ends on is byte-for-byte the
   reassuring one from beat 1. */
function buildAutotyper() {
  const page   = h('div', { class: 'ptdoc atdoc' });
  const caret  = h('span', { class: 'caret' });
  page.append(caret);

  const area   = h('div', { class: 'atarea' }, '');
  const status = h('div', { class: 'atstatus' }, 'Ready');
  const btn    = h('button', { class: 'atbtn' }, 'Type for Me');

  const side = h('div', { class: 'ptside atside' },
    h('div', { class: 'ptside__hd atside__hd' },
      h('div', { class: 'ico' }),
      h('div', {},
        h('div', { class: 'wm' }, 'Autotyper'),
        h('div', { class: 'sub' }, 'Human-like typing for any document'))),
    h('div', { class: 'ptside__body' },
      h('div', { class: 'atlabel' }, 'Paste your text'),
      area,
      h('div', { class: 'atopts' },
        h('span', { class: 'atchip' }, 'Slow'),
        h('span', { class: 'atchip atchip--on' }, 'Natural'),
        h('span', { class: 'atchip' }, 'Fast')),
      h('div', { class: 'atcheck' }, '☑ Random pauses'),
      h('div', { class: 'atcheck' }, '☑ Typos and corrections'),
      btn,
      status));

  const el = h('div', { class: 'ptframe' }, page, side);
  return { el, page, caret, area, status, btn };
}

/* One loop iteration. A fresh mock is built inside the stable run.el,
   typed out, ended on the Inspect kill-shot, held so the room can read
   it, then rebuilt — the beat repeats until the presenter advances
   (which calls stop). A backstop: if run.el is no longer inside #stage
   (a presenter jump straight out of `locked`), let the loop die. */
function cycle() {
  if (!run || run.dead) return;
  const stage = document.getElementById('stage');
  if (stage && run.el && !stage.contains(run.el)) return stop();

  const box = buildAutotyper();
  mount(run.el, box.el);
  playOnce(box, () => schedule(4500, cycle));   // hold the kill-shot, then loop
}

function playOnce(box, onDone) {
  const at = schedule;                                  // (ms, fn)

  const FULL  = SCRIPT.map(s => s.t || '').join('');   // keystroke count, for the % readout
  const PASTE = finalText();                           // what a student would actually paste

  /* 1 — the text appears in the sidebar, as if pasted */
  at(1200, () => {
    box.area.textContent = PASTE;
    box.area.classList.add('atarea--filled');
    box.status.textContent = PASTE.length + ' characters ready';
  });

  /* 2 — the button is pressed */
  at(2600, () => { box.btn.classList.add('atbtn--press'); });
  at(2900, () => { box.btn.classList.remove('atbtn--press'); box.btn.textContent = 'Typing…'; });

  /* 3 — the document types itself */
  let para = h('p', {});
  box.page.insertBefore(para, box.caret);

  let i = 0, chars = 0;
  const total = FULL.length;

  const step = () => {
    if (!run || run.dead) return;
    if (i >= SCRIPT.length) return finish();

    const ins = SCRIPT[i];

    if (ins.para) { para = h('p', {}); box.page.insertBefore(para, box.caret); i++; return at(500, step); }
    if (ins.p && !ins.t && !ins.b) { i++; return at(ins.p, step); }

    if (ins.b !== undefined) {                       // backspace, visibly
      let n = ins.b;
      const chew = () => {
        if (!run || run.dead) return;
        if (n <= 0) { i++; return at(260, step); }
        para.textContent = para.textContent.slice(0, -1);
        n--; at(38, chew);
      };
      return chew();
    }

    /* typing — accelerates past the halfway mark, so it is convincing
       early and does not hold the room hostage late */
    const text = ins.t || '';
    let k = 0;
    const tick = () => {
      if (!run || run.dead) return;
      if (k >= text.length) {
        const after = ins.p || 0;
        i++;
        return at(after || 90, step);
      }
      para.textContent += text[k++];
      chars++;
      const frac = chars / total;
      box.status.textContent = 'Typing… ' + Math.min(99, Math.round(frac * 100)) + '%';
      const base = frac < 0.5 ? 62 : 22;
      at(base + Math.random() * base * 0.7, tick);
    };
    tick();
  };

  const finish = () => {
    box.status.textContent = 'Done';
    box.btn.textContent = 'Type for Me';
    box.caret.remove();

    /* 4 — and now look at what it produced. Same report as beat 1. */
    at(1400, () => {
      const side = box.el.querySelector('.atside');
      if (side) side.replaceWith(inspectPanel());
      box.el.classList.add('ptframe--flip');
      onDone();
    });
  };

  at(3400, step);
}

/* The reassuring report — identical to slide 03 beat 1. */
function inspectPanel() {
  const sec = (title, ...kids) => h('div', { class: 'ptsec' },
    h('div', { class: 'ptsec__t' }, ...title), ...kids);

  return h('div', { class: 'ptside fade-in' },
    h('div', { class: 'ptside__hd' },
      h('div', { class: 'ico' }),
      h('div', {},
        h('div', { class: 'wm', html: 'PaperTrail&trade; <em>Inspect</em>' }),
        h('div', { class: 'sub' }, 'Revision analysis'))),
    h('div', { class: 'ptside__body' },
      h('button', { class: 'ptbtn ptbtn--blue' }, '▶ Open Playback Window'),
      h('div', { class: 'ptsec' },
        h('div', { class: 'ptsec__t' }, '📈 Revision Timeline'),
        h('div', { class: 'pttl' },
          h('span', { class: 'b', style: 'width:34%' }),
          h('span', { class: 'g', style: 'width:9%' }),
          h('span', { class: 'b', style: 'width:28%' }),
          h('span', { class: 'g', style: 'width:6%' }),
          h('span', { class: 'b', style: 'width:23%' })),
        h('div', { class: 'ptlegend' },
          h('span', {}, h('b', {}, '●'), ' revision'),
          h('span', { class: 'rd' }, '● paste'),
          h('span', { class: 'og' }, '⚡ struggle'))),
      sec(['📋 Paste Events ', h('span', { class: 'ptbadge ptbadge--zero' }, '0'),
           h('span', { class: 'chev' }, '▼')]),
      sec(['🕐 Writing Sessions', h('span', { class: 'chev' }, '▼')],
          h('div', { class: 'ptrow' }, 'Mon 7:04–7:31pm · 27 min'),
          h('div', { class: 'ptrow' }, 'Wed 6:40–7:00pm · 20 min')),
      sec(['⚡ Struggle Moments ', h('span', { class: 'ptbadge ptbadge--o' }, '1'),
           h('span', { class: 'chev' }, '▼')],
          h('div', { class: 'ptrow', html: '<b>Paragraph 2</b> — 6 min pause, 3 deletions before final phrasing.' })),
      sec(['📊 Activity Report', h('span', { class: 'chev' }, '▼')],
          h('div', { class: 'ptrow', html: '<b>Deletion ratio:</b> 34% &nbsp;·&nbsp; <b>214</b> revisions' }))));
}

function injectCSS() {
  if (document.getElementById('i2-css')) return;
  const s = document.createElement('style');
  s.id = 'i2-css';
  s.textContent = `
  .atdoc p { margin: 0 0 1.6cqh; }
  .atside__hd { background: #6b46c1 !important; border-bottom-color: #553c9a !important; }
  .atlabel { font-size: 2cqh; color: #5f6368; margin: 2cqh 0 .8cqh; font-weight: 600; }
  .atarea {
    height: 16cqh; padding: 1.2cqh; border: 1px solid #c5cbd4; border-radius: 4px;
    background: #fbfbfd; color: #9aa0a6; font-size: 1.8cqh; line-height: 1.4;
    overflow: hidden; font-family: inherit; white-space: pre-wrap;
  }
  .atarea--filled { color: #202124; background: #fff; box-shadow: 0 0 0 2px rgba(107,70,193,.35); }
  .atopts { display: flex; gap: .8cqh; margin-top: 1.6cqh; }
  .atchip {
    font-size: 1.75cqh; padding: .5cqh 1.4cqh; border-radius: 99px;
    border: 1px solid #c5cbd4; color: #5f6368;
  }
  .atchip--on { background: #6b46c1; border-color: #6b46c1; color: #fff; font-weight: 700; }
  .atcheck { font-size: 1.85cqh; color: #3c4043; margin-top: 1.2cqh; }
  .atbtn {
    width: 100%; margin-top: 2cqh; padding: 1.7cqh; border: 0; border-radius: 5px;
    background: #6b46c1; color: #fff; font-family: inherit;
    font-size: 2.4cqh; font-weight: 700;
  }
  .atbtn--press { filter: brightness(.82); transform: scale(.985); }
  .atstatus {
    margin-top: 1.4cqh; font-family: var(--font-mono);
    font-size: 1.8cqh; color: #6b46c1;
  }
  /* The swap at the end deserves a beat of its own. */
  .ptframe--flip { transition: box-shadow .6s var(--ease); box-shadow: 0 18px 60px rgba(76,154,255,.35); }
  .i2-split { display: grid; grid-template-columns: 1fr 1fr; gap: var(--s-6); text-align: left; }
  `;
  document.head.append(s);
}
