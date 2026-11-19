-- รอบ 14.2: บันทึกข้อผิดพลาดย้อนหลัง (diagnostic) — แยกจากข้อมูลธุรกิจ · เก็บเฉพาะข้อผิดพลาด ไม่เกิน 1,000 รายการล่าสุด (ล้างตอนเขียนรายการใหม่)
-- ช่องข้อมูลเป็น allowlist: ไม่มี cookie/token/IP/query/เนื้อหาคำขอ/ข้อมูลบุคคล/แถวจาก Sheet
CREATE TABLE IF NOT EXISTS diag_log(id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, ref TEXT, rev TEXT, ev TEXT NOT NULL, route TEXT, scope TEXT, part TEXT, stage TEXT, status INTEGER, code TEXT, type TEXT, cause TEXT, msg TEXT);
CREATE INDEX IF NOT EXISTS diag_log_ref ON diag_log(ref);
-- Rollback (ไม่กระทบตารางอื่น · บริการทำงานต่อได้ เพียงบันทึกลง D1 ไม่ได้และเหลือ console อย่างเดียว):
-- DROP INDEX IF EXISTS diag_log_ref; DROP TABLE IF EXISTS diag_log;
