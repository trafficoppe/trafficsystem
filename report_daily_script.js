// ================= INITIALIZATION & CONFIG =================
// ปิดระบบ Preflight ของ Tailwind เพื่อไม่ให้กระทบกับ CSS ที่เราเขียนเอง
tailwind.config = { corePlugins: { preflight: false } };

// โหลด Google Charts
if (typeof google !== 'undefined') {
    google.charts.load('current', {'packages':['corechart']});
}

// ฟังก์ชันสั่งพิมพ์ PDF โดยใช้ระบบของ Browser
function downloadPDFImmediately() {
    const ds = document.getElementById('dateSelect').value || 'ประจำวัน';
    const originalTitle = document.title;
    document.title = `รายงานเหตุการณ์_${ds}`;
    window.print();
    setTimeout(() => { document.title = originalTitle; }, 1000);
}

// ================= GLOBAL CONFIGURATION =================
const thaiMonths = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
        
function formatThaiDate(d){ 
    return `วันที่ ${d.getDate()} ${thaiMonths[d.getMonth()]} ${d.getFullYear() + 543}`; 
}

const todayMax = new Date();
const max_yyyy = todayMax.getFullYear();
const max_mm = String(todayMax.getMonth() + 1).padStart(2, '0');
const max_dd = String(todayMax.getDate()).padStart(2, '0');
document.getElementById('dateSelect').setAttribute('max', `${max_yyyy}-${max_mm}-${max_dd}`);

const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const yyyy = yesterday.getFullYear();
const mm = String(yesterday.getMonth() + 1).padStart(2, '0');
const dd = String(yesterday.getDate()).padStart(2, '0');

document.getElementById('dateSelect').value = `${yyyy}-${mm}-${dd}`;
document.getElementById('customDateText').innerHTML = `รายงานเหตุการณ์ประจำ <span class="text-blue-600 ml-2">${formatThaiDate(yesterday)}</span>`;

function changeDate(offset) {
    const dateInput = document.getElementById('dateSelect');
    if (!dateInput.value) return;
    
    const currentDate = new Date(dateInput.value);
    currentDate.setDate(currentDate.getDate() + offset);
    
    const todayLimit = new Date();
    todayLimit.setHours(0,0,0,0);
    if (currentDate.getTime() > todayLimit.getTime()) return; 

    const y = currentDate.getFullYear();
    const m = String(currentDate.getMonth() + 1).padStart(2, '0');
    const d = String(currentDate.getDate()).padStart(2, '0');
    
    dateInput.value = `${y}-${m}-${d}`;
    renderAllTables(); 
}

function formatThaiTime(val) {
    if (!val) return '';
    let str = String(val).trim();
    let match = str.match(/(\d{1,2}):(\d{2})/);
    if (match) {
        let h = parseInt(match[1]);
        let m = match[2];
        if (str.toLowerCase().includes('pm') && h < 12) h += 12;
        if (str.toLowerCase().includes('am') && h === 12) h = 0;
        return `${String(h).padStart(2,'0')}.${m}`;
    }
    return str;
}

function extractDriveId(url) {
    if (!url) return '';
    let str = String(url).split(',')[0].trim();
    let match = str.match(/[?&]id=([a-zA-Z0-9_-]+)/) || str.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : '';
}

function parseGoogleDate(cell) {
    if (!cell) return null;
    if (cell.v && typeof cell.v === 'string' && cell.v.startsWith('Date(')) {
        let p = cell.v.match(/\d+/g);
        if (p && p.length >= 3) {
            let d = new Date(parseInt(p[0]), parseInt(p[1]), parseInt(p[2]));
            if (d.getFullYear() > 2400) d.setFullYear(d.getFullYear() - 543);
            return d;
        }
    }
    let str = String(cell.f || cell.v || "").trim();
    if (!str) return null;
    let d = new Date(str);
    if (!isNaN(d.getTime())) {
        if (d.getFullYear() > 2400) d.setFullYear(d.getFullYear() - 543);
        return d;
    }
    let parts = str.split(/[ T\/\-]/).filter(x => x);
    if (parts.length >= 3) {
        let y = parseInt(parts[2]), m = parseInt(parts[1]), day = parseInt(parts[0]);
        if (parts[0].length === 4) { y = parseInt(parts[0]); m = parseInt(parts[1]); day = parseInt(parts[2]); }
        if (m > 12) { let temp = m; m = day; day = temp; } 
        if (y < 100) y += 2000;
        d = new Date(y, m - 1, day);
        if (!isNaN(d.getTime())) {
            if (d.getFullYear() > 2400) d.setFullYear(d.getFullYear() - 543);
            return d;
        }
    }
    return null;
}

// ================= DATA LOADING =================
let accidentData = [];
let lfData = [];
let carData = [];
let rosterData = {}; 
let dutyMap = {}; // สำหรับเก็บข้อมูลตำแหน่งจากคอลัมน์ B

let flags = { accident: false, lf: false, lfNew: false, car: false, roster: false, duty: false };

function loadScript(url) { 
    const s = document.createElement('script'); 
    s.src = url; 
    document.body.appendChild(s); 
}

loadScript('https://docs.google.com/spreadsheets/d/1tj_BC_YkBBcin8FqqXB_OvOF5ku2Y24MTh04XmA9zTk/gviz/tq?tqx=responseHandler:handleAccidentData&gid=3452793');
loadScript('https://docs.google.com/spreadsheets/d/14MJgb81aVEjT2qVp6n9zNKCCpJNVimX1q0hiYkH0f5I/gviz/tq?tqx=responseHandler:handleLFData&gid=751456190');
loadScript('https://docs.google.com/spreadsheets/d/14MJgb81aVEjT2qVp6n9zNKCCpJNVimX1q0hiYkH0f5I/gviz/tq?tqx=responseHandler:handleLFDataNew&gid=2074352966');
loadScript('https://docs.google.com/spreadsheets/d/1hEFLf_CuzabHOIdCp_LWEU5M8Be_7bsx1aBZickoSXA/gviz/tq?tqx=responseHandler:handleCarData&gid=0');
loadScript('https://docs.google.com/spreadsheets/d/1lYRhXtLgec6ISM6Ugt-YKLrh47NRt7ihcVLcD8mI_Yg/gviz/tq?tqx=responseHandler:handleRosterData&gid=1075222543&headers=0');
// โหลดข้อมูลตำแหน่งจากคอลัมน์ B (แท็บ gid=1285036850)
loadScript('https://docs.google.com/spreadsheets/d/1lYRhXtLgec6ISM6Ugt-YKLrh47NRt7ihcVLcD8mI_Yg/gviz/tq?tqx=responseHandler:handleDutyData&gid=1285036850');

