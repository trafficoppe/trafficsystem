/* tests/session.browser.test.js — ทดสอบหน้าเว็บ + บริการกลางตัวจริงร่วมกันบนเครื่อง (Chrome headless)
 * ใช้: sh tools/build_site.sh && node worker/tests/dev_server.mjs 8770 &  แล้ว  SHOTS=<โฟลเดอร์> node tests/session.browser.test.js http://localhost:8770
 * ของจริง: โค้ดหน้าเว็บ, โค้ดบริการ (Login/session/สิทธิ์/รายชื่อเวรใน SQLite) · ของจำลอง [MOCK]: Google Sheets, Drive, Workers AI, ไทล์แผนที่ (ถูกบล็อก), รหัสพนักงานและชื่อทั้งหมด */
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/npm-tools/node_modules/playwright'); }
const BASE = process.argv[2] || 'http://localhost:8770', SHOTS = process.env.SHOTS || '', fs = require('fs');
let n = 0, fails = 0; const ok = (name, cond, info) => { n++; if (!cond) fails++; console.log((cond ? 'PASS ' : 'FAIL ') + name + (cond || info === undefined ? '' : ' — ' + String(info).slice(0, 300))); };
const shot = async (p, name, full) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await p.screenshot({ path: SHOTS + '/' + name + '.png', fullPage: !!full }); } };
(async () => {
  const browser = await pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const mk = async (vp) => { const ctx = await browser.newContext({ viewport: vp || { width: 1440, height: 900 }, deviceScaleFactor: vp ? 2 : 1, isMobile: !!vp, hasTouch: !!vp }); const page = await ctx.newPage(); const log = { err: [], api: [] };
    page.on('pageerror', (e) => log.err.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) log.err.push(m.text()); });
    await page.route('**/*', (r) => { const u = r.request().url(); if (u.startsWith(BASE)) { if (u.includes('/api/')) log.api.push(r.request().method() + ' ' + u.slice(BASE.length)); return r.continue(); } return r.abort(); });
    return { ctx, page, log }; };
  const T = (p, s) => p.locator(s), txt = async (p, s) => (await p.locator(s).first().innerText()).replace(/\s+/g, ' ').trim();
  const login = async (p, code) => { await p.fill('#loginCode', code); await p.press('#loginCode', 'Enter'); };
  const go = async (p, h) => { await p.evaluate((x) => { location.hash = x; }, h); await p.waitForTimeout(500); };
  let { ctx, page, log } = await mk();

  // ---------- 1) ก่อน Login ----------
  await page.request.get(BASE + '/__test/today/off');            // เริ่มจากชุดข้อมูลจำลองมาตรฐาน (ไม่มีเหตุการณ์ของวันนี้)
  await page.goto(BASE + '/#staff'); await page.waitForSelector('#loginView');
  ok('ยังไม่ Login: เห็นเฉพาะหน้าเข้าสู่ระบบ ตัวระบบถูกซ่อน และไม่มีการเรียกข้อมูลภายใน', await T(page, '#app').isHidden() && !log.api.some((a) => /data|stats|roster|img|chat/.test(a)), log.api.join());
  ok('หน้า Login: ข้อความ 3 บรรทัดตามลำดับ + ตรา + ช่องรหัสพนักงาน + ปุ่ม', (await page.locator('.lg-title > span').allInnerTexts()).map((s) => s.replace(/\s+/g, ' ')).join('|') === 'ระบบฐานข้อมูล|งานจราจรและความปลอดภัย กองกายภาพและสิ่งแวดล้อม|มหาวิทยาลัยมหิดล' && await T(page, '.lg-logo').count() === 1 && (await txt(page, '.lg-form label')) === 'รหัสพนักงาน' && (await txt(page, '.lg-btn')) === 'เข้าสู่ระบบ');
  ok('ช่องรหัส: type=text + inputmode=numeric (ไม่ใช่ type=number)', await page.getAttribute('#loginCode', 'type') === 'text' && await page.getAttribute('#loginCode', 'inputmode') === 'numeric');
  await page.fill('#loginCode', ''); await page.type('#loginCode', '01a2-3'); ok('พิมพ์ตัวอักษรปน → เหลือเฉพาะตัวเลข และเลขศูนย์นำหน้ายังอยู่', await page.inputValue('#loginCode') === '0123');
  ok('ไม่มีด่านเครือข่าย (IP ภายนอก): หน้า Login ไม่มีคำเตือนเรื่องเครือข่าย/ผู้ดูแล', (await page.evaluate(() => document.getElementById('loginMsg').textContent)) === '' && !/เครือข่าย|IP/.test(await txt(page, '#loginView')));
  await shot(page, '01_login_desktop');
  await login(page, '9999'); await page.waitForFunction(() => /ไม่ถูกต้อง/.test(document.getElementById('loginMsg').textContent));
  ok('รหัสผิด → ข้อความทั่วไป ไม่บอกว่ามีใครในระบบ และยังไม่เข้า', (await txt(page, '#loginMsg')) === 'รหัสพนักงานไม่ถูกต้องหรือไม่มีสิทธิ์เข้าใช้งาน' && await T(page, '#app').isHidden());
  await login(page, '123'); await page.waitForTimeout(400); ok('รหัสที่ตัดเลขศูนย์นำหน้า (123) → ไม่ผ่าน', await T(page, '#loginView').count() === 1);
  await page.request.get(BASE + '/__test/source/down'); await page.waitForTimeout(100);
  // (แหล่งตรวจรหัสถูกแคช 5 นาทีในบริการ — กรณีอ่านไม่ได้ทดสอบที่ worker/tests/worker.test.mjs) 
  await page.request.get(BASE + '/__test/source/up');

  // ---------- 2) Login ครั้งเดียว ----------
  await login(page, '0123'); await page.waitForSelector('#userBox'); await page.waitForSelector('.it, .dv-err');
  ok('รหัสถูก + กด Enter → เข้าได้ทันที และกลับมาหน้าที่เปิดค้างไว้ (#staff) พร้อมรายชื่อจากบริการ', /#staff/.test(page.url()) && await T(page, '.it').count() === 3 && await T(page, '#loginView').count() === 0, page.url());
  ok('cookie เป็น HttpOnly (JavaScript ในหน้าอ่านไม่ได้) และไม่มีการเก็บสถานะ Login ใน storage', await page.evaluate(() => !/hub_s/.test(document.cookie) && !Object.keys(localStorage).concat(Object.keys(sessionStorage)).some((k) => /auth|login|session|code/i.test(k))));
  ok('แถบบนแสดงชื่อผู้ใช้ + ปุ่มออกจากระบบ', /ผู้ใช้สมมติ ก/.test(await txt(page, '#userBox')) && /ออกจากระบบ/.test(await txt(page, '#userBox')));
  ok('ไม่มีข้อความ “ต้องเข้าสู่ระบบภายในก่อน” ค้างในหน้าบุคลากร', !/ต้องเข้าสู่ระบบภายในก่อน/.test(await txt(page, '#view')));

  // ---------- 3) รายงานเหตุการณ์ ----------
  await go(page, 'traffic'); await page.waitForSelector('.kstrip');
  const order = await page.evaluate(() => [...document.querySelectorAll('#view > *')].map((e) => e.getAttribute('aria-label') || e.className));
  ok('ตำแหน่งบล็อก: หลังสรุปสถิติเดิม ก่อน “ระบบและแบบฟอร์มที่เกี่ยวข้อง”', order.indexOf('รายละเอียดรายงานเหตุการณ์') > 0 && order.indexOf('รายละเอียดรายงานเหตุการณ์') === order.length - 2 && /ระบบ/.test(order[order.length - 1]), order.join(' > '));
  const inner = await page.evaluate(() => [...document.querySelector('.incb').children].map((e) => e.className.split(' ')[0]));
  ok('ลำดับในบล็อก: ช่วงวันที่ → KPI → กราฟรายปี → รายละเอียด → แผนที่', inner.join() === 'incb-ctl,kstrips,,incb-h,incb-list,', inner.join());
  const ks = async () => (await page.locator('.kstrip').allInnerTexts()).map((s) => s.replace(/\s+/g, ' '));
  let k = await ks();
  ok('[MOCK ข้อมูล] KPI 5 กลุ่ม ทั้งช่วง: อุบัติเหตุ 6 (ถนน 4 ทั่วไป 2 ทำงาน 0) · บาดเจ็บ 5 (3/2/0) · ประเภท นศ.1 บุคลากร 1 ภายนอก 1 Outsource 1 ไม่ระบุ 1 · รับส่ง 2 ครั้ง · เสียชีวิต “ไม่พบในบันทึก”', k.length === 5 && /อุบัติเหตุทั้งหมด 6 ครั้ง บนถนน 4 ทั่วไป 2 ทำงาน 0/.test(k[0]) && /ผู้ได้รับบาดเจ็บทั้งหมด 5 คน บนถนน 3 ทั่วไป 2 ทำงาน 0/.test(k[1]) && /5 คน นักศึกษา 1 บุคลากร 1 ภายนอก 1 Outsource 1 ไม่ระบุ 1/.test(k[2]) && /รับส่งผู้ป่วย 2 ครั้ง นักศึกษา 1 บุคลากร 1 ภายนอก 0 Outsource 0/.test(k[3]) && /ผู้เสียชีวิต ไม่พบในบันทึก/.test(k[4]) && !/ผู้เสียชีวิต 0/.test(k[4]), k.join(' || '));
  ok('รายการ 10 เหตุการณ์ (หน้าละ 6) + แผนที่ 5 จุด + บอกเหตุที่ไม่มีพิกัด', /10 เหตุการณ์/.test(await txt(page, '.incb-list .lu-count')) && await T(page, '.incb-list .it').count() === 6 && /5 จุด[^·]*· อีก 1 เหตุไม่มีพิกัด/.test(await txt(page, '.incb figure:has(.incb-map) figcaption')), await txt(page, '.incb figure:has(.incb-map) figcaption'));
  ok('กราฟรายปี: เริ่มที่ พ.ศ. 2569 มีตัวเลือกปี แยกจากช่วงวันที่', /พ\.ศ\. 2569/.test(await txt(page, '.incb figure.chart figcaption')) && await T(page, '.incb-yr select option').count() >= 1);
  await shot(page, '02_incident_block', true);
  await page.fill('.incb-ctl input[aria-label="ตั้งแต่วันที่"]', '2026-11-01'); await page.dispatchEvent('.incb-ctl input[aria-label="ตั้งแต่วันที่"]', 'change'); await page.waitForTimeout(300); k = await ks();
  ok('เปลี่ยนช่วงวันที่ (พ.ย.) → KPI รายการ และแผนที่เปลี่ยนตามชุดเดียวกัน: อุบัติเหตุ 3 · บาดเจ็บ 1 · รับส่ง 1 · รายการ 6 · แผนที่ 2 จุด', /อุบัติเหตุทั้งหมด 3 ครั้ง บนถนน 2 ทั่วไป 1/.test(k[0]) && /ทั้งหมด 1 คน/.test(k[1]) && /รับส่งผู้ป่วย 1 ครั้ง/.test(k[3]) && /^6 เหตุการณ์/.test(await txt(page, '.incb-list .lu-count')) && /^2 จุด/.test((await txt(page, '.incb figure:has(.incb-map) figcaption')).replace(/^แผนที่จุดเกิดอุบัติเหตุ\s*/, '')), k[0] + ' | ' + await txt(page, '.incb figure:has(.incb-map) figcaption'));
  await page.click('.incb-ctl button:has-text("ทั้งช่วงข้อมูล")'); await page.waitForSelector('.kstrip');
  await page.selectOption('.incb-list select', 'อุบัติเหตุทั่วไป'); await page.waitForTimeout(300); k = await ks();
  ok('กรองประเภท “อุบัติเหตุทั่วไป” → รายการ 2 · แผนที่ 2 จุด · KPI ยังเป็นของช่วงวันที่', /^2 เหตุการณ์/.test(await txt(page, '.incb-list .lu-count')) && /แผนที่จุดเกิดอุบัติเหตุ 2 จุด/.test(await txt(page, '.incb figure:has(.incb-map) figcaption')) && /ทั้งหมด 6 ครั้ง/.test(k[0]));
  await page.click('.incb-list .it .it-b'); await page.waitForSelector('.dlg');
  ok('เปิดรายละเอียด: บุคคล (ไม่มีเบอร์โทร) + ภาพผ่านบริการภาพของระบบ', /รายละเอียดบุคคล|ผู้บาดเจ็บ\/ผู้ป่วย/.test(await txt(page, '.dlg')) && !/โทร|000/.test(await txt(page, '.dlg')) && /\/api\/img\?id=MOCKDRIVEFILEID/.test(await page.getAttribute('.dlg img', 'src')) && await page.evaluate(() => { const i = document.querySelector('.dlg img'); return i.complete && i.naturalWidth > 0; }));
  await page.click('.dlg .btn.sec');
  ok('สถิติสดจากบริการ: ยอดเหตุการณ์ของหน้าเปลี่ยนเป็นชุดที่อ่านสด (10 เหตุ) และมีเวลาอ่านล่าสุด', /เหตุการณ์ทั้งหมด\s*10/.test(await txt(page, '.kpis')) && /ตรวจข้อมูลล่าสุด/.test(await txt(page, '#stamp')), await txt(page, '.kpis'));
  await go(page, 'guard-central'); await page.waitForSelector('details.fold');
  const dt = await page.locator('details.fold').first();
  ok('“นิยามและที่มา” (หมวดควบคุมงาน รปภ.) เป็นแถบพับ ปิดเป็นค่าเริ่มต้น กดแล้วเปิด ใช้คีย์บอร์ดได้', await dt.getAttribute('open') === null && await (async () => { await dt.locator('summary').focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(150); return (await dt.getAttribute('open')) !== null; })());

  // ---------- 4) Lost & Found ----------
  await go(page, 'lostfound'); await page.waitForSelector('.dv[data-ds="lostfound"] .it');
  const lfc = async () => txt(page, '.dv[data-ds="lostfound"] .lu-count');
  ok('[MOCK ข้อมูล] Lost & Found: โหลดรายการทันทีหลัง Login (15 รายการ หน้าละ 12 เรียงล่าสุดก่อน)', /^15 รายการ/.test(await lfc()) && await T(page, '.dv[data-ds="lostfound"] .it').count() === 12 && /ชิ้นที่ 15/.test(await txt(page, '.dv[data-ds="lostfound"] .it')) && !/แสดงเมื่อเปิดผ่านระบบภายใน/.test(await txt(page, '#view')));
  await page.selectOption('select[aria-label="กรองตามประเภท"]', 'พบสิ่งของ'); await page.waitForTimeout(200); const c1 = await lfc();
  await page.selectOption('select[aria-label="กรองตามสถานะ"]', 'รับของคืนแล้ว'); await page.waitForTimeout(200); const c2 = await lfc();
  ok('ตัวกรองประเภทกับสถานะแยกกัน: พบสิ่งของ 5 → + สถานะรับของคืนแล้ว 1', /^5 รายการ/.test(c1) && /^1 รายการ/.test(c2), c1 + ' | ' + c2);
  await page.click('.dv[data-ds="lostfound"] .it .it-b'); await page.waitForSelector('.dlg');
  ok('รายละเอียด: ชื่อผู้แจ้ง/เบอร์โทรตามต้นทาง (เฉพาะหลัง Login)', /ผู้แจ้งสมมติ 12/.test(await txt(page, '.dlg')) && /000-MOCK-12/.test(await txt(page, '.dlg'))); await page.click('.dlg .btn.sec');
  await page.selectOption('select[aria-label="กรองตามประเภท"]', 'all'); await page.selectOption('select[aria-label="กรองตามสถานะ"]', 'all'); await page.fill('.dv[data-ds="lostfound"] input[type=search]', 'อาคารสมมติ B'); await page.waitForTimeout(500);
  ok('ค้นหา + แบ่งหน้า', /^7 รายการ/.test(await lfc()));
  await page.fill('.dv[data-ds="lostfound"] input[type=search]', ''); await page.waitForTimeout(500); await page.click('.dv[data-ds="lostfound"] .lu-pager button:has-text("ถัดไป")'); await page.waitForTimeout(200);
  ok('หน้า 2 มี 3 รายการ และรูปของรายการที่มีภาพโหลดผ่านบริการภาพ', await T(page, '.dv[data-ds="lostfound"] .it').count() === 3 && await page.evaluate(() => [...document.querySelectorAll('.dv[data-ds="lostfound"] .it img')].every((i) => /\/api\/img\?id=/.test(i.src) && i.complete && i.naturalWidth > 0)));
  await shot(page, '03_lostfound_list', true);

  // ---------- 5) ตรวจพื้นที่ / กิจกรรมพิเศษ / GPS / วิทยุ ----------
  await go(page, 'area-inspect'); await page.waitForSelector('.ph-tile');
  ok('[MOCK ข้อมูล] ตรวจพื้นที่: สถิติจำนวนบันทึก (3 ภาพ 2 วัน) + ภาพ · ไม่เรียกว่าอัตราทำงานครบ', /ภาพบันทึกทั้งหมด\s*3/.test(await txt(page, '.kpis')) && /วันที่มีบันทึก\s*2/.test(await txt(page, '.kpis')) && await T(page, '.ph-tile').count() === 3 && /ไม่ใช่อัตราการทำงานครบ/.test(await txt(page, '#view')));
  await shot(page, '04_area_inspect', true);
  await go(page, 'event-incident'); await page.waitForSelector('.dv[data-ds="events"] .it');
  { const t = await txt(page, '#view');
    ok('[MOCK ข้อมูล] กิจกรรมพิเศษ: รายการจริงหลัง Login 3 รายการ เรียงล่าสุดก่อน · ไม่มีการ์ด “ยังเชื่อมต่อไม่ได้” · ไม่มีชื่อ/ตำแหน่งผู้รายงาน', await T(page, '.dv[data-ds="events"] .it').count() === 3 && !/ยังเชื่อมต่อไม่ได้|ไม่มีข้อมูลยืนยัน|ยังระบุ Sheet/.test(t) && !/ชื่อสมมติ|ตำแหน่งสมมติ/.test(t), t.slice(0, 200));
    ok('กิจกรรมพิเศษ: วันที่แบบ เดือน/วัน/ปี แปลงถูก (6 ต.ค. 2569 ก่อน 30 ก.ย. 2569 ก่อน 4 ก.ย. 2569) และประเภท/สถานที่ว่างแสดง “ไม่ระบุ…”', /6 ต\.ค\. 2569[\s\S]*30 ก\.ย\. 2569[\s\S]*4 ก\.ย\. 2569/.test(t) && /ไม่ระบุประเภท/.test(t) && /ไม่ระบุสถานที่/.test(t), t.slice(0, 400)); }
  await page.selectOption('.dv[data-ds="events"] select[aria-label="ระดับเหตุการณ์"]', 'สูง'); await page.waitForTimeout(200);
  ok('กิจกรรมพิเศษ: กรองระดับ → จำนวนตรงตัวกรอง (1)', /^1 เหตุการณ์/.test(await txt(page, '.dv[data-ds="events"] .lu-count')));
  await page.selectOption('.dv[data-ds="events"] select[aria-label="ระดับเหตุการณ์"]', 'all'); await page.fill('.dv[data-ds="events"] input[aria-label="ตั้งแต่"]', '2026-09-15'); await page.dispatchEvent('.dv[data-ds="events"] input[aria-label="ตั้งแต่"]', 'change'); await page.waitForTimeout(200);
  ok('กิจกรรมพิเศษ: กรองช่วงวันที่ → 2 รายการ', /^2 เหตุการณ์/.test(await txt(page, '.dv[data-ds="events"] .lu-count')));
  await page.click('.dv[data-ds="events"] button:has-text("ทั้งช่วงข้อมูล")'); await page.waitForTimeout(200);
  await page.click('.dv[data-ds="events"] .it:has-text("ประตู 1") .it-b'); await page.waitForSelector('.dlg .gal-pic img');
  ok('กิจกรรมพิเศษ: รายละเอียด + ภาพ 3 ภาพผ่านบริการภาพของระบบ', await T(page, '.dlg .gal-pic').count() === 3 && await page.evaluate(() => [...document.querySelectorAll('.dlg .gal-pic img')].every((i) => /^\/api\/img\?id=/.test(i.getAttribute('src')))));
  await page.click('.dlg .gal-pic >> nth=0'); await page.waitForSelector('.lightbox'); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(150);
  ok('ภาพขยาย: เลื่อนดูภาพถัดไปได้ (ภาพที่ 2 / 3)', /ภาพที่ 2 \/ 3/.test(await txt(page, '.lightbox'))); await page.keyboard.press('Escape'); await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  await shot(page, '04b_events', true);
  await go(page, 'grad-guard'); await page.waitForSelector('.dv[data-ds="gps"] .it');
  ok('ลิงก์เดิม #grad-guard → หน้าใหม่ “' + 'รายงาน รปภ.ปริญญา (GPS) ปีการศึกษา 2568” (ไม่ว่าง ไม่ซ้ำเมนู)', (await txt(page, 'h1')) === 'รายงาน รปภ.ปริญญา (GPS) ปีการศึกษา 2568' && /พิธีพระราชทานปริญญาบัตร › ปีการศึกษา 2568 › รายงาน รปภ\.ปริญญา \(GPS\) ปีการศึกษา 2568/.test(await txt(page, '#crumb')) && await T(page, '.nav-a[data-page="grad-2568-gps"]').count() === 1 && await T(page, '.nav-a[data-page="grad-guard"]').count() === 0, await txt(page, '#crumb'));
  ok('เมนู: GPS อยู่ใต้ “ปีการศึกษา 2568 (ล่าสุด)” และเป็นหน้าปัจจุบัน', await page.evaluate(() => { const a = document.querySelector('.nav-a[data-page="grad-2568-gps"]'); return !!a.closest('.sub3') && a.closest('li').parentNode.closest('li').querySelector('.nav-a').getAttribute('data-page') === 'graduation' && a.getAttribute('aria-current') === 'page'; }));
  { const t = await txt(page, '.dv[data-ds="gps"]');
    ok('[MOCK ข้อมูล] GPS: สรุป + รายการจริง (2 รายงาน · ในรัศมี 1 · นอกรัศมี 1) · ไม่มีชื่อ รปภ. · ไม่มีข้อความ “เชื่อมต่อไม่ได้/ต้องใช้บัญชี mahidol”', /รายงานตามตัวกรอง\s*2/.test(t) && /อยู่ในรัศมีจุดปฏิบัติงาน\s*1/.test(t) && /อยู่นอกรัศมีจุด\s*1/.test(t) && !/รปภ\.สมมติ|G-1/.test(t) && !/เชื่อมต่อไม่ได้|mahidol\.ac\.th จึงฝัง/.test(await txt(page, '#view')), t.slice(0, 300)); }
  await page.selectOption('.dv[data-ds="gps"] select[aria-label="โซน"]', 'B'); await page.waitForTimeout(200);
  ok('GPS: กรองโซน → 1 รายงาน (จุด 2)', /^1 รายงาน/.test(await txt(page, '.dv[data-ds="gps"] .lu-count')) && /จุด 2/.test(await txt(page, '.dv[data-ds="gps"] .it-grid')));
  await page.selectOption('.dv[data-ds="gps"] select[aria-label="โซน"]', 'all'); await page.waitForTimeout(150); await page.click('.dv[data-ds="gps"] .it:has-text("จุด 1") .it-b'); await page.waitForSelector('.dlg');
  ok('GPS: รายละเอียดมีความแม่นยำ ระยะจากจุด สถานะพิกัด พิกัด ณ เวลาที่ส่ง และภาพ', /ความแม่นยำ GPS\s*12 เมตร/.test(await txt(page, '.dlg')) && /ระยะจากจุดประจำ\s*5 เมตร/.test(await txt(page, '.dlg')) && /ณ เวลาที่ส่ง/.test(await txt(page, '.dlg')) && await T(page, '.dlg .gal-pic').count() === 1);
  await page.keyboard.press('Escape'); await shot(page, '04c_gps', true);
  await go(page, 'graduation'); ok('หน้า ปีการศึกษา 2568: การ์ด/ลิงก์ GPS ใช้ชื่อเดียวกันและพาไปหน้าใหม่', await T(page, 'section[aria-label="รายงาน รปภ.ปริญญา (GPS) ปีการศึกษา 2568"] a.more[href="#grad-2568-gps"]').count() === 1 && await T(page, '.tabs a[href="#grad-2568-gps"]').count() === 1);
  await go(page, 'report-radio'); await page.waitForSelector('.dv[data-ds="radio"]'); await page.waitForTimeout(400); ok('รายงานวิทยุ: เปิดได้โดยไม่ถาม Login ซ้ำ', !/ต้องเข้าสู่ระบบ|ยังไม่ได้เข้าสู่ระบบ/.test(await txt(page, '#view')) && await T(page, '#loginView').count() === 0);

  // ---------- 5.1) ทุกเมนูหลัง Login: ไม่มี undefined / null / NaN หลุดออกหน้า และไม่มีหน้าใดถาม Login ซ้ำ ----------
  { const routes = await page.evaluate(() => [...new Set([...document.querySelectorAll('.sb a[href^="#"], nav a[href^="#"]')].map((a) => a.getAttribute('href').slice(1).split('/')[0]).filter(Boolean))]);
    const bad = [];
    for (const r of routes) { await go(page, r); await page.waitForTimeout(450); const tx = await page.evaluate(() => document.getElementById('view').innerText);
      if (/\bundefined\b|\bNaN\b|\bnull\b|ต้องเข้าสู่ระบบภายใน/.test(tx) || await page.locator('#loginView').count()) bad.push(r + ': ' + (tx.match(/.{0,40}(undefined|NaN|null|ต้องเข้าสู่ระบบภายใน).{0,20}/) || [''])[0]); }
    ok('ทุกเมนู (' + routes.length + ' หน้า) หลัง Login: ไม่มี undefined/null/NaN และไม่ถาม Login ซ้ำ', routes.length >= 20 && !bad.length, bad.join(' | ')); }
  await go(page, 'lostfound'); await page.waitForSelector('.kpis');
  ok('[MOCK ข้อมูล] Lost & Found: สถานะที่ไม่มีรายการในชุดที่อ่านครบแสดง 0 (ไม่ใช่ undefined)', /ช่วยหาแล้วยังไม่พบ 0/.test(await txt(page, '.kpis')), await txt(page, '.kpis'));

  // ---------- 6) ตารางเวร / ตั้งค่า (ผู้ใช้ทั่วไป) ----------
  await go(page, 'roster'); await page.waitForFunction(() => /ชื่อสมมติ หนึ่ง/.test(document.getElementById('view').textContent));
  { const ord = await page.evaluate(() => { const n = document.querySelector('.ros-names'), t = [...document.querySelectorAll('#view section h2')].find((h) => /^ตารางเวรเดือน/.test(h.textContent)); return { above: !!n && !!t && (n.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING) > 0, pos: getComputedStyle(n).position, once: document.querySelectorAll('.ros-names').length === 1 && !/ตำแหน่งในแต่ละผลัด[\s\S]*ตำแหน่งในแต่ละผลัด/.test(document.getElementById('view').innerText), head: t.textContent }; });
    const now = new Date(Date.now() + 7 * 3600e3), TH = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    ok('ตารางเวร: รายชื่อแต่ละผลัดอยู่เหนือหัวข้อ “ตารางเวรเดือน…” ครั้งเดียว และเป็น sticky เฉพาะส่วนนี้', ord.above && ord.pos === 'sticky' && ord.once && ord.head === 'ตารางเวรเดือน' + TH[now.getUTCMonth()] + ' ' + (now.getUTCFullYear() + 543), JSON.stringify(ord));
    await page.evaluate(() => { const t = document.querySelector('.tbl.roster tbody tr:nth-child(20)'); window.scrollTo(0, t.getBoundingClientRect().top + window.scrollY - 300); }); await page.waitForTimeout(200);
    const st1 = await page.evaluate(() => { const n = document.querySelector('.ros-names').getBoundingClientRect(), tb = document.querySelector('.topbar').getBoundingClientRect(); return Math.abs(n.top - tb.bottom) <= 2; });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await page.waitForTimeout(200);
    const st2 = await page.evaluate(() => { const n = document.querySelector('.ros-names').getBoundingClientRect(), w = document.querySelector('.ros-wrap').getBoundingClientRect(); return n.bottom <= w.bottom + 1; });
    ok('ตารางเวร: เลื่อนดูตาราง → แถบรายชื่อติดใต้แถบหัวเว็บ · เลื่อนพ้นตาราง → ไม่ลอยค้างนอกส่วนตารางเวร', st1 && st2, st1 + ' ' + st2);
    await shot(page, '05b_roster_sticky'); await page.evaluate(() => window.scrollTo(0, 0));
    await page.click('.ph button[aria-label="เดือนถัดไป"]'); await page.waitForTimeout(300);
    ok('ตารางเวร: เปลี่ยนเดือน → หัวข้อเดือน/ปีตามที่เลือก และรายชื่อยังอยู่เหนือตาราง', /^ตารางเวรเดือน/.test(await page.evaluate(() => [...document.querySelectorAll('#view section h2')].find((h) => /^ตารางเวรเดือน/.test(h.textContent)).textContent)) && await T(page, '.ros-wrap > .ros-names + section').count() === 1); }
  ok('ตารางเวร: รายชื่อประจำผลัดจากฐานข้อมูลของระบบ (ตามบทบาทที่บันทึก)', /ส\.ต1\s*ชื่อสมมติ หนึ่ง \(MOCK\)/.test(await txt(page, '#view')) && /วิทยุ\s*ชื่อสมมติ สอง/.test(await txt(page, '#view')));
  await go(page, 'settings'); await page.waitForSelector('.ros-grid');
  ok('ตั้งค่า (ผู้ใช้ทั่วไป): เห็นรายชื่อแบบอ่านอย่างเดียว ไม่มีปุ่มแก้ไข/เพิ่ม', /อ่านอย่างเดียว/.test(await txt(page, '.dv:has(.ros-grid)')) && await T(page, '.ros-act, .ros-add').count() === 0);
  const forged = await page.evaluate(async () => { const r = await fetch('/api/roster', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ version: 0, op: 'add', team: '1', role: 'x', name: 'x' }) }); return r.status; });
  ok('ผู้ใช้ทั่วไปยิงคำสั่งแก้รายชื่อโดยตรง → บริการปฏิเสธ (403)', forged === 403);

  // ---------- 6.5) หน้าแรก: รายละเอียดเหตุการณ์วันนี้ ----------
  await page.request.get(BASE + '/__test/today/on'); await page.goto(BASE + '/#dashboard'); await page.reload(); await page.waitForSelector('.tdi .incd');   // โหลดหน้าใหม่ = อ่านข้อมูลใหม่
  { const ord = await page.evaluate(() => [...document.querySelectorAll('#view > section')].map((e) => e.getAttribute('aria-label')));
    ok('วันนี้: ส่วน “รายละเอียดเหตุการณ์วันนี้” อยู่หลังการ์ดข้อมูลวันนี้ และก่อนแนวโน้มรายเดือน', ord.indexOf('รายละเอียดเหตุการณ์วันนี้') === ord.indexOf('แนวโน้มรายเดือน') - 1 && ord.indexOf('รายละเอียดเหตุการณ์วันนี้') > 0, ord.join(' | '));
    const t = await txt(page, '.tdi');
    ok('[MOCK ข้อมูล] วันนี้ 2 เหตุการณ์ + แยกประเภท + “เหตุการณ์ที่ 1 / 2” + ลิงก์ไปรายงานทั้งหมด', /วันนี้ 2 เหตุการณ์ — /.test(t) && /อุบัติเหตุจากยานพาหนะ 1/.test(t) && /รับส่งผู้ป่วย 1/.test(t) && /เหตุการณ์ที่ 1 \/ 2/.test(t) && await T(page, '.tdi a[href="#traffic"]').count() === 1, t.slice(0, 300));
    ok('รายละเอียดแบบเดิม: วันที่ไทย + เวลา · รับแจ้งจาก · พาหนะ “…ของ…ชนกับ…” · “ไม่มีผู้ได้รับบาดเจ็บ” · KPI · ภาพ 2 ภาพ', /วันที่เกิดเหตุ\s*\d{1,2} [ก-๙.]+ 25\d\d เวลา 11:25 น\./.test(t) && /รับแจ้งจาก\s*รปภ\. · รับแจ้งทาง วิทยุสื่อสาร/.test(t) && /รถจักรยานยนต์ ของนักศึกษา ชนกับ รถยนต์ ของบุคลากร/.test(t) && /ไม่มีผู้ได้รับบาดเจ็บ/.test(t) && await T(page, '.tdi .incd-kpi li.ok').count() === 1 && await T(page, '.tdi .gal-pic').count() === 2, t.slice(0, 500));
    const before = log.api.filter((x) => /dataset=incidents/.test(x)).length;
    await page.click('.tdi button[aria-label="เหตุการณ์ถัดไป"]'); await page.waitForTimeout(150); const t2 = await txt(page, '.tdi');
    ok('ถัดไป → เหตุการณ์ที่ 2 / 2 (รับส่งผู้ป่วย 1 คน · ประเภทผู้ป่วย ไม่มีชื่อ/เบอร์) และไม่โหลดข้อมูลใหม่', /เหตุการณ์ที่ 2 \/ 2/.test(t2) && /ผู้บาดเจ็บ\/ผู้ป่วย\s*1 คน — นักศึกษา/.test(t2) && !/ผู้บาดเจ็บสมมติ|000/.test(t2) && log.api.filter((x) => /dataset=incidents/.test(x)).length === before, t2.slice(0, 300));
    await page.selectOption('.tdi select', 'รับส่งผู้ป่วย'); await page.waitForTimeout(150); ok('กรองประเภท → เหลือ 1 / 1', /เหตุการณ์ที่ 1 \/ 1/.test(await txt(page, '.tdi')));
    await page.selectOption('.tdi select', 'all'); await page.click('.tdi .gal-pic >> nth=0'); await page.waitForSelector('.lightbox'); ok('ภาพในรายละเอียดวันนี้ขยายได้', /ภาพที่ 1 \/ 2/.test(await txt(page, '.lightbox'))); await page.keyboard.press('Escape');
    await shot(page, '05c_dashboard_today', true); }
  await page.request.get(BASE + '/__test/today/off'); await page.reload(); await page.waitForSelector('.tdi');
  ok('อ่านสำเร็จแต่ไม่มีของวันนี้ → “ไม่พบรายการของวันนี้ ณ เวลาตรวจ …” + เหตุการณ์ล่าสุดแยกหัวข้อ (ไม่ใช่ของวันนี้)', /ไม่พบรายการของวันนี้ ณ เวลาตรวจ \d{2}:\d{2} น\./.test(await txt(page, '.tdi')) && /เหตุการณ์ล่าสุดในระบบ \(ไม่ใช่ของวันนี้\)/.test(await txt(page, '.tdi')));
  await page.request.get(BASE + '/__test/source/down'); await page.request.get(BASE + '/__test/today/off'); await page.request.get(BASE + '/__test/source/down'); await page.reload(); await page.waitForSelector('section[aria-label="รายละเอียดเหตุการณ์วันนี้"] .dv-err');
  { const t = await txt(page, 'section[aria-label="รายละเอียดเหตุการณ์วันนี้"]'); ok('อ่านต้นทางไม่ได้ → แสดงข้อผิดพลาด + ปุ่มลองใหม่ ไม่แสดง 0 หรือ “ไม่พบรายการ”', /ลองใหม่/.test(t) && !/ไม่พบรายการ|วันนี้ 0/.test(t), t); }
  await page.request.get(BASE + '/__test/source/up'); await page.click('section[aria-label="รายละเอียดเหตุการณ์วันนี้"] .dv-err button'); await page.waitForSelector('.tdi');
  ok('กด “ลองใหม่” หลังต้นทางกลับมา → แสดงผลได้', await T(page, '.tdi').count() === 1);
  log.err = log.err.filter((e) => !/Failed to load|502|503/.test(e));
  // ---------- 7) ผู้ช่วย AI ----------
  await go(page, 'dashboard'); await page.waitForSelector('.now');
  ok('ปุ่มผู้ช่วย: รูปหุ่นยนต์ (ไฟล์ assets/images/ai-assistant.png โหลดได้) + ป้าย “ถาม AI”', (await txt(page, '#chatFab')) === 'ถาม AI' && await page.evaluate(() => { const i = document.querySelector('#chatFab .fab-bot'); return i.complete && i.naturalWidth === 256 && /assets\/images\/ai-assistant\.png$/.test(i.src); }));
  { const r = await page.request.get(BASE + '/assets/images/ai-assistant.png'); ok('ไฟล์รูปหุ่นยนต์: 200 + image/png (ไม่ต้อง Login)', r.status() === 200 && /^image\/png/.test(r.headers()['content-type'] || '')); }
  await page.click('#chatFab'); await page.waitForTimeout(350);
  ok('เปิดผู้ช่วยบนจอกว้าง: เป็นแถบด้านขวา เนื้อหาถูกดันเข้า — ไม่ทับการ์ดตัวเลขและแผนที่ · ระบุช่วงตรงกับปุ่ม “วันนี้” ของหน้าแรก', await page.evaluate(() => { const p = document.getElementById('chatPanel').getBoundingClientRect(); const hit = [...document.querySelectorAll('.now, .trend, .dash-map')].some((e) => { const r = e.getBoundingClientRect(); return r.right > p.left + 1 && r.left < p.right && r.bottom > p.top && r.top < p.bottom; }); return !hit && /ช่วงที่กำลังดู: วันนี้ \d+ /.test(document.getElementById('chatPanel').textContent) && document.documentElement.scrollWidth <= window.innerWidth; }), await txt(page, '#chatPanel'));
  await page.fill('#chatPanel textarea, #chatPanel input[type=text]', 'เดือนนี้มีเหตุการณ์กี่ครั้ง'); await page.keyboard.press('Enter'); await page.waitForFunction(() => /คำตอบจากบริการ AI จำลอง/.test(document.getElementById('chatPanel').textContent), null, { timeout: 8000 }).catch(() => {});
  ok('[MOCK AI] ถามผ่าน /api/chat ด้วย session เดียวกัน → ได้คำตอบพร้อมแหล่งข้อมูล', /คำตอบจากบริการ AI จำลอง/.test(await txt(page, '#chatPanel')) && log.api.some((a) => a === 'POST /api/chat'), (await txt(page, '#chatPanel')).slice(-200));
  await shot(page, '05_chat_MOCK_AI'); await page.keyboard.press('Escape');

  // ---------- 8) Logout / หมดอายุ ----------
  await page.click('#userBox .ub-out'); await page.waitForSelector('#loginView');
  const afterOut = await page.evaluate(async () => [(await fetch('/api/data?dataset=staff', { credentials: 'include' })).status, (await fetch('/api/img?id=MOCKDRIVEFILEID0000000000000001', { credentials: 'include' })).status, (await fetch('/api/roster', { credentials: 'include' })).status]);
  ok('ออกจากระบบ → กลับหน้า Login · ข้อมูล/ภาพ/รายชื่อเวรเข้าไม่ได้ (401) · เนื้อหาเดิมถูกล้าง', afterOut.join() === '401,401,401' && await T(page, '#app').isHidden() && (await page.evaluate(() => document.getElementById('view').textContent)) === '');
  await login(page, '4567'); await page.waitForSelector('#userBox'); await go(page, 'lostfound'); await page.waitForSelector('.dv[data-ds="lostfound"] .it');
  await page.request.get(BASE + '/__test/expire'); await page.click('.dv[data-ds="lostfound"] .it .it-b').catch(() => {}); await page.keyboard.press('Escape'); await go(page, 'staff'); await page.waitForSelector('#loginView');
  ok('session หมดอายุระหว่างใช้งาน → กลับหน้า Login พร้อมข้อความ', /หมดเวลาการใช้งาน/.test(await txt(page, '#loginMsg')));
  await login(page, '4567'); await page.waitForSelector('.it'); ok('เข้าใหม่ → กลับมาหน้าที่เปิดไว้ (#staff) ทันที', /#staff/.test(page.url()) && await T(page, '.it').count() === 3);

  // ---------- 9) ผู้ดูแลแก้รายชื่อเวร ----------
  ok('ผู้ดูแล: แถบบนระบุ “ผู้ดูแล”', /ผู้ดูแล$/.test((await txt(page, '#userBox .ub-name'))));
  await go(page, 'settings'); await page.waitForSelector('.ros-add');
  await page.fill('.ros-add input[aria-label="ชื่อ–สกุล"]', 'ชื่อทดสอบ เพิ่มใหม่ (MOCK)'); await page.fill('.ros-add input[aria-label="บทบาท"]', 'ส.ต2'); await page.selectOption('.ros-add select', '2'); await page.click('.ros-add button[type=submit]'); await page.waitForFunction(() => /เพิ่มรายชื่อแล้ว/.test(document.getElementById('view').textContent));
  await page.reload(); await page.waitForSelector('.ros-grid');
  ok('ผู้ดูแลเพิ่มรายชื่อ → เปิดหน้าใหม่แล้วยังอยู่ (บันทึกฝั่งบริการ) + มีประวัติ', /ชื่อทดสอบ เพิ่มใหม่ \(MOCK\)/.test(await txt(page, '.ros-grid')) && await (async () => { await page.click('details.fold summary:has-text("ประวัติการแก้ไข")'); await page.waitForTimeout(300); return /add/.test(await txt(page, '.dv:has(.ros-grid) details.fold')); })());
  const c2x = await mk(); await c2x.page.goto(BASE + '/#settings'); await c2x.page.waitForSelector('#loginView'); await login(c2x.page, '4567'); await c2x.page.waitForSelector('.ros-add');   // ผู้ดูแลคนที่สอง (อีกเครื่อง) ถือรุ่นเดิม
  await page.click('.ros-list li:has-text("ชื่อทดสอบ เพิ่มใหม่") button:has-text("ปิดใช้งาน")'); await page.waitForFunction(() => /ปิดใช้งานแล้ว/.test(document.getElementById('view').textContent));
  await c2x.page.click('.ros-list li:has-text("ชื่อสมมติ หนึ่ง") button:has-text("ปิดใช้งาน")'); await c2x.page.waitForFunction(() => /มีผู้ดูแลอีกคนแก้ไขไปก่อน/.test(document.getElementById('view').textContent));
  ok('ผู้ดูแลสองคนแก้พร้อมกัน → คนที่ถือรุ่นเก่าถูกปฏิเสธและได้รายชื่อล่าสุด (ไม่เขียนทับ)', /ชื่อทดสอบ เพิ่มใหม่ \(MOCK\) \(ปิดใช้งาน\)/.test(await txt(c2x.page, '.ros-grid')) && !/ชื่อสมมติ หนึ่ง \(MOCK\) \(ปิดใช้งาน\)/.test(await txt(c2x.page, '.ros-grid')));
  await shot(page, '06_settings_roster_admin_MOCK', true); await c2x.ctx.close();
  ok('ไม่มี Console error จากโค้ดของระบบ (เดสก์ท็อป)', log.err.length === 0, log.err.join(' | '));
  await ctx.close();

  // ---------- 10) มือถือ ----------
  ({ ctx, page, log } = await mk({ width: 390, height: 844 }));
  await page.goto(BASE + '/'); await page.waitForSelector('#loginView');
  ok('มือถือ: หน้า Login ไม่ล้นจอ ปุ่มสูงพอแตะ', await page.evaluate(() => document.documentElement.scrollWidth <= 390 && document.querySelector('.lg-btn').getBoundingClientRect().height >= 44 && document.querySelector('.lg-card').getBoundingClientRect().width <= 390));
  await shot(page, '07_login_mobile');
  await login(page, '0123'); await page.waitForSelector('.now'); await go(page, 'traffic'); await page.waitForSelector('.kstrip');
  ok('มือถือ: บล็อกเหตุการณ์ไม่ล้นจอ · ปุ่มหุ่นยนต์ขนาดกะทัดรัดพร้อมป้าย “ถาม AI” และหลบเมื่อเลื่อนลง', await page.evaluate(async () => { const w = (ms) => new Promise((r) => setTimeout(r, ms)), f = document.getElementById('chatFab'); const fb = f.getBoundingClientRect(), fit = document.documentElement.scrollWidth <= 390 && fb.width <= 90 && fb.height <= 100 && fb.right <= 390 && getComputedStyle(f.querySelector('.fab-t')).display !== 'none'; window.scrollTo(0, 400); await w(120); window.scrollTo(0, 900); await w(350); return fit && f.classList.contains('fab-away'); }));
  await shot(page, '08_incident_block_mobile');
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(300); await page.tap('#chatFab'); await page.waitForTimeout(300);
  ok('มือถือ: หน้าต่างผู้ช่วยอยู่ในจอ มีปุ่มปิดที่แตะได้ และปิดแล้วปุ่มกลับมา', await page.evaluate(() => { const p = document.getElementById('chatPanel').getBoundingClientRect(), b = document.querySelector('#chatPanel .chat-x, #chatPanel button[aria-label*="ปิด"]'); return p.left >= 0 && p.right <= 391 && p.top >= 0 && !!b && b.getBoundingClientRect().width >= 36; }) && await (async () => { await page.tap('#chatPanel .chat-x, #chatPanel button[aria-label*="ปิด"]'); await page.waitForTimeout(200); return await page.locator('#chatPanel').isHidden() && await page.locator('#chatFab').isVisible(); })());
  await shot(page, '09_chat_mobile_closed');
  ok('ไม่มี Console error จากโค้ดของระบบ (มือถือ)', log.err.length === 0, log.err.join(' | '));
  await browser.close();
  console.log('รวม ' + n + ' ข้อ · ไม่ผ่าน ' + fails + ' (หน้าเว็บ + บริการตัวจริงบนเครื่อง · แหล่งข้อมูล/AI/รหัสพนักงานเป็นของจำลอง)'); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('CRASH', e); process.exit(2); });
