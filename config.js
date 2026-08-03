/* ============================================================
   ISG Learns 2026 — site configuration
   This file is PUBLIC. Never put anything secret here.
   (A Supabase anon/publishable key is designed to be public.)
   ============================================================ */

window.ISG_CONFIG = {

  // Supabase backend (project: papertrail-write, org: PaperTrail Academic).
  // Swapped in for the Apps Script Web App on 2026-08-03 — the Sheet
  // endpoint was too slow/flaky for the room to follow the presenter.
  // Data lives in two isolated tables: isg_responses, isg_control.
  // To return the site to OFFLINE build mode, flip forceOffline:true.
  supabaseUrl: "https://iiviamoigtubkebreolx.supabase.co",
  supabaseKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpdmlhbW9pZ3R1YmtlYnJlb2x4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MjAyMzUsImV4cCI6MjA4OTM5NjIzNX0.DZd3x3jCr5qVt9NJIy3ZnvERnxWtWifcn_mzJhgVLtY",

  // Room code — scopes rows + control state so test and real can coexist.
  // Change it the morning of the session; costs nothing, stops drive-by spam.
  room: "isg26",

  // Presenter control page requires ?key=<this> in the URL.
  // Not real security — just stops an audience member wandering into it.
  presenterKey: "backstage",

  // Poll cadence (ms). Supabase REST is fast + high-concurrency, so these
  // can be snappy. Both jittered ±20% so devices don't synchronise.
  pollMs: 900,          // big screen — must feel live
  pollMsAudience: 1300, // audience phones — a touch slower, scales with headcount

  // Force offline (localStorage) build mode even with creds set.
  forceOffline: false,

  shortUrl: "tinyurl.com/isg-write"
};
