// =========================================================================
// 🌟 1. ตั้งค่าการเชื่อมต่อ Google Sheet
// =========================================================================
const MAIN_SHEET_ID = '1lYRhXtLgec6ISM6Ugt-YKLrh47NRt7ihcVLcD8mI_Yg'; 
const INSPECTION_GID = '267450301'; // GID ของชีตตรวจสอบสภาพรถและอุปกรณ์
const REFILL_GID = '680269898';     // GID ของชีตประวัติการเติมสาร
const VEHICLE_GID = '147145093';    // GID ของชีต Vehicle_List
const FIRE_EQUIP_GID = '25594122';  // GID ของชีต อุปกรณ์ดับเพลิง

// 🌟 ลิงก์ชีตสถิติอื่นๆ ที่งานจราจรดูแล 🌟
const EVENT_SHEET_ID = '1tj_BC_YkBBcin8FqqXB_OvOF5ku2Y24MTh04XmA9zTk'; 
const EVENT_SHEET_GID = '3452793';
const LOSTFOUND_SHEET_ID = '1hEFLf_CuzabHOIdCp_LWEU5M8Be_7bsx1aBZickoSXA'; 
const LOSTFOUND_SHEET_GID = '0';

// 🌟 2. ตั้งค่าคอลัมน์ ชีตตรวจสอบ
const COL_DATE = 0;      const COL_INSPECTOR = 1; 
const COL_TYPE = 2;      const COL_DETAIL = 3;    
const COL_COLOR = 4;     const COL_PLATE = 5;     
const COL_EQUIP = 6;     
const COL_CHK_START = 7; const COL_CHK_END = 15;  
const COL_NOTE = 16;     const COL_STATUS = 17;   

// =========================================================================

const thaiMonths = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];

