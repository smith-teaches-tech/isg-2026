/* ============================================================
   ISG Learns 2026 — site configuration
   This file is PUBLIC. Never put anything secret here.
   ============================================================ */

window.ISG_CONFIG = {

  // Apps Script Web App /exec URL. Deployed 2026-08-02 from the ISG
  // account against the responses Sheet in ISG Learns Presentations.
  //
  // Set this back to "PASTE_..." (or flip forceOffline) to return the
  // whole site to OFFLINE MODE, which is also the dead-wifi fallback.
  //
  // Re-deploying after editing Code.gs: Deploy > Manage deployments >
  // edit > Version: New version. The /exec URL does not change, so this
  // line stays correct.
  endpoint: "https://script.google.com/macros/s/AKfycbwDvWwstt9dAXa5myUNxqLXmEWdQEF2oRcwaQ5bshhUlPxHCGsY39Bp-ihoyUuIfIw/exec",

  // Room code. The Apps Script rejects any write that doesn't match.
  // Change it the morning of the session; costs nothing, stops drive-by spam.
  room: "isg26",

  // Presenter control page requires ?key=<this> in the URL.
  // Not real security — just stops an audience member wandering into it.
  presenterKey: "backstage",

  // How often the BIG SCREEN asks the sheet for news, in ms.
  // This one must feel live. Don't go below 1000.
  pollMs: 1500,

  // How often an AUDIENCE DEVICE asks. Deliberately slower: a phone
  // finding out 4 seconds late is invisible, and audience polling is
  // the only thing here that scales with headcount. Both are jittered
  // ±20% so devices don't synchronise into spikes.
  pollMsAudience: 4000,

  // Force offline mode even if an endpoint is set (dry runs, dead wifi).
  forceOffline: false,

  // Shown in the corner of every screen. Set once you've made the TinyURL.
  shortUrl: "tinyurl.com/isg-write"
};
