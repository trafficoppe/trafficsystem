let currentArea = 'ส่วนกลาง';
let currentShiftFilter = 'all'; 
let globalGuardData = []; 

// 🌟 URL ของชีท รปภ. ทั้ง 2 ผลัด
const sheetUrlMorning = "https://docs.google.com/spreadsheets/d/1lYRhXtLgec6ISM6Ugt-YKLrh47NRt7ihcVLcD8mI_Yg/gviz/tq?tqx=out:json&gid=377062228";
const sheetUrlNight = "https://docs.google.com/spreadsheets/d/1lYRhXtLgec6ISM6Ugt-YKLrh47NRt7ihcVLcD8mI_Yg/gviz/tq?tqx=out:json&gid=1278824301";

function applyLanguageUI() {
    const lang = localStorage.getItem('appLang') || 'th';
    document.querySelectorAll('[data-th][data-en]').forEach(el => {
        el.textContent = el.getAttribute(`data-${lang}`);
    });
}

function checkGlobalTheme() {
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

function initPage() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('area')) currentArea = decodeURIComponent(params.get('area'));
    checkGlobalTheme();
    updateTitleUI();
    fetchRealDataOnce(); 
}

window.applyInstantFilter = function(area) {
    currentArea = area;
    currentShiftFilter = 'all'; 
    updateTitleUI();
    renderDashboard(); 
};

window.setShiftFilter = function(shift) {
    currentShiftFilter = shift;
    renderDashboard(); 
};

function updateTitleUI() {
    const titleEl = document.getElementById('areaTitle');
    let enArea = getEnglishAreaName(currentArea);
    titleEl.setAttribute('data-th', `ข้อมูลกำลังพล รปภ. - พื้นที่${currentArea}`);
    titleEl.setAttribute('data-en', `Security Deployment - ${enArea} Zone`);
}

function getEnglishAreaName(thName) {
    const map = {
        'ส่วนกลาง': 'Central',
        'ศูนย์การเรียนรู้มหิดล': 'MLC',
        'มหิดลสิทธาคาร': 'Prince Mahidol Hall',
        'อาคารสิริวิทยา': 'Siriwittaya Bldg.',
        'สิรีรุกขชาติ': 'Sireeruckhachati',
        'หอพักนักศึกษา': 'Student Dormitory'
    };
    return map[thName] || thName;
}

function isMatchArea(rawTxt, targetTxt) {
    if(!rawTxt || !targetTxt) return false;
    let r = rawTxt.replace(/\s+/g, '');
    let t = targetTxt.replace(/\s+/g, '');
    return r === t || r.includes(t) || t.includes(r);
}

// ==========================================
// 🌟 1. ฟังก์ชันดึงข้อมูลจาก Sheet
// ==========================================
function fetchRealDataOnce() {
    document.getElementById('contentArea').innerHTML = `<div style="text-align: center; padding: 50px;" data-th="กำลังประมวลผลข้อมูล..." data-en="Processing data...">กำลังประมวลผลข้อมูล...</div>`;
    
    Promise.all([
        fetch(sheetUrlMorning).then(res => res.text()),
        fetch(sheetUrlNight).then(res => res.text())
    ])
    .then(([textMorning, textNight]) => {
        globalGuardData = []; 

        const processSheetData = (text, shiftType) => {
            const jsonString = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
            const data = JSON.parse(jsonString);
            const rows = data.table.rows;

            rows.forEach((row) => {
                if (!row || !row.c) return;

                let rawArea = (row.c[0] && row.c[0].v != null) ? row.c[0].v.toString().trim() : '';
                let postName = (row.c[1] && row.c[1].v != null) ? row.c[1].v.toString().trim() : 'ไม่ได้ระบุจุด';
                
                // 🌟 แก้ปัญหาบรรทัดแรกหาย: กรองเฉพาะคำว่า 'หน่วยงาน' หรือช่องว่างออกแทนการตัด index 0
                if (rawArea === 'หน่วยงาน' || rawArea === 'พื้นที่รับผิดชอบ' || rawArea === '') return;

                let numGuards = 0;
                
                // ค้นหาตัวเลข
                for (let i = 2; i <= 4; i++) {
                    if (row.c[i] && row.c[i].v !== null) {
                        let val = row.c[i].v;
                        if (typeof val === 'number') {
                            numGuards = val;
                            break;
                        } else if (typeof val === 'string') {
                            if (!val.includes('.') && !val.includes('-')) {
                                let parsed = parseInt(val, 10);
                                if (!isNaN(parsed) && parsed > 0) {
                                    numGuards = parsed;
                                    break;
                                }
                            }
                        }
                    }
                }
                
                if (numGuards === 0) return;

                globalGuardData.push({
                    area: rawArea,
                    post: postName,
                    shift: shiftType, 
                    count: numGuards  
                });
            });
        };

        processSheetData(textMorning, 'morning');
        processSheetData(textNight, 'night');

        renderDashboard(); 
    })
    .catch(error => {
        console.error("Error fetching data:", error);
        document.getElementById('contentArea').innerHTML = `<div style="text-align: center; color: red; padding: 20px;">เกิดข้อผิดพลาดในการดึงข้อมูลจาก Google Sheet</div>`;
    });
}

