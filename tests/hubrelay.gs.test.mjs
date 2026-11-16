// tests/hubrelay.gs.test.mjs — ทดสอบตรรกะ apps-script/HubRelay.gs บนเครื่องด้วยบริการ Google จำลอง (MOCK ทั้งหมด)
// พิสูจน์เฉพาะตรรกะของสคริปต์ ไม่ได้พิสูจน์ว่า Deploy บน Google ทำงาน (ต้องตรวจจริงด้วย checkInstall + /api/sources)
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let n = 0, fails = 0; const ok = (name, c, info) => { n++; if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + name + (c || info === undefined ? '' : ' — ' + info)); };

function load(over = {}) {
  const props = Object.assign({}, over.props || {}), calls = [], logs = [];
  const SHEET = { 'Registrations_Motorcycle': [['Timestamp', 'RefCode', 'วิทยาเขต', 'คณะ/สถาบัน/ส่วนงาน', 'ชื่อ-นามสกุล', 'ประเภทนักศึกษา', 'ระดับการศึกษา', 'ประเภทเครื่องยนต์', 'จำนวนรถ', 'รถ1_ทะเบียน', 'รถ2_ทะเบียน', 'รถ3_ทะเบียน', 'อีเมล'],
    ['6/7/2026', 'MR-1', 'ศาลายา', 'คณะ ก', 'ชื่อสมมติ', '', '', 'สันดาป', '1', 'กข1', '', '', 'x@example.test'], ['', '', '', '', '', '', '', '', '', '', '', '', '']],
    'RuenThai_Survey': [['Timestamp', 'Ref_Code', 'Token_Code', 'Group_Type', 'Group_Label', 'User_SubType', 'Faculty_Dept', 'Sub_Unit_Project', 'Full_Name', 'Car_Count', 'Car1_Type', 'Car1_Plate', 'Car2_Type', 'Car2_Plate', 'LPR_Status'],
    ['2026-11-02 7:01', 'RT-1', 'TOKEN', 'B', 'กลุ่ม 2', 'จอดประจำ', 'ส่วนงาน', '', 'ชื่อผู้ตอบ', '1', 'รถยนต์', 'ทบ1', '', '', '']] };
  const FOLDERS = { root: { id: '1zLhp_JAQRLyL5hCtZHaxZu-24djV4PeH', parents: [] }, d09: { id: 'D09', parents: ['root'] }, d28: { id: 'D28', parents: ['d09'] }, other: { id: 'OTHERFOLDER', parents: [] } };
  const folder = (k) => ({ getId: () => FOLDERS[k].id, getName: () => k, getParents: () => iter(FOLDERS[k].parents.map(folder)) });
  const iter = (a) => { let i = 0; return { hasNext: () => i < a.length, next: () => a[i++] }; };
  const FILES = { GPSPHOTO000000000000000001: { mime: 'image/jpeg', parent: 'd28', size: 600000 }, OUTSIDEPHOTO00000000000001: { mime: 'image/jpeg', parent: 'other', size: 1000 },
    GPSPDF0000000000000000000001: { mime: 'application/pdf', parent: 'd28', size: 1000 }, GPSHUGE000000000000000000001: { mime: 'image/jpeg', parent: 'd28', size: 9e6 } };
  const blob = (ct) => ({ getContentType: () => ct, getBytes: () => [1, 2, 3] });
  const ctx = {
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = v; }, deleteProperty: (k) => { delete props[k]; } }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ setMimeType: () => ({ text: t }) }) },
    Utilities: { DigestAlgorithm: { SHA_256: 1 }, computeDigest: (a, s) => Array.from(Buffer.from(require_crypto().createHash('sha256').update(s).digest())).map((b) => (b > 127 ? b - 256 : b)), base64Encode: (b) => Buffer.from(b).toString('base64'), formatDate: () => '2026-11-16 22:00' },
    SpreadsheetApp: { openById: (id) => ({ getSheetByName: (tab) => (SHEET[tab] ? { getDataRange: () => ({ getDisplayValues: () => SHEET[tab] }), getLastRow: () => SHEET[tab].length } : null) }) },
    DriveApp: { getFileById: (id) => { const f = FILES[id]; if (!f) throw new Error('nf'); return { getMimeType: () => f.mime, getSize: () => f.size, getParents: () => iter([folder(f.parent)]), getBlob: () => blob(f.mime) }; }, getFolderById: (id) => ({ getName: () => 'SecurityGuardReports' }) },
    ScriptApp: { getOAuthToken: () => 'OAUTH-TOKEN-MOCK', getService: () => ({ getUrl: () => over.url === undefined ? 'https://script.google.com/a/macros/mahidol.ac.th/s/MOCKDEPLOYMENTID0000000001/exec' : over.url }) },
    UrlFetchApp: { fetch: (u, o) => { calls.push(u); if (/googleapis\.com\/drive/.test(u)) { if (over.thumbFail) throw new Error('drive api down'); return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ thumbnailLink: 'https://lh3.googleusercontent.com/thumb=s220' }) }; }
      if (/googleusercontent/.test(u)) return { getResponseCode: () => 200, getHeaders: () => ({ 'Content-Type': 'image/jpeg' }), getBlob: () => blob('image/jpeg') };
      const p = u.replace(/^https:\/\/mu-traffic-hub\.pages\.dev/, ''), body = JSON.parse(o.payload); const h = over.hub || {};
      const res = h[p] ? h[p](body) : { ok: false, code: 'not-found' }; return { getResponseCode: () => (res.ok ? 200 : 403), getContentText: () => JSON.stringify(res) }; } },
    Logger: { log: (m) => logs.push(String(m)) }, JSON, Object, Array, String, Number, Error, Math
  };
  vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(ROOT, 'apps-script/HubRelay.gs'), 'utf8').replace("'__ENROLL_TOKEN__'", "'" + (over.token || 'aa'.repeat(24)) + "'"), ctx);
  const post = (b) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(b) } }).text);
  return { ctx, props, calls, logs, post };
}
import crypto from 'node:crypto'; function require_crypto() { return crypto; }
const SEC = 'f'.repeat(64);

