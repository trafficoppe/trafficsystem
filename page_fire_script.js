/* ==========================================
   FIRE EQUIPMENT JAVASCRIPT (page_fire_script.js)
   ========================================== */

const scriptURL = "https://script.google.com/macros/s/AKfycbzWc03wzCkfUHs3pIucqNs_tz7BguxUlODGOihfiMgHgkQFx5Kc1DRlITg_SDR9lu4/exec";

let allFireEquip = []; 
let currentLang = localStorage.getItem('appLang') || localStorage.getItem('lang') || 'th';
let currentCategoryFilter = 'all'; 
let globalInspectionHistory = []; 
let globalRefillHistory = []; // 🌟 เก็บประวัติการเติมสารเคมี

let currentImages = [];
let currentImgIndex = 0;

const fireTranslations = {
    th: {
        loading: "⌛ กำลังโหลดข้อมูลอุปกรณ์ดับเพลิง...",
        error: "❌ เกิดข้อผิดพลาดในการโหลดข้อมูล หรือไม่มีข้อมูลในระบบ",
        noData: "🔍 ไม่พบข้อมูลในหมวดหมู่นี้",
        searchPlaceholder: "ค้นหาสถานที่, ทะเบียน...",
        type: "ชนิด / ขนาด",
        location: "สถานที่ติดตั้ง",
        plate: "หมายเลข/ทะเบียน",
        statusNormal: "ใช้งานได้",
        statusRepair: "ใช้งานไม่ได้",
        statusLbl: "สถานะ",
        fireClassTitle: "ประเภทไฟที่ดับได้:",
        lblSize: "ขนาด:",
        lblHose: "สายที่", lblNozzle: "อันที่", lblCab: "ตู้ที่", lblExt: "ถังที่", lblHyd: "จุดที่", lblPPE: "ชุดที่", lblOrder: "ลำดับที่",
        lblQty: "จำนวน: 1"
    },
    en: {
        loading: "⌛ Loading Fire Equipment...",
        error: "❌ Error loading data from server",
        noData: "🔍 No equipment found in this category",
        searchPlaceholder: "Search location, ID...",
        type: "Type / Size",
        location: "Location",
        plate: "Asset ID",
        statusNormal: "Ready",
        statusRepair: "Defective",
        statusLbl: "Status",
        fireClassTitle: "Fire Classes:",
        lblSize: "Capacity:",
        lblHose: "Hose No.", lblNozzle: "Nozzle No.", lblCab: "Cabinet No.", lblExt: "Tank No.", lblHyd: "Point No.", lblPPE: "Suit No.", lblOrder: "Item No.",
        lblQty: "Quantity: 1"
    }
};

window.onload = function() {
    const urlParams = new URLSearchParams(window.location.search);
    if(urlParams.has('unit')) {
        currentCategoryFilter = decodeURIComponent(urlParams.get('unit'));
    }

    checkParentTheme();
    injectUI();
    fetchFireEquipment();
    fetchInspectionHistory(); 
    fetchRefillHistory(); // 🌟 สั่งดึงประวัติการเติมสารเคมีล่วงหน้า
    applyLanguageUI(); 
};

// 🌟 ดึงข้อมูลประวัติตรวจสภาพ
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
                        inspector: row.c[1] ? String(row.c[1].v).trim() : "-", 
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

// 🌟 ดึงข้อมูลประวัติการเติมสารเคมีจาก Google Sheet
function fetchRefillHistory() {
    const refillUrl = "https://docs.google.com/spreadsheets/d/1lYRhXtLgec6ISM6Ugt-YKLrh47NRt7ihcVLcD8mI_Yg/gviz/tq?tqx=out:json&gid=680269898";
    fetch(refillUrl)
        .then(res => res.text())
        .then(text => {
            const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S\w]+)\);/);
            if (match && match[1]) {
                const json = JSON.parse(match[1]);
                globalRefillHistory = json.table.rows.map(row => {
                    if (!row || !row.c) return null;
                    let rawDateVal = row.c[4] ? (row.c[4].f || row.c[4].v) : "-";
                    let displayDate = rawDateVal;
                    
                    if (typeof rawDateVal === 'string' && rawDateVal.startsWith('Date(')) {
                        let p = rawDateVal.match(/\d+/g);
                        let dObj = new Date(p[0], p[1], p[2]);
                        let yearTH = dObj.getFullYear() < 2500 ? dObj.getFullYear() + 543 : dObj.getFullYear();
                        displayDate = `${String(dObj.getDate()).padStart(2,'0')}/${String(dObj.getMonth()+1).padStart(2,'0')}/${yearTH}`;
                    } else if (rawDateVal !== "-") {
                        let parts = String(rawDateVal).split(/[-/ ]/);
                        if(parts.length >= 3) displayDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
                    }

                    return {
                        plate: row.c[2] ? String(row.c[2].v).trim() : "-",
                        equipId: row.c[3] ? String(row.c[3].v).trim() : "-",
                        date: displayDate,
                        weightBefore: row.c[5] ? String(row.c[5].v) : "-",
                        weightAfter: row.c[6] ? String(row.c[6].v) : "-",
                        chemical: row.c[7] ? String(row.c[7].v) : "-",
                        company: row.c[8] ? String(row.c[8].v) : "-"
                    };
                }).filter(item => item !== null);
            }
        })
        .catch(err => console.error("Refill Fetch Error:", err));
}

