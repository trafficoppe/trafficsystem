// server/tests/server.test.mjs — ทดสอบบริการข้อมูลภายในแบบ local (node server/tests/server.test.mjs)
// ทุกอย่างในไฟล์นี้เป็นการจำลอง: กุญแจ RSA สร้างใหม่ทุกครั้งที่รัน · Cloudflare Access certs / Apps Script / บริการ AI เป็น MOCK
// ไม่มีการเรียกเครือข่ายจริง ไม่มีค่าลับจริง ไม่มีการเขียนข้อมูลจริง — ผลที่ผ่านพิสูจน์ตรรกะของโค้ด ไม่ได้พิสูจน์ว่าระบบที่ Deploy แล้วทำงาน
import { webcrypto as wc } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { _resetKeyCache } from '../lib/auth.js';
import { _resetRate } from '../lib/ratelimit.js';
import { handleData } from '../functions/api/data.js';
import { handleForm, validateForm } from '../functions/api/form.js';
import { handleChat } from '../functions/api/chat.js';
import { handleRoster } from '../functions/api/roster.js';
import { buildFacts, numbersOk } from '../lib/facts.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const stats = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/stats.json'), 'utf8')), extra = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/extra.json'), 'utf8'));
let fails = 0, count = 0;
const ok = (name, cond, info) => { count++; if (!cond) fails++; console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' — ' + info : '')); };

const TEAM = 'mock-team.cloudflareaccess.com', AUD = 'mock-aud-0123456789', NOW = Date.parse('2026-11-15T19:00:00+07:00');
const b64u = (buf) => Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
const mkKey = async () => wc.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const K1 = await mkKey(), K2 = await mkKey();
const jwk1 = Object.assign(await wc.subtle.exportKey('jwk', K1.publicKey), { kid: 'kid-1' });
const sign = async (payload, o = {}) => {
  const head = b64u(JSON.stringify(Object.assign({ alg: 'RS256', kid: 'kid-1', typ: 'JWT' }, o.header || {}))), body = b64u(JSON.stringify(payload)), data = head + '.' + body;
  if (o.none) return data + '.';
  if (o.hs) return data + '.' + b64u(await wc.subtle.sign('HMAC', await wc.subtle.importKey('raw', Buffer.from(jwk1.n), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), Buffer.from(data)));
  return data + '.' + b64u(await wc.subtle.sign('RSASSA-PKCS1-v1_5', (o.key || K1).privateKey, Buffer.from(data)));
};
const claims = (o = {}) => Object.assign({ iss: 'https://' + TEAM, aud: [AUD], exp: Math.floor(NOW / 1000) + 3600, nbf: Math.floor(NOW / 1000) - 60, iat: Math.floor(NOW / 1000) - 60, email: 'officer@example.ac.th', sub: 'u1' }, o);
const ENV = (o = {}) => Object.assign({ ACCESS_TEAM_DOMAIN: TEAM, ACCESS_AUD: AUD, HUB_ALLOW_DATA: 'officer@example.ac.th', HUB_ALLOW_FORM: 'officer@example.ac.th', HUB_ALLOW_CHAT: '@example.ac.th',
  HUB_GS_URL: 'https://script.google.com/macros/s/MOCK_DEPLOYMENT_ID/exec', HUB_SHARED_SECRET: 'mock-shared-secret-not-real-0123456789abcdef', LLM_API_URL: 'https://llm.invalid/v1/messages', LLM_API_KEY: 'mock-key-not-real', LLM_MODEL: 'mock-model' }, o);
