// =========================================================================
// 🌟 1. ตั้งค่าการเชื่อมต่อ Google Sheet
// =========================================================================
const MAIN_SHEET_ID = '1lYRhXtLgec6ISM6Ugt-YKLrh47NRt7ihcVLcD8mI_Yg'; 
const INSPECTION_GID = '267450301'; 
const REFILL_GID = '680269898';     
const VEHICLE_GID = '147145093';    
const FIRE_EQUIP_GID = '25594122';  

const EVENT_SHEET_ID = '1tj_BC_YkBBcin8FqqXB_OvOF5ku2Y24MTh04XmA9zTk'; 
const EVENT_SHEET_GID = '3452793';

// 🌟 2. ตั้งค่าคอลัมน์ ชีตตรวจสอบ
const COL_DATE = 0;      const COL_INSPECTOR = 1; 
const COL_TYPE = 2;      const COL_DETAIL = 3;    
const COL_COLOR = 4;     const COL_PLATE = 5;     
const COL_EQUIP = 6;     
const COL_CHK_START = 7; const COL_CHK_END = 15;  
const COL_NOTE = 16;     const COL_STATUS = 17;   

// =========================================================================
// 🌟 3. ระบบแปลภาษา (Translations)
// =========================================================================
const thMonths = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const shortMonthsTH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const shortMonthsEN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const printTranslations = {
    th: {
        loading: "⌛ กำลังเชื่อมต่อข้อมูลจากระบบ...",
        error: "❌ เกิดข้อผิดพลาดในการโหลดข้อมูล",
        noData: "❌ ไม่พบข้อมูลที่ตรงกับตัวกรองที่เลือก",
        noRefillData: "❌ ไม่พบประวัติการเติมสารในเดือนที่เลือก",
        btnVehicle: "ยานพาหนะ",
        btnFire: "ถังดับเพลิง",
        btnRefill: "ประวัติเติมสาร",
        btnPrint: "พิมพ์เอกสาร",
        noImage: "ไม่มี<br>รูปภาพแนบ",
        docTitleVeh: "ประวัติการตรวจสภาพยานพาหนะ",
        docTitleFire: "ประวัติการตรวจสภาพถังดับเพลิง",
        docTitleRefill: "แบบบันทึกประวัติการเติมสารเคมีถังดับเพลิง",
        docSubTitle: "งานจราจรและความปลอดภัย กองกายภาพและสิ่งแวดล้อม",
        lblDetail: "รายละเอียด:",
        lblDetailVeh: "รายละเอียดรถ:",
        lblColor: "สี:",
        lblLocation: "ตำแหน่งที่ตั้ง:",
        lblPlateVeh: "ทะเบียน:",
        lblPlateFire: "ถังที่:",
        lblEquipId: "หมายเลขครุภัณฑ์:",
        lblRefillDate: "วันที่เติมสาร:",
        lblChemical: "สารเคมีที่เติม:",
        lblWeightBefore: "น้ำหนักก่อนเติม:",
        lblWeightAfter: "น้ำหนักหลังเติม:",
        lblCompany: "บริษัทที่ดำเนินการ:",
        lblNote: "หมายเหตุ / รายละเอียดเพิ่มเติม:",
        tblHeaderMonth: "เดือน/ปี",
        tblHeaderStatus: "สถานะการใช้งาน",
        tblHeaderInspector: "ผู้ตรวจสอบ",
        statusGood: "ใช้งานได้",
        statusBad: "ใช้งานไม่ได้",
        signName: "( ยุทธภูมิ ญานเพิ่ม )",
        signPos: "หัวหน้างานจราจรและความปลอดภัย",
        notSpecified: "ไม่ระบุ",
        fireItemsList: [
            "สภาพตัวถัง<br>(ไม่บุบ/สนิม)", "แรงดันเกจ์วัด<br>(เข็มสีเขียว)", "สายส่ง/หัวฉีด<br>(ไม่แตก/ตัน)",
            "สลัก/ซีลตะกั่ว<br>(อยู่ครบ)", "คันบีบ/ข้อต่อ<br>(ไม่ค้าง/หลวม)", "ป้ายแนะนำ<br>(ชัดเจน)",
            "ตำแหน่งติดตั้ง<br>(ไม่มีกีดขวาง)", "ฐาน/ที่แขวน<br>(มั่นคง)", "สภาพทั่วไป<br>(สะอาด พร้อมใช้)"
        ],
        vehicleItemsList: [
            "ลมยาง /<br>สภาพยาง", "ระบบเบรก<br>(หน้า-หลัง)", "ระบบไฟส่องสว่าง<br>/ สัญญาณ",
            "แบตเตอรี่ /<br>ของเหลว", "สภาพตัวถังรถ<br>ทั่วไป", "ความสะอาด<br>ทั่วไป"
        ]
    },
    en: {
        loading: "⌛ Connecting to database...",
        error: "❌ Error loading data",
        noData: "❌ No data found for the selected filter",
        noRefillData: "❌ No refill history found for the selected month",
        btnVehicle: "Vehicles",
        btnFire: "Fire Ext.",
        btnRefill: "Refill History",
        btnPrint: "Print",
        noImage: "No<br>Image",
        docTitleVeh: "Vehicle Inspection History",
        docTitleFire: "Fire Extinguisher Inspection History",
        docTitleRefill: "Fire Extinguisher Refill Record",
        docSubTitle: "Traffic and Security, Physical and Environment Division",
        lblDetail: "Details:",
        lblDetailVeh: "Vehicle Details:",
        lblColor: "Color:",
        lblLocation: "Location:",
        lblPlateVeh: "License Plate:",
        lblPlateFire: "Tank No.:",
        lblEquipId: "Equipment ID:",
        lblRefillDate: "Refill Date:",
        lblChemical: "Chemical:",
        lblWeightBefore: "Weight Before:",
        lblWeightAfter: "Weight After:",
        lblCompany: "Service Company:",
        lblNote: "Remarks / Additional Details:",
        tblHeaderMonth: "Month/Yr",
        tblHeaderStatus: "Usage Status",
        tblHeaderInspector: "Inspector",
        statusGood: "Functional",
        statusBad: "Defective",
        signName: "( Yutthaphoom Yanperm )",
        signPos: "Head of Traffic and Security",
        notSpecified: "N/A",
        fireItemsList: [
            "Cylinder<br>(No Dent/Rust)", "Gauge<br>(Green Zone)", "Hose/Nozzle<br>(Clear)",
            "Pin/Seal<br>(Intact)", "Lever/Joint<br>(Firm)", "Instruction<br>Label",
            "Location<br>(Clear Access)", "Bracket<br>(Secure)", "General<br>(Clean/Ready)"
        ],
        vehicleItemsList: [
            "Tire Press./<br>Cond.", "Brake Sys.<br>(F-R)", "Lighting /<br>Signals",
            "Battery /<br>Fluids", "General Body<br>Condition", "General<br>Cleanliness"
        ]
    }
};

