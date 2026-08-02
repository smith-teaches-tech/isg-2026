/* ============================================================
   I-1 · ANTI-SLOP WALL  (segment 2, ~2.5 min)

   "How do you protect from AI slop in your classroom?"

   A warm-up and a temperature read. No tally, no right answer,
   no punchline. Answers land on the wall as they arrive; you
   read two or three out and ask whether the writer wants to
   elaborate. If nobody volunteers, move on.

   Reveal: LIVE. The wall draws during 'input' and never goes
   away, so 'locked' and 'reveal' look almost identical — that
   is deliberate. Over-clicking past this segment costs nothing.

   THE NAME MATTERS HERE. It is the only reason it is collected:
   so you know who to invite to say more. Named answers are
   marked in warm accent so your eye finds them from the stage.

   The wall renders INCREMENTALLY. New answers are appended to a
   cached element rather than redrawn, so a tile that has already
   landed never re-animates when the next one arrives.
   ============================================================ */

import { h, mount } from '../../assets/js/ui.js';

const QUESTION = 'How do you protect from AI slop in your classroom?';
const MAXLEN   = 200;

/* ---------- the squeeze -------------------------------------
   As the wall fills it gets denser: more columns, smaller type.
   Driven by total character load, not answer count — twelve long
   answers crowd the screen as much as twenty-five short ones.
   The +50 is per-tile chrome (padding, border, gap).

   Tuned so ~26 typical answers land on 3 columns and very nearly
   fill the height. Loosen the tiers and the wall looks thin;
   tighten them and long answers clip.                         */
function fit(load) {
  if (load <=  350) return { cols: 2, scale: 1.25 };
  if (load <=  900) return { cols: 2, scale: 1.10 };
  if (load <= 1800) return { cols: 3, scale: 1.05 };
  if (load <= 3200) return { cols: 3, scale: 0.92 };
  if (load <= 4400) return { cols: 4, scale: 0.88 };
  if (load <= 5800) return { cols: 4, scale: 0.80 };
  if (load <= 7200) return { cols: 5, scale: 0.72 };
  return { cols: 5, scale: Math.max(0.50, 0.72 - (load - 7200) / 34000) };
}

const clean = s => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, MAXLEN);

/* ---------- incremental wall state --------------------------
   The screen page hands render() a fresh root every time, so a
   naive mount() would rebuild all 30 tiles on every new answer
   and replay every landing animation. Instead the wall element
   lives here, gets re-parented into each new root, and only
   grows. `drawn` is how many rows are already on it.          */
let wallEl = null;
let drawn  = 0;
let load   = 0;

function resetWall() { wallEl = null; drawn = 0; load = 0; }

