/* ข้อเสนอ (ยังไม่ได้ Deploy) — API รายชื่อประจำผลัดสำหรับหน้า #roster
 * ต้องวางหลัง Cloudflare Access (จำกัดบัญชีที่อนุญาต) และเก็บรายชื่อใน KV ที่ผูกชื่อ ROSTER — ไม่เก็บใน Repository
 * คีย์ใน KV: "teams" = {"1":[{"role":"ส.ต1","name":"…"}, …], "2":[…], "3":[…], "4":[…]}
 * หน้ารวมเรียกด้วย fetch(rosterApiUrl, {credentials:'include'}) และแสดงชื่อเฉพาะในหน่วยความจำของเบราว์เซอร์ */
export default {
  async fetch(request, env) {
    const origin = env.ALLOW_ORIGIN || '';
    const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Vary': 'Origin' };
    if (request.method !== 'GET') return new Response('{"error":"GET only"}', { status: 405, headers });
    if (!request.headers.get('Cf-Access-Jwt-Assertion')) return new Response('{"error":"unauthorized"}', { status: 401, headers });   // ควรตรวจลายเซ็น JWT เพิ่มก่อนใช้งานจริง
    const teams = await env.ROSTER.get('teams', 'json');
    return new Response(JSON.stringify({ teams: teams || {} }), { headers });
  }
};
