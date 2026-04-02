const MAIN_SHEET_ID = '1PQe6MO2gnfCtpf_ksbPnLTAXJZ2UoPTr-AQuQ1mYKqo'; 
const MAIN_GID = '1966627960'; 

// โครงสร้างคอลัมน์ใน Google Sheets
const MAIN_COLS = { 
    DATE: 0, 
    TYPE: 1, 
    SCORE_TRAFFIC: 2, COMMENT_TRAFFIC: 3,
    SCORE_SECURE: 4, COMMENT_SECURE: 5, 
    SCORE_SERVICE: 6, COMMENT_SERVICE: 7, 
    SCORE_DRESS: 8, COMMENT_DRESS: 9,
    SCORE_POLITE: 10, COMMENT_POLITE: 11,
    SCORE_ENTHUSIASM: 12, COMMENT_ENTHUSIASM: 13,
    SCORE_CLARITY: 14, COMMENT_CLARITY: 15,
    SCORE_SPEED: 16, COMMENT_SPEED: 17,
    SCORE_STRICT: 18, COMMENT_STRICT: 19
};

const FINE_SHEET_ID = '1tj_BC_YkBBcin8FqqXB_OvOF5ku2Y24MTh04XmA9zTk';
const FINE_GID = '3452793';
const FINE_COLS = { DATE: 0, DEPT: 45, POINT: 46, NAME: 47, REASON: 48 };

const thaiMonths = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];

let pieChartInstance = null, barChartInstance = null;
let globalComments = [], filteredComments = [], globalFineDetails = [];
let currentFilter = 'all', currentPage = 1, rowsPerPage = 5;
let targetStart, targetEnd;

let cachedMainRows = [];
let cachedFineRows = [];
let currentViewingDate;

window.onload = () => {
    const today = new Date();
    currentViewingDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    initDropdowns();
    updateDateVariables();
    fetchData();
};

function initDropdowns() {
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    
    thaiMonths.forEach((m, index) => {
        const opt = document.createElement('option');
        opt.value = index;
        opt.text = m;
        if (index === currentViewingDate.getMonth()) opt.selected = true;
        monthSelect.appendChild(opt);
    });
    
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= currentYear - 2; y--) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.text = "พ.ศ. " + (y + 543);
        if (y === currentViewingDate.getFullYear()) opt.selected = true;
        yearSelect.appendChild(opt);
    }
}

function handleDateChange() {
    const selectedMonth = parseInt(document.getElementById('monthSelect').value);
    const selectedYear = parseInt(document.getElementById('yearSelect').value);
    
    currentViewingDate = new Date(selectedYear, selectedMonth, 1);
    updateDateVariables();
    
    if (cachedMainRows.length > 0 && cachedFineRows.length > 0) {
        processData(cachedMainRows, cachedFineRows);
    }
}

function updateDateVariables() {
    targetStart = new Date(currentViewingDate.getFullYear(), currentViewingDate.getMonth(), 1);
    targetEnd = new Date(currentViewingDate.getFullYear(), currentViewingDate.getMonth() + 1, 0, 23, 59, 59);
}

function fetchData() {
    Promise.all([
        fetch(`https://docs.google.com/spreadsheets/d/${MAIN_SHEET_ID}/gviz/tq?tqx=out:json&gid=${MAIN_GID}`).then(res => res.text()),
        fetch(`https://docs.google.com/spreadsheets/d/${FINE_SHEET_ID}/gviz/tq?tqx=out:json&gid=${FINE_GID}`).then(res => res.text())
    ]).then(([textMain, textFine]) => {
        cachedMainRows = JSON.parse(textMain.substring(47).slice(0, -2)).table.rows;
        cachedFineRows = JSON.parse(textFine.substring(47).slice(0, -2)).table.rows;
        processData(cachedMainRows, cachedFineRows);
    });
}

function parseNum(cell) { if (!cell || cell.v === null) return null; const val = parseFloat(cell.v); return isNaN(val) ? null : val; }
function parseDate(val) { if (typeof val === 'string' && val.includes("Date")) { const p = val.match(/\d+/g); return new Date(p[0], p[1], p[2]); } return new Date(val); }

