/* ข้อเสนอ (ยังไม่ได้ Deploy และไม่ถูกเรียกจากหน้ารวม) — Backend ผู้ช่วย AI ที่ตอบจาก "สถิติรวม" เท่านั้น
 * รูปแบบ: Cloudflare Worker / Pages Function วางหลัง Cloudflare Access
 * ค่าลับ (ตั้งใน Dashboard → Settings → Variables and Secrets ห้ามใส่ในโค้ดหรือ Repository):
 *   AI_API_URL  — URL ของบริการ AI ที่หน่วยงานใช้อยู่
 *   AI_API_KEY  — คีย์ของบริการนั้น
 * ตัวแปรทั่วไป:
 *   STATS_URL   — URL ของ data/stats.json (สถิติรวม ไม่มีข้อมูลรายบุคคล)
 *   ALLOW_ORIGIN — โดเมนของหน้ารวมที่อนุญาตให้เรียก
 * หมายเหตุ: รูปแบบ body ที่ส่งให้บริการ AI ต้องปรับตามผู้ให้บริการจริง — ส่วนนั้นยังไม่ได้ทดสอบ */
export default {
  async fetch(request, env) {
    const cors = { 'Access-Control-Allow-Origin': env.ALLOW_ORIGIN || 'null', 'Access-Control-Allow-Headers': 'content-type', 'Vary': 'Origin' };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST') return json({ status: 'error', message: 'POST only' }, 405, cors);
    // ผู้ใช้ต้องผ่าน Cloudflare Access แล้วเท่านั้น (Access จะแนบ header นี้ให้) — ควรตรวจลายเซ็น JWT เพิ่มตามเอกสาร Cloudflare ก่อนใช้งานจริง
    if (!request.headers.get('Cf-Access-Jwt-Assertion')) return json({ status: 'error', message: 'unauthorized' }, 401, cors);
    let body; try { body = await request.json(); } catch (e) { return json({ status: 'error', message: 'bad json' }, 400, cors); }
    const question = String(body.question || '').slice(0, 500);
    if (!question.trim()) return json({ status: 'error', message: 'empty question' }, 400, cors);
    const stats = await fetch(env.STATS_URL, { cf: { cacheTtl: 300 } }).then(r => r.json());
    delete (stats.modules || {}).accidentMap;                       // พิกัดรายจุดไม่จำเป็นต่อการตอบคำถามเชิงสถิติ
    const prompt = [
      'ตอบคำถามเป็นภาษาไทยจากข้อมูลสถิติรวม (JSON) ด้านล่างเท่านั้น',
      'ถ้าข้อมูลไม่มีคำตอบ ให้ตอบว่า "ไม่มีข้อมูลยืนยัน" ห้ามคาดเดาตัวเลข และระบุช่วงวันที่/แหล่งข้อมูลของตัวเลขที่ใช้ทุกครั้ง',
      'ข้อมูล: ' + JSON.stringify(stats),
      'คำถาม: ' + question
    ].join('\n');
    const ai = await fetch(env.AI_API_URL, { method: 'POST', headers: { 'content-type': 'application/json', 'authorization': 'Bearer ' + env.AI_API_KEY }, body: JSON.stringify({ prompt }) });
    if (!ai.ok) return json({ status: 'error', message: 'AI service HTTP ' + ai.status }, 502, cors);
    const out = await ai.json();
    return json({ status: 'success', reply: String(out.reply || out.text || ''), statsGeneratedAt: stats.generatedAt }, 200, cors);
  }
};
function json(o, status, headers) { return new Response(JSON.stringify(o), { status, headers: Object.assign({ 'content-type': 'application/json; charset=utf-8' }, headers) }); }
