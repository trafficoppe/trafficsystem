// ================= GLOBAL CONFIGURATION & HELPER FUNCTIONS =================

function toggleSection(sectionId, iconId) {
    const content = document.getElementById(sectionId);
    const icon = document.getElementById(iconId);
    if (content.style.display === "none") {
        content.style.display = "block";
        if(icon) icon.classList.remove("rotated");
        if(sectionId === 'map-wrapper') {
            setTimeout(() => { if(map) map.invalidateSize(); }, 200);
        }
    } else {
        content.style.display = "none";
        if(icon) icon.classList.add("rotated");
    }
}

// Load Google Charts
google.charts.load('current', { packages: ['corechart'] });

// Global State Variables
let masterRows = [];
let car_masterList = [];
let car_filteredList = [];
let car_page = 1;
const CAR_ROWS_PER_PAGE = 7;
let currentChartMode = 'accidents'; 

// Thai Date Helpers
const daysInThai = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
function thaiMonthLong(m){return ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'][m];}
function beYear(y){return y+543;}

function formatThaiDateFull(d) { 
    return `วัน${daysInThai[d.getDay()]}ที่ ${d.getDate()} ${thaiMonthLong(d.getMonth())} ${beYear(d.getFullYear())}`; 
}

function formatThaiDate(d){ return `วันที่ ${d.getDate()} ${thaiMonthLong(d.getMonth())} ${beYear(d.getFullYear())}`; }
function pad(n){return String(n).padStart(2,'0');}

function formatMonthRange(s, e) {
    const sm = thaiMonthLong(s.getMonth()); const sy = beYear(s.getFullYear());
    const em = thaiMonthLong(e.getMonth()); const ey = beYear(e.getFullYear());
    if (sy === ey) { return sm === em ? `${sm} ${sy}` : `${sm} - ${em} ${sy}`; } 
    else { return `${sm} ${sy} - ${em} ${ey}`; }
}

function formatThaiTime(val) {
    if (val == null || val === '') return '-';
    if (Array.isArray(val)) return `${String(val[0]).padStart(2,'0')}.${String(val[1]).padStart(2,'0')} น.`;
    let str = String(val).trim();
    if (str.startsWith('Date(')) {
        const parts = str.match(/\d+/g);
        if (parts && parts.length >= 5) return `${String(parseInt(parts[3])).padStart(2,'0')}.${String(parseInt(parts[4])).padStart(2,'0')} น.`;
    }
    if (!isNaN(str) && !str.includes(':') && !str.includes(',') && str.length < 20) { 
            let num = parseFloat(str); if (num > 1) num = num - Math.floor(num); 
            const total = Math.round(num * 24 * 60); return `${String(Math.floor(total/60) % 24).padStart(2,'0')}.${String(total%60).padStart(2,'0')} น.`;
    }
    let match = str.match(/(\d{1,2})[:.,](\d{2})/);
    if (match) {
        let h = parseInt(match[1]); let m = parseInt(match[2]);
        if (h > 23 || m > 59) return str;
        if (str.match(/PM/i) && h < 12) h += 12;
        if (str.match(/AM/i) && h === 12) h = 0;
        return `${String(h).padStart(2,'0')}.${String(m).padStart(2,'0')} น.`;
    }
    return str;
}

function formatDurationHTML(totalUnits, prefix) {
    const h = Math.floor(totalUnits / 60);
    return `${h.toLocaleString()} <span class="${prefix === 'aw' ? 'aw-stat-unit' : 'tram-stat-unit'}">ชม.</span>`;
}

function getThaiDateString(rawDate, parsedDateObj) {
    if (parsedDateObj && !isNaN(parsedDateObj.getTime())) {
        return formatThaiDate(parsedDateObj);
    }
    if (typeof rawDate === 'string') {
        if (rawDate.includes('วันที่')) return rawDate; 
        let temp = new Date(rawDate);
        if (!isNaN(temp.getTime())) {
            if (temp.getFullYear() > 2400) temp.setFullYear(temp.getFullYear() - 543);
            return formatThaiDate(temp);
        }
    }
    return rawDate || '-';
}

function loadScript(url) { const s = document.createElement('script'); s.src = url; document.body.appendChild(s); }

// ================= INITIALIZATION & DATA LOADING =================

// Set Default Dates (Previous Month)
const now = new Date();
const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

const initDateStr = `${prevMonthStart.getFullYear()}-${pad(prevMonthStart.getMonth()+1)}-${pad(prevMonthStart.getDate())}`;
const endDateStr = `${prevMonthEnd.getFullYear()}-${pad(prevMonthEnd.getMonth()+1)}-${pad(prevMonthEnd.getDate())}`;

document.getElementById('incStart').value = initDateStr; document.getElementById('incEnd').value = endDateStr;
document.getElementById('awStart').value = initDateStr; document.getElementById('awEnd').value = endDateStr;

// Load Data from Google Sheets via JSONP
loadScript('https://docs.google.com/spreadsheets/d/1tj_BC_YkBBcin8FqqXB_OvOF5ku2Y24MTh04XmA9zTk/gviz/tq?tqx=responseHandler:handleAccidentData&gid=3452793');
loadScript('https://docs.google.com/spreadsheets/d/1hEFLf_CuzabHOIdCp_LWEU5M8Be_7bsx1aBZickoSXA/gviz/tq?tqx=out:json;responseHandler:handleCarData&sheet=จำนวนรถ');


// ================= PART 1: SAFETY DASHBOARD LOGIC =================

// Callback for Accident Data
window.handleAccidentData = function(json) {
    const rows = json.table.rows;
    masterRows = rows.map(r => {
        const c = r.c; const v = (i) => c[i] ? (c[i].v || '') : ''; const f = (i) => c[i] ? (c[i].f || c[i].v || '') : '';
        let d = null, dStr = '-';
        if(c[1]) {
            if(c[1].v && typeof c[1].v === 'string' && c[1].v.includes('Date')) {
                const p = c[1].v.match(/\d+/g); 
                if(p) { let year = parseInt(p[0]); if (year > 2400) year -= 543; d = new Date(year, p[1], p[2]); }
            } else if (!c[1].f) { 
                d = new Date(c[1].v); if(d && d.getFullYear() > 2400) d.setFullYear(d.getFullYear() - 543);
            }
        }
        if(d) dStr = formatThaiDate(d); else if(c[1] && c[1].f) dStr = c[1].f;
        
        let injStr = String(v(12)); let checkInjured = false;
        if(!injStr.includes('ไม่มี') && (injStr.includes('บาดเจ็บ') || injStr.includes('มีผู้'))) checkInjured = true;
        
        return {
            date: d, dateStr: dStr, rawDate: f(1), type: v(5), timeReport: formatThaiTime(v(7)), timeArrive: formatThaiTime(v(8)),
            place: v(6), vehicle: v(9), personType: v(10), injuryStatus: v(12), info: formatThaiTime(v(13)),
            injuredPerson: v(14), symptom: v(16), transport: v(22), dest: v(23), detail: v(29), img: v(30), bfCode: String(v(57)).trim(), 
            colH: v(7), colG: v(6), colJ: v(9), colK: v(10), colAD: v(29), colAE: v(30),
            isRoad: String(v(5)).includes('ว.40'), isGeneral: String(v(5)).includes('อุบัติเหตุทั่วไป') || String(v(5)).includes('รับส่งผู้ได้รับบาดเจ็บ'),
            isWork: String(v(5)).includes('อุบัติเหตุจากการทำงาน'), isDeath: String(v(12)).includes('เสียชีวิต') || String(v(16)).includes('เสียชีวิต'),
            hasInjury: checkInjured
        };
    });
    renderIncidentTable(); renderAccidentGrid(); setupGraphFromMasterRows();
};

// Callback for Car Gate Data
window.handleCarData = function(json) { 
    const rows = json.table.rows;
    car_masterList = [];
    rows.forEach(r => {
        const c = r.c;
        if(!c) return;

        let dObj = null;
        const cD = c[7];
        if(cD && cD.v) {
            if(typeof cD.v==='string' && cD.v.includes('Date')) {
                const parts = cD.v.match(/\d+/g);
                if(parts) dObj = new Date(parts[0], parts[1], parts[2]);
            } else {
                dObj = new Date(cD.v);
            }
        }
        if(!dObj || isNaN(dObj.getTime())) return;
        
        const gate1 = c[1] ? (c[1].v || 0) : 0;
        const gate3 = c[2] ? (c[2].v || 0) : 0;
        const gate4 = c[3] ? (c[3].v || 0) : 0;
        const gate5 = c[4] ? (c[4].v || 0) : 0;
        const gate6 = c[5] ? (c[5].v || 0) : 0;
        const total = gate1 + gate3 + gate4 + gate5 + gate6;

        car_masterList.push({
            dateObj: dObj,
            dateStr: formatThaiDate(dObj),
            gate1: gate1,
            gate3: gate3,
            gate4: gate4,
            gate5: gate5,
            gate6: gate6,
            total: total
        });
    });

    filterCarData(); 
};

function filterCarData() {
    const startInput = document.getElementById('incStart').value;
    const endInput = document.getElementById('incEnd').value;
    if(!startInput || !endInput) return;

    const s = new Date(startInput);
    const e = new Date(endInput);
    e.setHours(23,59,59);

    car_filteredList = car_masterList.filter(item => item.dateObj >= s && item.dateObj <= e);
    car_filteredList.sort((a, b) => b.dateObj - a.dateObj); 
    car_page = 1;
    renderCarTable();
}

function renderCarTable() {
    const tbody = document.getElementById('carBody');
    if(!tbody) return;
    tbody.innerHTML = '';
    const start = (car_page - 1) * CAR_ROWS_PER_PAGE;
    const items = car_filteredList.slice(start, start + CAR_ROWS_PER_PAGE);
    const totalPages = Math.ceil(car_filteredList.length / CAR_ROWS_PER_PAGE);

    if(items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="px-6 py-4 text-center text-gray-400">ไม่มีข้อมูล</td></tr>';
    } else {
        items.forEach(d => {
            tbody.innerHTML += `
                <tr class="hover:bg-blue-50 border-b interactive-row">
                    <td class="px-6 py-4 text-center text-gray-800" style="font-size:24px;">${d.dateStr}</td>
                    <td class="px-6 py-4 text-center text-gray-600" style="font-size:28px;">${d.gate1.toLocaleString()}</td>
                    <td class="px-6 py-4 text-center text-gray-600" style="font-size:28px;">${d.gate3.toLocaleString()}</td>
                    <td class="px-6 py-4 text-center text-gray-600" style="font-size:28px;">${d.gate4.toLocaleString()}</td>
                    <td class="px-6 py-4 text-center text-gray-600" style="font-size:28px;">${d.gate5.toLocaleString()}</td>
                    <td class="px-6 py-4 text-center text-gray-600" style="font-size:28px;">${d.gate6.toLocaleString()}</td>
                    <td class="px-6 py-4 text-center text-blue-600 font-bold" style="font-size:34px;">${d.total.toLocaleString()}</td>
                </tr>`;
        });
    }

    const emptyRows = CAR_ROWS_PER_PAGE - items.length;
    if (emptyRows > 0) {
        for (let i = 0; i < emptyRows; i++) {
            tbody.innerHTML += `
                <tr class="border-b empty-row" style="height: 80px;">
                    <td class="px-6 py-4">&nbsp;</td>
                    <td class="px-6 py-4">&nbsp;</td>
                    <td class="px-6 py-4">&nbsp;</td>
                    <td class="px-6 py-4">&nbsp;</td>
                    <td class="px-6 py-4">&nbsp;</td>
                    <td class="px-6 py-4">&nbsp;</td>
                    <td class="px-6 py-4">&nbsp;</td>
                </tr>`;
        }
    }
    updatePaginationCar(car_page, totalPages, car_filteredList.length);
}

function changePageCar(dir) {
    if (car_page + dir >= 1 && car_page + dir <= Math.ceil(car_filteredList.length / CAR_ROWS_PER_PAGE)) {
        car_page += dir;
        renderCarTable();
    }
}

function updatePaginationCar(page, total, count) {
    const pageInfo = document.getElementById('car_pageInfo');
    const prevBtn = document.getElementById('car_prevBtn');
    const nextBtn = document.getElementById('car_nextBtn');
    const container = document.getElementById('car_pageNumbers');
    if(!pageInfo || !prevBtn || !nextBtn || !container) return;

    pageInfo.textContent = `หน้า ${page} / ${total || 1} (รวม ${count} วัน)`;
    prevBtn.disabled = page === 1;
    nextBtn.disabled = page === total || total === 0;
    
    container.innerHTML = '';
    for(let i=1; i<=total; i++) {
        if(i === 1 || i === total || (i >= page - 1 && i <= page + 1)) {
            let btn = document.createElement('button');
            btn.textContent = i;
            btn.onclick = () => { car_page = i; renderCarTable(); };
            btn.className = `page-number-btn ${i === page ? 'bg-blue-600 text-white' : 'bg-white border text-gray-700'}`;
            container.appendChild(btn);
        } else if (container.lastChild?.textContent !== '...') {
            let span = document.createElement('span');
            span.textContent = '...';
            span.className = 'text-gray-400 text-xs self-center';
            container.appendChild(span);
        }
    }
}

let incFilteredList = [];
function renderIncidentTable() {
    const sInput = document.getElementById('incStart').value;
    const eInput = document.getElementById('incEnd').value;
    if(!sInput || !eInput) return;
    const s = new Date(sInput); const e = new Date(eInput); e.setHours(23,59,59);
    
    document.getElementById('incMonthLabel').innerText = formatMonthRange(s, e);
    incFilteredList = masterRows.filter(r => r.date && r.date >= s && r.date <= e);
    const counts = {};
    incFilteredList.forEach(r => { let t = r.type || 'ไม่ระบุ'; if(t === 'ว.40') t = 'อุบัติเหตุจากยานพาหนะ'; counts[t] = (counts[t] || 0) + 1; });
    const tbody = document.querySelector('#incTable tbody');
    if(!Object.keys(counts).length) { tbody.innerHTML = '<tr><td colspan="2" style="color:red; text-align:center;">ไม่พบข้อมูล</td></tr>'; return; }
    
    const order = ['อุบัติเหตุจากการทำงาน', 'อุบัติเหตุทั่วไป', 'อุบัติเหตุจากยานพาหนะ', 'รับส่งผู้ได้รับบาดเจ็บ', 'รับส่งผู้ป่วย'];
    const sorted = Object.entries(counts).sort((a, b) => {
        const aIdx = order.indexOf(a[0]); const bIdx = order.indexOf(b[0]);
        if(aIdx === -1 && bIdx === -1) return 0; if(aIdx === -1) return 1; if(bIdx === -1) return -1;
        return aIdx - bIdx;
    });
    tbody.innerHTML = sorted.map(([k,v]) => `<tr class="interactive-row" onclick="openIncidentPopup('${k}')"><td style="font-size: 28px !important; text-align: center !important;">${k}</td><td style="font-size: 38px !important; font-weight: 900; color: #2563eb; text-align: center !important;">${v}</td></tr>`).join('');
    renderLostFoundStats();
}

let accFilteredList = [];
function renderAccidentGrid() {
    const sInput = document.getElementById('incStart').value;
    const eInput = document.getElementById('incEnd').value;
    if(!sInput || !eInput) return;
    const s = new Date(sInput); const e = new Date(eInput); e.setHours(23,59,59);
    
    document.getElementById('accTitle').innerText = `สรุปอุบัติเหตุเดือน ${formatMonthRange(s, e)}`;
    accFilteredList = masterRows.filter(r => r.date && r.date >= s && r.date <= e);
    let st = { road:0, gen:0, work:0, injTotal:0, injRoad:0, injGen:0, injWork:0, stu:0, staff:0, ext:0, out:0, death:0, bike:0, motor:0, car:0, bus:0 };
    
    accFilteredList.forEach(r => {
        if(r.isRoad) st.road++; if(r.isGeneral) st.gen++; if(r.isWork) st.work++; if(r.isDeath) st.death++;
        if(r.hasInjury) {
            st.injTotal++; 
            if(r.isRoad) st.injRoad++; else if(r.isWork) st.injWork++; else st.injGen++;
            const p = String(r.injuredPerson||'').trim();
            if(p && p.includes('นักศึกษา')) st.stu++; if(p && p.includes('บุคลากร')) st.staff++; if(p && p.includes('บุคคลภายนอก')) st.ext++; if(p && p.includes('Outsource')) st.out++;
        }
        const v = r.vehicle||'';
        if(v.includes('จักรยาน') && !v.includes('ยนต์') && !/motor/i.test(v)) st.bike++;
        if(v.includes('จักรยานยนต์') || /motor/i.test(v)) st.motor++;
        if(v.includes('รถยนต์') || /car/i.test(v)) st.car++;
        if(v.includes('รถบัส') || /bus/i.test(v)) st.bus++;
    });

    const set = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
    set('totalCount', st.road+st.gen+st.work); set('roadN', st.road); set('generalN', st.gen); set('workN', st.work);
    set('injTotal', st.injTotal); set('injRoad', st.injRoad); set('injGeneral', st.injGen); set('injWork', st.injWork);
    set('injPersonTotal', st.stu+st.staff+st.ext+st.out); set('injStudent', st.stu); set('injStaff', st.staff); set('injExternal', st.ext); set('injOutsource', st.out);
    set('deathTotal', st.death); set('vehBicycle', st.bike); set('vehMotorcycle', st.motor); set('vehCar', st.car); set('vehBus', st.bus);
}

window.updateChartMode = function(mode) {
    currentChartMode = mode;
    drawMonthlyChart();
    document.getElementById('chart_monthly_W40').scrollIntoView({behavior: 'smooth', block: 'center'});
}

function setupGraphFromMasterRows() {
    if (!masterRows || masterRows.length === 0) return;
    const yearsSet = new Set(); masterRows.forEach(r => { if(r.date) yearsSet.add(r.date.getFullYear()); });
    const sortedYears = Array.from(yearsSet).sort((a, b) => b - a);
    const selectEl = document.getElementById('yearSelect'); 
    if(!selectEl) return;
    selectEl.innerHTML = '';
    if (sortedYears.length === 0) { const option = document.createElement('option'); option.text = "ไม่มีข้อมูล"; selectEl.add(option); return; }
    sortedYears.forEach(year => { if (year > 2100) return; const option = document.createElement('option'); option.value = year; option.text = `พ.ศ. ${year + 543}`; selectEl.add(option); });
    selectEl.addEventListener('change', () => drawMonthlyChart());
    drawMonthlyChart();
}

function drawMonthlyChart() {
    const selectEl = document.getElementById('yearSelect'); if (!selectEl || !selectEl.value) return;
    const selectedYear = parseInt(selectEl.value); if (isNaN(selectedYear)) return;
    
    let dataArray = [];
    let colors = [];
    let titleStr = `จำนวนเหตุการณ์รายเดือน ปี พ.ศ. ${selectedYear + 543}`;
    const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

    if(currentChartMode === 'accidents') {
        titleStr = `สถิติอุบัติเหตุทั้งหมด ปี พ.ศ. ${selectedYear + 543}`;
        const w40Count = new Array(12).fill(0); const generalCount = new Array(12).fill(0); const workCount = new Array(12).fill(0);
        masterRows.forEach(r => { if (!r.date || r.date.getFullYear() !== selectedYear) return; const m = r.date.getMonth(); if(r.isRoad) w40Count[m]++; else if(r.isWork) workCount[m]++; else if(r.isGeneral) generalCount[m]++; });
        dataArray = [['เดือน', 'อุบัติเหตุจากยานพาหนะ', 'อุบัติเหตุจากการทำงาน', 'อุบัติเหตุทั่วไป']];
        for (let m = 0; m < 12; m++) { dataArray.push([monthNames[m], w40Count[m], workCount[m], generalCount[m]]); }
        colors = ['#2980b9', '#e74c3c', '#e67e22'];
    }
    else if(currentChartMode === 'injuries') {
        titleStr = `สถิติผู้ได้รับบาดเจ็บทั้งหมด ปี พ.ศ. ${selectedYear + 543}`;
        const roadInj = new Array(12).fill(0); const genInj = new Array(12).fill(0); const workInj = new Array(12).fill(0);
        masterRows.forEach(r => { if (!r.date || r.date.getFullYear() !== selectedYear || !r.hasInjury) return; const m = r.date.getMonth(); if(r.isRoad) roadInj[m]++; else if(r.isWork) workInj[m]++; else genInj[m]++; });
        dataArray = [['เดือน', 'บนถนน', 'ทั่วไป', 'ทำงาน']];
        for (let m = 0; m < 12; m++) { dataArray.push([monthNames[m], roadInj[m], genInj[m], workInj[m]]); }
        colors = ['#059669', '#d97706', '#b91c1c'];
    }
    else if(currentChartMode === 'person_types') {
        titleStr = `สถิติประเภทบุคคลผู้ได้รับบาดเจ็บ ปี พ.ศ. ${selectedYear + 543}`;
        const stuInj = new Array(12).fill(0); const staffInj = new Array(12).fill(0); const extInj = new Array(12).fill(0); const outInj = new Array(12).fill(0);
        masterRows.forEach(r => { if (!r.date || r.date.getFullYear() !== selectedYear || !r.hasInjury) return; const m = r.date.getMonth(); const p = String(r.injuredPerson||'').trim(); if(p.includes('นักศึกษา')) stuInj[m]++; if(p.includes('บุคลากร')) staffInj[m]++; if(p.includes('บุคคลภายนอก')) extInj[m]++; if(p.includes('Outsource')) outInj[m]++; });
        dataArray = [['เดือน', 'นักศึกษา', 'บุคลากร', 'ภายนอก', 'Outsource']];
        for (let m = 0; m < 12; m++) { dataArray.push([monthNames[m], stuInj[m], staffInj[m], extInj[m], outInj[m]]); }
        colors = ['#7c3aed', '#2563eb', '#db2777', '#059669'];
    }
    else if(currentChartMode === 'deaths') {
        titleStr = `สถิติผู้เสียชีวิตรายเดือน ปี พ.ศ. ${selectedYear + 543}`;
        const deathCount = new Array(12).fill(0);
        masterRows.forEach(r => { if (!r.date || r.date.getFullYear() !== selectedYear || !r.isDeath) return; const m = r.date.getMonth(); deathCount[m]++; });
        dataArray = [['เดือน', 'ผู้เสียชีวิต']];
        for (let m = 0; m < 12; m++) { dataArray.push([monthNames[m], deathCount[m]]); }
        colors = ['#991b1b'];
    }
    
    if(dataArray.length <= 1) return; // No data to draw
    const data = google.visualization.arrayToDataTable(dataArray);
    
    const options = { 
        title: titleStr, 
        titleTextStyle: { fontSize: 32, color: '#000000', bold: true, fontName: 'TH Sarabun New' }, 
        colors: colors, 
        fontName: 'TH Sarabun New', 
        chartArea: { left: '5%', top: '22%', width: '90%', height: '65%' }, 
        vAxis: { 
            minValue: 0, 
            format: 'decimal', 
            textStyle: { fontSize: 24, color: '#000000', bold: true } 
        }, 
        hAxis: { 
            textStyle: { fontSize: 26, color: '#000000', bold: true } 
        }, 
        legend: { 
            position: 'top', 
            alignment: 'center', 
            textStyle: { fontSize: 26, color: '#000000', bold: true } 
        }, 
        animation: { startup: true, duration: 600, easing: 'out' }, 
        bar: { groupWidth: '55%' } 
    };
    
    const chart = new google.visualization.ColumnChart(document.getElementById('chart_monthly_W40')); 
    chart.draw(data, options);
}


// ================= PART 2: MAP MANAGER LOGIC =================

// Google Apps Script Web App URL
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyXH8E8I7HOkoK8rVu7hu6glL0-ILKjyzPtZXb9Ixx5RnxlkJXAkLLlV8S-mZ_tviYJjQ/exec'; 

// Map Configuration
const vehicleMap = { 'car': { icon: 'car', color: 'red' }, 'motorcycle': { icon: 'motorcycle', color: 'red' }, 'bus': { icon: 'bus', color: 'blue' }, 'bicycle': { icon: 'bicycle', color: 'blue' }, 'landmark': { icon: 'building', color: 'purple' } };
const mahidolCenter = [13.7946, 100.3235]; 
const mahidolBounds = L.latLngBounds([13.785, 100.308], [13.810, 100.340]);

// Initialize Leaflet Map
const map = L.map('map', { center: mahidolCenter, zoom: 16, minZoom: 4, maxZoom: 20, zoomControl: false, scrollWheelZoom: false, doubleClickZoom: false });

// Map Interaction
map.on('dblclick', function(e) { const currentZoom = map.getZoom(); if (currentZoom > 16) map.setZoom(16); else map.setView(e.latlng, 18); });
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map);