// ---- คำขอจาก Worker ----
let G = load({ props: { RELAY_SECRET: SEC } });
ok('ไม่มีค่าลับ → forbidden', G.post({ action: 'ping' }).code === 'forbidden');
ok('ค่าลับผิด → forbidden (ไม่มีข้อมูล)', G.post({ action: 'table', source: 'ruenthai', secret: 'e'.repeat(64) }).code === 'forbidden');
ok('ยังไม่มีค่าลับในสคริปต์ → ทุกคำขอ forbidden', load().post({ action: 'ping', secret: '' }).code === 'forbidden');
let r = G.post({ action: 'ping', secret: SEC }); ok('ping ตอบรุ่นโค้ด r11', r.ok && r.v === 'r11');
r = G.post({ action: 'table', source: 'staff', secret: SEC }); ok('ตารางนอกรายการ → unknown-source', r.code === 'unknown-source');
r = G.post({ action: 'table', source: 'studentMoto', secret: SEC, cols: ['RefCode', 'ชื่อ-นามสกุล', 'อีเมล', 'จำนวนรถ'], present: ['รถ1_ทะเบียน', 'อีเมล'] });
ok('ขอคอลัมน์นอกรายการ (ชื่อ/อีเมล) → ถูกตัดออก · ทะเบียนส่งเป็น 1/ว่าง · ข้ามแถวว่าง', r.ok && JSON.stringify(r.rows[0]) === JSON.stringify(['RefCode', 'จำนวนรถ', 'รถ1_ทะเบียน']) && JSON.stringify(r.rows[1]) === JSON.stringify(['MR-1', '1', '1']) && r.rows.length === 2 && !/ชื่อสมมติ|example\.test|กข1/.test(JSON.stringify(r)), JSON.stringify(r));
r = G.post({ action: 'table', source: 'ruenthai', secret: SEC }); ok('เรือนไทย: ไม่ส่ง Token/ชื่อ/ทะเบียน', r.ok && !/TOKEN|ชื่อผู้ตอบ|ทบ1/.test(JSON.stringify(r)) && r.rows[1].length === r.rows[0].length);
r = G.post({ action: 'img', id: 'GPSPHOTO000000000000000001', w: 800, secret: SEC }); ok('ภาพใต้โฟลเดอร์ GPS (โฟลเดอร์ย่อย 2 ชั้น) → ได้ภาพ ไม่มี OAuth token ในผลลัพธ์', r.ok && r.mime === 'image/jpeg' && !!r.b64 && !/OAUTH/.test(JSON.stringify(r)));
ok('ภาพนอกโฟลเดอร์ที่อนุญาต → not-allowed', G.post({ action: 'img', id: 'OUTSIDEPHOTO00000000000001', w: 400, secret: SEC }).code === 'not-allowed');
ok('ไฟล์ที่ไม่ใช่ภาพ → not-allowed', G.post({ action: 'img', id: 'GPSPDF0000000000000000000001', w: 400, secret: SEC }).code === 'not-allowed');
ok('ไม่มีไฟล์ → not-found', G.post({ action: 'img', id: 'NOSUCHFILE00000000000000001', w: 400, secret: SEC }).code === 'not-found');
G = load({ props: { RELAY_SECRET: SEC }, thumbFail: true });
r = G.post({ action: 'img', id: 'GPSPHOTO000000000000000001', w: 1600, secret: SEC }); ok('Drive API/รูปย่อล้มเหลว → ทางสำรอง (ไฟล์ต้นฉบับ) ทำงานจริง', r.ok && r.mime === 'image/jpeg');
ok('ทางสำรองจำกัดขนาด (> 4 MB → too-large)', G.post({ action: 'img', id: 'GPSHUGE000000000000000000001', w: 400, secret: SEC }).code === 'too-large');

