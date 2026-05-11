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

const thaiMonths = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const shortMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

// 🌟 เอาตัวเลขหน้าข้อออก (ถังดับเพลิง) 🌟
const fireItemsList = [
    "สภาพตัวถัง<br>(ไม่บุบ/สนิม)",
    "แรงดันเกจ์วัด<br>(เข็มสีเขียว)",
    "สายส่ง/หัวฉีด<br>(ไม่แตก/ตัน)",
    "สลัก/ซีลตะกั่ว<br>(อยู่ครบ)",
    "คันบีบ/ข้อต่อ<br>(ไม่ค้าง/หลวม)",
    "ป้ายแนะนำ<br>(ชัดเจน)",
    "ตำแหน่งติดตั้ง<br>(ไม่มีกีดขวาง)",
    "ฐาน/ที่แขวน<br>(มั่นคง)",
    "สภาพทั่วไป<br>(สะอาด พร้อมใช้)"
];

// 🌟 เอาตัวเลขหน้าข้อออก (ยานพาหนะ) 🌟
const vehicleItemsList = [
    "ลมยาง /<br>สภาพยาง",
    "ระบบเบรก<br>(หน้า-หลัง)",
    "ระบบไฟส่องสว่าง<br>/ สัญญาณ",
    "แบตเตอรี่ /<br>ของเหลว",
    "สภาพตัวถังรถ<br>ทั่วไป",
    "ความสะอาด<br>ทั่วไป"
];

let staffSignatures = {};
let chiefSignatureGlobal = "";
let globalInspectionData = [];
let globalRefillData = []; 
let globalEventData = [];
let vehicleImages = {}; 
let fireImages = {};

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
                if (displayImgUrl) {
                    let isDummyEquip = (equip === "-" || equip === "****" || equip === "ไม่มี" || equip === "");
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
                let displayDateStr = "-";
                
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
                        filterDateStr = `${dObj.getFullYear()}-${String(dObj.getMonth()+1).padStart(2, '0')}`;
                        let yearTH = dObj.getFullYear() < 2500 ? dObj.getFullYear() + 543 : dObj.getFullYear();
                        displayDateStr = `${dObj.getDate()} ${thaiMonths[dObj.getMonth()]} ${yearTH}`;
                    } else {
                        displayDateStr = String(rawDateVal).split(',')[0];
                    }
                }

                globalRefillData.push({
                    plate: row.c[2] ? String(row.c[2].v) : "-",
                    equipId: row.c[3] ? String(row.c[3].v) : "-",
                    displayDate: displayDateStr, 
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

            let fullThaiDate = "-";
            let filterDateStr = "";
            let displayDayDate = "";
            if (dObj && !isNaN(dObj.getTime())) {
                let yearTH = dObj.getFullYear() < 2500 ? dObj.getFullYear() + 543 : dObj.getFullYear();
                fullThaiDate = `${dObj.getDate()} ${thaiMonths[dObj.getMonth()]} ${yearTH}`;
                filterDateStr = `${dObj.getFullYear()}-${String(dObj.getMonth()+1).padStart(2, '0')}`;
                displayDayDate = `${dObj.getDate()}`; 
            } else {
                fullThaiDate = String(row.c[COL_DATE].f || row.c[COL_DATE].v).split(',')[0];
            }

            let checksArray = [];
            for (let i = COL_CHK_START; i <= COL_CHK_END; i++) {
                if (row.c[i] && row.c[i].v) {
                    checksArray.push(String(row.c[i].v));
                }
            }

            let finalStatus = row.c[COL_STATUS] ? String(row.c[COL_STATUS].v) : "-";
            let note = row.c[COL_NOTE] ? String(row.c[COL_NOTE].v) : "";

            globalInspectionData.push({
                date: fullThaiDate,
                dayDate: displayDayDate,
                filterDate: filterDateStr,
                inspector: row.c[COL_INSPECTOR] ? String(row.c[COL_INSPECTOR].v) : "-",
                type: row.c[COL_TYPE] ? String(row.c[COL_TYPE].v) : "-",
                detail: row.c[COL_DETAIL] ? String(row.c[COL_DETAIL].v) : "-",
                color: row.c[COL_COLOR] ? String(row.c[COL_COLOR].v) : "-",
                plate: row.c[COL_PLATE] ? String(row.c[COL_PLATE].v).trim() : "-",
                equipId: row.c[COL_EQUIP] ? String(row.c[COL_EQUIP].v).trim() : "-",
                checks: checksArray,
                note: note,
                finalStatus: finalStatus
            });
        });
        globalInspectionData.reverse(); 
    });

    const eventQuery = encodeURIComponent("select A, F"); 
    const eventUrl = `https://docs.google.com/spreadsheets/d/${EVENT_SHEET_ID}/gviz/tq?tqx=out:json&gid=${EVENT_SHEET_GID}&tq=${eventQuery}`;
    const loadEvents = fetch(eventUrl).then(res => res.text()).then(text => {
        const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S\w]+)\);/);
        if(!match) return;
        const json = JSON.parse(match[1]);

        globalEventData = [];
        if(json.table && json.table.rows) {
            json.table.rows.forEach(row => {
                if(!row.c || !row.c[0]) return;
                let rawVal = row.c[0].f || String(row.c[0].v);
                let filterDateStr = "";
                
                if (typeof row.c[0].v === 'string' && row.c[0].v.startsWith('Date(')) {
                    let p = row.c[0].v.match(/\d+/g);
                    let dObj = new Date(p[0], p[1], p[2]);
                    filterDateStr = `${dObj.getFullYear()}-${String(dObj.getMonth()+1).padStart(2, '0')}`;
                } else {
                    let parts = rawVal.split(/[, \/]/);
                    if(parts.length >= 3) {
                        let m = parts[1].padStart(2, '0');
                        let y = parts[2].split(' ')[0];
                        if (y.length === 4) {
                            let yearNum = parseInt(y);
                            if (yearNum > 2500) yearNum -= 543;
                            filterDateStr = `${yearNum}-${m}`;
                        }
                    }
                }

                let eventType = "ไม่ระบุ";
                if (row.c[1] && row.c[1].v) eventType = String(row.c[1].v).trim();
                if(filterDateStr) globalEventData.push({ filterDate: filterDateStr, eventType: eventType });
            });
        }
    }).catch(err => console.log("โหลดชีตเหตุการณ์ล้มเหลว", err));

    Promise.all([loadSig, loadVehicles, loadFireImages, loadRefill, loadInspections, loadEvents]).then(() => {
        if(document.getElementById('loadingStatus').innerText.includes('กำลังเชื่อมต่อ')) {
            document.getElementById('loadingStatus').style.display = 'none';
        }
        applyFilter();
    }).catch(err => {
        console.error(err);
        document.getElementById('loadingStatus').innerHTML = "<span style='color:red;'>❌ เกิดข้อผิดพลาดในการโหลดข้อมูล</span>";
    });
}

