// worker/tests/dev_server.mjs — รันบริการกลางตัวจริง (worker/src/index.js) บนเครื่อง เพื่อทดสอบหน้าเว็บ + บริการร่วมกัน
// ของจำลอง: D1 = SQLite ในหน่วยความจำ · Google Sheets/Drive = ชุดข้อมูลสมมติด้านล่าง · Workers AI = คำตอบตายตัว · IP ผู้เรียก = 203.0.113.50 (ภายนอก)
// ใช้: node worker/tests/dev_server.mjs [port]   (ต้องรัน sh tools/build_site.sh ก่อน)
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { DatabaseSync } from 'node:sqlite';
import { handle, SCHEMA, _reset } from '../src/index.js';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), SITE = path.join(ROOT, 'site');
const db = new DatabaseSync(':memory:'); SCHEMA.forEach((s) => db.exec(s));
const st = (sql, a = []) => ({ bind: (...x) => st(sql, x), first: async () => db.prepare(sql).get(...a) || null, all: async () => ({ results: db.prepare(sql).all(...a) }), run: async () => { db.prepare(sql).run(...a); return {}; }, _x: () => (/^\s*select/i.test(sql) ? { results: db.prepare(sql).all(...a) } : (db.prepare(sql).run(...a), { results: [] })) });
const DB = { prepare: (sql) => st(sql), batch: async (l) => { db.exec('BEGIN'); try { const r = l.map((s) => s._x()); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; } } };
['1|ส.ต1|ชื่อสมมติ หนึ่ง (MOCK)', '1|วิทยุ|ชื่อสมมติ สอง (MOCK)', '2|ส.ต1|ชื่อสมมติ สาม (MOCK)', '3|ส.ต1|ชื่อสมมติ สี่ (MOCK)', '4|ส.ต1|ชื่อสมมติ ห้า (MOCK)'].forEach((x, i) => { const [t, r, n] = x.split('|'); db.prepare('INSERT INTO roster(id, team, role, name, active, ord, updated) VALUES(?, ?, ?, ?, 1, ?, 0)').run('r_seed' + i, t, r, n, i); });
const ID = (n) => 'MOCKDRIVEFILEID' + String(n).padStart(16, '0'), D = (id) => 'https://drive.google.com/file/d/' + id + '/view';
const IH = ['วันเวลาที่บันทึก', 'ช่องทางรับแจ้ง', 'ประเภทผู้แจ้ง', 'วันที่เกิดเหตุ', 'เวลาเกิดเหตุ', 'เวลาได้รับแจ้ง', 'เวลาเข้าถึงที่เกิดเหตุ', 'สถานที่เกิดเหตุ', 'พิกัด (Lat, Lng)', 'ประเภทเหตุการณ์', 'พาหนะคันที่ 1', 'ประเภทผู้ขับขี่คันที่ 1', 'คู่กรณี/พาหนะคันที่ 2', 'ประเภทผู้ขับขี่คันที่ 2', 'การเสียหายของทรัพย์สิน', 'รายละเอียดทรัพย์สินเสียหาย', 'การมีผู้บาดเจ็บ/ผู้ป่วย', 'จำนวนคนเจ็บ/ป่วย', 'รายละเอียดผู้บาดเจ็บ/ป่วยทั้งหมด', 'สาเหตุของเหตุการณ์', 'วิธีการเคลื่อนย้าย', 'ส่งต่อสถานพยาบาลปลายทาง', 'รายละเอียดเหตุการณ์เพิ่มเติม', 'ลิงก์รูปภาพเหตุการณ์', 'ข้อมูลสรุป KPI', 'รหัสเหตุการณ์'];
const inc = (n, date, type, ll, inj, pd) => ['15/11/2026 9:0' + (n % 10) + ':00', 'วิทยุสื่อสาร', 'รปภ.', date, '9:00', '9:01', '9:04', 'จุดสมมติ ' + n, ll, type, '-', '-', '-', '-', '-', '-', inj === '-' ? '-' : +inj > 0 ? 'มี' : 'ไม่มี', inj, pd, '-', '-', '-', 'รายละเอียดสมมติ ' + n, D(ID(n)), '✅ เป็นไปตาม KPI | 3 นาที', 'INC-MOCK-' + n];
const P1 = (t) => '[คนที่ 1] ประเภท: ' + t + ' | ชื่อ: ผู้บาดเจ็บสมมติ | โทร: 000 | อาการ: ถลอก';
// 10 เหตุ: บนถนน 4 (เจ็บ 1+2+0+0) · ทั่วไป 2 (เจ็บ 1+1) · รับส่งผู้ป่วย 2 · บังคับล้อ 1 · ลักทรัพย์ 1 — ต.ค. 4 เหตุ / พ.ย. 6 เหตุ
const INC = [IH, inc(1, '2026-10-05', 'อุบัติเหตุจากยานพาหนะ', '13.7950, 100.3220', '1', P1('นักศึกษา')), inc(2, '2026-10-12', 'อุบัติเหตุจากยานพาหนะ', '13.7960, 100.3230', '2', P1('บุคลากร') + ' ' + P1('บุคคลภายนอก').replace('คนที่ 1', 'คนที่ 2')), inc(3, '2026-10-20', 'อุบัติเหตุทั่วไป', '13.7940, 100.3210', '1', P1('Outsource')), inc(4, '2026-10-28', 'รับส่งผู้ป่วย', '-', '1', P1('นักศึกษา')),
  inc(5, '2026-11-02', 'อุบัติเหตุจากยานพาหนะ', '13.7970, 100.3240', '0', '-'), inc(6, '2026-11-05', 'อุบัติเหตุจากยานพาหนะ', '-', '0', '-'), inc(7, '2026-11-09', 'อุบัติเหตุทั่วไป', '13.7930, 100.3200', '1', '-'), inc(8, '2026-11-10', 'รับส่งผู้ป่วย', '-', '1', P1('บุคลากร')), inc(9, '2026-11-11', 'บังคับล้อ', '13.79, 100.32', '-', '-'), inc(10, '2026-11-13', 'ลักทรัพย์', '-', '-', '-')];