function injectUI() {
    const pDoc = window.parent.document;
    if (!pDoc) return;

    // 🌟 จัดการเฉพาะช่องค้นหาบน Header เท่านั้น ลบคำสั่งก้าวก่ายเมนูด้านซ้ายทิ้งทั้งหมด
    const headerSlot = pDoc.getElementById('headerFilterSlot');
    const headerTemplate = document.getElementById('fireFilterTemplate');
    if (headerSlot && headerTemplate) {
        headerSlot.innerHTML = headerTemplate.innerHTML;
        const searchInput = pDoc.getElementById('globalSearchInput');
        if (searchInput) searchInput.oninput = displayFireEquipment;
    }



    // 2. 🌟 ดึงเมนูย่อยไปยัดใส่ใน Sidebar (แบบปลอดภัย ไม่ทับปุ่มหลัก)
    const sidebarSlot = pDoc.getElementById('submenu-fire');
    const sidebarTemplate = document.getElementById('fireSidebarTemplate');
    if (sidebarSlot && sidebarTemplate) {
        // เช็คก่อนว่ามีข้อมูลถูกยัดไปหรือยัง ถ้ายังให้ยัดไส้เข้าไป
        if (sidebarSlot.innerHTML.trim() === '') {
            sidebarSlot.innerHTML = sidebarTemplate.innerHTML;
        }

        sidebarSlot.querySelectorAll('.submenu a').forEach(a => {
            a.onclick = function(e) {
                e.preventDefault(); 
                let unit = this.getAttribute('data-unit');
                let thTitle = this.getAttribute('data-th-title');
                let enTitle = this.getAttribute('data-en-title');
                
                const titleEl = pDoc.querySelector('.page-title');
                if(titleEl) titleEl.innerText = currentLang === 'en' ? enTitle : thTitle;

                sidebarSlot.querySelectorAll('li a').forEach(link => link.classList.remove('active'));
                this.classList.add('active');
                const mainA = sidebarSlot.querySelector('a');
                if(mainA) mainA.classList.add('active');

                setFireCategory(unit);
            };
        });

        let checkUnit = currentCategoryFilter;
        let found = false;
        sidebarSlot.querySelectorAll('.submenu a').forEach(a => {
            if (a.getAttribute('data-unit') === checkUnit) {
                a.classList.add('active');
                found = true;
                const titleEl = pDoc.querySelector('.page-title');
                if(titleEl) titleEl.innerText = currentLang === 'en' ? a.getAttribute('data-en-title') : a.getAttribute('data-th-title');
            }
        });
        if(!found) {
            let allBtn = sidebarSlot.querySelector('[data-unit="all"]');
            if(allBtn) allBtn.classList.add('active');
        }
        
        const mainA = sidebarSlot.querySelector('a');
        if(mainA) mainA.classList.add('active');
        translateSidebar(pDoc);
    }
}

window.setFireCategory = function(cat) {
    currentCategoryFilter = cat;
    displayFireEquipment();
};

function translateSidebar(pDoc) {
    if(!pDoc) return;
    const isEn = currentLang === 'en';
    pDoc.querySelectorAll('#fire-menu-slot .menu-text').forEach(span => {
        let text = isEn ? span.getAttribute('data-en') : span.getAttribute('data-th');
        if(text) span.innerText = text;
    });
}