// Map State Variables
let layerData = {}; 
let currentLayerId = null; 
const MAP_ITEMS_PER_PAGE = 12; 
let mapCurrentPage = 1; 
let isAddingMarker = false; 
let isSmallViewMode = false;

// Load Map Data from Sheet
async function loadDataFromSheet() {
    const loadingOverlay = document.getElementById('map-loading-overlay');
    if(loadingOverlay) loadingOverlay.style.display = 'flex';
    const statusText = document.getElementById('status-text'); 
    if(statusText) statusText.innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i> กำลังโหลด...';
    
    try {
        const response = await fetch(WEB_APP_URL); 
        const rows = await response.json();
        
        // Clear existing layers
        Object.keys(layerData).forEach(k => map.removeLayer(layerData[k].group));
        layerData = {}; 
        
        if (rows.length === 0) {
            initDefaultLayer();
        } else {
            rows.forEach(row => {
                const id = row[0]; const layerId = row[1]; const layerName = row[14];
                if (!layerData[layerId]) layerData[layerId] = { group: L.layerGroup().addTo(map), name: layerName || 'Unnamed Layer', markers: [], visible: true, expanded: true };
                if (id !== 'LAYER_ONLY') {
                    let mDate = row[4] ? new Date(row[4]) : null; if (mDate && mDate.getFullYear() > 2500) mDate.setFullYear(mDate.getFullYear() - 543);
                    let mData = { id: id, lat: row[2], lon: row[3], layerId: layerId, date: row[4], dateObj: mDate, colH: row[5], colG: row[6], colJ: row[7], colK: row[8], colAD: row[9], colAE: row[10], eventType: row[11], icon: row[12], color: row[13] };
                    createMarkerOnMap(layerId, mData);
                }
            });
        }
        const keys = Object.keys(layerData).reverse(); if(keys.length > 0) currentLayerId = keys[0];
        renderSidebar(); 
        if(statusText) {
            statusText.innerHTML = '<i class="fa fa-check-circle"></i> เชื่อมต่อแล้ว'; 
            statusText.style.color = '#188038';
        }
    } catch (e) {
        console.error("Load Error:", e); 
        if(statusText) {
            statusText.innerHTML = '<i class="fa fa-exclamation-triangle"></i> ผิดพลาด'; 
            statusText.style.color = '#d93025'; 
        }
        initDefaultLayer();
    } finally { 
        if(loadingOverlay) loadingOverlay.style.display = 'none'; 
    }
}

