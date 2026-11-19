#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""สร้าง data/systems.json — บัญชีระบบที่แสดงบนหน้ารวม (แก้ไขรายการที่ไฟล์นี้ แล้วรันใหม่)
ไม่ใส่ลิงก์ Google Sheet ภายใน / ลิงก์แก้ไข Apps Script ลงหน้าเว็บสาธารณะ"""
import json, pathlib
GP = "https://trafficoppe.github.io/"
def S(id, name, desc, status, stat=None, links=None, note=None, src=None):
    return dict(id=id, name=name, desc=desc, status=status, stat=stat, links=links or [], note=note, source=src)
def L(label, url, verified=True, kind="open"):
    return dict(label=label, url=url, verified=verified, kind=kind)
cats = [
 dict(id="overview", name="ภาพรวมและรายงาน", icon="chart", systems=[
  S("dashboard-ai", "Dashboard งานจราจรและความปลอดภัย (AI)", "แดชบอร์ดสถิติอุบัติเหตุ/ผู้บาดเจ็บที่ใช้รายงานผู้บริหารในปัจจุบัน", "connected", "incidents",
    [L("เปิด Dashboard", GP+"Main-AI-v1/")], "ต้องกรอกรหัสพนักงานที่หน้าเข้าสู่ระบบ; หน้ารวมนี้อ่านสถิติจากแหล่งเดียวกันโดยไม่แก้ Dashboard เดิม", "Main-AI-v1 + DashboardAI → แท็บ รายงานเหตุการณ์"),
  S("pdf-monthly", "PDF รายงานสถิติจราจรและความปลอดภัยรายเดือน (OPPE-01-F-11-01)", "สร้างเอกสาร PDF สรุปสถิติรายเดือนจากฐานข้อมูลงานจราจร ของหาย และ CCTV", "link", None,
    [L("เปิดระบบสร้าง PDF", GP+"PDF-OPPE-01-F-11-01--/")], "เป็นเครื่องมือสร้างเอกสาร ไม่มีสถิติของตัวเอง", "อ่าน 8 แท็บจาก 3 Sheet ผ่านลิงก์ CSV"),
  S("pdf-daily", "PDF รายงานเหตุการณ์ประจำวัน", "สร้างเอกสาร PDF รายงานเหตุการณ์ประจำวันพร้อมตารางเวรและจำนวนรถเข้า", "link", None,
    [L("เปิดระบบสร้าง PDF", GP+"PDF-report-AI-v1/")], "เป็นเครื่องมือสร้างเอกสาร ไม่มีสถิติของตัวเอง", "อ่าน 4 แท็บจากฐานข้อมูลงานจราจร ผ่านลิงก์ CSV"),
  S("old-hub", "ระบบงานจราจรเดิม (trafficsystem – branch main)", "ระบบเดิมที่มีเมนูบุคลากร ตรวจพื้นที่ ตารางเวร ยานพาหนะ อุปกรณ์ดับเพลิง แบบฟอร์ม รปภ.เอกชน และรายงาน หน้ารวมรุ่นใหม่ลิงก์ไปยังระบบนี้สำหรับงานที่มีข้อมูลรายบุคคล", "legacy", None,
    [L("เปิดระบบเดิม", GP+"trafficsystem/index.html")], "ต้องเข้าสู่ระบบด้วยรหัสพนักงานตามหน้าเดิม · หน้ารายงานบางหน้าอ้างอิง Sheet รุ่นเก่า (เช่น รายงานตรวจรับ รปภ. อ่านสำเนารายงานเหตุการณ์ที่แถวล่าสุดคือ 11 ต.ค. 2569)", None)]),
 dict(id="traffic", name="งานจราจรและแจ้งเหตุ", icon="alert", systems=[
  S("incident-report", "ระบบรายงานเหตุการณ์/แจ้งเหตุ (AI)", "แบบฟอร์มบันทึกเหตุการณ์ อุบัติเหตุ และการรับส่งผู้ป่วย พร้อมพิกัดจุดเกิดเหตุ", "connected", "incidents",
    [L("เปิดแบบฟอร์มรายงานเหตุการณ์", GP+"report-incident-AI-v1/")], None, "แท็บ รายงานเหตุการณ์"),
  S("gate-tracker", "บันทึกจำนวนรถเข้าและผู้ไม่สวมหมวกนิรภัย", "แบบฟอร์มบันทึกจำนวนรถยนต์/รถจักรยานยนต์ และผู้ไม่สวมหมวกนิรภัย แยกประตู 1, 3, 4, 5, 6", "warn", "gate",
    [L("เปิดแบบฟอร์ม", GP+"Form-Gate-Tracker-AI-v1/")], None, "แท็บ จำนวนรถเข้า+หมวกนิรภัย"),
  S("event-incident", "รายงานเหตุการณ์สำหรับกิจกรรมพิเศษ", "แบบฟอร์มและแดชบอร์ดรายงานเหตุการณ์ช่วงกิจกรรมพิเศษ", "connected", "eventIncident",
    [L("เปิดแบบฟอร์ม", GP+"Event-incident-report/"), L("เปิดแดชบอร์ดกิจกรรม", GP+"Event-incident-report/dashboard.html")],
    "รายการเหตุการณ์อ่านจาก Sheet “แบบฟอร์มรายงานเหตุการณ์ กิจกรรมพิเศษ” แท็บ Sheet1 ผ่านบริการภายใน (แสดงหลังเข้าสู่ระบบ)", "แบบฟอร์มรายงานเหตุการณ์ กิจกรรมพิเศษ → Sheet1 (gid 0)"),
  S("helmet-quiz", "แบบทดสอบโครงการรณรงค์สวมหมวกนิรภัย 100%", "สื่อวิดีโอและแบบทดสอบความรู้การสวมหมวกนิรภัย", "link", None,
    [L("เปิดแบบทดสอบ", GP+"-helmet/")], "เป็นลิงก์เปิดแบบทดสอบ (ไม่ใช่ระบบที่เชื่อมต่อไม่ได้) · ผลแบบทดสอบส่งไปยัง Apps Script ของโครงการ หน้ารวมนี้ไม่ได้อ่าน/แสดงผลคะแนน", None)]),
 dict(id="cctv", name="กล้องวงจรปิด", icon="camera", systems=[
  S("cctv", "ระบบขอดูกล้องวงจรปิด (CCTV)", "แบบคำขอดูภาพกล้องวงจรปิด พร้อมเอกสารประกอบและการติดตามสถานะ", "connected", "cctv",
    [L("แบบคำขอ (ส่วนกลาง – ระบบปัจจุบัน)", GP+"trafficoppe/")],
    "กำลังเตรียมรุ่นแยกหน่วยงาน MLC / LA / PMH ใน branch cctv-multi-unit (ยังไม่เปิดใช้)", "แท็บ CCTV_Requests")]),
 dict(id="vehicle", name="ยานพาหนะและลานจอดรถ", icon="car", systems=[
  S("veh-staff", "ลงทะเบียนยานพาหนะบุคลากร", "แบบลงทะเบียนรถยนต์/รถจักรยานยนต์ของบุคลากร", "partial", "vehicleRegistration",
    [L("เปิดแบบลงทะเบียนบุคลากร", "https://script.google.com/a/macros/mahidol.ac.th/s/AKfycbwVhzioMgBzI5LBoLO4anTl1qcTe8lrKXSoYGllLSFx_ybbd0Tko78vZPAd-QmBl9Cq/exec")],
    "ต้องเข้าสู่ระบบด้วยบัญชี mahidol.ac.th จึงฝังในหน้านี้ไม่ได้", "ฐานข้อมูลลงทะเบียนยานพาหนะบุคลากร"),
  S("veh-student", "ลงทะเบียนยานพาหนะนักศึกษา", "แบบลงทะเบียนรถยนต์/รถจักรยานยนต์ของนักศึกษา", "partial", "vehicleRegistration",
    [], "ยอดนักศึกษา–รถจักรยานยนต์อ่านสดจากแท็บ Registrations_Motorcycle ผ่านตัวกลางของเจ้าของไฟล์ (ไฟล์ส่วนตัว) หลังเข้าสู่ระบบ · ยังไม่มีลิงก์หน้าแบบฟอร์มสำหรับผู้ใช้ที่ยืนยันได้", "MU ฐานข้อมูลลงทะเบียนยานพาหนะ นักศึกษา ม.มหิดล 17.6.69 → Registrations_Motorcycle (gid 1304328494)"),
  S("ruenthai", "แบบสำรวจการจอดรถลานจอดเรือนไทย", "แบบสำรวจ/ลงทะเบียนผู้ใช้ลานจอดรถเรือนไทย", "partial", "ruenthai",
    [L("เปิดแบบสำรวจ", "https://ruenthai-parking-survey.pages.dev")], "ไฟล์ต้นทางเป็นส่วนตัว — สรุปกลุ่มผู้ใช้/จำนวนรถ/สถานะ LPR อ่านสดผ่านตัวกลางของเจ้าของไฟล์หลังเข้าสู่ระบบ · ไฟล์สรุปในเว็บมีเฉพาะจำนวนแบบสำรวจรายวัน", "ฐานข้อมูลแบบสำรวจลานจอดรถเรือนไทย → RuenThai_Survey (gid 873571277)")]),
 dict(id="graduation", name="งานปริญญา", icon="cap", systems=[
  S("grad-parking", "รายงานจำนวนรถในลานจอด พิธีพระราชทานปริญญาบัตร ปีการศึกษา 2568", "เจ้าหน้าที่บันทึกจำนวนรถในลานจอดแต่ละรอบระหว่างวันงาน", "connected", "graduationParking",
    [L("เปิดระบบบันทึกจำนวนรถ", GP+"mu-graduation-parking-count/")], "ต้องเข้าสู่ระบบ Google ตามที่ผู้ดูแลกำหนด", "SUMMARY_2569"),
  S("grad-guard-report", "รายงานผลการปฏิบัติงาน รปภ. ช่วงงานปริญญา (GPS)", "รปภ.เอกชนรายงานผลการปฏิบัติงานพร้อมพิกัดและภาพถ่าย", "connected", "graduationGuardGps",
    [L("เปิดระบบรายงานผล", "https://script.google.com/a/macros/mahidol.ac.th/s/AKfycbzn86oqYMYzjb5YmdjeKZueLVb8UWR5eMDMQWTTIzDhwWko7gQhgf6bov_XljvyIwIR/exec"),
     L("รายงานผลการปฏิบัติงาน", "https://script.google.com/a/macros/mahidol.ac.th/s/AKfycbzn86oqYMYzjb5YmdjeKZueLVb8UWR5eMDMQWTTIzDhwWko7gQhgf6bov_XljvyIwIR/exec?page=admin"),
     L("ค้นหาข้อมูลเจ้าหน้าที่ปฏิบัติงาน", "https://script.google.com/a/macros/mahidol.ac.th/s/AKfycbyAX7zwgdHsXgn-VoaYPka8UA3525W10FF2L1wpkBySozBLRZMMW4l7s9k7bHf05cBY/exec")],
    "รายการรายงานอ่านจากแท็บ Reports ผ่านบริการภายใน (แสดงหลังเข้าสู่ระบบ) · ปุ่มด้านล่างเปิดระบบต้นทางในแท็บใหม่ ซึ่งยังใช้สิทธิ์ของระบบต้นทาง (บัญชี mahidol.ac.th)", "ระบบรายงานผลการปฏิบัติงาน รปภ.เอกชน ปริญญา (GPS) → Reports (gid 1074767452)")]),
 dict(id="guard", name="งาน รปภ.", icon="shield", systems=[
  S("guard-scan", "สแกนจุดตรวจ รปภ.เอกชน", "รปภ.เอกชนสแกนจุดตรวจตามรอบ แยกหน่วยงาน/โซน", "connected", "guardScan",
    [L("เปิดแบบฟอร์มสแกนจุด", GP+"NPsecurity-guard-scan/")], None, "แท็บ แสกนจุดเอกชน"),
  S("guard-feedback-central", "แบบประเมินความพึงพอใจ รปภ.เอกชนส่วนกลาง 6 สัญญาจ้าง", "ผู้ใช้บริการให้คะแนน 5 ด้าน (1–5)", "connected", "satisfactionCentral",
    [L("เปิดแบบประเมิน", GP+"NPcentral-guard-feedback/")], None, "แท็บ ความพึงพอใจการให้บริการรปภ.เอกชน"),
  S("guard-feedback-unit", "แบบประเมินความพึงพอใจ รปภ.เอกชนส่วนงาน 6 สัญญาจ้าง", "ส่วนงานบันทึกผลประเมินรายเดือนพร้อมจำนวนผู้ตอบ", "connected", "satisfactionUnit",
    [L("เปิดแบบบันทึกผลประเมิน", GP+"NPsecurity-feedback/")], None, "แท็บ คะแนนความพึงพอใจรปภ.ส่วนงาน"),
  S("guard-shift", "รายชื่อประจำจุด รปภ.เอกชน", "บันทึกรายชื่อ รปภ.ประจำจุดรายผลัด", "link", None,
    [L("เปิดแบบฟอร์ม", GP+"guard-shift-tracker/")], "ข้อมูลเป็นรายชื่อบุคคล จึงไม่นำสถิติขึ้นหน้ารวม", None),
  S("pdf-guard", "PDF รายงานการตรวจการปฏิบัติหน้าที่ รปภ.เอกชนส่วนกลาง", "สร้างเอกสารลงชื่อ/ตรวจการปฏิบัติหน้าที่", "link", None,
    [L("เปิดระบบสร้าง PDF", GP+"PDF-NPsecurity-report/")], "เป็นเครื่องมือสร้างเอกสาร", None),
  S("pdf-guard-monthly", "PDF สรุปผลประเมินและควบคุมงานจ้างเหมา รปภ. ประจำเดือน (OPPE-01-F-10-01)", "สร้างเอกสารสรุปผลรายเดือนจากข้อมูลสแกนจุดและความพึงพอใจ", "link", None,
    [L("เปิดระบบสร้าง PDF", GP+"PDF-OPPE-01-F-10-01/")], "เป็นเครื่องมือสร้างเอกสาร", None)]),
 dict(id="borrow", name="อุปกรณ์และรถกอล์ฟ", icon="box", systems=[
  S("borrow", "ระบบยืม-คืนอุปกรณ์และรถกอล์ฟ", "ยื่นคำขอยืมอุปกรณ์จราจร/จองรถกอล์ฟ และแจ้งคืน", "warn", "borrow",
    [L("เปิดระบบยืม-คืน", GP+"borrowform/")], "ระบบยังไม่สมบูรณ์ — ข้อเสนอปรับปรุงอยู่ใน branch borrow-v2-proposal", "Borrow_Data / Return_Data")]),
 dict(id="safety", name="ความปลอดภัย (AED / ถังดับเพลิง)", icon="heart", systems=[
  S("aed-map", "แผนที่ตรวจสอบความพร้อมใช้งาน AED", "ตำแหน่งเครื่อง AED ภายในวิทยาเขตศาลายา บน Google My Maps", "link", None,
    [L("เปิดแผนที่ AED", "https://www.google.com/maps/d/u/0/viewer?mid=1ut0hZAkMPrVLSq5DDCWfj1CScKtPdnU&femb=1&ll=13.794197821033412%2C100.32132264629175&z=15")],
    "ไม่มีข้อมูลยืนยันจำนวนเครื่องในรูปแบบที่ระบบอ่านได้ จึงแสดงเป็นลิงก์", None),
  S("fire", "ระบบตรวจถังดับเพลิง", "ตรวจสภาพถังดับเพลิงรายถังด้วยมือถือ และบันทึกการเติม", "connected", "fire",
    [L("เปิดระบบตรวจถังดับเพลิง", GP+"-v1/")], None, "แท็บ ข้อมูลถังดับเพลิง / บันทึกการตรวจ")]),
 dict(id="lostfound", name="ของหาย / เก็บของได้", icon="search", systems=[
  S("lostfound", "ระบบแจ้งของหาย / เก็บของได้ / รับของคืน", "แจ้งของหาย แจ้งเก็บของได้ และติดตามการรับคืน", "connected", "lostfound",
    [L("เปิดระบบ Lost & Found", GP+"lostfound/")], None, "แท็บ รายการ พ.ศ. 2569 (ปัจจุบัน)")]),
]
out = pathlib.Path(__file__).resolve().parent.parent / "data" / "systems.json"
out.write_text(json.dumps(dict(schema=1, categories=cats), ensure_ascii=False, indent=1), encoding="utf-8")
n = sum(len(c["systems"]) for c in cats)
print("systems:", n, "categories:", len(cats), "| unverified links:", sum(1 for c in cats for s in c["systems"] for l in s["links"] if not l["verified"]))