function getFireExtinguisherClasses(modelName) {
    let classes = [];
    let name = (modelName || '').toLowerCase();
    if (name.includes('impact') || name.includes('fast')) classes = ['A', 'B', 'C', 'K'];
    else if (name.includes('fireade') || name.includes('ade')) classes = ['A', 'B', 'C', 'D', 'K'];
    else if (name.includes('เคมีแห้ง') || name.includes('dry')) classes = ['A', 'B', 'C'];
    else if (name.includes('co2') || name.includes('คาร์บอน')) classes = ['B', 'C'];
    else if (name.includes('เหลวระเหย') || name.includes('สูตรน้ำ')) classes = ['A', 'B', 'C', 'D', 'K']; 
    else if (name.includes('โฟม') || name.includes('foam')) classes = ['A', 'B'];
    else if (name.includes('น้ำ') && !name.includes('ยา')) classes = ['A'];
    return classes;
}

function getInlineFireClassesHTML(typeStr) {
    let classes = getFireExtinguisherClasses(typeStr);
    if(classes.length === 0) return '';
    
    let html = '';
    classes.forEach(c => {
        let bg = '';
        if(c==='A') bg = '#059669';
        else if(c==='B') bg = '#ef4444';
        else if(c==='C') bg = '#3b82f6';
        else if(c==='K') bg = '#334155';
        else if(c==='D') bg = '#f59e0b';
        
        html += `<span class="fire-class-badge class-${c.toLowerCase()}" style="background-color: ${bg}; width: 28px; height: 28px; margin-right: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.15); display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; color: white; font-weight: bold; font-family: Arial, sans-serif; font-size: 14px;">${c}</span>`;
    });
    return html;
}

function fetchFireEquipment() {
    const loadingEl = document.getElementById('assetLoading');
    if(loadingEl) {
        loadingEl.style.display = 'block';
        loadingEl.innerText = fireTranslations[currentLang].loading;
    }
    
    fetch(scriptURL + "?t=" + new Date().getTime())
        .then(res => res.json())
        .then(data => {
            const fireKeywords = ['ดับเพลิง', 'ถัง', 'co2', 'เคมี', 'สายส่ง', 'หัวฉีด', 'ปั๊ม', 'ตู้', 'หัวรับ', 'ppe', 'ชุด'];
            allFireEquip = data.filter(item => {
                if (item.Data_Category !== 'Asset') return false;
                let typeStr = String(item['ยี่ห้อ/รุ่น'] || item['ชนิด'] || '').toLowerCase();
                return fireKeywords.some(kw => typeStr.includes(kw));
            });
            
            if(loadingEl) loadingEl.style.display = 'none';
            displayFireEquipment();
        })
        .catch(err => {
            console.error(err);
            if(loadingEl) loadingEl.innerHTML = `<span style="color:red;">${fireTranslations[currentLang].error}</span>`;
        });
}