export default {

  id: 'i1-slop-wall',

  /* ---------- PHONE ---------------------------------------- */
  phone: {
    render({ root, phase, device, mine, submit }) {

      const already = mine();

      if (already) return mount(root, sent(already.text, device.name));

      if (phase !== 'input') {
        return mount(root, h('div', { class: 'state-msg' },
          h('div', { class: 'pill' }, phase === 'idle' ? 'stand by' : 'answers closed'),
          phase !== 'idle' && h('p', { class: 'faint' }, 'Look up.')));
      }

      const counter = h('span', { class: 'mono faint', style: 'font-size:var(--t-xs)' },
        MAXLEN + ' left');

      const box = h('textarea', {
        class: 'input', maxlength: String(MAXLEN), rows: '4',
        placeholder: 'Whatever you actually do…',
        style: 'min-height:6.5rem',
        oninput: e => {
          const left = MAXLEN - e.target.value.length;
          counter.textContent = left + ' left';
          counter.style.color = left <= 20 ? 'var(--accent-warm)' : '';
          send.disabled = !e.target.value.trim();
        }
      });

      const nameBox = h('input', {
        class: 'input', type: 'text', value: device.name,
        placeholder: 'optional',
        onchange: e => { device.name = e.target.value; }
      });

      const send = h('button', {
        class: 'btn btn--primary', disabled: true,
        onclick: async e => {
          const text = clean(box.value);
          if (!text) return;
          e.target.disabled = true;
          e.target.textContent = 'sending…';
          device.name = nameBox.value;          // capture it BEFORE the row is written
          await submit({ text });
          mount(root, sent(text, device.name));
        }
      }, 'Put it on the wall');

      mount(root,
        h('h2', {}, QUESTION),
        h('div', { class: 'card' },
          box,
          h('div', { style: 'display:flex;justify-content:flex-end;margin-top:var(--s-2)' }, counter)),
        h('div', { class: 'field' },
          h('label', {}, 'Name (optional — so I can ask you to say more)'),
          nameBox),
        send
      );
    }
  },

  /* ---------- SCREEN --------------------------------------- */
  screen: {
    render({ root, phase, rows }) {

      injectCSS();

      if (phase === 'idle') {
        resetWall();
        return mount(root, h('div', { class: 'center' },
          h('h1', {}, QUESTION),
          h('p', { class: 'muted' }, 'answers appear here as you send them')));
      }

      /* Cleared, or we came back round. Start the wall over. */
      if (rows.length < drawn) resetWall();

      if (!wallEl) wallEl = h('div', { class: 'i1-wall' });

      mount(root, h('div', { class: 'i1-stage' },
        /* Count sits immediately after the question, on the LEFT.
           Right-aligned it collides with the join badge. */
        h('div', { class: 'i1-head' },
          h('h2', { class: 'i1-q' }, QUESTION),
          h('span', { class: 'i1-count mono' },
            rows.length + (phase === 'input' ? '' : ' · closed'))),
        h('div', { class: 'i1-wallbox' }, wallEl)
      ));

      /* Append only what is new — everything already up stays put. */
      for (let i = drawn; i < rows.length; i++) {
        const r    = rows[i];
        const text = clean(r.payload?.text);
        if (!text) continue;
        const name = String(r.name || '').trim();
        load += text.length + 50;
        wallEl.append(h('div', { class: 'i1-tile' + (name ? ' i1-tile--named' : '') },
          h('span', {}, text),
          name && h('span', { class: 'i1-tile__name' }, '— ' + name)));
      }
      drawn = rows.length;

      const f = fit(load);
      wallEl.style.setProperty('--i1-cols', f.cols);
      wallEl.style.setProperty('--i1-scale', f.scale);
      safetyFit(wallEl);

      if (!rows.length) wallEl.append(h('div', { class: 'i1-empty faint' }, 'waiting for the first one…'));
      else wallEl.querySelector('.i1-empty')?.remove();
    }
  }
};

/* ---------- the safety net ----------------------------------
   fit() is tuned for answers of a typical length, and the real
   room will not oblige. If the wall overflows, multicol pushes
   the excess into extra columns off the right edge — so the tell
   is scrollWidth, not scrollHeight — and we shrink until it fits.

   Runs a second AFTER the render, so the tier's font-size
   transition has finished: measuring mid-transition reads the old
   size and never converges. The correction itself is deliberately
   not transitioned, for the same reason.

   Verified at the worst case this can face: 32 answers of the
   full 200 characters comes out at 5 columns, nothing clipped.  */
let fitTimer = null;

