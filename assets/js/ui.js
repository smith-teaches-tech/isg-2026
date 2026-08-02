/* Tiny DOM helpers. Deliberately not a framework — every activity
   is a single file you can read top to bottom a year from now. */

export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

export function mount(root, ...nodes) {
  root.replaceChildren(...nodes.flat().filter(Boolean));
  return root;
}

export const esc = s => String(s ?? '').replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* Count responses into { value: n }, preserving a given key order. */
export function tally(rows, key, order = null) {
  const counts = new Map((order || []).map(k => [k, 0]));
  for (const r of rows) {
    const v = r.payload?.[key];
    if (v == null) continue;
    counts.set(v, (counts.get(v) || 0) + 1);
  }
  return counts;
}

export const pct = (n, total) => total ? Math.round((n / total) * 100) : 0;

/* Animate a number up — used for reveals. */
export function countUp(el, to, ms = 900, suffix = '') {
  const from = 0, t0 = performance.now();
  const step = now => {
    const p = Math.min(1, (now - t0) / ms);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(from + (to - from) * eased) + suffix;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* Persistent short-URL corner mark + offline badge. */
export function chrome(root) {
  const cfg = window.ISG_CONFIG;
  root.append(h('div', { class: 'urlmark' }, cfg.shortUrl));
  return root;
}

/* QR + typed URL, top-right of the big screen, on every slide.
   Large while the room is arriving, then shrinks — latecomers can
   still scan at minute 40. Both routes shown because a laptop is a
   better device than a phone for the two typing activities. */
export function joinBadge() {
  const cfg = window.ISG_CONFIG;
  const box = h('div', { class: 'joinbadge', id: 'joinbadge' },
    h('img', { src: '../assets/img/ui/qr.svg', alt: 'Join', class: 'joinbadge__qr' }),
    h('div', { class: 'joinbadge__url mono' }, cfg.shortUrl),
    h('div', { class: 'joinbadge__hint' }, 'scan, or type it on your laptop')
  );
  document.body.append(box);
  return box;
}

/* size: 'big' while arriving, 'small' once the room is in. */
export function setJoinSize(size) {
  const el = document.getElementById('joinbadge');
  if (el) el.dataset.size = size;
}

export function offlineBadge() {
  document.body.append(h('div', { class: 'offline-flag' }, 'offline'));
}
