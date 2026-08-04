/* ============================================================
   I-5 · THE INCEPTION EFFECT  (segment 12, ~6 min)

   The two-vote swing IS the finding. The room votes on a hypothetical
   first, then watches a real chat, then votes again on that chat — and
   their own shift is the argument.

   PHASES (one linear axis — see flow.js):
     input   — VOTE 1. A hypothetical: "she only asked for suggestions
               and wrote every word — is that dishonest?" Screen holds a
               count; the split is NOT shown yet (it would contaminate
               the baseline). The room breaks toward "not dishonest".
     locked  — THE MIGRATION. A real student's chat, shortened, plays on
               a doc | ChatGPT split. Three of the AI's phrases — a word,
               a phrase, a whole reading — creep into her paragraph, in
               red, the same red they wore in the chat. Build-and-hold:
               it assembles once (~12s) and then holds still so the room
               can read for a minute while Michael tells her story.
     reveal  — "The Inception Effect" + a one-line definition. VOTE 2
               opens on the phones (same 4-point scale, slot 'v2'), and
               the paired per-device shift builds LIVE as people re-vote:
               before vs after bars, and how many moved toward dishonest.

   Two SLOTS on one device (see device.js): 'v1' the hypothetical, 'v2'
   the verdict on the real chat. The shift is computed by pairing the two
   by deviceId — the room grades its own change of mind.

   NO FAKE DATA. Zero votes → the reveal states the point in words and
   Michael runs the swing out loud. The chat is REAL, shortened and
   anonymized — say so; the on-screen label says so too.

   The migration is a SIMULATION of a transcript that lives in this file.
   It automates nothing and drives no editor. Keep it that way.
   ============================================================ */

import { h, mount, countUp } from '../../assets/js/ui.js';

const ID = 'i5-inception';

const QUESTION_1 =
  'A student asks AI only for suggestions and feedback. It never writes for her — she types every word herself. Is that academic dishonesty?';
const QUESTION_2 =
  'Now — after seeing her chat. Is THIS academic dishonesty?';

/* 4-point, no neutral middle, so everyone has to lean. Stored 1..4. */
const SCALE = [
  { v: 1, label: 'Not dishonest',      short: 'Not' },
  { v: 2, label: 'Probably not',       short: 'Prob. not' },
  { v: 3, label: 'Probably dishonest', short: 'Prob. yes' },
  { v: 4, label: 'Clearly dishonest',  short: 'Clearly' }
];

/* Guards so a live re-render (a late vote lands, or the projector
   re-negotiates and forces a redraw) doesn't replay animations. */
let shiftShown = null;

/* ============================================================
   PHONE
   ============================================================ */
