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

// ==========================================
// 🌟 2. ดันปุ่ม Filter ขึ้นไปที่ Header (DOM Injection) 🌟
// ==========================================
function setupParentHeader() {
    // เช็คว่าอยู่ใน Iframe และ Parent มีช่องรอรับ Header หรือไม่
    if (window.parent && window.parent.document.getElementById('headerFilterSlot')) {
        const filterSlot = window.parent.document.getElementById('headerFilterSlot');
        
        // ส่งโค้ด HTML ขึ้นไปแสดงผล (ตัด รถยนต์/รถตู้/รถกระบะ ออกแล้ว)
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

        // ผูกสคริปต์การคลิกกับปุ่มที่อยู่ด้านบน
        const filterBtns = filterSlot.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                filterBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                currentSubFilter = this.getAttribute('data-filter');
                applyFilters();
            });
        });

        // ผูกการค้นหาเมื่อพิมพ์ข้อความ
        const searchInput = filterSlot.querySelector('#parentSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', applyFilters);
        }
        
        // สั่งเปลี่ยนภาษาทันทีหลังสร้างปุ่ม
        if (typeof window.applyLanguageUI === 'function') {
            window.applyLanguageUI();
        }
    }
}

// ==========================================
// 3. ฟังก์ชันโหลดข้อมูล (Caches)
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
    
    // ค้นหาช่องแสดงผลจาก Parent
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
    // อ่านค่าการพิมพ์ค้นหาจากแถบด้านบน (Parent)
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

        // ดึงรูปภาพทั้งหมดที่มี (1-3) / Get all available images (1-3)
        const images = [item.URL_รูปภาพ_1, item.URL_รูปภาพ_2, item.URL_รูปภาพ_3].filter(u => u);
        if(images.length === 0) images.push('placeholder.png');

        // สรรค์สร้างโค้ด HTML สำหรับรูปภาพทั้งหมด / Generate HTML for all images
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
                    ${imagesHtml} <!-- 🌟 แสดงรูปทั้งหมดที่นี่เพื่อให้ CSS สไลด์ได้ 🌟 -->
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

    let detailHtml = `
        <h2>${vehicle['ยี่ห้อ/รุ่น'] || '-'}</h2>
        <p><strong>${lang === 'th' ? 'ประเภท' : 'Type'}:</strong> ${vehicle.ประเภท || '-'}</p>
        <p><strong>${lang === 'th' ? 'สีรถ' : 'Color'}:</strong> ${vehicle.สี || '-'}</p>
        <p><strong>${lang === 'th' ? 'เลขทะเบียน' : 'License Plate'}:</strong> ${vehicle.ทะเบียน || '-'}</p>
        <p><strong>${lang === 'th' ? 'หมายเลขครุภัณฑ์' : 'Asset ID'}:</strong> ${vehicle.หมายเลขครุภัณฑ์ || '-'}</p>
        <div class="action-buttons">
            <a href="${autoFillURL}" class="action-btn" style="background:#059669;">${lang === 'th' ? '🔧 ตรวจสอบสภาพ' : '🔧 Inspect Vehicle'}</a>
            <button onclick="openInspectionHistoryModal(${index})" class="action-btn" style="background:#3498db;">${lang === 'th' ? '📊 ประวัติ' : '📊 History'}</button>
            <button onclick="openCleanFormModal(${index})" class="action-btn" style="background:#0ea5e9;">${lang === 'th' ? '✨ ล้างรถ' : '✨ Clean'}</button>
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
    
    // อัปเดตภาษาใน Iframe
    document.querySelectorAll('[data-th][data-en]').forEach(el => {
        const text = el.getAttribute(`data-${currentLang}`);
        if (text) el.textContent = text;
    });

    // อัปเดตภาษาบน Header Parent
    if (window.parent && window.parent.document.getElementById('headerFilterSlot')) {
        const parentSlot = window.parent.document.getElementById('headerFilterSlot');
        parentSlot.querySelectorAll('[data-th][data-en]').forEach(el => {
            const text = el.getAttribute(`data-${currentLang}`);
            if (text) el.textContent = text;
        });
        const parentSearch = parentSlot.querySelector('#parentSearchInput');
        if (parentSearch) {
            const placeholderText = parentSearch.getAttribute(`data-${currentLang}-placeholder`);
            if (placeholderText) parentSearch.placeholder = placeholderText;
        }
    }
    
    const cleanerInput = document.getElementsByName('ผู้ดำเนินการ')[0];
    if (cleanerInput) cleanerInput.placeholder = cleanerInput.getAttribute(`data-${currentLang}-placeholder`) || cleanerInput.placeholder;
    const remarkTextarea = document.getElementsByName('หมายเหตุ')[0];
    if (remarkTextarea) remarkTextarea.placeholder = remarkTextarea.getAttribute(`data-${currentLang}-placeholder`) || remarkTextarea.placeholder;
};

// ==========================================
// 8. เริ่มการทำงาน (Initialization)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    setupParentHeader(); 
    fetchVehicles();

    // ปุ่มสไลด์รูปใน Modal
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
        if(e.target.classList.contains('modal')) e.target.style.display = 'none';
    });
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
});

window.openInspectionHistoryModal = function(index) {
    document.getElementById('vehicleModal').style.display = 'none';
    document.getElementById('inspectionHistoryModal').style.display = 'flex';
};

window.openCleanFormModal = function(index) {
    const vehicle = allVehicles[index];
    document.getElementById('cl_plate').value = vehicle.ทะเบียน || '-';
    document.getElementById('cl_equip').value = vehicle.หมายเลขครุภัณฑ์ || '-';
    document.getElementById('cl_model').value = vehicle['ยี่ห้อ/รุ่น'] || '-';
    document.getElementById('cl_date').value = new Date().toISOString().split('T')[0];
    document.getElementById('vehicleModal').style.display = 'none';
    document.getElementById('cleanFormModal').style.display = 'block';
};