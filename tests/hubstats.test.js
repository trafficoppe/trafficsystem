// ทดสอบฟังก์ชันคำนวณของ HubStats.gs ด้วย "ข้อมูลสมมติ" เท่านั้น (ไม่มีข้อมูลจริง)  รัน: node tests/hubstats.test.js
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '../apps-script/HubStats.gs'), 'utf8');
const m = { exports: {} }; vm.runInNewContext(src, { module: m, Intl, Date, console, isFinite, isNaN });
const S = m.exports, TZ = 'Asia/Bangkok';
// เวลา 23:30 UTC ของ 31 ต.ค. = 06:30 ของ 1 พ.ย. ตามเวลาไทย → ต้องนับเป็นเดือน พ.ย.
const H = ['วันเวลาที่บันทึก','ชื่อผู้รายงาน','x','x','x','x','x','x','วันที่เกิดเหตุ','x','x','x','สถานที่เกิดเหตุ','พิกัด (Lat, Lng)','ประเภทเหตุการณ์','x','x','x','x','x','x','x','จำนวนคนเจ็บ/ป่วย','รายละเอียดผู้บาดเจ็บ/ป่วยทั้งหมด'];
const row = (rec, d, place, xy, type, inj) => { const r = new Array(H.length).fill(''); r[0]=rec; r[1]='ชื่อสมมติ ห้ามหลุด'; r[8]=d; r[12]=place; r[13]=xy; r[14]=type; r[22]=inj; r[23]='ชื่อ: สมมติ นามสมมติ'; return r; };
const inc = [H,
  row(new Date('2026-10-31T23:30:00Z'), new Date('2026-10-31T23:30:00Z'), 'จุด A', '13.7950, 100.3200', 'อุบัติเหตุจากยานพาหนะ', 2),
  row(new Date('2026-10-05T03:00:00Z'), '2026-10-05', 'จุด B', '13.7900,100.3250', 'อุบัติเหตุทั่วไป', '1'),
  row(new Date('2026-10-06T03:00:00Z'), '06/10/2569', 'จุด C', '13.7900,100.3250', 'รับส่งผู้ป่วย', 1),
  row(new Date('2026-10-07T03:00:00Z'), '2026-10-07', 'จุด D', '-', 'อุบัติเหตุจากยานพาหนะ', ''),
  row('', '', '', '', '', '')];
const a = S.incidentStats(inc, TZ);
assert.strictEqual(a.total, 4); assert.strictEqual(a.injuredTotal, 4);
assert.deepStrictEqual(JSON.parse(JSON.stringify(a.monthly)), [{month:'2026-10',byType:{'อุบัติเหตุทั่วไป':1,'รับส่งผู้ป่วย':1,'อุบัติเหตุจากยานพาหนะ':1}},{month:'2026-11',byType:{'อุบัติเหตุจากยานพาหนะ':1}}]);
assert.strictEqual(a.updated, '2026-11-01 06:30');
const p = S.accidentPoints(inc, TZ, S.HUB.CAMPUS_BOX);
assert.strictEqual(p.points.length, 2, 'เฉพาะอุบัติเหตุที่มีพิกัด ไม่รวมรับส่งผู้ป่วย');
assert.ok(!JSON.stringify([a, p]).includes('สมมติ'), 'ต้องไม่มีชื่อบุคคลในผลลัพธ์');
const g = S.gateStats([['h'], ['2026-09-16', new Date('2026-09-17T01:00:00Z'), 50,50,50,50,50, 50,50,50,50,50, 50,505,50,50,50],
  ['2026-10-01', new Date('2026-10-02T01:00:00Z'), 1,2,3,4,5, 1,1,1,1,1, 0,1,0,0,0], ['2026-10-01', new Date('2026-10-02T02:00:00Z'), 10,0,0,0,0, 0,0,0,0,0, 0,0,0,0,0],
  ['2026-11-02', new Date('2026-11-03T01:00:00Z'), '1,000',0,0,0,0, 2,0,0,0,0, 3,0,0,0,0]], TZ, '2026-10-01');
assert.strictEqual(g.days, 2); assert.deepStrictEqual(JSON.parse(JSON.stringify(g.totals)), {cars:1025,motorcycles:7,noHelmet:4}); assert.strictEqual(g.status, 'warn');
const l = S.lostFoundStats([['วันที่บันทึก','ปี พ.ศ.','ประเภท','เลขอ้างอิง','สถานะ'], ['2026-11-14',2569,'สิ่งของสูญหาย','LOS-1','รับของคืนแล้ว'], ['2026-11-13',2569,'พบสิ่งของ','FND-1',''], ['2026-10-01',2569,'','X-1','รับของคืนแล้ว'], ['', '', '', '', '']], TZ);
assert.strictEqual(l.total, 3); assert.strictEqual(l.returned, 2); assert.strictEqual(l.updated, '2026-11-14');
const c = S.cctvStats([['refCode','timestamp','requesterType','fname','status','พบภาพ/ไม่พบภาพ'], ['C-1','2026-10-31T18:00:00.000Z','นักศึกษา','ชื่อสมมติ','ปิดเคส','พบ'], ['C-2','2026-11-11T13:10:52.950Z','บุคลากร','ชื่อสมมติ','','']]);
assert.deepStrictEqual(JSON.parse(JSON.stringify(c.monthly)), [{month:'2026-11',count:2}], '18:00 UTC ของ 31 ต.ค. = 1 พ.ย. เวลาไทย');
assert.ok(!JSON.stringify(c).includes('สมมติ'));
assert.strictEqual(S.dayKey('13/11/2569 14:26:14', TZ), '2026-11-13');
console.log('HubStats: ผ่านทั้งหมด (ข้อมูลสมมติ)');
