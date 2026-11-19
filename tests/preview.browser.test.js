// tests/preview.browser.test.js — ตรวจ Preview ด้วย Chrome (headless) · รอบ 7
// วิธีใช้: python3 tools/serve_preview.py  (หรือ python3 -m http.server 8765 --bind 127.0.0.1 ที่โฟลเดอร์หลัก) แล้ว  node tests/preview.browser.test.js http://127.0.0.1:8765
// ข้อจำกัด: เครื่องทดสอบออกอินเทอร์เน็ตไม่ได้ — ทุกอย่างที่มาจากภายนอกในไฟล์นี้เป็น MOCK (ข้อที่ขึ้นต้น [MOCK …]):
//   ไทล์แผนที่, คำตอบ gviz ของ Sheet “ข้อมูลงานจราจรออนไลน์”, บริการข้อมูลภายใน, บริการบันทึกแบบฟอร์ม, ผู้ช่วย AI, API/รูป Lost & Found
//   ข้อมูล MOCK สร้างตามโครงสร้างคอลัมน์และจำนวนรายการที่ตรวจจากต้นทางจริงเมื่อ 15 พ.ย. 2569 แต่เนื้อหาเป็นของสมมติ
// ไฟล์นี้ไม่ส่งข้อมูลใดไปยังระบบจริง
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/npm-tools/node_modules/playwright'); }
const { chromium } = pw; const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), BASE = process.argv[2] || 'http://127.0.0.1:8765', URL0 = BASE + '/dist/preview.html';
const OUT = process.env.SHOTS || path.join(require('os').tmpdir(), 'hub-preview-shots'); fs.mkdirSync(OUT, { recursive: true });
const PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mPcvn37fwAHMwLZ0fVh0gAAAABJRU5ErkJggg==', 'base64');
const STATS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/stats.json'), 'utf8')).modules, GOCT = STATS.gate.monthly.filter(r => r.month === '2026-10')[0], GNOV = STATS.gate.monthly.filter(r => r.month === '2026-11')[0];
const results = []; let fails = 0;
const ok = (name, cond, info) => { results.push((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined && info !== '' ? ' — ' + info : '')); if (!cond) fails++; };
const BKK = (ymd, hm) => new Date(ymd + 'T' + (hm || '12:00') + ':00+07:00').getTime();

// ---------- MOCK ของ gviz ----------
const DID = n => 'MOCKFILEID' + String(n).padStart(20, '0');
const FIRE_KINDS = [['ชุด PPE สีดำ', 2], ['ชุด PPE สีเหลือง', 2], ['ตู้เก็บอุปกรณ์ดับเพลิง', 1], ['ถังดับเพลิง IMPACT Fast-Tech ขนาด 10 ปอนด์', 2], ['ถังดับเพลิงFireAde', 10], ['ถังดับเพลิงชนิดCo2', 15], ['ถังดับเพลิงชนิดเคมีแห้ง', 7], ['สายส่งน้ำดับเพลิง', 6], ['หัวฉีดด้ามปืน', 3], ['หัวฉีดลำตรง', 1], ['หัวรับน้ำดับเพลิง', 1]];
function gvTable(gid) {
  const S = v => ({ v }), N = v => ({ v, f: String(v) }), rows = [];
  if (gid === '147145093') { [['รถจักรยานยนต์', 6], ['รถจักรยานไฟฟ้า', 5], ['รถกอล์ฟ', 3]].forEach(([t, n]) => { for (let i = 1; i <= n; i++) { const id = rows.length + 1; rows.push([N(id), S(t), S('รุ่นสมมติ ' + id + ' (MOCK)'), S('แดง'), S('MOCK-' + id), S('ครุภัณฑ์-' + id), S(id === 2 ? '' : id === 3 ? 'https://drive.google.com/file/d/' + DID(999) + '/view' : 'https://github.com/user-attachments/assets/mock-' + id), null, null, N(2568), S('บริษัทสมมติ')]); } }); return { n: 11, rows }; }
  if (gid === '25594122') { FIRE_KINDS.forEach(([k, n]) => { for (let i = 1; i <= n; i++) { const id = rows.length + 1; rows.push([N(id), S('อุปกรณ์ดับเพลิง'), S(k), S('10 ปอนด์'), S('อาคารสมมติ ' + id + ' (MOCK)'), N(i), S('FE-' + id), k === 'หัวรับน้ำดับเพลิง' ? null : S('https://drive.google.com/file/d/' + DID(id) + '/view?usp=drivesdk'), null, null, null, N(2567), S('บริษัทสมมติ')]); } }); return { n: 13, rows }; }
  if (gid === '591543024') { for (let i = 1; i <= 49; i++) rows.push([N(i), S('ลานจอดสมมติ ' + i + ' (MOCK)'), N(10 * i), null, null, null, null]); return { n: 7, rows }; }   // ต้นทางจริง: คอลัมน์รูปของลานจอดว่างทั้งหมด (ตรวจ 15 พ.ย.)
  if (gid === '1541578119') { for (let i = 1; i <= 7; i++) rows.push([S('แบบฟอร์มสมมติ ' + i + ' (MOCK)'), S(i < 3 ? 'https://docs.google.com/forms/d/e/MOCK' + i + '/viewform' : 'https://trafficoppe.github.io/mock' + i + '/')]); return { n: 2, rows }; }
  if (gid === '267450301') { for (let i = 1; i <= 118; i++) { const fire = i <= 78, bad = !fire && i % 5 === 0; rows.push([{ v: 'Date(2026,' + (2 + i % 4) + ',' + (1 + i % 27) + ',21,4,0)', f: 'x' }, S(fire ? 'อุปกรณ์ดับเพลิง' : i % 2 ? 'รถจักรยานยนต์' : 'รถกอล์ฟ'), S(fire ? 'ถังดับเพลิงชนิดCo2' : 'รุ่นสมมติ 1 (MOCK)'), S('แดง'), S(fire ? '1' : 'MOCK-1'), S(fire ? 'FE-21' : 'ครุภัณฑ์-1')].concat(Array.from({ length: 9 }, () => S('ปกติ')), [S(''), S(bad ? 'ไม่สามารถใช้งานได้ (ต้องส่งซ่อม/แก้ไข)' : 'สามารถใช้งานได้')])); } return { n: 17, rows }; }
  if (gid === '680269898') { rows.push([S('1'), S('FE-21'), { v: 'Date(2026,4,2)', f: 'x' }, N(2.5), N(10), S('CO2'), S('บริษัทสมมติ'), S('')]); return { n: 8, rows }; }
  return null;
}
const gvBody = (u) => { const q = new URL(u), gid = q.searchParams.get('gid'), cb = /responseHandler:([\w$]+)/.exec(q.searchParams.get('tqx') || '')[1], t = gvTable(gid);
  if (!t) return '/*O_o*/\n' + cb + '({"version":"0.6","status":"error","errors":[{"reason":"invalid_query"}]});';
  return '/*O_o*/\n' + cb + '(' + JSON.stringify({ version: '0.6', reqId: '0', status: 'ok', table: { cols: Array.from({ length: t.n }, (_, i) => ({ id: String.fromCharCode(65 + i), label: 'c' + i, type: 'string' })), rows: t.rows.map(c => ({ c })), parsedNumHeaders: 1 } }) + ');'; };
const API_ROWS = {
  staff: Array.from({ length: 24 }, (_, i) => ({ name: 'บุคลากรสมมติ ' + (i + 1) + ' (MOCK)', position: 'ตำแหน่งสมมติ', phone: '000-000-00' + String(i).padStart(2, '0'), photo: i % 4 ? DID(300 + i) : '', unit: i < 19 ? 'หน่วยปฏิบัติการจราจรและรักษาความปลอดภัย' : i < 23 ? 'หน่วยยุทธศาสตร์และพัฒนาระบบความปลอดภัย' : '', isHead: i === 0 })),
  areaPhotos: Array.from({ length: 95 }, (_, i) => ({ date: '2026-' + (i < 60 ? '11' : '10') + '-' + String(1 + i % 13).padStart(2, '0'), url: 'https://drive.google.com/file/d/' + DID(500 + i) + '/view?usp=drivesdk', category: i % 9 === 0 ? 'ช่วยเหลือ' : i % 11 === 0 ? 'การจราจร' : 'ตรวจพื้นที่' })),
  radio: Array.from({ length: 33 }, (_, i) => ({ at: '2026-11-' + String(1 + i % 13).padStart(2, '0') + ' 0' + (i % 9) + ':15', operator: 'เจ้าหน้าที่สมมติ (MOCK)', unit: 'หน่วยงานสมมติ', reporter: 'ผู้แจ้งสมมติ', type: i % 2 ? 'อุบัติเหตุ' : 'แจ้งเหตุทั่วไป', place: 'สถานที่สมมติ ' + i, detail: 'รายละเอียดสมมติ (MOCK)', action: 'ประสานสายตรวจ', status: 'ระงับเหตุเรียบร้อย (ปิดงาน)' }))
};

