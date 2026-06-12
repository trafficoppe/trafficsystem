// ==========================================
// 1. ตั้งค่าตัวแปรระบบเชื่อมต่อข้อมูล (Configuration)
// ==========================================
const scriptURL = "https://script.google.com/macros/s/AKfycbzWc03wzCkfUHs3pIucqNs_tz7BguxUlODGOihfiMgHgkQFx5Kc1DRlITg_SDR9lu4/exec"; 
const parkingSheetUrl = "https://docs.google.com/spreadsheets/d/1lYRhXtLgec6ISM6Ugt-YKLrh47NRt7ihcVLcD8mI_Yg/gviz/tq?tqx=out:json&gid=591543024";

let allVehicles = []; 
let currentVehicleIndex = 0; 
let currentImageIndex = 0; 
let mainCategory = 'vehicle'; 
let currentSubFilter = 'all';
let globalInspectionHistory = []; // 🌟 ตัวแปรใหม่สำหรับเก็บประวัติจาก Sheet ตรวจสภาพโดยตรง

// ==========================================
// 🌟 2. ดันปุ่ม Filter ขึ้นไปที่ Header (DOM Injection) 🌟
// ==========================================
function setupParentHeader() {
    if (window.parent && window.parent.document.getElementById('headerFilterSlot')) {
        const filterSlot = window.parent.document.getElementById('headerFilterSlot');
        
        filterSlot.innerHTML = `
            <div class="filter-group" id="filter-group-vehicle">
                <button class="filter-btn active" data-filter="all">
                    <span data-th="ทั้งหมด (พาหนะ)" data-en="All Vehicles">ทั้งหมด (พาหนะ)</span> 
                    <span class="badge">0</span>
                </button>
                <button class="filter-btn" data-filter="รถกอล์ฟ">
                    <span data-th="รถกอล์ฟ" data-en="Golf Carts">รถกอล์ฟ</span> 
                    <span class="badge">0</span>
                </button>
                <button class="filter-btn" data-filter="รถจักรยานยนต์">
                    <span data-th="รถจักรยานยนต์" data-en="Motorcycles">รถจักรยานยนต์</span> 
                    <span class="badge">0</span>
                </button>
                <button class="filter-btn" data-filter="รถจักรยานไฟฟ้า">
                    <span data-th="รถจักรยานไฟฟ้า" data-en="E-Bikes">รถจักรยานไฟฟ้า</span> 
                    <span class="badge">0</span>
                </button>
            </div>
            <div class="search-container">
                <input type="text" id="parentSearchInput" 
                       data-th-placeholder="ค้นหาชื่อ, ทะเบียน..." 
                       data-en-placeholder="Search name, plate..." 
                       placeholder="ค้นหาชื่อ, ทะเบียน...">
            </div>
        `;

        const filterBtns = filterSlot.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                filterBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                currentSubFilter = this.getAttribute('data-filter');
                applyFilters();
            });
        });

        const searchInput = filterSlot.querySelector('#parentSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', applyFilters);
        }
        
        if (typeof window.applyLanguageUI === 'function') {
            window.applyLanguageUI();
        }
    }
}

// ==========================================
// 3. ฟังก์ชันโหลดข้อมูล (Caches & History Fetch)
// ==========================================
function fetchVehicles() {
    let cachedData = sessionStorage.getItem('cachedVehicles');
    if (cachedData) {
        allVehicles = JSON.parse(cachedData);
        updateFilterCounts(); 
        applyFilters(); 
    } else {
        const lang = localStorage.getItem('appLang') || 'th';
        document.getElementById('vehicleGallery').innerHTML = `<p class="loading" data-th="กำลังโหลดข้อมูลล่าสุด..." data-en="Loading latest data...">${lang === 'th' ? 'กำลังโหลดข้อมูลล่าสุด...' : 'Loading latest data...'}</p>`;
    }

    const fetchURL = scriptURL + "?t=" + new Date().getTime();
    fetch(fetchURL)
        .then(response => response.json())
        .then(data => {
            allVehicles = data;
            fetchParkingLots(); 
        })
        .catch(error => console.error("Error fetching vehicles: ", error));
}

