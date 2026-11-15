/**
 * HubData.gs — บริการข้อมูลภายในของหน้ารวม (Apps Script Web App) · ยังไม่ได้ Deploy · ไม่มีค่าลับในไฟล์นี้
 *
 * ผู้เรียกมีรายเดียว: บริการ server/functions/api/* (ซึ่งตรวจ JWT ของ Cloudflare Access และรายชื่อผู้มีสิทธิ์แล้ว)
 * บริการนั้นส่งค่าลับร่วม (HUB_SHARED_SECRET) มาใน body ทุกครั้ง — เบราว์เซอร์ไม่เคยเห็น URL หรือค่าลับของสคริปต์นี้
 *
 * ตั้งค่าที่ Project Settings → Script Properties:
 *   HUB_SHARED_SECRET     ค่าลับร่วม (สุ่มยาวอย่างน้อย 32 ตัวอักษร — ค่าเดียวกับที่ตั้งในบริการ)
 *   OPS_SHEET_ID          Spreadsheet ID ของ “ข้อมูลงานจราจรออนไลน์”
 *   STAFF_INCLUDE_PHONE   "true" ถ้าต้องการให้หน้าบุคลากรแสดงเบอร์โทร (ค่าเริ่มต้นไม่ส่ง)
 *   FORMS_WRITE_ENABLED   "true" เมื่อพร้อมให้บันทึกแบบฟอร์มจริง (ค่าเริ่มต้นปิด)
 *   FORMS_IMAGE_FOLDER_ID โฟลเดอร์ Drive สำหรับรูปแนบแบบฟอร์ม (ไม่เปิดสาธารณะ)
 * Deploy: Execute as = Me · Who has access = Anyone (จำเป็นเพื่อให้บริการเรียกได้ — การป้องกันอยู่ที่ค่าลับร่วม)
 * doGet ไม่ส่งข้อมูลใด ๆ · อ่านเฉพาะคอลัมน์ที่ระบุ ไม่ส่งรหัสพนักงานหรือลายเซ็น
 */
var HUB_TZ = 'Asia/Bangkok';

function doGet() { return hubOut_({ ok: false, code: 'method' }); }

function doPost(e) {
  var body;
  try { body = JSON.parse((e && e.postData && e.postData.contents) || ''); } catch (err) { return hubOut_({ ok: false, code: 'bad-body' }); }
  var P = PropertiesService.getScriptProperties(), secret = P.getProperty('HUB_SHARED_SECRET') || '';
  if (secret.length < 32 || !hubSafeEqual_(String(body.secret || ''), secret)) return hubOut_({ ok: false, code: 'forbidden' });
  try {
    if (body.action === 'read') return hubOut_(hubRead_(P, String(body.dataset || '')));
    if (body.action === 'form') return hubOut_(hubForm_(P, body));
    return hubOut_({ ok: false, code: 'unknown-action' });
  } catch (err) { return hubOut_({ ok: false, code: 'internal' }); }          // ไม่ส่งข้อความผิดพลาดภายในออกไป
}

function hubOut_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function hubSafeEqual_(a, b) {                                                 // เทียบแบบเวลาคงที่
  var x = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, a), y = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, b), d = 0;
  for (var i = 0; i < x.length; i++) d |= x[i] ^ y[i];
  return d === 0 && a.length === b.length;
}
function hubStr_(v) { return v == null ? '' : v instanceof Date ? Utilities.formatDate(v, HUB_TZ, 'yyyy-MM-dd HH:mm') : String(v).trim(); }
function hubTable_(P, tab) {
  var sh = SpreadsheetApp.openById(P.getProperty('OPS_SHEET_ID')).getSheetByName(tab);
  if (!sh || sh.getLastRow() < 2) return { head: [], rows: [] };
  var v = sh.getDataRange().getValues();
  return { head: v[0].map(hubStr_), rows: v.slice(1) };
}
/** อ่านตามชื่อหัวคอลัมน์ (ไม่ใช้ลำดับคอลัมน์) — ถ้าหัวคอลัมน์ที่ต้องใช้หายไป ตอบ schema แทนการเดา */
function hubPick_(t, map, required) {
  var idx = {}, miss = [];
  Object.keys(map).forEach(function (k) { idx[k] = t.head.indexOf(map[k]); if (idx[k] < 0 && required.indexOf(k) >= 0) miss.push(map[k]); });
  if (miss.length) return { ok: false, code: 'schema', missing: miss };
  var rows = t.rows.map(function (r) { var o = {}; Object.keys(map).forEach(function (k) { o[k] = idx[k] < 0 ? '' : hubStr_(r[idx[k]]); }); return o; });
  return { ok: true, rows: rows, asOf: Utilities.formatDate(new Date(), HUB_TZ, 'yyyy-MM-dd HH:mm') };
}
function hubRead_(P, dataset) {
  var out;
  if (dataset === 'staff') {
    out = hubPick_(hubTable_(P, 'พนักงานจราจร'), { name: 'ชื่อ-สกุล', position: 'ตำแหน่ง', phone: 'เบอร์โทร', photo: 'URL_รูปภาพ_1', unit: 'หน่วย', isHead: 'หัวหน้าหน่วย' }, ['name', 'unit']);
    if (out.ok) { var phone = P.getProperty('STAFF_INCLUDE_PHONE') === 'true'; out.rows = out.rows.filter(function (r) { return r.name; }).map(function (r) { if (!phone) r.phone = ''; r.isHead = /^(true|1|ใช่|หัวหน้า|y|yes)$/i.test(r.isHead); return r; }); }
    return out;
  }
  if (dataset === 'areaPhotos') {
    out = hubPick_(hubTable_(P, 'ภาพการตรวจพื้นที่'), { date: 'วันที่/เวลา', url: 'ลิงก์ภาพ', category: 'หมวดหมู่' }, ['date', 'url', 'category']);
    if (out.ok) out.rows = out.rows.filter(function (r) { return r.url; });
    return out;
  }
  if (dataset === 'radio') {
    out = hubPick_(hubTable_(P, 'บันทึกรายงานวิทยุสื่อสาร'), { at: 'วันเวลาที่บันทึก', operator: 'เจ้าหน้าที่ศูนย์วิทยุ', unit: 'หน่วยงานที่แจ้ง', reporter: 'ชื่อ รปภ./ผู้แจ้ง', type: 'ประเภทเหตุการณ์', place: 'สถานที่เกิดเหตุ', detail: 'รายละเอียด/ข้อความ', action: 'การดำเนินการของศูนย์', status: 'สถานะ' }, ['at', 'type']);
    if (out.ok) out.rows = out.rows.filter(function (r) { return r.at; });
    return out;
  }
  return { ok: false, code: 'unknown-dataset' };
}

