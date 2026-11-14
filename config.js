/* config.js — ค่าตั้งค่าหน้ารวม (ไฟล์นี้เป็นสาธารณะ: ห้ามใส่รหัสผ่าน / Token / ข้อมูลลับ)
 *
 * statsApiUrl
 *   เว้นว่าง ""  = อ่านสถิติจากไฟล์ data/stats.json (ภาพข้อมูล ณ เวลาที่ระบุในไฟล์)
 *   ใส่ URL /exec ของ Apps Script "Hub Stats API" (apps-script/HubStats.gs) = อ่านสถิติรวมแบบสด
 *   Stats API ส่งกลับเฉพาะยอดรวม ไม่มีชื่อ เบอร์โทร ทะเบียนรถ
 *
 * googleMapsApiKey
 *   เว้นว่าง ""  = ใช้แผนผังในหน้า + ลิงก์เปิด Google Maps (ไม่ต้องมี key)
 *   ถ้าจะใช้ Google Maps JavaScript API ให้ใส่ "Browser key" ที่จำกัดสิทธิ์แล้วเท่านั้น
 *   (HTTP referrer = โดเมนของหน้านี้, API = Maps JavaScript API) — key ชนิดนี้มองเห็นได้จากเบราว์เซอร์เสมอ
 *   จึงต้องจำกัดสิทธิ์ที่ Google Cloud Console ก่อนใส่ทุกครั้ง
 */
window.HUB_CONFIG = {
  statsApiUrl: "",
  googleMapsApiKey: "",
  allowMapEmbed: true
};
