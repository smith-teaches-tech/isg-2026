/* ============================================================
   ISG Learns 2026 — Sheet endpoint

   ONE generic schema serves all nine activities. Adding an
   activity never means editing this file: whatever the activity
   sends lands in the `payload` column as JSON.

   Sheet tabs (created automatically on first run):
     responses : ts | activity | slot | deviceId | name | payload
     control   : key | value          (the presenter's state)

   Deploy: Extensions ▸ Apps Script ▸ paste this ▸ Deploy ▸
   New deployment ▸ Web app ▸ Execute as: Me ▸
   Who has access: Anyone ▸ copy the /exec URL into config.js.
   ============================================================ */

var ROOM = 'isg26';            // must match config.js
var PRESENTER_KEY = 'backstage'; // must match config.js

// ---------- storage helpers ----------------------------------

function sheet_(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.setFrozenRows(1);
  }
  return sh;
}

function responses_() { return sheet_('responses', ['ts','activity','slot','deviceId','name','payload']); }
function control_()   { return sheet_('control',   ['key','value']); }

/* `name` is the only free-text field written to a cell unquoted, so a
   teacher typing "=)" would store a FORMULA and the wall would show
   #NAME? as the attribution. payload is always JSON starting with { */
function safeName_(v) {
  v = String(v == null ? '' : v);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getState_() {
  var rows = control_().getDataRange().getValues();
  var s = { segment: 0, step: 0, phase: 'idle', seq: 0 };
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === 'segment') s.segment = Number(rows[i][1]) || 0;
    if (rows[i][0] === 'step')    s.step    = Number(rows[i][1]) || 0;
    if (rows[i][0] === 'phase')   s.phase   = rows[i][1] || 'idle';
    if (rows[i][0] === 'seq')     s.seq     = Number(rows[i][1]) || 0;
  }
  return s;
}

function setKey_(key, value) {
  var sh = control_();
  var rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === key) { sh.getRange(i + 1, 2).setValue(value); return; }
  }
  sh.appendRow([key, value]);
}

// ---------- read ---------------------------------------------

function doGet(e) {
  var p = e.parameter || {};
  if (p.room !== ROOM) return json_({ ok: false, error: 'room' });

  var sh = responses_();
  var last = sh.getLastRow();          // includes header
  var rows = Math.max(0, last - 1);    // data rows, excluding the header
  var cursor = Math.max(0, Number(p.cursor) || 0);
  var out = [];

  /* THE SHEET CAN SHRINK. `clear` deletes rows, so a client that was
     already polling holds a cursor above the new row count and would
     never satisfy the test below again — it goes permanently blind
     while still displaying the rows it cached. That is exactly what
     happens when you clear your own test answers with the projector
     already showing the wall. Reset such a client to the top and let
     it rebuild from scratch. */
  if (cursor > rows) cursor = 0;

  if (rows > cursor) {
    var vals = sh.getRange(cursor + 2, 1, rows - cursor, 6).getValues();
    for (var i = 0; i < vals.length; i++) {
      out.push({
        ts: vals[i][0], activity: vals[i][1], slot: vals[i][2],
        deviceId: vals[i][3], name: vals[i][4], payload: vals[i][5]
      });
    }
  }

  return json_({ ok: true, rows: out, cursor: rows, state: getState_() });
}

// ---------- write --------------------------------------------

function doPost(e) {
  var body;
  try { body = JSON.parse(e.postData.contents); }
  catch (err) { return json_({ ok: false, error: 'bad json' }); }

  if (body.room !== ROOM) return json_({ ok: false, error: 'room' });

  /* waitLock THROWS on timeout. Outside the try that becomes an HTML
     error page, which the client's res.json() chokes on. Inside it,
     the client gets clean JSON, marks the submit failed, and the
     retry queue picks it up on the next poll. */
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);              // survives the burst when everyone answers at once
    var sh = responses_();

    switch (body.action) {

      case 'submit':
        sh.appendRow([body.ts, body.activity, body.slot || 'a',
                      body.deviceId, safeName_(body.name), body.payload]);
        return json_({ ok: true });

      /* Client retry queue — several held-back votes at once. */
      case 'submitBatch': {
        var rows = (body.rows || []).map(function (r) {
          return [r.ts, r.activity, r.slot || 'a', r.deviceId, safeName_(r.name), r.payload];
        });
        if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, 6).setValues(rows);
        return json_({ ok: true, n: rows.length });
      }

      /* --- presenter-only below --- */

      case 'setState':
        if (body.key !== PRESENTER_KEY) return json_({ ok: false, error: 'key' });
        if (body.segment !== undefined) setKey_('segment', body.segment);
        if (body.step !== undefined)    setKey_('step', body.step);
        if (body.phase !== undefined)   setKey_('phase', body.phase);
        setKey_('seq', (getState_().seq || 0) + 1);
        return json_({ ok: true, state: getState_() });

      case 'clear': {
        if (body.key !== PRESENTER_KEY) return json_({ ok: false, error: 'key' });
        var vals = sh.getDataRange().getValues();
        for (var i = vals.length - 1; i >= 1; i--) {
          if (vals[i][1] === body.activity) sh.deleteRow(i + 1);
        }
        return json_({ ok: true });
      }
    }
    return json_({ ok: false, error: 'unknown action' });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}