function initDefaultLayer() { let initialId = 'Layer_' + Date.now(); layerData[initialId] = { group: L.layerGroup().addTo(map), name: 'Layer 1', markers: [], visible: true, expanded: true }; currentLayerId = initialId; renderSidebar(); }

// Save Map Data to Sheet (Bulk Update)
async function saveToSheet() {
    const statusText = document.getElementById('status-text'); 
    if(statusText) {
        statusText.innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i> กำลังบันทึก...'; 
        statusText.style.color = '#fbbc04';
    }
    
    let dataToSend = [];
    Object.keys(layerData).forEach(lid => {
        const layer = layerData[lid];
        if (layer.markers.length === 0) dataToSend.push(['LAYER_ONLY', lid, '', '', '', '', '', '', '', '', '', '', '', '', layer.name]);
        else layer.markers.forEach(m => { dataToSend.push([m.id, lid, m.lat, m.lon, m.date, m.colH, m.colG, m.colJ, m.colK, m.colAD, m.colAE, m.eventType, m.icon, m.color, layer.name]); });
    });
    
    try { 
        await fetch(WEB_APP_URL, { method: 'POST', body: JSON.stringify({ action: 'bulk', data: dataToSend }), mode: 'no-cors' }); 
        if(statusText) {
            statusText.innerHTML = '<i class="fa fa-check-circle"></i> บันทึกแล้ว'; 
            statusText.style.color = '#188038'; 
        }
    } catch (e) { 
        console.error("Save Error:", e); 
        if(statusText) {
            statusText.innerHTML = '<i class="fa fa-exclamation-circle"></i> บันทึกไม่สำเร็จ'; 
            statusText.style.color = '#d93025'; 
        }
    }
}


