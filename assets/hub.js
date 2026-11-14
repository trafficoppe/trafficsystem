/* hub.js — ระบบงานจราจรและความปลอดภัย มหาวิทยาลัยมหิดล (หน้ารวม รุ่นทดลอง)
 * โครงสร้าง: Sidebar + พื้นที่เนื้อหากลาง เปลี่ยนหน้าด้วย #hash (ปุ่มย้อนกลับของเบราว์เซอร์ใช้ได้)
 * อ่านเฉพาะ "สถิติรวม" (data/stats.json หรือ Stats API) และบัญชีระบบ (data/systems.json)
 * ไม่อ่าน Google Sheet ดิบ ไม่มีชื่อบุคคล/เบอร์โทร/ทะเบียนรถ/ข้อความอิสระ และไม่เขียนข้อมูลกลับไปยังระบบใด */
(function () {
  'use strict';
  var CFG = window.HUB_CONFIG || {};
  var TH_M = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  var TH_MF = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  var STATUS = { connected: 'เชื่อมต่อสถิติแล้ว', warn: 'เชื่อมต่อแล้ว · มีข้อสังเกต', partial: 'เชื่อมต่อได้บางส่วน', blocked: 'ยังเชื่อมต่อไม่ได้', unverified: 'ไม่มีข้อมูลยืนยัน', link: 'ลิงก์ระบบ (ไม่มีสถิติ)', legacy: 'เลิกใช้เป็นหน้าหลัก' };
  var C = { c1: '#1d4f91', c2: '#d9822b', c3: '#2a9d8f', c4: '#8e6bbf', c5: '#7c8797', fine: '#b4432f' };
  var V = 'อุบัติเหตุจากยานพาหนะ', G = 'อุบัติเหตุทั่วไป', P = 'รับส่งผู้ป่วย';
  var state = { from: null, to: null, mapType: 'all', sel: -1, satSrc: 'central', satMonth: null };
  var DATA = null, MONTHS = [], liveMode = false, SYS = {};

  /* ---------- ไอคอน (เส้น 24×24 ชุดเดียวกันทั้งหน้า) ---------- */
  var ICON = {
    menu: 'M4 6h16M4 12h16M4 18h16', chev: 'M9 6l6 6-6 6', home: 'M3 11l9-7 9 7M5 10v10h5v-6h4v6h5V10',
    alert: 'M12 3l9.5 17H2.5L12 3zM12 10v4M12 17.5v.01', camera: 'M4 7h3l2-2h6l2 2h3v12H4zM12 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
    car: 'M5 16l1.5-6h11L19 16M3 16h18v3H3zM7 19v1.5M17 19v1.5M7 13h.01M17 13h.01', cap: 'M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5M22 9v6',
    shield: 'M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z', box: 'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10',
    search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4', heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10zM8 11h2l1-2 2 4 1-2h2',
    file: 'M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6', grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z', map: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14',
    users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21c0-4 3-6 7-6s7 2 7 6M17 7a3 3 0 0 1 0 6M22 21c0-3-2-5-5-5.5', star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
    coin: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9 9.5c0-1 1.3-1.8 3-1.8s3 .8 3 1.8-1.3 1.6-3 1.8-3 .8-3 1.9 1.3 1.8 3 1.8 3-.8 3-1.8M12 6v1.7M12 16.3V18',
    scan: 'M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M7 12h10', calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4', helmet: 'M4 15a8 8 0 0 1 16 0v2H4zM12 7v8M3 17h18',
    ext: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6', back: 'M15 6l-6 6 6 6', collapse: 'M15 6l-6 6 6 6M20 4v16'
  };
  function ic(name, size) {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', 'ic'); s.setAttribute('aria-hidden', 'true');
    if (size) { s.style.width = size + 'px'; s.style.height = size + 'px'; }
    var p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', ICON[name] || ''); s.appendChild(p); return s;
  }

  /* ---------- เมนู ---------- */
  var NAV = [
    { id: 'dashboard', label: 'หน้าหลัก / Dashboard', icon: 'home' },
    { group: 'g-traffic', label: 'งานจราจรและแจ้งเหตุ', icon: 'alert', children: [
      { id: 'traffic', label: 'สถิติแจ้งเหตุและอุบัติเหตุ' }, { id: 'accident-map', label: 'แผนที่จุดเกิดอุบัติเหตุ' }, { id: 'gate', label: 'รถเข้าและหมวกนิรภัย' }] },
    { id: 'cctv', label: 'กล้องวงจรปิด (CCTV)', icon: 'camera' },
    { id: 'vehicle', label: 'ยานพาหนะและลานจอดรถ', icon: 'car' },
    { id: 'graduation', label: 'งานปริญญา', icon: 'cap' },
    { group: 'g-guard', label: 'งาน รปภ.', icon: 'shield', children: [
      { id: 'guard-satisfaction', label: 'แบบประเมินความพึงพอใจ' }, { id: 'guard-fines', label: 'สรุปค่าปรับ/การตรวจรับ' }, { id: 'guard-scan', label: 'รายงานการปฏิบัติงานและการสแกนจุด' }] },
    { id: 'borrow', label: 'ยืม-คืนอุปกรณ์และรถกอล์ฟ', icon: 'box' },
    { id: 'lostfound', label: 'ของหาย / เก็บของได้', icon: 'search' },
    { id: 'safety', label: 'ความปลอดภัย: AED และถังดับเพลิง', icon: 'heart' },
    { id: 'reports', label: 'รายงานและเอกสาร PDF', icon: 'file' },
    { id: 'systems', label: 'ระบบทั้งหมด', icon: 'grid' }
  ];
  var PAGE_TITLE = {}; NAV.forEach(function (n) { if (n.id) PAGE_TITLE[n.id] = n.label; (n.children || []).forEach(function (c) { PAGE_TITLE[c.id] = c.label; c.parent = n; }); });
  PAGE_TITLE['guard-satisfaction'] = 'Dashboard ตรวจรับงาน รปภ. — ความพึงพอใจ';

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
      : Promise.all([getJson('data/stats.json'), getJson('data/systems.json')]).then(function (a) { return { stats: a[0], systems: a[1] }; });
    return base.then(function (d) {
      if (!CFG.statsApiUrl) return d;
      return getJson(CFG.statsApiUrl).then(function (live) {
        if (live && live.modules) { Object.keys(live.modules).forEach(function (k) { d.stats.modules[k] = live.modules[k]; }); d.stats.generatedAt = live.generatedAt || d.stats.generatedAt; liveMode = true; }
        return d;
      }).catch(function (e) { showBanner('เชื่อมต่อ Stats API ไม่ได้ (' + e.message + ') — แสดงข้อมูลจากไฟล์สถิติรวมล่าสุดแทน'); return d; });
    });
  }
  function showBanner(t) { var b = $('banner'); b.textContent = t; b.hidden = false; }

  /* ---------- โครงหน้า: Sidebar ---------- */
  var openGroups = {};
  function buildNav() {
    var nav = $('nav'), ul = el('ul'); nav.textContent = '';
    NAV.forEach(function (n) {
      if (!n.children) { ul.appendChild(el('li', {}, [navLink(n.id, n.label, n.icon)])); return; }
      var subId = 'sub-' + n.group, open = !!openGroups[n.group];
      var btn = el('button', { type: 'button', class: 'nav-g', 'aria-expanded': String(open), 'aria-controls': subId, 'data-group': n.group, title: n.label,
        onclick: function () {
          if ($('app').classList.contains('mini') && window.innerWidth > 980) { location.hash = '#' + n.children[0].id; return; }
          openGroups[n.group] = !openGroups[n.group]; buildNav(); markActive();
        } }, [ic(n.icon), el('span', { class: 'nav-lbl', text: n.label }), ic('chev')]);
      var sub = el('ul', { class: 'sub', id: subId, hidden: open ? null : 'hidden' });
      n.children.forEach(function (c) { sub.appendChild(el('li', {}, [navLink(c.id, c.label)])); });
      ul.appendChild(el('li', {}, [btn, sub]));
    });
    nav.appendChild(ul);
  }
  function navLink(id, label, icon) {
    return el('a', { class: 'nav-a', href: '#' + id, 'data-page': id, title: label, onclick: closeMobileNav }, [icon ? ic(icon) : null, el('span', { class: 'nav-lbl', text: label })]);
  }
  function markActive() {
    var page = currentPage();
    Array.prototype.forEach.call(document.querySelectorAll('.nav-a'), function (a) { if (a.getAttribute('data-page') === page) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    Array.prototype.forEach.call(document.querySelectorAll('.nav-g'), function (b) {
      var g = NAV.filter(function (n) { return n.group === b.getAttribute('data-group'); })[0];
      b.classList.toggle('has-active', g.children.some(function (c) { return c.id === page; }));
    });
  }
  function setupShell() {
    var app = $('app'), tg = $('navToggle'), scrim = $('scrim');
    tg.appendChild(ic('menu', 22));
    if (store('hub.mini') === '1') app.classList.add('mini');
    tg.onclick = function () {
      if (window.innerWidth <= 980) { var o = !app.classList.contains('open'); app.classList.toggle('open', o); scrim.hidden = !o; tg.setAttribute('aria-expanded', String(o)); }
      else { var m = !app.classList.contains('mini'); app.classList.toggle('mini', m); store('hub.mini', m ? '1' : '0'); tg.setAttribute('aria-expanded', String(!m)); }
    };
    scrim.onclick = closeMobileNav;
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMobileNav(); });
    tg.setAttribute('aria-expanded', String(window.innerWidth > 980 && !app.classList.contains('mini')));
  }
  function closeMobileNav() { var app = $('app'); if (app.classList.contains('open')) { app.classList.remove('open'); $('scrim').hidden = true; $('navToggle').setAttribute('aria-expanded', 'false'); } }

  /* ---------- router ---------- */
  var PAGES = {};
  function currentPage() { var h = (location.hash || '').replace('#', ''); return PAGES[h] ? h : 'dashboard'; }
  function route(first) {
    var page = currentPage();
    NAV.forEach(function (n) { if (n.children && n.children.some(function (c) { return c.id === page; })) openGroups[n.group] = true; });
    buildNav(); markActive();
    $('crumb').textContent = PAGE_TITLE[page] || '';
    document.title = (page === 'dashboard' ? '' : (PAGE_TITLE[page] + ' · ')) + 'ระบบงานจราจรและความปลอดภัย มหาวิทยาลัยมหิดล';
    var view = $('view'); view.textContent = '';
    try { PAGES[page](view); } catch (e) { view.appendChild(el('div', { class: 'card box' }, [el('strong', { text: 'แสดงหน้านี้ไม่สำเร็จ' }), el('p', { text: String(e && e.message || e) })])); if (window.console) console.error(e); }
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

  /* ---------- กราฟ (SVG ในหน้า ไม่ใช้ไลบรารีภายนอก) ---------- */
  function niceTop(max, int) { max = Math.max(max, 1); var st = Math.pow(10, Math.floor(Math.log10(max))); if (max / st < 2) st /= 5; else if (max / st < 5) st /= 2; if (int && st < 1) st = 1; return { top: Math.ceil(max / st) * st, step: st }; }
  function fmtTick(v) { return v >= 1000 ? (v / 1000) + 'k' : String(Math.round(v * 100) / 100); }
  function bars(cols, series, opt) {
    opt = opt || {}; var box = el('div');
    if (!cols.length) { box.appendChild(el('div', { class: 'empty', text: 'ไม่มีข้อมูลในช่วงที่เลือก' })); return box; }
    var W = opt.w || 560, H = opt.h || 240, L = 44, R = opt.line2 ? 34 : 10, T = 18, B = 30, pw = W - L - R, ph = H - T - B;
    var totals = cols.map(function (_, i) { return series.reduce(function (a, s) { return a + (s.values[i] || 0); }, 0); });
    var sc = niceTop(Math.max.apply(null, totals.concat(opt.line ? opt.line.values : [0])), opt.int), top = sc.top;
    var root = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': opt.aria || 'แผนภูมิแท่ง' });
    for (var v = 0; v <= top + 1e-9; v += sc.step) {
      var y = T + ph - ph * v / top;
      root.appendChild(svg('line', { x1: L, x2: W - R, y1: y, y2: y, stroke: '#e6eaf0' }));
      root.appendChild(svg('text', { x: L - 6, y: y + 4, 'text-anchor': 'end', 'font-size': 10, fill: '#5d6879', text: fmtTick(v) }));
    }
    var bw = pw / cols.length, w = Math.min(46, bw * 0.66), every = Math.ceil(cols.length / 12);
    cols.forEach(function (c, i) {
      var x = L + bw * i + (bw - w) / 2, acc = 0;
      series.forEach(function (s) {
        var val = s.values[i] || 0; if (!val) return;
        var yy = T + ph - ph * (acc + val) / top, r = svg('rect', { x: x, y: yy, width: w, height: Math.max(ph * val / top - 1, 0.5), rx: 3, fill: s.color });
        r.appendChild(svg('title', { text: c.full + ' · ' + s.name + ': ' + num(val) })); root.appendChild(r); acc += val;
      });
      if (cols.length <= 14 && totals[i]) root.appendChild(svg('text', { x: x + w / 2, y: opt.line2 ? T + ph - 5 : T + ph - ph * totals[i] / top - 4, 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 600, fill: '#152033', text: totals[i] >= 10000 ? (totals[i] / 1000).toFixed(0) + 'k' : num(totals[i]) }));
      if (i % every === 0) root.appendChild(svg('text', { x: x + w / 2, y: H - 10, 'text-anchor': 'middle', 'font-size': 10, fill: '#5d6879', text: c.label }));
    });
    if (opt.line) root.appendChild(svg('polyline', { points: opt.line.values.map(function (val, i) { return (L + bw * i + bw / 2) + ',' + (T + ph - ph * val / top); }).join(' '), fill: 'none', stroke: opt.line.color, 'stroke-width': 2 }));
    if (opt.line2) { // เส้นแกนขวา (คะแนน 0–5)
      var top2 = opt.line2.max, pts = [];
      [0, 1, 2, 3, 4, 5].forEach(function (t) { if (t <= top2) root.appendChild(svg('text', { x: W - R + 6, y: T + ph - ph * t / top2 + 4, 'font-size': 10, fill: opt.line2.color, text: String(t) })); });
      opt.line2.values.forEach(function (val, i) { if (val == null) return; var cx = L + bw * i + bw / 2, cy = T + ph - ph * val / top2; pts.push(cx + ',' + cy);
        root.appendChild(svg('circle', { cx: cx, cy: cy, r: 4.5, fill: opt.line2.color, stroke: '#fff', 'stroke-width': 1.5 }));
        root.appendChild(svg('text', { x: cx, y: cy - 9, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: opt.line2.color, text: val.toFixed(2) })); });
      if (pts.length > 1) root.insertBefore(svg('polyline', { points: pts.join(' '), fill: 'none', stroke: opt.line2.color, 'stroke-width': 2 }), root.firstChild.nextSibling);
    }
    box.appendChild(root);
    var lg = el('div', { class: 'legend' });
    series.concat(opt.line ? [opt.line] : []).concat(opt.line2 ? [opt.line2] : []).forEach(function (s) { lg.appendChild(el('span', {}, [el('i', { style: 'background:' + s.color }), s.name])); });
    box.appendChild(lg);
    return box;
  }
  /** แท่งแนวนอน — items: [{label, value, note, color}] ; max = ค่าสูงสุดของแกน */
  function hbars(items, max, opt) {
    opt = opt || {}; var box = el('div');
    if (!items.length) { box.appendChild(el('div', { class: 'empty', text: 'ไม่มีข้อมูล' })); return box; }
    var W = 560, rowH = 38, L = opt.labelW || 170, R = 96, T = 6, H = T + rowH * items.length + 18, pw = W - L - R;
    var root = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': opt.aria || 'แผนภูมิแท่งแนวนอน' });
    if (!opt.ticks) { var nt = niceTop(max, true); max = nt.top; } var ticks = opt.ticks || (function () { var a = []; for (var t0 = 0; t0 <= max + 1e-9; t0 += nt.step) a.push(t0); return a.length > 7 ? a.filter(function (_, i) { return i % 2 === 0; }) : a; })();
    ticks.forEach(function (t) { var x = L + pw * t / max; root.appendChild(svg('line', { x1: x, x2: x, y1: T, y2: H - 18, stroke: '#e6eaf0' })); root.appendChild(svg('text', { x: x, y: H - 4, 'text-anchor': 'middle', 'font-size': 10, fill: '#5d6879', text: fmtTick(t) })); });
    items.forEach(function (it, i) {
      var y = T + rowH * i, has = it.value != null;
      root.appendChild(svg('text', { x: L - 8, y: y + rowH / 2 + 4, 'text-anchor': 'end', 'font-size': 12, fill: '#152033', text: it.label }));
      if (has) {
        var r = svg('rect', { x: L, y: y + 9, width: Math.max(pw * it.value / max, 1), height: rowH - 18, rx: 4, fill: it.color || C.c1 });
        r.appendChild(svg('title', { text: it.label + ': ' + (opt.dec != null ? it.value.toFixed(opt.dec) : num(it.value)) + (it.note ? ' (' + it.note + ')' : '') })); root.appendChild(r);
      }
      root.appendChild(svg('text', { x: has ? L + pw * it.value / max + 6 : L + 4, y: y + rowH / 2 + 1, 'font-size': 12, 'font-weight': 700, fill: has ? '#152033' : '#a3271f', text: has ? (opt.dec != null ? it.value.toFixed(opt.dec) : num(it.value)) : 'ไม่มีคำถามด้านนี้' }));
      if (it.note) root.appendChild(svg('text', { x: has ? L + pw * it.value / max + 6 : L + 4, y: y + rowH / 2 + 13, 'font-size': 10, fill: '#5d6879', text: it.note }));
    });
    box.appendChild(root); return box;
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
    if (st.length) kids.push(el('div', { class: 'kpis', style: 'grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:6px' }, st.map(function (x) {
      return el('div', { style: 'background:#f6f8fb;border:1px solid var(--line);border-radius:10px;padding:6px 10px' }, [el('b', { style: 'display:block;font-size:1.1rem;color:var(--navy);font-variant-numeric:tabular-nums', text: x[0] == null ? 'ไม่มีข้อมูลยืนยัน' : (typeof x[0] === 'number' ? num(x[0]) : x[0]) }), el('span', { style: 'font-size:.76rem;color:var(--muted)', text: x[1] })]); })));
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
   * หน้า Dashboard ภาพรวม
   * ==================================================================== */
  function latestMonthOf(list) { return list && list.length ? list[list.length - 1] : null; }
  PAGES.dashboard = function (v) {
    var rt = rangeText(), inc = mod('incidents'), gate = mod('gate'), lf = mod('lostfound'), cctv = mod('cctv'), gr = mod('graduationParking'), vr = mod('vehicleRegistration'),
      gs = mod('guardScan'), sat = mod('guardSatisfaction'), fines = mod('guardFines'), fire = mod('fire');
    v.appendChild(pageHead('ภาพรวมงานจราจรและความปลอดภัย', 'ตัวเลขสำคัญจากระบบที่ยืนยันแหล่งข้อมูลได้ · กดการ์ดหรือเมนูด้านซ้ายเพื่อดูรายละเอียด', rangeCtrl()));

    var k1 = [];
    if (inc) {
      var t = function (n) { return sumMonthly(inc.monthly, function (r) { return r.byType[n]; }); }, total = sumMonthly(inc.monthly, function (r) { return sumObj(r.byType); });
      k1.push({ icon: 'alert', label: 'เหตุการณ์ที่บันทึก', value: num(total), unit: 'เหตุ', sub: 'อุบัติเหตุยานพาหนะ ' + num(t(V)) + ' · ทั่วไป ' + num(t(G)) + ' · รับส่งผู้ป่วย ' + num(t(P)), updated: inc.updated, more: 'traffic' });
      var bi = {}; inc.byType.forEach(function (r) { bi[r.type] = r.injuredOrIll; });
      k1.push({ icon: 'users', label: 'ผู้บาดเจ็บ / ผู้ป่วย', value: num(inc.injuredTotal), unit: 'คน', sub: 'ยานพาหนะ ' + num(bi[V]) + ' · ทั่วไป ' + num(bi[G]) + ' · รับส่งผู้ป่วย ' + num(bi[P]), scope: 'ทั้งช่วงข้อมูล', updated: inc.updated, color: C.c2, more: 'traffic' });
    }
    if (gate) {
      var cars = sumMonthly(gate.monthly, function (r) { return r.cars; }), mo = sumMonthly(gate.monthly, function (r) { return r.motorcycles; }), nh = sumMonthly(gate.monthly, function (r) { return r.noHelmet; }), days = sumMonthly(gate.monthly, function (r) { return r.days; });
      if (days) {
        k1.push({ icon: 'car', label: 'รถเข้ามหาวิทยาลัย (5 ประตู)', value: num(cars + mo), unit: 'คัน', sub: 'รถยนต์ ' + num(cars) + ' · รถจักรยานยนต์ ' + num(mo) + ' · ' + days + ' วันที่มีข้อมูล', updated: gate.updated, color: C.c3, more: 'gate' });
        k1.push({ icon: 'helmet', label: 'ผู้ไม่สวมหมวกนิรภัย', value: num(nh), unit: 'ราย', sub: 'เท่ากับ ' + (100 * nh / mo).toFixed(1) + '% ของจำนวนรถจักรยานยนต์ที่นับได้', tag: 'มีวันที่ค่าผิดสังเกต ควรตรวจการกรอก', updated: gate.updated, color: C.c2, more: 'gate' });
      } else k1.push({ icon: 'car', label: 'รถเข้ามหาวิทยาลัย / หมวกนิรภัย', na: 'ไม่มีข้อมูลในช่วงที่เลือก', scope: rt, color: C.c3, more: 'gate' });
    }
    v.appendChild(section('งานจราจรและแจ้งเหตุ', { note: 'ตามช่วงเดือนที่เลือก: ' + rt, more: 'traffic' }, [kpiGrid(k1)]));

    var k2 = [];
    if (lf) {
      var lt = function (n) { return sumMonthly(lf.monthly, function (r) { return r.byType[n]; }); };
      k2.push({ icon: 'search', label: 'ของหาย / เก็บของได้', value: num(lt('สิ่งของสูญหาย')), unit: 'แจ้งหาย', sub: 'เก็บของได้ ' + num(lt('พบสิ่งของ')) + ' · แบบฟอร์มรับของคืน ' + num(lt('รับของคืน')) + ' · สถานะรับคืนแล้วทั้งปี ' + num(lf.returned), updated: lf.updated, color: C.c4, more: 'lostfound' });
    }
    if (cctv) k2.push({ icon: 'camera', label: 'คำขอดูกล้องวงจรปิด', value: num(sumMonthly(cctv.monthly, function (r) { return r.count; })), unit: 'คำขอ', sub: 'ทั้งหมด ' + cctv.total + ' · ปิดเคส ' + cctv.byStatus['ปิดเคส'] + ' · พบภาพ ' + cctv.footage['พบภาพ'] + ' / ไม่พบ ' + cctv.footage['ไม่พบภาพ'], updated: cctv.updated, more: 'cctv' });
    if (gr) { var best = gr.days.slice().sort(function (a, b) { return b.latestCount - a.latestCount; })[0];
      k2.push({ icon: 'cap', label: 'รถในลานจอดช่วงงานปริญญา', value: num(best.latestCount), unit: 'คัน', sub: dLabel(best.date) + ' · ' + best.occupancyPercent + '% ของความจุ ' + num(gr.capacity) + ' คัน', scope: 'วันที่มากที่สุดจาก 3 วันงาน', updated: null, color: C.c3, more: 'graduation' }); }
    if (vr) { var tot = 0; Object.keys(vr.rows).forEach(function (n) { if (vr.rows[n] != null) tot += vr.rows[n]; });
      k2.push({ icon: 'car', label: 'รายการลงทะเบียนยานพาหนะ', value: num(tot), unit: 'รายการ', sub: 'บุคลากร ' + num(vr.rows['บุคลากร – รถยนต์'] + vr.rows['บุคลากร – รถจักรยานยนต์']) + ' · นักศึกษา (รถยนต์) ' + num(vr.rows['นักศึกษา – รถยนต์']), tag: 'ยังไม่รวมนักศึกษา–รถจักรยานยนต์', updated: vr.updated, color: C.c4, more: 'vehicle' }); }
    v.appendChild(section('บริการ ยานพาหนะ และลานจอด', {}, [kpiGrid(k2)]));

    var k3 = [];
    if (sat) {
      var lc = latestMonthOf(sat.central.monthly), lu = latestMonthOf(sat.unit.monthly);
      if (lc) k3.push({ icon: 'star', label: 'ความพึงพอใจ รปภ.ส่วนกลาง', value: lc.overall.toFixed(2), unit: '/ 5', sub: mFull(lc.month) + ' (เดือนล่าสุด) · ' + num(lc.responses) + ' คำตอบ', updated: sat.central.updated, color: C.c5, more: 'guard-satisfaction' });
      var uOct = sat.unit.monthly.slice().sort(function (a, b) { return b.respondents - a.respondents; })[0];
      if (lu) k3.push({ icon: 'star', label: 'ความพึงพอใจ รปภ.ส่วนงาน', value: uOct.overall.toFixed(2), unit: '/ 5', sub: mFull(uOct.month) + ' · ' + num(uOct.respondents) + ' ผู้ตอบ · ' + uOct.byArea.length + ' พื้นที่ (ถ่วงน้ำหนัก)', tag: lu.month !== uOct.month ? mLabel(lu.month) + ' มีเพียง ' + lu.respondents + ' ผู้ตอบ' : null, tagTone: 'warn', updated: sat.unit.updated, color: C.c5, more: 'guard-satisfaction' });
    }
    if (fines) { var fc = sumMonthly(fines.monthly, function (r) { return r.cases; });
      k3.push({ icon: 'coin', label: 'ค่าปรับ รปภ.', value: num(fc), unit: 'เคส', sub: num(fc * fines.amount.ratePerCase) + ' บาท (' + num(fines.amount.ratePerCase) + ' บาท/เคส ตามแบบรายงานเดิม)', tag: 'อัตรารอยืนยัน', updated: fines.updated, color: C.fine, more: 'guard-fines' }); }
    if (gs) k3.push({ icon: 'scan', label: 'สแกนจุดตรวจ รปภ.เอกชน', value: num(gs.scans), unit: 'ครั้ง', sub: 'ไม่ปกติ ' + gs.byStatus['ไม่ปกติ'] + ' ครั้ง · ' + gs.scanPoints + ' จุด · ' + dLabel(gs.range.from).replace(/ 2569$/, '') + '–' + dLabel(gs.range.to).replace(/ 2569$/, ''), updated: gs.updated, color: C.c5, more: 'guard-scan' });
    if (fire) k3.push({ icon: 'heart', label: 'ถังดับเพลิง', value: num(fire.extinguishers), unit: 'ถัง', sub: 'ตรวจแล้ว ' + fire.extinguishersInspected + ' ถัง · ผลชำรุด ' + fire.inspectionResult['ชำรุด'] + ' จาก ' + fire.inspections + ' ครั้ง', updated: fire.updated, color: C.c2, more: 'safety' });
    v.appendChild(section('งาน รปภ. และความปลอดภัย', { more: 'guard-satisfaction' }, [kpiGrid(k3)]));

    var ch = el('div', { class: 'grid2' });
    if (inc) ch.appendChild(figure('เหตุการณ์รายเดือน แยกประเภท', 'ที่มา: รายงานเหตุการณ์ · อัปเดต ' + dLabel(inc.updated), incidentChart()));
    if (gate) ch.appendChild(figure('รถเข้าและผู้ไม่สวมหมวกนิรภัย รายเดือน', 'ผลรวม 5 ประตู · ไม่รวมข้อมูลทดสอบ 16–17 ก.ย.', gateMonthChart()));
    if (lf) ch.appendChild(figure('ของหาย / เก็บของได้ / รับของคืน', 'ที่มา: แจ้งของหาย (รายการ พ.ศ. 2569)', lfChart()));
    if (sat) ch.appendChild(figure('ความพึงพอใจ รปภ.ส่วนกลาง รายเดือน', 'แท่ง = จำนวนคำตอบ · จุด = คะแนนเฉลี่ยรวม (แกนขวา 0–5)', satTrend('central')));
    v.appendChild(section('แนวโน้ม', { note: 'ตามช่วงเดือนที่เลือก (ยกเว้นกราฟความพึงพอใจ)' }, [ch]));

    var cnt = {}; DATA.systems.categories.forEach(function (c) { c.systems.forEach(function (s) { cnt[s.status] = (cnt[s.status] || 0) + 1; }); });
    v.appendChild(section('สถานะการเชื่อมต่อข้อมูล', { more: 'systems' }, [el('div', { class: 'card status-strip' }, Object.keys(STATUS).filter(function (k) { return cnt[k]; }).map(function (k) {
      return el('span', {}, [el('span', { class: 'pill s-' + k, text: STATUS[k] }), ' ', el('b', { text: cnt[k] }), ' ระบบ']); }))]));
  };
  function incidentChart() {
    var inc = mod('incidents'), rows = inc.monthly.filter(function (r) { return inRange(r.month); });
    var other = function (r) { return sumObj(r.byType) - (r.byType[V] || 0) - (r.byType[G] || 0) - (r.byType[P] || 0); };
    return bars(rows.map(function (r) { return { label: mLabel(r.month), full: mFull(r.month) }; }), [
      { name: V, color: C.c1, values: rows.map(function (r) { return r.byType[V] || 0; }) }, { name: G, color: C.c2, values: rows.map(function (r) { return r.byType[G] || 0; }) },
      { name: P, color: C.c3, values: rows.map(function (r) { return r.byType[P] || 0; }) }, { name: 'เหตุอื่น (บังคับล้อ ลักทรัพย์ ปรับ รปภ. ฯลฯ)', color: C.c5, values: rows.map(other) }], { aria: 'จำนวนเหตุการณ์รายเดือน' });
  }
  function gateMonthChart() {
    var rows = mod('gate').monthly.filter(function (r) { return inRange(r.month); });
    return bars(rows.map(function (r) { return { label: mLabel(r.month) + ' (' + r.days + ' วัน)', full: mFull(r.month) }; }), [
      { name: 'รถยนต์', color: C.c1, values: rows.map(function (r) { return r.cars; }) }, { name: 'รถจักรยานยนต์', color: C.c3, values: rows.map(function (r) { return r.motorcycles; }) }],
      { line: { name: 'ผู้ไม่สวมหมวกนิรภัย (เส้น)', color: C.c2, values: rows.map(function (r) { return r.noHelmet; }) }, aria: 'รถเข้ารายเดือน' });
  }
  function gateDailyChart() {
    var d = mod('gate').daily.filter(function (r) { return inRange(r.date.slice(0, 7)); });
    return bars(d.map(function (r) { return { label: (+r.date.slice(8)) + ' ' + TH_M[+r.date.slice(5, 7) - 1], full: dLabel(r.date) }; }), [
      { name: 'รถยนต์', color: C.c1, values: d.map(function (r) { return r.cars; }) }, { name: 'รถจักรยานยนต์', color: C.c3, values: d.map(function (r) { return r.motorcycles; }) }],
      { line: { name: 'ผู้ไม่สวมหมวกนิรภัย (เส้น)', color: C.c2, values: d.map(function (r) { return r.noHelmet; }) }, aria: 'รถเข้ารายวัน', w: 1000, h: 300 });
  }
  function lfChart() {
    var m = mod('lostfound').monthly.filter(function (r) { return inRange(r.month); });
    return bars(m.map(function (r) { return { label: mLabel(r.month), full: mFull(r.month) }; }), [
      { name: 'สิ่งของสูญหาย', color: C.c4, values: m.map(function (r) { return r.byType['สิ่งของสูญหาย'] || 0; }) }, { name: 'พบสิ่งของ', color: C.c3, values: m.map(function (r) { return r.byType['พบสิ่งของ'] || 0; }) },
      { name: 'รับของคืน', color: C.c1, values: m.map(function (r) { return r.byType['รับของคืน'] || 0; }) }, { name: 'ไม่ระบุประเภท', color: C.c5, values: m.map(function (r) { return r.byType['(ไม่ระบุประเภท)'] || 0; }) }], { aria: 'ของหายรายเดือน' });
  }
  function satTrend(src) {
    var s = mod('guardSatisfaction')[src], rows = s.monthly;
    return bars(rows.map(function (r) { return { label: mLabel(r.month), full: mFull(r.month) }; }),
      [{ name: 'จำนวน' + s.unitOfN.split(' ')[0], color: '#c9d4e6', values: rows.map(function (r) { return src === 'central' ? r.responses : r.respondents; }) }],
      { line2: { name: 'คะแนนเฉลี่ยรวม', color: C.c1, max: 5, values: rows.map(function (r) { return r.overall; }) }, aria: 'แนวโน้มความพึงพอใจรายเดือน', h: 230 });
  }

  /* ======================================================================
   * หน้า Dashboard ตรวจรับงาน รปภ. — ความพึงพอใจ (+ ส่วนค่าปรับแยก)
   * ==================================================================== */
  PAGES['guard-satisfaction'] = function (v) {
    var sat = mod('guardSatisfaction');
    if (!sat) { v.appendChild(pageHead('Dashboard ตรวจรับงาน รปภ.')); v.appendChild(el('div', { class: 'card box' }, [el('p', { class: 'kpi-na', text: 'ยังเชื่อมต่อไม่ได้' })])); return; }
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
    v.appendChild(pageHead('Dashboard ตรวจรับงาน รปภ.เอกชน', 'สรุปผลแบบประเมินความพึงพอใจรายเดือน และสถิติค่าปรับ รปภ. สำหรับการประชุมตรวจรับ', el('div', { class: 'ctrls' }, [seg, ic('calendar'), ySel, mSel])));

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
      return { label: t.name, value: t.avg, note: t.avg != null ? 'N = ' + num(t.n) : null, color: [C.c1, C.c3, C.c4, C.c2, C.c5][i] }; }), 5, { dec: 2, ticks: [0, 1, 2, 3, 4, 5], aria: 'คะแนนรายด้าน' })));
    g.appendChild(figure('แนวโน้มรายเดือน — ' + src.name, 'แท่ง = จำนวน' + src.unitOfN.split(' ')[0] + ' (แกนซ้าย) · จุด = คะแนนเฉลี่ยรวม (แกนขวา 0–5)', satTrend(state.satSrc)));
    v.appendChild(el('div', { class: 'sec' }, [g]));

    if (isC) {
      var dist = cur.scoreDistribution, totalAns = sumObj(dist), hi = (dist['4'] || 0) + (dist['5'] || 0), lo = (dist['1'] || 0) + (dist['2'] || 0);
      v.appendChild(section('การกระจายคะแนนทุกข้อ — ' + mFull(cur.month), { note: num(totalAns) + ' คะแนน = ' + num(cur.responses) + ' คำตอบ × 5 ด้าน' }, [el('div', { class: 'grid2' }, [
        figure('จำนวนครั้งที่ให้แต่ละคะแนน', 'นับทุกข้อทุกด้านรวมกัน', hbars(['5', '4', '3', '2', '1'].map(function (s) {
          return { label: s + ' คะแนน' + (s === '5' ? ' (ดีมาก)' : s === '1' ? ' (ปรับปรุง)' : ''), value: dist[s] || 0, note: ((dist[s] || 0) / totalAns * 100).toFixed(1) + '%', color: +s >= 4 ? C.c3 : +s === 3 ? C.c5 : C.c2 }; }),
          Math.max.apply(null, Object.keys(dist).map(function (k2) { return dist[k2]; })), { labelW: 130, aria: 'การกระจายคะแนน' })),
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
    var fines = mod('guardFines');
    v.appendChild(el('div', { class: 'divider', role: 'heading', 'aria-level': '2' }, [ic('coin'), 'ค่าปรับ รปภ. — ข้อมูลแยกจากผลประเมิน']));
    if (!fines) { v.appendChild(el('p', { class: 'kpi-na', text: 'ยังเชื่อมต่อไม่ได้' })); return; }
    var fm = fines.monthly.filter(function (r) { return r.month === state.satMonth; })[0];
    v.appendChild(el('div', { class: 'sec' }, [kpiGrid([
      fm ? { icon: 'coin', label: 'เคสค่าปรับ ' + mFull(state.satMonth), value: num(fm.cases), unit: 'เคส', sub: fm.cases ? Object.keys(fm.byUnit).map(function (u) { return u + ' ' + fm.byUnit[u]; }).join(' · ') : 'ไม่มีรายการ “ปรับ รปภ.” ในเดือนนี้', updated: fines.updated, color: C.fine, more: 'guard-fines' }
         : { icon: 'coin', label: 'เคสค่าปรับ ' + mFull(state.satMonth), na: 'ไม่มีข้อมูลรายงานเหตุการณ์ของเดือนนี้', color: C.fine, more: 'guard-fines' },
      { icon: 'coin', label: 'ยอดค่าปรับ ' + mFull(state.satMonth), value: fm ? num(fm.amountByRate) : '–', unit: 'บาท', sub: 'คำนวณ ' + (fm ? fm.cases : 0) + ' เคส × ' + num(fines.amount.ratePerCase) + ' บาท', tag: 'Sheet ไม่มีช่องยอดเงิน · อัตรารอยืนยัน', color: C.fine, more: 'guard-fines' },
      { icon: 'calendar', label: 'เคสค่าปรับทั้งช่วงข้อมูล', value: num(fines.totalCases), unit: 'เคส', sub: dLabel(fines.range.from).replace(/ \d{4}$/, '') + ' – ' + dLabel(fines.range.to), updated: fines.updated, color: C.fine, more: 'guard-fines' }])]));
  };

  /* ======================================================================
   * หน้า สรุปค่าปรับ รปภ.
   * ==================================================================== */
  PAGES['guard-fines'] = function (v) {
    var f = mod('guardFines');
    v.appendChild(pageHead('สรุปค่าปรับ รปภ. / การตรวจรับ', 'นับเฉพาะรายการประเภท “ปรับ รปภ.” จากแท็บรายงานเหตุการณ์ แยกตามเดือนที่เกิดเหตุ'));
    if (!f) { v.appendChild(el('p', { class: 'kpi-na', text: 'ยังเชื่อมต่อไม่ได้' })); return; }
    var units = {}; f.monthly.forEach(function (r) { Object.keys(r.byUnit).forEach(function (u) { units[u] = (units[u] || 0) + r.byUnit[u]; }); });
    v.appendChild(kpiGrid([
      { icon: 'coin', label: 'เคสค่าปรับรวม', value: num(f.totalCases), unit: 'เคส', scope: dLabel(f.range.from) + ' – ' + dLabel(f.range.to), updated: f.updated, color: C.fine },
      { icon: 'coin', label: 'ยอดค่าปรับรวม (ตามอัตราแบบรายงานเดิม)', value: num(f.amount.total), unit: 'บาท', sub: f.totalCases + ' เคส × ' + num(f.amount.ratePerCase) + ' บาท', tag: 'อัตรารอยืนยันตามสัญญาจ้าง', color: C.fine },
      { icon: 'calendar', label: 'เดือนที่มีข้อมูล', value: num(f.monthly.length), unit: 'เดือน', sub: 'เดือนที่มีค่าปรับ ' + f.monthly.filter(function (r) { return r.cases; }).length + ' เดือน', color: C.c5 },
      { icon: 'shield', label: 'หน่วยงานที่ถูกปรับ', value: num(Object.keys(units).length), unit: 'หน่วย', sub: Object.keys(units).map(function (u) { return u + ' ' + units[u] + ' เคส'; }).join(' · ') || '–', color: C.c5 }]));
    var g = el('div', { class: 'grid2' });
    var cols = f.monthly.map(function (r) { return { label: mLabel(r.month), full: mFull(r.month) }; });
    g.appendChild(figure('จำนวนเคสค่าปรับรายเดือน', 'ที่มา: รายงานเหตุการณ์ (ประเภท “ปรับ รปภ.”)', bars(cols, [{ name: 'เคสค่าปรับ', color: C.fine, values: f.monthly.map(function (r) { return r.cases; }) }], { aria: 'เคสค่าปรับรายเดือน', h: 220, int: true })));
    g.appendChild(figure('ยอดค่าปรับรายเดือน (บาท)', 'คำนวณจากจำนวนเคส × ' + num(f.amount.ratePerCase) + ' บาท', bars(cols, [{ name: 'ยอดค่าปรับ (บาท)', color: '#d98c7d', values: f.monthly.map(function (r) { return r.amountByRate; }) }], { aria: 'ยอดค่าปรับรายเดือน', h: 220 })));
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
    v.appendChild(pageHead('สถิติแจ้งเหตุและอุบัติเหตุ', 'เหตุการณ์ที่เจ้าหน้าที่บันทึกในระบบรายงานเหตุการณ์ แยกประเภทและเดือนที่เกิดเหตุ', rangeCtrl()));
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
    v.appendChild(pageHead('รถเข้ามหาวิทยาลัยและผู้ไม่สวมหมวกนิรภัย', 'จำนวนที่เจ้าหน้าที่นับที่ประตู 1, 3, 4, 5, 6 รายวัน', rangeCtrl()));
    if (gate) {
      var cars = sumMonthly(gate.monthly, function (r) { return r.cars; }), mo = sumMonthly(gate.monthly, function (r) { return r.motorcycles; }), nh = sumMonthly(gate.monthly, function (r) { return r.noHelmet; }), days = sumMonthly(gate.monthly, function (r) { return r.days; });
      v.appendChild(kpiGrid(days ? [
        { icon: 'car', label: 'รถยนต์', value: num(cars), unit: 'คัน', scope: rangeText() + ' · ' + days + ' วัน', updated: gate.updated },
        { icon: 'car', label: 'รถจักรยานยนต์', value: num(mo), unit: 'คัน', scope: rangeText(), color: C.c3 },
        { icon: 'helmet', label: 'ผู้ไม่สวมหมวกนิรภัย', value: num(nh), unit: 'ราย', sub: (100 * nh / mo).toFixed(1) + '% ของรถจักรยานยนต์ที่นับได้', color: C.c2, tag: 'มีวันที่ค่าผิดสังเกต' },
        { icon: 'calendar', label: 'เฉลี่ยต่อวัน', value: num(Math.round((cars + mo) / days)), unit: 'คัน/วัน', sub: 'รถยนต์ + รถจักรยานยนต์', color: C.c5 }] : [{ label: 'รถเข้ามหาวิทยาลัย', na: 'ไม่มีข้อมูลในช่วงที่เลือก' }]));
      v.appendChild(el('div', { class: 'sec' }, [figure('รายวัน', 'ที่มา: จำนวนรถเข้า+หมวกนิรภัย · อัปเดต ' + dLabel(gate.updated), gateDailyChart())]));
      v.appendChild(section('สรุปรายเดือน', {}, [table(['เดือน', 'วันที่มีข้อมูล', 'รถยนต์', 'รถจักรยานยนต์', 'ไม่สวมหมวก', '% ไม่สวมหมวก'], gate.monthly.map(function (r) { return [mFull(r.month), r.days, num(r.cars), num(r.motorcycles), num(r.noHelmet), (100 * r.noHelmet / r.motorcycles).toFixed(1) + '%']; }), { num: [1, 2, 3, 4, 5] })]));
      v.appendChild(section('นิยามและข้อสังเกต', {}, [infoBox('จำนวนรถเข้า + หมวกนิรภัย', gate)]));
    }
    v.appendChild(systemsSection(['gate-tracker', 'helmet-quiz']));
  };
  PAGES['accident-map'] = function (v) {
    v.appendChild(pageHead('แผนที่จุดเกิดอุบัติเหตุ', 'พิกัดจริงจากรายงานเหตุการณ์ เฉพาะอุบัติเหตุจากยานพาหนะและอุบัติเหตุทั่วไป ไม่แสดงเวลาและข้อมูลบุคคล', rangeCtrl()));
    v.appendChild(el('p', { class: 'src', id: 'mapNote' }));
    v.appendChild(el('div', { class: 'card mapcard', style: 'margin-top:8px' }, [
      el('div', { class: 'map-left' }, [el('div', { class: 'map-tools', id: 'mapTools' }), el('div', { id: 'mapSvg', class: 'map-svg', role: 'img', 'aria-label': 'แผนผังจุดเกิดอุบัติเหตุภายในวิทยาเขตศาลายา' }), el('p', { class: 'map-cap', text: 'แผนผังตามพิกัดจริง (ทิศเหนืออยู่ด้านบน) — กดจุดเพื่อดูตำแหน่งและเปิดใน Google Maps' })]),
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
    v.appendChild(pageHead('ยานพาหนะและลานจอดรถ', 'การลงทะเบียนยานพาหนะบุคลากร/นักศึกษา และแบบสำรวจลานจอดรถเรือนไทย'));
    if (vr) v.appendChild(kpiGrid(Object.keys(vr.rows).map(function (n, i) { return vr.rows[n] == null ? { icon: 'car', label: n, na: 'ไม่มีข้อมูลยืนยัน', color: C.c5 } : { icon: 'car', label: n, value: num(vr.rows[n]), unit: 'รายการ', updated: vr.updated, color: [C.c1, C.c3, C.c4, C.c5][i] }; })));
    v.appendChild(section('ที่มาและข้อจำกัด', {}, [el('div', { class: 'grid2' }, [infoBox('ลงทะเบียนยานพาหนะ', vr), rt ? infoBox('ลานจอดรถเรือนไทย — ยังเชื่อมต่อไม่ได้', rt) : null])]));
    v.appendChild(systemsSection(['veh-staff', 'veh-student', 'ruenthai']));
  };
  PAGES.graduation = function (v) {
    var gr = mod('graduationParking'), gps = mod('graduationGuardGps');
    v.appendChild(pageHead('งานปริญญา', 'ลานจอดรถและงาน รปภ. ช่วงพิธีพระราชทานปริญญาบัตร ปีการศึกษา 2568'));
    if (gr) {
      v.appendChild(kpiGrid(gr.days.map(function (d, i) { return { icon: 'cap', label: 'รถในลานจอด ' + dLabel(d.date), value: num(d.latestCount), unit: 'คัน', sub: d.occupancyPercent + '% ของความจุ ' + num(d.capacity) + ' คัน (' + d.lots + ' ลาน)', updated: gr.updated, color: [C.c1, C.c3, C.c4][i] }; })));
      v.appendChild(el('div', { class: 'sec' }, [figure('อัตราการใช้ลานจอดรวม', 'ที่มา: SUMMARY_2569 · จำนวนรถล่าสุดที่บันทึกของแต่ละลาน', hbars(gr.days.map(function (d) { return { label: dLabel(d.date), value: d.occupancyPercent, note: num(d.latestCount) + ' / ' + num(d.capacity) + ' คัน', color: C.c3 }; }), 100, { ticks: [0, 25, 50, 75, 100], labelW: 120 }))]));
    }
    v.appendChild(section('นิยามและสถานะ', {}, [el('div', { class: 'grid2' }, [infoBox('ลานจอดงานปริญญา', gr), gps ? infoBox('รายงาน รปภ. งานปริญญา (GPS) — ยังเชื่อมต่อไม่ได้', gps) : null])]));
    v.appendChild(systemsSection(['grad-parking', 'grad-guard-report']));
  };
  PAGES['guard-scan'] = function (v) {
    var gs = mod('guardScan');
    v.appendChild(pageHead('รายงานการปฏิบัติงานและการสแกนจุด', 'การสแกนจุดตรวจของ รปภ.เอกชน แยกหน่วยงาน/โซน (ไม่แสดงชื่อ รปภ.)'));
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
    v.appendChild(pageHead('ของหาย / เก็บของได้ / รับของคืน', 'สถิติรวมจากระบบ Lost & Found (ไม่แสดงข้อมูลผู้แจ้ง)', rangeCtrl()));
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
      v.appendChild(section('นิยาม', {}, [infoBox('Lost & Found', lf)]));
    }
    v.appendChild(systemsSection(['lostfound']));
  };
  PAGES.safety = function (v) {
    var f = mod('fire');
    v.appendChild(pageHead('ความปลอดภัย: AED และถังดับเพลิง', 'ทะเบียนและผลตรวจถังดับเพลิง และแผนที่เครื่อง AED'));
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
    v.appendChild(systemsSection(['fire', 'aed-map']));
  };
  PAGES.reports = function (v) {
    v.appendChild(pageHead('รายงานและเอกสาร PDF', 'เครื่องมือสร้างเอกสารรายงานและ Dashboard เดิม (เปิดในระบบต้นทาง)'));
    v.appendChild(systemsSection(['dashboard-ai', 'pdf-monthly', 'pdf-daily', 'pdf-guard-monthly', 'pdf-guard', 'old-hub'], 'รายงานและเอกสาร'));
  };
  PAGES.systems = function (v) {
    v.appendChild(pageHead('ระบบทั้งหมด', DATA.systems.categories.reduce(function (a, c) { return a + c.systems.length; }, 0) + ' ระบบ ใน ' + DATA.systems.categories.length + ' หมวด พร้อมสถานะการเชื่อมต่อข้อมูล'));
    DATA.systems.categories.forEach(function (c) { v.appendChild(section(c.name, { note: c.systems.length + ' ระบบ' }, [el('div', { class: 'sys-grid' }, c.systems.map(sysCard))])); });
    v.appendChild(section('ที่มาของข้อมูลและการคุ้มครองข้อมูลส่วนบุคคล', {}, [el('div', { class: 'card box' }, [notesList([DATA.stats.method,
      'หน้านี้แสดงเฉพาะสถิติรวม ไม่แสดงชื่อ เบอร์โทร ทะเบียนรถ รายละเอียดผู้แจ้งเหตุ ข้อความอิสระ หรือภาพถ่าย และไม่มีรหัสผ่าน/API key อยู่ในหน้าเว็บ',
      'ตัวเลขทุกตัวระบุแหล่งข้อมูลและเวลาอัปเดตล่าสุด ระบบที่ยังยืนยันแหล่งข้อมูลไม่ได้แสดงสถานะ “ยังเชื่อมต่อไม่ได้” หรือ “ไม่มีข้อมูลยืนยัน” แทนตัวเลข',
      'วันที่และเดือนตีความตามเขตเวลา Asia/Bangkok และแสดงปีเป็น พ.ศ.'])])]));
  };

  /* ---------- แผนที่อุบัติเหตุ ---------- */
  var gmState = { loading: false };
  function useGoogleMap() { return !!CFG.googleMapsApiKey && !window.__HUB_PREVIEW__; }
  function renderGoogleMap(box, pts, b) {
    if (!(window.google && google.maps)) {
      if (!gmState.loading) {
        gmState.loading = true; window.__hubGmReady = function () { renderMap(); };
        var sc = document.createElement('script'); sc.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(CFG.googleMapsApiKey) + '&callback=__hubGmReady'; sc.async = true;
        sc.onerror = function () { CFG.googleMapsApiKey = ''; showBanner('โหลด Google Maps ไม่สำเร็จ — แสดงแผนผังในหน้าแทน'); renderMap(); }; document.head.appendChild(sc);
      }
      box.appendChild(el('div', { class: 'empty', text: 'กำลังโหลด Google Maps…' })); return;
    }
    var div = el('div', { style: 'height:520px;border-radius:10px;border:1px solid #dfe4ec' }); box.appendChild(div);
    var map = new google.maps.Map(div, { center: { lat: (b.latMin + b.latMax) / 2, lng: (b.lngMin + b.lngMax) / 2 }, zoom: 16, mapTypeControl: false, streetViewControl: false });
    pts.forEach(function (p) {
      var mk = new google.maps.Marker({ position: { lat: p.lat, lng: p.lng }, map: map, title: p.type + ' · ' + p.place + ' · ' + mLabel(p.month), icon: { path: google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: p.type === V ? C.c1 : C.c2, fillOpacity: .9, strokeColor: '#fff', strokeWeight: 1.5 } });
      mk.addListener('click', function () { state.sel = p.i; renderMap(); });
    });
  }
  function mapPoints() { var am = mod('accidentMap'); if (!am) return []; return am.points.map(function (p, i) { p.i = i; return p; }).filter(function (p) { return inRange(p.month) && (state.mapType === 'all' || p.type === state.mapType); }); }
  function renderMap() {
    var am = mod('accidentMap'), tools = $('mapTools'), box = $('mapSvg'), list = $('mapList'); if (!box) return;
    tools.textContent = ''; box.textContent = ''; list.textContent = '';
    if (!am) { box.appendChild(el('div', { class: 'empty', text: 'ยังเชื่อมต่อข้อมูลพิกัดไม่ได้' })); return; }
    [['all', 'ทุกประเภท'], [V, 'ยานพาหนะ'], [G, 'ทั่วไป']].forEach(function (o) { tools.appendChild(el('button', { type: 'button', class: 'chip', 'aria-pressed': String(state.mapType === o[0]), text: o[1], onclick: function () { state.mapType = o[0]; state.sel = -1; renderMap(); } })); });
    var pts = mapPoints(), b = am.box, W = 500, H = 640, pad = 18;
    var px = function (lng) { return pad + (W - 2 * pad) * (lng - b.lngMin) / (b.lngMax - b.lngMin); }, py = function (lat) { return pad + (H - 2 * pad) * (b.latMax - lat) / (b.latMax - b.latMin); };
    var root = svg('svg', { viewBox: '0 0 ' + W + ' ' + H }), i;
    for (i = 0; i <= 4; i++) { root.appendChild(svg('line', { x1: pad + (W - 2 * pad) * i / 4, x2: pad + (W - 2 * pad) * i / 4, y1: pad, y2: H - pad, stroke: '#e1e6ee' })); root.appendChild(svg('line', { y1: pad + (H - 2 * pad) * i / 4, y2: pad + (H - 2 * pad) * i / 4, x1: pad, x2: W - pad, stroke: '#e1e6ee' })); }
    var sb = (W - 2 * pad) * (500 / (111320 * Math.cos(13.795 * Math.PI / 180))) / (b.lngMax - b.lngMin);
    root.appendChild(svg('line', { x1: pad + 6, x2: pad + 6 + sb, y1: H - pad - 8, y2: H - pad - 8, stroke: '#152033', 'stroke-width': 2 }));
    root.appendChild(svg('text', { x: pad + 6, y: H - pad - 14, 'font-size': 11, fill: '#152033', text: '500 ม.' }));
    root.appendChild(svg('text', { x: W - pad - 6, y: pad + 16, 'font-size': 12, 'text-anchor': 'end', fill: '#152033', 'font-weight': 600, text: 'N ↑' }));
    pts.filter(function (p) { return !p.outOfCampusBox; }).forEach(function (p) {
      var c = svg('circle', { cx: px(p.lng), cy: py(p.lat), r: 7, fill: p.type === V ? C.c1 : C.c2, 'fill-opacity': .85, tabindex: 0, role: 'button', 'aria-label': p.type + ' ' + p.place + ' ' + mLabel(p.month), class: p.i === state.sel ? 'sel' : '',
        onclick: function () { state.sel = p.i; renderMap(); }, onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); state.sel = p.i; renderMap(); } } });
      c.appendChild(svg('title', { text: p.type + ' · ' + p.place + ' · ' + mLabel(p.month) })); root.appendChild(c);
    });
    if (useGoogleMap()) renderGoogleMap(box, pts, b); else box.appendChild(root);
    box.appendChild(el('div', { class: 'legend' }, [el('span', {}, [el('i', { style: 'background:' + C.c1 }), V]), el('span', {}, [el('i', { style: 'background:' + C.c2 }), G])]));
    var note = $('mapNote'); if (note) note.textContent = num(pts.length) + ' จุดในช่วง ' + rangeText() + ' · ที่มา: รายงานเหตุการณ์ คอลัมน์ “พิกัด (Lat, Lng)” · อัปเดต ' + dLabel(am.updated);
    var det = $('mapDetail'), sel = am.points[state.sel], emb = $('mapEmbed'); det.textContent = ''; emb.textContent = ''; emb.hidden = true;
    if (sel && pts.indexOf(sel) >= 0) {
      det.appendChild(el('div', {}, [el('strong', { text: sel.place })]));
      det.appendChild(el('div', { text: sel.type + ' · ' + mFull(sel.month) + ' · พิกัด ' + sel.lat.toFixed(6) + ', ' + sel.lng.toFixed(6) + (sel.outOfCampusBox ? ' (อยู่นอกกรอบวิทยาเขต ควรตรวจสอบ)' : '') }));
      det.appendChild(el('a', { class: 'btn', href: mapsUrl(sel), target: '_blank', rel: 'noopener' }, ['เปิดตำแหน่งนี้ใน Google Maps', ic('ext', 15)]));
      if (CFG.allowMapEmbed && !window.__HUB_PREVIEW__) { emb.hidden = false; emb.appendChild(el('iframe', { title: 'Google Maps: ' + sel.place, loading: 'lazy', referrerpolicy: 'no-referrer', src: 'https://www.google.com/maps?q=' + sel.lat + ',' + sel.lng + '&z=17&output=embed' })); }
    } else det.appendChild(el('div', { text: 'เลือกจุดบนแผนผังหรือในตาราง เพื่อดูตำแหน่งและเปิดใน Google Maps' }));
    list.appendChild(el('thead', {}, [el('tr', {}, [el('th', { text: 'เดือน' }), el('th', { text: 'ประเภท / สถานที่' }), el('th', { text: 'แผนที่' })])]));
    var tb = el('tbody');
    pts.slice().sort(function (a, c) { return a.month < c.month ? 1 : a.month > c.month ? -1 : 0; }).forEach(function (p) {
      tb.appendChild(el('tr', { class: p.i === state.sel ? 'sel' : '' }, [el('td', { text: mLabel(p.month) }),
        el('td', {}, [el('span', { class: 'dot', style: 'background:' + (p.type === V ? C.c1 : C.c2) }), el('button', { type: 'button', class: 'linkish', text: p.place + (p.outOfCampusBox ? ' (นอกกรอบ)' : ''), onclick: function () { state.sel = p.i; renderMap(); } })]),
        el('td', {}, [el('a', { href: mapsUrl(p), target: '_blank', rel: 'noopener', text: 'เปิด' })])]));
    });
    if (!pts.length) tb.appendChild(el('tr', {}, [el('td', { colspan: 3, class: 'empty', text: 'ไม่มีจุดในช่วงที่เลือก' })]));
    list.appendChild(tb);
  }

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
