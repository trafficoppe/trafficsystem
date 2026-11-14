#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""สร้าง data/extra.json — ข้อมูลประกอบรอบที่ 3 ที่ไม่ใช่สถิติเดิม (data/stats.json ไม่ถูกแตะ)
1) guardManpower : แผนกำลังพล รปภ.เอกชนตามจุด (จำนวนคนต่อจุด ไม่มีชื่อบุคคล)
   อ่านจาก Sheet "ข้อมูลงานจราจรออนไลน์" แท็บ "รปภผลัดกลางวัน" และ "รปภผลัดกลางคืน" (แหล่งเดียวกับหน้า ควบคุมงาน รปภ.เอกชน ของระบบเดิม)
   ตรวจอ่านแบบอ่านอย่างเดียวเมื่อ 14 พ.ย. 2569 เวลา 22:10 น.
2) roster : กติกาการหมุนเวรจากไฟล์ "ตารางเวร Update พ.ย.69.xlsx" (ชีต "ตารางสำหรับแก้ไขเวลา" + สูตรในชีต "ตารางเวรสำหรับใช้งาน")
   เก็บเฉพาะรอบเวร เวลาเข้า–ออก และชื่อตำแหน่ง — ไม่มีรายชื่อเจ้าหน้าที่
"""
import json, pathlib, datetime
root = pathlib.Path(__file__).resolve().parent.parent

def rng(prefix, a, b, pad=0):
    return [[prefix + (str(i).zfill(pad) if pad else str(i)), 1] for i in range(a, b + 1)]
def one(*names):
    return [[n, 1] for n in names]

DORM = ["ป้อมหน้าหอ11", "หอ11", "หน้าหอ10", "หน้าหอ1-2", "หน้าหอ6-7", "หน้าหอ8-9", "ป้อมโรงช้าง",
        "ประตูทางเข้าหอ1-2", "ประตูทางเข้าหอ3-4", "ประตูทางเข้าหอ6-7"]
areas = [
  dict(id="central", name="ส่วนกลาง",
       day=[["ผู้จัดการโครงการ", 1], ["หัวหน้าชุด รปภ.ส่วนกลาง", 1], ["ลานจอดรถP5", 1], ["ประตู1", 2], ["ประตู2", 1], ["ประตู3", 3], ["ประตู4", 1],
            ["ประตู5", 2], ["ประตู6", 2]] + one("ลานจอดรถP1", "ลานจอดสระว่ายน้ำ", "กองกายภาพและสิ่งแวดล้อม", "สถานีรถราง", "อาคารบรรยายรวม 1-2",
            "L2 ( แนวจักรยาน4 )", "ลานจอดรถP3", "ลานจอดรถP4", "ถนนดำรงวิจัย ( ลานจอดกองฯ )", "โรงสูบน้ำ1", "โรงสูบน้ำ4", "ลานเป็ดขาว", "เรือนไทย",
            "แยกลานอเนกฯ", "แม่และเด็ก", "ถนนสานสัตยา", "แนวถนนเทิดจักรี", "อาคารเจรจา"),
       night=[["หัวหน้าชุด รปภ.ส่วนกลางคืน", 1], ["ประตู1", 2], ["ประตู2", 1], ["ประตู3", 4], ["ประตู4", 1], ["ประตู5", 2], ["ประตู6", 2]]
            + one("ลานจอดรถP1", "ลานจอดรถP5", "ลานจอดรถP3 ( แม่และเด็ก )", "ลานจอดรถP4", "กองกายภาพ", "อาคารเจรจา", "โรงสูบน้ำ1", "โรงสูบน้ำ4",
                  "ถนนดำรงวิจัย", "สถานีรถราง", "เรือนไทย")),
  dict(id="mlc", name="ศูนย์การเรียนรู้มหิดล", day=one("หัวหน้าชุด รปภ.MLC") + rng("M.", 2, 11), night=one("หัวหน้าชุด รปภ.MLC") + rng("M.", 13, 19)),
  dict(id="pmh", name="มหิดลสิทธาคาร", day=one("หัวหน้าชุด รปภ.สิทธาคาร") + rng("S.", 2, 10), night=one("หัวหน้าชุด รปภ.สิทธาคาร") + rng("S.", 2, 5)),
  dict(id="la", name="อาคารสิริวิทยา", day=one("หัวหน้าชุด รปภ.LA") + rng("LA.", 2, 7, 2), night=one("หัวหน้าชุด รปภ.LA") + rng("LA.", 9, 10, 2)),
  dict(id="sr", name="สิรีรุกขชาติ", day=one("หัวหน้าชุด รปภ.สิรีรุกขชาติ") + rng("SR.", 2, 10, 2), night=one("หัวหน้าชุด รปภ.สิรีรุกขชาติ") + rng("SR.", 2, 4, 2)),
  dict(id="dorm", name="หอพักนักศึกษา", day=one("หัวหน้าชุด รปภ.หอพักนักศึกษา", *DORM, "ประตูทางเข้ารถราง", "ทางเท้าเดินหลังหอพัก"),
       night=one("หัวหน้าชุด รปภ.หอพักนักศึกษา", *DORM)),
]
tot = lambda rows: sum(c for _, c in rows)
for a in areas:
    a["dayPosts"], a["nightPosts"] = len(a["day"]), len(a["night"])
    a["dayGuards"], a["nightGuards"] = tot(a["day"]), tot(a["night"])
# ตรวจกับจำนวนแถว/ยอดรวมที่อ่านได้จากต้นทาง (กลางวัน 78 แถว, กลางคืน 49 แถว)
assert sum(a["dayPosts"] for a in areas) == 78 and sum(a["nightPosts"] for a in areas) == 49
assert [a["dayGuards"] for a in areas] == [32, 11, 10, 7, 10, 13], [a["dayGuards"] for a in areas]
assert [a["nightGuards"] for a in areas] == [24, 8, 5, 3, 4, 11], [a["nightGuards"] for a in areas]
guard = dict(
  status="connected", source="ข้อมูลงานจราจรออนไลน์ → แท็บ รปภผลัดกลางวัน / รปภผลัดกลางคืน", checkedAt="2026-11-14 22:10",
  definition="แผนกำลังพลตามจุด = จำนวน รปภ.เอกชนที่กำหนดประจำแต่ละจุดต่อผลัด (คอลัมน์ จำนวนรปภ) ไม่ใช่จำนวนผู้มาปฏิบัติงานจริงรายวัน",
  shifts=dict(day="07.00–19.00 น.", night="19.00–07.00 น."),
  totals=dict(day=sum(a["dayGuards"] for a in areas), night=sum(a["nightGuards"] for a in areas)),
  notes=["เป็นแผนกำลังพลที่ระบบเดิมใช้แสดงในเมนู ควบคุมงาน รปภ.เอกชน — ต้นทางไม่มีวันที่ปรับปรุงล่าสุดกำกับ",
         "ชื่อจุดคัดตามต้นทาง แก้เฉพาะสระ/วรรณยุกต์ที่พิมพ์ซ้ำ (เช่น ประตู2, โรงสูบน้ำ4, หน้าหอ1-2)",
         "ไม่มีชื่อ รปภ. รายบุคคลในหน้านี้ รายชื่อประจำจุดอยู่ในระบบต้นทางที่จำกัดผู้ใช้"],
  areas=areas)
assert guard["totals"] == dict(day=83, night=55)

# ---- ตารางเวร: รอบ 8 วัน ตามชีต "ตารางสำหรับแก้ไขเวลา" (แถว 2–9) ----
# N = ดึก 23:00–07:00, A = บ่าย 15:00–23:00, M = เช้า 07:00–15:00, R = พักกะ ; คอลัมน์ = ผลัด 1–4
pattern = ["NRMA", "NRMA", "ANRM", "ANRM", "MANR", "MANR", "RMAN", "RMAN"]
for row in pattern: assert sorted(row) == list("AMNR")          # ทุกวันมีครบ เช้า/บ่าย/ดึก/พักกะ ผลัดละหนึ่งอย่าง
def excel_serial(d): return (d - datetime.date(1899, 12, 30)).days
def row_of(d): return (excel_serial(d) + 4) % 8                    # สูตรในไฟล์: INDEX(ตาราง, MOD(วันที่+4, 8)+1, …)
# ตรวจกับค่าที่ Excel คำนวณไว้ในไฟล์ (ค่าที่บันทึกในชีตใช้งาน เดือน ม.ค. 2569)
assert pattern[row_of(datetime.date(2026, 1, 1))] == "ANRM"       # 1 ม.ค.: ผลัด1 15–23, ผลัด2 23–07, ผลัด3 พักกะ, ผลัด4 07–15
assert pattern[row_of(datetime.date(2026, 1, 2))] == "MANR"
assert pattern[row_of(datetime.date(2026, 1, 4))] == "RMAN"
assert pattern[row_of(datetime.date(2026, 1, 6))] == "NRMA"
roster = dict(
  status="rule-only", sourceFile="ตารางเวร Update พ.ย.69.xlsx (ชีต ตารางเวรสำหรับใช้งาน / ตารางสำหรับแก้ไขเวลา)", checkedAt="2026-11-14",
  cycleDays=8, anchor=dict(epoch="1899-12-30", offset=4, note="ลำดับแถว = (เลขวันที่แบบ Excel + 4) mod 8"),
  shifts=dict(M=dict(name="เช้า", start="07:00", end="15:00"), A=dict(name="บ่าย", start="15:00", end="23:00"),
              N=dict(name="ดึก", start="23:00", end="07:00"), R=dict(name="พักกะ", start=None, end=None)),
  pattern=pattern, teams=[dict(no=1, roles=["ส.ต1", "ส.ต2", "วิทยุ"]), dict(no=2, roles=["ส.ต1", "ส.ต2", "วิทยุ"]),
                          dict(no=3, roles=["ส.ต1", "ส.ต2", "ส.ต3", "วิทยุ"]), dict(no=4, roles=["ส.ต1", "ส.ต2", "วิทยุ"])],
  names="withheld",
  notes=["รายชื่อเจ้าหน้าที่ในไฟล์ไม่ถูกนำมาเก็บใน Repository นี้ (Repository เป็นสาธารณะ) หน้านี้จึงแสดงเป็น ผลัด 1–4 และชื่อตำแหน่ง",
         "ตารางคำนวณจากกติการอบ 8 วันในไฟล์: ดึก 2 วัน → บ่าย 2 วัน → เช้า 2 วัน → พักกะ 2 วัน เหลื่อมกันทั้ง 4 ผลัด",
         "ถ้ามีการสลับเวรหรือแก้เวลารายวันในไฟล์จริง หน้านี้จะไม่ทราบจนกว่าจะเชื่อมแหล่งข้อมูลตารางเวรที่จำกัดสิทธิ์"])
out = dict(schema=1, generatedAt="2026-11-14T22:15:00+07:00", guardManpower=guard, roster=roster)
(root / "data/extra.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
print("data/extra.json ok | guards day/night:", guard["totals"], "| posts:", [(a["id"], a["dayPosts"], a["nightPosts"]) for a in areas])
