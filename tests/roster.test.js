/* ตรวจว่ากติกาตารางเวรใน assets/hub.js + data/extra.json ให้ผลตรงกับไฟล์ Excel (ค่าที่ Excel คำนวณไว้ในชีตใช้งาน ม.ค. 2569)
 * และตรวจยอดรวมแผนกำลังพล รปภ. — ใช้: node tests/roster.test.js */
const fs = require('fs'), path = require('path'), assert = require('assert');
const root = path.join(__dirname, '..');
const extra = JSON.parse(fs.readFileSync(path.join(root, 'data/extra.json'), 'utf8'));
const js = fs.readFileSync(path.join(root, 'assets/hub.js'), 'utf8');
const grab = name => { const m = js.match(new RegExp('function ' + name + '\\([^)]*\\) \\{[^\\n]*\\}')); assert(m, 'missing ' + name); return m[0]; };
const { excelSerial, rosterCodes } = new Function(grab('excelSerial') + '\n' + grab('rosterCodes') + '\nreturn { excelSerial, rosterCodes };')();
const ro = extra.roster;
assert.strictEqual(excelSerial(2026, 1, 1), 46023);                       // 1 ม.ค. 2569 ใน Excel
// ค่าจากไฟล์ (เข้า–ออก ของผลัด 1–4): 1 ม.ค. = 15–23 | 23–07 | พักกะ | 07–15
const expected = { '2026-01-01': 'ANRM', '2026-01-02': 'MANR', '2026-01-03': 'MANR', '2026-01-04': 'RMAN', '2026-01-05': 'RMAN', '2026-01-06': 'NRMA', '2026-01-07': 'NRMA', '2026-01-08': 'ANRM', '2026-01-09': 'ANRM', '2026-01-10': 'MANR', '2025-12-31': 'ANRM' };
Object.keys(expected).forEach(d => { const [y, m, dd] = d.split('-').map(Number); assert.strictEqual(rosterCodes(ro, y, m, dd), expected[d], d); });
// ทุกวันใน 2 ปี: มีเช้า/บ่าย/ดึก/พักกะ ครบ ผลัดละหนึ่งอย่าง และแต่ละผลัดวนครบรอบทุก 8 วัน
for (let t = Date.UTC(2026, 0, 1); t < Date.UTC(2028, 0, 1); t += 86400000) {
  const d = new Date(t), c = rosterCodes(ro, d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  assert.strictEqual(c.split('').sort().join(''), 'AMNR');
  const n = new Date(t + 8 * 86400000); assert.strictEqual(rosterCodes(ro, n.getUTCFullYear(), n.getUTCMonth() + 1, n.getUTCDate()), c);
}
assert.deepStrictEqual(ro.shifts.N, { name: 'ดึก', start: '23:00', end: '07:00' });
assert.strictEqual(JSON.stringify(extra).match(/นาย|นาง|น\.ส\./g), null, 'ต้องไม่มีคำนำหน้าชื่อบุคคลใน data/extra.json');
const gm = extra.guardManpower;
assert.deepStrictEqual(gm.totals, { day: 83, night: 55 });
gm.areas.forEach(a => { assert.strictEqual(a.day.reduce((s, r) => s + r[1], 0), a.dayGuards); assert.strictEqual(a.night.reduce((s, r) => s + r[1], 0), a.nightGuards); });
console.log('roster.test.js: ผ่านทั้งหมด');
