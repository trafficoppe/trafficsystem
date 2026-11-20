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
  if (!live) return L; const e = live.errors || {}; L.errors = Object.assign({}, e); L.stale = Object.assign({}, live.stale || {});      // รอบ 14: ส่วนที่ใช้ผลอ่านสำเร็จล่าสุด (ไม่สด)
  const RD = live.sourceReadAt || {}, PART = { incidents: 'incidents', lostfound: 'lostfoundYear', gate: 'gate' };     // รอบ 13: เวลาอ่านต้นทางจริงของแต่ละหัวข้อ (ไม่ใช่เวลาตอบคำขอ checkedAt)
  ['incidents', 'lostfound', 'gate'].forEach((k) => { if (live[k] && M[k]) { Object.assign(M[k], live[k]); L.topics[k] = RD[PART[k]] || live[k].readAt || ''; } });
  ['incidentsDaily', 'lostfoundDaily'].forEach((k) => { if (live[k]) X[k] = Object.assign(X[k] || {}, live[k]); });
  if (live.lostfoundStatus && X.lostfoundStatus) Object.assign(X.lostfoundStatus, live.lostfoundStatus);
  if (live.anywheel) { X.anywheel = Object.assign({}, X.anywheel || {}, live.anywheel); if (RD.anywheel) L.topics.anywheel = RD.anywheel; }      // รอบ 14.3: Anywheel จากต้นทาง (สด หรือผลอ่านสำเร็จล่าสุด) แทนไฟล์สรุป
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
  if (errK.length) L.push('หมายเหตุแหล่งข้อมูล: รอบนี้อ่านสดไม่สำเร็จสำหรับ ' + errK.map((k) => ({ incidents: 'เหตุการณ์', lostfound: 'Lost & Found รายวัน', lostfoundYear: 'Lost & Found รายปี', gate: 'รถเข้า/หมวกนิรภัย' })[k] + ' (' + why(LI.errors[k]) + ')' + (LI.stale && LI.stale[k] ? ' — ใช้ผลที่อ่านสำเร็จล่าสุดเมื่อ ' + dTh(LI.stale[k].at) : ' — ใช้ไฟล์สรุป')).join(', ') + ' — ตัวเลขหัวข้อนั้นเป็นผลที่อ่านสำเร็จล่าสุดหรือไฟล์สรุปตามวันที่ที่ระบุ ไม่ใช่ข้อมูลสดของรอบนี้ ต้องบอกผู้ใช้ตามนั้น');
  const inc = M.incidents, incD = X.incidentsDaily;
  if (inc && inc.monthly && use.has('incidents')) {
    const incRead = LI.topics && LI.topics.incidents ? LI.topics.incidents : incD && incD.complete === true ? incD.checkedAt : '', asOf = dTh(incRead || inc.updated); src.incidents = 'รายงานเหตุการณ์ (ฐานข้อมูลงานจราจร)';
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
      add('เหตุการณ์และอุบัติเหตุ', 'วันนี้ ' + dTh(today), 'บันทึกแล้ว ' + n(sum(d, (r) => r.count)) + ' เหตุการณ์' + (Object.keys(byT).length ? ' (' + Object.keys(byT).map((k) => k + ' ' + n(byT[k])).join(', ') + ')' : '') + ' · ผู้บาดเจ็บ/ผู้ป่วย ' + n(sum(d, (r) => r.injured)) + ' คน · เมื่อวาน ' + n(sum(y, (r) => r.count)) + ' เหตุการณ์ (รายการอาจบันทึกย้อนหลัง)', dTh(incRead || incD.checkedAt));
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
  if (aw && aw.monthly && use.has('anywheel')) {      // รอบ 14.3: ตัวเลขคิดด้วยโค้ด (รวมทศนิยมก่อนปัด) · แยกเวลาอ่านต้นทางออกจากวันที่ข้อมูลล่าสุด
    src.anywheel = 'จักรยาน Anywheel'; const awAt = dTh(LI.topics && LI.topics.anywheel ? LI.topics.anywheel : aw.readAt || aw.checkedAt || aw.updated), km = (v) => n(Math.round(v || 0));      // awAt = เวลาอ่านต้นทาง (สด) หรือเวลาทำไฟล์สรุป — ไม่ใช่วันที่ข้อมูลล่าสุด
    const awFocus = question != null && picked.length <= 3, awM = aw.monthly.slice(awFocus ? -12 : -3);      // ถามเรื่อง Anywheel โดยตรง → 12 เดือน · คำถามกว้าง → 3 เดือนล่าสุด (คุมความยาว)
    awM.forEach((r) => add('จักรยาน Anywheel', mTh(r.month), n(r.trips) + ' ครั้ง, ' + km(r.km) + ' กม.' + (r.days ? ', ' + r.days + (r.daysInMonth && r.days < r.daysInMonth ? '/' + r.daysInMonth : '') + ' วัน (เฉลี่ย ' + n(Math.round(r.trips / r.days)) + '/วันที่มีข้อมูล)' : '') + (r.minutes == null ? '' : ', ' + n(Math.round(r.minutes)) + ' นาที'), awAt));
    [...new Set((awFocus ? aw.monthly : awM).map((r) => r.month.slice(0, 4)))].forEach((y) => { const rr = aw.monthly.filter((r) => r.month.slice(0, 4) === y); add('จักรยาน Anywheel', 'ปีปฏิทิน พ.ศ. ' + (+y + 543) + ' (เฉพาะ ' + mTh(rr[0].month) + ' – ' + mTh(rr[rr.length - 1].month) + ')', 'รวม ' + n(sum(rr, (r) => r.trips)) + ' ครั้ง, ระยะทาง ' + km(sum(rr, (r) => r.km)) + ' กม.', awAt); });
    add('จักรยาน Anywheel', 'วันที่ข้อมูลล่าสุดในต้นทาง', aw.lastDate ? dTh(aw.lastDate) + ' (เดือนที่ไม่มีแถว = ยังไม่มีข้อมูล ห้ามใช้ยอดเดือนอื่นแทน · ไม่ระบุนาที = ต้นทางไม่มีข้อมูลเวลาใช้งาน)' : 'เดือน ' + mTh(aw.lastMonth || aw.monthly[aw.monthly.length - 1].month), awAt); }
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
  // รอบ 14·P2: หัวข้อที่มีเฉพาะไฟล์สรุปรายเดือน — ถ้าไม่มีเดือนปัจจุบัน บอกชัดว่ายังไม่มี (กันโมเดลเดา/ใช้เดือนอื่นแทน)
  [['cctv', c && c.monthly, 'คำขอดูกล้อง CCTV (ส่วนกลาง)', c && c.updated], ['anywheel', aw && aw.monthly, 'จักรยาน Anywheel', aw && (LI.topics && LI.topics.anywheel || aw.readAt || aw.checkedAt), aw && !aw.snapshot], ['tram', tr && tr.monthly, 'รถรางบริการพิเศษ', tr && tr.updated]].forEach((x) => {
    if (!use.has(x[0]) || !x[1] || !x[1].length || x[1].some((r) => r.month === curM)) return;
    add(x[2], 'เดือนนี้ ' + mTh(curM), 'ยังไม่มีข้อมูลของเดือนนี้' + (x[4] ? 'ในต้นทาง' : 'ในไฟล์สรุป') + ' — เดือนล่าสุดที่มีคือ ' + mTh(x[1][x[1].length - 1].month) + ' (ห้ามนำเดือนอื่นมาตอบเป็นเดือนนี้)', dTh(x[3])); });
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

// ================= รอบ 14 · P2: ผู้ช่วย AI เลือกข้อมูลก่อนเรียกโมเดล · หลักฐาน/ความสด · ปุ่มดูต่อ · สรุปช่วงที่กำลังดู =================
// หัวข้อ → ส่วนของสถิติสดที่ต้องอ่าน (ส่วนอื่นใช้ไฟล์สรุปที่แนบกับเว็บ ไม่ต้องอ่านต้นทาง) · ผู้ใช้/โมเดลเลือก SQL/URL/Sheet เองไม่ได้
export const TOPIC_PARTS = { incidents: ['incidents'], lostfound: ['lostfound', 'lostfoundYear'], gate: ['gate'], vehicle: ['studentMoto'], ruenthai: ['ruenthai'], anywheel: ['anywheel'] };
export function partsFor(topics) { const s = new Set(); topics.forEach((t) => (TOPIC_PARTS[t] || []).forEach((p) => s.add(p))); return [...s]; }
export function topicsForChat(q, recentUser) { const t = topicsOf(String(q || '') + ' ' + String(recentUser || '')); return t.length ? t : CORE.slice(); }
// คำทักทาย/ขอบคุณ/ถามเมนู ที่ไม่มีหัวข้อและไม่มีตัวเลข → ตอบจากโค้ด ไม่อ่านแหล่ง ไม่เรียกโมเดล
const GREET_RX = /^(?:สวัสดี|หวัดดี|ดีครับ|ดีค่ะ|ดีจ้า|ดีคับ|hello|hi\b|hey\b|ขอบคุณ|ขอบใจ|thank|thx|โอเค|ok\b|ได้เลย|เยี่ยม)/i;
const HELP_RX = /(?:ทำอะไรได้|ช่วยอะไรได้|ถามอะไรได้|มีอะไรให้ถาม|มีเมนูอะไร|ใช้งานยังไง|ใช้ยังไง|วิธีใช้|เริ่มยังไง|help)/i;
export function cannedKind(q) {
  const t = String(q || '').trim(); if (!t || t.length > 80 || /\d/.test(t) || topicsOf(t).length) return '';
  return HELP_RX.test(t) ? 'help' : GREET_RX.test(t) ? (/ขอบ|thank|thx/i.test(t) ? 'thanks' : 'greet') : '';
}
export function cannedReply(kind) {
  const what = 'ถามสถิติได้ เช่น เหตุการณ์/อุบัติเหตุ, Lost & Found, รถเข้าและผู้ไม่สวมหมวกนิรภัย, ทะเบียนยานพาหนะ, ลานจอดเรือนไทย, คำขอดูกล้อง, รถรางและ Anywheel — ระบุเดือนได้ เช่น “อุบัติเหตุเดือนตุลาคมเทียบกันยายน” หรือกด “สรุปช่วงที่กำลังดู”';
  if (kind === 'thanks') return 'ยินดีครับ ถ้าต้องการดูต่อ ถามหัวข้อใหม่หรือกดปุ่มด้านล่างได้เลย';
  if (kind === 'help') return 'ผมช่วยสรุปตัวเลขจากระบบงานจราจรและความปลอดภัย และพาไปหน้ารายละเอียดได้ครับ · ' + what;
  return 'สวัสดีครับ ' + what;
}
// ปุ่ม “ดูต่อ” (หน้าเว็บสร้างลิงก์เองจากรายการนี้ — รับเฉพาะรหัสหน้าในรายการ และช่วงวันที่ YYYY-MM-DD เท่านั้น)
export const ACTION_ROUTES = { incidents: [['traffic', 'ดูรายการเหตุการณ์'], ['accident-map', 'แผนที่จุดเกิดเหตุ']], lostfound: [['lostfound', 'ดู Lost & Found']], gate: [['gate', 'ดูรถเข้าและหมวกนิรภัย']], cctv: [['cctv', 'ดูคำขอกล้องวงจรปิด']],
  anywheel: [['tram', 'ดูรถรางและ Anywheel']], tram: [['tram', 'ดูรถรางและ Anywheel']], guard: [['report-guard', 'ดูผลประเมิน รปภ.']], vehicle: [['vehicle', 'ดูทะเบียนยานพาหนะ']], ops: [['safety', 'ดูอุปกรณ์ดับเพลิง'], ['vehicle-fleet', 'ดูยานพาหนะของงาน']], ruenthai: [['parking', 'ดูข้อมูลการจอดรถ']] };
const lastDay = (m) => { const y = +m.slice(0, 4), k = +m.slice(5, 7); return m + '-' + String(new Date(Date.UTC(y, k, 0)).getUTCDate()).padStart(2, '0'); };
// เดือนที่คำถามระบุ (เดือนนี้/เดือนก่อน/ชื่อเดือน [+ปี]) — ใช้ทำปุ่มกรองช่วง ไม่ใช้คำนวณตัวเลข
export function monthOfQuestion(q, nowMs) {
  const t = String(q || ''), today = new Date((nowMs || Date.now()) + 7 * 3600000).toISOString().slice(0, 10), curM = today.slice(0, 7);
  if (/เดือนนี้/.test(t)) return curM; if (/เดือน(?:ก่อน|ที่แล้ว)/.test(t)) return prevMonth(curM);
  for (let i = 0; i < 12; i++) { const rx = new RegExp('(?:' + THF[i] + '|' + TH[i].replace(/\./g, '\\.') + ')\\s*(\\d{4})?'); const m = rx.exec(t);
    if (m) { let y = m[1] ? +m[1] : +curM.slice(0, 4); if (y > 2400) y -= 543; const mm = y + '-' + String(i + 1).padStart(2, '0'); return mm > curM && !m[1] ? (y - 1) + '-' + String(i + 1).padStart(2, '0') : mm; } }
  return '';
}
export function actionsFor(topics, q, ctx, nowMs) {
  const m = monthOfQuestion(q, nowMs), from = m ? m + '-01' : ctx && isMonth(ctx.from) ? ctx.from + '-01' : '', to = m ? lastDay(m) : ctx && isMonth(ctx.to) ? lastDay(ctx.to) : '', out = [], seen = {};
  topics.forEach((t) => (ACTION_ROUTES[t] || []).forEach((a) => { if (seen[a[0]]) return; seen[a[0]] = 1; const o = { route: a[0], label: a[1] }; if (a[0] === 'traffic' && from && to) { o.from = from; o.to = to; o.label += ' ' + (from.slice(0, 7) === to.slice(0, 7) ? mTh(from.slice(0, 7)) : mTh(from.slice(0, 7)) + ' – ' + mTh(to.slice(0, 7))); } out.push(o); }));
  return out.slice(0, 4);
}
// หลักฐาน/ความสดรายหัวข้อ — คำเดียวกับป้ายสถานะบนหน้าเว็บ: live = ข้อมูลสด (อ่านจากต้นทางเมื่อ …) · stale = ผลที่อ่านสำเร็จล่าสุด (รอบล่าสุดอ่านไม่สำเร็จ) · snapshot = ไฟล์สรุป (ข้อมูลถึง …)
const EV_NAME = { incidents: 'รายงานเหตุการณ์', lostfound: 'Lost & Found', gate: 'รถเข้าและหมวกนิรภัย', cctv: 'คำขอดูกล้อง CCTV', anywheel: 'จักรยาน Anywheel', tram: 'รถรางบริการพิเศษ', guard: 'ความพึงพอใจ รปภ.', vehicle: 'ทะเบียนยานพาหนะ', ops: 'ทะเบียนของงานจราจร', ruenthai: 'ลานจอดเรือนไทย' };
const EV_PART = { incidents: 'incidents', lostfound: 'lostfoundYear', gate: 'gate', vehicle: 'studentMoto', ruenthai: 'ruenthai', anywheel: 'anywheel' };
export function evidenceFor(topics, stats, extra, liveInfo) {
  const M = (stats && stats.modules) || {}, X = extra || {}, LI = liveInfo || { topics: {}, errors: {} }, d = (s) => (s ? dTh(String(s).slice(0, 16).replace('T', ' ')) : '');
  const snapAt = { incidents: M.incidents && M.incidents.updated, lostfound: M.lostfound && M.lostfound.updated, gate: M.gate && M.gate.updated, cctv: M.cctv && M.cctv.updated, anywheel: X.anywheel && X.anywheel.updated, tram: X.tram && X.tram.updated,
    guard: M.guardSatisfaction && M.guardSatisfaction.central && M.guardSatisfaction.central.updated, vehicle: M.vehicleRegistration && M.vehicleRegistration.updated, ops: X.opsCheck && X.opsCheck.checkedAt, ruenthai: X.ruenthaiSurvey && (X.ruenthaiSurvey.updated || X.ruenthaiSurvey.checkedAt) };
  return topics.map((t) => { const p = EV_PART[t], st = p && LI.stale && LI.stale[p];
    if (st) return { topic: t, name: EV_NAME[t], freshness: 'stale', at: d(st.at), text: 'ผลที่อ่านสำเร็จล่าสุดเมื่อ ' + d(st.at) + ' · รอบล่าสุดอ่านไม่สำเร็จ' };
    if (LI.topics && LI.topics[t]) return { topic: t, name: EV_NAME[t], freshness: 'live', at: d(LI.topics[t]), text: 'ข้อมูลสด · อ่านจากต้นทางเมื่อ ' + d(LI.topics[t]) + (t === 'vehicle' ? ' (เฉพาะนักศึกษา–รถจักรยานยนต์ ประเภทอื่นเป็นไฟล์สรุป)' : '') };
    return { topic: t, name: EV_NAME[t], freshness: 'snapshot', at: d(snapAt[t]), text: 'ไฟล์สรุป' + (snapAt[t] ? ' (ข้อมูลถึง ' + d(snapAt[t]) + ')' : '') + (p && LI.errors && (LI.errors[p] || (t === 'lostfound' && LI.errors.lostfound)) ? ' — รอบนี้อ่านต้นทางไม่สำเร็จ' : '') }; });
}
// ตัวเลขที่ผู้ใช้ “อ้าง” ในคำถาม (เลข + หน่วยนับ) ไม่ถือเป็นหลักฐาน — คำตอบใช้เลขนั้นได้เฉพาะเมื่อกำลังแก้ว่าไม่ถูกต้อง
const CLAIM_RX = /(\d[\d,]*(?:\.\d+)?)\s*(?:เหตุการณ์|เหตุ|ราย|รายการ|คัน|ครั้ง|คน|ฉบับ|ชิ้น|คำขอ|%|เปอร์เซ็นต์)/g;
export function claimNumbers(q) { const o = []; let m; CLAIM_RX.lastIndex = 0; while ((m = CLAIM_RX.exec(String(q || '')))) o.push(m[1].replace(/,/g, '')); return o; }
export function numbersOkP14(reply, factsText, question) {
  const claims = claimNumbers(question); let qn = String(question || '');
  if (claims.length && !/ไม่ใช่|ไม่ถูก|ไม่ตรง|คลาดเคลื่อน|แก้ไข/.test(String(reply))) claims.forEach((c) => { qn = qn.replace(new RegExp('\\b' + c.replace('.', '\\.') + '\\b', 'g'), ' '); });
  return numbersOk(reply, factsText, qn);
}
// ปุ่ม “สรุปช่วงที่กำลังดู”: 3–5 ประเด็น คำนวณด้วยโค้ดทั้งหมด (ไม่เรียกโมเดล → ไม่ใช้โควตา และตรวจย้อนได้ทุกตัวเลข)
export function summarize(stats, extra, ctx, nowMs, liveInfo) {
  const M = (stats && stats.modules) || {}, X = extra || {}, today = new Date((nowMs || Date.now()) + 7 * 3600000).toISOString().slice(0, 10), curM = today.slice(0, 7);
  const from = ctx && isMonth(ctx.from) ? ctx.from : curM, to = ctx && isMonth(ctx.to) ? ctx.to : from, inR = (m) => m >= from && m <= to;
  const label = from === to ? mTh(from) : mTh(from) + ' – ' + mTh(to), span = (+to.slice(0, 4) * 12 + +to.slice(5, 7)) - (+from.slice(0, 4) * 12 + +from.slice(5, 7)) + 1;
  const shift = (m, k) => { const t = +m.slice(0, 4) * 12 + +m.slice(5, 7) - 1 - k; return Math.floor(t / 12) + '-' + String(t % 12 + 1).padStart(2, '0'); };
  const pFrom = shift(from, span), pTo = shift(to, span), inP = (m) => m >= pFrom && m <= pTo, pLabel = pFrom === pTo ? mTh(pFrom) : mTh(pFrom) + ' – ' + mTh(pTo), partial = to >= curM ? ' (เดือนปัจจุบันยังไม่ครบเดือน)' : '';
  const pts = [], tot = (r) => Object.keys(r.byType || {}).reduce((a, k) => a + r.byType[k], 0);
  const inc = M.incidents;
  if (inc && inc.monthly) { const rr = inc.monthly.filter((r) => inR(r.month)), pp = inc.monthly.filter((r) => inP(r.month)), byT = {};
    rr.forEach((r) => Object.keys(r.byType).forEach((k) => { byT[k] = (byT[k] || 0) + r.byType[k]; }));
    const all = sum(rr, tot), acc = Object.keys(byT).filter((k) => /อุบัติเหตุ/.test(k)).reduce((a, k) => a + byT[k], 0), top = Object.keys(byT).sort((a, b) => byT[b] - byT[a] || (a < b ? -1 : 1)).slice(0, 3);
    if (rr.length) { pts.push({ topic: 'incidents', text: 'เหตุการณ์ ' + label + partial + ': รวม ' + n(all) + ' เหตุการณ์ (อุบัติเหตุ ' + n(acc) + ')' + (pp.length === span ? ' · เทียบ ' + pLabel + ' ' + delta(all, sum(pp, tot)) : ' · ไม่มีข้อมูลช่วงก่อนหน้าครบสำหรับเทียบ') });
      if (top.length) pts.push({ topic: 'incidents', text: 'ประเภทที่พบมากสุด: ' + top.map((k, i) => (i + 1) + '. ' + k + ' (' + n(byT[k]) + ')').join(' · ') }); }
    else pts.push({ topic: 'incidents', text: 'เหตุการณ์ ' + label + ': ยังไม่มีข้อมูลในช่วงนี้' }); }
  const lf = M.lostfound;
  if (lf && lf.monthly) { const rr = lf.monthly.filter((r) => inR(r.month)), g = (k) => sum(rr, (r) => r.byType[k]);
    if (rr.length) pts.push({ topic: 'lostfound', text: 'Lost & Found ' + label + ': แจ้งของหาย ' + n(g('สิ่งของสูญหาย')) + ' · เก็บของได้ ' + n(g('พบสิ่งของ')) + ' · แบบฟอร์มรับของคืน ' + n(g('รับของคืน')) + ' ฉบับ' }); }
  const gt = M.gate;
  if (gt && gt.monthly) { const rr = gt.monthly.filter((r) => inR(r.month)), pp = gt.monthly.filter((r) => inP(r.month));
    if (rr.length) { const days = sum(rr, (r) => r.days), nh = sum(rr, (r) => r.noHelmet), pd = sum(pp, (r) => r.days), pnh = sum(pp, (r) => r.noHelmet);
      pts.push({ topic: 'gate', text: 'รถเข้า ' + label + ' (' + n(days) + ' วันที่มีข้อมูล): รถยนต์ ' + n(sum(rr, (r) => r.cars)) + ' · จักรยานยนต์ ' + n(sum(rr, (r) => r.motorcycles)) + ' · ไม่สวมหมวก ' + n(nh) + ' ราย (เฉลี่ย ' + n(Math.round(nh / Math.max(1, days))) + '/วัน'
        + (pp.length && pd ? ' เทียบ ' + pLabel + ' ' + n(Math.round(pnh / pd)) + '/วัน' : '') + ')' }); } }
  const aw = X.anywheel;      // รอบ 14.3
  if (aw && aw.monthly && aw.monthly.length) { const rr = aw.monthly.filter((r) => inR(r.month)), last = aw.monthly[aw.monthly.length - 1];
    pts.push({ topic: 'anywheel', text: rr.length ? 'Anywheel ' + label + (rr.length < span ? ' (มีข้อมูลเฉพาะ ' + rr.map((r) => mTh(r.month)).join(', ') + ')' : '') + ': ใช้งาน ' + n(sum(rr, (r) => r.trips)) + ' ครั้ง · ระยะทาง ' + n(Math.round(sum(rr, (r) => r.km))) + ' กม.' : 'Anywheel ' + label + ': ยังไม่มีข้อมูลในต้นทาง — ข้อมูลล่าสุดคือ ' + mTh(last.month) + ' (' + n(last.trips) + ' ครั้ง)' }); }
  const ev = evidenceFor([...new Set(pts.map((p) => p.topic))], stats, extra, liveInfo);
  return { label, points: pts.slice(0, 5), evidence: ev };
}