let currentLang = localStorage.getItem('appLang') || localStorage.getItem('lang') || 'th';
let currentPrintMode = 'vehicle'; // ค่าเริ่มต้นของการกรอง

let staffSignatures = {};
let chiefSignatureGlobal = "";
let globalInspectionData = [];
let globalRefillData = []; 
let globalEventData = [];
let vehicleImages = {}; 
let fireImages = {};
let vehicleMasterData = {};

// =========================================================================
// 🌟 4. ระบบจัดการ Header และ Language
// =========================================================================

function injectFiltersToHeader() {
    const slot = window.parent.document.getElementById('headerFilterSlot');
    const template = document.getElementById('printFilterTemplate');
    if (slot && template) {
        slot.innerHTML = template.innerHTML;
        bindFilterEvents(); // 🌟 เรียกใช้ฟังก์ชันผูกปุ่ม
        applyLanguageUI(); 
    }
}
// 🌟 ฟังก์ชันนี้จะทำหน้าที่โยงสายไฟจากหน้าลูก ไปสั่งงานปุ่มบนหน้าแม่
function bindFilterEvents() {
    const pDoc = window.parent.document;
    
    // 1. ผูกระบบให้ปุ่มกดกรองข้อมูล (ยานพาหนะ, ถังดับเพลิง, เติมสาร)
    pDoc.querySelectorAll('#filter-group-print .filter-btn[data-filter]').forEach(btn => {
        btn.onclick = function() {
            this.parentElement.querySelectorAll('.filter-btn[data-filter]').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentPrintMode = this.getAttribute('data-filter');
            applyFilter();
        };
    });

    // 2. ผูกระบบให้ปฏิทินเลือกเดือน
    const monthInput = pDoc.getElementById('filterMonth');
    if (monthInput) {
        monthInput.onchange = applyFilter;
    }

    // 3. ผูกระบบให้ปุ่มพิมพ์ (บังคับให้พิมพ์เฉพาะหน้าต่าง iframe ด้านในเท่านั้น)
    const printBtn = pDoc.getElementById('btnPrintAction');
    if (printBtn) {
        printBtn.onclick = function() {
            window.print(); // สั่งพิมพ์หน้ากระดาษข้างใน
        };
    }
}