// ================= MODAL & UI FUNCTIONS =================

// Open Unified Modal for Map Marker Details
function openMarkerModal(mData) {
    const img = processMapImageLink(mData.colAE);
    const imgHtml = img ? `<div class="evidence-container"><img src="${img}" class="evidence-img" referrerpolicy="no-referrer"></div>` : '';
    const displayDate = getThaiDateString(mData.date, mData.dateObj);
    
    const details = `
        <div class="kv">
            <div class="k">วันที่</div><div class="v">${displayDate}</div>
            ${mData.colH ? `<div class="k">เวลา</div><div class="v">${formatThaiTime(mData.colH)}</div>` : ''}
            ${mData.colG ? `<div class="k">สถานที่</div><div class="v">${mData.colG}</div>` : ''}
            ${mData.colJ ? `<div class="k">ยานพาหนะ</div><div class="v">${mData.colJ}</div>` : ''}
            ${mData.colK ? `<div class="k">บุคคล</div><div class="v">${mData.colK}</div>` : ''}
            ${mData.colAD ? `<div class="k">รายละเอียด</div><div class="v">${mData.colAD}</div>` : ''}
        </div>`;

    document.getElementById('dashModalTitle').textContent = 'รายละเอียดข้อมูลหมุด';
    document.getElementById('detailCard').innerHTML = `
        ${imgHtml}
        ${details}
    `;

    // Hide navigation for map markers
    document.querySelector('.nav-wrapper').style.display = 'none';
    const markerDetailBtn = document.getElementById('markerDetailButton');
    if(markerDetailBtn) markerDetailBtn.style.display = 'none';

    document.getElementById('dashModalBackdrop').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function createMarkerOnMap(layerId, mData) {
    const marker = L.marker([mData.lat, mData.lon], { draggable: true });
    updateMarkerIcon(marker, mData);
    
    // Click marker to open details modal
    marker.on('click', function() {
        openMarkerModal(mData);
    });
    
    // Drag marker to update location
    marker.on('dragend', function(e) {
        if (!mahidolBounds.contains(marker.getLatLng())) { marker.setLatLng([mData.lat, mData.lon]); return; }
        const pos = marker.getLatLng(); mData.lat = pos.lat; mData.lon = pos.lng;
        saveToSheet();
    });
    marker.markerData = mData; // Store data in marker object
    layerData[layerId].markers.push(mData);
    layerData[layerId].group.addLayer(marker);
}

function processMapImageLink(url) {
    if (!url || typeof url !== 'string') return '';
    if (url.match(/\.(jpeg|jpg|gif|png|webp)$/) != null) return url;
    if (url.indexOf('drive.google.com') !== -1) {
        let id = ''; let match = url.match(/\/d\/([a-zA-Z0-9_-]+)/); if (match) id = match[1];
        if (!id) { match = url.match(/id=([a-zA-Z0-9_-]+)/); if (match) id = match[1]; }
        if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
    }
    return url;
}

// Search & Autofill in Map Editor
function handleSearchKey(e) { if (e.keyCode === 13) { e.preventDefault(); searchStudentDataMap(); return false; } return true; }

function searchStudentDataMap() {
    const searchInput = document.getElementById('mapSearchInput');
    if(!searchInput) return;
    const code = searchInput.value.trim();
    if(!code) return alert("กรุณากรอกรหัส");
    const found = masterRows.find(r => r.bfCode === code);
    if(found) { 
        // Force display date in full Thai format
        document.getElementById('modalDate').value = getThaiDateString(found.rawDate || found.dateStr, found.date);
        document.getElementById('inputColG').value = found.colG; 
        document.getElementById('inputColH').value = found.colH; 
        document.getElementById('inputColJ').value = found.colJ; 
        document.getElementById('inputColK').value = found.colK; 
        document.getElementById('inputColAD').value = found.colAD; 
        document.getElementById('inputColAE').value = found.colAE; 
    } 
    else { 
        alert("ไม่พบข้อมูล"); 
        ['modalDate','inputColG','inputColH','inputColJ','inputColK','inputColAD','inputColAE'].forEach(id=> {
            const el = document.getElementById(id);
            if(el) el.value='';
        }); 
    }
}

// Toggle View Mode (Icons vs Dots)
function toggleViewMode() {
    isSmallViewMode = !isSmallViewMode; const btn = document.getElementById('toggle-view-btn');
    if(isSmallViewMode) { btn.innerHTML = '🔴'; btn.classList.add('active'); } else { btn.innerHTML = '👁️'; btn.classList.remove('active'); }
    Object.keys(layerData).forEach(id => { layerData[id].group.eachLayer(l => { if (l.markerData) updateMarkerIcon(l, l.markerData); }); });
}

function updateMarkerIcon(marker, data) {
    if (isSmallViewMode) {
        let c = (data.color === 'red') ? '#ea4335' : (data.color === 'purple') ? '#9c27b0' : '#1a73e8';
        marker.setIcon(L.divIcon({ className: 'custom-dot', html: `<div style="background-color:${c}; width:12px; height:12px; border-radius:50%; border:2px solid white; box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>`, iconSize: [12, 12], iconAnchor: [6, 6] }));
    } else { marker.setIcon(L.AwesomeMarkers.icon({ icon: data.icon, markerColor: data.color, prefix: 'fa' })); }
}

// Add Marker logic
function addMarkerToMap(lid, lat, lon) {
    const newId = Date.now(); const nowObj = new Date();
    let data = { id: newId, lat, lon, layerId: lid, date: formatThaiDate(nowObj), dateObj: nowObj, colH:'', colG:'', colJ:'', colK:'', colAD:'', colAE:'', eventType: 'car', icon: 'car', color: 'red' };
    createMarkerOnMap(lid, data); layerData[lid].expanded = true; renderSidebar(); openMapModal(lid, newId); saveToSheet();
}

function removeMarker(lid, mid) {
    if(!confirm("ลบหมุดนี้?")) return;
    const l = layerData[lid]; const idx = l.markers.findIndex(m => m.id === mid);
    if (idx > -1) { l.group.eachLayer(m => { if (m.markerData && m.markerData.id === mid) l.group.removeLayer(m); }); l.markers.splice(idx, 1); renderSidebar(); saveToSheet(); }
}

// Sidebar Interaction handlers
window.editMarker = function(e, lid, mid) { e.stopPropagation(); openMapModal(lid, mid); }
window.deleteMarkerItem = function(e, lid, mid) { e.stopPropagation(); removeMarker(lid, mid); }
window.changePageMap = function(d) { mapCurrentPage += d; renderSidebar(); }

// Render Sidebar UI
function renderSidebar() {
    const list = document.getElementById('layerList'); 
    if(!list) return;
    list.innerHTML = '';
    const allIds = Object.keys(layerData).reverse(); const total = allIds.length, pages = Math.ceil(total / MAP_ITEMS_PER_PAGE);
    if(mapCurrentPage > pages && pages > 0) mapCurrentPage = pages; if(mapCurrentPage < 1) mapCurrentPage = 1;
    const show = allIds.slice((mapCurrentPage-1)*MAP_ITEMS_PER_PAGE, mapCurrentPage*MAP_ITEMS_PER_PAGE);
    
    show.forEach(id => {
        const l = layerData[id];
        const card = document.createElement('div'); card.className = `layer-card ${currentLayerId===id?'active-layer':''}`;
        const head = document.createElement('div'); head.className = 'layer-header'; head.onclick = () => { if(currentLayerId!==id) { currentLayerId=id; renderSidebar(); } };
        const info = document.createElement('div'); info.className = 'layer-info';
        const chk = document.createElement('input'); chk.type = 'checkbox'; chk.checked = l.visible; chk.onclick = e => e.stopPropagation(); chk.onchange = function() { l.visible = this.checked; this.checked ? map.addLayer(l.group) : map.removeLayer(l.group); };
        const nameInput = document.createElement('input'); nameInput.className = 'layer-name-input'; nameInput.value = l.name; nameInput.onclick = e => e.stopPropagation(); nameInput.onchange = e => { l.name = e.target.value; saveToSheet(); };
        info.appendChild(chk); info.appendChild(nameInput);
        const acts = document.createElement('div'); acts.className = 'layer-actions';
        const acc = document.createElement('span'); acc.className = 'icon-btn'; acc.innerHTML = `<i class="fa fa-chevron-down toggle-accordion ${l.expanded?'open':''}"></i>`; acc.onclick = e => { e.stopPropagation(); l.expanded = !l.expanded; renderSidebar(); };
        const del = document.createElement('span'); del.className = 'icon-btn delete'; del.innerHTML = '<i class="fa fa-trash"></i>'; del.onclick = e => { e.stopPropagation(); if(Object.keys(layerData).length<=1) return alert('ต้องเหลือ 1 Layer'); if(confirm('ลบ Layer?')) { map.removeLayer(l.group); delete layerData[id]; if(currentLayerId===id) currentLayerId=Object.keys(layerData).reverse()[0]; renderSidebar(); saveToSheet(); } };
        acts.appendChild(acc); acts.appendChild(del); head.appendChild(info); head.appendChild(acts); card.appendChild(head);
        const items = document.createElement('div'); items.className = `marker-list-container ${l.expanded?'show':''}`;
        if(l.markers.length === 0) items.innerHTML = `<div style="padding:10px 15px; color:#999; font-size:0.8rem;">ว่างเปล่า</div>`;
        else {
            l.markers.forEach(m => {
                const it = document.createElement('div'); it.className = 'marker-item'; 
                it.onclick = e => { if(!e.target.closest('.icon-btn')) { openMarkerModal(m); } };
                const displayDate = getThaiDateString(m.date, m.dateObj);
                it.innerHTML = `<div class="marker-info"><i class="fa fa-${m.icon}" style="color:${m.color}"></i><span style="font-family: 'Prompt'; font-size: 0.9rem;">${displayDate}</span></div><div class="item-buttons"><span class="icon-btn edit" onclick="editMarker(event, '${id}', ${m.id})"><i class="fa fa-pencil"></i></span><span class="icon-btn delete" onclick="deleteMarkerItem(event, '${id}', ${m.id})"><i class="fa fa-trash"></i></span></div>`;
                items.appendChild(it);
            });
        }
        card.appendChild(items); list.appendChild(card);
    });
    
    // Pagination
    const pDiv = document.getElementById('paginationControls');
    if(pDiv) {
        if(pages > 1) { pDiv.style.display = 'flex'; pDiv.innerHTML = `<button onclick="changePageMap(-1)" ${mapCurrentPage===1?'disabled':''}><</button><span>${mapCurrentPage}/${pages}</span><button onclick="changePageMap(1)" ${mapCurrentPage===pages?'disabled':''}>></button>`; } else pDiv.style.display = 'none';
    }
    
    // Update Add Button State
    const addBtn = document.getElementById('addMarkerBtn'); 
    if(addBtn) {
        if(isAddingMarker) { addBtn.innerHTML = '<i class="fa fa-times"></i> ยกเลิก'; addBtn.classList.add('active-add-marker'); } else { addBtn.innerHTML = '<i class="fa fa-map-marker"></i> เพิ่มหมุด'; addBtn.classList.remove('active-add-marker'); }
    }
}

// Setup Sidebar Event Listeners
const addLayerBtn = document.getElementById('addLayerBtn');
if(addLayerBtn) {
    addLayerBtn.onclick = () => { 
        const id = 'L_'+Date.now(); 
        layerData[id]={group:L.layerGroup().addTo(map), name:'Layer ใหม่', markers:[], visible:true, expanded:true}; 
        currentLayerId = id; mapCurrentPage=1; renderSidebar(); saveToSheet(); 
        const layerList = document.getElementById('layerList');
        if(layerList) layerList.scrollTop = 0; 
    };
}

const addMarkerBtn = document.getElementById('addMarkerBtn');
if(addMarkerBtn) {
    addMarkerBtn.onclick = () => { isAddingMarker = !isAddingMarker; map._container.style.cursor = isAddingMarker?'crosshair':''; renderSidebar(); };
}

map.on('click', e => { if(isAddingMarker) { if(mahidolBounds.contains(e.latlng)) { addMarkerToMap(currentLayerId, e.latlng.lat, e.latlng.lng); isAddingMarker=false; map._container.style.cursor=''; } else alert('อยู่นอกพื้นที่'); } });

// Map Edit Modal Functions
const mapModal = document.getElementById('mapEditModal');

function openMapModal(lid, mid) {
    const m = layerData[lid].markers.find(x => x.id === mid); if(!m) return;
    document.getElementById('modalLayerId').value = lid; document.getElementById('modalMarkerId').value = mid;
    const searchInput = document.getElementById('mapSearchInput');
    if(searchInput) searchInput.value = ''; 
    
    // Force editor to show date in full Thai format
    document.getElementById('modalDate').value = getThaiDateString(m.date, m.dateObj); 
    
    document.getElementById('inputColH').value = m.colH||''; 
    document.getElementById('inputColG').value = m.colG||''; 
    document.getElementById('inputColJ').value = m.colJ||''; 
    document.getElementById('inputColK').value = m.colK||''; 
    document.getElementById('inputColAD').value = m.colAD||''; 
    document.getElementById('inputColAE').value = m.colAE||''; 
    document.getElementById('modalEventType').value = m.eventType; 
    document.querySelectorAll('input[name="markerColor"]').forEach(r => r.checked = (r.value===m.color));
    
    if(mapModal) {
        mapModal.style.display = 'block'; 
        document.body.style.overflow = 'hidden';
    }
}

function closeMapModal() { if(mapModal) mapModal.style.display = 'none'; document.body.style.overflow = ''; }

const markerEditForm = document.getElementById('markerEditForm');
if(markerEditForm) {
    markerEditForm.onsubmit = e => {
        e.preventDefault();
        const lid = document.getElementById('modalLayerId').value; const mid = parseFloat(document.getElementById('modalMarkerId').value);
        const m = layerData[lid].markers.find(x => x.id === mid);
        m.date = document.getElementById('modalDate').value; 
        m.colH = document.getElementById('inputColH').value; 
        m.colG = document.getElementById('inputColG').value; 
        m.colJ = document.getElementById('inputColJ').value; 
        m.colK = document.getElementById('inputColK').value; 
        m.colAD = document.getElementById('inputColAD').value; 
        m.colAE = document.getElementById('inputColAE').value; 
        m.eventType = document.getElementById('modalEventType').value; 
        m.color = document.querySelector('input[name="markerColor"]:checked').value; m.icon = vehicleMap[m.eventType].icon;
        
        layerData[lid].group.eachLayer(l => { 
            if(l.markerData && l.markerData.id === mid) { 
                updateMarkerIcon(l, m); 
            } 
        });
        closeMapModal(); renderSidebar(); saveToSheet();
    };
}

// Main execution call for map
loadDataFromSheet();


// ================= PART 1 & Lost & Found Popup Logic =================

const incFilterBtn = document.getElementById('incFilterBtn');
if(incFilterBtn) {
    incFilterBtn.addEventListener('click', function() { 
        renderIncidentTable(); 
        renderAccidentGrid(); 
        if(typeof filterCarData === 'function') filterCarData();
    });
}

// Dash Modal State
let dashModalList=[], dashModalIndex=0, dashModalMode='', accLayout='';
const dashModalBackdrop = document.getElementById('dashModalBackdrop'); 
const dashModalContent = document.getElementById('detailCard');
const dashModalCloseBtn = document.getElementById('dashModalClose');

if(dashModalCloseBtn) {
    dashModalCloseBtn.onclick = () => { 
        if(dashModalBackdrop) dashModalBackdrop.style.display = 'none'; 
        document.body.style.overflow = ''; 
        document.querySelector('.nav-wrapper').style.display = 'flex'; 
        const markerDetailBtn = document.getElementById('markerDetailButton');
        if(markerDetailBtn) markerDetailBtn.style.display = 'none'; 
    };
}

if(dashModalBackdrop) {
    dashModalBackdrop.addEventListener('click', function(e) {
        if (e.target === dashModalBackdrop) { 
            dashModalBackdrop.style.display = 'none'; 
            document.body.style.overflow = ''; 
            document.querySelector('.nav-wrapper').style.display = 'flex'; 
            const markerDetailBtn = document.getElementById('markerDetailButton');
            if(markerDetailBtn) markerDetailBtn.style.display = 'none'; 
        }
    });
}

if(mapModal) {
    mapModal.addEventListener('click', function(e) { if (e.target === mapModal) closeMapModal(); });
}

// Navigation in Dash Modal
const btnPrev = document.getElementById('btnPrev');
const btnNext = document.getElementById('btnNext');

window.navDashModal = function(step) { dashModalIndex += step; if(dashModalIndex < 0) dashModalIndex = 0; if(dashModalIndex >= dashModalList.length) dashModalIndex = dashModalList.length - 1; renderDashModal(); }

if(btnPrev) btnPrev.onclick = () => navDashModal(-1); 
if(btnNext) btnNext.onclick = () => navDashModal(1);

// Popup Opener Functions
window.openIncidentPopup = (t) => { 
    dashModalMode = 'incident'; let searchKey = t; if (t === 'อุบัติเหตุจากยานพาหนะ') searchKey = 'ว.40'; dashModalList = incFilteredList.filter(r => r.type === searchKey); dashModalIndex = 0; document.getElementById('dashModalTitle').textContent = t; dashModalBackdrop.style.display = 'flex'; document.body.style.overflow = 'hidden'; document.querySelector('.nav-wrapper').style.display = 'flex'; document.getElementById('markerDetailButton').style.display = 'none'; renderDashModal(); 
};

window.filterAccident = (k) => {
    dashModalMode = 'accident'; const all = accFilteredList; let title = '';
    if(k.startsWith('veh_')) accLayout = 'vehicle'; else if(k==='road' || k==='inj_road') accLayout = 'road_layout'; else accLayout = 'general';
    switch(k) {
        case 'road': title='อุบัติเหตุบนถนน'; dashModalList=all.filter(r=>r.isRoad); break;
        case 'general': title='อุบัติเหตุทั่วไป'; dashModalList=all.filter(r=>r.isGeneral); break;
        case 'work': title='อุบัติเหตุจากการทำงาน'; dashModalList=all.filter(r=>r.isWork); break;
        case 'death': title='ผู้เสียชีวิต'; dashModalList=all.filter(r=>r.isDeath); break;
        case 'inj_road': title='ผู้บาดเจ็บอุบัติเหตุบนถนน'; dashModalList=all.filter(r=>r.hasInjury && r.isRoad); break;
        case 'inj_work': title='ผู้บาดเจ็บจากการทำงาน'; dashModalList=all.filter(r=>r.hasInjury && !r.isRoad && r.isWork); break;
        case 'inj_general': title='ผู้บาดเจ็บทั่วไป'; dashModalList=all.filter(r=>r.hasInjury && !r.isRoad && !r.isWork); break; 
        case 'ps_student': title='ผู้บาดเจ็บ นักศึกษา'; dashModalList=all.filter(r=>r.hasInjury && (r.injuredPerson||'').includes('นักศึกษา')); break;
        case 'ps_staff': title='ผู้บาดเจ็บ บุคลากร'; dashModalList=all.filter(r=>r.hasInjury && (r.injuredPerson||'').includes('บุคลากร')); break;
        case 'ps_external': title='ผู้บาดเจ็บ บุคคลภายนอก'; dashModalList=all.filter(r=>r.hasInjury && (r.injuredPerson||'').includes('บุคคลภายนอก')); break;
        case 'ps_outsource': title='ผู้บาดเจ็บ Outsource'; dashModalList=all.filter(r=>r.hasInjury && (r.injuredPerson||'').includes('Outsource')); break;
        case 'veh_bicycle': title='เกี่ยวข้องกับจักรยาน'; dashModalList=all.filter(r=> (r.vehicle||'').includes('จักรยาน') && !(r.vehicle||'').includes('ยนต์')); break;
        case 'veh_motorcycle': title='เกี่ยวข้องกับจักรยานยนต์'; dashModalList=all.filter(r=> (r.vehicle||'').includes('จักรยานยนต์')); break;
        case 'veh_car': title='เกี่ยวข้องกับรถยนต์'; dashModalList=all.filter(r=> (r.vehicle||'').includes('รถยนต์')); break;
        case 'veh_bus': title='เกี่ยวข้องกับรถบัส'; dashModalList=all.filter(r=> (r.vehicle||'').includes('รถบัส')); break;
    }
    dashModalIndex = 0; document.getElementById('dashModalTitle').textContent = title; dashModalBackdrop.style.display = 'flex'; document.body.style.overflow = 'hidden'; document.querySelector('.nav-wrapper').style.display = 'flex'; document.getElementById('markerDetailButton').style.display = 'none'; renderDashModal();
}

function renderDashModal() {
    const caseCountEl = document.getElementById('caseCount');
    if(!caseCountEl) return;
    caseCountEl.textContent = `รายการที่ ${dashModalList.length ? dashModalIndex + 1 : 0} / ${dashModalList.length}`;
    document.getElementById('btnPrev').disabled = dashModalIndex <= 0; document.getElementById('btnNext').disabled = dashModalIndex >= dashModalList.length - 1;
    if(!dashModalList.length) { dashModalContent.innerHTML = '<div style="text-align:center;">ไม่มีข้อมูล</div>'; return; }
    const item = dashModalList[dashModalIndex]; let displayType = item.type; if(displayType.includes('ว.40')) displayType = 'อุบัติเหตุจากยานพาหนะ';
    let html = '';
    if(item.img) {
        let m = item.img.match(/id=([a-zA-Z0-9_-]+)/) || item.img.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if(m) html += `<div class="evidence-container"><img src="https://drive.google.com/thumbnail?id=${m[1]}&sz=w1200" class="evidence-img" referrerpolicy="no-referrer"></div>`;
        else html += `<div class="evidence-container"><a href="${item.img}" target="_blank">เปิดลิงก์ไฟล์แนบ</a></div>`;
    }
    
    if(dashModalMode === 'incident') {
        html += `<div class="kv"><div class="k">วันที่</div><div class="v">${item.dateStr}</div><div class="k">เวลาแจ้ง</div><div class="v">${item.timeReport}</div><div class="k">ประเภท</div><div class="v">${displayType}</div><div class="k">สถานที่</div><div class="v">${item.place}</div><div class="k">ข้อมูล</div><div class="v">${item.info}</div><div class="k">รายละเอียด</div><div class="v">${item.detail}</div></div>`;
    } else {
        if(accLayout === 'vehicle') html += `<div class="kv"><div class="k">วันที่</div><div class="v">${item.dateStr}</div><div class="k">เวลาแจ้ง</div><div class="v">${item.timeReport}</div><div class="k">ประเภท</div><div class="v">${displayType}</div><div class="k">สถานที่</div><div class="v">${item.place}</div></div>`;
        else if(accLayout === 'road_layout') html += `<div class="kv"><div class="k">วันที่</div><div class="v">${item.dateStr}</div><div class="k">เวลาแจ้ง</div><div class="v">${item.timeReport}</div><div class="k">สถานที่</div><div class="v">${item.place}</div><div class="k">ประเภท</div><div class="v">${displayType}</div><div class="k">เวลาถึง</div><div class="v">${item.timeArrive}</div><div class="k">ยานพาหนะ</div><div class="v">${item.vehicle}</div><div class="k">ผู้ประสบเหตุ</div><div class="v">${item.personType}</div><div class="k">รายละเอียด</div><div class="v">${item.detail}</div></div>`;
        else html += `<div class="kv"><div class="k">วันที่</div><div class="v">${item.dateStr}</div><div class="k">เวลาแจ้ง</div><div class="v">${item.timeReport}</div><div class="k">ประเภท</div><div class="v">${displayType}</div><div class="k">สถานที่</div><div class="v">${item.place}</div><div class="k">ข้อมูล</div><div class="v">${item.info}</div><div class="k">ผู้บาดเจ็บ</div><div class="v">${item.injuryStatus}</div><div class="k">อาการ</div><div class="v">${item.symptom}</div><div class="k">รถนำส่ง</div><div class="v">${item.transport}</div><div class="k">นำส่งที่</div><div class="v">${item.dest}</div><div class="k">รายละเอียด</div><div class="v">${item.detail}</div></div>`;
    }
    dashModalContent.innerHTML = html;
}

// Fix for date inputs on some browsers
document.addEventListener('DOMContentLoaded', function() {
    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach(input => { input.addEventListener('click', function(e) { if (typeof this.showPicker === 'function') { this.showPicker(); } }); });
});

// ================= PART 3: ANYWHEEL & TRAM LOGIC =================

const AW_SHEET_ID = '1glTfy2Ev1zmr4oqaRJAPKpBvHy-jHD0_-WOSFDd9HEA'; const AW_GID = '0';
const TRAM_SHEET_ID = '15xZD88BC_IF86Z_yoc89L6jU-SlZlfKg7wSZ9ErsDME'; const TRAM_GID = '1770371228';
let aw_masterList = []; let tram_masterList = []; 
let aw_currentDaily = [], aw_page = 1; let tram_currentDaily = [], tram_page = 1; const ROWS_PER_PAGE = 7;

async function initAnywheelTram() {
    loadScript(`https://docs.google.com/spreadsheets/d/${AW_SHEET_ID}/gviz/tq?tqx=responseHandler:handleAnywheelResponse&gid=${AW_GID}`);
    loadScript(`https://docs.google.com/spreadsheets/d/${TRAM_SHEET_ID}/gviz/tq?tqx=responseHandler:handleTramResponse&gid=${TRAM_GID}`);
}

window.handleAnywheelResponse = function(json) {
    const rows = json.table.rows; aw_masterList = [];
    rows.forEach(r => {
        const c = r.c; let d = null;
        if(c[0]) { if(c[0].v && typeof c[0].v === 'string' && c[0].v.includes('Date')) { const p = c[0].v.match(/\d+/g); if(p) d = new Date(p[0], p[1], p[2]); } else if (c[0].v) { d = new Date(c[0].v); } }
        if(!d || isNaN(d.getTime())) return;
        const count = c[2] ? (typeof c[2].v === 'number' ? c[2].v : parseFloat(c[2].v)) : 0; const dist = c[4] ? (typeof c[4].v === 'number' ? c[4].v : parseFloat(c[4].v)) : 0; const dur = c[5] ? (typeof c[5].v === 'number' ? c[5].v : parseFloat(c[5].v)) : 0;
        aw_masterList.push({ dateObj: d, dateStr: formatThaiDateFull(d), count: count || 0, dist: dist || 0, duration: dur || 0 });
    });
    filterAnywheelTram();
};

window.handleTramResponse = function(json) {
    const rows = json.table.rows; tram_masterList = [];
    rows.forEach(r => {
        const c = r.c; if(!c || c.length < 7) return; 
        let d = null;
        if(c[1]) { if(c[1].v && typeof c[1].v === 'string' && c[1].v.includes('Date')) { const p = c[1].v.match(/\d+/g); if(p) d = new Date(p[0], p[1], p[2]); } else if (c[1].v) { d = new Date(c[1].v); } }
        if(!d || isNaN(d.getTime())) return;
        
        // ดึงข้อมูลคอลัมน์ D (ส่วนงาน) - index 3
        const departmentStr = c[3] ? (c[3].v || 'ไม่ระบุ') : 'ไม่ระบุ';
        
        const durationVal = c[6] ? (c[6].v || 0) : 0; const durationRaw = typeof durationVal === 'number' ? durationVal : parseFloat(durationVal);
        const distVal = c[7] ? (c[7].v || 0) : 0; const tramsVal = c[8] ? (c[8].v || 0) : 0; const roundsVal = c[9] ? (c[9].v || 0) : 0; 
        
        tram_masterList.push({ 
            dateObj: d, 
            dateStr: formatThaiDateFull(d), 
            department: departmentStr,
            rounds: roundsVal || 0, 
            distance: distVal || 0, 
            trams: tramsVal || 0, 
            durationRaw: durationRaw || 0 
        });
    });
    filterAnywheelTram();
};

const awFilterBtn = document.getElementById('awFilterBtn');
if(awFilterBtn) {
    awFilterBtn.addEventListener('click', filterAnywheelTram);
}

function filterAnywheelTram() {
    const sStr = document.getElementById('awStart').value;
    const eStr = document.getElementById('awEnd').value;
    if(!sStr || !eStr) return;
    const s = new Date(sStr); const e = new Date(eStr); e.setHours(23,59,59);
    updateAnywheelStats(aw_masterList.filter(item => item.dateObj >= s && item.dateObj <= e));
    updateTramStats(tram_masterList.filter(item => item.dateObj >= s && item.dateObj <= e));
}

function updateAnywheelStats(data) {
    let totalCount = 0, totalDist = 0, totalDur = 0;
    data.forEach(item => { totalCount += item.count; totalDist += item.dist; totalDur += item.duration; });
    animateValue("aw_cardTrips", totalCount); animateValue("aw_cardDistance", totalDist, true); document.getElementById("aw_cardDuration").innerHTML = formatDurationHTML(totalDur, 'aw');
    aw_currentDaily = data.sort((a,b) => a.dateObj - b.dateObj); aw_page = 1; renderAnywheelTable();
}

function updateTramStats(data) {
    let count = 0, rounds = 0, dist = 0, trams = 0, totalDurationRaw = 0; 
    let dailyMap = {}; 
    let deptMap = {}; // สำหรับเก็บสถิติส่วนงาน

    data.forEach(item => {
        count++; rounds += item.rounds; dist += item.distance; trams += item.trams; totalDurationRaw += item.durationRaw; 
        
        if(!dailyMap[item.dateStr]) dailyMap[item.dateStr] = { date: item.dateStr, sortDate: item.dateObj, count: 0, rounds: 0, distance: 0, trams: 0, dailyDuration: 0 };
        const d = dailyMap[item.dateStr]; d.count++; d.rounds += item.rounds; d.distance += item.distance; d.trams += item.trams; d.dailyDuration += item.durationRaw;

        // นับจำนวนงานแต่ละส่วนงาน
        let dept = item.department;
        if (!deptMap[dept]) deptMap[dept] = 0;
        deptMap[dept]++;
    });
    
    const countEl = document.getElementById("tram_cardTrips");
    if(!countEl) return; // Views not loaded yet

    animateValue("tram_cardTrips", count); animateValue("tram_cardRounds", rounds); animateValue("tram_cardDistance", dist, true); animateValue("tram_cardTrams", trams);
    const hours = Math.floor(totalDurationRaw / 60); document.getElementById("tram_cardDuration").innerHTML = `${hours.toLocaleString()} <span class="tram-stat-unit">ชม.</span>`;
    
    tram_currentDaily = Object.values(dailyMap).sort((a,b) => a.sortDate - b.sortDate); tram_page = 1; renderTramTable();
    
    drawTramDeptChart(deptMap); // วาดกราฟส่วนงาน
}

function drawTramDeptChart(deptMap) {
    const chartDiv = document.getElementById('chart_tram_dept');
    if(!chartDiv) return;
    
    if(Object.keys(deptMap).length === 0) {
        chartDiv.innerHTML = '<div style="display:flex; justify-content:center; align-items:center; height:100%; color:#94a3b8; font-size:24px;">ไม่มีข้อมูลส่วนงาน</div>';
        return;
    }

    const dataArray = [['ส่วนงาน', 'จำนวนงาน', { role: 'style' }, { role: 'annotation' }]];
    const sortedDepts = Object.entries(deptMap).sort((a, b) => b[1] - a[1]); // เรียงจากมากไปน้อย
    
    // ชุดสีสำหรับแต่ละแท่งกราฟ
    const palette = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];
    
    sortedDepts.forEach(([dept, count], idx) => {
        // เติมช่องว่างด้านหลังชื่อส่วนงานเพื่อให้ห่างจากแท่งกราฟมากขึ้น และใส่ count ลงใน annotation
        dataArray.push([dept + '        ', count, palette[idx % palette.length], count]);
    });

    const data = google.visualization.arrayToDataTable(dataArray);
    
    // ดึงช่วงวันที่มาแสดงในชื่อกราฟ
    const sStr = document.getElementById('awStart').value;
    const eStr = document.getElementById('awEnd').value;
    if(!sStr || !eStr) return;
    const s = new Date(sStr);
    const e = new Date(eStr);
    const titleDate = formatMonthRange(s, e);

    const options = {
        title: 'สถิติการใช้บริการรถรางแยกตามส่วนงาน ประจำเดือน ' + titleDate,
        titleTextStyle: { fontSize: 32, color: '#000000', bold: true, fontName: 'TH Sarabun New' },
        fontName: 'TH Sarabun New',
        // ขยาย chartArea ให้กินพื้นที่มากที่สุด (ลดขอบขวาลง) และเผื่อซ้ายไว้สำหรับตัวหนังสือ
        chartArea: { left: '22%', right: '5%', top: '15%', bottom: '15%' }, 
        hAxis: { 
            title: 'จำนวนงาน (ครั้ง)', 
            titleTextStyle: { fontSize: 26, italic: false, color: '#475569', bold: true, fontName: 'TH Sarabun New' },
            minValue: 0, 
            textStyle: { fontSize: 24, color: '#000000', bold: true } 
        },
        vAxis: { 
            textStyle: { fontSize: 36, color: '#000000', bold: true } // ขยายตัวหนังสือส่วนงาน
        },
        legend: { position: 'none' },
        animation: { startup: true, duration: 600, easing: 'out' },
        bar: { groupWidth: '70%' },
        // ตั้งค่าการแสดงตัวเลขกำกับ (Annotation)
        annotations: {
            alwaysOutside: true,
            textStyle: {
                fontName: 'TH Sarabun New',
                fontSize: 26,
                color: '#000000',
                bold: true
            }
        }
    };

    const chart = new google.visualization.BarChart(chartDiv);
    chart.draw(data, options);
}