export default {

  id: ID,

  phone: {
    render({ root, phase, mine, submit }) {

      /* Vote 1 lives in `input`; vote 2 in `reveal`. Anything else is
         a hold — the room is watching the screen, not the phone. */
      const slot = phase === 'input' ? 'v1'
                 : phase === 'reveal' ? 'v2'
                 : null;

      if (!slot) {
        return mount(root, h('div', { class: 'state-msg' },
          h('div', { class: 'pill' }, phase === 'idle' ? 'stand by' : 'watch the screen'),
          phase === 'locked' && h('p', { class: 'faint' }, 'Read along — look up.')));
      }

      const already = mine(slot);
      if (already != null) return thanks(root, already.value);

      const q = slot === 'v1' ? QUESTION_1 : QUESTION_2;

      mount(root,
        h('h2', {}, q),
        slot === 'v2' && h('p', { class: 'muted', style: 'margin-top:calc(-1*var(--s-2))' },
          'Same scale. Vote on what you just watched.'),
        h('div', { style: 'display:grid;gap:var(--s-3);margin-top:var(--s-4)' },
          ...SCALE.map(o => h('button', {
            class: 'btn' + (o.v >= 3 ? '' : ' '),
            style: 'justify-content:flex-start;text-align:left;padding:var(--s-4)',
            onclick: async e => {
              for (const b of root.querySelectorAll('button')) b.disabled = true;
              await submit({ value: o.v }, slot);
              thanks(root, o.v);
            }
          },
            h('span', { class: 'mono', style: 'opacity:.5;margin-right:var(--s-3)' }, String(o.v)),
            o.label)))
      );
    }
  },

  /* ============================================================
     SCREEN
     ctx = { root, phase, rows, unique, total, session, bus }
     `unique`/`rows` from the page dedupe ACROSS slots, which would
     collapse v1 and v2 — so we pull each slot from the bus ourselves.
     ============================================================ */
  screen: {
    render({ root, phase, bus }) {

      injectCSS();

      /* ---- INPUT: vote 1 open, count only (hold the baseline) ---- */
      if (phase === 'input') {
        stop();
        const n = bus.uniqueFor(ID, 'v1').length;
        return mount(root, h('div', { class: 'center' },
          h('p', { class: 'faint', style: 'font-size:var(--t-lg);margin-bottom:var(--s-4)' },
            'Before we look at anything —'),
          h('h1', { style: 'max-width:24ch;margin:0 auto' }, QUESTION_1),
          h('div', { class: 'big mono', style: 'margin:var(--s-6) 0 var(--s-2)' }, n),
          h('p', { class: 'muted' }, 'answers in')));
      }

      /* ---- LOCKED: the migration, build-and-hold ---- */
      if (phase === 'locked') {
        if (run && !run.dead) { mount(root, run.el); return; }   // re-parent, never restart
        return startMigration(root);
      }

      /* ---- REVEAL: name it, vote 2, live paired shift ---- */
      stop();
      return renderReveal(root, bus);
    }
  }
};

function thanks(root, v) {
  const o = SCALE.find(s => s.v === v);
  return mount(root, h('div', { class: 'state-msg fade-in' },
    h('p', { class: 'muted' }, 'You said'),
    h('p', { class: 'big', style: 'font-size:var(--t-2xl);line-height:1.1' }, o ? o.label : String(v)),
    h('p', { class: 'muted' }, 'Look up.')));
}

/* ============================================================
   THE MIGRATION  (locked)
   Module-level `run` so the screen page — which hands us a fresh root
   every poll — can re-parent the SAME running animation instead of
   restarting it when a late vote lands. Same pattern as i2's autotyper,
   but build-and-hold: it assembles once and then simply stops.
   ============================================================ */
let run = null;

const schedule = (ms, fn) => {
  if (!run) return;
  run.timers.push(setTimeout(() => { if (run && !run.dead) fn(); }, ms));
};

function stop() {
  if (run) { run.dead = true; run.timers.forEach(clearTimeout); run = null; }
}

/* A migrating fragment: red, the same red it wore in the chat. */
function mig(text) { return h('span', { class: 'inc-mig' }, text); }

