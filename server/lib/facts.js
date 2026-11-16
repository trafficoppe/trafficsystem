// server/lib/facts.js — สร้าง “ข้อเท็จจริง” สำหรับผู้ช่วย AI จากสถิติรวมเท่านั้น (data/stats.json, data/extra.json + ตัวเลขสดรวมจากบริการ)
// ตัวเลขทุกตัว รวมทั้งผลต่าง ร้อยละการเปลี่ยนแปลง และผลรวมรายปี คำนวณที่นี่แบบตายตัว (โมเดลไม่ต้องบวก/ลบ/เฉลี่ยเอง) แต่ละบรรทัดระบุช่วงเวลาและวันที่ของข้อมูล
// ไม่มีข้อมูลรายบุคคล: ไม่ใช้ตำแหน่งรายจุด รายชื่อ เวร รายการ Lost & Found รายชิ้น บันทึกวิทยุ หรือข้อความสรุปรายเหตุการณ์
const TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const THF = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const n = (x) => Number(x || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
const mTh = (m) => TH[+m.slice(5, 7) - 1] + ' ' + (+m.slice(0, 4) + 543);
const dTh = (d) => +d.slice(8, 10) + ' ' + TH[+d.slice(5, 7) - 1] + ' ' + (+d.slice(0, 4) + 543) + (d.length > 10 ? ' ' + d.slice(11, 16) + ' น.' : '');
const sum = (rows, f) => rows.reduce((a, r) => a + (f(r) || 0), 0);
const isMonth = (s) => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(s || '')), isDay = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
const prevMonth = (m) => { const y = +m.slice(0, 4), k = +m.slice(5, 7); return k === 1 ? (y - 1) + '-12' : y + '-' + String(k - 1).padStart(2, '0'); };
const addDay = (d, k) => new Date(Date.parse(d + 'T00:00:00Z') + k * 864e5).toISOString().slice(0, 10);
// ผลต่างที่คำนวณไว้ให้ (โมเดลห้ามคิดเอง): “เพิ่มขึ้น 3 (+25%)” · ตัวหารเป็น 0 → ไม่มีร้อยละ
export function delta(cur, prev) {
  const d = cur - prev; if (!d) return 'เท่าเดิม';
  const p = prev ? ' (' + (d > 0 ? '+' : '−') + n(Math.round(Math.abs(d) * 1000 / prev) / 10) + '%)' : ' (เดือนก่อนเป็น 0 จึงไม่มีร้อยละ)';
  return (d > 0 ? 'เพิ่มขึ้น ' : 'ลดลง ') + n(Math.abs(d)) + p;
}
// หัวข้อ → คำที่บ่งบอกในคำถาม (ใช้เลือกส่งเฉพาะข้อมูลที่เกี่ยวข้อง และอ้างที่มาเฉพาะเรื่องนั้น)
const TOPICS = {
  incidents: /อุบัติ|เหตุ|บาดเจ็บ|ผู้ป่วย|ป่วย|ชน|ล้ม|รถพยาบาล|incident|accident/i,
  lostfound: /ของหาย|หาย|เก็บได้|เก็บของ|รับคืน|คืนของ|lost|found|ของ/i,
  gate: /รถเข้า|ประตู|หมวก|นิรภัย|จักรยานยนต์|มอเตอร์ไซค์|รถยนต์|helmet|gate/i,
  cctv: /cctv|วงจรปิด|กล้องวงจร|ขอดู(?:ภาพ)?กล้อง|ภาพจากกล้อง/i,
  anywheel: /anywheel|จักรยาน(?!ยนต์)|ปั่น/i,
  tram: /รถราง|tram/i,
  guard: /รปภ|พึงพอใจ|ประเมิน|ความปลอดภัยเอกชน/i,
  vehicle: /ทะเบียน|ลงทะเบียน|สติ๊กเกอร์|สติกเกอร์|นักศึกษา/i,
  ops: /ลานจอด|ดับเพลิง|ถังดับ|ยานพาหนะของงาน/i,
  ruenthai: /เรือนไทย|ruenthai/i
};
const CORE = ['incidents', 'lostfound', 'gate'];
export function topicsOf(text) {
  const t = String(text || ''); let out = Object.keys(TOPICS).filter((k) => TOPICS[k].test(t));
  // คำถามเรื่องลงทะเบียนรถ ไม่ใช่เรื่องรถเข้าประตู · คำถามเรื่องลานเรือนไทย ไม่ใช่ทะเบียนลานจอด/อุปกรณ์ของงาน
  if (out.includes('vehicle') && !/เข้า|ประตู|หมวก|นิรภัย/.test(t)) out = out.filter((k) => k !== 'gate');
  if (out.includes('ruenthai') && !/ดับเพลิง|ยานพาหนะของงาน|กี่ลาน|ลานจอดทั้งหมด/.test(t)) out = out.filter((k) => k !== 'ops');
  if (out.includes('ruenthai') && !/ลงทะเบียน|สติ๊กเกอร์|สติกเกอร์|นักศึกษา/.test(t)) out = out.filter((k) => k !== 'vehicle');
  return out;
}

