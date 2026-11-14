/* hub.js — หน้ารวมระบบงานจราจรและความปลอดภัย ม.มหิดล
 * อ่านเฉพาะ "สถิติรวม" (data/stats.json หรือ Stats API) และบัญชีระบบ (data/systems.json)
 * ไม่มีการอ่าน Google Sheet ดิบ ไม่มีชื่อบุคคล/เบอร์โทร/ทะเบียนรถ และไม่มีการเขียนข้อมูลกลับไปยังระบบใด */
(function () {
  'use strict';
  var CFG = window.HUB_CONFIG || {};
  var TH_M = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  var STATUS = {
    connected: 'เชื่อมต่อสถิติแล้ว', warn: 'เชื่อมต่อแล้ว · มีข้อสังเกต', partial: 'เชื่อมต่อได้บางส่วน',
    blocked: 'ยังเชื่อมต่อไม่ได้', unverified: 'ไม่มีข้อมูลยืนยัน', link: 'ลิงก์ระบบ (ไม่มีสถิติ)', legacy: 'เลิกใช้เป็นหน้าหลัก'
  };
  var C = { c1: '#1d4f91', c2: '#d9822b', c3: '#2a9d8f', c4: '#8e6bbf', c5: '#7c8797' };
  var V = 'อุบัติเหตุจากยานพาหนะ', G = 'อุบัติเหตุทั่วไป', P = 'รับส่งผู้ป่วย';
  var state = { from: null, to: null, cat: 'all', mapType: 'all', sel: -1 };
  var DATA = null, MONTHS = [], liveMode = false;

  /* ---------- helpers ---------- */
  function $(id) { return document.getElementById(id); }
  function el(tag, attrs, kids) {
    var n = document.createElement(tag), k;
    for (k in (attrs || {})) {
      if (attrs[k] == null || attrs[k] === false) continue;
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'class') n.className = attrs[k];
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c != null) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function svg(tag, attrs, kids) {
    var n = document.createElementNS('http://www.w3.org/2000/svg', tag), k;
    for (k in (attrs || {})) { if (k === 'text') n.textContent = attrs[k]; else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), attrs[k]); else n.setAttribute(k, attrs[k]); }
    (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }
  function num(x) { return (x == null || isNaN(x)) ? '–' : Number(x).toLocaleString('th-TH'); }
  function mLabel(m) { var p = m.split('-'); return TH_M[+p[1] - 1] + ' ' + String(+p[0] + 543).slice(2); }
  function dLabel(s) { // 'YYYY-MM-DD HH:MM' | 'YYYY-MM-DD' | 'YYYY-MM'
    if (!s) return 'ไม่ทราบ';
    var d = s.split(' ')[0].split('-'), t = s.split(' ')[1];
    var out = (d[2] ? (+d[2]) + ' ' : '') + TH_M[+d[1] - 1] + ' ' + (+d[0] + 543);
    return out + (t ? ' ' + t + ' น.' : '');
  }
  function inRange(m) { return (!state.from || m >= state.from) && (!state.to || m <= state.to); }
  function mod(k) { return (DATA.stats.modules || {})[k] || null; }
  function sumMonthly(list, pick) { return (list || []).filter(function (r) { return inRange(r.month); }).reduce(function (a, r) { return a + (pick(r) || 0); }, 0); }
  function sumObj(o) { var s = 0, k; for (k in o) s += o[k] || 0; return s; }
  function rangeText() {
    if (!MONTHS.length) return '';
    var a = state.from || MONTHS[0], b = state.to || MONTHS[MONTHS.length - 1];
    return a === b ? mLabel(a) : mLabel(a) + ' – ' + mLabel(b);
  }
  function mapsUrl(p) { return 'https://www.google.com/maps/search/?api=1&query=' + p.lat + ',' + p.lng; }

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

  /* ---------- header / filters ---------- */
  function renderStamp() {
    var g = DATA.stats.generatedAt || '', s = $('stamp');
    s.textContent = '';
    s.appendChild(el('b', { text: 'ข้อมูล ณ ' + dLabel(g.slice(0, 10) + ' ' + g.slice(11, 16)) }));
    s.appendChild(el('br'));
    s.appendChild(document.createTextNode(liveMode ? 'อ่านสดจาก Stats API (เฉพาะยอดรวม)' : 'ไฟล์สถิติรวม (snapshot) · เขตเวลา Asia/Bangkok'));
  }
  function collectMonths() {
    var set = {};
    ['incidents', 'gate', 'lostfound', 'cctv'].forEach(function (k) { ((mod(k) || {}).monthly || []).forEach(function (r) { set[r.month] = 1; }); });
    MONTHS = Object.keys(set).sort();
  }
  function renderFilters() {
    var f = $('fFrom'), t = $('fTo');
    [f, t].forEach(function (s) { s.textContent = ''; MONTHS.forEach(function (m) { s.appendChild(el('option', { value: m, text: mLabel(m) })); }); });
    f.value = MONTHS[0]; t.value = MONTHS[MONTHS.length - 1];
    function ch() { state.from = f.value; state.to = t.value; if (state.from > state.to) { state.to = state.from; t.value = state.to; } renderAll(); }
    f.onchange = ch; t.onchange = ch;
    $('fReset').onclick = function () { f.value = MONTHS[0]; t.value = MONTHS[MONTHS.length - 1]; ch(); };
    state.from = f.value; state.to = t.value;
    var chips = $('chips'); chips.textContent = '';
    [{ id: 'all', name: 'ทั้งหมด' }].concat(DATA.systems.categories).forEach(function (c) {
      chips.appendChild(el('button', { type: 'button', class: 'chip', 'aria-pressed': String(state.cat === c.id), text: c.name, onclick: function () { state.cat = c.id; Array.prototype.forEach.call(chips.children, function (b) { b.setAttribute('aria-pressed', 'false'); }); this.setAttribute('aria-pressed', 'true'); applyCat(); } }));
    });
  }
  function applyCat() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-cat]'), function (n) {
      n.hidden = state.cat !== 'all' && n.getAttribute('data-cat').split(' ').indexOf(state.cat) < 0;
    });
  }

  /* ---------- KPI ---------- */
  function kpiCard(o) {
    var body = [el('div', { class: 'kpi-label', text: o.label })];
    if (o.na) body.push(el('div', { class: 'kpi-na', text: o.na }));
    else body.push(el('div', { class: 'kpi-num' }, [document.createTextNode(o.value), o.unit ? el('small', { text: o.unit }) : null]));
    if (o.sub) body.push(el('div', { class: 'kpi-sub', text: o.sub }));
    var meta = el('div', { class: 'kpi-meta' }, [document.createTextNode((o.scope ? o.scope + ' · ' : '') + 'ที่มา: ' + o.source + ' · อัปเดตล่าสุด ' + dLabel(o.updated))]);
    if (o.flag) meta.appendChild(el('div', {}, [el('span', { class: 'tag t-warn', text: o.flag })]));
    body.push(meta);
    return el('article', { class: 'card kpi ' + (o.tone || ''), 'data-cat': o.cats }, body);
  }
  function renderKpis() {
    var box = $('kpis'), rt = rangeText(), k = []; box.textContent = '';
    var inc = mod('incidents'), gate = mod('gate'), lf = mod('lostfound'), cctv = mod('cctv'), gr = mod('graduationParking'),
      gs = mod('guardScan'), sc = mod('satisfactionCentral'), su = mod('satisfactionUnit'), fire = mod('fire'), vr = mod('vehicleRegistration');
    if (inc) {
      var t = function (name) { return sumMonthly(inc.monthly, function (r) { return r.byType[name]; }); };
      var total = sumMonthly(inc.monthly, function (r) { return sumObj(r.byType); });
      k.push({ label: 'เหตุการณ์ที่บันทึก', value: num(total), unit: 'เหตุ', sub: 'อุบัติเหตุยานพาหนะ ' + num(t(V)) + ' · อุบัติเหตุทั่วไป ' + num(t(G)) + ' · รับส่งผู้ป่วย ' + num(t(P)), scope: rt, source: 'รายงานเหตุการณ์', updated: inc.updated, cats: 'overview traffic' });
      var bi = {}; inc.byType.forEach(function (r) { bi[r.type] = r.injuredOrIll; });
      k.push({ label: 'ผู้บาดเจ็บ / ผู้ป่วยที่บันทึก', value: num(inc.injuredTotal), unit: 'คน', sub: 'จากอุบัติเหตุยานพาหนะ ' + num(bi[V]) + ' · อุบัติเหตุทั่วไป ' + num(bi[G]) + ' · รับส่งผู้ป่วย ' + num(bi[P]), scope: dLabel(inc.range.from) + ' – ' + dLabel(inc.range.to) + ' (ไม่กรองตามเดือน)', source: 'รายงานเหตุการณ์', updated: inc.updated, cats: 'overview traffic', tone: 'k2' });
    }
    if (gate) {
      var cars = sumMonthly(gate.monthly, function (r) { return r.cars; }), mo = sumMonthly(gate.monthly, function (r) { return r.motorcycles; }),
        nh = sumMonthly(gate.monthly, function (r) { return r.noHelmet; }), days = sumMonthly(gate.monthly, function (r) { return r.days; });
      if (days) {
        k.push({ label: 'รถเข้ามหาวิทยาลัย (5 ประตู)', value: num(cars + mo), unit: 'คัน', sub: 'รถยนต์ ' + num(cars) + ' · รถจักรยานยนต์ ' + num(mo) + ' · ' + num(days) + ' วันที่มีข้อมูล', scope: rt, source: 'จำนวนรถเข้า+หมวกนิรภัย', updated: gate.updated, cats: 'traffic', tone: 'k3', flag: 'ตัดข้อมูลทดสอบ 16–17 ก.ย. ออกแล้ว' });
        k.push({ label: 'ผู้ไม่สวมหมวกนิรภัย', value: num(nh), unit: 'ราย', sub: 'คิดเป็น ' + (mo ? (100 * nh / mo).toFixed(1) : '–') + '% ของรถจักรยานยนต์ที่นับได้', scope: rt, source: 'จำนวนรถเข้า+หมวกนิรภัย', updated: gate.updated, cats: 'traffic', tone: 'k2', flag: 'มีวันที่ค่าผิดสังเกต ควรตรวจการกรอก' });
      } else k.push({ label: 'รถเข้ามหาวิทยาลัย / หมวกนิรภัย', na: 'ไม่มีข้อมูลในช่วงที่เลือก', scope: rt, source: 'จำนวนรถเข้า+หมวกนิรภัย', updated: gate.updated, cats: 'traffic', tone: 'k3' });
    }
    if (lf) {
      var lt = function (name) { return sumMonthly(lf.monthly, function (r) { return r.byType[name]; }); };
      k.push({ label: 'แจ้งของหาย', value: num(lt('สิ่งของสูญหาย')), unit: 'รายการ', sub: 'เก็บของได้ ' + num(lt('พบสิ่งของ')) + ' · แบบฟอร์มรับของคืน ' + num(lt('รับของคืน')) + ' · สถานะ “รับของคืนแล้ว” ทั้งปี ' + num(lf.returned), scope: rt, source: 'แจ้งของหาย (รายการ พ.ศ. 2569)', updated: lf.updated, cats: 'lostfound', tone: 'k4' });
    }
    if (cctv) {
      var cn = sumMonthly(cctv.monthly, function (r) { return r.count; });
      k.push({ label: 'คำขอดูกล้องวงจรปิด', value: num(cn), unit: 'คำขอ', sub: 'ทั้งหมด ' + num(cctv.total) + ' คำขอ ปิดเคสแล้ว ' + num(cctv.byStatus['ปิดเคส']) + ' · พบภาพ ' + num(cctv.footage['พบภาพ']) + ' ไม่พบ ' + num(cctv.footage['ไม่พบภาพ']), scope: rt, source: 'CCTV_Requests', updated: cctv.updated, cats: 'cctv' });
    }
    if (gr) {
      var best = gr.days.slice().sort(function (a, b) { return b.latestCount - a.latestCount; })[0];
      k.push({ label: 'รถในลานจอดช่วงงานปริญญา', value: num(best.latestCount), unit: 'คัน', sub: 'วันที่ ' + dLabel(best.date) + ' · ' + best.occupancyPercent + '% ของความจุ ' + num(gr.capacity) + ' คัน (' + gr.lots + ' ลาน)', scope: 'วันที่มากที่สุดจาก 3 วันงาน (ไม่กรองตามเดือน)', source: 'SUMMARY_2569', updated: gr.updated, cats: 'graduation vehicle', tone: 'k3' });
    }
    if (gs) k.push({ label: 'สแกนจุดตรวจ รปภ.เอกชน', value: num(gs.scans), unit: 'ครั้ง', sub: 'ผลไม่ปกติ ' + num(gs.byStatus['ไม่ปกติ']) + ' ครั้ง · ' + num(gs.scanPoints) + ' จุดสแกน', scope: dLabel(gs.range.from) + ' – ' + dLabel(gs.range.to) + ' (ไม่กรองตามเดือน)', source: 'แสกนจุดเอกชน', updated: gs.updated, cats: 'guard graduation', tone: 'k5' });
    if (sc) {
      var a = Object.keys(sc.avg).map(function (x) { return sc.avg[x]; }), mean = a.reduce(function (p, c) { return p + c; }, 0) / a.length;
      var ua = su ? Object.keys(su.avg).map(function (x) { return su.avg[x]; }) : [], um = ua.length ? ua.reduce(function (p, c) { return p + c; }, 0) / ua.length : null;
      k.push({ label: 'ความพึงพอใจ รปภ.เอกชน (ส่วนกลาง)', value: mean.toFixed(2), unit: '/ 5', sub: num(sc.responses) + ' ผู้ตอบ' + (um ? ' · ส่วนงานเฉลี่ย ' + um.toFixed(2) + ' (' + num(su.respondents) + ' ผู้ตอบ)' : ''), scope: 'เฉลี่ย 5 ด้าน ทุกช่วงข้อมูล (ไม่กรองตามเดือน)', source: 'ความพึงพอใจการให้บริการรปภ.เอกชน', updated: sc.updated, cats: 'guard', tone: 'k5' });
    }
    if (fire) k.push({ label: 'ถังดับเพลิงในทะเบียน', value: num(fire.extinguishers), unit: 'ถัง', sub: 'ตรวจแล้ว ' + num(fire.extinguishersInspected) + ' ถัง · ผลตรวจชำรุด ' + num(fire.inspectionResult['ชำรุด']) + ' จาก ' + num(fire.inspections) + ' ครั้ง', scope: 'ทุกช่วงข้อมูล (ไม่กรองตามเดือน)', source: 'ข้อมูลถังดับเพลิง / บันทึกการตรวจ', updated: fire.updated, cats: 'safety', tone: 'k2' });
    if (vr) {
      var rows = vr.rows, tot = 0, parts = [];
      Object.keys(rows).forEach(function (n) { if (rows[n] != null) { tot += rows[n]; parts.push(n + ' ' + num(rows[n])); } });
      k.push({ label: 'รายการลงทะเบียนยานพาหนะ', value: num(tot), unit: 'รายการ', sub: parts.join(' · '), scope: 'นับแถวในฐานข้อมูล (ไม่กรองตามเดือน)', source: 'ฐานข้อมูลลงทะเบียนยานพาหนะ', updated: vr.updated, cats: 'vehicle', tone: 'k4', flag: 'ยังไม่รวมนักศึกษา–รถจักรยานยนต์' });
    }
    k.forEach(function (o) { box.appendChild(kpiCard(o)); });
    $('kpiNote').textContent = 'ช่วงที่เลือก: ' + rt + ' — ตัวเลขที่ระบุว่า “ไม่กรองตามเดือน” มาจากแหล่งข้อมูลที่ไม่มีอนุกรมรายเดือน';
  }

  /* ---------- charts (SVG, ไม่ใช้ไลบรารีภายนอก) ---------- */
  function bars(box, cols, series, opt) {
    opt = opt || {}; box.textContent = '';
    if (!cols.length) { box.appendChild(el('div', { class: 'empty', text: 'ไม่มีข้อมูลในช่วงที่เลือก' })); return; }
    var W = 560, H = 240, L = 44, R = 10, T = 16, B = 30, pw = W - L - R, ph = H - T - B;
    var totals = cols.map(function (_, i) { return series.reduce(function (a, s) { return a + (s.values[i] || 0); }, 0); });
    var max = Math.max.apply(null, totals.concat(opt.line ? opt.line.values : [0]).concat([1]));
    var step = Math.pow(10, Math.floor(Math.log10(max))); if (max / step < 2) step /= 5; else if (max / step < 5) step /= 2;
    var top = Math.ceil(max / step) * step, root = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': opt.aria || 'แผนภูมิแท่ง' });
    for (var v = 0; v <= top + 1e-9; v += step) {
      var y = T + ph - ph * v / top;
      root.appendChild(svg('line', { x1: L, x2: W - R, y1: y, y2: y, stroke: '#e4e8ef' }));
      root.appendChild(svg('text', { x: L - 6, y: y + 4, 'text-anchor': 'end', 'font-size': 10, fill: '#5b6678', text: v >= 1000 ? (v / 1000) + 'k' : String(v) }));
    }
    var bw = pw / cols.length, w = Math.min(46, bw * 0.7), every = Math.ceil(cols.length / 12);
    cols.forEach(function (c, i) {
      var x = L + bw * i + (bw - w) / 2, acc = 0;
      series.forEach(function (s) {
        var val = s.values[i] || 0; if (!val) return;
        var h = ph * val / top, yy = T + ph - ph * (acc + val) / top;
        var r = svg('rect', { x: x, y: yy, width: w, height: Math.max(h - 1, 0.5), rx: 2, fill: s.color });
        r.appendChild(svg('title', { text: c.full + ' · ' + s.name + ': ' + num(val) })); root.appendChild(r); acc += val;
      });
      if (cols.length <= 14 && totals[i]) root.appendChild(svg('text', { x: x + w / 2, y: T + ph - ph * totals[i] / top - 4, 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 600, fill: '#152033', text: totals[i] >= 10000 ? (totals[i] / 1000).toFixed(0) + 'k' : num(totals[i]) }));
      if (i % every === 0) root.appendChild(svg('text', { x: x + w / 2, y: H - 10, 'text-anchor': 'middle', 'font-size': 10, fill: '#5b6678', text: c.label }));
    });
    if (opt.line) {
      var pts = opt.line.values.map(function (val, i) { return (L + bw * i + bw / 2) + ',' + (T + ph - ph * val / top); }).join(' ');
      root.appendChild(svg('polyline', { points: pts, fill: 'none', stroke: opt.line.color, 'stroke-width': 2 }));
    }
    box.appendChild(root);
    var lg = el('div', { class: 'legend' });
    series.concat(opt.line ? [opt.line] : []).forEach(function (s) { lg.appendChild(el('span', {}, [el('i', { style: 'background:' + s.color }), s.name])); });
    box.appendChild(lg);
  }
  function renderCharts() {
    var inc = mod('incidents'), gate = mod('gate'), lf = mod('lostfound');
    if (inc) {
      var rows = inc.monthly.filter(function (r) { return inRange(r.month); }), other = function (r) { return sumObj(r.byType) - (r.byType[V] || 0) - (r.byType[G] || 0) - (r.byType[P] || 0); };
      bars($('chInc'), rows.map(function (r) { return { label: mLabel(r.month), full: mLabel(r.month) }; }), [
        { name: V, color: C.c1, values: rows.map(function (r) { return r.byType[V] || 0; }) },
        { name: G, color: C.c2, values: rows.map(function (r) { return r.byType[G] || 0; }) },
        { name: P, color: C.c3, values: rows.map(function (r) { return r.byType[P] || 0; }) },
        { name: 'เหตุอื่น (บังคับล้อ ลักทรัพย์ ฯลฯ)', color: C.c5, values: rows.map(other) }], { aria: 'จำนวนเหตุการณ์รายเดือนแยกประเภท' });
      $('capInc').textContent = 'ที่มา: รายงานเหตุการณ์ · อัปเดต ' + dLabel(inc.updated);
    }
    if (gate) {
      var d = gate.daily.filter(function (r) { return inRange(r.date.slice(0, 7)); });
      bars($('chGate'), d.map(function (r) { return { label: (+r.date.slice(8)) + ' ' + TH_M[+r.date.slice(5, 7) - 1], full: dLabel(r.date) }; }), [
        { name: 'รถยนต์', color: C.c1, values: d.map(function (r) { return r.cars; }) },
        { name: 'รถจักรยานยนต์', color: C.c3, values: d.map(function (r) { return r.motorcycles; }) }],
        { line: { name: 'ผู้ไม่สวมหมวกนิรภัย (เส้น)', color: C.c2, values: d.map(function (r) { return r.noHelmet; }) }, aria: 'จำนวนรถเข้าและผู้ไม่สวมหมวกนิรภัยรายวัน' });
      $('capGate').textContent = 'ที่มา: จำนวนรถเข้า+หมวกนิรภัย · อัปเดต ' + dLabel(gate.updated) + ' · ไม่รวมข้อมูลทดสอบ 16–17 ก.ย.';
    }
    if (lf) {
      var m = lf.monthly.filter(function (r) { return inRange(r.month); });
      bars($('chLf'), m.map(function (r) { return { label: mLabel(r.month), full: mLabel(r.month) }; }), [
        { name: 'สิ่งของสูญหาย', color: C.c4, values: m.map(function (r) { return r.byType['สิ่งของสูญหาย'] || 0; }) },
        { name: 'พบสิ่งของ', color: C.c3, values: m.map(function (r) { return r.byType['พบสิ่งของ'] || 0; }) },
        { name: 'รับของคืน', color: C.c1, values: m.map(function (r) { return r.byType['รับของคืน'] || 0; }) },
        { name: 'ไม่ระบุประเภท', color: C.c5, values: m.map(function (r) { return r.byType['(ไม่ระบุประเภท)'] || 0; }) }], { aria: 'จำนวนรายการของหายรายเดือนแยกประเภท' });
      $('capLf').textContent = 'ที่มา: แจ้งของหาย (รายการ พ.ศ. 2569) · อัปเดต ' + dLabel(lf.updated);
    }
  }


  /* ---------- (ทางเลือก) Google Maps JavaScript API — ทำงานเมื่อใส่ googleMapsApiKey ใน config.js เท่านั้น ---------- */
  var gmState = { loading: false, map: null, markers: [] };
  function useGoogleMap() { return !!CFG.googleMapsApiKey && !window.__HUB_PREVIEW__; }
  function renderGoogleMap(box, pts, b) {
    if (!(window.google && google.maps)) {
      if (!gmState.loading) {
        gmState.loading = true;
        window.__hubGmReady = function () { renderMap(); };
        var sc = document.createElement('script');
        sc.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(CFG.googleMapsApiKey) + '&callback=__hubGmReady';
        sc.async = true; sc.onerror = function () { CFG.googleMapsApiKey = ''; showBanner('โหลด Google Maps ไม่สำเร็จ — แสดงแผนผังในหน้าแทน'); renderMap(); };
        document.head.appendChild(sc);
      }
      box.appendChild(el('div', { class: 'empty', text: 'กำลังโหลด Google Maps…' })); return;
    }
    var div = el('div', { style: 'height:520px;border-radius:10px;border:1px solid #dfe4ec' }); box.appendChild(div);
    var map = new google.maps.Map(div, { center: { lat: (b.latMin + b.latMax) / 2, lng: (b.lngMin + b.lngMax) / 2 }, zoom: 16, mapTypeControl: false, streetViewControl: false });
    pts.forEach(function (p) {
      var mk = new google.maps.Marker({ position: { lat: p.lat, lng: p.lng }, map: map, title: p.type + ' · ' + p.place + ' · ' + mLabel(p.month),
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: p.type === V ? C.c1 : C.c2, fillOpacity: .9, strokeColor: '#fff', strokeWeight: 1.5 } });
      mk.addListener('click', function () { state.sel = p.i; renderMap(); });
    });
  }

  /* ---------- accident map ---------- */
  function mapPoints() {
    var am = mod('accidentMap'); if (!am) return [];
    return am.points.map(function (p, i) { p.i = i; return p; }).filter(function (p) { return inRange(p.month) && (state.mapType === 'all' || p.type === state.mapType); });
  }
  function renderMap() {
    var am = mod('accidentMap'), tools = $('mapTools'), box = $('mapSvg'), list = $('mapList');
    tools.textContent = ''; box.textContent = ''; list.textContent = '';
    if (!am) { box.appendChild(el('div', { class: 'empty', text: 'ยังเชื่อมต่อข้อมูลพิกัดไม่ได้' })); return; }
    [['all', 'ทุกประเภท'], [V, 'ยานพาหนะ'], [G, 'ทั่วไป']].forEach(function (o) {
      tools.appendChild(el('button', { type: 'button', class: 'chip', 'aria-pressed': String(state.mapType === o[0]), text: o[1], onclick: function () { state.mapType = o[0]; state.sel = -1; renderMap(); } }));
    });
    var pts = mapPoints(), b = am.box, W = 500, H = 640, pad = 18;
    var px = function (lng) { return pad + (W - 2 * pad) * (lng - b.lngMin) / (b.lngMax - b.lngMin); }, py = function (lat) { return pad + (H - 2 * pad) * (b.latMax - lat) / (b.latMax - b.latMin); };
    var root = svg('svg', { viewBox: '0 0 ' + W + ' ' + H }), i, useG = useGoogleMap();
    for (i = 0; i <= 4; i++) {
      root.appendChild(svg('line', { x1: pad + (W - 2 * pad) * i / 4, x2: pad + (W - 2 * pad) * i / 4, y1: pad, y2: H - pad, stroke: '#e1e6ee' }));
      root.appendChild(svg('line', { y1: pad + (H - 2 * pad) * i / 4, y2: pad + (H - 2 * pad) * i / 4, x1: pad, x2: W - pad, stroke: '#e1e6ee' }));
    }
    var mPerDegLng = 111320 * Math.cos(13.795 * Math.PI / 180), sb = (W - 2 * pad) * (500 / mPerDegLng) / (b.lngMax - b.lngMin);
    root.appendChild(svg('line', { x1: pad + 6, x2: pad + 6 + sb, y1: H - pad - 8, y2: H - pad - 8, stroke: '#152033', 'stroke-width': 2 }));
    root.appendChild(svg('text', { x: pad + 6, y: H - pad - 14, 'font-size': 11, fill: '#152033', text: '500 ม.' }));
    root.appendChild(svg('text', { x: W - pad - 6, y: pad + 16, 'font-size': 12, 'text-anchor': 'end', fill: '#152033', 'font-weight': 600, text: 'N ↑' }));
    var shown = pts.filter(function (p) { return !p.outOfCampusBox; });
    shown.forEach(function (p) {
      var c = svg('circle', { cx: px(p.lng), cy: py(p.lat), r: 7, fill: p.type === V ? C.c1 : C.c2, 'fill-opacity': .85, tabindex: 0, role: 'button', 'aria-label': p.type + ' ' + p.place + ' ' + mLabel(p.month), class: p.i === state.sel ? 'sel' : '', onclick: function () { state.sel = p.i; renderMap(); }, onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); state.sel = p.i; renderMap(); } } });
      c.appendChild(svg('title', { text: p.type + ' · ' + p.place + ' · ' + mLabel(p.month) })); root.appendChild(c);
    });
    if (useG) renderGoogleMap(box, pts, b); else box.appendChild(root);
    box.appendChild(el('div', { class: 'legend' }, [el('span', {}, [el('i', { style: 'background:' + C.c1 }), V]), el('span', {}, [el('i', { style: 'background:' + C.c2 }), G])]));
    $('mapNote').textContent = num(pts.length) + ' จุดในช่วง ' + rangeText() + ' · ที่มา: รายงานเหตุการณ์ · อัปเดต ' + dLabel(am.updated);
    var det = $('mapDetail'), sel = am.points[state.sel], emb = $('mapEmbed'); det.textContent = ''; emb.textContent = ''; emb.hidden = true;
    if (sel && pts.indexOf(sel) >= 0) {
      det.appendChild(el('div', {}, [el('strong', { text: sel.place })]));
      det.appendChild(el('div', { text: sel.type + ' · ' + mLabel(sel.month) + ' · พิกัด ' + sel.lat.toFixed(6) + ', ' + sel.lng.toFixed(6) + (sel.outOfCampusBox ? ' (อยู่นอกกรอบวิทยาเขต ควรตรวจสอบ)' : '') }));
      det.appendChild(el('a', { class: 'btn', href: mapsUrl(sel), target: '_blank', rel: 'noopener', text: 'เปิดตำแหน่งนี้ใน Google Maps' }));
      if (CFG.allowMapEmbed && !window.__HUB_PREVIEW__) { emb.hidden = false; emb.appendChild(el('iframe', { title: 'Google Maps: ' + sel.place, loading: 'lazy', referrerpolicy: 'no-referrer', src: 'https://www.google.com/maps?q=' + sel.lat + ',' + sel.lng + '&z=17&output=embed' })); }
    } else det.appendChild(el('div', { text: 'เลือกจุดบนแผนผังหรือในตาราง เพื่อดูตำแหน่งและเปิดใน Google Maps' }));
    list.appendChild(el('thead', {}, [el('tr', {}, [el('th', { text: 'เดือน' }), el('th', { text: 'ประเภท / สถานที่' }), el('th', { text: 'แผนที่' })])]));
    var tb = el('tbody');
    pts.slice().sort(function (a, c) { return a.month < c.month ? 1 : a.month > c.month ? -1 : 0; }).forEach(function (p) {
      tb.appendChild(el('tr', { class: p.i === state.sel ? 'sel' : '' }, [
        el('td', { text: mLabel(p.month) }),
        el('td', {}, [el('span', { class: 'dot', style: 'background:' + (p.type === V ? C.c1 : C.c2) }), el('button', { type: 'button', class: 'btn-ghost', style: 'padding:1px 6px;border:0;background:none;text-align:left;cursor:pointer;font:inherit', text: p.place + (p.outOfCampusBox ? ' (นอกกรอบ)' : ''), onclick: function () { state.sel = p.i; renderMap(); } })]),
        el('td', {}, [el('a', { href: mapsUrl(p), target: '_blank', rel: 'noopener', text: 'เปิด' })])]));
    });
    if (!pts.length) tb.appendChild(el('tr', {}, [el('td', { colspan: 3, class: 'empty', text: 'ไม่มีจุดในช่วงที่เลือก' })]));
    list.appendChild(tb);
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
      case 'satisfactionCentral': return [[m.responses, 'ผู้ตอบ']].concat(Object.keys(m.avg).map(function (x) { return [m.avg[x].toFixed(2), x]; }));
      case 'satisfactionUnit': return [[m.records, 'รายการบันทึก'], [m.respondents, 'ผู้ตอบรวม']].concat(Object.keys(m.avg).slice(0, 3).map(function (x) { return [m.avg[x].toFixed(2), x]; }));
      case 'graduationParking': return [[m.lots, 'ลานจอด'], [m.capacity, 'ความจุรวม (คัน)']].concat(m.days.map(function (d) { return [d.latestCount, dLabel(d.date).replace(/ \d{4}$/, '') + ' (' + d.occupancyPercent + '%)']; }));
      case 'vehicleRegistration': return Object.keys(m.rows).map(function (x) { return [m.rows[x], x]; });
      default: return [];
    }
  }
  function sysCard(s) {
    var m = s.stat ? mod(s.stat) : null, kids = [el('span', { class: 'pill s-' + s.status, text: STATUS[s.status] || s.status }), el('h3', { text: s.name }), el('p', { class: 'sys-desc', text: s.desc })];
    var st = (s.stat && s.id !== 'veh-student') ? statsFor(s.stat) : (s.id === 'veh-student' ? statsFor(s.stat).slice(2) : []);
    if (s.id === 'veh-staff') st = st.slice(0, 2);
    if (st.length) kids.push(el('div', { class: 'stats' }, st.map(function (x) { return el('div', { class: 'stat' }, [el('b', { text: x[0] == null ? 'ไม่มีข้อมูลยืนยัน' : (typeof x[0] === 'number' ? num(x[0]) : x[0]) }), el('span', { text: x[1] })]); })));
    else if (s.status === 'blocked' || s.status === 'unverified') kids.push(el('div', { class: 'stat' }, [el('b', { text: s.status === 'blocked' ? 'ยังเชื่อมต่อไม่ได้' : 'ไม่มีข้อมูลยืนยัน' }), el('span', { text: 'ยังไม่แสดงสถิติจนกว่าจะยืนยันแหล่งข้อมูลได้' })]));
    if (m && (m.updated || m.source)) kids.push(el('div', { class: 'sys-meta', text: 'ที่มา: ' + (m.source || '-') + (m.updated ? ' · อัปเดตล่าสุด ' + dLabel(m.updated) : '') }));
    if (m && m.definition) kids.push(el('div', { class: 'sys-meta', text: 'นิยาม: ' + m.definition }));
    if (m && m.notes && m.notes.length) kids.push(el('ul', { class: 'notes' }, m.notes.map(function (n) { return el('li', { text: n }); })));
    if (s.note) kids.push(el('ul', { class: 'notes plain' }, [el('li', { text: s.note })]));
    if (s.links.length) kids.push(el('div', { class: 'btns' }, s.links.map(function (l, i) { return el('a', { class: 'btn' + (i ? ' sec' : ''), href: l.url, target: '_blank', rel: 'noopener' }, [l.label, l.verified ? null : el('small', { text: ' (ยังไม่ได้ยืนยันลิงก์)' })]); })));
    else kids.push(el('div', { class: 'sys-meta', text: 'ไม่มีลิงก์สำหรับผู้ใช้ที่ยืนยันได้' }));
    return el('article', { class: 'card sys' }, kids);
  }
  function renderCats() {
    var box = $('cats'); box.textContent = '';
    DATA.systems.categories.forEach(function (c) {
      box.appendChild(el('section', { 'data-cat': c.id, id: 'cat-' + c.id, 'aria-label': c.name }, [
        el('div', { class: 'sec-head' }, [el('h2', { text: c.name }), el('p', { class: 'sec-note', text: c.systems.length + ' ระบบ' })]),
        el('div', { class: 'cat-grid' }, c.systems.map(sysCard))]));
    });
  }
  function renderAbout() {
    var ul = $('aboutList'); ul.textContent = '';
    [DATA.stats.method,
      'หน้านี้แสดงเฉพาะสถิติรวม ไม่แสดงชื่อ เบอร์โทร ทะเบียนรถ รายละเอียดผู้แจ้งเหตุ หรือภาพถ่าย และไม่มีรหัสผ่าน/API key อยู่ในหน้าเว็บ',
      'ตัวเลขทุกตัวระบุแหล่งข้อมูลและเวลาอัปเดตล่าสุดของแหล่งนั้น ระบบที่ยังยืนยันแหล่งข้อมูลไม่ได้จะแสดงสถานะ “ยังเชื่อมต่อไม่ได้” หรือ “ไม่มีข้อมูลยืนยัน” แทนตัวเลข',
      'วันที่และเดือนตีความตามเขตเวลา Asia/Bangkok และแสดงปีเป็น พ.ศ.',
      'ตัวกรองช่วงเดือนมีผลกับ: เหตุการณ์, รถเข้า/หมวกนิรภัย, ของหาย, คำขอ CCTV และแผนที่อุบัติเหตุ'].forEach(function (t) { ul.appendChild(el('li', { text: t })); });
  }
  function renderAll() { renderKpis(); renderCharts(); renderMap(); applyCat(); }

  load().then(function (d) {
    DATA = d; collectMonths(); renderStamp(); renderFilters(); renderCats(); renderAbout(); renderAll();
  }).catch(function (e) {
    $('stamp').textContent = 'โหลดข้อมูลไม่สำเร็จ';
    showBanner('ยังเชื่อมต่อไฟล์สถิติรวมไม่ได้: ' + e.message + ' — หน้านี้จะไม่แสดงตัวเลขใด ๆ จนกว่าจะโหลดข้อมูลจริงได้');
  });
})();