function displayFireEquipment() {
    const gallery = document.getElementById('fireGallery');
    if(!gallery) return;
    const t = fireTranslations[currentLang];
    
    Array.from(gallery.children).forEach(child => {
        if (child.id !== 'assetLoading') child.remove();
    });

    const pDoc = window.parent.document;
    let searchInput = pDoc ? pDoc.getElementById('globalSearchInput') : document.getElementById('globalSearchInput');
    let keyword = searchInput ? searchInput.value.toLowerCase().trim() : '';

    let filtered = allFireEquip;

    if (currentCategoryFilter && currentCategoryFilter !== 'all') {
        filtered = filtered.filter(v => {
            let type = String(v['ยี่ห้อ/รุ่น'] || v['ชนิด'] || '').toLowerCase();
            if (currentCategoryFilter.includes('ถัง')) return type.includes('ถัง') || type.includes('co2') || type.includes('เคมี') || type.includes('ผง');
            if (currentCategoryFilter.includes('สายส่ง')) return type.includes('สาย');
            if (currentCategoryFilter.includes('หัวฉีด')) return type.includes('หัวฉีด');
            if (currentCategoryFilter.includes('ปั๊ม')) return type.includes('ปั๊ม');
            if (currentCategoryFilter.includes('ตู้')) return type.includes('ตู้');
            if (currentCategoryFilter.includes('หัวรับ')) return type.includes('หัวรับ');
            if (currentCategoryFilter.includes('ppe') || currentCategoryFilter.includes('ชุด')) return type.includes('ppe') || type.includes('ชุด');
            return false;
        });
    }

    if (keyword !== '') {
        filtered = filtered.filter(v => {
            let type = String(v['ยี่ห้อ/รุ่น'] || v['ชนิด'] || '').toLowerCase();
            let location = String(v['สี'] || v['สถานที่ติดตั้ง'] || '').toLowerCase();
            let plate = String(v['ทะเบียน'] || v['เลขที่ถัง'] || '').toLowerCase();
            return type.includes(keyword) || location.includes(keyword) || plate.includes(keyword);
        });
    }

    if (filtered.length === 0) {
        // 🌟 เช็คว่าถ้าไอคอน "กำลังโหลด..." ยังแสดงอยู่ ให้หยุดการทำงานและไม่ต้องโชว์คำว่าไม่พบข้อมูล
        const loadingEl = document.getElementById('assetLoading');
        if (loadingEl && loadingEl.style.display !== 'none') {
            return; 
        }
        
        gallery.insertAdjacentHTML('beforeend', `<div class="loading-text" style="grid-column: 1/-1;">${t.noData}</div>`);
        return;
    }

    const fragment = document.createDocumentFragment();
    filtered.forEach((v) => {
        const card = document.createElement('div');
        card.className = 'vehicle-card';
        card.style.cursor = 'pointer';

        let type = v['ยี่ห้อ/รุ่น'] || v['ชนิด'] || '-';
        let location = v['สี'] || v['สถานที่ติดตั้ง'] || '-';
        let plate = v['ทะเบียน'] || v['เลขที่ถัง'] || '-';
        
        let isRepair = v.RequiresRepair === true || String(v.RequiresRepair).toLowerCase() === 'true';
        let statusText = isRepair ? t.statusRepair : t.statusNormal;
        let statusBg = isRepair ? '#e74c3c' : '#27ae60';

        let images = [];
        for(let i=1; i<=5; i++) {
            let url = v[`URL_รูปภาพ_${i}`] || v[`URL_รูปภาพ${i}`] || v[`รูปภาพที่ ${i}`];
            if (url && url !== '-' && url.trim() !== '') images.push(url.trim());
        }

        let imgHtml = '';
        if (images.length > 0) {
            images.forEach(imgUrl => {
                let match = imgUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/) || imgUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
                let thumb = match ? `https://drive.google.com/thumbnail?id=${match[1]}&sz=w320` : imgUrl;
                imgHtml += `<img src="${thumb}" loading="lazy" onerror="this.src='placeholder.png'">`;
            });
        } else {
            let iconClass = "fa-fire-extinguisher";
            if(type.includes('สาย')) iconClass = "fa-hose";
            else if(type.includes('ชุด') || type.includes('ppe')) iconClass = "fa-user-shield";
            imgHtml = `<div style="height: 100%; width: 100%; display:flex; align-items:center; justify-content:center; color:#cbd5e1;"><i class="fa-solid ${iconClass}" style="font-size:50px;"></i></div>`;
        }

        let plateDisplay = '';
        if (plate && plate !== '-') {
            let sameModelCount = allFireEquip.filter(eq => eq['ยี่ห้อ/รุ่น'] === v['ยี่ห้อ/รุ่น']).length;
            if (type.includes('สาย')) plateDisplay = `${t.lblHose} ${plate}`;
            else if (type.includes('หัวฉีด')) plateDisplay = sameModelCount === 1 ? t.lblQty : `${t.lblNozzle} ${plate}`;
            else if (type.includes('ตู้')) plateDisplay = sameModelCount === 1 ? t.lblQty : `${t.lblCab} ${plate}`;
            else if (type.includes('ถัง') || type.includes('co2')) plateDisplay = `${t.lblExt} ${plate}`;
            else if (type.includes('หัวรับน้ำ')) plateDisplay = `${t.lblHyd} ${plate}`;
            else if (type.includes('ppe') || type.includes('ชุด')) plateDisplay = `${t.lblPPE} ${plate}`;
            else plateDisplay = `${t.lblOrder} ${plate}`;
        }

        let sizeHtml = (v['ขนาด'] && v['ขนาด'] !== '-') 
            ? `<div style="font-size: 14px; color: #2980b9; margin-bottom: 5px; font-weight: 500; text-align: center; width: 100%;">${t.lblSize} ${v['ขนาด']}</div>` : '';

        let fireClassHtml = '';
        if (type.includes('ถัง') || type.includes('co2') || type.includes('เคมี')) {
            let badgesHtml = getInlineFireClassesHTML(type);
            if (badgesHtml) {
                fireClassHtml = `<div style="display: flex; align-items: center; margin-top: 5px; justify-content: center; width: 100%;">${badgesHtml}</div>`;
            }
        }

        card.innerHTML = `
            <div class="card-image-wrapper" style="position: relative; height: 240px; overflow: hidden; background-color: #f8fafc; border-bottom: 1px solid #f1f5f9;">
                <span style="position: absolute; top: 10px; right: 10px; background: ${statusBg}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 13px; font-weight: bold; z-index: 10; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">${statusText}</span>
                <div class="image-slide-track" style="display: flex; height: 100%; width: 100%;">
                    ${imgHtml}
                </div>
            </div>
            <div class="card-content" style="padding: 20px; align-items: center; text-align: center; display: flex; flex-direction: column; width: 100%;">
                ${plateDisplay ? `<div class="card-plate" style="text-align: center; width: 100%; margin-bottom: 6px; font-size: 16px; font-weight: 500; color: #d35400;">${plateDisplay}</div>` : ''}
                <h3 class="card-title" style="text-align: center; width: 100%; margin-bottom: 8px; font-size: 20px; color: #1e293b; font-weight: 600;">${type}</h3>
                ${sizeHtml}
                ${fireClassHtml}
            </div>
        `;

        if (images.length > 1) {
            card.addEventListener('mouseenter', function() {
                let track = this.querySelector('.image-slide-track');
                let idx = 0;
                this.slideInterval = setInterval(() => {
                    idx = (idx + 1) % images.length;
                    track.style.transform = `translateX(-${idx * 100}%)`;
                }, 1200); 
            });
            card.addEventListener('mouseleave', function() {
                if (this.slideInterval) clearInterval(this.slideInterval);
                let track = this.querySelector('.image-slide-track');
                if (track) { track.style.transform = `translateX(0)`; }
            });
        }

        card.onclick = () => openModal(v, images, type, plateDisplay);
        fragment.appendChild(card);
    });
    gallery.appendChild(fragment);
}