// ==========================================
// 🌟 2. ฟังก์ชันวาดหน้าจอ 
// ==========================================
function renderDashboard() {
    let areaData = globalGuardData.filter(d => isMatchArea(d.area, currentArea));

    let morningDataMap = {};
    let nightDataMap = {};
    let totalMorning = 0;
    let totalNight = 0;

    areaData.forEach(d => {
        if (d.shift === 'morning') {
            if (!morningDataMap[d.post]) morningDataMap[d.post] = 0;
            morningDataMap[d.post] += d.count;
            totalMorning += d.count;
        } else if (d.shift === 'night') {
            if (!nightDataMap[d.post]) nightDataMap[d.post] = 0;
            nightDataMap[d.post] += d.count;
            totalNight += d.count;
        }
    });

    const totalAll = totalMorning + totalNight;
    
    let uniquePosts = new Set();
    areaData.forEach(d => uniquePosts.add(d.post));
    const totalPostsCount = uniquePosts.size;

    document.getElementById('summaryCards').innerHTML = `
        <div class="stat-card ${currentShiftFilter === 'all' ? 'active-filter' : ''}" onclick="setShiftFilter('all')">
            <div class="stat-icon bg-blue"><i class="fa-solid fa-users"></i></div>
            <div class="stat-info">
                <p data-th="แสดงทั้งหมด" data-en="Show All">แสดงทั้งหมด</p>
                <h3>${totalAll} <span style="font-size:16px;">นาย</span></h3>
            </div>
        </div>
        <div class="stat-card ${currentShiftFilter === 'morning' ? 'active-filter' : ''}" onclick="setShiftFilter('morning')">
            <div class="stat-icon bg-orange"><i class="fa-solid fa-sun"></i></div>
            <div class="stat-info">
                <p data-th="เฉพาะผลัดเช้า" data-en="Morning Shift">เฉพาะผลัดเช้า</p>
                <h3>${totalMorning} <span style="font-size:16px;">นาย</span></h3>
            </div>
        </div>
        <div class="stat-card ${currentShiftFilter === 'night' ? 'active-filter' : ''}" onclick="setShiftFilter('night')">
            <div class="stat-icon" style="background: #1e293b;"><i class="fa-solid fa-moon"></i></div>
            <div class="stat-info">
                <p data-th="เฉพาะผลัดกลางคืน" data-en="Night Shift">เฉพาะผลัดกลางคืน</p>
                <h3>${totalNight} <span style="font-size:16px;">นาย</span></h3>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon bg-teal"><i class="fa-solid fa-location-dot"></i></div>
            <div class="stat-info">
                <p data-th="จำนวนจุดปฏิบัติงาน" data-en="Total Posts">จำนวนจุดปฏิบัติงาน</p>
                <h3>${totalPostsCount} <span style="font-size:16px;">จุด</span></h3>
            </div>
        </div>
    `;

    let morningRowsHTML = '';
    let mIndex = 1;
    for (const [post, count] of Object.entries(morningDataMap)) {
        morningRowsHTML += `
            <tr>
                <td style="text-align: center; font-weight: 500; color: #64748b; width: 10%; border-right: 1px solid #f1f5f9;">${mIndex++}</td>
                <td style="font-weight: 500;">${post}</td>
                <td style="text-align: center; font-weight: bold; color: #ea580c; width: 15%; background: rgba(234, 88, 12, 0.04); font-size: 16px;">${count}</td>
            </tr>
        `;
    }
    if (mIndex === 1) morningRowsHTML = `<tr><td colspan="3" style="text-align:center; padding: 30px; color: #64748b;">ไม่พบข้อมูลกำลังพลผลัดเช้าในพื้นที่นี้</td></tr>`;

    let nightRowsHTML = '';
    let nIndex = 1;
    for (const [post, count] of Object.entries(nightDataMap)) {
        nightRowsHTML += `
            <tr>
                <td style="text-align: center; font-weight: 500; color: #64748b; width: 10%; border-right: 1px solid #f1f5f9;">${nIndex++}</td>
                <td style="font-weight: 500;">${post}</td>
                <td style="text-align: center; font-weight: bold; color: #4f46e5; width: 15%; background: rgba(79, 70, 229, 0.04); font-size: 16px;">${count}</td>
            </tr>
        `;
    }
    if (nIndex === 1) nightRowsHTML = `<tr><td colspan="3" style="text-align:center; padding: 30px; color: #64748b;">ไม่พบข้อมูลกำลังพลผลัดกลางคืนในพื้นที่นี้</td></tr>`;

    let contentHTML = '';

    if (currentShiftFilter === 'all' || currentShiftFilter === 'morning') {
        contentHTML += `
            <div class="section-card" style="border: 1px solid #fdba74; margin-bottom: 30px; box-shadow: 0 4px 10px -2px rgba(234, 88, 12, 0.1);">
                <div class="section-header" style="background-color: #fff7ed; color: #ea580c; border-bottom: 1px solid #fdba74; font-size: 18px;">
                    <i class="fa-solid fa-sun" style="font-size: 20px;"></i> ตารางจุดปฏิบัติงาน - ผลัดเช้า (07.00 - 19.00 น.)
                </div>
                <table class="styled-table" style="margin: 0;">
                    <thead>
                        <tr>
                            <th style="text-align: center; width: 10%; background-color: #fff;">ลำดับที่</th>
                            <th style="background-color: #fff;">จุดปฏิบัติงาน / พื้นที่รับผิดชอบ</th>
                            <th style="text-align: center; width: 15%; background-color: #fff;">จำนวน (นาย)</th>
                        </tr>
                    </thead>
                    <tbody>${morningRowsHTML}</tbody>
                </table>
            </div>
        `;
    }

    if (currentShiftFilter === 'all' || currentShiftFilter === 'night') {
        contentHTML += `
            <div class="section-card" style="border: 1px solid #c7d2fe; box-shadow: 0 4px 10px -2px rgba(79, 70, 229, 0.1);">
                <div class="section-header" style="background-color: #eef2ff; color: #4f46e5; border-bottom: 1px solid #c7d2fe; font-size: 18px;">
                    <i class="fa-solid fa-moon" style="font-size: 20px;"></i> ตารางจุดปฏิบัติงาน - ผลัดกลางคืน (19.00 - 07.00 น.)
                </div>
                <table class="styled-table" style="margin: 0;">
                    <thead>
                        <tr>
                            <th style="text-align: center; width: 10%; background-color: #fff;">ลำดับที่</th>
                            <th style="background-color: #fff;">จุดปฏิบัติงาน / พื้นที่รับผิดชอบ</th>
                            <th style="text-align: center; width: 15%; background-color: #fff;">จำนวน (นาย)</th>
                        </tr>
                    </thead>
                    <tbody>${nightRowsHTML}</tbody>
                </table>
            </div>
        `;
    }

    document.getElementById('contentArea').innerHTML = contentHTML;
    applyLanguageUI();
}

document.addEventListener('DOMContentLoaded', initPage);