function safetyFit(w) {
  clearTimeout(fitTimer);
  fitTimer = setTimeout(() => {
    if (!w.isConnected) return;

    const over = () => w.scrollWidth > w.clientWidth + 2;
    const set  = (k, v) => { w.style.setProperty(k, v); void w.offsetWidth; };

    w.classList.add('i1-nofx');

    /* ADD A COLUMN BEFORE SHRINKING THE TYPE. This order matters more
       than it looks. On a 1280x720 projector, 26 answers on the three
       columns fit() picked were being crushed to 9px — unreadable from
       the third row — when five columns would have held them at normal
       size. Reflowing is free; shrinking costs legibility, so it is
       the last resort.

       Columns are capped at whatever leaves ~220px each: past that the
       lines get so short the text turns to confetti. */
    const maxCols = Math.max(2, Math.min(6, Math.floor(w.clientWidth / 220)));
    let cols  = Number(w.style.getPropertyValue('--i1-cols')) || 2;
    let scale = parseFloat(w.style.getPropertyValue('--i1-scale')) || 1;

    let guard = 0;
    while (over() && cols < maxCols && guard++ < 8) set('--i1-cols', ++cols);
    guard = 0;
    while (over() && scale > 0.45 && guard++ < 14) {
      scale = Math.round((scale - 0.04) * 100) / 100;
      set('--i1-scale', scale);
    }

    w.classList.remove('i1-nofx');
  }, 1000);
}

/* The audience's own answer, echoed back. Reassures them it landed
   and — if they gave a name — warns them they might be called on. */
function sent(text, name) {
  return h('div', { class: 'state-msg fade-in' },
    h('p', { class: 'muted' }, 'On the wall:'),
    h('p', { class: 'read', style: 'font-size:var(--t-lg);color:var(--ink)' }, '“' + text + '”'),
    h('p', { class: 'faint' }, name
      ? 'If I read yours out, be ready to say a bit more.'
      : 'Look up.'));
}

/* ---------- styles ------------------------------------------
   Kept in the activity so the whole thing is one readable file.
   Injected once; the module is cached, so this runs a single
   time per page.                                              */
function injectCSS() {
  if (document.getElementById('i1-css')) return;
  const s = document.createElement('style');
  s.id = 'i1-css';
  s.textContent = `
  /* Fixed-height stage: the question stays put at the top while
     the wall grows, instead of drifting up with every answer. */
  /* 72vh, not more: the join badge parks bottom-right during an
     interaction and the last column was running underneath it. */
  .i1-stage { width: 100%; height: 72vh; display: flex; flex-direction: column; }
  .i1-head  { flex: none; display: flex; align-items: baseline; gap: var(--s-4); margin-bottom: var(--s-4); }
  .i1-q     { color: var(--ink-dim); margin: 0; }
  .i1-count { color: var(--ink-faint); font-size: var(--t-base); white-space: nowrap; }

  /* Wall is vertically centred in the space left over, so three
     answers look deliberate instead of stranded at the top. */
  .i1-wallbox { flex: 1; display: flex; align-items: center; overflow: hidden; min-height: 0; }

  .i1-wall {
    width: 100%;
    max-height: 100%;
    column-count: var(--i1-cols, 2);
    column-gap: var(--s-4);
    font-size: calc(var(--t-base) * var(--i1-scale, 1));
    transition: font-size .9s var(--ease);
  }
  .i1-tile {
    break-inside: avoid; -webkit-column-break-inside: avoid;
    background: var(--bg-raised);
    border: 1px solid var(--line);
    border-left: 3px solid var(--accent);
    border-radius: var(--radius-sm);
    padding: calc(var(--s-3) * var(--i1-scale, 1)) calc(var(--s-4) * var(--i1-scale, 1));
    margin-bottom: var(--s-3);
    line-height: 1.35;
    animation: i1-land .55s var(--ease) both;
  }
  /* Named answers are the ones you can call on. Find them fast. */
  .i1-tile--named { border-left-color: var(--accent-warm); }
  .i1-tile__name {
    display: block; margin-top: var(--s-2);
    font-family: var(--font-mono); font-size: .72em;
    color: var(--accent-warm);
  }
  .i1-empty { text-align: center; width: 100%; }
  .i1-nofx  { transition: none !important; }
  @keyframes i1-land { from { opacity: 0; transform: translateY(12px) scale(.97); } }
  `;
  document.head.append(s);
}