function processData(mainRows, fineRows) {
    let scores = { traffic: [], secure: [], service: [], dress: [], polite: [], enthusiasm: [], clarity: [], speed: [], strict: [] };
    let types = {}, filteredCount = 0;
    globalComments = [];

    mainRows.forEach(row => {
        if (!row.c[MAIN_COLS.DATE]) return;
        let d = parseDate(row.c[MAIN_COLS.DATE].v);
        if (d >= targetStart && d <= targetEnd) {
            filteredCount++;
            const type = row.c[MAIN_COLS.TYPE]?.v || "ไม่ระบุ";
            types[type] = (types[type] || 0) + 1;
            
            const s1 = parseNum(row.c[MAIN_COLS.SCORE_TRAFFIC]), 
                  s2 = parseNum(row.c[MAIN_COLS.SCORE_SECURE]), 
                  s3 = parseNum(row.c[MAIN_COLS.SCORE_SERVICE]), 
                  s4 = parseNum(row.c[MAIN_COLS.SCORE_DRESS]),
                  s5 = parseNum(row.c[MAIN_COLS.SCORE_POLITE]),
                  s6 = parseNum(row.c[MAIN_COLS.SCORE_ENTHUSIASM]),
                  s7 = parseNum(row.c[MAIN_COLS.SCORE_CLARITY]),
                  s8 = parseNum(row.c[MAIN_COLS.SCORE_SPEED]),
                  s9 = parseNum(row.c[MAIN_COLS.SCORE_STRICT]);
                  
            if(s1!==null) scores.traffic.push(s1); 
            if(s2!==null) scores.secure.push(s2); 
            if(s3!==null) scores.service.push(s3); 
            if(s4!==null) scores.dress.push(s4);
            if(s5!==null) scores.polite.push(s5);
            if(s6!==null) scores.enthusiasm.push(s6);
            if(s7!==null) scores.clarity.push(s7);
            if(s8!==null) scores.speed.push(s8);
            if(s9!==null) scores.strict.push(s9);

            const addCom = (idx, cat, col) => { 
                if(row.c[idx]?.v) {
                    let t = row.c[idx].v.toString().trim();
                    const junk = ["-", "ไม่มี", "ไม่มีครับ", "ไม่มีค่ะ", "ไม่มีข้อเสนอแนะ", ".", "no", "none"];
                    if (t !== "" && !junk.includes(t)) globalComments.push({date:d.toLocaleDateString('th-TH'), category:cat, text:t, color:col, hidden: false});
                }
            };
            
            addCom(MAIN_COLS.COMMENT_TRAFFIC, 'จราจร', 'bg-indigo-100 text-indigo-800'); 
            addCom(MAIN_COLS.COMMENT_SECURE, 'ความปลอดภัย', 'bg-emerald-100 text-emerald-800'); 
            addCom(MAIN_COLS.COMMENT_SERVICE, 'บริการ', 'bg-blue-100 text-blue-800'); 
            addCom(MAIN_COLS.COMMENT_DRESS, 'แต่งกาย', 'bg-purple-100 text-purple-800');
            addCom(MAIN_COLS.COMMENT_POLITE, 'สุภาพ/อัธยาศัย', 'bg-pink-100 text-pink-800');
            addCom(MAIN_COLS.COMMENT_ENTHUSIASM, 'กระตือรือร้น', 'bg-orange-100 text-orange-800');
            addCom(MAIN_COLS.COMMENT_CLARITY, 'การให้ข้อมูล', 'bg-cyan-100 text-cyan-800');
            addCom(MAIN_COLS.COMMENT_SPEED, 'ความรวดเร็ว', 'bg-teal-100 text-teal-800');
            addCom(MAIN_COLS.COMMENT_STRICT, 'ความเข้มงวด', 'bg-slate-200 text-slate-800');
        }
    });

    globalFineDetails = [];
    fineRows.forEach(row => {
        if (!row.c[FINE_COLS.DATE]) return;
        let d = parseDate(row.c[FINE_COLS.DATE].v);
        
        if (d >= targetStart && d <= targetEnd) {
            let reason = row.c[FINE_COLS.REASON]?.v || "";
            reason = reason.toString().trim();
            const junk = ["-", "ไม่มี", "ปกติ", "เหตุการณ์ปกติ", "เรียบร้อย", "ทั่วไป", "", " ", "."];
            
            if (!junk.includes(reason)) {
                globalFineDetails.push({
                    date: d.toLocaleDateString('th-TH'),
                    dept: row.c[FINE_COLS.DEPT]?.v || "-",
                    point: row.c[FINE_COLS.POINT]?.v || "-",
                    name: row.c[FINE_COLS.NAME]?.v || "-",
                    reason: reason
                });
            }
        }
    });

    globalComments.reverse(); filteredComments = [...globalComments];
    updateUI(filteredCount, globalFineDetails.length * 1000, scores, types);
}

