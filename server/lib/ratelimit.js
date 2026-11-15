// server/lib/ratelimit.js — จำกัดจำนวนคำขอต่อผู้ใช้ (ยังไม่ได้ Deploy)
// ถ้าผูก KV namespace ชื่อ RATE_KV จะนับข้ามทุกเครื่องของบริการ · ถ้าไม่ผูก จะนับในหน่วยความจำของเครื่องที่รับคำขอ (กันการยิงถี่ได้ระดับหนึ่งเท่านั้น)
import { HttpError } from './auth.js';
const mem = new Map();

async function bump(env, key, ttl, now) {
  if (env.RATE_KV) { const n = (parseInt(await env.RATE_KV.get(key), 10) || 0) + 1; await env.RATE_KV.put(key, String(n), { expirationTtl: Math.max(60, ttl) }); return n; }
  const cur = mem.get(key); if (mem.size > 5000) for (const [k, v] of mem) if (v.exp <= now) mem.delete(k);
  if (!cur || cur.exp <= now) { mem.set(key, { n: 1, exp: now + ttl * 1000 }); return 1; }
  cur.n++; return cur.n;
}
export async function rateLimit(env, scope, email, opts = {}) {
  const now = opts.now ? opts.now() : Date.now(), perMin = +env[scope.toUpperCase() + '_RATE_PER_MIN'] || opts.perMin || 6, perDay = +env[scope.toUpperCase() + '_RATE_PER_DAY'] || opts.perDay || 60;
  const m = await bump(env, 'rl:' + scope + ':m:' + email + ':' + Math.floor(now / 60000), 60, now);
  const d = await bump(env, 'rl:' + scope + ':d:' + email + ':' + Math.floor(now / 86400000), 86400, now);
  if (m > perMin || d > perDay) throw new HttpError(429, 'rate-limited');
}
export function _resetRate() { mem.clear(); }
