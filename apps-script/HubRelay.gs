/**
 * HubRelay.gs — ตัวกลางอ่าน “Sheet ส่วนตัว” และ “ภาพส่วนตัว” ให้ระบบภายใน mu-traffic-hub (รอบ 11–12 · RELAY_VERSION r11)
 *
 * ทำไมต้องมี: Sheet ทะเบียนนักศึกษา–รถจักรยานยนต์, แบบสำรวจเรือนไทย และภาพประกอบรายงาน GPS งานปริญญา เป็นไฟล์ส่วนตัวของเจ้าของ
 *   บริการบน Cloudflare อ่านเองไม่ได้ (และห้ามเปลี่ยนการแชร์เป็นสาธารณะ) จึงให้สคริปต์นี้ซึ่งรันด้วยบัญชีเจ้าของไฟล์อ่านแทน
 * ขอบเขต (ตายตัวในไฟล์นี้ — แก้ไม่ได้จากภายนอก):
 *   - อ่านอย่างเดียว ไม่เขียน/ไม่แก้ Sheet ไม่เปลี่ยนการแชร์ไฟล์
 *   - ตารางอ่านได้เฉพาะ Spreadsheet/แท็บ/คอลัมน์ในรายการ RELAY_TABLES · คอลัมน์ข้อมูลส่วนบุคคล (ทะเบียนรถ) ส่งเฉพาะ “มี/ไม่มีค่า”
 *   - ภาพอ่านได้เฉพาะไฟล์ภาพที่อยู่ใต้โฟลเดอร์ใน RELAY_IMAGE_ROOTS เท่านั้น
 *   - ทุกคำขอต้องมีค่าลับร่วม (เก็บใน Script Properties → RELAY_SECRET) — ค่าลับได้มาจากการลงทะเบียนครั้งเดียวด้วย setup()
 *   - ไม่ส่ง OAuth token ออกไปที่ใด · ใช้สิทธิ์แบบอ่านอย่างเดียว (ดู HubRelay.appsscript.json) · อ่านแท็บเป็น CSV ด้วยสิทธิ์ drive.readonly (SpreadsheetApp ต้องใช้สิทธิ์แก้ไข จึงไม่ใช้)
 * setup() กดซ้ำได้: ถ้ามีค่าลับแล้วจะตรวจการทำงานอย่างเดียว (ไม่ใช้ token ซ้ำ) · checkInstall() ตรวจอย่างเดียว
 * วิธีติดตั้ง: ดู docs/ส่งมอบรอบ10.md หัวข้อ “เปิดตัวกลางอ่านข้อมูลส่วนตัว”
 */