// ==========================================
// 🌟 ฟังก์ชันจัดการ Popup หลัก
// ==========================================
function updateModalImage() {
    const modalImage = document.getElementById('modalImage');
    const imageNumber = document.getElementById('imageNumber');
    const prevBtn = document.getElementById('prevImageBtn');
    const nextBtn = document.getElementById('nextImageBtn');

    if(currentImages.length > 0 && currentImages[currentImgIndex]) {
        let url = currentImages[currentImgIndex];
        let match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/) || url.match(/\/d\/([a-zA-Z0-9_-]+)/);
        let highRes = match ? `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000` : url;
        modalImage.src = highRes;
        modalImage.style.display = 'block';
    } else {
        modalImage.src = 'placeholder.png';
    }

    if(imageNumber) {
        imageNumber.innerText = currentImages.length > 1 ? `รูปที่ ${currentImgIndex + 1}/${currentImages.length}` : "";
    }
    if(prevBtn) prevBtn.style.display = currentImages.length > 1 ? "flex" : "none";
    if(nextBtn) nextBtn.style.display = currentImages.length > 1 ? "flex" : "none";
}

window.prevImage = function() {
    if(currentImages.length <= 1) return;
    currentImgIndex = (currentImgIndex > 0) ? currentImgIndex - 1 : currentImages.length - 1;
    updateModalImage();
};

window.nextImage = function() {
    if(currentImages.length <= 1) return;
    currentImgIndex = (currentImgIndex < currentImages.length - 1) ? currentImgIndex + 1 : 0;
    updateModalImage();
};

