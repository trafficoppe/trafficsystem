// server/functions/api/data.js — บริการอ่านข้อมูลภายใน (GET /api/data?dataset=…) · ยังไม่ได้ Deploy
// หน้าเว็บเรียกผ่าน config.js → dataApiUrl พร้อม credentials · คำตอบ: { ok: true, rows: [...], asOf }
// ลำดับการตรวจ: ชุดข้อมูลอยู่ในรายการที่อนุญาต → ตรวจ JWT ของ Cloudflare Access → ตรวจรายชื่อผู้มีสิทธิ์ (HUB_ALLOW_DATA) → อ่านจาก Apps Script
// ส่งกลับเฉพาะคอลัมน์ในรายการด้านล่าง แม้ต้นทางจะส่งมามากกว่า — ไม่มีรหัสพนักงาน ลายเซ็น หรือคอลัมน์อื่นของแท็บ
import { requireUser, cors, json, fail, HttpError } from '../../lib/auth.js';
import { callScript } from '../../lib/upstream.js';

export const DATASETS = {
  staff: ['name', 'position', 'phone', 'photo', 'unit', 'isHead'],
  areaPhotos: ['date', 'url', 'category'],
  radio: ['at', 'operator', 'unit', 'reporter', 'type', 'place', 'detail', 'action', 'status']
};
const clean = (v) => (v === true || v === false ? v : v == null ? '' : String(v).slice(0, 2000));

export async function handleData(request, env, opts = {}) {
  try {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(request, env) });
    if (request.method !== 'GET') throw new HttpError(405, 'method');
    const dataset = new URL(request.url).searchParams.get('dataset') || '';
    if (!Object.prototype.hasOwnProperty.call(DATASETS, dataset)) throw new HttpError(400, 'unknown-dataset');
    await requireUser(request, env, 'data', opts);
    const up = await callScript(env, { action: 'read', dataset }, opts.fetch);
    if (!Array.isArray(up.rows)) throw new HttpError(502, 'upstream-schema');
    const rows = up.rows.slice(0, 20000).map((r) => { const o = {}; DATASETS[dataset].forEach((k) => { o[k] = clean(r && r[k]); }); return o; });
    return json({ ok: true, dataset, rows, asOf: String(up.asOf || '').slice(0, 40) }, 200, cors(request, env));
  } catch (e) { return fail(e, request, env); }
}
export const onRequest = (ctx) => handleData(ctx.request, ctx.env);