const calls = [];
const mkFetch = (o = {}) => async (url, init) => {
  url = String(url); calls.push({ url, init });
  if (url.endsWith('/cdn-cgi/access/certs')) return new Response(JSON.stringify({ keys: [jwk1] }), { status: 200 });
  if (url.startsWith('https://script.google.com/')) { const b = JSON.parse(init.body);
    if (o.gs) return new Response(JSON.stringify(o.gs(b)), { status: 200 });
    if (b.action === 'read') return new Response(JSON.stringify({ ok: true, asOf: '2026-11-15 19:00', rows: [{ name: 'บุคลากรสมมติ (MOCK)', position: 'ตำแหน่งสมมติ', phone: '', photo: 'MOCKFILEID00000000000000001', unit: 'หน่วยสมมติ', isHead: true, staffCode: 'SHOULD-NOT-PASS', signature: 'SHOULD-NOT-PASS' }] }), { status: 200 });
    return new Response(JSON.stringify({ ok: true, ref: 'HUB-MOCK-001' }), { status: 200 }); }
  if (url.startsWith('https://llm.invalid/')) return new Response(JSON.stringify({ content: [{ type: 'text', text: o.llm || 'เดือน ต.ค. 2569 มีรถรางบริการพิเศษ 33 งาน 58 รอบ (ข้อมูล ณ 30 ต.ค. 2569)' }] }), { status: 200 });
  return new Response('', { status: 404 });
};
const req = (p, o = {}) => new Request('https://hub.example.ac.th' + p, { method: o.method || 'GET', headers: Object.assign({}, o.token ? { 'Cf-Access-Jwt-Assertion': o.token } : {}, o.headers || {}), body: o.body });
const opts = (o = {}) => ({ fetch: mkFetch(o), now: () => o.now || NOW, loadStats: async () => ({ stats, extra }) });
const run = async (h, r, env, o) => { const res = await h(r, env, opts(o)); return { s: res.status, j: await res.json().catch(() => null), h: res.headers }; };
const gsCalls = () => calls.filter((c) => c.url.startsWith('https://script.google.com/')).length;

// ---------- 1) การตรวจตัวตน (ใช้ /api/data เป็นตัวแทน) ----------
let r;
r = await run(handleData, req('/api/data?dataset=staff'), ENV()); ok('ไม่ Login (ไม่มี token) → 401 และไม่เรียกต้นทาง', r.s === 401 && r.j.code === 'no-token' && gsCalls() === 0, r.s + ' ' + r.j.code);
r = await run(handleData, req('/api/data?dataset=staff', { token: 'abc' }), ENV()); ok('มี header แต่ไม่ใช่ JWT → 401 (การมี header อย่างเดียวไม่ผ่าน)', r.s === 401 && gsCalls() === 0, r.j.code);
r = await run(handleData, req('/api/data?dataset=staff', { token: await sign(claims(), { none: true, header: { alg: 'none' } }) }), ENV()); ok('JWT alg=none → 401', r.s === 401, r.j.code);
r = await run(handleData, req('/api/data?dataset=staff', { token: await sign(claims(), { hs: true, header: { alg: 'HS256' } }) }), ENV()); ok('JWT alg=HS256 (ปลอมด้วยกุญแจสาธารณะ) → 401', r.s === 401 && r.j.code === 'bad-alg', r.j.code);
r = await run(handleData, req('/api/data?dataset=staff', { token: await sign(claims(), { key: K2 }) }), ENV()); ok('ลายเซ็นจากกุญแจอื่น → 401', r.s === 401 && r.j.code === 'bad-signature', r.j.code);
{ const t = await sign(claims()), p = t.split('.'); p[1] = b64u(JSON.stringify(claims({ email: 'attacker@example.ac.th' }))); r = await run(handleData, req('/api/data?dataset=staff', { token: p.join('.') }), ENV({ HUB_ALLOW_DATA: 'attacker@example.ac.th' })); ok('แก้ payload หลังเซ็น → 401', r.s === 401 && r.j.code === 'bad-signature', r.j.code); }
r = await run(handleData, req('/api/data?dataset=staff', { token: await sign(claims({ iss: 'https://other-team.cloudflareaccess.com' })) }), ENV()); ok('issuer ไม่ตรง → 401', r.s === 401 && r.j.code === 'bad-issuer', r.j.code);
r = await run(handleData, req('/api/data?dataset=staff', { token: await sign(claims({ aud: ['another-app'] })) }), ENV()); ok('audience ไม่ตรง (token ของแอปอื่น) → 401', r.s === 401 && r.j.code === 'bad-audience', r.j.code);
r = await run(handleData, req('/api/data?dataset=staff', { token: await sign(claims({ exp: Math.floor(NOW / 1000) - 5 })) }), ENV()); ok('session หมดอายุ → 401', r.s === 401 && r.j.code === 'expired', r.j.code);
r = await run(handleData, req('/api/data?dataset=staff', { token: await sign(claims({ nbf: Math.floor(NOW / 1000) + 3600 })) }), ENV()); ok('token ยังไม่ถึงเวลาใช้ → 401', r.s === 401, r.j.code);
r = await run(handleData, req('/api/data?dataset=staff', { token: await sign(claims({ kid: 'x' }), { header: { kid: 'kid-unknown' } }) }), ENV()); ok('kid ที่ไม่รู้จัก → 401', r.s === 401 && r.j.code === 'unknown-key', r.j.code);
r = await run(handleData, req('/api/data?dataset=staff', { token: await sign(claims({ email: 'someone@example.ac.th' })) }), ENV()); ok('Login แล้วแต่ไม่อยู่ในรายชื่อผู้มีสิทธิ์ → 403', r.s === 403 && r.j.code === 'forbidden' && gsCalls() === 0, r.j.code);
r = await run(handleData, req('/api/data?dataset=staff', { token: await sign(claims()) }), ENV({ HUB_ALLOW_DATA: '' })); ok('ยังไม่ได้ตั้งรายชื่อผู้มีสิทธิ์ → 403 (ปิดไว้ก่อน)', r.s === 403 && r.j.code === 'no-allowlist', r.j.code);
r = await run(handleData, req('/api/data?dataset=staff', { token: await sign(claims({ email: undefined, common_name: 'service-token' })) }), ENV()); ok('service token (ไม่มีอีเมล) → 403', r.s === 403 && r.j.code === 'no-identity', r.j.code);
_resetKeyCache(); r = await run(handleData, req('/api/data?dataset=staff', { token: await sign(claims()) }), ENV({ ACCESS_AUD: '' })); ok('ยังไม่ได้ตั้งค่า Access → 503 (ไม่เปิดให้ใช้โดยไม่มีการตรวจ)', r.s === 503 && r.j.code === 'not-configured', r.j.code);
r = await run(handleData, req('/api/data?dataset=staff', { headers: { Cookie: 'x=1; CF_Authorization=' + (await sign(claims())) } }), ENV()); ok('รับ token จาก cookie CF_Authorization ได้ (ตรวจเหมือนกัน)', r.s === 200, r.s);

