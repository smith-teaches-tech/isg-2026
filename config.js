/* ============================================================
   ISG Learns 2026 — site configuration
   This file is PUBLIC. Never put anything secret here.
   ============================================================ */

window.ISG_CONFIG = {

  // Paste the Apps Script Web App /exec URL here after deploying.
  // While this is left as-is, the whole site runs in OFFLINE MODE:
  // nothing is sent anywhere and fallback data is used. Good for building.
  endpoint: "PASTE_APPS_SCRIPT_EXEC_URL_HERE",

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
