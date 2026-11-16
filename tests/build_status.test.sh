#!/bin/sh
# tests/build_status.test.sh — รอบ 10: build ข้อมูลซ้ำแล้วสถานะ/ข้อความรุ่นเก่าต้องไม่กลับมา และผลต้องเหมือนไฟล์ที่ commit ไว้ (สร้างซ้ำได้ผลเดิม)
# ใช้: sh tests/build_status.test.sh   (รันที่โฟลเดอร์ราก)
set -e
python3 tools/build_snapshot.py >/dev/null
python3 tools/build_extra.py >/dev/null
python3 tools/build_systems.py >/dev/null
fail=0
for pat in 'ยังระบุ Sheet ที่บันทึกข้อมูลไม่ได้' 'Allow access ใน Sheet STAGING' 'สูตรรวมสถิติยังเชื่อมต่อไม่ได้' '"status": "blocked"' 'ค้นหาข้อมูลเจ้าหน้าที่"' 'รอบนี้ยังไม่ได้อ่าน'; do
  if grep -q "$pat" data/stats.json data/extra.json data/systems.json; then echo "FAIL พบข้อความรุ่นเก่า: $pat"; fail=1; else echo "PASS ไม่มี: $pat"; fi
done
grep -q '"label": "รายงานผลการปฏิบัติงาน"' data/systems.json && echo "PASS ปุ่มรายงานผลการปฏิบัติงานมาจากตัวสร้าง" || { echo "FAIL ไม่มีปุ่มรายงานผลการปฏิบัติงาน"; fail=1; }
grep -q 'แบบประเมินความพึงพอใจ รปภ.เอกชนส่วนกลาง 6 สัญญาจ้าง' data/systems.json && echo "PASS ชื่อแบบประเมิน 6 สัญญาจ้าง" || { echo "FAIL ชื่อแบบประเมิน"; fail=1; }
if git diff --quiet -- data/stats.json data/extra.json data/systems.json; then echo "PASS สร้างซ้ำแล้วตรงกับไฟล์ที่ commit"; else echo "FAIL ไฟล์ที่สร้างซ้ำไม่ตรงกับที่ commit (รัน build แล้ว commit ให้ตรงกัน)"; fail=1; fi
[ $fail = 0 ] && echo "build_status: ผ่านทั้งหมด" || { echo "build_status: ไม่ผ่าน"; exit 1; }
