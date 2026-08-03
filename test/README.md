# Regression harness

Drives the real `/screen/` page in a real browser against a fake endpoint
with controllable latency and packet loss. Run it after ANY change to
`assets/js/`, `screen/index.html`, or an activity.

```
cd test && npm i playwright && node regress.mjs
```

It caught a fatal temporal-dead-zone error within a minute of that error
being written, which is the entire argument for having it.

## What it covers

| # | Check |
|---|---|
| T1a | A clicker's duplicate keydown (~60ms) is swallowed |
| T1b | Two real presses (~260ms apart) both land |
| T2 | A press before the first poll does not throw the room back to segment 1 |
| T3 | `clear` empties a screen that is already showing rows |
| T4 | A re-queued submit that actually landed renders once, not twice |
| T5 | The empty-wall placeholder never stacks |
| T6 | Forward past the closing reveal does not restart segment 22 |
| T7 | Back into the autotyper resumes rather than replaying 30 seconds |
| T8 | A dropped press does not clobber a later one that succeeded |
| T9 | Full 22-segment walk: nothing clipped off screen |
| T9b | Walking all the way back reaches the title card |
| T10 | No uncaught page errors anywhere in the walk |

## Known harness artefacts, not app bugs

Presses spaced closer than the deliberate **180ms** clicker debounce are
swallowed by design. Any test that presses faster than that will "fail"
and the harness is wrong, not the app — T1a exists to pin that behaviour
down deliberately.

## Still to nail down

T3, T4 and T6 currently fail in a way that has NOT been traced to the app
or to the harness. They share a symptom — the screen not following a
state forced directly into the fake sheet — which points at the harness's
`force()` helper rather than at the page, but that is unproven. **Do not
treat these three as verified until someone has actually chased them.**
