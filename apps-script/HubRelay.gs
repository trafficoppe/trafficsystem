/**
 * HubRelay.gs — ตัวกลางอ่าน “Sheet ส่วนตัว” และ “ภาพส่วนตัว” ให้ระบบภายใน mu-traffic-hub (รอบ 10)
 *
 * ทำไมต้องมี: Sheet ทะเบียนนักศึกษา–รถจักรยานยนต์, แบบสำรวจเรือนไทย และภาพประกอบรายงาน GPS งานปริญญา เป็นไฟล์ส่วนตัวของเจ้าของ
 *   บริการบน Cloudflare อ่านเองไม่ได้ (และห้ามเปลี่ยนการแชร์เป็นสาธารณะ) จึงให้สคริปต์นี้ซึ่งรันด้วยบัญชีเจ้าของไฟล์อ่านแทน
 * ขอบเขต (ตายตัวในไฟล์นี้ — แก้ไม่ได้จากภายนอก):
 *   - อ่านอย่างเดียว ไม่เขียน/ไม่แก้ Sheet ไม่เปลี่ยนการแชร์ไฟล์
 *   - ตารางอ่านได้เฉพาะ Spreadsheet/แท็บ/คอลัมน์ในรายการ RELAY_TABLES · คอลัมน์ข้อมูลส่วนบุคคล (ทะเบียนรถ) ส่งเฉพาะ “มี/ไม่มีค่า”
 *   - ภาพอ่านได้เฉพาะไฟล์ภาพที่อยู่ใต้โฟลเดอร์ใน RELAY_IMAGE_ROOTS เท่านั้น
 *   - ทุกคำขอต้องมีค่าลับร่วม (เก็บใน Script Properties → RELAY_SECRET) — ค่าลับได้มาจากการลงทะเบียนครั้งเดียวด้วย setup()
 * วิธีติดตั้ง: ดู docs/ส่งมอบรอบ10.md หัวข้อ “เปิดตัวกลางอ่านข้อมูลส่วนตัว”
 */
var RELAY_HUB = 'https://mu-traffic-hub.pages.dev';
var RELAY_ENROLL_TOKEN = '__ENROLL_TOKEN__';          // token ใช้ครั้งเดียว (หมดอายุภายใน 7 วัน) — หลัง setup() สำเร็จ ค่านี้ใช้ซ้ำไม่ได้แล้ว
var RELAY_TABLES = {
  studentMoto: { id: '1v0LYqEkWIb3MaNKqp1T50tBlDmYn7UP8xl36cPlpllQ', tab: 'Registrations_Motorcycle',
    cols: ['Timestamp', 'RefCode', 'วิทยาเขต', 'คณะ/สถาบัน/ส่วนงาน', 'ประเภทนักศึกษา', 'ระดับการศึกษา', 'ประเภทเครื่องยนต์', 'จำนวนรถ'], present: ['รถ1_ทะเบียน', 'รถ2_ทะเบียน', 'รถ3_ทะเบียน'] },
  ruenthai: { id: '1CcOw6B9ajfga0TptvO15XnwIfC9IrW1Oh2kR1doAHZA', tab: 'RuenThai_Survey',
    cols: ['Timestamp', 'Ref_Code', 'Group_Type', 'Group_Label', 'User_SubType', 'Faculty_Dept', 'Sub_Unit_Project', 'Car_Count', 'Car1_Type', 'Car2_Type', 'LPR_Status'], present: ['Car1_Plate', 'Car2_Plate'] }
};
var RELAY_IMAGE_ROOTS = ['1zLhp_JAQRLyL5hCtZHaxZu-24djV4PeH'];   // โฟลเดอร์ SecurityGuardReports (ภาพประกอบรายงาน รปภ. GPS งานปริญญา)
var RELAY_WIDTHS = [400, 800, 1600];