function renderAnywheelTable() {
    const tbody = document.getElementById('aw_tableBody'); if(!tbody) return; tbody.innerHTML = '';
    const start = (aw_page - 1) * ROWS_PER_PAGE; const items = aw_currentDaily.slice(start, start + ROWS_PER_PAGE); const totalPages = Math.ceil(aw_currentDaily.length / ROWS_PER_PAGE);
    if(items.length === 0) tbody.innerHTML = '<tr><td colspan="4" class="px-6 py-4 text-center text-gray-400">ไม่มีข้อมูล</td></tr>';
    else items.forEach(d => { 
        const h = Math.floor(d.duration / 60); const m = Math.round(d.duration % 60); const timeDisplay = `${h} ชม. ${m} นาที`;
        tbody.innerHTML += `<tr class="hover:bg-green-50 border-b interactive-row"><td class="px-6 py-4 text-center text-gray-800" style="font-size:28px;">${d.dateStr}</td><td class="px-6 py-4 text-center text-green-600 font-bold" style="font-size:38px;">${d.count.toLocaleString()}</td><td class="px-6 py-4 text-center text-green-600 font-bold" style="font-size:38px;">${d.dist.toLocaleString(undefined, {minimumFractionDigits: 2})}</td><td class="px-6 py-4 text-center text-green-600 font-medium" style="font-size:28px;">${timeDisplay}</td></tr>`; 
    });
    const emptyRows = ROWS_PER_PAGE - items.length; if (emptyRows > 0) { for (let i = 0; i < emptyRows; i++) { tbody.innerHTML += `<tr class="border-b empty-row" style="height: 80px;"><td class="px-6 py-4 text-center">&nbsp;</td><td class="px-6 py-4 text-center">&nbsp;</td><td class="px-6 py-4 text-center">&nbsp;</td><td class="px-6 py-4 text-center">&nbsp;</td></tr>`; } }
    updatePagination("aw", aw_page, totalPages, aw_currentDaily.length);
}