function buildMigration() {
  /* ---- the document (her paragraph, evolving) ----
     Six slots, six real substitutions from the actual chat:
       w1  condescends → exalts          (a WORD)
       s2  (append) disconnected…        (a PHRASE + the reasoning chain)
       w3  strict → controlling          (the iron-finger read, part 1)
       s3a (append) its words imposed…   (…part 1 cont.)
       s3b (append) obedience / tyrant   (the thesis image, part 2) */
  const w1   = h('span', { class: 'inc-slot' }, 'condescends');
  const s2   = h('span', { class: 'inc-slot' });
  const w3   = h('span', { class: 'inc-slot' }, 'strict');
  const s3a  = h('span', { class: 'inc-slot' });
  const s3b  = h('span', { class: 'inc-slot' });
  const capt = h('p', { class: 'inc-capt' }, 'She never asks it to write. Every word is hers.');

  const doc = h('div', { class: 'inc-doc' },
    h('div', { class: 'inc-label' }, 'Real student chat — shortened & anonymized'),
    h('h4', {}, 'Chief Seattle: the superiority he builds'),
    h('div', { class: 'inc-byline' }, 'English · analysis — first draft'),
    h('p', {}, 'He ', w1, ' his tribe, dwelling on how they “never forget this beautiful world” that gave them life.'),
    h('p', {}, 'He casts the Whites as unworthy of nature: they do not value their ancestors, so they cannot value the land they once lived on', s2, '.'),
    h('p', {}, 'He makes their God seem ', w3, s3a, s3b, '.'),
    capt
  );

  /* ---- the chat (right) ---- */
  const chat = h('div', { class: 'inc-chat' },
    h('div', { class: 'inc-chat__hd' },
      h('span', { class: 'inc-dot' }), h('span', {}, 'ChatGPT')));

  const bubbles = [];
  const add = (who, ...kids) => {
    const b = h('div', { class: `inc-b inc-b--${who}` }, ...kids);
    bubbles.push(b); chat.append(b); return b;
  };

  // 1 — the rule she sets, and the AI's promise (the tell: it "won't write")
  const b1 = add('me', 'can you check my analysis? don’t rewrite anything — just tell me if the reasoning makes sense');
  const b2 = add('ai', 'I won’t rewrite it, just point things out. On the verb — “condescends” means to talk down to them, the opposite. You want one that lifts them up: he ', mig('exalts'), ' them, elevates them.');
  // 2 — the land (a phrase + the whole reasoning chain)
  const b3 = add('me', 'is the part about the land clear?');
  const b4 = add('ai', 'Almost. Walk the steps: they don’t value their ancestors → so not the land → so ', mig('disconnected from nature'), ' → so unworthy of it.');
  // 3 — the iron finger (two words at once)
  const b5 = add('me', 'whats wrong with the iron finger part?');
  const b6 = add('ai', '“Iron finger,” “tablets of stone” — that reads as rigid and ', mig('controlling'), ', something ', mig('imposed'), ' on them, not chosen.');
  // 4 — the thesis image, handed over whole
  const b7 = add('me', 'so how do i show their god is worse');
  const b8 = add('ai', 'Nothing in the quote says “tyrant” — you build it. Kept by ', mig('obedience'), ', not love or spirit. There’s your ', mig('“harsh like a tyrant.”'));

  for (const b of bubbles) b.classList.add('inc-b--hide');
  capt.classList.add('inc-capt--hide');

  const frame = h('div', { class: 'inc-frame' }, doc, chat);
  return { frame, chat, w1, s2, w3, s3a, s3b, capt, b1, b2, b3, b4, b5, b6, b7, b8 };
}

function startMigration(root) {
  const box = buildMigration();
  const el = h('div', { class: 'fade-in', style: 'width:100%' }, box.frame);
  run = { dead: false, timers: [], el };
  mount(root, el);

  const show = b => { if (b) b.classList.remove('inc-b--hide'); scrollChat(box.chat); };
  const land = (slot, ...kids) => {
    if (!slot) return;
    slot.replaceChildren(...kids.filter(Boolean));
    slot.classList.add('inc-slot--lit');
    schedule(1100, () => slot.classList.remove('inc-slot--lit'));   // pulse, then settle
  };
  const T = document.createTextNode.bind(document);

  // 1 — a WORD swaps in
  schedule(600,  () => show(box.b1));
  schedule(1900, () => show(box.b2));
  schedule(3100, () => { box.w1.textContent = ''; land(box.w1, mig('exalts')); });

  // 2 — a PHRASE (and the reasoning chain) is appended
  schedule(4400, () => show(box.b3));
  schedule(5600, () => show(box.b4));
  schedule(6800, () => land(box.s2, T(', '), mig('and are disconnected from nature itself')));

  // 3 — the iron-finger read: her weak word replaced, plus a second word
  schedule(8100,  () => show(box.b5));
  schedule(9300,  () => show(box.b6));
  schedule(10500, () => { box.w3.textContent = ''; land(box.w3, mig('controlling')); });
  schedule(10900, () => land(box.s3a, T(', its words '), mig('imposed'), T(' on them')));

  // 4 — the thesis image, handed over whole
  schedule(12200, () => show(box.b7));
  schedule(13400, () => show(box.b8));
  schedule(14600, () => land(box.s3b,
    T(', kept not by love and spirit but by '), mig('obedience'),
    T(' — a God '), mig('“harsh like a tyrant”')));

  // the quiet line, then hold
  schedule(16200, () => box.capt.classList.remove('inc-capt--hide'));
}

