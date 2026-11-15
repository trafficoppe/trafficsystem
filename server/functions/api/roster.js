// server/functions/api/roster.js — รายชื่อประจำผลัดสำหรับหน้า #roster (GET /api/roster) · ยังไม่ได้ Deploy
// แทนที่ proposals/roster-api-worker.js เดิม (ซึ่งตรวจเพียงว่ามี header) — ไฟล์นี้ตรวจ JWT ของ Cloudflare Access และรายชื่อผู้มีสิทธิ์ (HUB_ALLOW_DATA) จริง
// รายชื่อเก็บใน KV ที่ผูกชื่อ ROSTER คีย์ "teams" = {"1":[{"role":"…","name":"…"}], "2":[…], "3":[…], "4":[…]} — ไม่อยู่ใน Repository
import { requireUser, cors, json, fail, HttpError } from '../../lib/auth.js';

export async function handleRoster(request, env, opts = {}) {
  try {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(request, env) });
    if (request.method !== 'GET') throw new HttpError(405, 'method');
    await requireUser(request, env, 'data', opts);
    if (!env.ROSTER) throw new HttpError(503, 'not-configured');
    const teams = (await env.ROSTER.get('teams', 'json')) || {}, out = {};
    ['1', '2', '3', '4'].forEach((k) => { out[k] = (Array.isArray(teams[k]) ? teams[k] : []).slice(0, 60).map((p) => ({ role: String((p && p.role) || '').slice(0, 40), name: String((p && p.name) || '').slice(0, 120) })); });
    return json({ teams: out }, 200, cors(request, env));
  } catch (e) { return fail(e, request, env); }
}
export const onRequest = (ctx) => handleRoster(ctx.request, ctx.env);