function openModal(data, images, typeString, plateDisplay) {
    const modal = document.getElementById('vehicleModal');
    const modalBody = document.getElementById('modalDetails');
    const t = fireTranslations[currentLang];
    
    currentImages = images;
    currentImgIndex = 0;
    updateModalImage();
    
    let type = data['ยี่ห้อ/รุ่น'] || data['ชนิด'] || '-';
    let location = data['สี'] || data['สถานที่ติดตั้ง'] || '-';
    let plate = data['ทะเบียน'] || data['เลขที่ถัง'] || '-';

    let isExtinguisher = typeString.includes('ถัง') || typeString.includes('co2') || typeString.includes('เคมี') || typeString.includes('dry');
    
    let detailText = `<div class="info-content"><h2>${type}</h2>`;
    
    if (isExtinguisher) {
        let badgesHtml = getInlineFireClassesHTML(type);
        if (badgesHtml) {
            detailText += `<div style="display: flex; align-items: center; margin-bottom: 10px;"><strong>${t.fireClassTitle}</strong> <div style="margin-left: 10px; display: flex;">${badgesHtml}</div></div>`;
        }
    }

    detailText += `<p><strong>ประเภท:</strong> ${data.ประเภท || 'อุปกรณ์ดับเพลิง'}</p>`;
    detailText += data['ขนาด'] && data['ขนาด'] !== '-' ? `<p><strong>${t.lblSize}</strong> ${data['ขนาด']}</p>` : '';
    detailText += `<p><strong>${t.location}:</strong> ${location}</p>`;
    
    let plateLabel = isExtinguisher ? t.lblExt : t.lblOrder;
    detailText += `<p><strong>${plateLabel}</strong> ${plate}</p>`;
    detailText += `<p><strong>หมายเลขครุภัณฑ์:</strong> ${data['หมายเลขครุภัณฑ์'] || '-'}</p>`;
    detailText += data['ปีที่ซื้อ'] && data['ปีที่ซื้อ'] !== '-' ? `<p><strong>ปีที่ซื้อ:</strong> ${data['ปีที่ซื้อ']}</p>` : '';
    detailText += data['บริษัทที่ซื้อ'] && data['บริษัทที่ซื้อ'] !== '-' ? `<p><strong>ซื้อจากบริษัท:</strong> ${data['บริษัทที่ซื้อ']}</p>` : '';
    detailText += `</div>`;

    let currentIndex = allFireEquip.indexOf(data);
    let autoFillURL = `form.html?type=อุปกรณ์ดับเพลิง&detail=${encodeURIComponent(type)}&color=${encodeURIComponent(location)}&plate=${encodeURIComponent(plate)}&equip=${encodeURIComponent(data['หมายเลขครุภัณฑ์'] || '')}`;
    let refillURL = `page_refill_form.html?detail=${encodeURIComponent(type)}&plate=${encodeURIComponent(plate)}&equip=${encodeURIComponent(data['หมายเลขครุภัณฑ์'] || '')}`;

    let actionButtonsHtml = `<div class="action-buttons">`;
    actionButtonsHtml += `<a href="${autoFillURL}" class="action-btn" style="background-color: #059669; color: white; text-decoration: none;">ตรวจสอบ<br>สภาพ</a>`;
    actionButtonsHtml += `<button onclick="openInspectionHistoryModal(${currentIndex})" class="action-btn" style="background-color: #3b82f6; color: white;">ประวัติการ<br>ตรวจสภาพ</button>`;
    
    if(isExtinguisher) {
        actionButtonsHtml += `<a href="${refillURL}" class="action-btn" style="background-color: #10b981; color: white; text-decoration: none;">บันทึก<br>การเติมสารเคมี</a>`;
        
        // 🌟 เปลี่ยนปุ่มดูประวัติให้เรียกใช้ฟังก์ชันใหม่ที่สร้างขึ้น
        actionButtonsHtml += `<button onclick="openRefillHistoryModal(${currentIndex})" class="action-btn" style="background-color: #f59e0b; color: white;">ประวัติการ<br>เติมสารเคมี</button>`;
    }
    actionButtonsHtml += `</div>`;
    
    modalBody.innerHTML = detailText + actionButtonsHtml;
    modal.style.display = 'block';
}

// ==========================================
// 🌟 ตารางประวัติการตรวจสภาพ (ลอยเพียวๆ)
// ==========================================
window.openInspectionHistoryModal = function(index) {
    const vehicle = allFireEquip[index];
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

    const tableContainer = modal.querySelector('.table-scroll-container');
    if (tableContainer) {
        tableContainer.style.background = '#ffffff';
        tableContainer.style.boxShadow = '0 15px 40px rgba(0,0,0,0.4)';
        tableContainer.style.borderRadius = '12px';
    }

    modal.style.overflowY = 'auto';
    modal.style.paddingTop = '15px'; 
    modal.style.paddingBottom = '40px';

    const items = ["สภาพตัวถัง", "แรงดันเกจ์", "สาย/หัวฉีด", "สลัก/ซีล", "คันบีบ", "ป้ายแนะนำ", "ตำแหน่งติดตั้ง", "ฐาน/ที่แขวน", "อายุใช้งาน"];

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

    let vPlate = vehicle['ทะเบียน'] || vehicle['เลขที่ถัง'] ? String(vehicle['ทะเบียน'] || vehicle['เลขที่ถัง']).trim() : "-";
    let vEquip = vehicle['หมายเลขครุภัณฑ์'] ? String(vehicle['หมายเลขครุภัณฑ์']).trim() : "-";
    let vDetail = vehicle['ยี่ห้อ/รุ่น'] || vehicle['ชนิด'] ? String(vehicle['ยี่ห้อ/รุ่น'] || vehicle['ชนิด']).trim() : "-";
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
            for(let i = 0; i < 11; i++) {
                bodyHtml += `<td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; color:#94a3b8;">-</td>`;
            }
            bodyHtml += `</tr>`;
        }
    });

    document.getElementById('inspectionChecklistBody').innerHTML = bodyHtml;
    document.getElementById('vehicleModal').style.display = 'none';
    modal.style.display = 'flex';

    if (window.parent && window.parent.document.body) {
        window.parent.document.querySelectorAll('.sidebar, #sidebar, .main-sidebar, .sidebar-menu').forEach(el => el.style.pointerEvents = 'none');
    }
};