// 🌟 ฟังก์ชันใหม่: ดึงประวัติการตรวจสภาพทั้งหมดจาก Sheet แบบเดียวกับหน้า Print
function fetchInspectionHistory() {
    const insUrl = "https://docs.google.com/spreadsheets/d/1lYRhXtLgec6ISM6Ugt-YKLrh47NRt7ihcVLcD8mI_Yg/gviz/tq?tqx=out:json&gid=267450301";
    fetch(insUrl)
        .then(res => res.text())
        .then(text => {
            const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S\w]+)\);/);
            if (match && match[1]) {
                const json = JSON.parse(match[1]);
                globalInspectionHistory = json.table.rows.map(row => {
                    if (!row || !row.c || !row.c[0] || !row.c[0].v) return null;
                    let rawDateVal = row.c[0].v;
                    let dObj = null;
                    
                    if (typeof rawDateVal === 'string' && rawDateVal.startsWith('Date(')) {
                        let p = rawDateVal.match(/\d+/g);
                        dObj = new Date(p[0], p[1], p[2], p[3]||0, p[4]||0);
                    } else {
                        let strVal = String(row.c[0].f || row.c[0].v);
                        let datePart = strVal.split(/[, ]/)[0];
                        let parts = datePart.split('/');
                        if (parts.length === 3) dObj = new Date(parts[2], parts[1]-1, parts[0]);
                        else dObj = new Date(strVal);
                    }
                    if (!dObj || isNaN(dObj.getTime())) return null;
                    
                    return {
                        monthIndex: dObj.getMonth(),
                        year: dObj.getFullYear(),
                        inspector: row.c[1] ? String(row.c[1].v).trim() : "-", // 🌟 เพิ่มบรรทัดนี้: เก็บชื่อผู้ตรวจ
                        detail: row.c[3] ? String(row.c[3].v).trim() : "-",
                        plate: row.c[5] ? String(row.c[5].v).trim() : "-",
                        equipId: row.c[6] ? String(row.c[6].v).trim() : "-",
                        status: row.c[17] ? String(row.c[17].v) : ""
                    };
                }).filter(item => item !== null);
            }
        })
        .catch(err => console.error("Inspection Fetch Error:", err));
}

function fetchParkingLots() {
    fetch(parkingSheetUrl)
        .then(res => res.text())
        .then(text => {
            const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S\w]+)\);/);
            if (match && match[1]) {
                const data = JSON.parse(match[1]);
                const parkingData = data.table.rows.map(row => {
                    if (!row || !row.c) return null;
                    const getV = (i) => (row.c[i] && (row.c[i].f || row.c[i].v)) ? (row.c[i].f || row.c[i].v).toString().trim() : '';
                    
                    let caretakerCol = 2; 
                    for(let i=1; i<=4; i++) {
                        let val = getV(i);
                        if(val === 'ส่วนกลาง' || val === 'ส่วนงาน') { caretakerCol = i; break; }
                    }
                    let order = getV(0);
                    let name = '', caretaker = '', capacity = '', p1, p2, p3, p4, p5;

                    if (caretakerCol === 3) {
                        let id = getV(1); let n = getV(2);
                        name = (id && id !== '-' && id !== n) ? `${id} - ${n}` : n;
                        caretaker = getV(3); capacity = getV(4);
                        p1 = getV(5); p2 = getV(6); p3 = getV(7); p4 = getV(8); p5 = getV(9);
                    } else if (caretakerCol === 2) {
                        name = getV(1); caretaker = getV(2); capacity = getV(3);
                        p1 = getV(4); p2 = getV(5); p3 = getV(6); p4 = getV(7); p5 = getV(8);
                    } else if (caretakerCol === 1) {
                        name = getV(0); caretaker = getV(1); capacity = getV(2);
                        p1 = getV(3); p2 = getV(4); p3 = getV(5); p4 = getV(6); p5 = getV(7);
                    } else {
                        name = getV(1); caretaker = getV(2); capacity = getV(3);
                    }
                    if(!name) return null;
                    return {
                        Data_Category: 'Parking', 'ลำดับ': order, 'ยี่ห้อ/รุ่น': name.trim(), 
                        ประเภท: caretaker, 'ขนาด': capacity, URL_รูปภาพ_1: p1, URL_รูปภาพ_2: p2,
                        URL_รูปภาพ_3: p3, URL_รูปภาพ_4: p4, URL_รูปภาพ_5: p5
                    };
                }).filter(item => item !== null);
                
                allVehicles = allVehicles.filter(v => v.Data_Category !== 'Parking').concat(parkingData); 
                sessionStorage.setItem('cachedVehicles', JSON.stringify(allVehicles));
                
                updateFilterCounts(); 
                applyFilters(); 
            }
        }).catch(err => console.error("Parking Fetch Error:", err));
}