function doGet() { return relayOut_({ ok: false, code: 'method' }); }
function doPost(e) {
  var body; try { body = JSON.parse((e && e.postData && e.postData.contents) || ''); } catch (err) { return relayOut_({ ok: false, code: 'bad-body' }); }
  var secret = PropertiesService.getScriptProperties().getProperty('RELAY_SECRET') || '';
  if (secret.length < 32 || !relayEq_(String(body.secret || ''), secret)) return relayOut_({ ok: false, code: 'forbidden' });
  try {
    if (body.action === 'ping') return relayOut_({ ok: true });
    if (body.action === 'table') return relayOut_(relayTable_(String(body.source || ''), body.cols, body.present));
    if (body.action === 'img') return relayOut_(relayImg_(String(body.id || ''), Number(body.w) || 400));
    return relayOut_({ ok: false, code: 'unknown-action' });
  } catch (err) { return relayOut_({ ok: false, code: 'internal' }); }          // ไม่ส่งข้อความผิดพลาดภายในออกไป
}
function relayOut_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function relayEq_(a, b) {
  var x = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, a), y = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, b), d = 0;
  for (var i = 0; i < x.length; i++) d |= x[i] ^ y[i];
  return d === 0 && a.length === b.length;
}
function relayTable_(source, cols, present) {
  var T = RELAY_TABLES[source]; if (!T) return { ok: false, code: 'unknown-source' };
  var want = (Array.isArray(cols) ? cols : T.cols).filter(function (c) { return T.cols.indexOf(c) >= 0; });
  var pres = (Array.isArray(present) ? present : T.present).filter(function (c) { return T.present.indexOf(c) >= 0; });
  var sh = SpreadsheetApp.openById(T.id).getSheetByName(T.tab); if (!sh) return { ok: false, code: 'schema' };
  var v = sh.getDataRange().getDisplayValues(), head = v[0].map(function (h) { return String(h).trim(); });
  var ix = want.concat(pres).map(function (c) { return head.indexOf(c); });
  if (ix.some(function (i) { return i < 0; })) return { ok: false, code: 'schema' };
  var rows = [want.concat(pres)];
  for (var r = 1; r < v.length; r++) {
    var row = v[r]; if (!row.join('').trim()) continue;
    rows.push(ix.map(function (i, k) { var x = String(row[i]).trim(); return k < want.length ? x : (x ? '1' : ''); }));
  }
  return { ok: true, rows: rows, at: Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm') };
}
function relayAllowed_(file) {
  var queue = [], it = file.getParents(), depth = 0;
  while (it.hasNext()) queue.push(it.next());
  while (queue.length && depth < 8) {
    var next = [];
    for (var i = 0; i < queue.length; i++) { if (RELAY_IMAGE_ROOTS.indexOf(queue[i].getId()) >= 0) return true; var p = queue[i].getParents(); while (p.hasNext()) next.push(p.next()); }
    queue = next; depth++;
  }
  return false;
}
function relayImg_(id, w) {
  if (!/^[-\w]{20,60}$/.test(id)) return { ok: false, code: 'bad-id' };
  if (RELAY_WIDTHS.indexOf(w) < 0) w = 400;
  var f; try { f = DriveApp.getFileById(id); } catch (e) { return { ok: false, code: 'not-found' }; }
  if (!/^image\//.test(f.getMimeType()) || !relayAllowed_(f)) return { ok: false, code: 'not-allowed' };
  var tok = ScriptApp.getOAuthToken(), meta = JSON.parse(UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + id + '?fields=thumbnailLink', { headers: { Authorization: 'Bearer ' + tok } }).getContentText());
  var blob = null;
  if (meta.thumbnailLink) {
    var r = UrlFetchApp.fetch(String(meta.thumbnailLink).replace(/=s\d+$/, '') + '=s' + w, { headers: { Authorization: 'Bearer ' + tok }, muteHttpExceptions: true });
    if (r.getResponseCode() === 200 && /^image\//.test(r.getHeaders()['Content-Type'] || '')) blob = r.getBlob();
  }
  if (!blob) { if (f.getSize() > 4 * 1024 * 1024) return { ok: false, code: 'too-large' }; blob = f.getBlob(); }      // ไม่มีรูปย่อ → ส่งไฟล์เดิม (จำกัดขนาด)
  return { ok: true, mime: blob.getContentType(), b64: Utilities.base64Encode(blob.getBytes()) };
}

/** รันครั้งเดียวหลัง Deploy เป็น Web App: ลงทะเบียน URL ของสคริปต์นี้กับระบบ แล้วเก็บค่าลับร่วมไว้ใน Script Properties */
function setup() {
  var url = ScriptApp.getService().getUrl();
  if (!url || !/\/exec$/.test(url)) throw new Error('ยังไม่ได้ Deploy เป็น Web App — กด Deploy > New deployment > Web app ก่อน แล้วรัน setup อีกครั้ง');
  // ทดสอบสิทธิ์อ่านก่อน (ให้หน้าขออนุญาตของ Google ขึ้นครั้งเดียวตอนนี้)
  Object.keys(RELAY_TABLES).forEach(function (k) { SpreadsheetApp.openById(RELAY_TABLES[k].id).getSheetByName(RELAY_TABLES[k].tab).getLastRow(); });
  DriveApp.getFolderById(RELAY_IMAGE_ROOTS[0]).getName();
  var r = UrlFetchApp.fetch(RELAY_HUB + '/api/relay/enroll', { method: 'post', contentType: 'application/json', payload: JSON.stringify({ token: RELAY_ENROLL_TOKEN, url: url }), muteHttpExceptions: true });
  var j = {}; try { j = JSON.parse(r.getContentText()); } catch (e) {}
  if (r.getResponseCode() !== 200 || !j.ok || !j.secret) throw new Error('ลงทะเบียนไม่สำเร็จ (' + (j.code || ('HTTP ' + r.getResponseCode())) + ') — แจ้งผู้ดูแลระบบเพื่อออก token ใหม่');
  PropertiesService.getScriptProperties().setProperty('RELAY_SECRET', j.secret);
  Logger.log('ลงทะเบียนสำเร็จ: ' + url);
}