// ---------- 2) /api/data ----------
calls.length = 0; r = await run(handleData, req('/api/data?dataset=staff', { token: await sign(claims()) }), ENV());
ok('ผู้มีสิทธิ์ → 200 พร้อมแถวข้อมูล', r.s === 200 && r.j.ok === true && r.j.rows.length === 1, r.s);
ok('ส่งกลับเฉพาะคอลัมน์ที่อนุญาต (ตัดรหัสพนักงาน/ลายเซ็นที่ต้นทางส่งเกินมา)', Object.keys(r.j.rows[0]).join() === 'name,position,phone,photo,unit,isHead' && !/SHOULD-NOT-PASS/.test(JSON.stringify(r.j)));
ok('คำตอบไม่ให้ cache และไม่เปิด CORS แบบ *', /no-store/.test(r.h.get('cache-control')) && r.h.get('access-control-allow-origin') === null);
{ const c = calls.find((x) => x.url.startsWith('https://script.google.com/')); ok('ค่าลับร่วมส่งใน body ไม่อยู่ใน URL', !/secret|mock-shared/.test(c.url) && JSON.parse(c.init.body).secret === ENV().HUB_SHARED_SECRET && c.init.method === 'POST'); }
r = await run(handleData, req('/api/data?dataset=secrets', { token: await sign(claims()) }), ENV()); ok('ชุดข้อมูลนอกรายการ → 400', r.s === 400 && r.j.code === 'unknown-dataset', r.j.code);
r = await run(handleData, req('/api/data?dataset=staff', { token: await sign(claims()) }), ENV({ HUB_GS_URL: '' })); ok('ยังไม่ได้ตั้ง URL ต้นทาง → 503', r.s === 503, r.j.code);
r = await run(handleData, req('/api/data?dataset=radio', { token: await sign(claims()) }), ENV(), { gs: () => ({ ok: false, code: 'schema' }) }); ok('ต้นทางตอบผิดพลาด → 502 (ไม่ส่งข้อมูลเปล่าเป็นสำเร็จ)', r.s === 502, r.j.code);
r = await run(handleData, req('/api/data?dataset=staff', { token: await sign(claims()), headers: { Origin: 'https://hub-pages.example.ac.th' } }), ENV({ ALLOWED_ORIGIN: 'https://hub-pages.example.ac.th' })); ok('ตั้ง ALLOWED_ORIGIN → ตอบ CORS เฉพาะโดเมนนั้นพร้อม credentials', r.h.get('access-control-allow-origin') === 'https://hub-pages.example.ac.th' && r.h.get('access-control-allow-credentials') === 'true');
r = await run(handleData, req('/api/data?dataset=staff', { token: await sign(claims()), headers: { Origin: 'https://evil.example' } }), ENV({ ALLOWED_ORIGIN: 'https://hub-pages.example.ac.th' })); ok('Origin อื่น → ไม่มี header CORS', r.h.get('access-control-allow-origin') === null);
r = await run(handleData, req('/api/data?dataset=staff', { method: 'POST', token: await sign(claims()) }), ENV()); ok('method อื่น → 405', r.s === 405);