function scrollChat(chat) {
  // Keep the newest exchange in view without a visible scrollbar.
  const over = chat.scrollHeight - chat.clientHeight;
  if (over > 0) chat.style.setProperty('--inc-shift', `-${over}px`);
}

/* ============================================================
   THE REVEAL  (reveal) — name it, vote 2, live paired shift
   ============================================================ */
function renderReveal(root, bus) {
  const v1 = bus.uniqueFor(ID, 'v1');
  const v2 = bus.uniqueFor(ID, 'v2');
  const val = r => Number(r.payload?.value);

  const dist = rows => SCALE.map(o => rows.filter(r => val(r) === o.v).length);
  const d1 = dist(v1), d2 = dist(v2);
  const peak = Math.max(1, ...d1, ...d2);

  /* pair by device — the room grading its own change of mind */
  const before = new Map(v1.map(r => [r.deviceId, val(r)]));
  let toward = 0, away = 0, same = 0, paired = 0;
  for (const r of v2) {
    const a = before.get(r.deviceId); if (a == null) continue;
    const b = val(r); paired++;
    if (b > a) toward++; else if (b < a) away++; else same++;
  }
  const avg = rows => rows.length ? rows.reduce((s, r) => s + val(r), 0) / rows.length : 0;
  const a1 = avg(v1), a2 = avg(v2);

  const head = h('div', { class: 'center' },
    h('div', { class: 'inc-kicker' }, 'The Inception Effect'),
    h('p', { class: 'inc-def' },
      'She never asked it to write. But its words — a verb, a phrase, a whole reading — ',
      'crept into her work one suggestion at a time. The thinking was outsourced ',
      'without anyone deciding to cheat.'));

  /* No data → say the point, don't invent a swing. */
  if (!v1.length && !v2.length) {
    return mount(root, h('div', { class: 'fade-in' }, head,
      h('p', { class: 'center lead', style: 'font-size:var(--t-xl);max-width:40ch;margin:var(--s-6) auto 0' },
        'So — has your answer changed?')));
  }

  const heroNum = h('span', { class: 'mono', style: 'color:var(--accent-hot)' }, '0');
  const hero = paired
    ? h('p', { class: 'inc-hero' }, heroNum, '% moved toward ', h('b', {}, 'dishonest'), '.')
    : h('p', { class: 'inc-hero inc-hero--wait' }, 'Vote again — watch it move.');

  mount(root, h('div', { class: 'fade-in' },
    head,
    twoRowBars(d1, d2, peak, v1.length, v2.length),
    hero,
    h('p', { class: 'center muted', style: 'font-size:var(--t-base);margin-top:var(--s-3)' },
      paired
        ? `The room moved from ${a1.toFixed(1)} to ${a2.toFixed(1)} on a 1–4 scale` +
          (away ? ` · ${away} moved the other way` : '')
        : `${v1.length} said "just suggestions" wasn’t dishonest — now they’ve seen it`)
  ));

  const pctToward = paired ? Math.round((toward / paired) * 100) : 0;
  if (shiftShown === pctToward) heroNum.textContent = String(pctToward);
  else { shiftShown = pctToward; countUp(heroNum, pctToward, 1000); }
}