function applyFilter() {
    const modeEl = document.querySelector('input[name="filterMode"]:checked');
    if (!modeEl) return;
    const mode = modeEl.value;
    const monthVal = document.getElementById('filterMonth').value; 
    
    if (mode === 'refill') {
        let filteredRefill = globalRefillData;
        if (monthVal) {
            filteredRefill = filteredRefill.filter(item => item.filterDate === monthVal);
        }
        generateRefillPages(filteredRefill, monthVal);
    } else {
        let filteredData = globalInspectionData;

        if (mode === 'vehicle') filteredData = filteredData.filter(item => item.type.includes('รถ'));
        else if (mode === 'fire') filteredData = filteredData.filter(item => item.type.includes('ดับเพลิง') || item.type.includes('อุปกรณ์'));

        if (monthVal) {
            filteredData = filteredData.filter(item => item.filterDate === monthVal);
        }
        generatePrintPages(filteredData);
    }
}
window.applyFilter = applyFilter; 

// =========================================================================
// 🌟 ฟังก์ชัน: สร้างหน้าประวัติการเติมสารเคมี
// =========================================================================
function generateRefillPages(dataToRender, monthVal) {
    const container = document.getElementById('documentContainer');
    if (dataToRender.length === 0) {
        container.innerHTML = `<div class="no-data-msg">❌ ไม่พบประวัติการเติมสารในเดือนที่เลือก</div>`;
        return;
    }
    let html = '';
    let fallbackHeadSignature = "https://github.com/user-attachments/assets/ddf96f31-a164-472d-b15a-0eb2048d98a4";
    let headSignatureUrl = chiefSignatureGlobal || staffSignatures["ยุทธภูมิ ญานเพิ่ม"] || staffSignatures["นายยุทธภูมิ ญานเพิ่ม"] || fallbackHeadSignature;
    let headSignatureHtml = headSignatureUrl ? `<img src="${headSignatureUrl}" class="head-signature-img" alt="ลายเซ็นหัวหน้า" />` : '';

    dataToRender.forEach(r => {
        let vImgUrl = "";
        let checkPlate = r.plate ? r.plate.trim() : "";
        let checkEquip = r.equipId ? r.equipId.trim() : "";
        let isDummyEquip = (!checkEquip || checkEquip === "-" || checkEquip === "****" || checkEquip === "ไม่มี");

        if (!isDummyEquip && fireImages[checkEquip]) {
            vImgUrl = fireImages[checkEquip];
        } else if (checkPlate && fireImages[checkPlate]) {
            vImgUrl = fireImages[checkPlate];
        }

        html += `
            <div class="page form-page">
                <div class="content-split">
                    <div class="left-header-info" style="display: flex; flex-direction: column; gap: 10px; flex: 1;">
                        <div class="doc-header">
                            <h1>แบบบันทึกประวัติการเติมสารเคมีถังดับเพลิง</h1>
                            <h2>งานจราจรและความปลอดภัย กองกายภาพและสิ่งแวดล้อม</h2>
                        </div>
                        <div class="info-text-section" style="flex-direction: column; gap: 5px;">
                            <div class="info-item"><span class="label">วันที่เติมสาร:</span> <span class="value">${r.displayDate}</span></div>
                            <div class="info-item"><span class="label">รหัส / ถังที่:</span> <span class="value">${r.plate !== '-' && r.plate ? r.plate : '-'}</span></div>
                            <div class="info-item"><span class="label">หมายเลขครุภัณฑ์:</span> <span class="value">${r.equipId}</span></div>
                            <div class="info-item"><span class="label">สารเคมีที่เติม:</span> <span class="value">${r.chemical}</span></div>
                            <div class="info-item"><span class="label">น้ำหนักก่อนเติม:</span> <span class="value">${r.weightBefore} Kg.</span></div>
                            <div class="info-item"><span class="label">น้ำหนักหลังเติม:</span> <span class="value">${r.weightAfter} Kg.</span></div>
                            <div class="info-item"><span class="label">บริษัทที่ดำเนินการ:</span> <span class="value">${r.company}</span></div>
                        </div>
                    </div>
                    <div class="info-image-section">
                        ${vImgUrl ? `<img src="${vImgUrl}" alt="รูปประกอบ" />` : `<span style="color:#94a3b8; font-size:14px; text-align:center;">ไม่มี<br>รูปภาพแนบ</span>`}
                    </div>
                </div>
                
                <div class="section-title" style="margin-top: 5px; border-bottom: none; text-align: left; font-size: 18px;">หมายเหตุ / รายละเอียดเพิ่มเติม:</div>
                <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; padding: 15px; border-radius: 8px; font-size: 18px; min-height: 80px; color: ${r.note && r.note !== "-" ? '#dc2626' : '#64748b'}; font-weight: ${r.note && r.note !== "-" ? 'bold' : 'normal'};">
                    ${r.note && r.note !== "-" ? r.note : '-'}
                </div>
                
                <div style="flex-grow: 1;"></div>
                
                <div class="signature-section" style="justify-content: flex-end; margin-top: 20px;">
                    <div class="signature-block">
                        <div class="signature-img-container">${headSignatureHtml}</div>
                        <div>( ยุทธภูมิ ญานเพิ่ม )</div>
                        <div style="margin-top: 5px; color: #0f172a;">หัวหน้างานจราจรและความปลอดภัย</div>
                    </div>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

// =========================================================================
// 🌟 3. ฟังก์ชันสร้างหน้าตาราง (ปรับเป็นแนวนอนทั้งหมด) 🌟
// =========================================================================
function generatePrintPages(dataToRender) {
    const container = document.getElementById('documentContainer');
    let html = '';
    
    if (dataToRender.length === 0) {
        container.innerHTML = `<div class="no-data-msg">❌ ไม่พบข้อมูลที่ตรงกับตัวกรองที่เลือก</div>`;
        return;
    }

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
                year: parseInt(year) < 2500 ? parseInt(year) + 543 : year,
                records: yearlyRecords
            };
        }
    });

    Object.values(groupedAssets).forEach(asset => {
        const data = asset.info;
        const isFire = data.type.includes('ดับเพลิง') || data.type.includes('อุปกรณ์');
        
        let colorLabel = 'สี:';
        let plateLabel = 'ทะเบียน:';
        
        let docTitle = 'ประวัติการตรวจสภาพยานพาหนะ';
        let vImgUrl = "";
        
        let checkPlate = data.plate ? data.plate.trim() : "";
        let checkEquip = data.equipId ? data.equipId.trim() : "";
        let checkDetail = data.detail ? data.detail.trim() : "";
        let isDummyEquip = (!checkEquip || checkEquip === "-" || checkEquip === "****" || checkEquip === "ไม่มี");

        if (isFire) {
            colorLabel = 'ตำแหน่งที่ตั้ง:';
            plateLabel = 'ถังที่:';
            docTitle = 'ประวัติการตรวจสภาพถังดับเพลิง';

            if (checkDetail && checkPlate && fireImages[checkDetail + "_" + checkPlate]) {
                vImgUrl = fireImages[checkDetail + "_" + checkPlate];
            } else if (!isDummyEquip && fireImages[checkEquip]) {
                vImgUrl = fireImages[checkEquip];
            } else if (checkPlate && fireImages[checkPlate]) {
                vImgUrl = fireImages[checkPlate];
            }
        } else {
            if (!isDummyEquip && vehicleImages[checkEquip]) {
                vImgUrl = vehicleImages[checkEquip];
            } else if (checkPlate && vehicleImages[checkPlate]) {
                vImgUrl = vehicleImages[checkPlate];
            } else if (checkDetail && vehicleImages[checkDetail]) {
                vImgUrl = vehicleImages[checkDetail];
            }
        }

        let plateInfoHtml = '';
        if (!data.type.includes('รถกอล์ฟ') && !data.type.includes('รถจักรยานไฟฟ้า') && !data.type.includes('จักรยานไฟฟ้า')) {
            plateInfoHtml = `<div class="info-item"><span class="label">${plateLabel}</span> <span class="value">${data.plate}</span></div>`;
        }

        let infoHtml = '';
        if (isFire) {
            infoHtml = `
                <div class="info-item"><span class="label">รายละเอียด:</span> <span class="value">${data.detail}</span></div>
                ${plateInfoHtml}
                <div class="info-item"><span class="label">หมายเลขครุภัณฑ์:</span> <span class="value">${data.equipId}</span></div>
            `;
        } else {
            infoHtml = `
                <div class="info-item"><span class="label">รายละเอียดรถ:</span> <span class="value">${data.detail}</span></div>
                <div class="info-item"><span class="label">${colorLabel}</span> <span class="value">${data.color}</span></div>
                ${plateInfoHtml}
                <div class="info-item"><span class="label">หมายเลขครุภัณฑ์:</span> <span class="value">${data.equipId}</span></div>
            `;
        }

        let tableHtml = '';
        const itemsList = isFire ? fireItemsList : vehicleItemsList;
        
        let tableHeaderHtml = `
            <tr>
                <th style="width: 80px;">เดือน/ปี</th>
                ${itemsList.map(item => `<th>${item}</th>`).join('')}
                <th style="width: 100px;">ผู้ตรวจสอบ</th>
            </tr>
        `;

        let checklistHtml = '';
        for (let m = 0; m < 12; m++) {
            const monthRecord = asset.records[m];
            let dateDisplay = `${shortMonths[m]}${asset.year.toString().slice(-2)}`;
            
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

            let inspectorName = monthRecord ? monthRecord.inspector.replace(/^(นาย|นางสาว|นาง)\s*/, "").split(' ')[0] : '-';
            checklistHtml += `<td class="text-center" style="font-size: 14px; color: #334155;">${inspectorName}</td></tr>`;
        }

        tableHtml = `
            <table class="checklist">
                <thead>${tableHeaderHtml}</thead>
                <tbody>${checklistHtml}</tbody>
            </table>
        `;

        let fallbackHeadSignature = "https://github.com/user-attachments/assets/ddf96f31-a164-472d-b15a-0eb2048d98a4";
        let headSignatureUrl = chiefSignatureGlobal || staffSignatures["ยุทธภูมิ ญานเพิ่ม"] || fallbackHeadSignature;
        let headSignatureHtml = headSignatureUrl ? `<img src="${headSignatureUrl}" class="head-signature-img" alt="ลายเซ็นหัวหน้า" />` : '';

        // 👇 ตัวแปร notes ที่เผลอลบไป ใส่คืนให้แล้วครับ
        let notes = asset.records.filter(r => r && r.note && r.note !== "-").map(r => r.note);

        html += `
            <div class="page form-page">
                <div class="content-split">
                    <div class="left-header-info" style="display: flex; flex-direction: column; gap: 10px; flex: 1;">
                        <div class="doc-header">
                            <h1>${docTitle}</h1>
                            <h2>งานจราจรและความปลอดภัย กองกายภาพและสิ่งแวดล้อม</h2>
                        </div>
                        <div class="info-text-section" style="flex-direction: column; gap: 5px;">
                            ${infoHtml}
                        </div>
                    </div>
                    <div class="info-image-section">
                        ${vImgUrl ? `<img src="${vImgUrl}" alt="รูปประกอบ" />` : `<span style="color:#94a3b8; font-size:14px; text-align:center;">ไม่มี<br>รูปภาพแนบ</span>`}
                    </div>
                </div>

                ${tableHtml}
                
                ${notes.length > 0 ? `<p style="color: #dc2626; margin-bottom: 5px; font-size: 15px;">หมายเหตุเพิ่มเติม: ${[...new Set(notes)].join(', ')}</p>` : ''}
                
                <div style="flex-grow: 1;"></div>
                
                <div class="signature-section" style="margin-top: 10px; justify-content: flex-end;">
                    <div class="signature-block">
                        <div class="signature-img-container">${headSignatureHtml}</div>
                        <div>( ยุทธภูมิ ญานเพิ่ม )</div>
                        <div style="margin-top: 5px; color: #0f172a;">หัวหน้างานจราจรและความปลอดภัย</div>
                    </div>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

window.onload = loadAllData;