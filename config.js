/* config.js — ค่าตั้งของหน้ารวม (ไฟล์สาธารณะ: ห้ามใส่รหัสผ่าน API key หรือ Token ใด ๆ) */
window.HUB_CONFIG = {
  /* ตรามหาวิทยาลัย: URL = logoUrlTemplate + logoFileId (ไฟล์แชร์แบบ "ผู้มีลิงก์ดูได้" อยู่แล้ว ไม่ต้องแก้สิทธิ์) */
  logoUrlTemplate: "https://lh3.googleusercontent.com/d/",
  logoFileId: "1vUiqMo-FfgFAZyN6dpvHRKX8M85ttsF4",
  /* URL ของ Stats API (สถิติรวมเท่านั้น) — เว้นว่าง = อ่านจาก data/stats.json */
  statsApiUrl: "",
  /* URL ของแหล่งตารางเวรที่จำกัดสิทธิ์ (ต้องผ่านการยืนยันตัวตน) — เว้นว่าง = แสดงเฉพาะผลัด/ตำแหน่ง ไม่มีรายชื่อ */
  rosterApiUrl: "",
  /* URL ของ Backend ผู้ช่วย AI (รับเฉพาะสถิติรวม) — เว้นว่าง = แสดงสถานะ "ยังไม่เชื่อมต่อ" */
  aiApiUrl: "",
  /* Google Maps JavaScript API key (ไม่บังคับ) — เว้นว่าง = ใช้แผนผังในหน้า + ลิงก์ Google Maps */
  googleMapsApiKey: "",
  allowMapEmbed: true
};
