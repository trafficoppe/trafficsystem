/* ==========================================
   FIRE EQUIPMENT JAVASCRIPT (page_fire_script.js)
   ========================================== */

const scriptURL = "https://script.google.com/macros/s/AKfycbzWc03wzCkfUHs3pIucqNs_tz7BguxUlODGOihfiMgHgkQFx5Kc1DRlITg_SDR9lu4/exec";

let allFireEquip = []; 
let currentLang = localStorage.getItem('appLang') || localStorage.getItem('lang') || 'th';
let currentCategoryFilter = 'all'; 

// ตัวแปรสำหรับสไลด์รูปในหน้าต่าง Popup
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
    applyLanguageUI(); 
};

function injectUI() {
    const pDoc = window.parent.document;
    if (!pDoc) return;

    // ส่งกล่องค้นหา
    const headerSlot = pDoc.getElementById('headerFilterSlot');
    const headerTemplate = document.getElementById('fireFilterTemplate');
    if (headerSlot && headerTemplate) {
        headerSlot.innerHTML = headerTemplate.innerHTML;
        const searchInput = pDoc.getElementById('globalSearchInput');
        if (searchInput) searchInput.oninput = displayFireEquipment;
    }

    // ส่งเมนูด้านซ้าย
    const sidebarSlot = pDoc.getElementById('fire-menu-slot');
    const sidebarTemplate = document.getElementById('fireSidebarTemplate');
    
    if (sidebarSlot && sidebarTemplate) {
        if (!sidebarSlot.hasAttribute('data-injected')) {
            sidebarSlot.innerHTML = sidebarTemplate.innerHTML;
            sidebarSlot.setAttribute('data-injected', 'true');
        }

        // ดักจับการคลิกที่เมนู เพื่อกรองข้อมูลทันที
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

        // จัดการสถานะ Active ตอนเปิดหน้าครั้งแรก
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

// ฟังก์ชันรับคำสั่งกรอง
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

// ฟังก์ชันสร้าง UI วงกลม (แบบ Original) 
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

    // กรองตาม Sidebar
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

        // วาดวงกลมประเภทไฟดับเพลิง บน Card
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
// 🌟 ฟังก์ชันจัดการ Popup (Modal)
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
    
    // 🌟 ระบบสไลด์รูปใน Modal
    currentImages = images;
    currentImgIndex = 0;
    updateModalImage();
    
    let type = data['ยี่ห้อ/รุ่น'] || data['ชนิด'] || '-';
    let location = data['สี'] || data['สถานที่ติดตั้ง'] || '-';
    let plate = data['ทะเบียน'] || data['เลขที่ถัง'] || '-';

    let isExtinguisher = typeString.includes('ถัง') || typeString.includes('co2') || typeString.includes('เคมี') || typeString.includes('dry');
    
    // 🌟 วาด Layout ข้อความด้านขวาแบบ Original 100% 🌟
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

    // 🌟 ค้นหา Index ในหน้าแม่เพื่อสั่งให้ปุ่มทำงาน 🌟
    let parentIndex = -1;
    if(window.parent && window.parent.allVehicles) {
        parentIndex = window.parent.allVehicles.findIndex(v => v['ทะเบียน'] === data['ทะเบียน'] && v['หมายเลขครุภัณฑ์'] === data['หมายเลขครุภัณฑ์'] && v['ยี่ห้อ/รุ่น'] === data['ยี่ห้อ/รุ่น']);
    }
    let autoFillURL = `form.html?type=อุปกรณ์ดับเพลิง&detail=${encodeURIComponent(type)}&color=${encodeURIComponent(location)}&plate=${encodeURIComponent(plate)}&equip=${encodeURIComponent(data['หมายเลขครุภัณฑ์'] || '')}`;

    // 🌟 วาดปุ่ม 4 ปุ่มด้านล่างสุด 🌟
    let actionButtonsHtml = `<div class="action-buttons">`;
    actionButtonsHtml += `<a href="${autoFillURL}" target="_blank" class="action-btn" style="background-color: #059669; color: white;">ตรวจสอบ<br>สภาพ</a>`;
    actionButtonsHtml += `<button onclick="window.parent.openInspectionHistoryModal(${parentIndex})" class="action-btn" style="background-color: #3b82f6; color: white;">ประวัติการ<br>ตรวจสภาพ</button>`;
    
    if(isExtinguisher) {
        actionButtonsHtml += `<button onclick="window.parent.openRefillFormModal(${parentIndex})" class="action-btn" style="background-color: #10b981; color: white;">บันทึก<br>การเติมสารเคมี</button>`;
        actionButtonsHtml += `<button onclick="window.parent.openRefillHistoryModal(${parentIndex})" class="action-btn" style="background-color: #f59e0b; color: white;">ประวัติการ<br>เติมสารเคมี</button>`;
    }
    actionButtonsHtml += `</div>`;
    
    modalBody.innerHTML = detailText + actionButtonsHtml;
    modal.style.display = 'block';
}

window.closeModal = function() { document.getElementById('vehicleModal').style.display = 'none'; }
window.onclick = function(event) {
    const modal = document.getElementById('vehicleModal');
    if (event.target == modal) modal.style.display = "none";
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