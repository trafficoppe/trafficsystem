// server/lib/facts.js — สร้าง “ข้อเท็จจริง” สำหรับผู้ช่วย AI จากไฟล์สถิติรวม (data/stats.json, data/extra.json) เท่านั้น
// ตัวเลขทุกตัวคำนวณที่นี่แบบตายตัว (ไม่ให้โมเดลบวก/ลบ/เฉลี่ยเอง) แต่ละบรรทัดระบุช่วงเวลา หน่วย และวันที่ของข้อมูล
// ไม่มีข้อมูลรายบุคคล: ไม่ใช้พิกัดรายจุด รายชื่อ เวร รายการ Lost & Found รายชิ้น หรือบันทึกวิทยุ
const TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const n = (x) => Number(x || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
const mTh = (m) => TH[+m.slice(5, 7) - 1] + ' ' + (+m.slice(0, 4) + 543);
const dTh = (d) => +d.slice(8, 10) + ' ' + TH[+d.slice(5, 7) - 1] + ' ' + (+d.slice(0, 4) + 543) + (d.length > 10 ? ' ' + d.slice(11, 16) + ' น.' : '');
const sum = (rows, f) => rows.reduce((a, r) => a + (f(r) || 0), 0);
const isMonth = (s) => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(s || '')), isDay = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));