// ==========================================
// 4. อัปเดตตัวเลขและคัดกรองข้อมูล
// ==========================================
function updateFilterCounts() {
    const vehicleData = allVehicles.filter(v => v.Data_Category === 'Asset' && !isFireEquip(v));
    
    let filterContainer = document;
    if (window.parent && window.parent.document.getElementById('filter-group-vehicle')) {
        filterContainer = window.parent.document;
    }

    filterContainer.querySelectorAll('#filter-group-vehicle .filter-btn').forEach(btn => {
        const f = btn.getAttribute('data-filter');
        let count = 0;
        if (f === 'all') {
            count = vehicleData.length;
        } else {
            count = vehicleData.filter(v => `${v.ประเภท || ''} ${v['ยี่ห้อ/รุ่น'] || ''}`.toLowerCase().includes(f.toLowerCase())).length;
        }
        const badge = btn.querySelector('.badge');
        if(badge) badge.innerText = count;
    });
}

function applyFilters() {
    let searchText = '';
    if (window.parent && window.parent.document.getElementById('parentSearchInput')) {
        searchText = window.parent.document.getElementById('parentSearchInput').value.toLowerCase();
    }

    let baseData = allVehicles.filter(v => v.Data_Category === 'Asset' && !isFireEquip(v));

    if (currentSubFilter !== 'all') {
        baseData = baseData.filter(v => `${v.ประเภท || ''} ${v['ยี่ห้อ/รุ่น'] || ''}`.toLowerCase().includes(currentSubFilter.toLowerCase()));
    }

    if (searchText.trim() !== '') {
        baseData = baseData.filter(v => `${v['ยี่ห้อ/รุ่น'] || ''} ${v.ทะเบียน || ''} ${v.สี || ''} ${v.หมายเลขครุภัณฑ์ || ''}`.toLowerCase().includes(searchText));
    }

    displayGallery(baseData);
}

function isFireEquip(v) {
    const fireKeywords = ['ดับเพลิง', 'ถังดับเพลิง', 'สายส่งน้ำ', 'หัวฉีด'];
    return fireKeywords.some(kw => `${v.ประเภท || ''} ${v['ยี่ห้อ/รุ่น'] || ''}`.toLowerCase().includes(kw));
}