async function newPage(browser, o) {
  o = o || {};
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 1440, height: 900 }, timezoneId: 'America/New_York', locale: 'en-US' }, o.ctx || {}));
  const page = await ctx.newPage(), log = { errors: [], tiles: [], gviz: 0, api: [], lf: 0, ext: [], posts: [] };
  page.on('console', m => { if (m.type() === 'error') log.errors.push(m.text()); }); page.on('pageerror', e => log.errors.push('PAGEERROR ' + e.message));
  await page.addInitScript(([now, cfg, incomplete]) => {
    if (now) { const real = Date.now.bind(Date), off = now - real(); Date.now = () => real() + off; }
    if (incomplete) Object.defineProperty(window, '__HUB_DATA__', { configurable: true, get() { return undefined; }, set(v) { ['incidentsDaily', 'lostfoundDaily'].forEach(k => { if (v.extra && v.extra[k]) v.extra[k].complete = false; }); Object.defineProperty(window, '__HUB_DATA__', { value: v, writable: true, configurable: true }); } });
    Object.defineProperty(window, 'HUB_CONFIG', { configurable: true, get() { return undefined; }, set(v) { Object.assign(v, cfg || {}); Object.defineProperty(window, 'HUB_CONFIG', { value: v, writable: true, configurable: true }); } });
  }, [o.now || BKK('2026-11-15', '18:50'), o.cfg || null, !!o.incomplete]);
  await page.route('**/*', route => {
    const req = route.request(), u = req.url();
    if (u.startsWith(BASE) && !u.includes('/mock-api/')) return route.continue();
    if (u.startsWith('file:') || u.startsWith('data:')) return route.continue();
    const json = (s, b) => route.fulfill({ status: s, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(b) });
    if (u.includes('tile.openstreetmap.org')) { const h = req.headers(); log.tiles.push({ referer: h.referer || '', cc: (h['cache-control'] || '') + (h.pragma || '') }); return route.fulfill({ status: o.tiles403 ? 403 : 200, contentType: 'image/png', body: PX, headers: { 'access-control-allow-origin': '*' } }); }
    if (u.includes('/gviz/tq')) { log.gviz++; if (o.gvizDown) return route.abort(); return route.fulfill({ status: 200, contentType: 'text/javascript', body: gvBody(u) }); }
    if (u.includes('/mock-api/data')) { const ds = new URL(u).searchParams.get('dataset'); log.api.push(ds); if (o.apiStatus) return json(o.apiStatus, { ok: false }); return json(200, { ok: true, rows: API_ROWS[ds] || [] }); }
    if (u.includes('/mock-api/form')) { log.posts.push(req.postData() || ''); return json(o.formStatus || 200, { ok: !o.formStatus, ref: 'MOCK-REF-1' }); }
    if (u.includes('/mock-api/chat')) { const b = JSON.parse(req.postData() || '{}'); log.posts.push(b); if (o.chatStatus && log.posts.length === 1) return json(o.chatStatus, { status: 'error' });
      return json(200, { status: 'success', reply: 'คำตอบสมมติ (MOCK) สำหรับ: ' + b.userMessage, sources: ['รายงานเหตุการณ์'], asOf: '15 พ.ย. 2569 17:25 น.' }); }
    if (u.includes('script.google.com')) { log.lf++; return json(200, { success: true, records: Array.from({ length: 47 }, (_, i) => ({ type: ['สิ่งของสูญหาย', 'พบสิ่งของ', 'รับของคืน'][i % 3], title: 'รายการสมมติ ' + (i + 1) + ' (MOCK)', location: 'สถานที่สมมติ', reportedAt: '2026-11-0' + (1 + i % 9) + 'T03:00:00.000Z', status: 'รอดำเนินการ', refCode: 'MOCK-' + i, images: i % 3 === 0 ? ['MOCKMOCKMOCKMOCKMOCKMOCK' + i] : [] })) }); }
    if (u.includes('drive.google.com/thumbnail')) return /MOCK6\b|0{17}999/.test(u) ? route.fulfill({ status: 404, body: '' }) : route.fulfill({ status: 200, contentType: 'image/png', body: PX });
    if (u.includes('github.com/user-attachments')) return route.fulfill({ status: 200, contentType: 'image/png', body: PX });
    log.ext.push(u); return route.abort();
  });
  return { ctx, page, log };
}
const T = (p, s) => p.locator(s);
const text = async (p, s) => (await T(p, s).first().innerText()).replace(/\s+/g, ' ').trim();
const nowCard = async (p, title) => (await p.locator('.now', { hasText: title }).first().innerText()).replace(/\s+/g, ' ').trim();
const sysErrors = log => log.errors.filter(e => !/net::ERR|Failed to load resource/.test(e));
const open = async (p, h, sel) => { await p.goto(URL0 + '#' + h); await p.waitForSelector(sel || '.ph, .dash-head'); await p.waitForTimeout(450); return (await T(p, '#view').innerText()); };

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  let ctx, page, log, tx;

  // ===== A) หน้าแรก — วันนี้ = 15 พ.ย. 2569 (วันเดียวกับที่ตรวจข้อมูล) =====
  ({ ctx, page, log } = await newPage(browser));
  await page.goto(URL0); await page.waitForSelector('.now'); await page.waitForTimeout(900);
  ok('เปิดมาที่หน้าแรก มีตัวเลือก วันนี้/เดือนนี้/ปีนี้/กำหนดช่วง (ค่าเริ่มต้น = วันนี้)', (await page.$$eval('.seg.period button', b => b.map(x => x.textContent + ':' + x.getAttribute('aria-pressed')).join('|'))) === 'วันนี้:true|เดือนนี้:false|ปีนี้:false|กำหนดช่วง:false');
  ok('วันที่ “วันนี้” มาจากนาฬิกา ณ ตอนเปิด (เวลาไทย)', /วันนี้ 15 พ\.ย\. 2569/.test(await text(page, '.dash-meta')));
  ok('หน้าแรกไม่มีตาราง และมีการ์ดเรื่องละ 1 ใบ (8 เรื่อง)', await T(page, '#view table').count() === 0 && await T(page, '.now').count() === 8, 'tables ' + await T(page, '#view table').count() + ' cards ' + await T(page, '.now').count());
  ok('KPI ต่อการ์ดไม่เกิน 1 ค่าหลัก + 4 ค่ารอง', await page.$$eval('.now', n => n.every(x => x.querySelectorAll('.now-main b, .now-na').length === 1 && x.querySelectorAll('.now-subs div').length <= 4)));
  ok('ข้อความบนหน้าแรกสั้นลง (รุ่น 6 วัดได้ 8,662 ตัวอักษร 7 ตาราง — ต้องน้อยกว่าครึ่ง)', (await T(page, '#view').innerText()).length < 4300, (await T(page, '#view').innerText()).length + ' ตัวอักษร');
  let c = await nowCard(page, 'เหตุการณ์และอุบัติเหตุ');
  ok('วันนี้ไม่มีเหตุ + แหล่งครอบคลุมถึงวันนี้ → แสดง 0 พร้อมเวลาตรวจ', /วันนี้ ณ 18:36 น\. 0 เหตุการณ์/.test(c) && /ณ เวลาตรวจ/.test(c) && /ล่าสุด 13 พ\.ย\./.test(c), c);
  c = await nowCard(page, 'รถเข้าและหมวกนิรภัย');
  ok('ต้นทางยังมาไม่ถึงวันนี้ → “ยังไม่มีข้อมูลวันนี้” + วันล่าสุด (ไม่แสดง 0)', /ล่าสุด 10 พ\.ย\./.test(c) && /ยังไม่มีข้อมูลวันนี้/.test(c) && /รถเข้า 20,008 คัน/.test(c) && !/ 0 คัน/.test(c), c);
  c = await nowCard(page, 'รถรางบริการพิเศษ');
  ok('ข้อมูลรายเดือนเท่านั้น → แสดงเดือนล่าสุดพร้อมชื่อเดือน ไม่สร้างค่ารายวัน', /ล่าสุด ต\.ค\. 69/.test(c) && /33 งาน/.test(c) && /ยังไม่มีข้อมูลวันนี้/.test(c), c);
  c = await nowCard(page, 'คำขอดูกล้อง CCTV');
  ok('CCTV: ยอดของเดือนนี้ ระบุว่าเป็นทั้งเดือน + รายวันยังไม่รองรับ', /พ\.ย\. 69 \(ทั้งเดือน\)/.test(c) && /5 คำขอ/.test(c) && /รายวันยังไม่รองรับ/.test(c) && !/MLC|LA |PMH/.test(c), c);
  c = await nowCard(page, 'ลานจอดและยานพาหนะ');
  ok('ทะเบียนสินทรัพย์: ยอดทะเบียนล่าสุด + วันที่ข้อมูล', /ทะเบียน ณ 10 พ\.ย\./.test(c) && /7,721 รายการลงทะเบียน/.test(c), c);
  c = await nowCard(page, 'รปภ. และความปลอดภัย');
  ok('คะแนนประเมิน: เดือนล่าสุดพร้อมชื่อเดือน', /ประเมินเดือน พ\.ย\. 69/.test(c) && /4\.72/.test(c), c);
  const trendTitles = await page.$$eval('.trend h3', h => h.map(x => x.textContent));
  ok('แนวโน้มรายเดือน 9 เรื่อง ยังอยู่ครบเมื่อเลือก “วันนี้”', trendTitles.length === 9 && await T(page, '.trend svg, .trend .lf-map').count() >= 9, trendTitles.join(' | '));
  await page.screenshot({ path: OUT + '/01_desktop_dashboard_top.png' }); await page.screenshot({ path: OUT + '/02_desktop_dashboard_full.png', fullPage: true });
  await page.click('.seg.period button:text-is("เดือนนี้")'); await page.waitForTimeout(350);
  c = await nowCard(page, 'เหตุการณ์และอุบัติเหตุ');
  ok('เดือนนี้: เหตุการณ์ 13 · ผู้บาดเจ็บ/ป่วย 9 (นับจากข้อมูลรายวัน)', /13 เหตุการณ์/.test(c) && /ยานพาหนะ 4/.test(c) && /ผู้บาดเจ็บ\/ป่วย 9 คน/.test(c), c);
  c = await nowCard(page, 'Lost & Found'); ok('เดือนนี้: แจ้งหาย 27 · เก็บได้ 6 · สถานะรับคืนแล้ว 7 (ไม่บวกแบบรับคืน) — ค่าคาดหวังนับจากแท็บ LF_New โดยตรงเมื่อ 15 พ.ย. 18:36 น. (รายการที่ 27 บันทึก 14 พ.ย. 20:34 น.)', /27 แจ้งของหาย/.test(c) && /เก็บของได้ 6/.test(c) && /สถานะรับคืนแล้ว 7/.test(c), c);
  c = await nowCard(page, 'รถเข้าและหมวกนิรภัย'); ok('เดือนนี้: รถเข้า ' + (GNOV.cars + GNOV.motorcycles).toLocaleString('en-US') + ' คัน จาก ' + GNOV.days + ' วันที่มีข้อมูล (เรียกว่า “คันเข้า”)', c.includes((GNOV.cars + GNOV.motorcycles).toLocaleString('en-US') + ' คันเข้า') && c.includes(GNOV.days + ' วัน') && !/เข้าออก/.test(c), c);
  await page.click('.seg.period button:text-is("ปีนี้")'); await page.waitForTimeout(350);
  c = await nowCard(page, 'เหตุการณ์และอุบัติเหตุ'); ok('ปีนี้: เหตุการณ์ 68 · ผู้บาดเจ็บ/ป่วย 39', /68 เหตุการณ์/.test(c) && /39 คน/.test(c), c);
  c = await nowCard(page, 'จักรยาน Anywheel'); ok('ปีนี้: Anywheel 320,918 ครั้ง + แจ้งว่าข้อมูลถึง 30 มิ.ย.', /320,918 ครั้ง/.test(c) && /ถึง 30 มิ\.ย\. 2569/.test(c), c);
  await page.click('.seg.period button:text-is("กำหนดช่วง")'); await page.waitForTimeout(300);
  await page.selectOption('.dash-head select[aria-label="เดือนเริ่มต้น"]', '2026-10'); await page.selectOption('.dash-head select[aria-label="เดือนสิ้นสุด"]', '2026-10'); await page.waitForTimeout(350);
  c = await nowCard(page, 'เหตุการณ์และอุบัติเหตุ');
  ok('กำหนดช่วง ต.ค.: เหตุการณ์ 21 · ผู้บาดเจ็บ 4 และกราฟแนวโน้มเปลี่ยนตาม', /21 เหตุการณ์/.test(c) && /4 คน/.test(c) && await T(page, '.trend >> nth=0').locator('g.col').count() === 1, c);
  await page.click('.seg.period button:text-is("วันนี้")'); await page.waitForTimeout(350);
  ok('กลับมา “วันนี้”: กราฟแนวโน้มกลับเป็นทั้งปี (5 เดือนที่มีข้อมูลเหตุการณ์)', await T(page, '.trend >> nth=0').locator('g.col').count() === 5);
  const col = T(page, '.trend >> nth=0').locator('g.col').nth(2); await col.scrollIntoViewIfNeeded(); await col.hover(); await page.waitForTimeout(150);
  tx = (await T(page, '#tip').innerText()).replace(/\s+/g, ' ');
  ok('Tooltip: เดือน ประเภท ค่า หน่วย', /กันยายน 2569/.test(tx) && /รับส่งผู้ป่วย 14 เหตุการณ์/.test(tx) && /รวม 25 เหตุการณ์/.test(tx), tx);
  await col.click(); await page.waitForTimeout(400);
  ok('คลิกแท่ง → เปิดหน้ารายละเอียดในระบบใหม่ กรองเดือนนั้น', page.url().endsWith('#traffic') && /ก\.ย\. 69 – ก\.ย\. 69|กันยายน 2569/.test(await T(page, '#view').innerText()));
  await page.goBack(); await page.waitForSelector('.now');
  await T(page, '.trend .lf-map, .trend .dash-map').first().scrollIntoViewIfNeeded(); await page.waitForSelector('.trend .leaflet-tile', { timeout: 8000 }).catch(() => {});
  ok('[MOCK ไทล์] แผนที่บนหน้าแรก: Leaflet + จุด + เครดิต OSM', await T(page, '.trend .leaflet-tile').count() > 0 && await T(page, '.trend .leaflet-interactive, .trend .lf-cl').count() > 0 && await T(page, '.trend .leaflet-control-attribution a[href*="openstreetmap.org/copyright"]').count() === 1);
  ok('คำขอไทล์มี Referer และไม่ส่ง no-cache', log.tiles.length > 0 && log.tiles.every(t => t.referer.startsWith(BASE) && !/no-cache/.test(t.cc)), log.tiles.length + ' คำขอ');
  ok('ไม่มี Console/Page error (หน้าแรก)', sysErrors(log).length === 0, sysErrors(log).slice(0, 2).join(' || '));
  await ctx.close();

  // ===== B) วันนี้ = 10 พ.ย. (มีข้อมูลรายวันครบ) และ 20 พ.ย. (เกินวันที่ตรวจ) =====
  ({ ctx, page, log } = await newPage(browser, { now: BKK('2026-11-10') })); await page.goto(URL0); await page.waitForSelector('.now');
  c = await nowCard(page, 'เหตุการณ์และอุบัติเหตุ'); ok('วันนี้ = 10 พ.ย.: เหตุการณ์ 3 · ผู้บาดเจ็บ/ป่วย 2', /วันนี้ 3 เหตุการณ์/.test(c) && /ผู้บาดเจ็บ\/ป่วย 2 คน/.test(c), c);
  c = await nowCard(page, 'รถเข้าและหมวกนิรภัย'); ok('วันนี้ = 10 พ.ย.: รถเข้า 20,008 (12,998 + 7,010) · ไม่สวมหมวก 3,395', /วันนี้ 20,008 คันเข้า/.test(c) && /รถยนต์ 12,998/.test(c) && /3,395 ราย/.test(c), c);
  c = await nowCard(page, 'Lost & Found'); ok('วันนี้ = 10 พ.ย.: แจ้งหาย 2 · เก็บได้ 1', /วันนี้ 2 แจ้งของหาย/.test(c) && /เก็บของได้ 1/.test(c), c);
  await ctx.close();
  ({ ctx, page, log } = await newPage(browser, { now: BKK('2026-11-20') })); await page.goto(URL0); await page.waitForSelector('.now');
  c = await nowCard(page, 'เหตุการณ์และอุบัติเหตุ'); ok('วันนี้ = 20 พ.ย. (หลังวันที่ตรวจ): “ยังไม่มีข้อมูลวันนี้” ไม่ใช่ 0', /ยังไม่มีข้อมูลวันนี้/.test(c) && /ล่าสุด 13 พ\.ย\./.test(c) && !/วันนี้ 0/.test(c), c);
  ok('หัววันที่เปลี่ยนตามวันเปิดจริง', /วันนี้ 20 พ\.ย\. 2569/.test(await text(page, '.dash-meta')));
  await ctx.close();
  // เส้นแบ่งวันตามเวลาไทย (เบราว์เซอร์ทดสอบตั้งเขตเวลา America/New_York): 23:59 ยังเป็น 15 พ.ย. · 00:01 เป็น 16 พ.ย. ซึ่งเลยวันที่อ่านต้นทาง
  ({ ctx, page, log } = await newPage(browser, { now: BKK('2026-11-15', '23:59') })); await page.goto(URL0); await page.waitForSelector('.now');
  c = await nowCard(page, 'เหตุการณ์และอุบัติเหตุ'); ok('23:59 น. เวลาไทย: ยังเป็นวันนี้ 15 พ.ย. — 0 พร้อมเวลาที่อ่านต้นทาง (ไม่ใช่เวลาเปิดหน้า)', /วันนี้ 15 พ\.ย\. 2569/.test(await text(page, '.dash-meta')) && /วันนี้ ณ 18:36 น\. 0 เหตุการณ์/.test(c), c);
  await ctx.close();
  ({ ctx, page, log } = await newPage(browser, { now: BKK('2026-11-16', '00:01') })); await page.goto(URL0); await page.waitForSelector('.now');
  c = await nowCard(page, 'เหตุการณ์และอุบัติเหตุ'); const cLF = await nowCard(page, 'Lost & Found');
  ok('00:01 น. เวลาไทย: เป็นวันที่ 16 พ.ย. — ไม่แสดง 0 เพราะต้นทางยังไม่ได้อ่านของวันนั้น', /วันนี้ 16 พ\.ย\. 2569/.test(await text(page, '.dash-meta')) && /ยังไม่มีข้อมูลวันนี้/.test(c) && !/วันนี้ ณ/.test(c) && /ยังไม่มีข้อมูลวันนี้/.test(cLF) && /ล่าสุด 14 พ\.ย\./.test(cLF), c + ' || ' + cLF);
  await ctx.close();
  // อ่านต้นทางไม่ครบ (complete = false): ห้ามแสดง 0 แม้วันที่ตรวจจะเป็นวันนี้ และกราฟ 14 วันต้องจบที่รายการล่าสุด ไม่เติมศูนย์ต่อท้าย
  ({ ctx, page, log } = await newPage(browser, { incomplete: true })); await page.goto(URL0); await page.waitForSelector('.now');
  c = await nowCard(page, 'เหตุการณ์และอุบัติเหตุ'); const cLF2 = await nowCard(page, 'Lost & Found');
  ok('อ่านต้นทางไม่ครบ → “ยังยืนยันข้อมูลวันนี้ไม่ได้” + วันล่าสุด (ไม่แสดง 0)', /ยังยืนยันข้อมูลวันนี้ไม่ได้/.test(c) && /ล่าสุด 13 พ\.ย\./.test(c) && !/0 เหตุการณ์/.test(c) && /ยังยืนยันข้อมูลวันนี้ไม่ได้/.test(cLF2), c + ' || ' + cLF2);
  ok('อ่านต้นทางไม่ครบ → กราฟ 14 วันจบที่วันรายการล่าสุด', /14 วันถึง 13 พ\.ย\./.test(c) && /14 วันถึง 14 พ\.ย\./.test(cLF2), c);
  await ctx.close();

  // ===== C) รายงานประจำเดือน =====
  ({ ctx, page, log } = await newPage(browser));
  tx = await open(page, 'report-monthly', '.rep');
  const ids = await page.$$eval('.rep', n => n.map(x => x.id.replace('sec-', '')).join(','));
  ok('รายงานประจำเดือน: 10 หมวดตามลำดับ ไม่มีการ์ดภาพรวมซ้ำของหน้าแรก', ids === 'incidents,lostfound,gate,map,anywheel,tram,tram-dept,cctv,parking,guard' && await T(page, '.ov, .now').count() === 0, ids);
  ok('ค่าเริ่มต้น = เดือนปัจจุบัน (พ.ย. 69)', (await page.$$eval('.chips .chip[aria-pressed="true"]', n => n.map(x => x.textContent).join())) === 'พ.ย. 69');
  const tiles = async id => page.$$eval('#sec-' + id + ' .tile', n => n.map(x => x.innerText.replace(/\s+/g, ' ').trim()));
  let ti = await tiles('incidents'); ok('พ.ย.: เหตุการณ์ 13 · ผู้บาดเจ็บ/ป่วย 9 (เปลี่ยนตามเดือน ไม่คงค่า 39)', /13/.test(ti[0]) && /9 คน/.test(ti[4]) && /ไม่มีข้อมูลยืนยัน/.test(ti[5]), ti.join(' | '));
  await page.click('.chips .chip:text-is("ต.ค. 69")'); await page.waitForTimeout(400);
  ti = await tiles('incidents'); const tl = await tiles('lostfound'), tg = await tiles('gate'), tt = await tiles('tram'), ta = await tiles('anywheel'), tc = await tiles('cctv');
  ok('ต.ค.: เหตุการณ์ 21 · ยานพาหนะ 7 · ทั่วไป 4 · ผู้บาดเจ็บ 4', /21/.test(ti[0]) && /7/.test(ti[1]) && /4/.test(ti[2]) && /4 คน/.test(ti[4]), ti.slice(0, 5).join(' | '));
  ok('ต.ค.: L&F แจ้งหาย 74 · เก็บได้ 34 · แบบรับคืน 16 ฉบับ · สถานะรับคืนแล้ว 20 (แยกกัน)', /74/.test(tl[0]) && /34/.test(tl[1]) && /16 ฉบับ/.test(tl[2]) && /20/.test(tl[3]), tl.join(' | '));
  ok('ต.ค.: รถยนต์เข้า ' + GOCT.cars.toLocaleString('en-US') + ' · จยย. ' + GOCT.motorcycles.toLocaleString('en-US') + ' (ตรงกับไฟล์ข้อมูล) · รถออกไม่มีข้อมูล + ป้าย “มีเฉพาะจำนวนรถเข้า”', tg[0].includes(GOCT.cars.toLocaleString('en-US')) && tg[1].includes(GOCT.motorcycles.toLocaleString('en-US')) && tg.some(x => /รถออก ยังไม่มีข้อมูลยืนยัน/.test(x)) && /มีเฉพาะจำนวนรถเข้า/.test(await text(page, '#sec-gate .rep-h')), tg.join(' | '));
  ok('ต.ค.: รถราง 33 งาน 58 รอบ 324 กม. 39 คัน-ครั้ง 29.7 ชม. · ผู้โดยสารไม่มีข้อมูล', /33/.test(tt[0]) && /58/.test(tt[1]) && /324/.test(tt[2]) && /39/.test(tt[3]) && /29\.7/.test(tt[4]) && /ต้นทางไม่มีข้อมูล/.test(tt[5]), tt.join(' | '));
  ok('ต.ค.: Anywheel ไม่มีข้อมูลในช่วง (ไม่แสดง 0)', /ไม่มีข้อมูลในช่วงที่เลือก/.test(ta[0]), ta[0]);
  ok('CCTV: MLC/LA/PMH = “ยังไม่มีข้อมูล” (ไม่ใช่ 0)', tc.filter(x => /ยังไม่มีข้อมูล/.test(x)).length === 3 && !tc.some(x => /^(MLC|LA|PMH) 0/.test(x)), tc.join(' | '));
  ok('รถรางแยกส่วนงาน ต.ค. 2569: รวม 33 งาน 58 รอบ', /33.*58/.test((await text(page, '#sec-tram-dept tfoot'))));
  ok('ทุกหมวดมีตารางหรือกราฟ', await page.$$eval('.rep', n => n.every(x => x.querySelector('table, svg, .lf-map, .map-mini'))));
  await page.screenshot({ path: OUT + '/03_desktop_report_monthly.png', fullPage: true });
  await page.click('.jump a:text-is("รถราง")'); await page.waitForTimeout(1500);
  ok('ทางลัดหมวด + URL ตรง', page.url().endsWith('#report-monthly/tram') && (await T(page, '#sec-tram').boundingBox()).y < 220);
  await ctx.close();

  // ===== D) แผนที่เต็มหน้า (MOCK ไทล์) / ไทล์ถูกปฏิเสธ / file:// =====
  ({ ctx, page, log } = await newPage(browser));
  await page.goto(URL0 + '#accident-map'); await page.waitForSelector('#mapSvg .leaflet-tile', { timeout: 8000 }).catch(() => {}); await page.waitForTimeout(400);
  ok('[MOCK ไทล์] แผนที่เต็มหน้า: Leaflet · 37 จุด · ตารางรายชื่อจุด', await T(page, '#mapSvg .leaflet-tile').count() > 0 && /37 จุด/.test(await text(page, '#mapNote')) && await T(page, '#mapList tbody tr').count() === 37);
  await page.click('#mapTools .chip:has-text("ทั่วไป")'); await page.waitForTimeout(300); ok('กรองประเภท “ทั่วไป” = 12 จุด', await T(page, '#mapList tbody tr').count() === 12);
  await page.click('#mapTools .chip:has-text("ทุกประเภท")'); await page.click('#mapList tbody tr:nth-child(4) .linkish'); await page.waitForTimeout(300);
  ok('กดจุด → รายละเอียด + ปุ่ม Google Maps · ไม่มีข้อมูลผู้แจ้ง', await T(page, '#mapDetail a[href*="google.com/maps"]').count() === 1 && !/ผู้แจ้ง|โทร|เบอร์/.test(await T(page, '#view').innerText()));
  await page.click('#mapSvg .leaflet-control-zoom-in'); await page.waitForTimeout(400); ok('ปุ่มซูมทำงาน', await T(page, '#mapSvg .leaflet-tile').count() > 0);
  await page.screenshot({ path: OUT + '/04_desktop_map_page_MOCKTILES.png' }); await ctx.close();
  ({ ctx, page, log } = await newPage(browser, { tiles403: true })); await page.goto(URL0); await page.waitForSelector('.trend .map-warn', { timeout: 8000 }).catch(() => {});
  ok('[MOCK 403] ไทล์ถูกปฏิเสธ → แจ้งเหตุผล + แผนผัง เรียกไทล์เพียง 1 ครั้ง', await T(page, '.trend .map-warn').count() === 1 && log.tiles.length === 1, 'tile requests ' + log.tiles.length); await ctx.close();
  ({ ctx, page, log } = await newPage(browser)); await page.goto('file://' + ROOT + '/dist/preview.html'); await page.waitForSelector('.now'); await page.waitForTimeout(700);
  ok('file://: ไม่เรียกไทล์ และบอกเหตุผล', log.tiles.length === 0 && /เปิดจากไฟล์ในเครื่อง/.test(await T(page, '.trends').innerText())); await ctx.close();

  // ===== E) หน้ารายการจาก Sheet ต้นทาง (MOCK gviz) =====
  ({ ctx, page, log } = await newPage(browser));
  tx = await open(page, 'vehicle-fleet'); await page.waitForSelector('.it');
  ok('[MOCK gviz] ยานพาหนะ: 14 คัน · ตัวกรองประเภท 6/5/3', /14 คัน/.test(await text(page, '.lu-count')) && /รถจักรยานยนต์ 6/.test(await text(page, '.lu-bar')) && /รถกอล์ฟ 3/.test(await text(page, '.lu-bar')) && await T(page, '.it').count() === 14);
  ok('[MOCK รูป] ไม่มีรูปภาพ / ภาพเสีย มีข้อความสถานะ', /ไม่มีรูปภาพ/.test(await T(page, '.it-grid').innerText()) && /โหลดภาพไม่ได้/.test(await T(page, '.it-grid').innerText()));
  await page.fill('.lu-bar input[type=search]', 'MOCK-12'); await page.waitForTimeout(450); ok('ค้นหา', await T(page, '.it').count() === 1);
  await page.click('.it .it-b'); await page.waitForSelector('.dlg'); await page.waitForTimeout(500);
  ok('[MOCK gviz] รายละเอียด: ข้อมูลรายคัน + ประวัติตรวจสภาพ + ลิงก์แบบฟอร์มเติมค่าอัตโนมัติ', /ทะเบียน MOCK-12/.test((await text(page, '.dlg-dl'))) && /ประวัติการตรวจสภาพ/.test(await T(page, '.dlg').innerText()) && (await T(page, '.dlg a[href*="#form-clean?"]').getAttribute('href')).includes('plate=MOCK-12'));
  await page.click('.dlg .dlg-pic >> nth=0'); await page.waitForSelector('.lightbox'); ok('[MOCK รูป] ภาพขยาย เปิด/ปิดด้วย Esc', await T(page, '.lightbox img').count() === 1); await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
  await page.fill('.lu-bar input[type=search]', ''); await page.waitForTimeout(400); await page.screenshot({ path: OUT + '/05_vehicle_fleet_MOCKDATA.png', fullPage: true });
  tx = await open(page, 'safety'); await page.waitForSelector('.it');
  const chips = await page.$$eval('.lu-bar .chip', n => n.map(x => x.textContent).join('|'));
  ok('[MOCK gviz] อุปกรณ์ดับเพลิง: ครบ 7 ประเภท ไม่มีรายการตกหล่น (34/6/4/0/1/1/4 = 50)', chips === 'ทั้งหมด 50|ถังดับเพลิง 34|สายฉีด 6|หัวฉีด 4|ปั๊มน้ำ 0|ตู้เก็บอุปกรณ์ 1|หัวรับน้ำ 1|ชุด PPE 4', chips);
  const fireTxt = await page.evaluate(() => { const v = document.getElementById('view').cloneNode(true); v.querySelectorAll('.tabs').forEach(n => n.remove()); return v.innerText; });
  ok('หน้าอุปกรณ์ดับเพลิงไม่มี AED ปนในเนื้อหา (เหลือเฉพาะแถบนำทางไปหน้า AED)', !/AED/i.test(fireTxt) && await T(page, '.tabs a[href="#aed"]').count() === 1, (fireTxt.match(/.{0,30}AED.{0,30}/) || [''])[0]);
  await page.click('.lu-bar .chip:has-text("ปั๊มน้ำ")'); await page.waitForTimeout(250); ok('ประเภทที่ต้นทางยังไม่มีรายการ → บอกตรง ๆ', /ทะเบียนต้นทางยังไม่มีรายการประเภท “ปั๊มน้ำ”/.test(await T(page, '.lu').first().innerText()));
  await page.click('.lu-bar .chip:has-text("ถังดับเพลิง")'); await page.waitForTimeout(250); await page.click('.it .it-b >> nth=0'); await page.waitForSelector('.dlg'); await page.waitForTimeout(500);
  ok('[MOCK gviz] รายละเอียดถัง: ภาพ ตำแหน่ง ประวัติตรวจ ประวัติเติมสาร ลิงก์แบบฟอร์มเติมสาร', /สถานที่ติดตั้ง/.test(await text(page, '.dlg-dl')) && /ประวัติการเติมสาร/.test(await T(page, '.dlg').innerText()) && await T(page, '.dlg a[href*="#form-refill?"]').count() === 1);
  await page.screenshot({ path: OUT + '/06_fire_equipment_detail_MOCKDATA.png' }); await page.keyboard.press('Escape');
  await page.click('.lu-bar .chip:has-text("ทั้งหมด")'); await page.screenshot({ path: OUT + '/07_fire_equipment_MOCKDATA.png', fullPage: true });
  tx = await open(page, 'parking'); await page.waitForSelector('.it'); ok('[MOCK gviz] ลานจอดรายลาน: 49 ลาน ความจุรวม 12,250 · แบ่งหน้า 24', /49/.test(await text(page, '.dv .kpis')) && /12,250/.test(await text(page, '.dv .kpis')) && await T(page, '.it').count() === 24 && /หน้า 1 \/ 3/.test(await text(page, '.lu-pager')));
  ok('ลานจอด: ต้นทางไม่มีรูป → ไม่แสดงกรอบรูปเปล่า และบอกว่าต้นทางยังไม่มีภาพ/พิกัด', await T(page, '.dv .it .it-pic').count() === 0 && /ต้นทางยังไม่มีภาพและพิกัดของลานจอด/.test(await text(page, '.dv')));
  await page.click('.lu-pager button:has-text("ถัดไป")'); await page.waitForTimeout(250); ok('แบ่งหน้าทำงาน', /หน้า 2 \/ 3/.test(await text(page, '.lu-pager')));
  await page.screenshot({ path: OUT + '/08_parking_lots_MOCKDATA.png', fullPage: true });
  tx = await open(page, 'forms'); await page.waitForSelector('.list.forms li');
  { const fb = page.locator('section[aria-label="แบบฟอร์มของระบบอื่นที่เกี่ยวข้อง"] .fold-btn'); ok('[รอบ 12] “แบบฟอร์มของระบบอื่นที่เกี่ยวข้อง” เริ่มแบบยุบ บอกจำนวนแบบฟอร์ม → กดเปิดได้', await fb.getAttribute('aria-expanded') === 'false' && /\d+ แบบฟอร์ม/.test(await fb.innerText())); await fb.click(); await page.waitForTimeout(150); }
  { const t = await text(page, '#view'), hrefs = await page.$$eval('.list.forms a', (a) => a.map((x) => x.getAttribute('href')));
    const once = (n) => t.split(n).length - 1 === 1;
    ok('แบบฟอร์ม: ชื่อใหม่ครบและไม่ซ้ำ (แจ้งเหตุ AI · รถเข้า+หมวก · ตรวจสภาพยานพาหนะ · ขอดูกล้อง · ตรวจและเติมสารดับเพลิง)', once('ระบบรายงานเหตุการณ์/แจ้งเหตุ (AI)') && once('แบบฟอร์มบันทึกจำนวนรถเข้าและผู้ไม่สวมหมวกนิรภัย') && once('แบบฟอร์มตรวจสภาพยานพาหนะ') && once('แบบฟอร์มขอดูกล้องวงจรปิด') && once('แบบฟอร์มตรวจและเติมสารอุปกรณ์ดับเพลิง'));
    ok('แบบฟอร์มของระบบอื่น: ชื่อแบบประเมิน “… 6 สัญญาจ้าง” ทั้งส่วนกลางและส่วนงาน (URL เดิม)', once('แบบประเมินความพึงพอใจ รปภ.เอกชนส่วนกลาง 6 สัญญาจ้าง') && once('แบบประเมินความพึงพอใจ รปภ.เอกชนส่วนงาน 6 สัญญาจ้าง') && hrefs.includes('https://trafficoppe.github.io/NPcentral-guard-feedback/') && hrefs.includes('https://trafficoppe.github.io/NPsecurity-feedback/'));
    ok('แบบฟอร์ม: ไม่มีชื่อเดิม/รายการซ้ำ/แบบบันทึกขยะ', !/แบบฟอร์มรายงานเหตุการณ์ไม่ปกติ|แบบฟอร์มบันทึกรถเข้ามหาวิทยาลัย|ระบบขอดูกล้องวงจรปิด \(CCTV\)|ระบบตรวจถังดับเพลิง|การจัดการขยะ/.test(t));
    ok('แบบฟอร์ม: ลิงก์ตามที่กำหนด', ['https://trafficoppe.github.io/report-incident-AI-v1/', 'https://trafficoppe.github.io/Form-Gate-Tracker-AI-v1/', 'https://trafficoppe.github.io/trafficsystem/form.html', 'https://trafficoppe.github.io/trafficoppe/', 'https://trafficoppe.github.io/-v1/'].every((u) => hrefs.filter((h) => h === u).length === 1), JSON.stringify(hrefs));
    ok('แบบฟอร์ม: แบบบันทึกย่อย (ทำความสะอาด · เติมสารถังดับเพลิง) อยู่ใต้แบบฟอร์มหลักพร้อมข้อความเติมอัตโนมัติ', await T(page, '.list.forms li.f-sub').count() === 2 && /เลือกยานพาหนะจากหน้า ‘ยานพาหนะทั้งหมด’ เพื่อเติมรุ่นและทะเบียนให้อัตโนมัติ/.test(t) && /เลือกถังจากหน้า ‘อุปกรณ์ดับเพลิง’ เพื่อเติมชนิดและเลขที่ถังให้อัตโนมัติ/.test(t));
    ok('แบบฟอร์ม: ลิงก์ภายนอกเปิดแท็บใหม่ · ลิงก์ภายในไม่เปิดแท็บใหม่', (await page.$$eval('.list.forms a[href^="https"]', (a) => a.every((x) => x.target === '_blank'))) && (await page.$$eval('.list.forms a[href^="#"]', (a) => a.every((x) => !x.target))));
    await page.fill('.lu-bar input[type=search]', 'ดับเพลิง'); await page.waitForTimeout(350); ok('แบบฟอร์ม: ค้นหา “ดับเพลิง” → แบบฟอร์มหลัก + แบบบันทึกย่อย', await T(page, '.list.forms li').count() === 2, String(await T(page, '.list.forms li').count()));
    await page.fill('.lu-bar input[type=search]', 'ขยะ'); await page.waitForTimeout(350); ok('แบบฟอร์ม: ค้นหา “ขยะ” → ไม่พบ', /ไม่พบแบบฟอร์ม/.test(await text(page, '#view')));
    await page.goto(URL0 + '#form-waste'); await page.waitForTimeout(300); ok('ลิงก์เดิม #form-waste → หน้าแบบฟอร์ม (ไม่ใช่หน้าว่าง)', /แบบฟอร์มทั่วไป/.test(await text(page, 'h1'))); }
  await page.screenshot({ path: OUT + '/09_forms_MOCKDATA.png', fullPage: true });
  tx = await open(page, 'inspection-history'); await page.waitForSelector('.tbl');
  ok('[MOCK gviz] ประวัติตรวจสภาพ: 118 ครั้ง · ตาราง 20/หน้า · เปิดผลตรวจ 9 ข้อ', /118/.test(await text(page, '.kpis')) && await T(page, '.tbl tbody tr').count() === 20);
  await page.click('.tbl tbody tr >> nth=0'); await page.waitForSelector('.dlg'); ok('ผลตรวจรายครั้งไม่แสดงชื่อผู้ตรวจ', /9\. สภาพตัวถัง/.test(await text(page, '.dlg-dl')) && !/ผู้ตรวจ/.test(await T(page, '.dlg').innerText())); await page.keyboard.press('Escape');
  ok('คำขอไปยัง Sheet ต้นทางเลือกเฉพาะคอลัมน์ที่กำหนด (ไม่มีคอลัมน์ ผู้ดูแล/ผู้ตรวจ/ชื่อไฟล์)', log.gviz >= 5);
  ok('ไม่มี Console/Page error (หน้ารายการ)', sysErrors(log).length === 0, sysErrors(log).slice(0, 2).join(' || '));
  await ctx.close();
  ({ ctx, page, log } = await newPage(browser, { gvizDown: true })); await open(page, 'vehicle-fleet'); await page.waitForSelector('.dv-err');
  ok('[MOCK] ต้นทางเชื่อมต่อไม่ได้ → ข้อความสาเหตุ + ปุ่มลองใหม่ (ไม่ใช่หน้าว่าง)', /เชื่อมต่อแหล่งข้อมูลไม่ได้/.test(await text(page, '.dv-err')) && /รหัสสาเหตุ: network/.test(await text(page, '.dv-err')) && await T(page, '.dv-err button').count() === 1); await ctx.close();

  // ===== F) ข้อมูลภายใน: ไม่มีสิทธิ์ต้องไม่ได้ข้อมูล =====
  ({ ctx, page, log } = await newPage(browser));
  for (const h of ['staff', 'staff-ops', 'area-inspect', 'area-assist', 'area-traffic', 'report-radio']) { tx = await open(page, h); await page.waitForSelector('.dv-err'); ok('ค่าเริ่มต้น: ' + h + ' ไม่เรียกแหล่งข้อมูลใด และแจ้งว่าต้องเข้าสู่ระบบภายใน', /ต้องเข้าสู่ระบบภายใน/.test(tx) && /รหัสสาเหตุ: noapi/.test(tx) && log.gviz === 0 && log.api.length === 0); }
  await page.screenshot({ path: OUT + '/10_staff_requires_signin.png' }); await ctx.close();
  ({ ctx, page, log } = await newPage(browser, { cfg: { dataApiUrl: BASE + '/mock-api/data' }, apiStatus: 401 })); tx = await open(page, 'staff'); await page.waitForSelector('.dv-err');
  ok('[MOCK API 401] บริการปฏิเสธ → ไม่มีรายชื่อ/รูปในหน้า', /ไม่มีสิทธิ์ดูข้อมูลส่วนนี้/.test(tx) && /auth 401/.test(tx) && await T(page, '.it').count() === 0 && !/บุคลากรสมมติ/.test(tx)); await ctx.close();
  ({ ctx, page, log } = await newPage(browser, { cfg: { dataApiUrl: BASE + '/mock-api/data' } }));
  tx = await open(page, 'staff'); await page.waitForSelector('.it'); ok('[MOCK API] บุคลากร: 24 คน · ตัวกรองหน่วย 19/4', /24 คน/.test(await text(page, '.lu-count')) && /ปฏิบัติการจราจรและรักษาความปลอดภัย 19/.test(await text(page, '.lu-bar')) && /ยุทธศาสตร์และพัฒนาระบบความปลอดภัย 4/.test(await text(page, '.lu-bar')));
  await page.screenshot({ path: OUT + '/11_staff_MOCKDATA.png', fullPage: true });
  tx = await open(page, 'staff-strategy'); await page.waitForSelector('.it'); ok('[MOCK API] หน่วยยุทธศาสตร์ฯ: 4 คน', await T(page, '.it').count() === 4);
  tx = await open(page, 'area-inspect'); await page.waitForSelector('.ph-tile'); ok('[MOCK API] ตรวจพื้นที่: ภาพ 30/หน้า กรองเดือน ภาพขยาย', await T(page, '.ph-tile').count() === 30 && /พ\.ย\. 69/.test(await text(page, '.lu-bar')));
  await page.click('.ph-tile .it-pic >> nth=0'); await page.waitForSelector('.lightbox'); await page.keyboard.press('Escape'); await page.screenshot({ path: OUT + '/12_area_inspect_MOCKDATA.png' });
  tx = await open(page, 'area-assist'); await page.waitForSelector('.it-grid .it'); ok('[MOCK API] ให้ความช่วยเหลือ: เฉพาะหมวด “ช่วยเหลือ” (11 ภาพ)', /11 ภาพ/.test(await text(page, '.lu-count')));
  await page.click('.it-grid .it >> nth=0 >> .it-b'); await page.waitForSelector('.dlg'); ok('ให้ความช่วยเหลือ: คลิกภาพ → รายละเอียด + ภาพ + “ต้นทางยังไม่ได้บันทึกรายละเอียดการช่วยเหลือ”', /ต้นทางยังไม่ได้บันทึกรายละเอียดการช่วยเหลือ/.test(await text(page, '.dlg')) && await T(page, '.dlg .gal2').count() === 1); await page.keyboard.press('Escape');
  tx = await open(page, 'report-radio'); await page.waitForSelector('.tbl'); ok('[MOCK API] รายงานวิทยุ: 33 รายการ ตาราง + รายละเอียด', /33 รายการ/.test(await text(page, '.lu-count')) && await T(page, '.tbl tbody tr').count() === 20);
  tx = await open(page, 'report-daily'); await page.waitForTimeout(400);
  ok('รายงานประจำวัน (15 พ.ย.): เหตุการณ์ 0 · รถเข้า “ไม่มีข้อมูลของวันนี้” · L&F 0', /เหตุการณ์ทั้งหมด 0/.test(tx.replace(/\s+/g, ' ')) && /ไม่มีข้อมูลของวันนี้/.test(tx) && /แจ้งของหาย 0/.test(tx.replace(/\s+/g, ' ')), '');
  await page.fill('.ph input[type=date]', '2026-11-10'); await page.dispatchEvent('.ph input[type=date]', 'change'); await page.waitForTimeout(500); tx = (await T(page, '#view').innerText()).replace(/\s+/g, ' ');
  ok('รายงานประจำวัน (10 พ.ย.): เหตุการณ์ 3 · รถยนต์เข้า 12,998 · แจ้งหาย 2 · [MOCK API] บันทึกวิทยุของวัน', /เหตุการณ์ทั้งหมด 3/.test(tx) && /12,998/.test(tx) && /แจ้งของหาย 2/.test(tx) && await T(page, '.dv .tbl tbody tr').count() > 0);
  await page.screenshot({ path: OUT + '/13_report_daily.png', fullPage: true });
  ok('ไม่มี Console/Page error (ข้อมูลภายใน)', sysErrors(log).length === 0, sysErrors(log).slice(0, 2).join(' || ')); await ctx.close();

  // ===== G) แบบฟอร์ม: เติมค่าอัตโนมัติ ตรวจข้อมูล และไม่แสดง “บันทึกแล้ว” ถ้ายังไม่ได้บันทึกจริง =====
  ({ ctx, page, log } = await newPage(browser));
  await page.goto(URL0 + '#form-refill?detail=' + encodeURIComponent('ถังดับเพลิงชนิดCo2') + '&plate=7&equip=' + encodeURIComponent('FE-21/A')); await page.waitForSelector('.hform');
  ok('เติมค่าอัตโนมัติจากลิงก์ (ชนิดถัง/เลขที่/ครุภัณฑ์ อ่านอย่างเดียว) + วันที่ = วันนี้', await T(page, '.hform input.ro').count() === 3 && await page.inputValue('.hform input.ro >> nth=2') === 'FE-21/A' && await page.inputValue('.hform input[type=date]') === '2026-11-15');
  await page.click('.hform button[type=submit]'); await page.waitForTimeout(150);
  ok('ตรวจช่องจำเป็น: แจ้งช่องที่ขาด ไม่ส่งข้อมูล', /ยังบันทึกไม่ได้/.test(await text(page, '.hform-msg')) && await T(page, '.hform [aria-invalid="true"]').count() === 3 && log.posts.length === 0);
  const fill = async (label, v) => page.fill('.hform-f:has(label:has-text("' + label + '")) input', v);
  await fill('สารเคมีที่เติม', 'CO2'); await fill('น้ำหนักก่อนเติม', '9'); await fill('น้ำหนักหลังเติม', '5'); await fill('บริษัทที่เติม', 'บริษัททดสอบ'); await page.click('.hform button[type=submit]'); await page.waitForTimeout(150);
  ok('ตรวจกฎข้ามช่อง: น้ำหนักหลังเติมน้อยกว่าก่อนเติม', /ต้องไม่น้อยกว่าน้ำหนักก่อนเติม/.test(await T(page, '.hform').innerText()));
  await fill('น้ำหนักหลังเติม', '10'); await page.click('.hform button[type=submit]'); await page.waitForTimeout(200);
  ok('ยังไม่ได้เชื่อมบริการบันทึก → บอกว่า “ยังไม่ได้บันทึก” ไม่ส่งข้อมูล ไม่ขึ้น “บันทึกแล้ว”', /ยังไม่ได้บันทึก/.test(await text(page, '.hform-msg')) && !/^บันทึกแล้ว/.test(await text(page, '.hform-msg')) && log.posts.length === 0 && log.ext.filter(u => /script\.google/.test(u)).length === 0);
  await page.screenshot({ path: OUT + '/14_form_refill_validation.png' });
  for (const f of ['form-clean', 'forms-radio']) { await page.goto(URL0 + '#' + f); await page.waitForSelector('.hform'); await page.click('.hform button[type=submit]'); await page.waitForTimeout(120); ok('แบบฟอร์ม ' + f + ': แสดงผลและตรวจข้อมูลได้', /ยังบันทึกไม่ได้/.test(await text(page, '.hform-msg'))); }
  await ctx.close();
  ({ ctx, page, log } = await newPage(browser, { cfg: { formApiUrl: BASE + '/mock-api/form' } })); await page.goto(URL0 + '#forms-radio'); await page.waitForSelector('.hform');
  await page.fill('.hform-f:has(label:has-text("ประเภทเหตุการณ์")) input', 'ทดสอบ (MOCK)'); await page.selectOption('.hform-f:has(label:has-text("สถานะ")) select', 'รับแจ้ง'); await page.click('.hform button[type=submit]'); await page.waitForTimeout(400);
  ok('[MOCK บริการบันทึก] ตอบ ok → “บันทึกแล้ว” พร้อมเลขอ้างอิง (ส่งไปที่ mock เท่านั้น)', /บันทึกแล้ว · เลขอ้างอิง MOCK-REF-1/.test(await text(page, '.hform-msg')) && log.posts.length === 1); await ctx.close();
  ({ ctx, page, log } = await newPage(browser, { cfg: { formApiUrl: BASE + '/mock-api/form' }, formStatus: 500 })); await page.goto(URL0 + '#forms-radio'); await page.waitForSelector('.hform');
  await page.fill('.hform-f:has(label:has-text("ประเภทเหตุการณ์")) input', 'x'); await page.selectOption('.hform-f:has(label:has-text("สถานะ")) select', 'รับแจ้ง'); await page.click('.hform button[type=submit]'); await page.waitForTimeout(400);
  ok('[MOCK บริการบันทึก 500] → “ยังไม่ได้บันทึก” และข้อมูลที่กรอกยังอยู่', /ยังไม่ได้บันทึก/.test(await text(page, '.hform-msg')) && await page.inputValue('.hform-f:has(label:has-text("ประเภทเหตุการณ์")) input') === 'x'); await ctx.close();

  // ===== H) ผู้ช่วย AI =====
  ({ ctx, page, log } = await newPage(browser)); await page.goto(URL0); await page.waitForSelector('#chatFab');
  await page.click('#chatFab'); await page.waitForTimeout(200);
  ok('ผู้ช่วย AI (ค่าเริ่มต้น): เปิดหน้าต่างได้ แจ้งว่ายังเชื่อมต่อไม่ได้ ช่องพิมพ์ปิด ไม่มีคำตอบจำลอง', /ยังเชื่อมต่อผู้ช่วย AI ไม่ได้/.test(await text(page, '.chat-log')) && await T(page, '.chat-form textarea').isDisabled() && log.posts.length === 0);
  await page.screenshot({ path: OUT + '/15_chat_not_connected.png' }); await page.keyboard.press('Escape'); ok('ปิดด้วย Esc', await T(page, '#chatPanel').isHidden()); await ctx.close();
  ({ ctx, page, log } = await newPage(browser, { cfg: { aiApiUrl: BASE + '/mock-api/chat' }, chatStatus: 500 })); await page.goto(URL0); await page.waitForSelector('#chatFab'); await page.click('#chatFab');
  await page.fill('.chat-form textarea', 'อุบัติเหตุเดือนนี้กี่ครั้ง'); await page.keyboard.press('Enter'); await page.waitForSelector('.chat-m.err');
  ok('[MOCK AI 500] แสดงข้อผิดพลาด + ปุ่มลองใหม่', /ตอบกลับผิดพลาด/.test(await text(page, '.chat-m.err')));
  await page.click('.chat-m.err button'); await page.waitForSelector('.chat-m.ai:not(.wait):not(.err) >> nth=1');
  const sent = log.posts[log.posts.length - 1];
  ok('[MOCK AI] ลองใหม่สำเร็จ: คำตอบ + แหล่งข้อมูล/เวลา · ส่งเฉพาะคำถาม ประวัติ และช่วงเวลา (ไม่มีข้อมูลสถิติหรือรายบุคคล)', /คำตอบสมมติ \(MOCK\)/.test(await text(page, '.chat-log')) && /ที่มา: รายงานเหตุการณ์ · ข้อมูล ณ/.test(await text(page, '.chat-log')) && sent.action === 'chat' && Object.keys(sent).sort().join() === 'action,chatHistory,context,userMessage' && sent.context.today === '2026-11-15' && sent.context.period === 'today');
  await page.fill('.chat-form textarea', 'ถามต่อ'); await page.keyboard.press('Enter'); await page.waitForTimeout(500);
  ok('[MOCK AI] ถามต่อเนื่อง: ส่งประวัติก่อนหน้าไปด้วย', log.posts[log.posts.length - 1].chatHistory.length === 2);
  await page.screenshot({ path: OUT + '/16_chat_MOCK_reply.png' }); await ctx.close();
  // หุ่นยนต์ผู้ช่วย: รูปโหลดได้ (ฝังในไฟล์ Preview) · ปิดหน้าต่างแชต ≠ ซ่อนปุ่ม · ซ่อนแล้วจำไว้ · เปิดกลับจากหน้าตั้งค่า · โหมดปุ่มข้อความ
  ({ ctx, page, log } = await newPage(browser, { cfg: { aiApiUrl: BASE + '/mock-api/chat' } })); await page.goto(URL0); await page.waitForSelector('#chatFab');
  ok('หุ่นยนต์ผู้ช่วย: รูปโหลดสำเร็จ (object-fit: contain) + ป้าย “ถาม AI” + aria-label', await page.evaluate(() => { const i = document.querySelector('#chatFab .fab-bot'); return i.complete && i.naturalWidth === 256 && getComputedStyle(i).objectFit === 'contain'; }) && /ถาม AI/.test(await text(page, '#chatFab')) && !!(await T(page, '#chatFab').getAttribute('aria-label')));
  { const b = await T(page, '#chatFab').boundingBox(); ok('หุ่นยนต์ผู้ช่วย: ขนาดกดง่าย (≥ 44px)', b.width >= 44 && b.height >= 44); }
  ok('หุ่นยนต์ผู้ช่วย: ไม่เปิดหน้าต่างเอง', await T(page, '#chatPanel').isHidden());
  await page.focus('#chatFab'); await page.keyboard.press('Enter'); await page.waitForTimeout(200); ok('หุ่นยนต์ผู้ช่วย: เปิดด้วยแป้นพิมพ์ได้ + รูปหุ่นยนต์ที่หัวหน้าต่างแชต', await T(page, '#chatPanel').isVisible() && await page.evaluate(() => document.querySelector('.chat-ava').naturalWidth > 0));
  await page.click('.chat-x'); await page.waitForTimeout(150); ok('ปิดหน้าต่างแชต → ปุ่มหุ่นยนต์ยังอยู่', await T(page, '#chatPanel').isHidden() && await T(page, '#chatFab').isVisible());
  await page.click('#chatFab'); await page.click('.chat-hide'); await page.waitForTimeout(150); ok('ซ่อนปุ่ม → ปุ่มลอยหายและหน้าต่างปิด', await T(page, '#chatFab').isHidden() && await T(page, '#chatPanel').isHidden());
  await page.reload(); await page.waitForTimeout(600); ok('ซ่อนปุ่ม: จำไว้หลังโหลดหน้าใหม่ (เบราว์เซอร์เดิม)', await T(page, '#chatFab').isHidden());
  await page.goto(URL0 + '#settings'); await page.waitForSelector('#set-ai-fab'); await page.click('#set-ai-fab button:has-text("ปุ่มข้อความ")'); await page.waitForTimeout(200);
  ok('เปิดกลับจากหน้าตั้งค่า: โหมดปุ่มข้อความ “ถาม AI” (ไม่มีรูป)', await T(page, '#chatFab').isVisible() && await page.evaluate(() => getComputedStyle(document.querySelector('#chatFab .fab-bot')).display === 'none'));
  await page.click('#set-ai-fab button:has-text("หุ่นยนต์")'); await page.waitForTimeout(200); ok('กลับเป็นโหมดหุ่นยนต์ได้', await page.evaluate(() => getComputedStyle(document.querySelector('#chatFab .fab-bot')).display === 'block'));
  await page.emulateMedia({ reducedMotion: 'reduce' }); ok('prefers-reduced-motion → ไม่มีภาพเคลื่อนไหว', await page.evaluate(() => getComputedStyle(document.querySelector('#chatFab .fab-bot')).animationName === 'none'));
  await page.screenshot({ path: OUT + '/16b_robot_fab.png' }); await ctx.close();

  // ===== I) Lost & Found =====
  ({ ctx, page, log } = await newPage(browser)); tx = await open(page, 'lostfound');
  ok('Lost & Found (ค่าเริ่มต้น): ไม่เรียก API และไม่มีรายการ/รูป', log.lf === 0 && await T(page, '.lf-item').count() === 0 && /แสดงเมื่อเปิดผ่านระบบภายใน/.test(tx)); await ctx.close();
  ({ ctx, page, log } = await newPage(browser, { cfg: { internalMode: true } })); await page.goto(URL0 + '#lostfound'); await page.waitForSelector('.lf-item', { timeout: 8000 }).catch(() => {}); await page.waitForTimeout(500);
  ok('[MOCK API] Lost & Found โหมดภายใน: 20/หน้า จาก 47 · ภาพเสีย/ไม่มีภาพมีข้อความ', await T(page, '.lf-item').count() === 20 && /47 รายการ/.test(await T(page, '#lfList').innerText()) && /โหลดภาพไม่ได้/.test(await T(page, '#lfList').innerText()) && /ไม่มีภาพประกอบ/.test(await T(page, '#lfList').innerText()));
  await page.click('.lf-pic >> nth=0'); await page.waitForTimeout(200); ok('[MOCK รูป] Lost & Found: ภาพขยาย', await T(page, '.lightbox').count() === 1); await ctx.close();

  // ===== J) ทุกเมนู + หน้าที่ยังเป็นหน้าสำรอง =====
  ({ ctx, page, log } = await newPage(browser)); await page.goto(URL0); await page.waitForSelector('.now');
  const pages = Array.from(new Set(await page.evaluate(() => Array.from(document.querySelectorAll('#nav a[href^="#"]')).map(a => a.getAttribute('href').slice(1))))); const bad = [], stub = [];
  for (const h of pages) { await page.goto(URL0 + '#' + h); await page.waitForTimeout(260); const t = await T(page, '#view').innerText(); if (/แสดงหน้านี้ไม่สำเร็จ/.test(t) || t.trim().length < 40) bad.push(h); if (await T(page, '.stub').count() || /ยังไม่ได้ย้ายมาแสดงในระบบใหม่|ยังใช้งานในระบบใหม่ไม่ได้/.test(t)) stub.push(h); }
  ok('ทุกหน้าในเมนูแสดงผลได้ (' + pages.length + ' หน้า)', bad.length === 0, bad.join(','));
  ok('ไม่มีหน้าใดในเมนูเป็นหน้าสำรอง “ยังไม่ได้ย้าย”', stub.length === 0, stub.join(','));
  ok('ไม่มี Console/Page error (ทุกเมนู)', sysErrors(log).length === 0, sysErrors(log).slice(0, 3).join(' || '));
  results.push('INFO ทรัพยากรภายนอกที่เครื่องทดสอบบล็อก: ' + Array.from(new Set(log.ext.map(u => new URL(u).host))).join(', ')); await ctx.close();

  // ===== K) มือถือ 390×844 =====
  ({ ctx, page, log } = await newPage(browser, { ctx: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } }));
  await page.goto(URL0); await page.waitForSelector('.now'); await page.waitForTimeout(900);
  const overflow = async () => page.evaluate(() => { const w = document.documentElement.clientWidth; return Array.from(document.querySelectorAll('#view *')).filter(n => { const r = n.getBoundingClientRect(); return r.width > 0 && (r.right > w + 1 || r.left < -1) && !n.closest('.tbl-wrap, .jump, .leaflet-container, svg, .chips'); }).slice(0, 4).map(n => n.className || n.tagName).join(','); });
  ok('มือถือ หน้าแรก: ไม่ล้นจอ · ไม่มีตาราง · 8 การ์ด', (await overflow()) === '' && await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1) && await T(page, '#view table').count() === 0 && await T(page, '.now').count() === 8, await overflow());
  await page.screenshot({ path: OUT + '/17_mobile_dashboard_top.png' }); await page.screenshot({ path: OUT + '/18_mobile_dashboard_full.png', fullPage: true });
  const fabBox = await T(page, '#chatFab').boundingBox(); ok('มือถือ: ปุ่มผู้ช่วย AI (หุ่นยนต์ + ถาม AI) อยู่มุมล่างขวา ไม่ทับการ์ดเมื่อเลื่อนสุด', fabBox.x > 290 && fabBox.x + fabBox.width >= 370 && fabBox.y + fabBox.height >= 820 && await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(0, document.body.scrollHeight); const f = document.getElementById('chatFab').getBoundingClientRect(), last = Array.from(document.querySelectorAll('.trend')).pop().getBoundingClientRect(); return last.bottom <= f.top + 2; }));
  ok('มือถือ: เลื่อนลงอ่านข้อมูล → ปุ่มผู้ช่วย AI หลบออก (ไม่บังตัวเลขในการ์ด) · เลื่อนขึ้น → กลับมา', await page.evaluate(async () => { const f = document.getElementById('chatFab'), w = (ms) => new Promise(r => setTimeout(r, ms));
    window.scrollTo(0, 0); await w(120); const top = !f.classList.contains('fab-away'); window.scrollTo(0, 500); await w(120); window.scrollTo(0, 900); await w(350); const away = f.classList.contains('fab-away') && getComputedStyle(f).pointerEvents === 'none' && +getComputedStyle(f).opacity < 0.05;
    window.scrollTo(0, 820); await w(350); const back = !f.classList.contains('fab-away'); return top && away && back; }));
  await page.evaluate(() => window.scrollTo(0, 0)); await page.tap('#chatFab'); await page.waitForTimeout(250);
  ok('มือถือ: หน้าต่างผู้ช่วย AI เป็นแผ่นล่างเต็มความกว้าง ปิดได้', (await T(page, '#chatPanel').boundingBox()).width >= 388); await page.tap('.chat-x');
  const c2 = T(page, '.trend >> nth=0').locator('g.col').nth(2); await c2.scrollIntoViewIfNeeded(); await c2.tap(); await page.waitForTimeout(200); const tb = await T(page, '#tip').boundingBox();
  ok('มือถือ: แตะแท่งแล้ว Tooltip อยู่ในจอ และยังไม่เปลี่ยนหน้า', tb && tb.x >= 0 && tb.x + tb.width <= 391 && !page.url().endsWith('#traffic'));
  await page.tap('#navToggle'); await page.waitForTimeout(300); ok('มือถือ: Drawer เปิด', await page.evaluate(() => document.getElementById('app').classList.contains('open'))); await page.keyboard.press('Escape');
  for (const h of ['report-monthly', 'safety', 'vehicle-fleet', 'form-clean']) { await page.goto(URL0 + '#' + h); await page.waitForTimeout(900); ok('มือถือ ' + h + ': ไม่ล้นจอ', (await overflow()) === '' && await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), await overflow()); if (h === 'safety') await page.screenshot({ path: OUT + '/19_mobile_fire_MOCKDATA.png' }); if (h === 'report-monthly') await page.screenshot({ path: OUT + '/20_mobile_report_monthly.png' }); }
  ok('ไม่มี Console/Page error (มือถือ)', sysErrors(log).length === 0, sysErrors(log).slice(0, 2).join(' || ')); await ctx.close();

  // ===== รอบ 14 · P1b: แบบทดสอบหมวกนิรภัยเป็น “ลิงก์ระบบ” — ไม่ขึ้น “ไม่มีข้อมูลยืนยัน” และไม่ถูกนับเป็นระบบที่เชื่อมต่อไม่ได้ =====
  ({ ctx, page, log } = await newPage(browser)); await page.goto(URL0 + '#gate'); await page.waitForSelector('.sys-fold', { timeout: 8000 }).catch(() => {}); await page.waitForTimeout(500);
  { const r = await page.evaluate(() => { const card = Array.from(document.querySelectorAll('.card.sys')).find((c) => /แบบทดสอบโครงการรณรงค์สวมหมวกนิรภัย/.test(c.textContent)); const fold = card && card.closest('.sys-fold');
      return card ? { pill: card.querySelector('.pill').textContent, na: !!card.querySelector('.kpi-na'), link: !!card.querySelector('a.btn'), foldPill: fold && fold.querySelector('.fold-h .pill') ? fold.querySelector('.fold-h .pill').textContent : '' } : null; });
    ok('[รอบ 14·P1b] แบบทดสอบหมวกนิรภัย: ป้าย “ลิงก์ระบบ” + ปุ่มเปิดแบบทดสอบ · ไม่ขึ้น “ไม่มีข้อมูลยืนยัน” · หัวกลุ่มไม่นับเป็นระบบที่เชื่อมต่อไม่ได้', r && /ลิงก์ระบบ/.test(r.pill) && !r.na && r.link && !/เชื่อมต่อไม่ได้/.test(r.foldPill), JSON.stringify(r)); }
  await ctx.close();

  // ===== L) index.html (ไฟล์แยก) =====
  ({ ctx, page, log } = await newPage(browser)); await page.goto(BASE + '/index.html'); await page.waitForSelector('.now'); await T(page, '.trend .dash-map').scrollIntoViewIfNeeded(); await page.waitForSelector('.trend .leaflet-tile', { timeout: 8000 }).catch(() => {});
  ok('[MOCK ไทล์] index.html (ไฟล์แยก โหลด Leaflet จาก assets/vendor) ทำงาน', await T(page, '.now').count() === 8 && await T(page, '.trend .leaflet-tile').count() > 0); await ctx.close();

  await browser.close();
  console.log(results.join('\n')); console.log('\nรวม ' + results.filter(r => !r.startsWith('INFO')).length + ' ข้อ · ไม่ผ่าน ' + fails);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log(results.join('\n')); console.error('TEST CRASH', e); process.exit(2); });