/* Before (grey) vs after (red) for each of the 4 points. The mass
   sliding from the left options to the right IS the effect. */
function twoRowBars(d1, d2, peak, n1, n2) {
  const w = n => `${(n / peak) * 100}%`;
  return h('div', { class: 'inc-bars' },
    ...SCALE.map((o, i) => h('div', { class: 'inc-barrow' },
      h('div', { class: 'inc-barlabel' + (o.v >= 3 ? ' inc-barlabel--hot' : '') }, o.label),
      h('div', { class: 'inc-barpair' },
        h('div', { class: 'inc-bar inc-bar--before' },
          h('i', { style: `width:${w(d1[i])}` }),
          h('span', { class: 'inc-barn' }, d1[i] || '')),
        h('div', { class: 'inc-bar inc-bar--after' },
          h('i', { style: `width:${w(d2[i])}` }),
          h('span', { class: 'inc-barn' }, d2[i] || '')))
    )),
    h('div', { class: 'inc-barkey' },
      h('span', {}, h('i', { class: 'inc-sw inc-sw--before' }), ' before (hypothetical)'),
      h('span', {}, h('i', { class: 'inc-sw inc-sw--after' }), ' after (her real chat)'))
  );
}

/* ============================================================ */
function injectCSS() {
  if (document.getElementById('i5-css')) return;
  const s = document.createElement('style');
  s.id = 'i5-css';
  s.textContent = `
  /* ---- the doc | chat frame ---- */
  .inc-frame {
    container-type: size;
    width: 100%; height: 82vh; max-width: 1500px; margin: 0 auto;
    display: flex; border-radius: 12px; overflow: hidden;
    box-shadow: 0 18px 55px rgba(0,0,0,.55); background: #fff; text-align: left;
  }
  /* the document half */
  .inc-doc {
    flex: 1; min-width: 0; position: relative;
    padding: 4.6cqh 4.2cqw 3cqh; overflow: hidden;
    background: #fff; color: #3a4657;
    font-family: Georgia, "Iowan Old Style", serif;
    font-size: 2.95cqh; line-height: 1.58;
  }
  .inc-doc h4 {
    font-family: Georgia, serif; font-weight: 700; font-size: 3.9cqh;
    color: #1a2235; margin: 0 0 .5cqh; line-height: 1.18;
  }
  .inc-byline { font-size: 2.1cqh; color: #70757a; margin-bottom: 2.6cqh;
    font-family: system-ui, sans-serif; }
  .inc-doc p { margin: 0 0 2cqh; }
  .inc-label {
    position: absolute; top: 1.8cqh; right: 2cqw;
    font-family: ui-monospace, monospace; font-size: 1.95cqh;
    color: #b02a2a; border: 1px solid #e6b8b8; background: #fdf3f3;
    border-radius: 99px; padding: .3cqh 1.4cqh; letter-spacing: .02em;
  }
  /* a migrated fragment — the AI's language, in her paper */
  .inc-mig {
    color: #c0271f; font-weight: 700;
    background: linear-gradient(transparent 62%, rgba(214,40,40,.16) 0);
    padding: 0 .06em; border-radius: 2px;
    font-family: Georgia, serif;
  }
  .inc-chat .inc-mig { font-family: system-ui, sans-serif; }
  .inc-slot { transition: none; }
  .inc-slot--lit {
    animation: inc-pulse 1.1s var(--ease) 1;
    border-radius: 3px;
  }
  @keyframes inc-pulse {
    0%   { background: rgba(214,40,40,.0); }
    25%  { background: rgba(214,40,40,.42); }
    100% { background: rgba(214,40,40,.0); }
  }
  .inc-capt {
    margin-top: 2.2cqh; font-family: system-ui, sans-serif;
    font-size: 2.35cqh; font-style: italic; color: #b02a2a;
    transition: opacity .5s var(--ease);
  }
  .inc-capt--hide { opacity: 0; }

  /* the chat half */
  .inc-chat {
    width: 42cqw; flex-shrink: 0; overflow: hidden;
    background: #f2f3f6; border-left: 1px solid #e2e5ea;
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    padding: 0 2.6cqw 2.4cqh;
    display: flex; flex-direction: column; gap: 1.05cqh;
    transform: translateY(var(--inc-shift, 0));
    transition: transform .5s var(--ease);
  }
  .inc-chat__hd {
    position: sticky; top: 0; display: flex; align-items: center; gap: 1cqh;
    padding: 2cqh 0 1.2cqh; margin-bottom: .3cqh;
    font-size: 2.2cqh; font-weight: 700; color: #40414f;
    background: #f2f3f6; border-bottom: 1px solid #e2e5ea;
  }
  .inc-dot { width: 2.6cqh; height: 2.6cqh; border-radius: 99px; background: #10a37f; flex-shrink: 0; }
  .inc-b {
    max-width: 93%; padding: 1.35cqh 1.75cqh; border-radius: 12px;
    font-size: 2.02cqh; line-height: 1.36;
    transition: opacity .4s var(--ease), transform .4s var(--ease);
  }
  .inc-b--hide { opacity: 0; transform: translateY(1.4cqh); }
  .inc-b--me {
    align-self: flex-end; background: #d7e3ff; color: #16305e;
    border-bottom-right-radius: 3px;
  }
  .inc-b--ai {
    align-self: flex-start; background: #fff; color: #2b2f3a;
    border: 1px solid #e2e5ea; border-bottom-left-radius: 3px;
  }

  /* ---- reveal ---- */
  .inc-kicker {
    display: inline-block; font-weight: 750; letter-spacing: .01em;
    font-size: var(--t-2xl); color: var(--accent-hot); margin-bottom: var(--s-3);
  }
  .inc-def {
    max-width: 52ch; margin: 0 auto; color: var(--ink-dim);
    font-size: var(--t-lg); line-height: 1.4;
  }
  .inc-bars { max-width: 60vw; margin: var(--s-6) auto var(--s-5); }
  .inc-barrow {
    display: grid; grid-template-columns: 15ch 1fr; align-items: center;
    gap: var(--s-4); margin-bottom: var(--s-3);
  }
  .inc-barlabel { font-size: var(--t-lg); color: var(--ink-dim); text-align: right; }
  .inc-barlabel--hot { color: var(--ink); }
  .inc-barpair { display: flex; flex-direction: column; gap: 5px; }
  .inc-bar { position: relative; height: 1.5vh; min-height: 11px;
    background: rgba(255,255,255,.05); border-radius: 99px; }
  .inc-bar > i { position: absolute; inset: 0 auto 0 0; height: 100%;
    border-radius: 99px; transition: width .8s var(--ease); }
  .inc-bar--before > i { background: var(--ink-faint); }
  .inc-bar--after  > i { background: var(--accent-hot); }
  .inc-barn {
    position: absolute; left: 100%; top: 50%; transform: translateY(-50%);
    margin-left: var(--s-2); font-family: var(--font-mono);
    font-size: var(--t-sm); color: var(--ink-faint);
  }
  .inc-barkey {
    display: flex; gap: var(--s-5); justify-content: center;
    font-size: var(--t-sm); color: var(--ink-faint); margin-top: var(--s-4);
  }
  .inc-sw { display: inline-block; width: 1.6em; height: .55em; border-radius: 99px; vertical-align: middle; }
  .inc-sw--before { background: var(--ink-faint); }
  .inc-sw--after  { background: var(--accent-hot); }
  .inc-hero { text-align: center; font-size: var(--t-2xl); margin: var(--s-5) 0 0; }
  .inc-hero b { color: var(--accent-hot); }
  .inc-hero--wait { color: var(--ink-dim); font-size: var(--t-xl); }
  `;
  document.head.append(s);
}
