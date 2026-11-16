// worker/tests/worker.test.mjs — ทดสอบบริการกลางแบบ local: node worker/tests/worker.test.mjs
// ทุกอย่างเป็นของจำลอง: D1 = SQLite ในหน่วยความจำ · Google Sheets/Drive/GitHub/Workers AI = MOCK · รหัสพนักงานและชื่อเป็นค่าสมมติ
// ผลที่ผ่านพิสูจน์ตรรกะของโค้ดเท่านั้น ไม่ได้พิสูจน์ว่าบริการที่ Deploy แล้วทำงานกับแหล่งจริง
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { handle, SCHEMA, _reset, parseCsv, parseCidrs, ipNum, normDT, persons, SOURCES } from '../src/index.js';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let fails = 0, n = 0; const ok = (name, cond, info) => { n++; if (!cond) fails++; console.log((cond ? 'PASS ' : 'FAIL ') + name + (cond || info === undefined ? '' : ' — ' + info)); };

function d1() {                                   // ตัวจำลอง D1 (prepare/bind/first/all/run/batch แบบ transaction)
  const db = new DatabaseSync(':memory:'); SCHEMA.forEach((s) => db.exec(s));
  const st = (sql, args = []) => ({ bind: (...a) => st(sql, a), first: async () => db.prepare(sql).get(...args) || null, all: async () => ({ results: db.prepare(sql).all(...args) }), run: async () => { db.prepare(sql).run(...args); return {}; }, _x: () => (/^\s*select/i.test(sql) ? { results: db.prepare(sql).all(...args) } : (db.prepare(sql).run(...args), { results: [] })) });
  return { prepare: (sql) => st(sql), batch: async (list) => { db.exec('BEGIN'); try { const r = list.map((s) => s._x()); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; } }, _db: db };
}
const csv = (rows) => rows.map((r) => r.map((c) => (/[",\n]/.test(c) ? '"' + String(c).replace(/"/g, '""') + '"' : c)).join(',')).join('\n');
const IMG1 = 'MOCKDRIVEFILEID0000000000000001', IMG2 = 'MOCKDRIVEFILEID0000000000000002';
const SHEETS = {
  '1850713009': [['ชื่อ-สกุล', 'ตำแหน่ง', 'รหัสพนักงาน', 'เบอร์โทร', 'URL_รูปภาพ_1', 'หน่วย', 'หัวหน้าหน่วย', 'ลายเซน'], ['ผู้ใช้สมมติ ก (MOCK)', 'พนักงาน', '0123', '000-000-0000', 'https://github.com/user-attachments/assets/mock-a', 'หน่วยสมมติ 1', '', 'SIG'], ['ผู้ดูแลสมมติ ข (MOCK)', 'หัวหน้า', '4567', '', '', 'หน่วยสมมติ 2', 'หัวหน้าหน่วยสมมติ', ''], ['ผู้ใช้สมมติ ค (MOCK)', 'พนักงาน', '8899', '', '', 'หน่วยสมมติ 1', '', '']],
  '480256005': [['วันเวลาที่บันทึก', 'ชื่อผู้รายงาน', 'เบอร์โทรผู้รายงาน', 'ช่องทางรับแจ้ง', 'ประเภทผู้แจ้ง', 'วันที่เกิดเหตุ', 'เวลาเกิดเหตุ', 'เวลาได้รับแจ้ง', 'เวลาเข้าถึงที่เกิดเหตุ', 'สถานที่เกิดเหตุ', 'พิกัด (Lat, Lng)', 'ประเภทเหตุการณ์', 'พาหนะคันที่ 1', 'ประเภทผู้ขับขี่คันที่ 1', 'คู่กรณี/พาหนะคันที่ 2', 'ประเภทผู้ขับขี่คันที่ 2', 'การเสียหายของทรัพย์สิน', 'รายละเอียดทรัพย์สินเสียหาย', 'การมีผู้บาดเจ็บ/ผู้ป่วย', 'จำนวนคนเจ็บ/ป่วย', 'รายละเอียดผู้บาดเจ็บ/ป่วยทั้งหมด', 'สาเหตุของเหตุการณ์', 'วิธีการเคลื่อนย้าย', 'ส่งต่อสถานพยาบาลปลายทาง', 'รายละเอียดเหตุการณ์เพิ่มเติม', 'ลิงก์รูปภาพเหตุการณ์', 'ข้อมูลสรุป KPI', 'รหัสเหตุการณ์'],
    ['15/11/2026 9:10:00', 'ผู้รายงานสมมติ', '000', 'วิทยุสื่อสาร', 'รปภ.', '2026-11-15', '9:00', '9:01', '9:04', 'จุดสมมติ A', '13.7950, 100.3220', 'อุบัติเหตุจากยานพาหนะ', 'รถยนต์', 'นักศึกษา', 'รถจักรยานยนต์', 'บุคลากร', 'ไม่มี', '-', 'มี', '2', '[คนที่ 1] ประเภท: นักศึกษา | ชื่อ: ผู้บาดเจ็บสมมติ 1 | โทร: 000 | อาการ: ถลอก | รหัส: 1234567 [คนที่ 2] ประเภท: บุคลากร | ชื่อ: - | โทร: - | อาการ: ฟกช้ำ', 'ประมาท', 'รถกอล์ฟพยาบาล', '-', 'รายละเอียดสมมติ', 'https://drive.google.com/file/d/' + IMG1 + '/view', '✅ เป็นไปตาม KPI | 3 นาที', 'INC-MOCK-1'],
    ['14/11/2026 20:00:00', 'x', '0', '-', '-', '2026-11-14', '19:30', '-', '-', 'จุดสมมติ B', '-', 'รับส่งผู้ป่วย', '-', '-', '-', '-', '-', '-', 'มี', '1', '[คนที่ 1] ประเภท: บุคคลภายนอก | ชื่อ: ผู้ป่วยสมมติ | โทร: - | อาการ: เป็นลม', '-', 'รถกู้ชีพ', 'รพ.สมมติ', '-', '-', 'ไม่มีข้อมูลเวลาเข้าถึงที่เกิดเหตุ', 'INC-MOCK-2'],
    ['13/11/2026 8:00:00', 'x', '0', '-', '-', '2026-11-13', '7:30', '-', '-', 'จุดสมมติ C', '13.79, 100.32', 'บังคับล้อ', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', 'INC-MOCK-3']],
  '659712341': [['วันที่ของข้อมูล', 'เวลาที่บันทึกเข้าระบบ', 'รถยนต์ ประตู 1', 'รถยนต์ ประตู 3', 'มอไซค์ ประตู 1', 'มอไซค์ ประตู 3', 'ไม่สวมหมวก ประตู 1', 'ไม่สวมหมวก ประตู 3'], ['2026-09-16', '16/09/2026 10:00:00', '50', '505', '50', '505', '50', '505'], ['2026-11-14', '15/11/2026 8:00:00', '1,000', '200', '300', '40', '5', '6'], ['2026-11-15', '15/11/2026 17:00:00', '900', '100', '200', '30', '4', '3']],
  '2074352966': [['Timestamp', 'RefCode', 'ประเภท', 'ชื่อ-นามสกุล', 'ประเภทบุคคล', 'คณะ/หน่วยงาน', 'เบอร์โทร', 'วันที่เกิดเหตุ', 'เวลา', 'รายละเอียด', 'สถานที่', 'URL รูปภาพ', 'สถานะ', 'การดำเนินการ', 'วันที่อัปเดต', 'อัปเดตโดย'], ['15/11/2026 10:00:00', 'LOS-MOCK-1', 'สิ่งของสูญหาย', 'ผู้แจ้งสมมติ', 'นักศึกษา', 'คณะสมมติ', '000', '2026-11-15', '09:00', 'กระเป๋า, "สีดำ"', 'อาคารสมมติ', 'https://drive.google.com/open?id=' + IMG2, 'รอดำเนินการ', '', '', 'เจ้าหน้าที่สมมติ'], ['2026-11-14 20:34:37', 'FND-MOCK-2', 'พบสิ่งของ', '', '', '', '', '2026-11-14', '', 'ร่ม', 'โรงอาหารสมมติ', '', 'เจ้าของยังไม่มารับคืน', '', '', ''], ['2026-11-14 21:00:00', 'PKP-MOCK-3', 'รับของคืน', '', '', '', '', '2026-11-14', '', '', '', '', 'รับของคืนแล้ว', '', '', '']],
  '1811117659': [['วันที่บันทึก', 'ปี พ.ศ.', 'ประเภท', 'เลขอ้างอิง', 'สถานะ'], ['2026-11-15', 'พ.ศ. 2569', 'สิ่งของสูญหาย', 'LOS-MOCK-1', 'รอดำเนินการ'], ['2026-11-14', 'พ.ศ. 2569', 'พบสิ่งของ', 'FND-MOCK-2', 'เจ้าของยังไม่มารับคืน'], ['2026-10-02', 'พ.ศ. 2569', 'รับของคืน', '—', 'รับของคืนแล้ว']],
  '1509680619': [['วันที่/เวลา', 'ชื่อไฟล์', 'ลิงก์ภาพ', 'หมวดหมู่'], ['15/11/2026 7:00:00', 'a.jpg', 'https://drive.google.com/file/d/' + IMG1 + '/view', 'ตรวจพื้นที่']],
  '1354124607': [['วันเวลาที่บันทึก', 'เจ้าหน้าที่ศูนย์วิทยุ', 'หน่วยงานที่แจ้ง', 'ชื่อ รปภ./ผู้แจ้ง', 'ประเภทเหตุการณ์', 'สถานที่เกิดเหตุ', 'รายละเอียด/ข้อความ', 'การดำเนินการของศูนย์', 'สถานะ'], ['15/11/2026 6:00:00', 'ศูนย์สมมติ', 'หน่วยสมมติ', 'ผู้แจ้งสมมติ', 'แจ้งเหตุทั่วไป', 'จุดสมมติ', 'ข้อความสมมติ', 'รับทราบ', 'รับแจ้ง']],
  '0': [['ด', 'ชื่อ นามสกุล', 'ตำแหน่ง', 'หน่วยงาน', 'ประเภทเหตุการณ์', 'ระดับเหตุการณ์', 'สถานที่เกิดเหตุ', 'รายละเอียดเพิ่มเติม', 'รูปภาพ 1', 'รูปภาพ 2', 'รูปภาพ 3'], ['9/30/2026 14:05:00', 'ชื่อสมมติ', 'ตำแหน่งสมมติ', 'หน่วยสมมติ', 'เหตุสมมติ', 'ต่ำ', 'จุดสมมติ', 'รายละเอียด', '', '', '']],
  '1074767452': [['Report_ID', 'Report_Type', 'Guard_Name', 'Guard_Company', 'Duty_Post', 'Duty', 'Event_Type', 'Report_Detail', 'Latitude', 'Longitude', 'GPS_Accuracy_M', 'Distance_From_Post_M', 'Geo_Status', 'Photo_File_ID', 'Record_Status', 'Report_Code', 'Report_Date', 'Report_Time', 'Guard_ID', 'Zone', 'Event_Severity', 'GPS_Status'], ['1', 'CHECKIN', 'รปภ.สมมติ', 'บริษัทสมมติ', 'จุด 1', 'เวรสมมติ', '', 'ปกติ', '13.79', '100.32', '12', '5', 'IN_RANGE', IMG2, 'COMPLETE', 'R-1', '2026-10-05', '08:00', 'G-1', 'A', '', 'OK']]
};
let sourceDown = false, aiCalls = [];
// รอบ 10: Sheet ส่วนตัว (ข้อมูลสมมติ) ที่อ่านได้เฉพาะผ่านตัวกลาง · ชื่อ/เบอร์/ทะเบียนเป็นค่าสมมติ และต้องไม่หลุดออกจากบริการ
const RELAY_URL = 'https://script.google.com/macros/s/MOCKRELAYDEPLOYMENT000000000001/exec', PRIV = 'MOCKPRIVATEGPSPHOTO00000000009';
let relaySecret = null, relayHtml = false, relayVer = 'r11', relaySecret2 = null, relay2Down = false; const relayCalls = [];
const HUBDATA_URL = 'https://script.google.com/macros/s/MOCKHUBDATA00000000000000001/exec', hubDataCalls = [];
const RELAY_URL2 = 'https://script.google.com/a/macros/mahidol.ac.th/s/MOCKRELAYDEPLOYMENT000000000002/exec';
const RELAY_TABLES = {
  studentMoto: [['Timestamp', 'RefCode', 'วิทยาเขต', 'คณะ/สถาบัน/ส่วนงาน', 'ชื่อ-นามสกุล', 'ประเภทนักศึกษา', 'ระดับการศึกษา', 'เบอร์มือถือ', 'ประเภทเครื่องยนต์', 'จำนวนรถ', 'รถ1_ทะเบียน', 'รถ2_ทะเบียน', 'รถ3_ทะเบียน', 'รหัสนักศึกษา'],
    ['6/7/2026, 15:07:04', 'MR-1', 'วิทยาเขตศาลายา', 'คณะสมมติ ก', 'นักศึกษาสมมติ', 'ปริญญาตรี', 'ปริญญาตรี', '0800000000', 'สันดาป', '1', 'กข1234', '', '', '6500000'],
    ['7/7/2026, 10:00:00', 'MR-2', 'วิทยาเขตพญาไท', 'คณะสมมติ ข', 'นักศึกษาสมมติ', '', '', '0800000001', 'ไฟฟ้า', '2', 'กข5678', '', '', '6500001'],
    ['7/7/2026, 10:05:00', 'MR-1', 'วิทยาเขตศาลายา', 'คณะสมมติ ก', 'นักศึกษาสมมติ', '', '', '', 'สันดาป', '1', 'กข1234', '', '', ''],
    ['', '', 'วิทยาเขตศาลายา', '', '', '', '', '', '', '', '', '', '', ''],
    ['1/8/2026, 09:00:00', 'MR-3', 'วิทยาเขตศาลายา', 'คณะสมมติ ก', 'นักศึกษาสมมติ', '', '', '', 'สันดาป', '', 'กข9999', 'กข8888', '', '']],
  ruenthai: [['Timestamp', 'Ref_Code', 'Token_Code', 'Group_Type', 'Group_Label', 'User_SubType', 'Faculty_Dept', 'Sub_Unit_Project', 'Full_Name', 'Phone', 'Email', 'Car_Count', 'Car1_Type', 'Car1_Plate', 'Car2_Type', 'Car2_Plate', 'LPR_Status', 'Payload_Hash'],
    ['2026-11-02 7:01:02', 'RT-1', 'TOKEN-SECRET-1', 'B', 'กลุ่มที่ 2: บุคลากรส่วนงานอื่น', 'จอดประจำ', 'ส่วนงานสมมติ', 'หน่วยสมมติ', 'ผู้ตอบสมมติ', '0811111111', 'a@example.test', '1', 'รถยนต์ทั่วไป', 'ทบ1111', '', '', 'รออัปเดตเข้ากล้อง', 'HASH1'],
    ['2026-11-03 8:00:00', 'RT-2', 'TOKEN-SECRET-2', 'A', 'กลุ่มที่ 1: บุคลากรคณะ', 'จอดประจำ', 'คณะสมมติ', '', 'ผู้ตอบสมมติ', '0822222222', 'b@example.test', '2', 'รถยนต์ทั่วไป', 'ทบ2222', 'รถกระบะ', 'ทบ3333', '', 'HASH2'],
    ['2026-11-03 9:00:00', 'RT-1', 'TOKEN-SECRET-1', 'B', 'กลุ่มที่ 2: บุคลากรส่วนงานอื่น', 'จอดประจำ', 'ส่วนงานสมมติ', 'หน่วยสมมติ', '', '', '', '1', 'รถยนต์ทั่วไป', 'ทบ1111', '', '', 'รออัปเดตเข้ากล้อง', 'HASH1'],
    ['2026-11-04 9:00:00', 'RT-3', 'TOKEN-SECRET-3', 'C', 'กลุ่มที่ 3: อื่น ๆ', 'อื่น ๆ', '', '', '', '', '', '2', 'รถยนต์ทั่วไป', 'ทบ4444', '', '', 'อัปเดตแล้ว', 'HASH3']]
};
const fetchMock = async (u, o) => { u = String(u);
  let m = /docs\.google\.com\/spreadsheets\/d\/[\w-]+\/export\?format=csv&gid=(\d+)/.exec(u);
  if (m) { if (sourceDown) return new Response('<html>Sign in</html>', { status: 200, headers: { 'content-type': 'text/html' } }); return SHEETS[m[1]] ? new Response(csv(SHEETS[m[1]]), { headers: { 'content-type': 'text/csv; charset=utf-8' } }) : new Response('', { status: 404 }); }
  m = /raw\.githubusercontent\.com\/trafficoppe\/trafficsystem\/[0-9a-f]+\/(.+)$/.exec(u);
  if (m) { const f = path.join(ROOT, m[1]); return fs.existsSync(f) ? new Response(fs.readFileSync(f)) : new Response('', { status: 404 }); }
  if (u === HUBDATA_URL) { const b = JSON.parse(o.body), gid = (SOURCES({})[b.source] || [])[1]; hubDataCalls.push(b.source);      // MOCK บริการเดิม HubData
    return b.secret === 'z'.repeat(40) && SHEETS[gid] ? Response.json({ ok: true, rows: SHEETS[gid] }) : Response.json({ ok: false, code: 'unknown-source' }); }
  if (u === RELAY_URL || u === RELAY_URL2) { const b = JSON.parse(o.body); relayCalls.push(b.action + ':' + (b.source || b.id || ''));       // MOCK ตัวกลาง Apps Script ของเจ้าของไฟล์
    if (relayHtml || (u === RELAY_URL2 && relay2Down)) return new Response('<html>Sign in</html>', { headers: { 'content-type': 'text/html' } });
    if (b.secret !== (u === RELAY_URL2 ? relaySecret2 : relaySecret)) return Response.json({ ok: false, code: 'forbidden' });
    if (b.action === 'ping') return Response.json({ ok: true, v: relayVer });
    if (b.action === 'table') { const T = RELAY_TABLES[b.source]; if (!T) return Response.json({ ok: false, code: 'unknown-source' }); const want = b.cols.concat(b.present), ix = want.map((c) => T[0].indexOf(c));
      return Response.json({ ok: true, rows: [want].concat(T.slice(1).map((r) => ix.map((i, k) => (k < b.cols.length ? r[i] : (r[i] ? '1' : ''))))) }); }
    if (b.action === 'img') return b.id === PRIV || b.id === IMG2 ? Response.json({ ok: true, mime: 'image/jpeg', b64: 'AAEC' }) : Response.json({ ok: false, code: 'not-allowed' });
    return Response.json({ ok: false, code: 'unknown-action' }); }
  m = /drive\.google\.com\/thumbnail\?id=([\w-]+)&sz=w(\d+)/.exec(u);
  if (m) return m[1] === IMG1 || m[1] === IMG2 ? new Response(new Uint8Array([137, 80, 78, 71]), { headers: { 'content-type': 'image/png' } }) : new Response('<html>', { headers: { 'content-type': 'text/html' } });
  return new Response('', { status: 404 }); };
let NOW = Date.parse('2026-11-15T19:00:00+07:00');
const deps = { fetch: fetchMock, now: () => NOW };
const ENV = (o = {}) => Object.assign({ DB: db, ASSET_REF: '7c183a7', ADMIN_CODES: '4567', SHEET_MAIN: 'MOCKMAIN', SHEET_LF: 'MOCKLF', SHEET_OPS: 'MOCKOPS', SHEET_EVENTS: 'MOCKEV', SHEET_GPS: 'MOCKGPS', AI_MODEL: '@cf/mock/model',
  AI: { run: async (model, input) => { aiCalls.push({ model, input }); if (ENV.aiThrow) throw new Error(ENV.aiThrow); return { response: ENV.aiReply || 'เดือน พ.ย. 2569 มีเหตุการณ์รวม 3 เหตุการณ์ (ข้อมูล ณ 15 พ.ย. 2569 19:00 น.)' }; } } }, o);
let db = d1();
const req = (p, o = {}) => new Request('https://hub.example.test' + p, { method: o.method || 'GET', headers: Object.assign({ 'CF-Connecting-IP': o.ip || '10.20.5.9' }, o.cookie ? { Cookie: o.cookie } : {}, o.origin ? { Origin: o.origin } : {}, o.inm ? { 'If-None-Match': o.inm } : {}, o.body ? { 'content-type': 'application/json' } : {}), body: o.body ? JSON.stringify(o.body) : undefined });
const run = async (p, o = {}, env = ENV()) => { const r = await handle(req(p, o), env, deps); const ct = r.headers.get('content-type') || ''; return { s: r.status, j: /json/.test(ct) ? await r.json() : null, t: /json/.test(ct) ? '' : await r.text(), h: r.headers }; };
const loginAs = async (code, o = {}) => { const r = await run('/api/login', Object.assign({ method: 'POST', body: { code } }, o)); const sc = r.h.get('set-cookie') || ''; return { r, cookie: sc.split(';')[0], sc }; };

// ---------- ยูทิลิตี้ ----------
ok('CSV: เครื่องหมายคำพูด จุลภาค และขึ้นบรรทัดในช่อง', JSON.stringify(parseCsv('a,"b,1","c ""q""\nx"\n1,2,3\n')) === JSON.stringify([['a', 'b,1', 'c "q"\nx'], ['1', '2', '3']]));
ok('วันเวลา: dd/mm/yyyy และ yyyy-mm-dd → รูปแบบเดียว', normDT('05/09/2026 7:43:23') === '2026-09-05 07:43' && normDT('2026-11-14 20:34:37') === '2026-11-14 20:34' && normDT('2026-11-01') === '2026-11-01' && normDT('x') === '');
ok('CIDR: IPv4/IPv6 และไม่รับช่วงกว้างเกิน /8', parseCidrs('10.0.0.0/8, 2001:db8::/32').length === 2 && ipNum('2001:db8::1').bits === 128 && ipNum('999.1.1.1') === null && (() => { try { parseCidrs('0.0.0.0/0'); return false; } catch (e) { return true; } })());
ok('บุคคลในเหตุการณ์: แยกประเภท/ชื่อ/อาการ ไม่มีเบอร์โทรและรหัสนักศึกษา', (() => { const p = persons('[คนที่ 1] ประเภท: นักศึกษา | ชื่อ: ก | โทร: 081 | อาการ: ถลอก | รหัส: 6915524 [คนที่ 2] ประเภท: บุคลากร | ชื่อ: - | อาการ: เสียชีวิต'); return p.length === 2 && p[0].type === 'นักศึกษา' && !/081|6915524/.test(JSON.stringify(p)) && p[1].dead === true && p[1].name === ''; })());

// ---------- เครือข่าย ----------
// ข้อกำหนด 16 พ.ย. 2569: ไม่บังคับเครือข่าย — เข้าได้จากทุกเครือข่ายด้วยรหัสพนักงาน · ด่านเครือข่ายเป็นตัวเลือก (NETWORK_GATE=on) ปิดไว้เป็นค่าเริ่มต้น
const GATE = { NETWORK_GATE: 'on', ALLOWED_CIDRS: '10.20.0.0/16, 2001:db8:abcd::/48' };
let r = await run('/', { ip: '203.0.113.7' }); ok('ไม่มี ALLOWED_CIDRS (ค่าเริ่มต้น) → หน้าเว็บเปิดได้จากทุกเครือข่าย', r.s === 200 && /<html/i.test(r.t));
{ db = d1(); _reset(); const x = await run('/api/login', { method: 'POST', body: { code: '0123' }, ip: '203.0.113.7' }); ok('ไม่มี ALLOWED_CIDRS → รหัสที่ถูกต้อง Login ได้จาก IP ใดก็ได้ (ไม่มี OTP/อีเมล/SSO)', x.s === 200 && x.j.ok === true && /HttpOnly/.test(x.h.get('set-cookie') || '')); }
r = await run('/api/login', { method: 'POST', body: { code: '0123' }, ip: '203.0.113.8' }, ENV({ ALLOWED_CIDRS: '10.20.0.0/16' })); ok('มีค่า ALLOWED_CIDRS ค้างอยู่แต่ไม่ได้เปิด NETWORK_GATE → ไม่ปิด Login', r.s === 200);
r = await run('/api/data?dataset=staff', { ip: '203.0.113.7' }); ok('ไม่มีด่านเครือข่าย แต่ไม่มี session → ข้อมูลภายในยังปิด (401)', r.s === 401 && r.j.code === 'no-session');
r = await run('/api/img?id=' + IMG1, { ip: '203.0.113.7' }); ok('ไม่มีด่านเครือข่าย แต่ไม่มี session → ภาพภายในยังปิด (401)', r.s === 401);
r = await run('/api/login', { method: 'POST', body: { code: '0123' } }, ENV({ ALLOWED_CIDRS: '' , CF: 1 })); { const q = new Request('https://hub.example.test/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: '9999' }) }); const x = await handle(q, ENV(), deps); ok('ไม่มี header CF-Connecting-IP → Login ไม่ล่ม (ใช้คีย์ unknown สำหรับจำกัดความถี่)', x.status === 401); }
r = await run('/api/health'); ok('/api/health สาธารณะ: สถานะขั้นต่ำเท่านั้น (ไม่บอกแหล่งข้อมูล/ผู้ดูแล/เครือข่าย)', r.s === 200 && JSON.stringify(Object.keys(r.j)) === '["ok","now"]');
r = await run('/api/health?probe=1'); ok('/api/health?probe=1 ไม่มี session → 401 (ไม่อ่านต้นทางซ้ำให้ใครก็ได้)', r.s === 401);
// ด่านเครือข่ายแบบเลือกเปิด (ยังทำงานเมื่อผู้ดูแลเปิดเอง)
r = await run('/', { ip: '203.0.113.7' }, ENV(GATE)); ok('[ตัวเลือก] เปิด NETWORK_GATE → IP นอกรายการ 403 ทั้งหน้าเว็บ', r.s === 403 && /203\.0\.113\.7/.test(r.t));
r = await run('/api/login', { method: 'POST', body: { code: '0123' }, ip: '203.0.113.7' }, ENV(GATE)); ok('[ตัวเลือก] เปิด NETWORK_GATE → IP นอกรายการ Login ไม่ได้', r.s === 403 && r.j.code === 'network-denied');
r = await run('/api/me', { ip: '2001:db8:abcd:1::5' }, ENV(GATE)); ok('[ตัวเลือก] IPv6 ในช่วงที่อนุญาต → ผ่านด่าน (ยังไม่มี session = 401)', r.s === 401 && r.j.code === 'no-session');
r = await run('/api/health', {}, ENV({ NETWORK_GATE: 'on', ALLOWED_CIDRS: 'not-an-ip' })); const r6 = await run('/api/health', {}, ENV({ NETWORK_GATE: 'on' }));
ok('[ตัวเลือก] เปิดด่านแต่ค่าเครือข่ายผิด/ว่าง → ปิดทั้งหมด (503) ไม่เปิดกว้าง', r.s === 503 && r6.s === 503);
db = d1(); _reset();

// ---------- Login / session ----------
r = await run('/api/data?dataset=staff'); ok('ไม่มี session → /api/data 401', r.s === 401 && r.j.code === 'no-session');
r = await run('/api/data?dataset=staff', { cookie: '__Host-hub_s=' + 'a'.repeat(80) }); ok('session ปลอม → 401', r.s === 401);
let a = await loginAs('9999'); ok('รหัสไม่มีในรายชื่อ → 401 ข้อความทั่วไป ไม่มี cookie', a.r.s === 401 && a.r.j.code === 'invalid' && !a.sc);
a = await loginAs('123'); ok('ตัดเลขศูนย์นำหน้าออก (123 แทน 0123) → ไม่ผ่าน', a.r.s === 401);
a = await loginAs('12ab'); ok('ไม่ใช่ตัวเลข → ไม่ผ่าน', a.r.s === 401);
sourceDown = true; _reset(); a = await loginAs('0123'); ok('อ่านแหล่งตรวจรหัสไม่ได้ → 503 verify-unavailable ไม่ปล่อยเข้า', a.r.s === 503 && a.r.j.code === 'verify-unavailable' && !a.sc); sourceDown = false; _reset();
a = await loginAs('0123'); const U = a.cookie;
ok('รหัสถูก (มีเลขศูนย์นำหน้า) → เข้าได้ทันที ได้ชื่อ/หน่วย/สิทธิ์ผู้ใช้ทั่วไป', a.r.s === 200 && a.r.j.user.role === 'user' && a.r.j.user.name === 'ผู้ใช้สมมติ ก (MOCK)');
ok('cookie: __Host- · HttpOnly · Secure · SameSite=Lax · ไม่มีรหัสพนักงานใน token', /^__Host-hub_s=[0-9a-f]{80}; Path=\/; HttpOnly; Secure; SameSite=Lax; Max-Age=43200$/.test(a.sc) && !/0123/.test(a.sc.split(';')[0].slice(13, 20)));
ok('ฐานข้อมูล session ไม่เก็บรหัสพนักงานหรือ token ตรง ๆ', (() => { const row = db._db.prepare('SELECT * FROM sessions').get(); return row.id !== U.split('=')[1] && !Object.values(row).includes('0123'); })());
r = await run('/api/me', { cookie: U }); ok('/api/me → ผู้ใช้ปัจจุบัน', r.s === 200 && r.j.user.unit === 'หน่วยสมมติ 1');
const A = (await loginAs('4567')).cookie; r = await run('/api/me', { cookie: A }); ok('รหัสในรายการผู้ดูแล → role admin (คนอื่นไม่เป็นผู้ดูแลอัตโนมัติ)', r.j.user.role === 'admin');
r = await run('/api/health?probe=1', { cookie: U }); const rp = await run('/api/health?probe=1', { cookie: A }); ok('/api/health?probe=1: ผู้ใช้ทั่วไป 403 · ผู้ดูแลเห็นสถานะแหล่งข้อมูล', r.s === 403 && rp.s === 200 && rp.j.sources.staff === 'ok' && rp.j.network === 'open');
{ const n0 = await loginAs('8899', {}); const no = await run('/api/me', { cookie: n0.cookie }, ENV({ ADMIN_CODES: '' })); const w = await run('/api/roster', { method: 'POST', cookie: (await loginAs('4567', {})).cookie, body: { version: 0, op: 'add', team: '1', role: 'x', name: 'x' } }, ENV({ ADMIN_CODES: '' }));
  ok('ไม่ตั้ง ADMIN_CODES → ผู้ใช้ Login ได้ตามปกติ แต่ไม่มีใครเป็นผู้ดูแล (แก้รายชื่อไม่ได้)', no.s === 200 && no.j.user.role === 'user' && w.s === 403); }
r = await run('/api/login', { method: 'POST', body: { code: '0123' }, origin: 'https://evil.example' }); ok('Login จากเว็บอื่น (Origin ไม่ตรง) → 403', r.s === 403);

// ---------- ชุดข้อมูลหลัง Login ครั้งเดียว ----------
r = await run('/api/data?dataset=staff', { cookie: U }); ok('บุคลากร: ได้รายการ และไม่มีรหัสพนักงาน/ลายเซ็น/เบอร์โทร', r.s === 200 && r.j.rows.length === 3 && !/0123|4567|SIG|000-000/.test(JSON.stringify(r.j)) && r.j.rows[1].isHead === true);
r = await run('/api/data?dataset=incidents', { cookie: U }); const inc = r.j.rows;
ok('เหตุการณ์: รหัส วันที่ พิกัด จำนวนผู้บาดเจ็บ บุคคล รูป · ไม่มีผู้รายงาน/เบอร์โทร', inc.length === 3 && inc[0].id === 'INC-MOCK-1' && inc[0].lat === 13.795 && inc[0].injured === 2 && inc[0].persons.length === 2 && inc[0].images[0] === IMG1 && inc[2].injured === null && inc[1].lat === null && !/ผู้รายงานสมมติ|เบอร์โทร|1234567/.test(JSON.stringify(r.j)));
r = await run('/api/data?dataset=lostfound', { cookie: U }); ok('Lost & Found: LF_New ตามคอลัมน์จริง (ประเภท/สถานะแยกกัน, รูป, ช่องที่มีจุลภาค)', r.j.rows.length === 3 && r.j.rows[0].ref === 'LOS-MOCK-1' && r.j.rows[0].detail === 'กระเป๋า, "สีดำ"' && r.j.rows[0].images[0] === IMG2 && r.j.rows[1].at === '2026-11-14 20:34' && r.j.rows[2].status === 'รับของคืนแล้ว');
r = await run('/api/data?dataset=areaPhotos', { cookie: U }); const r2 = await run('/api/data?dataset=radio', { cookie: U }), r3 = await run('/api/data?dataset=events', { cookie: U }), r4 = await run('/api/data?dataset=gps', { cookie: U });
ok('ตรวจพื้นที่ / วิทยุ / กิจกรรมพิเศษ / GPS: session เดียวกันเปิดได้ทุกชุด', r.j.rows.length === 1 && r2.j.rows.length === 1 && r3.j.rows.length === 1 && r4.j.rows.length === 1);
ok('กิจกรรมพิเศษ: วันที่ต้นทางแบบ เดือน/วัน/ปี (9/30/2026 14:05) → 2026-09-30 14:05 ไม่สลับวัน-เดือน และไม่ส่งชื่อ/ตำแหน่งผู้รายงาน', r3.j.rows[0].at === '2026-09-30 14:05' && !/ชื่อสมมติ|ตำแหน่งสมมติ/.test(JSON.stringify(r3.j)), JSON.stringify(r3.j.rows[0]));
ok('กิจกรรมพิเศษไม่ส่งชื่อผู้รายงาน · GPS ไม่ส่งชื่อ/รหัส รปภ.', !/ชื่อสมมติ|ตำแหน่งสมมติ/.test(JSON.stringify(r3.j)) && !/รปภ\.สมมติ|G-1/.test(JSON.stringify(r4.j)) && r4.j.rows[0].record === 'COMPLETE' && r4.j.rows[0].geo === 'IN_RANGE');
r = await run('/api/data?dataset=secrets', { cookie: U }); ok('ชุดข้อมูลนอกรายการ → 400', r.s === 400);
sourceDown = true; _reset(); r = await run('/api/data?dataset=lostfound', { cookie: U }); ok('ต้นทางไม่ให้อ่าน → 502 source-private (ไม่ใช่ให้ Login ซ้ำ)', r.s === 502 && r.j.code === 'source-private'); sourceDown = false; _reset();

// ---------- ภาพ ----------
await run('/api/data?dataset=incidents', { cookie: U });
r = await run('/api/img?id=' + IMG1 + '&w=1600', { cookie: U }); ok('ภาพ: รหัสไฟล์ที่อยู่ในชุดข้อมูล → ได้ภาพ (private cache)', r.s === 200 && r.h.get('content-type') === 'image/png' && /private/.test(r.h.get('cache-control')));
r = await run('/api/img?id=' + IMG1); ok('ภาพ: ไม่มี session → 401', r.s === 401);
r = await run('/api/img?id=SOMEOTHERDRIVEFILEID00000000000', { cookie: U }); ok('ภาพ: รหัสไฟล์ที่ไม่อยู่ในชุดข้อมูล → 404 (ไม่ใช่ตัวส่งต่อ URL อิสระ)', r.s === 404);
r = await run('/api/img?id=' + encodeURIComponent('https://evil.example/x.png'), { cookie: U }); ok('ภาพ: ใส่ URL แทนรหัสไฟล์ → 400', r.s === 400);

// ---------- สถิติสด ----------
r = await run('/api/stats', { cookie: U }); const S = r.j;
ok('สถิติสด: เหตุการณ์รายวัน + checkedAt = เวลาที่อ่าน + complete', S.incidentsDaily.complete === true && S.incidentsDaily.checkedAt === '2026-11-15 19:00' && S.incidentsDaily.lastEntry === '2026-11-15' && S.incidentsDaily.lastRecordedAt === '2026-11-15 09:10' && S.incidents.total === 3 && S.incidents.injuredTotal === 3);
ok('สถิติสด: รถเข้า ตัดแถวทดสอบ 16–17 ก.ย. · รวมประตู · ตัวเลขมีจุลภาค', S.gate.daily.length === 2 && S.gate.daily[0].cars === 1200 && S.gate.daily[1].motorcycles === 230 && S.gate.monthly[0].days === 2 && S.gate.updated === '2026-11-15 17:00');
ok('สถิติสด: Lost & Found รายวัน (LF_New) แยกจากยอดรายปี/สถานะ (แท็บรวม)', S.lostfoundDaily.rows.length === 2 && S.lostfoundDaily.rows[1].lost === 1 && S.lostfoundDaily.rows[0].returnForms === 1 && S.lostfound.total === 3 && S.lostfound.returned === 1 && S.lostfoundStatus.monthly.length === 2);
sourceDown = true; _reset(); r = await run('/api/stats', { cookie: U }); ok('สถิติสด: อ่านต้นทางไม่ได้ → ไม่มีส่วนนั้น + รหัสสาเหตุ (ไม่ส่ง 0)', r.s === 200 && !r.j.incidentsDaily && r.j.errors.incidents === 'source-private'); sourceDown = false; _reset();

// ---------- รายชื่อเวร ----------
r = await run('/api/roster', { cookie: U }); ok('รายชื่อเวร: ผู้ใช้ทั่วไปอ่านได้ (canEdit=false)', r.s === 200 && r.j.canEdit === false && r.j.version === 0);
r = await run('/api/roster', { method: 'POST', cookie: U, body: { version: 0, op: 'add', team: '1', role: 'ส.ต1', name: 'x' } }); ok('รายชื่อเวร: ผู้ใช้ทั่วไปแก้ไม่ได้ (403)', r.s === 403 && db._db.prepare('SELECT COUNT(*) c FROM roster').get().c === 0);
r = await run('/api/roster', { method: 'POST', cookie: A, body: { version: 0, op: 'add', team: '1', role: 'ส.ต1', name: 'ชื่อทดสอบ   หนึ่ง (MOCK)' } }); const id1 = r.j.teams['1'][0].id;
ok('ผู้ดูแล: เพิ่มรายชื่อ → รุ่นเพิ่ม ได้ ID คงที่ ตัดช่องว่างซ้ำ', r.s === 200 && r.j.version === 1 && /^r_[0-9a-f]{12}$/.test(id1) && r.j.teams['1'][0].name === 'ชื่อทดสอบ หนึ่ง (MOCK)');
r = await run('/api/roster', { method: 'POST', cookie: A, body: { version: 0, op: 'add', team: '2', role: 'วิทยุ', name: 'อีกคน' } }); ok('แก้ด้วยรุ่นเก่า (มีคนแก้ไปก่อน) → 409 conflict ไม่เขียนทับ', r.s === 409 && r.j.code === 'conflict' && r.j.version === 1 && db._db.prepare('SELECT COUNT(*) c FROM roster').get().c === 1);
r = await run('/api/roster', { method: 'POST', cookie: A, body: { version: 1, op: 'add', team: '3', role: 'ส.ต2', name: 'ชื่อทดสอบ หนึ่ง (MOCK)' } }); ok('ชื่อซ้ำ → 409 duplicate ให้ผู้ดูแลยืนยัน (ไม่รวมอัตโนมัติ)', r.s === 409 && r.j.code === 'duplicate' && r.j.dup[0].id === id1);
r = await run('/api/roster', { method: 'POST', cookie: A, body: { version: 1, op: 'add', team: '3', role: 'ส.ต2', name: 'ชื่อทดสอบ หนึ่ง (MOCK)', force: true } }); ok('ยืนยันว่าเป็นคนละคน → เพิ่มได้เป็นอีก ID', r.s === 200 && r.j.version === 2 && r.j.teams['3'][0].id !== id1);
r = await run('/api/roster', { method: 'POST', cookie: A, body: { version: 2, op: 'move', id: id1, team: '4' } }); r = await run('/api/roster', { method: 'POST', cookie: A, body: { version: 3, op: 'update', id: id1, role: 'วิทยุ', name: 'ชื่อทดสอบ แก้ไข (MOCK)' } }); r = await run('/api/roster', { method: 'POST', cookie: A, body: { version: 4, op: 'disable', id: id1 } });
ok('ย้ายผลัด → แก้ไข → ปิดใช้งาน (ID เดิม)', r.s === 200 && r.j.version === 5 && r.j.teams['4'][0].id === id1 && r.j.teams['4'][0].active === false && r.j.teams['4'][0].role === 'วิทยุ');
r = await run('/api/roster', { cookie: U }); ok('ผู้ใช้ทั่วไปไม่เห็นรายชื่อที่ปิดใช้งาน และไม่เห็น ID', r.j.teams['4'].length === 0 && r.j.teams['3'].length === 1 && r.j.teams['3'][0].id === undefined);
r = await run('/api/roster/log', { cookie: A }); const lg = r.j.rows; ok('ประวัติการแก้ไข: ครบทุกครั้ง มีผู้แก้ ก่อน/หลัง', lg.length === 5 && lg[0].action === 'disable' && lg[0].by === 'ผู้ดูแลสมมติ ข (MOCK)' && JSON.parse(lg[1].before).role === 'ส.ต1');
r = await run('/api/roster/log', { cookie: U }); ok('ประวัติการแก้ไข: ผู้ใช้ทั่วไปดูไม่ได้', r.s === 403);
r = await run('/api/roster', { method: 'POST', cookie: A, origin: 'https://evil.example', body: { version: 5, op: 'enable', id: id1 } }); ok('แก้รายชื่อจากเว็บอื่น (CSRF) → 403', r.s === 403);

// ---------- ผู้ช่วย AI ----------
const Q = { action: 'chat', userMessage: 'เดือนนี้มีเหตุการณ์กี่ครั้ง', chatHistory: [{ role: 'User', text: 'สวัสดี' }, { role: 'AI', text: 'สวัสดีครับ' }], context: { from: '2026-11', to: '2026-11' } };
r = await run('/api/chat', { method: 'POST', body: Q }); ok('AI: ไม่มี session → 401', r.s === 401 && r.j.status === 'error');
r = await run('/api/chat', { method: 'POST', cookie: U, body: Q });
ok('[MOCK AI] AI: session เดียวกัน → ตอบ + อ้างเฉพาะแหล่งข้อมูลที่เกี่ยวกับคำถาม + ข้อมูล ณ + ใช้ตัวเลขสด', r.s === 200 && r.j.status === 'success' && r.j.verified === true && r.j.live === true && r.j.sources.length >= 1 && r.j.sources.indexOf('รายงานเหตุการณ์ (ฐานข้อมูลงานจราจร)') >= 0 && !!r.j.asOf, JSON.stringify(r.j).slice(0, 200));
{ const c = aiCalls[aiCalls.length - 1], sys = c.input.messages[0].content; ok('สิ่งที่ส่งให้ AI: สถิติรวมจากต้นทางสด (3 เหตุการณ์ของชุดจำลอง) ไม่มีชื่อ/เบอร์/รหัส/รายการรายชิ้น', /พ\.ย\. 2569[^\n]*รวม 3 เหตุการณ์/.test(sys) && !/สมมติ|MOCK|0123|LOS-|INC-/.test(JSON.stringify(c.input)) && c.model === '@cf/mock/model'); }
{ const QF = { action: 'chat', userMessage: 'แล้วเดือนก่อนล่ะ', chatHistory: [{ role: 'User', text: 'เดือนนี้มีอุบัติเหตุกี่ครั้ง' }, { role: 'AI', text: 'เดือน พ.ย. 2569 มีเหตุการณ์รวม 3 เหตุการณ์' }], context: { from: '2026-11', to: '2026-11' } };
  ENV.aiReply = 'สวัสดีครับ ถามเรื่องอุบัติเหตุหรือของหายได้เลยครับ ดูรายละเอียดได้ที่ #traffic'; r = await run('/api/chat', { method: 'POST', cookie: U, body: QF });
  const sys = aiCalls[aiCalls.length - 1].input.messages[0].content;
  ok('[MOCK AI] คำถามต่อเนื่อง “แล้วเดือนก่อนล่ะ” → ส่งสถิติหัวข้อเดิม (เหตุการณ์) ตามบทสนทนา + ไม่แนบหัวข้อที่ไม่เกี่ยว (รถราง)', /เหตุการณ์และอุบัติเหตุ/.test(sys) && !/\[รถรางบริการพิเศษ/.test(sys) && /เดือนก่อน = ต\.ค\. 2569/.test(sys));
  ok('[MOCK AI] คำตอบไม่มีตัวเลข (ทักทาย/แนะนำเมนู) → ผ่าน และไม่แปะแหล่งข้อมูลทุกแหล่ง', r.j.verified === true && r.j.sources.length === 0 && /#traffic/.test(r.j.reply));
  ENV.aiReply = 'ข้อมูล ณ 15 พ.ย. 2569 เวลา 19:00 น. เดือนพฤศจิกายน 2569 มี 3 เหตุการณ์'; r = await run('/api/chat', { method: 'POST', cookie: U, body: QF });
  ok('[MOCK AI] ตัวเลขที่เป็นวันที่/ปี/เวลา ไม่ถูกตีเป็นตัวเลขแต่ง (ตัวตรวจผ่อนแล้ว)', r.j.verified === true, JSON.stringify(r.j).slice(0, 160));
  ENV.aiReply = ''; ENV.aiThrow = 'AiError: 4006: you have used up your daily free allocation of 10,000 neurons'; r = await run('/api/chat', { method: 'POST', cookie: U, body: QF }); ENV.aiThrow = '';
  ok('[MOCK AI] โควตาฟรีของวันหมด → 429 llm-quota (ไม่มีคำตอบจำลอง)', r.s === 429 && r.j.code === 'llm-quota', JSON.stringify(r.j)); }
ENV.aiReply = 'มีผู้โดยสารประมาณ 98,765 คน'; r = await run('/api/chat', { method: 'POST', cookie: U, body: Q }); ok('[MOCK AI] โมเดลตอบตัวเลขที่ไม่มีในสถิติ → ไม่ส่งคำตอบนั้นออก', r.j.verified === false && !/98,765/.test(r.j.reply)); ENV.aiReply = '';
r = await run('/api/chat', { method: 'POST', cookie: U, body: Q }, ENV({ AI: null })); ok('AI ยังไม่ตั้งค่า → 503 llm-not-configured (ไม่มีคำตอบจำลอง)', r.s === 503 && r.j.code === 'llm-not-configured');
for (let i = 0; i < 6; i++) r = await run('/api/chat', { method: 'POST', cookie: U, body: Q }); ok('AI: ถามเกินกำหนดต่อนาที → 429', r.s === 429);

// ---------- Logout / หมดอายุ / จำกัดความถี่ ----------
r = await run('/api/logout', { method: 'POST', cookie: U }); const after = await run('/api/data?dataset=staff', { cookie: U }), afterImg = await run('/api/img?id=' + IMG1, { cookie: U });
ok('Logout → session ถูกลบฝั่งบริการ: ข้อมูลและภาพเข้าไม่ได้ด้วย cookie เดิม', r.s === 200 && /Max-Age=0/.test(r.h.get('set-cookie')) && after.s === 401 && afterImg.s === 401);
NOW += 13 * 3600e3; r = await run('/api/data?dataset=staff', { cookie: A }); ok('session หมดอายุ (12 ชม.) → 401', r.s === 401); NOW -= 13 * 3600e3;
db = d1(); _reset(); for (let i = 0; i < 8; i++) await loginAs('9' + i + '00'); a = await loginAs('0123'); ok('ลองรหัสผิด 8 ครั้งจาก IP เดียว → ล็อกชั่วคราว (429) แม้รหัสถูก', a.r.s === 429 && a.r.j.code === 'rate-limited');
a = await loginAs('0123', { ip: '10.20.9.9' }); ok('IP อื่นยัง Login ได้ (ล็อกเฉพาะ IP ที่ลองผิด)', a.r.s === 200);
NOW += 11 * 60e3; a = await loginAs('0123'); ok('ครบเวลาล็อก → Login ได้อีก', a.r.s === 200); NOW -= 11 * 60e3;

// ---------- ไฟล์หน้าเว็บ ----------
r = await run('/config.js'); ok('config.js ของระบบภายใน: เปิดโหมด session และชี้ API ภายในโดเมนเดียวกัน', r.s === 200 && /auth:"session"/.test(r.t) && /dataApiUrl:"\/api\/data"/.test(r.t));
r = await run('/server/README.md'); const r5 = await run('/../x'); ok('ไฟล์นอกรายการที่อนุญาต → 404', r.s === 404 && r5.s === 404);
{ const src = fs.readFileSync(path.join(ROOT, 'worker/src/index.js'), 'utf8'); ok('ซอร์สบริการไม่มีรหัสพนักงาน คีย์ หรือ URL ของ Apps Script', !/1062|AKfyc[\w-]{20,}|AIza[\w-]{20,}|sk-[A-Za-z0-9]{20,}/.test(src)); }
// ---------- รอบ 10: ตัวกลางอ่านไฟล์ส่วนตัว (Sheet + ภาพ) ----------
{ _reset(); const E = ENV({ SHEET_VEH_STUDENT: 'MOCKVEH', SHEET_RUENTHAI: 'MOCKRT' }); const U10 = (await loginAs('0123')).cookie;
  r = await run('/api/stats', { cookie: U10 }, E);
  ok('[MOCK] ไฟล์ส่วนตัวยังไม่มีตัวกลาง → แยกสาเหตุ relay-not-configured (ชุดอื่นยังอ่านได้ ไม่ใส่ตัวเลขแทน)', r.s === 200 && r.j.errors.studentMoto === 'relay-not-configured' && r.j.errors.ruenthai === 'relay-not-configured' && !r.j.studentMoto && !!r.j.incidents, JSON.stringify(r.j.errors));
  r = await run('/api/sources', { cookie: U10 }, E);
  ok('/api/sources: บอกผลทีละแหล่ง (อ่านสำเร็จ + เวลา / อ่านไม่สำเร็จ + สาเหตุ) และสถานะตัวกลาง', r.s === 200 && r.j.sources.incidents.state === 'ok' && !!r.j.sources.incidents.readAt && r.j.sources.studentMoto.state === 'error' && r.j.sources.studentMoto.code === 'relay-not-configured' && r.j.relay.configured === false && !r.j.sources.staff, JSON.stringify(r.j).slice(0, 200));
  r = await run('/api/sources', {}, E); ok('/api/sources ต้อง Login', r.s === 401);
  db._db.prepare('INSERT OR IGNORE INTO imgids(id, at) VALUES(?, ?)').run(PRIV, 1);
  r = await run('/api/img?id=' + PRIV + '&w=1600', { cookie: U10 }, E); ok('[MOCK] ภาพส่วนตัว + ยังไม่มีตัวกลาง → 502 image-private (ไม่ใช่ “ไม่มีรูปภาพ”)', r.s === 502 && r.j.code === 'image-private', JSON.stringify(r.j));
  r = await run('/api/relay/enroll', { method: 'POST', body: { token: 'ab'.repeat(16), url: RELAY_URL } }, E); ok('ลงทะเบียนตัวกลาง: ยังไม่เปิด → 403 enroll-closed', r.s === 403 && r.j.code === 'enroll-closed');
  const TOK = 'c0ffee'.repeat(8), h = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(TOK)))).map((b) => b.toString(16).padStart(2, '0')).join('');
  db._db.prepare("INSERT OR REPLACE INTO meta(k, v) VALUES('relay_enroll', ?)").run(JSON.stringify({ h, exp: NOW + 7 * 864e5 }));
  r = await run('/api/relay/enroll', { method: 'POST', body: { token: 'ab'.repeat(24), url: RELAY_URL } }, E); ok('ลงทะเบียนตัวกลาง: token ผิด → 403', r.s === 403 && r.j.code === 'enroll-bad-token');
  r = await run('/api/relay/enroll', { method: 'POST', body: { token: TOK, url: 'https://evil.example/exec' } }, E); ok('ลงทะเบียนตัวกลาง: URL ที่ไม่ใช่ script.google.com → 400', r.s === 400 && r.j.code === 'enroll-bad-url');
  const M = (k) => { const x = db._db.prepare('SELECT v FROM meta WHERE k = ?').get(k); return x ? x.v : null; };
  const ENR = (tok, url) => run('/api/relay/enroll', { method: 'POST', body: { token: tok, url } }, E), CONF = (url, ip) => run('/api/relay/confirm', { method: 'POST', body: { url }, ip: ip || '10.20.7.7' }, E);
  const C = await Promise.all([1, 2, 3, 4].map(() => ENR(TOK, RELAY_URL)));
  const win = C.filter((x) => x.s === 200), lose = C.filter((x) => x.s !== 200);
  ok('ลงทะเบียนพร้อมกัน 4 คำขอ token เดียว → สำเร็จ 1 คำขอ ที่เหลือ enroll-used/enroll-closed', win.length === 1 && lose.length === 3 && lose.every((x) => x.j.code === 'enroll-used' || x.j.code === 'enroll-closed'), C.map((x) => x.s + ':' + (x.j && x.j.code)).join(','));
  relaySecret = win[0] && win[0].j.secret;
  ok('token ถูก → ได้ค่าลับ 64 ตัว เก็บเป็น “รอตรวจ” (ยังไม่ใช้งานจนกว่าตรวจ /exec ผ่าน) และลบ token แล้ว', /^[0-9a-f]{64}$/.test(relaySecret || '') && M('relay_pending_secret') === relaySecret && M('relay_pending_url') === RELAY_URL && !M('relay_url') && !M('relay_enroll'));
  r = await ENR(TOK, RELAY_URL); ok('ใช้ token เดิมซ้ำหลังสำเร็จ → ปฏิเสธ และค่าลับที่รอตรวจไม่ถูกเขียนทับ', r.s === 403 && M('relay_pending_secret') === relaySecret);
  _reset(); r = await run('/api/stats', { cookie: U10 }, E); ok('ระหว่างรอตรวจ: ไฟล์ส่วนตัวยังเป็น relay-not-configured (ไม่ใช้ตัวกลางที่ยังไม่ผ่านการตรวจ)', r.j.errors.studentMoto === 'relay-not-configured');
  relayVer = 'r10'; r = await CONF(RELAY_URL); relayVer = 'r11';
  ok('[MOCK] ยืนยัน: Deploy เป็นโค้ดรุ่นเก่า → check-failed (ping outdated) ยังไม่ใช้งาน', r.s === 200 && r.j.ok === false && r.j.check.ping === 'outdated' && !M('relay_url'), JSON.stringify(r.j));
  relayHtml = true; r = await CONF(RELAY_URL); relayHtml = false;
  ok('[MOCK] ยืนยัน: /exec ตอบหน้า Login (ไม่ได้ตั้ง Anyone) → relay-login-required ยังไม่ใช้งาน', r.j.ok === false && r.j.check.ping === 'relay-login-required' && !M('relay_url'));
  r = await CONF('https://script.google.com/macros/s/MOCKNOTREGISTERED00000000001/exec'); ok('ยืนยัน URL ที่ไม่ได้ลงทะเบียน → 404 relay-unknown-url', r.s === 404 && r.j.code === 'relay-unknown-url');
  r = await CONF(RELAY_URL); ok('[MOCK] ยืนยันผ่านครบ (ตอบรุ่น r11 · อ่าน 2 ตาราง · อ่านภาพ GPS ตัวอย่าง) → เปิดใช้งาน', r.j.ok === true && r.j.promoted === true && r.j.check.tables.studentMoto === 'ok:5' && r.j.check.tables.ruenthai === 'ok:4' && r.j.check.image === 'ok' && M('relay_url') === RELAY_URL && M('relay_secret') === relaySecret && !M('relay_pending_secret'), JSON.stringify(r.j));
  ok('ผลยืนยันไม่มีข้อมูลจากแหล่ง (มีแต่สถานะ/จำนวน)', !/MR-1|RT-1|นักศึกษาสมมติ|ผู้ตอบสมมติ|TOKEN-SECRET/.test(JSON.stringify(r.j)));
  r = await CONF(RELAY_URL); ok('setup ซ้ำหลังติดตั้งสำเร็จ → ตรวจซ้ำ ไม่เปลี่ยนค่าลับ', r.j.ok === true && r.j.state === 'active' && !r.j.promoted && M('relay_secret') === relaySecret);
  // ลงทะเบียนตัวใหม่ (เช่น ย้ายบัญชี/Deploy ใหม่): ตัวเดิมต้องทำงานต่อจนกว่าตัวใหม่ผ่านการตรวจ
  const TOK2 = 'beef'.repeat(12), h2 = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(TOK2)))).map((b) => b.toString(16).padStart(2, '0')).join('');
  db._db.prepare("INSERT OR REPLACE INTO meta(k, v) VALUES('relay_enroll', ?)").run(JSON.stringify({ h: h2, exp: NOW - 1000 }));
  r = await ENR(TOK2, RELAY_URL2); ok('token หมดอายุ → 403 enroll-expired', r.s === 403 && r.j.code === 'enroll-expired');
  db._db.prepare("INSERT OR REPLACE INTO meta(k, v) VALUES('relay_enroll', ?)").run(JSON.stringify({ h: h2, exp: NOW + 864e5 }));
  r = await ENR(TOK2, RELAY_URL2); relaySecret2 = r.j.secret; relay2Down = true; const c2 = await CONF(RELAY_URL2);
  ok('[MOCK] ตัวใหม่ยังตรวจไม่ผ่าน → ตัวเดิม (URL/ค่าลับ) ยังใช้งานอยู่ ไม่ถูกเขียนทับ', r.s === 200 && c2.j.ok === false && M('relay_url') === RELAY_URL && M('relay_secret') === relaySecret);
  relay2Down = false; const verBefore = M('img_cache_ver') || '1'; const c3 = await CONF(RELAY_URL2);
  ok('[MOCK] ตัวใหม่ผ่านการตรวจ → สลับไปใช้ตัวใหม่ และเปลี่ยนรุ่นแคชภาพ', c3.j.promoted === true && M('relay_url') === RELAY_URL2 && M('relay_secret') === relaySecret2 && +M('img_cache_ver') === +verBefore + 1);
  // คืนค่าเป็นตัวแรกสำหรับการทดสอบถัดไป
  db._db.prepare("INSERT OR REPLACE INTO meta(k, v) VALUES('relay_url', ?)").run(RELAY_URL); db._db.prepare("INSERT OR REPLACE INTO meta(k, v) VALUES('relay_secret', ?)").run(relaySecret);
  { let rl = null; for (let i = 0; i < 25; i++) rl = await CONF(RELAY_URL, '10.20.7.8'); ok('ยืนยันถี่เกิน (20 ครั้ง/ชม./IP) → 429', rl.s === 429); }
  _reset(); r = await run('/api/stats', { cookie: U10 }, E); const sm = r.j.studentMoto, rt = r.j.ruenthai;
  ok('[MOCK] นักศึกษา–จยย.: 1 RefCode = 1 รายการ (ซ้ำนับครั้งเดียว · แถวไม่มี RefCode ไม่นับ)', !!sm && sm.registrations === 3 && sm.duplicateRefs === 1 && sm.rowsWithoutRef === 1, JSON.stringify(sm && { a: sm.registrations, d: sm.duplicateRefs, n: sm.rowsWithoutRef }));
  ok('[MOCK] นักศึกษา–จยย.: จำนวนรถตามที่กรอก แยกจากช่องทะเบียน และรายงานแถวไม่ตรง/ไม่กรอก', sm.vehiclesDeclared === 3 && sm.platesFilled === 4 && sm.rowsCountMismatch === 1 && sm.rowsNoCount === 1 && sm.byCampus['วิทยาเขตศาลายา'] === 2 && sm.byEngine['ไฟฟ้า'] === 1 && sm.range.from === '2026-07-06');
  ok('[MOCK] นักศึกษา–จยย.: ไม่ส่งชื่อ เบอร์ ทะเบียน หรือรหัสนักศึกษา', !/นักศึกษาสมมติ|0800000000|กข1234|6500000/.test(JSON.stringify(r.j)));
  ok('[MOCK] ตัวกลางถูกขอเฉพาะคอลัมน์ที่ใช้ + ทะเบียนเป็น “มี/ไม่มี” เท่านั้น', relayCalls.includes('table:studentMoto') && relayCalls.includes('table:ruenthai'));
  ok('[MOCK] เรือนไทย: 1 Ref_Code = 1 แบบสำรวจ · รถแยกจากแบบสำรวจ · กลุ่ม/ประเภทรถ/LPR (รวมไม่ระบุ)', !!rt && rt.surveys === 3 && rt.duplicateRefs === 1 && rt.carsDeclared === 5 && rt.byGroup['กลุ่มที่ 1: บุคลากรคณะ'] === 1 && rt.byCarType['รถกระบะ'] === 1 && rt.byLpr['(ไม่ระบุ)'] === 1 && rt.rowsCarMismatch === 1 && rt.daily.length === 3, JSON.stringify(rt && rt.byLpr));
  r = await run('/api/data?dataset=ruenthai', { cookie: U10 }, E);
  ok('[MOCK] เรือนไทย: รายการหลัง Login ไม่มีชื่อ เบอร์ อีเมล ทะเบียน Token หรือ Hash', r.s === 200 && r.j.rows.length === 4 && !/ผู้ตอบสมมติ|081111|example\.test|ทบ1111|TOKEN-SECRET|HASH1/.test(JSON.stringify(r.j)) && r.j.rows[1].carTypes.length === 2 && r.j.rows[1].plates === 2, JSON.stringify(r.j.rows[0]));
  r = await run('/api/data?dataset=ruenthai', {}, E); ok('เรือนไทย: รายการต้อง Login', r.s === 401);
  // ---- ผู้ช่วย AI ใช้ข้อมูลชุดเดียวกับหน้าเว็บ (รวมข้อมูลสดจากตัวกลาง) ----
  { const st = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/stats.json'), 'utf8')).modules.vehicleRegistration.rows, web = (await run('/api/stats', { cookie: U10 }, E)).j;
    const totWeb = Object.keys(st).reduce((a, k) => a + (k === 'นักศึกษา – รถจักรยานยนต์' ? web.studentMoto.registrations : st[k] || 0), 0);
    const ask = async (q, hist) => { NOW += 61e3; ENV.aiReply = 'รับทราบ'; const x = await run('/api/chat', { method: 'POST', cookie: U10, body: { action: 'chat', userMessage: q, chatHistory: hist || [] } }, E); return { r: x, sys: aiCalls[aiCalls.length - 1].input.messages[0].content }; };
    let q = await ask('นักศึกษาลงทะเบียนรถจักรยานยนต์กี่รายการ');
    ok('[MOCK AI] (1) นักศึกษา–จยย.: ข้อเท็จจริงมีจำนวนเดียวกับ /api/stats (' + web.studentMoto.registrations + ') + นิยาม + เวลาอ่านสดจริง', new RegExp('รายการลงทะเบียน ' + web.studentMoto.registrations + ' รายการ \\(1 RefCode').test(q.sys) && q.sys.includes('ข้อมูล ณ 15 พ.ย. 2569') && /อ่านสด/.test(q.sys) && q.r.j.live === true && q.r.j.liveTopics.indexOf('vehicle') >= 0, q.sys.split('\n').filter((l) => /ทะเบียน/.test(l)).join(' / ').slice(0, 400));
    q = await ask('ยอดลงทะเบียนยานพาหนะรวมทั้งหมดเท่าไร');
    ok('[MOCK AI] (2) ยอดลงทะเบียนรวม = ตัวเลขเดียวกับหน้าเว็บ (' + totWeb + ') และบอกว่ารวมตัวเลขต่างเวลา/ต่างนิยาม', q.sys.includes('รวม ' + totWeb.toLocaleString('en-US') + ' รายการ จาก 4 ประเภท') && /ต่างเวลา\/ต่างนิยาม/.test(q.sys));
    q = await ask('แบบสำรวจเรือนไทยมีกี่ฉบับ รถกี่คัน');
    ok('[MOCK AI] (3) เรือนไทย: แบบสำรวจ ' + web.ruenthai.surveys + ' ฉบับ และรถ ' + web.ruenthai.carsDeclared + ' คัน แยกนิยาม', q.sys.includes('แบบสำรวจที่ส่ง ' + web.ruenthai.surveys + ' ฉบับ') && q.sys.includes('รวม ' + web.ruenthai.carsDeclared + ' คัน — เป็นคนละหน่วยกับจำนวนแบบสำรวจ') && !/ผู้ตอบสมมติ|ทบ1111|TOKEN-SECRET/.test(q.sys));
    q = await ask('แยกตามกลุ่มให้หน่อย', [{ role: 'User', text: 'แบบสำรวจเรือนไทยมีกี่ฉบับ' }, { role: 'AI', text: 'มี ' + web.ruenthai.surveys + ' ฉบับ' }]);
    ok('[MOCK AI] (4) ถามต่อ “แยกตามกลุ่มให้หน่อย” → ส่งการแยกกลุ่มของเรือนไทยตามบทสนทนา', /กลุ่ม: กลุ่มที่ 2: บุคลากรส่วนงานอื่น 1, กลุ่มที่ 1: บุคลากรคณะ 1, กลุ่มที่ 3: อื่น ๆ 1/.test(q.sys) || /กลุ่ม: [^·]*กลุ่มที่ 1: บุคลากรคณะ 1/.test(q.sys), q.sys.split('\n').filter((l) => /เรือนไทย/.test(l)).join(' / ').slice(0, 300));
    NOW += 61e3; ENV.aiReply = 'มีรถเรือนไทยที่ติดตั้งกล้องแล้ว 4,321 คัน'; const fx = await run('/api/chat', { method: 'POST', cookie: U10, body: { action: 'chat', userMessage: 'รถเรือนไทยติดกล้องแล้วกี่คัน', chatHistory: [] } }, E);
    ok('[MOCK AI] (5) คำตอบมีตัวเลขที่ไม่มีในข้อมูล → ไม่ส่งออก (ไม่แต่งตัวเลข)', fx.j.verified === false && !/4,321/.test(fx.j.reply));
    const keep2 = relaySecret; relaySecret = 'wrong'; _reset(); q = await ask('แบบสำรวจเรือนไทยมีกี่ฉบับ'); relaySecret = keep2; _reset();
    ok('[MOCK AI] ตัวกลางอ่านไม่ได้ → ใช้ไฟล์สรุปพร้อมระบุ “ไม่ใช่ข้อมูลสด” + สาเหตุ + วันที่ของไฟล์ ไม่ระบุเวลาอ่านเป็นตอนนี้', /ลานจอดรถเรือนไทย \(ไฟล์สรุป ไม่ใช่ข้อมูลสด — อ่านสดไม่สำเร็จ: ค่าลับของตัวกลางไม่ตรง\)/.test(q.sys) && /ข้อมูล ณ 15 พ\.ย\. 2569 11:40 น\./.test(q.sys) && q.r.j.liveTopics.indexOf('ruenthai') < 0, q.sys.split('\n').filter((l) => /เรือนไทย/.test(l)).join(' / ').slice(0, 300));
    ENV.aiReply = ''; }
  r = await run('/api/img?id=' + PRIV + '&w=800', { cookie: U10 }, E); ok('[MOCK] ภาพส่วนตัว + มีตัวกลาง → ได้ภาพจริง (image/jpeg) ผ่านตัวกลาง · รองรับขนาด 800', r.s === 200 && r.h.get('content-type') === 'image/jpeg' && r.h.get('x-img-via') === 'relay' && relayCalls.includes('img:' + PRIV));
  r = await run('/api/img?id=' + IMG1 + '&w=1600', { cookie: U10 }, E); ok('ภาพที่แชร์ลิงก์ยังอ่านทางเดิม (ไม่ผ่านตัวกลาง)', r.s === 200 && r.h.get('x-img-via') === 'public');
  r = await run('/api/img?id=' + PRIV + '&w=800', {}, E); ok('ภาพผ่านตัวกลางยังต้อง Login', r.s === 401);
  relayHtml = true; _reset(); r = await run('/api/sources', { cookie: U10 }, E); relayHtml = false;
  ok('[MOCK] ตัวกลางตอบหน้า Login ของ Google (ไม่ได้ Deploy แบบ Anyone) → relay-login-required', r.j.sources.ruenthai.code === 'relay-login-required', JSON.stringify(r.j.sources.ruenthai));
  const keep = relaySecret; relaySecret = 'x'; _reset(); r = await run('/api/sources', { cookie: U10 }, E); relaySecret = keep;
  ok('[MOCK] ค่าลับไม่ตรง → relay-forbidden (ไม่เดาข้อมูล)', r.j.sources.studentMoto.code === 'relay-forbidden');
  _reset(); r = await run('/api/sources', { cookie: U10 }, E);
  ok('[MOCK] /api/sources แยกสถานะ: ตั้งค่าแล้ว · ตอบได้ · อ่านแต่ละตาราง · อ่านภาพที่อนุญาต', r.j.relay.configured === true && r.j.relay.check.ping === 'ok' && r.j.relay.check.tables.ruenthai === 'ok:4' && r.j.relay.check.image === 'ok' && !JSON.stringify(r.j).includes(relaySecret), JSON.stringify(r.j.relay));
  // แคชภาพ: ETag/304 ต้องผ่าน session ก่อน · รุ่นแคชเปลี่ยนเมื่อเปลี่ยนตัวกลาง
  r = await run('/api/img?id=' + PRIV + '&w=400', { cookie: U10 }, E); const et = r.h.get('etag');
  ok('ภาพมี ETag ผูกรุ่นแคช และ cache-control: private, no-cache (เบราว์เซอร์ต้องถามบริการทุกครั้ง)', /^"[-\w]+-400-v\d+"$/.test(et || '') && r.h.get('cache-control') === 'private, no-cache');
  const r304 = await run('/api/img?id=' + PRIV + '&w=400', { cookie: U10, inm: et }, E); ok('มี session + ETag ตรง → 304 (ใช้แคชได้)', r304.s === 304);
  const rOut = await run('/api/img?id=' + PRIV + '&w=400', { inm: et }, E); ok('ออกจากระบบแล้ว แม้เบราว์เซอร์มีแคช (ETag ตรง) → 401 ไม่ได้ภาพ', rOut.s === 401);
  db._db.prepare("UPDATE meta SET v = CAST(v AS INTEGER) + 1 WHERE k = 'img_cache_ver'").run(); _reset();
  const rNew = await run('/api/img?id=' + PRIV + '&w=400', { cookie: U10, inm: et }, E); ok('เปลี่ยนรุ่นแคช (ถอน/เปลี่ยนตัวกลาง) → ETag เดิมใช้ไม่ได้ ต้องอ่านใหม่', rNew.s === 200 && rNew.h.get('etag') !== et);
  r = await run('/api/img?id=' + IMG1.slice(0, 5) + 'ZZZZZZZZZZZZZZZZZZZZ&w=400', { cookie: U10 }, E); ok('ภาพที่ไม่อยู่ในรายการที่ระบบรู้จัก → 404 unknown-image (ไม่ส่งต่อให้ตัวกลาง)', r.s === 404 && r.j.code === 'unknown-image');
  db._db.prepare('INSERT OR IGNORE INTO imgids(id, at) VALUES(?, ?)').run('MOCKOUTSIDEFOLDERPHOTO000001', 1);
  r = await run('/api/img?id=MOCKOUTSIDEFOLDERPHOTO000001&w=400', { cookie: U10 }, E); ok('[MOCK] ภาพนอกโฟลเดอร์ที่อนุญาต → 502 image-not-allowed (ไม่ใช่ “ไม่มีรูปภาพ”)', r.s === 502 && r.j.code === 'image-not-allowed', JSON.stringify(r.j));
  // แยกเส้นทาง: HubData เดิม (HUB_GS_URL) ไม่รับไฟล์ส่วนตัว และ HubRelay ไม่รับข้อมูลเวร/Login/เหตุการณ์
  { const calls0 = relayCalls.length; const E2 = ENV({ SHEET_VEH_STUDENT: 'MOCKVEH', SHEET_RUENTHAI: 'MOCKRT', HUB_GS_URL: HUBDATA_URL, HUB_SHARED_SECRET: 'z'.repeat(40) }); _reset();
    const lg = { r: await run('/api/login', { method: 'POST', body: { code: '0123' }, ip: '10.20.6.6' }, E2) }; lg.cookie = (lg.r.h.get('set-cookie') || '').split(';')[0]; r = await run('/api/stats', { cookie: lg.cookie }, E2);
    const tbl = relayCalls.slice(calls0).filter((x) => /^table:/.test(x));
    ok('[MOCK] ตั้ง HUB_GS_URL ไว้: Login ผ่าน HubData เดิม · HubRelay ถูกขอเฉพาะ 2 ตารางส่วนตัว · HubData ไม่ถูกขอไฟล์ส่วนตัว', lg.r.s === 200 && hubDataCalls.includes('staff') && hubDataCalls.includes('incidents') && !hubDataCalls.some((x) => x === 'studentMoto' || x === 'ruenthai') && tbl.length > 0 && tbl.every((x) => x === 'table:studentMoto' || x === 'table:ruenthai') && !!r.j.studentMoto && !!r.j.incidents, tbl.join(',') + ' | ' + hubDataCalls.join(','));
  }
  relaySecret = null; _reset(); r = await run('/api/stats', { cookie: U10 }, E); relaySecret = keep;
  ok('[MOCK] ไม่มีค่าลับ (สคริปต์ยังไม่ได้ค่าลับ) → relay-forbidden ไม่มีตัวเลข', r.j.errors.studentMoto === 'relay-forbidden' && !r.j.studentMoto);
  _reset(); }
console.log('รวม ' + n + ' ข้อ · ไม่ผ่าน ' + fails + ' (ทั้งหมดเป็นการทดสอบ local ด้วยของจำลอง)'); process.exit(fails ? 1 : 0);