// ---------- 2.1) /api/roster ----------
r = await run(handleRoster, req('/api/roster', { headers: { 'Cf-Access-Jwt-Assertion': 'x.y.z' } }), ENV({ ROSTER: { get: async () => ({ 1: [{ role: 'หัวหน้าชุด', name: 'ชื่อสมมติ (MOCK)', phone: 'SHOULD-NOT-PASS' }] }) } })); ok('รายชื่อเวร: header ปลอม → 401 (ไฟล์ข้อเสนอเดิมผ่านเพียงมี header)', r.s === 401, r.j.code);
r = await run(handleRoster, req('/api/roster', { token: await sign(claims()) }), ENV({ ROSTER: { get: async () => ({ 1: [{ role: 'หัวหน้าชุด', name: 'ชื่อสมมติ (MOCK)', phone: 'SHOULD-NOT-PASS' }] }) } })); ok('[MOCK KV] รายชื่อเวร: ผู้มีสิทธิ์ → teams 4 ชุด เฉพาะ role/name', r.s === 200 && r.j.teams['1'][0].name === 'ชื่อสมมติ (MOCK)' && Object.keys(r.j.teams).join() === '1,2,3,4' && !/SHOULD-NOT-PASS/.test(JSON.stringify(r.j)));

// ---------- 3) /api/form ----------
const fdOf = (o) => { const f = new FormData(); Object.keys(o).forEach((k) => f.append(k, o[k])); return f; };
const CLEAN = { form: 'form-clean', sheet_name: 'แท็บอื่นที่ผู้ส่งอยากเขียน', 'รุ่นรถ': 'รุ่นสมมติ', 'ทะเบียน': 'MOCK-1', 'วันที่': '2026-11-15', 'ผู้ดำเนินการ': 'ผู้ทดสอบ (MOCK)', 'หมายเหตุ': '' };
calls.length = 0; r = await run(handleForm, req('/api/form', { method: 'POST', body: fdOf(CLEAN) }), ENV({ FORMS_WRITE_ENABLED: 'true' })); ok('แบบฟอร์ม: ไม่ Login → 401 ไม่เขียน', r.s === 401 && gsCalls() === 0);
r = await run(handleForm, req('/api/form', { method: 'POST', token: await sign(claims()), body: fdOf(CLEAN), headers: { Origin: 'https://evil.example' } }), ENV({ FORMS_WRITE_ENABLED: 'true' })); ok('แบบฟอร์ม: ส่งจากเว็บอื่น (Origin ไม่ตรง) → 403 ไม่เขียน', r.s === 403 && r.j.code === 'bad-origin' && gsCalls() === 0, r.j.code);
r = await run(handleForm, req('/api/form', { method: 'POST', token: await sign(claims()), body: fdOf(CLEAN) }), ENV()); ok('แบบฟอร์ม: ยังไม่ได้เปิดการเขียน (ค่าเริ่มต้น) → 503 write-disabled ไม่เขียน', r.s === 503 && r.j.code === 'write-disabled' && r.j.ok === false && gsCalls() === 0, r.j.code);
r = await run(handleForm, req('/api/form', { method: 'POST', token: await sign(claims()), body: fdOf(Object.assign({}, CLEAN, { 'ทะเบียน': '', 'วันที่': '2026-11-16' })) }), ENV({ FORMS_WRITE_ENABLED: 'true' })); ok('แบบฟอร์ม: ข้อมูลไม่ครบ/วันที่อนาคต → 422 ระบุช่อง ไม่เขียน', r.s === 422 && r.j.fields.join() === 'ทะเบียน,วันที่' && gsCalls() === 0, JSON.stringify(r.j));
r = await run(handleForm, req('/api/form', { method: 'POST', token: await sign(claims()), body: fdOf(CLEAN) }), ENV({ FORMS_WRITE_ENABLED: 'true' }));
{ const c = calls.find((x) => x.url.startsWith('https://script.google.com/')), b = c && JSON.parse(c.init.body);
  ok('[MOCK Apps Script] แบบฟอร์มครบ + เปิดการเขียน → ok พร้อมเลขอ้างอิง', r.s === 200 && r.j.ok === true && r.j.ref === 'HUB-MOCK-001', JSON.stringify(r.j));
  ok('แท็บปลายทางกำหนดฝั่งบริการ ไม่ใช้ sheet_name ที่ผู้ส่งกำหนด + แนบอีเมลผู้บันทึก', b && b.sheet === 'การทำความสะอาดยานพาหนะ' && b.user === 'officer@example.ac.th' && !('sheet_name' in b.values)); }
