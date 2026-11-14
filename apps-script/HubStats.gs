/**
 * HubStats.gs — "Hub Stats API" สำหรับหน้ารวมระบบงานจราจรและความปลอดภัย ม.มหิดล
 * ------------------------------------------------------------------------------
 * สถานะ: ร่างสำหรับตรวจทาน — ยังไม่ได้ Deploy และยังไม่ได้รันกับ Sheet จริง
 *        (ทดสอบแล้วเฉพาะฟังก์ชันคำนวณด้วยข้อมูลสมมติใน tests/hubstats.test.js)
 *
 * หลักการ
 *  - อ่าน Sheet ต้นทางแบบอ่านอย่างเดียว (ไม่มีคำสั่ง setValue / appendRow / insertSheet ในไฟล์นี้)
 *  - ส่งออกเฉพาะ "ยอดรวม" ไม่ส่งชื่อ เบอร์โทร ทะเบียนรถ รายละเอียดผู้บาดเจ็บ หรือรูปภาพ
 *  - ไม่มีรหัสผ่าน / API key ในไฟล์นี้
 *  - แคชผล 10 นาที (CacheService) เพื่อลดการอ่าน Sheet
 *
 * วิธีติดตั้ง (ทำโดยเจ้าของ Sheet เมื่ออนุมัติแล้วเท่านั้น)
 *  1) script.google.com → โครงการใหม่ (แยกจากสคริปต์เดิมทุกตัว) → วางไฟล์นี้
 *  2) ตั้ง Script properties: MASTER_SHEET_ID, LOSTFOUND_SHEET_ID, CCTV_SHEET_ID
 *  3) รันฟังก์ชัน selfTest() หนึ่งครั้งเพื่ออนุญาตสิทธิ์ และดูผลใน Log
 *  4) Deploy → Web app → Execute as: Me, Who has access: Anyone
 *  5) นำ URL /exec ไปใส่ที่ statsApiUrl ใน config.js ของหน้ารวม
 */
var HUB = {
  TZ: 'Asia/Bangkok',
  CACHE_SECONDS: 600,
  /* ID ของ Sheet ต้นทางไม่อยู่ในไฟล์นี้ — ตั้งใน Project Settings → Script properties:
     MASTER_SHEET_ID (ฐานข้อมูลงานจราจร), LOSTFOUND_SHEET_ID (แจ้งของหาย), CCTV_SHEET_ID (CCTV Request System) */
  GATE_TEST_BEFORE: '2026-10-01',                               // แถวก่อนวันที่นี้เป็นข้อมูลทดสอบระบบ
  CAMPUS_BOX: { latMin: 13.7860, latMax: 13.8030, lngMin: 100.3150, lngMax: 100.3290 }
};
var T_VEHICLE = 'อุบัติเหตุจากยานพาหนะ', T_GENERAL = 'อุบัติเหตุทั่วไป';

function doGet() {
  var cache = CacheService.getScriptCache(), hit = cache.get('hub_stats_v1');
  if (!hit) {
    hit = JSON.stringify(buildStats_());
    try { cache.put('hub_stats_v1', hit, HUB.CACHE_SECONDS); } catch (e) { /* เกิน 100KB: ไม่แคช */ }
  }
  return ContentService.createTextOutput(hit).setMimeType(ContentService.MimeType.JSON);
}

function selfTest() { Logger.log(JSON.stringify(buildStats_(), null, 1).slice(0, 5000)); }

function buildStats_() {
  var out = { schema: 1, generatedAt: Utilities.formatDate(new Date(), HUB.TZ, "yyyy-MM-dd'T'HH:mm:ssXXX"), timezone: HUB.TZ, modules: {} };
  var jobs = {
    incidents: function () { return incidentStats(readTab_(sheetId_('MASTER_SHEET_ID'), 'รายงานเหตุการณ์'), HUB.TZ); },
    accidentMap: function () { return accidentPoints(readTab_(sheetId_('MASTER_SHEET_ID'), 'รายงานเหตุการณ์'), HUB.TZ, HUB.CAMPUS_BOX); },
    gate: function () { return gateStats(readTab_(sheetId_('MASTER_SHEET_ID'), 'จำนวนรถเข้า+หมวกนิรภัย'), HUB.TZ, HUB.GATE_TEST_BEFORE); },
    lostfound: function () { return lostFoundStats(readTab_(sheetId_('LOSTFOUND_SHEET_ID'), 'รายการ พ.ศ. 2569 (ปัจจุบัน)'), HUB.TZ); },
    cctv: function () { return cctvStats(readTab_(sheetId_('CCTV_SHEET_ID'), 'CCTV_Requests')); },
    fire: function () { return fireStats(readTab_(sheetId_('MASTER_SHEET_ID'), 'ข้อมูลถังดับเพลิง'), readTab_(sheetId_('MASTER_SHEET_ID'), 'บันทึกการตรวจ'), HUB.TZ); },
    guardScan: function () { return guardScanStats(readTab_(sheetId_('MASTER_SHEET_ID'), 'แสกนจุดเอกชน'), HUB.TZ); }
  };
  Object.keys(jobs).forEach(function (k) {
    try { out.modules[k] = jobs[k](); }
    catch (e) { out.modules[k] = { status: 'blocked', notes: ['ยังเชื่อมต่อไม่ได้: ' + String(e && e.message || e)] }; }
  });
  return out;
}

