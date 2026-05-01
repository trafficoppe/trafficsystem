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

const deptText = document.querySelector('#dateBox > div:nth-child(2)');
if (deptText) {
    deptText.className = "font-bold text-[25px] text-[#0f172a] pointer-events-none whitespace-nowrap text-center leading-normal pt-2";
}

const printDeptText = document.querySelector('#printHeaderContainer > h2');
if (printDeptText) {
    printDeptText.className = "text-center font-bold text-[25px] text-[#0f172a] m-0 leading-tight";
}

const detailsHeader = document.querySelector('h2.text-center.mb-8');
if (detailsHeader) {
    detailsHeader.className = "text-[20px] font-bold text-center mb-8";
}

function changeDate(offset) {
    const dateInput = document.getElementById('dateSelect');
    if (!dateInput.value) return;
    
    const currentDate = new Date(dateInput.value);
    currentDate.setDate(currentDate.getDate() + offset);
    
    const todayLimit = new Date();
    todayLimit.setHours(0,0,0,0);
    if (currentDate.getTime() > todayLimit.getTime()) {
        return; 
    }

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

// 🌟 ฟังก์ชันแกะวันที่แบบแม่นยำ 100% จากระบบ Google Sheets ดึงจากคอลัมน์เป้าหมายโดยตรง 🌟
function parseGoogleDate(cell) {
    if (!cell) return null;
    
    // 1. อ่านค่า Raw Data ของ Google (ชัวร์สุด ไม่สนฟอร์แมตหน้าบ้าน)
    if (cell.v && typeof cell.v === 'string' && cell.v.startsWith('Date(')) {
        let p = cell.v.match(/\d+/g);
        if (p && p.length >= 3) {
            let d = new Date(parseInt(p[0]), parseInt(p[1]), parseInt(p[2]));
            if (d.getFullYear() > 2400) d.setFullYear(d.getFullYear() - 543);
            return d;
        }
    }
    
    // 2. เผื่อไม่มี Raw Data ค่อยอ่านค่า Text แทน
    let str = String(cell.f || cell.v || "").trim();
    if (!str) return null;
    
    let d = new Date(str);
    if (!isNaN(d.getTime())) {
        if (d.getFullYear() > 2400) d.setFullYear(d.getFullYear() - 543);
        return d;
    }
    
    // 3. ก๊อกสุดท้าย ถ้าแปลตรงๆไม่ได้ ให้จับแยกทีละส่วน
    let parts = str.split(/[ T\/\-]/).filter(x => x);
    if (parts.length >= 3) {
        let y = parseInt(parts[2]), m = parseInt(parts[1]), day = parseInt(parts[0]);
        if (parts[0].length === 4) { y = parseInt(parts[0]); m = parseInt(parts[1]); day = parseInt(parts[2]); }
        if (m > 12) { let temp = m; m = day; day = temp; } 
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
let flags = { accident: false, lf: false, lfNew: false, car: false };

function loadScript(url) { 
    const s = document.createElement('script'); 
    s.src = url; 
    document.body.appendChild(s); 
}

loadScript('https://docs.google.com/spreadsheets/d/1tj_BC_YkBBcin8FqqXB_OvOF5ku2Y24MTh04XmA9zTk/gviz/tq?tqx=responseHandler:handleAccidentData&gid=3452793');
loadScript('https://docs.google.com/spreadsheets/d/14MJgb81aVEjT2qVp6n9zNKCCpJNVimX1q0hiYkH0f5I/gviz/tq?tqx=responseHandler:handleLFData&gid=751456190');
loadScript('https://docs.google.com/spreadsheets/d/14MJgb81aVEjT2qVp6n9zNKCCpJNVimX1q0hiYkH0f5I/gviz/tq?tqx=responseHandler:handleLFDataNew&gid=2074352966');
loadScript('https://docs.google.com/spreadsheets/d/1hEFLf_CuzabHOIdCp_LWEU5M8Be_7bsx1aBZickoSXA/gviz/tq?tqx=responseHandler:handleCarData&gid=0');

// ================= PARSING ACCIDENT DATA =================
window.handleAccidentData = function(json) {
    if (json && json.table && json.table.rows) {
        accidentData = json.table.rows.map(r => {
            const c = r.c; 
            if (!c) return null;
            
            let type = (c[5]?.v || "เหตุการณ์ทั่วไป").toString().trim();
            if (type === "ว.40") type = "อุบัติเหตุจากยานพาหนะ";
            
            const excludeWords = ["คืนของ", "รับของคืน", "เก็บของได้", "แจ้งเก็บของได้", "แจ้งของหาย", "ปลดบังคับล้อ"];
            if (excludeWords.some(word => type.includes(word))) return null; 

            // 🌟 ดึงวันที่จาก คอลัมน์ B (Index 1) 🌟
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
    flags.accident = true; 
    checkSetupData();
};

// ================= PARSING LOST & FOUND (OLD) =================
window.handleLFData = function(json) {
    if (json && json.table && json.table.rows) {
        const oldRows = json.table.rows.map(r => {
            const c = r.c; 
            if (!c) return null;
            
            // 🌟 ดึงวันที่จาก คอลัมน์ A (0) หรือ B (1) 🌟
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
                if (c[i] && (c[i].v || c[i].f) && typeof (c[i].v || c[i].f) === 'string' && (c[i].v || c[i].f).includes('drive.google.com')) {
                    imgLink = c[i].v || c[i].f;
                    break;
                }
            }
            return { date: d, type: type, detail: narrative, img: imgLink };
        }).filter(x => x);
        lfData = lfData.concat(oldRows);
    }
    flags.lf = true; 
    checkSetupData();
};

// ================= PARSING LOST & FOUND (NEW) =================
window.handleLFDataNew = function(json) {
    if (json && json.table && json.table.rows) {
        const newRows = json.table.rows.map(r => {
            const c = r.c; 
            if (!c) return null;
            
            // 🌟 ดึงวันที่จาก คอลัมน์ A (0) หรือ H (7) 🌟
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
                if (c[i] && (c[i].v || c[i].f) && typeof (c[i].v || c[i].f) === 'string' && (c[i].v || c[i].f).includes('drive.google.com')) {
                    imgLink = c[i].v || c[i].f;
                    break;
                }
            }
            return { date: d, type: type, detail: narrative, img: imgLink };
        }).filter(x => x);
        lfData = lfData.concat(newRows);
    }
    flags.lfNew = true; 
    checkSetupData();
};

window.handleCarData = function(json) {
    if (json && json.table && json.table.rows) {
        carData = json.table.rows.map(r => {
            const c = r.c; 
            if (!c) return null; 
            
            // 🌟 ดึงวันที่จาก คอลัมน์ H (7) 🌟
            let d = parseGoogleDate(c[7]);
            if (!d) return null;

            return { date: d, g1: c[1]?.v||0, g3: c[2]?.v||0, g4: c[3]?.v||0, g5: c[4]?.v||0, g6: c[5]?.v||0 };
        }).filter(x => x);
    }
    flags.car = true; 
    checkSetupData();
};

function checkSetupData() { if (flags.accident && flags.lf && flags.lfNew && flags.car) renderAllTables(); }

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
    document.getElementById('printHeader').innerText = `รายงานเหตุการณ์ ${dateStr}`;

    const summary = {};
    let dailyAll = [];
    accidentData.concat(lfData).forEach(r => {
        if (isSame(r.date, targetDate)) {
            summary[r.type] = (summary[r.type] || 0) + 1;
            dailyAll.push(r);
        }
    });

    // 🌟 จัดลำดับใหม่ให้ "เพลิงไหม้" และ "บังคับล้อ" อยู่บนๆ 🌟
    const priorityOrder = [
        "เพลิงไหม้",
        "บังคับล้อ",
        "อุบัติเหตุจากยานพาหนะ",
        "อุบัติเหตุทั่วไป",
        "รับส่งผู้ป่วย",
        "รับส่งผู้ได้รับบาดเจ็บ"
    ];

    const incKeys = Object.keys(summary).sort((a, b) => {
        let indexA = priorityOrder.indexOf(a);
        let indexB = priorityOrder.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b, 'th');
    });

    dailyAll.sort((a, b) => {
        let indexA = priorityOrder.indexOf(a.type);
        let indexB = priorityOrder.indexOf(b.type);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.type.localeCompare(b.type, 'th');
    });

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
    detailContainer.innerHTML = '';
    if (dailyAll.length === 0) {
        detailContainer.innerHTML = `<div class="text-center py-12"><div class="inline-block bg-green-50 border-2 border-green-200 rounded-2xl px-10 py-6 shadow-sm"><p class="text-green-600 font-extrabold text-[36px] m-0 flex items-center justify-center gap-3"><svg width="40" height="40" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>เหตุการณ์ปกติ ไม่มีเหตุการณ์</p></div></div>`;
    } else {
        dailyAll.forEach((item, index) => {
            let driveId = extractDriveId(item.img);
            let imgHtml = '';
            if (driveId) {
                let corsSafeImg = `https://lh3.googleusercontent.com/d/${driveId}`;
                let proxyImg = `https://wsrv.nl/?url=drive.google.com/uc?export=view&id=${driveId}&output=jpeg&w=800`;
                imgHtml = `<div class="w-full md:w-1/3 flex-shrink-0 flex justify-center bg-gray-50 rounded-xl p-2 border border-gray-200 shadow-sm overflow-hidden"><img src="${corsSafeImg}" class="w-full h-[250px] md:h-[300px] object-cover rounded-lg shadow-sm" alt="รูปภาพประกอบ" crossorigin="anonymous" onerror="if(this.src !== '${proxyImg}') { this.src='${proxyImg}'; } else { this.parentElement.innerHTML='<div class=\\'flex flex-col items-center text-center justify-center h-[250px] md:h-[300px] w-full bg-red-50 border-2 border-dashed border-red-300 rounded-lg p-3\\'><span class=\\'text-red-600 font-bold text-[22px]\\'>โหลดรูปไม่ได้</span></div>'; }"></div>`;
            } else {
                imgHtml = `<div class="w-full md:w-1/3 flex-shrink-0 flex justify-center items-center bg-gray-50 rounded-xl p-2 border-2 border-dashed border-gray-300 shadow-sm overflow-hidden h-[250px] md:h-[300px]"><span class="text-gray-400 font-medium text-[18px]">ไม่มีรูปภาพประกอบ</span></div>`;
            }
            detailContainer.innerHTML += `<div class="mb-10 border-b-2 border-gray-200 pb-8 last:border-0"><div class="flex flex-col md:flex-row gap-8 items-start">${imgHtml}<div class="w-full md:w-2/3 leading-relaxed"><div class="font-bold text-blue-700 text-[18px] mb-3 border-b border-blue-100 pb-2 inline-block w-full">${index + 1}. ${item.type}</div><div class="thai-justify font-normal text-[18px]">${item.detail}</div></div></div></div>`;
        });
    }
    if (google && google.visualization && google.visualization.ColumnChart) drawDailyCarChart();
    else google.charts.setOnLoadCallback(drawDailyCarChart);
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
    const summaryContainer = document.getElementById('car-summary-cards');
    if (summaryContainer) {
        summaryContainer.innerHTML = `<div class="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center shadow-sm text-slate-600 font-normal"><div class="text-[16px] mb-1">วันที่ ${shortDate(date2)}</div><div class="text-[16px]">ทั้งหมด ${total2.toLocaleString()} คัน</div></div><div class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center shadow-sm text-blue-600 font-normal"><div class="text-[16px] mb-1">วันที่ ${shortDate(date1)}</div><div class="text-[16px]">ทั้งหมด ${total1.toLocaleString()} คัน</div></div><div class="bg-blue-600 border border-blue-700 rounded-lg p-3 text-center shadow-md transform scale-105 text-white font-normal"><div class="text-[16px] mb-1">วันที่ ${shortDate(date0)}</div><div class="text-[16px]">ทั้งหมด ${total0.toLocaleString()} คัน</div></div>`;
    }

    const dataArray = [
        ['ประตู', `${shortDate(date2)}`, { role: 'annotation' }, { role: 'style' }, `${shortDate(date1)}`, { role: 'annotation' }, { role: 'style' }, `${shortDate(date0)}`, { role: 'annotation' }, { role: 'style' }],
        ['ประตู 1', row2.g1, row2.g1, 'stroke-color: #ffffff; stroke-width: 1.5; fill-color: #cbd5e1', row1.g1, row1.g1, 'stroke-color: #ffffff; stroke-width: 1.5; fill-color: #60a5fa', row0.g1, row0.g1, 'stroke-color: #ffffff; stroke-width: 1.5; fill-color: #2563eb'],
        ['ประตู 3', row2.g3, row2.g3, 'stroke-color: #ffffff; stroke-width: 1.5; fill-color: #cbd5e1', row1.g3, row1.g3, 'stroke-color: #ffffff; stroke-width: 1.5; fill-color: #60a5fa', row0.g3, row0.g3, 'stroke-color: #ffffff; stroke-width: 1.5; fill-color: #2563eb'],
        ['ประตู 4', row2.g4, row2.g4, 'stroke-color: #ffffff; stroke-width: 1.5; fill-color: #cbd5e1', row1.g4, row1.g4, 'stroke-color: #ffffff; stroke-width: 1.5; fill-color: #60a5fa', row0.g4, row0.g4, 'stroke-color: #ffffff; stroke-width: 1.5; fill-color: #2563eb'],
        ['ประตู 5', row2.g5, row2.g5, 'stroke-color: #ffffff; stroke-width: 1.5; fill-color: #cbd5e1', row1.g5, row1.g5, 'stroke-color: #ffffff; stroke-width: 1.5; fill-color: #60a5fa', row0.g5, row0.g5, 'stroke-color: #ffffff; stroke-width: 1.5; fill-color: #2563eb'],
        ['ประตู 6', row2.g6, row2.g6, 'stroke-color: #ffffff; stroke-width: 1.5; fill-color: #cbd5e1', row1.g6, row1.g6, 'stroke-color: #ffffff; stroke-width: 1.5; fill-color: #60a5fa', row0.g6, row0.g6, 'stroke-color: #ffffff; stroke-width: 1.5; fill-color: #2563eb']
    ];

    const options = {
        fontName: 'TH Sarabun New',
        chartArea: { left: '6%', right: '2%', top: '15%', bottom: '15%' },
        hAxis: { textStyle: { fontSize: 16, bold: true, color: '#334155' } },
        vAxis: { format: 'short', textStyle: { fontSize: 16, bold: false, color: '#000000' }, minValue: 0, gridlines: { color: '#f1f5f9' }, baselineColor: '#334155' },
        colors: ['#cbd5e1', '#60a5fa', '#2563eb'],
        legend: { position: 'top', alignment: 'center', textStyle: { fontName: 'TH Sarabun New', fontSize: 16, bold: false, color: '#334155' } },
        annotations: { alwaysOutside: true, textStyle: { fontName: 'TH Sarabun New', fontSize: 12, color: '#000000', bold: false } },
        animation: { startup: true, duration: 800, easing: 'out' },
        backgroundColor: '#ffffff',
        bar: { groupWidth: '75%' }
    };

    window.myChart = new google.visualization.ColumnChart(document.getElementById('daily_car_chart'));
    window.myChart.draw(google.visualization.arrayToDataTable(dataArray), options);
}

function exportToJPEG() {
    const captureArea = document.getElementById('pdfContent');
    const controlsArea = document.getElementById('controlsContainer');
    const printHeader = document.getElementById('printHeaderContainer');
    const exportBtn = document.getElementById('exportBtn');
    const chartDiv = document.getElementById('daily_car_chart');
    let tempImg = null;
    if (window.myChart) {
        tempImg = document.createElement('img');
        tempImg.src = window.myChart.getImageURI(); 
        tempImg.style.width = "100%"; tempImg.style.height = "320px"; tempImg.style.objectFit = "contain";
        chartDiv.style.display = 'none'; chartDiv.parentNode.insertBefore(tempImg, chartDiv); 
    }
    controlsArea.style.display = 'none'; printHeader.style.display = 'block'; exportBtn.style.display = 'none';
    html2canvas(captureArea, { scale: 2, useCORS: true, allowTaint: false, backgroundColor: '#ffffff', imageTimeout: 15000 }).then(canvas => {
        controlsArea.style.display = 'flex'; printHeader.style.display = 'none'; exportBtn.style.display = 'flex'; 
        if (tempImg) { tempImg.remove(); chartDiv.style.display = 'block'; }
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/jpeg', 0.9); link.download = `Daily_Report_${document.getElementById('dateSelect').value}.jpg`; link.click();
    }).catch(err => {
        controlsArea.style.display = 'flex'; printHeader.style.display = 'none'; exportBtn.style.display = 'flex';
        if (tempImg) { tempImg.remove(); chartDiv.style.display = 'block'; }
        console.error("Export Error: ", err); alert("เกิดข้อผิดพลาดในการบันทึกภาพ");
    });
}
