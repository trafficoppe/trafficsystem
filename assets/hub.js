/* hub.js — ระบบงานจราจรและความปลอดภัย มหาวิทยาลัยมหิดล (หน้ารวม รุ่นทดลอง รอบ 3)
 * โครงสร้าง: Sidebar (ย่อ/ขยาย/ตรึง) + พื้นที่เนื้อหากลาง เปลี่ยนหน้าด้วย #hash (ปุ่มย้อนกลับ/ลิงก์ตรงใช้ได้)
 * อ่านเฉพาะ "สถิติรวม" (data/stats.json หรือ Stats API) บัญชีระบบ (data/systems.json) และข้อมูลประกอบ (data/extra.json)
 * ไม่อ่าน Google Sheet ดิบ ไม่มีชื่อบุคคล/เบอร์โทร/ทะเบียนรถ/ข้อความอิสระ และไม่เขียนข้อมูลกลับไปยังระบบใด
 * ค่าที่จำในเครื่อง (localStorage): โหมด Sidebar, หมวดที่ซ่อน, โหมดสี — ไม่มีข้อมูลส่วนบุคคล */
(function () {
  'use strict';
  var CFG = window.HUB_CONFIG || {};
  var SYS_NAME = 'ระบบงานจราจรและความปลอดภัย มหาวิทยาลัยมหิดล';
  var TH_M = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  var TH_MF = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  var TH_D = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
  var STATUS = { connected: 'เชื่อมต่อสถิติแล้ว', warn: 'เชื่อมต่อแล้ว · มีข้อสังเกต', partial: 'เชื่อมต่อได้บางส่วน', blocked: 'ยังเชื่อมต่อไม่ได้', unverified: 'ไม่มีข้อมูลยืนยัน', link: 'ลิงก์ระบบ (ไม่มีสถิติ)', legacy: 'ระบบเดิม (เปิดแยก)' };
  var C = { c1: '#0b7a5a', c2: '#d9822b', c3: '#2f6fb0', c4: '#8e6bbf', c5: '#7c8797', fine: '#b4432f' };
  var V = 'อุบัติเหตุจากยานพาหนะ', G = 'อุบัติเหตุทั่วไป', P = 'รับส่งผู้ป่วย';
  var state = { from: null, to: null, mapType: 'all', mapView: 'auto', sel: -1, satSrc: 'central', satMonth: null, rosterMonth: null, rosterMode: 'name', rosterQ: '' };
  var DATA = null, MONTHS = [], liveMode = false, SYS = {};

  /* ---------- ไอคอน (เส้น 24×24 ชุดเดียวกันทั้งหน้า) ---------- */
  var ICON = {
    menu: 'M4 6h16M4 12h16M4 18h16', chev: 'M9 6l6 6-6 6', x: 'M6 6l12 12M18 6L6 18', home: 'M3 11l9-7 9 7M5 10v10h5v-6h4v6h5V10',
    alert: 'M12 3l9.5 17H2.5L12 3zM12 10v4M12 17.5v.01', camera: 'M4 7h3l2-2h6l2 2h3v12H4zM12 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
    car: 'M5 16l1.5-6h11L19 16M3 16h18v3H3zM7 19v1.5M17 19v1.5M7 13h.01M17 13h.01', cap: 'M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5M22 9v6',
    shield: 'M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z', box: 'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10',
    search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4', heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10zM8 11h2l1-2 2 4 1-2h2',
    file: 'M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6', grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z', map: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14',
    users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21c0-4 3-6 7-6s7 2 7 6M17 7a3 3 0 0 1 0 6M22 21c0-3-2-5-5-5.5', star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
    coin: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9 9.5c0-1 1.3-1.8 3-1.8s3 .8 3 1.8-1.3 1.6-3 1.8-3 .8-3 1.9 1.3 1.8 3 1.8 3-.8 3-1.8M12 6v1.7M12 16.3V18',
    scan: 'M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M7 12h10', calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4', helmet: 'M4 15a8 8 0 0 1 16 0v2H4zM12 7v8M3 17h18',
    ext: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6', back: 'M15 6l-6 6 6 6', pin: 'M9 4h6l-1 6 3 3H7l3-3zM12 13v7',
    gear: 'M10.3 3.5h3.4l.5 2.4 1.7 1 2.3-.8 1.7 3-1.8 1.6v2l1.8 1.6-1.7 3-2.3-.8-1.7 1-.5 2.4h-3.4l-.5-2.4-1.7-1-2.3.8-1.7-3 1.8-1.6v-2L4.1 9.1l1.7-3 2.3.8 1.7-1zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    chart: 'M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-8', print: 'M7 9V4h10v5M7 17H4v-7h16v7h-3M7 14h10v6H7z', form: 'M6 3h9l3 3v15H6zM9 9h6M9 13h6M9 17h3',
    clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2', bot: 'M5 9h14v10H5zM12 9V5M12 5h.01M9 13.5h.01M15 13.5h.01M9.5 16.5h5M2.5 13v3M21.5 13v3',
    sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6L19 19M5 19l1.4-1.4M17.6 6.4L19 5', moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z',
    info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 7.5v.01', check: 'M5 12.5l4.5 4.5L19 7.5'
  };
  function ic(name, size) {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', 'ic'); s.setAttribute('aria-hidden', 'true');
    if (size) { s.style.width = size + 'px'; s.style.height = size + 'px'; }
    var p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', ICON[name] || ''); s.appendChild(p); return s;
  }

  /* ---------- เมนู 15 หมวด (ลำดับและชื่อตามระบบเดิมใน branch main + ระบบที่สำรวจเพิ่ม) ---------- */
  var GUARD_AREAS = [['central', 'ส่วนกลาง'], ['mlc', 'ศูนย์การเรียนรู้มหิดล'], ['pmh', 'มหิดลสิทธาคาร'], ['la', 'อาคารสิริวิทยา'], ['sr', 'สิรีรุกขชาติ'], ['dorm', 'หอพักนักศึกษา']];
  var NAV = [
    { id: 'dashboard', label: 'หน้าหลัก / Dashboard', icon: 'home', fixed: true },
    { group: 'g-staff', label: 'บุคลากร/พนักงาน', icon: 'users', children: [
      { id: 'staff', label: 'บุคลากรทั้งหมด' }, { id: 'staff-strategy', label: 'หน่วยยุทธศาสตร์ฯ' }, { id: 'staff-ops', label: 'หน่วยปฏิบัติการฯ' }] },
    { group: 'g-area', label: 'การดูแลพื้นที่ส่วนกลาง', icon: 'map', children: [
      { id: 'area-inspect', label: 'ตรวจพื้นที่' }, { id: 'area-assist', label: 'ให้ความช่วยเหลือ' }, { id: 'area-traffic', label: 'งานจราจร' }, { id: 'roster', label: 'ตารางเวร' }] },
    { group: 'g-vehicle', label: 'ยานพาหนะและลานจอดรถ', icon: 'car', children: [
      { id: 'vehicle-fleet', label: 'ยานพาหนะทั้งหมด' }, { id: 'parking', label: 'ข้อมูลการจอดรถ' }, { id: 'vehicle', label: 'ระบบลงทะเบียนยานพาหนะ' }, { id: 'tram', label: 'รถรางและจักรยาน Anywheel' }] },
    { group: 'g-traffic', label: 'การจัดการจราจรและแจ้งเหตุ', icon: 'alert', children: [
      { id: 'traffic', label: 'ระบบรายงานเหตุการณ์' }, { id: 'accident-map', label: 'แผนที่จุดเกิดอุบัติเหตุ' }, { id: 'gate', label: 'รายงานจำนวนรถเข้าออกและผู้ไม่สวมหมวกนิรภัย' },
      { id: 'event-incident', label: 'เหตุการณ์กิจกรรมพิเศษ' }, { id: 'helmet-quiz', label: 'แบบทดสอบรณรงค์สวมหมวกนิรภัย' }] },
    { id: 'cctv', label: 'กล้องวงจรปิด (CCTV)', icon: 'camera' },
    { group: 'g-grad', label: 'พิธีพระราชทานปริญญาบัตร', icon: 'cap', children: [{ id: 'graduation', label: 'ปีการศึกษา 2568 (ล่าสุด)' }, { id: 'grad-guard', label: 'รายงาน รปภ. งานปริญญา (GPS)' }] },
    { group: 'g-guard', label: 'ควบคุมงาน รปภ.เอกชน', icon: 'shield', children: GUARD_AREAS.map(function (a) { return { id: 'guard-' + a[0], label: a[1] }; }).concat([
      { id: 'guard-scan', label: 'การสแกนจุดและรายงานปฏิบัติงาน' }]) },
    { id: 'borrow', label: 'ยืม-คืนอุปกรณ์และรถกอล์ฟ', icon: 'box' },
    { id: 'lostfound', label: 'แจ้งของหาย / เก็บของได้', icon: 'search' },
    { group: 'g-safety', label: 'อุปกรณ์ความปลอดภัยและเหตุฉุกเฉิน', icon: 'heart', children: [{ id: 'safety', label: 'อุปกรณ์ดับเพลิงและการตรวจถัง' }, { id: 'aed', label: 'เครื่อง AED' }] },
    { group: 'g-forms', label: 'แบบฟอร์มต่างๆ', icon: 'form', children: [{ id: 'forms', label: 'แบบฟอร์มทั่วไป' }, { id: 'forms-radio', label: 'บันทึกศูนย์วิทยุสื่อสาร' }] },
    { group: 'g-reports', label: 'รายงานและสถิติ', icon: 'chart', children: [
      { id: 'report-daily', label: 'รายงานประจำวัน' }, { id: 'report-radio', label: 'รายงานวิทยุสื่อสาร' }, { id: 'report-monthly', label: 'รายงานประจำเดือน' },
      { id: 'report-guard', label: 'รายงานตรวจรับ รปภ.' }, { id: 'reports', label: 'ระบบสร้างเอกสาร PDF' }] },
    { id: 'inspection-history', label: 'ประวัติการตรวจสภาพ', icon: 'print' },
    { group: 'g-settings', label: 'ตั้งค่าระบบ', icon: 'gear', fixed: true, children: [{ id: 'settings', label: 'ตั้งค่าการแสดงผล' }, { id: 'systems', label: 'สถานะระบบและการเชื่อมต่อ' }, { id: 'ai', label: 'ผู้ช่วย AI ถามสถิติ' }, { id: 'admin-info', label: 'ข้อมูลระบบเพิ่มเติม' }] }
  ];
  var ALIAS = { 'guard-satisfaction': 'report-guard', 'guard-fines': 'report-guard', 'guard': 'guard-central' };   // ลิงก์รุ่นก่อนยังเปิดได้
  var PAGE_TITLE = {}, PAGE_GROUP = {};
  NAV.forEach(function (n) { n.key = n.id || n.group; if (n.id) PAGE_TITLE[n.id] = n.label; (n.children || []).forEach(function (c) { PAGE_TITLE[c.id] = c.label; PAGE_GROUP[c.id] = n; }); });
  PAGE_TITLE.graduation = 'พิธีพระราชทานปริญญาบัตร ปีการศึกษา 2568';

  /* ---------- helpers ---------- */
  function $(id) { return document.getElementById(id); }
  function el(tag, attrs, kids) {
    var n = document.createElement(tag), k;
    for (k in (attrs || {})) {
      if (attrs[k] == null || attrs[k] === false) continue;
      if (k === 'text') n.textContent = attrs[k]; else if (k === 'class') n.className = attrs[k];
      else if (k === 'style') n.setAttribute('style', attrs[k]);
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), attrs[k]); else n.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c != null && c !== false) n.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c); });
    return n;
  }
  function svg(tag, attrs, kids) {
    var n = document.createElementNS('http://www.w3.org/2000/svg', tag), k;
    for (k in (attrs || {})) { if (k === 'text') n.textContent = attrs[k]; else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), attrs[k]); else n.setAttribute(k, attrs[k]); }
    (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }
  function num(x, d) { if (x == null || isNaN(x)) return '–'; return Number(x).toLocaleString('th-TH', d != null ? { minimumFractionDigits: d, maximumFractionDigits: d } : undefined); }
  function mLabel(m) { var p = m.split('-'); return TH_M[+p[1] - 1] + ' ' + String(+p[0] + 543).slice(2); }
  function mFull(m) { var p = m.split('-'); return TH_MF[+p[1] - 1] + ' ' + (+p[0] + 543); }
  function dLabel(s) {
    if (!s) return 'ไม่ทราบ';
    var d = s.split(' ')[0].split('-'), t = s.split(' ')[1];
    return (d[2] ? (+d[2]) + ' ' : '') + TH_M[+d[1] - 1] + ' ' + (+d[0] + 543) + (t ? ' ' + t + ' น.' : '');
  }
  function inRange(m) { return (!state.from || m >= state.from) && (!state.to || m <= state.to); }
  function mod(k) { return (DATA.stats.modules || {})[k] || null; }
  function sumMonthly(list, pick) { return (list || []).filter(function (r) { return inRange(r.month); }).reduce(function (a, r) { return a + (pick(r) || 0); }, 0); }
  function sumObj(o) { var s = 0, k; for (k in o) s += o[k] || 0; return s; }
  function rangeText() { if (!MONTHS.length) return ''; var a = state.from || MONTHS[0], b = state.to || MONTHS[MONTHS.length - 1]; return a === b ? mFull(a) : mLabel(a) + ' – ' + mLabel(b); }
  function mapsUrl(p) { return 'https://www.google.com/maps/search/?api=1&query=' + p.lat + ',' + p.lng; }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  /* ---------- data ---------- */
  function getJson(u) { return fetch(u, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error(u + ' → HTTP ' + r.status); return r.json(); }); }
  function load() {
    var base = window.__HUB_DATA__ ? Promise.resolve(window.__HUB_DATA__)
      : Promise.all([getJson('data/stats.json'), getJson('data/systems.json'), getJson('data/extra.json').catch(function () { return null; })]).then(function (a) { return { stats: a[0], systems: a[1], extra: a[2] }; });
    return base.then(function (d) {
      if (!CFG.statsApiUrl) return d;
      return getJson(CFG.statsApiUrl).then(function (live) {
        if (live && live.modules) { Object.keys(live.modules).forEach(function (k) { d.stats.modules[k] = live.modules[k]; }); d.stats.generatedAt = live.generatedAt || d.stats.generatedAt; liveMode = true; }
        return d;
      }).catch(function (e) { showBanner('เชื่อมต่อ Stats API ไม่ได้ (' + e.message + ') — แสดงข้อมูลจากไฟล์สถิติรวมล่าสุดแทน'); return d; });
    });
  }
  function showBanner(t) { var b = $('banner'); b.textContent = t; b.hidden = false; }

  /* ---------- โครงหน้า: Sidebar ----------
   * เดสก์ท็อป: โหมด auto = ย่อเป็นแถบไอคอน ขยายเมื่อชี้เมาส์/โฟกัสด้วยคีย์บอร์ด/กดปุ่มเมนู · โหมด pinned = เปิดค้าง (ปุ่มหมุด)
   * มือถือ (≤980px): Drawer เปิด/ปิดด้วยปุ่มเมนู ปุ่มปิด พื้นหลัง หรือปุ่ม Esc */
  var openGroups = {}, sbMode = 'auto', hiddenCats = {}, lastInput = 'pointer', expTimer = null;
  function isMobile() { return window.innerWidth <= 980; }
  function loadPrefs() {
    sbMode = store('hub.sb') === 'pinned' ? 'pinned' : 'auto';
    try { (JSON.parse(store('hub.hide') || '[]') || []).forEach(function (k) { hiddenCats[k] = true; }); } catch (e) { hiddenCats = {}; }
    setTheme(store('hub.theme') === 'dark' ? 'dark' : 'light', true);
  }
  function setTheme(t, silent) { document.documentElement.setAttribute('data-theme', t); if (!silent) store('hub.theme', t); }
  function buildNav() {
    var nav = $('nav'), ul = el('ul'); nav.textContent = '';
    NAV.forEach(function (n) {
      if (hiddenCats[n.key] && !n.fixed) return;
      if (!n.children) { ul.appendChild(el('li', {}, [navLink(n.id, n.label, n.icon)])); return; }
      var subId = 'sub-' + n.group, open = !!openGroups[n.group];
      var btn = el('button', { type: 'button', class: 'nav-g', 'aria-expanded': String(open), 'aria-controls': subId, 'data-group': n.group, title: n.label,
        onclick: function () { openGroups[n.group] = !openGroups[n.group]; buildNav(); markActive(); var b = document.querySelector('.nav-g[data-group="' + n.group + '"]'); if (b) b.focus(); }
      }, [ic(n.icon), el('span', { class: 'nav-lbl', text: n.label }), chev()]);
      var sub = el('ul', { class: 'sub', id: subId, hidden: open ? null : 'hidden' });
      n.children.forEach(function (c) { sub.appendChild(el('li', {}, [navLink(c.id, c.label)])); });
      ul.appendChild(el('li', {}, [btn, sub]));
    });
    nav.appendChild(ul);
  }
  function chev() { var c = ic('chev'); c.classList.add('chev'); return c; }
  function navLink(id, label, icon) {
    return el('a', { class: 'nav-a', href: '#' + id, 'data-page': id, title: label, onclick: closeMobileNav }, [icon ? ic(icon) : null, el('span', { class: 'nav-lbl', text: label })]);
  }
  function markActive() {
    var page = currentPage();
    Array.prototype.forEach.call(document.querySelectorAll('.nav-a'), function (a) { if (a.getAttribute('data-page') === page) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    Array.prototype.forEach.call(document.querySelectorAll('.nav-g'), function (b) { b.classList.toggle('has-active', !!PAGE_GROUP[page] && PAGE_GROUP[page].group === b.getAttribute('data-group')); });
  }
  function syncToggle() {
    var app = $('app'), on = isMobile() ? app.classList.contains('open') : (sbMode === 'pinned' || app.classList.contains('sb-exp'));
    $('navToggle').setAttribute('aria-expanded', String(on));
    var pin = $('sbPin'), p = sbMode === 'pinned'; pin.setAttribute('aria-pressed', String(p));
    pin.title = p ? 'เลิกตรึง (ย่อเมนูอัตโนมัติ)' : 'ตรึงเมนูให้เปิดค้าง'; pin.setAttribute('aria-label', pin.title);
  }
  /* ชื่อ “งานจราจรและความปลอดภัย” ต้องอยู่บรรทัดเดียวเสมอ: ถ้าฟอนต์ของเครื่องกว้างกว่าพื้นที่ ให้ย่อขนาดตัวอักษรลงทีละน้อย (ไม่ตัดบรรทัด ไม่ตัดคำ) */
  function fitBrand() {
    var s = document.querySelector('.sb-name strong'); if (!s || !s.clientWidth) return;
    s.style.fontSize = ''; var fs = parseFloat(getComputedStyle(s).fontSize), n = 0;
    while (s.scrollWidth > s.clientWidth + 0.5 && fs > 11 && n++ < 40) { fs -= 0.25; s.style.fontSize = fs + 'px'; }
  }
  function setExp(on) {
    clearTimeout(expTimer); var app = $('app');
    if (sbMode === 'pinned' || isMobile()) app.classList.remove('sb-exp'); else app.classList.toggle('sb-exp', !!on);
    syncToggle(); fitBrand();
  }
  function setSbMode(m) {
    sbMode = m === 'pinned' ? 'pinned' : 'auto'; store('hub.sb', sbMode);
    var app = $('app'); app.classList.toggle('sb-pinned', sbMode === 'pinned' && !isMobile());
    if (sbMode === 'pinned') app.classList.remove('sb-exp');
    syncToggle(); fitBrand();
  }
  function openMobileNav() { var app = $('app'); app.classList.add('open'); $('scrim').hidden = false; syncToggle(); fitBrand(); $('sbClose').focus(); }
  function closeMobileNav() { var app = $('app'); if (app.classList.contains('open')) { app.classList.remove('open'); $('scrim').hidden = true; syncToggle(); } }
  function setupShell() {
    var app = $('app'), sb = $('sidebar'), tg = $('navToggle'), pin = $('sbPin');
    tg.appendChild(ic('menu', 22)); pin.appendChild(ic('pin', 18)); $('sbClose').appendChild(ic('x', 20));
    // ตรามหาวิทยาลัย: URL = Template + File ID (ถ้าโหลดไม่ได้ แสดงพื้นที่โลโก้แบบเรียบพร้อมข้อความ — ไม่ใช้กล่อง MU สีเหลือง)
    var logo = $('sbLogo'), fallback = function () { logo.textContent = 'ม.มหิดล'; logo.classList.add('no-img'); };
    if (CFG.logoUrlTemplate && CFG.logoFileId) {
      var img = el('img', { alt: 'ตรามหาวิทยาลัยมหิดล', width: 40, height: 40, referrerpolicy: 'no-referrer', decoding: 'async' });
      img.onerror = fallback; img.src = CFG.logoUrlTemplate + CFG.logoFileId; logo.appendChild(img);
    } else fallback();
    loadPrefs(); app.classList.toggle('sb-pinned', sbMode === 'pinned' && !isMobile());
    tg.onclick = function () {
      if (isMobile()) { if (app.classList.contains('open')) closeMobileNav(); else openMobileNav(); return; }
      if (sbMode === 'pinned') { setSbMode('auto'); return; }
      setExp(!app.classList.contains('sb-exp'));
    };
    pin.onclick = function () { var toAuto = sbMode === 'pinned'; setSbMode(toAuto ? 'auto' : 'pinned'); if (toAuto) setExp(true); };
    $('sbClose').onclick = function () { closeMobileNav(); tg.focus(); };
    $('scrim').onclick = closeMobileNav;
    sb.addEventListener('mouseenter', function () { if (isMobile() || sbMode === 'pinned') return; clearTimeout(expTimer); expTimer = setTimeout(function () { setExp(true); }, 70); });
    sb.addEventListener('mouseleave', function () { if (isMobile() || sbMode === 'pinned') return; clearTimeout(expTimer);
      expTimer = setTimeout(function () { if (lastInput === 'key' && sb.contains(document.activeElement)) return; setExp(false); }, 240); });
    sb.addEventListener('focusin', function () { if (!isMobile() && lastInput === 'key') setExp(true); });
    sb.addEventListener('focusout', function (e) { if (isMobile()) return; if (!sb.contains(e.relatedTarget) && !sb.matches(':hover')) setExp(false); });
    document.addEventListener('keydown', function (e) {
      lastInput = 'key';
      if (e.key === 'Escape') { if (app.classList.contains('open')) { closeMobileNav(); tg.focus(); } else if (app.classList.contains('sb-exp')) { setExp(false); if (sb.contains(document.activeElement)) tg.focus(); } tipHide(); }
    });
    document.addEventListener('pointerdown', function (e) {
      lastInput = 'pointer';
      if (!isMobile() && app.classList.contains('sb-exp') && !sb.contains(e.target) && !tg.contains(e.target)) setExp(false);
      if (!(e.target.closest && e.target.closest('.col,.row'))) tipHide();
    });
    window.addEventListener('resize', function () {
      app.classList.toggle('sb-pinned', sbMode === 'pinned' && !isMobile());
      if (isMobile()) app.classList.remove('sb-exp'); else closeMobileNav();
      syncToggle(); tipHide(); fitBrand();
    });
    window.addEventListener('scroll', tipHide, { passive: true });
    syncToggle(); fitBrand();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitBrand);
  }

  /* ---------- router ---------- */
  var PAGES = {};
  function currentPage() { var h = ''; try { h = decodeURIComponent((location.hash || '').replace('#', '')); } catch (e) { h = ''; } h = ALIAS[h] || h; return PAGES[h] ? h : 'dashboard'; }
  function go(page) { if (currentPage() === page) route(true); else location.hash = '#' + page; }
  function route(first) {
    var page = currentPage(), grp = PAGE_GROUP[page];
    if (!first || !Object.keys(openGroups).length) openGroups = {};     // เปลี่ยนหน้า = เปิดเฉพาะหมวดของหน้าปัจจุบัน (เมนูไม่ยาวเกิน)
    if (grp) openGroups[grp.group] = true;
    buildNav(); markActive(); tipHide();
    var crumb = $('crumb'); crumb.textContent = '';
    if (grp) crumb.appendChild(el('span', { class: 'crumb-g', text: grp.label + ' › ' }));
    crumb.appendChild(document.createTextNode(PAGE_TITLE[page] || ''));
    document.title = (page === 'dashboard' ? '' : (PAGE_TITLE[page] + ' · ')) + SYS_NAME;
    var view = $('view'); view.textContent = '';
    try { PAGES[page](view, page); var tb = grp && !view.querySelector('.tabs') ? tabsOf(grp.group, page) : null, ph = view.querySelector('.ph'); if (tb && ph) ph.parentNode.insertBefore(tb, ph.nextSibling); } catch (e) { view.appendChild(el('div', { class: 'card box' }, [el('strong', { text: 'แสดงหน้านี้ไม่สำเร็จ' }), el('p', { text: String(e && e.message || e) })])); if (window.console) console.error(e); }
    if (!first) { window.scrollTo(0, 0); view.focus({ preventScroll: true }); }
  }

  /* ---------- ชิ้นส่วนหน้า ---------- */
  function pageHead(title, desc, ctrls) {
    return el('div', { class: 'ph' }, [el('div', {}, [el('h1', { text: title }), desc ? el('p', { text: desc }) : null]), ctrls || null]);
  }
  function section(title, opts, kids) {
    opts = opts || {};
    return el('section', { class: 'sec', 'aria-label': title }, [el('div', { class: 'sec-h' }, [el('h2', { text: title }), opts.note ? el('span', { class: 'note', text: opts.note }) : null,
      opts.more ? el('a', { class: 'more', href: '#' + opts.more, text: 'ดูรายละเอียด →' }) : null])].concat(kids));
  }
  function rangeCtrl() {
    var f = el('select', { 'aria-label': 'เดือนเริ่มต้น' }), t = el('select', { 'aria-label': 'เดือนสิ้นสุด' });
    [f, t].forEach(function (s) { MONTHS.forEach(function (m) { s.appendChild(el('option', { value: m, text: mLabel(m) })); }); });
    f.value = state.from; t.value = state.to;
    function ch() { state.from = f.value; state.to = t.value; if (state.from > state.to) state.to = state.from; route(true); }
    f.onchange = ch; t.onchange = ch;
    return el('div', { class: 'ctrls' }, [ic('calendar'), el('label', { text: 'ช่วงเดือน' }), f, el('span', { text: 'ถึง' }), t,
      el('button', { type: 'button', class: 'btn-ghost', text: 'ทั้งหมด', onclick: function () { state.from = MONTHS[0]; state.to = MONTHS[MONTHS.length - 1]; route(true); } })]);
  }
  function kpi(o) {
    var b = [el('div', { class: 'kpi-top' }, [o.icon ? ic(o.icon, 18) : null, el('span', { text: o.label })])];
    if (o.na) b.push(el('div', { class: 'kpi-na', text: o.na }));
    else b.push(el('div', { class: 'kpi-num' }, [o.value, o.unit ? el('small', { text: o.unit }) : null]));
    if (o.sub) b.push(el('div', { class: 'kpi-sub', text: o.sub }));
    if (o.tag) b.push(el('div', {}, [el('span', { class: 'tag ' + (o.tagTone || 'warn'), text: o.tag })]));
    var metaTxt = [o.scope, o.source ? 'ที่มา: ' + o.source : null, o.updated ? 'อัปเดต ' + dLabel(o.updated) : null].filter(Boolean).join(' · ');
    b.push(el('div', { class: 'kpi-meta' }, [el('span', { text: metaTxt }), o.more ? el('a', { href: '#' + o.more, text: 'ดูรายละเอียด →' }) : null]));
    return el('article', { class: 'card kpi', style: '--accent:' + (o.color || C.c1) }, b);
  }
  function kpiGrid(list) { return el('div', { class: 'kpis' }, list.map(kpi)); }
  function figure(title, caption, body) { var f = el('figure', { class: 'card chart' }, [el('figcaption', {}, [el('strong', { text: title }), caption ? el('span', { text: caption }) : null])]); f.appendChild(body); return f; }
  function notesList(list, tone) { return list && list.length ? el('ul', { class: 'notes' + (tone ? ' ' + tone : '') }, list.map(function (n) { return el('li', { text: n }); })) : null; }
  function srcLine(m) { return m ? el('p', { class: 'src', text: 'ที่มา: ' + m.source + (m.updated ? ' · อัปเดตล่าสุด ' + dLabel(m.updated) : '') }) : null; }
  function infoBox(title, m, extra) {
    if (!m) return null;
    return el('div', { class: 'card box' }, [el('h3', { text: title }), m.definition ? el('p', { class: 'def', text: 'นิยาม: ' + m.definition }) : null, srcLine(m), notesList(m.notes, 'warn'), extra || null]);
  }
  function table(head, rows, opts) {
    opts = opts || {};
    var t = el('table', { class: 'tbl' }), tr = el('tr');
    head.forEach(function (h, i) { tr.appendChild(el('th', { class: (opts.num || []).indexOf(i) >= 0 ? 'num' : null, text: h })); });
    t.appendChild(el('thead', {}, [tr]));
    var tb = el('tbody');
    rows.forEach(function (r) { var x = el('tr'); r.forEach(function (c, i) { x.appendChild(el('td', { class: (opts.num || []).indexOf(i) >= 0 ? 'num' : null }, [c == null ? '–' : (c.nodeType ? c : String(c))])); }); tb.appendChild(x); });
    t.appendChild(tb);
    if (opts.foot) { var f = el('tr'); opts.foot.forEach(function (c, i) { f.appendChild(el('td', { class: (opts.num || []).indexOf(i) >= 0 ? 'num' : null, text: c == null ? '' : String(c) })); }); t.appendChild(el('tfoot', {}, [f])); }
    return el('div', { class: 'tbl-wrap' }, [t]);
  }

  /* ---------- กราฟ Interactive (SVG ในหน้า ไม่ใช้ไลบรารีภายนอก) ----------
   * ทุกกราฟ: Tooltip เมื่อชี้เมาส์/แตะ/โฟกัสด้วยคีย์บอร์ด (ปุ่มลูกศรซ้าย-ขวา/ขึ้น-ลง เลื่อนระหว่างแท่ง) แสดงเดือน ชื่อชุดข้อมูล และค่าจริง
   * กราฟที่คลิกได้: คลิก/Enter = กรองหรือเปิดรายละเอียดของจุดนั้น (บนจอสัมผัส แตะครั้งแรกดูค่า แตะซ้ำเพื่อเปิด)
   * วาดตามความกว้างจริงของกล่อง (ResizeObserver) ตัวอักษรจึงไม่ย่อจนอ่านไม่ออกบนมือถือ */
  var tipOwner = null;
  function tipNodes(title, rows, o) {
    o = o || {}; var out = [el('strong', { text: title })];
    rows.forEach(function (r) { out.push(el('div', { class: 'tr' }, [el('span', {}, [r.color ? el('i', { style: 'background:' + r.color }) : null, r.name]), el('b', { text: r.value })])); });
    if (o.total != null) out.push(el('div', { class: 'tr tt' }, [el('span', { text: 'รวม' }), el('b', { text: o.total })]));
    if (o.hint) out.push(el('em', { text: o.hint }));
    return out;
  }
  function tipAt(nodes, x, y) {
    var t = $('tip'); t.textContent = ''; nodes.forEach(function (n) { t.appendChild(n); }); t.hidden = false;
    var r = t.getBoundingClientRect(), L = x + 14, T = y + 16;
    if (L + r.width > window.innerWidth - 8) L = Math.max(8, x - r.width - 14);
    if (T + r.height > window.innerHeight - 8) T = Math.max(8, y - r.height - 14);
    t.style.left = L + 'px'; t.style.top = T + 'px';
  }
  function tipHide() { var t = $('tip'); if (t) t.hidden = true; if (tipOwner) { tipOwner.classList.remove('on'); tipOwner = null; } }
  function bindTip(node, make, onPick) {
    var touchFirst = false;
    function show(x, y) { if (tipOwner && tipOwner !== node) tipOwner.classList.remove('on'); tipOwner = node; node.classList.add('on'); tipAt(make(), x, y); }
    // จอสัมผัส: แตะครั้งแรก = แสดงค่า (ยังไม่เปิดหน้า) · แตะซ้ำที่เดิม = เปิดรายละเอียด  (pointerenter มาก่อน pointerdown เสมอ)
    node.addEventListener('pointerenter', function (e) { touchFirst = e.pointerType === 'touch' && tipOwner !== node; show(e.clientX, e.clientY); });
    node.addEventListener('pointermove', function (e) { if (e.pointerType !== 'touch') show(e.clientX, e.clientY); });
    node.addEventListener('pointerleave', function (e) { if (e.pointerType !== 'touch') tipHide(); });
    node.addEventListener('focus', function () { if (lastInput !== 'key') return; var r = node.getBoundingClientRect(); show(r.left + r.width / 2, r.top + Math.min(r.height / 2, 60)); });
    node.addEventListener('blur', function () { if (tipOwner === node) tipHide(); });
    node.addEventListener('keydown', function (e) {
      var d = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : (e.key === 'ArrowLeft' || e.key === 'ArrowUp') ? -1 : 0;
      if (d) { var sib = d > 0 ? node.nextElementSibling : node.previousElementSibling; while (sib && !(sib.classList && (sib.classList.contains('col') || sib.classList.contains('row')))) sib = d > 0 ? sib.nextElementSibling : sib.previousElementSibling;
        if (sib) { e.preventDefault(); node.setAttribute('tabindex', '-1'); sib.setAttribute('tabindex', '0'); sib.focus(); } }
      else if (onPick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onPick(); }
    });
    if (onPick) { node.classList.add('pick'); node.addEventListener('click', function () { if (touchFirst) { touchFirst = false; return; } onPick(); }); }
  }
  function responsive(draw) {
    var box = el('div', { class: 'chart-box' }), last = 0;
    function run() { var w = Math.round(box.clientWidth); if (!w || w === last) return; last = w; box.textContent = ''; draw(box, w); }
    if (window.ResizeObserver) new ResizeObserver(run).observe(box); else window.addEventListener('resize', run);
    (window.requestAnimationFrame || setTimeout)(run);
    return box;
  }
  function legendOf(series) { return el('div', { class: 'legend' }, series.map(function (s) { return el('span', {}, [el('i', { style: 'background:' + s.color }), s.name]); })); }
  function niceTop(max, int) { max = Math.max(max, 1); var st = Math.pow(10, Math.floor(Math.log10(max))); if (max / st < 2) st /= 5; else if (max / st < 5) st /= 2; if (int && st < 1) st = 1; return { top: Math.ceil(max / st) * st, step: st }; }
  function fmtTick(v) { return v >= 1000 ? (Math.round(v / 100) / 10) + 'k' : String(Math.round(v * 100) / 100); }
  function compact(v) { return v >= 100000 ? Math.round(v / 1000) + 'k' : v >= 10000 ? (v / 1000).toFixed(1) + 'k' : num(v); }
  function everyN(cols, bw) { var len = 0; cols.forEach(function (c) { len = Math.max(len, String(c.label).length); }); return Math.max(1, Math.ceil((len * 6.4 + 10) / bw)); }
  function yAxis(root, W, L, R, T, ph, lo, top, step, fmt) {
    for (var v = lo; v <= top + 1e-9; v += step) {
      var y = T + ph - ph * (v - lo) / (top - lo);
      root.appendChild(svg('line', { class: 'gl', x1: L, x2: W - R, y1: y, y2: y }));
      root.appendChild(svg('text', { class: 'ax', x: L - 6, y: y + 4, 'text-anchor': 'end', text: fmt ? fmt(v) : fmtTick(v) }));
    }
  }
  /** แท่งรายคอลัมน์ (ซ้อนกันเมื่อมีหลายชุดที่หน่วยเดียวกัน) — opt: {h, int, unit, onPick(i), sel, pickHint, aria} */
  function bars(cols, series, opt) {
    opt = opt || {};
    if (!cols.length) return el('div', { class: 'empty', text: 'ไม่มีข้อมูลในช่วงที่เลือก' });
    var wrap = el('div');
    wrap.appendChild(responsive(function (box, W) {
      var H = opt.h || 250, L = 46, R = 8, T = 22, B = 28, pw = W - L - R, ph = H - T - B, unit = opt.unit ? ' ' + opt.unit : '';
      var totals = cols.map(function (_, i) { return series.reduce(function (a, s) { return a + (s.values[i] || 0); }, 0); });
      var sc = niceTop(Math.max.apply(null, totals), opt.int), top = sc.top;
      var root = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'group', 'aria-label': opt.aria || 'แผนภูมิแท่ง' });
      yAxis(root, W, L, R, T, ph, 0, top, sc.step);
      var bw = pw / cols.length, w = Math.max(3, Math.min(48, bw * 0.68)), every = everyN(cols, bw), showTotals = bw >= 34;
      cols.forEach(function (c, i) {
        var x = L + bw * i + (bw - w) / 2, acc = 0;
        var g = svg('g', { class: 'col' + (opt.sel === i ? ' sel' : ''), tabindex: i === 0 ? '0' : '-1', role: 'img',
          'aria-label': c.full + ': ' + series.map(function (s) { return s.name + ' ' + num(s.values[i] || 0); }).join(', ') + (series.length > 1 ? ', รวม ' + num(totals[i]) : '') + unit });
        g.appendChild(svg('rect', { class: 'hit', x: L + bw * i, y: T - 16, width: bw, height: ph + 16 + B, rx: 6 }));
        series.forEach(function (s) {
          var val = s.values[i] || 0; if (!val) return;
          g.appendChild(svg('rect', { x: x, y: T + ph - ph * (acc + val) / top, width: w, height: Math.max(ph * val / top - (series.length > 1 ? 1 : 0), 1), rx: 2.5, fill: s.color })); acc += val;
        });
        if (showTotals && totals[i]) g.appendChild(svg('text', { class: 'vl', x: x + w / 2, y: T + ph - ph * totals[i] / top - 5, 'text-anchor': 'middle', text: compact(totals[i]) }));
        if (i % every === 0) g.appendChild(svg('text', { class: 'ax', x: x + w / 2, y: H - 9, 'text-anchor': 'middle', text: c.label }));
        bindTip(g, function () {
          return tipNodes(c.full, series.map(function (s) { return { name: s.name, color: s.color, value: num(s.values[i] || 0) + unit }; }),
            { total: series.length > 1 ? num(totals[i]) + unit : null, hint: opt.onPick ? (opt.pickHint || 'คลิกเพื่อดูรายละเอียดของเดือนนี้') : null });
        }, opt.onPick ? function () { opt.onPick(i, c); } : null);
        root.appendChild(g);
      });
      box.appendChild(root);
    }));
    if (series.length > 1) wrap.appendChild(legendOf(series));
    return wrap;
  }
  /** เส้นแนวโน้ม (ใช้กับคะแนนหรือค่าที่ไม่ควรบวกกัน) — series: [{name,color,values(null=ไม่มีข้อมูล)}] ; opt: {min,max,step,dec,unit,h,onPick,sel,labels} */
  function lineChart(cols, series, opt) {
    opt = opt || {};
    if (!cols.length) return el('div', { class: 'empty', text: 'ไม่มีข้อมูลในช่วงที่เลือก' });
    var wrap = el('div'), dec = opt.dec == null ? 2 : opt.dec, unit = opt.unit ? ' ' + opt.unit : '';
    wrap.appendChild(responsive(function (box, W) {
      var H = opt.h || 230, L = 34, R = 12, T = 22, B = 28, pw = W - L - R, ph = H - T - B, lo = opt.min || 0, top = opt.max, step = opt.step || 1;
      var root = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'group', 'aria-label': opt.aria || 'แผนภูมิเส้น' });
      yAxis(root, W, L, R, T, ph, lo, top, step, function (v) { return String(v); });
      var bw = pw / cols.length, every = everyN(cols, bw), X = function (i) { return L + bw * i + bw / 2; }, Y = function (v) { return T + ph - ph * (v - lo) / (top - lo); };
      series.forEach(function (s) {
        var seg = [];
        s.values.concat([null]).forEach(function (v, i) {
          if (v != null) { seg.push(X(i) + ',' + Y(v)); return; }
          if (seg.length > 1) root.appendChild(svg('polyline', { points: seg.join(' '), fill: 'none', stroke: s.color, 'stroke-width': 2.5, 'stroke-linejoin': 'round' })); seg = [];
        });
      });
      cols.forEach(function (c, i) {
        var g = svg('g', { class: 'col' + (opt.sel === i ? ' sel' : ''), tabindex: i === 0 ? '0' : '-1', role: 'img',
          'aria-label': c.full + ': ' + series.map(function (s) { return s.name + ' ' + (s.values[i] == null ? 'ไม่มีข้อมูล' : s.values[i].toFixed(dec)); }).join(', ') + unit });
        g.appendChild(svg('rect', { class: 'hit', x: L + bw * i, y: T - 16, width: bw, height: ph + 16 + B, rx: 6 }));
        series.forEach(function (s) {
          var v = s.values[i]; if (v == null) return;
          g.appendChild(svg('circle', { cx: X(i), cy: Y(v), r: 4.5, fill: s.color, stroke: 'var(--card)', 'stroke-width': 2 }));
          if (series.length === 1 && bw >= 40) g.appendChild(svg('text', { class: 'vl', x: X(i), y: Y(v) - 10, 'text-anchor': 'middle', text: v.toFixed(dec) }));
        });
        if (i % every === 0) g.appendChild(svg('text', { class: 'ax', x: X(i), y: H - 9, 'text-anchor': 'middle', text: c.label }));
        bindTip(g, function () {
          return tipNodes(c.full, series.map(function (s) { return { name: s.name, color: s.color, value: s.values[i] == null ? 'ไม่มีข้อมูล' : s.values[i].toFixed(dec) + unit + (s.notes && s.notes[i] ? ' · ' + s.notes[i] : '') }; }),
            { hint: opt.onPick ? (opt.pickHint || 'คลิกเพื่อดูรายละเอียดของเดือนนี้') : null });
        }, opt.onPick ? function () { opt.onPick(i, c); } : null);
        root.appendChild(g);
      });
      box.appendChild(root);
    }));
    if (series.length > 1) wrap.appendChild(legendOf(series));
    return wrap;
  }
  /** แท่งแนวนอน — items: [{label, value(null=ไม่มีคำถาม), note, color, onPick}] ; max = ค่าสูงสุดของแกน ; opt: {labelW, ticks, dec, unit, aria} */
  function hbars(items, max, opt) {
    opt = opt || {};
    if (!items.length) return el('div', { class: 'empty', text: 'ไม่มีข้อมูล' });
    var nullTxt = opt.nullText || 'ไม่มีคำถามด้านนี้';
    var nt = null; if (!opt.ticks) { nt = niceTop(max, true); max = nt.top; }
    var ticks = opt.ticks || (function () { var a = []; for (var t0 = 0; t0 <= max + 1e-9; t0 += nt.step) a.push(t0); return a.length > 7 ? a.filter(function (_, i) { return i % 2 === 0; }) : a; })();
    var fmt = function (v) { return (opt.dec != null ? v.toFixed(opt.dec) : num(v)) + (opt.unit ? ' ' + opt.unit : ''); };
    return responsive(function (box, W) {
      var rowH = 40, L = Math.min(opt.labelW || 172, Math.round(W * 0.42)), R = 74, T = 6, H = T + rowH * items.length + 20, pw = Math.max(W - L - R, 40);
      var root = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'group', 'aria-label': opt.aria || 'แผนภูมิแท่งแนวนอน' });
      box.appendChild(root);
      ticks.forEach(function (t) { var x = L + pw * t / max; root.appendChild(svg('line', { class: 'gl', x1: x, x2: x, y1: T, y2: H - 20 })); root.appendChild(svg('text', { class: 'ax', x: x, y: H - 5, 'text-anchor': 'middle', text: fmtTick(t) })); });
      items.forEach(function (it, i) {
        var y = T + rowH * i, has = it.value != null, bx = has ? L + pw * it.value / max : L;
        var g = svg('g', { class: 'row', tabindex: i === 0 ? '0' : '-1', role: 'img', 'aria-label': it.label + ': ' + (has ? fmt(it.value) : nullTxt) + (it.note ? ' (' + it.note + ')' : '') });
        g.appendChild(svg('rect', { class: 'hit', x: 0, y: y + 2, width: W, height: rowH - 4, rx: 6 }));
        var lab = svg('text', { class: 'rl', x: L - 8, y: y + rowH / 2 + 4, 'text-anchor': 'end', text: it.label }); g.appendChild(lab);
        if (has) g.appendChild(svg('rect', { x: L, y: y + 10, width: Math.max(pw * it.value / max, 1), height: rowH - 20, rx: 4, fill: it.color || C.c1 }));
        g.appendChild(svg('text', { class: 'vl', x: bx + 6, y: y + rowH / 2 + (it.note ? 0 : 4), style: has ? 'font-size:12.5px' : 'font-size:11.5px;fill:var(--bad)', text: has ? (opt.dec != null ? it.value.toFixed(opt.dec) : num(it.value)) : nullTxt }));
        var nt2 = it.note ? svg('text', { class: 'ax', x: bx + 6, y: y + rowH / 2 + 13, style: 'font-size:10.5px', text: it.note }) : null; if (nt2) g.appendChild(nt2);
        bindTip(g, function () { return tipNodes(it.label, [{ name: opt.series || 'ค่า', color: it.color || C.c1, value: has ? fmt(it.value) : nullTxt }], { hint: it.note || null }); }, it.onPick || null);
        root.appendChild(g);
        // หมายเหตุท้ายแท่งที่ล้นขอบกราฟ: ซ่อนไว้ (ยังอ่านได้จาก Tooltip) · ป้ายชื่อที่ยาวเกินพื้นที่: ย่อ (ชื่อเต็มอยู่ใน Tooltip)
        if (nt2 && nt2.getComputedTextLength && bx + 6 + nt2.getComputedTextLength() > W - 2) g.removeChild(nt2);
        if (lab.getComputedTextLength) { var full = it.label, n = full.length; while (n > 4 && lab.getComputedTextLength() > L - 12) { n--; lab.textContent = full.slice(0, n) + '…'; } }
      });
    });
  }

  /* ---------- system cards ---------- */
  function statsFor(key) {
    var m = mod(key); if (!m) return [];
    switch (key) {
      case 'incidents': var t = {}; m.byType.forEach(function (r) { t[r.type] = r.count; }); return [[m.total, 'เหตุการณ์ทั้งหมด'], [t[V], 'อุบัติเหตุยานพาหนะ'], [t[G], 'อุบัติเหตุทั่วไป'], [t[P], 'รับส่งผู้ป่วย']];
      case 'gate': return [[m.totals.cars, 'รถยนต์'], [m.totals.motorcycles, 'รถจักรยานยนต์'], [m.totals.noHelmet, 'ไม่สวมหมวกนิรภัย'], [m.days, 'วันที่มีข้อมูล']];
      case 'lostfound': return [[m.byType['สิ่งของสูญหาย'], 'แจ้งของหาย'], [m.byType['พบสิ่งของ'], 'เก็บของได้'], [m.returned, 'รับของคืนแล้ว'], [m.byStatus['เจ้าของยังไม่มารับคืน'], 'รอเจ้าของมารับ']];
      case 'cctv': return [[m.total, 'คำขอทั้งหมด'], [m.byStatus['ปิดเคส'], 'ปิดเคสแล้ว'], [m.footage['พบภาพ'], 'พบภาพ'], [m.footage['ไม่พบภาพ'], 'ไม่พบภาพ']];
      case 'borrow': return [[m.borrowRequests, 'คำขอยืมอุปกรณ์'], [m.returnByStatus['รอยืนยัน'], 'แจ้งคืน รอยืนยัน'], [m.golfCartBookings, 'จองรถกอล์ฟ'], [m.inventory.items, 'ชนิดอุปกรณ์']];
      case 'fire': return [[m.extinguishers, 'ถังในทะเบียน'], [m.extinguishersInspected, 'ถังที่ตรวจแล้ว'], [m.inspectionResult['ปกติ'], 'ผลตรวจปกติ (ครั้ง)'], [m.inspectionResult['ชำรุด'], 'ผลตรวจชำรุด (ครั้ง)']];
      case 'guardScan': return [[m.scans, 'การสแกน'], [m.byStatus['ไม่ปกติ'], 'ผลไม่ปกติ'], [m.scanPoints, 'จุดสแกน'], [Object.keys(m.byUnit).length, 'หน่วยงาน/โซน']];
      case 'satisfactionCentral': return [[m.responses, 'คำตอบ']].concat(Object.keys(m.avg).slice(0, 3).map(function (x) { return [m.avg[x].toFixed(2), x]; }));
      case 'satisfactionUnit': return [[m.respondents, 'ผู้ตอบรวม']].concat(Object.keys(m.avg).slice(0, 3).map(function (x) { return [m.avg[x].toFixed(2), x]; }));
      case 'graduationParking': return [[m.lots, 'ลานจอด'], [m.capacity, 'ความจุรวม (คัน)']].concat(m.days.map(function (d) { return [d.latestCount, dLabel(d.date).replace(/ \d{4}$/, '') + ' (' + d.occupancyPercent + '%)']; }));
      case 'vehicleRegistration': return Object.keys(m.rows).map(function (x) { return [m.rows[x], x]; });
      default: return [];
    }
  }
  function sysCard(s) {
    var m = s.stat ? mod(s.stat) : null, kids = [el('span', { class: 'pill s-' + s.status, text: STATUS[s.status] || s.status }), el('h3', { text: s.name }), el('p', { class: 'sys-desc', text: s.desc })];
    var st = s.stat ? statsFor(s.stat) : [];
    if (s.id === 'veh-staff') st = st.slice(0, 2); if (s.id === 'veh-student') st = st.slice(2);
    if (st.length) kids.push(el('div', { class: 'sys-stats' }, st.map(function (x) {
      return el('div', {}, [el('b', { text: x[0] == null ? 'ไม่มีข้อมูลยืนยัน' : (typeof x[0] === 'number' ? num(x[0]) : x[0]) }), el('span', { text: x[1] })]); })));
    else if (s.status === 'blocked' || s.status === 'unverified') kids.push(el('p', { class: 'kpi-na', text: s.status === 'blocked' ? 'ยังเชื่อมต่อไม่ได้' : 'ไม่มีข้อมูลยืนยัน' }));
    if (m && (m.updated || m.source)) kids.push(el('p', { class: 'src', text: 'ที่มา: ' + (m.source || '-') + (m.updated ? ' · อัปเดตล่าสุด ' + dLabel(m.updated) : '') }));
    if (s.note) kids.push(notesList([s.note]));
    if (s.links.length) kids.push(el('div', { class: 'btns' }, s.links.map(function (l, i) { return el('a', { class: 'btn' + (i ? ' sec' : ''), href: l.url, target: '_blank', rel: 'noopener' }, [l.label, l.verified ? null : el('small', { text: '(ยังไม่ได้ยืนยันลิงก์)' }), ic('ext', 15)]); })));
    else kids.push(el('p', { class: 'src', text: 'ไม่มีลิงก์สำหรับผู้ใช้ที่ยืนยันได้' }));
    return el('article', { class: 'card sys' }, kids);
  }
  function systemsSection(ids, title) {
    var list = ids.map(function (id) { return SYS[id]; }).filter(Boolean);
    return list.length ? section(title || 'ระบบและแบบฟอร์มที่เกี่ยวข้อง', { note: list.length + ' ระบบ' }, [el('div', { class: 'sys-grid' }, list.map(sysCard))]) : null;
  }

  /* ======================================================================
   * หน้า Dashboard ภาพรวม — KPI 6 กลุ่ม + กราฟสรุป 4 ชุด + สถานะการเชื่อมต่อ (ไม่มีตารางรายละเอียด)
   * ==================================================================== */
  function latestMonthOf(list) { return list && list.length ? list[list.length - 1] : null; }
  function pickMonth(page) { return function (i, c) { if (c.month) { state.from = c.month; state.to = c.month; } go(page); }; }
  function mCols(rows) { return rows.map(function (r) { return { label: mLabel(r.month), full: mFull(r.month), month: r.month }; }); }
  function kgCard(o) {
    var kids = [el('div', { class: 'kg-top' }, [el('span', { class: 'kg-ico' }, [ic(o.icon, 20)]), el('span', { text: o.label })])];
    if (o.na) kids.push(el('div', { class: 'kg-na', text: o.na }));
    else {
      kids.push(el('div', { class: 'kg-hero' }, [el('b', { text: o.hero }), el('span', { text: o.unit || '' }), o.hero2 ? el('span', { class: 'kg-hero2' }, o.hero2.map(function (t) { return el('div', { text: t }); })) : null]));
      if (o.subs && o.subs.length) kids.push(el('div', { class: 'kg-subs' }, o.subs.map(function (s) { return el('div', { title: s[1] }, [el('b', { text: s[0] }), el('span', { text: s[1] })]); })));
    }
    if (o.tag) kids.push(el('span', { class: 'tag ' + (o.tagTone || 'warn'), text: o.tag }));
    kids.push(el('div', { class: 'kg-foot' }, [el('span', { text: [o.scope, o.updated ? 'อัปเดต ' + dLabel(o.updated) : null].filter(Boolean).join(' · ') }),
      el('a', { href: '#' + o.more, 'aria-label': 'ดูรายละเอียด ' + o.label, text: 'ดูรายละเอียด →' })]));
    return el('article', { class: 'card kg', style: '--accent:' + (o.color || C.c1) }, kids);
  }
  PAGES.dashboard = function (v) {
    var rt = rangeText(), inc = mod('incidents'), gate = mod('gate'), lf = mod('lostfound'), cctv = mod('cctv'), gr = mod('graduationParking'), vr = mod('vehicleRegistration'),
      gs = mod('guardScan'), sat = mod('guardSatisfaction'), fines = mod('guardFines'), fire = mod('fire'), bor = mod('borrow'), g = DATA.stats.generatedAt || '';
    v.appendChild(el('div', { class: 'dash-head' }, [el('div', {}, [el('h1', { text: SYS_NAME }),
      el('div', { class: 'dash-meta' }, [el('span', { class: 'upd' }, [ic('clock'), 'สถิติหลัก ' + dLabel(g.slice(0, 10) + ' ' + g.slice(11, 16)) + (DATA.extra && DATA.extra.generatedAt ? ' · ข้อมูลเสริม ' + dLabel(DATA.extra.generatedAt.slice(0, 10) + ' ' + DATA.extra.generatedAt.slice(11, 16)) : '') + ' (เวลาไทย)']),
        el('span', { text: 'ตัวเลขตามช่วงเดือนที่เลือก: ' + rt })])]), rangeCtrl()]));

    var k = [];
    if (inc) {
      var t = function (n) { return sumMonthly(inc.monthly, function (r) { return r.byType[n]; }); }, total = sumMonthly(inc.monthly, function (r) { return sumObj(r.byType); });
      k.push({ icon: 'alert', label: 'เหตุการณ์และอุบัติเหตุ', hero: num(total), unit: 'เหตุการณ์', hero2: ['ผู้บาดเจ็บ/ผู้ป่วย ' + num(inc.injuredTotal) + ' คน', '(ทั้งช่วงข้อมูล)'],
        subs: [[num(t(V)), 'อุบัติเหตุยานพาหนะ'], [num(t(G)), 'อุบัติเหตุทั่วไป'], [num(t(P)), 'รับส่งผู้ป่วย']], scope: 'ที่มา: รายงานเหตุการณ์', updated: inc.updated, color: C.c1, more: 'traffic' });
    }
    if (gate) {
      var cars = sumMonthly(gate.monthly, function (r) { return r.cars; }), mo = sumMonthly(gate.monthly, function (r) { return r.motorcycles; }), nh = sumMonthly(gate.monthly, function (r) { return r.noHelmet; }), days = sumMonthly(gate.monthly, function (r) { return r.days; });
      k.push(days ? { icon: 'helmet', label: 'รถเข้าและหมวกนิรภัย', hero: num(cars + mo), unit: 'คัน', hero2: ['ไม่สวมหมวก ' + (100 * nh / mo).toFixed(1) + '% ของ จยย.', days + ' วันที่มีข้อมูล · 5 ประตู'],
        subs: [[num(cars), 'รถยนต์'], [num(mo), 'รถจักรยานยนต์'], [num(nh), 'ไม่สวมหมวก (ราย)']], tag: 'มีวันที่ค่าผิดสังเกต ควรตรวจการกรอก', scope: 'ที่มา: จำนวนรถเข้า+หมวกนิรภัย', updated: gate.updated, color: C.c3, more: 'gate' }
        : { icon: 'car', label: 'รถเข้าและหมวกนิรภัย', na: 'ไม่มีข้อมูลในช่วงที่เลือก', scope: rt, color: C.c3, more: 'gate' });
    }
    if (lf) {
      var lt = function (n) { return sumMonthly(lf.monthly, function (r) { return r.byType[n]; }); };
      k.push({ icon: 'search', label: 'แจ้งของหาย / เก็บของได้', hero: num(lt('สิ่งของสูญหาย')), unit: 'แจ้งของหาย', hero2: ['สถานะรับคืนแล้ว ' + num(lf.returned) + ' รายการ', '(ทั้งปี 2569)'],
        subs: [[num(lt('พบสิ่งของ')), 'เก็บของได้'], [num(lt('รับของคืน')), 'แบบรับของคืน'], [num(lf.total), 'รายการทั้งปี']], scope: 'ที่มา: แจ้งของหาย', updated: lf.updated, color: C.c4, more: 'lostfound' });
    }
    if (cctv) k.push({ icon: 'camera', label: 'คำขอดูกล้องวงจรปิด (CCTV)', hero: num(sumMonthly(cctv.monthly, function (r) { return r.count; })), unit: 'คำขอ', hero2: ['ทั้งหมด ' + num(cctv.total) + ' คำขอ', 'พื้นที่ส่วนกลาง'],
      subs: [[num(cctv.byStatus['ปิดเคส']), 'ปิดเคสแล้ว'], [num(cctv.footage['พบภาพ']), 'พบภาพ'], [bor ? num(bor.borrowRequests) : '–', 'คำขอยืมอุปกรณ์']], scope: 'ที่มา: CCTV_Requests', updated: cctv.updated, color: C.c2, more: 'cctv' });
    if (vr) { var tot = 0; Object.keys(vr.rows).forEach(function (n) { if (vr.rows[n] != null) tot += vr.rows[n]; });
      var best = gr ? gr.days.slice().sort(function (a, b) { return b.latestCount - a.latestCount; })[0] : null;
      k.push({ icon: 'car', label: 'ยานพาหนะและลานจอด', hero: num(tot), unit: 'รายการลงทะเบียน', hero2: best ? ['ลานจอดงานปริญญาสูงสุด', num(best.latestCount) + ' คัน (' + best.occupancyPercent + '% ของความจุ)'] : null,
        subs: [[num(vr.rows['บุคลากร – รถยนต์'] + vr.rows['บุคลากร – รถจักรยานยนต์']), 'บุคลากร'], [num(vr.rows['นักศึกษา – รถยนต์']), 'นักศึกษา (รถยนต์)'], [gr ? num(gr.capacity) : '–', 'ความจุลานปริญญา']],
        tag: 'ยังไม่รวมนักศึกษา–รถจักรยานยนต์', scope: 'ที่มา: ฐานข้อมูลลงทะเบียน', updated: vr.updated, color: C.c5, more: 'vehicle' }); }
    if (sat) {
      var lc = latestMonthOf(sat.central.monthly), uB = sat.unit.monthly.slice().sort(function (a, b) { return b.respondents - a.respondents; })[0], fc = fines ? sumMonthly(fines.monthly, function (r) { return r.cases; }) : null;
      k.push({ icon: 'shield', label: 'รปภ.เอกชน และอุปกรณ์ความปลอดภัย', hero: lc.overall.toFixed(2), unit: '/ 5 พึงพอใจ รปภ.ส่วนกลาง', hero2: ['ส่วนงาน ' + uB.overall.toFixed(2) + ' / 5', mLabel(uB.month) + ' · ' + num(uB.respondents) + ' คน'],
        subs: [[fc == null ? '–' : num(fc), 'ค่าปรับ รปภ. (กรณี)'], [gs ? num(gs.scans) : '–', 'สแกนจุดตรวจ (ครั้ง)'], [fire ? num(fire.extinguishers) : '–', 'ถังดับเพลิง (ถัง)']],
        scope: 'ส่วนกลาง ' + mLabel(lc.month) + ' · ' + num(lc.responses) + ' คำตอบ', updated: sat.central.updated, color: C.fine, more: 'report-guard' });
    }
    v.appendChild(el('div', { class: 'kgs', role: 'list', 'aria-label': 'ตัวชี้วัดหลัก' }, k.map(function (o) { var c = kgCard(o); c.setAttribute('role', 'listitem'); return c; })));

    dashSections(v);

    var cnt = {}, n = 0; DATA.systems.categories.forEach(function (c) { c.systems.forEach(function (s) { cnt[s.status] = (cnt[s.status] || 0) + 1; n++; }); });
    v.appendChild(section('สถานะการเชื่อมต่อและที่มาของข้อมูล', {}, [el('div', { class: 'card status-strip' }, Object.keys(STATUS).filter(function (s) { return cnt[s]; }).map(function (s) {
      return el('span', {}, [el('span', { class: 'pill s-' + s, text: STATUS[s] }), ' ', el('b', { text: cnt[s] }), ' ระบบ']); }).concat([
      el('span', { class: 'src', style: 'margin:0', text: liveMode ? 'อ่านสดจาก Stats API (ยอดรวม)' : 'อ่านจากไฟล์สถิติรวมที่คำนวณจากระบบต้นทาง ' + n + ' ระบบ' }),
      el('a', { class: 'more', href: '#systems', text: 'ดูสถานะทุกระบบ →' })]))]));
  };
  function incidentChart(onPick) {
    var inc = mod('incidents'), rows = inc.monthly.filter(function (r) { return inRange(r.month); });
    var other = function (r) { return sumObj(r.byType) - (r.byType[V] || 0) - (r.byType[G] || 0) - (r.byType[P] || 0); };
    return bars(mCols(rows), [
      { name: V, color: C.c1, values: rows.map(function (r) { return r.byType[V] || 0; }) }, { name: G, color: C.c2, values: rows.map(function (r) { return r.byType[G] || 0; }) },
      { name: P, color: C.c3, values: rows.map(function (r) { return r.byType[P] || 0; }) }, { name: 'เหตุอื่น (บังคับล้อ ลักทรัพย์ ปรับ รปภ. ฯลฯ)', color: C.c5, values: rows.map(other) }],
      { aria: 'จำนวนเหตุการณ์รายเดือน', unit: 'เหตุการณ์', int: true, onPick: onPick });
  }
  function gateMonthChart(onPick) {
    var rows = mod('gate').monthly.filter(function (r) { return inRange(r.month); });
    return bars(rows.map(function (r) { return { label: mLabel(r.month) + ' (' + r.days + ' วัน)', full: mFull(r.month) + ' · ' + r.days + ' วันที่มีข้อมูล', month: r.month }; }), [
      { name: 'รถยนต์', color: C.c3, values: rows.map(function (r) { return r.cars; }) }, { name: 'รถจักรยานยนต์', color: C.c1, values: rows.map(function (r) { return r.motorcycles; }) }],
      { aria: 'รถเข้ารายเดือน', unit: 'คัน', onPick: onPick });
  }
  function gateDays() { return mod('gate').daily.filter(function (r) { return inRange(r.date.slice(0, 7)); }); }
  function dCols(d) { return d.map(function (r) { return { label: (+r.date.slice(8)) + ' ' + TH_M[+r.date.slice(5, 7) - 1], full: dLabel(r.date) }; }); }
  function gateDailyChart() {
    var d = gateDays();
    return bars(dCols(d), [{ name: 'รถยนต์', color: C.c3, values: d.map(function (r) { return r.cars; }) }, { name: 'รถจักรยานยนต์', color: C.c1, values: d.map(function (r) { return r.motorcycles; }) }],
      { aria: 'รถเข้ารายวัน', unit: 'คัน', h: 280 });
  }
  function helmetDailyChart() {
    var d = gateDays();
    return bars(dCols(d), [{ name: 'ผู้ไม่สวมหมวกนิรภัย', color: C.c2, values: d.map(function (r) { return r.noHelmet; }) }], { aria: 'ผู้ไม่สวมหมวกนิรภัยรายวัน', unit: 'ราย', h: 240 });
  }
  function lfChart(onPick) {
    var m = mod('lostfound').monthly.filter(function (r) { return inRange(r.month); });
    return bars(mCols(m), [
      { name: 'สิ่งของสูญหาย', color: C.c4, values: m.map(function (r) { return r.byType['สิ่งของสูญหาย'] || 0; }) }, { name: 'พบสิ่งของ', color: C.c1, values: m.map(function (r) { return r.byType['พบสิ่งของ'] || 0; }) },
      { name: 'รับของคืน', color: C.c3, values: m.map(function (r) { return r.byType['รับของคืน'] || 0; }) }, { name: 'ไม่ระบุประเภท', color: C.c5, values: m.map(function (r) { return r.byType['(ไม่ระบุประเภท)'] || 0; }) }],
      { aria: 'ของหายรายเดือน', unit: 'รายการ', int: true, onPick: onPick });
  }
  /* ความพึงพอใจ: แยกกราฟ "คะแนน" (เส้น สเกล 1–5) ออกจากกราฟ "จำนวนผู้ตอบ" (แท่ง) — ไม่ซ้อนสองหน่วยในกราฟเดียว */
  function satN(src, r) { return src === 'central' ? r.responses : r.respondents; }
  function satScoreChart(src, onPick, selMonth, h) {
    var s = mod('guardSatisfaction')[src], rows = s.monthly, nm = src === 'central' ? 'คำตอบ' : 'คน';
    return lineChart(mCols(rows), [{ name: 'คะแนนเฉลี่ยรวม', color: src === 'central' ? C.c1 : C.c3, values: rows.map(function (r) { return r.overall; }), notes: rows.map(function (r) { return 'N = ' + num(satN(src, r)) + ' ' + nm; }) }],
      { min: 1, max: 5, step: 1, dec: 2, h: h || 230, aria: 'คะแนนเฉลี่ยรวมรายเดือน ' + s.name, onPick: onPick, pickHint: 'คลิกเพื่อดูผลของเดือนนี้', sel: selMonth ? rows.map(function (r) { return r.month; }).indexOf(selMonth) : null });
  }
  function satCountChart(src, onPick, selMonth) {
    var s = mod('guardSatisfaction')[src], rows = s.monthly;
    return bars(mCols(rows), [{ name: src === 'central' ? 'จำนวนคำตอบ' : 'จำนวนผู้ตอบ', color: '#9fb4ad', values: rows.map(function (r) { return satN(src, r); }) }],
      { int: true, h: 230, unit: src === 'central' ? 'คำตอบ' : 'คน', aria: 'จำนวนผู้ตอบรายเดือน ' + s.name, onPick: onPick, pickHint: 'คลิกเพื่อดูผลของเดือนนี้', sel: selMonth ? rows.map(function (r) { return r.month; }).indexOf(selMonth) : null });
  }
  function satTopicsChart(src) {
    var s = mod('guardSatisfaction')[src], rows = s.monthly, pal = [C.c1, C.c3, C.c4, C.c2, C.c5];
    return lineChart(mCols(rows), s.topics.map(function (tn, ti) { return { name: tn, color: pal[ti], values: rows.map(function (r) { return r.topics[ti].avg; }), notes: rows.map(function (r) { return 'N ' + num(r.topics[ti].n); }) }; }),
      { min: 1, max: 5, step: 1, dec: 2, h: 250, aria: 'คะแนนรายด้านรายเดือน ' + s.name });
  }

  /* ======================================================================
   * หน้า Dashboard ตรวจรับงาน รปภ. — ความพึงพอใจ (+ ส่วนค่าปรับแยก)
   * ==================================================================== */
  PAGES['report-guard'] = function (v) {
    var sat = mod('guardSatisfaction');
    if (!sat) { v.appendChild(pageHead('รายงานตรวจรับ รปภ.เอกชน')); v.appendChild(el('div', { class: 'card box' }, [el('p', { class: 'kpi-na', text: 'ยังเชื่อมต่อไม่ได้' })])); return; }
    var src = sat[state.satSrc], months = src.monthly.map(function (r) { return r.month; });
    if (months.indexOf(state.satMonth) < 0) state.satMonth = months[months.length - 1];
    var years = []; months.forEach(function (m) { if (years.indexOf(m.slice(0, 4)) < 0) years.push(m.slice(0, 4)); });
    var ySel = el('select', { 'aria-label': 'ปี พ.ศ.' }), mSel = el('select', { 'aria-label': 'เดือน' });
    years.forEach(function (y) { ySel.appendChild(el('option', { value: y, text: 'พ.ศ. ' + (+y + 543) })); });
    ySel.value = state.satMonth.slice(0, 4);
    months.filter(function (m) { return m.slice(0, 4) === ySel.value; }).forEach(function (m) { mSel.appendChild(el('option', { value: m, text: TH_MF[+m.slice(5) - 1] })); });
    mSel.value = state.satMonth;
    ySel.onchange = function () { state.satMonth = months.filter(function (m) { return m.slice(0, 4) === ySel.value; }).pop(); route(true); };
    mSel.onchange = function () { state.satMonth = mSel.value; route(true); };
    var seg = el('div', { class: 'seg', role: 'group', 'aria-label': 'เลือกแบบประเมิน' }, [['central', 'รปภ.ส่วนกลาง'], ['unit', 'รปภ.ส่วนงาน']].map(function (o) {
      return el('button', { type: 'button', 'aria-pressed': String(state.satSrc === o[0]), text: o[1], onclick: function () { state.satSrc = o[0]; state.satMonth = null; route(true); } }); }));
    v.appendChild(pageHead('รายงานตรวจรับ รปภ.เอกชน', 'ผลแบบประเมินความพึงพอใจรายเดือน (ส่วนกลาง/ส่วนงาน แยกกัน) และค่าปรับ รปภ. สำหรับการประชุมตรวจรับ', el('div', { class: 'ctrls' }, [seg, ic('calendar'), ySel, mSel])));

    var cur = src.monthly.filter(function (r) { return r.month === state.satMonth; })[0], isC = state.satSrc === 'central';
    var nOf = function (r) { return isC ? r.responses : r.respondents; };
    var ranked = cur.topics.filter(function (t) { return t.avg != null; }).slice().sort(function (a, b) { return b.avg - a.avg; });
    var prev = src.monthly[src.monthly.indexOf(cur) - 1];
    var k = [
      { icon: 'star', label: 'คะแนนเฉลี่ยรวม', value: cur.overall.toFixed(2), unit: '/ 5', sub: prev ? 'เดือนก่อน (' + mLabel(prev.month) + ') ' + prev.overall.toFixed(2) + ' · ' + (cur.overall - prev.overall >= 0 ? '+' : '') + (cur.overall - prev.overall).toFixed(2) : 'ยังไม่มีเดือนก่อนหน้าให้เปรียบเทียบ', scope: src.name + ' · ' + mFull(cur.month), color: C.c1 },
      { icon: 'users', label: isC ? 'จำนวนคำตอบ (N)' : 'จำนวนผู้ตอบ (N)', value: num(nOf(cur)), unit: isC ? 'คำตอบ' : 'คน', sub: isC ? 'ช่วงวันที่ ' + dLabel(cur.dateRange.from).replace(/ \d{4}$/, '') + ' – ' + dLabel(cur.dateRange.to) : 'จาก ' + cur.records + ' รายการบันทึก · ' + cur.byArea.length + ' พื้นที่', scope: isC ? '1 คำตอบ = ผู้ใช้บริการ 1 คน/ครั้ง' : 'ตามจำนวนที่ส่วนงานกรอก', color: C.c3, tag: nOf(cur) < 30 ? 'N น้อย (' + nOf(cur) + ') ควรระวังการตีความ' : null },
      { icon: 'star', label: 'ด้านที่คะแนนสูงสุด', value: ranked[0].avg.toFixed(2), unit: '/ 5', sub: ranked[0].name + ' (N = ' + num(ranked[0].n) + ')', color: C.c3 },
      { icon: 'alert', label: 'ด้านที่คะแนนต่ำสุด', value: ranked[ranked.length - 1].avg.toFixed(2), unit: '/ 5', sub: ranked[ranked.length - 1].name + ' (N = ' + num(ranked[ranked.length - 1].n) + ')', color: C.c2 }];
    v.appendChild(section('ผลประเมินความพึงพอใจ — ' + src.name + ' ' + mFull(cur.month), { note: 'สเกล ' + src.scale }, [kpiGrid(k)]));

    var g = el('div', { class: 'grid2' });
    g.appendChild(figure('คะแนนเฉลี่ยแยกตามด้าน', mFull(cur.month) + ' · N = จำนวน' + src.unitOfN.split(' ')[0] + 'ที่ใช้คำนวณแต่ละด้าน', hbars(cur.topics.map(function (t, i) {
      return { label: t.name, value: t.avg, note: t.avg != null ? 'N = ' + num(t.n) : null, color: [C.c1, C.c3, C.c4, C.c2, C.c5][i] }; }), 5, { dec: 2, ticks: [0, 1, 2, 3, 4, 5], series: 'คะแนนเฉลี่ย', aria: 'คะแนนรายด้าน' })));
    var pickM = function (i, c) { state.satMonth = c.month; route(true); };
    g.appendChild(figure('คะแนนเฉลี่ยรวมรายเดือน — ' + src.name, 'สเกล 1–5 · คลิกจุดเพื่อดูผลของเดือนนั้น', satScoreChart(state.satSrc, pickM, cur.month)));
    g.appendChild(figure('จำนวน' + (isC ? 'คำตอบ' : 'ผู้ตอบ') + 'รายเดือน — ' + src.name, 'หน่วย: ' + (isC ? 'คำตอบ' : 'คน') + ' · แยกจากกราฟคะแนนเพราะเป็นคนละหน่วย', satCountChart(state.satSrc, pickM, cur.month)));
    g.appendChild(figure('คะแนนรายด้าน รายเดือน — ' + src.name, 'สเกล 1–5 · ชี้ที่เดือนเพื่อดูคะแนนและ N ของทุกด้าน', satTopicsChart(state.satSrc)));
    v.appendChild(el('div', { class: 'sec' }, [g]));

    if (isC) {
      var dist = cur.scoreDistribution, totalAns = sumObj(dist), hi = (dist['4'] || 0) + (dist['5'] || 0), lo = (dist['1'] || 0) + (dist['2'] || 0);
      v.appendChild(section('การกระจายคะแนนทุกข้อ — ' + mFull(cur.month), { note: num(totalAns) + ' คะแนน = ' + num(cur.responses) + ' คำตอบ × 5 ด้าน' }, [el('div', { class: 'grid2' }, [
        figure('จำนวนครั้งที่ให้แต่ละคะแนน', 'นับทุกข้อทุกด้านรวมกัน', hbars(['5', '4', '3', '2', '1'].map(function (s) {
          return { label: s + ' คะแนน' + (s === '5' ? ' (ดีมาก)' : s === '1' ? ' (ปรับปรุง)' : ''), value: dist[s] || 0, note: ((dist[s] || 0) / totalAns * 100).toFixed(1) + '%', color: +s >= 4 ? C.c3 : +s === 3 ? C.c5 : C.c2 }; }),
          Math.max.apply(null, Object.keys(dist).map(function (k2) { return dist[k2]; })), { labelW: 130, series: 'จำนวนครั้ง', unit: 'ครั้ง', aria: 'การกระจายคะแนน' })),
        kpiGrid([{ icon: 'star', label: 'สัดส่วนคะแนน 4–5', value: (100 * hi / totalAns).toFixed(1), unit: '%', sub: num(hi) + ' จาก ' + num(totalAns) + ' คะแนน', color: C.c3 },
                 { icon: 'alert', label: 'คะแนน 1–2 (ควรติดตาม)', value: num(lo), unit: 'ครั้ง', sub: (100 * lo / totalAns).toFixed(1) + '% ของคะแนนทั้งหมด', color: C.c2 }])])]));
    } else {
      v.appendChild(section('แยกตามพื้นที่รับผิดชอบ — ' + mFull(cur.month), { note: 'คะแนนเป็นค่าที่ส่วนงานสรุปมา · “–” = พื้นที่นั้นไม่มีคำถามด้านนี้' }, [table(['พื้นที่', 'รายการ', 'ผู้ตอบ', 'คะแนนรวม'].concat(src.topics),
        cur.byArea.map(function (a) { return [a.area, a.records, num(a.respondents), a.overall.toFixed(2)].concat(a.topics.map(function (x) { return x == null ? '–' : x.toFixed(2); })); }),
        { num: [1, 2, 3, 4, 5, 6, 7, 8], foot: ['รวม (ถ่วงน้ำหนัก)', cur.records, num(cur.respondents), cur.overall.toFixed(2)].concat(cur.topics.map(function (t) { return t.avg == null ? '–' : t.avg.toFixed(2); })) })]));
    }
    var monthsTbl = table(['เดือน', isC ? 'คำตอบ (N)' : 'ผู้ตอบ (N)'].concat(isC ? [] : ['รายการ']).concat(['คะแนนรวม']).concat(src.topics),
      src.monthly.map(function (r) { return [mFull(r.month), num(nOf(r))].concat(isC ? [] : [r.records]).concat([r.overall.toFixed(2)]).concat(r.topics.map(function (t) { return t.avg == null ? '–' : t.avg.toFixed(2) + ' (' + num(t.n) + ')'; })); }),
      { num: isC ? [1, 2, 3, 4, 5, 6, 7] : [1, 2, 3, 4, 5, 6, 7, 8] });
    v.appendChild(section('ตารางสรุปรายเดือน — ' + src.name, { note: 'ตัวเลขในวงเล็บ = N ของด้านนั้น' }, [monthsTbl]));

    var qExtra = null;
    if (!isC) {
      qExtra = el('details', { class: 'box', style: 'padding:8px 0 0' }, [el('summary', { text: 'คำถามของแต่ละพื้นที่ และด้านที่ใช้คำนวณ (จากแบบฟอร์ม NPsecurity-feedback)' })]);
      var cat = { C1: src.topics[0], C2: src.topics[1], C3: src.topics[2], C4: src.topics[3], C5: src.topics[4], 'C4+C5': src.topics[3] + ' + ' + src.topics[4] };
      Object.keys(src.questionsByArea).forEach(function (area) {
        qExtra.appendChild(el('p', { style: 'margin:10px 0 4px;font-weight:600', text: area + ' (' + src.questionsByArea[area].length + ' ข้อ)' }));
        qExtra.appendChild(el('ol', { class: 'notes', style: 'color:var(--ink)' }, src.questionsByArea[area].map(function (q) { return el('li', { text: q[0] + ' → ' + cat[q[1]] }); })));
      });
    }
    v.appendChild(section('วิธีคำนวณและข้อสังเกต', {}, [el('div', { class: 'grid2' }, [
      infoBox(src.name + ' — ' + src.form, src, qExtra),
      el('div', { class: 'card box' }, [el('h3', { text: 'การเปรียบเทียบสองระบบ' }), el('p', { class: 'def', text: sat.comparability }),
        el('p', { class: 'src', text: 'คำนวณจากข้อมูลต้นทางเมื่อ ' + dLabel(sat.computedAt) + ' · ไม่ใช้ตัวเลขจากภาพตัวอย่างหรือสรุปเดิม' })])])]));

    /* ---- ส่วนค่าปรับ (แยกจากคะแนนความพึงพอใจ) ---- */
    var fines = mod('guardFines'), f0 = fines;
    v.appendChild(el('div', { class: 'divider', role: 'heading', 'aria-level': '2' }, [ic('coin'), 'ค่าปรับ รปภ. — ข้อมูลแยกจากผลประเมิน']));
    if (!fines) { v.appendChild(el('p', { class: 'kpi-na', text: 'ยังเชื่อมต่อไม่ได้' })); return; }
    var fm = fines.monthly.filter(function (r) { return r.month === state.satMonth; })[0];
    v.appendChild(el('div', { class: 'sec' }, [kpiGrid([
      fm ? { icon: 'coin', label: 'เคสค่าปรับ ' + mFull(state.satMonth), value: num(fm.cases), unit: 'เคส', sub: fm.cases ? Object.keys(fm.byUnit).map(function (u) { return u + ' ' + fm.byUnit[u]; }).join(' · ') : 'ไม่มีรายการ “ปรับ รปภ.” ในเดือนนี้', updated: fines.updated, color: C.fine }
         : { icon: 'coin', label: 'เคสค่าปรับ ' + mFull(state.satMonth), na: 'ไม่มีข้อมูลรายงานเหตุการณ์ของเดือนนี้', color: C.fine },
      { icon: 'coin', label: 'ยอดค่าปรับ ' + mFull(state.satMonth), value: fm ? num(fm.amountByRate) : '–', unit: 'บาท', sub: 'คำนวณ ' + (fm ? fm.cases : 0) + ' เคส × ' + num(fines.amount.ratePerCase) + ' บาท', tag: 'Sheet ไม่มีช่องยอดเงิน · อัตรารอยืนยัน', color: C.fine },
      { icon: 'calendar', label: 'เคสค่าปรับทั้งช่วงข้อมูล', value: num(fines.totalCases), unit: 'เคส', sub: dLabel(fines.range.from).replace(/ \d{4}$/, '') + ' – ' + dLabel(fines.range.to), updated: fines.updated, color: C.fine }])]));
    finesDetail(v, f0);
    v.appendChild(section('เทียบกับหน้า “รายงานตรวจรับ รปภ.” ของระบบเดิม', {}, [el('div', { class: 'card box' }, [notesList([
      'หน้าเดิมอ่านคะแนนจาก Google Form รุ่นเดิม “แบบฟอร์มสอบถามข้อเสนอแนะการให้บริการรักษาความปลอดภัย” ซึ่งมี 9 ด้าน และเฉลี่ยทุกคำตอบโดยไม่แยกส่วนกลาง/ส่วนงาน',
      'หน้าเดิมนับค่าปรับจากไฟล์สำเนา “Copy of รายงานเหตุการณ์ใหม่ล่าสุด (Responses)” (แถวล่าสุด 11 ต.ค. 2569) และคิด 1,000 บาทต่อรายการที่มีข้อความในช่องเหตุผล',
      'หน้านี้ใช้แบบประเมินปัจจุบัน 2 ระบบ (5 ด้าน) และแท็บ รายงานเหตุการณ์ ของฐานข้อมูลงานจราจร ตัวเลขจึงไม่เท่ากับภาพหน้าจอของระบบเดิม และไม่ควรนำมาเทียบกันโดยตรง']),
      el('div', { class: 'btns' }, [oldUrl() ? extBtn('เปิดรายงานตรวจรับ รปภ. ในระบบเดิม', oldUrl(), true) : null])])]));
  };

  /* ======================================================================
   * หน้า สรุปค่าปรับ รปภ.
   * ==================================================================== */
  function finesDetail(v, f) {
    if (!f) return;
    var units = {}; f.monthly.forEach(function (r) { Object.keys(r.byUnit).forEach(function (u) { units[u] = (units[u] || 0) + r.byUnit[u]; }); });
    var g = el('div', { class: 'grid2' });
    var cols = f.monthly.map(function (r) { return { label: mLabel(r.month), full: mFull(r.month) }; });
    g.appendChild(figure('จำนวนเคสค่าปรับรายเดือน', 'ที่มา: รายงานเหตุการณ์ (ประเภท “ปรับ รปภ.”)', bars(cols, [{ name: 'เคสค่าปรับ', color: C.fine, values: f.monthly.map(function (r) { return r.cases; }) }], { aria: 'เคสค่าปรับรายเดือน', h: 220, int: true, unit: 'เคส' })));
    g.appendChild(figure('ยอดค่าปรับรายเดือน (บาท)', 'คำนวณจากจำนวนเคส × ' + num(f.amount.ratePerCase) + ' บาท', bars(cols, [{ name: 'ยอดค่าปรับ (บาท)', color: '#d98c7d', values: f.monthly.map(function (r) { return r.amountByRate; }) }], { aria: 'ยอดค่าปรับรายเดือน', h: 220, unit: 'บาท' })));
    v.appendChild(el('div', { class: 'sec' }, [g]));
    v.appendChild(section('ตารางรายเดือน', {}, [table(['เดือน', 'เคสค่าปรับ', 'ยอดค่าปรับ (บาท)', 'หน่วยงาน'], f.monthly.map(function (r) {
      return [mFull(r.month), num(r.cases), num(r.amountByRate), Object.keys(r.byUnit).map(function (u) { return u + ' ' + r.byUnit[u]; }).join(', ') || '–']; }),
      { num: [1, 2], foot: ['รวม', num(f.totalCases), num(f.amount.total), ''] })]));
    v.appendChild(section('นิยามและข้อจำกัด', {}, [infoBox('ค่าปรับ รปภ.', f, el('p', { class: 'src', text: 'แหล่งอัตรา: ' + f.amount.rateSource }))]));
    v.appendChild(systemsSection(['pdf-guard-monthly', 'incident-report']));
  };

  /* ======================================================================
   * หน้ารายละเอียดหมวดอื่น
   * ==================================================================== */
  PAGES.traffic = function (v) {
    var inc = mod('incidents');
    v.appendChild(pageHead('ระบบรายงานเหตุการณ์ — สถิติแจ้งเหตุและอุบัติเหตุ', 'เหตุการณ์ที่เจ้าหน้าที่บันทึกในระบบรายงานเหตุการณ์ แยกประเภทและเดือนที่เกิดเหตุ', rangeCtrl()));
    if (inc) {
      var tot = sumMonthly(inc.monthly, function (r) { return sumObj(r.byType); }), t = function (n) { return sumMonthly(inc.monthly, function (r) { return r.byType[n]; }); };
      v.appendChild(kpiGrid([
        { icon: 'alert', label: 'เหตุการณ์ทั้งหมด', value: num(tot), unit: 'เหตุ', scope: rangeText(), updated: inc.updated },
        { icon: 'car', label: V, value: num(t(V)), unit: 'เหตุ', scope: rangeText(), color: C.c1 },
        { icon: 'alert', label: G, value: num(t(G)), unit: 'เหตุ', scope: rangeText(), color: C.c2 },
        { icon: 'heart', label: P, value: num(t(P)), unit: 'ครั้ง', scope: rangeText(), color: C.c3 }]));
      var g = el('div', { class: 'grid2' });
      g.appendChild(figure('เหตุการณ์รายเดือน แยกประเภท', 'ที่มา: รายงานเหตุการณ์ · อัปเดต ' + dLabel(inc.updated), incidentChart()));
      g.appendChild(figure('สรุปตามประเภท (ทั้งช่วงข้อมูล)', dLabel(inc.range.from) + ' – ' + dLabel(inc.range.to), table(['ประเภทเหตุการณ์', 'จำนวนเหตุ', 'ผู้บาดเจ็บ/ป่วย (คน)'], inc.byType.map(function (r) { return [r.type, num(r.count), num(r.injuredOrIll)]; }), { num: [1, 2], foot: ['รวม', num(inc.total), num(inc.injuredTotal)] })));
      v.appendChild(el('div', { class: 'sec' }, [g]));
      v.appendChild(section('นิยามและที่มา', { more: 'accident-map' }, [infoBox('รายงานเหตุการณ์', inc)]));
    }
    v.appendChild(systemsSection(['incident-report', 'dashboard-ai', 'event-incident']));
  };
  PAGES.gate = function (v) {
    var gate = mod('gate');
    v.appendChild(pageHead('รายงานจำนวนรถเข้าออกและผู้ไม่สวมหมวกนิรภัย', 'ต้นทางมีเฉพาะจำนวนรถเข้า (เจ้าหน้าที่นับที่ประตู 1, 3, 4, 5, 6 รายวัน) — ยังไม่มีข้อมูลจำนวนรถออก', rangeCtrl()));
    if (gate) {
      var cars = sumMonthly(gate.monthly, function (r) { return r.cars; }), mo = sumMonthly(gate.monthly, function (r) { return r.motorcycles; }), nh = sumMonthly(gate.monthly, function (r) { return r.noHelmet; }), days = sumMonthly(gate.monthly, function (r) { return r.days; });
      v.appendChild(kpiGrid(days ? [
        { icon: 'car', label: 'รถยนต์', value: num(cars), unit: 'คัน', scope: rangeText() + ' · ' + days + ' วัน', updated: gate.updated },
        { icon: 'car', label: 'รถจักรยานยนต์', value: num(mo), unit: 'คัน', scope: rangeText(), color: C.c3 },
        { icon: 'helmet', label: 'ผู้ไม่สวมหมวกนิรภัย', value: num(nh), unit: 'ราย', sub: (100 * nh / mo).toFixed(1) + '% ของรถจักรยานยนต์ที่นับได้', color: C.c2, tag: 'มีวันที่ค่าผิดสังเกต' },
        { icon: 'calendar', label: 'เฉลี่ยต่อวัน', value: num(Math.round((cars + mo) / days)), unit: 'คัน/วัน', sub: 'รถยนต์ + รถจักรยานยนต์', color: C.c5 }] : [{ label: 'รถเข้ามหาวิทยาลัย', na: 'ไม่มีข้อมูลในช่วงที่เลือก' }]));
      v.appendChild(el('div', { class: 'sec' }, [figure('รถเข้ารายวัน', 'หน่วย: คัน · ที่มา: จำนวนรถเข้า+หมวกนิรภัย · อัปเดต ' + dLabel(gate.updated), gateDailyChart())]));
      v.appendChild(el('div', { class: 'sec' }, [figure('ผู้ไม่สวมหมวกนิรภัยรายวัน', 'หน่วย: ราย · แยกจากกราฟจำนวนรถเพราะเป็นคนละหน่วยนับ', helmetDailyChart())]));
      v.appendChild(section('สรุปรายเดือน', {}, [table(['เดือน', 'วันที่มีข้อมูล', 'รถยนต์', 'รถจักรยานยนต์', 'ไม่สวมหมวก', '% ไม่สวมหมวก'], gate.monthly.map(function (r) { return [mFull(r.month), r.days, num(r.cars), num(r.motorcycles), num(r.noHelmet), (100 * r.noHelmet / r.motorcycles).toFixed(1) + '%']; }), { num: [1, 2, 3, 4, 5] })]));
      v.appendChild(section('นิยามและข้อสังเกต', {}, [infoBox('จำนวนรถเข้า + หมวกนิรภัย', gate)]));
    }
    v.appendChild(systemsSection(['gate-tracker', 'helmet-quiz']));
  };
  PAGES['accident-map'] = function (v) {
    v.appendChild(pageHead('แผนที่จุดเกิดอุบัติเหตุ', 'พิกัดจริงจากรายงานเหตุการณ์ เฉพาะอุบัติเหตุจากยานพาหนะและอุบัติเหตุทั่วไป · แสดงเฉพาะประเภท สถานที่ และเดือน ไม่มีข้อมูลบุคคล รูปภาพ หรือข้อความเหตุการณ์', rangeCtrl()));
    v.appendChild(el('p', { class: 'src', id: 'mapNote' }));
    v.appendChild(el('div', { class: 'card mapcard', style: 'margin-top:8px' }, [
      el('div', { class: 'map-left' }, [el('div', { class: 'map-tools', id: 'mapTools' }), el('div', { id: 'mapSvg', class: 'map-svg' }), el('p', { class: 'map-cap', id: 'mapCap' })]),
      el('div', { class: 'map-right' }, [el('div', { id: 'mapDetail', class: 'map-detail' }), el('div', { id: 'mapEmbed', class: 'map-embed', hidden: 'hidden' }), el('div', { class: 'map-list-wrap' }, [el('table', { class: 'tbl', id: 'mapList' })])])]));
    var am = mod('accidentMap'); if (am) v.appendChild(section('ข้อสังเกต', {}, [infoBox('พิกัดอุบัติเหตุ', am)]));
    renderMap();
  };
  PAGES.cctv = function (v) {
    var m = mod('cctv');
    v.appendChild(pageHead('กล้องวงจรปิด (CCTV)', 'คำขอดูภาพกล้องวงจรปิดและผลการให้บริการ', rangeCtrl()));
    if (m) {
      v.appendChild(kpiGrid([
        { icon: 'camera', label: 'คำขอในช่วงที่เลือก', value: num(sumMonthly(m.monthly, function (r) { return r.count; })), unit: 'คำขอ', scope: rangeText(), updated: m.updated },
        { icon: 'shield', label: 'ปิดเคสแล้ว', value: num(m.byStatus['ปิดเคส']), unit: 'จาก ' + m.total, sub: 'ทุกช่วงข้อมูล', color: C.c3 },
        { icon: 'search', label: 'พบภาพ / ไม่พบภาพ', value: m.footage['พบภาพ'] + ' / ' + m.footage['ไม่พบภาพ'], unit: 'คำขอ', sub: 'ไม่ได้ระบุผล ' + m.footage['ไม่ได้ระบุ'] + ' คำขอ', color: C.c4 },
        { icon: 'users', label: 'ผู้ขอ', value: num(m.byRequester['นักศึกษา']), unit: 'นักศึกษา', sub: 'บุคลากร ' + m.byRequester['บุคลากร'] + ' · บุคคลทั่วไป ' + m.byRequester['บุคคลทั่วไป'], color: C.c5 }]));
      var g = el('div', { class: 'grid2' });
      var rows = m.monthly.filter(function (r) { return inRange(r.month); });
      g.appendChild(figure('คำขอรายเดือน', 'ที่มา: CCTV_Requests · อัปเดต ' + dLabel(m.updated), bars(rows.map(function (r) { return { label: mLabel(r.month), full: mFull(r.month) }; }), [{ name: 'คำขอ', color: C.c1, values: rows.map(function (r) { return r.count; }) }], { h: 220, int: true })));
      g.appendChild(figure('คำขอแยกหน่วยงาน', 'รุ่นแยกหน่วยงาน MLC / LA / PMH ยังไม่เปิดใช้ (branch cctv-multi-unit)', hbars(Object.keys(m.byUnit).map(function (u) { return { label: u, value: m.byUnit[u], color: C.c1 }; }), Math.max(1, m.total), { labelW: 180 })));
      v.appendChild(el('div', { class: 'sec' }, [g]));
      v.appendChild(section('ข้อสังเกต', {}, [infoBox('คำขอดูกล้องวงจรปิด', m)]));
    }
    v.appendChild(systemsSection(['cctv']));
  };
  PAGES.vehicle = function (v) {
    var vr = mod('vehicleRegistration'), rt = mod('ruenthai');
    v.appendChild(pageHead('ระบบลงทะเบียนยานพาหนะ', 'การลงทะเบียนยานพาหนะบุคลากร/นักศึกษา และแบบสำรวจลานจอดรถเรือนไทย'));
    if (vr) v.appendChild(kpiGrid(Object.keys(vr.rows).map(function (n, i) { return vr.rows[n] == null ? { icon: 'car', label: n, na: 'ไม่มีข้อมูลยืนยัน', color: C.c5 } : { icon: 'car', label: n, value: num(vr.rows[n]), unit: 'รายการ', updated: vr.updated, color: [C.c1, C.c3, C.c4, C.c5][i] }; })));
    v.appendChild(section('ที่มาและข้อจำกัด', {}, [el('div', { class: 'grid2' }, [infoBox('ลงทะเบียนยานพาหนะ', vr), rt ? infoBox('ลานจอดรถเรือนไทย — ยังเชื่อมต่อไม่ได้', rt) : null])]));
    v.appendChild(systemsSection(['veh-staff', 'veh-student', 'ruenthai']));
  };
  PAGES.graduation = function (v) {
    var gr = mod('graduationParking'), gps = mod('graduationGuardGps');
    v.appendChild(pageHead('พิธีพระราชทานปริญญาบัตร ปีการศึกษา 2568', 'ลานจอดรถและงาน รปภ. ช่วงพิธีพระราชทานปริญญาบัตร ปีการศึกษา 2568'));
    if (gr) {
      v.appendChild(kpiGrid(gr.days.map(function (d, i) { return { icon: 'cap', label: 'รถในลานจอด ' + dLabel(d.date), value: num(d.latestCount), unit: 'คัน', sub: d.occupancyPercent + '% ของความจุ ' + num(d.capacity) + ' คัน (' + d.lots + ' ลาน)', updated: gr.updated, color: [C.c1, C.c3, C.c4][i] }; })));
      v.appendChild(el('div', { class: 'sec' }, [figure('อัตราการใช้ลานจอดรวม', 'ที่มา: SUMMARY_2569 · จำนวนรถล่าสุดที่บันทึกของแต่ละลาน', hbars(gr.days.map(function (d) { return { label: dLabel(d.date), value: d.occupancyPercent, note: num(d.latestCount) + ' / ' + num(d.capacity) + ' คัน', color: C.c3 }; }), 100, { ticks: [0, 25, 50, 75, 100], labelW: 120 }))]));
    }
    v.appendChild(section('นิยามและสถานะ', {}, [el('div', { class: 'grid2' }, [infoBox('ลานจอดงานปริญญา', gr), gps ? infoBox('รายงาน รปภ. งานปริญญา (GPS) — ยังเชื่อมต่อไม่ได้', gps) : null])]));
    v.appendChild(section('ปีการศึกษาอื่น', {}, [el('div', { class: 'card box' }, [el('p', { class: 'def', text: 'ปีการศึกษา 2568 (พิธีเดือนตุลาคม 2569) เป็นปีล่าสุดและเป็นปีเดียวที่มีระบบและข้อมูลที่ยืนยันได้ ปีอื่นจะเพิ่มเป็นแถบย่อยเมื่อมีแหล่งข้อมูลจริง' })])]));
    v.appendChild(systemsSection(['grad-parking', 'grad-guard-report']));
  };
  PAGES['guard-scan'] = function (v) {
    var gs = mod('guardScan');
    v.appendChild(pageHead('การสแกนจุดและรายงานปฏิบัติงาน รปภ.เอกชน', 'การสแกนจุดตรวจของ รปภ.เอกชน แยกหน่วยงาน/โซน (ไม่แสดงชื่อ รปภ.)'));
    if (gs) {
      v.appendChild(kpiGrid([
        { icon: 'scan', label: 'การสแกนทั้งหมด', value: num(gs.scans), unit: 'ครั้ง', scope: dLabel(gs.range.from) + ' – ' + dLabel(gs.range.to), updated: gs.updated },
        { icon: 'alert', label: 'ผลไม่ปกติ', value: num(gs.byStatus['ไม่ปกติ']), unit: 'ครั้ง', sub: 'ปกติ ' + num(gs.byStatus['ปกติ']) + ' ครั้ง', color: C.c2 },
        { icon: 'map', label: 'จุดสแกน', value: num(gs.scanPoints), unit: 'จุด', color: C.c3 },
        { icon: 'shield', label: 'หน่วยงาน/โซน', value: num(Object.keys(gs.byUnit).length), unit: 'หน่วย', color: C.c5 }]));
      v.appendChild(el('div', { class: 'sec' }, [figure('การสแกนแยกหน่วยงาน/โซน', 'ที่มา: แสกนจุดเอกชน · อัปเดต ' + dLabel(gs.updated), hbars(Object.keys(gs.byUnit).map(function (u) { return { label: u, value: gs.byUnit[u], color: C.c1 }; }), Math.max.apply(null, Object.keys(gs.byUnit).map(function (u) { return gs.byUnit[u]; })), { labelW: 220 }))]));
      v.appendChild(section('ข้อสังเกต', {}, [infoBox('สแกนจุด รปภ.เอกชน', gs)]));
    }
    v.appendChild(systemsSection(['guard-scan', 'guard-shift', 'pdf-guard', 'grad-guard-report']));
  };
  PAGES.borrow = function (v) {
    var m = mod('borrow');
    v.appendChild(pageHead('ยืม-คืนอุปกรณ์และรถกอล์ฟ', 'คำขอยืมอุปกรณ์จราจร การแจ้งคืน และการจองรถกอล์ฟ'));
    if (m) {
      v.appendChild(kpiGrid([
        { icon: 'box', label: 'คำขอยืมอุปกรณ์', value: num(m.borrowRequests), unit: 'รายการ', sub: 'รับของคืนแล้ว ' + m.borrowByStatus['รับของคืนแล้ว'], scope: dLabel(m.range.from) + ' – ' + dLabel(m.range.to), updated: m.updated, tag: 'ข้อมูลช่วงทดลองระบบ' },
        { icon: 'alert', label: 'แจ้งคืน รอยืนยัน', value: num(m.returnByStatus['รอยืนยัน']), unit: 'รายการ', sub: 'จาก ' + m.returnRecords + ' บันทึกการคืน', tag: 'ไม่ตรงกับ Borrow_Data', color: C.c2 },
        { icon: 'car', label: 'จองรถกอล์ฟ', value: num(m.golfCartBookings), unit: 'รายการ', color: C.c3 },
        { icon: 'box', label: 'อุปกรณ์ในคลัง', value: num(m.inventory.totalStock), unit: 'ชิ้น', sub: m.inventory.items + ' ชนิด · Sheet ระบุถูกยืม ' + m.inventory.markedBorrowed + ' ชิ้น', color: C.c5 }]));
      v.appendChild(section('ข้อสังเกต', {}, [infoBox('ระบบยืม-คืน', m)]));
    }
    v.appendChild(systemsSection(['borrow']));
  };
  PAGES.lostfound = function (v) {
    var lf = mod('lostfound');
    v.appendChild(pageHead('แจ้งของหาย / เก็บของได้', 'สถิติรายเดือน สถานะการดำเนินการ และรายการพร้อมรูปภาพจากระบบ Lost & Found', rangeCtrl()));
    if (lf) {
      var lt = function (n) { return sumMonthly(lf.monthly, function (r) { return r.byType[n]; }); };
      v.appendChild(kpiGrid([
        { icon: 'search', label: 'แจ้งของหาย', value: num(lt('สิ่งของสูญหาย')), unit: 'รายการ', scope: rangeText(), updated: lf.updated, color: C.c4 },
        { icon: 'box', label: 'เก็บของได้', value: num(lt('พบสิ่งของ')), unit: 'รายการ', scope: rangeText(), color: C.c3 },
        { icon: 'file', label: 'แบบฟอร์มรับของคืน', value: num(lt('รับของคืน')), unit: 'รายการ', scope: rangeText(), color: C.c1 },
        { icon: 'shield', label: 'สถานะ “รับของคืนแล้ว”', value: num(lf.returned), unit: 'รายการ', sub: 'รอเจ้าของมารับ ' + lf.byStatus['เจ้าของยังไม่มารับคืน'] + ' · ช่วยหาแล้วยังไม่พบ ' + lf.byStatus['ช่วยหาแล้วยังไม่พบ'], scope: 'ทั้งปี 2569', color: C.c5 }]));
      var g = el('div', { class: 'grid2' });
      g.appendChild(figure('รายเดือนแยกประเภท', 'ที่มา: แจ้งของหาย · อัปเดต ' + dLabel(lf.updated), lfChart()));
      g.appendChild(figure('สถานะการดำเนินการ (ทั้งปี 2569)', lf.total + ' รายการ', hbars(Object.keys(lf.byStatus).map(function (s) { return { label: s, value: lf.byStatus[s], color: s === 'รับของคืนแล้ว' ? C.c3 : C.c5 }; }), Math.max.apply(null, Object.keys(lf.byStatus).map(function (s) { return lf.byStatus[s]; })), { labelW: 190 })));
      v.appendChild(el('div', { class: 'sec' }, [g]));
      if (extra('lostfoundStatus')) v.appendChild(section('รายเดือนแยกสถานะ', { note: extra('lostfoundStatus').definition }, [figure('สถานะรายการรายเดือน', 'หน่วย: รายการ · ตรวจ ' + dLabel(extra('lostfoundStatus').checkedAt), lfStatusChart())]));
      v.appendChild(section('รายการและรูปภาพ', {}, [el('div', { id: 'lfList' })])); renderLfList();
      v.appendChild(section('นิยาม', {}, [infoBox('Lost & Found', lf)]));
    }
    v.appendChild(systemsSection(['lostfound']));
  };
  PAGES.safety = function (v) {
    var f = mod('fire');
    v.appendChild(pageHead('อุปกรณ์ดับเพลิงและการตรวจถัง', 'ทะเบียนและผลตรวจถังดับเพลิง และแผนที่เครื่อง AED'));
    if (f) {
      v.appendChild(kpiGrid([
        { icon: 'heart', label: 'ถังดับเพลิงในทะเบียน', value: num(f.extinguishers), unit: 'ถัง', updated: f.updated, color: C.c2 },
        { icon: 'shield', label: 'ถังที่ตรวจแล้ว', value: num(f.extinguishersInspected), unit: 'ถัง', sub: 'จาก ' + f.extinguishers + ' ถัง', color: C.c3 },
        { icon: 'file', label: 'การตรวจทั้งหมด', value: num(f.inspections), unit: 'ครั้ง', sub: 'ปกติ ' + f.inspectionResult['ปกติ'] + ' · ชำรุด ' + f.inspectionResult['ชำรุด'], color: C.c1 },
        { icon: 'map', label: 'เครื่อง AED', na: 'ไม่มีข้อมูลยืนยัน (ดูแผนที่ต้นทาง)', color: C.c5 }]));
      var g = el('div', { class: 'grid2' });
      g.appendChild(figure('ถังดับเพลิงแยกชนิด', 'ที่มา: ข้อมูลถังดับเพลิง', hbars(Object.keys(f.byType).map(function (t) { return { label: t.replace(/ \(.*\)/, ''), value: f.byType[t], color: C.c2 }; }), 20, { labelW: 150, ticks: [0, 5, 10, 15, 20] })));
      g.appendChild(figure('ถังดับเพลิงแยกหน่วยงาน', 'ที่มา: ข้อมูลถังดับเพลิง', hbars(Object.keys(f.byUnit).map(function (t) { return { label: t, value: f.byUnit[t], color: C.c1 }; }), 35, { labelW: 190, ticks: [0, 10, 20, 30] })));
      v.appendChild(el('div', { class: 'sec' }, [g]));
      v.appendChild(section('นิยาม', {}, [infoBox('ถังดับเพลิง', f)]));
    }
    v.appendChild(section('ประเภทอุปกรณ์ดับเพลิงในระบบเดิม', { note: 'ถังดับเพลิง · สายฉีด · หัวฉีด · ปั๊มน้ำ · ตู้เก็บอุปกรณ์ · หัวรับน้ำ · ชุด PPE' }, [entryCard({ what: 'ดูทะเบียนและผลตรวจอุปกรณ์ดับเพลิงทั้ง 7 ประเภท รายชิ้น พร้อมภาพและประวัติการเติมสาร', source: OLD_SHEET + ' แท็บ ตรวจสภาพ / ประวัติการเติมสารถังดับเพลิง',
      why: 'ตัวเลขที่ตรวจยืนยันแล้วในหน้านี้มาจากระบบตรวจถังดับเพลิงรุ่นใหม่ (เฉพาะถังดับเพลิง) อุปกรณ์ประเภทอื่นยังไม่ได้ตรวจนับจากต้นทาง', menu: 'อุปกรณ์ดับเพลิง › (เลือกประเภท)' })]));
    v.appendChild(systemsSection(['fire', 'aed-map']));
  };
  PAGES.reports = function (v) {
    v.appendChild(pageHead('ระบบสร้างเอกสาร PDF', 'เครื่องมือสร้างเอกสารรายงานและ Dashboard เดิม (เปิดในระบบต้นทาง)'));
    v.appendChild(systemsSection(['dashboard-ai', 'pdf-monthly', 'pdf-daily', 'pdf-guard-monthly', 'pdf-guard', 'old-hub'], 'รายงานและเอกสาร'));
  };
  PAGES.systems = function (v) {
    v.appendChild(pageHead('สถานะระบบและการเชื่อมต่อ', DATA.systems.categories.reduce(function (a, c) { return a + c.systems.length; }, 0) + ' ระบบ ใน ' + DATA.systems.categories.length + ' หมวด พร้อมสถานะการเชื่อมต่อข้อมูล'));
    DATA.systems.categories.forEach(function (c) { v.appendChild(section(c.name, { note: c.systems.length + ' ระบบ' }, [el('div', { class: 'sys-grid' }, c.systems.map(sysCard))])); });
    v.appendChild(section('ที่มาของข้อมูลและการคุ้มครองข้อมูลส่วนบุคคล', {}, [el('div', { class: 'card box' }, [notesList([DATA.stats.method,
      'หน้านี้แสดงเฉพาะสถิติรวม ไม่แสดงชื่อ เบอร์โทร ทะเบียนรถ รายละเอียดผู้แจ้งเหตุ ข้อความอิสระ หรือภาพถ่าย และไม่มีรหัสผ่าน/API key อยู่ในหน้าเว็บ',
      'ตัวเลขทุกตัวระบุแหล่งข้อมูลและเวลาอัปเดตล่าสุด ระบบที่ยังยืนยันแหล่งข้อมูลไม่ได้แสดงสถานะ “ยังเชื่อมต่อไม่ได้” หรือ “ไม่มีข้อมูลยืนยัน” แทนตัวเลข',
      'วันที่และเดือนตีความตามเขตเวลา Asia/Bangkok และแสดงปีเป็น พ.ศ.'])])]));
  };

  /* ---------- แผนที่อุบัติเหตุ ---------- */
  /* ---------- แผนที่จุดเกิดอุบัติเหตุ ----------
   * ลำดับการเลือกแผนที่: (1) Google Maps เฉพาะเมื่อผู้ดูแลใส่ Browser key ที่จำกัดสิทธิ์ไว้ใน config.js (รุ่นนี้ไม่มี key)
   * (2) Leaflet + OpenStreetMap แบบเดียวกับแผนที่ของ Dashboard AI เดิม (ไม่ต้องใช้ API key)  (3) แผนผังตามพิกัดจริงในหน้า — ใช้เมื่อแผนที่พื้นหลังโหลดไม่สำเร็จ
   * จุดบนแผนที่มีเฉพาะ ประเภทเหตุ / ชื่อสถานที่ / เดือน — ไม่มีชื่อบุคคล เวลา รูปภาพ หรือข้อความเหตุการณ์ */
  var gmState = { loading: false };
  var lf = { map: null, layer: null, el: null, pts: [], failed: false, reason: '', ok: 0, err: 0, loading: false };
  function useGoogleMap() { return !!CFG.googleMapsApiKey && !window.__HUB_PREVIEW__; }
  /* OpenStreetMap ปฏิเสธคำขอไทล์ที่ไม่มี Referer (เช่นเปิดไฟล์จากเครื่อง file://) และตอบเป็นภาพ “Access blocked” — จึงไม่เรียกไทล์เลยในกรณีนั้น และตรวจสถานะไทล์ตัวอย่างก่อนใช้ทุกครั้ง */
  function tilesAllowed() { return /^https?:$/.test(location.protocol); }
  function mapMode() { return useGoogleMap() ? 'google' : (state.mapView === 'plan' || lf.failed || !tilesAllowed()) ? 'plan' : 'osm'; }
  function typeColor(p) { return p.type === V ? C.c3 : C.c2; }
  function renderGoogleMap(box, pts, b) {
    if (!(window.google && google.maps)) {
      if (!gmState.loading) {
        gmState.loading = true; window.__hubGmReady = function () { renderMap(); };
        var sc = document.createElement('script'); sc.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(CFG.googleMapsApiKey) + '&callback=__hubGmReady'; sc.async = true;
        sc.onerror = function () { CFG.googleMapsApiKey = ''; showBanner('โหลด Google Maps ไม่สำเร็จ — ใช้แผนที่ OpenStreetMap แทน'); renderMap(); }; document.head.appendChild(sc);
        window.gm_authFailure = function () { CFG.googleMapsApiKey = ''; showBanner('Google Maps ปฏิเสธ key ที่ตั้งไว้ — ใช้แผนที่ OpenStreetMap แทน'); renderMap(); };
      }
      box.appendChild(el('div', { class: 'empty', text: 'กำลังโหลด Google Maps…' })); return;
    }
    var div = el('div', { class: 'lf-map' }); box.appendChild(div);
    var map = new google.maps.Map(div, { center: { lat: (b.latMin + b.latMax) / 2, lng: (b.lngMin + b.lngMax) / 2 }, zoom: 16, mapTypeControl: false, streetViewControl: false });
    pts.forEach(function (p) {
      var mk = new google.maps.Marker({ position: { lat: p.lat, lng: p.lng }, map: map, title: p.type + ' · ' + p.place + ' · ' + mLabel(p.month), icon: { path: google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: typeColor(p), fillOpacity: .9, strokeColor: '#fff', strokeWeight: 1.5 } });
      mk.addListener('click', function () { state.sel = p.i; renderMap(); });
    });
  }
  function loadLeaflet(done) {
    if (window.L && L.map) return done();
    if (lf.loading) return; lf.loading = true;
    document.head.appendChild(el('link', { rel: 'stylesheet', href: 'assets/vendor/leaflet.css' }));
    var sc = document.createElement('script'); sc.src = 'assets/vendor/leaflet.js';
    sc.onload = function () { lf.loading = false; done(); };
    sc.onerror = function () { lf.loading = false; lf.failed = true; lf.reason = 'โหลดไลบรารีแผนที่ไม่สำเร็จ'; done(); };
    document.head.appendChild(sc);
  }
  function drawMarkers() {
    var map = lf.map; if (!map) return;
    if (lf.layer) lf.layer.remove(); lf.layer = L.layerGroup().addTo(map);
    var z = map.getZoom(), cells = {};
    lf.pts.forEach(function (p) { var q = map.project([p.lat, p.lng], z), k = Math.floor(q.x / 46) + ':' + Math.floor(q.y / 46); (cells[k] = cells[k] || []).push(p); });
    Object.keys(cells).forEach(function (k) {
      var g = cells[k];
      if (g.length === 1 || z >= 18) { g.forEach(function (p) {
        var sel = p.i === state.sel, m = L.circleMarker([p.lat, p.lng], { radius: sel ? 11 : 8, color: sel ? '#14231d' : '#fff', weight: sel ? 3 : 2, fillColor: typeColor(p), fillOpacity: .95 });
        m.bindTooltip(p.type + ' · ' + p.place + ' · ' + mLabel(p.month), { direction: 'top', offset: [0, -8] });
        m.on('click', function () { state.sel = p.i; renderMap(); }); m.addTo(lf.layer);
      }); return; }
      var lat = 0, lng = 0, nv = 0; g.forEach(function (p) { lat += p.lat; lng += p.lng; if (p.type === V) nv++; });
      var c = L.marker([lat / g.length, lng / g.length], { icon: L.divIcon({ className: 'lf-cl', html: '<b>' + g.length + '</b>', iconSize: [36, 36] }), title: g.length + ' จุด — กดเพื่อขยาย', alt: g.length + ' จุด' });
      c.bindTooltip(g.length + ' จุดบริเวณนี้ · ยานพาหนะ ' + nv + ' · ทั่วไป ' + (g.length - nv) + ' (กดเพื่อขยาย)', { direction: 'top', offset: [0, -16] });
      c.on('click', function () { map.fitBounds(L.latLngBounds(g.map(function (p) { return [p.lat, p.lng]; })).pad(0.4), { maxZoom: 18 }); });
      c.addTo(lf.layer);
    });
  }
  function drawLeaflet(box, pts, b) {
    lf.pts = pts;
    if (!lf.el) lf.el = el('div', { class: 'lf-map', 'aria-label': 'แผนที่จุดเกิดอุบัติเหตุ (OpenStreetMap) — ใช้ปุ่มลูกศรเลื่อนแผนที่ ปุ่ม + − เพื่อย่อขยาย' });
    box.appendChild(lf.el);
    if (!lf.map) {
      lf.map = L.map(lf.el, { scrollWheelZoom: false, zoomSnap: 0.5 }).fitBounds([[b.latMin, b.lngMin], [b.latMax, b.lngMax]]);
      lf.map.attributionControl.setPrefix(false);
      var tl = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© ผู้ร่วมจัดทำ OpenStreetMap' }).addTo(lf.map);
      tl.on('tileload', function () { lf.ok++; });
      tl.on('tileerror', function () { lf.err++; if (!lf.ok && lf.err >= 4 && !lf.failed) { lf.failed = true; lf.reason = 'โหลดแผนที่พื้นหลัง (OpenStreetMap) ไม่สำเร็จ'; renderMap(); } });
      lf.map.on('zoomend', drawMarkers);
    } else setTimeout(function () { if (lf.map) lf.map.invalidateSize(); }, 0);
    drawMarkers();
  }
  function drawPlan(box, pts, b) {
    var W = 500, H = 640, pad = 18, i;
    var px = function (lng) { return pad + (W - 2 * pad) * (lng - b.lngMin) / (b.lngMax - b.lngMin); }, py = function (lat) { return pad + (H - 2 * pad) * (b.latMax - lat) / (b.latMax - b.latMin); };
    var root = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'group', 'aria-label': 'แผนผังจุดเกิดอุบัติเหตุภายในวิทยาเขตศาลายา' });
    for (i = 0; i <= 4; i++) { root.appendChild(svg('line', { class: 'gl', x1: pad + (W - 2 * pad) * i / 4, x2: pad + (W - 2 * pad) * i / 4, y1: pad, y2: H - pad })); root.appendChild(svg('line', { class: 'gl', y1: pad + (H - 2 * pad) * i / 4, y2: pad + (H - 2 * pad) * i / 4, x1: pad, x2: W - pad })); }
    var sb = (W - 2 * pad) * (500 / (111320 * Math.cos(13.795 * Math.PI / 180))) / (b.lngMax - b.lngMin);
    root.appendChild(svg('line', { x1: pad + 6, x2: pad + 6 + sb, y1: H - pad - 8, y2: H - pad - 8, stroke: 'currentColor', 'stroke-width': 2 }));
    root.appendChild(svg('text', { class: 'rl', x: pad + 6, y: H - pad - 14, style: 'font-size:11px', text: '500 ม.' }));
    root.appendChild(svg('text', { class: 'rl', x: W - pad - 6, y: pad + 16, 'text-anchor': 'end', style: 'font-weight:600', text: 'N ↑' }));
    pts.filter(function (p) { return !p.outOfCampusBox; }).forEach(function (p) {
      var c = svg('circle', { cx: px(p.lng), cy: py(p.lat), r: 7, fill: typeColor(p), 'fill-opacity': .85, tabindex: 0, role: 'button', 'aria-label': p.type + ' ' + p.place + ' ' + mLabel(p.month), class: p.i === state.sel ? 'sel' : '',
        onclick: function () { state.sel = p.i; renderMap(); }, onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); state.sel = p.i; renderMap(); } } });
      c.appendChild(svg('title', { text: p.type + ' · ' + p.place + ' · ' + mLabel(p.month) })); root.appendChild(c);
    });
    box.appendChild(root);
  }
  function mapPoints() { var am = mod('accidentMap'); if (!am) return []; return am.points.map(function (p, i) { p.i = i; return p; }).filter(function (p) { return inRange(p.month) && (state.mapType === 'all' || p.type === state.mapType); }); }
  function renderMap() {
    var am = mod('accidentMap'), tools = $('mapTools'), box = $('mapSvg'), list = $('mapList'), cap = $('mapCap'); if (!box) return;
    tools.textContent = ''; box.textContent = ''; list.textContent = '';
    if (!am) { box.appendChild(el('div', { class: 'empty', text: 'ยังเชื่อมต่อข้อมูลพิกัดไม่ได้' })); return; }
    var b = am.box, pts = mapPoints(), mode = mapMode(), campus = 'https://www.google.com/maps/@' + ((b.latMin + b.latMax) / 2) + ',' + ((b.lngMin + b.lngMax) / 2) + ',16z';
    [['all', 'ทุกประเภท'], [V, 'ยานพาหนะ'], [G, 'ทั่วไป']].forEach(function (o) { tools.appendChild(el('button', { type: 'button', class: 'chip', 'aria-pressed': String(state.mapType === o[0]), text: o[1], onclick: function () { state.mapType = o[0]; state.sel = -1; renderMap(); } })); });
    if (mode !== 'google' && tilesAllowed()) tools.appendChild(el('span', { class: 'seg', role: 'group', 'aria-label': 'รูปแบบแผนที่', style: 'margin-left:auto' }, [['osm', 'แผนที่'], ['plan', 'แผนผัง']].map(function (o) {
      return el('button', { type: 'button', 'aria-pressed': String(mode === o[0]), text: o[1], onclick: function () { state.mapView = o[0]; if (o[0] === 'osm') { lf.failed = false; lf.err = 0; lf.probe = null; if (lf.map) { lf.map.remove(); lf.map = null; lf.el = null; lf.ok = 0; } } renderMap(); } }); })));
    if (lf.failed && state.mapView !== 'plan') box.appendChild(el('div', { class: 'map-warn', role: 'status' }, [el('b', { text: (lf.reason || 'โหลดแผนที่ไม่สำเร็จ') + ' — แสดงแผนผังตามพิกัดจริงแทน' }),
      el('span', { text: 'จุดและจำนวนยังเป็นข้อมูลจริงชุดเดิม กด “แผนที่” เพื่อลองโหลดใหม่ หรือเปิดแผนที่ต้นทาง' }),
      el('span', { class: 'btns' }, [extBtn('เปิดบริเวณวิทยาเขตใน Google Maps', campus, true), SYS['dashboard-ai'] ? extBtn('เปิดแผนที่ใน Dashboard AI เดิม', SYS['dashboard-ai'].links[0].url, true) : null])]));
    if (mode === 'google') renderGoogleMap(box, pts, b);
    else if (mode === 'plan') drawPlan(box, pts, b);
    else if (lf.probe !== 'ok') { box.appendChild(el('div', { class: 'empty', role: 'status', text: 'กำลังตรวจแหล่งแผนที่พื้นหลัง…' }));
      if (!lf.probing) { lf.probing = true; fetch('https://a.tile.openstreetmap.org/15/25515/15116.png', { mode: 'cors', cache: 'no-store' })
        .then(function (r) { lf.probe = r.ok ? 'ok' : 'fail'; if (!r.ok) { lf.failed = true; lf.reason = 'แหล่งแผนที่พื้นหลังปฏิเสธการเรียกใช้ (HTTP ' + r.status + ')'; } })
        .catch(function () { lf.probe = 'fail'; lf.failed = true; lf.reason = 'เชื่อมต่อแหล่งแผนที่พื้นหลังไม่ได้'; }).then(function () { lf.probing = false; renderMap(); }); } }
    else if (window.L && L.map) drawLeaflet(box, pts, b);
    else { box.appendChild(el('div', { class: 'empty', text: 'กำลังโหลดแผนที่…' })); loadLeaflet(renderMap); }
    box.appendChild(el('div', { class: 'legend' }, [el('span', {}, [el('i', { style: 'background:' + C.c3 }), V]), el('span', {}, [el('i', { style: 'background:' + C.c2 }), G]),
      mode === 'osm' ? el('span', {}, [el('i', { style: 'background:var(--brand-d);border-radius:50%' }), 'วงกลมตัวเลข = หลายจุดใกล้กัน']) : null]));
    if (cap) cap.textContent = mode === 'osm' ? 'แผนที่ OpenStreetMap (แบบเดียวกับ Dashboard AI เดิม ไม่ใช้ API key) — ชี้/แตะจุดเพื่อดูประเภท สถานที่ และเดือน กดวงกลมตัวเลขเพื่อขยาย'
      : mode === 'plan' ? 'แผนผังตามพิกัดจริง (ทิศเหนืออยู่ด้านบน ไม่มีภาพพื้นหลัง) — กดจุดเพื่อดูตำแหน่งและเปิดใน Google Maps' + (tilesAllowed() ? '' : ' · แผนที่พื้นหลังใช้ได้เมื่อเปิดผ่านเว็บไซต์ (https) เท่านั้น') : 'Google Maps — กดจุดเพื่อดูตำแหน่ง';
    var out = pts.filter(function (p) { return p.outOfCampusBox; }).length;
    var note = $('mapNote'); if (note) note.textContent = num(pts.length) + ' จุดในช่วง ' + rangeText() + (out ? ' (อยู่นอกกรอบวิทยาเขต ' + out + ' จุด ควรตรวจพิกัด)' : '') + ' · ที่มา: รายงานเหตุการณ์ คอลัมน์ “พิกัด (Lat, Lng)” · อัปเดต ' + dLabel(am.updated);
    var det = $('mapDetail'), sel = am.points[state.sel], emb = $('mapEmbed'); det.textContent = ''; emb.textContent = ''; emb.hidden = true;
    if (sel && pts.indexOf(sel) >= 0) {
      det.appendChild(el('div', {}, [el('strong', { text: sel.place })]));
      det.appendChild(el('div', { text: sel.type + ' · ' + mFull(sel.month) + ' · พิกัด ' + sel.lat.toFixed(6) + ', ' + sel.lng.toFixed(6) + (sel.outOfCampusBox ? ' (อยู่นอกกรอบวิทยาเขต ควรตรวจสอบ)' : '') }));
      det.appendChild(el('a', { class: 'btn', href: mapsUrl(sel), target: '_blank', rel: 'noopener' }, ['เปิดตำแหน่งนี้ใน Google Maps', ic('ext', 15)]));
      if (mode === 'plan' && CFG.allowMapEmbed && !window.__HUB_PREVIEW__) { emb.hidden = false; emb.appendChild(el('iframe', { title: 'Google Maps: ' + sel.place, loading: 'lazy', referrerpolicy: 'no-referrer', src: 'https://www.google.com/maps?q=' + sel.lat + ',' + sel.lng + '&z=17&output=embed' })); }
    } else det.appendChild(el('div', { text: 'เลือกจุดบนแผนที่หรือในตาราง เพื่อดูตำแหน่งและเปิดใน Google Maps' }));
    var byPlace = {}; pts.forEach(function (p) { byPlace[p.place] = (byPlace[p.place] || 0) + 1; });
    var top = Object.keys(byPlace).sort(function (x, y) { return byPlace[y] - byPlace[x]; }).slice(0, 3).filter(function (k2) { return byPlace[k2] > 1; });
    if (top.length) det.appendChild(el('div', { class: 'src', text: 'จุดที่เกิดซ้ำมากที่สุดในช่วงนี้: ' + top.map(function (k2) { return k2 + ' ' + byPlace[k2] + ' ครั้ง'; }).join(' · ') }));
    list.appendChild(el('thead', {}, [el('tr', {}, [el('th', { text: 'เดือน' }), el('th', { text: 'ประเภท / สถานที่' }), el('th', { text: 'แผนที่' })])]));
    var tb = el('tbody');
    pts.slice().sort(function (a, c) { return a.month < c.month ? 1 : a.month > c.month ? -1 : 0; }).forEach(function (p) {
      tb.appendChild(el('tr', { class: p.i === state.sel ? 'sel' : '' }, [el('td', { text: mLabel(p.month) }),
        el('td', {}, [el('span', { class: 'dot', style: 'background:' + typeColor(p) }), el('button', { type: 'button', class: 'linkish', text: p.place + (p.outOfCampusBox ? ' (นอกกรอบ)' : ''),
          onclick: function () { state.sel = p.i; if (lf.map && mapMode() === 'osm') lf.map.setView([p.lat, p.lng], Math.max(lf.map.getZoom(), 17)); renderMap(); } })]),
        el('td', {}, [el('a', { href: mapsUrl(p), target: '_blank', rel: 'noopener', 'aria-label': 'เปิด ' + p.place + ' ใน Google Maps', text: 'เปิด' })])]));
    });
    if (!pts.length) tb.appendChild(el('tr', {}, [el('td', { colspan: 3, class: 'empty', text: 'ไม่มีจุดในช่วงที่เลือก' })]));
    list.appendChild(tb);
  }

  /* ======================================================================
   * หน้าที่เพิ่มในรอบ 3: ทางเข้าระบบเดิม · ตารางเวร · กำลังพล รปภ. · แบบฟอร์ม · ตั้งค่า · ผู้ช่วย AI
   * ==================================================================== */
  function extra(k) { return (DATA.extra || {})[k] || null; }
  function oldUrl() { return (SYS['old-hub'] && SYS['old-hub'].links[0] && SYS['old-hub'].links[0].url) || ''; }
  function tabsOf(group, page) {
    var n = NAV.filter(function (g) { return g.group === group; })[0]; if (!n || n.children.length < 2) return null;
    return el('nav', { class: 'tabs', 'aria-label': 'แถบย่อยของ ' + n.label }, n.children.map(function (c) { return el('a', { href: '#' + c.id, 'aria-current': c.id === page ? 'page' : null, text: c.label }); }));
  }
  function extBtn(label, url, sec) { return el('a', { class: 'btn' + (sec ? ' sec' : ''), href: url, target: '_blank', rel: 'noopener' }, [label, ic('ext', 15)]); }
  /** หน้าทางเข้า: ฟังก์ชันที่ยังทำงานในระบบเดิม (branch main) และมีข้อมูลรายบุคคล/รายครั้ง จึงเปิดในระบบต้นทางแทนการคัดลอกข้อมูลมาแสดง */
  function entryCard(o) {
    var rows = [['สถานะในหน้ารวม', el('span', { class: 'pill s-legacy', text: 'ใช้งานในระบบเดิม (เปิดแยก)' })], ['ใช้ทำอะไร', o.what], ['แหล่งข้อมูลของระบบเดิม', o.source],
      ['เหตุที่ไม่แสดงตัวเลขที่นี่', o.why], ['เมนูในระบบเดิม', o.menu]].filter(function (r) { return r[1]; });
    var dl = el('dl'); rows.forEach(function (r) { dl.appendChild(el('dt', { text: r[0] })); dl.appendChild(el('dd', {}, [r[1]])); });
    return el('div', { class: 'card entry' }, [el('h3', { text: o.cardTitle || 'ทางเข้าระบบเดิม' }), dl,
      el('div', { class: 'btns' }, [oldUrl() ? extBtn('เปิดระบบเดิม', oldUrl()) : el('span', { class: 'kpi-na', text: 'ไม่มีลิงก์ที่ยืนยันได้' })]),
      el('p', { class: 'src', text: 'ระบบเดิมให้กรอกรหัสพนักงานที่หน้าเข้าสู่ระบบของระบบนั้นเอง หน้ารวมนี้ไม่เก็บและไม่ส่งรหัสใด ๆ' })]);
  }
  var PII = 'เป็นข้อมูลรายบุคคล (ชื่อ ตำแหน่ง เบอร์ติดต่อ รูปถ่าย) จึงไม่นำขึ้นหน้ารวมที่เปิดสาธารณะ', NOSTAT = 'เป็นบันทึกและภาพถ่ายรายครั้ง ยังไม่มีสถิติรวมที่ตรวจยืนยันจากต้นทาง จึงไม่แสดงตัวเลข';
  var OLD_SHEET = 'Sheet “ข้อมูลงานจราจรออนไลน์”';
  var ENTRY = {
    'staff': { title: 'บุคลากร/พนักงาน — บุคลากรทั้งหมด', desc: 'ทำเนียบบุคลากรงานจราจรและความปลอดภัย', what: 'ดูรายชื่อ ตำแหน่ง และช่องทางติดต่อของบุคลากรทุกหน่วย', source: OLD_SHEET + ' แท็บ พนักงานจราจร (ผ่าน Apps Script ของระบบเดิม)', why: PII, menu: 'บุคลากร/พนักงาน › บุคลากรทั้งหมด' },
    'staff-strategy': { title: 'บุคลากร/พนักงาน — หน่วยยุทธศาสตร์ฯ', desc: 'ทำเนียบบุคลากร กรองเฉพาะหน่วยยุทธศาสตร์ฯ', what: 'ดูรายชื่อและช่องทางติดต่อของบุคลากรหน่วยยุทธศาสตร์ฯ', source: OLD_SHEET + ' แท็บ พนักงานจราจร (ผ่าน Apps Script ของระบบเดิม)', why: PII, menu: 'บุคลากร/พนักงาน › หน่วยยุทธศาสตร์ฯ' },
    'staff-ops': { title: 'บุคลากร/พนักงาน — หน่วยปฏิบัติการฯ', desc: 'ทำเนียบบุคลากร กรองเฉพาะหน่วยปฏิบัติการฯ', what: 'ดูรายชื่อและช่องทางติดต่อของบุคลากรหน่วยปฏิบัติการฯ', source: OLD_SHEET + ' แท็บ พนักงานจราจร (ผ่าน Apps Script ของระบบเดิม)', why: PII, menu: 'บุคลากร/พนักงาน › หน่วยปฏิบัติการฯ' },
    'area-inspect': { title: 'การดูแลพื้นที่ส่วนกลาง — ตรวจพื้นที่', desc: 'บันทึกและภาพการตรวจพื้นที่ส่วนกลาง', what: 'ดูภาพและบันทึกการตรวจพื้นที่ส่วนกลางรายครั้ง', source: OLD_SHEET + ' แท็บ ภาพการตรวจพื้นที่', why: NOSTAT, menu: 'การดูแลพื้นที่ส่วนกลาง › ตรวจพื้นที่' },
    'area-assist': { title: 'การดูแลพื้นที่ส่วนกลาง — ให้ความช่วยเหลือ', desc: 'บันทึกการให้ความช่วยเหลือผู้ใช้พื้นที่', what: 'ดูภาพและบันทึกการให้ความช่วยเหลือรายครั้ง', source: OLD_SHEET + ' แท็บ ภาพการตรวจพื้นที่', why: NOSTAT, menu: 'การดูแลพื้นที่ส่วนกลาง › ให้ความช่วยเหลือ', related: ['incident-report'], relatedTitle: 'สถิติการรับส่งผู้ป่วยและเหตุการณ์อยู่ในระบบรายงานเหตุการณ์' },
    'area-traffic': { title: 'การดูแลพื้นที่ส่วนกลาง — งานจราจร', desc: 'บันทึกการปฏิบัติงานด้านจราจรในพื้นที่ส่วนกลาง', what: 'ดูภาพและบันทึกงานจราจรรายครั้ง', source: 'Apps Script ของระบบเดิม (ข้อมูลภาพการปฏิบัติงาน)', why: NOSTAT, menu: 'การดูแลพื้นที่ส่วนกลาง › งานจราจร', related: ['gate-tracker', 'incident-report'], relatedTitle: 'ระบบจราจรที่มีสถิติในหน้ารวม' },
    'vehicle-fleet': { title: 'ยานพาหนะทั้งหมด', desc: 'ทะเบียนยานพาหนะของงานจราจรและการตรวจสภาพ', what: 'ดูรายการยานพาหนะของงาน ผลตรวจสภาพ และบันทึกการทำความสะอาด', source: OLD_SHEET + ' แท็บ ตรวจสภาพ / Vehicle_List (ผ่าน Apps Script ของระบบเดิม)', why: 'ยังไม่ได้ตรวจนับจำนวนยานพาหนะจากต้นทางในรอบนี้ และรายการมีทะเบียนรถ จึงไม่แสดงตัวเลขหรือรายการ', menu: 'ยานพาหนะทั้งหมด' },
    'parking': { title: 'ข้อมูลการจอดรถ', desc: 'ข้อมูลลานจอดรถภายในมหาวิทยาลัย และระบบลานจอดที่เกี่ยวข้อง', what: 'ดูข้อมูลลานจอดรถแต่ละลาน (ตำแหน่ง ภาพ รายละเอียด)', source: OLD_SHEET + ' แท็บ ลานจอดรถ', why: 'ยังไม่ได้ตรวจนับจำนวนลาน/ความจุจากแท็บนี้ จึงไม่แสดงตัวเลข (ตัวเลขลานจอดงานปริญญาอยู่ในเมนูพิธีพระราชทานปริญญาบัตร)', menu: 'การจัดการจราจร › ข้อมูลลานจอดรถ', related: ['ruenthai', 'grad-parking'], relatedTitle: 'ระบบลานจอดที่เกี่ยวข้องและมีลิงก์ยืนยัน' },
    'forms-radio': { title: 'แบบฟอร์มบันทึกศูนย์วิทยุสื่อสาร', desc: 'แบบบันทึกการปฏิบัติงานของศูนย์วิทยุสื่อสาร', what: 'บันทึกเหตุการณ์และการรับ–ส่งข่าวของศูนย์วิทยุรายผลัด', source: OLD_SHEET + ' แท็บ บันทึกรายงานวิทยุสื่อสาร (เขียนผ่าน Apps Script ของระบบเดิม)', why: 'เป็นแบบฟอร์มที่เขียนข้อมูลจริง จึงให้เปิดกรอกในระบบต้นทางเท่านั้น', menu: 'แบบฟอร์มต่างๆ › บันทึกศูนย์วิทยุสื่อสาร' },
    'report-daily': { title: 'รายงานประจำวัน', desc: 'สรุปเหตุการณ์และการปฏิบัติงานประจำวัน', what: 'เปิดดู/พิมพ์รายงานประจำวันของงานจราจรและความปลอดภัย', source: 'หลาย Sheet ของระบบเดิม (รายงานเหตุการณ์ ของหาย จำนวนรถ ฯลฯ)', why: 'รายงานมีรายละเอียดรายเหตุการณ์และชื่อผู้ปฏิบัติงาน จึงเปิดในระบบต้นทาง · สถิติรวมดูได้ที่หน้า Dashboard', menu: 'รายงานและสถิติ › รายงานประจำวัน', related: ['pdf-daily'], relatedTitle: 'ระบบสร้างเอกสารที่เกี่ยวข้อง' },
    'report-radio': { title: 'รายงานวิทยุสื่อสาร', desc: 'รายงานจากบันทึกของศูนย์วิทยุสื่อสาร', what: 'เปิดดู/พิมพ์รายงานการปฏิบัติงานศูนย์วิทยุสื่อสาร', source: OLD_SHEET + ' แท็บ บันทึกรายงานวิทยุสื่อสาร และ พนักงานจราจร', why: 'รายงานมีชื่อผู้ปฏิบัติงานและรายละเอียดรายครั้ง จึงเปิดในระบบต้นทาง', menu: 'รายงานและสถิติ › รายงานวิทยุสื่อสาร' },
    'report-monthly': { title: 'รายงานประจำเดือน', desc: 'สรุปสถิติงานจราจรและความปลอดภัยรายเดือน', what: 'เปิดดู/พิมพ์รายงานสรุปรายเดือน', source: 'หลาย Sheet ของระบบเดิม (บางส่วนเป็น Sheet รุ่นเก่า)', why: 'ตัวเลขรายเดือนที่ตรวจยืนยันแล้วอยู่ในหน้า Dashboard และหน้ารายละเอียดของแต่ละหมวด · หน้านี้เป็นทางเข้ารายงานฉบับพิมพ์', menu: 'รายงานและสถิติ › รายงานประจำเดือน', related: ['pdf-monthly', 'dashboard-ai'], relatedTitle: 'ระบบสร้างเอกสารและ Dashboard ที่เกี่ยวข้อง' }
  };
  Object.keys(ENTRY).forEach(function (id) {
    PAGES[id] = function (v) { var o = ENTRY[id]; v.appendChild(pageHead(o.title, o.desc)); v.appendChild(el('div', { class: 'sec' }, [entryCard(o)])); if (o.related) v.appendChild(systemsSection(o.related, o.relatedTitle)); };
  });
  function simpleSys(id, title, desc, ids, secTitle) { PAGES[id] = function (v) { v.appendChild(pageHead(title, desc)); v.appendChild(systemsSection(ids, secTitle)); }; }
  simpleSys('event-incident', 'ระบบเหตุการณ์กิจกรรมพิเศษ', 'แบบฟอร์มและแดชบอร์ดรายงานเหตุการณ์ช่วงกิจกรรมพิเศษ — ยังไม่มีสถิติที่ยืนยันแหล่งข้อมูลได้ จึงแสดงเป็นลิงก์', ['event-incident'], 'ระบบต้นทาง');
  simpleSys('helmet-quiz', 'แบบทดสอบโครงการรณรงค์สวมหมวกนิรภัย', 'สื่อและแบบทดสอบความรู้ — ลิงก์ตรวจแล้วเปิดได้ · ยังไม่มีสถิติผลทดสอบที่ยืนยันแหล่งข้อมูลได้', ['helmet-quiz', 'gate-tracker'], 'ระบบต้นทาง');
  simpleSys('aed', 'เครื่อง AED', 'แผนที่ตำแหน่งและความพร้อมใช้งานเครื่อง AED ในวิทยาเขตศาลายา (Google My Maps) — ไม่มีข้อมูลจำนวนเครื่องในรูปแบบที่ระบบอ่านยืนยันได้ จึงแสดงเป็นลิงก์', ['aed-map'], 'ระบบต้นทาง');
  PAGES['inspection-history'] = function (v) {
    var fire = mod('fire');
    v.appendChild(pageHead('ประวัติการตรวจสภาพ', 'ประวัติการตรวจสภาพอุปกรณ์และยานพาหนะ สำหรับค้นและพิมพ์รายงาน'));
    if (fire) v.appendChild(section('สรุปการตรวจถังดับเพลิง (ระบบตรวจถังรุ่นใหม่)', { more: 'safety' }, [kpiGrid([
      { icon: 'heart', label: 'ถังดับเพลิงในทะเบียน', value: num(fire.extinguishers), unit: 'ถัง', updated: fire.updated, color: C.c2 },
      { icon: 'check', label: 'ถังที่ตรวจแล้ว', value: num(fire.extinguishersInspected), unit: 'ถัง', sub: 'จากบันทึกการตรวจ ' + num(fire.inspections) + ' ครั้ง', color: C.c1 },
      { icon: 'alert', label: 'ผลตรวจชำรุด', value: num(fire.inspectionResult['ชำรุด']), unit: 'ครั้ง', sub: 'ปกติ ' + num(fire.inspectionResult['ปกติ']) + ' ครั้ง', color: C.fine }])]));
    v.appendChild(el('div', { class: 'sec' }, [entryCard({ what: 'ค้นประวัติการตรวจสภาพอุปกรณ์ดับเพลิง การเติมสาร และยานพาหนะ แล้วพิมพ์รายงาน', source: OLD_SHEET + ' แท็บ ตรวจสภาพ / อุปกรณ์ดับเพลิง / ประวัติการเติมสารถังดับเพลิง',
      why: 'ประวัติรายรายการมีชื่อผู้ตรวจและลายมือชื่อ จึงเปิดในระบบต้นทาง', menu: 'ประวัติการตรวจสภาพ' })]));
    v.appendChild(systemsSection(['fire']));
  };
  PAGES.forms = function (v) {
    v.appendChild(pageHead('แบบฟอร์มทั่วไป', 'รวมแบบฟอร์มที่ใช้งานอยู่ — เปิดกรอกในระบบต้นทางเท่านั้น หน้ารวมนี้ไม่ส่งข้อมูลแทนผู้ใช้'));
    var ids = ['incident-report', 'gate-tracker', 'event-incident', 'cctv', 'borrow', 'lostfound', 'guard-scan', 'guard-shift', 'guard-feedback-central', 'guard-feedback-unit', 'veh-staff', 'ruenthai', 'grad-parking', 'fire', 'helmet-quiz'];
    v.appendChild(section('แบบฟอร์มของระบบที่สำรวจแล้ว', { note: 'ลิงก์ตามบัญชีระบบ · ตรวจล่าสุด 14 พ.ย. 2569' }, [el('ul', { class: 'list' }, ids.map(function (id) { return SYS[id]; }).filter(function (s) { return s && s.links.length; }).map(function (s) {
      return el('li', {}, [el('div', {}, [el('b', { text: s.name }), el('span', { text: s.desc })]), extBtn(s.links[0].label, s.links[0].url, true)]); }))]));
    v.appendChild(section('แบบฟอร์มในระบบเดิม', {}, [entryCard({ what: 'แบบฟอร์มทั่วไปของงาน (เช่น แบบบันทึกการทำความสะอาดยานพาหนะ การเติมสารถังดับเพลิง การจัดการขยะ) และรายการแบบฟอร์มดาวน์โหลด',
      source: OLD_SHEET + ' แท็บ แบบฟอร์ม (เขียนผ่าน Apps Script ของระบบเดิม)', why: 'เป็นแบบฟอร์มที่เขียนข้อมูลจริง จึงให้เปิดกรอกในระบบต้นทางเท่านั้น', menu: 'แบบฟอร์มต่างๆ › แบบฟอร์มทั่วไป' })]));
  };

  /* ---------- ตารางเวร (คำนวณจากกติกาในไฟล์ Excel — ไม่มีรายชื่อใน Repository) ---------- */
  var rosterNames = null, rosterNamesState = 'none';
  function excelSerial(y, m, d) { return Math.round(Date.UTC(y, m - 1, d) / 86400000) + 25569; }
  function rosterCodes(ro, y, m, d) { return ro.pattern[(((excelSerial(y, m, d) + ro.anchor.offset) % ro.cycleDays) + ro.cycleDays) % ro.cycleDays]; }
  function bkkNow() { var d = new Date(Date.now() + 7 * 3600000); return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours() }; }
  function shText(ro, code, mode) { var s = ro.shifts[code]; return (mode === 'time' && s.start) ? s.start + '–' + s.end : s.name; }
  PAGES.roster = function (v) {
    var ro = extra('roster');
    if (!ro) { v.appendChild(pageHead('ตารางเวรปฏิบัติงาน')); v.appendChild(el('div', { class: 'card box' }, [el('p', { class: 'kpi-na', text: 'รอการเชื่อมต่อข้อมูล' })])); return; }
    var now = bkkNow(), ym = state.rosterMonth || (now.y + '-' + ('0' + now.m).slice(-2)), Y = +ym.slice(0, 4), M = +ym.slice(5), SH = { M: '#d99a00', A: '#2f6fb0', N: '#5a4bb5', R: '#e5484d' };
    function setMonth(y, m) { if (m < 1) { y--; m = 12; } if (m > 12) { y++; m = 1; } state.rosterMonth = y + '-' + ('0' + m).slice(-2); route(true); }
    var mSel = el('select', { 'aria-label': 'เลือกเดือน' });
    for (var yy = now.y - 1; yy <= now.y + 1; yy++) for (var mm = 1; mm <= 12; mm++) { var val = yy + '-' + ('0' + mm).slice(-2); mSel.appendChild(el('option', { value: val, text: TH_MF[mm - 1] + ' ' + (yy + 543) })); }
    if (!mSel.querySelector('option[value="' + ym + '"]')) mSel.appendChild(el('option', { value: ym, text: TH_MF[M - 1] + ' ' + (Y + 543) }));
    mSel.value = ym; mSel.onchange = function () { state.rosterMonth = mSel.value; route(true); };
    var q = el('input', { type: 'search', placeholder: 'ค้นหาวันที่ หรือกะ เช่น 14 / พักกะ', 'aria-label': 'ค้นหาวันที่หรือกะ', value: state.rosterQ, style: 'min-width:260px' });
    var seg = el('div', { class: 'seg', role: 'group', 'aria-label': 'รูปแบบการแสดง' }, [['name', 'ชื่อกะ'], ['time', 'เวลาเข้า–ออก']].map(function (o) {
      return el('button', { type: 'button', 'aria-pressed': String(state.rosterMode === o[0]), text: o[1], onclick: function () { state.rosterMode = o[0]; route(true); } }); }));
    v.appendChild(pageHead('ตารางเวรปฏิบัติงาน', 'รอบเวร ' + ro.cycleDays + ' วัน ผลัด 1–4 ตามไฟล์ตารางเวร · แสดงเฉพาะผลัดและตำแหน่ง ไม่มีรายชื่อเจ้าหน้าที่', el('div', { class: 'ctrls' }, [
      el('button', { type: 'button', class: 'btn-ghost', 'aria-label': 'เดือนก่อนหน้า', text: '‹', onclick: function () { setMonth(Y, M - 1); } }), mSel,
      el('button', { type: 'button', class: 'btn-ghost', 'aria-label': 'เดือนถัดไป', text: '›', onclick: function () { setMonth(Y, M + 1); } }),
      el('button', { type: 'button', class: 'btn-ghost', text: 'วันนี้', onclick: function () { state.rosterMonth = null; state.rosterQ = ''; route(true); } }), seg])));

    // เวรวันนี้ (เวลาไทย): เวรดึกเริ่ม 23:00 ของวันนั้นและออก 07:00 ของวันถัดไป
    var today = rosterCodes(ro, now.y, now.m, now.d), yd = new Date(Date.UTC(now.y, now.m - 1, now.d) - 86400000), prevN = rosterCodes(ro, yd.getUTCFullYear(), yd.getUTCMonth() + 1, yd.getUTCDate());
    var curCode = now.h >= 23 || now.h < 7 ? 'N' : now.h >= 15 ? 'A' : 'M', onDuty = (now.h < 7 ? prevN : today).indexOf(curCode) + 1;
    v.appendChild(section('เวรวันนี้ — ' + dLabel(now.y + '-' + ('0' + now.m).slice(-2) + '-' + ('0' + now.d).slice(-2)), { note: 'ขณะนี้ (เวลาไทย) เวร' + ro.shifts[curCode].name + ' = ผลัด ' + onDuty + (now.h < 7 ? ' (เข้าเวรตั้งแต่ 23:00 น. เมื่อวาน)' : '') }, [
      el('div', { class: 'now-grid' }, ['M', 'A', 'N', 'R'].map(function (c) { var s = ro.shifts[c], team = today.indexOf(c) + 1, cur = c === curCode && now.h >= 7;
        return el('div', { class: 'card now' + (cur ? ' cur' : ''), style: '--sh:' + SH[c] }, [el('small', { text: (c === 'R' ? 'พักกะ' : 'เวร' + s.name) + (s.start ? ' ' + s.start + '–' + s.end + ' น.' : '') }), el('b', { text: 'ผลัด ' + team }),
          el('span', { text: cur ? 'กำลังปฏิบัติงาน' : c === 'R' ? 'หยุดพักตามรอบ' : c === 'N' ? 'เข้าเวร 23:00 น. คืนนี้' : '' })]); }))]));

    var head = el('tr', {}, [el('th', { text: 'วันที่' })].concat(ro.teams.map(function (t) { return el('th', {}, ['ผลัด ' + t.no, el('small', { text: t.roles.length + ' ตำแหน่ง' })]); })));
    var tb = el('tbody'), dim = new Date(Date.UTC(Y, M, 0)).getUTCDate(), shown = 0, qq = (state.rosterQ || '').trim();
    for (var d = 1; d <= dim; d++) {
      var codes = rosterCodes(ro, Y, M, d), dow = new Date(Date.UTC(Y, M - 1, d)).getUTCDay(), dateTxt = d + '/' + M + '/' + String(Y + 543).slice(2);
      var hay = [String(d), dateTxt, TH_D[dow]].concat(codes.split('').map(function (c) { return ro.shifts[c].name + ' ' + (ro.shifts[c].start || ''); })).join(' ');
      if (qq && (/^\d+$/.test(qq) ? String(d) !== String(+qq) : hay.indexOf(qq) < 0)) continue;
      shown++;
      var tr = el('tr', { class: (Y === now.y && M === now.m && d === now.d ? 'today ' : '') + (dow === 0 || dow === 6 ? 'wk' : '') }, [el('td', { text: TH_D[dow] + ' ' + dateTxt })]);
      codes.split('').forEach(function (c) { tr.appendChild(el('td', {}, [el('span', { class: 'sh sh-' + c, text: shText(ro, c, state.rosterMode) })])); });
      tb.appendChild(tr);
    }
    var tblWrap = el('div', { class: 'tbl-wrap' }, [shown ? el('table', { class: 'tbl roster' }, [el('thead', {}, [head]), tb]) : el('div', { class: 'empty', text: 'ไม่พบวันที่หรือกะที่ค้นหาในเดือนนี้' })]);
    q.oninput = function () { state.rosterQ = q.value; clearTimeout(q._t); q._t = setTimeout(function () { var pos = q.selectionStart; route(true); var n2 = document.querySelector('.view input[type=search]'); if (n2) { n2.focus(); try { n2.setSelectionRange(pos, pos); } catch (e) {} } }, 250); };
    v.appendChild(section('ตารางเวรเดือน' + TH_MF[M - 1] + ' ' + (Y + 543), { note: shown + ' วัน · แถวสีเหลือง = วันนี้' }, [el('div', { class: 'ctrls', style: 'margin-bottom:10px' }, [ic('search'), q,
      el('span', { class: 'legend', style: 'margin:0' }, ['M', 'A', 'N', 'R'].map(function (c) { var s = ro.shifts[c]; return el('span', {}, [el('i', { style: 'background:' + SH[c] }), s.name + (s.start ? ' ' + s.start + '–' + s.end : '')]); }))]), tblWrap]));

    v.appendChild(section('ตำแหน่งในแต่ละผลัด', { note: rosterNames ? 'แสดงรายชื่อจากแหล่งข้อมูลที่จำกัดสิทธิ์ (ไม่ถูกบันทึกในเครื่อง)' : 'รายชื่อไม่แสดงในรุ่นสาธารณะ' }, [el('div', { class: 'team-grid' }, ro.teams.map(function (t) {
      var names = rosterNames && rosterNames[String(t.no)] || [];
      return el('div', { class: 'card team' }, [el('h3', { text: 'ผลัด ' + t.no }), el('ul', {}, t.roles.map(function (r, i) { return el('li', {}, [el('b', { text: r }), el('span', { text: names[i] ? String(names[i].name || '') : 'ไม่แสดงชื่อ' })]); }))]); }))]));
    if (CFG.rosterApiUrl && rosterNamesState === 'none') { rosterNamesState = 'loading';
      fetch(CFG.rosterApiUrl, { credentials: 'include', cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (j) { rosterNames = j && j.teams || null; rosterNamesState = 'ok'; if (currentPage() === 'roster') route(true); }).catch(function () { rosterNamesState = 'failed'; }); }

    v.appendChild(section('ที่มาและการคุ้มครองข้อมูล', {}, [el('div', { class: 'grid2' }, [
      el('div', { class: 'card box' }, [el('h3', { text: 'กติกาที่ใช้คำนวณ' }), el('p', { class: 'def', text: 'อ่านจากไฟล์ ' + ro.sourceFile + ' — ' + ro.anchor.note + ' แล้วอ่านกะของผลัด 1–4 จากตารางรอบ ' + ro.cycleDays + ' วัน' }), notesList(ro.notes),
        el('p', { class: 'src', text: 'หน้าตารางเวรของระบบเดิมอ่านจาก ' + OLD_SHEET + ' แท็บ ตารางเวร ซึ่งลำดับเวรบางช่วงไม่ตรงกับไฟล์ Excel ฉบับนี้ ควรยืนยันฉบับที่ใช้จริงก่อนเผยแพร่' })]),
      el('div', { class: 'card box' }, [el('h3', { text: 'การแสดงรายชื่อเจ้าหน้าที่' }), el('p', { class: 'def', text: CFG.rosterApiUrl ? (rosterNamesState === 'failed' ? 'เชื่อมต่อแหล่งรายชื่อที่จำกัดสิทธิ์ไม่สำเร็จ จึงแสดงเฉพาะผลัดและตำแหน่ง' : 'ตั้งค่าแหล่งรายชื่อที่จำกัดสิทธิ์ไว้แล้ว') : 'ยังไม่เชื่อมต่อแหล่งรายชื่อ — Repository นี้เป็นสาธารณะ จึงไม่มีชื่อเจ้าหน้าที่อยู่ในไฟล์ใดของหน้ารวม' }),
        notesList(['ถ้าต้องการแสดงชื่อ ต้องให้หน้าเว็บอยู่หลังการยืนยันตัวตน (เช่น Cloudflare Access จำกัดบัญชี mahidol.ac.th) และเก็บรายชื่อในที่จัดเก็บที่จำกัดสิทธิ์ ไม่ใช่ใน Repository',
          'เมื่อพร้อม ให้ใส่ URL ของแหล่งรายชื่อใน config.js (rosterApiUrl) หน้านี้จะดึงชื่อมาแสดงเฉพาะในหน่วยความจำของเบราว์เซอร์', 'ดูขั้นตอนใน docs/PREVIEW_V3.md หัวข้อ “ตารางเวร”']),
        el('div', { class: 'btns' }, [oldUrl() ? extBtn('เปิดตารางเวรในระบบเดิม', oldUrl(), true) : null])])])]));
  };

  /* ---------- ควบคุมงาน รปภ.เอกชน: แผนกำลังพลตามจุด แยกพื้นที่ (แถบย่อยตามระบบเดิม) ---------- */
  function guardPage(v, page) {
    var gm = extra('guardManpower'), id = page.replace('guard-', ''), a = gm && gm.areas.filter(function (x) { return x.id === id; })[0];
    if (!a) { v.appendChild(pageHead('ข้อมูลกำลังพล รปภ.เอกชน')); v.appendChild(el('div', { class: 'card box' }, [el('p', { class: 'kpi-na', text: 'รอการเชื่อมต่อข้อมูล' })])); return; }
    v.appendChild(pageHead('ข้อมูลกำลังพล รปภ.เอกชน — ' + a.name, 'แผนกำลังพลตามจุดปฏิบัติงาน แยกผลัดกลางวันและกลางคืน (จำนวนคนต่อจุด ไม่มีรายชื่อ)'));
    v.appendChild(el('div', { class: 'sec' }, [kpiGrid([
      { icon: 'users', label: 'กำลังพลตามแผน (สองผลัด)', value: num(a.dayGuards + a.nightGuards), unit: 'นาย', scope: a.name, color: C.c1 },
      { icon: 'sun', label: 'ผลัดกลางวัน ' + gm.shifts.day, value: num(a.dayGuards), unit: 'นาย', sub: a.dayPosts + ' จุดปฏิบัติงาน', color: C.c2 },
      { icon: 'moon', label: 'ผลัดกลางคืน ' + gm.shifts.night, value: num(a.nightGuards), unit: 'นาย', sub: a.nightPosts + ' จุดปฏิบัติงาน', color: C.c4 },
      { icon: 'shield', label: 'รวมทุกพื้นที่', value: num(gm.totals.day + gm.totals.night), unit: 'นาย', sub: 'กลางวัน ' + gm.totals.day + ' · กลางคืน ' + gm.totals.night, color: C.c5 }])]));
    var tbl = function (rows, total) { return table(['ลำดับ', 'จุดปฏิบัติงาน', 'จำนวนคน'], rows.map(function (r, i) { return [i + 1, r[0], r[1]]; }), { num: [0, 2], foot: ['', 'รวม', total] }); };
    v.appendChild(el('div', { class: 'sec grid2' }, [el('div', {}, [el('div', { class: 'sec-h' }, [el('h2', { text: 'ผลัดกลางวัน (' + gm.shifts.day + ')' })]), tbl(a.day, a.dayGuards)]),
      el('div', {}, [el('div', { class: 'sec-h' }, [el('h2', { text: 'ผลัดกลางคืน (' + gm.shifts.night + ')' })]), tbl(a.night, a.nightGuards)])]));
    var mx = Math.max.apply(null, gm.areas.map(function (x) { return x.dayGuards + x.nightGuards; }));
    v.appendChild(section('เปรียบเทียบทุกพื้นที่', { note: 'คลิกแท่งเพื่อเปิดพื้นที่นั้น' }, [figure('กำลังพลตามแผน (สองผลัดรวมกัน)', 'หน่วย: นาย', hbars(gm.areas.map(function (x) {
      return { label: x.name, value: x.dayGuards + x.nightGuards, note: 'กลางวัน ' + x.dayGuards + ' · กลางคืน ' + x.nightGuards, color: x.id === a.id ? C.c1 : '#9fb4ad', onPick: function () { go('guard-' + x.id); } }; }), mx, { unit: 'นาย', series: 'กำลังพลตามแผน', aria: 'กำลังพลตามแผนแยกพื้นที่' }))]));
    v.appendChild(section('นิยามและที่มา', {}, [el('div', { class: 'card box' }, [el('p', { class: 'def', text: 'นิยาม: ' + gm.definition }), el('p', { class: 'src', text: 'ที่มา: ' + gm.source + ' · ตรวจอ่านเมื่อ ' + dLabel(gm.checkedAt) }), notesList(gm.notes)])]));
    v.appendChild(systemsSection(id === 'central' ? ['guard-scan', 'guard-shift', 'guard-feedback-central', 'pdf-guard'] : ['guard-scan', 'guard-shift', 'guard-feedback-unit', 'pdf-guard-monthly'], 'ระบบ รปภ.เอกชนที่เกี่ยวข้อง'));
  }
  GUARD_AREAS.forEach(function (a) { PAGES['guard-' + a[0]] = guardPage; });

  /* ---------- ตั้งค่าระบบ ---------- */
  var MOD_NAME = { incidents: 'รายงานเหตุการณ์', accidentMap: 'แผนที่จุดเกิดอุบัติเหตุ', gate: 'จำนวนรถเข้า + หมวกนิรภัย', lostfound: 'ของหาย / เก็บของได้', cctv: 'คำขอ CCTV', borrow: 'ยืม-คืนอุปกรณ์', fire: 'ถังดับเพลิง',
    guardScan: 'สแกนจุด รปภ.เอกชน', guardSatisfaction: 'แบบประเมินความพึงพอใจ รปภ. (รายเดือน)', guardFines: 'ค่าปรับ รปภ.', graduationParking: 'ลานจอดงานปริญญา', vehicleRegistration: 'ลงทะเบียนยานพาหนะ',
    ruenthai: 'แบบสำรวจลานจอดเรือนไทย', graduationGuardGps: 'รายงาน รปภ. งานปริญญา (GPS)', eventIncident: 'เหตุการณ์กิจกรรมพิเศษ', helmetQuiz: 'แบบทดสอบหมวกนิรภัย' };
  PAGES.settings = function (v) {
    v.appendChild(pageHead('ตั้งค่าระบบ', 'ค่าทั้งหมดบันทึกเฉพาะในเบราว์เซอร์ของเครื่องนี้ ไม่มีข้อมูลส่วนบุคคล และไม่ส่งออกไปที่ใด'));
    var segOf = function (label, opts, cur, fn) { return el('div', { class: 'seg', role: 'group', 'aria-label': label }, opts.map(function (o) { return el('button', { type: 'button', 'aria-pressed': String(cur === o[0]), onclick: function () { fn(o[0]); route(true); } }, [o[2] ? ic(o[2], 16) : null, ' ' + o[1]]); })); };
    var theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    var checks = el('div', { class: 'checks' }, NAV.filter(function (n) { return !n.fixed; }).map(function (n) {
      var cb = el('input', { type: 'checkbox' }); cb.checked = !hiddenCats[n.key];
      cb.onchange = function () { if (cb.checked) delete hiddenCats[n.key]; else hiddenCats[n.key] = true; store('hub.hide', JSON.stringify(Object.keys(hiddenCats))); buildNav(); markActive(); };
      return el('label', {}, [cb, n.label]); }));
    v.appendChild(el('div', { class: 'sec set-stack' }, [
      el('div', { class: 'card set' }, [el('div', {}, [el('h3', { text: 'แถบเมนูด้านซ้าย (Sidebar)' }), el('p', { text: 'ย่ออัตโนมัติ = เหลือแถบไอคอน ขยายเมื่อชี้เมาส์ โฟกัสด้วยคีย์บอร์ด หรือกดปุ่มเมนู · เปิดค้าง = แสดงชื่อเมนูตลอด (บนมือถือเป็นเมนูเลื่อนออกเสมอ)' })]),
        segOf('โหมด Sidebar', [['auto', 'ย่ออัตโนมัติ'], ['pinned', 'เปิดค้าง', 'pin']], sbMode, setSbMode)]),
      el('div', { class: 'card set' }, [el('div', {}, [el('h3', { text: 'โหมดหน้าจอ' }), el('p', { text: 'สลับระหว่างโหมดสว่างและโหมดมืด (ตามฟังก์ชันของระบบเดิม)' })]), segOf('โหมดหน้าจอ', [['light', 'สว่าง', 'sun'], ['dark', 'มืด', 'moon']], theme, setTheme)]),
      el('div', { class: 'card set' }, [el('div', {}, [el('h3', { text: 'ภาษาของระบบ' }), el('p', { text: 'รุ่นทดลองนี้มีเฉพาะภาษาไทย · ระบบเดิมสลับ TH/EN ได้ — ยังไม่ได้แปลหน้ารวมรุ่นใหม่เป็นภาษาอังกฤษ' })]), el('span', { class: 'pill s-link', text: 'ไทย (TH)' })]),
      el('div', { class: 'card set' }, [el('div', { style: 'flex-basis:100%' }, [el('h3', { text: 'หมวดที่แสดงในเมนู' }), el('p', { text: 'เอาเครื่องหมายออกเพื่อซ่อนหมวดที่ไม่ได้ใช้ (หน้าหลักและตั้งค่าระบบซ่อนไม่ได้ · หน้าที่ซ่อนยังเปิดจากลิงก์ตรงได้)' })]), checks]),
      el('div', { class: 'card set' }, [el('div', {}, [el('h3', { text: 'ล้างค่าที่บันทึกในเครื่องนี้' }), el('p', { text: 'คืนค่า Sidebar โหมดหน้าจอ และหมวดที่ซ่อน กลับเป็นค่าเริ่มต้น' })]),
        el('button', { type: 'button', class: 'btn sec', text: 'คืนค่าเริ่มต้น', onclick: function () { ['hub.sb', 'hub.hide', 'hub.theme', 'hub.mini'].forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} }); hiddenCats = {}; setTheme('light', true); setSbMode('auto'); route(true); } })])]));
    var g = DATA.stats.generatedAt || '', mods = DATA.stats.modules || {};
    v.appendChild(section('สถานะข้อมูลและเวลาอัปเดต', { note: 'ไฟล์สถิติรวมสร้างเมื่อ ' + dLabel(g.slice(0, 10) + ' ' + g.slice(11, 16)) + ' (เวลาไทย)', more: 'systems' }, [table(['ชุดข้อมูล', 'สถานะ', 'แหล่งข้อมูล', 'อัปเดตล่าสุดของต้นทาง'],
      Object.keys(MOD_NAME).filter(function (k2) { return mods[k2]; }).map(function (k2) { var m = mods[k2], st = m.status || 'connected', up = m.updated || m.computedAt || (m.central && m.central.updated);
        return [MOD_NAME[k2], el('span', { class: 'pill s-' + st, text: STATUS[st] || st }), m.source || (m.central ? m.central.source + ' / ' + m.unit.source : '–'), up ? dLabel(up) : 'ไม่มีข้อมูลยืนยัน']; }))]));
    v.appendChild(section('ผู้ช่วย AI ถามสถิติ', { more: 'ai' }, [aiStatusCard()]));
  };
  function aiStatusCard() {
    var on = !!CFG.aiApiUrl;
    return el('div', { class: 'card set' }, [el('div', {}, [el('h3', {}, ['สถานะ: ', el('span', { class: 'pill ' + (on ? 's-warn' : 's-off'), text: on ? 'ตั้งค่า Backend แล้ว (ยังไม่ได้ทดสอบ)' : 'ยังเชื่อมต่อผู้ช่วย AI ไม่ได้' })]),
      el('p', { text: 'หน้ารวมนี้ยังไม่ส่งคำถามไปยังบริการ AI ใด ๆ — ผู้ช่วย AI ของระบบเดิมยังใช้งานได้ที่ Dashboard งานจราจรและความปลอดภัย (AI)' })]),
      el('div', { class: 'btns', style: 'margin:0' }, [SYS['dashboard-ai'] ? extBtn('เปิด Dashboard AI เดิม', SYS['dashboard-ai'].links[0].url) : null, el('a', { class: 'btn sec', href: '#ai', text: 'รายละเอียด' })])]);
  }
  PAGES.ai = function (v) {
    v.appendChild(pageHead('ผู้ช่วย AI ถามสถิติ', 'สถานะการเชื่อมต่อและเงื่อนไขความปลอดภัยก่อนเปิดใช้ในหน้ารวม'));
    v.appendChild(el('div', { class: 'sec' }, [aiStatusCard()]));
    v.appendChild(section('ผลการตรวจ Endpoint ของระบบ AI เดิม', {}, [el('div', { class: 'grid2' }, [
      el('div', { class: 'card box' }, [el('h3', { text: 'สิ่งที่พบ (อ่านจากซอร์สโค้ด ไม่ได้ส่งคำถามทดสอบ)' }), notesList([
        'ระบบเดิมส่งคำถามและประวัติสนทนาไปยัง Apps Script Web App ตัวเดียวกับที่ใช้ดึงข้อมูลแดชบอร์ด โดยไม่มีการยืนยันตัวตนผู้เรียก',
        'ไม่พบ API key ของบริการ AI ในซอร์สฝั่งเว็บ (อยู่ฝั่ง Apps Script) ซึ่งถูกต้องแล้ว',
        'Web App เดียวกันนี้ส่งคืนข้อมูลรายแถวของรายงานเหตุการณ์ได้ คำตอบของ AI จึงอาจมีรายละเอียดรายบุคคลปนมา',
        'ไม่มีการจำกัดจำนวนคำถามต่อผู้ใช้ หากฝังในหน้าสาธารณะอาจถูกเรียกใช้เกินโควตา'])]),
      el('div', { class: 'card box' }, [el('h3', { text: 'เงื่อนไขก่อนเชื่อมต่อ' }), notesList([
        'ทำ Backend แยกสำหรับหน้ารวม (Apps Script ใหม่ หรือ Cloudflare Worker) ที่ป้อนให้ AI เฉพาะสถิติรวมชุดเดียวกับ data/stats.json',
        'เก็บ API key เป็นค่าลับฝั่งเซิร์ฟเวอร์ (Script Properties / Worker Secret) ไม่ใส่ในหน้าเว็บหรือ Repository',
        'จำกัดผู้ใช้ด้วยการยืนยันตัวตน (เช่น Cloudflare Access) และจำกัดจำนวนคำถาม',
        'เมื่อ Backend พร้อม ใส่ URL ใน config.js (aiApiUrl) — ตัวอย่างโค้ดอยู่ที่ proposals/ai-stats-worker.js (ยังไม่ได้ Deploy)'])])])]));
    v.appendChild(systemsSection(['dashboard-ai'], 'ระบบ AI เดิม'));
  };

  /* ======================================================================
   * รอบ 4: ส่วนสถิติเพิ่มบน Dashboard (รถราง / Anywheel / สถานะ Lost & Found / CCTV แยกหน่วย / แผนที่ย่อ)
   *         รายการ Lost & Found พร้อมรูป (เฉพาะโหมดระบบภายใน) · เหตุการณ์กิจกรรมพิเศษ · ข้อมูลระบบเพิ่มเติม
   * ==================================================================== */
  function moreFig(page, f, label) { f.appendChild(el('a', { class: 'fig-more', href: '#' + page, text: (label || 'ดูรายละเอียด') + ' →' })); return f; }
  function miniStats(items) { return el('div', { class: 'ministats' }, items.map(function (it) { return el('div', { title: it[1] }, [el('b', { text: it[0] }), el('span', { text: it[1] })]); })); }
  function helmetMonthChart(onPick) {
    var rows = mod('gate').monthly.filter(function (r) { return inRange(r.month); });
    return bars(rows.map(function (r) { return { label: mLabel(r.month) + ' (' + r.days + ' วัน)', full: mFull(r.month) + ' · ' + r.days + ' วันที่มีข้อมูล', month: r.month }; }),
      [{ name: 'ผู้ไม่สวมหมวกนิรภัย', color: C.c2, values: rows.map(function (r) { return r.noHelmet; }) }], { aria: 'ผู้ไม่สวมหมวกนิรภัยรายเดือน', unit: 'ราย', onPick: onPick });
  }
  function lfStatusChart(onPick) {
    var s = extra('lostfoundStatus'); if (!s) return el('div', { class: 'empty', text: 'ไม่มีข้อมูลยืนยัน' });
    var m = s.monthly.filter(function (r) { return inRange(r.month); }), f = function (k) { return m.map(function (r) { return r[k] || 0; }); };
    return bars(mCols(m), [{ name: 'รับของคืนแล้ว', color: C.c1, values: f('returned') }, { name: 'ช่วยหาแล้วยังไม่พบ', color: C.c2, values: f('searching') }, { name: 'เจ้าของยังไม่มารับคืน', color: C.c3, values: f('unclaimed') },
      { name: 'รอดำเนินการ', color: C.c4, values: f('waiting') }, { name: 'ไม่ระบุสถานะ', color: C.c5, values: f('blank') }], { aria: 'สถานะรายการ Lost & Found รายเดือน', unit: 'รายการ', int: true, onPick: onPick });
  }
  function cctvMonthChart(onPick) {
    var m = mod('cctv').monthly.filter(function (r) { return inRange(r.month); });
    return bars(mCols(m), [{ name: 'คำขอดูกล้อง CCTV', color: C.c2, values: m.map(function (r) { return r.count; }) }], { aria: 'คำขอ CCTV รายเดือน', unit: 'คำขอ', int: true, h: 210, onPick: onPick });
  }
  function tramRows() { var t = extra('tram'); return t ? t.monthly.filter(function (r) { return inRange(r.month); }) : []; }
  function tramChart(key, name, unit, color) {
    var m = tramRows();
    return bars(mCols(m), [{ name: name, color: color, values: m.map(function (r) { return r[key]; }) }], { aria: name + 'รายเดือน', unit: unit, int: true, h: 220 });
  }
  function tramDeptChart() {
    var t = extra('tram'), rows = t.byDept.rows, mx = Math.max.apply(null, rows.map(function (r) { return r.jobs; }));
    return hbars(rows.map(function (r, i) { return { label: r.dept, value: r.jobs, note: r.rounds + ' รอบ', color: i === 0 ? C.c3 : C.c1 }; }), mx, { unit: 'งาน', series: 'จำนวนงาน', labelW: 150, aria: 'การใช้บริการรถรางแยกตามส่วนงาน' });
  }
  function mapMini() {
    var am = mod('accidentMap'), box = el('div', { class: 'map-svg map-mini', role: 'link', tabindex: 0, 'aria-label': 'เปิดแผนที่จุดเกิดอุบัติเหตุ' });
    drawPlan(box, mapPoints(), am.box);
    box.addEventListener('click', function (e) { e.stopPropagation(); go('accident-map'); }, true);
    box.addEventListener('keydown', function (e) { if (e.key === 'Enter') go('accident-map'); });
    return box;
  }
  function dashSections(v) {
    var inc = mod('incidents'), gate = mod('gate'), lf = mod('lostfound'), cctv = mod('cctv'), vr = mod('vehicleRegistration'), gr = mod('graduationParking'), sat = mod('guardSatisfaction'), am = mod('accidentMap');
    var tram = extra('tram'), aw = extra('anywheel'), lfs = extra('lostfoundStatus'), g, wide = function (f) { f.classList.add('wide'); return f; };
    if (inc) { g = el('div', { class: 'grid2' });
      g.appendChild(moreFig('traffic', figure('เหตุการณ์รายเดือน แยกประเภท', 'หน่วย: เหตุการณ์ · ที่มา: รายงานเหตุการณ์', incidentChart(pickMonth('traffic')))));
      if (am) { var np = mapPoints().length; g.appendChild(moreFig('accident-map', figure('แผนที่จุดเกิดเหตุ', num(np) + ' จุดจากพิกัดจริงในช่วงที่เลือก · น้ำเงิน = ยานพาหนะ · ส้ม = ทั่วไป', mapMini()), 'เปิดแผนที่และรายชื่อจุด')); }
      v.appendChild(section('เหตุการณ์และอุบัติเหตุ', { note: 'คลิกแท่งเพื่อดูรายละเอียดของเดือนนั้น' }, [g])); }
    if (gate) { g = el('div', { class: 'grid2' });
      g.appendChild(moreFig('gate', figure('จำนวนรถเข้ารายเดือน', 'หน่วย: คัน · ผลรวม 5 ประตู · ไม่รวมข้อมูลทดสอบ 16–17 ก.ย.', gateMonthChart(pickMonth('gate')))));
      g.appendChild(moreFig('gate', figure('ผู้ไม่สวมหมวกนิรภัยรายเดือน', 'หน่วย: ราย · อัตรา = ผู้ไม่สวมหมวก ÷ รถจักรยานยนต์ที่เข้า', helmetMonthChart(pickMonth('gate')))));
      v.appendChild(section('รายงานจำนวนรถเข้าออกและผู้ไม่สวมหมวกนิรภัย', {}, [el('p', { class: 'flag' }, [el('span', { class: 'tag warn', text: 'มีเฉพาะจำนวนรถเข้า' }), ' ต้นทางยังไม่มีข้อมูลจำนวนรถออก จึงแสดงเฉพาะรถเข้า']), g])); }
    if (lf) { g = el('div', { class: 'grid2' });
      g.appendChild(moreFig('lostfound', figure('รายเดือน แยกประเภทรายการ', 'หน่วย: รายการ · ที่มา: แจ้งของหาย (รายการ พ.ศ. 2569)', lfChart(pickMonth('lostfound')))));
      if (lfs) { var pend = 0, ret = 0; lfs.monthly.forEach(function (r) { if (!inRange(r.month)) return; ret += r.returned; pend += r.searching + r.unclaimed + r.waiting + r.blank; });
        g.appendChild(moreFig('lostfound', figure('รายเดือน แยกสถานะ', 'รับคืนแล้ว ' + num(ret) + ' · ยังดำเนินการอยู่ ' + num(pend) + ' รายการ · ตรวจ ' + dLabel(lfs.checkedAt), lfStatusChart(pickMonth('lostfound'))))); }
      v.appendChild(section('Lost & Found — ของหาย / เก็บได้ / รับคืน', {}, [g])); }
    g = el('div', { class: 'grid2' });
    if (cctv) { var bu = cctv.byUnit || {}, units = Object.keys(bu).map(function (k2) { return [num(bu[k2]), k2]; });
      ['MLC', 'LA', 'PMH'].forEach(function (u) { if (!Object.keys(bu).some(function (k2) { return k2.toUpperCase().indexOf(u) >= 0; })) units.push(['–', u + ' (ยังไม่มีข้อมูล)']); });
      g.appendChild(moreFig('cctv', figure('คำขอดูกล้อง CCTV รายเดือน', 'หน่วย: คำขอ · ต้นทางมีเฉพาะคำขอพื้นที่ส่วนกลาง ระบบแยกหน่วย MLC/LA/PMH ยังไม่เปิดใช้', el('div', {}, [miniStats(units), cctvMonthChart(pickMonth('cctv'))])))); }
    if (vr) { var names = Object.keys(vr.rows), mx = Math.max.apply(null, names.map(function (n) { return vr.rows[n] || 0; }));
      g.appendChild(moreFig('vehicle', figure('ยานพาหนะที่ลงทะเบียน และลานจอดงานปริญญา', 'หน่วย: รายการลงทะเบียน · ลานจอด: จำนวนรถสูงสุดรายวัน (คัน)', el('div', {}, [
        hbars(names.map(function (n) { return { label: n, value: vr.rows[n], color: C.c5 }; }), mx, { unit: 'รายการ', series: 'ลงทะเบียน', labelW: 170, nullText: 'ยังเชื่อมต่อไม่ได้', aria: 'ยานพาหนะที่ลงทะเบียน' }),
        gr ? miniStats(gr.days.map(function (d) { return [num(d.latestCount), 'ลานจอดปริญญา ' + dLabel(d.date)]; })) : null])))); }
    if (g.childNodes.length) v.appendChild(section('กล้องวงจรปิด (CCTV) · ลานจอดและยานพาหนะ', {}, [g]));
    if (sat) v.appendChild(section('รปภ.เอกชนและอุปกรณ์ความปลอดภัย', {}, [el('div', { class: 'grid2' }, [wide(moreFig('report-guard', figure('ความพึงพอใจ รปภ.เอกชน รายเดือน', 'คะแนนเฉลี่ยรวม (1–5) · สองแบบประเมินแสดงแยกกัน ไม่นำมารวม', el('div', { class: 'mini-pair' }, ['central', 'unit'].map(function (src) {
      return el('div', {}, [el('h4', { text: sat[src].name }), satScoreChart(src, function (i, c) { state.satSrc = src; state.satMonth = c.month; go('report-guard'); }, null, 200)]); }))), 'ดูรายงานตรวจรับ รปภ.'))])]));
    if (tram || aw) { var kids = [];
      if (tram) { var tr = tramRows(), sum = function (k2) { return tr.reduce(function (a, r) { return a + r[k2]; }, 0); };
        kids.push(miniStats([[num(sum('jobs')), 'งานให้บริการรถราง (งาน)'], [num(sum('rounds')), 'จำนวนรอบ (รอบ)'], [num(sum('km')), 'ระยะทาง (กม.)'], [num(sum('trams')), 'รถที่ให้บริการ (คัน-ครั้ง)'], [num(sum('minutes') / 60, 1), 'ระยะเวลาให้บริการ (ชม.)']]));
        g = el('div', { class: 'grid2' });
        g.appendChild(moreFig('tram', figure('สรุปยอดเดินรถราง — จำนวนงานรายเดือน', 'หน่วย: งาน (1 งาน = 1 รายการที่บันทึก) · ข้อมูลถึง ' + dLabel(tram.updated), tramChart('jobs', 'จำนวนงาน', 'งาน', C.c3))));
        g.appendChild(moreFig('tram', figure('การใช้บริการรถรางแยกตามส่วนงาน — ' + mFull(tram.byDept.month), 'หน่วย: งาน · ตัวเลขท้ายแท่ง = จำนวนรอบ · ไม่ขึ้นกับตัวกรองเดือน', tramDeptChart())));
        kids.push(g); }
      if (aw) kids.push(el('div', { class: 'grid2' }, [moreFig('tram', figure('สรุปการใช้รถ Anywheel — จำนวนครั้งรายเดือน', 'หน่วย: ครั้ง · ยืนยันได้เฉพาะ มี.ค.–มิ.ย. 2569 (รูปแบบวันที่ในต้นทางปนกัน)', el('div', {}, [el('p', { class: 'flag' }, [el('span', { class: 'tag warn', text: 'เชื่อมต่อได้บางส่วน' }), ' ระยะทางและเวลาใช้งานยังสรุปไม่ได้']),
        (function () { var m = aw.monthly.filter(function (r) { return inRange(r.month); }); return bars(mCols(m), [{ name: 'จำนวนครั้งการใช้งาน', color: C.c1, values: m.map(function (r) { return r.trips; }) }], { unit: 'ครั้ง', int: true, h: 220, aria: 'การใช้ Anywheel รายเดือน' }); })()])))]));
      v.appendChild(section('รถรางและจักรยาน Anywheel', {}, kids)); }
  }
  PAGES.tram = function (v) {
    var t = extra('tram'), aw = extra('anywheel');
    v.appendChild(pageHead('รถรางและจักรยาน Anywheel', 'สรุปยอดเดินรถรางและการใช้จักรยาน Anywheel จากข้อมูลต้นทางของรายงานประจำเดือน', rangeCtrl()));
    if (t) { var tr = tramRows(), sum = function (k2) { return tr.reduce(function (a, r) { return a + r[k2]; }, 0); };
      v.appendChild(section('สรุปยอดเดินรถราง', { note: rangeText() + ' · ข้อมูลถึง ' + dLabel(t.updated) }, [kpiGrid([
        { icon: 'file', label: 'จำนวนงาน', value: num(sum('jobs')), unit: 'งาน', color: C.c3 }, { icon: 'chart', label: 'จำนวนรอบ', value: num(sum('rounds')), unit: 'รอบ', color: C.c1 },
        { icon: 'map', label: 'ระยะทางรวม', value: num(sum('km')), unit: 'กม.', color: C.c4 }, { icon: 'car', label: 'รถที่ให้บริการ', value: num(sum('trams')), unit: 'คัน-ครั้ง', color: C.c2 },
        { icon: 'clock', label: 'ระยะเวลาให้บริการ', value: num(sum('minutes') / 60, 1), unit: 'ชม.', color: C.c5 }])]));
      v.appendChild(el('div', { class: 'sec grid2' }, [figure('จำนวนงานรายเดือน', 'หน่วย: งาน', tramChart('jobs', 'จำนวนงาน', 'งาน', C.c3)), figure('จำนวนรอบรายเดือน', 'หน่วย: รอบ', tramChart('rounds', 'จำนวนรอบ', 'รอบ', C.c1)),
        figure('ระยะทางรายเดือน', 'หน่วย: กิโลเมตร', tramChart('km', 'ระยะทาง', 'กม.', C.c4)), figure('แยกตามส่วนงาน — ' + mFull(t.byDept.month), 'หน่วย: งาน · ท้ายแท่ง = จำนวนรอบ', tramDeptChart())]));
      v.appendChild(section('ตารางรายเดือน', {}, [table(['เดือน', 'งาน', 'รอบ', 'ระยะทาง (กม.)', 'รถ (คัน-ครั้ง)', 'เวลา (ชม.)'], tr.map(function (r) { return [mFull(r.month), r.jobs, r.rounds, r.km, r.trams, num(r.minutes / 60, 1)]; }), { num: [1, 2, 3, 4, 5] })])); }
    if (aw) v.appendChild(section('สรุปการใช้รถ Anywheel', { note: 'เชื่อมต่อได้บางส่วน' }, [el('div', { class: 'grid2' }, [figure('จำนวนครั้งการใช้งานรายเดือน', 'หน่วย: ครั้ง · มี.ค.–มิ.ย. 2569',
      bars(mCols(aw.monthly), [{ name: 'จำนวนครั้งการใช้งาน', color: C.c1, values: aw.monthly.map(function (r) { return r.trips; }) }], { unit: 'ครั้ง', int: true, h: 230 })),
      el('div', { class: 'card box' }, [el('h3', { text: 'ข้อจำกัดของข้อมูล Anywheel' }), notesList(aw.notes)])])]));
  };
  PAGE_TITLE.tram = 'รถรางและจักรยาน Anywheel';

  /* ---------- Lost & Found: รายการและรูป (ดึงสดจากระบบต้นทางเฉพาะโหมดระบบภายใน — ไม่มีข้อมูลรายการฝังในไฟล์ของหน้ารวม) ---------- */
  var lfState = { loading: false, records: null, err: '', q: '', type: 'all', page: 1 };
  function lfImg(id, sz) { return /^[A-Za-z0-9_-]{20,}$/.test(String(id || '')) ? 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(id) + '&sz=' + (sz || 'w400') : ''; }
  function lightbox(src, caption) {
    var close = function () { ov.remove(); document.removeEventListener('keydown', onKey); if (last) last.focus(); }, onKey = function (e) { if (e.key === 'Escape') close(); }, last = document.activeElement;
    var img = el('img', { alt: caption, referrerpolicy: 'no-referrer' }), msg = el('p', { text: caption });
    img.onerror = function () { img.remove(); msg.textContent = 'โหลดภาพขนาดใหญ่ไม่ได้ (อาจไม่มีสิทธิ์เปิดไฟล์นี้) — ' + caption; };
    var btn = el('button', { type: 'button', class: 'btn sec', text: 'ปิด', onclick: close });
    var ov = el('div', { class: 'lightbox', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'ภาพขยาย: ' + caption, onclick: function (e) { if (e.target === ov) close(); } }, [el('div', { class: 'lb-in' }, [img, msg, btn])]);
    img.src = src; document.body.appendChild(ov); document.addEventListener('keydown', onKey); btn.focus();
  }
  function renderLfList() {
    var box = $('lfList'); if (!box) return; box.textContent = '';
    var srcBtn = SYS.lostfound && SYS.lostfound.links[0] ? extBtn('เปิดระบบ Lost & Found ต้นทาง', SYS.lostfound.links[0].url, true) : null;
    if (!CFG.internalMode || !CFG.lostfoundApiUrl) { box.appendChild(el('div', { class: 'card entry' }, [el('h3', { text: 'รายการ ชื่อ และรูปภาพ แสดงเฉพาะในระบบภายใน' }),
      el('p', { text: 'รุ่นที่เปิดอยู่นี้เป็นรุ่นที่ไม่มีการยืนยันตัวตน จึงแสดงเฉพาะสถิติรวม เมื่อเปิดผ่านระบบภายในที่ยืนยันตัวตนแล้ว ส่วนนี้จะดึงรายการและรูปจากระบบ Lost & Found โดยตรง (ไม่มีข้อมูลรายการเก็บไว้ในไฟล์ของหน้ารวม)' }), el('div', { class: 'btns' }, [srcBtn])])); return; }
    if (!lfState.records && !lfState.loading && !lfState.err) { lfState.loading = true;
      fetch(CFG.lostfoundApiUrl + '?action=getPublicData&t=' + Date.now(), { credentials: 'omit', cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (j) { if (!j || j.success !== true || !Array.isArray(j.records)) throw new Error('รูปแบบข้อมูลตอบกลับไม่ถูกต้อง'); lfState.records = j.records; })
        .catch(function (e) { lfState.err = String(e && e.message || e); }).then(function () { lfState.loading = false; renderLfList(); }); }
    if (lfState.loading) { box.appendChild(el('div', { class: 'empty', role: 'status', text: 'กำลังโหลดรายการจากระบบ Lost & Found…' })); return; }
    if (lfState.err) { box.appendChild(el('div', { class: 'map-warn', role: 'alert' }, [el('b', { text: 'โหลดรายการไม่สำเร็จ: ' + lfState.err }), el('span', { class: 'btns' }, [el('button', { type: 'button', class: 'btn sec', text: 'ลองใหม่', onclick: function () { lfState.err = ''; renderLfList(); } }), srcBtn])])); return; }
    var all = lfState.records, cnt = function (t) { return all.filter(function (r) { return r.type === t; }).length; }, q = lfState.q.trim().toLowerCase();
    var rows = all.filter(function (r) { return (lfState.type === 'all' || r.type === lfState.type) && (!q || [r.title, r.location, r.status, r.actionText, r.name].join(' ').toLowerCase().indexOf(q) >= 0); });
    var per = 20, pages = Math.max(1, Math.ceil(rows.length / per)); if (lfState.page > pages) lfState.page = pages;
    var inp = el('input', { type: 'search', placeholder: 'ค้นหาชื่อสิ่งของ สถานที่ สถานะ…', 'aria-label': 'ค้นหารายการ', value: lfState.q, style: 'min-width:240px' });
    inp.oninput = function () { lfState.q = inp.value; lfState.page = 1; clearTimeout(inp._t); inp._t = setTimeout(function () { var p = inp.selectionStart; renderLfList(); var n = document.querySelector('#lfList input[type=search]'); if (n) { n.focus(); try { n.setSelectionRange(p, p); } catch (e) {} } }, 250); };
    box.appendChild(el('div', { class: 'ctrls', style: 'margin-bottom:10px' }, [['all', 'ทั้งหมด', all.length], ['สิ่งของสูญหาย', 'แจ้งหาย', cnt('สิ่งของสูญหาย')], ['พบสิ่งของ', 'เก็บของได้', cnt('พบสิ่งของ')], ['รับของคืน', 'รับคืน', cnt('รับของคืน')]].map(function (o) {
      return el('button', { type: 'button', class: 'chip', 'aria-pressed': String(lfState.type === o[0]), text: o[1] + ' ' + num(o[2]), onclick: function () { lfState.type = o[0]; lfState.page = 1; renderLfList(); } }); }).concat([inp, srcBtn])));
    if (!rows.length) { box.appendChild(el('div', { class: 'empty', text: 'ไม่พบรายการตามเงื่อนไข' })); return; }
    box.appendChild(el('div', { class: 'lf-grid' }, rows.slice((lfState.page - 1) * per, lfState.page * per).map(function (r) {
      var id = (r.images || [])[0], thumb = lfImg(id), pic;
      if (thumb) { var im = el('img', { alt: 'ภาพ: ' + (r.title || ''), loading: 'lazy', referrerpolicy: 'no-referrer' }); pic = el('button', { type: 'button', class: 'lf-pic', 'aria-label': 'ขยายภาพ ' + (r.title || ''), onclick: function () { lightbox(lfImg(id, 'w1600'), r.title || ''); } }, [im]);
        im.onerror = function () { pic.replaceWith(el('div', { class: 'lf-pic none', text: 'โหลดภาพไม่ได้ (ไม่มีสิทธิ์เปิดไฟล์หรือไฟล์ถูกย้าย)' })); }; im.src = thumb; }
      else pic = el('div', { class: 'lf-pic none', text: 'ไม่มีภาพประกอบ' });
      var d = r.reportedAt ? new Date(r.reportedAt) : null, when = d && !isNaN(d) ? d.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'medium', timeStyle: 'short' }) + ' น.' : '';
      return el('article', { class: 'card lf-item' }, [pic, el('div', { class: 'lf-body' }, [el('span', { class: 'pill ' + (r.type === 'สิ่งของสูญหาย' ? 's-blocked' : r.type === 'พบสิ่งของ' ? 's-connected' : 's-link'), text: r.type || '' }),
        el('h3', { text: r.title || '(ไม่ระบุชื่อสิ่งของ)' }), el('p', { text: r.location || 'ไม่ระบุสถานที่' }), el('p', { class: 'src', text: when }), r.name ? el('p', { class: 'src', text: 'ผู้แจ้ง: ' + r.name }) : null,
        el('p', { class: 'lf-st', text: r.actionText || r.status || 'รอดำเนินการ' })])]); })));
    box.appendChild(el('div', { class: 'ctrls', style: 'margin-top:12px;justify-content:center' }, [el('button', { type: 'button', class: 'btn-ghost', text: '‹ ก่อนหน้า', disabled: lfState.page <= 1 ? 'disabled' : null, onclick: function () { lfState.page--; renderLfList(); } }),
      el('span', { text: 'หน้า ' + lfState.page + ' / ' + pages + ' · ' + num(rows.length) + ' รายการ' }), el('button', { type: 'button', class: 'btn-ghost', text: 'ถัดไป ›', disabled: lfState.page >= pages ? 'disabled' : null, onclick: function () { lfState.page++; renderLfList(); } })]));
  }

  /* ---------- เหตุการณ์กิจกรรมพิเศษ · แบบทดสอบหมวกนิรภัย · ข้อมูลระบบเพิ่มเติม ---------- */
  PAGES['event-incident'] = function (v) {
    var e = extra('eventIncidents');
    v.appendChild(pageHead('ระบบเหตุการณ์กิจกรรมพิเศษ', 'สรุปรายงานเหตุการณ์ช่วงกิจกรรมพิเศษ — เฉพาะจำนวนรวม ไม่มีชื่อผู้รายงานหรือรายละเอียดรายครั้ง'));
    if (!e) { v.appendChild(el('div', { class: 'card box' }, [el('p', { class: 'kpi-na', text: 'ยังเชื่อมต่อไม่ได้' })])); }
    else { var lv = e.levels.map(function (_, i) { return e.byType.reduce(function (a, t) { return a + t.counts[i]; }, 0); }), col = [C.fine, C.c2, C.c1];
      v.appendChild(el('div', { class: 'sec' }, [kpiGrid([{ icon: 'alert', label: 'รายงานทั้งหมด', value: num(e.total), unit: 'รายการ', sub: dLabel(e.from) + ' – ' + dLabel(e.to), color: C.c3 }].concat(e.levels.map(function (n, i) { return { icon: i === 2 ? 'check' : 'alert', label: n, value: num(lv[i]), unit: 'รายการ', color: col[i] }; })))]));
      v.appendChild(el('div', { class: 'sec grid2' }, [figure('จำนวนรายงานแยกประเภทเหตุการณ์', 'หน่วย: รายการ · แยกสีตามระดับเหตุการณ์ · ตรวจ ' + dLabel(e.checkedAt),
        bars(e.byType.map(function (t) { return { label: t.type, full: t.type }; }), e.levels.map(function (n, i) { return { name: n, color: col[i], values: e.byType.map(function (t) { return t.counts[i]; }) }; }), { unit: 'รายการ', int: true, h: 260, aria: 'รายงานกิจกรรมพิเศษแยกประเภท' }))])); }
    v.appendChild(systemsSection(['event-incident'], 'ระบบต้นทาง (เปิดเมื่อต้องรายงานเหตุการณ์จริง)'));
  };
  PAGES['helmet-quiz'] = function (v) {
    var s = SYS['helmet-quiz'];
    v.appendChild(pageHead('แบบทดสอบโครงการรณรงค์สวมหมวกนิรภัย 100%', 'แบบทดสอบความรู้เรื่องหมวกนิรภัย — เป็นแบบทดสอบที่ไม่มีการเก็บผลลง Sheet จึงไม่มีสถิติผู้ทำแบบทดสอบ'));
    v.appendChild(el('div', { class: 'sec' }, [el('div', { class: 'card entry' }, [el('h3', { text: 'ทำแบบทดสอบ' }), el('p', { text: 'กดปุ่มด้านล่างเพื่อเปิดหน้าแบบทดสอบ (เปิดในแท็บใหม่) ผลคะแนนแสดงให้ผู้ทำเห็นทันทีและไม่ถูกบันทึกไว้ในระบบใด' }),
      el('div', { class: 'btns' }, [s && s.links[0] ? extBtn('กดเพื่อทำแบบทดสอบ', s.links[0].url) : el('span', { class: 'kpi-na', text: 'ไม่มีลิงก์ที่ยืนยันได้' })])])]));
  };
  /* รายงาน รปภ. งานปริญญา (GPS): เฉพาะจำนวนรวมตามวันและสถานะพิกัด — ไม่มีชื่อ พิกัดรายรายงาน รูป หรือเส้นทางบุคคล และแยกจากแผนที่อุบัติเหตุ */
  PAGES['grad-guard'] = function (v) {
    var gps = extra('gradGuardGps'), K = ['within', 'outside', 'postNoCoords', 'lowAccuracy'], col = [C.c1, C.c2, C.c5, C.fine];
    v.appendChild(pageHead('รายงาน รปภ. งานปริญญา (GPS)', 'สรุปรายงานการปฏิบัติงาน รปภ.เอกชน ช่วงพิธีพระราชทานปริญญาบัตร ปีการศึกษา 2568 — จำนวนรายงานตามวันและสถานะพิกัดเทียบจุดปฏิบัติงาน'));
    if (!gps) { v.appendChild(el('div', { class: 'card box' }, [el('p', { class: 'kpi-na', text: 'ยังเชื่อมต่อไม่ได้' })])); return; }
    var sum = function (k2, days) { return (days || gps.days).reduce(function (a, d) { return a + d[k2]; }, 0); }, ev = gps.days.filter(function (d) { return gps.eventDays.indexOf(d.date) >= 0; });
    v.appendChild(el('div', { class: 'sec' }, [kpiGrid([
      { icon: 'file', label: 'รายงานทั้งหมด', value: num(gps.total), unit: 'รายงาน', sub: dLabel(gps.days[0].date) + ' – ' + dLabel(gps.updated), color: C.c3 },
      { icon: 'cap', label: 'รายงานในวันพิธี (3, 5, 6 ต.ค.)', value: num(sum('total', ev)), unit: 'รายงาน', sub: ev.map(function (d) { return d.total; }).join(' / ') + ' รายงาน', color: C.c1 },
      { icon: 'check', label: 'อยู่ในรัศมีจุดปฏิบัติงาน', value: num(sum('within')), unit: 'รายงาน', sub: (100 * sum('within') / gps.total).toFixed(1) + '% ของรายงานทั้งหมด', color: C.c1 },
      { icon: 'alert', label: 'อยู่นอกรัศมี', value: num(sum('outside')), unit: 'รายงาน', sub: 'ความแม่นยำ GPS ต่ำ ' + sum('lowAccuracy') + ' รายงาน', color: C.c2 },
      { icon: 'map', label: 'จุดปฏิบัติงานยังไม่มีพิกัดอ้างอิง', value: num(sum('postNoCoords')), unit: 'รายงาน', sub: 'คำนวณระยะจากจุดไม่ได้', color: C.c5 }])]));
    v.appendChild(el('div', { class: 'sec grid2' }, [
      figure('จำนวนรายงานตามวัน แยกสถานะพิกัด', 'หน่วย: รายงาน · ที่มา: แท็บ Reports (Report_Date, Geo_Status) · ตรวจ ' + dLabel(gps.checkedAt),
        bars(gps.days.map(function (d) { return { label: (+d.date.slice(8)) + ' ' + TH_M[+d.date.slice(5, 7) - 1], full: dLabel(d.date) + (gps.eventDays.indexOf(d.date) >= 0 ? ' (วันพิธี)' : ' (ก่อนวันพิธี)') }; }),
          K.map(function (k2, i) { return { name: gps.statusNames[k2].split(' — ')[1], color: col[i], values: gps.days.map(function (d) { return d[k2]; }) }; }), { unit: 'รายงาน', int: true, h: 270, aria: 'รายงาน รปภ. งานปริญญาตามวัน' })),
      el('div', { class: 'card box' }, [el('h3', { text: 'ผลตรวจพิกัดของรายงาน' }), miniStats([[num(gps.coords.numeric), 'มีพิกัดเป็นตัวเลขครบ'], [num(gps.coords.missingOrInvalid), 'ไม่มี/ผิดรูปแบบ'], [num(gps.coords.inCampusBox), 'อยู่ในกรอบวิทยาเขต'], [num(gps.coords.outsideCampusBox), 'อยู่นอกกรอบวิทยาเขต']]),
        el('p', { class: 'src', text: 'กรอบวิทยาเขต: ' + gps.coords.box + ' · นอกกรอบ: ' + gps.coords.outsideDetail }),
        el('p', { class: 'def', text: 'หน้านี้ไม่แสดงแผนที่หรือพิกัดรายรายงาน เพราะเป็นข้อมูลตำแหน่งของบุคคล — รายละเอียดรายรายงานและรูปอยู่ในระบบต้นทางที่จำกัดผู้ใช้ และข้อมูลนี้ไม่ถูกนำไปปนกับแผนที่จุดเกิดอุบัติเหตุ' })])]));
    v.appendChild(section('ตารางรายวัน', {}, [table(['วันที่', 'รายงาน', 'ในรัศมี', 'นอกรัศมี', 'จุดไม่มีพิกัดอ้างอิง', 'ความแม่นยำต่ำ'], gps.days.map(function (d) { return [dLabel(d.date), d.total, d.within, d.outside, d.postNoCoords, d.lowAccuracy]; }),
      { num: [1, 2, 3, 4, 5], foot: ['รวม', gps.total, sum('within'), sum('outside'), sum('postNoCoords'), sum('lowAccuracy')] })]));
    v.appendChild(section('นิยามและข้อสังเกต', {}, [el('div', { class: 'card box' }, [notesList(K.map(function (k2) { return gps.statusNames[k2]; }).concat(gps.notes))])]));
    v.appendChild(systemsSection(['grad-guard-report'], 'ระบบต้นทาง (เปิดเมื่อต้องส่งหรือดูรายงานรายรายการ)'));
  };
  PAGES['admin-info'] = function (v) {
    var mods = DATA.stats.modules || {}, ex = DATA.extra || {}, g = DATA.stats.generatedAt || '', row = function (name, m) { var st = m.status === 'ok' ? 'connected' : (m.status || 'connected'); return [name, el('span', { class: 'pill s-' + st, text: STATUS[st] || st }), m.source || '–', dLabel(m.updated || m.checkedAt || m.computedAt || '') || '–']; };
    v.appendChild(pageHead('ข้อมูลระบบเพิ่มเติม', 'สำหรับผู้ดูแลระบบ: แหล่งข้อมูล เวลาอัปเดต ข้อจำกัด และระบบที่ยังเชื่อมต่อไม่ได้ — ฉบับเต็มอยู่ในไฟล์ docs/ข้อมูลระบบเพิ่มเติม.md'));
    v.appendChild(section('แหล่งข้อมูลของสถิติแต่ละชุด', { note: 'ไฟล์สถิติหลัก ' + dLabel(g.slice(0, 10) + ' ' + g.slice(11, 16)) + ' · ข้อมูลเสริม ' + dLabel((ex.generatedAt || '').slice(0, 10) + ' ' + (ex.generatedAt || '').slice(11, 16)) + ' (เวลาไทย)' }, [table(['ชุดข้อมูล', 'สถานะ', 'แหล่งข้อมูล', 'ข้อมูลล่าสุด/ตรวจเมื่อ'],
      Object.keys(MOD_NAME).filter(function (k2) { return mods[k2]; }).map(function (k2) { var m = mods[k2]; return row(MOD_NAME[k2], m.source ? m : { status: m.status, source: m.central ? m.central.source + ' / ' + m.unit.source : '', updated: m.updated || m.computedAt || (m.central && m.central.updated) }); })
        .concat([['รถราง', ex.tram], ['จักรยาน Anywheel', ex.anywheel], ['สถานะ Lost & Found รายเดือน', ex.lostfoundStatus], ['เหตุการณ์กิจกรรมพิเศษ', ex.eventIncidents], ['รายงาน รปภ. งานปริญญา (GPS)', ex.gradGuardGps], ['แผนกำลังพล รปภ.เอกชน', ex.guardManpower]].filter(function (x) { return x[1]; }).map(function (x) { return row(x[0], x[1]); })))]));
    var pend = ex.pending || {};
    v.appendChild(section('Sheet ที่เปิดอ่านได้แล้วแต่ยังไม่ได้สรุปสถิติ', {}, [el('ul', { class: 'list' }, Object.keys(pend).map(function (k2) { var p = pend[k2]; return el('li', {}, [el('div', {}, [el('b', { text: p.name + ' — แท็บ ' + p.tab }), el('span', { text: p.state + ' · สิ่งที่ต้องทำ: ' + p.action })])]); }))]));
    v.appendChild(section('ข้อจำกัดที่ควรทราบ', {}, [el('div', { class: 'card box' }, [notesList([
      'รถเข้า: ต้นทาง (แท็บ จำนวนรถเข้า+หมวกนิรภัย) มีเฉพาะจำนวนรถเข้า 5 ประตู ไม่มีจำนวนรถออก',
      'แผนที่: ไทล์ OpenStreetMap ต้องมี Referer ของเว็บไซต์ เมื่อเปิดจากไฟล์ในเครื่อง (file://) จะถูกปฏิเสธ หน้ารวมจึงใช้แผนผังจากพิกัดจริงแทน และจะใช้แผนที่พื้นหลังเฉพาะเมื่อเปิดผ่าน https และตรวจแล้วว่าไทล์โหลดได้',
      'Lost & Found: รายการและรูปดึงสดจากระบบต้นทางเฉพาะเมื่อเปิดโหมดระบบภายใน (config.js: internalMode + lostfoundApiUrl) ซึ่งต้องอยู่หลังระบบยืนยันตัวตน',
      'ผู้ช่วย AI: ยังเชื่อมต่อไม่ได้ เพราะ Endpoint เดิมไม่มีการยืนยันตัวตนและตอบจากข้อมูลรายแถว',
      'Anywheel: รูปแบบวันที่ในต้นทางปนกัน ยืนยันได้เฉพาะ มี.ค.–มิ.ย. 2569'])])]));
  };
  PAGE_TITLE['admin-info'] = 'ข้อมูลระบบเพิ่มเติม';

  /* ---------- เริ่มทำงาน ---------- */
  function renderStamp() {
    var g = DATA.stats.generatedAt || '', s = $('stamp'); s.textContent = '';
    s.appendChild(el('b', { text: 'ข้อมูล ณ ' + dLabel(g.slice(0, 10) + ' ' + g.slice(11, 16)) })); s.appendChild(el('br'));
    s.appendChild(document.createTextNode(liveMode ? 'อ่านสดจาก Stats API (ยอดรวม)' : 'ไฟล์สถิติรวม · เวลาไทย'));
  }
  function collectMonths() {
    var set = {}; ['incidents', 'gate', 'lostfound', 'cctv'].forEach(function (k) { ((mod(k) || {}).monthly || []).forEach(function (r) { set[r.month] = 1; }); });
    MONTHS = Object.keys(set).sort(); state.from = MONTHS[0]; state.to = MONTHS[MONTHS.length - 1];
  }
  setupShell();
  load().then(function (d) {
    DATA = d; DATA.systems.categories.forEach(function (c) { c.systems.forEach(function (s) { SYS[s.id] = s; }); });
    collectMonths(); renderStamp(); route(true);
    window.addEventListener('hashchange', function () { route(false); });
  }).catch(function (e) {
    $('stamp').textContent = 'โหลดข้อมูลไม่สำเร็จ';
    showBanner('ยังเชื่อมต่อไฟล์สถิติรวมไม่ได้: ' + e.message + ' — หน้านี้จะไม่แสดงตัวเลขใด ๆ จนกว่าจะโหลดข้อมูลจริงได้');
  });
})();
