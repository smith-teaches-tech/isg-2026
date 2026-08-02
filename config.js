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

  // How often audience + screen ask the sheet for news, in ms.
  // 1500 feels live. Don't go below 1000 — Apps Script quota.
  pollMs: 1500,

  // Force offline mode even if an endpoint is set (dry runs, dead wifi).
  forceOffline: false,

  // Shown in the corner of every screen. Set once you've made the TinyURL.
  shortUrl: "tinyurl.com/isg-write"
};