// ==========================================
// 🌟 ตารางประวัติการเติมสารเคมี (ลอยเพียวๆ)
// ==========================================
window.openRefillHistoryModal = function(index) {
    const vehicle = allFireEquip[index];
    const modal = document.getElementById('refillHistoryModal');
    
    // ตั้งค่ากล่องให้ลอยเพียวๆ แบบเดียวกับประวัติตรวจสภาพ
    const modalContent = document.getElementById('refillModalContent');
    if (modalContent) {
        modalContent.style.maxWidth = '1000px'; 
        modalContent.style.width = '95%';       
        modalContent.style.padding = '0'; 
        modalContent.style.height = 'auto';      
        modalContent.style.maxHeight = 'none';   
        modalContent.style.overflow = 'hidden';  
        modalContent.style.background = 'transparent';
        modalContent.style.boxShadow = 'none';
        modalContent.style.border = 'none';
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

    let vPlate = vehicle['ทะเบียน'] || vehicle['เลขที่ถัง'] ? String(vehicle['ทะเบียน'] || vehicle['เลขที่ถัง']).trim() : "-";
    let vEquip = vehicle['หมายเลขครุภัณฑ์'] ? String(vehicle['หมายเลขครุภัณฑ์']).trim() : "-";

    // คัดกรองเอาเฉพาะประวัติที่ตรงกับรหัสถังนี้
    let records = globalRefillHistory.filter(r => {
        let matchEquip = (vEquip !== "-" && vEquip !== "" && r.equipId === vEquip);
        let matchPlate = (vPlate !== "-" && vPlate !== "" && r.plate === vPlate);
        return matchEquip || matchPlate;
    });

    let bodyHtml = '';
    if (records.length > 0) {
        // ให้ข้อมูลล่าสุดขึ้นก่อน
        records.reverse().forEach(r => {
            bodyHtml += `<tr>
                <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; background-color: #f8fafc;">${r.date}</td>
                <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: center; color: #d35400; font-weight: bold;">${r.chemical}</td>
                <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: center;">${r.weightBefore}</td>
                <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: center; color: #10b981; font-weight: bold;">${r.weightAfter}</td>
                <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: center; color: #334155;">${r.company}</td>
            </tr>`;
        });
    } else {
        bodyHtml = `<tr><td colspan="5" style="padding: 20px; text-align: center; color: #ef4444; font-weight: bold; font-size: 16px;">❌ ยังไม่มีประวัติการเติมสารเคมีของถังนี้</td></tr>`;
    }

    document.getElementById('refillHistoryBody').innerHTML = bodyHtml;
    
    // ปิดป๊อปอัปอันเก่า เปิดอันใหม่
    document.getElementById('vehicleModal').style.display = 'none';
    modal.style.display = 'flex';

    if (window.parent && window.parent.document.body) {
        window.parent.document.querySelectorAll('.sidebar, #sidebar, .main-sidebar, .sidebar-menu').forEach(el => el.style.pointerEvents = 'none');
    }
};

// ==========================================
// 🌟 ปิด Modal & การคลิกข้างนอก
// ==========================================
window.closeModal = function() { document.getElementById('vehicleModal').style.display = 'none'; }
window.closeRefillModal = function() {
    document.getElementById('refillHistoryModal').style.display = 'none';
    if (window.parent && window.parent.document.body) {
        window.parent.document.querySelectorAll('.sidebar, #sidebar, .main-sidebar, .sidebar-menu').forEach(el => el.style.pointerEvents = 'auto');
    }
}

window.onclick = function(event) {
    const modal1 = document.getElementById('vehicleModal');
    const modal2 = document.getElementById('inspectionHistoryModal');
    const modal3 = document.getElementById('refillHistoryModal');
    
    if (event.target == modal1) modal1.style.display = "none";
    if (event.target == modal2) {
        modal2.style.display = "none";
        if (window.parent && window.parent.document.body) {
            window.parent.document.querySelectorAll('.sidebar, #sidebar, .main-sidebar, .sidebar-menu').forEach(el => el.style.pointerEvents = 'auto');
        }
    }
    if (event.target == modal3) {
        modal3.style.display = "none";
        if (window.parent && window.parent.document.body) {
            window.parent.document.querySelectorAll('.sidebar, #sidebar, .main-sidebar, .sidebar-menu').forEach(el => el.style.pointerEvents = 'auto');
        }
    }
}

// 🌟 ระบบ Theme & Language 🌟
function checkParentTheme() {
    if (window.parent && window.parent.document.body.classList.contains('dark-mode')) document.body.classList.add('dark-mode');
    else if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-mode');
}
window.checkGlobalTheme = function() {
    if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-mode');
    else document.body.classList.remove('dark-mode');
};

window.applyLanguageUI = function() {
    currentLang = localStorage.getItem('appLang') || localStorage.getItem('lang') || 'th';
    const t = fireTranslations[currentLang];

    const pDoc = window.parent.document;
    const searchInput = pDoc ? pDoc.getElementById('globalSearchInput') : document.getElementById('globalSearchInput');
    if (searchInput) searchInput.placeholder = t.searchPlaceholder;

    const loadingEl = document.getElementById('assetLoading');
    if (loadingEl && loadingEl.style.display !== 'none') loadingEl.innerText = t.loading;

    translateSidebar(pDoc);
    if (allFireEquip.length > 0) displayFireEquipment();
};
// ==================================================
// ระบบดึงเมนูย่อยจากไฟล์ลูก (ช่วยให้หน้า main.html ไม่รก)
// ==================================================
document.addEventListener('DOMContentLoaded', () => {
    
    // สร้างฟังก์ชันดึงเมนูอเนกประสงค์ (เผื่ออนาคตคุณแพรวใช้กับหน้าอื่นๆ ได้ด้วย)
    function fetchSubmenu(sourcePage, templateId, targetUlId) {
        fetch(sourcePage)
            .then(response => response.text())
            .then(html => {
                // แปลงข้อความที่ดึงมาให้เป็น HTML
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                
                // หาไส้ในของเมนู แล้วเอามาเสียบในหน้าหลัก
                const template = doc.getElementById(templateId);
                const targetSlot = document.getElementById(targetUlId);
                
                if (template && targetSlot) {
                    targetSlot.innerHTML = template.innerHTML;
                }
            })
            .catch(err => console.error(`ไม่สามารถดึงเมนูจาก ${sourcePage} ได้:`, err));
    }

    // สั่งดูดเมนูอุปกรณ์ดับเพลิงทันทีที่เปิดเว็บ
    fetchSubmenu('page_fire.html', 'fireSidebarTemplate', 'submenu-fire');
    
    // ** ถ้าอนาคตมีหน้ายานพาหนะ หรือหน้าอื่นๆ ก็ก๊อปปี้บรรทัดบนมาแก้ชื่อไฟล์ได้เลยครับ โค้ดจะคลีนมาก! **
});
// ==========================================
// 🌟 ระบบ Instant Filter (กดเมนูแล้วเปลี่ยนการ์ดทันที ไม่ต้องโหลดชีทใหม่)
// ==========================================
window.applyInstantFilter = function(unit) {
    currentCategoryFilter = unit; // อัปเดตตัวแปรหมวดหมู่
    
    // เคลียร์คำค้นหาที่อาจจะค้างอยู่บน Header ออก
    const pDoc = window.parent.document;
    const searchInput = pDoc ? pDoc.getElementById('globalSearchInput') : document.getElementById('globalSearchInput');
    if (searchInput) {
        searchInput.value = '';
    }

    // สั่งให้วาดการ์ดใหม่ทันทีด้วยข้อมูลที่โหลดเก็บไว้แล้ว
    displayFireEquipment(); 
    
    // เปลี่ยน URL ใน Iframe แบบเงียบๆ (เผื่อกดรีเฟรชเบราว์เซอร์ จะได้อยู่หน้าเดิม)
    const newUrl = window.location.pathname + "?unit=" + encodeURIComponent(unit);
    window.history.replaceState(null, "", newUrl);
};