export function buildFacts(stats, extra, ctx, nowMs) {
  const M = (stats && stats.modules) || {}, X = extra || {}, L = [], src = new Set();
  const today = new Date((nowMs || Date.now()) + 7 * 3600000).toISOString().slice(0, 10);             // วันนี้ตามเวลาไทย คิดฝั่งบริการ ไม่เชื่อค่าที่หน้าเว็บส่งมา
  const from = ctx && isMonth(ctx.from) ? ctx.from : null, to = ctx && isMonth(ctx.to) ? ctx.to : null;
  const inR = (m) => from && to && m >= from && m <= to, rLabel = from && to ? (from === to ? mTh(from) : mTh(from) + ' – ' + mTh(to)) : '';
  const add = (topic, period, text, asOf) => L.push('[' + topic + ' | ' + period + (asOf ? ' | ข้อมูล ณ ' + asOf : '') + '] ' + text);
  L.push('วันนี้ (เวลาไทย) คือ ' + dTh(today) + (ctx && ctx.period === 'today' ? ' · ผู้ใช้กำลังดู “ข้อมูลวันนี้” บนหน้าเว็บ (ถ้าคำถามไม่ระบุช่วง ให้ตอบของวันนี้ และบอกว่าเป็นของวันนี้)' : rLabel ? ' · ช่วงที่ผู้ใช้กำลังดูบนหน้าเว็บ: ' + rLabel + ' (ถ้าคำถามไม่ระบุช่วง ให้ตอบของช่วงนี้ และบอกช่วงนี้ในคำตอบ)' : ''));

  const inc = M.incidents, incD = X.incidentsDaily;
  if (inc && inc.monthly) {
    const asOf = dTh(incD && incD.complete === true ? incD.checkedAt : inc.updated); src.add('รายงานเหตุการณ์ (ฐานข้อมูลงานจราจร)');
    const line = (rows) => { const t = {}; rows.forEach((r) => Object.keys(r.byType).forEach((k) => { t[k] = (t[k] || 0) + r.byType[k]; })); return 'รวม ' + n(sum(Object.keys(t), (k) => t[k])) + ' เหตุการณ์ — ' + Object.keys(t).map((k) => k + ' ' + n(t[k])).join(', '); };
    const injured = (test) => (incD ? sum(incD.rows.filter(test), (r) => r.injured) : null);
    inc.monthly.forEach((r) => { const inj = injured((x) => x.date.slice(0, 7) === r.month); add('เหตุการณ์และอุบัติเหตุ', mTh(r.month), line([r]) + (inj == null ? '' : ' · ผู้บาดเจ็บ/ผู้ป่วย ' + n(inj) + ' คน'), asOf); });
    add('เหตุการณ์และอุบัติเหตุ', 'ทั้งหมดที่มีข้อมูล (' + mTh(inc.monthly[0].month) + ' – ' + mTh(inc.monthly[inc.monthly.length - 1].month) + ')', line(inc.monthly) + ' · ผู้บาดเจ็บ/ผู้ป่วย ' + n(inc.injuredTotal) + ' คน', asOf);
    if (rLabel) { const rr = inc.monthly.filter((r) => inR(r.month)); if (rr.length) add('เหตุการณ์และอุบัติเหตุ', 'ช่วงที่กำลังดู ' + rLabel, line(rr) + ' · ผู้บาดเจ็บ/ผู้ป่วย ' + n(injured((x) => inR(x.date.slice(0, 7)))) + ' คน', asOf); }
    if (incD && incD.complete === true && incD.checkedAt.slice(0, 10) === today) { const d = incD.rows.filter((r) => r.date === today); add('เหตุการณ์และอุบัติเหตุ', 'วันนี้ ' + dTh(today), 'บันทึกแล้ว ' + n(sum(d, (r) => r.count)) + ' เหตุการณ์ · ผู้บาดเจ็บ/ผู้ป่วย ' + n(sum(d, (r) => r.injured)) + ' คน (รายการอาจบันทึกย้อนหลัง)', dTh(incD.checkedAt)); }
    else add('เหตุการณ์และอุบัติเหตุ', 'วันนี้ ' + dTh(today), 'ยังไม่มีข้อมูลยืนยันของวันนี้ — รายการล่าสุดในระบบคือวันที่ ' + (incD ? dTh(incD.lastEntry) : 'ไม่ทราบ'), asOf);
  }
  const lf = M.lostfound, lfs = X.lostfoundStatus;
  if (lf && lf.monthly) {
    src.add('Lost & Found (Sheet แจ้งของหาย)'); const asOf = dTh(lf.updated), st = {}; ((lfs && lfs.monthly) || []).forEach((r) => { st[r.month] = r; });
    lf.monthly.forEach((r) => add('Lost & Found', mTh(r.month), 'แจ้งของหาย ' + n(r.byType['สิ่งของสูญหาย']) + ' รายการ, เก็บของได้ ' + n(r.byType['พบสิ่งของ']) + ' รายการ, แบบฟอร์มรับของคืน ' + n(r.byType['รับของคืน']) + ' ฉบับ' + (st[r.month] ? ', สถานะ “รับของคืนแล้ว” ' + n(st[r.month].returned) + ' รายการ' : ''), asOf));
    add('Lost & Found', 'ทั้งปีที่มีข้อมูล', 'รวม ' + n(lf.total) + ' รายการ — แจ้งของหาย ' + n(lf.byType['สิ่งของสูญหาย']) + ', เก็บของได้ ' + n(lf.byType['พบสิ่งของ']) + ', แบบฟอร์มรับของคืน ' + n(lf.byType['รับของคืน']) + ' ฉบับ · สถานะ “รับของคืนแล้ว” ' + n(lf.returned) + ' รายการ (แบบฟอร์มรับของคืนกับสถานะรับคืนแล้วเป็นคนละตัวเลข)', asOf);
  }
  const g = M.gate;
  if (g && g.monthly) {
    src.add('แบบบันทึกรถเข้าและการสวมหมวกนิรภัย'); const last = g.daily[g.daily.length - 1], asOf = dTh(last.date);
    g.monthly.forEach((r) => add('รถเข้ามหาวิทยาลัยและหมวกนิรภัย', mTh(r.month) + ' (' + n(r.days) + ' วันที่มีข้อมูล)', 'รถยนต์เข้า ' + n(r.cars) + ' คัน, รถจักรยานยนต์เข้า ' + n(r.motorcycles) + ' คัน, ผู้ไม่สวมหมวกนิรภัย ' + n(r.noHelmet) + ' ราย — มีเฉพาะจำนวนรถเข้า ไม่มีข้อมูลรถออก และไม่มีตัวหารสำหรับคิดอัตราการสวมหมวก', asOf));
    const d = g.daily.filter((r) => r.date === today)[0];
    add('รถเข้ามหาวิทยาลัยและหมวกนิรภัย', 'วันนี้ ' + dTh(today), d ? 'รถยนต์เข้า ' + n(d.cars) + ' คัน, รถจักรยานยนต์เข้า ' + n(d.motorcycles) + ' คัน, ไม่สวมหมวก ' + n(d.noHelmet) + ' ราย' : 'ยังไม่มีข้อมูลของวันนี้ — วันล่าสุดที่มีข้อมูลคือ ' + dTh(last.date) + ' (รถยนต์ ' + n(last.cars) + ' คัน, รถจักรยานยนต์ ' + n(last.motorcycles) + ' คัน, ไม่สวมหมวก ' + n(last.noHelmet) + ' ราย)', asOf);
  }
  const c = M.cctv;
  if (c && c.monthly) { src.add('คำขอดูกล้อง CCTV'); c.monthly.forEach((r) => add('คำขอดูกล้อง CCTV (ส่วนกลาง)', mTh(r.month), n(r.count) + ' คำขอ', dTh(c.updated))); add('คำขอดูกล้อง CCTV (ส่วนกลาง)', 'ทั้งหมดที่มีข้อมูล', n(c.total) + ' คำขอ · ไม่มีข้อมูลยืนยันของ MLC, LA, PMH', dTh(c.updated)); }
  const aw = X.anywheel;
  if (aw && aw.monthly) { src.add('จักรยาน Anywheel'); aw.monthly.forEach((r) => add('จักรยาน Anywheel', mTh(r.month), 'ใช้งาน ' + n(r.trips) + ' ครั้ง, ระยะทาง ' + n(r.km) + ' กม.' + (r.minutes == null ? '' : ', เวลาใช้งาน ' + n(r.minutes) + ' นาที'), dTh(aw.updated))); }
  const tr = X.tram;
  if (tr && tr.monthly) { src.add('รถรางบริการพิเศษ'); tr.monthly.forEach((r) => add('รถรางบริการพิเศษ', mTh(r.month), n(r.jobs) + ' งาน, ' + n(r.rounds) + ' รอบ, ' + n(r.km) + ' กม., รถที่ให้บริการ ' + n(r.trams) + ' คัน-ครั้ง, ' + n(r.minutes) + ' นาที — ไม่มีข้อมูลจำนวนผู้โดยสาร', dTh(tr.updated))); }
  const sat = M.guardSatisfaction;
  if (sat && sat.central) { src.add('แบบประเมินความพึงพอใจ รปภ.'); sat.central.monthly.forEach((r) => add('ความพึงพอใจ รปภ.ส่วนกลาง', mTh(r.month), 'คะแนนรวม ' + n(r.overall) + ' จาก 5 · ผู้ตอบ ' + n(r.responses) + ' คน', dTh(sat.central.updated)));
    sat.unit.monthly.forEach((r) => add('ความพึงพอใจ รปภ.ส่วนงาน', mTh(r.month), 'คะแนนรวม ' + n(r.overall) + ' จาก 5 · ผู้ตอบ ' + n(r.respondents) + ' คน', dTh(sat.unit.updated))); }
  const vr = M.vehicleRegistration;
  if (vr && vr.rows) { src.add('ทะเบียนยานพาหนะ'); add('ทะเบียนยานพาหนะ', 'ยอดทะเบียนล่าสุด', Object.keys(vr.rows).map((k) => k + ' ' + (vr.rows[k] == null ? 'ไม่มีข้อมูลยืนยัน' : n(vr.rows[k]) + ' รายการ')).join(', '), dTh(vr.updated)); }
  const oc = X.opsCheck;
  if (oc) { src.add('ข้อมูลงานจราจรออนไลน์'); add('ทะเบียนของงานจราจร', 'ยอดล่าสุด', 'ลานจอดรถ ' + n(oc.parkingLots) + ' ลาน, ยานพาหนะของงาน ' + n(oc.vehicles.total) + ' คัน, อุปกรณ์ดับเพลิง ' + n(oc.fireEquipment.total) + ' ชิ้น (ไม่รวม AED)', dTh(oc.checkedAt)); }
  const rt = X.ruenthaiSurvey;
  if (rt && rt.total != null) { src.add('แบบสำรวจลานจอดรถเรือนไทย'); add('ลานจอดรถเรือนไทย', dTh(rt.from) + ' – ' + dTh(rt.to), 'แบบสำรวจที่ส่งเข้ามา ' + n(rt.total) + ' ฉบับ — ไม่ใช่จำนวนรถไม่ซ้ำและไม่ใช่ยอดอนุมัติ', dTh(rt.checkedAt)); }
  return { text: L.join('\n'), sources: Array.from(src), asOf: dTh(String((X.generatedAt || (stats && stats.generatedAt) || '')).slice(0, 16).replace('T', ' ')) };
}

// ตัวเลขทุกตัวในคำตอบต้องมีอยู่ในข้อเท็จจริงหรือในคำถามของผู้ใช้ — ถ้าไม่ใช่ ถือว่าโมเดลคิดเลขเอง/เดา แล้วไม่ส่งคำตอบนั้นออกไป
export function numbersOk(reply, factsText, question) {
  const norm = (s) => (String(s).match(/\d[\d,]*(?:\.\d+)?/g) || []).map((x) => x.replace(/,/g, '').replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, ''));
  const allowed = new Set(norm(factsText).concat(norm(question)));
  const body = String(reply).replace(/^\s*\d{1,2}[.)]\s/gm, '');                                           // เลขลำดับหัวข้อ
  return norm(body).every((x) => allowed.has(x));
}
