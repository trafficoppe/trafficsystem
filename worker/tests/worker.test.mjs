// worker/tests/worker.test.mjs — ทดสอบบริการกลางแบบ local: node worker/tests/worker.test.mjs
// ทุกอย่างเป็นของจำลอง: D1 = SQLite ในหน่วยความจำ · Google Sheets/Drive/GitHub/Workers AI = MOCK · รหัสพนักงานและชื่อเป็นค่าสมมติ
// ผลที่ผ่านพิสูจน์ตรรกะของโค้ดเท่านั้น ไม่ได้พิสูจน์ว่าบริการที่ Deploy แล้วทำงานกับแหล่งจริง
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { handle, SCHEMA, _reset, parseCsv, parseCidrs, ipNum, normDT, persons, SOURCES, _stat, _coldIsolate, _coldImg, awAggregate, awNotes, WORKER_REV } from '../src/index.js';
import { awRowsBase, gvizBody, AW_HEAD } from './aw_fixture.mjs';
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
let relaySecret = null, relayHtml = false, relayVer = 'r13', relaySecret2 = null, relay2Down = false; const relayCalls = [];
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
let csvDelay = 0, downGid = '', bodyFailGid = '', AW_ROWS = awRowsBase(), awDown = false, awCalls = 0; const csvCalls = [], thumbCalls = [];
const fetchMock = async (u, o) => { u = String(u);
  let m = /docs\.google\.com\/spreadsheets\/d\/([\w-]+)\/export\?format=csv&gid=(\d+)/.exec(u);
  // รอบ 13: Sheet อีกชุด (MOCKLF2 = ตั้งค่าใหม่) มีข้อมูลต่างจากชุดเดิม 1 แถว
  if (m) { const sid = m[1]; m = [m[0], m[2]]; csvCalls.push(m[1]);
    if (sid === 'MOCKLF2' && m[1] === '1811117659') { if (csvDelay) await new Promise((r) => setTimeout(r, csvDelay)); return new Response(csv(SHEETS[m[1]].concat([['2026-11-15', 'พ.ศ. 2569', 'พบสิ่งของ', 'FND-MOCK-9', 'รอดำเนินการ']])), { headers: { 'content-type': 'text/csv; charset=utf-8' } }); }
    if (bodyFailGid === m[1]) return new Response(new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('a,b\n')); c.error(new DOMException('The operation timed out.', 'TimeoutError')); } }), { headers: { 'content-type': 'text/csv; charset=utf-8' } });      // รอบ 14.1: หัวตอบแล้วแต่เนื้อหาขาดกลางทาง
    if (csvDelay) await new Promise((r) => setTimeout(r, csvDelay)); if (sourceDown || downGid === m[1]) return new Response('<html>Sign in</html>', { status: 200, headers: { 'content-type': 'text/html' } }); return SHEETS[m[1]] ? new Response(csv(SHEETS[m[1]]), { headers: { 'content-type': 'text/csv; charset=utf-8' } }) : new Response('', { status: 404 }); }
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
  if (/docs\.google\.com\/spreadsheets\/d\/MOCKAW\/gviz\/tq\?tqx=out:json&headers=1&gid=0&tq=/.test(u)) { awCalls++; if (awDown) throw new TypeError('fetch failed'); return new Response(gvizBody(AW_ROWS), { headers: { 'content-type': 'application/javascript; charset=utf-8' } }); }      // รอบ 14.3
  m = /drive\.google\.com\/thumbnail\?id=([\w-]+)&sz=w(\d+)/.exec(u);
  if (m) thumbCalls.push(m[1]);
  if (m) return m[1] === IMG1 || m[1] === IMG2 || /^MOCKAREA/.test(m[1]) ? new Response(new Uint8Array([137, 80, 78, 71]), { headers: { 'content-type': 'image/png' } }) : new Response('<html>', { headers: { 'content-type': 'text/html' } });
  return new Response('', { status: 404 }); };
let NOW = Date.parse('2026-11-15T19:00:00+07:00');
const deps = { fetch: fetchMock, now: () => NOW };
const ENV = (o = {}) => Object.assign({ DB: db, ASSET_REF: '7c183a7', ADMIN_CODES: '4567', SHEET_MAIN: 'MOCKMAIN', SHEET_LF: 'MOCKLF', SHEET_OPS: 'MOCKOPS', SHEET_EVENTS: 'MOCKEV', SHEET_GPS: 'MOCKGPS', SHEET_ANYWHEEL: 'MOCKAW', AI_MODEL: '@cf/mock/model',
  AI: { run: async (model, input) => { aiCalls.push({ model, input }); if (ENV.aiThrow) throw new Error(ENV.aiThrow); return { response: ENV.aiReply || 'เดือน พ.ย. 2569 มีเหตุการณ์รวม 3 เหตุการณ์ (ข้อมูล ณ 15 พ.ย. 2569 19:00 น.)' }; } } }, o);