function sheetId_(prop) {
  var id = PropertiesService.getScriptProperties().getProperty(prop);
  if (!id) throw new Error('ยังไม่ได้ตั้งค่า ' + prop + ' ใน Script properties');
  return id;
}

/** อ่านทั้งแท็บเป็นอาร์เรย์ 2 มิติ (แถวแรกคือหัวตาราง) — อ่านอย่างเดียว */
function readTab_(id, name) {
  var sh = SpreadsheetApp.openById(id).getSheetByName(name);
  if (!sh) throw new Error('ไม่พบแท็บ "' + name + '"');
  var last = sh.getLastRow();
  return last < 1 ? [] : sh.getRange(1, 1, last, sh.getLastColumn()).getValues();
}

/* ======================= ฟังก์ชันคำนวณ (ไม่แตะ Sheet — ทดสอบได้นอก Apps Script) ======================= */
function fmt_(d, tz, pattern) {
  if (typeof Utilities !== 'undefined') return Utilities.formatDate(d, tz, pattern);
  var p = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d).reduce(function (a, x) { a[x.type] = x.value; return a; }, {});
  var full = p.year + '-' + p.month + '-' + p.day + ' ' + (p.hour === '24' ? '00' : p.hour) + ':' + p.minute;
  return pattern === 'yyyy-MM' ? full.slice(0, 7) : pattern === 'yyyy-MM-dd' ? full.slice(0, 10) : full;
}
/** แปลงค่าวันที่จาก Sheet (Date หรือข้อความ yyyy-mm-dd / dd/mm/yyyy, รองรับปี พ.ศ.) เป็น 'yyyy-MM-dd' ตามเขตเวลาไทย */
function dayKey(v, tz) {
  if (v instanceof Date && !isNaN(v)) return fmt_(v, tz, 'yyyy-MM-dd');
  var s = String(v == null ? '' : v).trim(), m;
  if ((m = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/))) return pad4_(m[1]) + '-' + pad2_(m[2]) + '-' + pad2_(m[3]);
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/))) return pad4_(m[3]) + '-' + pad2_(m[2]) + '-' + pad2_(m[1]);
  return '';
}
function pad2_(x) { return ('0' + Number(x)).slice(-2); }
function pad4_(y) { y = Number(y); return String(y > 2400 ? y - 543 : y); }
function stamp_(v, tz) { return (v instanceof Date && !isNaN(v)) ? fmt_(v, tz, 'yyyy-MM-dd HH:mm') : (dayKey(v, tz) || ''); }
function num_(v) { var n = Number(String(v == null ? '' : v).replace(/,/g, '')); return isFinite(n) ? n : 0; }
function col_(header, name) { var i = header.map(function (h) { return String(h).trim(); }).indexOf(name); if (i < 0) throw new Error('ไม่พบคอลัมน์ "' + name + '"'); return i; }
function inc_(o, k, n) { o[k] = (o[k] || 0) + (n == null ? 1 : n); }
function monthlyList_(map) { return Object.keys(map).sort().map(function (m) { return { month: m, byType: map[m] }; }); }

function incidentStats(rows, tz) {
  var h = rows[0], cDate = col_(h, 'วันที่เกิดเหตุ'), cType = col_(h, 'ประเภทเหตุการณ์'), cInj = col_(h, 'จำนวนคนเจ็บ/ป่วย'), cRec = col_(h, 'วันเวลาที่บันทึก');
  var byType = {}, inj = {}, monthly = {}, total = 0, injured = 0, min = '', max = '', last = '';
  rows.slice(1).forEach(function (r) {
    var d = dayKey(r[cDate], tz), t = String(r[cType] || '').trim(); if (!d || !t) return;
    total++; inc_(byType, t); inc_(inj, t, num_(r[cInj])); injured += num_(r[cInj]);
    monthly[d.slice(0, 7)] = monthly[d.slice(0, 7)] || {}; inc_(monthly[d.slice(0, 7)], t);
    if (!min || d < min) min = d; if (d > max) max = d;
    var s = stamp_(r[cRec], tz); if (s > last) last = s;
  });
  return { status: 'ok', source: 'Sheet “ฐานข้อมูลงานจราจร” แท็บ “รายงานเหตุการณ์”', updated: last, range: { from: min, to: max }, total: total, injuredTotal: injured,
    byType: Object.keys(byType).map(function (t) { return { type: t, count: byType[t], injuredOrIll: inj[t] }; }), monthly: monthlyList_(monthly) };
}