r = await run(handleForm, req('/api/form', { method: 'POST', token: await sign(claims()), body: fdOf(CLEAN) }), ENV({ FORMS_WRITE_ENABLED: 'true' }), { gs: () => ({ ok: true }) }); ok('ต้นทางตอบ ok แต่ไม่มีเลขอ้างอิง → 502 (ไม่ถือว่าบันทึกแล้ว)', r.s === 502 && r.j.ok === false, r.j.code);
r = await run(handleForm, req('/api/form', { method: 'POST', token: await sign(claims()), body: fdOf(Object.assign({}, CLEAN, { form: 'form-x' })) }), ENV({ FORMS_WRITE_ENABLED: 'true' })); ok('แบบฟอร์มนอกรายการ → 400', r.s === 400, r.j.code);
{ const v = validateForm('form-refill', (k) => ({ 'ทะเบียน': '1', 'วันที่เติม': '2026-11-01', 'สารเคมีที่เติม': 'CO2', 'น้ำหนักก่อนเติม': '10', 'น้ำหนักหลังเติม': '2', 'บริษัทที่เติม': 'x' })[k], NOW); ok('เติมสาร: น้ำหนักหลังเติมน้อยกว่าก่อนเติม → ไม่ผ่าน', v.bad.join() === 'น้ำหนักหลังเติม'); }
{ const v = validateForm('form-waste', (k) => ({ reporterName: 'a', position: 'b' })[k], NOW); ok('ขยะ: ไม่กรอกน้ำหนักเลย → ไม่ผ่าน', v.bad.length === 1); }