// เมนูภายในที่ผู้ช่วยแนะนำได้ (ลิงก์ในเว็บนี้เท่านั้น — หน้าเว็บแปลง #รหัส เป็นลิงก์)
export const NAV_HINTS = [
  ['รายงานเหตุการณ์และอุบัติเหตุ (รายการ รายละเอียด ภาพ)', 'traffic'], ['แผนที่จุดเกิดอุบัติเหตุ', 'accident-map'], ['รถเข้าและผู้ไม่สวมหมวกนิรภัย', 'gate'],
  ['เหตุการณ์กิจกรรมพิเศษ', 'event-incident'], ['รายงาน รปภ.ปริญญา (GPS) ปีการศึกษา 2568', 'grad-2568-gps'], ['แจ้งของหาย / เก็บของได้', 'lostfound'],
  ['กล้องวงจรปิด (คำขอดูภาพ)', 'cctv'], ['รถรางและจักรยาน Anywheel', 'tram'], ['ตารางเวร', 'roster'], ['แบบฟอร์มต่างๆ', 'forms'],
  ['รายงานประจำวัน', 'report-daily'], ['รายงานประจำเดือน', 'report-monthly'], ['อุปกรณ์ดับเพลิง', 'safety'], ['ยานพาหนะทั้งหมด', 'vehicle-fleet']
];

// รวมตัวเลขสดจากบริการ (liveStats) เข้ากับไฟล์สรุป — ใช้ชุดเดียวกับหน้าเว็บ (assets/hub.js: liveRefresh + applyLive10) เพื่อให้ผู้ช่วยตอบตรงกับหน้าจอ
// ไม่ตั้ง “เวลาอ่าน” เป็นเวลาปัจจุบัน: แต่ละหัวข้อเก็บเวลาที่อ่านสำเร็จจริง (checkedAt) ของตัวเอง · หัวข้อที่อ่านสดไม่สำเร็จคงค่าไฟล์สรุปพร้อมวันที่ของไฟล์ และบันทึกสาเหตุ
export function applyLive(stats, extra, live) {
  const M = (stats && stats.modules) || {}, X = extra || {}, L = { topics: {}, errors: {} };
  if (!live) return L; const e = live.errors || {}; L.errors = Object.assign({}, e);
  ['incidents', 'lostfound', 'gate'].forEach((k) => { if (live[k] && M[k]) { Object.assign(M[k], live[k]); L.topics[k] = live.checkedAt; } });
  ['incidentsDaily', 'lostfoundDaily'].forEach((k) => { if (live[k]) X[k] = Object.assign(X[k] || {}, live[k]); });
  if (live.lostfoundStatus && X.lostfoundStatus) Object.assign(X.lostfoundStatus, live.lostfoundStatus);
  const vr = M.vehicleRegistration;
  if (vr) { if (live.studentMoto) { vr.rows['นักศึกษา – รถจักรยานยนต์'] = live.studentMoto.registrations; vr.studentMoto = live.studentMoto; L.topics.vehicle = live.studentMoto.checkedAt; } else if (e.studentMoto) vr.studentMotoErr = e.studentMoto; }
  if (live.ruenthai) { const r = live.ruenthai, rs = X.ruenthaiSurvey || (X.ruenthaiSurvey = {}); rs.total = r.surveys; rs.daily = r.daily; rs.from = r.range.from; rs.to = r.range.to; rs.updated = r.lastEntry; rs.checkedAt = r.checkedAt; rs.live = r; L.topics.ruenthai = r.checkedAt; }
  else if (e.ruenthai && X.ruenthaiSurvey) X.ruenthaiSurvey.liveErr = e.ruenthai;
  return L;
}
const WHY = { 'relay-not-configured': 'ยังไม่ได้ติดตั้งตัวกลางอ่านไฟล์ของเจ้าของ', 'relay-login-required': 'ตัวกลางยังไม่ได้ Deploy แบบเปิดให้บริการเรียกได้', 'relay-forbidden': 'ค่าลับของตัวกลางไม่ตรง', 'relay-timeout': 'ตัวกลางตอบช้าเกินกำหนด', 'relay-source-forbidden': 'บัญชีที่ติดตั้งตัวกลางเปิด Sheet นี้ไม่ได้',
  'source-unreachable': 'ติดต่อแหล่งข้อมูลไม่ได้', 'source-error': 'แหล่งข้อมูลตอบผิดรูปแบบ', 'source-schema': 'หัวคอลัมน์ต้นทางเปลี่ยน', 'source-not-configured': 'ยังไม่ได้ตั้งค่าแหล่งข้อมูล' };