var RELAY_HUB = 'https://mu-traffic-hub.pages.dev';
var RELAY_VERSION = 'r12';                            // ต้องตรงกับ RELAY_VERSION ใน worker/src/index.js
var RELAY_ENROLL_TOKEN = '__ENROLL_TOKEN__';          // token ใช้ครั้งเดียว (หมดอายุภายใน 7 วัน) · กู้คืน: ผู้ดูแลออก token ใหม่ แล้วใส่ใน Script Properties → ENROLL_TOKEN (ไม่ต้องแก้โค้ด)
var RELAY_TABLES = {
  studentMoto: { id: '1v0LYqEkWIb3MaNKqp1T50tBlDmYn7UP8xl36cPlpllQ', tab: 'Registrations_Motorcycle', gid: '1304328494',
    cols: ['Timestamp', 'RefCode', 'วิทยาเขต', 'คณะ/สถาบัน/ส่วนงาน', 'ประเภทนักศึกษา', 'ระดับการศึกษา', 'ประเภทเครื่องยนต์', 'จำนวนรถ'], present: ['รถ1_ทะเบียน', 'รถ2_ทะเบียน', 'รถ3_ทะเบียน'] },
  ruenthai: { id: '1CcOw6B9ajfga0TptvO15XnwIfC9IrW1Oh2kR1doAHZA', tab: 'RuenThai_Survey', gid: '873571277',
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
    if (body.action === 'ping') return relayOut_({ ok: true, v: RELAY_VERSION });
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
  var x = relayCsv_(T); if (!x.v) return { ok: false, code: x.code };
  var v = x.v; if (!v.length) return { ok: false, code: 'schema' };
  var head = v[0].map(function (h) { return String(h).trim(); });
  var ix = want.concat(pres).map(function (c) { return head.indexOf(c); });
  if (ix.some(function (i) { return i < 0; })) return { ok: false, code: 'schema' };
  var rows = [want.concat(pres)];
  for (var r = 1; r < v.length; r++) {
    var row = v[r]; if (!row.join('').trim()) continue;
    rows.push(ix.map(function (i, k) { var x = String(row[i]).trim(); return k < want.length ? x : (x ? '1' : ''); }));
  }
  return { ok: true, rows: rows, at: Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm') };
}
// อ่านแท็บเป็น CSV (ค่าที่แสดงผล) ผ่านสิทธิ์ drive.readonly ของบัญชีนี้ — ไม่ใช้ SpreadsheetApp เพราะต้องขอสิทธิ์ “แก้ไขสเปรดชีต” ทั้งหมด
function relayCsv_(T) {
  var r = UrlFetchApp.fetch('https://docs.google.com/spreadsheets/d/' + T.id + '/export?format=csv&gid=' + T.gid,
    { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true, followRedirects: true });
  var c = r.getResponseCode(), h = r.getHeaders() || {}, ct = String(h['Content-Type'] || h['content-type'] || '');
  if (c === 404) return { code: 'not-found' };
  if (c !== 200 || /html/i.test(ct)) return { code: c === 401 || c === 403 || /html/i.test(ct) ? 'source-forbidden' : 'source-error' };
  return { v: Utilities.parseCsv(r.getContentText('UTF-8')) };
}
// รอบ 12 (r12): ลดจำนวนครั้งที่เรียก Drive ต่อภาพ — ข้อมูลไฟล์ (ชนิด/โฟลเดอร์แม่/ลิงก์รูปย่อ/ขนาด) ขอครั้งเดียวผ่าน Drive API ด้วยสิทธิ์อ่านอย่างเดียวเดิม
//   ผลตรวจ “โฟลเดอร์นี้อยู่ใต้โฟลเดอร์ที่อนุญาตหรือไม่” จำไว้ใน CacheService 1 ชั่วโมง (ภาพจำนวนมากอยู่โฟลเดอร์เดียวกัน) — ตัวไฟล์ยังตรวจโฟลเดอร์แม่ปัจจุบันทุกครั้ง
function relayMeta_(id, fields, tok) {
  var r; try { r = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + id + '?supportsAllDrives=true&fields=' + fields, { headers: { Authorization: 'Bearer ' + tok }, muteHttpExceptions: true }); } catch (e) { return { code: 'meta-error' }; }
  var c = r.getResponseCode(); if (c === 404) return { code: 'not-found' }; if (c !== 200) return { code: 'meta-' + c };
  try { return { m: JSON.parse(r.getContentText()) }; } catch (e) { return { code: 'meta-parse' }; }
}
function relayFolderOk_(folderId, tok) {
  if (RELAY_IMAGE_ROOTS.indexOf(folderId) >= 0) return true;
  var cache = CacheService.getScriptCache(), k = 'dir:' + folderId, hit = cache.get(k); if (hit === '1') return true; if (hit === '0') return false;
  var ok = false, queue = [folderId], depth = 0, seen = {};
  while (queue.length && depth < 8 && !ok) {
    var next = [];
    for (var i = 0; i < queue.length && !ok; i++) {
      if (seen[queue[i]]) continue; seen[queue[i]] = 1;
      var x = relayMeta_(queue[i], 'parents', tok), ps = (x.m && x.m.parents) || [];
      for (var j = 0; j < ps.length; j++) { if (RELAY_IMAGE_ROOTS.indexOf(ps[j]) >= 0) { ok = true; break; } next.push(ps[j]); }
    }
    queue = next; depth++;
  }
  cache.put(k, ok ? '1' : '0', 3600); return ok;
}
var RELAY_MIME = /^image\/(jpeg|png|webp|gif)$/, RELAY_MAX_BYTES = 4 * 1024 * 1024;
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
function relayImgLegacy_(id) {
  var f; try { f = DriveApp.getFileById(id); } catch (e) { return { ok: false, code: 'not-found' }; }
  if (!RELAY_MIME.test(f.getMimeType()) || !relayAllowed_(f)) return { ok: false, code: 'not-allowed' };
  if (f.getSize() > RELAY_MAX_BYTES) return { ok: false, code: 'too-large' };
  var blob = f.getBlob(); if (!RELAY_MIME.test(blob.getContentType())) return { ok: false, code: 'not-allowed' };
  return { ok: true, mime: String(blob.getContentType()).split(';')[0], b64: Utilities.base64Encode(blob.getBytes()) };
}
function relayImg_(id, w) {
  if (!/^[-\w]{20,60}$/.test(id)) return { ok: false, code: 'bad-id' };
  if (RELAY_WIDTHS.indexOf(w) < 0) w = 400;
  var tok = ScriptApp.getOAuthToken(), x = relayMeta_(id, 'mimeType,parents,thumbnailLink,size', tok);
  if (!x.m) return x.code === 'not-found' ? { ok: false, code: 'not-found' } : relayImgLegacy_(id);      // Drive API ใช้ไม่ได้ชั่วคราว → ทางเดิม (DriveApp) ที่ตรวจโฟลเดอร์เองทุกชั้น
  var m = x.m, ps = m.parents || [], allowed = false;
  if (!RELAY_MIME.test(String(m.mimeType))) return { ok: false, code: 'not-allowed' };
  for (var i = 0; i < ps.length && !allowed; i++) allowed = relayFolderOk_(ps[i], tok);
  if (!allowed) return { ok: false, code: 'not-allowed' };
  var blob = null;
  try {                                                  // ทางหลัก: รูปย่อตามความกว้างที่ขอ — ล้มเหลวแล้วไปทางสำรอง ไม่ลองซ้ำ
    if (m.thumbnailLink) { var r = UrlFetchApp.fetch(String(m.thumbnailLink).replace(/=s\d+$/, '') + '=s' + w, { headers: { Authorization: 'Bearer ' + tok }, muteHttpExceptions: true });
      if (r.getResponseCode() === 200 && RELAY_MIME.test(String(r.getHeaders()['Content-Type'] || '').split(';')[0])) blob = r.getBlob(); }
  } catch (e) { blob = null; }
  if (!blob) {                                            // ทางสำรอง: ไฟล์ต้นฉบับ (ชนิดภาพที่อนุญาต และไม่เกิน 4 MB)
    if (+m.size > RELAY_MAX_BYTES) return { ok: false, code: 'too-large' };
    var f; try { f = DriveApp.getFileById(id); } catch (e2) { return { ok: false, code: 'not-found' }; }
    blob = f.getBlob(); if (!RELAY_MIME.test(blob.getContentType())) return { ok: false, code: 'not-allowed' };
  }
  return { ok: true, mime: String(blob.getContentType()).split(';')[0], b64: Utilities.base64Encode(blob.getBytes()) };
}

/** ติดตั้ง/ตรวจซ้ำ: กดได้หลายครั้ง — ครั้งแรกลงทะเบียนด้วย token แล้วให้ระบบเรียก URL /exec จริงเพื่อตรวจ · ครั้งต่อไปตรวจอย่างเดียว */
function setup() {
  var url = relayUrl_(), P = PropertiesService.getScriptProperties();
  // ทดสอบสิทธิ์อ่านของบัญชีนี้ก่อน (หน้าขออนุญาตของ Google จะขึ้นตอนนี้ครั้งเดียว)
  Object.keys(RELAY_TABLES).forEach(function (k) { var t = relayTable_(k); if (!t.ok) throw new Error('บัญชีนี้อ่านแท็บ ' + RELAY_TABLES[k].tab + ' ไม่ได้ (' + t.code + ') — ติดตั้งด้วยบัญชีที่เปิดไฟล์นี้ได้'); Logger.log('อ่านได้: ' + RELAY_TABLES[k].tab + ' (' + (t.rows.length - 1) + ' แถวที่มีข้อมูล)'); });
  RELAY_IMAGE_ROOTS.forEach(function (id) { Logger.log('อ่านโฟลเดอร์ภาพได้: ' + DriveApp.getFolderById(id).getName()); });
  if (!P.getProperty('RELAY_SECRET')) {
    var tok = P.getProperty('ENROLL_TOKEN') || RELAY_ENROLL_TOKEN;
    var j = relayPost_('/api/relay/enroll', { token: tok, url: url });
    if (!j.ok || !j.secret) throw new Error('ลงทะเบียนไม่สำเร็จ (' + j.code + ') — ' + relayHelp_(j.code));
    P.setProperty('RELAY_SECRET', j.secret); P.deleteProperty('ENROLL_TOKEN');
    Logger.log('ลงทะเบียนแล้ว กำลังให้ระบบตรวจการเชื่อมต่อ…');
  } else Logger.log('มีค่าลับอยู่แล้ว — ตรวจการเชื่อมต่ออย่างเดียว (ไม่ใช้ token ซ้ำ)');
  return checkInstall();
}
function checkInstall() {
  var j = relayPost_('/api/relay/confirm', { url: relayUrl_() });
  var c = j.check || {};
  Logger.log('ระบบเรียกสคริปต์นี้: ' + (c.ping || j.code) + (c.version ? ' (รุ่น ' + c.version + ')' : ''));
  Object.keys(c.tables || {}).forEach(function (k) { Logger.log('อ่านตาราง ' + k + ': ' + c.tables[k]); });
  Logger.log('อ่านภาพตัวอย่าง: ' + (c.image || '-'));
  if (!j.ok) throw new Error('ยังใช้งานไม่ได้ (' + (j.code || 'check-failed') + ') — ' + relayHelp_(c.ping && c.ping !== 'ok' ? c.ping : j.code));
  Logger.log('ติดตั้งสำเร็จและผ่านการตรวจจากระบบแล้ว' + (j.promoted ? ' (เริ่มใช้งานตัวกลางนี้)' : ' (ใช้งานอยู่แล้ว)'));
  return 'ok';
}
function relayUrl_() {
  // บางบัญชี getUrl() คืนค่า /dev เมื่อรันจากหน้าแก้โค้ด → ใส่ Web app URL (ลงท้าย /exec) ใน Script Properties ชื่อ RELAY_EXEC_URL แทนได้ (ไม่ใช่ค่าลับ)
  var own = PropertiesService.getScriptProperties().getProperty('RELAY_EXEC_URL'), url = own && /^https:\/\/script\.google\.com\/.+\/exec$/.test(own) ? own : ScriptApp.getService().getUrl();
  if (!url || !/\/exec$/.test(url)) throw new Error('ยังไม่ได้ Deploy เป็น Web app หรือระบบอ่าน URL ได้เป็น /dev — กด Deploy > New deployment > Web app ก่อน ถ้า Deploy แล้วยังขึ้นข้อความนี้ ให้คัดลอก Web app URL (ลงท้าย /exec) ไปใส่ใน Project Settings > Script Properties ชื่อ RELAY_EXEC_URL แล้วรัน setup อีกครั้ง');
  return url;
}
function relayPost_(path, payload) {
  var r = UrlFetchApp.fetch(RELAY_HUB + path, { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true });
  var j = {}; try { j = JSON.parse(r.getContentText()); } catch (e) { j = { ok: false, code: 'HTTP ' + r.getResponseCode() }; }
  if (r.getResponseCode() >= 400 && !j.code) j.code = 'HTTP ' + r.getResponseCode();
  return j;
}
function relayHelp_(code) {
  var H = { 'enroll-bad-token': 'token ไม่ถูกต้อง — ใช้ไฟล์ HubRelay_for_owner.gs ฉบับล่าสุด', 'enroll-expired': 'token หมดอายุ — ขอ token ใหม่จากผู้ดูแลระบบ แล้วใส่ใน Script Properties ชื่อ ENROLL_TOKEN',
    'enroll-used': 'token ถูกใช้ไปแล้ว — ถ้าสคริปต์นี้ยังไม่มี RELAY_SECRET ให้ขอ token ใหม่ใส่ใน Script Properties ชื่อ ENROLL_TOKEN แล้วรัน setup อีกครั้ง', 'enroll-closed': 'ระบบยังไม่เปิดรับลงทะเบียน — ขอ token ใหม่จากผู้ดูแลระบบ',
    'relay-login-required': 'ระบบเรียก URL นี้แล้วเจอหน้า Login — ตอน Deploy ต้องเลือก Who has access = Anyone (ถ้าไม่มีตัวเลือกนี้ แสดงว่าองค์กรจำกัดไว้)', 'relay-forbidden': 'ค่าลับไม่ตรงกับระบบ — ลบ RELAY_SECRET ใน Script Properties แล้วขอ token ใหม่',
    'outdated': 'URL ที่ Deploy ยังเป็นโค้ดรุ่นเก่า — Deploy > Manage deployments > แก้ไข > Version: New version > Deploy', 'relay-unknown-url': 'URL นี้ยังไม่ได้ลงทะเบียน — ลบ RELAY_SECRET ใน Script Properties แล้วขอ token ใหม่',
    'relay-timeout': 'สคริปต์ตอบช้า — ลองรัน checkInstall อีกครั้ง', 'relay-not-deployed': 'ไม่พบ Web app ที่ URL นี้ — ตรวจว่า Deploy แล้ว', 'check-failed': 'ดูรายละเอียดแต่ละรายการใน Execution log' };
  return H[code] || 'ดูรายละเอียดใน Execution log';
}