window.changePageAW = function(dir) { if (aw_page + dir >= 1 && aw_page + dir <= Math.ceil(aw_currentDaily.length / ROWS_PER_PAGE)) { aw_page += dir; renderAnywheelTable(); } }

function renderTramTable() {
    const tbody = document.getElementById('tram_tableBody'); if(!tbody) return; tbody.innerHTML = '';
    const start = (tram_page - 1) * ROWS_PER_PAGE; const items = tram_currentDaily.slice(start, start + ROWS_PER_PAGE); const totalPages = Math.ceil(tram_currentDaily.length / ROWS_PER_PAGE);
    items.forEach(d => {
        const h = Math.floor(d.dailyDuration / 60); const m = Math.round(d.dailyDuration % 60); const timeDisplay = `${h} ชม. ${m} นาที`;
        tbody.innerHTML += `<tr class="hover:bg-blue-50 border-b interactive-row"><td class="px-6 py-4 text-center text-gray-800" style="font-size:28px;">${d.date}</td><td class="px-6 py-4 text-center text-gray-600" style="font-size:32px;">${d.count.toLocaleString()}</td><td class="px-6 py-4 text-center text-blue-600 font-bold" style="font-size:38px;">${d.rounds.toLocaleString()}</td><td class="px-6 py-4 text-center text-blue-600 font-bold" style="font-size:38px;">${d.distance.toLocaleString()}</td><td class="px-6 py-4 text-center text-blue-600 font-medium" style="font-size:28px;">${timeDisplay}</td><td class="px-6 py-4 text-center text-blue-600" style="font-size:38px;">${d.trams.toLocaleString()}</td></tr>`;
    });
    const emptyRows = ROWS_PER_PAGE - items.length; if (emptyRows > 0) { for (let i = 0; i < emptyRows; i++) { tbody.innerHTML += `<tr class="border-b empty-row" style="height: 80px;"><td class="px-6 py-4">&nbsp;</td><td class="px-6 py-4">&nbsp;</td><td class="px-6 py-4">&nbsp;</td><td class="px-6 py-4">&nbsp;</td><td class="px-6 py-4">&nbsp;</td><td class="px-6 py-4">&nbsp;</td></tr>`; } }
    updatePagination("tram", tram_page, totalPages, tram_currentDaily.length);
}