function accidentPoints(rows, tz, box) {
  var h = rows[0], cDate = col_(h, 'วันที่เกิดเหตุ'), cType = col_(h, 'ประเภทเหตุการณ์'), cXY = col_(h, 'พิกัด (Lat, Lng)'), cPlace = col_(h, 'สถานที่เกิดเหตุ'), pts = [];
  rows.slice(1).forEach(function (r) {
    var t = String(r[cType] || '').trim(), d = dayKey(r[cDate], tz), m = String(r[cXY] || '').match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
    if (!d || !m || (t !== T_VEHICLE && t !== T_GENERAL)) return;         // เฉพาะอุบัติเหตุ ไม่รวมรับส่งผู้ป่วย
    var lat = Number(m[1]), lng = Number(m[2]);
    pts.push({ month: d.slice(0, 7), type: t, lat: lat, lng: lng, place: String(r[cPlace] || '').trim().slice(0, 80),   // ไม่ส่งเวลา/ชื่อ/รายละเอียด
      outOfCampusBox: !(lat >= box.latMin && lat <= box.latMax && lng >= box.lngMin && lng <= box.lngMax) });
  });
  return { status: 'ok', source: 'Sheet “ฐานข้อมูลงานจราจร” แท็บ “รายงานเหตุการณ์” คอลัมน์ “พิกัด (Lat, Lng)”', box: box, points: pts };
}

function gateStats(rows, tz, testBefore) {
  var daily = {}, last = '', excluded = 0;
  rows.slice(1).forEach(function (r) {
    var d = dayKey(r[0], tz); if (!d) return;
    if (d < testBefore) { excluded++; return; }
    var o = daily[d] = daily[d] || { date: d, cars: 0, motorcycles: 0, noHelmet: 0 }, i;
    for (i = 2; i <= 6; i++) o.cars += num_(r[i]);
    for (i = 7; i <= 11; i++) o.motorcycles += num_(r[i]);
    for (i = 12; i <= 16; i++) o.noHelmet += num_(r[i]);
    var s = stamp_(r[1], tz); if (s > last) last = s;
  });
  var list = Object.keys(daily).sort().map(function (k) { return daily[k]; }), months = {}, tot = { cars: 0, motorcycles: 0, noHelmet: 0 };
  list.forEach(function (x) {
    var m = months[x.date.slice(0, 7)] = months[x.date.slice(0, 7)] || { month: x.date.slice(0, 7), days: 0, cars: 0, motorcycles: 0, noHelmet: 0 };
    m.days++; ['cars', 'motorcycles', 'noHelmet'].forEach(function (k) { m[k] += x[k]; tot[k] += x[k]; });
  });
  var odd = list.filter(function (x) { return x.noHelmet >= x.motorcycles; }).map(function (x) { return x.date; });
  return { status: odd.length || excluded ? 'warn' : 'ok', source: 'Sheet “ฐานข้อมูลงานจราจร” แท็บ “จำนวนรถเข้า+หมวกนิรภัย”', updated: last,
    range: { from: list.length ? list[0].date : '', to: list.length ? list[list.length - 1].date : '' }, days: list.length, totals: tot,
    monthly: Object.keys(months).sort().map(function (k) { return months[k]; }), daily: list,
    notes: [excluded ? 'ตัดแถวก่อนวันที่ ' + testBefore + ' ออก ' + excluded + ' แถว (ข้อมูลทดสอบ)' : null, odd.length ? 'พบ ' + odd.length + ' วันที่ผู้ไม่สวมหมวก ≥ รถจักรยานยนต์: ' + odd.join(', ') : null].filter(String) };
}

function lostFoundStats(rows, tz) {
  var h = rows[0], cDate = col_(h, 'วันที่บันทึก'), cType = col_(h, 'ประเภท'), cRef = col_(h, 'เลขอ้างอิง'), cStatus = col_(h, 'สถานะ');
  var byType = {}, byStatus = {}, monthly = {}, total = 0, last = '';
  rows.slice(1).forEach(function (r) {
    if (!String(r[cRef] || '').trim()) return;
    var d = dayKey(r[cDate], tz), t = String(r[cType] || '').trim() || '(ไม่ระบุประเภท)', s = String(r[cStatus] || '').trim() || '(ว่าง)';
    total++; inc_(byType, t); inc_(byStatus, s);
    if (d) { monthly[d.slice(0, 7)] = monthly[d.slice(0, 7)] || {}; inc_(monthly[d.slice(0, 7)], t); if (d > last) last = d; }
  });
  return { status: 'ok', source: 'Sheet “แจ้งของหาย” แท็บ “รายการ พ.ศ. 2569 (ปัจจุบัน)”', updated: last, total: total, byType: byType, byStatus: byStatus,
    returned: byStatus['รับของคืนแล้ว'] || 0, monthly: monthlyList_(monthly) };
}

