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
  var GPS_TITLE = 'รายงาน รปภ.ปริญญา (GPS) ปีการศึกษา 2568';   // ปีการศึกษา 2568 (พิธีจัดเดือน ต.ค. 2569) — ใช้ชื่อเดียวกันทั้งเมนู หัวข้อ breadcrumb การ์ด และลิงก์
  var NAV = [
    { id: 'dashboard', label: 'หน้าหลัก / Dashboard', icon: 'home', fixed: true },
    { group: 'g-staff', label: 'บุคลากร/พนักงาน', icon: 'users', children: [
      { id: 'staff', label: 'บุคลากรทั้งหมด' }, { id: 'staff-strategy', label: 'หน่วยยุทธศาสตร์ฯ' }, { id: 'staff-ops', label: 'หน่วยปฏิบัติการฯ' }] },
    { group: 'g-area', label: 'การดูแลพื้นที่ส่วนกลาง', icon: 'map', children: [
      { id: 'area-inspect', label: 'ตรวจพื้นที่' }, { id: 'area-assist', label: 'ให้ความช่วยเหลือ' }, { id: 'area-traffic', label: 'งานจราจร' }, { id: 'roster', label: 'ตารางเวร' }] },
    { group: 'g-vehicle', label: 'ยานพาหนะและลานจอดรถ', icon: 'car', children: [
      { id: 'vehicle-fleet', label: 'ยานพาหนะทั้งหมด' }, { id: 'parking', label: 'ข้อมูลการจอดรถ' }, { id: 'vehicle', label: 'ระบบลงทะเบียนยานพาหนะ' }, { id: 'tram', label: 'รถรางและจักรยาน Anywheel' }] },
    { group: 'g-traffic', label: 'การจัดการจราจรและแจ้งเหตุ', icon: 'alert', children: [
      { id: 'traffic', label: 'ระบบรายงานเหตุการณ์' }, { id: 'accident-map', label: 'แผนที่จุดเกิดอุบัติเหตุ' }, { id: 'gate', label: 'รายงานจำนวนรถเข้าและผู้ไม่สวมหมวกนิรภัย' },
      { id: 'event-incident', label: 'เหตุการณ์กิจกรรมพิเศษ' }, { id: 'helmet-quiz', label: 'แบบทดสอบรณรงค์สวมหมวกนิรภัย' }] },
    { id: 'cctv', label: 'กล้องวงจรปิด (CCTV)', icon: 'camera' },
    { group: 'g-grad', label: 'พิธีพระราชทานปริญญาบัตร', icon: 'cap', children: [{ id: 'graduation', label: 'ปีการศึกษา 2568 (ล่าสุด)', children: [{ id: 'grad-2568-gps', label: GPS_TITLE }] }] },
    { group: 'g-guard', label: 'ควบคุมงาน รปภ.เอกชน', icon: 'shield', children: GUARD_AREAS.map(function (a) { return { id: 'guard-' + a[0], label: a[1] }; }).concat([
      { id: 'guard-scan', label: 'การสแกนจุดและรายงานปฏิบัติงาน' }]) },
    { id: 'borrow', label: 'ยืม-คืนอุปกรณ์และรถกอล์ฟ', icon: 'box' },
    { id: 'lostfound', label: 'แจ้งของหาย / เก็บของได้', icon: 'search' },
    { group: 'g-safety', label: 'อุปกรณ์ความปลอดภัยและเหตุฉุกเฉิน', icon: 'heart', children: [{ id: 'safety', label: 'อุปกรณ์ดับเพลิง' }, { id: 'aed', label: 'เครื่อง AED' }] },
    { group: 'g-forms', label: 'แบบฟอร์มต่างๆ', icon: 'form', children: [{ id: 'forms', label: 'แบบฟอร์มทั่วไป' }, { id: 'forms-radio', label: 'บันทึกศูนย์วิทยุสื่อสาร' }] },
    { group: 'g-reports', label: 'รายงานและสถิติ', icon: 'chart', children: [
      { id: 'report-daily', label: 'รายงานประจำวัน' }, { id: 'report-radio', label: 'รายงานวิทยุสื่อสาร' }, { id: 'report-monthly', label: 'รายงานประจำเดือน' },
      { id: 'report-guard', label: 'รายงานตรวจรับ รปภ.' }, { id: 'reports', label: 'ระบบสร้างเอกสาร PDF' }] },
    { id: 'inspection-history', label: 'ประวัติการตรวจสภาพ', icon: 'print' },
    { group: 'g-settings', label: 'ตั้งค่าระบบ', icon: 'gear', fixed: true, children: [{ id: 'settings', label: 'ตั้งค่าการแสดงผล' }, { id: 'systems', label: 'สถานะระบบและการเชื่อมต่อ' }, { id: 'ai', label: 'ผู้ช่วย AI ถามสถิติ' }, { id: 'admin-info', label: 'ข้อมูลระบบเพิ่มเติม' }] }
  ];
  var ALIAS = { 'guard-satisfaction': 'report-guard', 'guard-fines': 'report-guard', 'guard': 'guard-central', 'grad-guard': 'grad-2568-gps' };   // ลิงก์รุ่นก่อนยังเปิดได้
  var PAGE_TITLE = {}, PAGE_GROUP = {}, PAGE_PARENT = {};      // PAGE_PARENT: หน้าระดับที่ 3 (เช่น GPS ใต้ ปีการศึกษา 2568)
  NAV.forEach(function (n) { n.key = n.id || n.group; if (n.id) PAGE_TITLE[n.id] = n.label; (n.children || []).forEach(function (c) { PAGE_TITLE[c.id] = c.label; PAGE_GROUP[c.id] = n; (c.children || []).forEach(function (g) { PAGE_TITLE[g.id] = g.label; PAGE_GROUP[g.id] = n; PAGE_PARENT[g.id] = c; }); }); });
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
  /* จำนวนตามสถานะ: ชุดสถานะอ่านครบแล้วแต่ไม่มีสถานะนั้น = 0 · ไม่มีชุดสถานะเลย (อ่านไม่ได้/รูปแบบผิด) = “ยังยืนยันไม่ได้” — ไม่ปล่อย undefined ออกหน้า */
  function stCount(map, k) { return map && typeof map === 'object' ? num(map[k] || 0) : 'ยังยืนยันไม่ได้'; }
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
      n.children.forEach(function (c) { sub.appendChild(el('li', {}, [navLink(c.id, c.label), c.children ? el('ul', { class: 'sub3' }, c.children.map(function (g) { return el('li', {}, [navLink(g.id, g.label)]); })) : null])); });
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
  /* ลิงก์ตรงถึงหมวดในหน้า: #dashboard/lostfound = หน้า dashboard เลื่อนไปที่หมวด lostfound */
  function hashParts() { var h = (location.hash || '').replace('#', ''), q = h.indexOf('?'); if (q >= 0) h = h.slice(0, q); try { h = decodeURIComponent(h); } catch (e) { h = ''; } var i = h.indexOf('/'); return i < 0 ? [h, ''] : [h.slice(0, i), h.slice(i + 1)]; }
  function currentPage() { var h = hashParts()[0]; h = ALIAS[h] || h; return PAGES[h] ? h : 'dashboard'; }
  function go(page) { if (currentPage() === page) route(true); else location.hash = '#' + page; }
  var routeN = 0;
  function route(first) {
    if (AUTH.on && !AUTH.user) return;          /* ยังไม่ผ่าน Login กลาง: ไม่วาดหน้าและไม่เรียกข้อมูลใด ๆ */
    var page = currentPage(), grp = PAGE_GROUP[page]; routeN++; state.renderDay = todayStr();
    state.rerender = state.curPage === page; state.curPage = page;
    if (MONTHS.length && page !== 'dashboard' && page !== 'report-monthly') scopeRange('all', { from: MONTHS[0], to: MONTHS[MONTHS.length - 1] });
    if (!first || !Object.keys(openGroups).length) openGroups = {};     // เปลี่ยนหน้า = เปิดเฉพาะหมวดของหน้าปัจจุบัน (เมนูไม่ยาวเกิน)
    if (grp) openGroups[grp.group] = true;
    buildNav(); markActive(); tipHide();
    var crumb = $('crumb'); crumb.textContent = '';
    if (grp) crumb.appendChild(el('span', { class: 'crumb-g', text: grp.label + ' › ' + (PAGE_PARENT[page] ? PAGE_PARENT[page].label.replace(/\s*\(ล่าสุด\)$/, '') + ' › ' : '') }));
    crumb.appendChild(document.createTextNode(PAGE_TITLE[page] || ''));
    document.title = (page === 'dashboard' ? '' : (PAGE_TITLE[page] + ' · ')) + SYS_NAME;
    var view = $('view'), keepY = state.rerender && first === true ? window.pageYOffset : null; dropObs(); if (!state.rerender) { state.folds = {}; state.pageSeq = (state.pageSeq || 0) + 1; }
    view.textContent = '';
    try { PAGES[page](view, page); var tb = grp && !view.querySelector('.tabs') ? tabsOf(grp.group, page) : null, ph = view.querySelector('.ph'); if (tb && ph) ph.parentNode.insertBefore(tb, ph.nextSibling); } catch (e) { view.appendChild(el('div', { class: 'card box' }, [el('strong', { text: 'แสดงหน้านี้ไม่สำเร็จ' }), el('p', { text: String(e && e.message || e) })])); if (window.console) console.error(e); }
    try { layoutCtl(view); } catch (e2) {}
    var anc = hashParts()[1], target = anc ? $('sec-' + anc) : null;
    if (target) setTimeout(function () { target.scrollIntoView(); }, 80);
    else if (!first) { window.scrollTo(0, 0); view.focus({ preventScroll: true }); }
    else if (keepY != null && keepY > 0) { window.scrollTo(0, keepY); setTimeout(function () { if (Math.abs(window.pageYOffset - keepY) > 4) window.scrollTo(0, keepY); }, 60); }   /* วาดซ้ำหน้าเดิม (ข้อมูลสดมาใหม่/เปลี่ยนตัวเลือก): คงตำแหน่งเลื่อน */
  }

  /* รอบ 12 — การจัดวางกราฟบนหน้า (คนละเรื่องกับรูปแบบกราฟ): ตารางการ์ด / เรียงลงแนวตั้งเต็มความกว้าง · จำค่าในเครื่อง · จอแคบเรียงลงอยู่แล้วจึงไม่แสดงตัวเลือก */
  function chartLayout() { return store('hub.chartLayout') === 'stack' ? 'stack' : 'grid'; }
  function applyChartLayout() { document.body.classList.toggle('charts-stack', chartLayout() === 'stack'); }
  function layoutCtl(view) {
    applyChartLayout();
    if (view.querySelectorAll('.grid2 > .chart, .trends > .trend').length < 2) return;
    var host = view.querySelector('.ph, .dash-head'); if (!host) return;
    var cur = chartLayout(), mk = function (v, t) { return el('button', { type: 'button', 'aria-pressed': String(cur === v), text: t, onclick: function () { store('hub.chartLayout', v); route(true); } }); };
    host.parentNode.insertBefore(el('div', { class: 'layout-ctl', role: 'group', 'aria-label': 'การจัดวางกราฟ' }, [el('span', { text: 'จัดวางกราฟ' }), mk('grid', 'ตารางการ์ด'), mk('stack', 'เรียงลงแนวตั้ง')]), host.nextSibling);
  }

  /* ---------- ชิ้นส่วนหน้า ---------- */
  function pageHead(title, desc, ctrls) {
    return el('div', { class: 'ph' }, [el('div', {}, [el('h1', { text: title }), desc ? el('p', { text: desc }) : null]), ctrls || null]);
  }
  var FOLD_TITLE = /ข้อสังเกต|ข้อจำกัดที่ควรทราบ|ที่มาของข้อมูลและการคุ้มครอง|แบบฟอร์มของระบบอื่นที่เกี่ยวข้อง/;      /* หัวข้อรายละเอียดประกอบที่เริ่มแบบยุบทุกหน้า */
  function section(title, opts, kids) {
    opts = opts || {};
    kids = (kids || []).filter(function (k) { return k && !(k.classList && k.classList.contains('grid2') && !k.childNodes.length); });
    if (!kids.length) return document.createDocumentFragment();
    if (opts.fold || FOLD_TITLE.test(title)) { var nLi = 0; kids.forEach(function (k) { if (k.querySelectorAll) nLi += k.querySelectorAll('li').length; });
      return foldSection(title, { count: opts.count || (nLi ? nLi + ' ข้อ' : opts.note || null), status: opts.status }, kids.concat(opts.more ? [el('p', {}, [el('a', { class: 'more', href: '#' + opts.more, text: 'ดูรายละเอียด →' })])] : [])); }
    if (title === 'นิยามและที่มา') return el('details', { class: 'sec fold', 'aria-label': title }, [el('summary', {}, [el('span', { class: 'fold-t', text: title }), el('span', { class: 'fold-s', 'aria-hidden': 'true' })])].concat(kids, opts.more ? [el('p', {}, [el('a', { class: 'more', href: '#' + opts.more, text: 'ดูรายละเอียด →' })])] : []));
    return el('section', { class: 'sec' + (opts.cls ? ' ' + opts.cls : ''), 'aria-label': title }, [el('div', { class: 'sec-h' }, [opts.icon ? el('h2', { class: 'h-xl' }, [el('span', { class: 'h-emo', 'aria-hidden': 'true', text: opts.icon }), ' ' + title]) : el('h2', { text: title }), opts.note ? el('span', { class: 'note', text: opts.note }) : null,
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
  function figure(title, caption, body) {          /* caption เป็นฟังก์ชันได้ = ป้ายที่ตามรอบอ่านข้อมูลสด (อัปเดตเฉพาะจุด) */
    var cap = typeof caption === 'function' ? caption() : caption, sp = cap ? el('span', { text: cap }) : null;
    if (sp && typeof caption === 'function') { sp.classList.add('live-ts'); sp.__ts = caption; }
    var f = el('figure', { class: 'card chart' }, [el('figcaption', {}, [el('strong', { text: title }), sp])]); f.appendChild(body); return f; }
  function notesList(list, tone) { return list && list.length ? el('ul', { class: 'notes' + (tone ? ' ' + tone : '') }, list.map(function (n) { return el('li', { text: n }); })) : null; }
  function srcLine(m) { return m ? el('p', { class: 'src', text: 'ที่มา: ' + m.source + (m.updated ? ' · อัปเดตล่าสุด ' + dLabel(m.updated) : '') }) : null; }
  /* นิยาม สูตร และข้อสังเกตเชิงเทคนิค: แสดงเฉพาะในหน้า “ข้อมูลระบบเพิ่มเติม” (ผู้ดูแล) — หน้าใช้งานทั่วไปไม่แสดง */
  var ADMIN_VIEW = false;
  function infoBox(title, m, extra) {
    if (!m || !ADMIN_VIEW) return null;
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
  /* รอบ 12: ตัวสังเกตขนาดของกราฟผูกกับหน้าปัจจุบัน — เปลี่ยนหน้า/วาดใหม่แล้วปลดออกทั้งหมด (ไม่สะสม) */
  /* รอบ 13: ปลดเฉพาะส่วนที่ถูกแทนที่ (ไม่ใช้ dropObs ทั้งหน้า) — disposeIn(ส่วนที่จะล้าง) ก่อนวาดใหม่ในที่เดิม (สลับรูปแบบ/ซ่อนชุด/ตัวกรอง)
   * + กวาดตัวสังเกตของกราฟที่เคยอยู่บนหน้าแล้วถูกถอดออก (เช่น ตัวกรองเรือนไทยวาดรายการใหม่) — กราฟที่สร้างแล้วยังไม่ได้แปะลงหน้าไม่ถูกปลด */
  var liveObs = [], pruneT = 0;
  function dropObs() { liveObs.forEach(function (o) { try { o.disconnect(); } catch (e) {} }); liveObs = []; }
  function trackObs(o, node) { o.node = node; liveObs.push(o); if (!pruneT) pruneT = setTimeout(function () { pruneT = 0; pruneObs(); }, 60); }
  function untrack(test) { liveObs = liveObs.filter(function (o) { if (test(o)) { try { o.disconnect(); } catch (e) {} return false; } return true; }); }
  function pruneObs() { untrack(function (o) { return o.node && o.node.__seen && !o.node.isConnected; }); }
  if (window.MutationObserver) new MutationObserver(function () { if (liveObs.length && !pruneT) pruneT = setTimeout(function () { pruneT = 0; pruneObs(); }, 120); }).observe(document.documentElement, { childList: true, subtree: true });   /* ส่วนที่ถูกถอดออก → ปลดตัวสังเกต */
  function disposeIn(root) { if (root) untrack(function (o) { return o.node && root.contains(o.node); }); }
  function responsive(draw) {
    var box = el('div', { class: 'chart-box' }), last = 0;
    function run() { if (box.isConnected) box.__seen = true; var w = Math.round(box.clientWidth); if (!w || w === last) return; last = w; box.textContent = ''; draw(box, w); }
    if (window.ResizeObserver) { var ro = new ResizeObserver(run); ro.observe(box); trackObs(ro, box); } else { window.addEventListener('resize', run); trackObs({ disconnect: function () { window.removeEventListener('resize', run); } }, box); }
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
  /* รอบ 12 — รูปแบบกราฟเลือกได้ (ใช้ข้อมูลชุดเดียวกัน ไม่เรียก API ใหม่ ไม่เปลี่ยนตัวกรอง/วิธีนับ):
       stack = แท่งซ้อน (ค่าเดิม ดูผลรวม+สัดส่วน) · group = แท่งตั้งแยกชุด (แต่ละชุดตั้งข้างกัน) · line = เส้นแนวโน้ม (เฉพาะแกนเวลา เว้นช่วงเมื่อไม่มีข้อมูล) · table = ตารางตัวเลข
     ค่า null/undefined = ไม่มีข้อมูล (ไม่ใช่ 0) · จำรูปแบบที่เลือกต่อกราฟใน localStorage (ไม่ใช่ข้อมูลอ่อนไหว) · opt.cat = แกนหมวดหมู่ (ไม่มีโหมดเส้น) · opt.modes === false = ไม่แสดงแถบเลือก */
  var CHART_MODE = { stack: 'แท่งซ้อน', bar: 'แท่ง', group: 'แท่งแยกชุด', line: 'เส้น', table: 'ตาราง' };
  function chartPrefs() { try { return JSON.parse(store('hub.chart') || '{}') || {}; } catch (e) { return {}; } }
  function chartPrefSet(k, v) { var p = chartPrefs(); if (v == null) delete p[k]; else p[k] = v; store('hub.chart', JSON.stringify(p)); }
  function bars(cols, series, opt) {
    opt = opt || {};
    if (!cols.length) return el('div', { class: 'empty', text: 'ไม่มีข้อมูลในช่วงที่เลือก' });
    var multi = series.length > 1, key = opt.key || opt.aria || 'chart', modes = multi ? ['stack', 'group'] : ['bar'], def = modes[0];
    if (!opt.cat && cols.length >= 2) modes.push('line'); modes.push('table');      /* เส้นต้องมีอย่างน้อย 2 ช่วงเวลา */
    var saved = opt.modes === false ? null : chartPrefs()[key], mode = modes.indexOf(saved) >= 0 ? saved : def, hidden = {}, unit = opt.unit ? ' ' + opt.unit : '';
    var wrap = el('div', { class: 'chartw' }), body = el('div', { class: 'chart-body' }), tb = null, note = el('p', { class: 'chart-hid', role: 'status', hidden: '' });
    function vis() { return series.filter(function (s, i) { return !hidden[i]; }); }
    function draw() {
      var S = vis(); disposeIn(body); body.textContent = ''; wrap.setAttribute('data-mode', mode);
      if (!S.length) body.appendChild(el('div', { class: 'empty', text: 'ซ่อนทุกชุดข้อมูลอยู่ — กดชื่อชุดด้านล่างเพื่อแสดง' }));
      else if (mode === 'table') body.appendChild(chartTable(cols, S, opt));
      else if (mode === 'line') { var mx = 1; S.forEach(function (s) { s.values.forEach(function (v) { if (v != null && v > mx) mx = v; }); }); var sc = niceTop(mx, opt.int);
        body.appendChild(lineChart(cols, S, { min: 0, max: sc.top, step: sc.step, dec: 0, fmt: compact, fv: function (v) { return num(v); }, unit: opt.unit, h: opt.h, aria: (opt.aria || 'แผนภูมิ') + ' (เส้นแนวโน้ม)', onPick: opt.onPick, pickHint: opt.pickHint, sel: opt.sel, noLegend: true })); }
      else body.appendChild(barsSvg(cols, S, opt, mode === 'group'));
      var hn = series.filter(function (s, i) { return hidden[i]; }).map(function (s) { return s.name; });
      note.hidden = !hn.length; note.textContent = hn.length ? 'กำลังซ่อน: ' + hn.join(', ') + ' — ผลรวมในกราฟนี้ไม่รวมชุดที่ซ่อน (ตัวเลขสรุปด้านบนของหน้าไม่เปลี่ยน)' : '';
      if (tb) Array.prototype.forEach.call(tb.querySelectorAll('button[data-m]'), function (bn) { bn.setAttribute('aria-pressed', String(bn.getAttribute('data-m') === mode)); });
      if (tb) { var rs = tb.querySelector('.cm-reset'); if (rs) rs.hidden = mode === def; }
    }
    if (opt.modes !== false) {
      tb = el('div', { class: 'chart-tb', role: 'group', 'aria-label': 'รูปแบบกราฟ' }, modes.map(function (m) {
        return el('button', { type: 'button', 'data-m': m, 'aria-pressed': 'false', title: m === 'group' ? 'แท่งตั้งแยกชุด: แต่ละชุดข้อมูลตั้งข้างกันในช่วงเวลาเดียวกัน' : m === 'stack' ? 'แท่งซ้อน: เห็นผลรวมและสัดส่วนย่อย' : null, text: CHART_MODE[m], onclick: function () { mode = m; chartPrefSet(key, m === def ? null : m); draw(); } }); })
        .concat([el('button', { type: 'button', class: 'cm-reset', hidden: '', text: 'ค่าเริ่มต้น', title: 'กลับไปรูปแบบเริ่มต้นของกราฟนี้', onclick: function () { mode = def; chartPrefSet(key, null); draw(); } })]));
      wrap.appendChild(tb);
    }
    wrap.appendChild(body);
    if (multi) {       /* ชื่อชุดข้อมูลกดเพื่อซ่อน/แสดงได้ (ไม่จำข้ามหน้า) */
      wrap.appendChild(el('div', { class: 'legend legend-btn', role: 'group', 'aria-label': 'ชุดข้อมูล (กดเพื่อซ่อน/แสดง)' }, series.map(function (s, i) {
        var bn = el('button', { type: 'button', 'aria-pressed': 'true', title: 'กดเพื่อซ่อน/แสดงชุดนี้ในกราฟ' }, [el('i', { style: 'background:' + s.color }), s.name]);
        bn.onclick = function () { hidden[i] = !hidden[i]; bn.setAttribute('aria-pressed', String(!hidden[i])); draw(); }; return bn; })));
      wrap.appendChild(note);
    }
    draw();
    return wrap;
  }
  function sumTxt(t, any, miss, what, unit) { return !any ? 'ไม่มีข้อมูล' : num(t) + (unit || '') + (miss ? ' (ไม่ครบ: ขาด ' + miss + ' ' + what + ')' : ''); }
  function chartTable(cols, series, opt) {
    var multi = series.length > 1, head = [opt.cat ? 'หมวด' : 'ช่วงเวลา'].concat(series.map(function (s) { return s.name; }), multi ? ['รวม'] : []), nums = head.map(function (_, i) { return i; }).slice(1);
    var rows = cols.map(function (c, i) { var t = 0, any = false, miss = 0, r = [c.full || c.label]; series.forEach(function (s) { var v = s.values[i]; if (v != null) { any = true; t += v; } else miss++; r.push(v == null ? 'ไม่มีข้อมูล' : num(v)); }); if (multi) r.push(sumTxt(t, any, miss, 'ชุด')); return r; });
    /* รอบ 13: แยก “ไม่มีข้อมูลทั้งหมด” (ไม่ใช่ 0) · “มีข้อมูลยืนยันเป็น 0” · “มีข้อมูลบางช่วง” (บอกจำนวนช่วงที่ขาด) */
    var tot = ['รวมทั้งช่วง'], grand = 0, gAny = false, gMiss = 0; series.forEach(function (s) { var t = 0, any = false, miss = 0; cols.forEach(function (_, i) { var v = s.values[i]; if (v == null) miss++; else { any = true; t += v; } }); grand += t; gAny = gAny || any; gMiss += miss; tot.push(sumTxt(t, any, miss, 'ช่วง')); });
    if (multi) tot.push(sumTxt(grand, gAny, gMiss, 'ค่า'));
    if (!opt.noSum) rows.push(tot);
    return el('div', { class: 'tbl-wrap chart-tbl', tabindex: '0', role: 'region', 'aria-label': (opt.aria || 'ตารางตัวเลข') + (opt.unit ? ' (หน่วย: ' + opt.unit + ')' : '') }, [table(head, rows, { num: nums })]);
  }
  function barsSvg(cols, series, opt, grouped) {
    var n = series.length, unit = opt.unit ? ' ' + opt.unit : '', V = function (s, i) { var v = s.values[i]; return v == null ? null : v; }, TV = function (s, i) { var v = V(s, i); return v == null ? 'ไม่มีข้อมูล' : num(v) + unit; };
    return responsive(function (box, W0) {
      var H = opt.h || 250, L = 46, R = 8, T = 22, B = 28, minBw = grouped ? n * 7 + 8 : 0, W = Math.max(W0, grouped ? L + R + cols.length * minBw : 0), pw = W - L - R, ph = H - T - B;
      var totals = cols.map(function (_, i) { return series.reduce(function (a, s) { return a + (s.values[i] || 0); }, 0); }),
        miss = cols.map(function (_, i) { return series.filter(function (s) { return s.values[i] == null; }).length; }),
        totTxt = function (i) { return sumTxt(totals[i], miss[i] < n, miss[i], 'ชุด', unit); };
      var peak = grouped ? Math.max.apply(null, series.map(function (s) { return Math.max.apply(null, s.values.map(function (v) { return v || 0; }).concat([0])); }).concat([0])) : Math.max.apply(null, totals);
      var sc = niceTop(peak, opt.int), top = sc.top;
      var root = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'group', 'aria-label': (opt.aria || 'แผนภูมิแท่ง') + (grouped ? ' (แท่งตั้งแยกชุด)' : '') });
      if (W > W0) { root.style.width = W + 'px'; box.classList.add('scroll-x'); box.setAttribute('tabindex', '0'); } else { box.classList.remove('scroll-x'); box.removeAttribute('tabindex'); }
      yAxis(root, W, L, R, T, ph, 0, top, sc.step);
      var bw = pw / cols.length, w = grouped ? Math.max(n * 5, Math.min(n * 22, bw * 0.8)) : Math.max(3, Math.min(48, bw * 0.68)), every = everyN(cols, bw), showTotals = !grouped && bw >= 34, gw = w / n;
      cols.forEach(function (c, i) {
        var x = L + bw * i + (bw - w) / 2, acc = 0;
        var g = svg('g', { class: 'col' + (opt.sel === i ? ' sel' : ''), tabindex: i === 0 ? '0' : '-1', role: 'img',
          'aria-label': c.full + ': ' + series.map(function (s) { var v = V(s, i); return s.name + ' ' + (v == null ? 'ไม่มีข้อมูล' : num(v)); }).join(', ') + (n > 1 ? ', รวม ' + totTxt(i) : V(series[0], i) == null ? '' : unit) });
        g.appendChild(svg('rect', { class: 'hit', x: L + bw * i, y: T - 16, width: bw, height: ph + 16 + B, rx: 6 }));
        series.forEach(function (s, k) {
          var val = s.values[i] || 0; if (!val) return;
          if (grouped) { g.appendChild(svg('rect', { x: x + gw * k + (gw > 6 ? 0.75 : 0), y: T + ph - ph * val / top, width: Math.max(gw - (gw > 6 ? 1.5 : 0), 2), height: Math.max(ph * val / top, 1), rx: Math.min(2.5, gw / 3), fill: s.color }));
            if (gw >= 15 && compact(val).length * 6.2 <= gw + 6) g.appendChild(svg('text', { class: 'vl', x: x + gw * k + gw / 2, y: T + ph - ph * val / top - 5, 'text-anchor': 'middle', text: compact(val) })); }
          else { g.appendChild(svg('rect', { x: x, y: T + ph - ph * (acc + val) / top, width: w, height: Math.max(ph * val / top - (n > 1 ? 1 : 0), 1), rx: 2.5, fill: s.color })); acc += val; }
        });
        if (showTotals && totals[i]) g.appendChild(svg('text', { class: 'vl', x: x + w / 2, y: T + ph - ph * totals[i] / top - 5, 'text-anchor': 'middle', text: compact(totals[i]) }));
        if (i % every === 0) g.appendChild(svg('text', { class: 'ax', x: x + w / 2, y: H - 9, 'text-anchor': 'middle', text: c.label }));
        bindTip(g, function () {
          return tipNodes(c.full, series.map(function (s) { return { name: s.name, color: s.color, value: TV(s, i) }; }),
            { total: n > 1 ? totTxt(i) : null, hint: opt.onPick ? (opt.pickHint || 'คลิกเพื่อดูรายละเอียดของเดือนนี้') : null });
        }, opt.onPick ? function () { opt.onPick(i, c); } : null);
        root.appendChild(g);
      });
      box.appendChild(root);
    });
  }
  /** เส้นแนวโน้ม (ใช้กับคะแนนหรือค่าที่ไม่ควรบวกกัน) — series: [{name,color,values(null=ไม่มีข้อมูล)}] ; opt: {min,max,step,dec,unit,h,onPick,sel,labels} */
  function lineChart(cols, series, opt) {
    opt = opt || {};
    if (!cols.length) return el('div', { class: 'empty', text: 'ไม่มีข้อมูลในช่วงที่เลือก' });
    var wrap = el('div'), dec = opt.dec == null ? 2 : opt.dec, unit = opt.unit ? ' ' + opt.unit : '', fv = opt.fv || function (v) { return v.toFixed(dec); };
    wrap.appendChild(responsive(function (box, W) {
      var H = opt.h || 230, L = 34, R = 12, T = 22, B = 28, pw = W - L - R, ph = H - T - B, lo = opt.min || 0, top = opt.max, step = opt.step || 1;
      var root = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'group', 'aria-label': opt.aria || 'แผนภูมิเส้น' });
      yAxis(root, W, L, R, T, ph, lo, top, step, opt.fmt || function (v) { return String(v); });
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
          'aria-label': c.full + ': ' + series.map(function (s) { return s.name + ' ' + (s.values[i] == null ? 'ไม่มีข้อมูล' : fv(s.values[i]) + unit); }).join(', ') });
        g.appendChild(svg('rect', { class: 'hit', x: L + bw * i, y: T - 16, width: bw, height: ph + 16 + B, rx: 6 }));
        series.forEach(function (s) {
          var v = s.values[i]; if (v == null) return;
          g.appendChild(svg('circle', { cx: X(i), cy: Y(v), r: 4.5, fill: s.color, stroke: 'var(--card)', 'stroke-width': 2 }));
          if (series.length === 1 && bw >= 40) g.appendChild(svg('text', { class: 'vl', x: X(i), y: Y(v) - 10, 'text-anchor': 'middle', text: fv(v) }));
        });
        if (i % every === 0) g.appendChild(svg('text', { class: 'ax', x: X(i), y: H - 9, 'text-anchor': 'middle', text: c.label }));
        bindTip(g, function () {
          return tipNodes(c.full, series.map(function (s) { return { name: s.name, color: s.color, value: s.values[i] == null ? 'ไม่มีข้อมูล' : fv(s.values[i]) + unit + (s.notes && s.notes[i] ? ' · ' + s.notes[i] : '') }; }),
            { hint: opt.onPick ? (opt.pickHint || 'คลิกเพื่อดูรายละเอียดของเดือนนี้') : null });
        }, opt.onPick ? function () { opt.onPick(i, c); } : null);
        root.appendChild(g);
      });
      box.appendChild(root);
    }));
    if (series.length > 1 && !opt.noLegend) wrap.appendChild(legendOf(series));
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
  /* แบบยุบได้ (ใช้เฉพาะหน้าที่ต้องการ): เริ่มแบบยุบ เห็นหัวข้อ + จำนวนระบบ · ปุ่มมี aria-expanded/aria-controls ใช้คีย์บอร์ดได้ */
  var foldSeq = 0;
  /* รอบ 12 — ส่วนยุบได้ (ชิ้นส่วนร่วมทุกหน้า): เริ่มแบบยุบ เห็นหัวข้อ + จำนวน + สถานะสำคัญ · ปุ่มจริง (Enter/Space) มี aria-expanded/aria-controls
     · จำสถานะเปิดไว้ตลอดที่อยู่หน้าเดิม (ข้อมูลสดมาใหม่ไม่ปิดส่วนที่เปิดอยู่) · กราฟข้างในวาดเมื่อเปิด (ResizeObserver) · พิมพ์รายงาน: แสดงเนื้อหาแม้ยุบอยู่ */
  function foldSection(title, opts, kids) {
    opts = opts || {}; kids = (kids || []).filter(Boolean); if (!kids.length) return null;
    var key = opts.key || title, open = !!(state.folds || {})[key], id = 'fold' + (++foldSeq);
    var body = el('div', { class: 'fold-body', id: id }, kids); if (!open) body.hidden = true;
    var btn = el('button', { type: 'button', class: 'fold-btn', 'aria-expanded': String(open), 'aria-controls': id }, [el('span', { class: 'fold-t', text: title }), opts.count ? el('span', { class: 'note', text: opts.count }) : null,
      opts.status ? el('span', { class: 'pill ' + (opts.status.tone || 's-warn'), text: opts.status.text }) : null, el('span', { class: 'fold-ch', 'aria-hidden': 'true' })]);
    btn.onclick = function () { var o = btn.getAttribute('aria-expanded') !== 'true'; btn.setAttribute('aria-expanded', String(o)); body.hidden = !o; (state.folds = state.folds || {})[key] = o; };
    return el('section', { class: 'sec sys-fold' + (opts.cls ? ' ' + opts.cls : ''), 'aria-label': title }, [el('h2', { class: 'fold-h' }, [btn]), body]);
  }
  function sysFoldStatus(list) {            /* สถานะสำคัญคงไว้ที่หัวข้อ — ไม่ซ่อนว่ามีระบบที่ยังเชื่อมต่อไม่ได้/ข้อมูลไม่ครบ */
    var bad = list.filter(function (x) { return x.status === 'blocked' || x.status === 'unverified'; }).length, part = list.filter(function (x) { return x.status === 'partial' || x.status === 'warn'; }).length;
    return bad ? { text: bad + ' ระบบยังเชื่อมต่อไม่ได้', tone: 's-off' } : part ? { text: part + ' ระบบมีข้อสังเกต', tone: 's-warn' } : null;
  }
  function systemsFold(ids, title) { return systemsSection(ids, title); }
  function systemsSection(ids, title) {
    var list = ids.map(function (id) { return SYS[id]; }).filter(Boolean);
    return list.length ? foldSection(title || 'ระบบและแบบฟอร์มที่เกี่ยวข้อง', { count: list.length + ' ระบบ', status: sysFoldStatus(list) }, [el('div', { class: 'sys-grid' }, list.map(sysCard))]) : null;
  }

  /* ======================================================================
   * หน้า Dashboard — รายงานต่อเนื่องหน้าเดียว เรียงหมวดตาม “รายงานประจำเดือน” ของระบบเดิม
   * ส่วนบน: เวลาอัปเดต ตัวกรองเดือน ตัวเลขภาพรวม ทางลัดไปแต่ละหมวด · ถัดลงไป: ตัวเลขหลัก ตารางรายเดือน กราฟ และแผนที่ของทุกหมวด
   * หน้า “รายงานประจำเดือน” (#report-monthly) ใช้รายงานชุดเดียวกัน เพิ่มปุ่มเลือกเดือน
   * ==================================================================== */
  function latestMonthOf(list) { return list && list.length ? list[list.length - 1] : null; }
  function pickMonth(page) { return function (i, c) { if (c.month) { (state.scopes || (state.scopes = {}))[page === 'report-monthly' ? 'report' : 'all'] = { from: c.month, to: c.month }; } go(page); }; }
  function mCols(rows) { return rows.map(function (r) { return { label: mLabel(r.month), full: mFull(r.month), month: r.month }; }); }
  function tiles(list) {
    return el('div', { class: 'tiles' }, list.filter(Boolean).map(function (t) {
      return el('div', { class: 'tile' + (t.na ? ' na' : ''), style: t.color ? '--accent:' + t.color : null }, [el('span', { class: 'tile-l', text: t.l }),
        t.na ? el('b', { class: 'tile-na', text: t.na }) : el('b', {}, [t.v, t.u ? el('small', { text: ' ' + t.u }) : null]), t.s ? el('span', { class: 'tile-s', text: t.s }) : null]); }));
  }
  function repSec(id, icon, title, o, kids) {
    o = o || {};
    return el('section', { class: 'rep', id: 'sec-' + id, 'aria-label': title, style: '--accent:' + (o.color || C.c1) }, [el('div', { class: 'rep-h' }, [el('span', { class: 'rep-ico' }, [ic(icon, 20)]), el('h2', { text: title }),
      o.note ? el('span', { class: 'note', text: o.note }) : null, o.tag ? el('span', { class: 'tag warn', text: o.tag }) : null,
      o.more ? el('a', { class: 'more', href: '#' + o.more, 'aria-label': (o.moreLabel || 'ดูรายละเอียด') + ' ' + title, text: (o.moreLabel || 'ดูรายละเอียด') + ' →' }) : null])].concat((kids || []).filter(Boolean)));
  }
  function jumpTo(id) { var n = $('sec-' + id); if (!n) return; try { history.replaceState(null, '', '#' + currentPage() + '/' + id); } catch (e) {} n.scrollIntoView(); }
  function rtable(head, rows, opts) { return rows.length ? table(head, rows, opts) : el('div', { class: 'empty', text: 'ไม่มีข้อมูลในช่วงที่เลือก' }); }
  function stampTxt(s) { return s ? dLabel(s.slice(0, 10) + ' ' + s.slice(11, 16)) : ''; }
  function hrs(min) { return num(min / 60, 1); }
  function renderReport(v, monthly) {
    var rt = rangeText(), inc = mod('incidents'), gate = mod('gate'), lf = mod('lostfound'), cctv = mod('cctv'), gr = mod('graduationParking'), vr = mod('vehicleRegistration'),
      gs = mod('guardScan'), sat = mod('guardSatisfaction'), fines = mod('guardFines'), fire = mod('fire'), am = mod('accidentMap'),
      tram = extra('tram'), aw = extra('anywheel'), lfs = extra('lostfoundStatus'), rts = extra('ruenthaiSurvey'), gm = extra('guardManpower');
    var upd = 'ข้อมูล ณ ' + stampTxt(DATA.stats.generatedAt || '') + ((DATA.extra || {}).generatedAt ? ' · ตรวจเพิ่ม ' + stampTxt(DATA.extra.generatedAt) : '') + ' (เวลาไทย)';
    if (monthly) {
      v.appendChild(pageHead('รายงานประจำเดือน', upd + ' · ช่วงที่แสดง: ' + rt, rangeCtrl()));
      v.appendChild(el('div', { class: 'chips', role: 'group', 'aria-label': 'เลือกเดือน' }, MONTHS.map(function (m) {
        return el('button', { type: 'button', class: 'chip', 'aria-pressed': String(state.from === m && state.to === m), text: mLabel(m), onclick: function () { state.from = m; state.to = m; route(true); } }); })));
    } else v.appendChild(el('div', { class: 'dash-head' }, [el('div', {}, [el('h1', { text: SYS_NAME }),
      el('div', { class: 'dash-meta' }, [el('span', { class: 'upd' }, [ic('clock'), upd]), el('span', { text: 'ช่วงที่แสดง: ' + rt })])]), rangeCtrl()]));
    var ov = [], secs = [], hold = el('div', { class: 'rep-list' }), add = function (id, label, node) { secs.push([id, label]); hold.appendChild(node); };
    var sm = function (list, pick) { return sumMonthly(list, pick); };

    /* 1 — เหตุการณ์และอุบัติเหตุ */
    if (inc) {
      var iRows = inc.monthly.filter(function (r) { return inRange(r.month); }), tsum = {}, itot = 0;
      iRows.forEach(function (r) { Object.keys(r.byType).forEach(function (k2) { tsum[k2] = (tsum[k2] || 0) + r.byType[k2]; itot += r.byType[k2]; }); });
      var order = inc.byType.map(function (x) { return x.type; }).filter(function (k2) { return tsum[k2]; }), oth = function (r) { return sumObj(r.byType) - (r.byType[V] || 0) - (r.byType[G] || 0) - (r.byType[P] || 0); };
      ov.push({ to: 'incidents', icon: 'alert', l: 'เหตุการณ์และอุบัติเหตุ', v: num(itot), u: 'เหตุการณ์', s: 'ยานพาหนะ ' + num(tsum[V] || 0) + ' · ทั่วไป ' + num(tsum[G] || 0) + ' · รับส่งผู้ป่วย ' + num(tsum[P] || 0), color: C.c1 });
      add('incidents', 'เหตุการณ์และอุบัติเหตุ', repSec('incidents', 'alert', 'รายงานเหตุการณ์และอุบัติเหตุ', { more: 'traffic', note: rt + ' · อัปเดต ' + dLabel(inc.updated), color: C.c1 }, [
        tiles([{ l: 'เหตุการณ์ทั้งหมด', v: num(itot), u: 'เหตุการณ์', color: C.c1 }, { l: V, v: num(tsum[V] || 0), u: 'เหตุ', color: C.c3 }, { l: G, v: num(tsum[G] || 0), u: 'เหตุ', color: C.c2 }, { l: P, v: num(tsum[P] || 0), u: 'ครั้ง', color: C.c4 },
          { l: 'ผู้บาดเจ็บ/ผู้ป่วย', v: num(incSum(incRows(function (r) { return inRange(r.date.slice(0, 7)); })).inj), u: 'คน', s: rt, color: C.fine },
          { l: 'ผู้เสียชีวิต', na: 'ไม่มีข้อมูลยืนยัน', s: 'ต้นทางไม่มีช่องบันทึกผู้เสียชีวิต' }]),
        el('div', { class: 'grid2' }, [
          figure('ประเภทเหตุการณ์', 'หน่วย: เหตุการณ์ · ' + rt, rtable(['ประเภทเหตุการณ์', 'จำนวนครั้ง'], order.map(function (k2) { return [k2, num(tsum[k2])]; }), { num: [1], foot: ['รวม', num(itot)] })),
          figure('เหตุการณ์รายเดือน แยกประเภท', 'หน่วย: เหตุการณ์ · คลิกแท่งเพื่อดูรายละเอียดของเดือนนั้น', incidentChart(pickMonth('traffic')))]),
        figure('ตารางรายเดือน', 'หน่วย: เหตุการณ์', rtable(['เดือน', 'อุบัติเหตุจากยานพาหนะ', 'อุบัติเหตุทั่วไป', 'รับส่งผู้ป่วย', 'เหตุอื่น', 'รวม'],
          iRows.map(function (r) { return [mFull(r.month), num(r.byType[V] || 0), num(r.byType[G] || 0), num(r.byType[P] || 0), num(oth(r)), num(sumObj(r.byType))]; }),
          { num: [1, 2, 3, 4, 5], foot: ['รวม', num(tsum[V] || 0), num(tsum[G] || 0), num(tsum[P] || 0), num(itot - (tsum[V] || 0) - (tsum[G] || 0) - (tsum[P] || 0)), num(itot)] }))]));
    }

    /* 2 — Lost & Found */
    if (lf) {
      var lm = lf.monthly.filter(function (r) { return inRange(r.month); }), st = {}, ty = function (r, n) { return r.byType[n] || 0; }, lsum = function (n) { return lm.reduce(function (a, r) { return a + ty(r, n); }, 0); };
      (lfs ? lfs.monthly : []).forEach(function (r) { st[r.month] = r; });
      var pendOf = function (r) { return r ? r.searching + r.unclaimed + r.waiting + r.blank : null; }, ret = 0, pend = 0, lall = lm.reduce(function (a, r) { return a + sumObj(r.byType); }, 0);
      lm.forEach(function (r) { var x = st[r.month]; if (x) { ret += x.returned; pend += pendOf(x); } });
      ov.push({ to: 'lostfound', icon: 'search', l: 'Lost & Found', v: num(lall), u: 'รายการ', s: 'แจ้งหาย ' + num(lsum('สิ่งของสูญหาย')) + ' · เก็บได้ ' + num(lsum('พบสิ่งของ')) + (lfs ? ' · รับคืนแล้ว ' + num(ret) : ''), color: C.c4 });
      add('lostfound', 'Lost & Found', repSec('lostfound', 'search', 'Lost & Found — แจ้งของหาย / เก็บของได้', { more: 'lostfound', note: rt + ' · อัปเดต ' + dLabel(lf.updated), color: C.c4 }, [
        tiles([{ l: 'แจ้งของหาย', v: num(lsum('สิ่งของสูญหาย')), u: 'รายการ', color: C.fine }, { l: 'เก็บของได้', v: num(lsum('พบสิ่งของ')), u: 'รายการ', color: C.c2 }, { l: 'แบบฟอร์มรับของคืน', v: num(lsum('รับของคืน')), u: 'ฉบับ', s: 'จำนวนแบบฟอร์ม ไม่ใช่สถานะ', color: C.c4 },
          lfs ? { l: 'สถานะ “รับของคืนแล้ว”', v: num(ret), u: 'รายการ', s: 'นับจากสถานะของทุกรายการ', color: C.c1 } : { l: 'สถานะ “รับของคืนแล้ว”', na: 'ไม่มีข้อมูลยืนยัน' }, lfs ? { l: 'ยังดำเนินการอยู่', v: num(pend), u: 'รายการ', s: 'ยังไม่พบ / รอเจ้าของมารับ / รอดำเนินการ', color: C.c5 } : null]),
        figure('ตารางรายเดือน', function () { var s2 = extra('lostfoundStatus'); return 'หน่วย: รายการ' + (s2 ? ' · สถานะตรวจ ' + srcReadTxt('lostfoundYear', s2.checkedAt) : ''); }, rtable(['เดือน', 'แจ้งของหาย', 'เก็บของได้', 'แบบรับของคืน', 'ไม่ระบุประเภท', 'รวม', 'รับคืนแล้ว', 'ยังดำเนินการ'],
          lm.map(function (r) { var x = st[r.month]; return [mFull(r.month), num(ty(r, 'สิ่งของสูญหาย')), num(ty(r, 'พบสิ่งของ')), num(ty(r, 'รับของคืน')), num(ty(r, '(ไม่ระบุประเภท)')), num(sumObj(r.byType)), x ? num(x.returned) : '–', x ? num(pendOf(x)) : '–']; }),
          { num: [1, 2, 3, 4, 5, 6, 7], foot: ['รวม', num(lsum('สิ่งของสูญหาย')), num(lsum('พบสิ่งของ')), num(lsum('รับของคืน')), num(lsum('(ไม่ระบุประเภท)')), num(lall), lfs ? num(ret) : '–', lfs ? num(pend) : '–'] })),
        el('div', { class: 'grid2' }, [figure('รายเดือน แยกประเภทรายการ', 'หน่วย: รายการ', lfChart(pickMonth('lostfound'))), lfs ? figure('รายเดือน แยกสถานะ', 'หน่วย: รายการ', lfStatusChart(pickMonth('lostfound'))) : null])]));
    }

    /* 3 — รถเข้า + หมวกนิรภัย (ต้นทางมีเฉพาะรถเข้า) */
    if (gate) {
      var gm2 = gate.monthly.filter(function (r) { return inRange(r.month); }), cars = sm(gate.monthly, function (r) { return r.cars; }), mo = sm(gate.monthly, function (r) { return r.motorcycles; }), nh = sm(gate.monthly, function (r) { return r.noHelmet; }), days = sm(gate.monthly, function (r) { return r.days; });
      ov.push(days ? { to: 'gate', icon: 'car', l: 'รถเข้ามหาวิทยาลัย', v: num(cars + mo), u: 'คัน', s: 'ไม่สวมหมวก ' + num(nh) + ' ราย · ' + days + ' วันที่มีข้อมูล', color: C.c3 } : { to: 'gate', icon: 'car', l: 'รถเข้ามหาวิทยาลัย', na: 'ไม่มีข้อมูลในช่วงที่เลือก', color: C.c3 });
      add('gate', 'รถเข้า / หมวกนิรภัย', repSec('gate', 'helmet', 'รายงานจำนวนรถเข้าและผู้ไม่สวมหมวกนิรภัย', { more: 'gate', note: rt + ' · อัปเดต ' + dLabel(gate.updated), tag: 'มีเฉพาะจำนวนรถเข้า — ยังไม่มีข้อมูลรถออก', color: C.c3 }, [
        tiles(days ? [{ l: 'รถยนต์เข้า', v: num(cars), u: 'คัน', color: C.c3 }, { l: 'รถจักรยานยนต์เข้า', v: num(mo), u: 'คัน', color: C.c1 }, { l: 'ผู้ไม่สวมหมวกนิรภัย', v: num(nh), u: 'ราย', s: 'ควรตรวจการกรอกบางวัน', color: C.c2 },
          { l: 'วันที่มีข้อมูล', v: num(days), u: 'วัน', s: 'ผลรวมประตู 1, 3, 4, 5, 6', color: C.c5 }, { l: 'รถออก', na: 'ยังไม่มีข้อมูลยืนยัน' }] : [{ l: 'รถเข้ามหาวิทยาลัย', na: 'ไม่มีข้อมูลในช่วงที่เลือก' }]),
        figure('ตารางรายเดือน', 'หน่วย: คัน (รถเข้า) · ราย (ผู้ไม่สวมหมวก)', rtable(['เดือน', 'วันที่มีข้อมูล', 'รถยนต์เข้า', 'รถจักรยานยนต์เข้า', 'รวมรถเข้า', 'ผู้ไม่สวมหมวก'],
          gm2.map(function (r) { return [mFull(r.month), num(r.days), num(r.cars), num(r.motorcycles), num(r.cars + r.motorcycles), num(r.noHelmet)]; }), { num: [1, 2, 3, 4, 5], foot: ['รวม', num(days), num(cars), num(mo), num(cars + mo), num(nh)] })),
        el('div', { class: 'grid2' }, [figure('รถเข้ารายวัน', 'หน่วย: คัน', gateDailyChart()), figure('ผู้ไม่สวมหมวกนิรภัยรายวัน', 'หน่วย: ราย', helmetDailyChart())])]));
    }

    /* 4 — แผนที่จุดเกิดเหตุ */
    if (am) { var np = mapPoints().length;
      add('map', 'แผนที่จุดเกิดเหตุ', repSec('map', 'map', 'แผนที่จุดเกิดอุบัติเหตุ', { more: 'accident-map', moreLabel: 'เปิดแผนที่เต็มและรายชื่อจุด', note: num(np) + ' จุดในช่วง ' + rt, color: C.c3 }, [
        el('div', { class: 'card dash-mapcard' }, [dashMap(), el('div', { class: 'legend' }, [el('span', {}, [el('i', { style: 'background:' + C.c3 }), V]), el('span', {}, [el('i', { style: 'background:' + C.c2 }), G]),
          el('span', {}, [el('i', { style: 'background:var(--brand-d);border-radius:50%' }), 'วงกลมตัวเลข = หลายจุดใกล้กัน (กดเพื่อขยาย)'])])])])); }

    /* 5 — Anywheel */
    if (aw) {
      var awm = aw.monthly.filter(function (r) { return inRange(r.month); }), asum = function (k2) { return awm.reduce(function (a, r) { return a + (r[k2] || 0); }, 0); }, withMin = awm.filter(function (r) { return r.minutes != null; });
      ov.push(awm.length ? { to: 'anywheel', icon: 'pin', l: 'จักรยาน Anywheel', v: num(asum('trips')), u: 'ครั้ง', s: num(Math.round(asum('km'))) + ' กม. · ข้อมูลถึง ' + mLabel(aw.monthly[aw.monthly.length - 1].month), color: C.c1 } : { to: 'anywheel', icon: 'pin', l: 'จักรยาน Anywheel', na: 'ไม่มีข้อมูลในช่วงที่เลือก', color: C.c1 });
      add('anywheel', 'Anywheel', repSec('anywheel', 'pin', 'สรุปการใช้จักรยาน Anywheel', { more: 'tram', note: awDataTxt(), tag: awm.length ? null : 'ต้นทางยังไม่มีข้อมูลของช่วงที่เลือก', color: C.c1 }, [
        tiles(awm.length ? [{ l: 'จำนวนครั้งการใช้งาน', v: num(asum('trips')), u: 'ครั้ง', color: C.c1 }, { l: 'ระยะทางรวม', v: num(Math.round(asum('km'))), u: 'กม.', color: C.c4 },
          withMin.length ? { l: 'เวลาการใช้งาน', v: num(Math.round(withMin.reduce(function (a, r) { return a + r.minutes; }, 0) / 60)), u: 'ชม.', s: withMin.length < awm.length ? 'เฉพาะ ' + withMin.length + ' จาก ' + awm.length + ' เดือนที่ต้นทางมีข้อมูลครบเดือน' : null, color: C.c5 } : { l: 'เวลาการใช้งาน', na: 'ไม่มีข้อมูล' },
          { l: 'เฉลี่ยต่อวันที่มีข้อมูล', v: num(Math.round(asum('trips') / asum('days'))), u: 'ครั้ง/วัน', color: C.c3 }] : [{ l: 'การใช้งาน Anywheel', na: 'ไม่มีข้อมูลในช่วงที่เลือก', s: 'ต้นทางมีข้อมูล ' + mLabel(aw.monthly[0].month) + ' – ' + mLabel(aw.monthly[aw.monthly.length - 1].month) }]),
        el('div', { class: 'grid2' }, [figure('จำนวนครั้งการใช้งานรายเดือน', 'หน่วย: ครั้ง', bars(mCols(awm), [{ name: 'จำนวนครั้งการใช้งาน', color: C.c1, values: awm.map(function (r) { return r.trips; }) }], { unit: 'ครั้ง', int: true, h: 230, aria: 'การใช้ Anywheel รายเดือน' })),
          figure('ตารางรายเดือน', 'หน่วย: ครั้ง · กม. · ชม.', rtable(['เดือน', 'วันที่มีข้อมูล', 'จำนวนครั้ง', 'ระยะทาง (กม.)', 'เวลาใช้งาน (ชม.)'], awm.map(function (r) { return [mFull(r.month), awDaysTxt(r), num(r.trips), num(Math.round(r.km)), awMinTxt(r)]; }), { num: [1, 2, 3, 4] }))]), awStateNode()]));
    }

    /* 6–7 — รถราง และรถรางแยกส่วนงาน */
    if (tram) {
      var tr = tramRows(), ts = function (k2) { return tr.reduce(function (a, r) { return a + r[k2]; }, 0); };
      ov.push(tr.length ? { to: 'tram', icon: 'car', l: 'รถรางบริการพิเศษ', v: num(ts('jobs')), u: 'งาน', s: num(ts('rounds')) + ' รอบ · ' + num(ts('km')) + ' กม.', color: C.c2 } : { to: 'tram', icon: 'car', l: 'รถรางบริการพิเศษ', na: 'ไม่มีข้อมูลในช่วงที่เลือก', color: C.c2 });
      add('tram', 'รถราง', repSec('tram', 'car', 'สรุปยอดเดินรถราง', { more: 'tram', note: rt + ' · ข้อมูลถึง ' + dLabel(tram.updated), color: C.c2 }, [
        tiles([{ l: 'จำนวนงาน', v: num(ts('jobs')), u: 'งาน', color: C.c3 }, { l: 'จำนวนรอบ', v: num(ts('rounds')), u: 'รอบ', color: C.c1 }, { l: 'ระยะทางรวม', v: num(ts('km')), u: 'กม.', color: C.c4 },
          { l: 'รถที่ให้บริการ', v: num(ts('trams')), u: 'คัน-ครั้ง', color: C.c2 }, { l: 'ระยะเวลาให้บริการ', v: hrs(ts('minutes')), u: 'ชม.', color: C.c5 }, { l: 'ผู้ใช้บริการ', na: 'ต้นทางไม่มีข้อมูล' }]),
        el('div', { class: 'grid2' }, [figure('จำนวนงานและจำนวนรอบรายเดือน', 'หน่วย: งาน / รอบ (แยกแท่ง ไม่นำมารวมกัน)', el('div', { class: 'mini-pair' }, [el('div', {}, [el('h4', { text: 'จำนวนงาน' }), tramChart('jobs', 'จำนวนงาน', 'งาน', C.c3)]), el('div', {}, [el('h4', { text: 'จำนวนรอบ' }), tramChart('rounds', 'จำนวนรอบ', 'รอบ', C.c1)])])),
          figure('ตารางรายเดือน', 'หน่วยตามหัวคอลัมน์', rtable(['เดือน', 'งาน', 'รอบ', 'ระยะทาง (กม.)', 'รถ (คัน-ครั้ง)', 'เวลา (ชม.)'], tr.map(function (r) { return [mFull(r.month), r.jobs, r.rounds, num(r.km), r.trams, hrs(r.minutes)]; }),
            { num: [1, 2, 3, 4, 5], foot: ['รวม', num(ts('jobs')), num(ts('rounds')), num(ts('km')), num(ts('trams')), hrs(ts('minutes'))] }))])]));
      var bd = tram.byDept, dj = bd.rows.reduce(function (a, r) { return a + r.jobs; }, 0), dr = bd.rows.reduce(function (a, r) { return a + r.rounds; }, 0);
      add('tram-dept', 'รถรางแยกส่วนงาน', repSec('tram-dept', 'users', 'การใช้บริการรถรางแยกตามส่วนงาน — ' + mFull(bd.month), { more: 'tram', note: num(dj) + ' งาน · ' + num(dr) + ' รอบ · ไม่ขึ้นกับตัวกรองเดือน', color: C.c2 }, [
        el('div', { class: 'grid2' }, [figure('จำนวนงานแยกส่วนงาน', 'หน่วย: งาน · ตัวเลขท้ายแท่ง = จำนวนรอบ', tramDeptChart()),
          figure('ตารางแยกส่วนงาน', 'ชื่อส่วนงานตามที่กรอกในต้นทาง', rtable(['ส่วนงาน', 'งาน', 'รอบ'], bd.rows.map(function (r) { return [r.dept, r.jobs, r.rounds]; }), { num: [1, 2], foot: ['รวม', num(dj), num(dr)] }))])]));
    }

    /* 8 — CCTV */
    if (cctv) {
      var bu = cctv.byUnit || {}, cu = function (u) { var k2 = Object.keys(bu).filter(function (x) { return x.toUpperCase().indexOf(u) >= 0; })[0]; return k2 && bu[k2] ? { l: u, v: num(bu[k2]), u: 'คำขอ', color: C.c2 } : { l: u, na: 'ยังไม่มีข้อมูล', s: 'ระบบแยกหน่วยยังไม่เปิดใช้' }; };
      var cc = sm(cctv.monthly, function (r) { return r.count; }), ck = Object.keys(bu).filter(function (x) { return x.indexOf('ส่วนกลาง') >= 0; })[0];
      ov.push({ to: 'cctv', icon: 'camera', l: 'คำขอดูกล้อง CCTV', v: num(cc), u: 'คำขอ', s: 'พื้นที่ส่วนกลาง · ทั้งหมด ' + num(cctv.total) + ' คำขอ', color: C.c2 });
      add('cctv', 'CCTV', repSec('cctv', 'camera', 'คำขอดูกล้องวงจรปิด (CCTV)', { more: 'cctv', note: rt + ' · อัปเดต ' + dLabel(cctv.updated), color: C.c2 }, [
        tiles([{ l: 'คำขอในช่วงที่เลือก', v: num(cc), u: 'คำขอ', color: C.c2 }, { l: 'ส่วนกลาง (ทุกช่วง)', v: num(ck ? bu[ck] : cctv.total), u: 'คำขอ', color: C.c1 }, cu('MLC'), cu('LA'), cu('PMH'),
          { l: 'ปิดเคสแล้ว (ทุกช่วง)', v: num(cctv.byStatus['ปิดเคส']), u: 'จาก ' + num(cctv.total), color: C.c3 }]),
        el('div', { class: 'grid2' }, [figure('คำขอรายเดือน', 'หน่วย: คำขอ', cctvMonthChart(pickMonth('cctv'))),
          figure('ผลการตรวจภาพ (ทุกช่วง)', 'หน่วย: คำขอ', hbars(Object.keys(cctv.footage).map(function (k2) { return { label: k2, value: cctv.footage[k2], color: k2 === 'พบภาพ' ? C.c1 : C.c5 }; }), Math.max(1, cctv.total), { labelW: 120, unit: 'คำขอ', series: 'คำขอ' }))])]));
    }

    /* 9 — ลานจอด ทะเบียนยานพาหนะ แบบสำรวจลานจอดรถเรือนไทย */
    if (vr || gr || rts) { var pk = [];
      if (vr) { var names = Object.keys(vr.rows), mx = Math.max.apply(null, names.map(function (n) { return vr.rows[n] || 0; })), vt = names.reduce(function (a, n) { return a + (vr.rows[n] || 0); }, 0);
        ov.push({ to: 'parking', icon: 'car', l: 'ยานพาหนะที่ลงทะเบียน', v: num(vt), u: 'รายการ', s: rts ? 'แบบสำรวจเรือนไทย ' + num(rts.total) + ' ชุด' : null, color: C.c5 });
        pk.push(figure('ยานพาหนะที่ลงทะเบียน', 'หน่วย: รายการลงทะเบียน · อัปเดต ' + dLabel(vr.updated) + vrMotoNote(vr), hbars(names.map(function (n) { return { label: n, value: vr.rows[n], color: C.c5 }; }), mx, { unit: 'รายการ', series: 'ลงทะเบียน', labelW: 170, nullText: studentMotoNa(), aria: 'ยานพาหนะที่ลงทะเบียน' }))); }
      if (gr) pk.push(figure('ลานจอดงานพิธีพระราชทานปริญญาบัตร', 'หน่วย: % ของความจุ ' + num(gr.capacity) + ' คัน (' + gr.lots + ' ลาน)', hbars(gr.days.map(function (d) { return { label: dLabel(d.date), value: d.occupancyPercent, note: num(d.latestCount) + ' คัน', color: C.c3 }; }), 100, { ticks: [0, 25, 50, 75, 100], labelW: 120, dec: 1, unit: '%', series: 'อัตราการใช้ลานจอด' })));
      if (rts) pk.push(figure('แบบสำรวจลานจอดรถเรือนไทย — จำนวนแบบสำรวจที่ส่งรายวัน', 'หน่วย: ชุด · รวม ' + num(rts.total) + ' ชุด · ' + dLabel(rts.from).replace(/ \d{4}$/, '') + ' – ' + dLabel(rts.updated),
        bars(rts.daily.map(function (d) { return { label: (+d.date.slice(8)) + ' ' + TH_M[+d.date.slice(5, 7) - 1], full: dLabel(d.date) }; }), [{ name: 'แบบสำรวจที่ส่ง', color: C.c4, values: rts.daily.map(function (d) { return d.count; }) }], { unit: 'ชุด', int: true, h: 230, aria: 'แบบสำรวจลานจอดรถเรือนไทยรายวัน' })));
      add('parking', 'ลานจอด / ยานพาหนะ', repSec('parking', 'car', 'ลานจอด ทะเบียนยานพาหนะ และแบบสำรวจลานจอดรถเรือนไทย', { more: 'parking', color: C.c5 }, [
        tiles([vr ? { l: 'บุคลากร (รถยนต์ + จยย.)', v: num((vr.rows['บุคลากร – รถยนต์'] || 0) + (vr.rows['บุคลากร – รถจักรยานยนต์'] || 0)), u: 'รายการ', color: C.c1 } : null, vr ? { l: 'นักศึกษา (รถยนต์)', v: num(vr.rows['นักศึกษา – รถยนต์']), u: 'รายการ', color: C.c3 } : null,
          vr && vr.rows['นักศึกษา – รถจักรยานยนต์'] == null ? { l: 'นักศึกษา (จยย.)', na: studentMotoNa() } : null,
          gr ? (function () { var b2 = gr.days.slice().sort(function (a, b) { return b.latestCount - a.latestCount; })[0]; return { l: 'ลานจอดงานปริญญา สูงสุด', v: num(b2.latestCount), u: 'คัน', s: dLabel(b2.date) + ' · ' + b2.occupancyPercent + '% ของความจุ', color: C.c2 }; })() : null,
          rts ? { l: 'แบบสำรวจเรือนไทย', v: num(rts.total), u: 'ชุด', s: 'ถึง ' + dLabel(rts.updated), color: C.c4 } : { l: 'แบบสำรวจเรือนไทย', na: 'ยังเชื่อมต่อไม่ได้' }]),
        el('div', { class: 'grid2' }, pk)])); }

    /* 10 — รปภ. อุปกรณ์ความปลอดภัย ค่าปรับ */
    if (sat || gs || fire || fines) {
      var lc = sat ? latestMonthOf(sat.central.monthly) : null, lu = sat ? latestMonthOf(sat.unit.monthly) : null, fc = fines ? sm(fines.monthly, function (r) { return r.cases; }) : null;
      if (lc) ov.push({ to: 'guard', icon: 'shield', l: 'ความพึงพอใจ รปภ.ส่วนกลาง', v: lc.overall.toFixed(2), u: '/ 5', s: mLabel(lc.month) + ' · ' + num(lc.responses) + ' คำตอบ', color: C.fine });
      add('guard', 'รปภ. / อุปกรณ์', repSec('guard', 'shield', 'รปภ.เอกชน อุปกรณ์ความปลอดภัย และค่าปรับ', { more: 'report-guard', moreLabel: 'ดูรายงานตรวจรับ รปภ.', color: C.fine }, [
        tiles([lc ? { l: 'พึงพอใจ รปภ.ส่วนกลาง', v: lc.overall.toFixed(2), u: '/ 5', s: mLabel(lc.month) + ' · ' + num(lc.responses) + ' คำตอบ', color: C.c1 } : null, lu ? { l: 'พึงพอใจ รปภ.ส่วนงาน', v: lu.overall.toFixed(2), u: '/ 5', s: mLabel(lu.month) + ' · ' + num(lu.respondents) + ' คน', color: C.c3 } : null,
          fines ? { l: 'ค่าปรับ รปภ.', v: num(fc), u: 'กรณี', s: rt, color: C.fine } : { l: 'ค่าปรับ รปภ.', na: 'ไม่มีข้อมูลยืนยัน' }, gs ? { l: 'สแกนจุดตรวจ', v: num(gs.scans), u: 'ครั้ง', s: dLabel(gs.range.from).replace(/ \d{4}$/, '') + ' – ' + dLabel(gs.range.to), color: C.c4 } : null,
          gm ? { l: 'กำลังพลตามแผน', v: num(gm.totals.day) + ' / ' + num(gm.totals.night), u: 'นาย', s: 'ผลัดกลางวัน / กลางคืน', color: C.c5 } : null, fire ? { l: 'ถังดับเพลิงในทะเบียน', v: num(fire.extinguishers), u: 'ถัง', s: 'ตรวจแล้ว ' + num(fire.extinguishersInspected) + ' ถัง', color: C.c2 } : null]),
        sat ? figure('ความพึงพอใจ รปภ.เอกชน รายเดือน', 'คะแนนเฉลี่ยรวม (1–5) · สองแบบประเมินแสดงแยกกัน', el('div', { class: 'mini-pair' }, ['central', 'unit'].map(function (src) {
          return el('div', {}, [el('h4', { text: sat[src].name }), satScoreChart(src, function (i, c) { state.satSrc = src; state.satMonth = c.month; go('report-guard'); }, null, 200)]); }))) : null])); }

    /* ทางลัดไปแต่ละหมวด */
    v.appendChild(el('nav', { class: 'jump', 'aria-label': 'ทางลัดไปยังหมวดรายงาน' }, [el('span', { class: 'jump-l', text: 'ไปที่หมวด' })].concat(secs.map(function (x) {
      return el('a', { href: '#' + currentPage() + '/' + x[0], text: x[1], onclick: function (e) { e.preventDefault(); jumpTo(x[0]); } }); }))));
    v.appendChild(hold);
    v.appendChild(el('p', { class: 'rep-foot' }, ['แหล่งข้อมูล นิยาม และสถานะการเชื่อมต่อของแต่ละชุดข้อมูลอยู่ที่ ', el('a', { href: '#admin-info', text: 'ข้อมูลระบบเพิ่มเติม' }), ' · ',
      el('a', { href: '#systems', text: 'สถานะระบบทั้งหมด' }), ' · ', el('button', { type: 'button', class: 'linkish', text: 'กลับขึ้นด้านบน ↑', onclick: function () { window.scrollTo(0, 0); } })]));
  }
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
      v.appendChild(srcStateNode('incidents'));
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
    v.appendChild(pageHead('รายงานจำนวนรถเข้าและผู้ไม่สวมหมวกนิรภัย', 'ต้นทางมีเฉพาะจำนวนรถเข้า (เจ้าหน้าที่นับที่ประตู 1, 3, 4, 5, 6 รายวัน) — ยังไม่มีข้อมูลจำนวนรถออก', rangeCtrl()));
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
    v.appendChild(systemsFold(['gate-tracker', 'helmet-quiz']));
  };
  PAGES['accident-map'] = function (v) {
    v.appendChild(pageHead('แผนที่จุดเกิดอุบัติเหตุ', 'อุบัติเหตุจากยานพาหนะและอุบัติเหตุทั่วไป ตามพิกัดในรายงานเหตุการณ์ · แสดงประเภท สถานที่ และเดือน', rangeCtrl()));
    v.appendChild(el('p', { class: 'src', id: 'mapNote' }));
    v.appendChild(el('div', { class: 'card mapcard', style: 'margin-top:8px' }, [
      el('div', { class: 'map-left' }, [el('div', { class: 'map-tools', id: 'mapTools' }), el('div', { id: 'mapSvg', class: 'map-svg' }), el('p', { class: 'map-cap', id: 'mapCap' })]),
      el('div', { class: 'map-right' }, [el('div', { id: 'mapDetail', class: 'map-detail' }), el('div', { id: 'mapEmbed', class: 'map-embed', hidden: 'hidden' }), el('div', { class: 'map-list-wrap' }, [el('table', { class: 'tbl', id: 'mapList' })])])]));
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
    if (vr) v.appendChild(kpiGrid(Object.keys(vr.rows).map(function (n, i) { return vr.rows[n] == null ? { icon: 'car', label: n, na: /จักรยานยนต์/.test(n) && /นักศึกษา/.test(n) ? studentMotoNa() : 'ไม่มีข้อมูลยืนยัน', color: C.c5 } : { icon: 'car', label: n, value: num(vr.rows[n]), unit: 'รายการ', updated: /จักรยานยนต์/.test(n) && /นักศึกษา/.test(n) && vr.studentMoto ? vr.studentMoto.checkedAt : vr.updated, sub: /จักรยานยนต์/.test(n) && /นักศึกษา/.test(n) && vr.studentMoto ? 'อ่านสด · 1 RefCode = 1 รายการ' : 'ไฟล์สรุป · นับตามแถว', color: [C.c1, C.c3, C.c4, C.c5][i] }; })));
    var rts = extra('ruenthaiSurvey'); if (rts) v.appendChild(section('แบบสำรวจลานจอดรถเรือนไทย', { more: 'parking' }, [kpiGrid([{ icon: 'file', label: 'แบบสำรวจที่ส่งแล้ว', value: num(rts.total), unit: 'ชุด', sub: dLabel(rts.from).replace(/ \d{4}$/, '') + ' – ' + dLabel(rts.updated), color: C.c4 }])]));
    v.appendChild(systemsSection(['veh-staff', 'veh-student', 'ruenthai']));
  };
  PAGES.graduation = function (v) {
    var gr = mod('graduationParking'), gps = mod('graduationGuardGps');
    v.appendChild(pageHead('พิธีพระราชทานปริญญาบัตร ปีการศึกษา 2568', 'ลานจอดรถและงาน รปภ. ช่วงพิธีพระราชทานปริญญาบัตร ปีการศึกษา 2568'));
    if (gr) {
      v.appendChild(kpiGrid(gr.days.map(function (d, i) { return { icon: 'cap', label: 'รถในลานจอด ' + dLabel(d.date), value: num(d.latestCount), unit: 'คัน', sub: d.occupancyPercent + '% ของความจุ ' + num(d.capacity) + ' คัน (' + d.lots + ' ลาน)', updated: gr.updated, color: [C.c1, C.c3, C.c4][i] }; })));
      v.appendChild(el('div', { class: 'sec' }, [figure('อัตราการใช้ลานจอดรวม', 'ที่มา: SUMMARY_2569 · จำนวนรถล่าสุดที่บันทึกของแต่ละลาน', hbars(gr.days.map(function (d) { return { label: dLabel(d.date), value: d.occupancyPercent, note: num(d.latestCount) + ' / ' + num(d.capacity) + ' คัน', color: C.c3 }; }), 100, { ticks: [0, 25, 50, 75, 100], labelW: 120 }))]));
    }
    var gg = extra('gradGuardGps'); if (gg) v.appendChild(section(GPS_TITLE, { more: 'grad-2568-gps' }, [kpiGrid([{ icon: 'file', label: 'รายงานทั้งหมด', value: num(gg.total), unit: 'รายงาน', sub: dLabel(gg.days[0].date).replace(/ \d{4}$/, '') + ' – ' + dLabel(gg.updated), color: C.c3 }])]));
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
        { icon: 'shield', label: 'สถานะ “รับของคืนแล้ว”', value: num(lf.returned), unit: 'รายการ', sub: 'รอเจ้าของมารับ ' + stCount(lf.byStatus, 'เจ้าของยังไม่มารับคืน') + ' · ช่วยหาแล้วยังไม่พบ ' + stCount(lf.byStatus, 'ช่วยหาแล้วยังไม่พบ'), scope: 'ทั้งปี 2569', color: C.c5 }]));
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
    v.appendChild(pageHead('อุปกรณ์ดับเพลิง', 'ทะเบียนอุปกรณ์ดับเพลิงรายชิ้น 7 ประเภท พร้อมภาพ ประวัติการตรวจสภาพ และการเติมสาร'));
    v.appendChild(fireEquipSection());
    if (f) {
      v.appendChild(el('div', { class: 'sec' }, [el('div', { class: 'sec-h' }, [el('h2', { text: 'ระบบตรวจถังดับเพลิง — สถิติรวม' }), el('span', { class: 'note', text: 'อัปเดต ' + dLabel(f.updated) })])]));
      v.appendChild(kpiGrid([
        { icon: 'heart', label: 'ถังดับเพลิงในทะเบียน', value: num(f.extinguishers), unit: 'ถัง', updated: f.updated, color: C.c2 },
        { icon: 'shield', label: 'ถังที่ตรวจแล้ว', value: num(f.extinguishersInspected), unit: 'ถัง', sub: 'จาก ' + f.extinguishers + ' ถัง', color: C.c3 },
        { icon: 'file', label: 'การตรวจทั้งหมด', value: num(f.inspections), unit: 'ครั้ง', sub: 'ปกติ ' + f.inspectionResult['ปกติ'] + ' · ชำรุด ' + f.inspectionResult['ชำรุด'], color: C.c1 },
]));
      var g = el('div', { class: 'grid2' });
      g.appendChild(figure('ถังดับเพลิงแยกชนิด', 'ที่มา: ข้อมูลถังดับเพลิง', hbars(Object.keys(f.byType).map(function (t) { return { label: t.replace(/ \(.*\)/, ''), value: f.byType[t], color: C.c2 }; }), 20, { labelW: 150, ticks: [0, 5, 10, 15, 20] })));
      g.appendChild(figure('ถังดับเพลิงแยกหน่วยงาน', 'ที่มา: ข้อมูลถังดับเพลิง', hbars(Object.keys(f.byUnit).map(function (t) { return { label: t, value: f.byUnit[t], color: C.c1 }; }), 35, { labelW: 190, ticks: [0, 10, 20, 30] })));
      v.appendChild(el('div', { class: 'sec' }, [g]));
      v.appendChild(section('นิยาม', {}, [infoBox('ถังดับเพลิง', f)]));
    }
    v.appendChild(systemsSection(['fire']));
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
  /* ไทล์มาตรฐานของ OpenStreetMap (แหล่งเดียวกับแผนที่ของระบบเดิม) — ใช้ตามนโยบายการใช้ไทล์: ส่ง Referer ของเว็บไซต์ แสดงเครดิตพร้อมลิงก์ ไม่ส่ง no-cache ไม่ดาวน์โหลดล่วงหน้า */
  var OSM_TILE = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', OSM_PROBE = 'https://tile.openstreetmap.org/15/25511/15108.png';
  function osmLayer() {
    return L.tileLayer(OSM_TILE, { maxZoom: 19, referrerPolicy: 'strict-origin-when-cross-origin',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors' });
  }
  /* ตรวจไทล์ตัวอย่าง 1 ครั้ง + โหลด Leaflet แล้วเรียก cb(ok) — ถ้าแหล่งแผนที่ปฏิเสธ จะไม่เรียกไทล์ต่อและใช้แผนผังแทน */
  function tilesReady(cb) {
    if (!tilesAllowed() || lf.failed) return cb(false);
    if (lf.probe === 'ok' && window.L && L.map) return cb(true);
    (lf.waiters = lf.waiters || []).push(cb);
    if (lf.probing) return; lf.probing = true;
    var done = function () { lf.probing = false; var w = lf.waiters || []; lf.waiters = []; var ok = lf.probe === 'ok' && !lf.failed && !!(window.L && L.map); w.forEach(function (f) { f(ok); }); };
    fetch(OSM_PROBE, { mode: 'cors' }).then(function (r) { lf.probe = r.ok ? 'ok' : 'fail'; if (!r.ok) { lf.failed = true; lf.reason = 'แหล่งแผนที่พื้นหลังปฏิเสธการเรียกใช้ (HTTP ' + r.status + ')'; } })
      .catch(function () { lf.probe = 'fail'; lf.failed = true; lf.reason = 'เชื่อมต่อแหล่งแผนที่พื้นหลังไม่ได้'; })
      .then(function () { if (lf.probe !== 'ok' || (window.L && L.map)) return done(); loadLeaflet(done); });
  }
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
  function drawMarkers() { drawMarkersOn(lf); }
  /* ctx = { map, layer, pts, pick(p) } — ใช้ร่วมกันทั้งแผนที่เต็มหน้าและแผนที่บน Dashboard */
  function drawMarkersOn(ctx) {
    var map = ctx.map; if (!map) return;
    var pick = ctx.pick || function (p) { state.sel = p.i; renderMap(); };
    if (ctx.layer) ctx.layer.remove(); ctx.layer = L.layerGroup().addTo(map);
    var z = map.getZoom(), cells = {};
    ctx.pts.forEach(function (p) { var q = map.project([p.lat, p.lng], z), k = Math.floor(q.x / 46) + ':' + Math.floor(q.y / 46); (cells[k] = cells[k] || []).push(p); });
    Object.keys(cells).forEach(function (k) {
      var g = cells[k];
      if (g.length === 1 || z >= 18) { g.forEach(function (p) {
        var sel = p.i === state.sel, m = L.circleMarker([p.lat, p.lng], { radius: sel ? 11 : 8, color: sel ? '#14231d' : '#fff', weight: sel ? 3 : 2, fillColor: typeColor(p), fillOpacity: .95 });
        m.bindTooltip(p.type + ' · ' + p.place + ' · ' + mLabel(p.month), { direction: 'top', offset: [0, -8] });
        m.on('click', function () { pick(p); }); m.addTo(ctx.layer);
      }); return; }
      var lat = 0, lng = 0, nv = 0; g.forEach(function (p) { lat += p.lat; lng += p.lng; if (p.type === V) nv++; });
      var c = L.marker([lat / g.length, lng / g.length], { icon: L.divIcon({ className: 'lf-cl', html: '<b>' + g.length + '</b>', iconSize: [36, 36] }), title: g.length + ' จุด — กดเพื่อขยาย', alt: g.length + ' จุด' });
      c.bindTooltip(g.length + ' จุดบริเวณนี้ · ยานพาหนะ ' + nv + ' · ทั่วไป ' + (g.length - nv) + ' (กดเพื่อขยาย)', { direction: 'top', offset: [0, -16] });
      c.on('click', function () { map.fitBounds(L.latLngBounds(g.map(function (p) { return [p.lat, p.lng]; })).pad(0.4), { maxZoom: 18 }); });
      c.addTo(ctx.layer);
    });
  }
  var dash = { map: null, layer: null, pts: [], pick: function (p) { state.sel = p.i; go('accident-map'); } };
  /* แผนที่บน Dashboard: แผนที่ถนน/อาคารจริง (OpenStreetMap) เมื่อเปิดผ่าน http(s) — เปิดจากไฟล์ในเครื่องจะบอกเหตุผลและแสดงแผนผังตามพิกัดแทน */
  /* รอบ 12: เริ่มงานหนัก (ไลบรารีแผนที่ + ภาพพื้นหลัง) เมื่อส่วนนั้นใกล้เข้าหน้าจอ — ไม่แย่งเวลาข้อมูลหลักด้านบน · ตัวสังเกตถูกปลดเมื่อเปลี่ยนหน้า */
  function whenNear(node, fn) {
    if (!window.IntersectionObserver) return fn();
    var io = new IntersectionObserver(function (es) { if (node.isConnected) node.__seen = true; if (es.some(function (e) { return e.isIntersecting; })) { untrack(function (o) { return o === io; }); fn(); } }, { rootMargin: '400px 0px' });
    io.observe(node); trackObs(io, node);
  }
  function dashMap() {
    var am = mod('accidentMap'), box = el('div', { class: 'dash-map' }), pts = mapPoints();
    if (dash.map) { try { dash.map.remove(); } catch (e) {} dash.map = null; dash.layer = null; }
    var plan = function (msg) { box.textContent = ''; box.appendChild(el('div', { class: 'map-warn', role: 'status' }, [el('b', { text: msg })])); var w = el('div', { class: 'map-svg map-mini' }); drawPlan(w, pts, am.box); box.appendChild(w); };
    if (!tilesAllowed()) { plan('เปิดจากไฟล์ในเครื่อง จึงแสดงเป็นแผนผังตามพิกัด — แผนที่ถนนและอาคารจะแสดงเมื่อเปิดผ่านเว็บไซต์ (http/https)'); return box; }
    box.appendChild(el('div', { class: 'lf-map dash map-wait', role: 'status', text: 'กำลังโหลดแผนที่…' }));
    var pp = el('div', { class: 'map-svg map-mini map-print', 'aria-hidden': 'true' }); drawPlan(pp, pts, am.box); box.appendChild(pp);      /* แพตช์ท้าย: ถ้าพิมพ์ก่อนแผนที่โหลด (ยังไม่เลื่อนถึง) พิมพ์แผนผังตามพิกัดแทนกล่องว่าง — แสดงเฉพาะสื่อพิมพ์ ถูกล้างเมื่อแผนที่จริงโหลด */      /* จองความสูงเท่าแผนที่จริง — โหลดภายหลังไม่ดันเนื้อหาเลื่อน */
    whenNear(box, function () { tilesReady(function (ok) { setTimeout(function () {
      if (!document.body.contains(box)) return;
      if (!ok) { plan((lf.reason || 'โหลดแผนที่พื้นหลังไม่สำเร็จ') + ' — แสดงแผนผังตามพิกัดแทน'); return; }
      box.textContent = '';
      var div = el('div', { class: 'lf-map dash', 'aria-label': 'แผนที่จุดเกิดอุบัติเหตุ (OpenStreetMap) — ใช้ปุ่ม + − เพื่อย่อขยาย' }); box.appendChild(div);
      var touch = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches), b = am.box;
      dash.map = L.map(div, { scrollWheelZoom: false, zoomSnap: 0.5, dragging: !touch }).fitBounds([[b.latMin, b.lngMin], [b.latMax, b.lngMax]]);
      dash.map.attributionControl.setPrefix(false); osmLayer().addTo(dash.map);
      dash.pts = pts; dash.map.on('zoomend', function () { drawMarkersOn(dash); }); drawMarkersOn(dash);
      if (touch) box.appendChild(el('p', { class: 'map-cap', text: 'ใช้สองนิ้วเพื่อย่อ/ขยาย · เปิดแผนที่เต็มเพื่อเลื่อนดูและเปิดรายชื่อจุด' }));
    }, 0); }); });
    return box;
  }
  function drawLeaflet(box, pts, b) {
    lf.pts = pts;
    if (!lf.el) lf.el = el('div', { class: 'lf-map', 'aria-label': 'แผนที่จุดเกิดอุบัติเหตุ (OpenStreetMap) — ใช้ปุ่มลูกศรเลื่อนแผนที่ ปุ่ม + − เพื่อย่อขยาย' });
    box.appendChild(lf.el);
    if (!lf.map) {
      lf.map = L.map(lf.el, { scrollWheelZoom: false, zoomSnap: 0.5 }).fitBounds([[b.latMin, b.lngMin], [b.latMax, b.lngMax]]);
      lf.map.attributionControl.setPrefix(false);
      var tl = osmLayer().addTo(lf.map);
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
    else if (lf.probe === 'ok' && window.L && L.map) drawLeaflet(box, pts, b);
    else { box.appendChild(el('div', { class: 'empty', role: 'status', text: 'กำลังโหลดแผนที่…' })); tilesReady(function () { setTimeout(renderMap, 0); }); }
    box.appendChild(el('div', { class: 'legend' }, [el('span', {}, [el('i', { style: 'background:' + C.c3 }), V]), el('span', {}, [el('i', { style: 'background:' + C.c2 }), G]),
      mode === 'osm' ? el('span', {}, [el('i', { style: 'background:var(--brand-d);border-radius:50%' }), 'วงกลมตัวเลข = หลายจุดใกล้กัน']) : null]));
    if (cap) cap.textContent = mode === 'osm' ? 'ชี้หรือแตะจุดเพื่อดูประเภท สถานที่ และเดือน · กดวงกลมตัวเลขเพื่อขยาย · ลากเพื่อเลื่อน ปุ่ม + − เพื่อย่อขยาย'
      : mode === 'plan' ? 'แผนผังตามพิกัด (ทิศเหนืออยู่ด้านบน) — กดจุดเพื่อดูตำแหน่งและเปิดใน Google Maps' : 'Google Maps — กดจุดเพื่อดูตำแหน่ง';
    if (mode === 'plan' && !tilesAllowed()) box.insertBefore(el('div', { class: 'map-warn', role: 'status' }, [el('b', { text: 'เปิดจากไฟล์ในเครื่อง จึงแสดงเป็นแผนผังตามพิกัด' }), el('span', { text: 'แผนที่ถนนและอาคารจะแสดงเมื่อเปิดผ่านเว็บไซต์ (http/https)' })]), box.firstChild);
    var out = pts.filter(function (p) { return p.outOfCampusBox; }).length;
    var note = $('mapNote'); if (note) note.textContent = num(pts.length) + ' จุดในช่วง ' + rangeText() + (out ? ' (อยู่นอกวิทยาเขต ' + out + ' จุด ควรตรวจพิกัด)' : '') + ' · อัปเดต ' + dLabel(am.updated);
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
    var n = NAV.filter(function (g) { return g.group === group; })[0], list = n ? n.children.reduce(function (a, c) { return a.concat([c], c.children || []); }, []) : []; if (list.length < 2) return null;
    return el('nav', { class: 'tabs', 'aria-label': 'แถบย่อยของ ' + n.label }, list.map(function (c) { return el('a', { href: '#' + c.id, 'aria-current': c.id === page ? 'page' : null, text: c.label }); }));
  }
  function extBtn(label, url, sec) { return el('a', { class: 'btn' + (sec ? ' sec' : ''), href: url, target: '_blank', rel: 'noopener' }, [label, ic('ext', 15)]); }
  /** หน้าทางเข้า: ฟังก์ชันที่ยังทำงานในระบบเดิม (branch main) และมีข้อมูลรายบุคคล/รายครั้ง จึงเปิดในระบบต้นทางแทนการคัดลอกข้อมูลมาแสดง */
  function entryCard(o) {
    var rows = [['สถานะ', el('span', { class: 'pill s-blocked', text: 'ยังไม่ได้ย้ายมาแสดงในระบบใหม่' })], ['เนื้อหาของหน้านี้', o.what], ['แหล่งข้อมูล', o.source],
      ['สิ่งที่ยังขาด', o.need || o.why], ['ตำแหน่งในระบบเดิม', o.menu]].filter(function (r) { return r[1]; });
    var dl = el('dl'); rows.forEach(function (r) { dl.appendChild(el('dt', { text: r[0] })); dl.appendChild(el('dd', {}, [r[1]])); });
    return el('div', { class: 'card entry stub' }, [el('h3', { text: o.cardTitle || 'หน้านี้ยังใช้งานในระบบใหม่ไม่ได้' }), dl,
      el('div', { class: 'btns' }, [oldUrl() ? extBtn('เปิดหน้านี้ในระบบเดิม (ทางเลือกชั่วคราว)', oldUrl(), true) : el('span', { class: 'kpi-na', text: 'ไม่มีลิงก์ที่ยืนยันได้' })])]);
  }
  var PII = 'ข้อมูลเป็นรายบุคคล (ชื่อ ตำแหน่ง เบอร์ติดต่อ รูปถ่าย) — ต้องมีระบบยืนยันตัวตนของเว็บไซต์ใหม่ และ API อ่านอย่างเดียวที่ตรวจสิทธิ์ผู้เรียก ก่อนจึงจะแสดงได้',
      NOSTAT = 'เป็นบันทึกและภาพถ่ายรายครั้ง — ต้องมีระบบยืนยันตัวตนของเว็บไซต์ใหม่ และ API อ่านอย่างเดียวของแท็บนี้ (ระบบเดิมอ่านผ่าน Apps Script ที่ใช้รหัสพนักงาน)';
  var OLD_SHEET = 'Sheet “ข้อมูลงานจราจรออนไลน์”';
  var ENTRY = {
  };
  Object.keys(ENTRY).forEach(function (id) {
    PAGES[id] = function (v) { var o = ENTRY[id]; v.appendChild(pageHead(o.title, o.desc)); v.appendChild(el('div', { class: 'sec' }, [entryCard(o)])); if (o.related) v.appendChild(systemsSection(o.related, o.relatedTitle)); };
  });
  PAGES.parking = function (v) {
    var rts = extra('ruenthaiSurvey'), gr = mod('graduationParking');
    v.appendChild(pageHead('ข้อมูลการจอดรถ', 'ลานจอดรถรายลาน แบบสำรวจลานจอดรถเรือนไทย และลานจอดช่วงพิธีพระราชทานปริญญาบัตร'));
    v.appendChild(lotsSection());
    if (rts) { var peak = rts.daily.slice().sort(function (a, b) { return b.count - a.count; })[0];
      v.appendChild(section('แบบสำรวจลานจอดรถเรือนไทย', { note: dLabel(rts.from).replace(/ \d{4}$/, '') + ' – ' + dLabel(rts.updated) }, [kpiGrid([
        { icon: 'file', label: 'แบบสำรวจที่ส่งแล้ว', value: num(rts.total), unit: 'ชุด', updated: rts.updated, color: C.c4 },
        { icon: 'calendar', label: 'วันที่ส่งมากที่สุด', value: num(peak.count), unit: 'ชุด', sub: dLabel(peak.date), color: C.c3 },
        { icon: 'chart', label: 'เฉลี่ยต่อวัน', value: num(rts.total / rts.daily.length, 1), unit: 'ชุด/วัน', sub: rts.daily.length + ' วันที่มีการส่ง', color: C.c5 },
        rts.live ? { icon: 'car', label: 'จำนวนรถ (Car_Count)', value: num(rts.live.carsDeclared), unit: 'คัน', sub: 'แยกจากจำนวนแบบสำรวจ · ข้อมูลสด', color: C.c5 } : { icon: 'users', label: 'แยกกลุ่มผู้ใช้ / จำนวนรถ', na: rts.liveErr ? srcWhy(rts.liveErr) : AUTH.on && !AUTH.user ? 'แสดงหลังเข้าสู่ระบบ' : 'ไฟล์สรุปมีเฉพาะจำนวนรายวัน', color: C.c5 }]),
        el('div', { style: 'margin-top:14px' }, [figure('จำนวนแบบสำรวจที่ส่งรายวัน', 'หน่วย: ชุด', bars(rts.daily.map(function (d) { return { label: (+d.date.slice(8)) + ' ' + TH_M[+d.date.slice(5, 7) - 1], full: dLabel(d.date) }; }),
          [{ name: 'แบบสำรวจที่ส่ง', color: C.c4, values: rts.daily.map(function (d) { return d.count; }) }], { unit: 'ชุด', int: true, h: 250, aria: 'แบบสำรวจลานจอดรถเรือนไทยรายวัน' }))])])); }
    if (gr) v.appendChild(section('ลานจอดงานพิธีพระราชทานปริญญาบัตร ปีการศึกษา 2568', { more: 'graduation' }, [kpiGrid(gr.days.map(function (d, i) {
      return { icon: 'cap', label: 'รถในลานจอด ' + dLabel(d.date), value: num(d.latestCount), unit: 'คัน', sub: d.occupancyPercent + '% ของความจุ ' + num(d.capacity) + ' คัน (' + d.lots + ' ลาน)', color: [C.c1, C.c3, C.c4][i] }; }))]));
    v.appendChild(systemsSection(['ruenthai', 'grad-parking'], 'ระบบต้นทาง'));
  };
  function simpleSys(id, title, desc, ids, secTitle) { PAGES[id] = function (v) { v.appendChild(pageHead(title, desc)); v.appendChild(systemsSection(ids, secTitle)); }; }
  simpleSys('event-incident', 'ระบบเหตุการณ์กิจกรรมพิเศษ', 'แบบฟอร์มและแดชบอร์ดรายงานเหตุการณ์ช่วงกิจกรรมพิเศษ — ยังไม่มีสถิติที่ยืนยันแหล่งข้อมูลได้ จึงแสดงเป็นลิงก์', ['event-incident'], 'ระบบต้นทาง');
  simpleSys('helmet-quiz', 'แบบทดสอบโครงการรณรงค์สวมหมวกนิรภัย', 'สื่อและแบบทดสอบความรู้ — เป็นลิงก์เปิดแบบทดสอบ (ตรวจแล้วเปิดได้) · หน้ารวมไม่ได้อ่านผลคะแนน จึงไม่มีสถิติแสดง', ['helmet-quiz', 'gate-tracker'], 'ระบบต้นทาง');
  simpleSys('aed', 'เครื่อง AED', 'แผนที่ตำแหน่งและความพร้อมใช้งานเครื่อง AED ในวิทยาเขตศาลายา (Google My Maps) — ไม่มีข้อมูลจำนวนเครื่องในรูปแบบที่ระบบอ่านยืนยันได้ จึงแสดงเป็นลิงก์', ['aed-map'], 'ระบบต้นทาง');
  /* ทะเบียนแบบฟอร์ม (แหล่งเดียวของเมนู การ์ด และช่องค้นหาในหน้านี้) — แบบฟอร์มหลัก + แบบบันทึกย่อยที่เติมข้อมูลอัตโนมัติ · ไม่มีรายการซ้ำ
   * ลิงก์ภายนอกเปิดแท็บใหม่ · แบบฟอร์มในระบบนี้ (#form-…) เปิดในหน้าเดียวกันและแสดงสถานะการบันทึกตามจริง */
  var FORM_REG = [
    { icon: '🚨', name: 'ระบบรายงานเหตุการณ์/แจ้งเหตุ (AI)', desc: 'แบบฟอร์มบันทึกเหตุการณ์ อุบัติเหตุ และการรับส่งผู้ป่วย พร้อมพิกัดจุดเกิดเหตุ', url: 'https://trafficoppe.github.io/report-incident-AI-v1/' },
    { icon: '🚗', name: 'แบบฟอร์มบันทึกจำนวนรถเข้าและผู้ไม่สวมหมวกนิรภัย', desc: 'แบบฟอร์มบันทึกจำนวนรถยนต์/รถจักรยานยนต์ และผู้ไม่สวมหมวกนิรภัย แยกประตู 1, 3, 4, 5, 6', url: 'https://trafficoppe.github.io/Form-Gate-Tracker-AI-v1/' },
    { icon: '🔍', name: 'แบบฟอร์มตรวจสภาพยานพาหนะ', desc: 'ตรวจสภาพยานพาหนะของงานตามรายการตรวจ 9 ข้อ', url: 'https://trafficoppe.github.io/trafficsystem/form.html',
      subs: [{ icon: '🧽', id: 'form-clean', desc: 'เลือกยานพาหนะจากหน้า ‘ยานพาหนะทั้งหมด’ เพื่อเติมรุ่นและทะเบียนให้อัตโนมัติ', from: 'vehicle-fleet' }] },
    { icon: '📄', name: 'แบบฟอร์มขอดูกล้องวงจรปิด', desc: 'ยื่นคำขอดูภาพจากกล้องวงจรปิด (CCTV) ส่วนกลาง', url: 'https://trafficoppe.github.io/trafficoppe/' },
    { icon: '🧯', name: 'แบบฟอร์มตรวจและเติมสารอุปกรณ์ดับเพลิง', desc: 'ตรวจสภาพถังดับเพลิงและอุปกรณ์ดับเพลิงตามจุดติดตั้ง', url: 'https://trafficoppe.github.io/-v1/',
      subs: [{ icon: '🧯', id: 'form-refill', desc: 'เลือกถังจากหน้า ‘อุปกรณ์ดับเพลิง’ เพื่อเติมชนิดและเลขที่ถังให้อัตโนมัติ', from: 'safety' }] },
    { icon: '🗺️', name: 'แบบฟอร์มรายงานการตรวจพื้นที่', desc: 'รายงานการตรวจพื้นที่ส่วนกลางพร้อมภาพ', url: 'https://docs.google.com/forms/d/e/1FAIpQLSfpYUu2jUggLW433-8F2N6tNxQ6Q84V-DY3wRkgOFXA3b_Ytw/viewform' },
    { icon: '🎒', name: 'แบบฟอร์ม Lost and Found', desc: 'แจ้งของหาย / แจ้งเก็บของได้ / รับของคืน', url: 'https://trafficoppe.github.io/lostfound/lostfound_form.html' },
    { icon: '📻', id: 'forms-radio', desc: 'บันทึกการรับแจ้งและการสั่งการของศูนย์วิทยุสื่อสาร' }
  ];
  var FORM_SYS = ['event-incident', 'borrow', 'guard-scan', 'guard-shift', 'guard-feedback-central', 'guard-feedback-unit', 'veh-staff', 'ruenthai', 'grad-parking', 'helmet-quiz'];
  function formState(id) { return HCFG.formApiUrl ? 'บันทึกผ่านบริการภายใน' : 'ตรวจความครบถ้วนได้ แต่ยังไม่เปิดการบันทึก'; }
  function formRow(f, sub) {
    var name = f.id ? FORM_DEFS[f.id].title : f.name, local = !!f.id;
    return el('li', { class: sub ? 'f-sub' : null }, [el('div', {}, [el('b', {}, [el('span', { class: 'f-ico', 'aria-hidden': 'true', text: f.icon }), ' ' + name]),
      el('span', { text: f.desc + (local ? ' · ' + formState(f.id) : ' · ' + formKind(f.url)) })]),
      local ? el('a', { class: 'btn sec', href: '#' + (f.from || f.id), text: f.from ? 'เลือกรายการ' : 'เปิดแบบฟอร์ม' }) : extBtn('เปิดแบบฟอร์ม', f.url, true)]);
  }
  PAGES.forms = function (v) {
    v.appendChild(pageHead('แบบฟอร์มทั่วไป', 'แบบฟอร์มที่ใช้งานอยู่ของงานจราจรและความปลอดภัย'));
    var q = el('input', { type: 'search', placeholder: 'ค้นหาชื่อแบบฟอร์ม…', 'aria-label': 'ค้นหาแบบฟอร์ม', value: state.formQ || '' }), box = el('div'), tm = null;
    var sys = FORM_SYS.map(function (id) { return SYS[id]; }).filter(function (x) { return x && x.links.length; });
    function hit(t) { var k = (state.formQ || '').trim().toLowerCase(); return !k || String(t).toLowerCase().indexOf(k) >= 0; }
    function draw() {
      box.textContent = ''; var n = 0;
      var main = el('ul', { class: 'list forms' }); FORM_REG.forEach(function (f) {
        var subs = (f.subs || []).filter(function (x) { return hit(FORM_DEFS[x.id].title + ' ' + x.desc); }), me = hit((f.name || FORM_DEFS[f.id].title) + ' ' + f.desc);
        if (!me && !subs.length) return; main.appendChild(formRow(f)); n++; subs.forEach(function (x) { main.appendChild(formRow(x, true)); n++; }); });
      var other = el('ul', { class: 'list forms' }); sys.filter(function (x) { return hit(x.name + ' ' + x.desc); }).forEach(function (x) { n++;
        other.appendChild(el('li', {}, [el('div', {}, [el('b', {}, [el('span', { class: 'f-ico', 'aria-hidden': 'true', text: formIcon(x.name) }), ' ' + x.name]), el('span', { text: x.desc })]), extBtn(x.links[0].label, x.links[0].url, true)])); });
      box.appendChild(el('p', { class: 'lu-count', role: 'status', text: num(n) + ' แบบฟอร์ม' }));
      if (main.childNodes.length) box.appendChild(section('แบบฟอร์มหลัก', { note: 'แบบบันทึกย่อยแสดงใต้แบบฟอร์มหลัก' }, [main]));
      if ((state.formQ || '').trim() && other.childNodes.length) (state.folds = state.folds || {})['แบบฟอร์มของระบบอื่นที่เกี่ยวข้อง'] = true;      /* กำลังค้นหาและพบในส่วนนี้ → เปิดให้เห็นผล */
      if (other.childNodes.length) box.appendChild(section('แบบฟอร์มของระบบอื่นที่เกี่ยวข้อง', { count: other.childNodes.length + ' แบบฟอร์ม · เปิดในแท็บใหม่' }, [other]));
      if (!n) box.appendChild(el('div', { class: 'empty', text: 'ไม่พบแบบฟอร์มที่ตรงกับคำค้นหา' }));
    }
    q.oninput = function () { clearTimeout(tm); tm = setTimeout(function () { state.formQ = q.value; draw(); }, 200); };
    v.appendChild(el('div', { class: 'lu-bar' }, [q])); v.appendChild(box); draw();
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
    var tableSec = section('ตารางเวรเดือน' + TH_MF[M - 1] + ' ' + (Y + 543), { note: shown + ' วัน · แถวสีเหลือง = วันนี้' }, [el('div', { class: 'ctrls', style: 'margin-bottom:10px' }, [ic('search'), q,
      el('span', { class: 'legend', style: 'margin:0' }, ['M', 'A', 'N', 'R'].map(function (c) { var s = ro.shifts[c]; return el('span', {}, [el('i', { style: 'background:' + SH[c] }), s.name + (s.start ? ' ' + s.start + '–' + s.end : '')]); }))]), tblWrap]);
    /* รายชื่อ/ตำแหน่งแต่ละผลัด: อยู่เหนือหัวข้อตารางเวรของเดือนที่เลือก และติดด้านบน (ใต้แถบหัวเว็บ) เฉพาะขณะเลื่อนดูตารางเวรเท่านั้น
     * จอเล็ก: ย่อ/ขยายได้ และเลื่อนแนวนอนดูครบ 4 ผลัด · รายชื่อมาจากฐานข้อมูลภายในหลัง Login (ไม่บันทึกในเครื่อง) */
    var collapsed = state.rosNamesCollapsed == null ? isMobile() : state.rosNamesCollapsed, strip = el('div', { class: 'ros-strip', id: 'rosStrip' }, ro.teams.map(function (t) {
      var names = rosterNames && rosterNames[String(t.no)] || [], code = today.charAt(t.no - 1);
      return el('div', { class: 'card ros-team', style: '--sh:' + SH[code] }, [el('h3', {}, ['ผลัด ' + t.no, el('small', { text: 'วันนี้: ' + (code === 'R' ? 'พักกะ' : 'เวร' + ro.shifts[code].name) })]),
        el('ul', {}, names.length ? names.map(function (p) { return el('li', {}, [el('b', { text: String(p.role || '') }), el('span', { text: String(p.name || '') })]); }) : t.roles.map(function (r) { return el('li', {}, [el('b', { text: r }), el('span', { text: rosterNamesState === 'loading' ? 'กำลังโหลด…' : 'ไม่แสดงชื่อ' })]); }))]); }));
    var tog = el('button', { type: 'button', class: 'btn-ghost ros-tog', 'aria-expanded': String(!collapsed), 'aria-controls': 'rosStrip', text: collapsed ? 'แสดงรายชื่อ' : 'ย่อรายชื่อ', onclick: function () { state.rosNamesCollapsed = !collapsed; route(true); } });
    var namesSec = el('section', { class: 'sec ros-names' + (collapsed ? ' collapsed' : ''), 'aria-label': 'ตำแหน่งและรายชื่อในแต่ละผลัด' }, [el('div', { class: 'sec-h' }, [el('h2', { text: 'ตำแหน่งในแต่ละผลัด' }),
      el('span', { class: 'note', text: rosterNames ? 'รายชื่อจากฐานข้อมูลภายใน (ไม่ถูกบันทึกในเครื่อง)' : rosterNamesState === 'failed' ? 'โหลดรายชื่อไม่สำเร็จ — แสดงเฉพาะตำแหน่ง' : 'รายชื่อไม่แสดงในรุ่นสาธารณะ' }), tog]), strip]);
    v.appendChild(el('div', { class: 'ros-wrap' }, [namesSec, tableSec]));
    if (CFG.rosterApiUrl && rosterNamesState === 'none') { rosterNamesState = 'loading';
      fetch(CFG.rosterApiUrl, { credentials: 'include', cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (j) { rosterNames = j && j.teams || null; rosterNamesState = 'ok'; if (currentPage() === 'roster') route(true); }).catch(function () { rosterNamesState = 'failed'; }); }

    v.appendChild(section('ที่มาและการคุ้มครองข้อมูล', {}, [el('div', { class: 'grid2' }, [
      el('div', { class: 'card box' }, [el('h3', { text: 'กติกาที่ใช้คำนวณ' }), el('p', { class: 'def', text: 'อ่านจากไฟล์ ' + ro.sourceFile + ' — ' + ro.anchor.note + ' แล้วอ่านกะของผลัด 1–4 จากตารางรอบ ' + ro.cycleDays + ' วัน' }), notesList(ro.notes),
        el('p', { class: 'src', text: 'หน้าตารางเวรของระบบเดิมอ่านจาก ' + OLD_SHEET + ' แท็บ ตารางเวร ซึ่งลำดับเวรบางช่วงไม่ตรงกับไฟล์ Excel ฉบับนี้ ควรยืนยันฉบับที่ใช้จริงก่อนเผยแพร่' })]),
      el('div', { class: 'card box' }, [el('h3', { text: 'การแสดงรายชื่อเจ้าหน้าที่' }), el('p', { class: 'def', text: CFG.rosterApiUrl ? (rosterNamesState === 'failed' ? 'เชื่อมต่อแหล่งรายชื่อที่จำกัดสิทธิ์ไม่สำเร็จ จึงแสดงเฉพาะผลัดและตำแหน่ง' : 'ตั้งค่าแหล่งรายชื่อที่จำกัดสิทธิ์ไว้แล้ว') : 'ยังไม่เชื่อมต่อแหล่งรายชื่อ — Repository นี้เป็นสาธารณะ จึงไม่มีชื่อเจ้าหน้าที่อยู่ในไฟล์ใดของหน้ารวม' }),
        notesList(AUTH.on ? ['รายชื่อเก็บในฐานข้อมูลของระบบภายใน และแสดงหลังเข้าสู่ระบบด้วยรหัสพนักงานเท่านั้น (ไม่บันทึกในเครื่อง)', 'ผู้ดูแลแก้ไขรายชื่อได้ที่ ตั้งค่า › ตั้งค่าการแสดงผล หัวข้อ “รายชื่อประจำผลัด”']
          : ['ถ้าต้องการแสดงชื่อ ต้องให้หน้าเว็บอยู่หลังการยืนยันตัวตน และเก็บรายชื่อในที่จัดเก็บที่จำกัดสิทธิ์ ไม่ใช่ใน Repository',
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
      el('div', { class: 'card set', id: 'set-ai-fab' }, [el('div', {}, [el('h3', { text: 'ปุ่มผู้ช่วย AI' }), el('p', { text: 'เลือกรูปแบบปุ่มลอยมุมขวาล่าง: รูปหุ่นยนต์ ปุ่มข้อความ “ถาม AI” หรือซ่อนไว้ (จำเฉพาะเบราว์เซอร์นี้) — ซ่อนแล้วยังเปิดผู้ช่วยได้จากปุ่มด้านขวานี้' })]),
        el('div', { class: 'set-ai' }, [fabModeCtl(), el('button', { type: 'button', class: 'btn sec', text: 'เปิดผู้ช่วย AI', onclick: function () { if (window.hubOpenChat) window.hubOpenChat(); } })])]),
      el('div', { class: 'card set' }, [el('div', {}, [el('h3', { text: 'ภาษาของระบบ' }), el('p', { text: 'รุ่นทดลองนี้มีเฉพาะภาษาไทย · ระบบเดิมสลับ TH/EN ได้ — ยังไม่ได้แปลหน้ารวมรุ่นใหม่เป็นภาษาอังกฤษ' })]), el('span', { class: 'pill s-link', text: 'ไทย (TH)' })]),
      el('div', { class: 'card set' }, [el('div', { style: 'flex-basis:100%' }, [el('h3', { text: 'หมวดที่แสดงในเมนู' }), el('p', { text: 'เอาเครื่องหมายออกเพื่อซ่อนหมวดที่ไม่ได้ใช้ (หน้าหลักและตั้งค่าระบบซ่อนไม่ได้ · หน้าที่ซ่อนยังเปิดจากลิงก์ตรงได้)' })]), checks]),
      el('div', { class: 'card set' }, [el('div', {}, [el('h3', { text: 'ล้างค่าที่บันทึกในเครื่องนี้' }), el('p', { text: 'คืนค่า Sidebar โหมดหน้าจอ และหมวดที่ซ่อน กลับเป็นค่าเริ่มต้น' })]),
        el('button', { type: 'button', class: 'btn sec', text: 'คืนค่าเริ่มต้น', onclick: function () { ['hub.sb', 'hub.hide', 'hub.theme', 'hub.mini', 'hub.aiFab', 'hub.chart', 'hub.chartLayout'].forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} }); hiddenCats = {}; setTheme('light', true); setSbMode('auto'); route(true); } })])]));
    var g = DATA.stats.generatedAt || '', mods = DATA.stats.modules || {};
    v.appendChild(section('สถานะข้อมูลและเวลาอัปเดต', { note: 'ไฟล์สรุป (snapshot) สร้างเมื่อ ' + dLabel(g.slice(0, 10) + ' ' + g.slice(11, 16)) + ' (เวลาไทย) — ไม่ใช่เวลาที่อ่านข้อมูลสด', more: 'systems' }, [table(['ชุดข้อมูล', 'สถานะ', 'แหล่งข้อมูล', 'อัปเดตล่าสุดของต้นทาง'],
      Object.keys(MOD_NAME).filter(function (k2) { return mods[k2]; }).map(function (k2) { var m = mods[k2], st = m.status || 'connected', up = m.updated || m.computedAt || (m.central && m.central.updated);
        return [MOD_NAME[k2], el('span', { class: 'pill s-' + st, text: STATUS[st] || st }), m.source || (m.central ? m.central.source + ' / ' + m.unit.source : '–'), up ? dLabel(up) : 'ไม่มีข้อมูลยืนยัน']; }))]));
    v.appendChild(section('ผู้ช่วย AI ถามสถิติ', { more: 'ai' }, [aiStatusCard()]));
  };
  function aiStatusCard() {
    var on = !!CFG.aiApiUrl;
    return el('div', { class: 'card set' }, [el('div', {}, [el('h3', {}, ['สถานะ: ', el('span', { class: 'pill ' + (on ? 's-warn' : 's-off'), text: on ? 'ตั้งค่า Backend แล้ว (ยังไม่ได้ทดสอบ)' : 'ยังเชื่อมต่อผู้ช่วย AI ไม่ได้' })]),
      el('p', { text: on ? 'ปุ่มผู้ช่วย AI มุมล่างขวาจะส่งคำถามและช่วงเวลาที่กำลังดูไปยังบริการที่ตั้งค่าไว้' : 'ปุ่มผู้ช่วย AI มุมล่างขวาเปิดได้ แต่ยังไม่ส่งคำถามไปยังบริการใด ๆ จนกว่าจะตั้งค่าบริการที่ตรวจตัวตน (โค้ดอยู่ที่ server/functions/api/chat.js — ยังไม่ได้ Deploy)' })]),
      el('div', { class: 'btns', style: 'margin:0' }, [SYS['dashboard-ai'] ? extBtn('เปิด Dashboard AI เดิม', SYS['dashboard-ai'].links[0].url) : null, el('a', { class: 'btn sec', href: '#ai', text: 'รายละเอียด' })])]);
  }
  PAGES.ai = function (v) {
    v.appendChild(pageHead('ผู้ช่วย AI ถามสถิติ', 'สถานะการเชื่อมต่อและเงื่อนไขความปลอดภัยก่อนเปิดใช้ในหน้ารวม'));
    v.appendChild(el('div', { class: 'sec' }, [aiStatusCard()]));
    v.appendChild(el('div', { class: 'sec' }, [el('div', { class: 'card set' }, [el('div', {}, [el('h3', { text: 'ปุ่มผู้ช่วย AI' }), el('p', { text: fabMode() === 'hidden' ? 'ขณะนี้ซ่อนปุ่มลอยไว้ — เลือกแบบปุ่มเพื่อแสดงอีกครั้ง หรือกด “เปิดผู้ช่วย AI”' : 'เลือกรูปแบบปุ่มลอยมุมขวาล่าง' })]),
      el('div', { class: 'set-ai' }, [fabModeCtl(), el('button', { type: 'button', class: 'btn sec', text: 'เปิดผู้ช่วย AI', onclick: function () { if (window.hubOpenChat) window.hubOpenChat(); } })])])]));
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
        'โค้ดบริการอยู่ที่ server/functions/api/chat.js (ตรวจ JWT ของ Cloudflare Access จำกัดจำนวนคำถาม และตรวจตัวเลขในคำตอบ) — ทดสอบ local ด้วยข้อมูลจำลองแล้ว ยังไม่ได้ Deploy และยังไม่เคยเรียกบริการ AI จริง', 'เมื่อผู้ดูแล Deploy และตั้งค่าลับแล้ว ใส่ URL ใน config.js (aiApiUrl)'])])])]));
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
  PAGES.tram = function (v) {
    var t = extra('tram'), aw = extra('anywheel');
    v.appendChild(pageHead('รถรางและจักรยาน Anywheel', 'สรุปยอดเดินรถรางและการใช้จักรยาน Anywheel', rangeCtrl()));
    if (t) { var tr = tramRows(), sum = function (k2) { return tr.reduce(function (a, r) { return a + r[k2]; }, 0); };
      v.appendChild(section('สรุปยอดเดินรถราง', { note: rangeText() + ' · ข้อมูลถึง ' + dLabel(t.updated) }, [kpiGrid([
        { icon: 'file', label: 'จำนวนงาน', value: num(sum('jobs')), unit: 'งาน', color: C.c3 }, { icon: 'chart', label: 'จำนวนรอบ', value: num(sum('rounds')), unit: 'รอบ', color: C.c1 },
        { icon: 'map', label: 'ระยะทางรวม', value: num(sum('km')), unit: 'กม.', color: C.c4 }, { icon: 'car', label: 'รถที่ให้บริการ', value: num(sum('trams')), unit: 'คัน-ครั้ง', color: C.c2 },
        { icon: 'clock', label: 'ระยะเวลาให้บริการ', value: num(sum('minutes') / 60, 1), unit: 'ชม.', color: C.c5 }])]));
      v.appendChild(el('div', { class: 'sec grid2' }, [figure('จำนวนงานรายเดือน', 'หน่วย: งาน', tramChart('jobs', 'จำนวนงาน', 'งาน', C.c3)), figure('จำนวนรอบรายเดือน', 'หน่วย: รอบ', tramChart('rounds', 'จำนวนรอบ', 'รอบ', C.c1)),
        figure('ระยะทางรายเดือน', 'หน่วย: กิโลเมตร', tramChart('km', 'ระยะทาง', 'กม.', C.c4)), figure('แยกตามส่วนงาน — ' + mFull(t.byDept.month), 'หน่วย: งาน · ท้ายแท่ง = จำนวนรอบ', tramDeptChart())]));
      v.appendChild(section('ตารางรายเดือน', {}, [table(['เดือน', 'งาน', 'รอบ', 'ระยะทาง (กม.)', 'รถ (คัน-ครั้ง)', 'เวลา (ชม.)'], tr.map(function (r) { return [mFull(r.month), r.jobs, r.rounds, r.km, r.trams, num(r.minutes / 60, 1)]; }), { num: [1, 2, 3, 4, 5] })])); }
    if (aw) { var awm = aw.monthly.filter(function (r) { return inRange(r.month); }), as = function (k2) { return awm.reduce(function (a, r) { return a + (r[k2] || 0); }, 0); };
      v.appendChild(section('สรุปการใช้จักรยาน Anywheel', { note: rangeText() + ' · ' + awDataTxt() }, [awStateNode()].concat(awm.length ? [kpiGrid([
        { icon: 'chart', label: 'จำนวนครั้งการใช้งาน', value: num(as('trips')), unit: 'ครั้ง', scope: rangeText(), color: C.c1 }, { icon: 'map', label: 'ระยะทางรวม', value: num(Math.round(as('km'))), unit: 'กม.', color: C.c4 },
        { icon: 'calendar', label: 'เฉลี่ยต่อวันที่มีข้อมูล', value: num(Math.round(as('trips') / as('days'))), unit: 'ครั้ง/วัน', color: C.c3 }]),
        el('div', { class: 'grid2', style: 'margin-top:14px' }, [figure('จำนวนครั้งการใช้งานรายเดือน', 'หน่วย: ครั้ง', bars(mCols(awm), [{ name: 'จำนวนครั้งการใช้งาน', color: C.c1, values: awm.map(function (r) { return r.trips; }) }], { unit: 'ครั้ง', int: true, h: 230 })),
          figure('ตารางรายเดือน', 'หน่วย: ครั้ง · กม. · ชม.', table(['เดือน', 'วันที่มีข้อมูล', 'จำนวนครั้ง', 'ระยะทาง (กม.)', 'เวลาใช้งาน (ชม.)'], awm.map(function (r) { return [mFull(r.month), awDaysTxt(r), num(r.trips), num(Math.round(r.km)), awMinTxt(r)]; }), { num: [1, 2, 3, 4] }))])]
        : [el('div', { class: 'card box' }, [el('p', { class: 'kpi-na', text: 'ยังไม่มีข้อมูลในช่วงที่เลือก (ไม่ใช่ยอด 0)' }), el('p', { class: 'src', text: 'ต้นทางมีข้อมูล ' + mLabel(aw.monthly[0].month) + ' – ' + mLabel(aw.monthly[aw.monthly.length - 1].month) })])]))); }
  };
  PAGE_TITLE.tram = 'รถรางและจักรยาน Anywheel';

  /* ---------- Lost & Found: รายการและรูป (ดึงสดจากระบบต้นทางเฉพาะโหมดระบบภายใน — ไม่มีข้อมูลรายการฝังในไฟล์ของหน้ารวม) ---------- */
  var lfState = { loading: false, records: null, err: '', q: '', type: 'all', page: 1 };
  function lfImg(id, sz) { return /^[A-Za-z0-9_-]{20,}$/.test(String(id || '')) ? 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(id) + '&sz=' + (sz || 'w400') : ''; }
  function lightbox(src, caption) {
    var close = function () { ov.remove(); document.removeEventListener('keydown', onKey); if (last) last.focus(); }, onKey = function (e) { if (e.key === 'Escape') close(); }, last = document.activeElement;
    var img = el('img', { alt: caption, referrerpolicy: 'no-referrer' }), msg = el('p', { text: caption });
    img.onerror = function () { img.remove(); msg.textContent = 'กำลังตรวจสาเหตุ…'; imgWhy(src, function (why) { msg.textContent = why + ' — ' + caption; }); };
    var btn = el('button', { type: 'button', class: 'btn sec', text: 'ปิด', onclick: close });
    var ov = el('div', { class: 'lightbox', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'ภาพขยาย: ' + caption, onclick: function (e) { if (e.target === ov) close(); } }, [el('div', { class: 'lb-in' }, [img, msg, btn])]);
    img.src = src; document.body.appendChild(ov); document.addEventListener('keydown', onKey); btn.focus();
  }
  function renderLfList() {
    var box = $('lfList'); if (!box) return; box.textContent = '';
    var srcBtn = SYS.lostfound && SYS.lostfound.links[0] ? extBtn('เปิดระบบ Lost & Found ต้นทาง', SYS.lostfound.links[0].url, true) : null;
    if (!CFG.internalMode || !CFG.lostfoundApiUrl) { box.appendChild(el('div', { class: 'card entry' }, [el('h3', { text: 'รายการและรูปภาพแสดงเมื่อเปิดผ่านระบบภายใน' }),
      el('p', { text: 'รุ่นที่เปิดอยู่นี้ยังไม่มีการยืนยันตัวตน จึงแสดงเฉพาะสถิติรวม เมื่อเปิดผ่านระบบภายใน ส่วนนี้จะดึงรายการและรูปจากระบบ Lost & Found โดยตรงทุกครั้งที่เปิดหน้า' }), el('div', { class: 'btns' }, [srcBtn])])); return; }
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
        el('h3', { text: r.title || '(ไม่ระบุชื่อสิ่งของ)' }), el('p', { text: r.location || 'ไม่ระบุสถานที่' }), el('p', { class: 'src', text: [r.refCode, when].filter(Boolean).join(' · ') }), r.name ? el('p', { class: 'src', text: 'ผู้แจ้ง: ' + r.name }) : null,
        el('p', { class: 'lf-st', text: r.actionText || r.status || 'รอดำเนินการ' })])]); })));
    box.appendChild(el('div', { class: 'ctrls', style: 'margin-top:12px;justify-content:center' }, [el('button', { type: 'button', class: 'btn-ghost', text: '‹ ก่อนหน้า', disabled: lfState.page <= 1 ? 'disabled' : null, onclick: function () { lfState.page--; renderLfList(); } }),
      el('span', { text: 'หน้า ' + lfState.page + ' / ' + pages + ' · ' + num(rows.length) + ' รายการ' }), el('button', { type: 'button', class: 'btn-ghost', text: 'ถัดไป ›', disabled: lfState.page >= pages ? 'disabled' : null, onclick: function () { lfState.page++; renderLfList(); } })]));
  }

  /* ---------- เหตุการณ์กิจกรรมพิเศษ · แบบทดสอบหมวกนิรภัย · ข้อมูลระบบเพิ่มเติม ---------- */
  PAGES['event-incident'] = function (v) {
    var e = extra('eventIncidents');
    if (AUTH.on && AUTH.user) {                 /* หลัง Login: รายการจริงจาก Sheet1 ผ่านบริการภายใน (ไม่ใช้ภาพรวมจากไฟล์ที่สร้างไว้ก่อน) */
      v.appendChild(pageHead('รายงานเหตุการณ์กิจกรรมพิเศษ', 'รายการเหตุการณ์ช่วงกิจกรรมพิเศษจากแบบรายงานต้นทาง — ค้นหา กรองวันที่ ประเภท และระดับ พร้อมภาพประกอบ'));
      v.appendChild(eventsSection()); v.appendChild(systemsSection(['event-incident'], 'ระบบต้นทาง (เปิดเมื่อต้องรายงานเหตุการณ์จริง)')); return;
    }
    v.appendChild(pageHead('ระบบเหตุการณ์กิจกรรมพิเศษ', 'สรุปรายงานเหตุการณ์ช่วงกิจกรรมพิเศษ — เฉพาะจำนวนรวม ไม่มีชื่อผู้รายงานหรือรายละเอียดรายครั้ง'));
    if (!e) { v.appendChild(el('div', { class: 'card box' }, [el('p', { class: 'kpi-na', text: 'ยังเชื่อมต่อไม่ได้' })])); }
    else { var lv = e.levels.map(function (_, i) { return e.byType.reduce(function (a, t) { return a + t.counts[i]; }, 0); }), col = [C.fine, C.c2, C.c1];
      v.appendChild(el('div', { class: 'sec' }, [kpiGrid([{ icon: 'alert', label: 'รายงานทั้งหมด', value: num(e.total), unit: 'รายการ', sub: dLabel(e.from) + ' – ' + dLabel(e.to), color: C.c3 }].concat(e.levels.map(function (n, i) { return { icon: i === 2 ? 'check' : 'alert', label: n, value: num(lv[i]), unit: 'รายการ', color: col[i] }; })))]));
      v.appendChild(el('div', { class: 'sec grid2' }, [figure('จำนวนรายงานแยกประเภทเหตุการณ์', 'หน่วย: รายการ · แยกสีตามระดับเหตุการณ์ · ตรวจ ' + dLabel(e.checkedAt),
        bars(e.byType.map(function (t) { return { label: t.type, full: t.type }; }), e.levels.map(function (n, i) { return { name: n, color: col[i], values: e.byType.map(function (t) { return t.counts[i]; }) }; }), { cat: true, unit: 'รายการ', int: true, h: 260, aria: 'รายงานกิจกรรมพิเศษแยกประเภท' }))])); }
    v.appendChild(systemsSection(['event-incident'], 'ระบบต้นทาง (เปิดเมื่อต้องรายงานเหตุการณ์จริง)'));
  };
  PAGES['helmet-quiz'] = function (v) {
    var s = SYS['helmet-quiz'];
    v.appendChild(pageHead('แบบทดสอบโครงการรณรงค์สวมหมวกนิรภัย 100%', 'แบบทดสอบความรู้เรื่องหมวกนิรภัย — เป็นแบบทดสอบที่ไม่มีการเก็บผลลง Sheet จึงไม่มีสถิติผู้ทำแบบทดสอบ'));
    v.appendChild(el('div', { class: 'sec' }, [el('div', { class: 'card entry' }, [el('h3', { text: 'ทำแบบทดสอบ' }), el('p', { text: 'กดปุ่มด้านล่างเพื่อเปิดหน้าแบบทดสอบ (เปิดในแท็บใหม่) ผลคะแนนแสดงให้ผู้ทำเห็นทันทีและไม่ถูกบันทึกไว้ในระบบใด' }),
      el('div', { class: 'btns' }, [s && s.links[0] ? extBtn('กดเพื่อทำแบบทดสอบ', s.links[0].url) : el('span', { class: 'kpi-na', text: 'ไม่มีลิงก์ที่ยืนยันได้' })])])]));
  };
  /* รายงาน รปภ. งานปริญญา (GPS): เฉพาะจำนวนรวมตามวันและสถานะพิกัด — ไม่มีชื่อ พิกัดรายรายงาน รูป หรือเส้นทางบุคคล และแยกจากแผนที่อุบัติเหตุ */
  PAGES['grad-2568-gps'] = function (v) {
    var gps = extra('gradGuardGps'), K = ['within', 'outside', 'postNoCoords', 'lowAccuracy'], col = [C.c1, C.c2, C.c5, C.fine];
    if (AUTH.on && AUTH.user) {                 /* หลัง Login: อ่านแท็บ Reports จริงผ่านบริการภายใน */
      v.appendChild(pageHead(GPS_TITLE, 'รายงานการปฏิบัติงาน รปภ.เอกชน ช่วงพิธีพระราชทานปริญญาบัตร ปีการศึกษา 2568 (จัดเดือน ต.ค. 2569) — พิกัดเป็นของรายงาน ณ เวลาที่ส่ง ไม่ใช่ตำแหน่งสด'));
      v.appendChild(gpsSection()); v.appendChild(systemsSection(['grad-guard-report'], 'ระบบต้นทาง (เปิดเมื่อต้องส่งรายงาน)')); return;
    }
    v.appendChild(pageHead(GPS_TITLE, 'รายงานการปฏิบัติงาน รปภ.เอกชน ช่วงพิธีพระราชทานปริญญาบัตร ปีการศึกษา 2568 — จำนวนรายงานตามวันและสถานะพิกัดเทียบจุดปฏิบัติงาน · ตรวจ ' + ((extra('gradGuardGps') || {}).checkedAt ? dLabel(extra('gradGuardGps').checkedAt) : '')));
    if (!gps) { v.appendChild(el('div', { class: 'card box' }, [el('p', { class: 'kpi-na', text: 'ยังเชื่อมต่อไม่ได้' })])); return; }
    var sum = function (k2, days) { return (days || gps.days).reduce(function (a, d) { return a + d[k2]; }, 0); }, ev = gps.days.filter(function (d) { return gps.eventDays.indexOf(d.date) >= 0; });
    v.appendChild(el('div', { class: 'sec' }, [kpiGrid([
      { icon: 'file', label: 'รายงานทั้งหมด', value: num(gps.total), unit: 'รายงาน', sub: dLabel(gps.days[0].date) + ' – ' + dLabel(gps.updated), color: C.c3 },
      { icon: 'cap', label: 'รายงานในวันพิธี (3, 5, 6 ต.ค.)', value: num(sum('total', ev)), unit: 'รายงาน', sub: ev.map(function (d) { return d.total; }).join(' / ') + ' รายงาน', color: C.c1 },
      { icon: 'check', label: 'อยู่ในรัศมีจุดปฏิบัติงาน', value: num(sum('within')), unit: 'รายงาน', sub: (100 * sum('within') / gps.total).toFixed(1) + '% ของรายงานทั้งหมด', color: C.c1 },
      { icon: 'alert', label: 'อยู่นอกรัศมี', value: num(sum('outside')), unit: 'รายงาน', sub: 'ความแม่นยำ GPS ต่ำ ' + sum('lowAccuracy') + ' รายงาน', color: C.c2 },
      { icon: 'map', label: 'จุดปฏิบัติงานยังไม่มีพิกัดอ้างอิง', value: num(sum('postNoCoords')), unit: 'รายงาน', sub: 'คำนวณระยะจากจุดไม่ได้', color: C.c5 }])]));
    v.appendChild(el('div', { class: 'sec grid2' }, [
      figure('จำนวนรายงานตามวัน แยกสถานะพิกัด', 'หน่วย: รายงาน',
        bars(gps.days.map(function (d) { return { label: (+d.date.slice(8)) + ' ' + TH_M[+d.date.slice(5, 7) - 1], full: dLabel(d.date) + (gps.eventDays.indexOf(d.date) >= 0 ? ' (วันพิธี)' : ' (ก่อนวันพิธี)') }; }),
          K.map(function (k2, i) { return { name: gps.statusNames[k2].split(' — ')[1], color: col[i], values: gps.days.map(function (d) { return d[k2]; }) }; }), { unit: 'รายงาน', int: true, h: 270, aria: 'รายงาน รปภ. งานปริญญาตามวัน' })),
      el('div', { class: 'card box' }, [el('h3', { text: 'ผลตรวจรายงาน' }), miniStats([[num((gps.recordStatus || {}).COMPLETE), 'สถานะบันทึกสมบูรณ์'], [num(gps.total - ((gps.recordStatus || {}).COMPLETE || 0)), 'คัดออก'], [num(gps.coords.inCampusBox), 'พิกัดอยู่ในวิทยาเขต'], [num(gps.coords.outsideCampusBox), 'พิกัดอยู่นอกวิทยาเขต']]),
        el('p', { class: 'def', text: 'เป็นข้อมูลย้อนหลัง ณ เวลาที่ส่งรายงาน ไม่ใช่ตำแหน่งสด · หน้านี้แสดงเฉพาะจำนวนรวม ไม่แสดงพิกัดรายบุคคล และแยกจากแผนที่จุดเกิดอุบัติเหตุ' })])]));
    v.appendChild(section('ตารางรายวัน', {}, [table(['วันที่', 'รายงาน', 'ในรัศมี', 'นอกรัศมี', 'จุดไม่มีพิกัดอ้างอิง', 'ความแม่นยำต่ำ'], gps.days.map(function (d) { return [dLabel(d.date), d.total, d.within, d.outside, d.postNoCoords, d.lowAccuracy]; }),
      { num: [1, 2, 3, 4, 5], foot: ['รวม', gps.total, sum('within'), sum('outside'), sum('postNoCoords'), sum('lowAccuracy')] })]));
    v.appendChild(systemsSection(['grad-guard-report'], 'ระบบต้นทาง (เปิดเมื่อต้องส่งหรือดูรายงานรายรายการ)'));
  };
  PAGES['admin-info'] = function (v) {
    var mods = DATA.stats.modules || {}, ex = DATA.extra || {}, g = DATA.stats.generatedAt || '', row = function (name, m) { var st = m.status === 'ok' ? 'connected' : (m.status || 'connected'); return [name, el('span', { class: 'pill s-' + st, text: STATUS[st] || st }), m.source || '–', dLabel(m.updated || m.checkedAt || m.computedAt || '') || '–']; };
    v.appendChild(pageHead('ข้อมูลระบบเพิ่มเติม', 'สำหรับผู้ดูแลระบบ: แหล่งข้อมูล เวลาอัปเดต ข้อจำกัด และระบบที่ยังเชื่อมต่อไม่ได้ — ฉบับเต็มอยู่ในไฟล์ docs/ข้อมูลระบบเพิ่มเติม.md'));
    v.appendChild(section('แหล่งข้อมูลของสถิติแต่ละชุด', { note: 'ไฟล์สถิติหลัก ' + dLabel(g.slice(0, 10) + ' ' + g.slice(11, 16)) + ' · ข้อมูลเสริม ' + dLabel((ex.generatedAt || '').slice(0, 10) + ' ' + (ex.generatedAt || '').slice(11, 16)) + ' (เวลาไทย)' }, [table(['ชุดข้อมูล', 'สถานะ', 'แหล่งข้อมูล', 'ข้อมูลล่าสุด/ตรวจเมื่อ'],
      Object.keys(MOD_NAME).filter(function (k2) { return mods[k2]; }).map(function (k2) { var m = mods[k2]; return row(MOD_NAME[k2], m.source ? m : { status: m.status, source: m.central ? m.central.source + ' / ' + m.unit.source : '', updated: m.updated || m.computedAt || (m.central && m.central.updated) }); })
        .concat([['รถราง', ex.tram], ['จักรยาน Anywheel', ex.anywheel], ['สถานะ Lost & Found รายเดือน', ex.lostfoundStatus], ['เหตุการณ์กิจกรรมพิเศษ', ex.eventIncidents], ['รายงาน รปภ. งานปริญญา (GPS)', ex.gradGuardGps], ['แบบสำรวจลานจอดรถเรือนไทย', ex.ruenthaiSurvey], ['แผนกำลังพล รปภ.เอกชน', ex.guardManpower]].filter(function (x) { return x[1]; }).map(function (x) { return row(x[0], x[1]); })))]));
    ADMIN_VIEW = true;
    var boxes = Object.keys(MOD_NAME).filter(function (k2) { return mods[k2] && (mods[k2].definition || (mods[k2].notes || []).length); }).map(function (k2) { return infoBox(MOD_NAME[k2], mods[k2]); });
    ['central', 'unit'].forEach(function (k2) { var gsat = mods.guardSatisfaction; if (gsat && gsat[k2]) boxes.push(infoBox('ความพึงพอใจ ' + gsat[k2].name, gsat[k2])); });
    [['รถราง', ex.tram], ['จักรยาน Anywheel', ex.anywheel], ['สถานะ Lost & Found รายเดือน', ex.lostfoundStatus], ['เหตุการณ์กิจกรรมพิเศษ', ex.eventIncidents], ['แบบสำรวจลานจอดรถเรือนไทย', ex.ruenthaiSurvey], ['แผนกำลังพล รปภ.เอกชน', ex.guardManpower]].forEach(function (x) {
      if (!x[1]) return; var d = x[1].definitions ? Object.keys(x[1].definitions).map(function (k3) { return x[1].definitions[k3]; }).join(' · ') : x[1].definition;
      boxes.push(infoBox(x[0], { definition: d, source: x[1].source, updated: x[1].updated || x[1].checkedAt, notes: x[1].notes })); });
    if (ex.gradGuardGps) { var gp = ex.gradGuardGps; boxes.push(infoBox('รายงาน รปภ. งานปริญญา (GPS)', { definition: Object.keys(gp.statusNames).map(function (k3) { return gp.statusNames[k3]; }).join(' · '), source: gp.source, updated: gp.checkedAt,
      notes: gp.notes.concat(['พิกัด: เป็นตัวเลขครบ ' + gp.coords.numeric + ' · กรอบวิทยาเขต ' + gp.coords.box + ' · นอกกรอบ ' + gp.coords.outsideCampusBox + ' — ' + gp.coords.outsideDetail]) })); }
    ADMIN_VIEW = false;
    v.appendChild(section('นิยาม วิธีนับ และข้อสังเกตของแต่ละชุดข้อมูล', { note: 'ย้ายมาจากหน้าใช้งานทั่วไป' }, [el('div', { class: 'grid2' }, boxes.filter(Boolean))]));
    var pend = ex.pending || {};
    if (Object.keys(pend).length) v.appendChild(section('Sheet ที่เปิดอ่านได้แล้วแต่ยังไม่ได้สรุปสถิติ', {}, [el('ul', { class: 'list' }, Object.keys(pend).map(function (k2) { var p = pend[k2]; return el('li', {}, [el('div', {}, [el('b', { text: p.name + ' — แท็บ ' + p.tab }), el('span', { text: p.state + ' · สิ่งที่ต้องทำ: ' + p.action })])]); }))]));
    v.appendChild(section('ข้อจำกัดที่ควรทราบ', {}, [el('div', { class: 'card box' }, [notesList([
      'รถเข้า: ต้นทาง (แท็บ จำนวนรถเข้า+หมวกนิรภัย) มีเฉพาะจำนวนรถเข้า 5 ประตู ไม่มีจำนวนรถออก',
      'แผนที่: ใช้ไทล์มาตรฐานของ OpenStreetMap (แหล่งเดียวกับระบบเดิม) ซึ่งกำหนดให้คำขอมี Referer ของเว็บไซต์ — เปิดผ่าน http/https จึงเห็นแผนที่ถนนและอาคาร · เปิดไฟล์จากเครื่อง (file://) เบราว์เซอร์ไม่ส่ง Referer จึงไม่เรียกไทล์และแสดงแผนผังตามพิกัดแทน',
      'Lost & Found: รายการและรูปดึงสดจาก API สาธารณะของระบบ Lost & Found (getPublicData — ไม่มีชื่อ/เบอร์โทรผู้แจ้ง) เฉพาะเมื่อ config.js ตั้ง internalMode: true · ค่าใน Repository คือ false',
      'รถเข้า: ผู้ไม่สวมหมวกบางวันมากกว่าจำนวนรถจักรยานยนต์ที่นับได้ (อัตรารวมสูงผิดสังเกต) ควรตรวจการกรอกที่ต้นทาง',
      'เหตุการณ์: ต้นทางไม่มีคอลัมน์ผู้เสียชีวิต และคอลัมน์สาเหตุเป็นข้อความอิสระ จึงไม่แสดงจำนวนผู้เสียชีวิตและสัดส่วนสาเหตุ',
      'ผู้ช่วย AI: ยังเชื่อมต่อไม่ได้ เพราะ Endpoint เดิมไม่มีการยืนยันตัวตนและตอบจากข้อมูลรายแถว',
      ex.anywheel ? 'Anywheel: ' + awStateTxt() + (ex.anywheel.monthly.some(function (r) { return r.minutes == null; }) ? ' · เวลาการใช้งานไม่มี/ไม่ครบใน ' + ex.anywheel.monthly.filter(function (r) { return r.minutes == null && r.month >= '2026-01'; }).map(function (r) { return mLabel(r.month); }).join(', ') : '') : null].filter(Boolean))])]));      /* รอบ 14.3: สถานะจากข้อมูลจริง ไม่ฝังเดือน */
  };
  PAGE_TITLE['admin-info'] = 'ข้อมูลระบบเพิ่มเติม';

  /* ---------- เริ่มทำงาน ---------- */

  /* ======================================================================
   * รอบ 7 — หน้าแรกแบบ “วันนี้ก่อน แนวโน้มอยู่ด้านล่าง”
   * A ส่วนต้น: วันที่ (เวลาไทย ณ ตอนเปิด) + ตัวเลือก วันนี้ / เดือนนี้ / ปีนี้ / กำหนดช่วง
   * B ข้อมูลตามช่วงที่เลือก: หนึ่งการ์ดต่อหนึ่งเรื่อง (ตัวเลขหลัก + 2–3 ค่า + กราฟจิ๋ว) — ไม่มีข้อมูลของวันนั้น = บอกว่าไม่มี ไม่แสดงเป็น 0
   * C แนวโน้มรายเดือน: หนึ่งกราฟต่อหนึ่งเรื่อง ไม่ขึ้นกับตัวเลือก “วันนี้” — คลิกกราฟ/หัวการ์ดเพื่อเปิดหน้ารายละเอียด
   * ตาราง รายการ และคำอธิบายแหล่งข้อมูลอยู่ในหน้ารายละเอียด / รายงานประจำเดือน / ข้อมูลระบบเพิ่มเติม
   * ==================================================================== */
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function todayStr() { var n = bkkNow(); return n.y + '-' + pad2(n.m) + '-' + pad2(n.d); }
  function dShort(s) { return (+s.slice(8, 10)) + ' ' + TH_M[+s.slice(5, 7) - 1]; }
  function addDays(s, n) { var d = new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) + n * 86400000); return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate()); }
  /* แต่ละหน้าจำช่วงเดือนของตัวเอง: หน้าแรก (ปีนี้) / รายงานประจำเดือน (เดือนเดียว) / หน้าอื่น (ทั้งหมด) */
  function scopeRange(key, def) {
    var s = state.scopes || (state.scopes = {});
    if (state.rerender && state.scopeKey === key) s[key] = { from: state.from, to: state.to };
    else { if (!s[key]) s[key] = def; state.from = s[key].from; state.to = s[key].to; }
    state.scopeKey = key;
  }
  function yearRange() { var y = todayStr().slice(0, 4), ms = MONTHS.filter(function (m) { return m.slice(0, 4) === y; }); return ms.length ? { from: ms[0], to: ms[ms.length - 1] } : { from: MONTHS[0], to: MONTHS[MONTHS.length - 1] }; }
  function periodOf() {
    var t = todayStr(), cm = t.slice(0, 7), k = state.period || 'today';
    if (k === 'today') return { kind: k, day: t, cm: cm, label: 'วันนี้ ' + dLabel(t) };
    if (k === 'month') return { kind: k, months: [cm], cm: cm, label: 'เดือนนี้ ' + mFull(cm) };
    if (k === 'year') return { kind: k, months: MONTHS.filter(function (m) { return m.slice(0, 4) === t.slice(0, 4); }), cm: cm, label: 'ปีนี้ พ.ศ. ' + (+t.slice(0, 4) + 543) };
    return { kind: 'custom', months: MONTHS.filter(inRange), cm: cm, label: rangeText() };
  }
  function spark(vals, color, aria) {
    var mx = Math.max.apply(null, vals.concat([1])), n = vals.length, w = 6, g = 2, H = 30, s = svg('svg', { viewBox: '0 0 ' + (n * (w + g)) + ' ' + H, class: 'spark', role: 'img', 'aria-label': aria, preserveAspectRatio: 'none' });
    vals.forEach(function (x, i) { var h = x == null ? 0 : Math.max(x > 0 ? 2 : 0.8, x / mx * (H - 2)); s.appendChild(svg('rect', { x: i * (w + g), y: H - h, width: w, height: h, rx: 1, fill: x == null ? 'var(--line)' : color, opacity: i === n - 1 ? 1 : 0.55 })); });
    return s;
  }
  function liveFailed(k) { return !!(AUTH.on && AUTH.user && live.errors && live.errors[k] && liveShownAt(k)); }
  function nowCards() { var Q = periodOf(); return [nowIncidents(Q), nowLostFound(Q), nowGate(Q), nowAnywheel(Q), nowTram(Q), nowCctv(Q), nowAssets(Q), nowGuard(Q)].filter(Boolean); }
  function nowCard(o) {
    var kids = [el('div', { class: 'now-h' }, [el('span', { class: 'now-ico' }, [ic(o.icon, 18)]), el('h3', { text: o.title }), o.badge ? el('span', { class: 'now-badge' + (o.stale ? ' stale' : ''), text: o.badge }) : null])];
    if (o.mainNa) kids.push(el('div', { class: 'now-na', text: o.mainNa }));
    else kids.push(el('div', { class: 'now-main' }, [el('b', { text: o.main.v }), el('small', { text: o.main.u })]));
    if (o.subs && o.subs.length) kids.push(el('dl', { class: 'now-subs' }, o.subs.filter(Boolean).reduce(function (a, s) { a.push(el('div', {}, [el('dt', { text: s.l }), el('dd', { text: s.v })])); return a; }, [])));
    if (o.spark) kids.push(el('div', { class: 'now-spark' }, [spark(o.spark.vals, o.color, o.spark.aria), el('span', { text: o.spark.cap })]));
    if (o.note) kids.push(el('p', { class: 'now-note', text: o.note }));
    return el('a', { class: 'card now', href: '#' + o.page, style: '--accent:' + o.color, 'aria-label': o.title + ' — เปิดรายละเอียด' }, kids);
  }
  /* ---- ตัวคำนวณของแต่ละเรื่อง: คืนค่าตามช่วงที่เลือก พร้อมป้ายเมื่อเป็นข้อมูลล่าสุดแทนช่วงที่ขอ ---- */
  function incRows(test) { var d = extra('incidentsDaily'); return d ? d.rows.filter(test) : []; }
  function incSum(rows) { var o = { n: 0, inj: 0, v: 0, g: 0, p: 0 }; rows.forEach(function (r) { o.n += r.count; o.inj += r.injured; if (r.type === V) o.v += r.count; else if (r.type === G) o.g += r.count; else if (r.type === P) o.p += r.count; }); return o; }
  function daySeries(endDay, n, f) { var out = []; for (var i = n - 1; i >= 0; i--) out.push(f(addDays(endDay, -i))); return out; }
  /* ความครอบคลุมของชุดข้อมูลรายวัน: แสดง 0 ของ “วันนี้” ได้เฉพาะเมื่อ complete === true (อ่านต้นทางครบทั้งแท็บสำเร็จ) และวันที่ที่อ่าน (checkedAt) คือวันนี้
   * วันที่เปิดหน้า/วันที่ build ไม่ใช่หลักฐาน — ถ้าอ่านไม่ครบหรือไม่มี checkedAt ถือว่ายืนยันไม่ได้ และไม่เติมศูนย์หลังรายการล่าสุด */
  function coverOf(d) { var c = String((d && d.checkedAt) || ''); return { ok: !!d && d.complete === true && c.length >= 16, day: c.slice(0, 10), time: c.slice(11, 16) }; }
  function nowIncidents(Q) {
    var d = extra('incidentsDaily'), base = { icon: 'alert', title: 'เหตุการณ์และอุบัติเหตุ', color: C.c1, page: 'traffic' };
    if (!d) return null;
    var cv = coverOf(d), cover = cv.ok ? cv.day : d.lastEntry, end = Q.day && Q.day <= cover ? Q.day : cover, s;
    base.spark = { vals: daySeries(end, 14, function (x) { return incSum(incRows(function (r) { return r.date === x; })).n; }), aria: 'เหตุการณ์ 14 วันล่าสุด', cap: '14 วันถึง ' + dShort(end) };
    if (Q.kind === 'today') {
      if (!cv.ok || Q.day > cv.day) { s = incSum(incRows(function (r) { return r.date === d.lastEntry; }));
        base.mainNa = cv.ok ? 'ยังไม่มีข้อมูลวันนี้' : 'ยังยืนยันข้อมูลวันนี้ไม่ได้'; base.badge = 'ล่าสุด ' + dShort(d.lastEntry); base.stale = true; base.subs = [{ l: 'เหตุการณ์', v: num(s.n) }, { l: 'ผู้บาดเจ็บ/ป่วย', v: num(s.inj) + ' คน' }]; base.note = cv.ok ? 'ตรวจข้อมูลล่าสุด ' + dLabel(d.checkedAt) : 'อ่านต้นทางไม่ครบ'; return base; }
      s = incSum(incRows(function (r) { return r.date === Q.day; })); base.badge = Q.day === cv.day ? 'วันนี้ ณ ' + cv.time + ' น.' : 'วันนี้'; base.note = 'รายการที่บันทึกแล้ว ณ เวลาตรวจ · ล่าสุด ' + dShort(d.lastEntry);
      if (liveFailed('incidents')) { base.stale = true; base.note = 'ยอด ณ ' + cv.time + ' น. · รอบล่าสุดอัปเดตไม่สำเร็จ — ยังยืนยันยอดหลังเวลานี้ไม่ได้'; }      /* รอบ 14.1: ไม่ให้ 0 ของรอบก่อนดูเหมือนยอดล่าสุด */
    } else { s = incSum(incRows(function (r) { return Q.months.indexOf(r.date.slice(0, 7)) >= 0; })); base.badge = Q.label; if (Q.months.indexOf(Q.cm) >= 0) base.note = 'ข้อมูลถึง ' + dLabel(cv.ok ? d.checkedAt : d.lastEntry); }
    base.main = { v: num(s.n), u: 'เหตุการณ์' };
    base.subs = [{ l: 'ยานพาหนะ', v: num(s.v) }, { l: 'ทั่วไป', v: num(s.g) }, { l: 'รับส่งผู้ป่วย', v: num(s.p) }, { l: 'ผู้บาดเจ็บ/ป่วย', v: num(s.inj) + ' คน' }];
    return base;
  }
  function nowLostFound(Q) {
    var d = extra('lostfoundDaily'), lf = mod('lostfound'), lfs = extra('lostfoundStatus'), base = { icon: 'search', title: 'Lost & Found', color: C.c4, page: 'lostfound' };
    if (!lf) return null;
    if (d) { var cv = coverOf(d), cover = cv.ok ? cv.day : d.lastEntry, end = Q.day && Q.day <= cover ? Q.day : cover, by = {}; d.rows.forEach(function (r) { by[r.date] = r; });
      base.spark = { vals: daySeries(end, 14, function (x) { return x < d.from ? null : by[x] ? by[x].lost + by[x].found : 0; }), aria: 'แจ้งหายและเก็บได้ 14 วันล่าสุด', cap: '14 วันถึง ' + dShort(end) };
      if (Q.kind === 'today') {
        if (!cv.ok || Q.day > cv.day || Q.day < d.from) { var l = by[d.lastEntry] || { lost: 0, found: 0 }; base.mainNa = !cv.ok ? 'ยังยืนยันข้อมูลวันนี้ไม่ได้' : Q.day < d.from ? 'ข้อมูลรายวันยังไม่รองรับ' : 'ยังไม่มีข้อมูลวันนี้'; base.badge = 'ล่าสุด ' + dShort(d.lastEntry); base.stale = true;
          base.subs = [{ l: 'แจ้งหาย', v: num(l.lost) }, { l: 'เก็บได้', v: num(l.found) }]; base.note = cv.ok ? 'ตรวจข้อมูลล่าสุด ' + dLabel(d.checkedAt) : 'อ่านต้นทางไม่ครบ'; return base; }
        var t = by[Q.day] || { lost: 0, found: 0, returnForms: 0 }; base.badge = Q.day === cv.day ? 'วันนี้ ณ ' + cv.time + ' น.' : 'วันนี้'; base.main = { v: num(t.lost), u: 'แจ้งของหาย' };
        base.subs = [{ l: 'เก็บของได้', v: num(t.found) }, { l: 'แบบรับของคืน', v: num(t.returnForms) }]; base.note = 'รายการที่บันทึกแล้ว ณ เวลาตรวจ · ล่าสุด ' + dShort(d.lastEntry);
        if (liveFailed('lostfound')) { base.stale = true; base.note = 'ยอด ณ ' + cv.time + ' น. · รอบล่าสุดอัปเดตไม่สำเร็จ — ยังยืนยันยอดหลังเวลานี้ไม่ได้'; } return base; } }
    else if (Q.kind === 'today') { base.mainNa = 'ข้อมูลรายวันยังไม่รองรับ'; return base; }
    var rows = lf.monthly.filter(function (r) { return Q.months.indexOf(r.month) >= 0; }), st = (lfs ? lfs.monthly : []).filter(function (r) { return Q.months.indexOf(r.month) >= 0; });
    var sum = function (k) { return rows.reduce(function (a, r) { return a + (r.byType[k] || 0); }, 0); };
    base.badge = Q.label; base.main = { v: num(sum('สิ่งของสูญหาย')), u: 'แจ้งของหาย' };
    base.subs = [{ l: 'เก็บของได้', v: num(sum('พบสิ่งของ')) }, lfs ? { l: 'สถานะรับคืนแล้ว', v: num(st.reduce(function (a, r) { return a + r.returned; }, 0)) } : null];
    if (!rows.length) { base.mainNa = 'ยังไม่มีข้อมูลของช่วงนี้'; base.subs = []; }
    return base;
  }
  function nowGate(Q) {
    var g = mod('gate'), base = { icon: 'helmet', title: 'รถเข้าและหมวกนิรภัย', color: C.c3, page: 'gate' };
    if (!g) return null;
    var days = g.daily, last = days[days.length - 1], by = {}; days.forEach(function (r) { by[r.date] = r; });
    var end = Q.day && by[Q.day] ? Q.day : last.date;
    base.spark = { vals: daySeries(end, 14, function (x) { return by[x] ? by[x].cars + by[x].motorcycles : null; }), aria: 'รถเข้า 14 วันล่าสุด', cap: '14 วันถึง ' + dShort(end) + ' · เฉพาะรถเข้า' };
    var fill = function (r, n) { base.main = { v: num(r.cars + r.motorcycles), u: 'คันเข้า' }; base.subs = [{ l: 'รถยนต์', v: num(r.cars) }, { l: 'จักรยานยนต์', v: num(r.motorcycles) }, { l: 'ไม่สวมหมวก', v: num(r.noHelmet) + ' ราย' }]; if (n) base.subs.push({ l: 'วันที่มีข้อมูล', v: n + ' วัน' }); };
    if (Q.kind === 'today') {
      if (by[Q.day]) { fill(by[Q.day]); base.badge = 'วันนี้'; if (liveFailed('gate')) { base.stale = true; base.note = 'ข้อมูลที่อ่านสำเร็จเมื่อ ' + dLabel(liveShownAt('gate')) + ' · รอบล่าสุดอัปเดตไม่สำเร็จ'; } return base; }
      base.mainNa = 'ยังไม่มีข้อมูลวันนี้'; base.badge = 'ล่าสุด ' + dShort(last.date); base.stale = true;
      base.subs = [{ l: 'รถเข้า', v: num(last.cars + last.motorcycles) + ' คัน' }, { l: 'ไม่สวมหมวก', v: num(last.noHelmet) + ' ราย' }]; return base; }
    var rows = g.monthly.filter(function (r) { return Q.months.indexOf(r.month) >= 0; });
    if (!rows.length) { base.mainNa = 'ยังไม่มีข้อมูลของช่วงนี้'; base.badge = 'ล่าสุด ' + dShort(last.date); base.stale = true; return base; }
    fill({ cars: rows.reduce(function (a, r) { return a + r.cars; }, 0), motorcycles: rows.reduce(function (a, r) { return a + r.motorcycles; }, 0), noHelmet: rows.reduce(function (a, r) { return a + r.noHelmet; }, 0) }, rows.reduce(function (a, r) { return a + r.days; }, 0));
    base.badge = Q.label; if (Q.months.indexOf(last.date.slice(0, 7)) >= 0) base.note = 'ข้อมูลถึง ' + dLabel(last.date);
    return base;
  }
  /* แหล่งที่ snapshot เก็บเป็นรายเดือน: “วันนี้” แสดงค่าของเดือน (ระบุชื่อเดือน) และบอกว่ารายวันยังไม่รองรับ — ไม่หารเฉลี่ยเป็นรายวัน */
  function nowMonthly(Q, base, rows, fill, lastTxt) {
    if (!rows.length) return null;
    var last = rows[rows.length - 1], pick;
    if (Q.kind === 'today' || Q.kind === 'month') {
      pick = rows.filter(function (r) { return r.month === Q.cm; })[0];
      if (pick) { fill([pick]); base.badge = mLabel(Q.cm) + (Q.kind === 'today' ? ' (ทั้งเดือน)' : ''); if (Q.kind === 'today') base.note = 'ข้อมูลรายวันยังไม่รองรับ — แสดงยอดสะสมของเดือนนี้'; if (lastTxt) base.note = (base.note ? base.note + ' · ' : '') + lastTxt; }      /* รอบ 14.3: เดือนนี้มีข้อมูลบางวัน → บอกว่าถึงวันที่เท่าใด */
      else { fill([last]); base.badge = 'ล่าสุด ' + mLabel(last.month); base.stale = true; base.note = (Q.kind === 'today' ? 'ยังไม่มีข้อมูลวันนี้' : 'ยังไม่มีข้อมูลเดือนนี้') + (lastTxt ? ' · ' + lastTxt : ''); }
      return base;
    }
    pick = rows.filter(function (r) { return Q.months.indexOf(r.month) >= 0; });
    if (!pick.length) { base.mainNa = 'ยังไม่มีข้อมูลของช่วงนี้'; base.badge = 'ล่าสุด ' + mLabel(last.month); base.stale = true; return base; }
    fill(pick); base.badge = Q.label; if (pick[pick.length - 1].month < Q.months[Q.months.length - 1] && lastTxt) base.note = lastTxt;
    return base;
  }
  function sumK(rows, k) { return rows.reduce(function (a, r) { return a + (r[k] || 0); }, 0); }
  function nowAnywheel(Q) { var aw = extra('anywheel'); if (!aw) return null; var base = { icon: 'pin', title: 'จักรยาน Anywheel', color: C.c1, page: 'tram' };
    var sm = aw.monthly.slice(-12); base.spark = { vals: sm.map(function (r) { return r.trips; }), aria: 'การใช้ Anywheel รายเดือน', cap: mLabel(sm[0].month) + ' – ' + mLabel(sm[sm.length - 1].month) };      /* รอบ 14.3: 12 เดือนล่าสุด */
    return nowMonthly(Q, base, aw.monthly, function (rows) { base.main = { v: num(sumK(rows, 'trips')), u: 'ครั้ง' }; base.subs = [{ l: 'ระยะทาง', v: num(Math.round(sumK(rows, 'km'))) + ' กม.' }, { l: 'เฉลี่ย/วันที่มีข้อมูล', v: num(Math.round(sumK(rows, 'trips') / sumK(rows, 'days'))) + ' ครั้ง' }]; }, awDataTxt()); }
  function nowTram(Q) { var t = extra('tram'); if (!t) return null; var base = { icon: 'car', title: 'รถรางบริการพิเศษ', color: C.c2, page: 'tram' }, ms = t.monthly.slice(-8);
    base.spark = { vals: ms.map(function (r) { return r.rounds; }), aria: 'จำนวนรอบรถรางรายเดือน', cap: 'รอบ · ' + mLabel(ms[0].month) + ' – ' + mLabel(ms[ms.length - 1].month) };
    return nowMonthly(Q, base, t.monthly, function (rows) { base.main = { v: num(sumK(rows, 'jobs')), u: 'งาน' }; base.subs = [{ l: 'รอบ', v: num(sumK(rows, 'rounds')) }, { l: 'ระยะทาง', v: num(sumK(rows, 'km')) + ' กม.' }]; }, 'ต้นทางมีข้อมูลถึง ' + dLabel(t.updated)); }
  function nowCctv(Q) { var c = mod('cctv'); if (!c) return null; var base = { icon: 'camera', title: 'คำขอดูกล้อง CCTV', color: C.c2, page: 'cctv' };
    base.spark = { vals: c.monthly.map(function (r) { return r.count; }), aria: 'คำขอ CCTV รายเดือน', cap: mLabel(c.monthly[0].month) + ' – ' + mLabel(c.monthly[c.monthly.length - 1].month) };
    return nowMonthly(Q, base, c.monthly, function (rows) { base.main = { v: num(sumK(rows, 'count')), u: 'คำขอ' }; base.subs = [{ l: 'ปิดเคสสะสม', v: num(c.byStatus['ปิดเคส']) + ' / ' + num(c.total) }]; }, 'อัปเดต ' + dLabel(c.updated)); }
  function nowAssets() { var vr = mod('vehicleRegistration'), oc = extra('opsCheck'); if (!vr) return null;
    var tot = Object.keys(vr.rows).reduce(function (a, k2) { return a + (vr.rows[k2] || 0); }, 0);
    return { icon: 'car', title: 'ลานจอดและยานพาหนะ', color: C.c5, page: 'parking', badge: 'ทะเบียน ณ ' + dShort(vr.updated) + (vr.studentMoto ? ' · จยย.นศ. สด' : ''), main: { v: num(tot), u: 'รายการลงทะเบียน' },
      subs: [{ l: 'บุคลากร', v: num((vr.rows['บุคลากร – รถยนต์'] || 0) + (vr.rows['บุคลากร – รถจักรยานยนต์'] || 0)) }, { l: 'นักศึกษา', v: num((vr.rows['นักศึกษา – รถยนต์'] || 0) + (vr.rows['นักศึกษา – รถจักรยานยนต์'] || 0)) + (vr.rows['นักศึกษา – รถจักรยานยนต์'] == null ? ' (ไม่รวม จยย.)' : '') }, oc ? { l: 'ลานจอดรถ', v: num(oc.parkingLots) + ' ลาน' } : null, oc ? { l: 'รถของงาน', v: num(oc.vehicles.total) + ' คัน' } : null] }; }
  function nowGuard(Q) { var sat = mod('guardSatisfaction'), fines = mod('guardFines'), oc = extra('opsCheck'); if (!sat) return null;
    var rows = sat.central.monthly, pick = rows.filter(function (r) { return r.month === Q.cm; })[0] || rows[rows.length - 1], u = sat.unit.monthly, lu = u[u.length - 1];
    var base = { icon: 'shield', title: 'รปภ. และความปลอดภัย', color: C.fine, page: 'report-guard', badge: 'ประเมินเดือน ' + mLabel(pick.month), stale: pick.month !== Q.cm, main: { v: pick.overall.toFixed(2), u: '/ 5 พึงพอใจ รปภ.ส่วนกลาง' },
      subs: [{ l: 'ส่วนงาน', v: lu.overall.toFixed(2) + ' / 5' }, { l: 'ผู้ตอบ', v: num(pick.responses) }] };
    if (fines && Q.months) base.subs.push({ l: 'ค่าปรับ รปภ.', v: num(fines.monthly.filter(function (r) { return Q.months.indexOf(r.month) >= 0; }).reduce(function (a, r) { return a + r.cases; }, 0)) + ' กรณี' });
    if (oc) base.subs.push({ l: 'อุปกรณ์ดับเพลิง', v: num(oc.fireEquipment.total) + ' ชิ้น' });
    return base; }
  function trendCard(o) {
    return el('article', { class: 'card trend', style: '--accent:' + o.color }, [el('div', { class: 'trend-h' }, [el('h3', { text: o.title }), el('span', { class: 'note', text: o.unit }), el('a', { class: 'more', href: '#' + o.page, 'aria-label': 'ดูรายละเอียด ' + o.title, text: 'รายละเอียด →' })]),
      o.kpis && o.kpis.length ? el('div', { class: 'trend-k' }, o.kpis.filter(Boolean).map(function (k2) { return el('span', {}, [el('b', { text: k2.v }), ' ' + k2.l]); })) : null, o.chart, o.foot ? el('p', { class: 'src', text: o.foot }) : null]);
  }
  PAGES.dashboard = function (v) {
    scopeRange('dash', yearRange());
    if (!state.period) state.period = 'today';
    if (state.period !== 'custom') { var yr = yearRange(); state.from = yr.from; state.to = yr.to; }
    var Q = periodOf(), t = todayStr(), gen = (DATA.extra || {}).generatedAt || DATA.stats.generatedAt || '';
    var seg = el('div', { class: 'seg period', role: 'group', 'aria-label': 'ช่วงข้อมูลของส่วนบน' }, [['today', 'วันนี้'], ['month', 'เดือนนี้'], ['year', 'ปีนี้'], ['custom', 'กำหนดช่วง']].map(function (x) {
      return el('button', { type: 'button', 'aria-pressed': String(state.period === x[0]), text: x[1], onclick: function () { state.period = x[0]; route(true); } }); }));
    v.appendChild(el('div', { class: 'dash-head' }, [el('div', {}, [el('h1', { text: 'ภาพรวมงานจราจรและความปลอดภัย' }),
      el('div', { class: 'dash-meta' }, [el('span', { class: 'upd' }, [ic('calendar'), 'วันนี้ ' + dLabel(t)]), el('span', { class: 'dash-chk', text: dashChkText() })])]), el('div', { class: 'dash-ctl' }, [seg, state.period === 'custom' ? rangeCtrl() : null])]));
    var cards = nowCards();
    v.appendChild(el('section', { class: 'sec', 'aria-label': 'ข้อมูล' + Q.label }, [el('div', { class: 'sec-h' }, [Q.kind === 'today' ? el('h2', { class: 'h-xl' }, [el('span', { class: 'h-emo', 'aria-hidden': 'true', text: '📊' }), ' ข้อมูลวันนี้']) : el('h2', { text: 'ข้อมูล' + Q.label }), el('span', { class: 'note', text: Q.kind === 'today' ? dLabel(t) + ' · เรื่องที่ยังไม่มีข้อมูลวันนี้จะแสดงข้อมูลล่าสุดพร้อมป้ายวันที่' : '' })]), liveBlock(el('div', { class: 'nows' }, cards.map(nowCard)), nowCards, cards)]));
    /* แนวโน้มรายเดือน — ใช้ช่วงของปีนี้ (หรือช่วงที่กำหนดเอง) ไม่ขึ้นกับปุ่ม “วันนี้/เดือนนี้” */
    var rt = rangeText(), inc = mod('incidents'), lf = mod('lostfound'), gate = mod('gate'), cctv = mod('cctv'), sat = mod('guardSatisfaction'), vr = mod('vehicleRegistration'), aw = extra('anywheel'), tram = extra('tram'), am = mod('accidentMap'), tc = [];
    var inR = function (r) { return inRange(r.month); };
    if (inc) { var is = incSum(incRows(function (r) { return inRange(r.date.slice(0, 7)); }));
      tc.push(trendCard({ title: 'เหตุการณ์และอุบัติเหตุ', unit: 'เหตุการณ์/เดือน', page: 'traffic', color: C.c1, kpis: [{ v: num(is.n), l: 'เหตุการณ์' }, { v: num(is.v + is.g), l: 'อุบัติเหตุ' }, { v: num(is.inj), l: 'ผู้บาดเจ็บ/ป่วย' }], chart: incidentChart(pickMonth('traffic')) })); }
    if (am) tc.push(el('article', { class: 'card trend', style: '--accent:' + C.c3 }, [el('div', { class: 'trend-h' }, [el('h3', { text: 'จุดเกิดอุบัติเหตุ' }), el('span', { class: 'note', text: num(mapPoints().length) + ' จุด' }), el('a', { class: 'more', href: '#accident-map', 'aria-label': 'เปิดแผนที่เต็ม', text: 'แผนที่เต็ม →' })]), dashMap()]));
    if (lf) { var lr = lf.monthly.filter(inR), ls = function (k2) { return lr.reduce(function (a, r) { return a + (r.byType[k2] || 0); }, 0); };
      tc.push(trendCard({ title: 'Lost & Found', unit: 'รายการ/เดือน', page: 'lostfound', color: C.c4, kpis: [{ v: num(ls('สิ่งของสูญหาย')), l: 'แจ้งหาย' }, { v: num(ls('พบสิ่งของ')), l: 'เก็บได้' }], chart: lfChart(pickMonth('lostfound')) })); }
    if (gate) { var gr2 = gate.monthly.filter(inR);
      tc.push(trendCard({ title: 'รถเข้ามหาวิทยาลัย', unit: 'คัน/เดือน · เฉพาะรถเข้า', page: 'gate', color: C.c3, kpis: [{ v: num(sumK(gr2, 'cars')), l: 'รถยนต์' }, { v: num(sumK(gr2, 'motorcycles')), l: 'จักรยานยนต์' }, { v: num(sumK(gr2, 'noHelmet')), l: 'ไม่สวมหมวก (ราย)' }], chart: gateMonthChart(pickMonth('gate')) })); }
    if (aw) { var ar = aw.monthly.filter(inR), arEnd = state.to || MONTHS[MONTHS.length - 1] || '';
      tc.push(trendCard({ title: 'จักรยาน Anywheel', unit: 'ครั้ง/เดือน', page: 'tram', color: C.c1, foot: !ar.length ? 'ยังไม่มีข้อมูลในช่วงที่เลือก · ' + awDataTxt() : ar[ar.length - 1].month < arEnd ? awDataTxt() + ' (ยังไม่มีข้อมูล ' + mLabel(arEnd) + ')' : null, kpis: [{ v: num(sumK(ar, 'trips')), l: 'ครั้ง' }, { v: num(Math.round(sumK(ar, 'km'))), l: 'กม.' }], chart: bars(mCols(ar), [{ name: 'จำนวนครั้งการใช้งาน', color: C.c1, values: ar.map(function (r) { return r.trips; }) }], { unit: 'ครั้ง', int: true, h: 210, aria: 'การใช้ Anywheel รายเดือน', onPick: function () { go('tram'); } }) })); }
    if (tram) { var tr = tramRows();
      tc.push(trendCard({ title: 'รถรางบริการพิเศษ', unit: 'รอบ/เดือน', page: 'tram', color: C.c2, kpis: [{ v: num(sumK(tr, 'jobs')), l: 'งาน' }, { v: num(sumK(tr, 'rounds')), l: 'รอบ' }, { v: num(sumK(tr, 'km')), l: 'กม.' }], chart: bars(mCols(tr), [{ name: 'จำนวนรอบ', color: C.c2, values: tr.map(function (r) { return r.rounds; }) }], { unit: 'รอบ', int: true, h: 210, aria: 'จำนวนรอบรถรางรายเดือน', onPick: function () { go('tram'); } }) })); }
    if (cctv) tc.push(trendCard({ title: 'คำขอดูกล้อง CCTV', unit: 'คำขอ/เดือน', page: 'cctv', color: C.c2, kpis: [{ v: num(sumMonthly(cctv.monthly, function (r) { return r.count; })), l: 'คำขอ' }], chart: cctvMonthChart(pickMonth('cctv')) }));
    if (vr) { var names = Object.keys(vr.rows), mx = Math.max.apply(null, names.map(function (n) { return vr.rows[n] || 0; }));
      tc.push(trendCard({ title: 'ยานพาหนะที่ลงทะเบียน', unit: 'รายการ · ณ ' + dShort(vr.updated) + vrMotoNote(vr), page: 'vehicle', color: C.c5, chart: hbars(names.map(function (n) { return { label: n, value: vr.rows[n], color: C.c5 }; }), mx, { unit: 'รายการ', series: 'ลงทะเบียน', labelW: 170, nullText: studentMotoNa(), aria: 'ยานพาหนะที่ลงทะเบียน' }) })); }
    if (sat) tc.push(trendCard({ title: 'ความพึงพอใจ รปภ.ส่วนกลาง', unit: 'คะแนน 1–5/เดือน', page: 'report-guard', color: C.fine, chart: satScoreChart('central', function (i, c) { state.satSrc = 'central'; state.satMonth = c.month; go('report-guard'); }, null, 210) }));
    v.appendChild(el('section', { class: 'sec', 'aria-label': 'แนวโน้มรายเดือน' }, [el('div', { class: 'sec-h' }, [el('h2', { text: 'แนวโน้มรายเดือน' }), el('span', { class: 'note', text: rt + ' · คลิกแท่งเพื่อดูรายละเอียด' }),
      el('a', { class: 'more', href: '#report-monthly', text: 'รายงานประจำเดือน →' })]), el('div', { class: 'trends' }, tc)]));
  };
  PAGES['report-monthly'] = function (v) { var cm = todayStr().slice(0, 7), d = MONTHS.indexOf(cm) >= 0 ? cm : MONTHS[MONTHS.length - 1]; scopeRange('report', { from: d, to: d }); renderReport(v, true); };

  /* ======================================================================
   * รอบ 7 — ตัวอ่านข้อมูลรายรายการ และหน้าที่ย้ายมาจากระบบเดิม
   * ช่องทางอ่าน 2 แบบ (กำหนดราย dataset ที่ config.js → dataAccess):
   *   'legacy' = Sheet “ข้อมูลงานจราจรออนไลน์” ผ่านคำสั่งสรุปของ Google (gviz, JSONP) — ช่องทางเดียวกับหน้าเดิมบน main
   *              เลือกเฉพาะคอลัมน์ที่ไม่ใช่ข้อมูลรายบุคคล (ไม่ดึงคอลัมน์ ผู้ดูแล / ผู้ตรวจ / ชื่อไฟล์)
   *   'api'    = บริการข้อมูลภายในที่ตรวจตัวตนฝั่งบริการ (config.js → dataApiUrl; โค้ดอยู่ที่ server/ และ apps-script/HubData.gs — ยังไม่ได้ Deploy)
   *              ใช้กับข้อมูลรายบุคคล/ภาพภายใน: บุคลากร ภาพตรวจพื้นที่ บันทึกวิทยุ — ไม่มีการอ่านข้อมูลกลุ่มนี้จากช่องทางสาธารณะ
   * ไม่มีรายการ รูป หรือรหัสไฟล์ใดเก็บใน Repository — ทุกอย่างอ่านตอนเปิดหน้า
   * ==================================================================== */
  var OPS_SHEET = '1lYRhXtLgec6ISM6Ugt-YKLrh47NRt7ihcVLcD8mI_Yg';
  var DS = {
    parkingLots: { mode: 'legacy', tab: 'ลานจอดรถ', gid: 591543024, q: 'select A,B,D,E,F,G,H', keys: ['no', 'name', 'capacity', 'img1', 'img2', 'img3', 'img4'] },
    vehicles: { mode: 'legacy', tab: 'Vehicle_List', gid: 147145093, q: 'select A,B,C,D,E,F,G,H,I,J,K', keys: ['id', 'type', 'model', 'color', 'plate', 'assetNo', 'img1', 'img2', 'img3', 'year', 'vendor'] },
    fire: { mode: 'legacy', tab: 'อุปกรณ์ดับเพลิง', gid: 25594122, q: 'select A,B,C,D,E,F,G,H,I,J,K,L,M', keys: ['id', 'cat', 'kind', 'size', 'place', 'no', 'assetNo', 'img1', 'img2', 'img3', 'img4', 'year', 'vendor'] },
    forms: { mode: 'legacy', tab: 'แบบฟอร์ม', gid: 1541578119, q: 'select A,B', keys: ['name', 'url'] },
    inspections: { mode: 'legacy', tab: 'ตรวจสภาพ', gid: 267450301, q: 'select A,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R', keys: ['at', 'type', 'model', 'color', 'plate', 'assetNo', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'remark', 'status'] },
    refills: { mode: 'legacy', tab: 'ประวัติการเติมสารถังดับเพลิง', gid: 680269898, q: 'select C,D,E,F,G,H,I,K', keys: ['plate', 'assetNo', 'date', 'before', 'after', 'agent', 'vendor', 'remark'] },
    staff: { mode: 'api', tab: 'พนักงานจราจร' }, ruenthai: { mode: 'api', tab: 'RuenThai_Survey' }, areaPhotos: { mode: 'api', tab: 'ภาพการตรวจพื้นที่' }, radio: { mode: 'api', tab: 'บันทึกรายงานวิทยุสื่อสาร' }
  };
  var HCFG = window.HUB_CONFIG || {}, dsCache = {}, gvSeq = 0, DS_TTL = 5 * 60000, authChk = null;
  function gvCell(c) {
    if (!c || c.v == null) return '';
    var m = typeof c.v === 'string' && /^Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+))?/.exec(c.v);
    if (m) return m[1] + '-' + pad2(+m[2] + 1) + '-' + pad2(+m[3]) + (m[4] != null ? ' ' + pad2(+m[4]) + ':' + pad2(+m[5]) : '');
    return typeof c.v === 'string' ? c.v.trim() : c.v;
  }
  function gvRows(table, keys) { return ((table || {}).rows || []).map(function (r) { var o = {}; keys.forEach(function (k, i) { o[k] = gvCell((r.c || [])[i]); }); return o; }); }
  function gviz(ds) {
    return new Promise(function (res, rej) {
      var cb = '__hubgv' + (++gvSeq), s = document.createElement('script'), done = false;
      var fin = function (err, val) { if (done) return; done = true; clearTimeout(tm); try { delete window[cb]; } catch (e) { window[cb] = undefined; } if (s.parentNode) s.parentNode.removeChild(s); if (err) rej(err); else res(val); };
      var tm = setTimeout(function () { fin({ code: 'timeout' }); }, 20000);
      window[cb] = function (r) { if (!r || r.status === 'error' || !r.table) return fin({ code: 'source' }); if ((r.table.cols || []).length !== ds.keys.length) return fin({ code: 'schema' }); fin(null, gvRows(r.table, ds.keys)); };
      s.onerror = function () { fin({ code: 'network' }); };
      s.src = (HCFG.opsSheetBase || 'https://docs.google.com/spreadsheets/d/' + OPS_SHEET) + '/gviz/tq?gid=' + ds.gid + '&headers=1&tq=' + encodeURIComponent(ds.q) + '&tqx=' + encodeURIComponent('out:json;responseHandler:' + cb);
      document.head.appendChild(s);
    });
  }
  function apiGet(key) {
    var base = HCFG.dataApiUrl;
    if (!base) return Promise.reject({ code: 'noapi' });
    return fetch(base + (base.indexOf('?') < 0 ? '?' : '&') + 'dataset=' + encodeURIComponent(key), { credentials: 'include', cache: 'no-store', headers: { Accept: 'application/json' } }).then(function (r) {
      return r.json().catch(function () { return null; }).then(function (j) {
        if (r.status === 401) { if (AUTH.on) authLost(); throw { code: 'auth', status: 401 }; }
        if (r.status === 403) throw { code: j && j.code === 'forbidden' ? 'forbidden' : j && DS_ERR[j.code] ? j.code : 'auth', status: 403 };
        if (!r.ok) throw { code: j && DS_ERR[j.code] ? j.code : 'http', status: r.status };
        if (!j || j.ok !== true || !Array.isArray(j.rows)) throw { code: 'schema' };
        j.rows.forEach(function (row) { if (Array.isArray(row.images)) { row.images = row.images.map(function (x) { return /^https:/.test(x) ? x : 'hubimg:' + x + (key === 'gps' ? ':p' : ''); }); if (!row.url && row.images.length) row.url = row.images[0]; } });
        if (typeof j.asOf === 'string') j.rows.asOf = j.asOf;        /* รอบ 14·P1: เวลาที่บริการอ่านแหล่งจริง (ไม่ใช่เวลาที่เบราว์เซอร์ได้รับ) */
        return j.rows;
      });
    }, function () { throw { code: 'network' }; });
  }
  function dsMode(key) { return (HCFG.dataAccess || {})[key] || DS[key].mode; }
  function loadDS(key, force) {
    if (force || (dsCache[key] && dsCache[key].t0 && Date.now() - dsCache[key].t0 > DS_TTL)) delete dsCache[key];        /* รอบ 12: รายการมีอายุ 5 นาที (เท่ารอบอัปเดตสถิติสด) — ไม่ค้างทั้ง session */
    else if (dsCache[key] && dsMode(key) === 'api' && AUTH.on && AUTH.user && !authChk) {      /* รอบ 13: ใช้รายการที่อยู่ในหน่วยความจำ → ตรวจ session ฝั่งบริการเบื้องหลังทุกครั้ง (คำขอเดียวพร้อมกัน) หมดอายุ/ถูกถอน → กลับหน้า Login */
      var g0 = authGen; authChk = apiCall('/me').then(function (x) { authChk = null; if (g0 === authGen && x.s === 401) authLost(); });
    }
    if (!dsCache[key]) { var m = dsMode(key); dsCache[key] = (m === 'off' ? Promise.reject({ code: 'off' }) : m === 'api' ? apiGet(key) : gviz(DS[key])).then(function (rows) { if (dsCache[key] === p0) p0.n = rows.length; var sa = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(rows.asOf || '') ? new Date(rows.asOf.replace(' ', 'T') + ':00+07:00') : null; return { rows: rows, at: sa && !isNaN(sa) ? sa : new Date(), srcAt: !!sa }; }); var p0 = dsCache[key]; dsCache[key].catch(function () { delete dsCache[key]; }); dsCache[key].t0 = Date.now(); }
    return dsCache[key];
  }
  var DS_ERR = {
    noapi: ['ต้องเข้าสู่ระบบภายในก่อนจึงจะแสดงข้อมูลส่วนนี้', 'ข้อมูลส่วนนี้เป็นข้อมูลรายบุคคลหรือภาพภายใน หน้านี้อ่านผ่านบริการข้อมูลที่ตรวจตัวตนเท่านั้น และบริการนั้นยังไม่ได้ตั้งค่าสำหรับเว็บไซต์นี้'],
    auth: ['บัญชีนี้ยังไม่ได้เข้าสู่ระบบ หรือไม่มีสิทธิ์ดูข้อมูลส่วนนี้', 'บริการข้อมูลปฏิเสธคำขอ — เข้าสู่ระบบด้วยบัญชีที่ได้รับอนุญาตแล้วลองใหม่'],
    network: ['เชื่อมต่อแหล่งข้อมูลไม่ได้', 'ตรวจการเชื่อมต่ออินเทอร์เน็ตหรือระบบกรองเครือข่าย แล้วลองใหม่'],
    timeout: ['แหล่งข้อมูลไม่ตอบกลับภายในเวลา', 'อาจเกิดจากเครือข่ายช้า หรือแหล่งข้อมูลต้นทางถูกจำกัดสิทธิ์การอ่าน'],
    source: ['แหล่งข้อมูลต้นทางแจ้งข้อผิดพลาด', 'แท็บหรือคำสั่งอ่านข้อมูลไม่ตรงกับต้นทางในขณะนี้'],
    schema: ['โครงสร้างข้อมูลที่ได้รับไม่ตรงกับที่หน้านี้รองรับ', 'จำนวนคอลัมน์หรือรูปแบบคำตอบเปลี่ยนไปจากที่ตรวจไว้ — แจ้งผู้ดูแลระบบ'],
    forbidden: ['ไม่มีสิทธิ์เข้าถึงข้อมูลส่วนนี้', 'บัญชีที่เข้าสู่ระบบไม่มีสิทธิ์สำหรับรายการนี้'],
    'source-private': ['บริการข้อมูลอ่านแหล่งต้นทางไม่ได้', 'Sheet ต้นทางไม่ได้เปิดให้บริการอ่าน — ผู้ดูแลต้องเชื่อม Apps Script ของบริการข้อมูล (ดูข้อมูลระบบเพิ่มเติม) · การเข้าสู่ระบบของคุณยังใช้ได้'],
    'source-schema': ['หัวคอลัมน์ของแหล่งต้นทางเปลี่ยนไป', 'บริการข้อมูลไม่พบคอลัมน์ที่ต้องใช้ — แจ้งผู้ดูแลระบบ'], 'source-unreachable': ['บริการข้อมูลติดต่อแหล่งต้นทางไม่ได้', 'ลองใหม่อีกครั้งในอีกสักครู่'],
    'source-error': ['แหล่งต้นทางตอบกลับผิดพลาด', 'ลองใหม่อีกครั้ง ถ้ายังไม่ได้ให้แจ้งผู้ดูแลระบบ'], 'source-not-configured': ['ยังไม่ได้ตั้งค่าแหล่งข้อมูลของส่วนนี้ในบริการ', 'แจ้งผู้ดูแลระบบ'],
    'bad-network-config': ['ระบบตั้งค่าเครือข่ายไม่ถูกต้อง', 'แจ้งผู้ดูแลระบบ'], 'network-denied': ['เข้าใช้งานไม่ได้จากเครือข่ายนี้', ''],
    http: ['บริการข้อมูลตอบกลับผิดพลาด', 'ลองใหม่อีกครั้ง ถ้ายังไม่ได้ให้แจ้งผู้ดูแลระบบ'], off: ['ผู้ดูแลปิดการแสดงข้อมูลส่วนนี้ไว้', '']
  };
  /* dataView: แสดง กำลังโหลด → เนื้อหา / ข้อความผิดพลาดตามสาเหตุ + ปุ่มลองใหม่ */
  function dataView(key, render) {
    var host = el('div', { class: 'dv', 'data-ds': key });
    var run = function (force) {
      host.textContent = ''; host.appendChild(el('div', { class: 'empty', role: 'status', text: 'กำลังโหลดข้อมูล…' }));
      loadDS(key, force).then(function (d) { host.textContent = ''; try { host.appendChild(render(d.rows, d)); } catch (e) { host.appendChild(el('div', { class: 'card box dv-err', role: 'alert' }, [el('strong', { text: 'แสดงข้อมูลไม่สำเร็จ' }), el('p', { class: 'src', text: String(e && e.message || e) })])); } },
        function (e) { var c = (e && e.code) || 'network', t = DS_ERR[c] || DS_ERR.network; host.textContent = '';
          host.appendChild(el('div', { class: 'card box dv-err dv-' + c, role: 'alert' }, [el('strong', { text: t[0] }), t[1] ? el('p', { text: t[1] }) : null,
            el('p', { class: 'src', text: 'แหล่งข้อมูล: แท็บ “' + DS[key].tab + '” · ช่องทาง: ' + (dsMode(key) === 'api' ? 'บริการข้อมูลภายใน' : 'Sheet ต้นทาง') + ' · รหัสสาเหตุ: ' + c + (e && e.status ? ' ' + e.status : '') }),
            c === 'noapi' || c === 'off' ? el('a', { class: 'btn sec', href: '#admin-info', text: 'สิ่งที่ผู้ดูแลต้องตั้งค่า' }) : el('button', { type: 'button', class: 'btn sec', text: 'ลองใหม่', onclick: function () { run(true); } })])); });
    };
    run(false); return host;
  }
  /* รูปที่แสดงได้: Drive (แปลงเป็น thumbnail จาก ID) หรือ URL https บนโดเมนที่ต้นทางใช้จริงเท่านั้น (GitHub user-attachments ของ Vehicle_List, googleusercontent) — URL อื่นถือว่า “ไม่มีภาพ” */
  var IMG_HOSTS = /^https:\/\/(github\.com\/user-attachments\/assets\/|(?:user-images|private-user-images|raw)\.githubusercontent\.com\/|lh[3-6]\.googleusercontent\.com\/|trafficoppe\.github\.io\/|op\.mahidol\.ac\.th\/)[^\s"'<>]*$/;
  function driveId(u) { var s = String(u || ''), m = /(?:\/d\/|[?&]id=)([-\w]{20,})/.exec(s); return m ? m[1] : /^[-\w]{25,}$/.test(s) ? s : ''; }
  function imgSrc(u, sz) { var hm = /^hubimg:([-\w]{20,60})(:p)?$/.exec(String(u || '')); if (hm) return HCFG.imgApiUrl ? HCFG.imgApiUrl + '?id=' + hm[1] + '&w=' + (sz === 'w1600' ? '1600' : sz === 'w800' ? '800' : '400') + (hm[2] ? '&p=1' : '') : '';   /* :p = ชุดภาพส่วนตัว (GPS) → บริการไปตัวกลางก่อน */ var id = driveId(u); if (id) return 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(id) + '&sz=' + (sz || 'w400'); return IMG_HOSTS.test(String(u || '')) ? String(u) : ''; }
  function imgsOf(r) { if (Array.isArray(r.images)) return r.images.filter(function (u) { return imgSrc(u); }); return ['img1', 'img2', 'img3', 'img4', 'photo', 'url'].map(function (k) { return r[k]; }).filter(function (u) { return imgSrc(u); }); }
  function pic(u, alt, cls) {
    var src = imgSrc(u, 'w400');
    if (!src) return el('div', { class: (cls || 'it-pic') + ' noimg', text: 'ไม่มีรูปภาพ' });
    var b = el('button', { type: 'button', class: cls || 'it-pic', 'aria-label': 'ขยายภาพ: ' + alt, onclick: function (e) { e.stopPropagation(); lightbox(imgSrc(u, 'w1600'), alt); } });
    var im = el('img', { alt: alt, loading: 'lazy', referrerpolicy: 'no-referrer' });
    im.onerror = function () { imgFailed(b, src, null); b.setAttribute('aria-label', 'ภาพโหลดไม่ได้ — กดเพื่อลองเปิดภาพขนาดใหญ่อีกครั้ง: ' + alt); };   /* กดกรอบเดิม = ลองโหลดใหม่ในหน้าต่างภาพขยาย */
    im.src = src; b.appendChild(im); return b;
  }
  /* ภาพโหลดไม่ได้: ถามบริการภาพว่าเพราะอะไร แล้วแสดงสาเหตุสั้น ๆ + ปุ่มลองใหม่ — ไม่สรุปว่า “ไม่มีรูปภาพ” เมื่อต้นทางมีไฟล์แนบ */
  var IMG_WHY = { 'image-private': 'ภาพเป็นไฟล์ส่วนตัว — ยังไม่ได้เปิดตัวกลางอ่านภาพของเจ้าของไฟล์', 'relay-not-configured': 'ภาพเป็นไฟล์ส่วนตัว — ยังไม่ได้เปิดตัวกลางอ่านภาพของเจ้าของไฟล์',
    'image-not-found': 'ไม่พบไฟล์ภาพที่ต้นทาง (อาจถูกลบหรือย้าย)', 'image-retry': 'ตรวจสิทธิ์โฟลเดอร์ของภาพไม่สำเร็จชั่วคราว — ลองเปิดใหม่อีกครั้ง', 'image-not-allowed': 'ไฟล์นี้อยู่นอกโฟลเดอร์ที่อนุญาตให้อ่าน', 'relay-login-required': 'ตัวกลางอ่านภาพยังไม่ได้เปิดสิทธิ์ “Anyone”',
    'relay-forbidden': 'ตัวกลางอ่านภาพปฏิเสธ (ค่าลับไม่ตรง — ต้องลงทะเบียนใหม่)', 'relay-timeout': 'ตัวกลางอ่านภาพตอบช้าเกินไป', 'relay-unreachable': 'ติดต่อตัวกลางอ่านภาพไม่ได้', 'no-session': 'หมดเวลาเข้าสู่ระบบ — เข้าสู่ระบบใหม่',
    'unknown-image': 'ระบบยังไม่รู้จักภาพนี้ — โหลดรายการใหม่', 'image-unreachable': 'ติดต่อ Google Drive ไม่ได้ชั่วคราว', 'image-unavailable': 'ต้นทางส่งข้อมูลที่ไม่ใช่ภาพ' };
  function imgWhy(src, cb) {
    var mine = false; try { mine = !!HCFG.imgApiUrl && new URL(src, location.href).pathname === new URL(HCFG.imgApiUrl, location.href).pathname; } catch (e) { mine = false; }
    if (!mine) { cb('โหลดภาพไม่ได้'); return; }
    fetch(src, { credentials: 'include' }).then(function (r) { if (r.ok) return cb('โหลดภาพไม่สำเร็จชั่วคราว'); return r.json().then(function (j) { cb(IMG_WHY[j.code] || ('โหลดภาพไม่ได้ (' + (j.code || 'HTTP ' + r.status) + ')')); }, function () { cb('โหลดภาพไม่ได้ (HTTP ' + r.status + ')'); }); }, function () { cb('เชื่อมต่อไม่ได้'); });
  }
  function imgFailed(box, src, retry) {
    box.classList.add('noimg'); box.textContent = ''; var t = el('span', { class: 'img-why', text: 'กำลังตรวจสาเหตุ…' }); box.appendChild(t);
    imgWhy(src, function (why) { t.textContent = why; if (retry) box.appendChild(el('button', { type: 'button', class: 'btn-ghost img-retry', text: 'ลองใหม่', onclick: function (e) { e.stopPropagation(); retry(); } })); });
  }
  function detailDlg(title, fields, images, more) {
    var last = document.activeElement, close = function () { ov.remove(); document.removeEventListener('keydown', onKey); if (last && last.focus) last.focus(); }, onKey = function (e) { if (e.key === 'Escape' && !document.querySelector('.lightbox')) close(); };
    var dl = el('dl', { class: 'dlg-dl' }); fields.filter(function (f) { return f[1] !== '' && f[1] != null; }).forEach(function (f) { dl.appendChild(el('dt', { text: f[0] })); dl.appendChild(el('dd', { text: String(f[1]) })); });
    var btn = el('button', { type: 'button', class: 'btn sec', text: 'ปิด', onclick: close });
    var ov = el('div', { class: 'dlg-ov', role: 'dialog', 'aria-modal': 'true', 'aria-label': title, onclick: function (e) { if (e.target === ov) close(); } }, [el('div', { class: 'dlg' }, [el('div', { class: 'dlg-h' }, [el('h3', { text: title }), btn]),
      images && images.length ? el('div', { class: 'dlg-imgs' }, images.map(function (u, i) { return pic(u, title + ' ภาพที่ ' + (i + 1), 'dlg-pic'); })) : el('p', { class: 'src', text: 'ไม่มีภาพประกอบ' }), dl, more || null])]);
    document.body.appendChild(ov); document.addEventListener('keydown', onKey); btn.focus();
  }
  /* listUI: ค้นหา + ตัวกรอง + แบ่งหน้า ใช้ร่วมทุกหน้ารายการ */
  function listUI(o) {
    var st = { q: '', f: o.filters && o.filters.length ? o.filters[0].id : null, page: 0 }, per = o.per || 24;
    var bar = el('div', { class: 'lu-bar' }), body = el('div'), wrap = el('div', { class: 'lu' }, [bar, body]);
    var inp = el('input', { type: 'search', placeholder: o.placeholder || 'ค้นหา…', 'aria-label': o.placeholder || 'ค้นหา' }); var tmr = null;
    inp.oninput = function () { clearTimeout(tmr); tmr = setTimeout(function () { st.q = inp.value.trim().toLowerCase(); st.page = 0; draw(); }, 200); };
    function chips() { return el('div', { class: 'chips', role: 'group', 'aria-label': 'ตัวกรอง' }, o.filters.map(function (f) {
      return el('button', { type: 'button', class: 'chip', 'aria-pressed': String(st.f === f.id), text: f.label + ' ' + num(o.rows.filter(f.test).length), onclick: function () { st.f = f.id; st.page = 0; draw(); } }); })); }
    function draw() {
      var f = (o.filters || []).filter(function (x) { return x.id === st.f; })[0];
      var rows = o.rows.filter(function (r) { return (!f || f.test(r)) && (!st.q || o.text(r).toLowerCase().indexOf(st.q) >= 0); }), pages = Math.max(1, Math.ceil(rows.length / per));
      if (st.page >= pages) st.page = pages - 1;
      bar.textContent = ''; if (o.filters && o.filters.length) bar.appendChild(chips()); bar.appendChild(inp);
      body.textContent = '';
      body.appendChild(el('p', { class: 'lu-count', role: 'status', text: num(rows.length) + ' ' + (o.unit || 'รายการ') + (rows.length !== o.rows.length ? ' (จากทั้งหมด ' + num(o.rows.length) + ')' : '') }));
      if (!rows.length) { body.appendChild(el('div', { class: 'empty', text: f && f.emptyText && !st.q ? f.emptyText : 'ไม่พบรายการที่ตรงกับเงื่อนไข' })); return; }
      body.appendChild(o.render(rows.slice(st.page * per, st.page * per + per)));
      if (pages > 1) body.appendChild(el('div', { class: 'lu-pager' }, [el('button', { type: 'button', class: 'btn-ghost', text: '‹ ก่อนหน้า', disabled: st.page === 0 ? '' : null, onclick: function () { st.page--; draw(); wrap.scrollIntoView(); } }),
        el('span', { text: 'หน้า ' + (st.page + 1) + ' / ' + pages }), el('button', { type: 'button', class: 'btn-ghost', text: 'ถัดไป ›', disabled: st.page >= pages - 1 ? '' : null, onclick: function () { st.page++; draw(); wrap.scrollIntoView(); } })]));
    }
    draw(); return wrap;
  }
  function itemCard(o) {
    return el('article', { class: 'card it', tabindex: '0', role: 'button', 'aria-label': o.title + ' — ดูรายละเอียด', onclick: o.open, onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); o.open(); } } },
      [o.noPic ? null : pic(o.img, o.title), el('div', { class: 'it-b' }, [o.tag ? el('span', { class: 'tag', text: o.tag }) : null, el('h4', { text: o.title }), o.sub ? el('p', { text: o.sub }) : null, o.meta ? el('p', { class: 'src', text: o.meta }) : null])]);
  }
  function liveNote(d, key) { return el('p', { class: 'src', text: 'อ่านจากแท็บ “' + DS[key].tab + '” เมื่อ ' + pad2(d.at.getHours()) + ':' + pad2(d.at.getMinutes()) + ' น. (เวลาเครื่อง)' }); }
  function normKey(s) { return String(s == null ? '' : s).replace(/\s+/g, '').toLowerCase(); }
  function histTable(rows) {
    return table(['วันเวลา', 'สรุปสถานะ', 'หมายเหตุ'], rows.slice().sort(function (a, b) { return a.at < b.at ? 1 : -1; }).slice(0, 12).map(function (r) { return [fdate(r.at), r.status || '–', r.remark || '–']; }), {});
  }
  function historyBlock(match) {
    return el('div', { class: 'dlg-more' }, [el('h4', { text: 'ประวัติการตรวจสภาพ' }), dataView('inspections', function (rows) { var hit = rows.filter(match); return hit.length ? el('div', {}, [el('p', { class: 'src', text: num(hit.length) + ' ครั้ง · แสดง 12 ครั้งล่าสุด' }), histTable(hit)]) : el('p', { class: 'src', text: 'ยังไม่มีประวัติการตรวจในต้นทาง' }); })]);
  }

  /* ---------- ยานพาหนะทั้งหมด ---------- */
  PAGES['vehicle-fleet'] = function (v) {
    v.appendChild(pageHead('ยานพาหนะทั้งหมด', 'ทะเบียนยานพาหนะของงานจราจรและความปลอดภัย พร้อมภาพและประวัติการตรวจสภาพ'));
    v.appendChild(el('div', { class: 'sec' }, [dataView('vehicles', function (rows, d) {
      var types = {}; rows.forEach(function (r) { types[r.type] = 1; });
      return el('div', {}, [listUI({ rows: rows, unit: 'คัน', placeholder: 'ค้นหารุ่น ทะเบียน สี…', text: function (r) { return [r.type, r.model, r.plate, r.color, r.assetNo].join(' '); },
        filters: [{ id: 'all', label: 'ทั้งหมด', test: function () { return true; } }].concat(Object.keys(types).sort().map(function (t) { return { id: t, label: t, test: function (r) { return r.type === t; } }; })),
        render: function (page) { return el('div', { class: 'it-grid' }, page.map(function (r) { return itemCard({ img: imgsOf(r)[0], tag: r.type, title: r.model || '–', sub: 'ทะเบียน ' + (r.plate || '–') + (r.color ? ' · สี' + r.color : ''), meta: r.year ? 'ปีที่ซื้อ ' + r.year : '',
          open: function () { detailDlg((r.model || r.type) + ' · ' + (r.plate || ''), [['ประเภท', r.type], ['ยี่ห้อ/รุ่น', r.model], ['สี', r.color], ['ทะเบียน', r.plate], ['หมายเลขครุภัณฑ์', r.assetNo], ['ปีที่ซื้อ', r.year], ['บริษัทที่ซื้อ', r.vendor]], imgsOf(r),
            el('div', {}, [el('p', { class: 'dlg-more' }, [formLink('form-clean', { model: r.model, plate: r.plate, equip: r.assetNo }, 'บันทึกการทำความสะอาดคันนี้')]), historyBlock(function (h) { return h.type !== 'อุปกรณ์ดับเพลิง' && normKey(h.plate) === normKey(r.plate); })])); } }); })); } }), liveNote(d, 'vehicles')]);
    })]));
  };
  PAGE_TITLE['vehicle-fleet'] = 'ยานพาหนะทั้งหมด';

  /* ---------- ลานจอดรถรายลาน (ส่วนหนึ่งของหน้า ข้อมูลการจอดรถ) ---------- */
  function lotsSection() {
    return section('ลานจอดรถรายลาน', {}, [dataView('parkingLots', function (rows, d) {
      rows = rows.filter(function (r) { return r.name; });
      var cap = rows.reduce(function (a, r) { return a + (+r.capacity || 0); }, 0), anyImg = rows.some(function (r) { return imgsOf(r).length; });   /* ต้นทางมีคอลัมน์รูป 4 ช่องแต่ยังว่างทั้งหมด (ตรวจ 15 พ.ย.) — ถ้าไม่มีรูปเลยไม่แสดงกรอบรูปเปล่า */
      return el('div', {}, [kpiGrid([{ icon: 'map', label: 'ลานจอดรถ', value: num(rows.length), unit: 'ลาน', color: C.c3 }, { icon: 'car', label: 'ความจุรวมตามทะเบียน', value: num(cap), unit: 'คัน', color: C.c1 }]),
        el('div', { style: 'margin-top:14px' }, [listUI({ rows: rows, unit: 'ลาน', placeholder: 'ค้นหาชื่อลานจอดรถ…', text: function (r) { return r.name; },
          render: function (page) { return el('div', { class: 'it-grid' }, page.map(function (r) { return itemCard({ img: imgsOf(r)[0], noPic: !anyImg, title: r.name, sub: 'จอดได้ ' + (r.capacity === '' ? '–' : num(+r.capacity)) + ' คัน', meta: 'ลำดับที่ ' + r.no,
            open: function () { detailDlg(r.name, [['ลำดับที่', r.no], ['จำนวนที่จอดได้', r.capacity === '' ? '' : num(+r.capacity) + ' คัน']], imgsOf(r),
              el('p', { class: 'dlg-more' }, [extBtn('ค้นหาตำแหน่งใน Google Maps', 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(r.name + ' มหาวิทยาลัยมหิดล ศาลายา'), true)])); } }); })); } })]), anyImg ? null : el('p', { class: 'src', text: 'ต้นทางยังไม่มีภาพและพิกัดของลานจอด — ตำแหน่งเปิดค้นด้วยชื่อใน Google Maps จากหน้ารายละเอียด' }), liveNote(d, 'parkingLots')]);
    })]);
  }

  /* ---------- อุปกรณ์ดับเพลิง 7 ประเภท (AED อยู่หน้าของตัวเอง) ---------- */
  var FIRE_GROUPS = ['ถังดับเพลิง', 'สายฉีด', 'หัวฉีด', 'ปั๊มน้ำ', 'ตู้เก็บอุปกรณ์', 'หัวรับน้ำ', 'ชุด PPE'];
  function fireGroup(kind) {
    var k = String(kind || '').toLowerCase();
    if (/aed|เครื่องกระตุก/.test(k)) return 'AED';
    if (/หัวฉีด/.test(k)) return 'หัวฉีด'; if (/หัวรับ/.test(k)) return 'หัวรับน้ำ'; if (/สาย/.test(k)) return 'สายฉีด'; if (/ปั๊ม|ปั้ม|pump/.test(k)) return 'ปั๊มน้ำ';
    if (/ตู้/.test(k)) return 'ตู้เก็บอุปกรณ์'; if (/ppe|ชุด/.test(k)) return 'ชุด PPE'; if (/ถัง/.test(k)) return 'ถังดับเพลิง';
    return 'อื่น ๆ';
  }
  function fireEquipSection() {
    return section('อุปกรณ์ดับเพลิงรายชิ้น', {}, [dataView('fire', function (all, d) {
      all.forEach(function (r) { r.group = fireGroup(r.kind); });
      var rows = all.filter(function (r) { return r.group !== 'AED'; }), aed = all.length - rows.length, other = rows.filter(function (r) { return r.group === 'อื่น ๆ'; }).length;
      var groups = FIRE_GROUPS.concat(other ? ['อื่น ๆ'] : []);
      return el('div', {}, [listUI({ rows: rows, unit: 'ชิ้น', placeholder: 'ค้นหาชนิด สถานที่ เลขที่…', text: function (r) { return [r.kind, r.size, r.place, r.no, r.assetNo].join(' '); },
        filters: [{ id: 'all', label: 'ทั้งหมด', test: function () { return true; } }].concat(groups.map(function (g) { return { id: g, label: g, test: function (r) { return r.group === g; }, emptyText: 'ทะเบียนต้นทางยังไม่มีรายการประเภท “' + g + '”' }; })),
        render: function (page) { return el('div', { class: 'it-grid' }, page.map(function (r) { return itemCard({ img: imgsOf(r)[0], tag: r.group, title: r.kind || '–', sub: (r.place || 'ไม่ระบุสถานที่') + (r.no !== '' ? ' · เลขที่ ' + r.no : ''), meta: [r.size, r.year ? 'ปี ' + r.year : ''].filter(Boolean).join(' · '),
          open: function () { detailDlg(r.kind + (r.no !== '' ? ' · เลขที่ ' + r.no : ''), [['ประเภท', r.group], ['ชนิด', r.kind], ['ขนาด', r.size], ['สถานที่ติดตั้ง', r.place], ['เลขที่', r.no], ['หมายเลขครุภัณฑ์', r.assetNo], ['ปีที่ซื้อ', r.year], ['บริษัทที่ซื้อ', r.vendor]], imgsOf(r),
            el('div', {}, [historyBlock(function (h) { return h.type === 'อุปกรณ์ดับเพลิง' && (r.assetNo !== '' && normKey(h.assetNo) === normKey(r.assetNo) || normKey(h.model) === normKey(r.kind) && normKey(h.plate) === normKey(r.no)); }),
              r.group === 'ถังดับเพลิง' ? el('div', { class: 'dlg-more' }, [el('h4', { text: 'ประวัติการเติมสาร' }), el('p', {}, [formLink('form-refill', { detail: r.kind, plate: r.no, equip: r.assetNo }, 'บันทึกการเติมสารถังนี้')]), dataView('refills', function (rf) { var hit = rf.filter(function (x) { return r.assetNo !== '' && normKey(x.assetNo) === normKey(r.assetNo) || normKey(x.plate) === normKey(r.no) && r.no !== ''; });
                return hit.length ? table(['วันที่เติม', 'สารเคมี', 'น้ำหนักก่อน/หลัง', 'บริษัท'], hit.map(function (x) { return [x.date ? dLabel(String(x.date)) : '–', x.agent || '–', (x.before || '–') + ' / ' + (x.after || '–'), x.vendor || '–']; }), {}) : el('p', { class: 'src', text: 'ยังไม่มีประวัติการเติมสารในต้นทาง' }); })]) : null])); } }); })); } }),
        aed ? el('p', { class: 'src' }, ['ไม่รวมเครื่อง AED ' + num(aed) + ' รายการ — ดูที่หน้า ', el('a', { href: '#aed', text: 'เครื่อง AED' })]) : null, liveNote(d, 'fire')]);
    })]);
  }

  /* ---------- แบบฟอร์ม ---------- */
  function formKind(u) { return /docs\.google\.com\/forms/.test(u) ? 'Google Forms' : /github\.io/.test(u) ? 'ระบบที่พัฒนาเอง' : 'ลิงก์ภายนอก'; }
  function formIcon(n) { n = String(n || ''); return /ไม่ปกติ|เหตุการณ์|อุบัติเหตุ/.test(n) ? '🚨' : /วิทยุ/.test(n) ? '📻' : /ขยะ/.test(n) ? '🗑️' : /เติมสาร|ดับเพลิง/.test(n) ? '🧯' : /ทำความสะอาด|ล้าง/.test(n) ? '🧽' : /ตรวจ/.test(n) ? '🔍' : /รถ|ยานพาหนะ/.test(n) ? '🚗' : /ของหาย|ทรัพย์สิน/.test(n) ? '🎒' : '📄'; }

  /* ---------- ประวัติการตรวจสภาพ ---------- */
  var CHECK_LABELS = ['1. ลมยาง', '2. สภาพเนื้อยาง/ดอกยาง', '3. กะทะล้อ/น็อตล้อ', '4. ระบบเบรก', '5. ช่วงล่าง/โช้คอัพ', '6. ระบบไฟฟ้า/แตร', '7. แบตเตอรี่/ของเหลว', '8. ระบบขับเคลื่อน', '9. สภาพตัวถัง'];
  PAGES['inspection-history'] = function (v) {
    v.appendChild(pageHead('ประวัติการตรวจสภาพ', 'ผลตรวจสภาพยานพาหนะและอุปกรณ์ดับเพลิงรายครั้ง'));
    v.appendChild(el('div', { class: 'sec' }, [dataView('inspections', function (rows, d) {
      rows = rows.filter(function (r) { return r.at; }).sort(function (a, b) { return a.at < b.at ? 1 : -1; });
      var ok = function (r) { return /^สามารถ/.test(r.status); }, types = {}; rows.forEach(function (r) { types[r.type] = 1; });
      return el('div', {}, [kpiGrid([{ icon: 'file', label: 'การตรวจทั้งหมด', value: num(rows.length), unit: 'ครั้ง', sub: rows.length ? 'ล่าสุด ' + dLabel(String(rows[0].at)) : '', color: C.c3 },
        { icon: 'check', label: 'สามารถใช้งานได้', value: num(rows.filter(ok).length), unit: 'ครั้ง', color: C.c1 }, { icon: 'alert', label: 'ต้องส่งซ่อม/แก้ไข', value: num(rows.length - rows.filter(ok).length), unit: 'ครั้ง', color: C.fine }]),
        el('div', { style: 'margin-top:14px' }, [listUI({ rows: rows, unit: 'ครั้ง', per: 20, placeholder: 'ค้นหารุ่น ทะเบียน เลขครุภัณฑ์…', text: function (r) { return [r.type, r.model, r.plate, r.assetNo, r.status].join(' '); },
          filters: [{ id: 'all', label: 'ทั้งหมด', test: function () { return true; } }, { id: 'bad', label: 'ต้องส่งซ่อม', test: function (r) { return !ok(r); } }].concat(Object.keys(types).sort().map(function (t) { return { id: t, label: t, test: function (r) { return r.type === t; } }; })),
          render: function (page) { var tb = table(['วันเวลา', 'ประเภท', 'ยี่ห้อ/รุ่น', 'ทะเบียน/เลขที่', 'สรุปสถานะ'], page.map(function (r) { return [fdate(r.at), r.type, r.model || '–', r.plate || '–', r.status || '–']; }), {});
            Array.prototype.forEach.call(tb.querySelectorAll('tbody tr'), function (tr, i) { var r = page[i]; tr.tabIndex = 0; tr.classList.add('rowlink'); tr.setAttribute('aria-label', 'ดูผลตรวจ ' + (r.model || '') + ' ' + fdate(r.at));
              var open = function () { detailDlg((r.model || r.type) + ' · ' + fdate(r.at), [['ประเภท', r.type], ['ยี่ห้อ/รุ่น', r.model], ['สี/สถานที่', r.color], ['ทะเบียน/เลขที่', r.plate], ['หมายเลขครุภัณฑ์', r.assetNo]].concat(CHECK_LABELS.map(function (l, j) { return [l, r['c' + (j + 1)]]; })).concat([['หมายเหตุเพิ่มเติม', r.remark], ['สรุปสถานะการใช้งาน', r.status]]), []); };
              tr.onclick = open; tr.onkeydown = function (e) { if (e.key === 'Enter') open(); }; });
            return tb; } })]), liveNote(d, 'inspections')]);
    })]));
  };

  /* ---------- ข้อมูลภายใน (ผ่านบริการข้อมูลที่ตรวจตัวตนเท่านั้น) ---------- */
  function staffPage(unitKey, title) {
    return function (v) {
      v.appendChild(pageHead(title, 'ทำเนียบบุคลากรงานจราจรและความปลอดภัย'));
      v.appendChild(el('div', { class: 'sec' }, [dataView('staff', function (rows) {
        rows = rows.filter(function (r) { return r.name && (!unitKey || String(r.unit || '').indexOf(unitKey) >= 0); });
        var units = {}; rows.forEach(function (r) { if (r.unit) units[r.unit] = 1; });
        return listUI({ rows: rows, unit: 'คน', placeholder: 'ค้นหาชื่อ ตำแหน่ง…', text: function (r) { return [r.name, r.position, r.unit].join(' '); },
          filters: unitKey ? null : [{ id: 'all', label: 'ทั้งหมด', test: function () { return true; } }].concat(Object.keys(units).sort().map(function (u) { return { id: u, label: u.replace(/^หน่วย/, ''), test: function (r) { return r.unit === u; } }; })),
          render: function (page) { return el('div', { class: 'it-grid people' }, page.map(function (r) { return itemCard({ img: r.photo, tag: r.isHead ? 'หัวหน้าหน่วย' : '', title: r.name, sub: r.position || '', meta: [r.unit, r.phone ? 'โทร ' + r.phone : ''].filter(Boolean).join(' · '),
            open: function () { detailDlg(r.name, [['ตำแหน่ง', r.position], ['หน่วย', r.unit], ['เบอร์โทร', r.phone]], imgSrc(r.photo) ? [r.photo] : []); } }); })); } });
      })]));
    };
  }
  PAGES.staff = staffPage('', 'บุคลากรทั้งหมด'); PAGES['staff-strategy'] = staffPage('ยุทธศาสตร์', 'หน่วยยุทธศาสตร์และพัฒนาระบบความปลอดภัย'); PAGES['staff-ops'] = staffPage('ปฏิบัติการ', 'หน่วยปฏิบัติการจราจรและรักษาความปลอดภัย');
  function areaPage(cat, title, desc) {
    return function (v) {
      v.appendChild(pageHead(title, desc));
      v.appendChild(el('div', { class: 'sec' }, [dataView('areaPhotos', function (rows) {
        rows = rows.filter(function (r) { return r.category === cat && imgSrc(r.url); }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
        var months = {}; rows.forEach(function (r) { months[String(r.date).slice(0, 7)] = 1; });
        return el('div', {}, [areaStats(rows, title), listUI({ rows: rows, unit: 'ภาพ', per: 30, placeholder: 'ค้นหาวันที่ (ปปปป-ดด-วว) หรือชื่อไฟล์…', text: function (r) { return String(r.date) + ' ' + (r.file || ''); },
          filters: [{ id: 'all', label: 'ทั้งหมด', test: function () { return true; } }].concat(Object.keys(months).sort().reverse().slice(0, 6).map(function (m) { return { id: m, label: mLabel(m), test: function (r) { return String(r.date).slice(0, 7) === m; } }; })),
          render: function (page) { return el('div', { class: 'it-grid photos' }, page.map(function (r) {
            if (cat === 'ช่วยเหลือ') return itemCard({ img: r.url, tag: 'ให้ความช่วยเหลือ', title: fdate(String(r.date)) + (fileTime(r.file) ? ' เวลา ' + fileTime(r.file) + ' น.' : ''), sub: 'กดเพื่อดูภาพและรายละเอียด', open: function () { openAssist(r); } });
            return el('figure', { class: 'card ph-tile' }, [pic(r.url, title + ' ' + dLabel(String(r.date))), el('figcaption', { text: fdate(String(r.date)) })]); })); } })]);
      })]));
    };
  }
  /* ให้ความช่วยเหลือ: ต้นทาง (แท็บ “ภาพการตรวจพื้นที่”) มีเพียง วันที่ ชื่อไฟล์ ลิงก์ภาพ และหมวดหมู่ — ไม่มีคอลัมน์หรือแท็บอื่นที่เชื่อมกับภาพด้วยคีย์จริง
   * (ตรวจแล้ว 16 พ.ย. 2569: บันทึกวิทยุไม่มีรหัสภาพ/รหัสงาน · ไฟล์ภาพไม่มีคำอธิบายใน Drive) จึงแสดงเท่าที่มีจริง ไม่เดาเรื่องจากภาพ */
  function fileTime(f) { var m = /^\d{8}_(\d{2})(\d{2})\d{2}\b/.exec(String(f || '')); return m ? m[1] + ':' + m[2] : ''; }
  function openAssist(r) {
    var dl = el('dl', { class: 'dlg-dl' }), add = function (k, v) { if (v) { dl.appendChild(el('dt', { text: k })); dl.appendChild(el('dd', { text: v })); } };
    add('วันที่', fdate(String(r.date).slice(0, 10))); add('เวลาถ่ายภาพ (จากชื่อไฟล์)', fileTime(r.file) ? fileTime(r.file) + ' น.' : ''); add('หมวดหมู่', r.category);
    add('ประเภทการช่วยเหลือ / สถานที่ / ผลการดำเนินการ', 'ต้นทางยังไม่ได้บันทึกรายละเอียดการช่วยเหลือ');
    panelDlg('ให้ความช่วยเหลือ — ' + fdate(String(r.date).slice(0, 10)), el('div', {}, [gallery(r.images && r.images.length ? r.images : [r.url], 'ภาพการให้ความช่วยเหลือ ' + fdate(String(r.date).slice(0, 10))), dl,
      el('p', { class: 'src', text: 'ที่มา: ข้อมูลงานจราจรออนไลน์ → แท็บ “ภาพการตรวจพื้นที่” (หมวด ช่วยเหลือ) · ต้นทางมีเฉพาะวันที่ ชื่อไฟล์ และภาพ' })]));
  }
  PAGES['area-inspect'] = areaPage('ตรวจพื้นที่', 'ตรวจพื้นที่', 'ภาพการตรวจพื้นที่ส่วนกลาง เรียงจากล่าสุด');
  PAGES['area-assist'] = areaPage('ช่วยเหลือ', 'ให้ความช่วยเหลือ', 'ภาพการให้ความช่วยเหลือผู้ใช้พื้นที่ เรียงจากล่าสุด');
  PAGES['area-traffic'] = areaPage('การจราจร', 'งานจราจร', 'ภาพการปฏิบัติงานด้านจราจร เรียงจากล่าสุด');
  PAGES['report-radio'] = function (v) {
    v.appendChild(pageHead('รายงานวิทยุสื่อสาร', 'บันทึกของศูนย์วิทยุสื่อสาร เรียงจากล่าสุด'));
    v.appendChild(el('div', { class: 'sec' }, [dataView('radio', function (rows) {
      rows = rows.slice().sort(function (a, b) { return a.at < b.at ? 1 : -1; }); var types = {}; rows.forEach(function (r) { if (r.type) types[r.type] = 1; });
      return listUI({ rows: rows, unit: 'รายการ', per: 20, placeholder: 'ค้นหาสถานที่ ประเภท รายละเอียด…', text: function (r) { return [r.type, r.place, r.detail, r.unit, r.status].join(' '); },
        filters: [{ id: 'all', label: 'ทั้งหมด', test: function () { return true; } }].concat(Object.keys(types).sort().slice(0, 8).map(function (t) { return { id: t, label: t, test: function (r) { return r.type === t; } }; })),
        render: function (page) { var tb = table(['วันเวลา', 'ประเภทเหตุการณ์', 'สถานที่', 'สถานะ'], page.map(function (r) { return [fdate(r.at), r.type || '–', r.place || '–', r.status || '–']; }), {});
          Array.prototype.forEach.call(tb.querySelectorAll('tbody tr'), function (tr, i) { var r = page[i]; tr.tabIndex = 0; tr.classList.add('rowlink');
            var open = function () { detailDlg((r.type || 'บันทึกวิทยุ') + ' · ' + fdate(r.at), [['หน่วยงานที่แจ้ง', r.unit], ['ผู้แจ้ง', r.reporter], ['เจ้าหน้าที่ศูนย์วิทยุ', r.operator], ['สถานที่เกิดเหตุ', r.place], ['รายละเอียด', r.detail], ['การดำเนินการของศูนย์', r.action], ['สถานะ', r.status]], []); };
            tr.onclick = open; tr.onkeydown = function (e) { if (e.key === 'Enter') open(); }; });
          return tb; } });
    })]));
  };
  ['staff', 'staff-strategy', 'staff-ops', 'area-inspect', 'area-assist', 'area-traffic', 'report-radio'].forEach(function (id) { PAGE_TITLE[id] = PAGE_TITLE[id] || id; });

  /* ---------- รายงานประจำวัน: สถิติรวมของวันที่เลือก (จากข้อมูลรายวันที่ตรวจแล้ว) ---------- */
  /* แพตช์ท้าย: หัวรายงานประจำวันบอกเวลาอ่านต้นทางรายแหล่ง (ไม่ใช้เวลาเหตุการณ์เวลาเดียวแทนทุกแหล่ง)
   * เวลาอ่านต้นทาง ≠ วันที่รายการล่าสุด ≠ เวลาสร้างไฟล์สรุป */
  function repDailyDesc() {
    var inc = extra('incidentsDaily'), lfd = extra('lostfoundDaily'), g = mod('gate');
    return 'สรุปตัวเลขของวันที่เลือก · อ่านต้นทาง: เหตุการณ์ ' + srcReadTxt('incidents', inc && inc.checkedAt) + ' · L&F ' + srcReadTxt('lostfound', lfd && lfd.checkedAt) + ' · รถเข้า ' + srcReadTxt('gate', stampTxt(DATA.stats.generatedAt || ''));
  }
  PAGES['report-daily'] = function (v) {
    var inc = extra('incidentsDaily'), lfd = extra('lostfoundDaily'), gate = mod('gate'), t = todayStr();
    var icv = coverOf(inc), cover = inc ? (icv.ok ? icv.day : inc.lastEntry) : t, day = state.repDay && state.repDay <= cover ? state.repDay : (t <= cover ? t : cover);
    var inp = el('input', { type: 'date', value: day, max: cover, 'aria-label': 'เลือกวันที่' }); inp.onchange = function () { if (inp.value) { state.repDay = inp.value; route(true); } };
    v.appendChild(liveText(pageHead('รายงานประจำวัน', repDailyDesc(), el('div', { class: 'ctrls' }, [ic('calendar'), el('label', { text: 'วันที่' }), inp,
      el('button', { type: 'button', class: 'btn-ghost', text: 'ก่อนหน้า', onclick: function () { state.repDay = addDays(day, -1); route(true); } }), el('button', { type: 'button', class: 'btn-ghost', text: 'ถัดไป', disabled: day >= cover ? '' : null, onclick: function () { state.repDay = addDays(day, 1); route(true); } })])), '.ph p', repDailyDesc));
    var s = incSum(incRows(function (r) { return r.date === day; })), g = gate ? gate.daily.filter(function (r) { return r.date === day; })[0] : null, l = lfd ? lfd.rows.filter(function (r) { return r.date === day; })[0] : null;
    v.appendChild(section('เหตุการณ์และอุบัติเหตุ — ' + dLabel(day), { more: 'traffic' }, [kpiGrid([{ icon: 'alert', label: 'เหตุการณ์ทั้งหมด', value: num(s.n), unit: 'เหตุการณ์', color: C.c1 }, { icon: 'car', label: 'อุบัติเหตุจากยานพาหนะ', value: num(s.v), unit: 'เหตุ', color: C.c3 },
      { icon: 'alert', label: 'อุบัติเหตุทั่วไป', value: num(s.g), unit: 'เหตุ', color: C.c2 }, { icon: 'heart', label: 'รับส่งผู้ป่วย', value: num(s.p), unit: 'ครั้ง', color: C.c4 }, { icon: 'users', label: 'ผู้บาดเจ็บ/ผู้ป่วย', value: num(s.inj), unit: 'คน', color: C.fine }])]));
    v.appendChild(section('รถเข้าและหมวกนิรภัย', { more: 'gate' }, [kpiGrid(g ? [{ icon: 'car', label: 'รถยนต์เข้า', value: num(g.cars), unit: 'คัน', color: C.c3 }, { icon: 'car', label: 'รถจักรยานยนต์เข้า', value: num(g.motorcycles), unit: 'คัน', color: C.c1 }, { icon: 'helmet', label: 'ผู้ไม่สวมหมวกนิรภัย', value: num(g.noHelmet), unit: 'ราย', color: C.c2 }]
      : [{ icon: 'car', label: 'รถเข้ามหาวิทยาลัย', na: 'ไม่มีข้อมูลของวันนี้', sub: gate ? 'ต้นทางมีข้อมูลถึง ' + dLabel(gate.daily[gate.daily.length - 1].date) : '', color: C.c5 }])]));
    v.appendChild(section('Lost & Found', { more: 'lostfound' }, [kpiGrid(lfd && day >= lfd.from && day <= (coverOf(lfd).ok ? coverOf(lfd).day : lfd.lastEntry) ? [{ icon: 'search', label: 'แจ้งของหาย', value: num(l ? l.lost : 0), unit: 'รายการ', color: C.c4 }, { icon: 'box', label: 'เก็บของได้', value: num(l ? l.found : 0), unit: 'รายการ', color: C.c1 }, { icon: 'file', label: 'แบบฟอร์มรับของคืน', value: num(l ? l.returnForms : 0), unit: 'ฉบับ', color: C.c3 }]
      : [{ icon: 'search', label: 'Lost & Found', na: 'ข้อมูลรายวันยังไม่รองรับช่วงนี้', sub: lfd ? 'มีข้อมูลรายวันตั้งแต่ ' + dLabel(lfd.from) : '', color: C.c5 }])]));
    v.appendChild(section('บันทึกศูนย์วิทยุสื่อสารของวันนี้', { more: 'report-radio' }, [dataView('radio', function (rows) { var hit = rows.filter(function (r) { return String(r.at).slice(0, 10) === day; });
      return hit.length ? table(['เวลา', 'ประเภทเหตุการณ์', 'สถานที่', 'สถานะ'], hit.map(function (r) { return [String(r.at).slice(11, 16), r.type || '–', r.place || '–', r.status || '–']; }), {}) : el('div', { class: 'empty', text: 'ไม่มีบันทึกของวันที่เลือก' }); })]));
  };

  /* ---------- แบบฟอร์มที่พัฒนาเอง (ย้าย UI / การตรวจข้อมูล / การเติมค่าอัตโนมัติ มาจากระบบเดิม) ----------
   * การบันทึกจริงต้องผ่านบริการที่ตรวจตัวตน (config.js → formApiUrl) — ถ้ายังไม่ได้ตั้งค่า แบบฟอร์มจะตรวจข้อมูลให้แต่ไม่ส่ง และไม่แสดงว่าบันทึกสำเร็จ
   * เปิดพร้อมค่าเริ่มต้นได้ เช่น #form-clean?model=…&plate=…&equip=… (ลิงก์จากหน้ารายละเอียดยานพาหนะ/อุปกรณ์) */
  function hashQuery() { var h = location.hash || '', i = h.indexOf('?'), o = {}; if (i < 0) return o; h.slice(i + 1).split('&').forEach(function (p) { var kv = p.split('='); try { o[decodeURIComponent(kv[0])] = decodeURIComponent((kv[1] || '').replace(/\+/g, ' ')); } catch (e) {} }); return o; }
  var WASTE = [['wasteGeneral', 'ขยะทั่วไป'], ['wasteRecycle', 'ขยะรีไซเคิล'], ['wasteOrphan', 'ขยะกำพร้า'], ['wasteFuel', 'ขยะทำเชื้อเพลิง'], ['wasteOrganic', 'ขยะอินทรีย์/ขยะเปียก'], ['wasteHazard', 'ขยะอันตราย'], ['wasteInfect', 'ขยะติดเชื้อ (ถ้ามี)']];
  var FORM_DEFS = {
    'form-clean': { title: 'แบบบันทึกการทำความสะอาดยานพาหนะ', sheet: 'การทำความสะอาดยานพาหนะ', back: 'vehicle-fleet', images: 5, fields: [
      { k: 'รุ่นรถ', l: 'ยี่ห้อ/รุ่น', pre: 'model' }, { k: 'ทะเบียน', l: 'ทะเบียน', pre: 'plate', req: true }, { k: 'หมายเลขครุภัณฑ์', l: 'หมายเลขครุภัณฑ์', pre: 'equip' },
      { k: 'วันที่', l: 'วันที่ทำความสะอาด', type: 'date', req: true, today: true }, { k: 'ผู้ดำเนินการ', l: 'ผู้ดำเนินการ', req: true, ph: 'ระบุชื่อผู้รับผิดชอบ' }, { k: 'หมายเหตุ', l: 'หมายเหตุ', type: 'textarea', ph: 'ระบุรายละเอียดเพิ่มเติม…' }] },
    'form-refill': { title: 'แบบบันทึกการเติมสารถังดับเพลิง', sheet: 'ประวัติการเติมสารถังดับเพลิง', back: 'safety', images: 1, fields: [
      { k: 'ชนิดถัง', l: 'ชนิดถัง', pre: 'detail' }, { k: 'ทะเบียน', l: 'เลขที่ถัง', pre: 'plate', req: true }, { k: 'หมายเลขครุภัณฑ์', l: 'หมายเลขครุภัณฑ์', pre: 'equip' },
      { k: 'วันที่เติม', l: 'วันที่เติม', type: 'date', req: true, today: true }, { k: 'สารเคมีที่เติม', l: 'สารเคมีที่เติม', req: true, ph: 'เช่น ผงเคมีแห้ง (Dry Chemical)' },
      { k: 'น้ำหนักก่อนเติม', l: 'น้ำหนักก่อนเติม (กก.)', type: 'number', ph: 'เช่น 2.5' }, { k: 'น้ำหนักหลังเติม', l: 'น้ำหนักหลังเติม (กก.)', type: 'number', req: true, ph: 'เช่น 10.0' },
      { k: 'บริษัทที่เติม', l: 'บริษัทที่เติม', req: true, ph: 'ระบุชื่อบริษัท/ร้านที่รับเติมสาร' }, { k: 'หมายเหตุ', l: 'หมายเหตุ', type: 'textarea' }],
      check: function (val) { var b = val['น้ำหนักก่อนเติม'], a = val['น้ำหนักหลังเติม']; return b !== '' && a !== '' && +a < +b ? { 'น้ำหนักหลังเติม': 'น้ำหนักหลังเติมต้องไม่น้อยกว่าน้ำหนักก่อนเติม' } : {}; } },
    'form-waste': { title: 'แบบบันทึกการจัดการขยะ', sheet: 'การจัดการขยะ', back: 'forms', images: 5, fields: [{ k: 'reporterName', l: 'ชื่อ-สกุล ผู้รายงาน', req: true }, { k: 'position', l: 'ตำแหน่ง', req: true }]
      .concat(WASTE.map(function (w) { return { k: w[0], l: w[1] + ' (กก.)', type: 'number', ph: '0' }; })),
      check: function (val) { return WASTE.some(function (w) { return +val[w[0]] > 0; }) ? {} : { wasteGeneral: 'กรอกน้ำหนักขยะอย่างน้อย 1 ประเภท' }; } },
    'forms-radio': { title: 'แบบบันทึกศูนย์วิทยุสื่อสาร', sheet: 'บันทึกรายงานวิทยุสื่อสาร', back: 'report-radio', images: 0, fields: [
      { k: 'วันเวลาที่บันทึก', l: 'วันเวลาที่บันทึก', type: 'datetime-local', req: true, now: true }, { k: 'เจ้าหน้าที่ศูนย์วิทยุ', l: 'เจ้าหน้าที่ศูนย์วิทยุ' }, { k: 'หน่วยงานที่แจ้ง', l: 'หน่วยงานที่แจ้ง' }, { k: 'ชื่อ รปภ./ผู้แจ้ง', l: 'ชื่อ รปภ./ผู้แจ้ง' },
      { k: 'ประเภทเหตุการณ์', l: 'ประเภทเหตุการณ์', req: true }, { k: 'สถานที่เกิดเหตุ', l: 'สถานที่เกิดเหตุ' }, { k: 'รายละเอียด/ข้อความ', l: 'รายละเอียด/ข้อความ', type: 'textarea' },
      { k: 'การดำเนินการของศูนย์', l: 'การดำเนินการของศูนย์', type: 'checks', opts: ['ประสานสายตรวจ', 'ประสานกู้ชีพ/พยาบาล', 'แจ้งสถานีตำรวจ', 'รายงานผู้บังคับบัญชา', 'เรียกรถ taxi'] },
      { k: 'สถานะ', l: 'สถานะ', type: 'select', req: true, opts: ['รับแจ้ง', 'กำลังดำเนินการตรวจสอบ', 'ระงับเหตุเรียบร้อย (ปิดงาน)'] }] }
  };
  function formPage(id) {
    return function (v) {
      var def = FORM_DEFS[id], q = hashQuery(), t = todayStr(), n = bkkNow(), inputs = {}, errs = {}, files = [];
      v.appendChild(pageHead(def.title, 'บันทึกลงแท็บ “' + def.sheet + '” ของระบบเดิม'));
      var form = el('form', { class: 'card hform', novalidate: '', 'aria-label': def.title }), msg = el('div', { class: 'hform-msg', role: 'status', 'aria-live': 'polite' });
      def.fields.forEach(function (f) {
        var pre = f.pre && q[f.pre] != null && q[f.pre] !== '' ? q[f.pre] : '', idn = 'f_' + id + '_' + f.k.replace(/[^\w]/g, ''), box, inp;
        if (f.type === 'checks') { inp = el('div', { class: 'hform-checks', role: 'group', 'aria-label': f.l }, f.opts.map(function (o) { return el('label', {}, [el('input', { type: 'checkbox', value: o }), ' ' + o]); })); }
        else if (f.type === 'select') { inp = el('select', { id: idn }, [el('option', { value: '', text: '— เลือก —' })].concat(f.opts.map(function (o) { return el('option', { value: o, text: o }); }))); }
        else if (f.type === 'textarea') inp = el('textarea', { id: idn, rows: '3', placeholder: f.ph || null });
        else inp = el('input', { id: idn, type: f.type || 'text', placeholder: f.ph || null, step: f.type === 'number' ? 'any' : null, min: f.type === 'number' ? '0' : null, max: f.type === 'date' ? t : null, inputmode: f.type === 'number' ? 'decimal' : null });
        if (pre) { inp.value = pre; inp.readOnly = true; inp.classList.add('ro'); }
        else if (f.today) inp.value = t; else if (f.now) inp.value = t + 'T' + pad2(n.h) + ':' + pad2(new Date(Date.now() + 7 * 3600000).getUTCMinutes());
        var er = el('span', { class: 'hform-err', id: idn + '_e' }); errs[f.k] = er; inputs[f.k] = inp; if (f.type !== 'checks') inp.setAttribute('aria-describedby', idn + '_e');
        box = el('div', { class: 'hform-f' + (f.type === 'textarea' || f.type === 'checks' ? ' wide' : '') }, [el('label', { for: f.type === 'checks' ? null : idn }, [f.l, f.req ? el('b', { class: 'req', 'aria-label': 'จำเป็น', text: ' *' }) : null]), inp, er]);
        form.appendChild(box);
      });
      if (def.images) { var fi = el('input', { type: 'file', accept: 'image/*', multiple: def.images > 1 ? '' : null, id: 'f_' + id + '_img' }), fe = el('span', { class: 'hform-err' });
        fi.onchange = function () { files = Array.prototype.slice.call(fi.files || []); fe.textContent = files.length > def.images ? 'แนบได้ไม่เกิน ' + def.images + ' ภาพ' : files.some(function (x) { return x.size > 8 * 1048576; }) ? 'แต่ละภาพต้องไม่เกิน 8 MB' : ''; };
        errs.__img = fe; form.appendChild(el('div', { class: 'hform-f wide' }, [el('label', { for: fi.id, text: 'ภาพประกอบ (ไม่เกิน ' + def.images + ' ภาพ)' }), fi, fe])); }
      function values() { var o = {}; def.fields.forEach(function (f) { o[f.k] = f.type === 'checks' ? Array.prototype.filter.call(inputs[f.k].querySelectorAll('input'), function (c) { return c.checked; }).map(function (c) { return c.value; }).join(', ') : String(inputs[f.k].value || '').trim(); }); return o; }
      function validate() {
        var val = values(), bad = {};
        def.fields.forEach(function (f) { var x = val[f.k]; if (f.req && x === '') bad[f.k] = 'จำเป็นต้องกรอก'; else if (f.type === 'number' && x !== '' && !(+x >= 0)) bad[f.k] = 'ต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป'; else if (f.type === 'date' && x > t) bad[f.k] = 'วันที่ต้องไม่เกินวันนี้'; });
        var extraBad = def.check ? def.check(val) : {}; Object.keys(extraBad).forEach(function (k) { if (!bad[k]) bad[k] = extraBad[k]; });
        if (errs.__img && errs.__img.textContent) bad.__img = errs.__img.textContent;
        def.fields.forEach(function (f) { errs[f.k].textContent = bad[f.k] || ''; if (f.type !== 'checks') inputs[f.k].setAttribute('aria-invalid', bad[f.k] ? 'true' : 'false'); });
        return { ok: !Object.keys(bad).length, val: val, first: Object.keys(bad)[0] };
      }
      var btn = el('button', { type: 'submit', class: 'btn', text: HCFG.formApiUrl ? 'บันทึก' : 'ตรวจข้อมูล' });
      form.appendChild(el('div', { class: 'hform-f wide hform-act' }, [btn, el('a', { class: 'btn sec', href: '#' + def.back, text: 'ยกเลิก' }), msg]));
      form.onsubmit = function (e) {
        e.preventDefault(); msg.className = 'hform-msg'; msg.textContent = '';
        var r = validate();
        if (!r.ok) { msg.classList.add('bad'); msg.textContent = 'ยังบันทึกไม่ได้ — แก้ไขช่องที่มีข้อความสีแดง'; if (inputs[r.first] && inputs[r.first].focus) inputs[r.first].focus(); return; }
        if (!HCFG.formApiUrl) { msg.classList.add('warn'); msg.textContent = 'ข้อมูลครบถ้วน แต่ยังไม่ได้บันทึก: เว็บไซต์นี้ยังไม่ได้เชื่อมบริการบันทึกข้อมูล — ข้อมูลที่กรอกไม่ได้ถูกส่งไปที่ใด'; return; }
        var fd = new FormData(); fd.append('form', id); fd.append('sheet_name', def.sheet); Object.keys(r.val).forEach(function (k) { fd.append(k, r.val[k]); }); files.forEach(function (x, i) { fd.append('img' + (i + 1), x); });
        btn.disabled = true; msg.textContent = 'กำลังบันทึก…';
        fetch(HCFG.formApiUrl, { method: 'POST', body: fd, credentials: 'include' }).then(function (res) { return res.json().then(function (j) { return { s: res.status, j: j }; }, function () { return { s: res.status, j: null }; }); })
          .then(function (x) { btn.disabled = false;
            if (x.s === 401 || x.s === 403) { msg.classList.add('bad'); msg.textContent = 'ยังไม่ได้บันทึก — บัญชีนี้ยังไม่ได้เข้าสู่ระบบหรือไม่มีสิทธิ์บันทึก'; }
            else if (x.s >= 200 && x.s < 300 && x.j && x.j.ok === true) { msg.classList.add('ok'); msg.textContent = 'บันทึกแล้ว' + (x.j.ref ? ' · เลขอ้างอิง ' + x.j.ref : ''); form.reset(); }
            else if (x.s === 503 && x.j && x.j.code === 'write-disabled') { msg.classList.add('warn'); msg.textContent = 'ยังไม่ได้บันทึก — บริการบันทึกข้อมูลยังไม่เปิดใช้งาน'; }
            else if (x.s === 422) { msg.classList.add('bad'); msg.textContent = 'ยังไม่ได้บันทึก — บริการตรวจพบข้อมูลไม่ถูกต้อง' + (x.j && x.j.fields ? ': ' + x.j.fields.join(', ') : ''); }
            else if (x.s === 429) { msg.classList.add('bad'); msg.textContent = 'ยังไม่ได้บันทึก — ส่งถี่เกินกำหนด รอสักครู่แล้วลองใหม่'; }
            else { msg.classList.add('bad'); msg.textContent = 'ยังไม่ได้บันทึก — บริการตอบกลับผิดพลาด (HTTP ' + x.s + ') ลองใหม่อีกครั้ง'; } },
          function () { btn.disabled = false; msg.classList.add('bad'); msg.textContent = 'ยังไม่ได้บันทึก — เชื่อมต่อบริการบันทึกข้อมูลไม่ได้ ข้อมูลที่กรอกยังอยู่ในหน้านี้'; });
      };
      v.appendChild(el('div', { class: 'sec' }, [form]));
    };
  }
  delete FORM_DEFS['form-waste']; ALIAS['form-waste'] = 'forms';     /* รอบ 9: เลิกแสดงแบบบันทึกการจัดการขยะในเว็บนี้ (ไม่ลบข้อมูลต้นทาง) — ลิงก์เดิมพาไปหน้าแบบฟอร์ม */
  Object.keys(FORM_DEFS).forEach(function (id) { PAGES[id] = formPage(id); PAGE_TITLE[id] = FORM_DEFS[id].title; if (id !== 'forms-radio') PAGE_GROUP[id] = PAGE_GROUP.forms; });
  function formLink(id, params, label) { return el('a', { class: 'btn sec', href: '#' + id + '?' + Object.keys(params).filter(function (k) { return params[k] !== '' && params[k] != null; }).map(function (k) { return k + '=' + encodeURIComponent(params[k]); }).join('&'), text: label, onclick: function () { var d = document.querySelector('.dlg-ov'); if (d) d.remove(); } }); }

  /* ---------- ผู้ช่วย AI (ปุ่มมุมล่างขวา) ----------
   * ส่งคำถาม + ช่วงเวลาที่กำลังดู ไปยังบริการ (config.js → aiApiUrl) ที่ตรวจตัวตน จำกัดจำนวนคำถาม และคำนวณตัวเลขจากไฟล์สถิติรวมฝั่งบริการ
   * หน้าเว็บไม่มี key/token และไม่ส่งรายชื่อ รูป หรือรายละเอียดรายบุคคล · ยังไม่ได้ตั้งค่า = แจ้งว่ายังเชื่อมต่อไม่ได้ (ไม่มีคำตอบจำลอง) */
  var chat = { hist: [], busy: false, last: '' };
  /* ปุ่มผู้ช่วย AI: 3 แบบ (จำแยกตามเบราว์เซอร์ เป็นค่าการแสดงผลเท่านั้น ไม่ใช่สิทธิ์) — robot = รูปหุ่นยนต์ + “ถาม AI” · text = ปุ่มข้อความ “ถาม AI” · hidden = ซ่อนปุ่มลอย (เปิดกลับได้ที่หน้าตั้งค่า/หน้าผู้ช่วย AI) */
  var ROBOT_SRC = window.__HUB_ROBOT__ || 'assets/images/ai-assistant.png';
  function fabMode() { var m = store('hub.aiFab'); return m === 'text' || m === 'hidden' ? m : 'robot'; }
  function setFabMode(m) { store('hub.aiFab', m); var f = $('chatFab'); if (f) { f.className = 'chat-fab mode-' + m; f.hidden = m === 'hidden'; } }
  function fabModeCtl() {
    return el('div', { class: 'seg', role: 'group', 'aria-label': 'รูปแบบปุ่มผู้ช่วย AI' }, [['robot', 'หุ่นยนต์ + “ถาม AI”'], ['text', 'ปุ่มข้อความ “ถาม AI”'], ['hidden', 'ซ่อนปุ่ม']].map(function (o) {
      return el('button', { type: 'button', 'aria-pressed': String(fabMode() === o[0]), text: o[1], onclick: function () { setFabMode(o[0]); route(true); } }); }));
  }
  /* ข้อความตอบ: แปลง #รหัสหน้า ที่มีอยู่จริงในเว็บนี้เป็นลิงก์ภายใน (ไม่สร้างลิงก์ภายนอก) */
  function richText(t) {
    var p = el('p'); String(t).split(/(#[a-z0-9-]+)/).forEach(function (x) { var id = x.charAt(0) === '#' ? ALIAS[x.slice(1)] || x.slice(1) : ''; if (id && PAGES[id]) p.appendChild(el('a', { href: '#' + id, text: PAGE_TITLE[id] || id })); else p.appendChild(document.createTextNode(x)); });
    return p;
  }
  var CHAT_ERR = { 'rate-limited': 'ถามถี่เกินกำหนด (จำกัดต่อนาที/ต่อวันเพื่อไม่ให้เกินโควตาฟรี) — รอสักครู่แล้วลองใหม่', 'llm-quota': 'โควตาบริการ AI แบบไม่มีค่าใช้จ่ายของวันนี้หมดแล้ว — ลองใหม่พรุ่งนี้ หรือดูตัวเลขจากหน้ารายงานได้ตามปกติ',
    'llm-timeout': 'บริการ AI ใช้เวลานานเกินไป — ลองถามใหม่ให้สั้นลง', 'llm-unreachable': 'เชื่อมต่อบริการ AI ไม่ได้ชั่วคราว — ลองใหม่อีกครั้ง', 'llm-schema': 'บริการ AI ตอบกลับไม่สมบูรณ์ — ลองใหม่อีกครั้ง',
    'llm-not-configured': 'บริการผู้ช่วย AI ยังตั้งค่าไม่ครบ จึงยังตอบไม่ได้', 'stats-unavailable': 'อ่านสถิติรวมไม่สำเร็จ จึงยังตอบไม่ได้ — ลองใหม่อีกครั้ง', 'bad-origin': 'คำขอไม่ได้มาจากหน้าเว็บนี้' };
  function setupChat() {
    var log = el('div', { class: 'chat-log', role: 'log', 'aria-live': 'polite', 'aria-label': 'ข้อความสนทนา' }), inp = el('textarea', { rows: '1', placeholder: 'พิมพ์คำถาม เช่น อุบัติเหตุเดือนนี้เทียบเดือนก่อน…', 'aria-label': 'คำถาม', maxlength: '500' });
    var send = el('button', { type: 'submit', class: 'btn', text: 'ส่ง' }), quick = el('div', { class: 'chat-quick' });
    var robot = function (cls) { return el('img', { class: cls, src: ROBOT_SRC, alt: '', width: '256', height: '256', decoding: 'async', draggable: 'false' }); };
    var fab = el('button', { type: 'button', id: 'chatFab', class: 'chat-fab mode-' + fabMode(), 'aria-label': 'เปิดผู้ช่วย AI (ถาม AI)', title: 'ถาม AI', 'aria-expanded': 'false', 'aria-controls': 'chatPanel', hidden: fabMode() === 'hidden' ? '' : null }, [robot('fab-bot'), el('span', { class: 'fab-t', text: 'ถาม AI' })]);
    /* จอแคบ: ปุ่มลอยหลบลงเมื่อเลื่อนลงอ่านข้อมูล และกลับมาเมื่อเลื่อนขึ้น/อยู่บนสุด/ถึงท้ายหน้า · ขณะพิมพ์ในช่องกรอก (แป้นพิมพ์มือถือเปิด) ปุ่มหลบไม่บังช่องกรอก */
    var lastY = window.pageYOffset || 0;
    window.addEventListener('scroll', function () {
      var y = window.pageYOffset || 0, end = window.innerHeight + y >= document.documentElement.scrollHeight - 96;
      if (isTyping() && isMobile()) fab.classList.add('fab-away'); else if (y < 24 || end || y < lastY - 6) fab.classList.remove('fab-away'); else if (y > lastY + 6) fab.classList.add('fab-away');
      lastY = y;
    }, { passive: true });
    document.addEventListener('focusin', function (e) { if (isMobile() && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) && !panel.contains(e.target)) fab.classList.add('fab-away'); });
    document.addEventListener('focusout', function () { setTimeout(function () { if (!isTyping()) fab.classList.remove('fab-away'); }, 150); });
    document.addEventListener('visibilitychange', function () { document.body.classList.toggle('tab-hidden', document.hidden); });     // หยุดการเคลื่อนไหวเมื่อสลับแท็บ
    var closeB = el('button', { type: 'button', class: 'chat-x', 'aria-label': 'ปิดหน้าต่างแชต', title: 'ปิดหน้าต่างแชต', text: '×' }), scope = el('span', { class: 'chat-scope' });
    var hideB = el('button', { type: 'button', class: 'chat-hide', title: 'ซ่อนปุ่มผู้ช่วย AI (เปิดกลับได้ที่ ตั้งค่า › ตั้งค่าการแสดงผล)', text: 'ซ่อนปุ่ม' });
    var form = el('form', { class: 'chat-form' }, [inp, send]), ava = robot('chat-ava');
    var panel = el('section', { id: 'chatPanel', class: 'chat-panel', hidden: '', 'aria-label': 'ผู้ช่วย AI' }, [el('div', { class: 'chat-h' }, [ava, el('div', {}, [el('strong', { text: 'ผู้ช่วย AI' }), scope]), hideB, closeB]), log, quick, form]);
    function add(role, text, extraNode) { var m = el('div', { class: 'chat-m ' + role }, [role.indexOf('ai') === 0 ? richText(text) : el('p', { text: text }), extraNode || null]); log.appendChild(m); log.scrollTop = log.scrollHeight; return m; }
    /* ช่วงที่ส่งให้ผู้ช่วย = ช่วงที่ผู้ใช้เห็นอยู่จริง: หน้าแรกใช้ปุ่ม วันนี้/เดือนนี้/ปีนี้/กำหนดช่วง · หน้าอื่นใช้ช่วงเดือนของหน้านั้น (คำถามที่ระบุช่วงเองจะใช้ช่วงในคำถาม) */
    function chatScope() {
      if (currentPage() === 'dashboard') { var Q = periodOf(), ms = Q.months && Q.months.length ? Q.months : [Q.cm]; return { kind: Q.kind, label: Q.label, from: ms[0], to: ms[ms.length - 1] }; }
      return { kind: 'range', label: rangeText(), from: state.from || MONTHS[0], to: state.to || MONTHS[MONTHS.length - 1] };
    }
    function ctx() { var sc = chatScope(); return { today: todayStr(), page: currentPage(), period: sc.kind, label: sc.label, from: sc.from, to: sc.to, dataAsOf: (DATA && ((DATA.extra || {}).generatedAt || DATA.stats.generatedAt)) || '' }; }
    function busy(on) { chat.busy = on; send.disabled = on; fab.classList.toggle('busy', on); ava.classList.toggle('busy', on); }
    /* รอบ 14·P2: ปุ่ม “ดูต่อ” จากบริการ — รับเฉพาะหน้าที่อยู่ในรายการ และช่วงวันที่รูปแบบ YYYY-MM-DD (ไม่รับ URL/JS อิสระ) */
    var ACT_OK = { traffic: 1, 'accident-map': 1, lostfound: 1, gate: 1, cctv: 1, tram: 1, 'report-guard': 1, vehicle: 1, safety: 1, 'vehicle-fleet': 1, parking: 1 }, DRX = /^\d{4}-\d{2}-\d{2}$/;
    function actBtns(list) {
      var ok = (list || []).filter(function (a) { return a && ACT_OK[a.route] && PAGES[a.route]; }).slice(0, 4); if (!ok.length) return null;
      return el('div', { class: 'chat-act' }, ok.map(function (a) { var h = '#' + a.route + (a.route === 'traffic' && DRX.test(a.from || '') && DRX.test(a.to || '') ? '?from=' + a.from + '&to=' + a.to : '');
        return el('a', { class: 'chip', href: h, text: String(a.label || PAGE_TITLE[a.route] || a.route).slice(0, 60), onclick: function () { if (isMobile()) open(false); } }); }));
    }
    var FRESH = { live: ['ev-live', 'สด'], stale: ['ev-stale', 'ผลอ่านสำเร็จล่าสุด'], snapshot: ['ev-snap', 'ไฟล์สรุป'] };
    function evList(ev) {
      if (!ev || !ev.length) return null;
      return el('ul', { class: 'chat-ev', 'aria-label': 'ที่มาและความสดของข้อมูล' }, ev.map(function (e) { var f = FRESH[e.freshness] || FRESH.snapshot;
        return el('li', {}, [el('span', { class: 'ev-tag ' + f[0], text: f[1] }), el('span', { text: ' ' + (e.name || '') + ' — ' + (e.text || '') })]); }));
    }
    function metaLine(j, sec) {
      var t = j.mode === 'canned' ? 'ตอบจากเมนูของระบบ (ไม่ได้ใช้ AI และไม่ได้อ่านแหล่งข้อมูล)' : j.mode === 'summary' ? 'คำนวณจากข้อมูลโดยตรง (ไม่ได้ใช้ AI)' : j.mode === 'cached' ? 'ใช้คำตอบเดิมของคำถามเดียวกันกับข้อมูลรุ่นเดียวกัน' : '';
      var n = (j.reads || []).length; t = [t, j.mode === 'canned' ? '' : n ? 'อ่านแหล่งข้อมูลสด ' + n + ' ส่วน' : 'ใช้ไฟล์สรุป (ไม่ต้องอ่านแหล่งสด)', sec != null ? sec + ' วินาที' : ''].filter(Boolean).join(' · ');
      return el('p', { class: 'chat-src', text: t });
    }
    function waitBox() {     /* รอบ 14·P2: บอกสถานะจริง — เวลาที่รอ + ปุ่มยกเลิก (ไม่แสดงขั้นตอนปลอม) */
      var t0 = Date.now(), tx = el('p', { text: 'กำลังอ่านข้อมูลที่เกี่ยวข้องและเรียบเรียงคำตอบ…' }), sub = el('p', { class: 'chat-src', text: '0 วินาที' }), cancel = el('button', { type: 'button', class: 'btn-ghost', text: 'ยกเลิก' });
      var m = el('div', { class: 'chat-m ai wait', role: 'status' }, [tx, sub, cancel]); log.appendChild(m); log.scrollTop = log.scrollHeight;
      var iv = setInterval(function () { var sec = Math.round((Date.now() - t0) / 1000); sub.textContent = sec + ' วินาที' + (sec >= 15 ? ' — บริการ AI ตอบช้ากว่าปกติ รอได้สูงสุด 40 วินาที หรือกดยกเลิก' : ''); }, 1000);
      return { node: m, cancel: cancel, sec: function () { return Math.round((Date.now() - t0) / 100) / 10; }, remove: function () { clearInterval(iv); m.remove(); } };
    }
    function request(body, onOk, label) {
      if (chat.busy) return; chat.lastReq = { body: body, onOk: onOk, label: label }; busy(true); quick.textContent = '';
      if (label) add('user', label);
      var w = waitBox(), ctl = window.AbortController ? new AbortController() : null, cancelled = false, tm = setTimeout(function () { if (ctl) ctl.abort(); }, 40000);
      w.cancel.onclick = function () { cancelled = true; if (ctl) ctl.abort(); };
      var fail = function (t) { w.remove(); add('ai err', t, el('button', { type: 'button', class: 'btn-ghost', text: 'ลองใหม่', onclick: function (e) { e.target.closest('.chat-m').remove(); var L = chat.lastReq; request(L.body, L.onOk, ''); } })); };
      fetch(HCFG.aiApiUrl, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, signal: ctl ? ctl.signal : undefined, body: JSON.stringify(body) })
        .then(function (r) { return r.json().then(function (j) { return { s: r.status, j: j }; }, function () { return { s: r.status, j: null }; }); })
        .then(function (x) {
          var code = x.j && x.j.code;
          if (x.s === 401) { if (AUTH.on) authLost(); return fail('หมดเวลาการเข้าสู่ระบบ — เข้าสู่ระบบใหม่แล้วถามอีกครั้ง'); }
          if (x.s === 403 && code !== 'bad-origin') return fail('บัญชีนี้ไม่มีสิทธิ์ใช้ผู้ช่วย AI');
          if (code && CHAT_ERR[code]) return fail(CHAT_ERR[code]);
          if (!x.j || x.j.status !== 'success') return fail('ผู้ช่วย AI ตอบกลับผิดพลาด (HTTP ' + x.s + ')');
          var sec = w.sec(); w.remove(); onOk(x.j, sec);
        }, function () { fail(cancelled ? 'ยกเลิกคำถามแล้ว — ถามใหม่ได้ทุกเมื่อ' : 'เชื่อมต่อผู้ช่วย AI ไม่ได้ หรือใช้เวลานานเกิน 40 วินาที — ลองใหม่อีกครั้ง'); })
        .then(function () { clearTimeout(tm); busy(false); });
    }
    function ask(text) {
      if (chat.busy || !text) return; chat.last = text;
      request({ action: 'chat', userMessage: text, chatHistory: chat.hist.slice(-6), context: ctx() }, function (j, sec) {
        if (typeof j.reply !== 'string') return add('ai err', 'ผู้ช่วย AI ตอบกลับผิดพลาด');
        if (j.verified !== false && j.mode !== 'canned') { chat.hist.push({ role: 'User', text: text }); chat.hist.push({ role: 'AI', text: j.reply }); }
        var m = add('ai', j.reply, el('div', {}, [evList(j.evidence), j.sources && j.sources.length && !(j.evidence && j.evidence.length) ? el('p', { class: 'chat-src', text: 'ที่มา: ' + j.sources.join(' · ') + (j.asOf ? ' · ข้อมูล ณ ' + j.asOf : '') }) : null, actBtns(j.actions), metaLine(j, sec)]));
        if (j.summary) m.appendChild(el('div', { class: 'chat-act' }, [el('button', { type: 'button', class: 'chip', text: 'สรุปช่วงที่กำลังดู', onclick: summary })]));
      }, text);
    }
    /* รอบ 14·P2: “สรุปช่วงที่กำลังดู” — 3–5 ประเด็น ตัวเลขคำนวณที่บริการ (ไม่ใช้ AI/โควตา) พร้อมความสดของข้อมูลและปุ่มดูต่อ */
    function summary() {
      var sc = chatScope();
      request({ action: 'summary', context: ctx() }, function (j, sec) {
        var ul = el('ul', { class: 'chat-sum' }, (j.points || []).map(function (p) { return el('li', { text: p.text }); }));
        add('ai', 'สรุป ' + (j.label || sc.label), el('div', {}, [ul, evList(j.evidence), actBtns(j.actions), metaLine(j, sec)]));
      }, 'สรุปช่วงที่กำลังดู (' + sc.label + ')');
    }
    function open(on) {
      panel.hidden = !on; fab.setAttribute('aria-expanded', String(on)); document.body.classList.toggle('chat-open', on);
      if (!on) { window.dispatchEvent(new Event('resize')); if (!fab.hidden) fab.focus(); return; }
      scope.textContent = 'ช่วงที่กำลังดู: ' + chatScope().label; window.dispatchEvent(new Event('resize'));
      if (!log.childNodes.length) {
        if (!HCFG.aiApiUrl) { add('ai note', 'ยังเชื่อมต่อผู้ช่วย AI ไม่ได้', el('p', { class: 'chat-src' }, ['เว็บไซต์นี้ยังไม่ได้ตั้งค่าบริการผู้ช่วย AI ที่ตรวจตัวตน จึงยังถามตอบไม่ได้ — ', el('a', { href: '#ai', text: 'ดูสิ่งที่ต้องตั้งค่า' })])); inp.disabled = true; send.disabled = true; }
        else { add('ai', 'สวัสดีครับ ผมช่วยสรุปสถิติของงานจราจรและความปลอดภัยได้ เช่น อุบัติเหตุ รถเข้า หรือของหาย และบอกได้ว่าดูรายละเอียดที่เมนูไหน — ถามต่อเนื่องได้เลย เช่น “แล้วเดือนก่อนล่ะ”');
          quick.appendChild(el('button', { type: 'button', class: 'chip chip-sum', text: 'สรุปช่วงที่กำลังดู', onclick: summary }));
          ['อุบัติเหตุเดือนนี้เทียบเดือนก่อน', 'สรุป Lost & Found เดือนนี้', 'รถเข้ามหาวิทยาลัยล่าสุดวันไหน', 'ดูรายละเอียดเหตุการณ์ได้ที่ไหน'].forEach(function (t) { quick.appendChild(el('button', { type: 'button', class: 'chip', text: t, onclick: function () { ask(t); } })); }); }
      }
      if (!inp.disabled) inp.focus(); else closeB.focus();
    }
    fab.onclick = function () { open(panel.hidden); }; closeB.onclick = function () { open(false); };
    hideB.onclick = function () { open(false); setFabMode('hidden'); showBanner('ซ่อนปุ่มผู้ช่วย AI แล้ว — เปิดกลับได้ที่ ตั้งค่า › ตั้งค่าการแสดงผล (หัวข้อ “ปุ่มผู้ช่วย AI”)'); setTimeout(function () { var b = $('banner'); if (b) b.hidden = true; }, 6000); };
    window.hubOpenChat = function () { if (fabMode() === 'hidden') setFabMode('robot'); open(true); };
    form.onsubmit = function (e) { e.preventDefault(); var t = inp.value.trim(); if (t) { inp.value = ''; ask(t); } };
    inp.onkeydown = function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.dispatchEvent(new Event('submit', { cancelable: true })); } };
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden && !document.querySelector('.dlg-ov, .lightbox')) open(false); });
    document.body.appendChild(fab); document.body.appendChild(panel);
  }

  /* ================= รอบ 8: Login กลาง (session ฝั่งบริการ) · ข้อมูลภายในหลัง Login · สถิติสด ================= */
  /* โหมดนี้ทำงานเมื่อหน้าเว็บถูกเปิดผ่านบริการกลาง (config: auth = "session") — การผ่าน Login ตัดสินที่บริการทุกครั้ง
   * ตัวแปร AUTH ในหน้าเว็บใช้เพียงเลือกว่าจะแสดงอะไร ไม่ใช่หลักฐานสิทธิ์ (ไม่ใช้ internalMode / localStorage / sessionStorage) */
  var AUTH = { on: HCFG.auth === 'session', user: null, started: false, cb: null }, API = HCFG.apiBase || '/api';
  function apiCall(path, opt) {
    opt = opt || {};
    return fetch(API + path, { method: opt.method || 'GET', credentials: 'include', cache: 'no-store', headers: opt.body ? { 'Content-Type': 'application/json', Accept: 'application/json' } : { Accept: 'application/json' }, body: opt.body ? JSON.stringify(opt.body) : undefined })
      .then(function (r) { return r.json().catch(function () { return null; }).then(function (j) { var rv = r.headers.get('x-hub-rev'); if (rv) live.rev = rv; return { s: r.status, j: j || {}, ref: String(r.headers.get('cf-ray') || '').split('-')[0] }; }); }, function () { return { s: 0, j: {}, ref: '' }; });      /* รอบ 14.2: ref = รหัส ray (ไม่มีรหัสศูนย์ท้าย) ตรงกับที่บริการบันทึก · ไม่ได้รับคำตอบ = ไม่มี ref */      /* รอบ 14.1: รหัสอ้างอิงคำขอ (cf-ray) */
  }
  var LOGIN_MSG = { invalid: 'รหัสพนักงานไม่ถูกต้องหรือไม่มีสิทธิ์เข้าใช้งาน', 'rate-limited': 'ลองหลายครั้งเกินกำหนด กรุณารอสักครู่แล้วลองใหม่', 'verify-unavailable': 'ไม่สามารถตรวจสอบการเข้าสู่ระบบได้ในขณะนี้ กรุณาลองใหม่',
    'bad-network-config': 'ระบบตั้งค่าเครือข่ายไม่ถูกต้อง — แจ้งผู้ดูแลระบบ', 'network-denied': 'เข้าใช้งานไม่ได้จากเครือข่ายนี้', net: 'เชื่อมต่อบริการไม่ได้ กรุณาลองใหม่' };
  function showLogin(info) {
    var old = $('loginView'); if (old) old.remove();
    document.body.classList.add('locked');
    var logo = el('div', { class: 'lg-logo' });
    if (CFG.logoUrlTemplate && CFG.logoFileId) { var im = el('img', { alt: 'ตรามหาวิทยาลัยมหิดล', referrerpolicy: 'no-referrer', decoding: 'async' }); im.onerror = function () { logo.textContent = 'ม.มหิดล'; logo.classList.add('no-img'); }; im.src = CFG.logoUrlTemplate + CFG.logoFileId; logo.appendChild(im); } else { logo.textContent = 'ม.มหิดล'; logo.classList.add('no-img'); }
    var inp = el('input', { type: 'text', id: 'loginCode', name: 'staff-code', inputmode: 'numeric', pattern: '[0-9]*', maxlength: '12', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', required: '', 'aria-describedby': 'loginMsg' });
    var msg = el('p', { class: 'lg-msg', id: 'loginMsg', role: 'alert', 'aria-live': 'polite' }), btn = el('button', { type: 'submit', class: 'btn lg-btn', text: 'เข้าสู่ระบบ' }), busy = false;
    var setMsg = function (t, kind) { msg.textContent = t || ''; msg.className = 'lg-msg' + (kind ? ' ' + kind : ''); };
    inp.oninput = function () { var v = inp.value.replace(/[^0-9]/g, ''); if (v !== inp.value) inp.value = v; };          /* เก็บเป็นข้อความ ไม่แปลงเป็นจำนวน — รักษาเลขศูนย์นำหน้า */
    var form = el('form', { class: 'lg-form', novalidate: '', onsubmit: function (e) {
      e.preventDefault(); if (busy) return;
      var code = inp.value.trim(); if (!/^[0-9]{1,12}$/.test(code)) { setMsg('กรอกรหัสพนักงานเป็นตัวเลข', 'bad'); inp.focus(); return; }
      busy = true; btn.disabled = true; btn.textContent = 'กำลังตรวจสอบ…'; setMsg('');
      apiCall('/login', { method: 'POST', body: { code: code } }).then(function (x) {
        busy = false; btn.disabled = false; btn.textContent = 'เข้าสู่ระบบ';
        if (x.s === 200 && x.j.ok && x.j.user) { inp.value = ''; AUTH.user = x.j.user; hideLogin(); authReady(); return; }
        setMsg(LOGIN_MSG[x.j.code] || (x.s === 0 ? LOGIN_MSG.net : 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่'), 'bad'); inp.select();
      });
    } }, [el('label', { for: 'loginCode', text: 'รหัสพนักงาน' }), inp, btn, msg]);
    var view = el('div', { class: 'login', id: 'loginView', role: 'main' }, [el('div', { class: 'lg-card' }, [logo,
      el('h1', { class: 'lg-title' }, [el('span', { text: 'ระบบฐานข้อมูล' }), el('span', {}, [el('i', { text: 'งานจราจรและความปลอดภัย' }), ' ', el('i', { text: 'กองกายภาพและสิ่งแวดล้อม' })]), el('span', { text: 'มหาวิทยาลัยมหิดล' })]), form])]);
    document.body.appendChild(view);
    if (info && info.code && info.code !== 'no-session') setMsg((LOGIN_MSG[info.code] || LOGIN_MSG.net) + (info.ip ? ' (IP ที่ระบบเห็น: ' + info.ip + ')' : ''), 'warn');
    else if (info && info.expired) setMsg('หมดเวลาการใช้งาน กรุณาเข้าสู่ระบบอีกครั้ง', 'warn');
    try { inp.focus(); } catch (e) {}
  }
  function hideLogin() { var v = $('loginView'); if (v) v.remove(); document.body.classList.remove('locked'); }
  function authStart(cb) {
    AUTH.cb = cb; if (!AUTH.on) { cb(); return; }
    apiCall('/me').then(function (x) { if (x.s === 200 && x.j.ok) { AUTH.user = x.j.user; authReady(); } else showLogin(x.s === 0 ? { code: 'net' } : x.j); });
  }
  function authReady() {                      /* ผ่าน Login แล้ว: เริ่มหน้าเว็บครั้งแรก หรือกลับมาหน้าที่เปิดค้างไว้ (อยู่ใน #hash ของหน้าเดียวกัน จึงไม่มีการพาไปเว็บอื่น) */
    authGen++; liveReset(); userBox(); for (var k in dsCache) delete dsCache[k]; rosterNamesState = 'none'; rosterNames = null;
    if (!AUTH.started) { AUTH.started = true; AUTH.cb(); } else route(true);
    liveRefresh();
  }
  function liveReset() { if (live.awSnap && DATA.extra) { DATA.extra.anywheel = live.awSnap; live.awSnap = null; } live.aw = null; live.sig = {}; live.busy = null; live.at = null; live.readAt = {}; live.lastOk = {}; live.stale = {}; live.errors = null; live.ok = null; live.errInfo = {}; live.retryN = 0; }
  /* แพตช์ท้าย: ข้อความเวลาของแหล่ง k — อ่านสำเร็จรอบนี้ = เวลาอ่านจริง · รอบล่าสุดล้ม = เวลาอ่านสำเร็จครั้งก่อน + บอกว่าไม่สำเร็จ
   * ยังไม่เคยอ่านสด (ไม่ Login/ไฟล์สรุป) = “ไฟล์สรุป …” — ไม่ใช้เวลาตอบคำขอหรือเวลาของแหล่งอื่นแทน */
  function srcReadTxt(k, snapAt) {
    var r = live.readAt && live.readAt[k], last = live.lastOk && live.lastOk[k];
    if (r) return dLabel(r);
    if (live.errors && (live.errors[k] || live.errors.all)) return (last ? dLabel(last) : 'ยังไม่เคยอ่านสำเร็จ') + ' (รอบล่าสุดอ่านไม่สำเร็จ)';
    return last ? dLabel(last) : 'ไฟล์สรุป ' + (/^\d{4}-\d\d-\d\d \d/.test(snapAt || '') ? dLabel(snapAt) : snapAt || 'ไม่ทราบ');
  }      /* รอบ 13: ข้ามรุ่น Login ไม่ใช้สถานะ/เวลาอ่านของรุ่นก่อน */
  function authLost() { if (!AUTH.on || !AUTH.user) return; AUTH.user = null; authGen++; liveReset(); for (var k in dsCache) delete dsCache[k]; userBox(); $('view').textContent = ''; dropObs(); showLogin({ expired: true }); }
  function logout() { authGen++; liveReset(); clearTimeout(live.timer); apiCall('/logout', { method: 'POST', body: {} }).then(function () { AUTH.user = null; for (var k in dsCache) delete dsCache[k]; userBox(); $('view').textContent = ''; dropObs();
    try { location.reload(); } catch (e) { showLogin(null); } }); }      /* รอบ 12: โหลดหน้าใหม่หลังออกจากระบบ — ล้างข้อมูลสด/รายการทั้งหมดออกจากหน่วยความจำของแท็บ */
  /* รอบ 12: ข้อความท้ายหน้าตามสถานะจริง — ก่อน Login แสดงเฉพาะสถิติรวม · หลัง Login มีข้อมูลภายในบางส่วน และแบบฟอร์มภายในบางรายการยังไม่เปิดบันทึก */
  var FOOT0 = null;
  function footText() { var f = document.querySelector('.foot'); if (!f) return; if (FOOT0 == null) FOOT0 = f.textContent;
    f.textContent = AUTH.on && AUTH.user ? 'หน้ารวมรุ่นทดลอง (Preview) · ข้อมูลภายในสำหรับเจ้าหน้าที่ที่เข้าสู่ระบบ — ห้ามเผยแพร่ภาพ/รายการต่อ · บางหมวดเป็นไฟล์สรุปตามวันที่ที่ระบุ · แบบฟอร์มภายในบางรายการยังไม่เปิดบันทึก · ระบบต้นทางทุกระบบยังทำงานตามเดิม' : FOOT0; }
  function userBox() {
    footText();
    var old = $('userBox'); if (old) old.remove(); if (!AUTH.on || !AUTH.user) return;
    var box = el('div', { class: 'user-box', id: 'userBox' }, [el('span', { class: 'ub-name', text: AUTH.user.name + (AUTH.user.role === 'admin' ? ' · ผู้ดูแล' : '') }), el('button', { type: 'button', class: 'btn-ghost ub-out', text: 'ออกจากระบบ', onclick: logout })]);
    var st = $('stamp'); st.parentNode.insertBefore(box, st);
  }
  /* สถิติสด: อ่านต้นทางผ่านบริการ ณ เวลาที่เรียก — ส่วนที่อ่านไม่สำเร็จคงข้อมูลล่าสุดในไฟล์ไว้และบอกสถานะ (ไม่เติม 0 ไม่เปลี่ยนเวลาให้ดูสด) */
  var live = { at: null, errors: null, timer: null, sig: {}, busy: null, readAt: {}, lastOk: {}, stale: {}, errInfo: {}, retryN: 0 }, authGen = 0;      /* รอบ 14.1: errInfo[k] = { code, ref, stage, at } (เวลาที่พยายามครั้งล่าสุด) */
  function liveApply(j) {
    var M = DATA.stats.modules, X = DATA.extra;
    if (M.incidents && !live.snapInc) live.snapInc = { updated: M.incidents.updated, total: M.incidents.total };      /* รอบ 14: จำวันที่ของไฟล์สรุปไว้ก่อนถูกแทนด้วยข้อมูลสด */
    if (j.incidents && dsCache.incidents && dsCache.incidents.n != null && dsCache.incidents.n !== j.incidents.total) delete dsCache.incidents;      /* รอบ 14: รายการในหน่วยความจำคนละรุ่นกับยอดรวม → อ่านรายการใหม่ */
    ['incidents', 'lostfound', 'gate'].forEach(function (k) { if (j[k] && M[k]) { for (var f in j[k]) M[k][f] = j[k][f]; } });
    ['incidentsDaily', 'lostfoundDaily'].forEach(function (k) { if (j[k]) X[k] = j[k]; });
    if (j.lostfoundStatus && X.lostfoundStatus) { for (var f2 in j.lostfoundStatus) X.lostfoundStatus[f2] = j.lostfoundStatus[f2]; if ((j.sourceReadAt || {}).lostfoundYear) X.lostfoundStatus.checkedAt = j.sourceReadAt.lostfoundYear; else if ((j.stale || {}).lostfoundYear) X.lostfoundStatus.checkedAt = j.stale.lostfoundYear.at; }      /* แพตช์ท้าย: เวลาตรวจสถานะ = เวลาอ่าน LF รายปี (เดิมค้างเวลาไฟล์สรุป) */
    applyLive10(j);
  }
  /* รอบ 12: ขอ 2 ชุดแยกกัน — ชุดหลัก (เหตุการณ์/L&F/รถเข้า) แสดงทันทีที่มา ไม่รอชุดไฟล์ส่วนตัว (นักศึกษา–จยย./เรือนไทย) ซึ่งผ่านตัวกลางและช้ากว่า
     · วาดหน้าใหม่เฉพาะเมื่อข้อมูลเปลี่ยนจริง และคงตำแหน่งเลื่อน/ส่วนที่เปิดอยู่ · คำตอบที่มาหลังออกจากระบบ/เปลี่ยนผู้ใช้ถูกทิ้ง (authGen) · แท็บซ่อนอยู่ไม่ยิงคำขอ */
  /* รอบ 14.1: ชื่อแหล่งสำหรับผู้ใช้ · เวลาไทยตอนนี้ · ลองใหม่เร็วหลังล้ม (60/120 วินาที แล้วกลับเป็นทุก 5 นาที — ไม่ยิงวน) */
  var LIVE_NAME = { incidents: 'รายงานเหตุการณ์', lostfound: 'Lost & Found (รายวัน)', lostfoundYear: 'Lost & Found (สถานะ/รายปี)', gate: 'รถเข้าและหมวกนิรภัย', studentMoto: 'ทะเบียนนักศึกษา–จยย.', ruenthai: 'ลานจอดเรือนไทย' };
  function nowStamp() { return new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 16).replace('T', ' '); }
  function liveRetrySchedule() {
    var bad = LIVE_CORE_PARTS.some(function (k) { return live.errors && live.errors[k]; });
    if (!bad) { live.retryN = 0; return; }
    if (live.retryFor === live.last) return; live.retryFor = live.last;      /* นับครั้งเดียวต่อรอบ (inc/rest ตอบแยกกัน) */
    if (live.retryN >= 2) return; live.retryN++;
    clearTimeout(live.timer); live.timer = setTimeout(liveRefresh, live.retryN * 60000);
  }
  function liveRetryNow(btn) {          /* ปุ่มลองใหม่: กันกดซ้ำระหว่างทำงาน และเว้นอย่างน้อย 15 วินาที */
    if ((live.busy && live.busy.gen === authGen && live.busy.n > 0) || Date.now() - (live.manualAt || 0) < 15000) { if (btn) { btn.disabled = true; setTimeout(function () { btn.disabled = false; }, 3000); } return; }
    live.manualAt = Date.now(); live.retryN = 0; if (btn) btn.disabled = true; liveRefresh();
  }
  function liveRefresh() {
    if (!AUTH.on || !AUTH.user || !HCFG.liveStatsUrl) return;
    clearTimeout(live.timer); live.timer = setTimeout(liveRefresh, 5 * 60000);
    if (document.hidden) { live.due = true; return; }
    if (live.busy && live.busy.gen === authGen && live.busy.n > 0) return;      /* รอบ 13: ตัวนับงานผูกกับรุ่น Login — คำตอบของรุ่นก่อนไม่ลดตัวนับของรุ่นใหม่ */
    var gen = authGen, busy = live.busy = { gen: gen, n: 4 }; live.due = false; live.last = Date.now();
    var draw = function (sig, scope) {
      var dayCh = !!state.renderDay && state.renderDay !== todayStr();      /* รอบ 13 ต่อ: ข้าม 00:00 (เวลาไทย) → “วันนี้/เดือนนี้” เปลี่ยนความหมาย วาดใหม่แม้ข้อมูลเท่าเดิม */
      if (!dayCh) liveStampsUpdate(); liveNoteDraw();
      if (live.sig[scope] === sig && !dayCh) return; var firstTime = live.sig[scope] == null; live.sig[scope] = sig;
      if (scope !== 'aw') collectMonths();      /* รอบ 14.3: Anywheel ไม่กำหนดช่วงเดือนของหน้า (ไม่รีเซ็ตช่วงที่ผู้ใช้เลือก) */
      if (uiBusy()) { live.pending = true; return; }
      if (scope === 'private' && !firstTime && !dayCh && !LIVE_PRIVATE_PAGES[state.curPage]) return;
      if (scope === 'aw' && !dayCh && !LIVE_AW_PAGES[state.curPage]) return;      /* รอบ 14.3: วาดใหม่เฉพาะหน้าที่แสดง Anywheel */        /* ชุดส่วนตัวเปลี่ยน: วาดใหม่เฉพาะหน้าที่ใช้ */
      route(true);
    };
    var done = function () { busy.n = Math.max(0, busy.n - 1); };
    /* รอบ 14: เหตุการณ์ (inc) แยกจาก L&F/รถเข้า (rest) — หน้าเหตุการณ์ไม่ต้องรอแหล่งที่ไม่เกี่ยวข้อง
     * ส่วนที่อ่านล้มแต่บริการมีผลสำเร็จล่าสุด: j.stale[k] = { at, error } → ใช้ตัวเลขนั้นพร้อมบอกว่าอ่านสำเร็จล่าสุดเมื่อใด (ไม่ถือว่าสด) */
    [['inc', ['incidents'], ['incidents', 'incidentsDaily']], ['rest', ['lostfound', 'lostfoundYear', 'gate'], ['lostfound', 'lostfoundStatus', 'gate', 'lostfoundDaily']]].forEach(function (q) {
      var parts = q[1];
      apiCall('/stats?scope=' + q[0]).then(function (x) {
        done(); if (gen !== authGen) return;
        if (x.s === 401) { authLost(); return; }
        var errs = Object.assign({}, live.errors || {}); delete errs.all; parts.forEach(function (k) { delete errs[k]; delete live.stale[k]; delete live.errInfo[k]; });      /* รอบ 14.1: ล้างเฉพาะแหล่งของคำขอนี้ (ไม่ล้างของแหล่งอื่น) */
        var tAt = nowStamp();
        if (x.s !== 200 || !x.j.ok) { parts.forEach(function (k) { errs[k] = x.j.code || 'http ' + x.s; live.errInfo[k] = { code: errs[k], ref: x.j.ref || x.ref || '', stage: x.s ? 'request' : 'network', http: x.s, at: tAt };      /* รอบ 14.2: body ไม่ใช่ JSON ก็ยังได้ ref จากหัว cf-ray */ delete live.readAt[k]; }); live.errors = Object.keys(errs).length ? errs : null; liveRetrySchedule(); liveStampsUpdate(); liveNoteDraw(); return; }
        var j = x.j, rd = j.sourceReadAt || {}, stl = j.stale || {}; liveApply(j);
        parts.forEach(function (k) {
          if (rd[k]) { live.readAt[k] = rd[k]; live.lastOk[k] = rd[k]; } else delete live.readAt[k];
          if (stl[k]) { live.stale[k] = stl[k]; if (!live.lastOk[k] || stl[k].at > live.lastOk[k]) live.lastOk[k] = stl[k].at; }
          if ((j.errors || {})[k]) { errs[k] = j.errors[k]; live.errInfo[k] = { code: j.errors[k], ref: x.ref || '', stage: ((j.diag || {})[k] || {}).stage || '', http: 200, at: tAt }; }
        });
        live.at = j.checkedAt; live.errors = Object.keys(errs).length ? errs : null; live.ok = LIVE_CORE_PARTS.filter(function (k) { return live.readAt[k]; }); liveRetrySchedule();
        draw(liveSig(j, q[2]), q[0]);
      });
    });
    apiCall('/stats?scope=private').then(function (x) {
      done(); if (gen !== authGen) return;
      if (x.s === 401) { authLost(); return; }        /* รอบ 13: ชุดส่วนตัวตอบ 401 ก็ถือว่าหมดสิทธิ์ (เดิมเงียบ) */
      if (x.s !== 200 || !x.j.ok) { applyLive10({ errors: { studentMoto: x.j.code || 'http ' + x.s, ruenthai: x.j.code || 'http ' + x.s } }); draw('err' + x.s, 'private'); return; }
      applyLive10(x.j); live.readAt = Object.assign({}, live.readAt, x.j.sourceReadAt || {}); var a = x.j.studentMoto, r = x.j.ruenthai;
      draw(liveSig(x.j, ['studentMoto', 'ruenthai']), 'private');
    });
    /* รอบ 14.3: Anywheel อ่านสดจากชีท “ข้อมูล Anywheel new” — คำขอแยก (ชุดหลักไม่ต้องรอ) · ล้มแล้วไม่ขึ้นแถบเตือนของแหล่งอื่น (สถานะอยู่ที่ส่วน Anywheel เอง) */
    apiCall('/stats?scope=aw').then(function (x) {
      done(); if (gen !== authGen) return;
      if (x.s === 401) { authLost(); return; }
      var prev = live.aw || {}, tAt = nowStamp();
      if (x.s !== 200 || !x.j.ok) { live.aw = { err: x.j.code || 'http ' + x.s, ref: x.j.ref || x.ref || '', at: tAt, lastOk: prev.lastOk || '', http: x.s }; liveStampsUpdate(); return; }
      var j = x.j, rd = (j.sourceReadAt || {}).anywheel || '', st = (j.stale || {}).anywheel || null;
      if (j.anywheel) { if (!live.awSnap) live.awSnap = DATA.extra.anywheel || null; DATA.extra.anywheel = Object.assign({}, live.awSnap || {}, j.anywheel, { snapshot: false }); }
      live.aw = { readAt: rd, stale: st, err: (j.errors || {}).anywheel || '', ref: x.ref || '', at: tAt, http: 200, lastOk: rd || (st && st.at > (prev.lastOk || '') ? st.at : prev.lastOk) || '' };
      liveStampsUpdate(); draw(liveSig(j, ['anywheel']), 'aw');
    });
  }
  /* รอบ 13: ลายเซ็นตามความหมาย = ข้อมูลทุกส่วนที่หน้าเว็บแสดง (ยอด การแยกตามวิทยาเขต/คณะ/เครื่องยนต์/กลุ่ม รายเดือน รายวัน ค่าไม่ตรง ข้อผิดพลาด)
   * ไม่รวมเวลา (checkedAt/readAt) — เวลาอ่านเปลี่ยนอย่างเดียวอัปเดตเฉพาะป้ายเวลา ไม่วาดหน้าใหม่ (คงตัวกรอง/หน้า/ตำแหน่งเลื่อน/โฟกัส/ส่วนที่พับ) */
  function liveSig(j, keys) {
    return JSON.stringify(keys.map(function (k) { return j[k] === undefined ? null : j[k]; }).concat([j.errors || {}]), function (k, v) { return k === 'checkedAt' || k === 'readAt' || (k === 'updated' && this === j.lostfound) ? undefined : v; });
  }
  var LIVE_PRIVATE_PAGES = { dashboard: 1, vehicle: 1, parking: 1, settings: 1, 'vehicle-all': 1 };
  var LIVE_AW_PAGES = { dashboard: 1, tram: 1, 'report-monthly': 1, settings: 1, 'admin-info': 1 };
  /* รอบ 14.3: สถานะ Anywheel — แยก “อ่านต้นทางเมื่อ” ออกจาก “ข้อมูลการใช้งานถึงวันที่” (อ่านชีทวันนี้ ≠ มีข้อมูลเดือนนี้) */
  function awDataTxt() { var aw = extra('anywheel'); return aw ? 'ข้อมูลการใช้งานถึง ' + (aw.lastDate ? dLabel(aw.lastDate) : aw.updated ? dLabel(aw.updated) : mLabel(aw.lastMonth || '')) : ''; }
  function awStateTxt() {
    var aw = extra('anywheel'), L = live.aw, d = awDataTxt(); if (!aw) return '';
    if (!(AUTH.on && AUTH.user)) return 'ไฟล์สรุป ณ ' + dLabel(aw.checkedAt || '') + ' · ' + d;
    if (!L) return 'ไฟล์สรุป ณ ' + dLabel((live.awSnap || aw).checkedAt || '') + ' · ' + d + ' · กำลังอ่านข้อมูลสด…';
    if (L.readAt && !L.err) return 'ข้อมูลสด · อ่านจากต้นทางเมื่อ ' + dLabel(L.readAt) + ' · ' + d;
    var last = L.stale ? L.stale.at : L.lastOk;
    if (last) return 'ใช้ข้อมูลที่อ่านสำเร็จล่าสุดเมื่อ ' + dLabel(last) + ' · รอบล่าสุดอ่านไม่สำเร็จ (' + srcWhy(L.err) + (L.ref ? ' · รหัสอ้างอิง ' + L.ref : '') + ') · ' + d;
    return 'แสดงไฟล์สรุป ณ ' + dLabel((live.awSnap || aw).checkedAt || '') + ' · ' + d + ' — อ่านต้นทางไม่สำเร็จ (' + srcWhy(L.err) + (L.ref ? ' · รหัสอ้างอิง ' + L.ref : '') + ')';
  }
  function awStateNode() { var p = el('p', { class: 'src-state', role: 'status', text: awStateTxt() }); p.classList.add('live-ts'); p.__ts = awStateTxt; return p; }
  function awMinTxt(r) { return r.minutes != null ? num(Math.round(r.minutes / 60)) : r.minutesPartial ? 'ไม่ครบ (' + r.minutesPartial.rows + '/' + r.rows + ' วัน)' : 'ไม่มีข้อมูล'; }
  function awDaysTxt(r) { return r.daysInMonth && r.days < r.daysInMonth ? r.days + ' / ' + r.daysInMonth : String(r.days); }
  document.addEventListener('visibilitychange', function () { if (!document.hidden && AUTH.user && (live.due || (live.last && Date.now() - live.last > 5 * 60000))) liveRefresh(); });
  /* รอบ 13 ต่อ: แผงแชทใช้ attribute hidden (ไม่มี class open) — เดิมตรวจ .chat-panel.open จึงไม่เคยเลื่อนการวาดขณะแชทเปิด
   * และการอัปเดตที่เลื่อนไว้ปล่อยได้เฉพาะตอน focusout → ปิดด้วย Esc/ปุ่มแล้วค้าง · ตรวจปล่อยหลังคลิก/กดปุ่ม/focusout ด้วย */
  function uiBusy() { return !!document.querySelector('.dlg-ov, .lightbox, .chat-panel:not([hidden])') || isTyping(); }
  var flushT = 0;
  function flushSoon() { if (!live.pending || flushT) return; flushT = setTimeout(function () { flushT = 0; if (live.pending && AUTH.user && !uiBusy()) { live.pending = false; route(true); } }, 400); }
  ['focusout', 'click', 'keyup'].forEach(function (ev) { document.addEventListener(ev, flushSoon, true); });
  function isTyping() { var a = document.activeElement; return !!a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.isConnected && !a.closest('[hidden]') && a.getClientRects().length > 0; }
  /* รอบ 14.2: “คัดลอกรายงานปัญหา” — เฉพาะเวลา/ชื่อแหล่ง/สถานะ/รหัส/รุ่น (ไม่มีตัวเลขสถิติหรือข้อมูลบุคคล) · ไม่ส่งให้ใครอัตโนมัติ */
  function liveReport() {
    var ks = live.errors ? Object.keys(live.errors).filter(function (k) { return k !== 'all'; }) : [];
    var lines = ['รายงานปัญหา — ระบบงานจราจรและความปลอดภัย ม.มหิดล', 'เวลาที่คัดลอก: ' + nowStamp() + ' (เวลาไทย UTC+7)', 'หน้า: ' + String(location.hash || '#').split('?')[0], 'รุ่นหน้าเว็บ: ' + String(HCFG.buildRef || '-').slice(0, 7) + ' · รุ่นบริการ: ' + (live.rev || '-')];
    ks.forEach(function (k) { var i = live.errInfo[k] || {}, shown = live.stale[k] ? 'ผลสำรองจากบริการ (LKG) เมื่อ ' + live.stale[k].at : liveShownAt(k) ? 'ข้อมูลรอบก่อนในหน้านี้ เมื่อ ' + liveShownAt(k) : 'ไฟล์สรุป';
      lines.push('- ' + (LIVE_NAME[k] || k) + ': แสดง ' + shown + ' · พยายามล่าสุด ' + (i.at || '-') + ' · HTTP ' + (i.http != null ? i.http : '-') + ' · code ' + live.errors[k] + ' · stage ' + (i.stage || '-') + ' · ref ' + (i.ref || 'ไม่มี (ไม่ได้รับคำตอบจากเซิร์ฟเวอร์)')); });
    return lines.join('\n');
  }
  function liveReportBox() {
    var box = el('div', { class: 'banner-rep' }), msg = el('span', { class: 'banner-rep-msg', role: 'status' });
    var btn = el('button', { type: 'button', class: 'btn-ghost', text: 'คัดลอกรายงานปัญหา', onclick: function () {
      var t = liveReport(), fallback = function () { var ta = el('textarea', { readonly: 'readonly', rows: '5', 'aria-label': 'รายงานปัญหา (เลือกแล้วคัดลอกเอง)' }); ta.value = t; box.querySelectorAll('textarea').forEach(function (x) { x.remove(); }); box.appendChild(ta); ta.focus(); ta.select(); msg.textContent = 'คัดลอกอัตโนมัติไม่ได้ — ข้อความถูกเลือกไว้แล้ว กด Ctrl+C / ⌘C'; };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { msg.textContent = 'คัดลอกแล้ว — วางส่งให้ผู้ดูแลได้ (ไม่ได้ส่งให้ใครอัตโนมัติ)'; }, fallback); else fallback(); } });
    box.appendChild(btn); box.appendChild(msg); return box;
  }
  function liveNoteDraw() {      /* รอบ 14.1: ข้อความหลักภาษาเข้าใจง่าย + รายละเอียด (ชื่อแหล่งภาษาไทย/เวลาที่อ่านสำเร็จ/เวลาที่พยายาม/สาเหตุ/รหัสอ้างอิง) + ปุ่มลองใหม่ */
    var b = $('banner'); if (!b || !AUTH.on) return;
    var ks = live.errors ? Object.keys(live.errors).filter(function (k) { return k !== 'all'; }) : [];
    if (!ks.length) { if (b.__live) { b.hidden = true; b.textContent = ''; b.__live = false; } return; }
    var wasOpen = !!(b.querySelector('details') && b.querySelector('details').open), noLast = ks.filter(function (k) { return !liveShownAt(k); });
    b.textContent = ''; b.hidden = false; b.__live = true;
    b.appendChild(el('span', { text: 'อัปเดตข้อมูลบางรายการไม่สำเร็จ ขณะนี้' + (noLast.length ? (noLast.length === ks.length ? 'แสดงไฟล์สรุปแทน' : 'แสดงข้อมูลที่อ่านสำเร็จล่าสุด (บางรายการเป็นไฟล์สรุป)') : 'แสดงข้อมูลที่อ่านสำเร็จล่าสุด') + ' ' }));
    var btn = el('button', { type: 'button', class: 'btn-ghost banner-retry', text: 'ลองอัปเดตอีกครั้ง', onclick: function () { liveRetryNow(btn); } }); if (live.busy && live.busy.gen === authGen && live.busy.n > 0) btn.disabled = true;
    var det = el('details', { class: 'banner-det' }, [el('summary', { text: 'ดูรายละเอียด' }), el('ul', {}, ks.map(function (k) { var i = live.errInfo[k] || {}, last = liveShownAt(k);
      return el('li', { text: (LIVE_NAME[k] || k) + ' — ' + (last ? 'ใช้ข้อมูลที่อ่านสำเร็จเมื่อ ' + dLabel(last) : 'ยังไม่มีข้อมูลที่อ่านสำเร็จ (แสดงไฟล์สรุป)') + ' · พยายามล่าสุด ' + (i.at ? dLabel(i.at) : '-') + ' · ' + srcWhy(live.errors[k]) + (i.ref ? ' · รหัสอ้างอิง ' + i.ref : ' · ไม่มีรหัสอ้างอิงจากเซิร์ฟเวอร์') }); })), liveReportBox()]);
    det.open = wasOpen; b.appendChild(btn); b.appendChild(det);
  }


  /* ---------- ชุดข้อมูลภายในเพิ่มเติม (อ่านผ่านบริการหลัง Login) ---------- */
  DS.incidents = { mode: 'api', tab: 'รายงานเหตุการณ์' }; DS.lostfound = { mode: 'api', tab: 'LF_New' }; DS.events = { mode: 'api', tab: 'กิจกรรมพิเศษ › Sheet1' }; DS.gps = { mode: 'api', tab: 'GPS งานปริญญา › Reports' };
  function fdate(d) { if (d && !/^\d{4}-\d{2}-\d{2}/.test(String(d))) return String(d); return d ? dLabel(String(d).slice(0, 10)) + (String(d).length > 10 ? ' ' + String(d).slice(11, 16) + ' น.' : '') : ''; }
  function selectOf(label, opts, cur, fn) { var s = el('select', { 'aria-label': label }, opts.map(function (o) { return el('option', { value: o[0], text: o[1] }); })); s.value = cur; s.onchange = function () { fn(s.value); }; return s; }
  function dateIn(label, val, min, max, fn) { var i = el('input', { type: 'date', 'aria-label': label, value: val, min: min, max: max }); i.onchange = function () { fn(i.value); }; return el('label', { class: 'di' }, [el('span', { text: label }), i]); }
  function pager(st, pages, redraw, anchor) {
    return pages > 1 ? el('div', { class: 'lu-pager' }, [el('button', { type: 'button', class: 'btn-ghost', text: '‹ ก่อนหน้า', disabled: st.page === 0 ? '' : null, onclick: function () { st.page--; redraw(); anchor.scrollIntoView(); } }), el('span', { text: 'หน้า ' + (st.page + 1) + ' / ' + pages }),
      el('button', { type: 'button', class: 'btn-ghost', text: 'ถัดไป ›', disabled: st.page >= pages - 1 ? '' : null, onclick: function () { st.page++; redraw(); anchor.scrollIntoView(); } })]) : null;
  }

  /* ---------- รายงานเหตุการณ์: บล็อกรายละเอียดแบบ Dashboard เดิม (ช่วงวันที่ → KPI 5 กลุ่ม → กราฟรายปี → รายการพร้อมภาพ → แผนที่) ---------- */
  /* นิยาม (ตรวจกับ DashboardAI/script.js แล้วปรับให้ตรวจกลับได้): อุบัติเหตุ = ประเภทที่มีคำว่า ยานพาหนะ/จราจร/ถนน (บนถนน) · ทั่วไป · ทำงาน/ปฏิบัติงาน
   * “รับส่งผู้ป่วย” นับแยก ไม่รวมในอุบัติเหตุ · เหตุอื่น (บังคับล้อ ลักทรัพย์ ปรับ รปภ. ฯลฯ) ไม่อยู่ใน KPI ชุดนี้ · ทุกยอดนับจากรายการชุดเดียวกับที่แสดงด้านล่าง */
  function incCat(r) { var t = r.type || ''; return t.indexOf(P) >= 0 ? 'patient' : /ยานพาหนะ|จราจร|ถนน/.test(t) ? 'road' : /ทำงาน|ปฏิบัติงาน/.test(t) ? 'work' : /ทั่วไป/.test(t) ? 'gen' : 'other'; }
  function personKey(t) { return /นักศึกษา/.test(t) ? 'student' : /บุคลากร/.test(t) ? 'staff' : /ภายนอก/.test(t) ? 'outsider' : /outsource|ผู้รับเหมา/i.test(t) ? 'outsource' : 'unknown'; }
  function incKpi(rows) {
    var k = { acc: { road: 0, gen: 0, work: 0 }, inj: { road: 0, gen: 0, work: 0 }, injUnknownRecs: 0, injBy: { student: 0, staff: 0, outsider: 0, outsource: 0, unknown: 0 }, trips: 0, patBy: { student: 0, staff: 0, outsider: 0, outsource: 0, unknown: 0 }, patPeople: 0, deaths: 0 };
    rows.forEach(function (r) {
      var c = incCat(r), ps = r.persons || [];
      k.deaths += ps.filter(function (p) { return p.dead; }).length;
      if (c === 'patient') { k.trips++; var n = r.injured == null ? ps.length : Math.max(r.injured, ps.length); k.patPeople += n; ps.forEach(function (p) { k.patBy[personKey(p.type)]++; }); k.patBy.unknown += Math.max(0, n - ps.length); return; }
      if (c === 'other') return;
      k.acc[c]++; if (r.injured == null) { if (r.hasInjured === 'มี') k.injUnknownRecs++; } else k.inj[c] += r.injured;
      var cnt = 0; ps.forEach(function (p) { if (cnt < (r.injured == null ? ps.length : r.injured)) { k.injBy[personKey(p.type)]++; cnt++; } }); k.injBy.unknown += Math.max(0, (r.injured || 0) - cnt);
    });
    k.accTotal = k.acc.road + k.acc.gen + k.acc.work; k.injTotal = k.inj.road + k.inj.gen + k.inj.work; return k;
  }
  function kstrip(color, title, value, unit, parts, note) {
    return el('div', { class: 'kstrip', style: '--kc:' + color }, [el('div', { class: 'ks-h', text: title }), el('div', { class: 'ks-v' }, [el('b', { text: value }), unit ? el('span', { text: ' ' + unit }) : null]),
      parts && parts.length ? el('dl', { class: 'ks-p' }, parts.reduce(function (a, p) { a.push(el('dt', { text: p[0] })); a.push(el('dd', { text: p[1] })); return a; }, [])) : null, note ? el('p', { class: 'ks-n', text: note }) : null]);
  }
  var incMapCtx = { map: null, layer: null, pts: [], pick: null };
  function incidentBlock() {
    return section('รายละเอียดรายงานเหตุการณ์', { note: 'ข้อมูลภายใน — อ่านจากรายงานเหตุการณ์ ณ เวลาที่เปิดหน้า' }, [dataView('incidents', function (all) {
      all = all.slice().sort(function (a, b) { return (a.date + (a.time || '')) < (b.date + (b.time || '')) ? 1 : -1; });
      var min = all.reduce(function (a, r) { return r.date < a ? r.date : a; }, '9999-12-31'), max = all.reduce(function (a, r) { return r.date > a ? r.date : a; }, '0000-01-01');
      var years = {}; all.forEach(function (r) { years[r.date.slice(0, 4)] = 1; }); var yl = Object.keys(years).sort();
      var st = state.incB || (state.incB = { from: min, to: max, autoFrom: true, autoTo: true, type: 'all', q: '', asc: false, page: 0, year: yl.indexOf(String(bkkNow().y)) >= 0 ? String(bkkNow().y) : yl[yl.length - 1] });
      { var hq = hashQuery(), hk = (state.pageSeq || 0) + '|' + location.hash;      /* รอบ 14·P2: ลิงก์ “ดูต่อ” จากผู้ช่วย AI (#traffic?from=…&to=…) ใช้ครั้งเดียวต่อการเปิดหน้า — ผู้ใช้เปลี่ยนตัวกรองต่อได้ */
        if (st.hqKey !== hk && (hq.from || hq.to)) { st.hqKey = hk; if (/^\d{4}-\d{2}-\d{2}$/.test(hq.from || '')) { st.from = hq.from < min ? min : hq.from; st.autoFrom = false; } if (/^\d{4}-\d{2}-\d{2}$/.test(hq.to || '')) { st.to = hq.to > max ? max : hq.to; st.autoTo = false; } if (st.from > st.to) { st.from = min; st.to = max; st.autoFrom = st.autoTo = true; } st.page = 0; } }
      if (st.autoFrom || st.from < min || st.from > max) st.from = min; if (st.autoTo || st.to > max || st.to < min) st.to = max;      /* รอบ 14: ค่าเริ่มต้น “ทั้งช่วงข้อมูล” ขยายตามรายการใหม่ · ผู้ใช้เลือกเองแล้วคงไว้ */
      var host = el('div', { class: 'incb' }), kp = el('div', { class: 'kstrips' }), yr = el('div'), list = el('div', { class: 'incb-list' }), mapBox = el('div');
      var inRangeRows = function () { return all.filter(function (r) { return r.date >= st.from && r.date <= st.to; }); };
      function open(r) { openIncident(r); }                       /* รายละเอียดแบบเดียวกับ “รายละเอียดเหตุการณ์วันนี้” บนหน้าแรก (incDetail) */
      function drawKpi(rows) {
        var k = incKpi(rows), by = function (o) { return [['นักศึกษา', num(o.student)], ['บุคลากร', num(o.staff)], ['ภายนอก', num(o.outsider)], ['Outsource', num(o.outsource)]].concat(o.unknown ? [['ไม่ระบุ', num(o.unknown)]] : []); };
        kp.textContent = '';
        kp.appendChild(kstrip('#c2410c', 'อุบัติเหตุทั้งหมด', num(k.accTotal), 'ครั้ง', [['บนถนน', num(k.acc.road)], ['ทั่วไป', num(k.acc.gen)], ['ทำงาน', num(k.acc.work)]]));
        kp.appendChild(kstrip('#b91c1c', 'ผู้ได้รับบาดเจ็บทั้งหมด', num(k.injTotal), 'คน', [['บนถนน', num(k.inj.road)], ['ทั่วไป', num(k.inj.gen)], ['ทำงาน', num(k.inj.work)]], k.injUnknownRecs ? 'มี ' + num(k.injUnknownRecs) + ' เหตุที่ระบุว่ามีผู้บาดเจ็บแต่ไม่ได้กรอกจำนวน (ไม่รวมในยอด)' : ''));
        kp.appendChild(kstrip('#1d4ed8', 'ประเภทผู้ได้รับบาดเจ็บ', num(k.injTotal), 'คน', by(k.injBy)));
        kp.appendChild(kstrip('#0f766e', 'รับส่งผู้ป่วย', num(k.trips), 'ครั้ง', by(k.patBy), 'แยกประเภทเป็นจำนวนผู้ป่วย ' + num(k.patPeople) + ' คน (1 ครั้งอาจมีมากกว่า 1 คน)'));
        kp.appendChild(kstrip('#4b5563', 'ผู้เสียชีวิต', k.deaths ? num(k.deaths) : 'ไม่พบในบันทึก', k.deaths ? 'คน' : '', [], 'ต้นทางไม่มีช่องเฉพาะ — นับจากคำว่า “เสียชีวิต” ในรายละเอียดผู้บาดเจ็บ/ผู้ป่วย'));
      }
      function drawYear() {
        var cols = [], m, ser = { road: [], gen: [], work: [] };
        for (m = 1; m <= 12; m++) { var ym = st.year + '-' + ('0' + m).slice(-2); cols.push({ label: mLabel(ym).split(' ')[0], full: mFull(ym), month: ym }); ['road', 'gen', 'work'].forEach(function (c) { ser[c].push(all.filter(function (r) { return r.date.slice(0, 7) === ym && incCat(r) === c; }).length); }); }
        yr.textContent = '';
        yr.appendChild(figure('สถิติอุบัติเหตุรายเดือน ปี พ.ศ. ' + (+st.year + 543), 'เลือกปีได้ตามข้อมูลที่มี · ไม่ขึ้นกับช่วงวันที่ด้านบน', el('div', {}, [el('div', { class: 'incb-yr' }, [el('span', { text: 'ปี' }), selectOf('เลือกปีของกราฟ', yl.map(function (y) { return [y, 'พ.ศ. ' + (+y + 543)]; }), st.year, function (v) { st.year = v; drawYear(); })]),
          bars(cols, [{ name: 'บนถนน (ยานพาหนะ)', color: C.c3, values: ser.road }, { name: 'ทั่วไป', color: C.c2, values: ser.gen }, { name: 'จากการทำงาน', color: C.c5, values: ser.work }], { aria: 'จำนวนอุบัติเหตุรายเดือน ปี พ.ศ. ' + (+st.year + 543), unit: 'ครั้ง', int: true })])));
      }
      function drawList(rows) {
        var types = {}; rows.forEach(function (r) { types[r.type] = (types[r.type] || 0) + 1; });
        var f = rows.filter(function (r) { return (st.type === 'all' || r.type === st.type) && (!st.q || [r.id, r.place, r.type, r.detail, r.cause, r.date].join(' ').toLowerCase().indexOf(st.q) >= 0); });
        if (st.asc) f = f.slice().reverse();
        var per = 6, pages = Math.max(1, Math.ceil(f.length / per)); if (st.page >= pages) st.page = pages - 1;
        var q = el('input', { type: 'search', placeholder: 'ค้นหาสถานที่ รายละเอียด หรือรหัสเหตุการณ์…', 'aria-label': 'ค้นหาเหตุการณ์', value: st.q }), tm = null;
        q.oninput = function () { clearTimeout(tm); tm = setTimeout(function () { st.q = q.value.trim().toLowerCase(); st.page = 0; drawList(rows); var n = list.querySelector('input[type=search]'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 250); };
        list.textContent = '';
        list.appendChild(el('div', { class: 'lu-bar' }, [selectOf('ประเภทเหตุการณ์', [['all', 'ทุกประเภท (' + num(rows.length) + ')']].concat(Object.keys(types).sort().map(function (t) { return [t, t + ' (' + num(types[t]) + ')']; })), types[st.type] ? st.type : 'all', function (v) { st.type = v; st.page = 0; redraw(); }),
          el('button', { type: 'button', class: 'btn-ghost', 'aria-pressed': String(st.asc), text: st.asc ? 'เรียง: เก่า → ใหม่' : 'เรียง: ใหม่ → เก่า', onclick: function () { st.asc = !st.asc; st.page = 0; drawList(rows); } }), q]));
        list.appendChild(el('p', { class: 'lu-count', role: 'status', text: num(f.length) + ' เหตุการณ์' + (f.length !== rows.length ? ' (จาก ' + num(rows.length) + ' ในช่วงวันที่)' : '') }));
        if (!f.length) { list.appendChild(el('div', { class: 'empty', text: 'ไม่พบเหตุการณ์ที่ตรงกับเงื่อนไข' })); return f; }
        list.appendChild(el('div', { class: 'it-grid inc' }, f.slice(st.page * per, st.page * per + per).map(function (r) {
          return itemCard({ img: (r.images || [])[0], title: r.place || 'ไม่ระบุสถานที่', tag: r.type, sub: fdate(r.date) + (r.time ? ' · ' + r.time + ' น.' : '') + (r.injured ? ' · บาดเจ็บ/ป่วย ' + r.injured + ' คน' : ''), meta: r.id, open: function () { open(r); } }); })));
        var pg = pager(st, pages, function () { drawList(rows); }, list); if (pg) list.appendChild(pg);
        return f;
      }
      function drawMap(rows) {
        var am = mod('accidentMap'), b = (am && am.box) || { latMin: 13.786, latMax: 13.803, lngMin: 100.315, lngMax: 100.329 };
        var pts = rows.filter(function (r) { var c = incCat(r); return r.lat != null && r.lng != null && (c === 'road' || c === 'gen' || c === 'work'); }).map(function (r, i) { return { i: 'b' + i, lat: r.lat, lng: r.lng, type: incCat(r) === 'road' ? V : G, place: r.place || '', month: r.date.slice(0, 7), row: r }; });
        var noLL = rows.filter(function (r) { var c = incCat(r); return (c === 'road' || c === 'gen' || c === 'work') && (r.lat == null || r.lng == null); }).length;
        if (incMapCtx.map) { try { incMapCtx.map.remove(); } catch (e) {} incMapCtx.map = null; incMapCtx.layer = null; }
        mapBox.textContent = '';
        var fig = figure('แผนที่จุดเกิดอุบัติเหตุ', num(pts.length) + ' จุดในช่วงวันที่และตัวกรองด้านบน' + (noLL ? ' · อีก ' + num(noLL) + ' เหตุไม่มีพิกัด' : '') + ' · กดหมุดเพื่อดูรายละเอียด', el('div', { class: 'dash-map incb-map' }));
        var box = fig.querySelector('.incb-map'); mapBox.appendChild(fig);
        var plan = function (msg) { box.textContent = ''; box.appendChild(el('div', { class: 'map-warn', role: 'status' }, [el('b', { text: msg })])); var w = el('div', { class: 'map-svg map-mini' }); drawPlan(w, pts, b); box.appendChild(w); };
        if (!pts.length) { box.appendChild(el('div', { class: 'empty', text: 'ไม่มีอุบัติเหตุที่มีพิกัดในเงื่อนไขนี้' })); return; }
        if (!tilesAllowed()) { plan('เปิดจากไฟล์ในเครื่อง จึงแสดงเป็นแผนผังตามพิกัด'); return; }
        box.appendChild(el('div', { class: 'empty', role: 'status', text: 'กำลังโหลดแผนที่…' }));
        tilesReady(function (ok) { setTimeout(function () {
          if (!document.body.contains(box)) return; if (!ok) { plan((lf.reason || 'โหลดแผนที่พื้นหลังไม่สำเร็จ') + ' — แสดงแผนผังตามพิกัดแทน'); return; }
          box.textContent = ''; var div = el('div', { class: 'lf-map dash', 'aria-label': 'แผนที่จุดเกิดอุบัติเหตุตามตัวกรอง' }); box.appendChild(div);
          incMapCtx.map = L.map(div, { scrollWheelZoom: false, zoomSnap: 0.5 }).fitBounds(L.latLngBounds(pts.map(function (p) { return [p.lat, p.lng]; })).pad(0.25), { maxZoom: 17 });
          incMapCtx.map.attributionControl.setPrefix(false); osmLayer().addTo(incMapCtx.map);
          incMapCtx.pts = pts; incMapCtx.pick = function (p) { open(p.row); }; incMapCtx.map.on('zoomend', function () { drawMarkersOn(incMapCtx); }); drawMarkersOn(incMapCtx);
        }, 0); });
      }
      function redraw() { var rows = inRangeRows(); drawKpi(rows); var f = drawList(rows); drawMap(f || []); }
      var ctl = el('div', { class: 'incb-ctl' }, [dateIn('ตั้งแต่วันที่', st.from, min, max, function (v) { if (v && v <= st.to) { st.from = v; st.autoFrom = v === min; st.page = 0; redraw(); } }), dateIn('ถึงวันที่', st.to, min, max, function (v) { if (v && v >= st.from) { st.to = v; st.autoTo = v === max; st.page = 0; redraw(); } }),
        el('button', { type: 'button', class: 'btn-ghost', text: 'ทั้งช่วงข้อมูล', onclick: function () { st.from = min; st.to = max; st.autoFrom = st.autoTo = true; st.page = 0; var ins = ctl.querySelectorAll('input[type=date]'); ins[0].value = min; ins[1].value = max; redraw(); } }), el('span', { class: 'src', text: 'มีข้อมูล ' + fdate(min) + ' – ' + fdate(max) + ' · ช่วงวันที่นี้ใช้กับตัวเลข รายการ และแผนที่ของบล็อกนี้' })]);
      host.appendChild(ctl); host.appendChild(kp); host.appendChild(yr); host.appendChild(el('h3', { class: 'incb-h', text: 'รายละเอียดเหตุการณ์' })); host.appendChild(list); host.appendChild(mapBox);
      drawYear(); redraw(); return host;
    })]);
  }

  /* ---------- Lost & Found: รายการจริงจาก LF_New (ประเภท กับ สถานะ เป็นตัวกรองคนละตัว) ---------- */
  function lfListSection() {
    return section('รายการแจ้งของหาย / เก็บของได้', { note: 'ข้อมูลภายใน — แท็บ LF_New' }, [dataView('lostfound', function (all) {
      all = all.slice().sort(function (a, b) { return a.at < b.at ? 1 : -1; });
      var days = all.map(function (r) { return r.at.slice(0, 10); }), min = days[days.length - 1] || '', max = days[0] || '';
      var st = state.lfB || (state.lfB = { type: 'all', status: 'all', from: min, to: max, q: '', page: 0 }); if (!st.from || st.from < min) st.from = min; if (!st.to || st.to > max) st.to = max;
      var host = el('div'), body = el('div'), bar = el('div', { class: 'lu-bar' });
      var cnt = function (key) { var o = {}; all.forEach(function (r) { var v = r[key] || '(ว่าง)'; o[v] = (o[v] || 0) + 1; }); return o; }, ty = cnt('type'), ss = cnt('status');
      function open(r) { detailDlg((r.type || '') + ' — ' + (r.detail || r.ref), [['เลขอ้างอิง', r.ref], ['ประเภท', r.type], ['สถานะ', r.status || '(ว่าง)'], ['วันที่แจ้ง', fdate(r.at)], ['วันที่เกิดเหตุ', fdate(r.date) + (r.time ? ' ' + r.time : '')], ['รายละเอียด', r.detail], ['สถานที่', r.place],
        ['ผู้แจ้ง', [r.name, r.personType, r.unit].filter(Boolean).join(' · ')], ['เบอร์โทร', r.phone], ['การดำเนินการ', r.action], ['อัปเดตล่าสุด', fdate(r.updatedAt)]], r.images); }
      function draw() {
        var f = all.filter(function (r) { var d = r.at.slice(0, 10); return (st.type === 'all' || r.type === st.type) && (st.status === 'all' || (r.status || '(ว่าง)') === st.status) && d >= st.from && d <= st.to && (!st.q || [r.ref, r.detail, r.place, r.type, r.status].join(' ').toLowerCase().indexOf(st.q) >= 0); });
        var per = 12, pages = Math.max(1, Math.ceil(f.length / per)); if (st.page >= pages) st.page = pages - 1;
        body.textContent = '';
        body.appendChild(el('p', { class: 'lu-count', role: 'status', text: num(f.length) + ' รายการ' + (f.length !== all.length ? ' (จากทั้งหมด ' + num(all.length) + ')' : '') + ' · เรียงจากล่าสุด' }));
        if (!f.length) { body.appendChild(el('div', { class: 'empty', text: 'ไม่พบรายการที่ตรงกับเงื่อนไข' })); return; }
        body.appendChild(el('div', { class: 'it-grid' }, f.slice(st.page * per, st.page * per + per).map(function (r) { return itemCard({ img: (r.images || [])[0], tag: r.type, title: r.detail || r.ref, sub: [r.place, fdate(r.at)].filter(Boolean).join(' · '), meta: 'สถานะ: ' + (r.status || '(ว่าง)') + ' · ' + r.ref, open: function () { open(r); } }); })));
        var pg = pager(st, pages, draw, host); if (pg) body.appendChild(pg);
      }
      var q = el('input', { type: 'search', placeholder: 'ค้นหารายละเอียด สถานที่ หรือเลขอ้างอิง…', 'aria-label': 'ค้นหารายการ', value: st.q }), tm = null; q.oninput = function () { clearTimeout(tm); tm = setTimeout(function () { st.q = q.value.trim().toLowerCase(); st.page = 0; draw(); }, 250); };
      var opt = function (o, all0) { return [['all', all0]].concat(Object.keys(o).sort().map(function (k) { return [k, k + ' (' + num(o[k]) + ')']; })); };
      bar.appendChild(el('label', { class: 'di' }, [el('span', { text: 'ประเภท' }), selectOf('กรองตามประเภท', opt(ty, 'ทุกประเภท'), ty[st.type] ? st.type : 'all', function (v) { st.type = v; st.page = 0; draw(); })]));
      bar.appendChild(el('label', { class: 'di' }, [el('span', { text: 'สถานะ' }), selectOf('กรองตามสถานะ', opt(ss, 'ทุกสถานะ'), ss[st.status] ? st.status : 'all', function (v) { st.status = v; st.page = 0; draw(); })]));
      bar.appendChild(dateIn('ตั้งแต่', st.from, min, max, function (v) { if (v) { st.from = v; st.page = 0; draw(); } })); bar.appendChild(dateIn('ถึง', st.to, min, max, function (v) { if (v) { st.to = v; st.page = 0; draw(); } })); bar.appendChild(q);
      host.appendChild(bar); host.appendChild(body); draw(); return host;
    })]);
  }

  /* ---------- กิจกรรมพิเศษ / GPS งานปริญญา: รายการจริงหลัง Login (GPS = รายงานย้อนหลัง ไม่ใช่ตำแหน่งสด และไม่แสดงเป็นเส้นทางรายบุคคล) ---------- */
  /* ================= รอบ 9: รายละเอียดเหตุการณ์ (ใช้ร่วม Dashboard + หน้ารายงาน) · กิจกรรมพิเศษ · GPS ปริญญา ================= */
  function bkkStamp(dt) { var d = new Date((dt instanceof Date ? dt.getTime() : Date.now()) + 7 * 3600000); return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate()) + ' ' + pad2(d.getUTCHours()) + ':' + pad2(d.getUTCMinutes()); }
  function readNote(d, src) { return el('p', { class: 'src', text: 'แหล่งข้อมูล: ' + src + ' · อ่านเมื่อ ' + fdate(bkkStamp(d && d.at)) + ' (เวลาไทย)' }); }
  function countBy(rows, f) { var o = {}; rows.forEach(function (r) { var k = f(r); o[k] = (o[k] || 0) + 1; }); return o; }
  function optsOf(label, o) { return [['all', label]].concat(Object.keys(o).sort().map(function (k) { return [k, k + ' (' + num(o[k]) + ')']; })); }
  /* ภาพหลายภาพ: กดภาพใดก็ได้เพื่อขยาย แล้วเลื่อน ‹ › ดูภาพอื่นในชุดเดียวกัน (ปุ่มลูกศรซ้าย/ขวาบนแป้นพิมพ์ใช้ได้) */
  function lightboxSet(list, i, caption) {
    var last = document.activeElement, n = list.length, img = el('img', { alt: '', referrerpolicy: 'no-referrer' }), msg = el('p'), close, onKey;
    function show() { img.hidden = false; img.alt = caption + ' ภาพที่ ' + (i + 1); msg.textContent = caption + (n > 1 ? ' — ภาพที่ ' + (i + 1) + ' / ' + n : ''); img.src = imgSrc(list[i], 'w1600'); }
    img.onerror = function () { img.hidden = true; var k = i; msg.textContent = 'กำลังตรวจสาเหตุ…'; imgWhy(img.src, function (why) { if (k === i) msg.textContent = why + ' — ' + caption + (n > 1 ? ' ภาพที่ ' + (i + 1) : ''); }); };
    var goPrev = function () { i = (i + n - 1) % n; show(); }, goNext = function () { i = (i + 1) % n; show(); };
    var prev = el('button', { type: 'button', class: 'btn sec', 'aria-label': 'ภาพก่อนหน้า', text: '‹', onclick: goPrev }), next = el('button', { type: 'button', class: 'btn sec', 'aria-label': 'ภาพถัดไป', text: '›', onclick: goNext });
    var btn = el('button', { type: 'button', class: 'btn sec', text: 'ปิด' });
    var ov = el('div', { class: 'lightbox', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'ภาพขยาย: ' + caption, onclick: function (e) { if (e.target === ov) close(); } }, [el('div', { class: 'lb-in' }, [img, msg, el('div', { class: 'lb-nav' }, n > 1 ? [prev, btn, next] : [btn])])]);
    close = function () { ov.remove(); document.removeEventListener('keydown', onKey); if (last && last.focus) last.focus(); };
    onKey = function (e) { if (e.key === 'Escape') close(); else if (n > 1 && e.key === 'ArrowLeft') goPrev(); else if (n > 1 && e.key === 'ArrowRight') goNext(); };
    btn.addEventListener('click', function () { close(); }); show(); document.body.appendChild(ov); document.addEventListener('keydown', onKey); btn.focus();
  }
  /* ภาพประกอบ: ภาพหลักใหญ่ตามสัดส่วนจริง (ไม่ครอป · object-fit: contain) ใช้ srcset 800/1600 ให้เบราว์เซอร์เลือกตามขนาดจอและความหนาแน่นพิกเซล
   * รูปย่อ 400px เฉพาะแถบเลือกภาพ · กดภาพหลักเพื่อขยาย (1600px) และเลื่อนดูภาพอื่นได้ · ภาพที่ไม่ได้เลือกยังไม่โหลดขนาดใหญ่ */
  function gallery(list, caption) {
    list = (list || []).filter(function (u) { return imgSrc(u); });
    if (!list.length) return el('p', { class: 'src gal-none', text: 'ไม่มีรูปภาพ' });
    var cur = 0, wrap = el('div', { class: 'gal2' }), stage = el('div', { class: 'gal-stage' }), thumbs = list.length > 1 ? el('div', { class: 'gal-thumbs', role: 'group', 'aria-label': 'เลือกภาพ (' + list.length + ' ภาพ)' }) : null;
    function show(i) {
      cur = i; stage.textContent = '';
      var main = el('button', { type: 'button', class: 'gal-main', 'aria-label': 'ขยายภาพ ' + caption + (list.length > 1 ? ' ภาพที่ ' + (i + 1) + ' จาก ' + list.length : ''), onclick: function (e) { e.stopPropagation(); lightboxSet(list, cur, caption); } });
      var s8 = imgSrc(list[i], 'w800'), s16 = imgSrc(list[i], 'w1600'), im = el('img', { alt: caption + (list.length > 1 ? ' ภาพที่ ' + (i + 1) : ''), decoding: 'async', referrerpolicy: 'no-referrer', sizes: '(max-width: 760px) 94vw, 46vw' });
      im.onerror = function () { stage.textContent = ''; var box = el('div', { class: 'gal-main noimg', role: 'status' }); stage.appendChild(box); imgFailed(box, im.currentSrc || s8, function () { show(cur); }); };
      if (s8 !== s16) im.srcset = s8 + ' 800w, ' + s16 + ' 1600w';
      im.src = s8; main.appendChild(im); stage.appendChild(main);
      if (thumbs) [].forEach.call(thumbs.children, function (t, k) { t.setAttribute('aria-pressed', String(k === i)); });
    }
    if (thumbs) list.forEach(function (u, i) {
      var t = el('button', { type: 'button', class: 'gal-th', 'aria-label': 'แสดงภาพที่ ' + (i + 1), 'aria-pressed': 'false', onclick: function (e) { e.stopPropagation(); show(i); } }), ti = el('img', { alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' });
      ti.onerror = function () { t.classList.add('noimg'); t.textContent = String(i + 1); };
      ti.src = imgSrc(u, 'w400'); t.appendChild(ti); thumbs.appendChild(t); });
    wrap.appendChild(stage); if (thumbs) wrap.appendChild(thumbs); show(0); return wrap;
  }
  function panelDlg(title, body) {
    var last = document.activeElement, close = function () { ov.remove(); document.removeEventListener('keydown', onKey); if (last && last.focus) last.focus(); }, onKey = function (e) { if (e.key === 'Escape' && !document.querySelector('.lightbox')) close(); };
    var btn = el('button', { type: 'button', class: 'btn sec', text: 'ปิด', onclick: close });
    var ov = el('div', { class: 'dlg-ov', role: 'dialog', 'aria-modal': 'true', 'aria-label': title, onclick: function (e) { if (e.target === ov) close(); } }, [el('div', { class: 'dlg' }, [el('div', { class: 'dlg-h' }, [el('h3', { text: title }), btn]), body])]);
    document.body.appendChild(ov); document.addEventListener('keydown', onKey); btn.focus();
  }

  /* รายละเอียดเหตุการณ์แบบเดียวกับ Dashboard เดิม (Main-AI-v1): KPI การเข้าถึง → วันเวลา → รับแจ้งจาก → พาหนะ → สถานที่ → ผู้บาดเจ็บ → สาเหตุ → การดำเนินการ → รายละเอียด + ภาพ
   * ใช้ร่วมทั้ง “รายละเอียดเหตุการณ์วันนี้” บนหน้าแรก และหน้ารายงานเหตุการณ์ (opt.names = แสดงชื่อบุคคล เฉพาะหน้าต่างรายละเอียดของหน้ารายงาน) */
  function incDetail(r, opt) {
    opt = opt || {}; var dl = el('dl', { class: 'incd-dl' }), add = function (k, v, cls) { if (v === '' || v == null) return; dl.appendChild(el('dt', { text: k })); dl.appendChild(el('dd', { class: cls || null, text: String(v) })); };
    var kpi = String(r.kpi || '').split('|').map(function (x) { return x.trim(); }).filter(function (x) { return x && x !== '-'; });
    add('วันที่เกิดเหตุ', fdate(r.date) + (r.time ? ' เวลา ' + r.time + ' น.' : ''));
    add('รับแจ้งจาก', [r.reporterType ? r.reporterType + (r.reporterUnit ? ' (' + r.reporterUnit + ')' : '') : r.reporterUnit, r.channel ? 'รับแจ้งทาง ' + r.channel : ''].filter(Boolean).join(' · '));
    if (incCat(r) === 'road' && r.vehicle1) add('ยานพาหนะ', r.vehicle1 + (r.driver1 ? ' ของ' + r.driver1 : '') + (!r.vehicle2 ? '' : /ล้มเอง|ชนทรัพย์สิน/.test(r.vehicle2) ? ' (' + r.vehicle2 + ')' : ' ชนกับ ' + r.vehicle2 + (r.driver2 ? ' ของ' + r.driver2 : '')));
    else if (r.vehicle1) add('ยานพาหนะ', [r.vehicle1, r.vehicle2].filter(Boolean).join(' / '));
    add('สถานที่', r.place);
    var ps = r.persons || [], none = r.injured === 0 || (r.injured == null && /^ไม่มี/.test(r.hasInjured || ''));
    if (none) add('ผู้บาดเจ็บ/ผู้ป่วย', 'ไม่มีผู้ได้รับบาดเจ็บ', 'ok');
    else if (r.injured != null || ps.length || /^มี/.test(r.hasInjured || '')) add('ผู้บาดเจ็บ/ผู้ป่วย', (r.injured != null ? r.injured + ' คน' : ps.length ? ps.length + ' คน' : 'มี (ไม่ได้กรอกจำนวน)') + (ps.length ? ' — ' + ps.map(function (p, i) { return (ps.length > 1 ? (i + 1) + ') ' : '') + [p.type || 'ไม่ระบุประเภท', opt.names ? p.name : '', p.symptom].filter(Boolean).join(' · '); }).join(' ') : ''), 'bad');
    add('ทรัพย์สินเสียหาย', [r.damage, r.damageDetail].filter(function (x) { return x && x !== 'ไม่มี'; }).join(' · '));
    add('สาเหตุ', r.cause);
    add('การดำเนินการ', [r.transport, r.hospital ? 'ส่งต่อ ' + r.hospital : ''].filter(Boolean).join(' → '));
    add('เวลาตอบสนอง', [r.notified ? 'ได้รับแจ้ง ' + r.notified : '', r.arrived ? 'ถึงที่เกิดเหตุ ' + r.arrived : '', r.serviceArrived ? 'รถบริการถึง ' + r.serviceArrived : '', r.hospitalArrived ? 'ถึงสถานพยาบาล ' + r.hospitalArrived : ''].filter(Boolean).join(' · '));
    add(r.summary ? 'สรุปเหตุการณ์' : 'รายละเอียด', r.summary || r.detail);
    if (r.summary && r.detail && opt.names) add('รายละเอียดเพิ่มเติม', r.detail);
    add('รหัสเหตุการณ์', r.id && !/^ROW-/.test(r.id) ? r.id : '');
    return el('article', { class: 'incd' }, [el('div', { class: 'incd-media' }, [gallery(r.images, (r.type || 'เหตุการณ์') + ' — ' + (r.place || ''))]),
      el('div', { class: 'incd-body' }, [el('div', { class: 'incd-top' }, [el('p', { class: 'incd-type' }, [el('span', { class: 'incd-emo', 'aria-hidden': 'true', text: incEmoji(r.type) }), ' ' + (r.type || 'ไม่ระบุประเภท')]),
          el('h3', { class: 'incd-place' }, [el('span', { 'aria-hidden': 'true', text: '📍 ' }), r.place || 'ไม่ระบุสถานที่'])]),
        kpi.length ? el('ul', { class: 'incd-kpi', 'aria-label': 'ผลตรวจ KPI การเข้าถึง' }, kpi.map(function (k) { return el('li', { class: /✅|ผ่าน/.test(k) && !/ไม่ผ่าน|❌/.test(k) ? 'ok' : /❌|ไม่ผ่าน|เกิน/.test(k) ? 'bad' : '', text: k }); })) : null, dl])]);
  }
  function incEmoji(t) { t = String(t || ''); return /ยานพาหนะ|จราจร/.test(t) ? '🚗' : /ผู้ป่วย/.test(t) ? '🚑' : /อุบัติเหตุ/.test(t) ? '⚠️' : /บังคับล้อ/.test(t) ? '🔒' : /ลักทรัพย์|โจร/.test(t) ? '🕵️' : /รปภ/.test(t) ? '🛡️' : /ไฟ|เพลิง/.test(t) ? '🔥' : '📌'; }
  function openIncident(r) { panelDlg((r.type || 'เหตุการณ์') + ' — ' + (r.place || 'ไม่ระบุสถานที่'), incDetail(r, { names: true })); }

  /* หน้าแรก: รายละเอียดเหตุการณ์วันนี้ — วันนี้ = วันที่ปัจจุบันตามเวลาไทย และเลือกตาม “วันที่เกิดเหตุ” (ไม่ใช่วันที่บันทึก)
   * อ่านสำเร็จแต่ไม่มีรายการ → บอกว่าไม่พบ ณ เวลาตรวจ · อ่านไม่สำเร็จ → แสดงข้อผิดพลาดพร้อมปุ่มลองใหม่ (dataView) ไม่แสดง 0 */
  function todayIncidentsSection() {
    var t = todayStr();
    return section('รายละเอียดเหตุการณ์วันนี้', { icon: '🚨', note: dLabel(t) + ' · ตามวันที่เกิดเหตุ (เวลาประเทศไทย)', more: 'traffic' }, [dataView('incidents', function (all, d) {
      var tk = function (r) { var m = /^(\d{1,2})[:.](\d{2})/.exec(r.time || ''); return (m ? pad2(+m[1]) + ':' + m[2] : '99:99') + (r.rec || ''); };      // เวลาแบบ 8:10 / 11:25 → เรียงตามเวลาจริง
      var rows = all.filter(function (r) { return r.date === t; }).sort(function (a, b) { return tk(a) < tk(b) ? 1 : -1; });
      var st = state.todayInc && state.todayInc.day === t ? state.todayInc : (state.todayInc = { day: t, type: 'all', i: 0 }), host = el('div', { class: 'tdi' }), body = el('div');
      var checked = fdate(bkkStamp(d.at)).replace(/^.* (\d{2}:\d{2} น\.)$/, '$1');
      if (!rows.length) {
        host.appendChild(el('div', { class: 'empty tdi-empty', role: 'status', text: 'ไม่พบรายการของวันนี้ ณ เวลาตรวจ ' + checked }));
        var latest = all.slice().sort(function (a, b) { return a.date + (a.time || '') < b.date + (b.time || '') ? 1 : -1; }).slice(0, 3);
        if (latest.length) host.appendChild(el('div', { class: 'tdi-latest' }, [el('h3', { text: 'เหตุการณ์ล่าสุดในระบบ (ไม่ใช่ของวันนี้)' }), el('ul', { class: 'list' }, latest.map(function (r) {
          return el('li', {}, [el('div', {}, [el('b', { text: (r.type || 'เหตุการณ์') + ' — ' + (r.place || 'ไม่ระบุสถานที่') }), el('span', { text: fdate(r.date) + (r.time ? ' เวลา ' + r.time + ' น.' : '') })]), el('button', { type: 'button', class: 'btn sec', text: 'ดูรายละเอียด', onclick: function () { openIncident(r); } })]); }))]));
        host.appendChild(readNote(d, 'รายงานเหตุการณ์')); return host;
      }
      var types = countBy(rows, function (r) { return r.type || 'ไม่ระบุประเภท'; });
      host.appendChild(el('p', { class: 'tdi-sum', role: 'status' }, [el('b', { text: 'วันนี้ ' + num(rows.length) + ' เหตุการณ์' }), ' — ' + Object.keys(types).map(function (k) { return k + ' ' + num(types[k]); }).join(' · ')]));
      function draw() {
        var f = rows.filter(function (r) { return st.type === 'all' || (r.type || 'ไม่ระบุประเภท') === st.type; }); if (st.i >= f.length) st.i = 0;
        body.textContent = '';
        var bar = el('div', { class: 'tdi-bar' }, [selectOf('กรองประเภทเหตุการณ์ของวันนี้', optsOf('ทุกประเภท (' + num(rows.length) + ')', types), types[st.type] ? st.type : 'all', function (v) { st.type = v; st.i = 0; draw(); })]);
        if (f.length > 1) { bar.appendChild(el('div', { class: 'tdi-nav' }, [el('button', { type: 'button', class: 'btn-ghost', 'aria-label': 'เหตุการณ์ก่อนหน้า', text: '‹', onclick: function () { st.i = (st.i + f.length - 1) % f.length; draw(); } }),
          el('span', { 'aria-live': 'polite', text: 'เหตุการณ์ที่ ' + (st.i + 1) + ' / ' + f.length }), el('button', { type: 'button', class: 'btn-ghost', 'aria-label': 'เหตุการณ์ถัดไป', text: '›', onclick: function () { st.i = (st.i + 1) % f.length; draw(); } })])); }
        else bar.appendChild(el('span', { class: 'tdi-nav', text: 'เหตุการณ์ที่ 1 / 1' }));
        body.appendChild(bar); body.appendChild(incDetail(f[st.i]));
      }
      draw(); host.appendChild(body); host.appendChild(el('p', { class: 'src' }, ['อ่านเมื่อ ' + checked + ' (เวลาไทย) · ', el('a', { href: '#traffic', text: 'ดูรายงานเหตุการณ์ทั้งหมด →' })])); return host;
    })]);
  }

  /* กิจกรรมพิเศษ (Sheet1): วันเวลา ประเภท/ระดับ สถานที่ หน่วยงาน รายละเอียด ภาพ · ตัวกรองวันที่ ประเภท ระดับ ค้นหา แบ่งหน้า · ไม่มีชื่อ/ตำแหน่งผู้รายงาน */
  function eventsSection() {
    return section('รายการเหตุการณ์กิจกรรมพิเศษ', { note: 'ข้อมูลภายใน — Sheet1 ของแบบรายงานกิจกรรมพิเศษ' }, [dataView('events', function (all, d) {
      all = all.slice().sort(function (a, b) { return String(a.at) < String(b.at) ? 1 : -1; });
      var host = el('div');
      if (!all.length) { host.appendChild(el('div', { class: 'empty', role: 'status', text: 'อ่านแหล่งข้อมูลสำเร็จ แต่ยังไม่มีรายการเหตุการณ์' })); host.appendChild(readNote(d, 'Sheet1')); return host; }
      var days = all.map(function (r) { return String(r.at).slice(0, 10); }).filter(function (x) { return /^\d{4}-\d{2}-\d{2}$/.test(x); }).sort(), min = days[0] || '', max = days[days.length - 1] || '';
      var st = state.evB || (state.evB = { from: min, to: max, type: 'all', level: 'all', q: '', page: 0 }); if (!st.from || st.from < min) st.from = min; if (!st.to || st.to > max) st.to = max;
      var tOf = function (r) { return r.type || 'ไม่ระบุประเภท'; }, lOf = function (r) { return r.level || 'ไม่ระบุระดับ'; };
      var kp = el('div'), bar = el('div', { class: 'lu-bar' }), body = el('div');
      function open(r) { panelDlg(tOf(r) + ' — ' + (r.place || 'ไม่ระบุสถานที่'), el('div', {}, [gallery(r.images, tOf(r)), (function () { var dl = el('dl', { class: 'dlg-dl' }); [['วันเวลา', fdate(r.at)], ['ประเภทเหตุการณ์', tOf(r)], ['ระดับเหตุการณ์', lOf(r)], ['สถานที่เกิดเหตุ', r.place || 'ไม่ระบุ'], ['หน่วยงานที่รายงาน', r.unit], ['รายละเอียด', r.detail]].forEach(function (f) { if (f[1]) { dl.appendChild(el('dt', { text: f[0] })); dl.appendChild(el('dd', { text: f[1] })); } }); return dl; })()])); }
      function draw() {
        var inDate = all.filter(function (r) { var x = String(r.at).slice(0, 10); return !/^\d{4}/.test(x) || (x >= st.from && x <= st.to); });
        var ty = countBy(inDate, tOf), lv = countBy(inDate, lOf);
        var f = inDate.filter(function (r) { return (st.type === 'all' || tOf(r) === st.type) && (st.level === 'all' || lOf(r) === st.level) && (!st.q || [r.type, r.place, r.detail, r.unit, r.level, r.at].join(' ').toLowerCase().indexOf(st.q) >= 0); });
        var fl = countBy(f, lOf), per = 12, pages = Math.max(1, Math.ceil(f.length / per)); if (st.page >= pages) st.page = pages - 1;
        kp.textContent = ''; kp.appendChild(kpiGrid([{ icon: 'alert', label: 'เหตุการณ์ตามตัวกรอง', value: num(f.length), unit: 'รายการ', sub: 'จากทั้งหมด ' + num(all.length) + ' · ' + fdate(st.from) + ' – ' + fdate(st.to), color: C.c3 }].concat(Object.keys(fl).sort().map(function (k, i) { return { icon: 'alert', label: 'ระดับ: ' + k, value: num(fl[k]), unit: 'รายการ', color: [C.c2, C.c1, C.c5, C.fine][i % 4] }; }))));
        bar.textContent = '';
        bar.appendChild(dateIn('ตั้งแต่', st.from, min, max, function (v) { if (v && v <= st.to) { st.from = v; st.page = 0; draw(); } }));
        bar.appendChild(dateIn('ถึง', st.to, min, max, function (v) { if (v && v >= st.from) { st.to = v; st.page = 0; draw(); } }));
        bar.appendChild(el('button', { type: 'button', class: 'btn-ghost', text: 'ทั้งช่วงข้อมูล', onclick: function () { st.from = min; st.to = max; st.page = 0; draw(); } }));
        bar.appendChild(selectOf('ประเภทเหตุการณ์', optsOf('ทุกประเภท', ty), ty[st.type] ? st.type : 'all', function (v) { st.type = v; st.page = 0; draw(); }));
        bar.appendChild(selectOf('ระดับเหตุการณ์', optsOf('ทุกระดับ', lv), lv[st.level] ? st.level : 'all', function (v) { st.level = v; st.page = 0; draw(); }));
        var q = el('input', { type: 'search', placeholder: 'ค้นหาสถานที่ รายละเอียด หรือหน่วยงาน…', 'aria-label': 'ค้นหาเหตุการณ์กิจกรรมพิเศษ', value: st.q }), tm = null;
        q.oninput = function () { clearTimeout(tm); tm = setTimeout(function () { st.q = q.value.trim().toLowerCase(); st.page = 0; draw(); var n2 = bar.querySelector('input[type=search]'); if (n2) { n2.focus(); n2.setSelectionRange(n2.value.length, n2.value.length); } }, 250); };
        bar.appendChild(q);
        body.textContent = '';
        body.appendChild(el('p', { class: 'lu-count', role: 'status', text: num(f.length) + ' เหตุการณ์' + (f.length !== all.length ? ' (จากทั้งหมด ' + num(all.length) + ')' : '') + ' · เรียงจากล่าสุด' }));
        if (!f.length) { body.appendChild(el('div', { class: 'empty', text: 'ไม่พบรายการที่ตรงกับเงื่อนไข' })); return; }
        body.appendChild(el('div', { class: 'it-grid' }, f.slice(st.page * per, st.page * per + per).map(function (r) { var n = (r.images || []).length;
          return itemCard({ img: (r.images || [])[0], tag: lOf(r), title: tOf(r), sub: [r.place || 'ไม่ระบุสถานที่', fdate(r.at)].join(' · '), meta: (r.unit || '') + (n > 1 ? ' · ภาพ ' + n + ' ภาพ' : ''), open: function () { open(r); } }); })));
        var pg = pager(st, pages, draw, host); if (pg) body.appendChild(pg);
      }
      host.appendChild(kp); host.appendChild(bar); host.appendChild(body); host.appendChild(readNote(d, 'Sheet1 (แบบรายงานเหตุการณ์กิจกรรมพิเศษ)')); draw(); return host;
    })]);
  }

  /* GPS ปริญญา (แท็บ Reports): สรุปตามตัวกรอง + รายการ · ไม่มีชื่อ/รหัส รปภ. · พิกัด = ณ เวลาส่งรายงาน ไม่ใช่ตำแหน่งสด */
  var GEO_TH = { WITHIN_RADIUS: 'อยู่ในรัศมีจุดปฏิบัติงาน', OUTSIDE_RADIUS: 'อยู่นอกรัศมีจุด', POST_NO_COORDS: 'จุดยังไม่มีพิกัดอ้างอิง', LOW_ACCURACY: 'GPS แม่นยำต่ำ' };
  function geoTh(k) { return GEO_TH[k] || k || 'ไม่มีสถานะพิกัด'; }
  function gpsSection() {
    return section('รายการรายงาน (แท็บ Reports)', { note: 'ข้อมูลภายใน — พิกัดเป็นของรายงาน ณ เวลาที่ส่ง ไม่ใช่ตำแหน่งปัจจุบัน' }, [dataView('gps', function (all, d) {
      all = all.slice().sort(function (a, b) { return (a.date + a.time) < (b.date + b.time) ? 1 : -1; });
      var host = el('div');
      if (!all.length) { host.appendChild(el('div', { class: 'empty', role: 'status', text: 'อ่านแหล่งข้อมูลสำเร็จ แต่ยังไม่มีรายงาน' })); host.appendChild(readNote(d, 'แท็บ Reports')); return host; }
      var days = all.map(function (r) { return r.date; }).filter(function (x) { return /^\d{4}-\d{2}-\d{2}$/.test(x); }).sort(), min = days[0] || '', max = days[days.length - 1] || '';
      var st = state.gpsB || (state.gpsB = { from: min, to: max, zone: 'all', post: 'all', geo: 'all', rec: 'all', q: '', page: 0 }); if (!st.from || st.from < min) st.from = min; if (!st.to || st.to > max) st.to = max;
      var kp = el('div'), bar = el('div', { class: 'lu-bar' }), body = el('div');
      function open(r) {
        var dl = el('dl', { class: 'dlg-dl' });
        [['รหัสรายงาน', r.id], ['วันที่ เวลา', fdate(r.date) + (r.time ? ' เวลา ' + String(r.time).replace(/^(\d{1,2}[:.]\d{2}).*$/, '$1') + ' น.' : '')], ['ชนิดรายงาน', r.kind], ['จุดปฏิบัติงาน', r.post], ['โซน / หน้าที่', [r.zone, r.duty].filter(Boolean).join(' / ')], ['บริษัท', r.company],
          ['เหตุการณ์', [r.eventType, r.severity].filter(Boolean).join(' · ')], ['รายละเอียด', r.detail], ['สถานะบันทึก', r.record], ['สถานะพิกัด', [geoTh(r.geo), r.gpsStatus].filter(Boolean).join(' · ')],
          ['ความแม่นยำ GPS', r.accuracy ? num(+r.accuracy) + ' เมตร' : ''], ['ระยะจากจุดประจำ', r.distance ? num(+r.distance) + ' เมตร' : ''], ['พิกัดของรายงาน (ณ เวลาที่ส่ง)', r.lat != null && r.lng != null ? r.lat + ', ' + r.lng : '']].forEach(function (f) { if (f[1]) { dl.appendChild(el('dt', { text: f[0] })); dl.appendChild(el('dd', { text: f[1] })); } });
        panelDlg((r.post || 'รายงาน') + ' — ' + fdate(r.date), el('div', {}, [gallery(r.images, 'ภาพประกอบรายงาน ' + (r.post || '')), dl]));
      }
      function draw() {
        var inD = all.filter(function (r) { return r.date >= st.from && r.date <= st.to; }), zo = countBy(inD, function (r) { return r.zone || 'ไม่ระบุโซน'; });
        var inZ = inD.filter(function (r) { return st.zone === 'all' || (r.zone || 'ไม่ระบุโซน') === st.zone; }), po = countBy(inZ, function (r) { return r.post || 'ไม่ระบุจุด'; }), ge = countBy(inZ, function (r) { return geoTh(r.geo); }), rc = countBy(inZ, function (r) { return r.record || '(ว่าง)'; });
        var f = inZ.filter(function (r) { return (st.post === 'all' || (r.post || 'ไม่ระบุจุด') === st.post) && (st.geo === 'all' || geoTh(r.geo) === st.geo) && (st.rec === 'all' || (r.record || '(ว่าง)') === st.rec) && (!st.q || [r.post, r.zone, r.duty, r.kind, r.eventType, r.detail, r.id, r.company].join(' ').toLowerCase().indexOf(st.q) >= 0); });
        var fg = countBy(f, function (r) { return r.geo || ''; }), acc = f.map(function (r) { return +r.accuracy; }).filter(function (x) { return x > 0; }).sort(function (a, b) { return a - b; }), photos = f.filter(function (r) { return (r.images || []).length; }).length;
        var pct = function (k) { return f.length ? ' (' + num(Math.round(1000 * (fg[k] || 0) / f.length) / 10) + '%)' : ''; };
        kp.textContent = ''; kp.appendChild(kpiGrid([{ icon: 'file', label: 'รายงานตามตัวกรอง', value: num(f.length), unit: 'รายงาน', sub: 'จากทั้งหมด ' + num(all.length) + ' · ' + fdate(st.from) + ' – ' + fdate(st.to), color: C.c3 },
          { icon: 'check', label: GEO_TH.WITHIN_RADIUS, value: num(fg.WITHIN_RADIUS || 0), unit: 'รายงาน', sub: pct('WITHIN_RADIUS').replace(/[()]/g, '').trim() + ' ของรายงานตามตัวกรอง', color: C.c1 },
          { icon: 'alert', label: GEO_TH.OUTSIDE_RADIUS, value: num(fg.OUTSIDE_RADIUS || 0), unit: 'รายงาน', sub: 'GPS แม่นยำต่ำ ' + num(fg.LOW_ACCURACY || 0) + ' · จุดไม่มีพิกัดอ้างอิง ' + num(fg.POST_NO_COORDS || 0), color: C.c2 },
          { icon: 'map', label: 'ความแม่นยำ GPS (ค่ากลาง)', value: acc.length ? num(acc[Math.floor(acc.length / 2)]) : '–', unit: acc.length ? 'เมตร' : '', sub: 'มีภาพประกอบ ' + num(photos) + ' รายงาน', color: C.c5 }]));
        bar.textContent = '';
        bar.appendChild(dateIn('ตั้งแต่', st.from, min, max, function (v) { if (v && v <= st.to) { st.from = v; st.page = 0; draw(); } }));
        bar.appendChild(dateIn('ถึง', st.to, min, max, function (v) { if (v && v >= st.from) { st.to = v; st.page = 0; draw(); } }));
        bar.appendChild(el('button', { type: 'button', class: 'btn-ghost', text: 'ทุกวัน', onclick: function () { st.from = min; st.to = max; st.page = 0; draw(); } }));
        bar.appendChild(selectOf('โซน', optsOf('ทุกโซน', zo), zo[st.zone] ? st.zone : 'all', function (v) { st.zone = v; st.post = 'all'; st.page = 0; draw(); }));
        bar.appendChild(selectOf('จุดปฏิบัติงาน', optsOf('ทุกจุด', po), po[st.post] ? st.post : 'all', function (v) { st.post = v; st.page = 0; draw(); }));
        bar.appendChild(selectOf('สถานะพิกัด', optsOf('ทุกสถานะพิกัด', ge), ge[st.geo] ? st.geo : 'all', function (v) { st.geo = v; st.page = 0; draw(); }));
        bar.appendChild(selectOf('สถานะบันทึก', optsOf('ทุกสถานะบันทึก', rc), rc[st.rec] ? st.rec : 'all', function (v) { st.rec = v; st.page = 0; draw(); }));
        var q = el('input', { type: 'search', placeholder: 'ค้นหาจุด หน้าที่ เหตุการณ์ หรือรหัสรายงาน…', 'aria-label': 'ค้นหารายงาน', value: st.q }), tm = null;
        q.oninput = function () { clearTimeout(tm); tm = setTimeout(function () { st.q = q.value.trim().toLowerCase(); st.page = 0; draw(); var n2 = bar.querySelector('input[type=search]'); if (n2) { n2.focus(); n2.setSelectionRange(n2.value.length, n2.value.length); } }, 250); };
        bar.appendChild(q);
        var per = 12, pages = Math.max(1, Math.ceil(f.length / per)); if (st.page >= pages) st.page = pages - 1;
        body.textContent = '';
        body.appendChild(el('p', { class: 'lu-count', role: 'status', text: num(f.length) + ' รายงาน · เรียงจากล่าสุด' }));
        if (!f.length) { body.appendChild(el('div', { class: 'empty', text: 'ไม่พบรายงานที่ตรงกับเงื่อนไข' })); return; }
        body.appendChild(el('div', { class: 'it-grid' }, f.slice(st.page * per, st.page * per + per).map(function (r) {
          return itemCard({ img: (r.images || [])[0], tag: geoTh(r.geo), title: r.post || 'ไม่ระบุจุด', sub: fdate(r.date) + (r.time ? ' ' + String(r.time).replace(/^(\d{1,2}[:.]\d{2}).*$/, '$1') + ' น.' : '') + (r.zone ? ' · โซน ' + r.zone : ''), meta: [r.kind, r.eventType, r.record].filter(Boolean).join(' · '), open: function () { open(r); } }); })));
        var pg = pager(st, pages, draw, host); if (pg) body.appendChild(pg);
      }
      host.appendChild(kp); host.appendChild(bar); host.appendChild(body); host.appendChild(readNote(d, 'แท็บ Reports (ระบบรายงาน รปภ. งานปริญญา)')); draw(); return host;
    })]);
  }

  /* ---------- ตรวจพื้นที่: สถิติจากจำนวนบันทึกจริง (ไม่ใช่อัตราทำงานครบ เพราะต้นทางไม่มีจำนวนจุด/รอบที่ต้องทำเป็นตัวหาร) ---------- */
  function areaStats(rows, title) {
    if (!rows.length) return null;
    var by = {}; rows.forEach(function (r) { var d = String(r.date).slice(0, 10); by[d] = (by[d] || 0) + 1; }); var days = Object.keys(by).sort(), last = days[days.length - 1], cols = [], vals = [], i;
    for (i = 29; i >= 0; i--) { var d = addDays(last, -i); cols.push({ label: i % 5 === 0 ? dShort(d) : '', full: dLabel(d), month: d }); vals.push(by[d] || 0); }
    return el('div', { class: 'sec' }, [kpiGrid([{ icon: 'camera', label: 'ภาพบันทึกทั้งหมด', value: num(rows.length), unit: 'ภาพ', color: C.c1 }, { icon: 'calendar', label: 'วันที่มีบันทึก', value: num(days.length), unit: 'วัน', color: C.c3 }, { icon: 'chart', label: 'บันทึกล่าสุด', value: dLabel(last), color: C.c2, sub: num(by[last]) + ' ภาพ' }]),
      figure('จำนวนภาพบันทึกต่อวัน — ' + title, '30 วันถึง ' + dLabel(last) + ' · เป็นจำนวนบันทึก ไม่ใช่อัตราการทำงานครบ', bars(cols, [{ name: 'ภาพบันทึก', color: C.c1, values: vals }], { aria: 'จำนวนภาพบันทึกต่อวัน', unit: 'ภาพ', int: true }))]);
  }

  /* ---------- ตั้งค่า: รายชื่อประจำผลัด (ผู้ดูแลแก้ไขได้ · บันทึกฝั่งบริการ · มีรุ่นกันเขียนทับ · มีประวัติ) ---------- */
  function rosterAdminSection() {
    var host = el('div', { class: 'dv' }), data = null;
    var ERR = { conflict: 'มีผู้ดูแลอีกคนแก้ไขไปก่อน — โหลดรายชื่อล่าสุดแล้ว ตรวจและทำรายการอีกครั้ง', forbidden: 'ไม่มีสิทธิ์แก้ไขรายชื่อ', invalid: 'กรอกชื่อ บทบาท และผลัดให้ครบ', 'not-found': 'ไม่พบรายการนี้แล้ว — โหลดรายชื่อล่าสุด', 'no-session': 'หมดเวลาการใช้งาน กรุณาเข้าสู่ระบบอีกครั้ง' };
    function load() { host.textContent = ''; host.appendChild(el('div', { class: 'empty', role: 'status', text: 'กำลังโหลดรายชื่อ…' })); apiCall('/roster').then(function (x) { if (x.s === 401) { authLost(); return; } if (x.s !== 200 || !x.j.ok) { host.textContent = ''; host.appendChild(el('div', { class: 'card box dv-err', role: 'alert' }, [el('strong', { text: 'โหลดรายชื่อไม่สำเร็จ' }), el('p', { class: 'src', text: 'รหัสสาเหตุ: ' + (x.j.code || 'http ' + x.s) }), el('button', { type: 'button', class: 'btn sec', text: 'ลองใหม่', onclick: load })])); return; } data = x.j; draw(''); }); }
    function send(body, okMsg) {
      body.version = data.version;
      apiCall('/roster', { method: 'POST', body: body }).then(function (x) {
        if (x.s === 200 && x.j.ok) { data = x.j; rosterNames = null; rosterNamesState = 'none'; draw(okMsg); return; }
        if (x.s === 409 && x.j.code === 'duplicate') { if (window.confirm('มีชื่อนี้อยู่แล้วในผลัด ' + x.j.dup.map(function (d) { return d.team + ' (' + d.role + ')'; }).join(', ') + '\nถ้าเป็นคนละคนที่ชื่อเหมือนกัน กด “ตกลง” เพื่อเพิ่มเป็นอีกรายการ')) { body.force = true; send(body, okMsg); } return; }
        if (x.s === 401) { authLost(); return; }
        if (x.s === 409) { apiCall('/roster').then(function (y) { if (y.j.ok) data = y.j; draw(ERR.conflict, true); }); return; }
        draw(ERR[x.j.code] || 'บันทึกไม่สำเร็จ (รหัสสาเหตุ: ' + (x.j.code || 'http ' + x.s) + ')', true);
      });
    }
    function draw(msg, bad) {
      host.textContent = '';
      if (msg) host.appendChild(el('p', { class: 'hf-msg ' + (bad ? 'bad' : 'ok'), role: 'status', text: msg }));
      var total = 0; ['1', '2', '3', '4'].forEach(function (t) { total += (data.teams[t] || []).length; });
      host.appendChild(el('p', { class: 'src', text: (data.canEdit ? 'คุณเป็นผู้ดูแล: เพิ่ม แก้ไข ย้ายผลัด หรือปิดใช้งานได้ · ' : 'อ่านอย่างเดียว (เฉพาะผู้ดูแลแก้ไขได้) · ') + num(total) + ' รายการ · รุ่นข้อมูล ' + data.version }));
      host.appendChild(el('div', { class: 'ros-grid' }, ['1', '2', '3', '4'].map(function (t) {
        return el('div', { class: 'card box' }, [el('h3', { text: 'ผลัด ' + t }), el('ul', { class: 'ros-list' }, (data.teams[t] || []).map(function (p) {
          var li = el('li', { class: p.active === false ? 'off' : '' }, [el('b', { text: p.role }), el('span', { text: p.name + (p.active === false ? ' (ปิดใช้งาน)' : '') })]);
          if (data.canEdit) li.appendChild(el('span', { class: 'ros-act' }, [
            el('button', { type: 'button', class: 'btn-ghost', text: 'แก้ไข', onclick: function () { var n = window.prompt('ชื่อ–สกุล', p.name); if (n == null) return; var r = window.prompt('บทบาท (เช่น ส.ต1, วิทยุ)', p.role); if (r == null) return; send({ op: 'update', id: p.id, name: n, role: r }, 'บันทึกการแก้ไขแล้ว'); } }),
            selectOf('ย้ายผลัดของ ' + p.name, [['', 'ย้ายไป…'], ['1', 'ผลัด 1'], ['2', 'ผลัด 2'], ['3', 'ผลัด 3'], ['4', 'ผลัด 4']].filter(function (o) { return o[0] !== t; }), '', function (v) { if (v) send({ op: 'move', id: p.id, team: v }, 'ย้ายผลัดแล้ว'); }),
            el('button', { type: 'button', class: 'btn-ghost', text: p.active === false ? 'เปิดใช้งาน' : 'ปิดใช้งาน', onclick: function () { send({ op: p.active === false ? 'enable' : 'disable', id: p.id }, p.active === false ? 'เปิดใช้งานแล้ว' : 'ปิดใช้งานแล้ว'); } })]));
          return li; })), (data.teams[t] || []).length ? null : el('p', { class: 'src', text: 'ยังไม่มีรายชื่อ' })]); })));
      if (data.canEdit) {
        var nm = el('input', { type: 'text', 'aria-label': 'ชื่อ–สกุล', placeholder: 'ชื่อ–สกุล', maxlength: '120' }), rl = el('input', { type: 'text', 'aria-label': 'บทบาท', placeholder: 'บทบาท เช่น ส.ต1 / วิทยุ', maxlength: '40' }), tm = selectOf('ผลัด', [['1', 'ผลัด 1'], ['2', 'ผลัด 2'], ['3', 'ผลัด 3'], ['4', 'ผลัด 4']], '1', function () {});
        host.appendChild(el('form', { class: 'ros-add', onsubmit: function (e) { e.preventDefault(); send({ op: 'add', name: nm.value, role: rl.value, team: tm.value }, 'เพิ่มรายชื่อแล้ว'); } }, [el('strong', { text: 'เพิ่มรายชื่อ' }), nm, rl, tm, el('button', { type: 'submit', class: 'btn', text: 'เพิ่ม' })]));
        var hist = el('div'); host.appendChild(el('details', { class: 'fold' }, [el('summary', { text: 'ประวัติการแก้ไข' }), hist]));
        apiCall('/roster/log').then(function (x) { var rows = (x.j && x.j.rows) || []; hist.appendChild(rows.length ? table(['เวลา', 'ผู้แก้ไข', 'การกระทำ', 'รายการ'], rows.slice(0, 50).map(function (r) { var o = {}; try { o = JSON.parse(r.after || r.before || '{}'); } catch (e) {} return [fdate(new Date(r.at + 7 * 3600000).toISOString().slice(0, 16).replace('T', ' ')), r.by, r.action, (o.name || '') + (o.team ? ' · ผลัด ' + o.team : '')]; })) : el('p', { class: 'src', text: 'ยังไม่มีประวัติ' })); });
      }
    }
    load();
    return section('รายชื่อประจำผลัด', { note: 'เก็บในฐานข้อมูลของระบบใหม่ ไม่อยู่ใน Repository และไม่แก้ Sheet ต้นทาง' }, [host]);
  }

  /* ---------- ต่อบล็อกใหม่เข้ากับหน้าเดิม (เฉพาะเมื่อผ่าน Login กลางแล้ว) ---------- */
  function wrapPage(id, fn) { var old = PAGES[id]; if (old) PAGES[id] = function (v) { old(v); if (AUTH.on && AUTH.user) fn(v); }; }
  wrapPage('traffic', function (v) { var last = v.lastElementChild; v.insertBefore(incidentBlock(), last && /ระบบ/.test(last.getAttribute('aria-label') || '') ? last : null); });
  wrapPage('lostfound', function (v) { var old = $('lfList'), sec = old && old.closest ? old.closest('section') : null; if (sec) sec.parentNode.replaceChild(lfListSection(), sec); else v.appendChild(lfListSection()); });
  wrapPage('settings', function (v) { v.appendChild(rosterAdminSection()); });
  wrapPage('dashboard', function (v) { var tr = v.querySelector('section[aria-label="แนวโน้มรายเดือน"]'); v.insertBefore(todayIncidentsSection(), tr || null); });
  /* ================= รอบ 10: สถานะการอ่านข้อมูลสด · นักศึกษา–รถจักรยานยนต์ · แบบสำรวจเรือนไทย ================= */
  var SRC_NAME = { incidents: 'รายงานเหตุการณ์', gate: 'จำนวนรถเข้า + หมวกนิรภัย', lostfound: 'Lost & Found (LF_New)', lfYear: 'Lost & Found รายการปีปัจจุบัน', areaPhotos: 'ภาพการตรวจพื้นที่ / ช่วยเหลือ',
    radio: 'บันทึกรายงานวิทยุสื่อสาร', events: 'กิจกรรมพิเศษ (Sheet1)', gps: 'รายงาน รปภ.ปริญญา GPS (Reports)', studentMoto: 'ทะเบียนนักศึกษา–รถจักรยานยนต์ (Registrations_Motorcycle)', ruenthai: 'แบบสำรวจลานจอดเรือนไทย (RuenThai_Survey)' };
  var SRC_WHY = { 'relay-not-configured': 'ไฟล์ต้นทางเป็นส่วนตัว — ยังไม่ได้เปิดตัวกลางอ่านข้อมูลของเจ้าของไฟล์ (Apps Script)', 'source-private': 'ไฟล์ต้นทางเป็นส่วนตัว (ไม่ได้แชร์ลิงก์)',
    'relay-login-required': 'ตัวกลางยังไม่ได้ Deploy ให้ “Anyone” เรียกได้', 'relay-forbidden': 'ค่าลับของตัวกลางไม่ตรง — ต้องลงทะเบียนตัวกลางใหม่', 'relay-schema': 'หัวคอลัมน์ต้นทางเปลี่ยน (ตัวกลางไม่พบคอลัมน์ที่ใช้)',
    'source-schema': 'หัวคอลัมน์ต้นทางเปลี่ยน', 'relay-timeout': 'ตัวกลางตอบช้าเกินไป', 'relay-unreachable': 'ติดต่อตัวกลางไม่ได้ชั่วคราว', 'source-unreachable': 'ติดต่อต้นทางไม่ได้ชั่วคราว', 'source-error': 'ต้นทางตอบผิดรูปแบบ',
    'relay-internal': 'ตัวกลางทำงานผิดพลาด', 'relay-error': 'ตัวกลางตอบผิดรูปแบบ', 'source-not-configured': 'ยังไม่ได้ตั้ง ID ของแหล่งข้อมูล',
    'relay-not-deployed': 'ไม่พบ Web app ของตัวกลาง (ถูกลบหรือ URL ผิด)', 'outdated': 'ตัวกลาง Deploy เป็นโค้ดรุ่นเก่า — ต้อง Deploy เป็น New version', 'relay-not-allowed': 'ตัวกลางไม่อนุญาตไฟล์นี้ (อยู่นอกโฟลเดอร์ที่กำหนด)',
    'relay-unknown-source': 'ตัวกลางรุ่นนี้ไม่รู้จักตารางนี้', internal: 'ระบบประมวลผลคำขอนี้ไม่สำเร็จ กรุณาลองใหม่หรือแจ้งรหัสอ้างอิง', 'auth-unavailable': 'ตรวจสิทธิ์เข้าใช้ไม่สำเร็จชั่วคราว', 'source-timeout': 'ต้นทางตอบช้าเกินกำหนด', 'http 0': 'เชื่อมต่อบริการไม่สำเร็จ (ไม่ได้รับคำตอบจากเซิร์ฟเวอร์)', 'relay-source-forbidden': 'บัญชีที่ติดตั้งตัวกลางเปิด Sheet นี้ไม่ได้', 'relay-source-error': 'ตัวกลางอ่าน Sheet ไม่สำเร็จ', 'relay-not-found': 'ตัวกลางไม่พบไฟล์/แท็บ', 'skipped': 'ไม่มีภาพตัวอย่างให้ตรวจ' };
  function srcWhy(code) { return SRC_WHY[code] || (/^http \d+$/.test(code || '') ? 'บริการตอบผิดพลาด (' + code.toUpperCase() + ')' : 'อ่านไม่สำเร็จ (' + code + ')'); }
  function liveSourcesSection() {
    var host = el('div', {}, []);
    function load(deep) {
    host.textContent = ''; host.appendChild(el('p', { class: 'src', role: 'status', text: deep ? 'กำลังตรวจตัวกลางแบบลึก (เรียก /exec · อ่าน 2 ตาราง · อ่านภาพตัวอย่าง) — ใช้เวลาประมาณ 10 วินาที…' : 'กำลังตรวจการอ่านแต่ละแหล่ง…' }));
    apiCall('/sources' + (deep ? '?deep=1' : '')).then(function (x) {
      host.textContent = '';
      if (x.s === 401) { authLost(); return; }
      if (x.s !== 200 || !x.j || !x.j.ok) { host.appendChild(el('div', { class: 'empty', role: 'alert' }, ['ตรวจสถานะไม่สำเร็จ (' + ((x.j && x.j.code) || 'HTTP ' + x.s) + ') ', el('button', { type: 'button', class: 'btn-ghost', text: 'ลองใหม่', onclick: function () { route(true); } })])); return; }
      var S = x.j.sources, ST = { ok: ['s-connected', 'อ่านสำเร็จ'], empty: ['s-warn', 'อ่านสำเร็จแต่ไม่มีรายการ'], error: ['s-off', 'อ่านไม่สำเร็จ'] };
      host.appendChild(table(['ชุดข้อมูล', 'ผล', 'ช่องทาง', 'อ่านสำเร็จเมื่อ / สาเหตุ'], Object.keys(S).map(function (k) { var o = S[k], st = ST[o.state] || ['s-off', o.state];
        return [SRC_NAME[k] || k, el('span', { class: 'pill ' + st[0], text: st[1] + (o.rows != null && o.state === 'ok' ? ' · ' + num(o.rows) + ' แถว' : '') }), o.via === 'relay' ? 'ตัวกลางของเจ้าของไฟล์' : 'ลิงก์แชร์ของ Sheet',
          o.state === 'error' ? srcWhy(o.code) : fdate(o.readAt) + ' (เวลาไทย)']; }), {}));
      var R = x.j.relay || {}, ck = R.check || {}, okp = function (c) { return c === 'ok' || /^ok:/.test(String(c)); }, cell = function (c, okText) { return el('span', { class: 'pill ' + (okp(c) ? 's-connected' : c === 'skipped' ? 's-warn' : 's-off'), text: okp(c) ? okText : srcWhy(c) }); };
      var rows = [['ตั้งค่าในระบบ', el('span', { class: 'pill ' + (R.configured ? 's-connected' : 's-off'), text: R.configured ? 'ตั้งค่าแล้ว' : R.pending ? 'ลงทะเบียนแล้ว รอตรวจ /exec ผ่าน' : R.enrollOpen ? 'ยังไม่ติดตั้ง (เปิดรับลงทะเบียน)' : 'ยังไม่ติดตั้ง' })]];
      var ld = ck.shallow ? ck.lastDeep : null;
      if (R.configured) { rows.push(['ตัวกลางตอบ' + (ck.shallow ? '' : ' (รุ่นโค้ด)'), cell(ck.ping, ck.shallow ? 'ตอบได้ (จากการอ่านตารางล่าสุด)' : 'ตอบได้ · รุ่น ' + (ck.version || '-'))]);
        Object.keys(ck.tables || {}).forEach(function (k) { var t = ck.tables[k]; rows.push(['อ่านตาราง ' + (SRC_NAME[k] || k), cell(t, 'อ่านได้ · ' + num(+String(t).slice(3)) + ' แถว')]); });
        rows.push(['อ่านภาพ GPS ที่อนุญาต (ตัวอย่าง 1 ภาพ)', ck.shallow ? el('span', { class: 'pill ' + (ld ? (ld.image === 'ok' ? 's-connected' : 's-off') : 's-warn'), text: ld ? (ld.image === 'ok' ? 'อ่านได้' : srcWhy(ld.image)) + ' · ตรวจลึกล่าสุด ' + fdate(ld.at) + (ld.version ? ' · รุ่น ' + ld.version : '') : 'ยังไม่ได้ตรวจในรอบนี้ — กด “ตรวจตัวกลางแบบลึก”' }) : cell(ck.image, 'อ่านได้')]); }
      host.appendChild(el('h3', { class: 'h-sub', text: 'ตัวกลางอ่านไฟล์ส่วนตัว (HubRelay)' }));
      host.appendChild(table(['ขั้นตรวจ', 'ผล'], rows, {}));
      host.appendChild(el('p', { class: 'src', text: 'ตรวจเมื่อ ' + fdate(x.j.checkedAt) + (ck.shallow ? ' · สรุปจากผลอ่านล่าสุดของแต่ละแหล่ง (แคชไม่เกิน 2 นาที) — ไม่ได้เรียกตรวจตัวกลางซ้ำทุกครั้งที่เปิดหน้า' : ' · ตรวจลึก: บริการเรียก /exec จริงด้วยค่าลับฝั่งบริการ อ่าน 2 ตารางและภาพตัวอย่าง') }));
      host.appendChild(el('div', { class: 'btns' }, [el('button', { type: 'button', class: 'btn sec', text: 'ตรวจอีกครั้ง', onclick: function () { load(false); } }), R.configured ? el('button', { type: 'button', class: 'btn sec', text: 'ตรวจตัวกลางแบบลึก', onclick: function () { load(true); } }) : null]));
    });
    }
    load(false);
    return section('อ่านข้อมูลสดจากต้นทาง', { note: 'ผลจริงของบริการภายใน ณ เวลาที่เปิดหน้านี้ (แยกจากไฟล์สรุปด้านล่าง)' }, [host]);
  }
  wrapPage('settings', function (v) { var old = v.querySelector('section[aria-label="สถานะข้อมูลและเวลาอัปเดต"]'); v.insertBefore(liveSourcesSection(), old || null); });

  /* ข้อมูลสดจาก /api/stats ที่เพิ่มในรอบนี้ — ใส่ลงข้อมูลที่หน้าเดิมใช้ (ไม่สร้างตัวเลขคงที่แทน null) */
  function applyLive10(j) {
    var vr = mod('vehicleRegistration'), X = DATA.extra || (DATA.extra = {}), e = j.errors || {};
    if (vr) { if (j.studentMoto) { vr.rows['นักศึกษา – รถจักรยานยนต์'] = j.studentMoto.registrations; vr.studentMoto = j.studentMoto; vr.studentMotoErr = null; } else if (e.studentMoto) vr.studentMotoErr = e.studentMoto; }
    if (j.ruenthai) { var r = j.ruenthai, rs = X.ruenthaiSurvey || (X.ruenthaiSurvey = {}); rs.total = r.surveys; rs.daily = r.daily.map(function (d) { return { date: d.date, count: d.count }; }); rs.from = r.range.from; rs.updated = r.lastEntry; rs.checkedAt = r.checkedAt; rs.live = r; rs.liveErr = null; }
    else if (e.ruenthai && X.ruenthaiSurvey) X.ruenthaiSurvey.liveErr = e.ruenthai;
  }
  /* แพตช์ 19 พ.ย.: กราฟยานพาหนะรวมยอดไฟล์สรุป (ณ วันที่ไฟล์) กับ นศ.–จยย. ที่อ่านสด → บอกเวลาอ่านของแถวที่อ่านสดแยก */
  function vrMotoNote(vr) { var m = vr && vr.studentMoto; return m ? ' · นักศึกษา–จยย. อ่านสด ' + dLabel(m.checkedAt) + (vr.studentMotoErr ? ' (รอบล่าสุดอ่านไม่สำเร็จ)' : '') : ''; }
  function studentMotoNa() { var vr = mod('vehicleRegistration'); return vr && vr.studentMotoErr ? srcWhy(vr.studentMotoErr) : AUTH.on && !AUTH.user ? 'แสดงหลังเข้าสู่ระบบ' : 'กำลังอ่านข้อมูลสด'; }
  function studentMotoSection() {
    var vr = mod('vehicleRegistration'), m = vr && vr.studentMoto;
    if (!m) return vr && vr.studentMotoErr ? section('นักศึกษา – รถจักรยานยนต์', { note: 'Registrations_Motorcycle' }, [el('div', { class: 'empty', role: 'status', text: srcWhy(vr.studentMotoErr) })])
      : AUTH.on && AUTH.user ? section('นักศึกษา – รถจักรยานยนต์', { note: 'กำลังอ่านข้อมูลสดผ่านตัวกลางของเจ้าของไฟล์…' }, [el('div', { class: 'kpis skel-kpis', role: 'status', 'aria-label': 'กำลังโหลด' }, [0, 1, 2, 3].map(function () { return el('div', { class: 'kpi skel' }); }))]) : null;   /* รอบ 12: ที่ว่างขนาดใกล้ของจริงระหว่างรอ (ไม่ใช่ตัวเลข) */
    var hb = function (o, unit) { var ks = Object.keys(o), mx = Math.max.apply(null, ks.map(function (k) { return o[k]; }).concat([1])); return hbars(ks.sort(function (a, b) { return o[b] - o[a]; }).map(function (k) { return { label: k, value: o[k] }; }), mx, { unit: unit || 'รายการ' }); };
    var motoNote = function () { var m2 = (mod('vehicleRegistration') || {}).studentMoto; return m2 ? 'อ่านสดเมื่อ ' + fdate(m2.checkedAt) + ' · ' + fdate(m2.range.from) + ' – ' + fdate(m2.range.to) : null; };
    return liveText(section('นักศึกษา – รถจักรยานยนต์', { note: motoNote() }, [
      kpiGrid([{ icon: 'file', label: 'รายการลงทะเบียน', value: num(m.registrations), unit: 'รายการ', sub: '1 RefCode = 1 รายการ' + (m.duplicateRefs ? ' · RefCode ซ้ำ ' + num(m.duplicateRefs) + ' แถว (นับครั้งเดียว)' : ''), color: C.c1 },
        { icon: 'car', label: 'จำนวนรถตามที่กรอก', value: num(m.vehiclesDeclared), unit: 'คัน', sub: 'ช่อง “จำนวนรถ”' + (m.rowsNoCount ? ' · ไม่ได้กรอก ' + num(m.rowsNoCount) + ' รายการ' : ''), color: C.c3 },
        { icon: 'car', label: 'ช่องทะเบียนรถที่กรอก (รถ1–3)', value: num(m.platesFilled), unit: 'ช่อง', sub: 'จำนวนรถไม่ตรงกับช่องทะเบียน ' + num(m.rowsCountMismatch) + ' รายการ', color: C.c4 },
        { icon: 'alert', label: 'แถวที่ไม่มี RefCode', value: num(m.rowsWithoutRef), unit: 'แถว', sub: 'ไม่นับเป็นรายการลงทะเบียน', color: C.c5 }]),
      el('div', { class: 'grid2' }, [figure('แยกวิทยาเขต', 'หน่วย: รายการลงทะเบียน', hb(m.byCampus)), figure('แยกประเภทเครื่องยนต์', 'หน่วย: รายการลงทะเบียน', hb(m.byEngine)),
        figure('แยกคณะ/ส่วนงาน (12 อันดับแรก)', 'หน่วย: รายการลงทะเบียน', hb(m.byFaculty)), figure('รายเดือน (ตามวันที่ส่ง)', 'หน่วย: รายการลงทะเบียน', hb(m.monthly.reduce(function (a, r) { a[mLabel(r.month)] = r.count; return a; }, {})))]),
      el('p', { class: 'src', text: 'นิยาม: ' + m.definition + ' · ที่มา: ' + m.source + ' · ไม่ส่งชื่อ เบอร์ อีเมล ทะเบียนรถ หรือรหัสนักศึกษาลงหน้าเว็บ' })]), '.sec-h .note', motoNote);
  }

  /* เรือนไทย: ภาพรวมจากสรุปสด + รายการหลัง Login (ไม่มีชื่อ เบอร์ อีเมล ทะเบียน Token) กรองช่วงวันที่ กลุ่ม สถานะ LPR ค้นหา แบ่งหน้า */
  function ruenthaiLiveSection() {
    return section('แบบสำรวจลานจอดรถเรือนไทย — ข้อมูลสด', { note: 'แท็บ RuenThai_Survey · อ่านผ่านตัวกลางของเจ้าของไฟล์' }, [dataView('ruenthai', function (all, d) {
      var host = el('div'), seen = {}, dup = 0, rows = [];
      all.forEach(function (r) { if (!r.ref) return; if (seen[r.ref]) { dup++; return; } seen[r.ref] = 1; rows.push(r); });
      if (!rows.length) { host.appendChild(el('div', { class: 'empty', role: 'status', text: 'อ่านแหล่งข้อมูลสำเร็จ แต่ยังไม่มีแบบสำรวจ' })); return host; }
      rows.sort(function (a, b) { return String(a.at) < String(b.at) ? 1 : -1; });
      var days = rows.map(function (r) { return String(r.at).slice(0, 10); }).filter(function (x) { return /^\d{4}-\d{2}-\d{2}$/.test(x); }).sort(), min = days[0], max = days[days.length - 1];
      var st = state.rtB || (state.rtB = { from: min, to: max, group: 'all', lpr: 'all', q: '', page: 0 }); if (!st.from || st.from < min) st.from = min; if (!st.to || st.to > max) st.to = max;
      var kp = el('div'), bar = el('div', { class: 'lu-bar' }), charts = el('div'), body = el('div');
      var gOf = function (r) { return r.group || ('กลุ่ม ' + (r.groupType || '?')); }, lOf = function (r) { return r.lpr || '(ไม่ระบุ)'; };
      function draw() {
        var inD = rows.filter(function (r) { var x = String(r.at).slice(0, 10); return x >= st.from && x <= st.to; }), go = countBy(inD, gOf), lo = countBy(inD, lOf);
        var f = inD.filter(function (r) { return (st.group === 'all' || gOf(r) === st.group) && (st.lpr === 'all' || lOf(r) === st.lpr) && (!st.q || [r.ref, r.group, r.subType, r.faculty, r.subUnit, r.carTypes.join(' '), r.lpr].join(' ').toLowerCase().indexOf(st.q) >= 0); });
        var cars = f.reduce(function (a, r) { return a + (r.carCount || 0); }, 0), types = {}, mism = 0, noCount = 0;
        f.forEach(function (r) { r.carTypes.forEach(function (t) { types[t] = (types[t] || 0) + 1; }); if (r.carCount == null) noCount++; else if (r.carCount !== Math.max(r.carTypes.length, r.plates)) mism++; });
        kp.textContent = ''; kp.appendChild(kpiGrid([{ icon: 'file', label: 'แบบสำรวจตามตัวกรอง', value: num(f.length), unit: 'ชุด', sub: 'จากทั้งหมด ' + num(rows.length) + ' · ' + fdate(st.from) + ' – ' + fdate(st.to), color: C.c4 },
          { icon: 'car', label: 'จำนวนรถ (Car_Count)', value: num(cars), unit: 'คัน', sub: 'แยกจากจำนวนแบบสำรวจ · 1 ชุดมีรถได้มากกว่า 1 คัน', color: C.c3 },
          { icon: 'alert', label: 'Car_Count ไม่ตรงกับช่องรถที่กรอก', value: num(mism), unit: 'ชุด', sub: 'รายงานตามจริง ไม่แก้ต้นทาง' + (noCount ? ' · ไม่กรอกจำนวน ' + num(noCount) : ''), color: C.c2 },
          { icon: 'file', label: 'Ref_Code ซ้ำ', value: num(dup), unit: 'แถว', sub: 'นับครั้งเดียว', color: C.c5 }]));
        var hb = function (o) { var ks = Object.keys(o), mx = Math.max.apply(null, ks.map(function (k) { return o[k]; }).concat([1])); return hbars(ks.sort(function (a, b) { return o[b] - o[a]; }).slice(0, 15).map(function (k) { return { label: k, value: o[k] }; }), mx, { unit: 'ชุด' }); };
        var dd = countBy(f, function (r) { return String(r.at).slice(0, 10); }), dk = Object.keys(dd).sort();
        charts.textContent = '';
        charts.appendChild(figure('จำนวนแบบสำรวจรายวัน', 'หน่วย: ชุด (ตามตัวกรอง)', dk.length ? bars(dk.map(function (x) { return { label: (+x.slice(8)) + ' ' + TH_M[+x.slice(5, 7) - 1], full: dLabel(x) }; }), [{ name: 'แบบสำรวจ', color: C.c4, values: dk.map(function (x) { return dd[x]; }) }], { unit: 'ชุด', int: true, h: 230, aria: 'แบบสำรวจเรือนไทยรายวัน' }) : el('div', { class: 'empty', text: 'ไม่มีข้อมูลในช่วงนี้' })));
        charts.appendChild(el('div', { class: 'grid2' }, [figure('กลุ่มผู้ใช้ (Group_Label)', 'หน่วย: ชุด', hb(countBy(f, gOf))), figure('ประเภทย่อยผู้ใช้ (User_SubType)', 'หน่วย: ชุด', hb(countBy(f, function (r) { return r.subType || '(ไม่ระบุ)'; }))),
          figure('คณะ/ส่วนงาน (15 อันดับแรก)', 'หน่วย: ชุด', hb(countBy(f, function (r) { return r.faculty || '(ไม่ระบุ)'; }))), figure('หน่วยย่อย/โครงการ (15 อันดับแรก)', 'หน่วย: ชุด', hb(countBy(f, function (r) { return r.subUnit || '(ไม่ระบุ)'; }))),
          figure('ประเภทรถ (ช่อง Car1/Car2 ที่กรอก)', 'หน่วย: คัน', Object.keys(types).length ? hb(types) : el('div', { class: 'empty', text: 'ไม่มีข้อมูล' })), figure('สถานะ LPR', 'หน่วย: ชุด', hb(countBy(f, lOf)))]));
        bar.textContent = '';
        bar.appendChild(dateIn('ตั้งแต่', st.from, min, max, function (v) { if (v && v <= st.to) { st.from = v; st.page = 0; draw(); } }));
        bar.appendChild(dateIn('ถึง', st.to, min, max, function (v) { if (v && v >= st.from) { st.to = v; st.page = 0; draw(); } }));
        bar.appendChild(el('button', { type: 'button', class: 'btn-ghost', text: 'ทุกวัน', onclick: function () { st.from = min; st.to = max; st.page = 0; draw(); } }));
        bar.appendChild(selectOf('กลุ่มผู้ใช้', optsOf('ทุกกลุ่ม', go), go[st.group] ? st.group : 'all', function (v) { st.group = v; st.page = 0; draw(); }));
        bar.appendChild(selectOf('สถานะ LPR', optsOf('ทุกสถานะ LPR', lo), lo[st.lpr] ? st.lpr : 'all', function (v) { st.lpr = v; st.page = 0; draw(); }));
        var q = el('input', { type: 'search', placeholder: 'ค้นหาเลขอ้างอิง คณะ หน่วยย่อย ประเภทรถ…', 'aria-label': 'ค้นหาแบบสำรวจ', value: st.q }), tm = null;
        q.oninput = function () { clearTimeout(tm); tm = setTimeout(function () { st.q = q.value.trim().toLowerCase(); st.page = 0; draw(); var n2 = bar.querySelector('input[type=search]'); if (n2) { n2.focus(); n2.setSelectionRange(n2.value.length, n2.value.length); } }, 250); };
        bar.appendChild(q);
        var per = 20, pages = Math.max(1, Math.ceil(f.length / per)); if (st.page >= pages) st.page = pages - 1;
        body.textContent = ''; body.appendChild(el('p', { class: 'lu-count', role: 'status', text: num(f.length) + ' ชุด · เรียงจากล่าสุด' }));
        if (f.length) body.appendChild(table(['วันเวลา', 'เลขอ้างอิง', 'กลุ่ม / ประเภทย่อย', 'คณะ / หน่วยย่อย', 'รถ', 'LPR'], f.slice(st.page * per, st.page * per + per).map(function (r) {
          return [fdate(r.at), r.ref, [r.group, r.subType].filter(Boolean).join(' · '), [r.faculty, r.subUnit].filter(Boolean).join(' · ') || '–', (r.carCount == null ? '?' : r.carCount) + ' คัน' + (r.carTypes.length ? ' (' + r.carTypes.join(', ') + ')' : ''), lOf(r)]; }), {}));
        else body.appendChild(el('div', { class: 'empty', text: 'ไม่พบรายการที่ตรงกับเงื่อนไข' }));
        var pg = pager(st, pages, draw, host); if (pg) body.appendChild(pg);
      }
      host.appendChild(kp); host.appendChild(bar); host.appendChild(charts); host.appendChild(body);
      host.appendChild(el('p', { class: 'src', text: 'นิยาม: 1 Ref_Code = 1 แบบสำรวจที่ส่ง (ซ้ำนับครั้งเดียว) · จำนวนรถ = Car_Count แยกจากจำนวนแบบสำรวจ · ไม่มีตัวหารที่พิสูจน์ได้ จึงไม่แสดงอัตราตอบกลับ/ความครอบคลุม · ไม่แสดงชื่อ เบอร์ อีเมล ทะเบียนรถ หรือ Token' }));
      host.appendChild(readNote(d, 'RuenThai_Survey')); draw(); return host;
    })]);
  }
  wrapPage('parking', function (v) { var after = v.querySelector('section[aria-label="แบบสำรวจลานจอดรถเรือนไทย"]'); v.insertBefore(ruenthaiLiveSection(), after ? after.nextSibling : null); });
  wrapPage('vehicle', function (v) { var s2 = studentMotoSection(), last = v.lastElementChild; if (s2) v.insertBefore(s2, last); });


  /* รอบ 13: เวลาอ่านต้นทางจริงรายแหล่ง (sourceReadAt) ≠ เวลาที่บริการตอบคำขอ (checkedAt) ≠ วันที่ของรายการล่าสุด
   * ถ้าแหล่งอ่านต่างเวลากัน แสดงเป็นช่วงและบอกว่าต่างเวลา (ไม่ยุบเป็นเวลาเดียว) */
  var LIVE_CORE_PARTS = ['incidents', 'lostfound', 'lostfoundYear', 'gate'];
  /* รอบ 14: สถานะความสดของแหล่งเดียว (ใช้ใต้ KPI) — สด / ผลสำเร็จล่าสุด / ไฟล์สรุปที่ยังยืนยันยอดปัจจุบันไม่ได้ · อัปเดตเฉพาะจุดตามรอบอ่าน */
  function srcStateTxt(k) {
    var r = live.readAt[k], st = live.stale[k], e = live.errors && (live.errors[k] || live.errors.all), snap = live.snapInc && k === 'incidents' ? live.snapInc.updated : (mod(k) || {}).updated;
    if (!AUTH.on || !AUTH.user) return 'สถิติรวมจากไฟล์สรุป (ข้อมูลถึง ' + dLabel(snap) + ')';
    if (r) return 'ข้อมูลสด · อ่านจากต้นทางเมื่อ ' + dLabel(r);
    if (st) return 'ใช้ข้อมูลที่อ่านสำเร็จล่าสุดเมื่อ ' + dLabel(st.at) + ' · รอบล่าสุดอ่านไม่สำเร็จ (' + srcWhy(st.error) + ') — ระบบจะลองใหม่อัตโนมัติ';
    if (e && live.lastOk[k]) return 'ใช้ข้อมูลที่อ่านสำเร็จล่าสุดเมื่อ ' + dLabel(live.lastOk[k]) + ' · รอบล่าสุดอัปเดตไม่สำเร็จ (' + srcWhy(e) + ') — ระบบจะลองใหม่อัตโนมัติ';      /* รอบ 14.1: ข้อมูลที่แสดงอยู่มาจากรอบก่อน ไม่ใช่ไฟล์สรุป */
    if (e) return 'แสดงไฟล์สรุป (ข้อมูลถึง ' + dLabel(snap) + ') — ยังยืนยันยอดปัจจุบันไม่ได้ (' + srcWhy(e) + ')';
    return 'ไฟล์สรุป (ข้อมูลถึง ' + dLabel(snap) + ') · กำลังอ่านข้อมูลสด…';
  }
  function srcStateNode(k) {
    var p = el('p', { class: 'src-state', role: 'status', text: srcStateTxt(k) }); p.classList.add('live-ts'); p.__ts = function () { return srcStateTxt(k); };
    var b = el('button', { type: 'button', class: 'btn-ghost src-retry', text: 'ลองอ่านใหม่', onclick: function () { liveRetryNow(b); } });
    var w = el('div', { class: 'src-state-wrap' }, [p, b]); b.hidden = !(live.errors && (live.errors[k] || live.errors.all)); return w;
  }
  /* รอบ 14.1: ข้อความเวลาอธิบาย “ข้อมูลที่กำลังแสดงจริง” — อ่านสดรอบนี้ / ใช้ผลที่อ่านสำเร็จล่าสุด (รอบล่าสุดไม่สำเร็จ) / ไฟล์สรุป
   * เดิมดูเฉพาะ readAt → แหล่งที่รอบล่าสุดล้มหายไปจากข้อความ แล้วหัวเว็บย้อนไปใช้วันที่ไฟล์สรุปทั้งที่การ์ดยังแสดงค่ารอบก่อน */
  function liveShownAt(k) { return (live.readAt && live.readAt[k]) || (live.stale[k] && live.stale[k].at > (live.lastOk[k] || '') ? live.stale[k].at : live.lastOk[k]) || ''; }
  function liveReadText() {
    var fresh = [], old = [], none = [];
    LIVE_CORE_PARTS.forEach(function (k) { if (live.readAt && live.readAt[k]) fresh.push(live.readAt[k]); else if (liveShownAt(k)) old.push(liveShownAt(k)); else if (live.errors && live.errors[k]) none.push(k); });
    if (!fresh.length && !old.length) return '';
    if (old.length || none.length) { var all = fresh.concat(old).sort();
      return 'ใช้ข้อมูลที่อ่านสำเร็จล่าสุดเมื่อ ' + (all[0] === all[all.length - 1] ? dLabel(all[0]) : dLabel(all[0]) + ' – ' + dLabel(all[all.length - 1])) + ' · รอบล่าสุดอัปเดตไม่สำเร็จ ' + (old.length + none.length) + ' รายการ'; }
    fresh.sort();
    return fresh[0] === fresh[fresh.length - 1] ? 'ข้อมูลสดอ่านจากต้นทางเมื่อ ' + dLabel(fresh[0]) : 'ข้อมูลสดอ่านจากต้นทาง ' + dLabel(fresh[0]) + ' – ' + dLabel(fresh[fresh.length - 1]) + ' (แต่ละแหล่งอ่านต่างเวลา)';
  }
  function liveReadTitle() {
    var N = { incidents: 'เหตุการณ์', lostfound: 'L&F รายวัน', lostfoundYear: 'L&F รายปี/สถานะ', gate: 'รถเข้า', studentMoto: 'นักศึกษา–จยย.', ruenthai: 'เรือนไทย' };
    return 'เวลาอ่านต้นทาง: ' + Object.keys(N).filter(function (k) { return live.readAt && live.readAt[k]; }).map(function (k) { return N[k] + ' ' + live.readAt[k].slice(11, 16) + ' น.'; }).join(' · ') + (live.at ? ' · บริการตอบคำขอล่าสุด ' + dLabel(live.at) : '');
  }
  function dashChkText() {
    var gen = (DATA.extra || {}).generatedAt || DATA.stats.generatedAt || '', rt = AUTH.on && AUTH.user ? liveReadText() : '';
    return rt ? rt + ' · หมวดอื่นจากไฟล์สรุป ' + stampTxt(gen) : 'ตรวจข้อมูลล่าสุด ' + stampTxt(gen);
  }
  /* รอบ 13 ต่อ: ป้ายเวลาในเนื้อหาที่มาจากข้อมูลสด ลงทะเบียนตัวสร้างข้อความ/ส่วนย่อยไว้ → อ่านใหม่แล้วอัปเดตเฉพาะจุด (ไม่วาดทั้งหน้า)
   * ตัวสร้างอ่านจาก DATA ปัจจุบัน — แหล่งที่อ่านไม่สำเร็จไม่ถูกแทนค่าใน DATA จึงคงเวลาเดิม (ไม่ดูเหมือนสด) */
  function liveText(root, sel, fn) { var n = root.querySelector ? root.querySelector(sel) : null; if (n) { n.classList.add('live-ts'); n.__ts = fn; } return root; }
  function liveBlock(node, build, data) { node.classList.add('live-blk'); node.__blk = build; node.__key = blkKey(data); return node; }
  function blkKey(d) { try { return JSON.stringify(d); } catch (e) { return String(Math.random()); } }
  function liveStampsUpdate() {                  /* อัปเดตป้ายเวลาโดยไม่วาดหน้าใหม่ (เวลาอ่านเปลี่ยนแต่ข้อมูลไม่เปลี่ยน) */
    renderStamp(); var c = document.querySelector('.dash-chk'); if (c) { c.textContent = dashChkText(); c.title = liveReadTitle(); }
    [].forEach.call(document.querySelectorAll('#view .live-ts'), function (n) { var t = n.__ts && n.__ts(); if (t != null && n.textContent !== t) n.textContent = t; });
    [].forEach.call(document.querySelectorAll('#view .src-retry'), function (b) { b.hidden = !live.errors; });
    [].forEach.call(document.querySelectorAll('#view .live-blk'), function (n) {
      if (n.contains(document.activeElement) && isTyping()) return;
      var data = n.__blk(), k = blkKey(data); if (k === n.__key) return;
      var fs = [].slice.call(n.querySelectorAll('a,button')), fi = fs.indexOf(document.activeElement);
      n.textContent = ''; data.map(nowCard).forEach(function (x) { n.appendChild(x); }); n.__key = k;
      if (fi >= 0) { var nf = n.querySelectorAll('a,button')[fi]; if (nf) nf.focus({ preventScroll: true }); }
    });
  }
  function renderStamp() {
    var g = DATA.stats.generatedAt || '', g2 = (DATA.extra || {}).generatedAt || '', s = $('stamp'); if (g2 > g) g = g2; s.textContent = '';   /* เวลาที่ตรวจแหล่งข้อมูลครั้งล่าสุด (แต่ละเรื่องมีวันที่ของตัวเองกำกับในหน้า) */
    var rt = AUTH.on && AUTH.user ? liveReadText() : '';
    if (rt) {        /* แยกความหมาย: เวลาที่อ่านข้อมูลสดสำเร็จ (เหตุการณ์/L&F/รถเข้า) ≠ เวลาสร้างไฟล์สรุปของหมวดอื่น */
      s.appendChild(el('b', { text: rt })); s.appendChild(el('br'));
      s.appendChild(document.createTextNode('เหตุการณ์ · L&F · รถเข้า' + (live.aw && live.aw.readAt && !live.aw.err ? ' · Anywheel (เวลาอ่านแสดงในส่วน Anywheel)' : '') + ' · หมวดอื่นจากไฟล์สรุป ' + dShort(g.slice(0, 10)) + ' ' + g.slice(11, 16) + ' น.'));
      s.title = liveReadTitle() + ' · ข้อมูลสด: ' + (live.ok || []).join(', ') + ' · ไฟล์สรุป (snapshot) สร้างเมื่อ ' + dLabel(g.slice(0, 10) + ' ' + g.slice(11, 16)) + ' · วันที่ข้อมูลล่าสุดของแต่ละเรื่องดูที่ป้ายบนการ์ด';
      return;
    }
    s.appendChild(el('b', { text: 'ตรวจข้อมูลล่าสุด ' + dLabel(g.slice(0, 10) + ' ' + g.slice(11, 16)) })); s.appendChild(el('br'));
    s.appendChild(document.createTextNode(liveMode ? 'อ่านสดจาก Stats API (ยอดรวม)' : 'ไฟล์สถิติรวม · เวลาไทย'));
  }
  function collectMonths() {
    var set = {}; ['incidents', 'gate', 'lostfound', 'cctv'].forEach(function (k) { ((mod(k) || {}).monthly || []).forEach(function (r) { set[r.month] = 1; }); });
    MONTHS = Object.keys(set).sort(); state.from = MONTHS[0]; state.to = MONTHS[MONTHS.length - 1];
  }
  setupShell();
  load().then(function (d) {
    DATA = d; DATA.systems.categories.forEach(function (c) { c.systems.forEach(function (s) { SYS[s.id] = s; }); });
    collectMonths(); renderStamp(); authStart(function () { setupChat(); route(true); });
    window.addEventListener('hashchange', function () { route(false); });
    window.__hub = { rerender: function () { route(true); }, obs: function () { return liveObs.length; }, renders: function () { return routeN; }, live: function () { liveRefresh(); }, bars: bars };      /* ใช้ตรวจการทำงาน (วาดซ้ำ/จำนวนตัวสังเกตที่ยังผูกอยู่) — ไม่มีข้อมูล */
  }).catch(function (e) {
    $('stamp').textContent = 'โหลดข้อมูลไม่สำเร็จ';
    showBanner('ยังเชื่อมต่อไฟล์สถิติรวมไม่ได้: ' + e.message + ' — หน้านี้จะไม่แสดงตัวเลขใด ๆ จนกว่าจะโหลดข้อมูลจริงได้');
  });
})();
