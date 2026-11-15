// tests/preview.browser.test.js — ตรวจ Preview ด้วย Chrome (headless)
// วิธีใช้: python3 -m http.server 8765 --bind 127.0.0.1  (ที่โฟลเดอร์หลัก) แล้ว  node tests/preview.browser.test.js http://127.0.0.1:8765
// ข้อจำกัด: เครื่องทดสอบออกอินเทอร์เน็ตไม่ได้ — ไทล์แผนที่ รูป และ API Lost & Found ในไฟล์นี้เป็น MOCK ทั้งหมด (ข้อที่ขึ้นต้น [MOCK …])
//           ผลกับไทล์ OpenStreetMap จริงและ API/รูปจริง ตรวจแยกในเบราว์เซอร์ที่ออกอินเทอร์เน็ตได้ — ดู docs/ข้อมูลระบบเพิ่มเติม.md ข้อ 10
// ไฟล์นี้ไม่ส่งข้อมูลใดไปยังระบบจริง
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/npm-tools/node_modules/playwright'); }
const { chromium } = pw;
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const fs = require('fs');
const BASE = process.argv[2] || 'http://127.0.0.1:8765';
const OUT = process.env.SHOTS || path.join(require('os').tmpdir(), 'hub-preview-shots');
fs.mkdirSync(OUT, { recursive: true });
const TILE = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mPcvn37fwAHMwLZ0fVh0gAAAABJRU5ErkJggg==', 'base64');
const results = []; let fails = 0;
const ok = (name, cond, info) => { results.push((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' — ' + info : '')); if (!cond) fails++; };