window.changePageTram = function(dir) { if (tram_page + dir >= 1 && tram_page + dir <= Math.ceil(tram_currentDaily.length / ROWS_PER_PAGE)) { tram_page += dir; renderTramTable(); } }

function updatePagination(prefix, page, total, count) {
    const pageInfo = document.getElementById(`${prefix}_pageInfo`);
    const prevBtn = document.getElementById(`${prefix}_prevBtn`);
    const nextBtn = document.getElementById(`${prefix}_nextBtn`);
    const container = document.getElementById(`${prefix}_pageNumbers`);
    if(!pageInfo || !prevBtn || !nextBtn || !container) return;

    pageInfo.textContent = `หน้า ${page} / ${total || 1} (รวม ${count} วัน)`;
    prevBtn.disabled = page === 1; nextBtn.disabled = page === total || total === 0;
    container.innerHTML = '';
    for(let i=1; i<=total; i++) {
        if(i === 1 || i === total || (i >= page - 1 && i <= page + 1)) {
            let btn = document.createElement('button');
            btn.textContent = i;
            btn.onclick = () => { if(prefix === 'aw') { aw_page = i; renderAnywheelTable(); } else { tram_page = i; renderTramTable(); } };
            const activeClass = prefix === 'aw' ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'; btn.className = `page-number-btn ${i === page ? activeClass : 'bg-white border text-gray-700'}`; container.appendChild(btn);
        } else if (container.lastChild?.textContent !== '...') { let span = document.createElement('span'); span.textContent = '...'; span.className = 'text-gray-400 text-xs self-center'; container.appendChild(span); }
    }
}