let db = d1();
const req = (p, o = {}) => new Request('https://hub.example.test' + p, { method: o.method || 'GET', headers: Object.assign({ 'CF-Connecting-IP': o.ip || '10.20.5.9' }, o.cookie ? { Cookie: o.cookie } : {}, o.origin ? { Origin: o.origin } : {}, o.inm ? { 'If-None-Match': o.inm } : {}, o.ray ? { 'cf-ray': o.ray } : {}, o.body ? { 'content-type': 'application/json' } : {}), body: o.body ? JSON.stringify(o.body) : undefined });
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
  relayVer = 'r10'; r = await CONF(RELAY_URL); relayVer = 'r13';
  { relayVer = 'r12'; const o = await CONF(RELAY_URL); relayVer = 'r13'; ok('[รอบ 13·F] ตัวกลางยังเป็นรุ่น r12 (มีปัญหาจำผลตรวจผิด) → outdated ไม่รับทุกรุ่น', o.j.ok === false && o.j.check.ping === 'outdated', JSON.stringify(o.j.check)); }
  ok('[MOCK] ยืนยัน: Deploy เป็นโค้ดรุ่นเก่า → check-failed (ping outdated) ยังไม่ใช้งาน', r.s === 200 && r.j.ok === false && r.j.check.ping === 'outdated' && !M('relay_url'), JSON.stringify(r.j));
  relayHtml = true; r = await CONF(RELAY_URL); relayHtml = false;
  ok('[MOCK] ยืนยัน: /exec ตอบหน้า Login (ไม่ได้ตั้ง Anyone) → relay-login-required ยังไม่ใช้งาน', r.j.ok === false && r.j.check.ping === 'relay-login-required' && !M('relay_url'));
  r = await CONF('https://script.google.com/macros/s/MOCKNOTREGISTERED00000000001/exec'); ok('ยืนยัน URL ที่ไม่ได้ลงทะเบียน → 404 relay-unknown-url', r.s === 404 && r.j.code === 'relay-unknown-url');
  r = await CONF(RELAY_URL); ok('[MOCK] ยืนยันผ่านครบ (ตอบรุ่น r13 · อ่าน 2 ตาราง · อ่านภาพ GPS ตัวอย่าง) → เปิดใช้งาน', r.j.ok === true && r.j.promoted === true && r.j.check.tables.studentMoto === 'ok:5' && r.j.check.tables.ruenthai === 'ok:4' && r.j.check.image === 'ok' && M('relay_url') === RELAY_URL && M('relay_secret') === relaySecret && !M('relay_pending_secret'), JSON.stringify(r.j));
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
    ok('[MOCK AI] (4) ถามต่อ “แยกตามกลุ่มให้หน่อย” → ส่งการแยกกลุ่มของเรือนไทยตามบทสนทนา', /กลุ่ม: [^·]*กลุ่มที่ 1: บุคลากรคณะ 1 ฉบับ/.test(q.sys) && /สถานะกล้อง LPR \(บันทึกต่อแบบสำรวจ จึงนับเป็นฉบับ ไม่ใช่คัน\)/.test(q.sys), q.sys.split('\n').filter((l) => /เรือนไทย/.test(l)).join(' / ').slice(0, 300));
    NOW += 61e3; ENV.aiReply = 'มีรถเรือนไทยที่ติดตั้งกล้องแล้ว 4,321 คัน'; const fx = await run('/api/chat', { method: 'POST', cookie: U10, body: { action: 'chat', userMessage: 'รถเรือนไทยติดกล้องแล้วกี่คัน', chatHistory: [] } }, E);
    ok('[MOCK AI] (5) คำตอบมีตัวเลขที่ไม่มีในข้อมูล → ไม่ส่งออก (ไม่แต่งตัวเลข)', fx.j.verified === false && !/4,321/.test(fx.j.reply));
    const keep2 = relaySecret; relaySecret = 'wrong'; _reset(); q = await ask('แบบสำรวจเรือนไทยมีกี่ฉบับ');
    { const tot = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/extra.json'), 'utf8')).ruenthaiSurvey.total; NOW += 61e3; ENV.aiReply = 'แบบสำรวจเรือนไทย ' + tot + ' ฉบับ'; const sx = await run('/api/chat', { method: 'POST', cookie: U10, body: { action: 'chat', userMessage: 'แบบสำรวจเรือนไทยมีกี่ฉบับ', chatHistory: [] } }, E);
      ok('[MOCK AI] คำตอบที่ใช้ไฟล์สรุป → ผลตอบระบุ snapshot (หน้าเว็บแสดง “จากไฟล์สรุป (ไม่ใช่ข้อมูลสด)”) และ live=false', sx.j.verified === true && sx.j.live === false && sx.j.snapshot.indexOf('แบบสำรวจลานจอดรถเรือนไทย') >= 0, JSON.stringify(sx.j).slice(0, 300)); }
    relaySecret = keep2; _reset();
    ok('[MOCK AI] ตัวกลางอ่านไม่ได้ → ใช้ไฟล์สรุปพร้อมระบุ “ไม่ใช่ข้อมูลสด” + สาเหตุ + วันที่ของไฟล์ ไม่ระบุเวลาอ่านเป็นตอนนี้', /ลานจอดรถเรือนไทย \(ไฟล์สรุป ไม่ใช่ข้อมูลสด — อ่านสดไม่สำเร็จ: ค่าลับของตัวกลางไม่ตรง\)/.test(q.sys) && /ข้อมูล ณ 15 พ\.ย\. 2569 11:40 น\./.test(q.sys) && q.r.j.liveTopics.indexOf('ruenthai') < 0 && /ไฟล์สรุป ไม่ใช่ข้อมูลสด/.test(q.sys), q.sys.split('\n').filter((l) => /เรือนไทย/.test(l)).join(' / ').slice(0, 300));
    ENV.aiReply = ''; }
  r = await run('/api/img?id=' + PRIV + '&w=800', { cookie: U10 }, E); ok('[MOCK] ภาพส่วนตัว + มีตัวกลาง → ได้ภาพจริง (image/jpeg) ผ่านตัวกลาง · รองรับขนาด 800', r.s === 200 && r.h.get('content-type') === 'image/jpeg' && r.h.get('x-img-via') === 'relay' && relayCalls.includes('img:' + PRIV));
  r = await run('/api/img?id=' + IMG1 + '&w=1600', { cookie: U10 }, E); ok('ภาพที่แชร์ลิงก์ยังอ่านทางเดิม (ไม่ผ่านตัวกลาง)', r.s === 200 && r.h.get('x-img-via') === 'public');
  r = await run('/api/img?id=' + PRIV + '&w=800', {}, E); ok('ภาพผ่านตัวกลางยังต้อง Login', r.s === 401);
  relayHtml = true; _reset(); r = await run('/api/sources', { cookie: U10 }, E); relayHtml = false;
  ok('[MOCK] ตัวกลางตอบหน้า Login ของ Google (ไม่ได้ Deploy แบบ Anyone) → relay-login-required', r.j.sources.ruenthai.code === 'relay-login-required', JSON.stringify(r.j.sources.ruenthai));
  const keep = relaySecret; relaySecret = 'x'; _reset(); r = await run('/api/sources', { cookie: U10 }, E); relaySecret = keep;
  ok('[MOCK] ค่าลับไม่ตรง → relay-forbidden (ไม่เดาข้อมูล)', r.j.sources.studentMoto.code === 'relay-forbidden');
  _reset(); r = await run('/api/sources?deep=1', { cookie: U10 }, E);
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
  // ================= รอบ 12: ความเร็ว (อ่านพร้อมกัน · รวมคำขอ · scope · แคชผลรวม · ภาพส่วนตัวไปตัวกลางก่อน) =================
  { _reset(); const cache = new Map(), depsC = { fetch: fetchMock, now: () => NOW, cache: { match: async (k) => { const v = cache.get(k.url || String(k)); return v ? v.clone() : undefined; }, put: async (k, v) => { cache.set(k.url || String(k), v.clone()); } } };
    const runC = async (p, o = {}, env = E) => { const x = await handle(req(p, o), env, depsC); const ct = x.headers.get('content-type') || ''; return { s: x.status, j: /json/.test(ct) ? await x.json() : null, h: x.headers }; };
    const gidOf = (k) => SOURCES(E)[k][1], c0 = csvCalls.length, nCsv = (k) => csvCalls.slice(c0).filter((g) => g === gidOf(k)).length;
    csvDelay = 40; const t0 = Date.now(); const [a, b2, c2] = await Promise.all([runC('/api/stats', { cookie: U10 }), runC('/api/stats', { cookie: U10 }), runC('/api/stats?scope=core', { cookie: U10 })]); const dt = Date.now() - t0; csvDelay = 0;
    ok('[รอบ 12] 3 คำขอพร้อมกัน → อ่านต้นทางแต่ละแหล่งครั้งเดียว (รวมคำขอที่กำลังอ่านอยู่)', ['incidents', 'lostfound', 'lfYear', 'gate'].every((k) => nCsv(k) === 1) && _stat.reads.studentMoto === 1 && _stat.reads.ruenthai === 1 && a.j.incidents.total === b2.j.incidents.total && !!c2.j.gate, JSON.stringify(_stat.reads));
    ok('[รอบ 12] อ่าน 4 แหล่ง (แหล่งละ 40 ms) พร้อมกัน ไม่ต่อคิว (< 3 เท่าของแหล่งเดียว)', dt < 120, dt + ' ms');
    ok('[รอบ 12] scope=core ไม่มีชุดส่วนตัว · scope=private มีเฉพาะชุดส่วนตัว · scope ไม่อยู่ในรายการ → 400 · ไม่มี session → 401', !c2.j.studentMoto && !c2.j.ruenthai && c2.j.scope === 'core' && (await runC('/api/stats?scope=private', { cookie: U10 })).j.ruenthai.surveys === a.j.ruenthai.surveys && !(await runC('/api/stats?scope=private', { cookie: U10 })).j.incidents && (await runC('/api/stats?scope=../x', { cookie: U10 })).s === 400 && (await runC('/api/stats?scope=core')).s === 401);
    ok('[รอบ 12] sourceReadAt แยกจาก checkedAt: มีเวลาอ่านต้นทางทุกชุด', ['incidents', 'lostfound', 'lostfoundYear', 'gate', 'studentMoto', 'ruenthai'].every((k) => /^\d{4}-\d\d-\d\d \d\d:\d\d$/.test(a.j.sourceReadAt[k])), JSON.stringify(a.j.sourceReadAt));
    // เครื่องรับคำขอใหม่ (ไม่มีตารางในหน่วยความจำ) ภายใน 2 นาที → ใช้ผลรวมที่แคชไว้ ไม่อ่านต้นทางซ้ำ และเวลาอ่านต้นทางยังเป็นเวลาเดิม
    const readAt0 = a.j.sourceReadAt.gate; NOW += 90e3; _coldIsolate(); const c1 = csvCalls.length, rel1 = relayCalls.length; let h = await runC('/api/stats', { cookie: U10 });
    ok('[รอบ 12] แคชผลรวม: เครื่องใหม่ภายใน 2 นาที ไม่อ่านต้นทางซ้ำ · sourceReadAt คงเป็นเวลาอ่านจริง (ไม่ใช่เวลาตอบ) · checkedAt เป็นเวลาตอบ', csvCalls.length === c1 && relayCalls.length === rel1 && h.j.sourceReadAt.gate === readAt0 && h.j.checkedAt !== a.j.checkedAt && h.j.incidents.total === a.j.incidents.total && h.j.studentMoto.registrations === a.j.studentMoto.registrations, h.j.sourceReadAt.gate + ' / ' + h.j.checkedAt);
    ok('[รอบ 12] แคชผลรวม: ไม่มี session → 401 แม้มีแคช', (await runC('/api/stats')).s === 401);
    NOW += 40e3; _coldIsolate(); const c3 = csvCalls.length; h = await runC('/api/stats?scope=core', { cookie: U10 });
    ok('[รอบ 12] แคชผลรวมหมดอายุ (เกิน 2 นาทีจากเวลาอ่านต้นทาง) → อ่านต้นทางใหม่ และ sourceReadAt เปลี่ยน', csvCalls.length === c3 + 4 && h.j.sourceReadAt.gate !== readAt0, (csvCalls.length - c3) + ' ' + h.j.sourceReadAt.gate);
    _coldIsolate(); const c4 = csvCalls.length; h = await handle(req('/api/stats?scope=core', { cookie: U10 }), Object.assign({}, E, { SHEET_LF: 'MOCKLF2' }), depsC).then((x) => x.json());
    ok('[รอบ 12] เปลี่ยนการตั้งค่าแหล่งข้อมูล → ไม่ใช้แคชของชุดเดิม (คีย์ผูกกับแหล่ง/รุ่น/ตัวกลาง)', csvCalls.length === c4 + 4, String(csvCalls.length - c4));
    // แหล่งหนึ่งล้ม: ชุดอื่นยังมา ไม่กลายเป็น 0 · แก้แล้วอ่านได้ (ไม่มี Promise ค้าง)
    _reset(); downGid = gidOf('gate'); h = await runC('/api/stats', { cookie: U10 });
    ok('[รอบ 12] แหล่งรถเข้าอ่านไม่ได้ → errors.gate มีสาเหตุ ไม่มีค่า gate (ไม่ใช่ 0) · เหตุการณ์/L&F/ชุดส่วนตัวยังมา', h.j.errors.gate === 'source-private' && h.j.gate === undefined && !!h.j.incidents && !!h.j.lostfoundDaily && !!h.j.studentMoto && !h.j.sourceReadAt.gate, JSON.stringify(h.j.errors));
    downGid = ''; h = await runC('/api/stats?scope=core', { cookie: U10 }); ok('[รอบ 12] แหล่งกลับมา → คำขอถัดไปอ่านได้ทันที (ความล้มเหลวไม่ถูกแคช และไม่ค้าง)', !!h.j.gate && !h.j.errors.gate);
    // สถานะแหล่งข้อมูล: ปกติไม่ตรวจลึก
    _reset(); const rl0 = relayCalls.length; h = await runC('/api/sources', { cookie: U10 }); const calls = relayCalls.slice(rl0);
    ok('[รอบ 12] /api/sources ปกติ: ไม่ ping/ไม่ดึงภาพ/ไม่อ่านตารางส่วนตัวซ้ำ (อ่านตารางละครั้ง) · บอกว่ายังไม่ได้ตรวจภาพ', calls.length === 2 && calls.every((x) => /^table:/.test(x)) && h.j.relay.check.shallow === true && h.j.relay.check.image === 'not-checked' && h.j.relay.check.tables.ruenthai === 'ok:4', calls.join(','));
    const rl1 = relayCalls.length; h = await runC('/api/sources?deep=1', { cookie: U10 }); ok('[รอบ 12] /api/sources?deep=1: ตรวจลึก (ping + ตาราง + ภาพ) และจำผลพร้อมเวลา', relayCalls.slice(rl1).some((x) => x === 'ping:') && h.j.relay.check.image === 'ok' && !!h.j.relay.check.at && (await runC('/api/sources', { cookie: U10 })).j.relay.check.lastDeep.image === 'ok');
    // ภาพ: p=1 ไปตัวกลางก่อน
    _reset(); await runC('/api/data?dataset=gps', { cookie: U10 }); const th0 = thumbCalls.length; h = await runC('/api/img?id=' + PRIV + '&w=400&p=1', { cookie: U10 });
    ok('[รอบ 12] ภาพ GPS (p=1): ไปตัวกลางก่อน ไม่ลองลิงก์สาธารณะ', h.s === 200 && h.h.get('x-img-via') === 'relay' && thumbCalls.length === th0, h.s + ' ' + h.h.get('x-img-via'));
    const rl2 = relayCalls.length; h = await runC('/api/img?id=' + PRIV + '&w=400&p=1', { cookie: U10 }); ok('[รอบ 12] เรียกซ้ำ → จากแคช ไม่เรียกตัวกลาง · ไม่มี session → 401 แม้มีแคช · รหัสภาพที่ไม่รู้จัก + p=1 → 404', h.h.get('x-img-via') === 'cache' && relayCalls.length === rl2 && (await runC('/api/img?id=' + PRIV + '&w=400&p=1')).s === 401 && (await runC('/api/img?id=ZZZZZZZZZZZZZZZZZZZZZZZZZZ&w=400&p=1', { cookie: U10 })).s === 404);
    { _reset(); await runC('/api/data?dataset=gps', { cookie: U10 }); const wu = [], depsW = Object.assign({}, depsC, { waitUntil: (p) => wu.push(p) }); const rl3 = relayCalls.length;
      const [x1, x2] = await Promise.all([handle(req('/api/img?id=' + PRIV + '&w=800&p=1', { cookie: U10 }), E, depsW), handle(req('/api/img?id=' + PRIV + '&w=800&p=1', { cookie: U10 }), E, depsW)]);
      const b1 = new Uint8Array(await x1.arrayBuffer()), b2 = new Uint8Array(await x2.arrayBuffer());
      ok('[รอบ 12] ภาพเดียวกัน 2 คำขอพร้อมกัน → เรียกตัวกลางครั้งเดียว ได้ภาพครบทั้งสอง · งานโหลดผูก waitUntil', x1.status === 200 && x2.status === 200 && relayCalls.slice(rl3).filter((c) => /^img:/.test(c)).length === 1 && b1.length > 0 && b1.length === b2.length && wu.length === 1, relayCalls.slice(rl3).join(',') + ' wu=' + wu.length); }
    h = await runC('/api/img?id=' + IMG1 + '&w=400&p=1', { cookie: U10 }); ok('[รอบ 12] p=1 กับภาพที่ตัวกลางไม่อนุญาตแต่เป็นภาพสาธารณะ → ใช้ลิงก์สาธารณะตามเดิม (p=1 ไม่เปิดสิทธิ์เพิ่ม)', h.s === 200 && h.h.get('x-img-via') === 'public');
  }
  // ================= รอบ 13 =================
  { _reset(); const cache = new Map(), depsC = { fetch: fetchMock, now: () => NOW, cache: { match: async (k) => { const v = cache.get(k.url || String(k)); return v ? v.clone() : undefined; }, put: async (k, v) => { cache.set(k.url || String(k), v.clone()); } } };
    const runC = async (p, o = {}, env = E) => { const x = await handle(req(p, o), env, depsC); const ct = x.headers.get('content-type') || ''; return { s: x.status, j: /json/.test(ct) ? await x.json() : null, h: x.headers }; };
    // A: เวลาอ่านต้นทางจริงต้องเหมือนกันในทุก field (ไม่ใช่เวลาตอบคำขอ) ทั้งเมื่อใช้ตารางในหน่วยความจำ (เครื่องเดิม) และแคชผลรวม
    const a1 = await runC('/api/stats', { cookie: U10 }); NOW += 70e3; const a2 = await runC('/api/stats', { cookie: U10 });
    const rd = a1.j.sourceReadAt;
    ok('[รอบ 13·A] เครื่องเดิม ภายใน TTL: checkedAt (เวลาตอบ) เปลี่ยน แต่ sourceReadAt คงเดิม', a2.j.checkedAt !== a1.j.checkedAt && Object.keys(rd).length === 7 && Object.keys(rd).every((k) => a2.j.sourceReadAt[k] === rd[k]), a1.j.checkedAt + ' → ' + a2.j.checkedAt + ' ' + JSON.stringify(a2.j.sourceReadAt));
    ok('[รอบ 13·A] เวลาในชุดข้อมูลแต่ละส่วน = เวลาอ่านต้นทางของส่วนนั้น (ไม่ใช่เวลาตอบ) แม้คำขอที่ 2 มาจากหน่วยความจำ', a2.j.incidentsDaily.checkedAt === rd.incidents && a2.j.lostfoundDaily.checkedAt === rd.lostfound && a2.j.lostfound.readAt === rd.lostfoundYear && a2.j.gate.readAt === rd.gate && a2.j.studentMoto.checkedAt === rd.studentMoto && a2.j.ruenthai.checkedAt === rd.ruenthai, JSON.stringify([a2.j.incidentsDaily.checkedAt, a2.j.lostfoundDaily.checkedAt, a2.j.lostfound.readAt, a2.j.gate.readAt, a2.j.checkedAt]));
    { const dT = (d) => +d.slice(8, 10) + ' พ.ย. ' + (+d.slice(0, 4) + 543) + ' ' + d.slice(11, 16) + ' น.'; const n0 = aiCalls.length; await runC('/api/chat', { method: 'POST', cookie: U10, body: Q }); const sys = (aiCalls[n0] || { input: { messages: [{ content: '' }] } }).input.messages[0].content;
      ok('[รอบ 13·A] ข้อเท็จจริงที่ส่ง AI: “ข้อมูล ณ” = เวลาอ่านต้นทางจริง ไม่ใช่เวลาตอบคำขอ (คำขอนี้ตอบ ' + a2.j.checkedAt.slice(11) + ' แต่อ่านต้นทาง ' + rd.incidents.slice(11) + ')', a2.j.checkedAt !== rd.incidents && sys.includes(dT(rd.incidents)) && !sys.includes(dT(a2.j.checkedAt)), sys.split('\n').filter((l) => /เหตุการณ์/.test(l)).join(' / ').slice(0, 300)); }
    NOW += 60e3; const a3 = await runC('/api/stats', { cookie: U10 });
    ok('[รอบ 13·A] หลัง TTL → อ่านต้นทางใหม่ เวลาอ่านจริงเปลี่ยน และ field ในชุดข้อมูลเปลี่ยนตาม', a3.j.sourceReadAt.gate !== rd.gate && a3.j.gate.readAt === a3.j.sourceReadAt.gate && a3.j.incidentsDaily.checkedAt === a3.j.sourceReadAt.incidents, JSON.stringify(a3.j.sourceReadAt));
    // E: เปลี่ยนการตั้งค่าแหล่ง (env) บนเครื่องเดิม (ไม่ล้างหน่วยความจำ) → ต้องไม่ได้ข้อมูลของการตั้งค่าเดิม
    const E2 = Object.assign({}, E, { SHEET_LF: 'MOCKLF2' }), base = a3.j.lostfound.total;
    const d1 = await runC('/api/data?dataset=lostfound', { cookie: U10 }); const e1 = await runC('/api/stats?scope=core', { cookie: U10 }, E2);
    ok('[รอบ 13·E] เปลี่ยน env ของแหล่ง (เครื่องเดิม ไม่ล้าง memo) → อ่านแหล่งตามค่าตั้งใหม่ทันที', e1.j.lostfound.total === base + 1, base + ' → ' + e1.j.lostfound.total);
    const e2 = await runC('/api/stats?scope=core', { cookie: U10 }); ok('[รอบ 13·E] กลับไปค่าตั้งเดิม → ได้ข้อมูลของค่าตั้งเดิม (ไม่ปนกัน)', e2.j.lostfound.total === base && d1.s === 200, String(e2.j.lostfound.total));
    // E: งานอ่านของค่าตั้งเดิมที่ยังค้าง จบหลังเปลี่ยนค่าตั้ง → ห้ามทับข้อมูลของค่าตั้งใหม่
    NOW += 200e3; csvDelay = 60; const old = runC('/api/stats?scope=core', { cookie: U10 }); await new Promise((r) => setTimeout(r, 5)); csvDelay = 0;
    const nw = await runC('/api/stats?scope=core', { cookie: U10 }, E2); const oldR = await old; const c0 = csvCalls.length; const nw2 = await runC('/api/stats?scope=core', { cookie: U10 }, E2);
    ok('[รอบ 13·E] งานอ่านเดิมที่จบทีหลัง ไม่ทับผลของค่าตั้งใหม่ · ค่าตั้งใหม่ใช้ memo ของตัวเอง (ไม่อ่านซ้ำ)', oldR.j.lostfound.total === base && nw.j.lostfound.total === base + 1 && nw2.j.lostfound.total === base + 1 && csvCalls.length === c0, [oldR.j.lostfound.total, nw.j.lostfound.total, nw2.j.lostfound.total, csvCalls.length - c0].join(','));
    // E: ตัวกลางใน D1 เปลี่ยน (เครื่องเดิม) → ตารางส่วนตัวต้องอ่านผ่านตัวกลางใหม่ ไม่ใช้ตารางจากตัวกลางเดิม
    const M = (k) => (db._db.prepare('SELECT v FROM meta WHERE k = ?').get(k) || {}).v, url0 = M('relay_url');
    NOW += 1e3; await runC('/api/stats?scope=private', { cookie: U10 }); const rl0 = relayCalls.length;
    const otherUrl = url0 === RELAY_URL2 ? RELAY_URL : RELAY_URL2, sec0 = M('relay_secret');
    db._db.prepare("UPDATE meta SET v = ? WHERE k = 'relay_url'").run(otherUrl); if (otherUrl === RELAY_URL2) relaySecret2 = sec0; else relaySecret = sec0;
    NOW += 61e3; const p2 = await runC('/api/stats?scope=private', { cookie: U10 });
    ok('[รอบ 13·E] ตัวกลางใน D1 เปลี่ยน (เครื่องเดิม ภายใน TTL ของตาราง) → อ่านตารางส่วนตัวใหม่ผ่านตัวกลางที่ตั้งล่าสุด', relayCalls.slice(rl0).filter((x) => /^table:/.test(x)).length === 2 && !!p2.j.ruenthai, relayCalls.slice(rl0).join(','));
    db._db.prepare("UPDATE meta SET v = ? WHERE k = 'relay_url'").run(url0);
    // race: scope ต้องเป็นค่าในรายการจริง (ไม่ใช่ property ที่สืบทอด)
    const sc = await Promise.all(['constructor', '__proto__', 'toString', 'hasOwnProperty'].map((x) => runC('/api/stats?scope=' + x, { cookie: U10 })));
    ok('[รอบ 13·race] scope=constructor/__proto__/toString/hasOwnProperty → 400 bad-scope (ไม่ใช่ 500)', sc.every((x) => x.s === 400 && x.j.code === 'bad-scope'), sc.map((x) => x.s + ':' + (x.j && x.j.code)).join(','));
  }
  // ================= รอบ 14 · P0: ผลอ่านสำเร็จล่าสุด (last-known-good) รายแหล่ง =================
  { _reset(); const mkDeps = () => { const cache = new Map(); return { fetch: fetchMock, now: () => NOW, cache: { match: async (k) => { const v = cache.get(k.url || String(k)); return v ? v.clone() : undefined; }, put: async (k, v) => { cache.set(k.url || String(k), v.clone()); } } }; };
    let depsC = mkDeps(); const runC = async (p, o = {}, env = E) => { const x = await handle(req(p, o), env, depsC); return { s: x.status, j: await x.json() }; };
    const INC = SOURCES(E).incidents[1], rowsInc = SHEETS[INC];
    const tIdx = rowsInc[0].indexOf('ประเภทเหตุการณ์'), extra = rowsInc[2].slice(); extra[tIdx] = ''; rowsInc.push(extra);      // แถวประเภทว่าง (เฉพาะชุดนี้ · ถอดออกท้ายชุด)
    const a = await runC('/api/stats?scope=core', { cookie: U10 }); const N = a.j.incidents.total, readOk = a.j.sourceReadAt.incidents;
    ok('[รอบ 14·P0] แถวที่ “ประเภทเหตุการณ์” ว่าง นับเป็น “ไม่ระบุประเภท” (ไม่ตัดทิ้ง ไม่ปล่อยชื่อว่าง)', a.j.incidents.byType.some((b) => b.type === 'ไม่ระบุประเภท') && a.j.incidents.byType.every((b) => b.type) && a.j.incidents.byType.reduce((s, b) => s + b.count, 0) === N, a.j.incidents.byType.map((b) => (b.type || '(ว่าง)') + ':' + b.count).join(','));
    NOW += 130e3; downGid = INC; const b = await runC('/api/stats?scope=core', { cookie: U10 });
    ok('[รอบ 14·P0] อ่านสำเร็จ N → หลัง TTL ต้นทางล้ม → ยังได้ยอด N จากผลสำเร็จล่าสุด พร้อม errors + stale.at = เวลาอ่านสำเร็จเดิม (ไม่ใส่ใน sourceReadAt ว่าสด)', b.j.incidents && b.j.incidents.total === N && !!b.j.errors.incidents && b.j.stale && b.j.stale.incidents && b.j.stale.incidents.at === readOk && !b.j.sourceReadAt.incidents && b.j.incidentsDaily && b.j.incidentsDaily.rows.length > 0, JSON.stringify({ t: b.j.incidents && b.j.incidents.total, e: b.j.errors, st: b.j.stale, rd: b.j.sourceReadAt.incidents }));
    _coldIsolate(); depsC = mkDeps(); NOW += 10e3; const c = await runC('/api/stats?scope=core', { cookie: U10 });
    { const n0 = aiCalls.length; await handle(req('/api/chat', { method: 'POST', cookie: U10, body: Object.assign({}, Q, { userMessage: 'เดือนนี้มีเหตุการณ์กี่เรื่อง', chatHistory: [] }) }), E, depsC); const sys = ((aiCalls[n0] || {}).input || { messages: [{ content: '' }] }).messages[0].content;
      const dT = (d) => +d.slice(8, 10) + ' พ.ย. ' + (+d.slice(0, 4) + 543) + ' ' + d.slice(11, 16) + ' น.';
      ok('[รอบ 14·P0] AI ใช้ผลสำเร็จล่าสุดเดียวกับหน้าเว็บ: ระบุ “ใช้ผลที่อ่านสำเร็จล่าสุดเมื่อ …” และ “ข้อมูล ณ” = เวลาอ่านสำเร็จเดิม (ไม่เรียกว่าสด ไม่ใช้ยอดไฟล์สรุป)', /ใช้ผลที่อ่านสำเร็จล่าสุดเมื่อ/.test(sys) && sys.includes('ข้อมูล ณ ' + dT(readOk)) && /ไม่ใช่ข้อมูลสดของรอบนี้/.test(sys), sys.split('\n').filter((l) => /หมายเหตุแหล่งข้อมูล|เหตุการณ์และอุบัติเหตุ/.test(l)).slice(0, 2).join(' / ').slice(0, 300)); }

    ok('[รอบ 14·P0] เครื่อง (isolate) ใหม่ + แคชบริการว่าง + ต้นทางล้ม → ยังได้ผลสำเร็จล่าสุดจาก D1 (ไม่กลับไปยอดไฟล์สรุป)', c.j.incidents && c.j.incidents.total === N && c.j.stale && c.j.stale.incidents.at === readOk, JSON.stringify({ t: c.j.incidents && c.j.incidents.total, st: c.j.stale }));
    const d = await runC('/api/stats?scope=inc', { cookie: U10 });
    ok('[รอบ 14·P0] scope=inc อ่านเฉพาะเหตุการณ์ (ไม่รอ/ไม่ได้รับผลจาก L&F หรือรถเข้า)', d.s === 200 && !!d.j.incidents && !d.j.lostfound && !d.j.gate && Object.keys(d.j.sourceReadAt).concat(Object.keys(d.j.errors)).every((k) => k === 'incidents'), JSON.stringify(Object.keys(d.j)));
    downGid = SOURCES(E).lostfound[1]; NOW += 130e3; const lf0 = csvCalls.length; const e2 = await runC('/api/stats?scope=core', { cookie: U10 });
    ok('[รอบ 14·P0] แหล่งอื่น (L&F) ล้ม → เหตุการณ์อ่านสดได้ตามปกติ ไม่ถูกย้อน และ error ระบุเฉพาะแหล่งที่ล้ม', e2.j.incidents.total === N && !!e2.j.sourceReadAt.incidents && !e2.j.errors.incidents && !!e2.j.errors.lostfound, JSON.stringify(e2.j.errors));
    downGid = ''; const keep = rowsInc.pop(); NOW += 130e3; const f = await runC('/api/stats?scope=core', { cookie: U10 }); rowsInc.push(keep);
    ok('[รอบ 14·P0] ต้นทางครบถ้วนและมีการลบจริง N → N−1 → ยอมรับยอดใหม่ (ไม่ล็อกยอดเดิม/ไม่ใช้ค่ามากสุด)', f.j.incidents.total === N - 1 && !f.j.stale, String(f.j.incidents.total));
    NOW += 130e3; downGid = INC; const g = await runC('/api/stats?scope=core', { cookie: U10 }); downGid = '';
    ok('[รอบ 14·P0] หลังยอมรับ N−1 แล้วต้นทางล้ม → ผลสำเร็จล่าสุดคือ N−1 (รุ่นล่าสุด ไม่ใช่รุ่นเก่ากว่า)', g.j.incidents && g.j.incidents.total === N - 1 && !!g.j.stale, String(g.j.incidents && g.j.incidents.total));
    const db0 = db._db; db0.exec("UPDATE stats_lkg SET at = at - 8*86400000"); NOW += 130e3; downGid = INC; _coldIsolate(); depsC = mkDeps(); const h = await runC('/api/stats?scope=core', { cookie: U10 }); downGid = '';
    ok('[รอบ 14·P0] ผลสำเร็จเก่าเกินระยะเก็บ (7 วัน) → ไม่ใช้ · ไม่มี fragment เหตุการณ์ · errors ระบุชัด (ไม่เติม 0)', !h.j.incidents && !!h.j.errors.incidents && !(h.j.stale && h.j.stale.incidents), JSON.stringify({ i: h.j.incidents, e: h.j.errors }));
    const cols = db0.prepare("SELECT k, cfg, at, length(frag) AS n FROM stats_lkg").all();
    ok('[รอบ 14·P0] ตาราง stats_lkg เก็บเฉพาะผลรวม (ไม่มีชื่อ/เบอร์/พิกัด/ภาพ)', cols.length > 0 && db0.prepare("SELECT frag FROM stats_lkg").all().every((r) => !/ผู้รายงานสมมติ|"name"|"phone"|"lat"|"images"/.test(r.frag)), cols.map((r) => r.k + ':' + r.n).join(','));
  }
    // ================= รอบ 14 · P1: ภาพตรวจพื้นที่/จราจร/ช่วยเหลือ เปิดครั้งแรกช้า =================
    { const mkDeps = () => { const cache = new Map(); return { fetch: fetchMock, now: () => NOW, cache: { match: async (k) => { const v = cache.get(k.url || String(k)); return v ? v.clone() : undefined; }, put: async (k, v) => { cache.set(k.url || String(k), v.clone()); } } }; }; let depsC = mkDeps();
      const AREA = SOURCES(E).areaPhotos[1], keepA = SHEETS[AREA], NIMG = 3231, ids = Array.from({ length: NIMG }, (_, i) => 'MOCKAREAPHOTO' + String(i).padStart(15, '0'));
      SHEETS[AREA] = [keepA[0]].concat(ids.map((id, i) => ['15/11/2026 7:' + String(i % 60).padStart(2, '0') + ':00', 'p' + i + '.jpg', 'https://drive.google.com/file/d/' + id + '/view', ['ตรวจพื้นที่', 'จราจร', 'ช่วยเหลือ'][i % 3]]));
      const realBatch = db.batch, realPrep = db.prepare; let calls = 0, stmts = 0, imgSel = 0, failW = false;
      db.batch = async (l) => { calls++; stmts += l.length; if (failW) throw new Error('D1 down (mock)'); return realBatch(l); };
      db.prepare = (sql) => { if (/FROM imgids WHERE id = \?/.test(sql)) imgSel++; return realPrep(sql); };
      const runH = async (p, o = {}) => { const x = await handle(req(p, o), E, depsC); return { s: x.status, j: /json/.test(x.headers.get('content-type') || '') ? await x.json() : null, h: x.headers }; };
      _coldIsolate(); _coldImg(); NOW += 130e3; depsC = mkDeps();
      const p1 = await runH('/api/data?dataset=areaPhotos', { cookie: U10 }), inDb = db._db.prepare("SELECT COUNT(*) AS n FROM imgids WHERE id LIKE 'MOCKAREAPHOTO%'").get().n, st = p1.h.get('server-timing') || '';
      ok('[รอบ 14·P1] ภาพ ' + NIMG + ' รหัส (เครื่องใหม่): ลงทะเบียนครบด้วย batch 1 ครั้ง (เดิม 65 ครั้งเรียงกัน) · คำสั่งไม่เกิน 100 ค่าต่อคำสั่ง', p1.s === 200 && p1.j.rows.length === NIMG && inDb === NIMG && calls === 1 && stmts === Math.ceil(NIMG / 100), JSON.stringify({ s: p1.s, rows: p1.j && p1.j.rows.length, inDb, calls, stmts }));
      ok('[รอบ 14·P1] Server-Timing แยก auth/src/d1/build/ser (ไม่มีรหัสภาพ/ข้อมูลบุคคล)', /auth;dur=\d+/.test(st) && /src;dur=\d+;desc="read"/.test(st) && /d1;dur=\d+;desc="batch=1 stmts=33"/.test(st) && /ser;dur=/.test(st) && !/MOCKAREA|0123/.test(st), st);
      calls = 0; const p2 = await runH('/api/data?dataset=areaPhotos', { cookie: U10 });
      ok('[รอบ 14·P1] เปิดซ้ำบนเครื่องเดิม (แคชบริการยังสด) → ไม่อ่านแหล่งซ้ำ ไม่เขียน D1', p2.s === 200 && calls === 0 && /src;dur=\d+;desc="memo"/.test(p2.h.get('server-timing')), p2.h.get('server-timing'));
      // ภาพจากเครื่องใหม่ที่ยังไม่เคยสร้างรายการ: ถาม D1 ครั้งเดียวแล้วจำ (ไม่ถามซ้ำทุกภาพ) · ยังตรวจ session ทุกครั้ง
      _coldImg(); imgSel = 0; const i1 = await runH('/api/img?id=' + ids[5], { cookie: U10 }), i2 = await runH('/api/img?id=' + ids[5], { cookie: U10 }), i3 = await runH('/api/img?id=' + ids[5]);
      ok('[รอบ 14·P1] เครื่องใหม่เปิดภาพที่ลงทะเบียนแล้ว → ได้ภาพ · ถาม D1 ครั้งเดียว · ไม่มี session → 401', i1.s === 200 && i2.s === 200 && imgSel === 1 && i3.s === 401, JSON.stringify({ a: i1.s, b: i2.s, sel: imgSel, c: i3.s }));
      // เขียนทะเบียนล้ม: รายการยังเปิดได้ · เครื่องเดียวกันเปิดภาพได้ · ไม่ลองเขียนทุกคำขอ · หลัง 60 วินาทีลองใหม่และสำเร็จ → เครื่องอื่นเปิดภาพได้
      const ids2 = ids.map((x) => x.replace('MOCKAREAPHOTO', 'MOCKAREANEW00X')); SHEETS[AREA] = [keepA[0]].concat(ids2.map((id) => ['16/11/2026 7:00:00', 'q.jpg', 'https://drive.google.com/file/d/' + id + '/view', 'จราจร']));
      _coldIsolate(); _coldImg(); NOW += 130e3; failW = true; calls = 0;
      const f1 = await runH('/api/data?dataset=areaPhotos', { cookie: U10 }), fi = await runH('/api/img?id=' + ids2[7], { cookie: U10 }); const cF = calls;
      NOW += 10e3; const f2 = await runH('/api/data?dataset=areaPhotos', { cookie: U10 }); const cF2 = calls;
      failW = false; NOW += 61e3; const f3 = await runH('/api/data?dataset=areaPhotos', { cookie: U10 }); const nNew = db._db.prepare("SELECT COUNT(*) AS n FROM imgids WHERE id LIKE 'MOCKAREANEW00X%'").get().n;
      _coldImg(); const fo = await runH('/api/img?id=' + ids2[7], { cookie: U10 });
      ok('[รอบ 14·P1] D1 เขียนล้ม → รายการยังได้ 200 ครบ + ภาพในเครื่องเดิมเปิดได้ · ไม่ลองเขียนซ้ำภายใน 60 วินาที · หลังนั้นลองใหม่สำเร็จ → เครื่องอื่นเปิดภาพได้', f1.s === 200 && f1.j.rows.length === NIMG && /err/.test(f1.h.get('server-timing')) && fi.s === 200 && cF === 1 && f2.s === 200 && cF2 === 1 && f3.s === 200 && nNew === NIMG && fo.s === 200, JSON.stringify({ f1: f1.s, fi: fi.s, cF, cF2, f3: f3.s, nNew, fo: fo.s }));
      // ภาพบนเครื่องใหม่: ตรวจ session + ทะเบียนรหัส + ค่าตั้งตัวกลาง พร้อมกัน (D1 ช้า 150 ms ต่อคำสั่ง → รวมไม่ถึง 2 รอบ) · ไม่มีคุกกี้ → 401 ก่อนทุกอย่าง และไม่ถาม D1 เรื่องภาพ
      { const slow = (q) => ({ ...q, bind: (...a) => slow(q.bind(...a)), first: async () => { await new Promise((r) => setTimeout(r, 150)); return q.first(); }, all: async () => { await new Promise((r) => setTimeout(r, 150)); return q.all(); } });
        db.prepare = (sql) => { if (/FROM imgids WHERE id = \?/.test(sql)) imgSel++; return slow(realPrep(sql)); };
        _coldImg(); imgSel = 0; const t0 = Date.now(), q1 = await runH('/api/img?id=' + ids2[9], { cookie: U10 }), dt = Date.now() - t0;
        const q2 = await runH('/api/img?id=' + ids2[11]), q3 = await runH('/api/img?id=bad'), sel2 = imgSel;
        db.prepare = realPrep;
        ok('[รอบ 14·P1] ภาพบนเครื่องใหม่: D1 3 คำสั่งเริ่มพร้อมกัน (ใช้เวลา < 2 รอบ) · ไม่มี session → 401 (รหัสถูก/ผิด) และไม่ค้นทะเบียนภาพ', q1.s === 200 && dt < 300 && /pre;dur=\d+/.test(q1.h.get('server-timing') || '') && q2.s === 401 && q3.s === 401 && sel2 === 1, JSON.stringify({ s: q1.s, dt, st: q1.h.get('server-timing'), q2: q2.s, q3: q3.s, sel2 })); }
      db.batch = realBatch; db.prepare = realPrep; SHEETS[AREA] = keepA; db._db.exec("DELETE FROM imgids WHERE id LIKE 'MOCKAREA%'"); }
    // ================= รอบ 14 · P2: ผู้ช่วย AI (ของจำลองทั้งหมด — ไม่เรียกโมเดลจริง) =================
    { NOW += 86400e3; _reset(); const U14 = (await loginAs('0123')).cookie; const reads = () => Object.values(_stat.reads).reduce((a, x) => a + x, 0);
      const chatQ = async (q, hist, extraBody) => { NOW += 61e3; const x = await run('/api/chat', { method: 'POST', cookie: U14, body: Object.assign({ action: 'chat', userMessage: q, chatHistory: hist || [], context: {} }, extraBody || {}) }, E); return { s: x.s, j: x.j, sys: (aiCalls[aiCalls.length - 1] || { input: { messages: [{}] } }).input.messages[0].content || '' }; };
      const ROUTES = ['traffic', 'accident-map', 'lostfound', 'gate', 'cctv', 'tram', 'report-guard', 'vehicle', 'safety', 'vehicle-fleet', 'parking'];
      const actOk = (a) => Array.isArray(a) && a.every((x) => ROUTES.includes(x.route) && (!x.from || /^\d{4}-\d{2}-\d{2}$/.test(x.from)) && (!x.to || /^\d{4}-\d{2}-\d{2}$/.test(x.to)) && Object.keys(x).every((k) => ['route', 'label', 'from', 'to'].includes(k)));
      let a0 = aiCalls.length, r0 = reads(); const g = await chatQ('สวัสดีครับ'); const h = await chatQ('ทำอะไรได้บ้าง'); const th = await chatQ('ขอบคุณครับ');
      ok('[รอบ 14·P2] ทักทาย/ถามเมนู/ขอบคุณ → ตอบจากโค้ด ไม่อ่านแหล่งข้อมูลเลย ไม่เรียกโมเดล · ปุ่มดูต่ออยู่ในรายการที่อนุญาต', g.s === 200 && g.j.mode === 'canned' && h.j.mode === 'canned' && th.j.mode === 'canned' && aiCalls.length === a0 && reads() === r0 && g.j.reads.length === 0 && actOk(g.j.actions) && /ถามสถิติได้/.test(h.j.reply), JSON.stringify({ m: [g.j.mode, h.j.mode, th.j.mode], ai: aiCalls.length - a0, rd: reads() - r0 }));
      const st = await run('/api/stats?scope=inc', { cookie: U14 }, E), curM = new Date(NOW + 7 * 3600e3).toISOString().slice(0, 7), curN = (st.j.incidents.monthly.filter((m) => m.month === curM)[0] || { byType: {} }), N = Object.values(curN.byType).reduce((a, x) => a + x, 0);
      _coldIsolate(); NOW += 130e3; r0 = reads(); const rdBefore = Object.assign({}, _stat.reads); ENV.aiReply = 'เดือนนี้มี ' + N + ' เหตุการณ์'; const i1 = await chatQ('อุบัติเหตุเดือนนี้มีกี่เหตุการณ์');
      const readSrc = Object.keys(_stat.reads).filter((k) => _stat.reads[k] !== rdBefore[k]);
      ok('[รอบ 14·P2] คำถามเหตุการณ์ → อ่านเฉพาะแหล่งเหตุการณ์ (ไม่อ่าน L&F/รถเข้า/ตัวกลาง) · หลักฐาน “ข้อมูลสด” + เวลาอ่าน · ปุ่มกรองเดือนนี้', i1.j.verified === true && JSON.stringify(i1.j.reads) === '["incidents"]' && JSON.stringify(readSrc) === '["incidents"]' && i1.j.evidence.length === 1 && i1.j.evidence[0].freshness === 'live' && /อ่านจากต้นทางเมื่อ/.test(i1.j.evidence[0].text) && actOk(i1.j.actions) && i1.j.actions[0].route === 'traffic' && i1.j.actions[0].from === curM + '-01', JSON.stringify({ reads: i1.j.reads, readSrc, ev: i1.j.evidence, act: i1.j.actions }));
      ok('[รอบ 14·P2] เดือนปัจจุบันระบุว่า “ยังไม่ครบเดือน” ในข้อเท็จจริงที่ส่งให้โมเดล', /\(เดือนปัจจุบัน ยังไม่ครบเดือน\)/.test(i1.sys));
      const prevM = (() => { const y = +curM.slice(0, 4), k = +curM.slice(5, 7); return k === 1 ? (y - 1) + '-12' : y + '-' + String(k - 1).padStart(2, '0'); })(), f1 = await chatQ('แล้วเดือนก่อนล่ะ', [{ role: 'User', text: 'อุบัติเหตุเดือนนี้มีกี่เหตุการณ์' }, { role: 'AI', text: 'เดือนนี้มี ' + N + ' เหตุการณ์' }]);
      ok('[รอบ 14·P2] คำถามต่อเนื่อง “แล้วเดือนก่อนล่ะ” → หัวข้อเดิม (เหตุการณ์) อ่านแหล่งเดียว · ปุ่มกรองเป็นเดือนก่อน', JSON.stringify(f1.j.reads) === '["incidents"]' && f1.j.actions[0].from === prevM + '-01', JSON.stringify({ r: f1.j.reads, a: f1.j.actions }));
      ENV.aiReply = 'ใช่ครับ เดือนนี้มี 99 เหตุการณ์'; const w1 = await chatQ('เดือนนี้มี 99 เหตุใช่ไหม'); ENV.aiReply = 'ไม่ใช่ครับ เดือนนี้มี ' + N + ' เหตุการณ์ ไม่ใช่ 99'; const w2 = await chatQ('เดือนนี้มี 99 เหตุใช่ไหม');
      ok('[รอบ 14·P2] ผู้ใช้อ้างเลขผิด “มี 99 เหตุใช่ไหม”: โมเดลยืนยันเลขผิด → ไม่แสดง · แก้ว่า “ไม่ใช่” พร้อมเลขจริง → แสดงได้', w1.j.verified === false && w2.j.verified === true, JSON.stringify([w1.j.verified, w2.j.verified]));
      ENV.aiReply = 'เดือนนี้มี 4321 เหตุการณ์ตามที่เคยตอบ'; const hs = await chatQ('ช่วยสรุปอุบัติเหตุเดือนนี้อีกครั้ง', [{ role: 'User', text: 'อุบัติเหตุเดือนนี้' }, { role: 'AI', text: 'เดือนนี้มี 4321 เหตุการณ์' }]);
      ok('[รอบ 14·P2] ตัวเลขเก่าจากบทสนทนาก่อนหน้า (ไม่อยู่ในข้อมูลรอบนี้) → ไม่แสดง', hs.j.verified === false);
      a0 = aiCalls.length; ENV.aiReply = 'เดือนนี้มี ' + N + ' เหตุการณ์'; const cmap = new Map(), depsK = { fetch: fetchMock, now: () => NOW, cache: { match: async (k) => { const v = cmap.get(k.url || String(k)); return v ? v.clone() : undefined; }, put: async (k, v) => { cmap.set(k.url || String(k), v.clone()); } } };
      const chatK = async (q) => { NOW += 5e3; const x = await handle(req('/api/chat', { method: 'POST', cookie: U14, body: { action: 'chat', userMessage: q, chatHistory: [], context: {} } }), E, depsK); return { j: await x.json() }; };
      const c1 = await chatK('เหตุการณ์เดือนนี้รวมเท่าไร'), c2 = await chatK('เหตุการณ์เดือนนี้รวมเท่าไร');
      NOW += 125e3; const c3 = await chatK('เหตุการณ์เดือนนี้รวมเท่าไร');
      ok('[รอบ 14·P2] คำถามเดิม + ข้อมูลรุ่นเดิม (เวลาอ่านเดียวกัน) + prompt/โมเดลเดิม → ใช้คำตอบจากแคช · อ่านต้นทางรอบใหม่ → ถามโมเดลใหม่ (ไม่ใช้คำตอบของข้อมูลรุ่นเก่า)', c1.j.mode === 'llm' && c2.j.mode === 'cached' && c2.j.reply === c1.j.reply && c3.j.mode === 'llm' && aiCalls.length - a0 === 2, JSON.stringify([c1.j.mode, c2.j.mode, c3.j.mode, aiCalls.length - a0]));
      r0 = reads(); const awR0 = _stat.reads.anywheel || 0; ENV.aiReply = 'ยังไม่มีข้อมูล Anywheel ของเดือนนี้ครับ'; const aw = await chatQ('Anywheel เดือนนี้ใช้งานกี่ครั้ง');
      ok('[รอบ 14·P2→14.3] Anywheel เดือนปัจจุบัน → อ่านเฉพาะแหล่ง Anywheel · ข้อเท็จจริงบอกว่า “ยังไม่มีข้อมูลของเดือนนี้” (ล่าสุด ต.ค.) · ไม่สวมยอดเดือนอื่น', JSON.stringify(aw.j.reads) === '["anywheel"]' && reads() - r0 <= 1 && /จักรยาน Anywheel \| เดือนนี้[^\]]*\] ยังไม่มีข้อมูลของเดือนนี้[^—]*— เดือนล่าสุดที่มีคือ ต\.ค\. 2569/.test(aw.sys) && aw.j.verified === true, aw.sys.split('\n').filter((l) => /Anywheel/.test(l)).slice(-2).join(' / '));
      ENV.aiReply = 'Anywheel ต.ค. 2569 ใช้งาน 2,000 ครั้ง ระยะทาง 2,500 กม.'; const aw2 = await chatQ('Anywheel ตุลาคม 2569 กี่ครั้ง ระยะทางเท่าไร');
      ok('[รอบ 14·P2→14.3] Anywheel ต.ค. (จากต้นทางจำลอง) → ตัวเลขผ่านการตรวจ · หลักฐาน “ข้อมูลสด” พร้อมเวลาอ่าน', aw2.j.verified === true && aw2.j.evidence.length === 1 && aw2.j.evidence[0].freshness === 'live' && /อ่านจากต้นทางเมื่อ/.test(aw2.j.evidence[0].text) && /ต\.ค\. 2569 \| ข้อมูล ณ [^\]]*\] 2,000 ครั้ง, 2,500 กม\./.test(aw2.sys), JSON.stringify(aw2.j.evidence) + ' ' + aw2.sys.split('\n').filter((l) => /Anywheel \| ต\.ค\. 2569/.test(l)).join(''));
      const INC = SOURCES(E).incidents[1]; downGid = INC; _coldIsolate(); NOW += 130e3; ENV.aiReply = 'เดือนนี้มี ' + N + ' เหตุการณ์ (ผลที่อ่านสำเร็จล่าสุด)'; const lk = await chatQ('อุบัติเหตุเดือนนี้'); downGid = '';
      ok('[รอบ 14·P2] ต้นทางเหตุการณ์ล้ม → AI ใช้ผลอ่านสำเร็จล่าสุดชุดเดียวกับหน้าเว็บ · หลักฐาน “ผลที่อ่านสำเร็จล่าสุด … รอบล่าสุดอ่านไม่สำเร็จ”', lk.j.verified === true && lk.j.evidence[0] && lk.j.evidence[0].freshness === 'stale' && /รอบล่าสุดอ่านไม่สำเร็จ/.test(lk.j.evidence[0].text) && /ใช้ผลที่อ่านสำเร็จล่าสุดเมื่อ/.test(lk.sys), JSON.stringify(lk.j.evidence));
      a0 = aiCalls.length; NOW += 61e3; const sm = await run('/api/chat', { method: 'POST', cookie: U14, body: { action: 'summary', context: { from: curM, to: curM } } }, E);
      const p0 = sm.j.points || [], incPt = p0.filter((p) => p.topic === 'incidents')[0];
      ok('[รอบ 14·P2] “สรุปช่วงที่กำลังดู” → 3–5 ประเด็น คำนวณด้วยโค้ด (ไม่เรียกโมเดล) · ยอดเหตุการณ์ตรงกับ /api/stats · มีหลักฐานความสด + ปุ่มดูต่อ', sm.s === 200 && sm.j.mode === 'summary' && p0.length >= 3 && p0.length <= 5 && aiCalls.length === a0 && incPt && incPt.text.indexOf('รวม ' + N + ' เหตุการณ์') > 0 && sm.j.evidence.length >= 1 && actOk(sm.j.actions), JSON.stringify({ n: p0.length, inc: incPt && incPt.text, ai: aiCalls.length - a0 }));
      ENV.aiReply = 'ข้อมูลส่วนตัว'; const bad = await run('/api/chat', { method: 'POST', cookie: U14, body: { action: 'sql', userMessage: 'SELECT * FROM roster' } }, E);
      ok('[รอบ 14·P2] action อื่นนอกจาก chat/summary → 400 (ไม่มีช่องให้หน้าเว็บส่ง SQL/URL/Sheet)', bad.s === 400);
      ENV.aiReply = ''; }
    // ================= รอบ 14.1: hotfix สถานะ internal (failure injection ในเครื่องจำลองเท่านั้น) =================
    { NOW += 86400e3; _reset(); const U = (await loginAs('0123')).cookie, INC = SOURCES(E).incidents[1], logs = [], ce = console.error; console.error = (x) => { logs.push(String(x)); };
      const mk = (o) => { const m = new Map(); return Object.assign({ fetch: fetchMock, now: () => NOW, cache: { match: async (k) => { const v = m.get(k.url || String(k)); return v ? v.clone() : undefined; }, put: async (k, v) => { m.set(k.url || String(k), v.clone()); } } }, o || {}); };
      const call = async (p, d, cookie) => { const x = await handle(req(p, { cookie: cookie === undefined ? U : cookie }), E, d); return { s: x.status, j: await x.json(), rev: x.headers.get('x-hub-rev') }; };
      try {
        // 1) ต้นทางส่งหัวมาแล้วแต่เนื้อหาขาด/หมดเวลา → รหัสต้นทาง (source-timeout) ไม่ใช่ internal · มี log
        _coldIsolate(); NOW += 130e3; bodyFailGid = INC; logs.length = 0; const b1 = await call('/api/stats?scope=inc', mk()); bodyFailGid = '';
        ok('[รอบ 14.1] เนื้อหาต้นทางขาดกลางทาง → errors.incidents = source-timeout (เดิม internal) · ไม่มีเวลาอ่านสด · log ระบุขั้นตอน', b1.s === 200 && b1.j.errors.incidents === 'source-timeout' && !b1.j.sourceReadAt.incidents && logs.some((l) => /"ev":"stats-part-error".*"part":"incidents".*"stage":"source"/.test(l)), JSON.stringify({ e: b1.j.errors, r: b1.j.sourceReadAt, logs: logs.slice(-2) }));
        // 2) อ่านสำเร็จ แต่ระบบสำรอง (waitUntil/LKG) ล้ม → ยังเป็นข้อมูลสด ไม่ติด error · มีหลักฐานใน log
        _coldIsolate(); NOW += 130e3; logs.length = 0; const b2 = await call('/api/stats?scope=rest', mk({ waitUntil: () => { throw new TypeError('waitUntil boom'); } }));
        ok('[รอบ 14.1] อ่านสำเร็จแต่ waitUntil/งานเก็บสำรองล้ม → ไม่ตัดสินว่าแหล่งอ่านล้ม (เวลาอ่านสดครบ 3 ส่วน) · log lkg-write-error', b2.s === 200 && Object.keys(b2.j.errors).length === 0 && ['lostfound', 'lostfoundYear', 'gate'].every((k) => b2.j.sourceReadAt[k]) && logs.some((l) => /"ev":"lkg-write-error"/.test(l)), JSON.stringify({ e: b2.j.errors, r: b2.j.sourceReadAt, n: logs.length }));
        const realPrep = db.prepare; db.prepare = (sql) => { if (/INSERT INTO stats_lkg/.test(sql)) throw new Error('D1_ERROR: mock write failure'); return realPrep(sql); };
        _coldIsolate(); NOW += 130e3; logs.length = 0; const b3 = await call('/api/stats?scope=inc', mk()); db.prepare = realPrep;
        ok('[รอบ 14.1] D1 เขียน LKG ล้ม → ผลสด/เวลาอ่านถูกต้อง · มี log lkg-write-error (เดิมกลืนเงียบ)', b3.s === 200 && !b3.j.errors.incidents && b3.j.sourceReadAt.incidents && logs.some((l) => /"ev":"lkg-write-error".*"part":"incidents"/.test(l)), JSON.stringify({ e: b3.j.errors, n: logs.length }));
        const d4 = mk(); d4.cache.put = async () => { throw new Error('cache put failed'); }; _coldIsolate(); NOW += 130e3; logs.length = 0; const b4 = await call('/api/stats?scope=inc', d4);
        ok('[รอบ 14.1] เขียนแคชล้ม → ผลสดถูกต้อง · มี log stats-cache-write-error', b4.s === 200 && !b4.j.errors.incidents && b4.j.sourceReadAt.incidents && logs.some((l) => /"ev":"stats-cache-write-error"/.test(l)));
        // 3) LKG ข้ามเครื่องตามอายุ/คีย์ · รูปแบบเสีย → ไม่ใช้ ไม่เติมศูนย์ ไม่บอกว่าสด
        _coldIsolate(); NOW += 130e3; await call('/api/stats?scope=inc', mk()); const good = db._db.prepare("SELECT at, frag FROM stats_lkg WHERE k = 'incidents'").get();
        _coldIsolate(); NOW += 130e3; downGid = INC; const s1 = await call('/api/stats?scope=inc', mk());
        db._db.prepare("UPDATE stats_lkg SET frag = '[1]' WHERE k = 'incidents'").run(); _coldIsolate(); NOW += 130e3; logs.length = 0; const s2 = await call('/api/stats?scope=inc', mk());
        db._db.prepare("UPDATE stats_lkg SET frag = '{bad' WHERE k = 'incidents'").run(); _coldIsolate(); NOW += 130e3; const s3 = await call('/api/stats?scope=inc', mk()); downGid = '';
        db._db.prepare("UPDATE stats_lkg SET frag = ? WHERE k = 'incidents'").run(good.frag);
        ok('[รอบ 14.1] สำเร็จ → หมดอายุ 2 นาที → ต้นทางล้ม → เครื่องใหม่ใช้ LKG ที่บันทึกจริง (เวลาอ่านเดิม) · LKG รูปแบบเสีย (array/JSON พัง) → ไม่ใช้ ไม่มีตัวเลข ไม่มีเวลาอ่านสด', s1.j.stale && s1.j.stale.incidents && s1.j.incidents && !s1.j.sourceReadAt.incidents && !(s2.j.stale && s2.j.stale.incidents) && !s2.j.incidents && !s2.j['0'] && !s2.j.sourceReadAt.incidents && !(s3.j.stale && s3.j.stale.incidents) && !s3.j.incidents && logs.length >= 0, JSON.stringify({ s1: s1.j.stale, s2: [s2.j.stale, !!s2.j.incidents, Object.keys(s2.j)], s3: [s3.j.stale, !!s3.j.incidents] }));
        // 4) ตรวจ session ใน D1 ล้มชั่วคราว → 503 auth-unavailable (ไม่ใช่ internal) และไม่มีข้อมูล · ไม่มี session → 401 · หัว x-hub-rev บอกรุ่นบริการ
        db.prepare = (sql) => { if (/FROM sessions WHERE id/.test(sql)) throw new Error('D1_ERROR: Network connection lost.'); return realPrep(sql); }; logs.length = 0; const a1 = await call('/api/stats?scope=inc', mk()); db.prepare = realPrep;
        const a2 = await call('/api/stats?scope=inc', mk(), '');
        ok('[รอบ 14.1] D1 ตรวจ session ล้ม → 503 auth-unavailable ไม่มีข้อมูล (เดิม 500 internal) · ไม่มี session → 401 · ทุกคำตอบมี x-hub-rev', a1.s === 503 && a1.j.code === 'auth-unavailable' && !a1.j.incidents && logs.some((l) => /"ev":"auth-d1-error"/.test(l)) && a2.s === 401 && !a2.j.incidents && a1.rev === WORKER_REV && a2.rev === WORKER_REV, JSON.stringify({ a1: a1.s + ' ' + a1.j.code, a2: a2.s, rev: a1.rev }));
        ok('[รอบ 14.1] log ไม่มี cookie/รหัสพนักงาน/URL/รหัสไฟล์', logs.every((l) => !/0123|sid=|https?:\/\/|MOCK[A-Z]{3,}\d|[A-Za-z0-9_-]{30,}/.test(l)), logs.find((l) => /0123|sid=|https?:\/\/|[A-Za-z0-9_-]{30,}/.test(l)) || '');
      } finally { console.error = ce; bodyFailGid = ''; downGid = ''; } }
    // ================= รอบ 14.2: บันทึกข้อผิดพลาดย้อนหลังใน D1 (diag_log) — ฐาน SQLite จริงในเครื่อง ไม่ใช่ Map =================
    { NOW += 86400e3; _reset(); const U = (await loginAs('0123')).cookie, INC = SOURCES(E).incidents[1], ce = console.error, out = []; console.error = (x) => { out.push(String(x)); };
      const mk = () => ({ fetch: fetchMock, now: () => NOW });      // deps ใหม่ทุกคำขอ (เหมือน production)
      const call = async (p, ray, cookie) => { const x = await handle(req(p, { cookie: cookie === undefined ? U : cookie, ray }), E, mk()); return { s: x.status, j: await x.json() }; };
      const byRef = (ref) => db._db.prepare('SELECT ev, ref, rev, route, scope, part, stage, status, code, type, cause, msg FROM diag_log WHERE ref = ? ORDER BY id').all(ref);      // วิธีค้นเดียวกับเอกสาร (parameterized)
      const nLog = () => db._db.prepare('SELECT COUNT(*) AS n FROM diag_log').get().n;
      try {
        db._db.exec('DELETE FROM diag_log'); _coldIsolate(); NOW += 130e3; const n0 = nLog(); await call('/api/stats?scope=inc', 'RAYOK1');
        ok('[รอบ 14.2] คำขอที่สำเร็จไม่เขียน diag_log', nLog() === n0);
        _coldIsolate(); NOW += 130e3; bodyFailGid = INC; const r1 = await call('/api/stats?scope=inc', 'RAYBODY1'); bodyFailGid = '';
        _coldIsolate(); _coldImg(); const rows1 = byRef('RAYBODY1');      // อ่านคืนหลังจำลองเครื่องใหม่ (หน่วยความจำในเครื่องล้างแล้ว)
        ok('[รอบ 14.2] เนื้อหาต้นทางขาด → บันทึก stats-part-error ลง D1 (part/stage/code/ชนิดสาเหตุเดิม/รุ่น) ค้นคืนด้วย ref ได้หลังเปลี่ยนเครื่อง', r1.j.errors.incidents === 'source-timeout' && rows1.length >= 1 && rows1.some((r) => r.ev === 'stats-part-error' && r.part === 'incidents' && r.stage === 'source' && r.code === 'source-timeout' && r.cause === 'TimeoutError' && r.rev === WORKER_REV), JSON.stringify(rows1));
        const realPrep = db.prepare; db.prepare = (sql) => { if (/FROM sessions WHERE id/.test(sql)) throw new Error('D1_ERROR: Network connection lost.'); return realPrep(sql); };
        const a1 = await call('/api/stats?scope=inc', 'RAYAUTH1'); db.prepare = realPrep; const rows2 = byRef('RAYAUTH1');
        ok('[รอบ 14.2] D1 ตรวจ session ล้ม → 503 ไม่มีข้อมูล + ref ในคำตอบตรงกับ log · auth-d1-error และ route-error ผูก ref เดียวกัน (route = /api/stats ไม่มี query)', a1.s === 503 && !a1.j.incidents && a1.j.ref === 'RAYAUTH1' && rows2.some((r) => r.ev === 'auth-d1-error' && r.cause === null && r.type === 'Error') && rows2.some((r) => r.ev === 'route-error' && r.route === '/api/stats' && r.status === 503 && r.code === 'auth-unavailable' && r.cause === 'Error'), JSON.stringify(rows2));
        db.prepare = (sql) => { if (/FROM sessions WHERE id/.test(sql)) throw new Error('D1_ERROR: x'); return realPrep(sql); }; const a2 = await call('/api/stats?scope=inc', 'a5cf000011112222-BKK'); db.prepare = realPrep;
        ok('[รอบ 14.2] ref รูปแบบจริง (มีรหัสศูนย์ท้าย) → คำตอบและ log ใช้รหัสเดียวกัน a5cf000011112222', a2.j.ref === 'a5cf000011112222' && byRef('a5cf000011112222').length >= 2, JSON.stringify(a2.j));
        // คำขอพร้อมกัน 2 รายการ → ref ไม่ปนกัน
        _coldIsolate(); NOW += 130e3; downGid = INC; await Promise.all([call('/api/stats?scope=inc', 'RAYPARA'), call('/api/stats?scope=inc', 'RAYPARB')]); downGid = '';
        const pa = byRef('RAYPARA'), pb = byRef('RAYPARB');
        ok('[รอบ 14.2] คำขอพร้อมกัน 2 รายการ → แต่ละ ref มี log ของตัวเอง ไม่ปนกัน', pa.length >= 1 && pb.length >= 1 && pa.every((r) => r.ref === 'RAYPARA') && pb.every((r) => r.ref === 'RAYPARB'), JSON.stringify([pa.length, pb.length]));
        // ตัดข้อมูลอ่อนไหวในข้อความ
        db.prepare = (sql) => { if (/INSERT INTO stats_lkg/.test(sql)) throw new Error('D1_ERROR: fail "นายสมชาย ใจดี" somchai@mahidol.ac.th 0812345678 https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz123456/edit sid=abc'); return realPrep(sql); };
        _coldIsolate(); NOW += 130e3; await call('/api/stats?scope=inc', 'RAYREDACT1'); db.prepare = realPrep;
        const rr = byRef('RAYREDACT1'), allTxt = JSON.stringify(db._db.prepare('SELECT * FROM diag_log').all());
        ok('[รอบ 14.2] ข้อความที่เก็บตัดชื่อ/อีเมล/เบอร์/URL/รหัสไฟล์ออก · ไม่มี cookie/รหัสพนักงาน/query ในตาราง', rr.some((r) => r.ev === 'lkg-write-error') && !/สมชาย|somchai|0812345678|docs\.google|1AbCdEf|sid=|0123|scope=|\?/.test(allTxt.replace(/"msg":"[^"]*"/g, (m) => m.replace(/\?/g, ''))), rr.map((r) => r.msg).join(' | '));
        // เพดาน 1,000 รายการ + กันซ้ำในคำขอเดียว
        const ins = db._db.prepare("INSERT INTO diag_log(at, ref, ev) VALUES (?, 'OLD', 'filler')"); for (let i = 0; i < 1005; i++) ins.run(i);
        _coldIsolate(); NOW += 130e3; downGid = INC; await call('/api/stats?scope=inc', 'RAYCAP1'); downGid = '';
        ok('[รอบ 14.2] เพดาน ≤ 1,000 รายการ (ล้างของเก่าตอนเขียนใหม่) และรายการใหม่ยังอยู่', nLog() <= 1000 && byRef('RAYCAP1').length >= 1, 'count=' + nLog());
        // ตัวบันทึกล้ม → ผลข้อมูลไม่เปลี่ยน ไม่วนบันทึกซ้ำ · auth ที่ตรวจไม่ได้ยังไม่ส่งข้อมูล
        db.prepare = (sql) => { if (/diag_log/.test(sql)) throw new Error('D1_ERROR: diag down'); return realPrep(sql); }; out.length = 0;
        _coldIsolate(); NOW += 130e3; downGid = INC; const f1 = await call('/api/stats?scope=inc', 'RAYDIAGDOWN1'); downGid = '';
        const dwe = out.filter((l) => /diag-write-error/.test(l)).length;
        db.prepare = (sql) => { if (/diag_log/.test(sql) || /FROM sessions WHERE id/.test(sql)) throw new Error('D1_ERROR: all down'); return realPrep(sql); };
        const f2 = await call('/api/stats?scope=inc', 'RAYDIAGDOWN2'); db.prepare = realPrep;
        ok('[รอบ 14.2] diag_log เขียนไม่ได้ → คำตอบเหมือนเดิม (200 + ผลสำรอง) · แจ้ง console ครั้งเดียวต่อเหตุการณ์ ไม่วน · session ตรวจไม่ได้ยัง 503 ไม่มีข้อมูล', f1.s === 200 && f1.j.errors.incidents && dwe >= 1 && dwe <= 3 && f2.s === 503 && !f2.j.incidents, JSON.stringify({ f1: f1.s, dwe, f2: f2.s }));
      } finally { console.error = ce; bodyFailGid = ''; downGid = ''; } }
    // ================= รอบ 14.3: Anywheel อ่านสดจากชีท (GViz ค่าดิบ) — ข้อมูลจำลองย่อจากโครงสร้างจริง =================
    { NOW += 86400e3; _reset(); AW_ROWS = awRowsBase(); awDown = false; const U = (await loginAs('0123')).cookie;
      const a = awAggregate({ head: AW_HEAD.map((h) => h.replace(/\s+/g, '')), rows: awRowsBase() }), mo = (m) => a.monthly.find((r) => r.month === m) || {};
      const feb = mo('2026-02');
      ok('[รอบ 14.3] รวมรายเดือนด้วยคอลัมน์ “เดือน” (serial ต่างวันในเดือนเดียวกันรวมกัน · ก.พ. หลายแถว) · ทศนิยมรวมก่อนปัด · จุลภาคอ่านถูก · กม. ว่างใช้เมตร/1000', a.monthly.map((r) => r.month).join(',') === '2025-12,2026-02,2026-10' && feb.rows === 5 && feb.trips === 1784 && feb.km === 35.25 && mo('2025-12').km === 1000.5 && mo('2026-10').km === 2500.123, JSON.stringify(a.monthly));
      ok('[รอบ 14.3] ค่าผิดรูปแบบไม่กลายเป็น 0 เงียบ ๆ (รายงาน badTrips) · แถวผลรวม/เดือนอ่านไม่ได้ไม่ถูกบวก (unassigned) · เมตรขัดกับ กม. รายงาน kmConflicts', a.quality.rowsTotal === 8 && a.quality.badTrips === 1 && a.quality.unassigned === 1 && a.quality.kmFromMeters === 1 && a.quality.kmConflicts === 1, JSON.stringify(a.quality));
      ok('[รอบ 14.3] วันที่: แปลงเฉพาะที่พิสูจน์ได้จากคอลัมน์เดือน (วัน/เดือนสลับ) · วันที่มีข้อมูลนับจากวันไม่ซ้ำ · เวลาการใช้งานไม่ครบเดือน → null + บอกจำนวนแถวที่มี · วันที่ล่าสุด 31 ต.ค.', feb.verifiedDays === 5 && feb.dateAmbiguous === 0 && feb.days === 5 && feb.minutes === null && feb.minutesPartial && feb.minutesPartial.minutes === 75 && feb.minutesPartial.rows === 3 && mo('2025-12').minutes === 10 && a.lastDate === '2026-10-31', JSON.stringify(feb));
      const st = async (sc, cookie) => { const x = await handle(req('/api/stats?scope=' + sc, { cookie: cookie === undefined ? U : cookie }), E, { fetch: fetchMock, now: () => NOW }); return { s: x.status, j: await x.json() }; };
      let c0 = awCalls; const i1 = await st('inc'), r1 = await st('rest');
      ok('[รอบ 14.3] คำขอชุดหลัก (inc/rest) ไม่อ่าน Anywheel', i1.s === 200 && r1.s === 200 && awCalls === c0, 'awCalls +' + (awCalls - c0));
      c0 = awCalls; const w1 = await st('aw'), aw1 = w1.j.anywheel || {};
      ok('[รอบ 14.3] /api/stats?scope=aw → ยอดรายเดือน + เวลาอ่านต้นทาง (readAt) แยกจากวันที่ข้อมูลล่าสุด (lastDate) · ไม่ส่งแถวรายวันออกไป', w1.s === 200 && awCalls === c0 + 1 && aw1.monthly.length === 3 && aw1.readAt && w1.j.sourceReadAt.anywheel === aw1.readAt && aw1.lastDate === '2026-10-31' && !JSON.stringify(w1.j).includes('31/10/2026'), JSON.stringify({ s: w1.s, n: (aw1.monthly || []).length, readAt: aw1.readAt, last: aw1.lastDate }));
      // เพิ่มแถว พ.ย. ในต้นทางจำลอง → ภายใน 2 นาทีใช้ผลเดิม · หลังหมดอายุเห็นข้อมูลใหม่เอง (ไม่ Deploy ไม่แก้ไฟล์)
      AW_ROWS.splice(8, 0, ['15/11/2026', 'Date(2026,10,1)', 777, null, 7.5, null]); NOW += 60e3; const w2 = await st('aw'); NOW += 70e3; const w3 = await st('aw'), nov = (w3.j.anywheel.monthly || []).find((r) => r.month === '2026-11');
      ok('[รอบ 14.3] ต้นทางเพิ่มแถว พ.ย. → ภายใน TTL ยังเป็นผลเดิม · หลังหมดอายุ API เห็น พ.ย. 777 ครั้งเอง และ lastDate = 15 พ.ย.', !(w2.j.anywheel.monthly || []).some((r) => r.month === '2026-11') && nov && nov.trips === 777 && w3.j.anywheel.lastDate === '2026-11-15', JSON.stringify(nov));
      NOW += 61e3; ENV.aiReply = 'Anywheel พ.ย. 2569 ใช้งาน 777 ครั้ง'; let x = await handle(req('/api/chat', { method: 'POST', cookie: U, body: { action: 'chat', userMessage: 'Anywheel พฤศจิกายน 2569 กี่ครั้ง', chatHistory: [], context: {} } }), E, { fetch: fetchMock, now: () => NOW }); const c1 = await x.json(), sys = (aiCalls[aiCalls.length - 1] || { input: { messages: [{}] } }).input.messages[0].content || '';
      ok('[รอบ 14.3] AI ใช้ยอดชุดเดียวกัน: อ่านเฉพาะ Anywheel · ข้อเท็จจริงมี พ.ย. 777 ครั้ง และปี 2569 รวมเฉพาะเดือนของปีนั้น (ไม่รวม ธ.ค. 2568)', c1.verified === true && JSON.stringify(c1.reads) === '["anywheel"]' && /พ\.ย\. 2569 \| ข้อมูล ณ [^\]]*\] 777 ครั้ง/.test(sys) && /ปีปฏิทิน พ\.ศ\. 2569 \(เฉพาะ ก\.พ\. 2569 – พ\.ย\. 2569\) \| ข้อมูล ณ [^\]]*\] รวม 4,561 ครั้ง/.test(sys), sys.split('\n').filter((l) => /Anywheel \| (ปีปฏิทิน|พ\.ย)/.test(l)).join(' / ').slice(0, 600));
      NOW += 61e3; x = await handle(req('/api/chat', { method: 'POST', cookie: U, body: { action: 'summary', context: { from: '2026-11', to: '2026-11' } } }), E, { fetch: fetchMock, now: () => NOW }); const sm = await x.json(), awp = (sm.points || []).find((p) => p.topic === 'anywheel');
      ok('[รอบ 14.3] “สรุปช่วงที่กำลังดู” มี Anywheel จากยอดชุดเดียวกัน', awp && /777 ครั้ง/.test(awp.text), JSON.stringify(awp));
      // ต้นทางล้มหลังเคยสำเร็จ → ใช้ LKG พร้อมเวลาเดิม · แหล่งอื่นไม่เตือน · ไม่มี session → 401
      const readOk = w3.j.anywheel.readAt; NOW += 130e3; _coldIsolate(); awDown = true; const w4 = await st('aw'), i4 = await st('inc'), n4 = await st('aw', ''); awDown = false;
      ok('[รอบ 14.3] Anywheel อ่านล้ม → errors.anywheel + ใช้ผลอ่านสำเร็จล่าสุด (stale.at = เวลาอ่านสำเร็จครั้งล่าสุด) ไม่เติม 0 · เหตุการณ์ไม่ได้รับผล · ไม่มี session → 401 ไม่มีข้อมูล', w4.s === 200 && w4.j.errors.anywheel === 'source-unreachable' && w4.j.stale && w4.j.stale.anywheel && w4.j.stale.anywheel.at >= readOk && (w4.j.anywheel.monthly || []).some((r) => r.month === '2026-11') && !w4.j.sourceReadAt.anywheel && Object.keys(i4.j.errors).length === 0 && n4.s === 401 && !n4.j.anywheel, JSON.stringify({ e: w4.j.errors, st: w4.j.stale, i4: i4.j.errors, n4: n4.s }));
      // หัวคอลัมน์ต้นทางเปลี่ยน → source-schema (ไม่เดาคอลัมน์)
      const keep = AW_ROWS; AW_ROWS = keep.map((r) => r.slice()); const gb = gvizBody; NOW += 130e3; _coldIsolate(); db._db.exec("DELETE FROM stats_lkg WHERE k = 'anywheel'");
      let sch; try { sch = awAggregate({ head: ['วันที่', 'month', 'จำนวนครั้ง', 'x', 'y', 'z'], rows: [] }); } catch (e) { sch = e.code; }
      ok('[รอบ 14.3] หัวคอลัมน์ไม่ตรง (ไม่มี “เดือน”/“ระยะทาง”) → source-schema', sch === 'source-schema', String(sch)); void gb; AW_ROWS = awRowsBase();
      // ข้อสังเกตสร้างจากผลอ่าน: เดือนล่าสุด/วันไม่ครบ/นาทีว่าง/คุณภาพ — ไม่มีข้อความเดิม “30 มิ.ย.”/“ตั้งแต่ ก.ค.”
      const an = awNotes(awAggregate({ head: AW_HEAD.map((h) => h.replace(/\s+/g, '')), rows: awRowsBase() })).join(' | ');
      ok('[รอบ 14.3] ข้อสังเกต Anywheel สร้างจากข้อมูลจริง (วันที่ล่าสุด · วันไม่ครบ · คุณภาพแถว) ไม่ฝังเดือน', /ข้อมูลการใช้งานล่าสุดคือ 31 ต\.ค\. 2569/.test(an) && /ไม่ครบทุกวัน/.test(an) && /แถวที่อ่านเดือนไม่ได้ 1/.test(an) && !/30 มิ\.ย\.|ตั้งแต่ ก\.ค\./.test(an), an); }
  _reset(); }
console.log('รวม ' + n + ' ข้อ · ไม่ผ่าน ' + fails + ' (ทั้งหมดเป็นการทดสอบ local ด้วยของจำลอง)'); process.exit(fails ? 1 : 0);
