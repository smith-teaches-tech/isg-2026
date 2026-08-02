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

/* Show everything up to `step`; hide the rest. */
export function applySteps(container, step) {
  for (const el of container.querySelectorAll('[data-step]')) {
    const n = Number(el.dataset.step) || 0;
    const on = n <= step;
    el.style.transition = 'opacity .45s var(--ease), transform .45s var(--ease)';
    el.style.opacity    = on ? '1' : '0';
    el.style.transform  = on ? 'none' : 'translateY(10px)';
    el.style.pointerEvents = on ? '' : 'none';
    /* Kept in the layout while hidden, so nothing jumps as beats land. */
    el.setAttribute('aria-hidden', on ? 'false' : 'true');
  }
}

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