let staffSignatures = {};
let chiefSignatureGlobal = "";
let globalInspectionData = [];
let globalRefillData = []; 
let globalEventData = [];
let globalLostFoundData = [];
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
            if (dObj && !isNaN(dObj.getTime())) {
                let yearTH = dObj.getFullYear() < 2500 ? dObj.getFullYear() + 543 : dObj.getFullYear();
                fullThaiDate = `${dObj.getDate()} ${thaiMonths[dObj.getMonth()]} ${yearTH}`;
                filterDateStr = `${dObj.getFullYear()}-${String(dObj.getMonth()+1).padStart(2, '0')}`;
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
    const mode = document.querySelector('input[name="filterMode"]:checked').value;
    const monthVal = document.getElementById('filterMonth').value; 
    
    // โหมด "ทั้งหมด" แสดงหน้าบรรยายภารกิจและหน้าที่
    if (mode === 'all') {
        generateNarrativeSummaryPage();
    } else if (mode === 'refill') {
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

// 🌟 ฟังก์ชันสร้างเอกสารเล่าเรื่อง (แก้ปัญหาตัดครึ่งหน้า และตั้งระยะขอบบนใหม่ให้เท่ากันทุกหน้า) 🌟
function generateNarrativeSummaryPage() {
    const container = document.getElementById('documentContainer');

    let html = `
        <style>
            @media print {
                /* ปลดล็อกความสูงและหน้ากระดาษของ .page สำหรับหน้านี้ */
                .narrative-page {
                    height: auto !important;
                    min-height: 100% !important;
                    overflow: visible !important;
                    page-break-inside: auto !important;
                    break-inside: auto !important;
                    /* ตั้งค่า padding-top ของ container เป็น 0 เพื่อให้ระยะขอบไปตกอยู่ที่ thead แทน (จะได้เว้นขอบเท่ากันทุกหน้า) */
                    padding-top: 0 !important; 
                    padding-bottom: 2cm !important;
                }
                /* บังคับให้แต่ละข้อห้ามโดนตัดครึ่ง ให้ยกไปหน้าใหม่ทั้งก้อน */
                .avoid-break {
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                }
            }
        </style>

        <div class="page narrative-page" style="display: block; font-family: 'TH Sarabun New', sans-serif; height: auto; overflow: visible;">
            <table style="width: 100%; border: none; border-collapse: collapse;">
                <!-- thead จะถูกพิมพ์ซ้ำให้ทุกหน้าอัตโนมัติ -->
                <thead style="display: table-header-group;">
                    <tr>
                        <!-- แทรก padding-top ตรงนี้ เพื่อเป็นระยะเว้นขอบกระดาษด้านบนในทุกๆ หน้าที่ขึ้นใหม่ -->
                        <td style="border: none; padding: 0; padding-top: 40px;">
                            <div class="doc-header" style="text-align: center; border-bottom: 2px solid #1e293b; padding-bottom: 15px; margin-bottom: 30px;">
                                <h1 style="font-weight: bold; font-size: 16px; margin: 0 0 8px 0; color: #0f172a;">หน้าที่ความรับผิดชอบและงานบริการ</h1>
                                <h2 style="font-weight: bold; font-size: 16px; margin: 0; color: #0f172a;">งานจราจรและความปลอดภัย กองกายภาพและสิ่งแวดล้อม มหาวิทยาลัยมหิดล</h2>
                            </div>
                        </td>
                    </tr>
                </thead>
                <tbody style="display: table-row-group;">
                    <tr>
                        <td style="border: none; padding: 0;">
                            <div style="font-size: 16px; font-weight: normal; line-height: 1.2; color: #0f172a;">

                                <!-- หมวดหน้าที่ความรับผิดชอบ -->
                                <div style="font-weight: bold; font-size: 16px; margin-bottom: 20px;">หน้าที่ความรับผิดชอบ</div>

                                <!-- ด้านยุทธศาสตร์ (กล่อง 1) -->
                                <div class="avoid-break" style="margin-bottom: 30px;">
                                    <div style="font-weight: bold; font-size: 16px; margin-bottom: 16px;">1. ด้านยุทธศาสตร์และพัฒนาระบบ</div>
                                    <ul style="margin-top: 0; margin-bottom: 0; padding-left: 20px; list-style-type: none; font-weight: normal;">
                                        <li style="margin-bottom: 16px;">- ดำเนินการโครงการปรับปรุงและพัฒนาระบบกายภาพด้านการจราจรและความปลอดภัย</li>
                                        <li style="margin-bottom: 16px;">- จัดทำและปรับปรุงแผนการป้องกันและแก้ไขเหตุฉุกเฉิน</li>
                                        <li style="margin-bottom: 16px;">- จัดทำและปรับปรุงหลักเกณฑ์ ระเบียบ แนวปฏิบัติด้านการจราจรและความปลอดภัย</li>
                                        <li style="margin-bottom: 16px;">- ดำเนินการกำกับดูแลให้เป็นไปตามประกาศด้านการจราจรและความปลอดภัย</li>
                                        <li style="margin-bottom: 16px;">- สำรวจและรายงานสภาพแวดล้อมทางกายภาพเพื่อแจ้งซ่อมบำรุง</li>
                                        <li style="margin-bottom: 16px;">- รวบรวมสถิติด้านการจราจรและความปลอดภัย</li>
                                    </ul>
                                </div>

                                <!-- ด้านรักษาความปลอดภัย (กล่อง 2) -->
                                <div class="avoid-break" style="margin-bottom: 30px;">
                                    <div style="font-weight: bold; font-size: 16px; margin-bottom: 16px;">2. ด้านรักษาความปลอดภัย</div>
                                    <ul style="margin-top: 0; margin-bottom: 0; padding-left: 20px; list-style-type: none; font-weight: normal;">
                                        <li style="margin-bottom: 16px;">- รักษาความปลอดภัยในชีวิต ทรัพย์สิน อาคาร และสถานที่ในพื้นที่ศาลายา</li>
                                        <li style="margin-bottom: 16px;">- ดูแลตรวจตราความเรียบร้อยต่างๆ ในพื้นที่ศาลายา (ส่วนกลาง)</li>
                                        <li style="margin-bottom: 16px;">- ตรวจสอบและรายงานระบบการรักษาความปลอดภัย</li>
                                        <li style="margin-bottom: 16px;">- ตรวจสอบและจดบันทึกการนำสิ่งของออกนอกพื้นที่มหาวิทยาลัย</li>
                                        <li style="margin-bottom: 16px;">- กำหนดเวลาเปิด-ปิดประตูทางเข้าออกมหาวิทยาลัย</li>
                                        <li style="margin-bottom: 16px;">- ปฏิบัติงานด้านการให้บริการกล้องโทรทัศน์วงจรปิด (CCTV)</li>
                                        <li style="margin-bottom: 16px;">- ควบคุม ดูแล การปฏิบัติงานของบริษัทผู้รับจ้างเหมาบริการรักษาความปลอดภัย</li>
                                    </ul>
                                </div>

                                <!-- ด้านการจราจร (กล่อง 3) -->
                                <div class="avoid-break" style="margin-bottom: 30px;">
                                    <div style="font-weight: bold; font-size: 16px; margin-bottom: 16px;">3. ด้านการจราจร</div>
                                    <ul style="margin-top: 0; margin-bottom: 0; padding-left: 20px; list-style-type: none; font-weight: normal;">
                                        <li style="margin-bottom: 16px;">- อำนวยการจราจร อำนวยความสะดวกในการจอดรถ และจัดการจราจรภายในพื้นที่ศาลายา</li>
                                        <li style="margin-bottom: 16px;">- บริหารงานโครงการรถรางวิ่งให้บริการในวิทยาเขตศาลายา</li>
                                        <li style="margin-bottom: 16px;">- ควบคุมดูแลการให้บริการจักรยานสาธารณะ Anywheel</li>
                                        <li style="margin-bottom: 16px;">- ควบคุมการจ้างเหมาบริการรถสาธารณะภายในวิทยาเขต</li>
                                        <li style="margin-bottom: 16px;">- ดำเนินการติดตั้งและบำรุงรักษาป้ายจราจรต่างๆ</li>
                                        <li style="margin-bottom: 16px;">- กำหนดจุดทาสีขาวแดง ขาวเหลือง และพื้นที่ห้ามจอด</li>
                                    </ul>
                                </div>

                                <!-- หมวดงานบริการ (กล่อง 4) -->
                                <div class="avoid-break" style="margin-bottom: 30px;">
                                    <div style="font-weight: bold; font-size: 16px; margin-bottom: 16px;">4. งานบริการ</div>
                                    <ul style="margin-top: 0; margin-bottom: 0; padding-left: 20px; list-style-type: none; font-weight: normal;">
                                        <li style="margin-bottom: 16px;">- ให้บริการต่าง ๆ ที่เกี่ยวข้องในงานจราจรและความปลอดภัย</li>
                                        <li style="margin-bottom: 16px;">- บริการรับแจ้งเหตุด่วน-เหตุร้าย ตลอด 24 ชั่วโมง</li>
                                        <li style="margin-bottom: 16px;">- บริการศูนย์รับแจ้งของหายและรับของคืน (Lost & Found)</li>
                                        <li style="margin-bottom: 16px;">- บริการขอดูภาพจากกล้องโทรทัศน์วงจรปิด (CCTV) ย้อนหลัง</li>
                                        <li style="margin-bottom: 16px;">- บริการอำนวยความสะดวกด้านการจัดการจราจรและพื้นที่จอดรถ</li>
                                    </ul>
                                </div>

                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
    container.innerHTML = html;
}

// -------------------------------------------------------------------------
// ฟังก์ชันเดิมของ Refill และ PrintPages ยังอยู่ครบ ไม่มีการเปลี่ยนแปลง
// -------------------------------------------------------------------------

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
            <div class="page" style="display: flex; flex-direction: column;">
                <div class="doc-header">
                    <h1>แบบบันทึกประวัติการเติมสารเคมีถังดับเพลิง</h1>
                    <h2>งานจราจรและความปลอดภัย กองกายภาพและสิ่งแวดล้อม มหาวิทยาลัยมหิดล</h2>
                </div>
                <div class="content-split">
                    <div class="info-text-section">
                        <div class="info-item"><span class="label">วันที่เติมสาร:</span> <span class="value">${r.displayDate}</span></div>
                        <div class="info-item"><span class="label">รหัส / ถังที่:</span> <span class="value">${r.plate !== '-' && r.plate ? r.plate : '-'}</span></div>
                        <div class="info-item"><span class="label">หมายเลขครุภัณฑ์:</span> <span class="value">${r.equipId}</span></div>
                        <div class="info-item"><span class="label">สารเคมีที่เติม:</span> <span class="value">${r.chemical}</span></div>
                        <div class="info-item"><span class="label">น้ำหนักก่อนเติม:</span> <span class="value">${r.weightBefore} Kg.</span></div>
                        <div class="info-item"><span class="label">น้ำหนักหลังเติม:</span> <span class="value">${r.weightAfter} Kg.</span></div>
                        <div class="info-item"><span class="label">บริษัทที่ดำเนินการ:</span> <span class="value">${r.company}</span></div>
                    </div>
                    <div class="info-image-section">
                        ${vImgUrl ? `<img src="${vImgUrl}" alt="รูปประกอบ" />` : `<span style="color:#94a3b8; font-size:14px; text-align:center;">ไม่มี<br>รูปภาพแนบ</span>`}
                    </div>
                </div>
                <div class="section-title" style="margin-top: 10px; border-bottom: none; text-align: left; font-size: 16px;">หมายเหตุ / รายละเอียดเพิ่มเติม:</div>
                <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; padding: 15px; border-radius: 8px; font-size: 16px; min-height: 80px; color: ${r.note && r.note !== "-" ? '#dc2626' : '#64748b'}; font-weight: ${r.note && r.note !== "-" ? 'bold' : 'normal'};">
                    ${r.note && r.note !== "-" ? r.note : '-'}
                </div>
                <div style="flex-grow: 1;"></div>
                <div class="signature-section" style="justify-content: flex-end; margin-top: 60px;">
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

function generatePrintPages(dataToRender) {
    const container = document.getElementById('documentContainer');
    let html = '';
    if (dataToRender.length === 0) {
        container.innerHTML = `<div class="no-data-msg">❌ ไม่พบข้อมูลที่ตรงกับตัวกรองที่เลือก</div>`;
        return;
    }

    dataToRender.forEach(data => {
        let checklistHtml = '';
        if(data.checks.length === 0) {
            checklistHtml = `<tr><td colspan="2" class="text-center text-gray-500">ไม่มีข้อมูล Checklist เพิ่มเติม</td></tr>`;
        } else {
            data.checks.forEach(check => {
                let parts = check.split(')');
                let itemName = parts[0].replace('(', '').trim();
                let statusText = parts[1] ? parts[1].trim() : check;
                let statusClass = statusText.includes('ไม่ปกติ') ? 'status-fail' : 'status-pass';
                checklistHtml += `<tr><td>${itemName}</td><td class="status ${statusClass}">${statusText}</td></tr>`;
            });
        }

        let finalStatusColor = data.finalStatus.includes('ไม่สามารถ') ? '#dc2626' : '#15803d';
        let cleanInspectorName = data.inspector.replace(/^(นาย|นางสาว|นาง)\s*/, "").replace(/\s+/g, ' ').trim();
        let fallbackInspectorSig = "https://github.com/user-attachments/assets/faf13a37-9623-4215-9a60-f0bf20b7ae95";
        let signatureUrl = staffSignatures[cleanInspectorName] || fallbackInspectorSig;
        let signatureHtml = signatureUrl ? `<img src="${signatureUrl}" class="signature-img" alt="ลายเซ็น" />` : '';

        let fallbackHeadSignature = "https://github.com/user-attachments/assets/ddf96f31-a164-472d-b15a-0eb2048d98a4";
        let headSignatureUrl = chiefSignatureGlobal || staffSignatures["ยุทธภูมิ ญานเพิ่ม"] || staffSignatures["นายยุทธภูมิ ญานเพิ่ม"] || fallbackHeadSignature;
        let headSignatureHtml = headSignatureUrl ? `<img src="${headSignatureUrl}" class="head-signature-img" alt="ลายเซ็นหัวหน้า" />` : '';

        let colorLabel = 'สี:';
        let plateLabel = 'ทะเบียน:';
        let vImgUrl = "";
        let docTitle = 'แบบบันทึกผลการตรวจสภาพยานพาหนะ'; 
        
        let checkPlate = data.plate ? data.plate.trim() : "";
        let checkEquip = data.equipId ? data.equipId.trim() : "";
        let checkDetail = data.detail ? data.detail.trim() : "";

        let isDummyEquip = (!checkEquip || checkEquip === "-" || checkEquip === "****" || checkEquip === "ไม่มี");

        if (data.type.includes('ดับเพลิง') || data.type.includes('อุปกรณ์')) {
            colorLabel = 'ตำแหน่งที่ตั้ง:';
            plateLabel = 'ถังที่:';
            docTitle = 'แบบบันทึกผลการตรวจสภาพถังดับเพลิง'; 

            if (checkDetail && checkPlate && fireImages[checkDetail + "_" + checkPlate]) {
                vImgUrl = fireImages[checkDetail + "_" + checkPlate];
            } else if (!isDummyEquip && fireImages[checkEquip]) {
                vImgUrl = fireImages[checkEquip];
            } else if (checkPlate && fireImages[checkPlate]) {
                vImgUrl = fireImages[checkPlate];
            }
        } else {
            colorLabel = 'สี:';
            plateLabel = 'ทะเบียน:';
            docTitle = 'แบบบันทึกผลการตรวจสภาพยานพาหนะ'; 
            
            if (!isDummyEquip && vehicleImages[checkEquip]) {
                vImgUrl = vehicleImages[checkEquip];
            } else if (checkPlate && vehicleImages[checkPlate]) {
                vImgUrl = vehicleImages[checkPlate];
            } else if (checkDetail && vehicleImages[checkDetail]) {
                vImgUrl = vehicleImages[checkDetail];
            } else if (checkDetail) {
                let keys = Object.keys(vehicleImages);
                for (let k of keys) {
                    if (k.toLowerCase().includes(checkDetail.toLowerCase()) || checkDetail.toLowerCase().includes(k.toLowerCase())) {
                        vImgUrl = vehicleImages[k];
                        break;
                    }
                }
            }
        }

        let plateInfoHtml = '';
        if (!data.type.includes('รถกอล์ฟ') && !data.type.includes('รถจักรยานไฟฟ้า') && !data.type.includes('จักรยานไฟฟ้า')) {
            plateInfoHtml = `<div class="info-item"><span class="label">${plateLabel}</span> <span class="value">${data.plate}</span></div>`;
        }

        html += `
            <div class="page" style="display: flex; flex-direction: column;">
                <div class="doc-header">
                    <h1>${docTitle}</h1>
                    <h2>งานจราจรและความปลอดภัย กองกายภาพและสิ่งแวดล้อม มหาวิทยาลัยมหิดล</h2>
                </div>
                <div class="content-split">
                    <div class="info-text-section">
                        <div class="info-item"><span class="label">วันที่บันทึก:</span> <span class="value">${data.date}</span></div>
                        <div class="info-item"><span class="label">ผู้ทำการตรวจ:</span> <span class="value">${data.inspector}</span></div>
                        <div class="info-item"><span class="label">ประเภท:</span> <span class="value">${data.type}</span></div>
                        <div class="info-item"><span class="label">รายละเอียด:</span> <span class="value">${data.detail}</span></div>
                        <div class="info-item"><span class="label">${colorLabel}</span> <span class="value">${data.color}</span></div>
                        ${plateInfoHtml}
                        <div class="info-item" style="grid-column: 1 / -1;"><span class="label">หมายเลขครุภัณฑ์:</span> <span class="value">${data.equipId}</span></div>
                    </div>
                    <div class="info-image-section">
                        ${vImgUrl ? `<img src="${vImgUrl}" alt="รูปประกอบ" />` : `<span style="color:#94a3b8; font-size:14px; text-align:center;">ไม่มี<br>รูปภาพแนบ</span>`}
                    </div>
                </div>
                <div class="section-title">รายงานตรวจสอบสภาพ</div>
                <table class="checklist">
                    <thead><tr><th>รายการตรวจเช็ค</th><th style="width: 30%;" class="text-center">ผลการตรวจ</th></tr></thead>
                    <tbody>${checklistHtml}</tbody>
                </table>
                ${data.note && data.note !== "-" ? `<p style="color: #dc2626; font-weight: bold; margin-bottom: 10px;">หมายเหตุเพิ่มเติม: ${data.note}</p>` : ''}
                <div class="final-status" style="border-left-color: ${finalStatusColor};">
                    สถานะหลังการตรวจ: <span style="color: ${finalStatusColor};">${data.finalStatus}</span>
                </div>
                <div style="flex-grow: 1;"></div>
                <div class="signature-section">
                    <div class="signature-block">
                        <div class="signature-img-container">${signatureHtml}</div>
                        <div>( ${data.inspector} )</div>
                        <div style="margin-top: 5px; color: #0f172a;">ผู้รายงาน / ผู้ตรวจสภาพ</div>
                    </div>
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