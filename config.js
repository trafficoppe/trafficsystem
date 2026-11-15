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
  /* โหมดระบบภายใน: เปิด (true) เฉพาะเมื่อเว็บไซต์อยู่หลังระบบยืนยันตัวตนแล้ว (เช่น Cloudflare Access)
     เมื่อเปิด หน้า “แจ้งของหาย / เก็บของได้” จะดึงรายการและรูปภาพสดจากระบบ Lost & Found (lostfoundApiUrl) — ไม่มีข้อมูลรายการเก็บใน Repository นี้ */
  internalMode: false,
  /* API สาธารณะของระบบ Lost & Found (ค่าเดียวกับ assets/lf-data.js ใน Repository trafficoppe/lostfound — ไม่ใช่ความลับ)
     หน้ารวมเรียกเฉพาะ GET ?action=getPublicData (อ่านอย่างเดียว ไม่มีชื่อ/เบอร์โทรผู้แจ้ง) และเรียกเฉพาะเมื่อ internalMode เป็น true */
  lostfoundApiUrl: "https://script.google.com/macros/s/AKfycbxrI-qgAvb0Zy-aKWDtTaHKM3etKDeedFVpOMoECxH3-x2uGCTQG_Fw70a1JR8F4BNM/exec",
  /* Google Maps JavaScript API key (ไม่บังคับ) — เว้นว่าง = ใช้แผนที่ OpenStreetMap (เมื่อเปิดผ่าน http/https) */
  googleMapsApiKey: "",
  allowMapEmbed: true
};