function updateUI(count, fineTotal, scores, types) {
    document.getElementById('totalCount').innerText = count.toLocaleString();
    document.getElementById('totalFine').innerText = fineTotal.toLocaleString();
    document.getElementById('fineCountBadge').innerText = `${globalFineDetails.length} เคส`;
    document.getElementById('footerTotalFine').innerText = fineTotal.toLocaleString();

    const getAvg = (arr) => (!arr.length) ? 0 : arr.reduce((a,b)=>a+b,0)/arr.length;
    const a1 = getAvg(scores.traffic), a2 = getAvg(scores.secure), a3 = getAvg(scores.service), a4 = getAvg(scores.dress),
          a5 = getAvg(scores.polite), a6 = getAvg(scores.enthusiasm), a7 = getAvg(scores.clarity), a8 = getAvg(scores.speed), a9 = getAvg(scores.strict);
          
    document.getElementById('scoreTraffic').innerText = a1.toFixed(2);
    document.getElementById('scoreSecurity').innerText = a2.toFixed(2);
    document.getElementById('scoreService').innerText = a3.toFixed(2);
    document.getElementById('scoreDress').innerText = a4.toFixed(2);
    
    document.getElementById('scorePolite').innerText = a5.toFixed(2);
    document.getElementById('scoreEnthusiasm').innerText = a6.toFixed(2);
    document.getElementById('scoreClarity').innerText = a7.toFixed(2);
    document.getElementById('scoreSpeed').innerText = a8.toFixed(2);
    document.getElementById('scoreStrict').innerText = a9.toFixed(2);
    
    const valid = [a1,a2,a3,a4,a5,a6,a7,a8,a9].filter(v=>v>0);
    document.getElementById('scoreOverall').innerText = valid.length ? (valid.reduce((a,b)=>a+b,0)/valid.length).toFixed(2) : "0.00";

    renderCharts(types, count);
    filterComments('all');
    renderFineDetails();
}

function renderFineDetails() {
    const tbody = document.getElementById('fineDetailsList');
    tbody.innerHTML = globalFineDetails.length ? '' : '<tr><td colspan="6" class="px-8 py-10 text-center text-gray-400 italic text-2xl">ไม่มีรายการปรับในเดือนนี้</td></tr>';
    globalFineDetails.forEach(item => {
        tbody.innerHTML += `
            <tr class="hover:bg-red-50/50 transition border-b border-gray-100">
                <td class="px-8 py-6 text-gray-700 whitespace-nowrap">${item.date}</td>
                <td class="px-8 py-6 text-gray-600">${item.dept}</td>
                <td class="px-8 py-6 text-gray-600">${item.point}</td>
                <td class="px-8 py-6 text-gray-700">${item.name}</td>
                <td class="px-8 py-6 text-gray-600">${item.reason}</td>
                <td class="px-8 py-6 text-right text-gray-700">1,000</td>
            </tr>`;
    });
}

function stealthHide(indexOnPage) {
    const visible = filteredComments.filter(c => !c.hidden);
    const target = visible[(currentPage - 1) * rowsPerPage + indexOnPage];
    if (target) { target.hidden = true; renderCommentsTable(); }
}

function restoreHidden() { globalComments.forEach(c => c.hidden = false); renderCommentsTable(); }

function renderCommentsTable() {
    const tbody = document.getElementById('commentsList'); tbody.innerHTML = "";
    const visible = filteredComments.filter(c => !c.hidden);
    const total = Math.ceil(visible.length / rowsPerPage) || 1;
    if (currentPage > total) currentPage = total;
    const items = visible.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    if (!items.length) tbody.innerHTML = `<tr><td colspan="3" class="px-8 py-10 text-center text-gray-400 italic text-xl">ไม่มีข้อเสนอแนะ</td></tr>`;
    else items.forEach((c, i) => {
        tbody.innerHTML += `
            <tr ondblclick="stealthHide(${i})" class="comment-row border-b border-gray-100 h-[90px]">
                <td class="px-8 py-5 text-gray-700">${c.date}</td>
                <td class="px-8 py-5"><span class="${c.color} text-sm px-4 py-2 rounded-full font-normal">${c.category}</span></td>
                <td class="px-8 py-5 text-gray-700">${c.text}</td>
            </tr>`;
    });
    for (let i = 0; i < (rowsPerPage - items.length); i++) tbody.innerHTML += `<tr class="h-[90px] border-b border-gray-50"><td colspan="3">&nbsp;</td></tr>`;
    document.getElementById('pageIndicator').innerText = `${currentPage} / ${total}`;
    document.getElementById('btnPrev').disabled = (currentPage === 1);
    document.getElementById('btnNext').disabled = (currentPage === total);
}