function getDirectImageUrl(url) {
    if (!url) return "placeholder.png";
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w600`;
    return url;
}

// ==========================================
// 5. แสดงผลการ์ด
// ==========================================
function displayGallery(dataList) {
    const gallery = document.getElementById('vehicleGallery');
    const lang = localStorage.getItem('appLang') || 'th';
    gallery.innerHTML = '';

    if(dataList.length === 0) {
        gallery.innerHTML = `<p class="loading">${lang === 'th' ? '❌ ไม่พบข้อมูลยานพาหนะ' : '❌ No vehicles found'}</p>`;
        return;
    }

    dataList.forEach(item => {
        const originalIndex = allVehicles.indexOf(item);
        const card = document.createElement('div');
        card.className = 'vehicle-card';

        const images = [item.URL_รูปภาพ_1, item.URL_รูปภาพ_2, item.URL_รูปภาพ_3].filter(u => u);
        if(images.length === 0) images.push('placeholder.png');

        let imagesHtml = '';
        images.forEach(imgUrl => {
            imagesHtml += `<img src="${getDirectImageUrl(imgUrl)}" onerror="this.src='placeholder.png'">`;
        });

        let statusText = item.RequiresRepair ? (lang === 'th' ? 'ชำรุด' : 'Broken') : (lang === 'th' ? 'ใช้งานได้' : 'Available');
        let statusBg = item.RequiresRepair ? '#ef4444' : '#10b981';

        card.innerHTML = `
            <div class="card-image-wrapper" onclick="openModal(${originalIndex})">
                <span style="position: absolute; top: 10px; right: 10px; background: ${statusBg}; color: white; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; z-index: 10;">${statusText}</span>
                <div class="image-slide-track">
                    ${imagesHtml}
                </div>
            </div>
            <div class="card-content" onclick="openModal(${originalIndex})">
                <h3 class="card-title">${item['ยี่ห้อ/รุ่น'] || '-'}</h3>
                <div class="card-plate">${lang === 'th' ? 'ทะเบียน' : 'Plate'}: ${item.ทะเบียน || '-'}</div>
                <div class="card-subtitle">${lang === 'th' ? 'ประเภท' : 'Type'}: ${item.ประเภท || '-'}</div>
            </div>
        `;
        gallery.appendChild(card);
    });
}

// ==========================================
// 6. ระบบป๊อปอัป
// ==========================================
function openModal(index) {
    currentVehicleIndex = index; 
    currentImageIndex = 0;
    const vehicle = allVehicles[index];
    const lang = localStorage.getItem('appLang') || 'th';
    const images = [vehicle.URL_รูปภาพ_1, vehicle.URL_รูปภาพ_2, vehicle.URL_รูปภาพ_3, vehicle.URL_รูปภาพ_4, vehicle.URL_รูปภาพ_5].filter(u => u);
    
    let autoFillURL = `form.html?type=${encodeURIComponent(vehicle.ประเภท)}&detail=${encodeURIComponent(vehicle['ยี่ห้อ/รุ่น'])}&color=${encodeURIComponent(vehicle.สี)}&plate=${encodeURIComponent(vehicle.ทะเบียน)}&equip=${encodeURIComponent(vehicle.หมายเลขครุภัณฑ์)}`;
    let cleanURL = `page_clean_vehicle_form.html?model=${encodeURIComponent(vehicle['ยี่ห้อ/รุ่น'] || '-')}&plate=${encodeURIComponent(vehicle.ทะเบียน || '-')}&equip=${encodeURIComponent(vehicle.หมายเลขครุภัณฑ์ || '-')}`;

    let detailHtml = `
        <h2>${vehicle['ยี่ห้อ/รุ่น'] || '-'}</h2>
        <p><strong>${lang === 'th' ? 'ประเภท' : 'Type'}:</strong> ${vehicle.ประเภท || '-'}</p>
        <p><strong>${lang === 'th' ? 'สีรถ' : 'Color'}:</strong> ${vehicle.สี || '-'}</p>
        <p><strong>${lang === 'th' ? 'เลขทะเบียน' : 'License Plate'}:</strong> ${vehicle.ทะเบียน || '-'}</p>
        <p><strong>${lang === 'th' ? 'หมายเลขครุภัณฑ์' : 'Asset ID'}:</strong> ${vehicle.หมายเลขครุภัณฑ์ || '-'}</p>
        <div class="action-buttons">
            <a href="${autoFillURL}" class="action-btn" style="background:#059669; text-decoration:none;">${lang === 'th' ? 'ตรวจสอบสภาพ' : 'Inspect Vehicle'}</a>
            <a href="${cleanURL}" class="action-btn" style="background:#0ea5e9; text-decoration:none;">${lang === 'th' ? 'ล้างรถ' : 'Clean'}</a>
            <button onclick="openInspectionHistoryModal(${index})" class="action-btn" style="background:#3498db;">${lang === 'th' ? 'ประวัติ' : 'History'}</button>
        </div>
    `;

    document.getElementById('modalDetails').innerHTML = detailHtml;
    document.getElementById('vehicleModal').style.display = 'block';
    changeImage(images);
}

function changeImage(images) {
    if(!images || images.length === 0) images = ['placeholder.png'];
    const modalImg = document.getElementById('modalImage');
    if(modalImg) modalImg.src = getDirectImageUrl(images[currentImageIndex]);
    document.getElementById('imageNumber').innerText = `${currentImageIndex + 1}/${images.length}`;
}

// ==========================================
// 7. จัดการภาษา (Language & Localization)
// ==========================================
window.applyLanguageUI = function() {
    const currentLang = localStorage.getItem('appLang') || 'th';
    
    document.querySelectorAll('[data-th][data-en]').forEach(el => {
        const text = el.getAttribute(`data-${currentLang}`);
        if (text) el.textContent = text;
    });

    if (window.parent && window.parent.document.getElementById('headerFilterSlot')) {
        const parentSlot = window.parent.document.getElementById('headerFilterSlot');
        parentSlot.querySelectorAll('[data-th][data-en]').forEach(el => {
            const text = el.getAttribute(`data-${currentLang}`);
            if (text) el.textContent = text;
        });
        const parentSearch = parentSlot.querySelector('#parentSearchInput');
        if (parentSearch) {
            const placeholderText = parentSearch.getAttribute(`data-${currentLang}-placeholder`);
            if (parentSearch) parentSearch.placeholder = placeholderText;
        }
    }
};

// ==========================================
// 8. เริ่มการทำงาน (Initialization)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    setupParentHeader(); 
    fetchVehicles();
    fetchInspectionHistory(); // 🌟 ดึงข้อมูลประวัติการตรวจสภาพทันทีที่เปิดหน้า

    document.getElementById('prevImageBtn')?.addEventListener('click', () => {
        const images = [allVehicles[currentVehicleIndex].URL_รูปภาพ_1, allVehicles[currentVehicleIndex].URL_รูปภาพ_2, allVehicles[currentVehicleIndex].URL_รูปภาพ_3].filter(u=>u);
        currentImageIndex = (currentImageIndex > 0) ? currentImageIndex - 1 : Math.max(images.length - 1, 0);
        changeImage(images);
    });
    
    document.getElementById('nextImageBtn')?.addEventListener('click', () => {
        const images = [allVehicles[currentVehicleIndex].URL_รูปภาพ_1, allVehicles[currentVehicleIndex].URL_รูปภาพ_2, allVehicles[currentVehicleIndex].URL_รูปภาพ_3].filter(u=>u);
        currentImageIndex = (currentImageIndex < images.length - 1) ? currentImageIndex + 1 : 0;
        changeImage(images);
    });

    window.addEventListener('click', e => {
        if(e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
            // 🌟 ปลดล็อกให้ Sidebar กลับมากดได้เมื่อคลิกปิด Popup
            if (window.parent && window.parent.document.body) {
                window.parent.document.querySelectorAll('.sidebar, #sidebar, .main-sidebar, .sidebar-menu').forEach(el => {
                    el.style.pointerEvents = 'auto';
                });
            }
        }
    });
    
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
            // 🌟 ปลดล็อกให้ Sidebar กลับมากดได้เมื่อคลิกปิด Popup
            if (window.parent && window.parent.document.body) {
                window.parent.document.querySelectorAll('.sidebar, #sidebar, .main-sidebar, .sidebar-menu').forEach(el => {
                    el.style.pointerEvents = 'auto';
                });
            }
        });
    });
});

// ==========================================
// 9. ระบบตารางประวัติการตรวจสภาพ (ดึงข้อมูลจาก Sheet ตรงๆ)
// ==========================================
window.openInspectionHistoryModal = function(index) {
    const vehicle = allVehicles[index];
    const modal = document.getElementById('inspectionHistoryModal');
    
    const modalContent = document.getElementById('inspectionModalContent');
    if (modalContent) {
        modalContent.style.maxWidth = '1200px'; 
        modalContent.style.width = '98%';       
        modalContent.style.padding = '0'; 
        modalContent.style.height = 'auto';      
        modalContent.style.maxHeight = 'none';   
        modalContent.style.overflow = 'hidden';  
        modalContent.style.background = 'transparent';
        modalContent.style.boxShadow = 'none';
        modalContent.style.border = 'none';
    }

    const tablePadding = modal.querySelector('.modal-table-padding');
    if (tablePadding) {
        tablePadding.style.background = 'transparent';
        tablePadding.style.padding = '0';
    }

    // ✨ ซ่อนปุ่ม (X) ออกไปเลย
    const closeWrapper = modal.querySelector('.modal-close-wrapper');
    if (closeWrapper) {
        closeWrapper.style.display = 'none';
    }

    const tableContainer = modal.querySelector('.table-scroll-container');
    if (tableContainer) {
        tableContainer.style.background = '#ffffff';
        tableContainer.style.boxShadow = '0 15px 40px rgba(0,0,0,0.4)';
        tableContainer.style.borderRadius = '12px';
    }

    modal.style.overflowY = 'auto';
    modal.style.paddingTop = '15px'; 
    modal.style.paddingBottom = '40px';

    document.getElementById('inspInfoLeft').innerHTML = '';
    const infoWrapper = document.querySelector('.insp-info-wrapper');
    if (infoWrapper) {
        infoWrapper.style.display = 'none'; 
        infoWrapper.style.marginBottom = '0';
    }

    const isFire = vehicle.ประเภท && vehicle.ประเภท.includes('ดับเพลิง');
    const items = isFire 
        ? ["สภาพตัวถัง", "แรงดันเกจ์", "สาย/หัวฉีด", "สลัก/ซีล", "คันบีบ", "ป้ายแนะนำ", "ตำแหน่งติดตั้ง", "ฐาน/ที่แขวน", "อายุใช้งาน"]
        : ["ลมยาง", "สภาพยาง", "กะทะล้อ", "ระบบเบรก", "โช้คอัพ", "ระบบไฟ", "แบตเตอรี่", "ขับเคลื่อน", "ตัวถัง"];

    let headHtml = `<tr style="background-color: #f1f5f9;">
        <th style="padding: 10px; border: 1px solid #cbd5e1; width: 60px;">เดือน</th>`;
    items.forEach(item => {
        headHtml += `<th style="padding: 10px; border: 1px solid #cbd5e1; font-size: 13px;">${item}</th>`;
    });
    headHtml += `<th style="padding: 10px; border: 1px solid #cbd5e1; width: 90px;">สถานะ</th>
                 <th style="padding: 10px; border: 1px solid #cbd5e1; width: 100px;">ผู้ตรวจ</th></tr>`;
    document.getElementById('inspectionChecklistHead').innerHTML = headHtml;

    const monthsTH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    let bodyHtml = '';

    let vPlate = vehicle['ทะเบียน'] ? String(vehicle['ทะเบียน']).trim() : "-";
    let vEquip = vehicle['หมายเลขครุภัณฑ์'] ? String(vehicle['หมายเลขครุภัณฑ์']).trim() : "-";
    let vDetail = vehicle['ยี่ห้อ/รุ่น'] ? String(vehicle['ยี่ห้อ/รุ่น']).trim() : "-";
    const currentYear = new Date().getFullYear();

    monthsTH.forEach((m, idx) => {
        let records = globalInspectionHistory.filter(r => {
            if (r.monthIndex !== idx || r.year !== currentYear) return false;
            let matchEquip = (vEquip !== "-" && vEquip !== "" && r.equipId === vEquip);
            let matchPlate = (vPlate !== "-" && vPlate !== "" && r.plate === vPlate);
            let matchDetail = (vDetail !== "-" && vDetail !== "" && r.detail === vDetail);
            
            return matchEquip || matchPlate || (matchDetail && vPlate === "-" && vEquip === "-");
        });

        let hasData = records.length > 0;
        let finalStatusStr = hasData ? records[records.length - 1].status : "-";
        
        let inspectorStr = "-";
        if (hasData) {
            let rawName = records[records.length - 1].inspector;
            if (rawName && rawName !== "-") {
                inspectorStr = rawName.replace(/^(นาย|นางสาว|นาง)\s*/, "").split(' ')[0];
            }
        }

        bodyHtml += `<tr><td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold; text-align: center; background-color: #f8fafc;">${m}</td>`;

        if (hasData) {
            for(let i = 0; i < 9; i++) {
                let mark = '<span style="color:#10b981; font-weight:bold; font-size: 16px;">&#10004;</span>';
                bodyHtml += `<td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">${mark}</td>`;
            }

            let statusHtml = (finalStatusStr.includes('ไม่สามารถ') || finalStatusStr.includes('ชำรุด') || finalStatusStr.includes('ไม่ปกติ')) 
                ? '<span style="color:#ef4444; font-weight:bold; font-size:14px;">ชำรุด</span>' 
                : '<span style="color:#10b981; font-weight:bold; font-size:14px;">ใช้งานได้</span>';
            
            bodyHtml += `<td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">${statusHtml}</td>`;
            bodyHtml += `<td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; font-size: 14px; color: #334155;">${inspectorStr}</td></tr>`;

        } else {
            for(let i = 0; i < 9; i++) {
                bodyHtml += `<td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; color:#94a3b8;">-</td>`;
            }
            bodyHtml += `<td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; color:#94a3b8;">-</td>`;
            bodyHtml += `<td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; color:#94a3b8;">-</td></tr>`;
        }
    });

    document.getElementById('inspectionChecklistBody').innerHTML = bodyHtml;
    document.getElementById('vehicleModal').style.display = 'none';
    modal.style.display = 'flex';

    // 🌟 3. ล็อกไม่ให้คลิก Sidebar ในหน้าแม่ขณะที่ Popup เปิดอยู่
    if (window.parent && window.parent.document.body) {
        window.parent.document.querySelectorAll('.sidebar, #sidebar, .main-sidebar, .sidebar-menu').forEach(el => {
            el.style.pointerEvents = 'none'; // ปิดการรับคำสั่งการคลิก
        });
    }
};