const why = (c) => WHY[c] || ('อ่านไม่สำเร็จ (' + c + ')');
const topObj = (o, k, u) => Object.keys(o || {}).sort((a, b) => o[b] - o[a]).slice(0, k || 8).map((x) => x + ' ' + n(o[x]) + (u ? ' ' + u : '')).join(', ');

export function buildFacts(stats, extra, ctx, nowMs, question, liveInfo) {
  const M = (stats && stats.modules) || {}, X = extra || {}, L = [], src = {};
  const today = new Date((nowMs || Date.now()) + 7 * 3600000).toISOString().slice(0, 10), curM = today.slice(0, 7);   // วันนี้ตามเวลาไทย คิดฝั่งบริการ ไม่เชื่อค่าที่หน้าเว็บส่งมา
  const from = ctx && isMonth(ctx.from) ? ctx.from : null, to = ctx && isMonth(ctx.to) ? ctx.to : null;
  const inR = (m) => from && to && m >= from && m <= to, rLabel = from && to ? (from === to ? mTh(from) : mTh(from) + ' – ' + mTh(to)) : '';
  // เลือกหัวข้อ: ไม่ส่ง question (การทดสอบ/เรียกแบบเดิม) = ทุกหัวข้อ · มีคำถามแต่ไม่พบหัวข้อ = หัวข้อหลัก 3 เรื่อง
  const picked = question == null ? Object.keys(TOPICS) : topicsOf(question), use = new Set(picked.length ? picked : CORE);
  const LI = liveInfo || { topics: {}, errors: {} }, asOfSeen = [];
  const add = (topic, period, text, asOf) => { if (asOf && asOfSeen.indexOf(asOf) < 0) asOfSeen.push(asOf); L.push('[' + topic + ' | ' + period + (asOf ? ' | ข้อมูล ณ ' + asOf : '') + '] ' + text); };
  const part = (m) => m === curM ? ' (เดือนปัจจุบัน ยังไม่ครบเดือน)' : '';
  L.push('วันนี้ (เวลาไทย) คือ ' + dTh(today) + ' · เดือนนี้ = ' + THF[+curM.slice(5, 7) - 1] + ' ' + (+curM.slice(0, 4) + 543) + ' · เดือนก่อน = ' + mTh(prevMonth(curM)) + ' · ปีนี้ = ปีปฏิทิน พ.ศ. ' + (+today.slice(0, 4) + 543)
    + (ctx && ctx.period === 'today' ? ' · ผู้ใช้กำลังดู “ข้อมูลวันนี้” บนหน้าเว็บ (ถ้าคำถามไม่ระบุช่วง ให้ตอบของวันนี้ และบอกว่าเป็นของวันนี้)' : rLabel ? ' · ช่วงที่ผู้ใช้กำลังดูบนหน้าเว็บ: ' + rLabel + ' (ถ้าคำถามไม่ระบุช่วง ให้ตอบของช่วงนี้ และบอกช่วงนี้ในคำตอบ)' : ''));
  L.push('ปีการศึกษาไม่ใช่ปีปฏิทิน: ระบบมีผลรวมรายเดือนและรายปีปฏิทินเท่านั้น ไม่มีผลรวมตามปีการศึกษาที่ยืนยันแล้ว (ยกเว้นหัวข้อที่ระบุว่า “ปีการศึกษา” ไว้ชัดเจน)');

  const errK = Object.keys(LI.errors || {}).filter((k) => ({ incidents: 1, lostfound: 1, lostfoundYear: 1, gate: 1 })[k] && use.has(k === 'lostfoundYear' ? 'lostfound' : k));
  if (errK.length) L.push('หมายเหตุแหล่งข้อมูล: รอบนี้อ่านสดไม่สำเร็จสำหรับ ' + errK.map((k) => ({ incidents: 'เหตุการณ์', lostfound: 'Lost & Found รายวัน', lostfoundYear: 'Lost & Found รายปี', gate: 'รถเข้า/หมวกนิรภัย' })[k] + ' (' + why(LI.errors[k]) + ')').join(', ') + ' — ตัวเลขหัวข้อนั้นมาจากไฟล์สรุปตามวันที่ที่ระบุ ห้ามเรียกว่าข้อมูลสดของวันนี้');
  const inc = M.incidents, incD = X.incidentsDaily;
  if (inc && inc.monthly && use.has('incidents')) {
    const asOf = dTh(incD && incD.complete === true ? incD.checkedAt : inc.updated); src.incidents = 'รายงานเหตุการณ์ (ฐานข้อมูลงานจราจร)';
    const totals = (rows) => { const t = {}; rows.forEach((r) => Object.keys(r.byType).forEach((k) => { t[k] = (t[k] || 0) + r.byType[k]; })); return t; };
    const acc = (t) => sum(Object.keys(t).filter((k) => /อุบัติเหตุ/.test(k)), (k) => t[k]);
    const line = (rows) => { const t = totals(rows); return 'รวม ' + n(sum(Object.keys(t), (k) => t[k])) + ' เหตุการณ์ (เฉพาะประเภทอุบัติเหตุ ' + n(acc(t)) + ') — ' + Object.keys(t).map((k) => k + ' ' + n(t[k])).join(', '); };
    const injured = (test) => (incD ? sum(incD.rows.filter(test), (r) => r.injured) : null);
    const byM = {}; inc.monthly.forEach((r) => { byM[r.month] = r; });
    inc.monthly.forEach((r) => {
      const inj = injured((x) => x.date.slice(0, 7) === r.month), p = byM[prevMonth(r.month)], tC = totals([r]), all = sum(Object.keys(tC), (k) => tC[k]);
      let cmp = '';
      if (p) { const tP = totals([p]); cmp = ' · เทียบ ' + mTh(p.month) + ': ทั้งหมด ' + delta(all, sum(Object.keys(tP), (k) => tP[k])) + ', อุบัติเหตุ ' + delta(acc(tC), acc(tP)); }
      add('เหตุการณ์และอุบัติเหตุ', mTh(r.month) + part(r.month), line([r]) + (inj == null ? '' : ' · ผู้บาดเจ็บ/ผู้ป่วย ' + n(inj) + ' คน') + cmp, asOf);
    });
    const years = [...new Set(inc.monthly.map((r) => r.month.slice(0, 4)))];
    years.forEach((y) => { const rr = inc.monthly.filter((r) => r.month.slice(0, 4) === y); add('เหตุการณ์และอุบัติเหตุ', 'ปีปฏิทิน พ.ศ. ' + (+y + 543) + ' เท่าที่มีข้อมูล (' + mTh(rr[0].month) + ' – ' + mTh(rr[rr.length - 1].month) + ')', line(rr) + ' · ผู้บาดเจ็บ/ผู้ป่วย ' + n(injured((x) => x.date.slice(0, 4) === y)) + ' คน', asOf); });
    add('เหตุการณ์และอุบัติเหตุ', 'ทั้งหมดที่มีข้อมูล (' + mTh(inc.monthly[0].month) + ' – ' + mTh(inc.monthly[inc.monthly.length - 1].month) + ')', line(inc.monthly) + ' · ผู้บาดเจ็บ/ผู้ป่วย ' + n(inc.injuredTotal) + ' คน · ไม่มีข้อมูลก่อน ' + mTh(inc.monthly[0].month) + ' จึงเทียบกับปีก่อนไม่ได้', asOf);
    if (rLabel) { const rr = inc.monthly.filter((r) => inR(r.month)); if (rr.length) add('เหตุการณ์และอุบัติเหตุ', 'ช่วงที่กำลังดู ' + rLabel, line(rr) + ' · ผู้บาดเจ็บ/ผู้ป่วย ' + n(injured((x) => inR(x.date.slice(0, 7)))) + ' คน', asOf); }
    if (incD && incD.complete === true && incD.checkedAt.slice(0, 10) === today) {
      const d = incD.rows.filter((r) => r.date === today), y = incD.rows.filter((r) => r.date === addDay(today, -1)), byT = {}; d.forEach((r) => { byT[r.type] = (byT[r.type] || 0) + r.count; });
      add('เหตุการณ์และอุบัติเหตุ', 'วันนี้ ' + dTh(today), 'บันทึกแล้ว ' + n(sum(d, (r) => r.count)) + ' เหตุการณ์' + (Object.keys(byT).length ? ' (' + Object.keys(byT).map((k) => k + ' ' + n(byT[k])).join(', ') + ')' : '') + ' · ผู้บาดเจ็บ/ผู้ป่วย ' + n(sum(d, (r) => r.injured)) + ' คน · เมื่อวาน ' + n(sum(y, (r) => r.count)) + ' เหตุการณ์ (รายการอาจบันทึกย้อนหลัง)', dTh(incD.checkedAt));
    } else add('เหตุการณ์และอุบัติเหตุ', 'วันนี้ ' + dTh(today), 'ยังไม่มีข้อมูลยืนยันของวันนี้ — รายการล่าสุดในระบบคือวันที่ ' + (incD ? dTh(incD.lastEntry) : 'ไม่ทราบ'), asOf);
  }
  const lf = M.lostfound, lfs = X.lostfoundStatus;
  if (lf && lf.monthly && use.has('lostfound')) {
    src.lostfound = 'Lost & Found (Sheet แจ้งของหาย)'; const asOf = dTh(lf.updated), st = {}, byM = {}; ((lfs && lfs.monthly) || []).forEach((r) => { st[r.month] = r; }); lf.monthly.forEach((r) => { byM[r.month] = r; });
    const tot = (r) => sum(Object.keys(r.byType), (k) => r.byType[k]);
    lf.monthly.forEach((r) => { const p = byM[prevMonth(r.month)];
      add('Lost & Found', mTh(r.month) + part(r.month), 'แจ้งของหาย ' + n(r.byType['สิ่งของสูญหาย']) + ' รายการ, เก็บของได้ ' + n(r.byType['พบสิ่งของ']) + ' รายการ, แบบฟอร์มรับของคืน ' + n(r.byType['รับของคืน']) + ' ฉบับ' + (st[r.month] ? ', สถานะ “รับของคืนแล้ว” ' + n(st[r.month].returned) + ' รายการ' : '')
        + (p ? ' · เทียบ ' + mTh(p.month) + ': แจ้งของหาย ' + delta(r.byType['สิ่งของสูญหาย'] || 0, p.byType['สิ่งของสูญหาย'] || 0) + ', รวมทุกประเภท ' + delta(tot(r), tot(p)) : ''), asOf); });
    add('Lost & Found', 'ทั้งปีที่มีข้อมูล', 'รวม ' + n(lf.total) + ' รายการ — แจ้งของหาย ' + n(lf.byType['สิ่งของสูญหาย']) + ', เก็บของได้ ' + n(lf.byType['พบสิ่งของ']) + ', แบบฟอร์มรับของคืน ' + n(lf.byType['รับของคืน']) + ' ฉบับ · สถานะ “รับของคืนแล้ว” ' + n(lf.returned) + ' รายการ (แบบฟอร์มรับของคืนกับสถานะรับคืนแล้วเป็นคนละตัวเลข)', asOf);
  }
  const g = M.gate;
  if (g && g.monthly && use.has('gate')) {
    src.gate = 'แบบบันทึกรถเข้าและการสวมหมวกนิรภัย'; const last = g.daily[g.daily.length - 1], asOf = dTh(last.date), byM = {}; g.monthly.forEach((r) => { byM[r.month] = r; });
    const avg = (r, k) => n(Math.round(r[k] / Math.max(1, r.days)));
    g.monthly.forEach((r) => { const p = byM[prevMonth(r.month)];
      add('รถเข้ามหาวิทยาลัยและหมวกนิรภัย', mTh(r.month) + ' (' + n(r.days) + ' วันที่มีข้อมูล)' + part(r.month), 'รถยนต์เข้า ' + n(r.cars) + ' คัน, รถจักรยานยนต์เข้า ' + n(r.motorcycles) + ' คัน, ผู้ไม่สวมหมวกนิรภัย ' + n(r.noHelmet) + ' ราย · เฉลี่ยต่อวันที่มีข้อมูล: รถยนต์ ' + avg(r, 'cars') + ', จักรยานยนต์ ' + avg(r, 'motorcycles') + ', ไม่สวมหมวก ' + avg(r, 'noHelmet')
        + (p ? ' · เทียบ ' + mTh(p.month) + ' (ยอดรวม จำนวนวันที่มีข้อมูลอาจต่างกัน): รถยนต์ ' + delta(r.cars, p.cars) + ', ไม่สวมหมวก ' + delta(r.noHelmet, p.noHelmet) : '') + ' — มีเฉพาะจำนวนรถเข้า ไม่มีข้อมูลรถออก และไม่มีตัวหารสำหรับคิดอัตราการสวมหมวก', asOf); });
    const d = g.daily.filter((r) => r.date === today)[0];
    add('รถเข้ามหาวิทยาลัยและหมวกนิรภัย', 'วันนี้ ' + dTh(today), d ? 'รถยนต์เข้า ' + n(d.cars) + ' คัน, รถจักรยานยนต์เข้า ' + n(d.motorcycles) + ' คัน, ไม่สวมหมวก ' + n(d.noHelmet) + ' ราย' : 'ยังไม่มีข้อมูลของวันนี้ — วันล่าสุดที่มีข้อมูลคือ ' + dTh(last.date) + ' (รถยนต์ ' + n(last.cars) + ' คัน, รถจักรยานยนต์ ' + n(last.motorcycles) + ' คัน, ไม่สวมหมวก ' + n(last.noHelmet) + ' ราย)', asOf);
  }
  const c = M.cctv;
  if (c && c.monthly && use.has('cctv')) { src.cctv = 'คำขอดูกล้อง CCTV'; c.monthly.forEach((r) => add('คำขอดูกล้อง CCTV (ส่วนกลาง)', mTh(r.month), n(r.count) + ' คำขอ', dTh(c.updated))); add('คำขอดูกล้อง CCTV (ส่วนกลาง)', 'ทั้งหมดที่มีข้อมูล', n(c.total) + ' คำขอ · ไม่มีข้อมูลยืนยันของ MLC, LA, PMH', dTh(c.updated)); }
  const aw = X.anywheel;
  if (aw && aw.monthly && use.has('anywheel')) { src.anywheel = 'จักรยาน Anywheel'; aw.monthly.forEach((r) => add('จักรยาน Anywheel', mTh(r.month), 'ใช้งาน ' + n(r.trips) + ' ครั้ง, ระยะทาง ' + n(r.km) + ' กม.' + (r.minutes == null ? '' : ', เวลาใช้งาน ' + n(r.minutes) + ' นาที'), dTh(aw.updated))); }
  const tr = X.tram;
  if (tr && tr.monthly && use.has('tram')) { src.tram = 'รถรางบริการพิเศษ'; tr.monthly.forEach((r) => add('รถรางบริการพิเศษ', mTh(r.month), n(r.jobs) + ' งาน, ' + n(r.rounds) + ' รอบ, ' + n(r.km) + ' กม., รถที่ให้บริการ ' + n(r.trams) + ' คัน-ครั้ง, ' + n(r.minutes) + ' นาที — ไม่มีข้อมูลจำนวนผู้โดยสาร', dTh(tr.updated))); }
  const sat = M.guardSatisfaction;
  if (sat && sat.central && use.has('guard')) { src.guard = 'แบบประเมินความพึงพอใจ รปภ.'; sat.central.monthly.forEach((r) => add('ความพึงพอใจ รปภ.ส่วนกลาง', mTh(r.month), 'คะแนนรวม ' + n(r.overall) + ' จาก 5 · ผู้ตอบ ' + n(r.responses) + ' คน', dTh(sat.central.updated)));
    sat.unit.monthly.forEach((r) => add('ความพึงพอใจ รปภ.ส่วนงาน', mTh(r.month), 'คะแนนรวม ' + n(r.overall) + ' จาก 5 · ผู้ตอบ ' + n(r.respondents) + ' คน', dTh(sat.unit.updated))); }
  const vr = M.vehicleRegistration;
  if (vr && vr.rows && use.has('vehicle')) { src.vehicle = 'ทะเบียนยานพาหนะ'; const SM = 'นักศึกษา – รถจักรยานยนต์', sm = vr.studentMoto, ks = Object.keys(vr.rows), have = ks.filter((k) => vr.rows[k] != null);
    const snapKs = ks.filter((k) => k !== SM || !sm);
    add('ทะเบียนยานพาหนะ (ไฟล์สรุป ไม่ใช่ข้อมูลสด)', 'ยอดจากแถวสุดท้ายของ Sheet (1 แถว = 1 รายการ ยังไม่ตัดรายการซ้ำ/ยกเลิก)', snapKs.map((k) => k + ' ' + (vr.rows[k] == null ? 'ไม่มีข้อมูลยืนยัน' + (k === SM && vr.studentMotoErr ? ' — อ่านสดไม่สำเร็จ: ' + why(vr.studentMotoErr) : '') : n(vr.rows[k]) + ' รายการ')).join(', '), dTh(vr.updated));
    if (sm) { add('ทะเบียนยานพาหนะ ' + SM + ' (อ่านสด)', dTh(sm.range.from) + ' – ' + dTh(sm.range.to), 'รายการลงทะเบียน ' + n(sm.registrations) + ' รายการ (1 RefCode = 1 รายการ · RefCode ซ้ำ ' + n(sm.duplicateRefs) + ' แถวนับครั้งเดียว · แถวไม่มี RefCode ' + n(sm.rowsWithoutRef) + ' แถวไม่นับ) · จำนวนรถตามที่กรอก ' + n(sm.vehiclesDeclared) + ' คัน (ไม่กรอก ' + n(sm.rowsNoCount) + ' รายการ) · ช่องทะเบียนรถที่กรอก ' + n(sm.platesFilled) + ' ช่อง (จำนวนรถไม่ตรงกับช่องทะเบียน ' + n(sm.rowsCountMismatch) + ' รายการ)', dTh(sm.checkedAt));
      add('ทะเบียนยานพาหนะ ' + SM + ' (อ่านสด)', 'แยกตามหมวด (หน่วย: รายการลงทะเบียน)', 'วิทยาเขต: ' + topObj(sm.byCampus, 8, 'รายการ') + ' · ประเภทเครื่องยนต์: ' + topObj(sm.byEngine, 8, 'รายการ') + ' · คณะ/ส่วนงาน (อันดับแรก): ' + topObj(sm.byFaculty, 6, 'รายการ'), dTh(sm.checkedAt)); }
    const tot = have.reduce((a, k) => a + vr.rows[k], 0);
    add('ทะเบียนยานพาหนะ', 'ยอดรวม (ตัวเลขเดียวกับหน้าเว็บ)', 'รวม ' + n(tot) + ' รายการ จาก ' + have.length + ' ประเภทที่มีข้อมูล (' + have.join(', ') + ')' + (have.length < ks.length ? ' — ไม่รวม ' + ks.filter((k) => vr.rows[k] == null).join(', ') + ' เพราะไม่มีข้อมูลยืนยัน' : '') + (sm ? ' · หมายเหตุ: ยอดรวมนี้ไม่ใช่ข้อมูลสดทั้งหมด — สดเฉพาะ ' + SM + ' (นับตาม RefCode) ส่วนประเภทอื่นเป็นยอดจากไฟล์สรุป ณ ' + dTh(vr.updated) + ' นับตามแถว จึงเป็นการรวมตัวเลขต่างเวลา/ต่างนิยาม ห้ามเรียกยอดรวมนี้ว่า “ข้อมูลสด”' : ''), sm ? dTh(sm.checkedAt) + ' (สด) / ' + dTh(vr.updated) + ' (ไฟล์สรุป)' : dTh(vr.updated)); }
  const oc = X.opsCheck;
  if (oc && use.has('ops')) { src.ops = 'ข้อมูลงานจราจรออนไลน์'; add('ทะเบียนของงานจราจร', 'ยอดล่าสุด', 'ลานจอดรถ ' + n(oc.parkingLots) + ' ลาน, ยานพาหนะของงาน ' + n(oc.vehicles.total) + ' คัน, อุปกรณ์ดับเพลิง ' + n(oc.fireEquipment.total) + ' ชิ้น (ไม่รวม AED)', dTh(oc.checkedAt)); }
  const rt = X.ruenthaiSurvey;
  if (rt && rt.total != null && use.has('ruenthai')) { src.ruenthai = 'แบบสำรวจลานจอดรถเรือนไทย'; const R = rt.live;
    if (R) { add('ลานจอดรถเรือนไทย (อ่านสด)', dTh(R.range.from) + ' – ' + dTh(R.range.to), 'แบบสำรวจที่ส่ง ' + n(R.surveys) + ' ฉบับ (1 Ref_Code = 1 ฉบับ · Ref_Code ซ้ำ ' + n(R.duplicateRefs) + ' แถวนับครั้งเดียว) · จำนวนรถตามที่กรอก (Car_Count) รวม ' + n(R.carsDeclared) + ' คัน — เป็นคนละหน่วยกับจำนวนแบบสำรวจ · ช่องประเภทรถที่กรอก ' + n(R.carTypesFilled) + ' ช่อง, ช่องทะเบียนที่กรอก ' + n(R.platesFilled) + ' ช่อง (Car_Count ไม่ตรงกับช่องที่กรอก ' + n(R.rowsCarMismatch) + ' ฉบับ) · ไม่มีจำนวนผู้มีสิทธิ์ตอบ จึงคิดอัตราตอบกลับไม่ได้ และไม่ใช่ยอดอนุมัติ', dTh(R.checkedAt));
      add('ลานจอดรถเรือนไทย (อ่านสด)', 'แยกตามหมวด (หน่วย: แบบสำรวจ ยกเว้นประเภทรถเป็นช่องที่กรอก)', 'กลุ่ม: ' + topObj(R.byGroup, 8, 'ฉบับ') + ' · ประเภทผู้ใช้: ' + topObj(R.bySubType, 8, 'ฉบับ') + ' · ประเภทรถ (นับช่องประเภทรถที่กรอก): ' + topObj(R.byCarType, 8, 'ช่อง') + ' · สถานะกล้อง LPR (บันทึกต่อแบบสำรวจ จึงนับเป็นฉบับ ไม่ใช่คัน): ' + topObj(R.byLpr, 8, 'ฉบับ') + ' · คณะ/ส่วนงาน (อันดับแรก): ' + topObj(R.byFaculty, 6, 'ฉบับ'), dTh(R.checkedAt)); }
    else add('ลานจอดรถเรือนไทย (ไฟล์สรุป ไม่ใช่ข้อมูลสด' + (rt.liveErr ? ' — อ่านสดไม่สำเร็จ: ' + why(rt.liveErr) : '') + ')', dTh(rt.from) + ' – ' + dTh(rt.to), 'แบบสำรวจที่ส่งเข้ามา ' + n(rt.total) + ' ฉบับ — ไม่ใช่จำนวนรถและไม่ใช่ยอดอนุมัติ · ไฟล์สรุปไม่มีจำนวนรถหรือการแยกกลุ่ม', dTh(rt.checkedAt)); }
  const others = Object.keys(TOPICS).filter((k) => !use.has(k));
  if (others.length) L.push('หัวข้ออื่นที่ระบบมีข้อมูล (ไม่ได้แนบมาในรอบนี้ — ถ้าผู้ใช้ถามถึง ให้บอกว่าถามเรื่องนั้นโดยตรงได้): ' + others.map((k) => ({ incidents: 'เหตุการณ์/อุบัติเหตุ', lostfound: 'Lost & Found', gate: 'รถเข้าและหมวกนิรภัย', cctv: 'คำขอดูกล้อง CCTV', anywheel: 'จักรยาน Anywheel', tram: 'รถราง', guard: 'ความพึงพอใจ รปภ.', vehicle: 'ทะเบียนยานพาหนะ', ops: 'ลานจอด/ยานพาหนะของงาน/อุปกรณ์ดับเพลิง', ruenthai: 'ลานจอดเรือนไทย' })[k]).join(', '));
  L.push('เมนูในเว็บนี้ที่แนะนำได้ (เขียนเป็น #รหัส เช่น #traffic หน้าเว็บจะทำเป็นลิงก์ให้): ' + NAV_HINTS.map((h) => h[0] + ' #' + h[1]).join(' · '));
  return { text: L.join('\n'), sources: Object.keys(src).map((k) => src[k]), topics: Object.keys(src), live: Object.keys(src).filter((k) => LI.topics && LI.topics[k]), snapshot: Object.keys(src).filter((k) => !(LI.topics && LI.topics[k])).map((k) => src[k]).concat(src.vehicle && LI.topics && LI.topics.vehicle ? ['ทะเบียนยานพาหนะ (บุคลากร และนักศึกษา–รถยนต์)'] : []), asOf: asOfSeen.length ? asOfSeen.slice(0, 4).join(' · ') : dTh(String((X.generatedAt || (stats && stats.generatedAt) || '')).slice(0, 16).replace('T', ' ')) };
}