function timeToSeconds(timeStr) {
    if(!timeStr) return 0; const p = timeStr.split(':').map(Number); let h=0, m=0, s=0;
    if(p.length === 3) { h=p[0]; m=p[1]; s=p[2]; } else if(p.length === 2) { h=p[0]; m=p[1]; } return (h*3600) + (m*60) + s;
}

function animateValue(id, end, isFloat = false) { 
    const el = document.getElementById(id);
    if(!el) return;
    el.innerText = end.toLocaleString(undefined, {minimumFractionDigits: isFloat ? 2 : 0, maximumFractionDigits: isFloat ? 2 : 0}); 
}

// Initialize Mobility Part
initAnywheelTram();


// ================= LOST AND FOUND INTEGRATION =================

let lf_allData = [];
let lf_monthlyData = [];
let lf_page = 1;
const LF_ROWS_PER_PAGE = 3;

async function fetchLostFoundData() {
    const LF_SHEET_ID = '14MJgb81aVEjT2qVp6n9zNKCCpJNVimX1q0hiYkH0f5I'; const LF_GID = '751456190';
    const url = `https://docs.google.com/spreadsheets/d/${LF_SHEET_ID}/gviz/tq?tqx=out:json&gid=${LF_GID}`;

    try {
        const response = await fetch(url); const text = await response.text(); const json = JSON.parse(text.substring(47).slice(0, -2));
        
        lf_allData = json.table.rows.map(row => {
            const c = row.c; if (!c || !c[1]) return null;
            let dateObj = new Date(); const dateVal = c[1]?.v;
            
            if(typeof dateVal === 'string' && dateVal.includes('Date')) { const parts = dateVal.match(/\d+/g); dateObj = new Date(parts[0], parts[1], parts[2], parts[3]||0, parts[4]||0); } 
            else if (dateVal) { dateObj = new Date(dateVal); } else { return null; }

            let year = dateObj.getFullYear(); if (year > 2400) { year = year - 543; dateObj.setFullYear(year); }

            const fullRowText = c.map(cell => cell ? (cell.v || "").toString() : "").join(" "); const col2Text = (c[2]?.v || "").toString();
            let type = "other"; let isReturned = false;

            if (fullRowText.includes("คืน")) isReturned = true;
            if (col2Text.includes("หาย")) type = "lost"; else if (col2Text.includes("เก็บ") || col2Text.includes("พบ")) type = "found"; else if (fullRowText.includes("หาย")) type = "lost"; else if (fullRowText.includes("เก็บ") || fullRowText.includes("พบ")) type = "found";

            return { dateObj: dateObj, type: type, isReturned: isReturned };
        }).filter(item => item !== null);
        
        renderLostFoundStats();

    } catch (error) { console.error("Error fetching Lost & Found data:", error); }
}

function renderLostFoundStats() {
    const sInput = document.getElementById('incStart').value;
    const eInput = document.getElementById('incEnd').value;
    if(!sInput || !eInput) return;
    const s = new Date(sInput); const e = new Date(eInput); e.setHours(23,59,59);
    
    const lfMonthLabel = document.getElementById('lfMonthLabel');
    if(lfMonthLabel) lfMonthLabel.innerText = formatMonthRange(s, e);
    
    const data = lf_allData.filter(d => d.dateObj >= s && d.dateObj <= e);
    animateValue("lf_totalCount", data.length); animateValue("lf_lostCount", data.filter(d => d.type === 'lost').length);
    animateValue("lf_foundCount", data.filter(d => d.type === 'found').length); animateValue("lf_returnedCount", data.filter(d => d.isReturned).length);
    
    processLFMonthlyData(); 
}

function processLFMonthlyData() {
    let monthlyMap = {};
    
    // ดึงวันที่สิ้นสุดจากช่องกรองข้อมูล
    const eInput = document.getElementById('incEnd').value;
    if(!eInput) return;
    const endDate = new Date(eInput);
    const selectedYear = endDate.getFullYear();
    const selectedMonth = endDate.getMonth();

    lf_allData.forEach(d => {
        let y = d.dateObj.getFullYear();
        let m = d.dateObj.getMonth();

        // ต้องเป็นปีเดียวกับที่เลือก
        if (y !== selectedYear) {
            return;
        }
        
        // ต้องเป็นเดือนก่อนหน้าเดือนที่เลือก (เดือนน้อยกว่า)
        if (m >= selectedMonth) {
            return;
        }

        let key = `${y}-${pad(m+1)}`;
        let label = `${thaiMonthLong(m)} ${beYear(y)}`;

        if (!monthlyMap[key]) {
            monthlyMap[key] = {
                key: key,
                sortVal: y * 100 + m,
                label: label,
                lost: 0,
                found: 0,
                returned: 0
            };
        }

        if (d.type === 'lost') monthlyMap[key].lost++;
        if (d.type === 'found') monthlyMap[key].found++;
        if (d.isReturned) monthlyMap[key].returned++;
    });

    lf_monthlyData = Object.values(monthlyMap).sort((a, b) => b.sortVal - a.sortVal);
    lf_page = 1;
    renderLFTable();
}

function renderLFTable() {
    const tbody = document.getElementById('lf_tableBody');
    if(!tbody) return;
    tbody.innerHTML = '';
    const start = (lf_page - 1) * LF_ROWS_PER_PAGE;
    const items = lf_monthlyData.slice(start, start + LF_ROWS_PER_PAGE);
    const totalPages = Math.ceil(lf_monthlyData.length / LF_ROWS_PER_PAGE);

    if(items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="px-6 py-4 text-center text-gray-400">ไม่มีข้อมูล</td></tr>';
    } else {
        items.forEach(d => {
            tbody.innerHTML += `
                <tr class="hover:bg-gray-50 border-b interactive-row">
                    <td class="px-6 py-4 text-center text-gray-800" style="font-size:26px;">${d.label}</td>
                    <td class="px-6 py-4 text-center text-red-600 font-bold" style="font-size:38px;">${d.lost.toLocaleString()}</td>
                    <td class="px-6 py-4 text-center text-yellow-600 font-bold" style="font-size:38px;">${d.found.toLocaleString()}</td>
                    <td class="px-6 py-4 text-center text-green-600 font-bold" style="font-size:38px;">${d.returned.toLocaleString()}</td>
                </tr>`;
        });
    }

    const emptyRows = LF_ROWS_PER_PAGE - items.length;
    if (emptyRows > 0) {
        for (let i = 0; i < emptyRows; i++) {
            tbody.innerHTML += `
                <tr class="border-b empty-row" style="height: 80px;">
                    <td class="px-6 py-4">&nbsp;</td>
                    <td class="px-6 py-4">&nbsp;</td>
                    <td class="px-6 py-4">&nbsp;</td>
                    <td class="px-6 py-4">&nbsp;</td>
                </tr>`;
        }
    }
    updatePaginationLF(lf_page, totalPages, lf_monthlyData.length);
}

window.changePageLF = function(dir) {
    if (lf_page + dir >= 1 && lf_page + dir <= Math.ceil(lf_monthlyData.length / LF_ROWS_PER_PAGE)) {
        lf_page += dir;
        renderLFTable();
    }
}

function updatePaginationLF(page, total, count) {
    const pageInfo = document.getElementById('lf_pageInfo');
    const prevBtn = document.getElementById('lf_prevBtn');
    const nextBtn = document.getElementById('lf_nextBtn');
    const container = document.getElementById('lf_pageNumbers');
    if(!pageInfo || !prevBtn || !nextBtn || !container) return;

    pageInfo.textContent = `หน้า ${page} / ${total || 1} (รวม ${count} เดือน)`;
    prevBtn.disabled = page === 1;
    nextBtn.disabled = page === total || total === 0;
    
    container.innerHTML = '';
    for(let i=1; i<=total; i++) {
        if(i === 1 || i === total || (i >= page - 1 && i <= page + 1)) {
            let btn = document.createElement('button');
            btn.textContent = i;
            btn.onclick = () => { lf_page = i; renderLFTable(); };
            btn.className = `page-number-btn ${i === page ? 'bg-blue-600 text-white' : 'bg-white border text-gray-700'}`;
            container.appendChild(btn);
        } else if (container.lastChild?.textContent !== '...') {
            let span = document.createElement('span');
            span.textContent = '...';
            span.className = 'text-gray-400 text-xs self-center';
            container.appendChild(span);
        }
    }
}

// Initialize Lost & Found
fetchLostFoundData();