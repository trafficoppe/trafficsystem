// server/lib/auth.js — ตรวจตัวตนและสิทธิ์ของผู้เรียกบริการข้อมูลภายใน (ยังไม่ได้ Deploy)
// ผู้ใช้ต้องผ่าน Cloudflare Access ก่อน แล้วบริการนี้ตรวจ JWT ที่ Access แนบมาอีกชั้น:
//   ลายเซ็น RS256 ด้วยกุญแจสาธารณะของทีม (…/cdn-cgi/access/certs) · iss · aud · exp · nbf · มีอีเมลผู้ใช้
// การมี header อย่างเดียวไม่ถือว่าผ่าน และถ้ายังไม่ได้ตั้งค่า (ทีม / AUD / รายชื่อผู้มีสิทธิ์) จะปฏิเสธทุกคำขอ (fail closed)
// ไม่มีค่าลับในไฟล์นี้ — ทุกค่ามาจากตัวแปรของบริการ (env)

const JWKS_TTL_MS = 10 * 60 * 1000, JWKS_MIN_REFRESH_MS = 60 * 1000;
let jwks = { url: '', at: 0, keys: [] };

export class HttpError extends Error {
  constructor(status, code) { super(code); this.status = status; this.code = code; }
}

const b64uBytes = (s) => {
  s = String(s).replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '=';
  const bin = atob(s), out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out;
};
const b64uJson = (s) => JSON.parse(new TextDecoder().decode(b64uBytes(s)));

export function accessConfig(env) {
  const team = String(env.ACCESS_TEAM_DOMAIN || '').trim().replace(/^https?:\/\//, '').replace(/\/+$/, '').toLowerCase();
  const aud = String(env.ACCESS_AUD || '').trim();
  if (!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(team) || !aud) throw new HttpError(503, 'not-configured');
  return { team, aud, issuer: 'https://' + team, certsUrl: 'https://' + team + '/cdn-cgi/access/certs' };
}

async function loadKeys(cfg, fetchImpl, now, force) {
  const fresh = jwks.url === cfg.certsUrl && now - jwks.at < JWKS_TTL_MS;
  if (fresh && !(force && now - jwks.at >= JWKS_MIN_REFRESH_MS)) return jwks.keys;
  let res; try { res = await fetchImpl(cfg.certsUrl); } catch (e) { throw new HttpError(503, 'certs-unreachable'); }
  if (!res.ok) throw new HttpError(503, 'certs-unreachable');
  const body = await res.json().catch(() => null);
  if (!body || !Array.isArray(body.keys)) throw new HttpError(503, 'certs-unreachable');
  jwks = { url: cfg.certsUrl, at: now, keys: body.keys.filter((k) => k && k.kty === 'RSA' && k.kid && k.n && k.e) };
  return jwks.keys;
}
export function _resetKeyCache() { jwks = { url: '', at: 0, keys: [] }; }

export async function verifyAccessJwt(token, env, opts = {}) {
  const cfg = accessConfig(env), now = opts.now ? opts.now() : Date.now(), fetchImpl = opts.fetch || fetch;
  const parts = String(token || '').split('.');
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) throw new HttpError(401, 'bad-token');
  let header, payload;
  try { header = b64uJson(parts[0]); payload = b64uJson(parts[1]); } catch (e) { throw new HttpError(401, 'bad-token'); }
  if (!header || header.alg !== 'RS256' || typeof header.kid !== 'string') throw new HttpError(401, 'bad-alg');   // ไม่รับ none / HS256
  let jwk = (await loadKeys(cfg, fetchImpl, now, false)).find((k) => k.kid === header.kid);
  if (!jwk) jwk = (await loadKeys(cfg, fetchImpl, now, true)).find((k) => k.kid === header.kid);                   // กุญแจหมุนเวียน
  if (!jwk) throw new HttpError(401, 'unknown-key');
  let good = false;
  try {
    const key = await crypto.subtle.importKey('jwk', { kty: 'RSA', n: jwk.n, e: jwk.e, alg: 'RS256', ext: true }, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    good = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64uBytes(parts[2]), new TextEncoder().encode(parts[0] + '.' + parts[1]));
  } catch (e) { good = false; }
  if (!good) throw new HttpError(401, 'bad-signature');
  const sec = Math.floor(now / 1000);
  if (!payload || payload.iss !== cfg.issuer) throw new HttpError(401, 'bad-issuer');
  const auds = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!auds.includes(cfg.aud)) throw new HttpError(401, 'bad-audience');
  if (typeof payload.exp !== 'number' || payload.exp <= sec) throw new HttpError(401, 'expired');
  if (typeof payload.nbf === 'number' && payload.nbf > sec + 60) throw new HttpError(401, 'not-yet-valid');
  const email = String(payload.email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+$/.test(email)) throw new HttpError(403, 'no-identity');                                   // service token ไม่มีอีเมล → ไม่ให้ข้อมูลบุคคล
  return { email, exp: payload.exp };
}