// ---- setup / checkInstall ----
const okCheck = { ok: true, state: 'active', promoted: true, check: { ping: 'ok', version: 'r11', tables: { studentMoto: 'ok:1', ruenthai: 'ok:1' }, image: 'ok', ok: true } };
let enrolls = 0;
G = load({ hub: { '/api/relay/enroll': () => { enrolls++; return { ok: true, secret: SEC }; }, '/api/relay/confirm': () => okCheck } });
ok('setup ครั้งแรก: ลงทะเบียน → เก็บค่าลับ → ให้ระบบตรวจ /exec จริง', G.ctx.setup() === 'ok' && G.props.RELAY_SECRET === SEC && enrolls === 1 && G.logs.some((l) => /ติดตั้งสำเร็จ/.test(l)));
ok('setup ซ้ำหลังติดตั้ง: ไม่ใช้ token ซ้ำ ตรวจอย่างเดียว', G.ctx.setup() === 'ok' && enrolls === 1 && G.logs.some((l) => /ไม่ใช้ token ซ้ำ/.test(l)));
G = load({ hub: { '/api/relay/enroll': () => ({ ok: false, code: 'enroll-used' }) } });
let err = ''; try { G.ctx.setup(); } catch (e) { err = e.message; }
ok('token ถูกใช้แล้ว (ลงทะเบียนค้าง) → บอกวิธีกู้คืนด้วย ENROLL_TOKEN ไม่บังคับสร้างโปรเจกต์ใหม่', /enroll-used/.test(err) && /ENROLL_TOKEN/.test(err) && !G.props.RELAY_SECRET);
G = load({ props: { ENROLL_TOKEN: 'bb'.repeat(24) }, hub: { '/api/relay/enroll': (b) => (b.token === 'bb'.repeat(24) ? { ok: true, secret: SEC } : { ok: false, code: 'enroll-bad-token' }), '/api/relay/confirm': () => okCheck } });
ok('กู้คืน: token ใหม่ใน Script Properties ใช้แทนค่าในโค้ด แล้วลบทิ้งหลังใช้', G.ctx.setup() === 'ok' && !G.props.ENROLL_TOKEN && G.props.RELAY_SECRET === SEC);
G = load({ props: { RELAY_SECRET: SEC }, hub: { '/api/relay/confirm': () => ({ ok: false, code: 'check-failed', check: { ping: 'relay-login-required', tables: {} } }) } });
err = ''; try { G.ctx.checkInstall(); } catch (e) { err = e.message; } ok('ระบบเรียก /exec แล้วเจอหน้า Login → บอกให้ Deploy แบบ Anyone', /Anyone/.test(err));
G = load({ props: { RELAY_SECRET: SEC }, hub: { '/api/relay/confirm': () => ({ ok: false, code: 'check-failed', check: { ping: 'outdated', version: 'r10', tables: {} } }) } });
err = ''; try { G.ctx.checkInstall(); } catch (e) { err = e.message; } ok('Deploy เป็นโค้ดรุ่นเก่า → บอกให้ New version', /New version/.test(err));
G = load({ url: 'https://script.google.com/macros/s/X/dev' }); err = ''; try { G.ctx.setup(); } catch (e) { err = e.message; } ok('ยังไม่ได้ Deploy เป็น Web app → แจ้งให้ Deploy ก่อน', /Deploy/.test(err));
G = load({ url: 'https://script.google.com/macros/s/X/dev', props: { RELAY_EXEC_URL: 'https://script.google.com/a/macros/mahidol.ac.th/s/MOCKDEPLOYMENTID0000000009/exec' }, hub: { '/api/relay/enroll': (b) => { G.enrolledUrl = b.url; return { ok: true, secret: SEC }; }, '/api/relay/confirm': () => okCheck } });
ok('getUrl() เป็น /dev แต่ใส่ RELAY_EXEC_URL ไว้ → ใช้ URL /exec ที่ใส่', G.ctx.setup() === 'ok' && /0009\/exec$/.test(G.enrolledUrl));
console.log('รวม ' + n + ' ข้อ · ไม่ผ่าน ' + fails + ' (ตรรกะสคริปต์กับบริการ Google จำลอง)'); process.exit(fails ? 1 : 0);