const LFH = ['Timestamp', 'RefCode', 'ประเภท', 'ชื่อ-นามสกุล', 'ประเภทบุคคล', 'คณะ/หน่วยงาน', 'เบอร์โทร', 'วันที่เกิดเหตุ', 'เวลา', 'รายละเอียด', 'สถานที่', 'URL รูปภาพ', 'สถานะ', 'การดำเนินการ', 'วันที่อัปเดต', 'อัปเดตโดย'];
const LF = [LFH]; for (let i = 1; i <= 15; i++) { const ty = i % 3 === 0 ? 'พบสิ่งของ' : i % 5 === 0 ? 'รับของคืน' : 'สิ่งของสูญหาย', stt = i % 4 === 0 ? 'รับของคืนแล้ว' : i % 3 === 0 ? 'เจ้าของยังไม่มารับคืน' : 'รอดำเนินการ'; LF.push(['2026-11-' + String(i).padStart(2, '0') + ' 10:00:00', 'REF-MOCK-' + i, ty, 'ผู้แจ้งสมมติ ' + i, 'นักศึกษา', 'คณะสมมติ', '000-MOCK-' + i, '2026-11-' + String(i).padStart(2, '0'), '09:00', 'ของสมมติชิ้นที่ ' + i, i % 2 ? 'อาคารสมมติ A' : 'อาคารสมมติ B', i <= 3 ? D(ID(100 + i)) : '', stt, '', '', '']); }
const SHEETS = {
  '1850713009': [['ชื่อ-สกุล', 'ตำแหน่ง', 'รหัสพนักงาน', 'เบอร์โทร', 'URL_รูปภาพ_1', 'หน่วย', 'หัวหน้าหน่วย', 'ลายเซน'], ['ผู้ใช้สมมติ ก (MOCK)', 'พนักงานสมมติ', '0123', '000', '', 'หน่วยปฏิบัติการจราจรและรักษาความปลอดภัย', '', 'SIG'], ['ผู้ดูแลสมมติ ข (MOCK)', 'หัวหน้าสมมติ', '4567', '', '', 'หน่วยยุทธศาสตร์และพัฒนาระบบความปลอดภัย', 'หัวหน้าหน่วยยุทธศาสตร์', ''], ['ผู้ใช้สมมติ ค (MOCK)', 'พนักงานสมมติ', '8899', '', '', 'หน่วยปฏิบัติการจราจรและรักษาความปลอดภัย', '', '']],
  '480256005': INC, '2074352966': LF,
  '659712341': [['วันที่ของข้อมูล', 'เวลาที่บันทึกเข้าระบบ', 'รถยนต์ ประตู 1', 'มอไซค์ ประตู 1', 'ไม่สวมหมวก ประตู 1'], ['2026-11-14', '15/11/2026 8:00:00', '1,000', '300', '5'], ['2026-11-15', '15/11/2026 17:00:00', '900', '200', '4']],
  '1811117659': [['วันที่บันทึก', 'ปี พ.ศ.', 'ประเภท', 'เลขอ้างอิง', 'สถานะ']].concat(LF.slice(1).map((r) => [r[0].slice(0, 10), 'พ.ศ. 2569', r[2], r[1], r[12]])),
  '1509680619': [['วันที่/เวลา', 'ชื่อไฟล์', 'ลิงก์ภาพ', 'หมวดหมู่'], ['15/11/2026 7:00:00', 'a.jpg', D(ID(201)), 'ตรวจพื้นที่'], ['15/11/2026 8:00:00', 'b.jpg', D(ID(202)), 'ตรวจพื้นที่'], ['14/11/2026 7:00:00', 'c.jpg', D(ID(203)), 'ตรวจพื้นที่'], ['14/11/2026 9:00:00', '20261114_090512 - ผู้ส่งสมมติ.jpg', D(ID(204)), 'ช่วยเหลือ']],
  '1354124607': [['วันเวลาที่บันทึก', 'เจ้าหน้าที่ศูนย์วิทยุ', 'หน่วยงานที่แจ้ง', 'ชื่อ รปภ./ผู้แจ้ง', 'ประเภทเหตุการณ์', 'สถานที่เกิดเหตุ', 'รายละเอียด/ข้อความ', 'การดำเนินการของศูนย์', 'สถานะ'], ['15/11/2026 6:00:00', 'ศูนย์สมมติ', 'หน่วยสมมติ', 'ผู้แจ้งสมมติ', 'แจ้งเหตุทั่วไป', 'จุดสมมติ', 'ข้อความสมมติ', 'รับทราบ', 'รับแจ้ง']],
  // กิจกรรมพิเศษ: วันที่ต้นทางเป็น เดือน/วัน/ปี (เช่น 9/30/2026 = 30 ก.ย. 2569) · ประเภท/สถานที่ว่างได้ · ภาพได้ถึง 3 ภาพ
  '0': [['ด', 'ชื่อ นามสกุล', 'ตำแหน่ง', 'หน่วยงาน', 'ประเภทเหตุการณ์', 'ระดับเหตุการณ์', 'สถานที่เกิดเหตุ', 'รายละเอียดเพิ่มเติม', 'รูปภาพ 1', 'รูปภาพ 2', 'รูปภาพ 3'],
    ['9/4/2026 10:10:32', 'ชื่อสมมติ', 'ตำแหน่งสมมติ', 'หน่วยสมมติ ก', 'จราจรติดขัด', 'ต่ำ', 'ประตู 1 (สมมติ)', 'รายละเอียดสมมติ 1', D(ID(41)), D(ID(42)), D(ID(43))],
    ['9/30/2026 14:05:00', 'ชื่อสมมติ', 'ตำแหน่งสมมติ', 'หน่วยสมมติ ข', '', 'กลาง', '', 'รายละเอียดสมมติ 2', '', '', ''],
    ['10/6/2026 8:00:00', 'ชื่อสมมติ', 'ตำแหน่งสมมติ', 'หน่วยสมมติ ก', 'จราจรติดขัด', 'สูง', 'ลานจอด (สมมติ)', 'รายละเอียดสมมติ 3', D(ID(44)), '', '']],
  '1074767452': [['Report_Type', 'Guard_Name', 'Guard_Company', 'Duty_Post', 'Duty', 'Event_Type', 'Report_Detail', 'Latitude', 'Longitude', 'GPS_Accuracy_M', 'Distance_From_Post_M', 'Geo_Status', 'Photo_File_ID', 'Record_Status', 'Report_Code', 'Report_Date', 'Report_Time', 'Guard_ID', 'Zone', 'Event_Severity', 'GPS_Status'], ['CHECKIN', 'รปภ.สมมติ', 'บริษัทสมมติ', 'จุด 1', 'เวรสมมติ', '', 'ปกติ', '13.79', '100.32', '12', '5', 'WITHIN_RADIUS', ID(51), 'COMPLETE', 'R-1', '2026-10-05', '08:00', 'G-1', 'A', '', 'OK'], ['CHECKIN', 'รปภ.สมมติ', 'บริษัทสมมติ', 'จุด 2', 'เวรสมมติ', '', 'ปกติ', '13.79', '100.32', '30', '90', 'OUTSIDE_RADIUS', '', 'COMPLETE', 'R-2', '2026-10-05', '09:00', 'G-1', 'B', '', 'OK']]
};
const csv = (rows) => rows.map((r) => r.map((c) => (/[",\n]/.test(c) ? '"' + String(c).replace(/"/g, '""') + '"' : c)).join(',')).join('\n');
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAGCAIAAABxZ0isAAAAFklEQVR4XmOsmNbOgA0wYRVlYKCLBADuLwGhta8zygAAAABJRU5ErkJggg==', 'base64');
export const control = { sourceDown: false, clock: 0 };      // clock = เลื่อนนาฬิกาของบริการ (ms) เพื่อทดสอบ TTL โดยไม่ต้องรอจริง
// รอบ 10: ตัวกลางอ่านไฟล์ส่วนตัว (MOCK) — เปิดไว้เป็นค่าเริ่มต้น (/__test/relay/off = ยังไม่ได้ติดตั้ง) · ภาพ GPS เป็นไฟล์ส่วนตัว อ่านได้เฉพาะผ่านตัวกลาง
const REL = 'https://script.google.com/macros/s/MOCKRELAYDEVSERVER0000000000001/exec', RSEC = 'f'.repeat(64), PRIVATE_IMG = new Set([ID(51)]);
const RT = {
  studentMoto: [['Timestamp', 'RefCode', 'วิทยาเขต', 'คณะ/สถาบัน/ส่วนงาน', 'ชื่อ-นามสกุล', 'ประเภทนักศึกษา', 'ระดับการศึกษา', 'ประเภทเครื่องยนต์', 'จำนวนรถ', 'รถ1_ทะเบียน', 'รถ2_ทะเบียน', 'รถ3_ทะเบียน'],
    ['6/7/2026, 15:07:04', 'MR-1', 'วิทยาเขตศาลายา', 'คณะสมมติ ก', 'ชื่อนักศึกษาสมมติ', '', '', 'สันดาป', '1', 'กข1', '', ''], ['7/7/2026, 10:00:00', 'MR-2', 'วิทยาเขตพญาไท', 'คณะสมมติ ข', 'ชื่อนักศึกษาสมมติ', '', '', 'ไฟฟ้า', '2', 'กข2', '', ''],
    ['8/7/2026, 10:00:00', 'MR-3', 'วิทยาเขตศาลายา', 'คณะสมมติ ก', 'ชื่อนักศึกษาสมมติ', '', '', 'สันดาป', '1', 'กข3', '', '']],
  ruenthai: [['Timestamp', 'Ref_Code', 'Group_Type', 'Group_Label', 'User_SubType', 'Faculty_Dept', 'Sub_Unit_Project', 'Full_Name', 'Car_Count', 'Car1_Type', 'Car1_Plate', 'Car2_Type', 'Car2_Plate', 'LPR_Status'],
    ['2026-11-02 7:01:02', 'RT-1', 'B', 'กลุ่มที่ 2: บุคลากรส่วนงานอื่น', 'จอดประจำ', 'ส่วนงานสมมติ', 'หน่วยสมมติ', 'ชื่อผู้ตอบสมมติ', '1', 'รถยนต์ทั่วไป', 'ทบ1', '', '', 'รออัปเดตเข้ากล้อง'],
    ['2026-11-03 8:00:00', 'RT-2', 'A', 'กลุ่มที่ 1: บุคลากรคณะ', 'จอดประจำ', 'คณะสมมติ', '', 'ชื่อผู้ตอบสมมติ', '2', 'รถยนต์ทั่วไป', 'ทบ2', 'รถกระบะ', 'ทบ3', ''],
    ['2026-11-04 9:00:00', 'RT-3', 'C', 'กลุ่มที่ 3: อื่น ๆ', 'อื่น ๆ', '', '', '', '1', 'รถยนต์ทั่วไป', 'ทบ4', '', '', 'อัปเดตแล้ว']]
};
const relayOn = (on) => { db.exec("DELETE FROM meta WHERE k IN ('relay_url', 'relay_secret')"); if (on) { db.prepare("INSERT INTO meta(k, v) VALUES('relay_url', ?)").run(REL); db.prepare("INSERT INTO meta(k, v) VALUES('relay_secret', ?)").run(RSEC); } };
relayOn(true);
const fetchMock = async (u, o) => { u = String(u); let m = /export\?format=csv&gid=(\d+)/.exec(u);
  if (u === REL) { const b = JSON.parse(o.body); if (b.secret !== RSEC) return Response.json({ ok: false, code: 'forbidden' });
    if (b.action === 'ping') return Response.json({ ok: true, v: 'r13' });
    if (b.action === 'table') { const T = RT[b.source], want = b.cols.concat(b.present), ix = want.map((c) => T[0].indexOf(c)); return Response.json({ ok: true, rows: [want].concat(T.slice(1).map((r) => ix.map((i, k) => (k < b.cols.length ? r[i] : (r[i] ? '1' : ''))))) }); }
    if (b.action === 'img') return PRIVATE_IMG.has(b.id) ? Response.json({ ok: true, mime: 'image/png', b64: PNG.toString('base64') }) : Response.json({ ok: false, code: 'not-allowed' });
    return Response.json({ ok: false, code: 'unknown-action' }); }
  if (m) return control.sourceDown ? new Response('<html>', { headers: { 'content-type': 'text/html' } }) : SHEETS[m[1]] ? new Response(csv(SHEETS[m[1]]), { headers: { 'content-type': 'text/csv' } }) : new Response('', { status: 404 });
  m = /drive\.google\.com\/thumbnail\?id=([-\w]+)/.exec(u); if (m) return PRIVATE_IMG.has(m[1]) ? new Response('<html>Sign in</html>', { headers: { 'content-type': 'text/html' } }) : new Response(PNG, { headers: { 'content-type': 'image/png' } });
  return new Response('', { status: 404 }); };
const TYPES = { html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8', json: 'application/json; charset=utf-8', png: 'image/png', svg: 'image/svg+xml' };
const env = { DB, ADMIN_CODES: '4567', SHEET_MAIN: 'M', SHEET_LF: 'L', SHEET_OPS: 'O', SHEET_EVENTS: 'E', SHEET_GPS: 'G', SHEET_VEH_STUDENT: 'V', SHEET_RUENTHAI: 'R', AI_MODEL: '@cf/mock/model',
  AI: { run: async () => ({ response: '[คำตอบจากบริการ AI จำลอง] เดือน พ.ย. 2569 มีเหตุการณ์รวม 6 เหตุการณ์ (ข้อมูลตามช่วงที่ระบุ)' }) },
  ASSETS: { fetch: async (req) => { let p = new URL(req.url).pathname; if (p === '/') p = '/index.html'; const f = path.join(SITE, p); return f.startsWith(SITE) && fs.existsSync(f) && fs.statSync(f).isFile() ? new Response(fs.readFileSync(f), { headers: { 'content-type': TYPES[p.split('.').pop()] || 'application/octet-stream' } }) : new Response('Not found', { status: 404 }); } } };
export function start(port, opt = {}) {
  const srv = http.createServer(async (rq, rs) => {
    const chunks = []; for await (const c of rq) chunks.push(c);
    if (rq.url === '/__test/expire') { db.exec('DELETE FROM sessions'); rs.end('ok'); return; }
    if (rq.url.startsWith('/__test/today/')) {           // เพิ่ม/ถอดเหตุการณ์ “วันนี้” (เวลาไทย ณ ขณะทดสอบ) สำหรับทดสอบ “รายละเอียดเหตุการณ์วันนี้”
      const t = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10); INC.splice(11);
      if (rq.url.endsWith('on')) { const a = inc(21, t, 'อุบัติเหตุจากยานพาหนะ', '13.7951, 100.3221', '0', '-'), b = inc(22, t, 'รับส่งผู้ป่วย', '-', '1', P1('นักศึกษา'));
        a[10] = 'รถจักรยานยนต์'; a[11] = 'นักศึกษา'; a[12] = 'รถยนต์'; a[13] = 'บุคลากร'; a[4] = '11:25'; a[23] = D(ID(61)) + ', ' + D(ID(62)); b[4] = '8:10'; INC.push(a, b); }
      _reset(); rs.end('ok'); return; }
    if (rq.url.startsWith('/__test/relay/')) { relayOn(rq.url.endsWith('on')); _reset(); rs.end('ok'); return; }
    if (rq.url.startsWith('/__test/clock/')) { control.clock += +rq.url.slice(14) * 1000 || 0; rs.end('ok'); return; }      // รอบ 13
    if (rq.url.startsWith('/__test/moto/')) { RT.studentMoto[3][2] = rq.url.endsWith('shift') ? 'วิทยาเขตพญาไท' : 'วิทยาเขตศาลายา'; rs.end('ok'); return; }   // รอบ 13: ยอดรวมเท่าเดิม แต่การแยกตามวิทยาเขตเปลี่ยน
    if (rq.url.startsWith('/__test/source/')) { control.sourceDown = rq.url.endsWith('down'); rs.end('ok'); return; }
    const headers = new Headers(); for (const [k, v] of Object.entries(rq.headers)) if (typeof v === 'string') headers.set(k, v);
    headers.set('CF-Connecting-IP', opt.ip || '203.0.113.50');   // IP ภายนอกใดก็ได้ — ไม่มีด่านเครือข่ายเป็นค่าเริ่มต้น
    const req = new Request('http://localhost:' + port + rq.url, { method: rq.method, headers, body: ['GET', 'HEAD'].includes(rq.method) ? undefined : Buffer.concat(chunks) });
    const res = await handle(req, Object.assign({}, env, opt.env || {}), { fetch: fetchMock, now: () => Date.now() + control.clock });
    const h = {}; res.headers.forEach((v, k) => { h[k] = v; }); rs.writeHead(res.status, h); rs.end(Buffer.from(await res.arrayBuffer()));
  });
  return new Promise((ok) => srv.listen(port, '127.0.0.1', () => ok(srv)));
}
if (process.argv[1] && process.argv[1].endsWith('dev_server.mjs')) { const port = +process.argv[2] || 8770; await start(port); console.log('บริการกลาง (ของจำลอง) ที่ http://localhost:' + port + '/'); }