window.handleAccidentData = function(json) {
    if (json && json.table && json.table.rows) {
        accidentData = json.table.rows.map(r => {
            const c = r.c; 
            if (!c) return null;
            let type = (c[5]?.v || "เหตุการณ์ทั่วไป").toString().trim();
            if (type === "ว.40") type = "อุบัติเหตุจากยานพาหนะ";
            const excludeWords = ["คืนของ", "รับของคืน", "เก็บของได้", "แจ้งเก็บของได้", "แจ้งของหาย", "ปลดบังคับล้อ"];
            if (excludeWords.some(word => type.includes(word))) return null; 
            let d = parseGoogleDate(c[1]);
            if (!d) return null;
            let imgLink = "";
            for (let i = c.length - 1; i >= 0; i--) {
                if (!c[i]) continue;
                let cellContent = String(c[i].v || "") + " " + String(c[i].f || "");
                if (cellContent.includes('drive.google.com') || cellContent.includes('drive.usercontent.com')) {
                    let match = cellContent.match(/https?:\/\/(?:drive\.google\.com|drive\.usercontent\.com)[^\s")]+/);
                    if(match) imgLink = match[0];
                    else imgLink = c[i].v || c[i].f;
                    break;
                }
            }
            let narrativeOut = "";
            if (type === "บังคับล้อ") {
                let lockTime = c[40] ? formatThaiTime(c[40].v || c[40].f) : "";
                let plate = c[41] ? String(c[41].v || "").trim() : "";
                let reason = c[42] ? String(c[42].v || "").trim() : "";
                let lockPlace = c[43] ? String(c[43].v || "").trim() : (c[6] ? String(c[6].v || "").trim() : "");
                let text = `เมื่อวันที่ ${d.getDate()} ${thaiMonths[d.getMonth()]} ${d.getFullYear()+543}`;
                if (lockTime && lockTime !== '-') text += ` เวลา ${lockTime} น.`;
                text += ` ทางเจ้าหน้าที่จราจรได้ดำเนินการบังคับล้อรถยนต์`;
                if (plate && plate !== '-') text += ` ทะเบียน ${plate}`;
                if (lockPlace && lockPlace !== '-') text += ` บริเวณ${lockPlace}`;
                if (reason && reason !== '-') text += ` เนื่องจาก${reason}`;
                narrativeOut = text + " ทั้งนี้ได้มีการบันทึกภาพและข้อมูลไว้เป็นหลักฐานเพื่อดำเนินการตามระเบียบต่อไป";
            } else {
                let narrative = (c[29]?.v || "").toString().trim(); 
                if (!narrative) narrative = (c[13]?.v || "").toString().trim();
                if (!narrative) narrative = "ไม่มีรายละเอียดเพิ่มเติม";
                narrative = narrative.replace(/^\d{1,2}:\d{2}(:\d{2})?\s*(AM|PM)?/i, '').trim();
                narrativeOut = narrative.replace(/\s{2,}/g, ' '); 
            }
            return { date: d, type: type, detail: narrativeOut, img: imgLink }; 
        }).filter(x => x && x.date);
    }
    flags.accident = true; checkSetupData();
};

window.handleLFData = function(json) {
    if (json && json.table && json.table.rows) {
        const oldRows = json.table.rows.map(r => {
            const c = r.c; 
            if (!c) return null;
            let d = parseGoogleDate(c[0]) || parseGoogleDate(c[1]);
            if (!d) return null;
            let name = String(c[2]?.v || c[2]?.f || "ไม่ระบุชื่อ").trim();
            if (!name.startsWith('คุณ') && !name.startsWith('นาย') && !name.startsWith('นาง') && !name.startsWith('นางสาว')) name = 'คุณ' + name;
            const status = String(c[6]?.v || c[6]?.f || "");
            const item = String(c[10]?.v || c[7]?.v || c[13]?.v || "สิ่งของ").replace(/\n/g, ' ').trim();
            const place = String(c[11]?.v || c[8]?.v || "ไม่ระบุสถานที่").trim();
            const time = formatThaiTime(c[15]?.f || c[15]?.v || "");
            const typeText = String(c[2]?.v || c[2]?.f || "");
            let type = "other";
            let narrative = "";
            if (status.includes("คืน") || typeText.includes("คืน")) {
                type = "รับของคืน";
                narrative = `เมื่อวันที่ ${d.getDate()} ${thaiMonths[d.getMonth()]} ${d.getFullYear()+543} ${time ? `เวลา ${time} น.` : ''} ${name} ได้มาติดต่อขอรับสิ่งของคืน ประกอบด้วย ${item} โดยทางเจ้าหน้าที่ได้ตรวจสอบความถูกต้องและส่งมอบสิ่งของคืนให้แก่เจ้าของเป็นที่เรียบร้อยแล้ว`;
            } else if (typeText.includes("หาย") || typeText.includes("สูญหาย") || typeText.includes("ลืม") || typeText.includes("ตามหา")) {
                type = "แจ้งของหาย";
                narrative = `เมื่อวันที่ ${d.getDate()} ${thaiMonths[d.getMonth()]} ${d.getFullYear()+543} ${time ? `เวลา ${time} น.` : ''} ${name} ได้แจ้งเหตุสิ่งของสูญหาย คือ ${item} คาดว่าหล่นหายบริเวณ${place} เจ้าหน้าที่ได้บันทึกข้อมูลเพื่อประสานงานติดตามต่อไป`;
            } else {
                type = "แจ้งเก็บของได้";
                narrative = `เมื่อวันที่ ${d.getDate()} ${thaiMonths[d.getMonth()]} ${d.getFullYear()+543} ${time ? `เวลา ${time} น.` : ''} ${name} ได้พบสิ่งของตกหล่น คือ ${item} บริเวณ${place} และได้นำมามอบให้เจ้าหน้าที่เพื่อประกาศตามหาเจ้าของมารับคืนต่อไป`;
            }
            narrative = narrative.replace(/\s{2,}/g, ' '); 
            let imgLink = "";
            for (let i = c.length - 1; i >= 0; i--) {
                if (c[i] && (c[i].v || c[i].f) && typeof (c[i].v || c[i].f) === 'string' && (c[i].v || c[i].f).includes('drive.google.com')) { imgLink = c[i].v || c[i].f; break; }
            }
            return { date: d, type: type, detail: narrative, img: imgLink };
        }).filter(x => x);
        lfData = lfData.concat(oldRows);
    }
    flags.lf = true; checkSetupData();
};

window.handleLFDataNew = function(json) {
    if (json && json.table && json.table.rows) {
        const newRows = json.table.rows.map(r => {
            const c = r.c; 
            if (!c) return null;
            let d = parseGoogleDate(c[0]) || parseGoogleDate(c[7]);
            if (!d) return null;
            let name = String(c[3]?.v || c[3]?.f || "ไม่ระบุชื่อ").trim();
            if (!name.startsWith('คุณ') && !name.startsWith('นาย') && !name.startsWith('นาง') && !name.startsWith('นางสาว')) name = 'คุณ' + name;
            const status = String(c[12]?.v || c[12]?.f || "");
            const item = String(c[9]?.v || c[9]?.f || "สิ่งของ").replace(/\n/g, ' ').trim();
            const place = String(c[10]?.v || c[10]?.f || "ไม่ระบุสถานที่").trim();
            const time = formatThaiTime(c[8]?.f || c[8]?.v || "");
            const colCType = String(c[2]?.v || c[2]?.f || "");
            let type = "other";
            let narrative = "";
            if (status.includes("คืน") || colCType.includes("คืน")) {
                type = "รับคืนของ";
                narrative = `เมื่อวันที่ ${d.getDate()} ${thaiMonths[d.getMonth()]} ${d.getFullYear()+543} ${time ? `เวลา ${time} น.` : ''} ${name} ได้มาติดต่อขอรับสิ่งของคืน ประกอบด้วย ${item} โดยทางเจ้าหน้าที่ได้ตรวจสอบความถูกต้องและส่งมอบสิ่งของคืนให้แก่เจ้าของเป็นที่เรียบร้อยแล้ว`;
            } else if (colCType.includes("หาย") || colCType.includes("สูญหาย") || colCType.includes("ลืม") || colCType.includes("ตามหา")) {
                type = "แจ้งของหาย";
                narrative = `เมื่อวันที่ ${d.getDate()} ${thaiMonths[d.getMonth()]} ${d.getFullYear()+543} ${time ? `เวลา ${time} น.` : ''} ${name} ได้แจ้งเหตุสิ่งของสูญหาย คือ ${item} คาดว่าหล่นหายบริเวณ${place} เจ้าหน้าที่ได้บันทึกข้อมูลเพื่อประสานงานติดตามต่อไป`;
            } else {
                type = "แจ้งเก็บของได้";
                narrative = `เมื่อวันที่ ${d.getDate()} ${thaiMonths[d.getMonth()]} ${d.getFullYear()+543} ${time ? `เวลา ${time} น.` : ''} ${name} ได้พบสิ่งของตกหล่น คือ ${item} บริเวณ${place} และได้นำมามอบให้เจ้าหน้าที่เพื่อประกาศตามหาเจ้าของมารับคืนต่อไป`;
            }
            narrative = narrative.replace(/\s{2,}/g, ' '); 
            let imgLink = "";
            for (let i = c.length - 1; i >= 0; i--) {
                if (c[i] && (c[i].v || c[i].f) && typeof (c[i].v || c[i].f) === 'string' && (c[i].v || c[i].f).includes('drive.google.com')) { imgLink = c[i].v || c[i].f; break; }
            }
            return { date: d, type: type, detail: narrative, img: imgLink };
        }).filter(x => x);
        lfData = lfData.concat(newRows);
    }
    flags.lfNew = true; checkSetupData();
};

window.handleCarData = function(json) {
    if (json && json.table && json.table.rows) {
        carData = json.table.rows.map(r => {
            const c = r.c; 
            if (!c) return null; 
            let d = parseGoogleDate(c[7]);
            if (!d) return null;
            return { date: d, g1: c[1]?.v||0, g3: c[2]?.v||0, g4: c[3]?.v||0, g5: c[4]?.v||0, g6: c[5]?.v||0 };
        }).filter(x => x);
    }
    flags.car = true; checkSetupData();
};

window.handleRosterData = function(json) {
    if (json && json.table && json.table.rows) {
        let groups = { 1: [], 2: [], 3: [], 4: [] };
        
        for (let i = 4; i <= 7; i++) {
            if (json.table.rows[i]) {
                let c = json.table.rows[i].c;
                if (c && c[1] && c[1].v) groups[1].push(String(c[1].v).trim());
                if (c && c[2] && c[2].v) groups[2].push(String(c[2].v).trim());
                if (c && c[3] && c[3].v) groups[3].push(String(c[3].v).trim());
                if (c && c[4] && c[4].v) groups[4].push(String(c[4].v).trim());
            }
        }

        for (let i = 11; i < json.table.rows.length; i++) {
            let r = json.table.rows[i];
            if (!r || !r.c || !r.c[0]) continue;
            
            let d = null;
            if (r.c[0].v && typeof r.c[0].v === 'string' && r.c[0].v.startsWith('Date(')) {
                let p = r.c[0].v.match(/\d+/g);
                if (p && p.length >= 3) d = new Date(parseInt(p[0]), parseInt(p[1]), parseInt(p[2]));
            } else {
                let text = r.c[0].f || r.c[0].v;
                if (text && typeof text === 'string') {
                    let parts = text.split(/[ \/\-]/).filter(x => x);
                    if (parts.length >= 3) {
                        let y = parseInt(parts[2]), m = parseInt(parts[1]), day = parseInt(parts[0]);
                        if (parts[0].length === 4) { y = parseInt(parts[0]); m = parseInt(parts[1]); day = parseInt(parts[2]); }
                        if (m > 12) { let t = m; m = day; day = t; }
                        if (y < 100) y += 2000;
                        if (y > 2400) y -= 543;
                        d = new Date(y, m - 1, day);
                    }
                }
            }

            if (!d || isNaN(d.getTime())) continue;

            let y = d.getFullYear();
            let m = String(d.getMonth() + 1).padStart(2, '0');
            let day = String(d.getDate()).padStart(2, '0');
            let dateKey = `${y}-${m}-${day}`;

            let shiftM = [], shiftA = [], shiftN = [];
            let s1 = r.c[1] ? String(r.c[1].v).trim() : "";
            let s2 = r.c[2] ? String(r.c[2].v).trim() : "";
            let s3 = r.c[3] ? String(r.c[3].v).trim() : "";
            let s4 = r.c[4] ? String(r.c[4].v).trim() : "";

            if (s1 === 'เช้า') shiftM = shiftM.concat(groups[1]);
            else if (s1 === 'บ่าย') shiftA = shiftA.concat(groups[1]);
            else if (s1 === 'ดึก') shiftN = shiftN.concat(groups[1]);

            if (s2 === 'เช้า') shiftM = shiftM.concat(groups[2]);
            else if (s2 === 'บ่าย') shiftA = shiftA.concat(groups[2]);
            else if (s2 === 'ดึก') shiftN = shiftN.concat(groups[2]);

            if (s3 === 'เช้า') shiftM = shiftM.concat(groups[3]);
            else if (s3 === 'บ่าย') shiftA = shiftA.concat(groups[3]);
            else if (s3 === 'ดึก') shiftN = shiftN.concat(groups[3]);

            if (s4 === 'เช้า') shiftM = shiftM.concat(groups[4]);
            else if (s4 === 'บ่าย') shiftA = shiftA.concat(groups[4]);
            else if (s4 === 'ดึก') shiftN = shiftN.concat(groups[4]);

            rosterData[dateKey] = { 'เช้า': shiftM, 'บ่าย': shiftA, 'ดึก': shiftN };
        }
    }
    flags.roster = true;
    checkSetupData();
};

// 🌟 ระบบจัดการดึง "ตำแหน่ง" จากคอลัมน์ B เท่านั้น (ไม่ยุ่งกับคอลัมน์อื่น)
window.handleDutyData = function(json) {
    dutyMap = {};
    if (json && json.table && json.table.rows) {
        json.table.rows.forEach(row => {
            if (!row || !row.c) return;
            
            // คอลัมน์ B คือ ตำแหน่ง (index 1 ในระบบสคริปต์)
            let positionCell = row.c[1];
            let position = positionCell ? String(positionCell.v || positionCell.f || '').trim() : '';
            
            if (position) {
                // ค้นหาชื่อพนักงานในแถวนั้นๆ (ปกติอยู่คอลัมน์ A หรือ C)
                let name = '';
                if (row.c[0] && row.c[0].v) name = String(row.c[0].v).trim();
                if (!name && row.c[2] && row.c[2].v) name = String(row.c[2].v).trim();
                
                if (name && name !== '-') {
                    // ล้างคำนำหน้าออกเพื่อให้ชื่อตรงกับตารางเวรหลัก
                    let cleanName = name.replace(/^(นาย|นาง|นางสาว)\s*/, "");
                    dutyMap[cleanName] = position;
                    dutyMap[name] = position;
                }
            }
        });
    }
    flags.duty = true;
    checkSetupData();
};

function checkSetupData() { 
    if (flags.accident && flags.lf && flags.lfNew && flags.car && flags.roster && flags.duty) {
        renderAllTables(); 
    }
}

function renderAllTables() {
    const ds = document.getElementById('dateSelect').value; 
    if (!ds) return;
    const targetDate = new Date(ds);
    const isSame = (d1, d2) => d1 && d2.getFullYear() === d1.getFullYear() && d2.getMonth() === d1.getMonth() && d2.getDate() === d1.getDate();
    const todayCheck = new Date(); todayCheck.setHours(0,0,0,0);
    const targetCheck = new Date(targetDate); targetCheck.setHours(0,0,0,0);
    document.getElementById('btnNext').disabled = (targetCheck.getTime() >= todayCheck.getTime());
    const dateStr = formatThaiDate(targetDate);
    document.getElementById('customDateText').innerHTML = `รายงานเหตุการณ์ประจำ <span class="text-blue-600 ml-2">${dateStr}</span>`;
    
    const summary = {};
    let dailyAll = [];
    accidentData.concat(lfData).forEach(r => {
        if (isSame(r.date, targetDate)) {
            summary[r.type] = (summary[r.type] || 0) + 1;
            dailyAll.push(r);
        }
    });

    const priorityOrder = ["เพลิงไหม้", "บังคับล้อ", "อุบัติเหตุจากยานพาหนะ", "อุบัติเหตุทั่วไป", "รับส่งผู้ป่วย", "รับส่งผู้ได้รับบาดเจ็บ"];

    const incKeys = Object.keys(summary).sort((a, b) => {
        let indexA = priorityOrder.indexOf(a); let indexB = priorityOrder.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b, 'th');
    });

    dailyAll.sort((a, b) => {
        let indexA = priorityOrder.indexOf(a.type); let indexB = priorityOrder.indexOf(b.type);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.type.localeCompare(b.type, 'th');
    });

    const suffix = document.getElementById('docIntroSuffix');
    if (suffix) {
        if (dailyAll.length === 0) {
            suffix.innerHTML = "<span style='font-weight: bold !important;'>เหตุการณ์โดยทั่วไปเป็นไปด้วยความเรียบร้อย</span>";
        } else {
            suffix.innerHTML = "<span style='font-weight: bold !important;'>พบเหตุการณ์ไม่ปกติ โดยมีรายละเอียดดังนี้</span>";
        }
    }

    const maxDataRows = Math.max(5, incKeys.length);
    const incBody = document.getElementById('incDailyBody'); 
    incBody.innerHTML = '';
    let totalInc = 0;
    
    if (dailyAll.length === 0) {
        incBody.innerHTML += `<tr><td class="text-center text-gray-400 text-[16px] font-normal">ไม่มีเหตุการณ์ในวันนี้</td><td class="text-center text-gray-400 text-[16px] font-normal">-</td></tr>`;
        for(let i = 1; i < maxDataRows; i++) incBody.innerHTML += `<tr><td class="text-center text-gray-500 font-normal text-[16px]">-</td><td class="text-center text-gray-500 font-normal text-[16px]">-</td></tr>`;
    } else {
        for (let i = 0; i < maxDataRows; i++) {
            if (i < incKeys.length) {
                let k = incKeys[i];
                totalInc += summary[k];
                incBody.innerHTML += `<tr><td class="text-center font-normal text-[16px]">${k}</td><td class="text-center font-normal text-[16px]">${summary[k]}</td></tr>`;
            } else {
                incBody.innerHTML += `<tr><td class="text-center text-gray-500 font-normal text-[16px]">-</td><td class="text-center text-gray-500 font-normal text-[16px]">-</td></tr>`;
            }
        }
    }
    incBody.innerHTML += `<tr class="bg-amber-50 font-bold"><td class="text-center text-[16px]">รวม</td><td class="text-center text-black text-[16px]">${totalInc}</td></tr>`;

    const detailContainer = document.getElementById('incidentTextDetails');
    if(detailContainer) {
        detailContainer.innerHTML = '';
        if (dailyAll.length === 0) {
            detailContainer.innerHTML = `<div class="text-center py-12"><div class="inline-block bg-green-50 border-2 border-green-200 rounded-2xl px-10 py-6 shadow-sm"><p class="text-green-600 font-extrabold text-[36px] m-0 flex items-center justify-center gap-3"><svg width="40" height="40" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>เหตุการณ์ปกติ ไม่มีเหตุการณ์</p></div></div>`;
        } else {
            dailyAll.forEach((item, index) => {
                let driveId = extractDriveId(item.img);
                let imgHtml = '';
                if (driveId) {
                    let primaryImg = `https://drive.google.com/thumbnail?id=${driveId}&sz=w800`;
                    let backupImg = `https://wsrv.nl/?url=drive.google.com/uc?export=view&id=${driveId}&output=jpeg&w=800`;
                    
                    imgHtml = `<div class="w-full md:w-1/3 flex-shrink-0 flex justify-center bg-gray-50 rounded-xl p-2 border border-gray-200 shadow-sm overflow-hidden"><img src="${primaryImg}" class="w-full h-[250px] md:h-[300px] object-cover rounded-lg shadow-sm" alt="รูปภาพประกอบ" crossorigin="anonymous" onerror="if(this.src !== '${backupImg}') { this.src='${backupImg}'; } else { this.parentElement.innerHTML='<div class=\\'flex flex-col items-center text-center justify-center h-[250px] md:h-[300px] w-full bg-red-50 border-2 border-dashed border-red-300 rounded-lg p-3\\'><span class=\\'text-red-600 font-bold text-[22px]\\'>โหลดรูปไม่ได้</span></div>'; }"></div>`;
                } else {
                    imgHtml = `<div class="w-full md:w-1/3 flex-shrink-0 flex justify-center items-center bg-gray-50 rounded-xl p-2 border-2 border-dashed border-gray-300 shadow-sm overflow-hidden h-[250px] md:h-[300px]"><span class="text-gray-400 font-medium text-[18px]">ไม่มีรูปภาพประกอบ</span></div>`;
                }
                detailContainer.innerHTML += `<div class="mb-10 border-b-2 border-gray-200 pb-8 last:border-0"><div class="flex flex-col md:flex-row gap-8 items-start">${imgHtml}<div class="w-full md:w-2/3 leading-relaxed"><div class="font-bold text-blue-700 text-[18px] mb-3 border-b border-blue-100 pb-2 inline-block w-full">${index + 1}. ${item.type}</div><div class="thai-justify font-normal text-[18px]">${item.detail}</div></div></div></div>`;
            });
        }
    }

    const summaryContainerDoc = document.getElementById('incidentSummaryList');
    if (summaryContainerDoc) {
        summaryContainerDoc.innerHTML = ''; 
        if (dailyAll.length === 0) {
            summaryContainerDoc.innerHTML = `
            <div style="display: flex; gap: 20px; margin-bottom: 5px; white-space: nowrap;">
                <div></div>
            </div>`;
        } else {
            incKeys.forEach((k, index) => {
                let incidentCount = summary[k];
                summaryContainerDoc.innerHTML += `
                <div style="display: flex; gap: 20px; margin-bottom: 5px; white-space: nowrap;">
                    <div>${index + 1}. ${k}</div>
                    <div>${incidentCount} ครั้ง</div>
                </div>`;
            });
        }
    }

    // ========================================================
    // 3. ส่วนของหน้า A4 (รูปแบบหน้าหนังสือพิมพ์: รูปใหญ่ครึ่งจอซ้าย ข้อความล้อมขวา)
    // ========================================================
    const detailContainerDoc = document.getElementById('incidentTextList');
    if (detailContainerDoc) {
        detailContainerDoc.innerHTML = '';
        if (dailyAll.length > 0) {
            dailyAll.forEach((item, index) => {
                let driveId = extractDriveId(item.img);
                let imgHtml = '';
                
                if (driveId) {
                    let safeImgUrl = `https://wsrv.nl/?url=drive.google.com/uc?id=${driveId}&output=jpg&w=600&fit=cover`; 
                    imgHtml = `<img src="${safeImgUrl}" crossorigin="anonymous" style="float: left; width: 45%; max-height: 250px; object-fit: cover; border-radius: 6px; margin: 5px 20px 10px 0; border: 1px solid #000000;">`;
                } else {
                    imgHtml = `<div style="float: left; width: 45%; height: 180px; background-color: #f8fafc; border: 2px dashed #000000; border-radius: 6px; margin: 5px 20px 10px 0; display: table; text-align: center;"><div style="display: table-cell; vertical-align: middle; color: #000000; font-size: 14pt;">ไม่มีรูปภาพ</div></div>`;
                }

                // 🌟 ถอด page-break-inside: avoid; ออก เพื่อให้เริ่มต่อจากตารางได้ทันที และไหลข้ามหน้าได้
                // 🌟 ใส่ margin-top: 25px; เพื่อเว้นระยะจากตารางด้านบนประมาณ 1 บรรทัดเสมอ
                detailContainerDoc.innerHTML += `
                <div style="width: 100%; margin-top: 25px; margin-bottom: 30px; font-family: 'TH Sarabun New', 'TH SarabunPSK', Tahoma, sans-serif; text-rendering: optimizeLegibility;">
                    ${imgHtml}
                    <div style="font-size: 16pt; line-height: 26px; word-wrap: break-word; text-align: justify; text-justify: inter-word;">
                        <div style="font-weight: bold; margin-bottom: 5px; text-align: left;">${index + 1}. ${item.type}</div>
                        <span style="display: inline-block; width: 1cm;"></span>${item.detail}
                    </div>
                    <div style="clear: both;"></div> 
                </div>`;
            });
        }

        // เพิ่มคำลงท้าย "จึงเรียนมาเพื่อโปรดทราบ"
        detailContainerDoc.innerHTML += `
        <div style="width: 100%; text-align: justify; font-family: 'TH Sarabun New', 'TH SarabunPSK', Tahoma, sans-serif; font-size: 16pt; line-height: 26px; margin-top: 10px; margin-bottom: 20px;">
            <span style="display: inline-block; width: 2.5cm;"></span>จึงเรียนมาเพื่อโปรดทราบ
        </div>`;
    }

    if (google && google.visualization && google.visualization.ColumnChart) drawDailyCarChart();
    else google.charts.setOnLoadCallback(drawDailyCarChart);

    updateDocumentDates();
}

function drawDailyCarChart() {
    if (!google || !google.visualization) return;
    const ds = document.getElementById('dateSelect').value;
    if (!ds) return;
    const date0 = new Date(ds); 
    const date1 = new Date(date0); date1.setDate(date1.getDate() - 1); 
    const date2 = new Date(date0); date2.setDate(date2.getDate() - 2); 
    const isSame = (d1, d2) => d1 && d2 && d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
    
    let row0 = carData.find(r => isSame(r.date, date0)) || { g1: 0, g3: 0, g4: 0, g5: 0, g6: 0 };
    let row1 = carData.find(r => isSame(r.date, date1)) || { g1: 0, g3: 0, g4: 0, g5: 0, g6: 0 };
    let row2 = carData.find(r => isSame(r.date, date2)) || { g1: 0, g3: 0, g4: 0, g5: 0, g6: 0 };
    
    const shortThaiMonths = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
    const shortDate = (d) => `${d.getDate()} ${shortThaiMonths[d.getMonth()]} ${(d.getFullYear() + 543).toString().slice(-2)}`;
    
    const total0 = row0.g1 + row0.g3 + row0.g4 + row0.g5 + row0.g6;
    const total1 = row1.g1 + row1.g3 + row1.g4 + row1.g5 + row1.g6;
    const total2 = row2.g1 + row2.g3 + row2.g4 + row2.g5 + row2.g6;

    const formatK = (num) => {
        if (num >= 1000) {
            return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
        }
        return num.toString();
    };
    
    const summaryContainer = document.getElementById('car-summary-cards');
    if (summaryContainer) {
        summaryContainer.innerHTML = `<div class="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center shadow-sm text-slate-600 font-normal"><div class="text-[16px] mb-1">วันที่ ${shortDate(date2)}</div><div class="text-[16px]">ทั้งหมด ${total2.toLocaleString()} คัน</div></div><div class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center shadow-sm text-blue-600 font-normal"><div class="text-[16px] mb-1">วันที่ ${shortDate(date1)}</div><div class="text-[16px]">ทั้งหมด ${total1.toLocaleString()} คัน</div></div><div class="bg-blue-600 border border-blue-700 rounded-lg p-3 text-center shadow-md transform scale-105 text-white font-normal"><div class="text-[16px] mb-1">วันที่ ${shortDate(date0)}</div><div class="text-[16px]">ทั้งหมด ${total0.toLocaleString()} คัน</div></div>`;
    }

    const summaryContainerDoc = document.getElementById('car-summary-cards-doc');
    if (summaryContainerDoc) {
        // 🌟 ปรับ font-weight เป็น normal เพื่อให้ตัวอักษรบางลง
        summaryContainerDoc.innerHTML = `
            <table style="width: 100%; border-collapse: collapse; text-align: center; color: #000;">
                <tr style="background-color: #f8fafc;">
                    <td style="border-bottom: 1px solid #000; border-right: 1px solid #000; padding: 8px; width: 33.33%;">
                        <div style="font-size: 14pt; line-height: 1.2;">วันที่ ${shortDate(date2)}</div>
                        <div style="font-size: 14pt; font-weight: normal; line-height: 1.2;">ทั้งหมด ${total2.toLocaleString()} คัน</div>
                    </td>
                    <td style="border-bottom: 1px solid #000; border-right: 1px solid #000; padding: 8px; width: 33.33%;">
                        <div style="font-size: 14pt; line-height: 1.2;">วันที่ ${shortDate(date1)}</div>
                        <div style="font-size: 14pt; font-weight: normal; line-height: 1.2;">ทั้งหมด ${total1.toLocaleString()} คัน</div>
                    </td>
                    <td style="border-bottom: 1px solid #000; padding: 8px; width: 33.33%; background-color: #e2e8f0;">
                        <div style="font-size: 14pt; line-height: 1.2;">วันที่ ${shortDate(date0)}</div>
                        <div style="font-size: 14pt; font-weight: normal; line-height: 1.2;">ทั้งหมด ${total0.toLocaleString()} คัน</div>
                    </td>
                </tr>
            </table>
        `;
    }

    // 🌟 แยกข้อมูลกราฟหน้า Dashboard (สีสันสดใส)
    const dataArrayDash = [
        ['ประตู', `${shortDate(date2)}`, { role: 'annotation' }, { role: 'style' }, `${shortDate(date1)}`, { role: 'annotation' }, { role: 'style' }, `${shortDate(date0)}`, { role: 'annotation' }, { role: 'style' }],
        ['ประตู 1', row2.g1, formatK(row2.g1), 'stroke-color: #ffffff; stroke-width: 1; fill-color: #cbd5e1', row1.g1, formatK(row1.g1), 'stroke-color: #ffffff; stroke-width: 1; fill-color: #60a5fa', row0.g1, formatK(row0.g1), 'stroke-color: #ffffff; stroke-width: 1; fill-color: #2563eb'],
        ['ประตู 3', row2.g3, formatK(row2.g3), 'stroke-color: #ffffff; stroke-width: 1; fill-color: #cbd5e1', row1.g3, formatK(row1.g3), 'stroke-color: #ffffff; stroke-width: 1; fill-color: #60a5fa', row0.g3, formatK(row0.g3), 'stroke-color: #ffffff; stroke-width: 1; fill-color: #2563eb'],
        ['ประตู 4', row2.g4, formatK(row2.g4), 'stroke-color: #ffffff; stroke-width: 1; fill-color: #cbd5e1', row1.g4, formatK(row1.g4), 'stroke-color: #ffffff; stroke-width: 1; fill-color: #60a5fa', row0.g4, formatK(row0.g4), 'stroke-color: #ffffff; stroke-width: 1; fill-color: #2563eb'],
        ['ประตู 5', row2.g5, formatK(row2.g5), 'stroke-color: #ffffff; stroke-width: 1; fill-color: #cbd5e1', row1.g5, formatK(row1.g5), 'stroke-color: #ffffff; stroke-width: 1; fill-color: #60a5fa', row0.g5, formatK(row0.g5), 'stroke-color: #ffffff; stroke-width: 1; fill-color: #2563eb'],
        ['ประตู 6', row2.g6, formatK(row2.g6), 'stroke-color: #ffffff; stroke-width: 1; fill-color: #cbd5e1', row1.g6, formatK(row1.g6), 'stroke-color: #ffffff; stroke-width: 1; fill-color: #60a5fa', row0.g6, formatK(row0.g6), 'stroke-color: #ffffff; stroke-width: 1; fill-color: #2563eb']
    ];
    const dataTableDash = google.visualization.arrayToDataTable(dataArrayDash);

    // 🌟 แยกข้อมูลกราฟหน้า A4 Document (ขาว-ดำ-เทา และตีกรอบแท่งกราฟสีดำ)
    const dataArrayDoc = [
        ['ประตู', `${shortDate(date2)}`, { role: 'annotation' }, { role: 'style' }, `${shortDate(date1)}`, { role: 'annotation' }, { role: 'style' }, `${shortDate(date0)}`, { role: 'annotation' }, { role: 'style' }],
        ['ประตู 1', row2.g1, formatK(row2.g1), 'stroke-color: #000000; stroke-width: 1; fill-color: #e5e5e5', row1.g1, formatK(row1.g1), 'stroke-color: #000000; stroke-width: 1; fill-color: #9ca3af', row0.g1, formatK(row0.g1), 'stroke-color: #000000; stroke-width: 1; fill-color: #4b5563'],
        ['ประตู 3', row2.g3, formatK(row2.g3), 'stroke-color: #000000; stroke-width: 1; fill-color: #e5e5e5', row1.g3, formatK(row1.g3), 'stroke-color: #000000; stroke-width: 1; fill-color: #9ca3af', row0.g3, formatK(row0.g3), 'stroke-color: #000000; stroke-width: 1; fill-color: #4b5563'],
        ['ประตู 4', row2.g4, formatK(row2.g4), 'stroke-color: #000000; stroke-width: 1; fill-color: #e5e5e5', row1.g4, formatK(row1.g4), 'stroke-color: #000000; stroke-width: 1; fill-color: #9ca3af', row0.g4, formatK(row0.g4), 'stroke-color: #000000; stroke-width: 1; fill-color: #4b5563'],
        ['ประตู 5', row2.g5, formatK(row2.g5), 'stroke-color: #000000; stroke-width: 1; fill-color: #e5e5e5', row1.g5, formatK(row1.g5), 'stroke-color: #000000; stroke-width: 1; fill-color: #9ca3af', row0.g5, formatK(row0.g5), 'stroke-color: #000000; stroke-width: 1; fill-color: #4b5563'],
        ['ประตู 6', row2.g6, formatK(row2.g6), 'stroke-color: #000000; stroke-width: 1; fill-color: #e5e5e5', row1.g6, formatK(row1.g6), 'stroke-color: #000000; stroke-width: 1; fill-color: #9ca3af', row0.g6, formatK(row0.g6), 'stroke-color: #000000; stroke-width: 1; fill-color: #4b5563']
    ];
    const dataTableDoc = google.visualization.arrayToDataTable(dataArrayDoc);

    const optionsDash = {
        fontName: 'TH Sarabun New',
        chartArea: { left: '8%', right: '2%', top: '15%', bottom: '15%' },
        hAxis: { textStyle: { fontSize: 16, bold: true, color: '#334155' } },
        vAxis: { format: 'short', textStyle: { fontSize: 16, bold: false, color: '#000000' }, minValue: 0, gridlines: { color: '#f1f5f9' }, baselineColor: '#334155' },
        colors: ['#cbd5e1', '#60a5fa', '#2563eb'],
        legend: { position: 'top', alignment: 'center', textStyle: { fontName: 'TH Sarabun New', fontSize: 16, color: '#334155' } },
        annotations: { alwaysOutside: true, textStyle: { fontName: 'TH Sarabun New', fontSize: 12, color: '#000000' } },
        animation: { startup: true, duration: 800, easing: 'out' },
        backgroundColor: '#ffffff',
        bar: { groupWidth: '75%' }
    };

    // 🌟 เปลี่ยนสีตัวอักษรและเส้นตารางให้เป็นสีดำ-เทาเข้ม (สำหรับหน้า A4)
    const optionsDoc = {
        fontName: 'TH Sarabun New',
        chartArea: { left: '6%', right: '1%', top: '18%', bottom: '12%', width: '93%', height: '70%' }, 
        hAxis: { textStyle: { fontSize: 14, bold: true, color: '#000000' } },
        vAxis: { format: 'short', textStyle: { fontSize: 14, color: '#000000' }, minValue: 0, gridlines: { color: '#cccccc' }, baselineColor: '#000000' },
        colors: ['#e5e5e5', '#9ca3af', '#4b5563'],
        legend: { position: 'top', alignment: 'center', textStyle: { fontName: 'TH Sarabun New', fontSize: 14, color: '#000000' } },
        // 🌟 เปลี่ยนสีของตัวเลข (annotations) ให้โปร่งใส (transparent) เพื่อซ่อนให้เนียนตา
        annotations: { alwaysOutside: true, textStyle: { color: 'transparent' } },
        backgroundColor: '#ffffff',
        bar: { groupWidth: '85%' } 
    };
    const chartDiv1 = document.getElementById('daily_car_chart');
    if (chartDiv1) {
        window.myChart = new google.visualization.ColumnChart(chartDiv1);
        window.myChart.draw(dataTableDash, optionsDash);
    }

    const chartDiv2 = document.getElementById('daily_car_chart_doc');
    if (chartDiv2) {
        window.myChartDoc = new google.visualization.ColumnChart(chartDiv2);
        window.myChartDoc.draw(dataTableDoc, optionsDoc);
    }
}

function exportToJPEG() {
    const captureArea = document.getElementById('pdfContent');
    const controlsArea = document.getElementById('controlsContainer');
    const exportBtn = document.getElementById('exportBtn');
    const chartDiv = document.getElementById('daily_car_chart');
    let tempImg = null;
    if (window.myChart) {
        tempImg = document.createElement('img');
        tempImg.src = window.myChart.getImageURI(); 
        tempImg.style.width = "100%"; tempImg.style.height = "320px"; tempImg.style.objectFit = "contain";
        chartDiv.style.display = 'none'; chartDiv.parentNode.insertBefore(tempImg, chartDiv); 
    }
    controlsArea.style.display = 'none'; exportBtn.style.display = 'none';
    html2canvas(captureArea, { scale: 2, useCORS: true, allowTaint: false, backgroundColor: '#ffffff', imageTimeout: 15000 }).then(canvas => {
        controlsArea.style.display = 'flex'; exportBtn.style.display = 'flex'; 
        if (tempImg) { tempImg.remove(); chartDiv.style.display = 'block'; }
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/jpeg', 0.9); link.download = `Daily_Report_${document.getElementById('dateSelect').value}.jpg`; link.click();
    }).catch(err => {
        controlsArea.style.display = 'flex'; exportBtn.style.display = 'flex';
        if (tempImg) { tempImg.remove(); chartDiv.style.display = 'block'; }
        console.error("Export Error: ", err); alert("เกิดข้อผิดพลาดในการบันทึกภาพ");
    });
}

function toggleView(view) {
    const tabDash = document.getElementById('tabDash');
    const tabDoc = document.getElementById('tabDoc');
    
    if(view === 'dashboard') {
        document.getElementById('pdfContent').style.display = 'block';
        document.getElementById('documentSection').style.display = 'none';
        
        tabDash.className = "px-6 py-2 bg-blue-600 text-white rounded-lg shadow font-bold transition";
        tabDoc.className = "px-6 py-2 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-lg shadow font-bold transition";
        
        if (typeof drawDailyCarChart === 'function') drawDailyCarChart();
    } else {
        document.getElementById('pdfContent').style.display = 'none';
        document.getElementById('documentSection').style.display = 'flex';
        
        tabDash.className = "px-6 py-2 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-lg shadow font-bold transition";
        tabDoc.className = "px-6 py-2 bg-blue-600 text-white rounded-lg shadow font-bold transition";
        
        updateDocumentDates();
        
        setTimeout(() => {
            if (typeof drawDailyCarChart === 'function') drawDailyCarChart();
        }, 100);
    }
}

function updateDocumentDates() {
    const ds = document.getElementById('dateSelect').value; 
    if (!ds) return;
    
    const targetDate = new Date(ds);
    const dateStr = formatThaiDate(targetDate); 
    
    const targetEl = document.getElementById('docTargetDate');
    if(targetEl) targetEl.innerText = dateStr;
    
    updateShiftTableByDate(ds);
}

// 🌟 ระบบดึงรายชื่อเข้าตารางเวร (จำนวนแถวยืดหยุ่นตามคนจริง) 🌟
function updateShiftTableByDate(selectedDate) {
    const dayData = rosterData[selectedDate] || { 'เช้า': [], 'บ่าย': [], 'ดึก': [] };
    
    const shifts = [
        { id: 'เช้า', label: 'ผลัดเช้า', time: '07.00 - 15.00 น.' },
        { id: 'บ่าย', label: 'ผลัดบ่าย', time: '15.00 - 23.00 น.' },
        { id: 'ดึก', label: 'ผลัดกลางคืน', time: '23.00 - 07.00 น.' }
    ];

    let dashHtml = '';
    let docHtml = '';

    shifts.forEach(s => {
        // 🌟 กรองเอาเฉพาะคนที่มีชื่อจริงๆ ออกมา (ลบค่าว่างและขีดทิ้ง)
        let names = (dayData[s.id] || []).filter(n => n && String(n).trim() !== '' && String(n).trim() !== '-');
        
        // 🌟 กำหนดจำนวนแถวให้เท่ากับคนที่มีอยู่จริง (ไม่ต้องมีแถว - เผื่อไว้แล้ว)
        // แต่ถ้ายกเลิกจนหมดเกลี้ยง จะเหลือ 1 แถวเปล่าไว้กันตารางพัง
        let rowCount = Math.max(names.length, 1); 

        for (let i = 0; i < rowCount; i++) {
            let name = names[i] ? String(names[i]) : ''; 
            name = name.replace(/^(นาย|นาง|นางสาว)\s*/, "").trim();

            let role = '';
            if (name !== '') {
                role = dutyMap[name] || `สายตรวจ ${i + 1}`;
                name = "นาย" + name; 
            } else {
                role = '-';
                name = '-';
            }

            let rowId = `roster-${s.id}-${i}`;

            // ส่งชื่อไปให้ระบบลบ
            let clickEvent = name !== '-' ? `ondblclick="removeNameFromShift('${s.id}', '${name}')"` : '';
            let hoverClassDash = name !== '-' ? 'hover:bg-red-50 cursor-pointer select-none' : '';
            let hoverClassDoc = name !== '-' ? 'cursor-pointer select-none' : ''; 
            let tooltip = name !== '-' ? 'title="ดับเบิลคลิกที่นี่เพื่อนำชื่อออก (แถวจะหายไปเลย)"' : '';

            // 1. ตารางหน้า Dashboard 
            dashHtml += `<tr id="dash-${rowId}" class="border-black transition ${hoverClassDash}" ${tooltip} ${clickEvent}>`;
            if (i === 0) {
                dashHtml += `<td rowspan="${rowCount}" class="border border-black px-4 py-1 font-bold align-middle text-center bg-white">${s.label}<br><span class="text-[14px] font-normal text-gray-800">${s.time}</span></td>`;
            }
            dashHtml += `<td class="border border-black px-4 py-1 text-center bg-white">${role}</td>`;
            dashHtml += `<td class="border border-black px-4 py-1 text-left bg-white font-medium text-blue-700">${name}</td>`;
            dashHtml += `</tr>`;

            // 2. ตารางหน้า Document A4
            docHtml += `<tr id="doc-${rowId}" class="${hoverClassDoc}" ${tooltip} ${clickEvent}>`;
            if (i === 0) {
                docHtml += `<td rowspan="${rowCount}" style="border: 1px solid #000; padding: 2px 8px; text-align: center; vertical-align: middle; font-weight: bold;">${s.label}<br><span style="font-weight: normal; font-size: 14pt;">${s.time}</span></td>`;
            }
            docHtml += `<td style="border: 1px solid #000; padding: 2px 8px; text-align: center;">${role}</td>`;
            docHtml += `<td style="border: 1px solid #000; padding: 2px 8px; text-align: left;">${name}</td>`;
            docHtml += `</tr>`;
        }
    });

    const dashBody = document.getElementById('dashboardRosterBody');
    if (dashBody) dashBody.innerHTML = dashHtml;

    const docBody = document.getElementById('documentRosterBody');
    if (docBody) docBody.innerHTML = docHtml;
}
// ==========================================
// 🌟 ฟังก์ชันนำรายชื่อออก (แถวจะถูกลบทิ้งและตารางจะหดสั้นลงอัตโนมัติ)
// ==========================================
window.removeNameFromShift = function(shiftId, nameToRemove) {
    const ds = document.getElementById('dateSelect').value;
    if (!ds || !rosterData[ds]) return;

    let namesArray = rosterData[ds][shiftId];
    if (namesArray) {
        // ตัดคำนำหน้าออกเพื่อเทียบชื่อให้แม่นยำ
        let cleanTarget = nameToRemove.replace(/^(นาย|นาง|นางสาว)\s*/, "").trim();
        
        let targetIndex = namesArray.findIndex(n => {
            let cleanN = n ? String(n).replace(/^(นาย|นาง|นางสาว)\s*/, "").trim() : '';
            return cleanN === cleanTarget;
        });

        if (targetIndex !== -1) {
            namesArray.splice(targetIndex, 1); // ลบชื่อออกจากความจำ
            updateShiftTableByDate(ds); // สั่งวาดตารางใหม่
        }
    }
};
// ==========================================
// 🌟 ฟังก์ชันดึงข้อมูลตาราง รปภ. จาก Google Sheet โดยตรง
// ==========================================
function loadSecurityGuardData() {
    const sheetId = '1lYRhXtLgec6ISM6Ugt-YKLrh47NRt7ihcVLcD8mI_Yg';
    const gid = '949046249';
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${gid}&headers=1`;

    fetch(url)
        .then(response => response.text())
        .then(text => {
            const jsonString = text.match(/google\.visualization\.Query\.setResponse\(([\s\S\w]+)\);/)[1];
            const data = JSON.parse(jsonString);
            
            const rows = data.table.rows;
            let html = '';
            let sumTotal = 0, sumMorning = 0, sumNight = 0;

            if (rows.length > 0) {
                rows.forEach(row => {
                    let unit = row.c[0] ? row.c[0].v : '';
                    if (!unit) return; 

                    // 🌟 1. ย่อชื่อสถาบันให้สั้นลง
                    if (unit.includes('โครงการจัดตั้งสถาบันอุทยานธรรมชาติวิทยาสิรีรุกขชาติ')) {
                        unit = 'สิรีรุกขชาติ';
                    }

                    let total = row.c[1] && row.c[1].v != null ? row.c[1].v : '-';
                    let morning = row.c[2] && row.c[2].v != null ? row.c[2].v : '-';
                    let night = row.c[3] && row.c[3].v != null ? row.c[3].v : '-';
                    
                    // ดึงข้อความหมายเหตุที่พิมพ์ไว้ใน Google Sheet
                    let sheetRemark = row.c[4] && row.c[4].v != null ? row.c[4].v : '';
                    let finalRemark = sheetRemark;

                    // 🌟 2. ระบบคำนวณคนขาด/ครบ อัตโนมัติ
                    if (total !== '-' && morning !== '-' && night !== '-') {
                        let t = Number(total);
                        let m = Number(morning);
                        let n = Number(night);
                        let diff = t - (m + n);

                        if (diff === 0) {
                            finalRemark = 'ครบ';
                        } else if (diff > 0) {
                            // ถ้าขาด ระบบจะพิมพ์ "ขาด X คน" สีแดงให้ทันที
                            // ส่วนคำว่า "ผลัดเช้า" หรือ "ผลัดดึก" ให้คุณแพรวพิมพ์ใส่ช่องหมายเหตุใน Sheet ได้เลย มันจะเอามาต่อท้ายให้เองครับ
                            finalRemark = `<span style="color: #dc2626; font-weight: bold;">ขาด ${diff} คน ${sheetRemark}</span>`;
                        }
                    }

                    if (!isNaN(total) && total !== '-') sumTotal += Number(total);
                    if (!isNaN(morning) && morning !== '-') sumMorning += Number(morning);
                    if (!isNaN(night) && night !== '-') sumNight += Number(night);

                    // 🌟 3. ปรับ padding ให้เหลือ 0px 8px เพื่อให้บรรทัดแคบลงที่สุด
                    html += `<tr>
                        <td style="border: 1px solid #000; padding: 0px 8px; text-align: left;">${unit}</td>
                        <td style="border: 1px solid #000; padding: 0px 8px; text-align: center;">${total}</td>
                        <td style="border: 1px solid #000; padding: 0px 8px; text-align: center;">${morning}</td>
                        <td style="border: 1px solid #000; padding: 0px 8px; text-align: center;">${night}</td>
                        <td style="border: 1px solid #000; padding: 0px 8px; text-align: center;">${finalRemark}</td>
                    </tr>`;
                });

                html += `<tr style="font-weight: bold; background-color: #f8fafc;">
                    <td style="border: 1px solid #000; padding: 0px 8px; text-align: center;">รวมทั้งหมด</td>
                    <td style="border: 1px solid #000; padding: 0px 8px; text-align: center;">${sumTotal}</td>
                    <td style="border: 1px solid #000; padding: 0px 8px; text-align: center;">${sumMorning}</td>
                    <td style="border: 1px solid #000; padding: 0px 8px; text-align: center;">${sumNight}</td>
                    <td style="border: 1px solid #000; padding: 0px 8px; text-align: center;"></td>
                </tr>`;

            } else {
                html = `<tr><td colspan="5" style="text-align: center; border: 1px solid #000; padding: 4px;">ไม่มีข้อมูล</td></tr>`;
            }

            const tbody = document.getElementById('securityGuardTableBody');
            if (tbody) tbody.innerHTML = html;
        })
        .catch(error => { console.error('Error:', error); });
}

document.addEventListener('DOMContentLoaded', () => {
    loadSecurityGuardData();
});