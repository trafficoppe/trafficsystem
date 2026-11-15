// server/functions/api/form.js — บริการบันทึกแบบฟอร์มที่พัฒนาเอง (POST /api/form, multipart/form-data) · ยังไม่ได้ Deploy
// หน้าเว็บเรียกผ่าน config.js → formApiUrl · คำตอบ: { ok: true, ref } เฉพาะเมื่อ Apps Script ยืนยันว่าเขียนลง Sheet แล้ว
// การเขียนจริงปิดไว้เป็นค่าเริ่มต้น: ต้องตั้ง FORMS_WRITE_ENABLED = "true" ที่บริการ และเปิดใน Script Properties ของ Apps Script ด้วย (สองชั้น)
// แท็บปลายทางกำหนดฝั่งบริการ — ไม่เชื่อค่า sheet_name ที่หน้าเว็บส่งมา
import { requireUser, checkOrigin, cors, json, fail, HttpError } from '../../lib/auth.js';
import { callScript } from '../../lib/upstream.js';
import { rateLimit } from '../../lib/ratelimit.js';

const WASTE = ['wasteGeneral', 'wasteRecycle', 'wasteOrphan', 'wasteFuel', 'wasteOrganic', 'wasteHazard', 'wasteInfect'];
const T = (k, o) => Object.assign({ k, type: 'text' }, o || {});
export const FORMS = {
  'form-clean': { sheet: 'การทำความสะอาดยานพาหนะ', images: 5, fields: [T('รุ่นรถ'), T('ทะเบียน', { req: true }), T('หมายเลขครุภัณฑ์'), T('วันที่', { type: 'date', req: true }), T('ผู้ดำเนินการ', { req: true }), T('หมายเหตุ', { max: 2000 })] },
  'form-refill': { sheet: 'ประวัติการเติมสารถังดับเพลิง', images: 1, fields: [T('ชนิดถัง'), T('ทะเบียน', { req: true }), T('หมายเลขครุภัณฑ์'), T('วันที่เติม', { type: 'date', req: true }), T('สารเคมีที่เติม', { req: true }),
    T('น้ำหนักก่อนเติม', { type: 'number' }), T('น้ำหนักหลังเติม', { type: 'number', req: true }), T('บริษัทที่เติม', { req: true }), T('หมายเหตุ', { max: 2000 })],
    check: (v) => (v['น้ำหนักก่อนเติม'] !== '' && +v['น้ำหนักหลังเติม'] < +v['น้ำหนักก่อนเติม'] ? 'น้ำหนักหลังเติม' : '') },
  'form-waste': { sheet: 'การจัดการขยะ', images: 5, fields: [T('reporterName', { req: true }), T('position', { req: true })].concat(WASTE.map((k) => T(k, { type: 'number' }))),
    check: (v) => (WASTE.some((k) => +v[k] > 0) ? '' : 'wasteGeneral') },
  'forms-radio': { sheet: 'บันทึกรายงานวิทยุสื่อสาร', images: 0, fields: [T('วันเวลาที่บันทึก', { type: 'datetime', req: true }), T('เจ้าหน้าที่ศูนย์วิทยุ'), T('หน่วยงานที่แจ้ง'), T('ชื่อ รปภ./ผู้แจ้ง'), T('ประเภทเหตุการณ์', { req: true }),
    T('สถานที่เกิดเหตุ'), T('รายละเอียด/ข้อความ', { max: 4000 }), T('การดำเนินการของศูนย์', { max: 500 }), T('สถานะ', { req: true, opts: ['รับแจ้ง', 'กำลังดำเนินการตรวจสอบ', 'ระงับเหตุเรียบร้อย (ปิดงาน)'] })] }
};
const MAX_BODY = 30 * 1024 * 1024, MAX_IMG = 5 * 1024 * 1024;
const bkkToday = (now) => new Date(now + 7 * 3600000).toISOString().slice(0, 10);

export function validateForm(id, get, now) {
  const def = FORMS[id]; if (!def) throw new HttpError(400, 'unknown-form');
  const val = {}, bad = [];
  def.fields.forEach((f) => {
    const x = String(get(f.k) == null ? '' : get(f.k)).trim(); val[f.k] = x;
    if (x.length > (f.max || 300)) bad.push(f.k);
    else if (f.req && x === '') bad.push(f.k);
    else if (f.type === 'number' && x !== '' && !(Number.isFinite(+x) && +x >= 0 && +x < 1e6)) bad.push(f.k);
    else if (f.type === 'date' && x !== '' && (!/^\d{4}-\d{2}-\d{2}$/.test(x) || x > bkkToday(now))) bad.push(f.k);
    else if (f.type === 'datetime' && x !== '' && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(x)) bad.push(f.k);
    else if (f.opts && x !== '' && !f.opts.includes(x)) bad.push(f.k);
  });
  const extra = !bad.length && def.check ? def.check(val) : ''; if (extra) bad.push(extra);
  return { def, val, bad };
}
const toB64 = (buf) => { const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };

export async function handleForm(request, env, opts = {}) {
  try {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(request, env) });
    if (request.method !== 'POST') throw new HttpError(405, 'method');
    checkOrigin(request, env);
    const user = await requireUser(request, env, 'form', opts);
    if (String(env.FORMS_WRITE_ENABLED || '') !== 'true') throw new HttpError(503, 'write-disabled');
    if (+(request.headers.get('Content-Length') || 0) > MAX_BODY) throw new HttpError(413, 'too-large');
    await rateLimit(env, 'form', user.email, { now: opts.now, perMin: 10, perDay: 200 });
    let fd; try { fd = await request.formData(); } catch (e) { throw new HttpError(400, 'bad-body'); }
    const id = String(fd.get('form') || ''), now = opts.now ? opts.now() : Date.now();
    const { def, val, bad } = validateForm(id, (k) => { const x = fd.get(k); return typeof x === 'string' ? x : ''; }, now);
    if (bad.length) return json({ ok: false, code: 'invalid', fields: bad }, 422, cors(request, env));
    const files = [];
    for (let i = 1; i <= def.images; i++) {
      const f = fd.get('img' + i); if (!f || typeof f === 'string') continue;
      if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(f.type) || f.size > MAX_IMG) throw new HttpError(422, 'bad-image');
      files.push({ name: 'img' + i, type: f.type, b64: toB64(await f.arrayBuffer()) });
    }
    const up = await callScript(env, { action: 'form', form: id, sheet: def.sheet, values: val, files, user: user.email }, opts.fetch);
    if (typeof up.ref !== 'string' || !up.ref) throw new HttpError(502, 'upstream-schema');   // ไม่มีเลขอ้างอิง = ไม่ถือว่าบันทึกแล้ว
    return json({ ok: true, ref: up.ref.slice(0, 60) }, 200, cors(request, env));
  } catch (e) { return fail(e, request, env); }
}
export const onRequest = (ctx) => handleForm(ctx.request, ctx.env);