async function newPage(browser, opts, mode) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  const log = { errors: [], tiles: [], lf: 0, ext: [] };
  page.on('console', m => { if (m.type() === 'error') log.errors.push(m.text()); });
  page.on('pageerror', e => log.errors.push('PAGEERROR ' + e.message));
  await page.route('**/*', route => {
    const u = route.request().url();
    if (u.startsWith(BASE) || u.startsWith('file:') || u.startsWith('data:')) return route.continue();
    if (u.includes('tile.openstreetmap.org')) {
      const h = route.request().headers(); log.tiles.push({ u, referer: h['referer'] || '', cc: h['cache-control'] || '', pragma: h['pragma'] || '' });
      if (mode === 'tiles403') return route.fulfill({ status: 403, contentType: 'image/png', body: TILE, headers: { 'access-control-allow-origin': '*' } });
      return route.fulfill({ status: 200, contentType: 'image/png', body: TILE, headers: { 'access-control-allow-origin': '*' } });
    }
    if (u.includes('script.google.com')) { log.lf++; return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ success: true, generatedAt: new Date().toISOString(),
      records: Array.from({ length: 47 }, (_, i) => ({ type: ['สิ่งของสูญหาย', 'พบสิ่งของ', 'รับของคืน'][i % 3], title: 'รายการสมมติ ' + (i + 1) + ' (MOCK)', location: 'สถานที่สมมติ ' + (i + 1), reportedAt: '2026-11-0' + (1 + i % 9) + 'T03:00:00.000Z', status: 'รอดำเนินการ', refCode: 'MOCK-' + i, images: i % 3 === 0 ? ['MOCKMOCKMOCKMOCKMOCKMOCK' + i] : [] })) }) }); }
    if (u.includes('drive.google.com/thumbnail')) return u.includes('MOCK6') ? route.fulfill({ status: 404, body: '' }) : route.fulfill({ status: 200, contentType: 'image/png', body: TILE });
    log.ext.push(u); return route.abort();
  });
  return { ctx, page, log };
}
const T = (page, sel) => page.locator(sel);

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });

  // ---------- A) เดสก์ท็อป ผ่าน HTTP (ไทล์ = MOCK) ----------
  let { ctx, page, log } = await newPage(browser, { viewport: { width: 1440, height: 900 }, timezoneId: 'America/New_York', locale: 'en-US' });
  await page.goto(BASE + '/dist/preview.html'); await page.waitForSelector('.rep');
  await page.waitForTimeout(1200);
  ok('เปิดมาที่ Dashboard', (await page.title()).includes('ระบบงานจราจร') && await T(page, '.dash-head h1').count() === 1);
  const ids = await page.$$eval('.rep', n => n.map(x => x.id));
  ok('ลำดับหมวดบนหน้าแรก', ids.join(',') === 'sec-incidents,sec-lostfound,sec-gate,sec-map,sec-anywheel,sec-tram,sec-tram-dept,sec-cctv,sec-parking,sec-guard', ids.join(','));
  const tilesOf = async id => page.$$eval('#' + id + ' .tile', n => n.map(x => x.innerText.replace(/\s+/g, ' ').trim()));
  const inc = await tilesOf('sec-incidents');
  ok('เหตุการณ์ 68 / 25 / 12 / 19 / ผู้บาดเจ็บ 39', /68/.test(inc[0]) && /25/.test(inc[1]) && /12/.test(inc[2]) && /19/.test(inc[3]) && /39/.test(inc[4]), inc.slice(0, 5).join(' | '));
  ok('ผู้เสียชีวิต = ไม่มีข้อมูลยืนยัน', /ไม่มีข้อมูลยืนยัน/.test(inc[5]));
  const lf = await tilesOf('sec-lostfound');
  ok('Lost & Found 670 / 413 / 140 / 161 / 510', /670/.test(lf[0]) && /413/.test(lf[1]) && /140/.test(lf[2]) && /161/.test(lf[3]) && /510/.test(lf[4]), lf.join(' | '));
  const gate = await tilesOf('sec-gate');
  ok('รถเข้า 350,246 / 104,391 / 73,591 / 39 วัน / รถออกไม่มีข้อมูล', /350,246/.test(gate[0]) && /104,391/.test(gate[1]) && /73,591/.test(gate[2]) && /39/.test(gate[3]) && /ยังไม่มีข้อมูลยืนยัน/.test(gate[4]), gate.join(' | '));
  ok('ป้าย “มีเฉพาะจำนวนรถเข้า”', (await T(page, '#sec-gate .rep-h .tag').innerText()).includes('มีเฉพาะจำนวนรถเข้า'));
  const aw = await tilesOf('sec-anywheel');
  ok('Anywheel 320,918 ครั้ง / 441,315 กม.', /320,918/.test(aw[0]) && /441,315/.test(aw[1]), aw.join(' | '));
  const tram = await tilesOf('sec-tram');
  ok('รถราง 403 งาน / 676 รอบ / 3,815 กม. / 459 / 482.2 ชม.', /403/.test(tram[0]) && /676/.test(tram[1]) && /3,815/.test(tram[2]) && /459/.test(tram[3]) && /482\.2/.test(tram[4]), tram.join(' | '));
  ok('รถรางแยกส่วนงาน ต.ค.: รวม 33 งาน 58 รอบ', /33.*58/.test((await T(page, '#sec-tram-dept tfoot').innerText()).replace(/\s+/g, ' ')));
  const cctv = await tilesOf('sec-cctv');
  ok('CCTV 11 + MLC/LA/PMH ยังไม่มีข้อมูล', /11/.test(cctv[0]) && cctv.filter(x => /ยังไม่มีข้อมูล/.test(x)).length === 3, cctv.join(' | '));
  const pk = await tilesOf('sec-parking');
  ok('เรือนไทย 369 ชุด', pk.some(x => /แบบสำรวจเรือนไทย 369/.test(x)), pk.join(' | '));
  ok('ทุกหมวดมีตารางหรือกราฟ', (await page.$$eval('.rep', n => n.every(x => x.querySelector('table, svg, .lf-map')))));
  ok('ไม่มีคำอธิบายเชิงเทคนิคบนหน้าแรก (นิยาม:/IMPORTRANGE/คอลัมน์)', !/นิยาม:|IMPORTRANGE|STAGING|Geo_Status|คอลัมน์ “/.test(await T(page, '#view').innerText()));
  await page.screenshot({ path: OUT + '/01_desktop_dashboard_top.png' });
  // แผนที่บน Dashboard
  await T(page, '#sec-map').scrollIntoViewIfNeeded(); await page.waitForSelector('#sec-map .lf-map .leaflet-tile', { timeout: 8000 }).catch(() => {});
  ok('[MOCK ไทล์] แผนที่บน Dashboard เป็น Leaflet มีไทล์และจุด', await T(page, '#sec-map .leaflet-tile').count() > 0 && await T(page, '#sec-map .leaflet-interactive, #sec-map .lf-cl').count() > 0,
    'tiles ' + await T(page, '#sec-map .leaflet-tile').count() + ' markers ' + await T(page, '#sec-map .leaflet-interactive, #sec-map .lf-cl').count());
  ok('เครดิต OpenStreetMap พร้อมลิงก์', await T(page, '#sec-map .leaflet-control-attribution a[href*="openstreetmap.org/copyright"]').count() === 1);
  ok('คำขอไทล์มี Referer และไม่ส่ง no-cache', log.tiles.length > 0 && log.tiles.every(t => t.referer.startsWith('http://127.0.0.1') && !/no-cache/.test(t.cc + t.pragma)), log.tiles.length + ' คำขอ · referer ' + (log.tiles[0] || {}).referer);
  await page.screenshot({ path: OUT + '/02_desktop_dashboard_full.png', fullPage: true });
  await T(page, '#sec-map').screenshot({ path: OUT + '/03_desktop_dashboard_map_MOCKTILES.png' });
  // ตัวกรองเดือน
  await page.selectOption('.dash-head select[aria-label="เดือนเริ่มต้น"]', '2026-10'); await page.waitForTimeout(400);
  const inc2 = await tilesOf('sec-incidents'), aw2 = await tilesOf('sec-anywheel'), tr2 = await tilesOf('sec-tram');
  ok('กรอง ต.ค.–พ.ย.: เหตุการณ์ 34, Anywheel ไม่มีข้อมูล, รถราง 33 งาน', /34/.test(inc2[0]) && /ไม่มีข้อมูลในช่วงที่เลือก/.test(aw2[0]) && /33/.test(tr2[0]), [inc2[0], aw2[0], tr2[0]].join(' | '));
  await page.click('.dash-head .btn-ghost'); await page.waitForTimeout(300);
  // Tooltip
  const col = T(page, '#sec-incidents .chart-box g.col').nth(2); await col.scrollIntoViewIfNeeded(); await col.hover(); await page.waitForTimeout(150);
  const tip = (await T(page, '#tip').innerText()).replace(/\s+/g, ' ');
  ok('Tooltip แสดงเดือน ประเภท ค่า หน่วย', /กันยายน 2569/.test(tip) && /รับส่งผู้ป่วย 14 เหตุการณ์/.test(tip) && /รวม 25 เหตุการณ์/.test(tip), tip);
  // ทางลัด + ลิงก์ตรง + ย้อนกลับ
  await page.mouse.move(0, 0); await page.click('.jump a:text-is("รถราง")'); await page.waitForTimeout(1600);
  ok('ทางลัดเลื่อนไปหมวดรถราง และ URL เปลี่ยน', page.url().endsWith('#dashboard/tram') && (await T(page, '#sec-tram').boundingBox()).y < 200, page.url().split('#')[1]);
  await page.click('#sec-tram .more'); await page.waitForTimeout(300);
  ok('“ดูรายละเอียด” เปิดหน้าในระบบใหม่', page.url().endsWith('#tram') && (await T(page, '.ph h1').innerText()).includes('รถราง'));
  await page.goBack(); await page.waitForTimeout(500);
  ok('ปุ่มย้อนกลับกลับมาหมวดเดิม', page.url().endsWith('#dashboard/tram') && await T(page, '#sec-tram').count() === 1);
  await page.goto(BASE + '/dist/preview.html#dashboard/lostfound'); await page.waitForSelector('.rep'); await page.waitForTimeout(700);
  ok('ลิงก์ตรง #dashboard/lostfound', (await T(page, '#sec-lostfound').boundingBox()).y < 220);
  // แผนที่เต็มหน้า
  await page.goto(BASE + '/dist/preview.html#accident-map'); await page.waitForSelector('#mapSvg .leaflet-tile', { timeout: 8000 }).catch(() => {}); await page.waitForTimeout(500);
  ok('[MOCK ไทล์] แผนที่เต็มหน้าเป็น Leaflet', await T(page, '#mapSvg .leaflet-tile').count() > 0);
  ok('37 จุด + ตารางรายชื่อจุด', /37 จุด/.test(await T(page, '#mapNote').innerText()) && await T(page, '#mapList tbody tr').count() === 37);
  await page.click('#mapTools .chip:has-text("ทั่วไป")'); await page.waitForTimeout(300);
  ok('กรองประเภท “ทั่วไป” = 12 จุด', await T(page, '#mapList tbody tr').count() === 12);
  await page.click('#mapTools .chip:has-text("ทุกประเภท")'); await page.click('#mapList tbody tr:nth-child(4) .linkish'); await page.waitForTimeout(400);
  ok('กดจุดในตาราง → แสดงรายละเอียด + ปุ่ม Google Maps', await T(page, '#mapDetail a[href*="google.com/maps"]').count() === 1);
  const z0 = await page.evaluate(() => document.querySelector('#mapSvg .leaflet-proxy') ? 1 : 0);
  await page.click('#mapSvg .leaflet-control-zoom-in'); await page.waitForTimeout(500);
  ok('ปุ่มซูมทำงาน', z0 === 1 && await T(page, '#mapSvg .leaflet-tile').count() > 0);
  ok('ไม่มีชื่อ/เบอร์/รูปในหน้าแผนที่', !/ผู้แจ้ง|โทร|เบอร์/.test(await T(page, '#view').innerText()) && await T(page, '#view img:not(.leaflet-tile)').count() === 0);
  await page.screenshot({ path: OUT + '/04_desktop_map_page_MOCKTILES.png' });
  // หน้ารายละเอียด
  const visit = async (h, sel) => { await page.goto(BASE + '/dist/preview.html#' + h); await page.waitForSelector(sel || '.ph'); await page.waitForTimeout(350); return (await T(page, '#view').innerText()); };
  let tx = await visit('report-monthly', '.rep');
  ok('รายงานประจำเดือน แสดงรายงานในระบบใหม่ (ไม่ใช่ทางเข้าระบบเดิม)', await T(page, '.rep').count() === 10 && await T(page, '.chips .chip').count() === 11 && !/เปิดระบบเดิม/.test(tx));
  await page.click('.chips .chip:has-text("ต.ค. 69")'); await page.waitForTimeout(400);
  ok('เลือกเดือน ต.ค. 69: เหตุการณ์ 21 / L&F 124 / รถราง 33', /21/.test((await tilesOf('sec-incidents'))[0]) && /124/.test((await tilesOf('sec-lostfound'))[0]) && /33/.test((await tilesOf('sec-tram'))[0]));
  await page.screenshot({ path: OUT + '/05_desktop_report_monthly_oct.png' });
  await page.click('.ph .btn-ghost');
  tx = await visit('parking'); ok('ข้อมูลการจอดรถ: มีสถิติเรือนไทย 369 + ลานจอดปริญญา', /369/.test(tx) && /2,087/.test(tx)); await page.screenshot({ path: OUT + '/06_desktop_parking.png', fullPage: true });
  tx = await visit('grad-guard'); ok('GPS: 193 รายงาน, COMPLETE 193, ไม่มีพิกัดรายรายงาน', /193/.test(tx) && /สถานะบันทึกสมบูรณ์/.test(tx) && !/\b13\.7\d{3,}/.test(tx)); await page.screenshot({ path: OUT + '/07_desktop_gps.png', fullPage: true });
  tx = await visit('lostfound'); ok('Lost & Found (ค่าเริ่มต้น): ไม่เรียก API และไม่มีรายการ', log.lf === 0 && /แสดงเมื่อเปิดผ่านระบบภายใน/.test(tx) && await T(page, '.lf-item').count() === 0); await page.screenshot({ path: OUT + '/08_desktop_lostfound_public.png', fullPage: true });
  tx = await visit('tram'); ok('หน้ารถราง/Anywheel: ตาราง Anywheel มี ม.ค.–มิ.ย.', /มกราคม 2569/.test(tx) && /74,410/.test(tx) && /ไม่มีข้อมูล/.test(tx));
  tx = await visit('admin-info'); ok('ข้อมูลระบบเพิ่มเติม: มีนิยามที่ย้ายมา', /นิยาม วิธีนับ และข้อสังเกต/.test(tx) && /นิยาม:/.test(tx) && /Record_Status/.test(tx));
  for (const h of ['traffic', 'gate', 'cctv', 'vehicle', 'graduation', 'guard-scan', 'borrow', 'safety']) { tx = await visit(h); ok('หน้า ' + h + ' ไม่มีกล่องนิยาม/ข้อสังเกต', !/นิยาม:/.test(tx) && !/^ข้อสังเกต$/m.test(tx)); }
  const pending = [];
  for (const h of ['staff', 'staff-strategy', 'staff-ops', 'area-inspect', 'area-assist', 'area-traffic', 'vehicle-fleet', 'forms-radio', 'report-daily', 'report-radio', 'inspection-history']) { tx = await visit(h); if (/ยังไม่ได้ย้ายมาแสดงในระบบใหม่/.test(tx)) pending.push(h); }
  results.push('INFO หน้าที่ยังไม่ได้ย้าย (แสดงสถานะตรง ๆ): ' + pending.join(', '));
  await visit('report-daily'); await page.screenshot({ path: OUT + '/09_desktop_pending_page.png' });
  // ทุกเมนู: เปิดได้ ไม่มีข้อผิดพลาด
  const pages = await page.evaluate(() => Array.from(document.querySelectorAll('#nav a[href^="#"]')).map(a => a.getAttribute('href').slice(1)));
  let bad = [];
  for (const h of Array.from(new Set(pages))) { await page.goto(BASE + '/dist/preview.html#' + h); await page.waitForTimeout(250); if (/แสดงหน้านี้ไม่สำเร็จ/.test(await T(page, '#view').innerText())) bad.push(h); }
  ok('ทุกหน้าในเมนูแสดงผลได้ (' + new Set(pages).size + ' หน้า)', bad.length === 0, bad.join(','));
  ok('ไม่มี Console/Page error จากโค้ดของระบบ (เดสก์ท็อป)', log.errors.filter(e => !/net::ERR|Failed to load resource/.test(e)).length === 0, log.errors.filter(e => !/net::ERR|Failed to load resource/.test(e)).slice(0, 3).join(' || '));
  results.push('INFO ทรัพยากรภายนอกที่เครื่องทดสอบบล็อก (ฟอนต์/ตรา): ' + Array.from(new Set(log.ext.map(u => new URL(u).host))).join(', '));
  await ctx.close();

  // ---------- B) Lost & Found โหมดระบบภายใน (API + รูป = MOCK) ----------
  ({ ctx, page, log } = await newPage(browser, { viewport: { width: 1440, height: 900 } }));
  await page.addInitScript(() => { Object.defineProperty(window, 'HUB_CONFIG', { configurable: true, set(v) { v.internalMode = true; Object.defineProperty(window, 'HUB_CONFIG', { value: v, writable: true, configurable: true }); }, get() { return undefined; } }); });
  await page.goto(BASE + '/dist/preview.html#lostfound'); await page.waitForSelector('.lf-item', { timeout: 8000 }).catch(() => {}); await page.waitForTimeout(600);
  ok('[MOCK API] โหมดภายใน: รายการ 20/หน้า จาก 47', await T(page, '.lf-item').count() === 20 && /47 รายการ/.test(await T(page, '#lfList').innerText()));
  ok('[MOCK รูป] ภาพเสียแสดงข้อความ', /โหลดภาพไม่ได้/.test(await T(page, '#lfList').innerText()) && /ไม่มีภาพประกอบ/.test(await T(page, '#lfList').innerText()));
  await page.click('.lf-pic >> nth=0'); await page.waitForTimeout(200);
  ok('[MOCK รูป] ขยายภาพได้และปิดด้วย Esc', await T(page, '.lightbox').count() === 1); await page.keyboard.press('Escape');
  await page.fill('#lfList input[type=search]', 'สมมติ 12'); await page.waitForTimeout(600);
  ok('[MOCK API] ค้นหา', await T(page, '.lf-item').count() === 1);
  await page.screenshot({ path: OUT + '/10_lostfound_internal_MOCK.png' });
  await ctx.close();

  // ---------- C) ไทล์ถูกปฏิเสธ (403) → แผนผัง + ข้อความ ----------
  ({ ctx, page, log } = await newPage(browser, { viewport: { width: 1440, height: 900 } }, 'tiles403'));
  await page.goto(BASE + '/dist/preview.html#dashboard/map'); await page.waitForSelector('#sec-map .map-warn', { timeout: 8000 }).catch(() => {});
  ok('[MOCK 403] ไทล์ถูกปฏิเสธ → แจ้งเหตุผล + แผนผัง และเรียกไทล์เพียง 1 ครั้ง', await T(page, '#sec-map .map-warn').count() === 1 && await T(page, '#sec-map .map-mini svg circle').count() > 0 && log.tiles.length === 1, 'tile requests ' + log.tiles.length);
  await ctx.close();

  // ---------- D) เปิดจากไฟล์ (file://) ----------
  ({ ctx, page, log } = await newPage(browser, { viewport: { width: 1440, height: 900 } }));
  await page.goto('file://' + ROOT + '/dist/preview.html'); await page.waitForSelector('.rep'); await page.waitForTimeout(800);
  ok('file://: ไม่เรียกไทล์เลย และบอกเหตุผลชัดเจน', log.tiles.length === 0 && /เปิดจากไฟล์ในเครื่อง/.test(await T(page, '#sec-map').innerText()));
  await T(page, '#sec-map').screenshot({ path: OUT + '/11_file_mode_map_fallback.png' });
  await ctx.close();

  // ---------- E) มือถือ 390×844 (touch) ----------
  ({ ctx, page, log } = await newPage(browser, { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }));
  await page.goto(BASE + '/dist/preview.html'); await page.waitForSelector('.rep'); await page.waitForTimeout(1200);
  const over = await page.evaluate(() => { const w = document.documentElement.clientWidth; return Array.from(document.querySelectorAll('#view *')).filter(n => { const r = n.getBoundingClientRect(); return r.width > 0 && (r.right > w + 1 || r.left < -1) && !n.closest('.tbl-wrap, .jump, .leaflet-container, svg'); }).slice(0, 5).map(n => n.className || n.tagName); });
  ok('มือถือ: ไม่มีส่วนล้นจอ (ยกเว้นตาราง/ทางลัดที่เลื่อนแนวนอนได้)', over.length === 0 && await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), over.join(','));
  ok('มือถือ: มีครบ 10 หมวด', await T(page, '.rep').count() === 10);
  await page.screenshot({ path: OUT + '/12_mobile_dashboard_top.png' });
  await page.screenshot({ path: OUT + '/13_mobile_dashboard_full.png', fullPage: true });
  await page.tap('#navToggle'); await page.waitForTimeout(350);
  ok('มือถือ: Drawer เปิด', await page.evaluate(() => document.getElementById('app').classList.contains('open')));
  await page.screenshot({ path: OUT + '/14_mobile_drawer.png' });
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  const c2 = T(page, '#sec-lostfound .chart-box g.col').nth(8); await c2.scrollIntoViewIfNeeded(); await c2.tap(); await page.waitForTimeout(200);
  const tb = await T(page, '#tip').boundingBox();
  ok('มือถือ: แตะแท่งแล้ว Tooltip อยู่ในจอ', tb && tb.x >= 0 && tb.x + tb.width <= 391 && /กันยายน 2569/.test(await T(page, '#tip').innerText()), tb ? Math.round(tb.x) + '..' + Math.round(tb.x + tb.width) : 'no tip');
  ok('มือถือ: แตะครั้งแรกยังไม่เปลี่ยนหน้า', !page.url().endsWith('#lostfound'));
  await T(page, '#sec-map').scrollIntoViewIfNeeded(); await page.waitForTimeout(600);
  ok('[MOCK ไทล์] มือถือ: แผนที่บน Dashboard + คำแนะนำสองนิ้ว', await T(page, '#sec-map .leaflet-tile').count() > 0 && /สองนิ้ว/.test(await T(page, '#sec-map').innerText()));
  await T(page, '#sec-map').screenshot({ path: OUT + '/15_mobile_dashboard_map_MOCKTILES.png' });
  await page.goto(BASE + '/dist/preview.html#accident-map'); await page.waitForSelector('#mapSvg .leaflet-tile', { timeout: 8000 }).catch(() => {}); await page.waitForTimeout(400);
  await page.screenshot({ path: OUT + '/16_mobile_map_page_MOCKTILES.png', fullPage: true });
  await page.goto(BASE + '/dist/preview.html#grad-guard'); await page.waitForTimeout(500); await page.screenshot({ path: OUT + '/17_mobile_gps.png', fullPage: true });
  ok('ไม่มี Console/Page error จากโค้ดของระบบ (มือถือ)', log.errors.filter(e => !/net::ERR|Failed to load resource/.test(e)).length === 0, log.errors.filter(e => !/net::ERR|Failed to load resource/.test(e)).slice(0, 3).join(' || '));
  await ctx.close();

  // ---------- F) index.html (ไฟล์แยก) ผ่าน HTTP ----------
  ({ ctx, page, log } = await newPage(browser, { viewport: { width: 1280, height: 800 } }));
  await page.goto(BASE + '/index.html'); await page.waitForSelector('.rep'); await T(page, '#sec-map').scrollIntoViewIfNeeded(); await page.waitForSelector('#sec-map .leaflet-tile', { timeout: 8000 }).catch(() => {});
  ok('[MOCK ไทล์] index.html (โหลด Leaflet จาก assets/vendor) ทำงาน', await T(page, '.rep').count() === 10 && await T(page, '#sec-map .leaflet-tile').count() > 0);
  await ctx.close();

  await browser.close();
  console.log(results.join('\n')); console.log('\nรวม ' + results.filter(r => !r.startsWith('INFO')).length + ' ข้อ · ไม่ผ่าน ' + fails);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log(results.join('\n')); console.error('TEST CRASH', e); process.exit(2); });