// ---------- 4) ข้อเท็จจริงสำหรับ AI (ค่าที่คาดหวังมาจากการตรวจต้นทางโดยตรง ไม่ได้อ่านจากไฟล์ที่กำลังทดสอบ) ----------
const F = buildFacts(stats, extra, { from: '2026-10', to: '2026-10' }, NOW);
ok('ข้อเท็จจริง: รถราง ต.ค. 2569 = 33 งาน 58 รอบ 324 กม.', /\[รถรางบริการพิเศษ \| ต\.ค\. 2569[^\]]*\] 33 งาน, 58 รอบ, 324 กม\./.test(F.text));
ok('ข้อเท็จจริง: รถเข้า ต.ค. 2569 = รถยนต์ 242,812 · จยย. 74,155 และระบุว่าไม่มีรถออก', /ต\.ค\. 2569 \(29 วันที่มีข้อมูล\)[^\n]*รถยนต์เข้า 242,812 คัน, รถจักรยานยนต์เข้า 74,155 คัน[^\n]*ไม่มีข้อมูลรถออก/.test(F.text));
ok('ข้อเท็จจริง: เหตุการณ์รวม 68 · ผู้บาดเจ็บ/ผู้ป่วย 39 คน', /ทั้งหมดที่มีข้อมูล[^\n]*รวม 68 เหตุการณ์[^\n]*ผู้บาดเจ็บ\/ผู้ป่วย 39 คน/.test(F.text));
ok('ข้อเท็จจริง: Lost & Found พ.ย. 2569 แจ้งของหาย 27 · เก็บได้ 6 · แบบรับคืน 5 ฉบับ · สถานะรับคืนแล้ว 7 (แยกกัน)', /\[Lost & Found \| พ\.ย\. 2569[^\]]*\] แจ้งของหาย 27 รายการ, เก็บของได้ 6 รายการ, แบบฟอร์มรับของคืน 5 ฉบับ, สถานะ “รับของคืนแล้ว” 7 รายการ/.test(F.text));
ok('ข้อเท็จจริง: วันนี้ 15 พ.ย. (วันเดียวกับที่อ่านต้นทางครบ) → บันทึกแล้ว 0 พร้อมเวลาอ่าน', /วันนี้ 15 พ\.ย\. 2569 \| ข้อมูล ณ 15 พ\.ย\. 2569 18:36 น\.\] บันทึกแล้ว 0 เหตุการณ์/.test(F.text));
ok('ข้อเท็จจริง: รถเข้าวันนี้ยังไม่มีข้อมูล → บอกวันล่าสุด 10 พ.ย. ไม่ใช่ 0', /วันนี้ 15 พ\.ย\. 2569[^\n]*ยังไม่มีข้อมูลของวันนี้ — วันล่าสุดที่มีข้อมูลคือ 10 พ\.ย\. 2569 \(รถยนต์ 12,998 คัน, รถจักรยานยนต์ 7,010 คัน, ไม่สวมหมวก 3,395 ราย\)/.test(F.text));
{ const F2 = buildFacts(stats, extra, {}, Date.parse('2026-11-16T00:01:00+07:00')); ok('ข้อเท็จจริง: 16 พ.ย. 00:01 น. เวลาไทย → ยังไม่มีข้อมูลยืนยันของวันนี้ (ไม่ตอบ 0)', /วันนี้ 16 พ\.ย\. 2569[^\n]*ยังไม่มีข้อมูลยืนยันของวันนี้/.test(F2.text) && !/วันนี้ 16 พ\.ย\. 2569[^\n]*บันทึกแล้ว 0/.test(F2.text)); }
{ const ex2 = JSON.parse(JSON.stringify(extra)); ex2.incidentsDaily.complete = false; const F3 = buildFacts(stats, ex2, {}, NOW); ok('ข้อเท็จจริง: อ่านต้นทางไม่ครบ → ไม่ตอบ 0 ของวันนี้', /ยังไม่มีข้อมูลยืนยันของวันนี้/.test(F3.text)); }
ok('ข้อเท็จจริงไม่มีข้อมูลรายบุคคล/พิกัด/รายชื่อเวร', !/lat|lng|พิกัด|\d{2,3}-\d{3}-\d{4}|@/.test(F.text) && !/teams|pattern/.test(F.text) && F.text.length < 12000, F.text.length + ' ตัวอักษร');
ok('ตัวตรวจตัวเลข: ตัวเลขที่มีในข้อเท็จจริงผ่าน · ตัวเลขที่ไม่มี (เช่นผลรวมที่โมเดลคิดเอง) ไม่ผ่าน', numbersOk('ต.ค. 2569 มี 33 งาน 58 รอบ', F.text, '') && !numbersOk('รวมสองเดือน 91 รอบ', F.text, '') && numbersOk('1. 33 งาน\n2. 58 รอบ', F.text, ''));