window.setPrintFilter = function(mode, btnElement) {
    currentPrintMode = mode;
    
    // อัปเดตคลาส active ให้ปุ่มใน iframe
    const parentDoc = window.parent.document;
    if (parentDoc) {
        parentDoc.querySelectorAll('#filter-group-print .filter-btn[data-filter]').forEach(b => b.classList.remove('active'));
        if (btnElement) btnElement.classList.add('active');
    }
    applyFilter();
};

window.applyLanguageUI = function() {
    currentLang = localStorage.getItem('appLang') || localStorage.getItem('lang') || 'th';
    const t = printTranslations[currentLang];
    
    // แปลภาษาปุ่มบน Header
    const pDoc = window.parent.document;
    if (pDoc) {
        const bVeh = pDoc.querySelector('.filter-btn[data-filter="vehicle"]');
        const bFire = pDoc.querySelector('.filter-btn[data-filter="fire"]');
        const bRefill = pDoc.querySelector('.filter-btn[data-filter="refill"]');
        const bPrint = pDoc.getElementById('btnPrintText');
        
        if(bVeh) bVeh.innerText = t.btnVehicle;
        if(bFire) bFire.innerText = t.btnFire;
        if(bRefill) bRefill.innerText = t.btnRefill;
        if(bPrint) bPrint.innerText = t.btnPrint;
    }
    
    // แปลข้อความสถานะ Loading/Error
    const statusEl = document.getElementById('loadingStatus');
    if (statusEl && statusEl.style.display !== 'none') {
        if (statusEl.innerText.includes('กำลัง') || statusEl.innerText.includes('Connecting')) {
            statusEl.innerText = t.loading;
        } else {
            statusEl.innerText = t.error;
        }
    }

    // วาดตารางใหม่ถ้ามีข้อมูลแล้ว
    if (globalInspectionData.length > 0) {
        applyFilter();
    }
};

window.checkGlobalTheme = function() {
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

window.onload = function() {
    checkGlobalTheme();
    injectFiltersToHeader();
    loadAllData();
};

function getDirectImageUrl(url) {
    if (!url) return "";
    let str = String(url).split(',')[0].trim();
    let driveMatch = str.match(/[?&]id=([a-zA-Z0-9_-]+)/) || str.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch && driveMatch[1]) {
        return `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w500`;
    }
    return str; 
}

