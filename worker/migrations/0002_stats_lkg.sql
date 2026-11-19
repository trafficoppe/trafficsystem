-- รอบ 14: ผลรวมสถิติที่อ่านสำเร็จล่าสุดรายแหล่ง (last-known-good) — แยกจากข้อมูลธุรกิจ เก็บเฉพาะผลรวม (ไม่มีชื่อ/เบอร์/พิกัด/ภาพ)
-- แถวละ 1 แหล่ง (incidents, lostfound, lostfoundYear, gate, studentMoto, ruenthai) ขนาดรวมไม่กี่สิบ KB · ใช้เมื่ออ่านต้นทางไม่สำเร็จ อายุไม่เกิน 7 วัน
CREATE TABLE IF NOT EXISTS stats_lkg(k TEXT PRIMARY KEY, cfg TEXT NOT NULL, at INTEGER NOT NULL, frag TEXT NOT NULL);
-- Rollback (ไม่กระทบตารางอื่น · บริการทำงานได้ต่อโดยไม่มีผลสำรอง):
-- DROP TABLE IF EXISTS stats_lkg;
