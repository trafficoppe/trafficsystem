// worker/tests/worker.test.mjs — ทดสอบบริการกลางแบบ local: node worker/tests/worker.test.mjs
// ทุกอย่างเป็นของจำลอง: D1 = SQLite ในหน่วยความจำ · Google Sheets/Drive/GitHub/Workers AI = MOCK · รหัสพนักงานและชื่อเป็นค่าสมมติ
// ผลที่ผ่านพิสูจน์ตรรกะของโค้ดเท่านั้น ไม่ได้พิสูจน์ว่าบริการที่ Deploy แล้วทำงานกับแหล่งจริง
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { handle, SCHEMA, _reset, parseCsv, parseCidrs, ipNum, normDT, persons } from '../src/index.js';
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
const fetchMock = async (u, o) => { u = String(u);
  let m = /docs\.google\.com\/spreadsheets\/d\/[\w-]+\/export\?format=csv&gid=(\d+)/.exec(u);
  if (m) { if (sourceDown) return new Response('<html>Sign in</html>', { status: 200, headers: { 'content-type': 'text/html' } }); return SHEETS[m[1]] ? new Response(csv(SHEETS[m[1]]), { headers: { 'content-type': 'text/csv; charset=utf-8' } }) : new Response('', { status: 404 }); }
  m = /raw\.githubusercontent\.com\/trafficoppe\/trafficsystem\/[0-9a-f]+\/(.+)$/.exec(u);
  if (m) { const f = path.join(ROOT, m[1]); return fs.existsSync(f) ? new Response(fs.readFileSync(f)) : new Response('', { status: 404 }); }
  m = /drive\.google\.com\/thumbnail\?id=([\w-]+)&sz=w(\d+)/.exec(u);
  if (m) return m[1] === IMG1 || m[1] === IMG2 ? new Response(new Uint8Array([137, 80, 78, 71]), { headers: { 'content-type': 'image/png' } }) : new Response('<html>', { headers: { 'content-type': 'text/html' } });
  return new Response('', { status: 404 }); };
let NOW = Date.parse('2026-11-15T19:00:00+07:00');
const deps = { fetch: fetchMock, now: () => NOW };
const ENV = (o = {}) => Object.assign({ DB: db, ASSET_REF: '7c183a7', ADMIN_CODES: '4567', SHEET_MAIN: 'MOCKMAIN', SHEET_LF: 'MOCKLF', SHEET_OPS: 'MOCKOPS', SHEET_EVENTS: 'MOCKEV', SHEET_GPS: 'MOCKGPS', AI_MODEL: '@cf/mock/model',
  AI: { run: async (model, input) => { aiCalls.push({ model, input }); if (ENV.aiThrow) throw new Error(ENV.aiThrow); return { response: ENV.aiReply || 'เดือน พ.ย. 2569 มีเหตุการณ์รวม 3 เหตุการณ์ (ข้อมูล ณ 15 พ.ย. 2569 19:00 น.)' }; } } }, o);
let db = d1();
const req = (p, o = {}) => new Request('https://hub.example.test' + p, { method: o.method || 'GET', headers: Object.assign({ 'CF-Connecting-IP': o.ip || '10.20.5.9' }, o.cookie ? { Cookie: o.cookie } : {}, o.origin ? { Origin: o.origin } : {}, o.body ? { 'content-type': 'application/json' } : {}), body: o.body ? JSON.stringify(o.body) : undefined });
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
console.log('รวม ' + n + ' ข้อ · ไม่ผ่าน ' + fails + ' (ทั้งหมดเป็นการทดสอบ local ด้วยของจำลอง)'); process.exit(fails ? 1 : 0);