/** บันทึกแบบฟอร์ม: ปิดไว้จนกว่าจะตั้ง FORMS_WRITE_ENABLED = "true" · เขียนเฉพาะแท็บในรายการ · จับคู่ค่ากับหัวคอลัมน์ตามชื่อ */
/* สถานะ: ส่วนบันทึกนี้ยังไม่เคยรันกับ Sheet จริง — ก่อนเปิดใช้ต้องเทียบชื่อช่องของแต่ละแบบฟอร์ม (server/functions/api/form.js → FORMS) กับหัวคอลัมน์ของแท็บปลายทาง
 * โดยเฉพาะแบบ “การจัดการขยะ” ที่ระบบเดิมใช้ชื่อช่องภาษาอังกฤษ (reporterName, wasteGeneral …) แล้วให้ Apps Script เดิมแปลง — ถ้าไม่ตรง สคริปต์นี้จะตอบ schema และไม่เขียนอะไร */
var HUB_FORM_SHEETS = { 'form-clean': 'การทำความสะอาดยานพาหนะ', 'form-refill': 'ประวัติการเติมสารถังดับเพลิง', 'form-waste': 'การจัดการขยะ', 'forms-radio': 'บันทึกรายงานวิทยุสื่อสาร' };
function hubForm_(P, body) {
  if (P.getProperty('FORMS_WRITE_ENABLED') !== 'true') return { ok: false, code: 'write-disabled' };
  var tab = HUB_FORM_SHEETS[String(body.form || '')];
  if (!tab || tab !== body.sheet) return { ok: false, code: 'unknown-form' };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var sh = SpreadsheetApp.openById(P.getProperty('OPS_SHEET_ID')).getSheetByName(tab);
    if (!sh) return { ok: false, code: 'schema' };
    var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(hubStr_), val = body.values || {}, now = new Date();
    var ref = 'HUB-' + Utilities.formatDate(now, HUB_TZ, 'yyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 900 + 100);
    var links = (body.files || []).slice(0, 5).map(function (f) {
      var folder = DriveApp.getFolderById(P.getProperty('FORMS_IMAGE_FOLDER_ID'));
      return folder.createFile(Utilities.newBlob(Utilities.base64Decode(f.b64), f.type, ref + '_' + f.name)).getUrl();   // ไม่เปลี่ยนสิทธิ์การแชร์ของไฟล์
    });
    var matched = head.filter(function (h) { return Object.prototype.hasOwnProperty.call(val, h) && String(val[h]) !== ''; }).length;
    if (!matched) return { ok: false, code: 'schema' };                          // ชื่อช่องของแบบฟอร์มไม่ตรงกับหัวคอลัมน์ปลายทาง → ไม่เขียนแถวว่าง
    var row = head.map(function (h, i) {
      if (i === 0 && /timestamp|วันเวลา|วันที่บันทึก/i.test(h) && val[h] == null) return now;
      if (Object.prototype.hasOwnProperty.call(val, h)) return String(val[h]).replace(/^[=+\-@]/, "'$&");                 // กันสูตรแฝง
      var m = /^URL_รูปภาพ_(\d)$/.exec(h) || /^รูปภาพ\s*(\d)$/.exec(h); if (m && links[+m[1] - 1]) return links[+m[1] - 1];
      if (/ผู้บันทึก \(บัญชี\)|recorded_by/i.test(h)) return String(body.user || '');
      if (/เลขอ้างอิง|ref/i.test(h)) return ref;
      return '';
    });
    sh.appendRow(row);
    return { ok: true, ref: ref };
  } finally { lock.releaseLock(); }
}