function filterComments(cat) {
    document.querySelectorAll('.filter-btn').forEach(b => { b.classList.remove('active'); b.classList.add('inactive'); });
    
    let id = 'btn-all'; 
    if (cat==='จราจร') id='btn-traffic'; 
    else if (cat==='ความปลอดภัย') id='btn-secure'; 
    else if (cat==='บริการ') id='btn-service'; 
    else if (cat==='แต่งกาย') id='btn-dress';
    else if (cat==='สุภาพ/อัธยาศัย') id='btn-polite';
    else if (cat==='กระตือรือร้น') id='btn-enthusiasm';
    else if (cat==='การให้ข้อมูล') id='btn-clarity';
    else if (cat==='ความรวดเร็ว') id='btn-speed';
    else if (cat==='ความเข้มงวด') id='btn-strict';

    document.getElementById(id).classList.replace('inactive', 'active');
    filteredComments = (cat === 'all') ? [...globalComments] : globalComments.filter(c => c.category === cat);
    currentPage = 1; renderCommentsTable();
}

function changePage(d) { currentPage += d; renderCommentsTable(); }

function renderCharts(types, total) {
    const colors = ['#6366f1', '#a855f7', '#ec4899', '#14b8a6', '#f59e0b', '#ef4444'];
    const ctxPie = document.getElementById('typeChart').getContext('2d');
    if (pieChartInstance) pieChartInstance.destroy();
    const labels = Object.keys(types), data = Object.values(types);
    if (data.length) pieChartInstance = new Chart(ctxPie, { type: 'doughnut', data: { labels: labels, datasets: [{ data: data, backgroundColor: colors, borderWidth: 2, borderColor: '#ffffff' }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '60%' } });

    const ctxBar = document.getElementById('barChart').getContext('2d');
    if (barChartInstance) barChartInstance.destroy();
    if (data.length) {
        let sorted = labels.map((l, i) => ({ label: l, value: data[i], color: colors[i % colors.length] })).sort((a, b) => b.value - a.value);
        barChartInstance = new Chart(ctxBar, { 
            type: 'bar', 
            data: { labels: sorted.map(d => d.label), datasets: [{ data: sorted.map(d => d.value), backgroundColor: sorted.map(d => d.color), borderRadius: 6 }] }, 
            options: { 
                indexAxis: 'y', 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { 
                    legend: { display: false },
                    afterDatasetsDraw(chart) {
                        const {ctx} = chart;
                        ctx.save();
                        ctx.font = "bold 14px 'Prompt'";
                        ctx.fillStyle = '#666';
                        chart.data.datasets[0].data.forEach((val, i) => {
                            const meta = chart.getDatasetMeta(0);
                            ctx.fillText(val + " คน", meta.data[i].x + 8, meta.data[i].y);
                        });
                        ctx.restore();
                    }
                }, 
                scales: { x: { display: false }, y: { grid: { display: false }, ticks: { font: { family: 'Prompt', size: 14, weight: '600' } } } } 
            } 
        });
    }
}

// 🌟 โค้ดพิเศษ: ควบคุม Sidebar เมนูให้เปิดค้างไว้ตามที่ผู้ใช้เลือก 🌟
document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    if (sessionStorage.getItem('sidebarOpen') === 'true') {
        sidebar.classList.add('keep-open');
    }

    sidebar.addEventListener('mouseenter', () => {
        sessionStorage.setItem('sidebarOpen', 'true');
        sidebar.classList.add('keep-open');
    });

    sidebar.addEventListener('mouseleave', () => {
        sessionStorage.setItem('sidebarOpen', 'false');
        sidebar.classList.remove('keep-open');
    });
});