// ตัวเลขในคำตอบต้องมาจากข้อเท็จจริง คำถาม/บทสนทนาก่อนหน้า หรือเป็นส่วนของวันที่/เวลา/ปี — นอกนั้นถือว่าโมเดลคิดเลขเอง/เดา แล้วไม่ส่งคำตอบนั้นออกไป
// ผ่อนจากรุ่นก่อน: วันที่ (“5 พ.ย.”, “วันที่ 5”), เวลา (“14:30 น.”), ปี พ.ศ./ค.ศ. ช่วงปีปัจจุบัน และร้อยละที่ปัดเป็นจำนวนเต็มจากค่าที่คำนวณไว้แล้ว
const MONTH_RX = '(?:' + TH.map((m) => m.replace(/\./g, '\\.')).join('|') + '|' + THF.join('|') + ')';
export function numbersOk(reply, factsText, question) {
  const norm = (s) => (String(s).match(/\d[\d,]*(?:\.\d+)?/g) || []).map((x) => x.replace(/,/g, '').replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, ''));
  const allowed = new Set(norm(factsText).concat(norm(question)));
  const near = norm(factsText).filter((x) => x.indexOf('.') > 0).map((x) => String(Math.round(+x)));             // ร้อยละ/ค่าเฉลี่ยที่ปัดเป็นจำนวนเต็ม
  near.forEach((x) => allowed.add(x));
  let body = String(reply).replace(/^\s*\d{1,2}[.)]\s/gm, '')                                                     // เลขลำดับหัวข้อ
    .replace(new RegExp('(?:วันที่\\s*)?\\b\\d{1,2}\\s*(?:-|–|ถึง)?\\s*(?:\\d{1,2}\\s*)?' + MONTH_RX, 'g'), ' ')       // วันที่ + ชื่อเดือน
    .replace(/วันที่\s*\d{1,2}\b/g, ' ').replace(/\b\d{1,2}[:.]\d{2}\s*น\./g, ' ').replace(/\b\d{1,2}[:.]\d{2}(?::\d{2})?\b/g, ' ')
    .replace(/\b(?:256\d|257\d|201[7-9]|202\d|203[0-2])\b/g, ' ')                                                                 // ปี พ.ศ./ค.ศ.
    .replace(/#[a-z0-9-]+/g, ' ');                                                                                 // ลิงก์เมนูภายใน
  return norm(body).every((x) => allowed.has(x));
}