export function tokenFrom(request) {
  const h = request.headers.get('Cf-Access-Jwt-Assertion'); if (h) return h.trim();
  const m = /(?:^|;\s*)CF_Authorization=([^;]+)/.exec(request.headers.get('Cookie') || ''); return m ? m[1].trim() : '';
}

// สิทธิ์แยกตามงาน: HUB_ALLOW_DATA (ข้อมูลบุคลากร/ภาพ/วิทยุ) · HUB_ALLOW_FORM (บันทึกแบบฟอร์ม) · HUB_ALLOW_CHAT (ผู้ช่วย AI)
// ค่าเป็นรายการคั่นด้วยจุลภาค: อีเมลเต็ม หรือ @โดเมน — ถ้าไม่ได้ตั้งค่า = ไม่มีใครมีสิทธิ์
export function authorize(user, env, scope) {
  const list = String(env['HUB_ALLOW_' + String(scope).toUpperCase()] || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
  if (!list.length) throw new HttpError(403, 'no-allowlist');
  const ok = list.some((x) => (x[0] === '@' ? x.length > 1 && user.email.endsWith(x) : user.email === x));
  if (!ok) throw new HttpError(403, 'forbidden');
}

export async function requireUser(request, env, scope, opts) {
  const token = tokenFrom(request);
  if (!token) { accessConfig(env); throw new HttpError(401, 'no-token'); }
  const user = await verifyAccessJwt(token, env, opts);
  authorize(user, env, scope);
  return user;
}

// ---------- คำตอบ / CORS ----------
// ค่าเริ่มต้น = ใช้ได้เฉพาะหน้าเว็บบนโดเมนเดียวกับบริการ · ถ้าหน้าเว็บอยู่คนละโดเมน ตั้ง ALLOWED_ORIGIN เป็นโดเมนนั้นโดยเจาะจง (ไม่ใช้ *)
export function cors(request, env) {
  const origin = request.headers.get('Origin') || '', allow = String(env.ALLOWED_ORIGIN || '').trim().replace(/\/+$/, '');
  return origin && allow && origin === allow ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', Vary: 'Origin' } : { Vary: 'Origin' };
}
export function checkOrigin(request, env) {                                                                        // กันคำขอเขียนข้ามเว็บ (CSRF)
  const origin = request.headers.get('Origin'); if (!origin) return;
  const allow = String(env.ALLOWED_ORIGIN || '').trim().replace(/\/+$/, '');
  if (origin !== new URL(request.url).origin && origin !== allow) throw new HttpError(403, 'bad-origin');
}
export function json(body, status, extra) {
  return new Response(JSON.stringify(body), { status: status || 200, headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }, extra || {}) });
}
// แปลงข้อผิดพลาดเป็นคำตอบ — ไม่ส่งรายละเอียดภายใน ไม่บันทึกเนื้อหาคำขอ
export function fail(e, request, env, shape) {
  const status = e instanceof HttpError ? e.status : 500, code = e instanceof HttpError ? e.code : 'internal';
  return json(shape === 'chat' ? { status: 'error', code } : { ok: false, code }, status, cors(request, env));
}
