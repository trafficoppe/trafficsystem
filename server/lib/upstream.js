// server/lib/upstream.js — เรียก Apps Script (apps-script/HubData.gs) ด้วยค่าลับร่วม (ยังไม่ได้ Deploy)
// HUB_GS_URL และ HUB_SHARED_SECRET เป็นค่าลับของบริการ ไม่อยู่ในหน้าเว็บหรือ Repository
import { HttpError } from './auth.js';

export async function callScript(env, payload, fetchImpl) {
  const url = String(env.HUB_GS_URL || ''), secret = String(env.HUB_SHARED_SECRET || '');
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url) || secret.length < 32) throw new HttpError(503, 'not-configured');
  let res;
  try { res = await (fetchImpl || fetch)(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({}, payload, { secret })), redirect: 'follow' }); }
  catch (e) { throw new HttpError(502, 'upstream-unreachable'); }
  if (!res.ok) throw new HttpError(502, 'upstream-http');
  const body = await res.json().catch(() => null);
  if (!body || body.ok !== true) throw new HttpError(502, body && body.code === 'write-disabled' ? 'write-disabled' : 'upstream-error');
  return body;
}