function loadAllData() {
    const sigGid = '1285036850'; 
    const sigQuery = encodeURIComponent("select A, B, H");
    const sigUrl = `https://docs.google.com/spreadsheets/d/${MAIN_SHEET_ID}/gviz/tq?tqx=out:json&gid=${sigGid}&tq=${sigQuery}`;

    const loadSig = fetch(sigUrl).then(res => res.text()).then(text => {
        const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S\w]+)\);/);
        const jsonStr = match && match[1] ? match[1] : text.substring(47).slice(0, -2);
        JSON.parse(jsonStr).table.rows.forEach(row => {
            if (row.c && row.c[0] && row.c[0].v) {
                let cleanName = String(row.c[0].v).replace(/^(นาย|นางสาว|นาง)\s*/, "").replace(/\s+/g, ' ').trim();
                let position = row.c[1] ? String(row.c[1].v || "").trim() : "";
                let formattedSigLink = getDirectImageUrl(row.c[2] ? String(row.c[2].v || "") : "");
                if (formattedSigLink) {
                    staffSignatures[cleanName] = formattedSigLink;
                    staffSignatures[String(row.c[0].v).trim()] = formattedSigLink; 
                    if (position.includes("หัวหน้างานจราจร")) chiefSignatureGlobal = formattedSigLink;
                }
            }
        });
    });

    const vehQuery = encodeURIComponent("select C, E, F, G"); 
    const vehUrl = `https://docs.google.com/spreadsheets/d/${MAIN_SHEET_ID}/gviz/tq?tqx=out:json&gid=${VEHICLE_GID}&tq=${vehQuery}`;

    const loadVehicles = fetch(vehUrl).then(res => res.text()).then(text => {
        const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S\w]+)\);/);
        const jsonStr = match && match[1] ? match[1] : text.substring(47).slice(0, -2);
        const json = JSON.parse(jsonStr);
        if (json.table && json.table.rows) {
            json.table.rows.forEach(row => {
                if(!row.c) return;
                let detail = row.c[0] ? String(row.c[0].v).trim() : "";
                let plate = row.c[1] ? String(row.c[1].v).trim() : "";
                let equip = row.c[2] ? String(row.c[2].v).trim() : "";
                let imgUrl = row.c[3] ? String(row.c[3].v).trim() : "";

                let displayImgUrl = getDirectImageUrl(imgUrl);
                let isDummyEquip = (equip === "-" || equip === "****" || equip === "ไม่มี" || equip === "");
                
                if (!isDummyEquip && plate !== "" && plate !== "-") {
                    vehicleMasterData[equip] = plate;
                } else if (detail !== "" && detail !== "-" && plate !== "" && plate !== "-") {
                    vehicleMasterData[detail] = plate;
                }

                if (displayImgUrl) {
                    if (plate && plate !== "-") vehicleImages[plate] = displayImgUrl;
                    if (!isDummyEquip) vehicleImages[equip] = displayImgUrl;
                    if (detail && detail !== "-") vehicleImages[detail] = displayImgUrl;
                }
            });
        }
    });

    const fireQuery = encodeURIComponent("select C, F, G, H"); 
    const fireUrl = `https://docs.google.com/spreadsheets/d/${MAIN_SHEET_ID}/gviz/tq?tqx=out:json&gid=${FIRE_EQUIP_GID}&tq=${fireQuery}`;

    const loadFireImages = fetch(fireUrl).then(res => res.text()).then(text => {
        const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S\w]+)\);/);
        const jsonStr = match && match[1] ? match[1] : text.substring(47).slice(0, -2);
        const json = JSON.parse(jsonStr);
        if (json.table && json.table.rows) {
            json.table.rows.forEach(row => {
                if(!row.c) return;
                let detail = row.c[0] ? String(row.c[0].v).trim() : ""; 
                let plate = row.c[1] ? String(row.c[1].v).trim() : ""; 
                let equip = row.c[2] ? String(row.c[2].v).trim() : ""; 
                let imgUrl = row.c[3] ? String(row.c[3].v).trim() : ""; 

                let displayImgUrl = getDirectImageUrl(imgUrl);
                if (displayImgUrl) {
                    let isDummyEquip = (equip === "-" || equip === "****" || equip === "ไม่มี" || equip === "");
                    if (detail && plate && plate !== "-") fireImages[detail + "_" + plate] = displayImgUrl;
                    if (!isDummyEquip) fireImages[equip] = displayImgUrl;
                    if (plate && plate !== "-") fireImages[plate] = displayImgUrl;
                }
            });
        }
    });

    const refillQuery = encodeURIComponent("select *");
    const refillUrl = `https://docs.google.com/spreadsheets/d/${MAIN_SHEET_ID}/gviz/tq?tqx=out:json&gid=${REFILL_GID}&tq=${refillQuery}`;
    
    const loadRefill = fetch(refillUrl).then(res => res.text()).then(text => {
        const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S\w]+)\);/);
        const jsonStr = match && match[1] ? match[1] : text.substring(47).slice(0, -2);
        const json = JSON.parse(jsonStr);

        globalRefillData = [];
        if(json.table && json.table.rows) {
            json.table.rows.forEach(row => {
                if(!row.c) return;
                let rawDateVal = row.c[4] ? (row.c[4].f || row.c[4].v) : "-";
                let filterDateStr = "";
                let dateObjForEn = null;
                
                if (rawDateVal !== "-") {
                    let dObj;
                    if (typeof rawDateVal === 'string' && rawDateVal.startsWith('Date(')) {
                        let p = rawDateVal.match(/\d+/g);
                        dObj = new Date(p[0], p[1], p[2]);
                    } else {
                        let datePart = String(rawDateVal).split(/[, ]/)[0]; 
                        let parts = datePart.split('/');
                        if(parts.length === 3) dObj = new Date(parts[2], parts[1]-1, parts[0]);
                        else dObj = new Date(rawDateVal);
                    }
                    if (!isNaN(dObj.getTime())) {
                        dateObjForEn = dObj;
                        filterDateStr = `${dObj.getFullYear()}-${String(dObj.getMonth()+1).padStart(2, '0')}`;
                    } 
                }

                globalRefillData.push({
                    plate: row.c[2] ? String(row.c[2].v) : "-",
                    equipId: row.c[3] ? String(row.c[3].v) : "-",
                    rawDateVal: rawDateVal,
                    dateObj: dateObjForEn,
                    filterDate: filterDateStr,   
                    weightBefore: row.c[5] ? String(row.c[5].v) : "-",
                    weightAfter: row.c[6] ? String(row.c[6].v) : "-",
                    chemical: row.c[7] ? String(row.c[7].v) : "-",
                    company: row.c[8] ? String(row.c[8].v) : "-",
                    note: row.c[10] ? String(row.c[10].v) : "-"
                });
            });
        }
    });

    const insQuery = encodeURIComponent("select *");
    const insUrl = `https://docs.google.com/spreadsheets/d/${MAIN_SHEET_ID}/gviz/tq?tqx=out:json&gid=${INSPECTION_GID}&tq=${insQuery}`;
    
    const loadInspections = fetch(insUrl).then(res => res.text()).then(text => {
        const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S\w]+)\);/);
        const jsonStr = match && match[1] ? match[1] : text.substring(47).slice(0, -2);
        const json = JSON.parse(jsonStr);

        globalInspectionData = [];
        json.table.rows.forEach(row => {
            if (!row.c || !row.c[COL_DATE] || !row.c[COL_DATE].v) return;
            
            let rawDateVal = row.c[COL_DATE].v;
            let dObj = null;

            if (typeof rawDateVal === 'string' && rawDateVal.startsWith('Date(')) {
                let p = rawDateVal.match(/\d+/g);
                dObj = new Date(p[0], p[1], p[2], p[3]||0, p[4]||0);
            } else {
                let strVal = String(row.c[COL_DATE].f || row.c[COL_DATE].v);
                let datePart = strVal.split(/[, ]/)[0]; 
                let parts = datePart.split('/');
                if (parts.length === 3) dObj = new Date(parts[2], parts[1]-1, parts[0]);
                else dObj = new Date(strVal);
            }

            let filterDateStr = "";
            if (dObj && !isNaN(dObj.getTime())) {
                filterDateStr = `${dObj.getFullYear()}-${String(dObj.getMonth()+1).padStart(2, '0')}`;
            }

            let checksArray = [];
            for (let i = COL_CHK_START; i <= COL_CHK_END; i++) {
                if (row.c[i] && row.c[i].v) {
                    checksArray.push(String(row.c[i].v));
                }
            }

            globalInspectionData.push({
                dateObj: dObj,
                rawDateVal: rawDateVal,
                filterDate: filterDateStr,
                inspector: row.c[COL_INSPECTOR] ? String(row.c[COL_INSPECTOR].v) : "-",
                type: row.c[COL_TYPE] ? String(row.c[COL_TYPE].v) : "-",
                detail: row.c[COL_DETAIL] ? String(row.c[COL_DETAIL].v) : "-",
                color: row.c[COL_COLOR] ? String(row.c[COL_COLOR].v) : "-",
                plate: row.c[COL_PLATE] ? String(row.c[COL_PLATE].v).trim() : "-",
                equipId: row.c[COL_EQUIP] ? String(row.c[COL_EQUIP].v).trim() : "-",
                checks: checksArray,
                note: row.c[COL_NOTE] ? String(row.c[COL_NOTE].v) : "",
                finalStatus: row.c[COL_STATUS] ? String(row.c[COL_STATUS].v) : "-"
            });
        });
        globalInspectionData.reverse(); 
    });

    Promise.all([loadSig, loadVehicles, loadFireImages, loadRefill, loadInspections]).then(() => {
        document.getElementById('loadingStatus').style.display = 'none';
        applyFilter();
    }).catch(err => {
        console.error(err);
        const t = printTranslations[currentLang];
        document.getElementById('loadingStatus').innerHTML = `<span style='color:red;'>${t.error}</span>`;
    });
}

