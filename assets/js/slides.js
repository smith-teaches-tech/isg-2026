/* ============================================================
   Slides are plain HTML fragments in /slides/.

   No <head>, no <script>, no boilerplate — just content, using
   the shared classes from base.css. That's deliberate: you can
   write and edit a slide without touching any JavaScript.

   Progressive reveal: put data-step="1", "2", "3"… on anything
   that should appear on a later click. Un-marked elements are
   visible from the start.

     <h1>What happens to student brains</h1>
     <p data-step="1">MIT Media Lab, 54 participants.</p>
     <p data-step="2">Lower connectivity in every band measured.</p>
   ============================================================ */

const cache = new Map();

export async function loadSlide(name, base = '') {
  if (!name) return '';
  if (cache.has(name)) return cache.get(name);
  try {
    const res = await fetch(`${base}slides/${name}.html`, { cache: 'no-store' });
    if (!res.ok) throw new Error(res.status);
    const html = await res.text();
    cache.set(name, html);
    return html;
  } catch {
    cache.set(name, '');
    return '';
  }
}

/* How many clicks this slide is worth. */
export function stepCount(container) {
  let max = 0;
  for (const el of container.querySelectorAll('[data-step]')) {
    max = Math.max(max, Number(el.dataset.step) || 0);
  }
  return max;
}

/* Show everything up to `step`; hide the rest.

   data-step="N"  — appears on the Nth click
   data-until="N" — DISAPPEARS after the Nth click

   data-until exists because hidden elements stay in the layout (so
   nothing jumps as beats land), which is fine for a few lines of text
   and impossible for a slide carrying two full-size panels — they
   simply won't both fit on screen. Pair it with .stack to have beats
   swap in the same space instead of piling up. */
export function applySteps(container, step) {
  for (const el of container.querySelectorAll('[data-step],[data-until]')) {
    const n = Number(el.dataset.step) || 0;
    const until = el.dataset.until === undefined ? Infinity : Number(el.dataset.until);
    const on = n <= step && step <= until;
    el.style.transition = 'opacity .45s var(--ease), transform .45s var(--ease)';
    el.style.opacity    = on ? '1' : '0';
    el.style.transform  = on ? 'none' : 'translateY(10px)';
    el.style.pointerEvents = on ? '' : 'none';
    /* Kept in the layout while hidden, so nothing jumps as beats land. */
    el.setAttribute('aria-hidden', on ? 'false' : 'true');
  }
}

/* ---------- echoing earlier answers -------------------------
   Lets a static slide quote what the room already said. Segment 3
   opens by pointing at the people in segment 2 who wrote "revision
   history" — in their own words, which is far stronger than
   paraphrasing them.

     <div data-echo="i1-slop-wall"
          data-echo-match="revision|version history"
          data-echo-max="4"></div>

   `data-echo-match` is a case-insensitive regex against the answer
   text. No matches means the container simply stays empty and the
   slide reads fine without it — there is no failure state, because
   there is no guarantee anyone will say it.

   Anything marked data-echo-if-empty shows ONLY when nothing matched,
   so the slide can carry a fallback line. */
export function fillEchoes(container, rowsFor) {
  for (const box of container.querySelectorAll('[data-echo]')) {
    const rows  = rowsFor(box.dataset.echo) || [];
    const max   = Number(box.dataset.echoMax) || 4;
    let   re    = null;
    try { re = box.dataset.echoMatch ? new RegExp(box.dataset.echoMatch, 'i') : null; }
    catch { re = null; }

    const hits = [];
    const seen = new Set();
    for (const r of rows) {
      const text = String(r.payload?.text || '').trim();
      if (!text || seen.has(text)) continue;
      if (re && !re.test(text)) continue;
      seen.add(text);
      hits.push({ text, name: String(r.name || '').trim() });
      if (hits.length >= max) break;
    }

    box.innerHTML = hits.map(hZ =>
      `<blockquote class="echo">${esc_(hZ.text)}` +
      (hZ.name ? `<cite>— ${esc_(hZ.name)}</cite>` : '') +
      `</blockquote>`).join('');

    for (const alt of container.querySelectorAll('[data-echo-if-empty]')) {
      alt.style.display = hits.length ? 'none' : '';
    }
  }
}

const esc_ = s => String(s).replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* Fallback when a slide file doesn't exist yet — shows the segment
   title so you can rehearse the running order before writing content. */
export function placeholder(seg) {
  return `
    <div class="center" style="opacity:.55">
      <div class="pill">segment ${seg.n}</div>
      <h1 style="margin-top:var(--s-5)">${seg.title}</h1>
      <p class="faint mono">slides/${seg.slide}.html — not written yet</p>
    </div>`;
}