function cctvStats(rows) {
  var h = rows[0], cRef = col_(h, 'refCode'), cTs = col_(h, 'timestamp'), cType = col_(h, 'requesterType'), cStatus = col_(h, 'status'), cFound = h.length - 1;
  var cUnit = h.indexOf('unit');                                             // มีเฉพาะโครงสร้างใหม่ (หลังแยกหน่วยงาน)
  var byStatus = {}, byReq = {}, byUnit = {}, foot = { 'พบภาพ': 0, 'ไม่พบภาพ': 0, 'ไม่ได้ระบุ': 0 }, months = {}, total = 0, last = '';
  rows.slice(1).forEach(function (r) {
    if (!String(r[cRef] || '').trim()) return;
    total++; inc_(byStatus, String(r[cStatus] || '').trim() || 'รอดำเนินการ'); inc_(byReq, String(r[cType] || '').trim() || 'ไม่ระบุ');
    inc_(byUnit, cUnit >= 0 ? (String(r[cUnit] || '').trim() || 'ส่วนกลาง') : 'ส่วนกลาง');
    var f = String(r[cFound] || '').trim(); inc_(foot, f === 'พบ' ? 'พบภาพ' : f === 'ไม่พบ' ? 'ไม่พบภาพ' : 'ไม่ได้ระบุ');
    var ts = new Date(r[cTs]); if (!isNaN(ts)) { var m = fmt_(ts, HUB.TZ, 'yyyy-MM'); inc_(months, m); var s = fmt_(ts, HUB.TZ, 'yyyy-MM-dd HH:mm'); if (s > last) last = s; }
  });
  return { status: 'ok', source: 'Sheet “CCTV Request System - มหาวิทยาลัยมหิดล” แท็บ “CCTV_Requests”', updated: last, total: total, byStatus: byStatus, byRequester: byReq,
    footage: foot, byUnit: byUnit, monthly: Object.keys(months).sort().map(function (m) { return { month: m, count: months[m] }; }) };
}

function fireStats(tanks, checks, tz) {
  var byType = {}, byUnit = {}, n = 0, res = {}, seen = {}, c = 0, last = '';
  tanks.slice(1).forEach(function (r) { if (!String(r[0] || '').trim()) return; n++; inc_(byUnit, String(r[0]).trim()); inc_(byType, String(r[1] || '').trim() || 'ไม่ระบุ'); });
  var h = checks[0] || [], cRes = col_(h, 'สรุปผล');
  checks.slice(1).forEach(function (r) { var id = String(r[1] || '').trim(); if (!id) return; c++; seen[id] = 1; inc_(res, String(r[cRes] || '').trim() || 'ไม่ระบุ'); var s = stamp_(r[0], tz); if (s) last = s; });
  return { status: 'ok', source: 'Sheet “ฐานข้อมูลงานจราจร” แท็บ “ข้อมูลถังดับเพลิง” และ “บันทึกการตรวจ”', updated: last, extinguishers: n, byType: byType, byUnit: byUnit,
    inspections: c, inspectionResult: res, extinguishersInspected: Object.keys(seen).length };
}

function guardScanStats(rows, tz) {
  var byStatus = {}, byUnit = {}, pts = {}, n = 0, first = '', last = '';
  rows.slice(1).forEach(function (r) {
    var p = String(r[3] || '').trim(); if (!p) return;
    n++; pts[p] = 1; inc_(byStatus, String(r[4] || '').trim() || 'ไม่ระบุ'); inc_(byUnit, String(r[1] || '').trim() || 'ไม่ระบุ');   // ไม่ใช้คอลัมน์ชื่อ รปภ.
    var s = stamp_(r[0], tz); if (s) { if (!first || s < first) first = s; if (s > last) last = s; }
  });
  return { status: 'ok', source: 'Sheet “ฐานข้อมูลงานจราจร” แท็บ “แสกนจุดเอกชน”', updated: last, range: { from: first.slice(0, 10), to: last.slice(0, 10) }, scans: n,
    byStatus: byStatus, scanPoints: Object.keys(pts).length, byUnit: byUnit };
}

if (typeof module !== 'undefined') module.exports = { incidentStats: incidentStats, accidentPoints: accidentPoints, gateStats: gateStats, lostFoundStats: lostFoundStats, cctvStats: cctvStats, fireStats: fireStats, guardScanStats: guardScanStats, dayKey: dayKey, HUB: HUB };