window.applyFilter = function() {
    const t = printTranslations[currentLang];
    const mode = currentPrintMode;
    let monthVal = '';
    
    // ดึงค่าเดือนจาก Header ถ้ามี
    const pDoc = window.parent.document;
    if (pDoc) {
        const monthInput = pDoc.getElementById('filterMonth');
        if (monthInput) monthVal = monthInput.value;
    }
    
    if (mode === 'refill') {
        let filteredRefill = globalRefillData;
        if (monthVal) {
            filteredRefill = filteredRefill.filter(item => item.filterDate === monthVal);
        }
        generateRefillPages(filteredRefill, t);
    } else {
        let filteredData = globalInspectionData;

        if (mode === 'vehicle') filteredData = filteredData.filter(item => item.type.includes('รถ'));
        else if (mode === 'fire') filteredData = filteredData.filter(item => item.type.includes('ดับเพลิง') || item.type.includes('อุปกรณ์'));

        if (monthVal) {
            filteredData = filteredData.filter(item => item.filterDate === monthVal);
        }
        generatePrintPages(filteredData, t);
    }
};

// =========================================================================
// 🌟 5. ฟังก์ชันสร้างหน้าเอกสาร
// =========================================================================
function generateRefillPages(dataToRender, t) {
    const container = document.getElementById('documentContainer');
    if (dataToRender.length === 0) {
        container.innerHTML = `<div class="no-data-msg">${t.noRefillData}</div>`;
        return;
    }
    let html = '';
    let fallbackHeadSignature = "https://github.com/user-attachments/assets/ddf96f31-a164-472d-b15a-0eb2048d98a4";
    let headSignatureUrl = chiefSignatureGlobal || staffSignatures["ยุทธภูมิ ญานเพิ่ม"] || staffSignatures["นายยุทธภูมิ ญานเพิ่ม"] || fallbackHeadSignature;
    let headSignatureHtml = headSignatureUrl ? `<img src="${headSignatureUrl}" class="head-signature-img" alt="Signature" />` : '';

    dataToRender.forEach(r => {
        let vImgUrl = "";
        let checkPlate = r.plate ? r.plate.trim() : "";
        let checkEquip = r.equipId ? r.equipId.trim() : "";
        let isDummyEquip = (!checkEquip || checkEquip === "-" || checkEquip === "****" || checkEquip === "ไม่มี");

        if (!isDummyEquip && fireImages[checkEquip]) vImgUrl = fireImages[checkEquip];
        else if (checkPlate && fireImages[checkPlate]) vImgUrl = fireImages[checkPlate];

        let displayDate = "-";
        if (r.dateObj) {
            let dObj = r.dateObj;
            if (currentLang === 'th') {
                let yearTH = dObj.getFullYear() < 2500 ? dObj.getFullYear() + 543 : dObj.getFullYear();
                displayDate = `${dObj.getDate()} ${thMonths[dObj.getMonth()]} ${yearTH}`;
            } else {
                displayDate = `${dObj.getDate()} ${shortMonthsEN[dObj.getMonth()]} ${dObj.getFullYear()}`;
            }
        } else {
            displayDate = r.rawDateVal;
        }

        html += `
            <div class="page form-page">
                <div class="content-split">
                    <div class="left-header-info" style="display: flex; flex-direction: column; gap: 10px; flex: 1;">
                        <div class="doc-header">
                            <h1>${t.docTitleRefill}</h1>
                            <h2>${t.docSubTitle}</h2>
                        </div>
                        <div class="info-text-section" style="flex-direction: column; gap: 5px;">
                            <div class="info-item"><span class="label">${t.lblRefillDate}</span> <span class="value">${displayDate}</span></div>
                            <div class="info-item"><span class="label">${t.lblPlateFire}</span> <span class="value">${r.plate !== '-' && r.plate ? r.plate : t.notSpecified}</span></div>
                            <div class="info-item"><span class="label">${t.lblEquipId}</span> <span class="value">${r.equipId}</span></div>
                            <div class="info-item"><span class="label">${t.lblChemical}</span> <span class="value">${r.chemical}</span></div>
                            <div class="info-item"><span class="label">${t.lblWeightBefore}</span> <span class="value">${r.weightBefore} Kg.</span></div>
                            <div class="info-item"><span class="label">${t.lblWeightAfter}</span> <span class="value">${r.weightAfter} Kg.</span></div>
                            <div class="info-item"><span class="label">${t.lblCompany}</span> <span class="value">${r.company}</span></div>
                        </div>
                    </div>
                    <div class="info-image-section">
                        ${vImgUrl ? `<img src="${vImgUrl}" alt="Item Image" />` : `<span style="color:#94a3b8; font-size:14px; text-align:center;">${t.noImage}</span>`}
                    </div>
                </div>
                
                <div class="section-title" style="margin-top: 5px; border-bottom: none; text-align: left; font-size: 18px;">${t.lblNote}</div>
                <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; padding: 15px; border-radius: 8px; font-size: 18px; min-height: 80px; color: ${r.note && r.note !== "-" ? '#dc2626' : '#64748b'}; font-weight: ${r.note && r.note !== "-" ? 'bold' : 'normal'};">
                    ${r.note && r.note !== "-" ? r.note : '-'}
                </div>
                
                <div style="flex-grow: 1;"></div>
                
                <div class="signature-section" style="justify-content: flex-end; margin-top: 20px;">
                    <div class="signature-block">
                        <div class="signature-img-container">${headSignatureHtml}</div>
                        <div>${t.signName}</div>
                        <div style="margin-top: 5px; color: #0f172a;">${t.signPos}</div>
                    </div>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function generatePrintPages(dataToRender, t) {
    const container = document.getElementById('documentContainer');
    if (dataToRender.length === 0) {
        container.innerHTML = `<div class="no-data-msg">${t.noData}</div>`;
        return;
    }
    
    let html = '';
    let groupedAssets = {};
    dataToRender.forEach(currentRecord => {
        const assetId = currentRecord.equipId !== '-' ? currentRecord.equipId : currentRecord.plate;
        const year = currentRecord.filterDate.split('-')[0];
        const key = `${assetId}_${year}`;

        if (!groupedAssets[key]) {
            let yearlyRecords = new Array(12).fill(null);
            globalInspectionData.forEach(history => {
                const histId = history.equipId !== '-' ? history.equipId : history.plate;
                const histYear = history.filterDate.split('-')[0];
                if (histId === assetId && histYear === year) {
                    const monthIndex = parseInt(history.filterDate.split('-')[1]) - 1;
                    yearlyRecords[monthIndex] = history;
                }
            });

            groupedAssets[key] = {
                info: currentRecord,
                year: parseInt(year),
                records: yearlyRecords
            };
        }
    });

    Object.values(groupedAssets).forEach(asset => {
        const data = asset.info;
        const isFire = data.type.includes('ดับเพลิง') || data.type.includes('อุปกรณ์');
        
        let colorLabel = t.lblColor;
        let plateLabel = t.lblPlateVeh;
        let docTitle = t.docTitleVeh;
        let vImgUrl = "";
        
        let checkPlate = data.plate ? data.plate.trim() : "";
        let checkEquip = data.equipId ? data.equipId.trim() : "";
        let checkDetail = data.detail ? data.detail.trim() : "";
        let isDummyEquip = (!checkEquip || checkEquip === "-" || checkEquip === "****" || checkEquip === "ไม่มี");

        if (!isFire && (checkPlate === "-" || checkPlate === "")) {
            if (!isDummyEquip && vehicleMasterData[checkEquip]) checkPlate = vehicleMasterData[checkEquip];
            else if (vehicleMasterData[checkDetail]) checkPlate = vehicleMasterData[checkDetail];
        }

        if (isFire) {
            colorLabel = t.lblLocation;
            plateLabel = t.lblPlateFire;
            docTitle = t.docTitleFire;

            if (checkDetail && checkPlate && fireImages[checkDetail + "_" + checkPlate]) vImgUrl = fireImages[checkDetail + "_" + checkPlate];
            else if (!isDummyEquip && fireImages[checkEquip]) vImgUrl = fireImages[checkEquip];
            else if (checkPlate && fireImages[checkPlate]) vImgUrl = fireImages[checkPlate];
        } else {
            if (!isDummyEquip && vehicleImages[checkEquip]) vImgUrl = vehicleImages[checkEquip];
            else if (checkPlate && vehicleImages[checkPlate]) vImgUrl = vehicleImages[checkPlate];
            else if (checkDetail && vehicleImages[checkDetail]) vImgUrl = vehicleImages[checkDetail];
        }

        let plateInfoHtml = '';
        if (!data.type.includes('รถกอล์ฟ') && !data.type.includes('รถจักรยานไฟฟ้า') && !data.type.includes('จักรยานไฟฟ้า') && !data.type.toLowerCase().includes('golf') && !data.type.toLowerCase().includes('ebike')) {
            plateInfoHtml = `<div class="info-item"><span class="label">${plateLabel}</span> <span class="value">${checkPlate && checkPlate !== '-' ? checkPlate : t.notSpecified}</span></div>`;
        }

        let infoHtml = isFire ? `
                <div class="info-item"><span class="label">${t.lblDetail}</span> <span class="value">${data.detail}</span></div>
                ${plateInfoHtml}
                <div class="info-item"><span class="label">${t.lblEquipId}</span> <span class="value">${data.equipId}</span></div>
            ` : `
                <div class="info-item"><span class="label">${t.lblDetailVeh}</span> <span class="value">${data.detail}</span></div>
                <div class="info-item"><span class="label">${colorLabel}</span> <span class="value">${data.color}</span></div>
                ${plateInfoHtml}
                <div class="info-item"><span class="label">${t.lblEquipId}</span> <span class="value">${data.equipId}</span></div>
            `;

        const itemsList = isFire ? t.fireItemsList : t.vehicleItemsList;
        
        let tableHeaderHtml = `
            <tr>
                <th style="width: 70px;">${t.tblHeaderMonth}</th>
                ${itemsList.map(item => `<th>${item}</th>`).join('')}
                <th style="width: 85px;">${t.tblHeaderStatus}</th>
                <th style="width: 90px;">${t.tblHeaderInspector}</th>
            </tr>
        `;

        let checklistHtml = '';
        for (let m = 0; m < 12; m++) {
            const monthRecord = asset.records[m];
            
            let displayYear = asset.year;
            let monthName = "";
            if(currentLang === 'th') {
                if(displayYear < 2500) displayYear += 543;
                monthName = shortMonthsTH[m];
            } else {
                monthName = shortMonthsEN[m];
            }
            let dateDisplay = `${monthName}${displayYear.toString().slice(-2)}`;
            
            checklistHtml += `<tr><td class="text-center">${dateDisplay}</td>`;
            
            itemsList.forEach((_, index) => {
                let mark = '';
                if (monthRecord && monthRecord.checks && monthRecord.checks[index]) {
                    if (monthRecord.checks[index].includes('ปกติ') && !monthRecord.checks[index].includes('ไม่ปกติ')) {
                        mark = '<span class="tick-mark">&#10004;</span>'; 
                    } else if (monthRecord.checks[index].includes('ไม่ปกติ') || monthRecord.checks[index].includes('ชำรุด')) {
                        mark = '<span class="status-fail">X</span>';
                    } else {
                        mark = '<span class="tick-mark">&#10004;</span>'; 
                    }
                }
                checklistHtml += `<td class="text-center">${mark}</td>`;
            });

            let displayStatus = "-";
            let statusColorStyle = "color: #000;";
            if (monthRecord) {
                const s = monthRecord.finalStatus || "";
                if (s.includes("ปกติ") || s.includes("ใช้งานได้")) {
                    displayStatus = t.statusGood;
                    statusColorStyle = "color: #15803d; font-weight: bold;";
                } else if (s.includes("ชำรุด") || s.includes("ใช้งานไม่ได้") || s.includes("แจ้งซ่อม")) {
                    displayStatus = t.statusBad;
                    statusColorStyle = "color: #dc2626; font-weight: bold;"; 
                } else {
                    displayStatus = s !== "-" ? s : "-";
                }
            }

            checklistHtml += `<td class="text-center" style="font-size: 13px; ${statusColorStyle}">${displayStatus}</td>`;

            let inspectorName = monthRecord ? monthRecord.inspector.replace(/^(นาย|นางสาว|นาง)\s*/, "").split(' ')[0] : '-';
            checklistHtml += `<td class="text-center" style="font-size: 13px; color: #334155;">${inspectorName}</td></tr>`;
        }

        let tableHtml = `
            <table class="checklist">
                <thead>${tableHeaderHtml}</thead>
                <tbody>${checklistHtml}</tbody>
            </table>
        `;

        let fallbackHeadSignature = "https://github.com/user-attachments/assets/ddf96f31-a164-472d-b15a-0eb2048d98a4";
        let headSignatureUrl = chiefSignatureGlobal || staffSignatures["ยุทธภูมิ ญานเพิ่ม"] || fallbackHeadSignature;
        let headSignatureHtml = headSignatureUrl ? `<img src="${headSignatureUrl}" class="head-signature-img" alt="Signature" />` : '';

        let notes = asset.records.filter(r => r && r.note && r.note !== "-").map(r => r.note);

        html += `
            <div class="page form-page">
                <div class="content-split">
                    <div class="left-header-info" style="display: flex; flex-direction: column; gap: 10px; flex: 1;">
                        <div class="doc-header">
                            <h1>${docTitle}</h1>
                            <h2>${t.docSubTitle}</h2>
                        </div>
                        <div class="info-text-section" style="flex-direction: column; gap: 5px;">
                            ${infoHtml}
                        </div>
                    </div>
                    <div class="info-image-section">
                        ${vImgUrl ? `<img src="${vImgUrl}" alt="Item Image" />` : `<span style="color:#94a3b8; font-size:14px; text-align:center;">${t.noImage}</span>`}
                    </div>
                </div>

                ${tableHtml}
                
                ${notes.length > 0 ? `<p style="color: #dc2626; margin-bottom: 5px; font-size: 15px;">${t.lblNote} ${[...new Set(notes)].join(', ')}</p>` : ''}
                
                <div style="flex-grow: 1;"></div>
                
                <div class="signature-section" style="margin-top: 10px; justify-content: flex-end;">
                    <div class="signature-block">
                        <div class="signature-img-container">${headSignatureHtml}</div>
                        <div>${t.signName}</div>
                        <div style="margin-top: 5px; color: #0f172a;">${t.signPos}</div>
                    </div>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}