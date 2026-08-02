/* ============================================================
   THE FORWARD BUTTON.

   The whole 75 minutes is one linear track. A presentation
   clicker only sends "next" and "back", so everything —
   slide beats, opening a vote, locking it, revealing it,
   moving on — has to sit on that single axis.

   advance() decides what "next" means from wherever you are:

     slide beat 1 → beat 2 → beat 3
       → (segment has an interaction?) open it
       → lock it → reveal it
       → next segment

   Segments with no interaction just run out of beats and move on.
   ============================================================ */

export function segmentAt(session, n) {
  return session.segments.find(s => s.n === n) || null;
}

function nextN(session, n) {
  const list = session.segments.map(s => s.n).sort((a, b) => a - b);
  return list.find(x => x > n) ?? n;
}

function prevN(session, n) {
  const list = session.segments.map(s => s.n).sort((a, b) => a - b);
  return [...list].reverse().find(x => x < n) ?? 0;
}

/* `steps` = how many data-step elements the current slide has. */
export function advance(session, state, steps = 0) {
  const { segment, step, phase } = state;

  if (segment === 0) return { segment: 1, step: 0, phase: 'idle' };

  const seg = segmentAt(session, segment);

  if (phase === 'idle') {
    if (step < steps) return { segment, step: step + 1, phase: 'idle' };
    if (seg && seg.activity) return { segment, step, phase: 'input' };
    return { segment: nextN(session, segment), step: 0, phase: 'idle' };
  }

  if (phase === 'input')  return { segment, step, phase: 'locked' };
  if (phase === 'locked') return { segment, step, phase: 'reveal' };

  return { segment: nextN(session, segment), step: 0, phase: 'idle' };
}

export function back(session, state, steps = 0) {
  const { segment, step, phase } = state;

  if (phase === 'reveal') return { segment, step, phase: 'locked' };
  if (phase === 'locked') return { segment, step, phase: 'input' };
  if (phase === 'input')  return { segment, step, phase: 'idle' };

  if (step > 0) return { segment, step: step - 1, phase: 'idle' };

  /* Stepping back into the previous segment lands at its end,
     not its start — otherwise one mis-click costs you the whole beat. */
  const p = prevN(session, segment);
  const prevSeg = segmentAt(session, p);
  return {
    segment: p,
    step: 99,                                   // clamped by the slide loader
    phase: prevSeg && prevSeg.activity ? 'reveal' : 'idle'
  };
}

/* ---------- chapter skip ------------------------------------
   For the on-screen buttons, not the clicker. Deliberately NOT the
   same as back(): back() walks beat by beat, this jumps whole
   segments.

   First press goes to the START OF THE CURRENT segment — which is
   almost always what you want when something has gone wrong and you
   need to run that bit again. Press it a second time (you're already
   at the start) and it goes to the previous segment. Same behaviour
   as skip-back on any music player. */
export function sectionBack(session, state) {
  const atStart = state.step === 0 && state.phase === 'idle';
  const n = atStart ? prevN(session, state.segment) : state.segment;
  return { segment: n, step: 0, phase: 'idle' };
}

export function sectionForward(session, state) {
  return { segment: nextN(session, state.segment), step: 0, phase: 'idle' };
}