// ---------- 5) /api/chat ----------
const chatReq = async (o = {}) => req('/api/chat', { method: 'POST', token: o.token === undefined ? await sign(claims(o.claims)) : o.token, headers: Object.assign({ 'Content-Type': 'application/json' }, o.headers || {}), body: JSON.stringify(o.body || { action: 'chat', userMessage: 'เดือนตุลาคมรถรางวิ่งกี่รอบ', chatHistory: [{ role: 'User', text: 'สวัสดี' }, { role: 'AI', text: 'สวัสดีครับ' }], context: { from: '2026-10', to: '2026-10', period: 'custom' } }) });
calls.length = 0; _resetRate();
r = await run(handleChat, await chatReq({ token: '' }), ENV()); ok('AI: ไม่ Login → 401 ไม่เรียกบริการ AI', r.s === 401 && r.j.status === 'error' && calls.filter((c) => c.url.includes('llm.invalid')).length === 0);
r = await run(handleChat, await chatReq({ claims: { email: 'guest@other.org' } }), ENV()); ok('AI: บัญชีนอกโดเมนที่อนุญาต → 403', r.s === 403);
r = await run(handleChat, await chatReq(), ENV({ LLM_API_KEY: '' })); ok('AI: ยังไม่ได้ตั้งค่าบริการ AI → 503 llm-not-configured (ไม่มีคำตอบจำลอง)', r.s === 503 && r.j.code === 'llm-not-configured' && r.j.reply === undefined, JSON.stringify(r.j));
_resetRate(); calls.length = 0; r = await run(handleChat, await chatReq(), ENV());
{ const c = calls.find((x) => x.url.includes('llm.invalid')), b = c && JSON.parse(c.init.body);
  ok('[MOCK AI] ผู้มีสิทธิ์ → status success + reply + แหล่งข้อมูล + ข้อมูล ณ', r.s === 200 && r.j.status === 'success' && r.j.verified === true && /58 รอบ/.test(r.j.reply) && r.j.sources.length > 3 && /2569/.test(r.j.asOf), JSON.stringify(r.j).slice(0, 160));
  ok('สิ่งที่ส่งให้บริการ AI: กติกา + ข้อเท็จจริงสถิติรวม + คำถาม/ประวัติ — ไม่มีอีเมลผู้ใช้ ชื่อ หรือพิกัด', b && /ข้อเท็จจริง:/.test(b.system) && b.messages[b.messages.length - 1].content === 'เดือนตุลาคมรถรางวิ่งกี่รอบ' && !/officer@|lat|points/.test(c.init.body) && b.model === 'mock-model');
  ok('คีย์ของบริการ AI อยู่ใน header ฝั่งบริการเท่านั้น ไม่อยู่ในคำตอบ', c.init.headers['x-api-key'] === 'mock-key-not-real' && !/mock-key/.test(JSON.stringify(r.j))); }
r = await run(handleChat, await chatReq(), ENV(), { llm: 'ต.ค. 2569 มีรถราง 33 งาน คิดเป็นประมาณ 1,234 ผู้โดยสาร' }); ok('[MOCK AI] โมเดลตอบตัวเลขที่ไม่มีในข้อเท็จจริง → ไม่ส่งคำตอบนั้นออก', r.s === 200 && r.j.verified === false && !/1,234/.test(r.j.reply) && r.j.sources.length === 0, r.j.reply.slice(0, 60));
r = await run(handleChat, await chatReq({ body: { action: 'chat', userMessage: '   ' } }), ENV()); ok('AI: คำถามว่าง → 400', r.s === 400);
r = await run(handleChat, await chatReq({ headers: { Origin: 'https://evil.example' } }), ENV()); ok('AI: เรียกจากเว็บอื่น → 403', r.s === 403 && r.j.code === 'bad-origin');
_resetRate(); let last; for (let i = 0; i < 7; i++) last = await run(handleChat, await chatReq(), ENV()); ok('AI: ถามเกิน 6 ครั้ง/นาที → 429', last.s === 429 && last.j.code === 'rate-limited', last.s);
_resetRate(); { const kv = new Map(), env = ENV({ RATE_KV: { get: async (k) => kv.get(k) || null, put: async (k, v) => { kv.set(k, v); } }, CHAT_RATE_PER_MIN: '2' }); let x; for (let i = 0; i < 3; i++) x = await run(handleChat, await chatReq(), env); ok('AI: จำกัดจำนวนผ่าน KV (ตั้งค่า 2 ครั้ง/นาที) → ครั้งที่ 3 ได้ 429', x.s === 429 && kv.size === 2); }

// ---------- 6) ไม่มีค่าลับในซอร์ส ----------
{ const files = ['lib/auth.js', 'lib/upstream.js', 'lib/ratelimit.js', 'lib/facts.js', 'functions/api/data.js', 'functions/api/form.js', 'functions/api/chat.js', 'functions/api/roster.js', '../apps-script/HubData.gs'].map((f) => fs.readFileSync(path.join(ROOT, 'server', f), 'utf8')).join('\n');
  ok('ซอร์สบริการไม่มีคีย์/URL ของ Apps Script จริง/รหัสพนักงาน', !/AKfyc[\w-]{20,}|AIza[\w-]{20,}|sk-[A-Za-z0-9]{20,}|1062|1lYRhXtLgec6/.test(files)); }

console.log('รวม ' + count + ' ข้อ · ไม่ผ่าน ' + fails + ' (ทั้งหมดเป็นการทดสอบ local ด้วย MOCK)');
process.exit(fails ? 1 : 0);
