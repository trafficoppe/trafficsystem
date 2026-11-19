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
  ok('[รอบ 12] ข้อความท้ายหน้าหลัง Login บอกตามจริง: ข้อมูลภายใน · บางหมวดเป็นไฟล์สรุป · ฟอร์มภายในบางรายการยังไม่เปิดบันทึก', /ข้อมูลภายในสำหรับเจ้าหน้าที่/.test(await txt(page, '.foot')) && /ยังไม่เปิดบันทึก/.test(await txt(page, '.foot')) && !/แสดงเฉพาะสถิติรวม/.test(await txt(page, '.foot')));
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
  ok('สถิติสดจากบริการ: ยอดเหตุการณ์ของหน้าเปลี่ยนเป็นชุดที่อ่านสด (10 เหตุ) และมีเวลาอ่านล่าสุด', /เหตุการณ์ทั้งหมด\s*10/.test(await txt(page, '.kpis')) && /ข้อมูลสดอ่านจากต้นทางเมื่อ \d{1,2} [ก-๙.]+ 25\d\d \d{2}:\d{2} น\./.test(await txt(page, '#stamp')) && /หมวดอื่นจากไฟล์สรุป/.test(await txt(page, '#stamp')), await txt(page, '.kpis') + ' | ' + await txt(page, '#stamp'));
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
  await page.click('.dv[data-ds="events"] .it:has-text("ประตู 1") .it-b'); await page.waitForSelector('.dlg .gal-main img');
  ok('กิจกรรมพิเศษ: รายละเอียด + ภาพหลัก (800/1600 ตามจอ) + รูปย่อ 3 ภาพผ่านบริการภาพของระบบ', await T(page, '.dlg .gal-th').count() === 3 && await page.evaluate(() => { const m = document.querySelector('.dlg .gal-main img'); return /^\/api\/img\?id=.+&w=800$/.test(m.getAttribute('src')) && /&w=1600 1600w/.test(m.getAttribute('srcset')) && [...document.querySelectorAll('.dlg .gal-th img')].every((i) => /&w=400$/.test(i.getAttribute('src'))); }));
  await page.click('.dlg .gal-main'); await page.waitForSelector('.lightbox'); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(150);
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
  ok('GPS: รายละเอียดมีความแม่นยำ ระยะจากจุด สถานะพิกัด พิกัด ณ เวลาที่ส่ง และภาพ', /ความแม่นยำ GPS\s*12 เมตร/.test(await txt(page, '.dlg')) && /ระยะจากจุดประจำ\s*5 เมตร/.test(await txt(page, '.dlg')) && /ณ เวลาที่ส่ง/.test(await txt(page, '.dlg')) && await T(page, '.dlg .gal-main').count() === 1);
  await page.waitForFunction(() => { const i = document.querySelector('.dlg .gal-main img'); return i && i.complete && i.naturalWidth > 0; }, null, { timeout: 8000 }).catch(() => {});
  ok('[MOCK ตัวกลาง] ภาพ GPS ที่เป็นไฟล์ส่วนตัว: โหลดได้จริงผ่านตัวกลาง (ไม่ใช่กรอบเสีย)', await page.evaluate(() => { const i = document.querySelector('.dlg .gal-main img'); return !!i && i.naturalWidth > 0; }));
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
    ok('รายละเอียดแบบเดิม: วันที่ไทย + เวลา · รับแจ้งจาก · พาหนะ “…ของ…ชนกับ…” · “ไม่มีผู้ได้รับบาดเจ็บ” · KPI · ภาพ 2 ภาพ', /วันที่เกิดเหตุ\s*\d{1,2} [ก-๙.]+ 25\d\d เวลา 11:25 น\./.test(t) && /รับแจ้งจาก\s*รปภ\. · รับแจ้งทาง วิทยุสื่อสาร/.test(t) && /รถจักรยานยนต์ ของนักศึกษา ชนกับ รถยนต์ ของบุคลากร/.test(t) && /ไม่มีผู้ได้รับบาดเจ็บ/.test(t) && await T(page, '.tdi .incd-kpi li.ok').count() === 1 && await T(page, '.tdi .gal-th').count() === 2 && await T(page, '.tdi .gal-main img').count() === 1, t.slice(0, 500));
    const before = log.api.filter((x) => /dataset=incidents/.test(x)).length;
    await page.click('.tdi button[aria-label="เหตุการณ์ถัดไป"]'); await page.waitForTimeout(150); const t2 = await txt(page, '.tdi');
    ok('ถัดไป → เหตุการณ์ที่ 2 / 2 (รับส่งผู้ป่วย 1 คน · ประเภทผู้ป่วย ไม่มีชื่อ/เบอร์) และไม่โหลดข้อมูลใหม่', /เหตุการณ์ที่ 2 \/ 2/.test(t2) && /ผู้บาดเจ็บ\/ผู้ป่วย\s*1 คน — นักศึกษา/.test(t2) && !/ผู้บาดเจ็บสมมติ|000/.test(t2) && log.api.filter((x) => /dataset=incidents/.test(x)).length === before, t2.slice(0, 300));
    await page.selectOption('.tdi select', 'รับส่งผู้ป่วย'); await page.waitForTimeout(150); ok('กรองประเภท → เหลือ 1 / 1', /เหตุการณ์ที่ 1 \/ 1/.test(await txt(page, '.tdi')));
    await page.selectOption('.tdi select', 'all'); await page.click('.tdi .gal-main'); await page.waitForSelector('.lightbox'); ok('ภาพในรายละเอียดวันนี้ขยายได้', /ภาพที่ 1 \/ 2/.test(await txt(page, '.lightbox'))); await page.keyboard.press('Escape');
    await shot(page, '05c_dashboard_today', true); }
  await page.request.get(BASE + '/__test/today/off'); await page.reload(); await page.waitForSelector('.tdi');
  ok('อ่านสำเร็จแต่ไม่มีของวันนี้ → “ไม่พบรายการของวันนี้ ณ เวลาตรวจ …” + เหตุการณ์ล่าสุดแยกหัวข้อ (ไม่ใช่ของวันนี้)', /ไม่พบรายการของวันนี้ ณ เวลาตรวจ \d{2}:\d{2} น\./.test(await txt(page, '.tdi')) && /เหตุการณ์ล่าสุดในระบบ \(ไม่ใช่ของวันนี้\)/.test(await txt(page, '.tdi')));
  await page.request.get(BASE + '/__test/source/down'); await page.request.get(BASE + '/__test/today/off'); await page.request.get(BASE + '/__test/source/down'); await page.reload(); await page.waitForSelector('section[aria-label="รายละเอียดเหตุการณ์วันนี้"] .dv-err');
  { const t = await txt(page, 'section[aria-label="รายละเอียดเหตุการณ์วันนี้"]'); ok('อ่านต้นทางไม่ได้ → แสดงข้อผิดพลาด + ปุ่มลองใหม่ ไม่แสดง 0 หรือ “ไม่พบรายการ”', /ลองใหม่/.test(t) && !/ไม่พบรายการ|วันนี้ 0/.test(t), t); }
  await page.request.get(BASE + '/__test/source/up'); await page.click('section[aria-label="รายละเอียดเหตุการณ์วันนี้"] .dv-err button'); await page.waitForSelector('.tdi');
  ok('กด “ลองใหม่” หลังต้นทางกลับมา → แสดงผลได้', await T(page, '.tdi').count() === 1);
  log.err = log.err.filter((e) => !/Failed to load|502|503/.test(e));
  // ---------- 6.6) รอบ 10 ----------
  await page.request.get(BASE + '/__test/today/on'); await page.goto(BASE + '/#dashboard'); await page.reload(); await page.waitForSelector('.tdi .incd');
  { const h = await page.evaluate(() => { const a = [...document.querySelectorAll('#view h2')], d = a.find((x) => /ข้อมูลวันนี้/.test(x.textContent)), t = a.find((x) => /รายละเอียดเหตุการณ์วันนี้/.test(x.textContent)), base = a.find((x) => /แนวโน้มรายเดือน/.test(x.textContent));
      const fs2 = (e) => parseFloat(getComputedStyle(e).fontSize); return { d: d.textContent.trim(), t: t.textContent.trim(), fd: fs2(d), ft: fs2(t), fb: fs2(base), note: t.closest('section').querySelector('.note').textContent,
        ty: fs2(document.querySelector('.tdi .incd-type')), pl: fs2(document.querySelector('.tdi .incd-place')), tyT: document.querySelector('.tdi .incd-type').textContent, plT: document.querySelector('.tdi .incd-place').textContent, ow: document.documentElement.scrollWidth <= innerWidth }; });
    ok('หัวข้อ “📊 ข้อมูลวันนี้” และ “🚨 รายละเอียดเหตุการณ์วันนี้” ใหญ่กว่าหัวข้อทั่วไป (21–28px) · ข้อความ “เวลาประเทศไทย”', h.d === '📊 ข้อมูลวันนี้' && h.t === '🚨 รายละเอียดเหตุการณ์วันนี้' && h.fd >= 21 && h.fd <= 28 && h.ft >= 21 && h.fd > h.fb && /ตามวันที่เกิดเหตุ \(เวลาประเทศไทย\)/.test(h.note), JSON.stringify(h));
    ok('ประเภทเหตุการณ์มีไอคอน+ข้อความ (≈20–24px) และสถานที่ “📍 …” (≈18–22px) แยกบรรทัด · ไม่ล้นแนวนอน', /^🚗 อุบัติเหตุจากยานพาหนะ$/.test(h.tyT.trim()) && /^📍 จุดสมมติ 21/.test(h.plT.trim()) && h.ty >= 19 && h.ty <= 25 && h.pl >= 17 && h.pl <= 23 && h.ow, JSON.stringify(h)); }
  { const im = await page.evaluate(() => { const i = document.querySelector('.tdi .gal-main img'), r = i.getBoundingClientRect(); return { fit: getComputedStyle(i).objectFit, src: i.getAttribute('src'), set: i.getAttribute('srcset'), w: r.width, cur: i.currentSrc }; });
    ok('ภาพหลักเหตุการณ์: ไม่ใช้รูปย่อ 400px ขยายเป็นภาพใหญ่ (ใช้ 800/1600 ตามจอ) · object-fit: contain ไม่ครอป', im.fit === 'contain' && /&w=800$/.test(im.src) && /&w=1600 1600w/.test(im.set) && !/&w=400$/.test(im.cur), JSON.stringify(im)); }
  await shot(page, '10a_dashboard_headings_today');
  { await page.waitForTimeout(400); await page.reload(); await page.waitForSelector('.dash-chk', { state: 'attached' }); await page.waitForTimeout(1500); await page.evaluate(() => { location.hash = '#gate'; }); await page.waitForTimeout(300); await page.evaluate(() => { location.hash = '#dashboard'; }); await page.waitForSelector('.dash-chk', { state: 'attached' }); const c = await page.$eval('.dash-chk', (e) => e.textContent); ok('Dashboard หลัง Login: ป้ายเวลาแยก “ข้อมูลสดอ่านจากต้นทางเมื่อ …” กับเวลาไฟล์สรุป (ไม่บอกเวลาไฟล์สรุปเป็นเวลาตรวจล่าสุด)', /^ข้อมูลสดอ่านจากต้นทางเมื่อ .+ · หมวดอื่นจากไฟล์สรุป /.test(c), c); }
  await page.request.get(BASE + '/__test/today/off');
  // GPS: ปุ่มระบบต้นทาง + ภาพส่วนตัวเมื่อยังไม่มีตัวกลาง
  await go(page, 'grad-2568-gps'); await page.waitForSelector('.dv[data-ds="gps"] .it');
  { const L = await page.$$eval('section[aria-label="ระบบต้นทาง (เปิดเมื่อต้องส่งรายงาน)"] a', (a) => a.map((x) => ({ t: x.textContent.trim(), h: x.href, b: x.target })));
    const adm = L.find((x) => /^รายงานผลการปฏิบัติงาน/.test(x.t)), srch = L.find((x) => /^ค้นหาข้อมูลเจ้าหน้าที่ปฏิบัติงาน/.test(x.t));
    ok('GPS: ปุ่ม “รายงานผลการปฏิบัติงาน” → ?page=admin (แท็บใหม่) · ปุ่มค้นหาเปลี่ยนชื่อเป็น “ค้นหาข้อมูลเจ้าหน้าที่ปฏิบัติงาน” URL เดิม', !!adm && /AKfycbzn86oqYMYzjb5YmdjeKZueLVb8UWR5eMDMQWTTIzDhwWko7gQhgf6bov_XljvyIwIR\/exec\?page=admin$/.test(adm.h) && adm.b === '_blank' && !!srch && /AKfycbyAX7zwgdHsXgn/.test(srch.h) && !/page=admin/.test(srch.h) && !L.some((x) => /^ค้นหาข้อมูลเจ้าหน้าที่$/.test(x.t)), JSON.stringify(L)); }
  ok('GPS: รายงานที่ไม่มี File ID → “ไม่มีรูปภาพ”', /ไม่มีรูปภาพ/.test(await txt(page, '.dv[data-ds="gps"] .it:has-text("จุด 2")')));
  await page.request.get(BASE + '/__test/relay/off'); await page.reload(); await page.waitForSelector('.dv[data-ds="gps"] .it');
  await page.click('.dv[data-ds="gps"] .it:has-text("จุด 1") .it-b'); await page.waitForSelector('.dlg .gal-main.noimg .img-why'); await page.waitForFunction(() => !/กำลังตรวจ/.test(document.querySelector('.dlg .img-why').textContent));
  { const t = await txt(page, '.dlg .gal-stage'); ok('[MOCK] ภาพ GPS ส่วนตัว + ยังไม่ได้เปิดตัวกลาง → บอกสาเหตุ + ปุ่มลองใหม่ (ไม่ใช่ “ไม่มีรูปภาพ”)', /ไฟล์ส่วนตัว — ยังไม่ได้เปิดตัวกลางอ่านภาพ/.test(t) && !/ไม่มีรูปภาพ/.test(t) && await T(page, '.dlg .img-retry').count() === 1, t); }
  await page.request.get(BASE + '/__test/relay/on'); await page.click('.dlg .img-retry'); await page.waitForFunction(() => { const i = document.querySelector('.dlg .gal-main img'); return i && i.complete && i.naturalWidth > 0; }, null, { timeout: 8000 }).catch(() => {});
  ok('[MOCK] เปิดตัวกลางแล้วกด “ลองใหม่” → ภาพจริงแสดง', await page.evaluate(() => { const i = document.querySelector('.dlg .gal-main img'); return !!i && i.naturalWidth > 0; }));
  await page.keyboard.press('Escape');
  // ให้ความช่วยเหลือ: คลิกภาพ → รายละเอียด + ภาพ (ข้อมูลเท่าที่ต้นทางมี)
  await go(page, 'area-assist'); await page.waitForSelector('.it:has-text("ให้ความช่วยเหลือ")'); await page.click('.it:has-text("ให้ความช่วยเหลือ") .it-b'); await page.waitForSelector('.dlg .gal-main img');
  { const t = await txt(page, '.dlg'); ok('ให้ความช่วยเหลือ: เปิดรายละเอียดพร้อมภาพ · วันที่ เวลาจากชื่อไฟล์ หมวดหมู่ · “ต้นทางยังไม่ได้บันทึกรายละเอียดการช่วยเหลือ” · ขยายภาพต่อได้', /14 พ\.ย\. 2569/.test(t) && /09:05 น\./.test(t) && /ช่วยเหลือ/.test(t) && /ต้นทางยังไม่ได้บันทึกรายละเอียดการช่วยเหลือ/.test(t) && !/ผู้ส่งสมมติ/.test(t), t.slice(0, 300)); }
  await page.click('.dlg .gal-main'); await page.waitForSelector('.lightbox'); await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
  // หน้ารถเข้า: ระบบที่เกี่ยวข้องเริ่มแบบยุบ เปิดด้วยคีย์บอร์ด
  await go(page, 'gate'); await page.waitForSelector('.sys-fold .fold-btn');
  { const b0 = await page.evaluate(() => { const b = document.querySelector('.sys-fold .fold-btn'); return { e: b.getAttribute('aria-expanded'), hid: document.getElementById(b.getAttribute('aria-controls')).hidden, t: b.textContent }; });
    await page.focus('.sys-fold .fold-btn'); await page.keyboard.press('Enter'); await page.waitForTimeout(100);
    const b1 = await page.evaluate(() => { const b = document.querySelector('.sys-fold .fold-btn'); return { e: b.getAttribute('aria-expanded'), cards: document.querySelectorAll('#' + b.getAttribute('aria-controls') + ' .sys-card, #' + b.getAttribute('aria-controls') + ' .card').length }; });
    ok('หน้ารถเข้า: “ระบบและแบบฟอร์มที่เกี่ยวข้อง 2 ระบบ” เริ่มแบบยุบ → Enter เปิดการ์ดลงมา (aria-expanded ถูกต้อง) · หน้าอื่นไม่ยุบตาม', b0.e === 'false' && b0.hid && /ระบบและแบบฟอร์มที่เกี่ยวข้อง\s*2 ระบบ/.test(b0.t) && b1.e === 'true' && b1.cards >= 2, JSON.stringify([b0, b1])); }
  await shot(page, '10b_gate_fold_open');
  await go(page, 'grad-2568-gps'); { const sec = 'section[aria-label="ระบบต้นทาง (เปิดเมื่อต้องส่งรายงาน)"]', st0 = await page.$eval(sec + ' .fold-btn', (b) => [b.getAttribute('aria-expanded'), document.getElementById(b.getAttribute('aria-controls')).hidden, b.textContent]);
    await page.focus(sec + ' .fold-btn'); await page.keyboard.press('Space'); await page.waitForTimeout(120);
    ok('[รอบ 12] หน้า GPS: “ระบบต้นทาง” เริ่มแบบยุบ บอกจำนวนระบบ → Space เปิดได้ ปุ่มในการ์ดใช้ได้', st0[0] === 'false' && st0[1] === true && /1 ระบบ/.test(st0[2]) && await T(page, sec + ' .sys-grid a.btn').first().isVisible());
    // ข้อมูลสดมาใหม่ (วาดหน้าเดิมซ้ำ) ต้องไม่ปิดส่วนที่ผู้ใช้เปิดอยู่ และไม่เลื่อนหน้ากลับบนสุด
    await page.evaluate(() => window.scrollTo(0, 400)); const y0 = await page.evaluate(() => window.pageYOffset); await page.evaluate(() => window.__hub.rerender()); await page.waitForTimeout(400);
    const y1 = await page.evaluate(() => window.pageYOffset);
    ok('[รอบ 12] วาดหน้าเดิมซ้ำ (เหมือนข้อมูลสดมาใหม่): ส่วนที่เปิดอยู่ยังเปิด และตำแหน่งเลื่อนคงเดิม', await page.$eval(sec + ' .fold-btn', (b) => b.getAttribute('aria-expanded')) === 'true' && y0 > 0 && Math.abs(y1 - y0) < 8, y0 + ' → ' + y1); }
  // ---------- รอบ 12: รูปแบบกราฟ / การจัดวาง / ตัวสังเกตไม่สะสม ----------
  { await go(page, 'dashboard'); await page.waitForSelector('.trends .chartw'); await page.setViewportSize({ width: 1366, height: 900 }); await page.waitForTimeout(300);
    const R = await page.evaluate(async () => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms)), w = [...document.querySelectorAll('.chartw')].find((x) => x.querySelector('.chart-tb button[data-m="group"]')); if (!w) return { none: true };
      const lab = (m) => [...w.querySelectorAll('.chart-body g.col')].map((g) => g.getAttribute('aria-label')), click = async (m) => { w.querySelector('.chart-tb button[data-m="' + m + '"]').click(); await sleep(250); };
      const fetches0 = performance.getEntriesByType('resource').filter((e) => /\/api\//.test(e.name)).length, out = { modes: [...w.querySelectorAll('.chart-tb button[data-m]')].map((b) => b.getAttribute('data-m')) };
      out.stack = lab(); out.stackRects = w.querySelectorAll('.chart-body g.col rect:not(.hit)').length;
      await click('group'); out.group = lab(); out.groupMode = w.getAttribute('data-mode'); out.groupRects = w.querySelectorAll('.chart-body g.col rect:not(.hit)').length;
      const g0 = w.querySelector('.chart-body g.col'), xs = [...g0.querySelectorAll('rect:not(.hit)')].map((r) => +r.getAttribute('x')); out.sideBySide = xs.length < 2 || new Set(xs).size === xs.length;
      await click('line'); out.line = lab().length; out.lineHas = !!w.querySelector('.chart-body polyline, .chart-body circle');
      await click('table'); out.tableRows = [...w.querySelectorAll('.chart-tbl tbody tr')].map((tr) => [...tr.children].map((td) => td.textContent)); out.saved = localStorage.getItem('hub.chart');
      const lg = w.querySelector('.legend-btn button'); lg.click(); await sleep(200); out.hidNote = w.querySelector('.chart-hid').textContent; out.kpiSame = true; lg.click(); await sleep(150);
      w.querySelector('.cm-reset').click(); await sleep(250); out.resetMode = w.getAttribute('data-mode'); out.savedAfter = localStorage.getItem('hub.chart');
      out.fetchDelta = performance.getEntriesByType('resource').filter((e) => /\/api\//.test(e.name)).length - fetches0; return out; });
    const sumOf = (labels) => labels.map((l) => (l.match(/รวม ([\d,]+)/) || [0, '0'])[1]).join('|');
    ok('[รอบ 12] กราฟหลายชุดมีโหมด ซ้อน/แยกชุด/เส้น/ตาราง · สลับโหมดไม่เรียก API ใหม่', !R.none && R.modes.join() === 'stack,group,line,table' && R.fetchDelta === 0, JSON.stringify(R.modes) + ' ' + R.fetchDelta);
    ok('[รอบ 12] แท่งตั้งแยกชุด: ค่าต่อชุดและยอดรวมต่อช่วงเท่ากับแท่งซ้อนทุกช่วง · แท่งในช่วงเดียวกันตั้งข้างกัน (x ไม่ซ้ำ)', R.groupMode === 'group' && R.group.join('§').replace(/ \(แท่งตั้งแยกชุด\)/g, '') === R.stack.join('§') && R.groupRects === R.stackRects && R.sideBySide, sumOf(R.stack) + ' vs ' + sumOf(R.group));
    { const tot = R.tableRows.slice(0, -1).map((r) => r[r.length - 1]).join('|'); ok('[รอบ 12] ตารางตัวเลข: ยอดรวมต่อช่วงตรงกับกราฟ และมีแถวรวมทั้งช่วง · โหมดเส้นมีจุดครบทุกช่วง', tot === sumOf(R.stack) && /รวมทั้งช่วง/.test(R.tableRows[R.tableRows.length - 1][0]) && R.line === R.stack.length && R.lineHas, tot + ' vs ' + sumOf(R.stack)); }
    ok('[รอบ 12] ซ่อนชุดข้อมูลจากชื่อชุด → บอกชัดว่าซ่อนอะไร · จำรูปแบบที่เลือก · ปุ่ม “ค่าเริ่มต้น” คืนแท่งซ้อนและลบค่าที่จำ', /กำลังซ่อน: /.test(R.hidNote) && /table/.test(R.saved || '') && R.resetMode === 'stack' && !/table/.test(R.savedAfter || ''), R.hidNote + ' ' + R.saved + ' → ' + R.savedAfter);
    const cols0 = await page.$eval('.trends', (e) => getComputedStyle(e).gridTemplateColumns.split(' ').length); await page.click('.layout-ctl button:has-text("เรียงลงแนวตั้ง")'); await page.waitForTimeout(400);
    const cols1 = await page.$eval('.trends', (e) => getComputedStyle(e).gridTemplateColumns.split(' ').length), modeKept = await page.evaluate(() => [...document.querySelectorAll('.chartw')].find((x) => x.querySelector('.chart-tb button[data-m="group"]')).getAttribute('data-mode'));
    ok('[รอบ 12] จัดวางกราฟ: ตารางการ์ด (2 คอลัมน์) → เรียงลงแนวตั้ง (1 คอลัมน์) โดยรูปแบบกราฟไม่เปลี่ยน', cols0 === 2 && cols1 === 1 && modeKept === 'stack', cols0 + '→' + cols1 + ' ' + modeKept);
    await shot(page, '12a_dashboard_layout_stack_MOCK'); await page.click('.layout-ctl button:has-text("ตารางการ์ด")'); await page.waitForTimeout(300);
    const obs = []; for (let i = 0; i < 4; i++) { await go(page, 'gate'); await go(page, 'dashboard'); obs.push(await page.evaluate(() => window.__hub.obs())); }
    ok('[รอบ 12] สลับหน้าไปมา 4 รอบ: ตัวสังเกตขนาดกราฟไม่สะสม (จำนวนคงที่)', obs.every((x) => x === obs[0]) && obs[0] > 0 && obs[0] < 40, obs.join(','));
    await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(400);
    const mob = await page.evaluate(async () => { const w = [...document.querySelectorAll('.chartw')].find((x) => x.querySelector('.chart-tb button[data-m="group"]')); w.querySelector('.chart-tb button[data-m="group"]').click(); await new Promise((r) => setTimeout(r, 300));
      const rects = [...w.querySelectorAll('.chart-body g.col')].map((g) => [...g.querySelectorAll('rect:not(.hit)')].map((r) => [+r.getAttribute('x'), +r.getAttribute('width')])); let overlap = false; rects.forEach((rs) => rs.sort((a, b) => a[0] - b[0]).forEach((r, i) => { if (i && r[0] < rs[i - 1][0] + rs[i - 1][1] - 0.5) overlap = true; }));
      const o = { overlap, pageOverflow: document.documentElement.scrollWidth > innerWidth + 1, layoutCtl: getComputedStyle(document.querySelector('.layout-ctl')).display }; w.querySelector('.cm-reset').click(); return o; });
    ok('[รอบ 12] มือถือ 390px: แท่งแยกชุดไม่ทับกัน · ทั้งหน้าไม่ล้นแนวนอน · ตัวเลือกจัดวางซ่อน (เรียงลงอยู่แล้ว)', !mob.overlap && !mob.pageOverflow && mob.layoutCtl === 'none', JSON.stringify(mob));
    await shot(page, '12b_mobile_grouped_MOCK'); await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(300); }
  // ---------- รอบ 13 ----------
  { // C: สลับรูปแบบ/ซ่อนชุด 28 ครั้ง → ตัวสังเกตไม่สะสม · กราฟอื่นยังปรับขนาดตามจอ
    await go(page, 'dashboard'); await page.waitForSelector('.trends .chartw'); await page.waitForTimeout(400);
    const C = await page.evaluate(async () => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms)), ws = [...document.querySelectorAll('.chartw')], w = ws.find((x) => x.querySelector('.chart-tb button[data-m="group"]'));
      const o0 = window.__hub.obs(), modes = ['group', 'line', 'table', 'stack'];
      for (let i = 0; i < 28; i++) { (i % 4 === 3 ? w.querySelector('.legend-btn button') : w.querySelector('.chart-tb button[data-m="' + modes[i % 4] + '"]')).click(); await sleep(15); }
      w.querySelector('.legend-btn button').click(); w.querySelector('.cm-reset') && !w.querySelector('.cm-reset').hidden && w.querySelector('.cm-reset').click(); await sleep(250);
      return { o0, o1: window.__hub.obs(), n: ws.length }; });
    ok('[รอบ 13·C] สลับรูปแบบกราฟ/ซ่อนชุด 28 ครั้ง → จำนวนตัวสังเกตเท่าเดิม (ก่อนแก้: เพิ่มทีละ 1 ต่อครั้ง)', C.o1 === C.o0 && C.o0 > 0, C.o0 + ' → ' + C.o1);
    const vb = () => page.evaluate(() => [...document.querySelectorAll('.chartw .chart-box svg')].map((x) => x.getAttribute('viewBox').split(' ')[2]));
    const v0 = await vb(); await page.setViewportSize({ width: 1000, height: 900 }); await page.waitForTimeout(500); const v1 = await vb(); await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(400);
    ok('[รอบ 13·C] หลังสลับหลายครั้ง กราฟทุกตัวในหน้ายังปรับขนาดตามจอ (ตัวสังเกตที่ต้องใช้ไม่ถูกปลด)', v0.length > 1 && v0.length === v1.length && v0.every((x, i) => x !== v1[i]), v0.join(',') + ' → ' + v1.join(','));
    // C: กราฟในส่วนที่ซ่อนอยู่ (เช่นส่วนพับ) วาดเมื่อเปิด · ส่วนที่ถูกถอดออกจากหน้า (วาดรายการใหม่ตามตัวกรอง) ถูกปลดอัตโนมัติ
    const F = await page.evaluate(async () => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms)), H = window.__hub, o0 = H.obs(), box = document.createElement('div'); box.hidden = true; document.querySelector('#view').appendChild(box);
      box.appendChild(H.bars([{ label: 'ก', full: 'ก' }, { label: 'ข', full: 'ข' }], [{ name: 'ชุด 1', color: '#36c', values: [1, 2] }, { name: 'ชุด 2', color: '#c63', values: [3, 4] }], { modes: false, aria: 'ทดสอบพับ' }));
      await sleep(150); const before = !!box.querySelector('svg'); box.hidden = false; await sleep(250); const after = !!box.querySelector('svg'), o1 = H.obs();
      for (let i = 0; i < 25; i++) { box.textContent = ''; box.appendChild(H.bars([{ label: 'ก', full: 'ก' }, { label: 'ข', full: 'ข' }], [{ name: 'ชุด', color: '#36c', values: [i, 1] }], { modes: false, aria: 'ทดสอบตัวกรอง' })); await sleep(20); }
      await sleep(250); const o2 = H.obs(); box.remove(); await sleep(250); return { before, after, o0, o1, o2, o3: H.obs() }; });
    ok('[รอบ 13·C] กราฟในส่วนพับ: ยังไม่วาดตอนซ่อน → วาดเมื่อเปิด', F.before === false && F.after === true, JSON.stringify(F));
    ok('[รอบ 13·C] วาดกราฟใหม่แทนที่ 25 ครั้ง (แบบตัวกรองวาดรายการใหม่) → ตัวสังเกตไม่สะสม · ถอดส่วนออกแล้วคืนเท่าก่อนเริ่ม', F.o2 === F.o1 && F.o3 === F.o0, JSON.stringify(F));
    // C: ตัวกรองเรือนไทยจริง 24 ครั้ง
    await go(page, 'parking'); await page.waitForSelector('.dv[data-ds="ruenthai"] table'); await page.waitForTimeout(400);
    const r0 = await page.evaluate(() => window.__hub.obs()), sel = '.dv[data-ds="ruenthai"] select[aria-label="สถานะ LPR"]';
    for (let i = 0; i < 24; i++) { await page.selectOption(sel, i % 2 ? 'all' : 'อัปเดตแล้ว'); await page.waitForTimeout(25); }
    await page.waitForTimeout(300); const r1 = await page.evaluate(() => window.__hub.obs());
    ok('[รอบ 13·C] หน้าเรือนไทย: เปลี่ยนตัวกรอง 24 ครั้ง → ตัวสังเกตไม่สะสม', r1 === r0, r0 + ' → ' + r1);
  }
  { // B: แยก “ไม่มีข้อมูลทั้งหมด” / “ศูนย์ยืนยัน” / “ไม่ครบบางช่วง” ในแถวรวม ตาราง tooltip และ aria
    const B = await page.evaluate(async () => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms)), box = document.createElement('div'); document.querySelector('#view').appendChild(box);
      const cols = [{ label: 'ม.ค.', full: 'ม.ค. 2569' }, { label: 'ก.พ.', full: 'ก.พ. 2569' }, { label: 'มี.ค.', full: 'มี.ค. 2569' }];
      box.appendChild(window.__hub.bars(cols, [{ name: 'ว่างทั้งหมด', color: '#36c', values: [null, null, null] }, { name: 'ศูนย์', color: '#c63', values: [0, 0, 0] }, { name: 'บางช่วง', color: '#3a6', values: [2, null, 3] }], { unit: 'ครั้ง', aria: 'ทดสอบค่าว่าง', key: 'r13-null' }));
      await sleep(150); const aria = [...box.querySelectorAll('g.col')].map((g) => g.getAttribute('aria-label'));
      box.querySelector('.chart-tb button[data-m="table"]').click(); await sleep(100);
      const rows = [...box.querySelectorAll('.chart-tbl tbody tr')].map((tr) => [...tr.children].map((td) => td.textContent)); box.querySelector('.cm-reset').click(); box.remove(); return { aria, rows }; });
    const tot = B.rows[B.rows.length - 1];
    ok('[รอบ 13·B] แถว “รวมทั้งช่วง”: ชุดไม่มีข้อมูลเลย = “ไม่มีข้อมูล” (ไม่ใช่ 0) · ชุดศูนย์ยืนยัน = 0 · ชุดขาดบางช่วง = ยอด + บอกจำนวนช่วงที่ขาด', tot[1] === 'ไม่มีข้อมูล' && tot[2] === '0' && /^5 \(ไม่ครบ: ขาด 1 ช่วง\)$/.test(tot[3]) && /^5 \(ไม่ครบ: ขาด 4 ค่า\)$/.test(tot[4]), JSON.stringify(tot));
    ok('[รอบ 13·B] รวมรายช่วงในตาราง: ช่วงที่บางชุดไม่มีข้อมูลบอก “ไม่ครบ”', /^0 \(ไม่ครบ: ขาด 2 ชุด\)$/.test(B.rows[1][4]) && /^2 \(ไม่ครบ: ขาด 1 ชุด\)$/.test(B.rows[0][4]), JSON.stringify(B.rows.slice(0, 3)));
    ok('[รอบ 13·B] aria ของแท่ง: บอกชุดที่ไม่มีข้อมูล และยอดรวมบอก “ไม่ครบ” พร้อมหน่วย', /ว่างทั้งหมด ไม่มีข้อมูล, ศูนย์ 0, บางช่วง ไม่มีข้อมูล, รวม 0 ครั้ง \(ไม่ครบ: ขาด 2 ชุด\)$/.test(B.aria[1]), B.aria[1]);
  }
  { // A + D: เวลาอ่านเปลี่ยนอย่างเดียว → อัปเดตป้ายเวลา ไม่วาดหน้าใหม่ · ยอดรวมเท่าเดิมแต่การแยกตามวิทยาเขตเปลี่ยน → วาดใหม่ (คงตำแหน่งเลื่อน)
    await page.request.get(BASE + '/__test/moto/reset'); await go(page, 'vehicle'); await page.waitForSelector('section[aria-label="นักศึกษา – รถจักรยานยนต์"]'); await page.waitForTimeout(500);
    const liveOnce = async () => { const n0 = log.api.filter((x) => /\/api\/stats/.test(x)).length; await page.evaluate(() => window.__hub.live()); for (let i = 0; i < 40 && log.api.filter((x) => /\/api\/stats/.test(x)).length < n0 + 2; i++) await page.waitForTimeout(100); await page.waitForTimeout(500); };
    await liveOnce(); const s0 = await txt(page, '#stamp'), n0 = await page.evaluate(() => window.__hub.renders());
    await page.request.get(BASE + '/__test/clock/180'); await liveOnce(); const s1 = await txt(page, '#stamp'), n1 = await page.evaluate(() => window.__hub.renders());
    ok('[รอบ 13·A] อ่านต้นทางใหม่ (หลัง TTL) ข้อมูลไม่เปลี่ยน → ป้าย “อ่านจากต้นทางเมื่อ” เปลี่ยน โดยไม่วาดหน้าใหม่', s1 !== s0 && /อ่านจากต้นทาง/.test(s1) && n1 === n0, s0 + ' | ' + s1 + ' | renders ' + n0 + '→' + n1);
    const camp = () => page.evaluate(() => (document.querySelector('section[aria-label="นักศึกษา – รถจักรยานยนต์"]') || {}).innerText || '');
    const c0 = await camp(); await page.evaluate(() => window.scrollTo(0, 300)); const y0 = await page.evaluate(() => window.pageYOffset);
    await page.request.get(BASE + '/__test/moto/shift'); await page.request.get(BASE + '/__test/clock/180'); await liveOnce();
    const c1 = await camp(), n2 = await page.evaluate(() => window.__hub.renders()), y1 = await page.evaluate(() => window.pageYOffset);
    ok('[รอบ 13·D] ยอดรวมเท่าเดิม (3 รายการ) แต่การแยกตามวิทยาเขตเปลี่ยน → หน้าแสดงตัวเลขใหม่ · ตำแหน่งเลื่อนคงเดิม', n2 === n1 + 1 && c1 !== c0 && /3/.test(c1) && Math.abs(y1 - y0) < 2, 'renders ' + n1 + '→' + n2 + ' y ' + y0 + '→' + y1);
    // รอบ 13 ต่อ: ป้ายเวลาในเนื้อหา (ไม่ใช่แค่หัวเว็บ) ต้องตามเวลาอ่านจริงโดยไม่วาดหน้าใหม่
    const readAt = (k) => page.evaluate(async (kk) => (await fetch('/api/stats?scope=' + (kk === 'studentMoto' ? 'private' : 'core'), { credentials: 'include' }).then((r) => r.json())).sourceReadAt[kk], k);
    const fdt = (d) => +d.slice(8, 10) + ' ' + ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][+d.slice(5, 7) - 1] + ' ' + (+d.slice(0, 4) + 543) + ' ' + d.slice(11, 16);
    const motoNote = () => page.evaluate(() => ((document.querySelector('section[aria-label="นักศึกษา – รถจักรยานยนต์"] .note') || {}).textContent || ''));
    await page.request.get(BASE + '/__test/clock/180'); await liveOnce(); const mn1 = await motoNote(), rm = await readAt('studentMoto'), nR = await page.evaluate(() => window.__hub.renders());
    ok('[รอบ 13·A2] หน้า vehicle: อ่านใหม่หลัง TTL ข้อมูลเท่าเดิม → ป้าย “อ่านสดเมื่อ” ของ นักศึกษา–จยย. = เวลาอ่านล่าสุดของแหล่งนั้น (ไม่วาดหน้าใหม่)', mn1.includes(fdt(rm)) && nR === n2, mn1 + ' | readAt ' + rm + ' | renders ' + nR);
    await go(page, 'dashboard'); await page.waitForSelector('.nows .now'); await liveOnce();
    const nowTxt = () => page.evaluate(() => [...document.querySelectorAll('.nows .now')].slice(0, 2).map((c) => c.innerText.replace(/\s+/g, ' ')).join(' | '));
    const ri0 = await readAt('incidents'), d0 = await nowTxt(); const hasT = d0.includes('ณ ' + ri0.slice(11, 16));
    await page.request.get(BASE + '/__test/clock/180'); const r0 = await page.evaluate(() => window.__hub.renders()); await liveOnce();
    const ri1 = await readAt('incidents'), d1 = await nowTxt(), r1 = await page.evaluate(() => window.__hub.renders());
    ok('[รอบ 13·A2] Dashboard: ป้าย “วันนี้ ณ …” ของการ์ดเหตุการณ์/L&F ตามเวลาอ่านใหม่ โดยไม่วาดทั้งหน้า', hasT && ri1 !== ri0 && d1.includes('ณ ' + ri1.slice(11, 16)) && !d1.includes('ณ ' + ri0.slice(11, 16)) && r1 === r0, (hasT ? '' : '[ก่อนหน้าไม่มีเวลาในการ์ด] ') + d1.slice(0, 160) + ' | ' + ri0 + '→' + ri1 + ' renders ' + r0 + '→' + r1);
    // pending: เปิดแชทค้างขณะข้อมูลเปลี่ยน → ไม่ขัดจังหวะ · ปิดแชทแล้วนำข้อมูลใหม่มาแสดง (ไม่ต้อง reload)
    await page.request.get(BASE + '/__test/moto/reset'); await page.request.get(BASE + '/__test/clock/180'); await liveOnce();
    await go(page, 'vehicle'); await page.waitForSelector('section[aria-label="นักศึกษา – รถจักรยานยนต์"]'); await page.waitForTimeout(300);
    await page.click('#chatFab'); await page.waitForSelector('.chat-panel:not([hidden])'); await page.click('.chat-panel .chat-x'); await page.waitForTimeout(200);
    await page.click('#chatFab'); await page.waitForSelector('.chat-panel:not([hidden])'); await page.locator('.chat-panel').click({ position: { x: 20, y: 20 } }).catch(() => {});
    const campFig = () => page.evaluate(() => { const f = [...document.querySelectorAll('section[aria-label="นักศึกษา – รถจักรยานยนต์"] figure')].find((x) => /แยกวิทยาเขต/.test(x.textContent)); return f ? f.innerText.replace(/\s+/g, ' ') : ''; }), cF0 = await campFig();
    const pr0 = await page.evaluate(() => window.__hub.renders()); await page.request.get(BASE + '/__test/moto/shift'); await page.request.get(BASE + '/__test/clock/180'); await liveOnce();
    const pr1 = await page.evaluate(() => window.__hub.renders()); await page.keyboard.press('Escape'); await page.waitForTimeout(150); if (await page.locator('.chat-panel:not([hidden])').count()) await page.click('.chat-panel .chat-x'); await page.waitForTimeout(1200);
    const pr2 = await page.evaluate(() => window.__hub.renders()), cS = await campFig();
    ok('[รอบ 13·pending] แชทเปิดอยู่ → ไม่วาดทับ · ปิดแชทแล้ววาดข้อมูลใหม่ภายใน ~1 วินาที', pr1 === pr0 && pr2 === pr0 + 1 && cS !== cF0, 'renders ' + pr0 + '→' + pr1 + '→' + pr2);
    await page.request.get(BASE + '/__test/moto/reset'); await page.request.get(BASE + '/__test/clock/180'); await liveOnce();
  }
  { // แพตช์ท้าย: ป้ายเวลา “สถานะ L&F” (รายงาน) และหัวรายงานประจำวัน ต้องตามเวลาอ่านต้นทางของแหล่งนั้น
    const fdt = (d) => +d.slice(8, 10) + ' ' + ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][+d.slice(5, 7) - 1] + ' ' + (+d.slice(0, 4) + 543) + ' ' + d.slice(11, 16);
    const rd = () => page.evaluate(async () => (await fetch('/api/stats?scope=core', { credentials: 'include' }).then((r) => r.json())).sourceReadAt);
    const liveOnce = async () => { let n = 0; const on = (q) => { if (/\/api\/stats\?/.test(q.url())) n++; }; page.on('request', on); await page.evaluate(() => window.__hub.live()); for (let i = 0; i < 40 && n < 2; i++) await page.waitForTimeout(100); await page.waitForTimeout(700); page.off('request', on); };
    const lfsCap = () => page.evaluate(() => { const f = [...document.querySelectorAll('figure')].find((x) => /สถานะตรวจ/.test(x.textContent)); return f ? f.querySelector('figcaption span').textContent : ''; });
    const rnd = () => page.evaluate(() => window.__hub.renders());
    await go(page, 'report-monthly'); await page.waitForTimeout(600); await liveOnce(); const r0 = await rd(), c0 = await lfsCap();
    ok('[แพตช์ท้าย] รายงาน: “สถานะตรวจ” ของ L&F = เวลาอ่าน LF รายปี/สถานะ จริง (ไม่ค้างเวลาไฟล์สรุป 15 พ.ย. 01:05)', !!r0.lostfoundYear && c0.includes(fdt(r0.lostfoundYear)) && !c0.includes('01:05'), c0 + ' | readAt ' + r0.lostfoundYear);
    await page.request.get(BASE + '/__test/clock/180'); const n0 = await rnd(); await liveOnce(); const r1 = await rd(), c1 = await lfsCap(), n1 = await rnd();
    ok('[แพตช์ท้าย] รายงาน: อ่านใหม่หลัง TTL ยอดเท่าเดิม → “สถานะตรวจ” เปลี่ยนตามเวลาอ่าน โดยไม่วาดทั้งหน้า', r1.lostfoundYear !== r0.lostfoundYear && c1.includes(fdt(r1.lostfoundYear)) && n1 === n0, c1 + ' | renders ' + n0 + '→' + n1);
    // รายงานประจำวัน: เลือกวันที่ก่อนหน้า แล้วอ่านใหม่ → หัวรายงานบอกเวลาอ่านรายแหล่งใหม่ วันที่ที่เลือกคงเดิม
    await go(page, 'report-daily'); await page.waitForSelector('input[aria-label="เลือกวันที่"]'); await page.click('.ctrls button:has-text("ก่อนหน้า")'); await page.waitForTimeout(400);
    const dsel = await page.inputValue('input[aria-label="เลือกวันที่"]'), sub = () => page.evaluate(() => (document.querySelector('#view .ph p') || {}).textContent || '');
    await page.request.get(BASE + '/__test/clock/180'); const n2 = await rnd(); await liveOnce(); const r2 = await rd(), s2 = await sub(), n3 = await rnd(), dsel2 = await page.inputValue('input[aria-label="เลือกวันที่"]');
    ok('[แพตช์ท้าย] รายงานประจำวัน: หัวรายงานระบุเวลาอ่านของแหล่งเหตุการณ์ / L&F / รถเข้า ตามรอบอ่านล่าสุด · ไม่วาดทั้งหน้า · วันที่ที่เลือกคงเดิม', /เหตุการณ์/.test(s2) && /L&F/.test(s2) && /รถเข้า/.test(s2) && s2.includes(r2.incidents.slice(11, 16)) && n3 === n2 && dsel2 === dsel, s2 + ' | renders ' + n2 + '→' + n3 + ' | ' + dsel + '→' + dsel2);
    // แหล่ง LF รายปี/สถานะ อ่านล้ม แต่แหล่งอื่นอ่านได้ → ป้ายสถานะไม่ดูเหมือนอ่านสำเร็จรอบนี้
    await go(page, 'report-monthly'); await page.waitForTimeout(500); const cBefore = await lfsCap();
    await page.request.get(BASE + '/__test/gid/1811117659/down'); await page.request.get(BASE + '/__test/clock/180'); await liveOnce(); const r3 = await rd(), c3 = await lfsCap();
    ok('[แพตช์ท้าย] LF รายปีอ่านล้ม แหล่งอื่นอ่านได้ → “สถานะตรวจ” คงเวลาอ่านสำเร็จครั้งก่อน + บอกว่ารอบล่าสุดอ่านไม่สำเร็จ (ไม่ใช้เวลาของแหล่งอื่น)', !r3.lostfoundYear && !!r3.incidents && !c3.includes(fdt(r3.incidents)) && c3.includes(fdt(r2.lostfoundYear)) && /ไม่สำเร็จ/.test(c3), cBefore + ' → ' + c3);
    await page.request.get(BASE + '/__test/gid/1811117659/up'); await page.request.get(BASE + '/__test/clock/180'); await liveOnce();
  }
  { // แพตช์ท้าย (local print media): แผนที่จุดเกิดเหตุที่ยังไม่ได้เลื่อนถึง (lazy) ต้องไม่พิมพ์เป็นกล่องว่าง “กำลังโหลดแผนที่…”
    await go(page, 'report-monthly'); await page.waitForTimeout(800); await page.evaluate(() => window.scrollTo(0, 0));
    await page.emulateMedia({ media: 'print' }); await page.waitForTimeout(200);
    const P = await page.evaluate(() => { const vis = (e) => { const s = getComputedStyle(e); return s.display !== 'none' && e.getClientRects().length > 0; };
      const w = [...document.querySelectorAll('#view .map-wait')].filter(vis).length, plan = [...document.querySelectorAll('#view .dash-map svg')].filter(vis).length;
      return { wait: w, plan, chat: [...document.querySelectorAll('#chatFab, .chat-panel')].filter(vis).length }; });
    await page.emulateMedia({ media: 'screen' }); await page.waitForTimeout(200);
    const S = await page.evaluate(() => [...document.querySelectorAll('#view .dash-map')].map((b) => [...b.children].filter((e) => getComputedStyle(e).display !== 'none').map((e) => e.className).join('+')));
    ok('[แพตช์ท้าย·print local] รายงานประจำเดือน (สื่อพิมพ์): แผนที่ที่ยังไม่โหลดพิมพ์เป็นแผนผังตามพิกัด ไม่ใช่กล่องว่าง · ปุ่ม AI ไม่ถูกพิมพ์ · กลับหน้าจอแล้วแสดงแบบเดิม', P.wait === 0 && P.plan >= 1 && P.chat === 0 && S.every((x) => !/map-print/.test(x)), JSON.stringify(P) + ' screen:' + S.join(','));
  }
  { // แพตช์ 19 พ.ย.: แถว “นักศึกษา – รถจักรยานยนต์” ในกราฟยานพาหนะ ระหว่างรอ/อ่านล้ม ต้องบอกสถานะจริง ไม่ใช่ “ยังเชื่อมต่อไม่ได้”
    const M = await mk(); const p2 = M.page;
    await p2.route('**/api/stats?scope=private', async (r) => { await new Promise((z) => setTimeout(z, 4000)); return r.continue().catch(() => {}); });
    await p2.goto(BASE + '/#dashboard'); await p2.waitForSelector('#loginView'); await login(p2, '0123'); await p2.waitForSelector('.nows .now'); await p2.waitForTimeout(800);
    const vcard = () => p2.evaluate(() => { const c = [...document.querySelectorAll('#view .trend, #view .card')].find((x) => /ยานพาหนะที่ลงทะเบียน/.test(x.textContent) && /นักศึกษา – รถจักรยานยนต์/.test(x.textContent)); return c ? c.innerText.replace(/\s+/g, ' ') : ''; });
    const w1 = await vcard(); await p2.waitForTimeout(4500); const w2 = await vcard();
    ok('[แพตช์ 19 พ.ย.] Dashboard ระหว่างรอข้อมูลสดชุดส่วนตัว: แถวนักศึกษา–จยย. แสดง “กำลังอ่านข้อมูลสด” (ไม่ใช่ “ยังเชื่อมต่อไม่ได้”) · ได้ข้อมูลแล้วแสดงตัวเลขพร้อมเวลาอ่าน', /กำลังอ่านข้อมูลสด/.test(w1) && !/ยังเชื่อมต่อไม่ได้/.test(w1) && /นักศึกษา – รถจักรยานยนต์ \d/.test(w2) && /อ่านสด/.test(w2), w1.slice(-90) + ' || ' + w2.slice(0, 120));
    await M.ctx.close();
    const M2 = await mk(); const p3 = M2.page;
    await p3.route('**/api/stats?scope=private', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, scope: 'private', checkedAt: '', sourceReadAt: {}, errors: { studentMoto: 'relay-timeout' } }) }));
    await p3.goto(BASE + '/#dashboard'); await p3.waitForSelector('#loginView'); await login(p3, '0123'); await p3.waitForSelector('.nows .now'); await p3.waitForTimeout(1500);
    const w3 = await p3.evaluate(() => { const c = [...document.querySelectorAll('#view .trend, #view .card')].find((x) => /ยานพาหนะที่ลงทะเบียน/.test(x.textContent) && /นักศึกษา – รถจักรยานยนต์/.test(x.textContent)); return c ? c.innerText.replace(/\s+/g, ' ') : ''; });
    ok('[แพตช์ 19 พ.ย.] ชุดส่วนตัวอ่านล้ม → แถวนักศึกษา–จยย. บอกเหตุผลจริงของการอ่าน (ไม่ใช่ข้อความรวม “ยังเชื่อมต่อไม่ได้”)', !/ยังเชื่อมต่อไม่ได้/.test(w3) && /นักศึกษา – รถจักรยานยนต์ \S/.test(w3) && !/นักศึกษา – รถจักรยานยนต์ \d/.test(w3), w3.slice(-120));
    await M2.ctx.close();
  }
  { // ===== รอบ 14 · P0 (local-mock): ยอดเหตุการณ์ไม่ย้อนไปไฟล์สรุป 68 เมื่อต้นทางล้ม · ไม่ถูกหน่วงด้วยแหล่งอื่น · รายการตามรุ่นยอดรวม =====
    const G = '480256005', LFG = '2074352966', kpiTot = (pg) => pg.evaluate(() => { const k = [...document.querySelectorAll('#view .kpi')].find((x) => /เหตุการณ์ทั้งหมด/.test(x.textContent)); return k ? k.innerText.replace(/\s+/g, ' ') : ''; });
    const fresh = async () => { const M = await mk(); await M.page.goto(BASE + '/#traffic'); await M.page.waitForSelector('#loginView'); await login(M.page, '0123'); await M.page.waitForSelector('#userBox'); return M; };
    // (ก) แหล่งอื่นช้า 6 วินาที → ยอดเหตุการณ์สดขึ้นก่อน (ไม่รอ Promise.all ของทุกแหล่ง)
    await page.request.get(BASE + '/__test/clock/200'); await page.request.get(BASE + '/__test/gidDelay/' + LFG + '/6000');
    const A = await fresh(); const t0 = Date.now(); let seen = 0; for (let i = 0; i < 60; i++) { if (/^เหตุการณ์ทั้งหมด 10\s*เหตุ/.test(await kpiTot(A.page))) { seen = Date.now() - t0; break; } await A.page.waitForTimeout(100); }
    await page.request.get(BASE + '/__test/gidDelay/' + LFG + '/0'); await A.ctx.close();
    ok('[รอบ 14·P0] L&F ช้า 6 วินาที → หน้า traffic แสดงยอดเหตุการณ์สด (10) ภายใน ~3 วินาทีหลัง Login (ไม่ถูกหน่วงด้วยแหล่งที่ไม่เกี่ยวข้อง)', seen > 0 && seen < 3500, 'แสดงยอดสดที่ ' + seen + ' ms');
    // (ข) เคยอ่านสำเร็จแล้ว → ต้นทางเหตุการณ์ล้ม → tab ใหม่ ยังเห็นยอดสำเร็จล่าสุด (10) + ป้าย “อ่านสำเร็จล่าสุด… รอบล่าสุดอ่านไม่สำเร็จ” ไม่กลับไป 68
    await page.request.get(BASE + '/__test/clock/200'); await page.request.get(BASE + '/__test/gid/' + G + '/down');
    const B = await fresh(); await B.page.waitForTimeout(3500); const kb = await kpiTot(B.page), nb = await B.page.evaluate(() => (document.querySelector('#view .src-state') || {}).textContent || '');
    ok('[รอบ 14·P0] tab ใหม่ + ต้นทางเหตุการณ์ล้ม → KPI = ผลสำเร็จล่าสุด 10 (ไม่ใช่ไฟล์สรุป 68) และบอกว่าเป็นข้อมูลที่อ่านสำเร็จล่าสุด/รอบล่าสุดอ่านไม่สำเร็จ', /^เหตุการณ์ทั้งหมด 10\s*เหตุ/.test(kb) && /อ่านสำเร็จล่าสุด/.test(nb) && /ไม่สำเร็จ/.test(nb), kb + ' | ' + nb);
    await B.ctx.close();
    // (ค) ไม่มีผลสำเร็จที่ใช้ได้ + ต้นทางล้ม → แสดงไฟล์สรุปพร้อมบอกชัดว่ายังยืนยันยอดปัจจุบันไม่ได้ (ไม่เรียกว่าสด)
    await page.request.get(BASE + '/__test/lkg/clear'); await page.request.get(BASE + '/__test/clock/200');
    const C2 = await fresh(); await C2.page.waitForTimeout(3500); const kc = await kpiTot(C2.page), ncs = await C2.page.evaluate(() => (document.querySelector('#view .src-state') || {}).textContent || '');
    ok('[รอบ 14·P0] ไม่มีผลสำเร็จ + ต้นทางล้ม → แสดงยอดไฟล์สรุป (68) พร้อมป้าย “ไฟล์สรุปถึง … ยังยืนยันยอดปัจจุบันไม่ได้”', /^เหตุการณ์ทั้งหมด 68\s*เหตุ/.test(kc) && /ไฟล์สรุป/.test(ncs) && /ยังยืนยันยอดปัจจุบันไม่ได้/.test(ncs), kc + ' | ' + ncs);
    await C2.ctx.close(); await page.request.get(BASE + '/__test/gid/' + G + '/up');
    // (ง) ต้นทางมีแถวใหม่ (วันที่ใหม่กว่า) → ยอดรวม 11 และรายการรายละเอียดตามรุ่นเดียวกัน (ช่วงวันที่ค่าเริ่มต้นขยายตาม) โดยไม่ต้องรอ 5 นาที
    const D = await fresh(); await D.page.waitForTimeout(2500); await D.page.evaluate(() => { const b = document.querySelector('.incb'); if (b) b.scrollIntoView(); }); await D.page.waitForSelector('.incb-list', { timeout: 15000 }).catch(() => {});
    const listN = () => D.page.evaluate(() => { const t = (document.querySelector('.incb .lu-count') || {}).textContent || ''; const m = /^([\d,]+) เหตุการณ์/.exec(t); return m ? +m[1].replace(/,/g, '') : -1; });
    const l0 = await listN(); await page.request.get(BASE + '/__test/inc/add'); await page.request.get(BASE + '/__test/clock/200');
    let n0 = 0; D.page.on('request', (q) => { if (/\/api\/stats\?/.test(q.url())) n0++; }); await D.page.evaluate(() => window.__hub.live()); for (let i = 0; i < 50 && n0 < 3; i++) await D.page.waitForTimeout(100); await D.page.waitForTimeout(2500);
    const k1 = await kpiTot(D.page), l1 = await listN();
    ok('[รอบ 14·P0] ต้นทางเพิ่ม 1 เหตุ (วันที่ใหม่กว่า) → KPI 11 และรายการรายละเอียด/ช่วงวันที่ค่าเริ่มต้นตามรุ่นเดียวกัน (ไม่ค้างรายการเก่าในหน่วยความจำ)', /^เหตุการณ์ทั้งหมด 11\s*เหตุ/.test(k1) && l1 === l0 + 1, k1 + ' | list ' + l0 + '→' + l1);
    await page.request.get(BASE + '/__test/inc/reset'); await page.request.get(BASE + '/__test/clock/200'); await D.ctx.close();
  }
  { // ===== รอบ 14.1 (local-mock): ป้ายสถานะ/เวลาเมื่ออัปเดตบางส่วนไม่สำเร็จ · ฟื้นแล้วคำเตือนหาย =====
    const M = await mk(); const pg = M.page; await pg.goto(BASE + '/#dashboard'); await pg.waitForSelector('#loginView'); await login(pg, '0123'); await pg.waitForSelector('#userBox'); await pg.waitForTimeout(2500);
    await pg.evaluate(() => { window.__mark = 1; window.scrollTo(0, 300); });
    const st = () => pg.evaluate(() => ({ stamp: document.getElementById('stamp').innerText.replace(/\s+/g, ' '), ban: document.getElementById('banner').hidden ? '' : document.getElementById('banner').innerText.replace(/\s+/g, ' '), det: [...document.querySelectorAll('#banner details li')].map((x) => x.textContent), mark: window.__mark, y: Math.round(window.pageYOffset), anchor: Math.round((document.querySelector('#view section') || document.body).getBoundingClientRect().top), inc: ([...document.querySelectorAll('#view .now-card, #view .card')].find((c) => /เหตุการณ์และอุบัติเหตุ/.test(c.textContent)) || {}).textContent || '' }));
    const refresh = async () => { await page.request.get(BASE + '/__test/clock/200'); await pg.evaluate(() => window.__hub.live()); await pg.waitForTimeout(1800); };
    const s0 = await st();
    await page.request.get(BASE + '/__test/scope500/rest/on'); await refresh(); const s1 = await st();
    ok('[รอบ 14.1] คำขอ rest ล้ม (HTTP 500) → คำเตือนภาษาไทย “อัปเดตข้อมูลบางรายการไม่สำเร็จ ขณะนี้แสดงข้อมูลที่อ่านสำเร็จล่าสุด” · รายละเอียดเฉพาะ L&F/รถเข้า (ไม่ป้ายรายงานเหตุการณ์) + รหัสอ้างอิง · ไม่แสดงชื่อภายใน', /อัปเดตข้อมูลบางรายการไม่สำเร็จ ขณะนี้แสดงข้อมูลที่อ่านสำเร็จล่าสุด/.test(s1.ban) && s1.det.length === 3 && s1.det.every((t) => /^(Lost & Found|รถเข้า)/.test(t) && /รหัสอ้างอิง TESTREF500-rest/.test(t) && /ใช้ข้อมูลที่อ่านสำเร็จเมื่อ/.test(t)) && !/lostfound:|internal/.test(s1.ban), JSON.stringify({ ban: s1.ban.slice(0, 160), det: s1.det }));
    ok('[รอบ 14.1] หัวเว็บอธิบายข้อมูลที่แสดงจริง: “ใช้ข้อมูลที่อ่านสำเร็จล่าสุดเมื่อ … · รอบล่าสุดอัปเดตไม่สำเร็จ” ไม่ย้อนไปวันที่ไฟล์สรุป', /ใช้ข้อมูลที่อ่านสำเร็จล่าสุดเมื่อ .* · รอบล่าสุดอัปเดตไม่สำเร็จ 3 รายการ/.test(s1.stamp) && !/ตรวจข้อมูลล่าสุด/.test(s1.stamp) && /ข้อมูลสดอ่านจากต้นทางเมื่อ/.test(s0.stamp), s0.stamp + ' → ' + s1.stamp);
    await page.request.get(BASE + '/__test/scope500/inc/on'); await refresh(); const s2 = await st();
    ok('[รอบ 14.1] inc+rest ล้มทั้งคู่ → หัวเว็บยังบอกเวลาที่อ่านสำเร็จล่าสุด (ไม่ใช่ไฟล์สรุป) · การ์ดเหตุการณ์วันนี้บอกว่า “ยอด ณ … รอบล่าสุดอัปเดตไม่สำเร็จ” (ไม่ให้ 0 ดูเป็นยอดล่าสุด)', /ใช้ข้อมูลที่อ่านสำเร็จล่าสุดเมื่อ .* · รอบล่าสุดอัปเดตไม่สำเร็จ 4 รายการ/.test(s2.stamp) && !/ตรวจข้อมูลล่าสุด/.test(s2.stamp) && /รอบล่าสุดอัปเดตไม่สำเร็จ/.test(s2.inc) && s2.det.length === 4, JSON.stringify({ stamp: s2.stamp, inc: s2.inc.slice(0, 200) }));
    // ปุ่มลองใหม่กันกดซ้ำ
    let nReq = 0; const onReq = (q) => { if (/\/api\/stats\?scope=inc/.test(q.url())) nReq++; }; pg.on('request', onReq);
    await pg.click('#banner .banner-retry'); await pg.click('#banner .banner-retry').catch(() => {}); await pg.waitForTimeout(1500); pg.off('request', onReq);
    ok('[รอบ 14.1] ปุ่ม “ลองอัปเดตอีกครั้ง” กดซ้ำทันที → ส่งคำขอรอบเดียว', nReq === 1, 'คำขอ inc ' + nReq + ' ครั้ง');
    await pg.waitForTimeout(1200); await pg.evaluate(() => window.scrollTo(0, 300));      // การคลิกปุ่มบนแถบเตือนเลื่อนหน้าไปด้านบน — ตั้งตำแหน่งใหม่ก่อนวัดการฟื้น
    const sPre = await st();
    await page.request.get(BASE + '/__test/scope500/inc/off'); await page.request.get(BASE + '/__test/scope500/rest/off'); await refresh(); const s3 = await st();
    ok('[รอบ 14.1] ต้นทาง/บริการกลับมา → คำเตือนหายเอง หัวเว็บเป็น “ข้อมูลสด” · ไม่โหลดหน้าใหม่ · เนื้อหาบนจอไม่กระโดด (สถานะหน้าเดิม)', !s3.ban && /ข้อมูลสดอ่านจากต้นทางเมื่อ/.test(s3.stamp) && s3.mark === 1 && Math.abs(s3.anchor - sPre.anchor) < 5, JSON.stringify({ ban: s3.ban, stamp: s3.stamp, mark: s3.mark, anchor: [sPre.anchor, s3.anchor], y: [sPre.y, s3.y] }));
    // HTTP 200 แต่ส่วนเดียวล้ม (เนื้อหาต้นทางขาด) → เตือนเฉพาะแหล่งนั้น · ส่วนอื่นยังสด
    await page.request.get(BASE + '/__test/bodyfail/480256005/on'); await refresh(); const s4 = await st(); await page.request.get(BASE + '/__test/bodyfail/480256005/off');
    ok('[รอบ 14.1] HTTP 200 แต่ส่วนรายงานเหตุการณ์อ่านเนื้อหาไม่ครบ → เตือนเฉพาะรายงานเหตุการณ์ (สาเหตุ “ต้นทางตอบช้าเกินกำหนด” ไม่ใช่ internal)', s4.det.length === 1 && /^รายงานเหตุการณ์/.test(s4.det[0]) && /ต้นทางตอบช้าเกินกำหนด/.test(s4.det[0]), JSON.stringify(s4.det));
    await refresh(); const s5 = await st();
    ok('[รอบ 14.1] รอบถัดไปอ่านสำเร็จ → error ของแหล่งนั้นไม่ค้าง', !s5.ban && /ข้อมูลสดอ่านจากต้นทางเมื่อ/.test(s5.stamp), s5.ban);
    await shot(pg, '14_1_banner_MOCK'); await M.ctx.close();
  }
  { // รอบ 13 ต่อ: เปิด Dashboard ค้างข้าม 00:00 (เวลาไทย) โดยข้อมูลไม่เปลี่ยน → “วันนี้” และยอดของวันนี้ต้องเปลี่ยนตามวันจริง
    const M = await mk(); const p2 = M.page; await p2.goto(BASE + '/#dashboard'); await p2.waitForSelector('#loginView'); await login(p2, '0123'); await p2.waitForSelector('.nows .now'); await p2.waitForTimeout(1200);
    const bk = new Date(Date.now() + 7 * 3600e3), nd = new Date(Date.UTC(bk.getUTCFullYear(), bk.getUTCMonth(), bk.getUTCDate() + 1, 0, 5) - 7 * 3600e3);
    const ndKey = nd.getTime() + 7 * 3600e3, ndD = new Date(ndKey), lab = ndD.getUTCDate() + ' ' + ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][ndD.getUTCMonth()] + ' ' + (ndD.getUTCFullYear() + 543);
    const chip0 = await txt(p2, '.dash-meta .upd'); await p2.clock.setFixedTime(nd);
    let n0 = 0; p2.on('request', (q) => { if (/\/api\/stats\?/.test(q.url())) n0++; }); await p2.evaluate(() => window.__hub.live()); for (let i = 0; i < 40 && n0 < 2; i++) await p2.waitForTimeout(100); await p2.waitForTimeout(800);
    const chip1 = await txt(p2, '.dash-meta .upd'), inc1 = await p2.evaluate(() => (document.querySelector('.nows .now') || {}).innerText || '');
    ok('[รอบ 13·วันใหม่] เปิด Dashboard ค้างข้ามเที่ยงคืน ข้อมูลไม่เปลี่ยน → ป้าย “วันนี้” เป็นวันใหม่ และการ์ดไม่อ้างยอด “วันนี้ ณ …” ของเมื่อวาน', chip1.includes(lab) && chip1 !== chip0 && !/วันนี้ ณ/.test(inc1), chip0 + ' → ' + chip1 + ' | ' + inc1.replace(/\s+/g, ' ').slice(0, 90));
    await M.ctx.close();
  }
  // ทะเบียนนักศึกษา–จยย. / เรือนไทย / สถานะแหล่งข้อมูล (ข้อมูลสดผ่านตัวกลาง MOCK)
  await page.reload(); await page.waitForTimeout(800); await go(page, 'vehicle'); await page.waitForSelector('section[aria-label="นักศึกษา – รถจักรยานยนต์"]');
  { const t = await txt(page, 'section[aria-label="นักศึกษา – รถจักรยานยนต์"]'); ok('[MOCK ตัวกลาง] นักศึกษา–จยย.: รายการลงทะเบียน 3 · จำนวนรถตามที่กรอก 4 คัน แยกกัน · ไม่มีชื่อ/ทะเบียน', /รายการลงทะเบียน\s*3/.test(t) && /จำนวนรถตามที่กรอก\s*4/.test(t) && !/ชื่อนักศึกษาสมมติ|กข1/.test(t), t.slice(0, 300)); }
  ok('หน้าทะเบียนยานพาหนะ: การ์ด “นักศึกษา – รถจักรยานยนต์” มีตัวเลขสด (ไม่ใช่ “ไม่มีข้อมูลยืนยัน”)', /นักศึกษา – รถจักรยานยนต์\s*3/.test(await txt(page, '.kpis')), await txt(page, '.kpis'));
  await go(page, 'parking'); await page.waitForSelector('.dv[data-ds="ruenthai"] table');
  { const t = await txt(page, '.dv[data-ds="ruenthai"]'); ok('[MOCK ตัวกลาง] เรือนไทย: 3 ชุด · รถ 4 คัน · กลุ่ม/ประเภทรถ/LPR (รวมไม่ระบุ) · ไม่มีชื่อ/ทะเบียน', /แบบสำรวจตามตัวกรอง\s*3/.test(t) && /จำนวนรถ \(Car_Count\)\s*4/.test(t) && /รถกระบะ/.test(t) && /\(ไม่ระบุ\)/.test(t) && !/ชื่อผู้ตอบสมมติ|ทบ1/.test(t), t.slice(0, 300)); }
  await page.selectOption('.dv[data-ds="ruenthai"] select[aria-label="สถานะ LPR"]', 'อัปเดตแล้ว'); await page.waitForTimeout(150); ok('เรือนไทย: กรองสถานะ LPR → 1 ชุด', /^1 ชุด/.test(await txt(page, '.dv[data-ds="ruenthai"] .lu-count')));
  await shot(page, '10c_ruenthai_live', true);
  await go(page, 'settings'); await page.waitForSelector('section[aria-label="อ่านข้อมูลสดจากต้นทาง"] table');
  { const t = await txt(page, 'section[aria-label="อ่านข้อมูลสดจากต้นทาง"]'); ok('ตั้งค่า: สถานะอ่านข้อมูลสดทีละแหล่ง (อ่านสำเร็จ + เวลา · ช่องทาง) แยกจากไฟล์สรุป', /รายงานเหตุการณ์\s*อ่านสำเร็จ/.test(t) && /ทะเบียนนักศึกษา–รถจักรยานยนต์[^\n]*\s*อ่านสำเร็จ/.test(t) && /ตัวกลางของเจ้าของไฟล์/.test(t) && /ไฟล์สรุป \(snapshot\) สร้างเมื่อ/.test(await txt(page, 'section[aria-label="สถานะข้อมูลและเวลาอัปเดต"]')), t.slice(0, 400)); }
  { const t0 = await txt(page, 'section[aria-label="อ่านข้อมูลสดจากต้นทาง"]'); ok('[รอบ 12] ตั้งค่า: เปิดหน้าปกติไม่ตรวจลึก — บอกว่ายังไม่ได้ตรวจภาพในรอบนี้ และมีปุ่ม “ตรวจตัวกลางแบบลึก”', /ตอบได้ \(จากการอ่านตารางล่าสุด\)/.test(t0) && /ยังไม่ได้ตรวจในรอบนี้/.test(t0) && /ตรวจตัวกลางแบบลึก/.test(t0), t0.slice(-300));
    await page.click('section[aria-label="อ่านข้อมูลสดจากต้นทาง"] button:has-text("ตรวจตัวกลางแบบลึก")'); await page.waitForFunction(() => /รุ่น r13/.test(document.querySelector('section[aria-label="อ่านข้อมูลสดจากต้นทาง"]').innerText), null, { timeout: 15000 }); }
  { const t = await txt(page, 'section[aria-label="อ่านข้อมูลสดจากต้นทาง"]'); ok('ตั้งค่า: ตัวกลางแยกขั้นตรวจ (ตั้งค่าแล้ว · ตอบได้รุ่น r13 · อ่านแต่ละตาราง · อ่านภาพที่อนุญาต)', /ตั้งค่าในระบบ\s*ตั้งค่าแล้ว/.test(t) && /ตอบได้ · รุ่น r13/.test(t) && /อ่านตาราง[^\n]*เรือนไทย[^\n]*\s*อ่านได้ · \d+ แถว/.test(t) && /อ่านภาพ GPS ที่อนุญาต[^\n]*\s*(อ่านได้|ไม่มีภาพตัวอย่างให้ตรวจ)/.test(t), t.slice(t.indexOf('HubRelay'), t.indexOf('HubRelay') + 400)); await shot(page, '11_settings_relay_check_MOCK', true); }
  await page.request.get(BASE + '/__test/relay/off'); await page.reload(); await page.waitForSelector('section[aria-label="อ่านข้อมูลสดจากต้นทาง"] table');
  ok('ตั้งค่า: ยังไม่ได้เปิดตัวกลาง → ไฟล์ส่วนตัวขึ้น “อ่านไม่สำเร็จ” พร้อมสาเหตุเฉพาะ (ชุดอื่นยังอ่านสำเร็จ)', /อ่านไม่สำเร็จ\s*ลิงก์แชร์ของ Sheet|ตัวกลางของเจ้าของไฟล์\s*ไฟล์ต้นทางเป็นส่วนตัว — ยังไม่ได้เปิดตัวกลาง/.test(await txt(page, 'section[aria-label="อ่านข้อมูลสดจากต้นทาง"]')) && /รายงานเหตุการณ์\s*อ่านสำเร็จ/.test(await txt(page, 'section[aria-label="อ่านข้อมูลสดจากต้นทาง"]')));
  await go(page, 'vehicle'); await page.waitForTimeout(400);
  ok('ยังไม่ได้เปิดตัวกลาง: การ์ดนักศึกษา–จยย. บอกสาเหตุ (ไม่ใช่ “ยังเชื่อมต่อไม่ได้” กว้าง ๆ)', /ไฟล์ต้นทางเป็นส่วนตัว — ยังไม่ได้เปิดตัวกลาง/.test(await txt(page, '#view')), (await txt(page, '#view')).slice(0, 300));
  await page.request.get(BASE + '/__test/relay/on'); await page.reload(); await page.waitForTimeout(600);
  // ---------- 7) ผู้ช่วย AI ----------
  await go(page, 'dashboard'); await page.waitForSelector('.now');
  ok('ปุ่มผู้ช่วย: รูปหุ่นยนต์ (ไฟล์ assets/images/ai-assistant.png โหลดได้) + ป้าย “ถาม AI”', (await txt(page, '#chatFab')) === 'ถาม AI' && await page.evaluate(() => { const i = document.querySelector('#chatFab .fab-bot'); return i.complete && i.naturalWidth === 256 && /assets\/images\/ai-assistant\.png$/.test(i.src); }));
  { const r = await page.request.get(BASE + '/assets/images/ai-assistant.png'); ok('ไฟล์รูปหุ่นยนต์: 200 + image/png (ไม่ต้อง Login)', r.status() === 200 && /^image\/png/.test(r.headers()['content-type'] || '')); }
  await page.click('#chatFab'); await page.waitForTimeout(350);
  ok('เปิดผู้ช่วยบนจอกว้าง: เป็นแถบด้านขวา เนื้อหาถูกดันเข้า — ไม่ทับการ์ดตัวเลขและแผนที่ · ระบุช่วงตรงกับปุ่ม “วันนี้” ของหน้าแรก', await page.evaluate(() => { const p = document.getElementById('chatPanel').getBoundingClientRect(); const hit = [...document.querySelectorAll('.now, .trend, .dash-map')].some((e) => { const r = e.getBoundingClientRect(); return r.right > p.left + 1 && r.left < p.right && r.bottom > p.top && r.top < p.bottom; }); return !hit && /ช่วงที่กำลังดู: วันนี้ \d+ /.test(document.getElementById('chatPanel').textContent) && document.documentElement.scrollWidth <= window.innerWidth; }), await txt(page, '#chatPanel'));
  await page.fill('#chatPanel textarea, #chatPanel input[type=text]', 'เดือนนี้มีเหตุการณ์กี่ครั้ง'); await page.keyboard.press('Enter'); await page.waitForFunction(() => /คำตอบจากบริการ AI จำลอง/.test(document.getElementById('chatPanel').textContent), null, { timeout: 8000 }).catch(() => {});
  ok('[MOCK AI] ถามผ่าน /api/chat ด้วย session เดียวกัน → ได้คำตอบพร้อมแหล่งข้อมูล', /คำตอบจากบริการ AI จำลอง/.test(await txt(page, '#chatPanel')) && log.api.some((a) => a === 'POST /api/chat'), (await txt(page, '#chatPanel')).slice(-200));
  // รอบ 14·P2: หลักฐานความสด + ปุ่มดูต่อ (หน้าที่อนุญาต) + ทักทายไม่เรียก AI + สรุปช่วงที่กำลังดู (คำนวณจากข้อมูล ไม่ใช้ AI)
  { const ev = await page.evaluate(() => { const m = Array.from(document.querySelectorAll('#chatPanel .chat-m.ai')).pop(); return { tags: Array.from(m.querySelectorAll('.ev-tag')).map((x) => x.textContent), acts: Array.from(m.querySelectorAll('.chat-act a')).map((a) => a.getAttribute('href')), meta: (m.querySelector('.chat-src') || {}).textContent || '' }; });
    ok('[รอบ 14·P2·MOCK AI] คำตอบมีป้ายความสดรายแหล่ง (สด/ผลอ่านสำเร็จล่าสุด/ไฟล์สรุป) + ปุ่มดูต่อที่เป็นหน้าในระบบ + บอกจำนวนแหล่งที่อ่านและเวลา', ev.tags.length >= 1 && ev.tags.every((t) => /^(สด|ผลอ่านสำเร็จล่าสุด|ไฟล์สรุป)$/.test(t)) && ev.acts.length >= 1 && ev.acts.every((h) => /^#[a-z-]+(\?from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2})?$/.test(h)) && /อ่านแหล่งข้อมูลสด \d+ ส่วน · [\d.]+ วินาที/.test(ev.meta), JSON.stringify(ev)); }
  { const n0 = log.api.filter((a) => a === 'POST /api/chat').length; await page.fill('#chatPanel textarea', 'สวัสดีครับ'); await page.keyboard.press('Enter'); await page.waitForTimeout(900);
    const t = await page.evaluate(() => (Array.from(document.querySelectorAll('#chatPanel .chat-m.ai')).pop() || {}).textContent || '');
    ok('[รอบ 14·P2] ทักทาย → ตอบทันทีจากเมนูของระบบ (ไม่ใช้ AI/ไม่อ่านแหล่ง) + มีปุ่ม “สรุปช่วงที่กำลังดู”', /ไม่ได้ใช้ AI และไม่ได้อ่านแหล่งข้อมูล/.test(t) && /สรุปช่วงที่กำลังดู/.test(t) && !/คำตอบจากบริการ AI จำลอง/.test(t) && log.api.filter((a) => a === 'POST /api/chat').length === n0 + 1, t.slice(0, 200)); }
  await page.click('#chatPanel .chat-m.ai:last-child .chat-act button'); await page.waitForFunction(() => /^สรุป /.test((Array.from(document.querySelectorAll('#chatPanel .chat-m.ai')).pop() || {}).textContent || ''), null, { timeout: 8000 }).catch(() => {});
  { const sm = await page.evaluate(() => { const m = Array.from(document.querySelectorAll('#chatPanel .chat-m.ai')).pop(); return { n: m.querySelectorAll('.chat-sum li').length, tags: m.querySelectorAll('.ev-tag').length, meta: (m.querySelector('.chat-src') || {}).textContent || '', act: (m.querySelector('.chat-act a[href^="#traffic"]') || {}).getAttribute ? m.querySelector('.chat-act a[href^="#traffic"]').getAttribute('href') : '' }; });
    ok('[รอบ 14·P2] “สรุปช่วงที่กำลังดู” → 3–5 ประเด็น + ป้ายความสด + ปุ่มดูรายการเหตุการณ์ตามช่วง · ระบุว่าคำนวณจากข้อมูลโดยตรง (ไม่ใช้ AI)', sm.n >= 3 && sm.n <= 5 && sm.tags >= 1 && /คำนวณจากข้อมูลโดยตรง/.test(sm.meta) && /^#traffic\?from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}$/.test(sm.act), JSON.stringify(sm));
    await shot(page, '05b_chat_summary_MOCK');
    if (sm.act) { await page.click('#chatPanel .chat-m.ai:last-child .chat-act a[href^="#traffic"]'); await page.waitForSelector('.incb-ctl input[type=date]', { timeout: 8000 }).catch(() => {}); await page.waitForTimeout(400);
      const d = await page.evaluate(() => Array.from(document.querySelectorAll('.incb-ctl input[type=date]')).map((i) => i.value)), q = sm.act.split('?')[1].split('&').map((x) => x.split('=')[1]);
      ok('[รอบ 14·P2] กดปุ่มดูต่อ → หน้ารายงานเหตุการณ์ตั้งช่วงวันที่ตามปุ่ม (จำกัดในช่วงที่มีข้อมูล)', d.length === 2 && d[0] >= q[0] && d[1] <= q[1] && d[0] <= d[1], JSON.stringify({ d, q })); } }
  await shot(page, '05_chat_MOCK_AI'); await page.keyboard.press('Escape');

  // ---------- รอบ 13: race ของข้อมูลสดข้ามรุ่น Login ----------
  { let statsC = 0; const onReq = (q) => { if (/\/api\/stats\?/.test(q.url())) statsC++; }; page.on('request', onReq); const statsN = () => statsC;
    // (1) ชุดส่วนตัวตอบ 401 (หมดสิทธิ์ระหว่างทาง) → กลับหน้า Login (เดิมเงียบ หน้าค้างข้อมูลเดิม)
    await go(page, 'dashboard'); await page.waitForTimeout(300);
    await page.route('**/api/stats?scope=private', (r) => r.fulfill({ status: 401, contentType: 'application/json', body: '{"ok":false,"code":"no-session"}' }));
    await page.evaluate(() => window.__hub.live()); await page.waitForTimeout(800);
    ok('[รอบ 13·race] /stats?scope=private ตอบ 401 → กลับหน้า Login (ไม่ค้างข้อมูลภายใน)', await T(page, '#loginView').count() === 1 && !(await page.evaluate(() => document.getElementById('view').textContent.trim().length)));
    await page.unroute('**/api/stats?scope=private'); await login(page, '0123'); await page.waitForSelector('#userBox'); await page.waitForTimeout(1500);
    // (2) คำตอบของรุ่น Login ก่อนหน้าที่มาช้า ไม่ลดตัวนับงานของรุ่นใหม่ (ไม่ยิงคำขอซ้ำซ้อนระหว่างรุ่นใหม่ยังรอ) และไม่ทำให้ข้อมูลเดิมกลับมา
    await page.route('**/api/stats?*', async (r) => { await new Promise((ok2) => setTimeout(ok2, 3000)); r.continue().catch(() => {}); });
    const n0 = statsN(), t0 = Date.now(); await page.evaluate(() => window.__hub.live());                              // รุ่น 1: 2 คำขอ (ช้า 3 วินาที)
    await page.request.get(BASE + '/__test/expire'); await go(page, 'staff'); await page.waitForSelector('#loginView');     // session หมดอายุ → กลับหน้า Login (รุ่น 2)
    await login(page, '0123'); await page.waitForSelector('#userBox');                                                     // รุ่น 3: เริ่มอ่านสดใหม่ทันที (2 คำขอ)
    const wait = 3000 + 250 - (Date.now() - t0); if (wait > 0) await page.waitForTimeout(wait);                           // คำตอบรุ่น 1 กลับมาแล้ว แต่รุ่น 3 ยังรอ
    const mid = statsN(); await page.evaluate(() => window.__hub.live()); await page.waitForTimeout(200); const after = statsN();
    await page.unroute('**/api/stats?*'); await page.waitForTimeout(3500);
    ok('[รอบ 13·race] คำตอบรุ่น Login ก่อนมาช้า → ไม่ลดตัวนับงานของรุ่นใหม่ (เรียกซ้ำระหว่างรุ่นใหม่ยังรอ = ไม่ยิงคำขอเพิ่ม) · รุ่นใหม่เริ่มอ่านได้ทันที', mid - n0 === 6 && after === mid, 'issued ' + (mid - n0) + ' then +' + (after - mid));
    ok('[รอบ 13·race] หลัง Login ใหม่ หน้าแสดงข้อมูลของ session ปัจจุบัน (ไม่ค้างหน้า Login / ไม่มี error)', await T(page, '#loginView').count() === 0 && /อ่านจากต้นทาง/.test(await txt(page, '#stamp')), await txt(page, '#stamp'));
    page.off('request', onReq);
  }
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
