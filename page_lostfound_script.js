/* ==========================================
   LOST & FOUND JAVASCRIPT (page_lostfound_script.js)
   ========================================== */

const lfSheetUrlOld = "https://docs.google.com/spreadsheets/d/14MJgb81aVEjT2qVp6n9zNKCCpJNVimX1q0hiYkH0f5I/gviz/tq?tqx=out:json&gid=751456190";
const lfSheetUrlNew = "https://docs.google.com/spreadsheets/d/14MJgb81aVEjT2qVp6n9zNKCCpJNVimX1q0hiYkH0f5I/gviz/tq?tqx=out:json&gid=2074352966";

let allLostFound = []; 
let currentSubFilter = 'all';

// 🌟 ตั้งค่าเริ่มต้นให้เป็นเดือนปัจจุบันเสมอ (รูปแบบ YYYY-MM)
const dateNow = new Date();
let currentLFMonth = `${dateNow.getFullYear()}-${String(dateNow.getMonth() + 1).padStart(2, '0')}`;

// 🌟 ชุดคำแปลภาษาสำหรับหน้า Lost & Found
const lfTranslations = {
    th: {
        all: "ทั้งหมด", lost: "สิ่งของสูญหาย", found: "พบสิ่งของ", returned: "รับของคืน", returnedStatus: "รับของคืนแล้ว",
        pending: "รอดำเนินการ", notSpecified: "ไม่มีระบุ", noLocation: "ไม่ระบุสถานที่", noImage: "ไม่มีภาพประกอบ",
        loading: "⌛ กำลังเชื่อมต่อฐานข้อมูล L&F...", error: "❌ เกิดข้อผิดพลาดในการโหลดข้อมูลภายนอก",
        noData: "🔍 ไม่มีรายงานของหาย/เก็บของได้ ในเดือน", searchPlaceholder: "ค้นหาชื่อสิ่งของ, สถานที่...",
        btnLost: "แจ้งสูญหาย", btnFound: "เก็บของได้", btnReturned: "รับคืนแล้ว", modalPending: "ยังไม่ได้ดำเนินการ",
        months: ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
    },
    en: {
        all: "All", lost: "Lost Item", found: "Found Item", returned: "Returned", returnedStatus: "Returned to Owner",
        pending: "Pending", notSpecified: "Not Specified", noLocation: "No Location", noImage: "No Image Available",
        loading: "⌛ Connecting to L&F Database...", error: "❌ Error loading external data",
        noData: "🔍 No L&F reports found for", searchPlaceholder: "Search items, locations...",
        btnLost: "Lost", btnFound: "Found", btnReturned: "Returned", modalPending: "No action taken yet",
        months: ['January','February','March','April','May','June','July','August','September','October','November','December']
    }
};

let currentLang = localStorage.getItem('appLang') || localStorage.getItem('lang') || 'th';

window.onload = function() { 
    injectFiltersToHeader(); 
    fetchLostFound(); 
    checkParentTheme(); 
};

function injectFiltersToHeader() {
    const slot = window.parent.document.getElementById('headerFilterSlot');
    const template = document.getElementById('lfFilterTemplate');
    if (slot && template) {
        slot.innerHTML = template.innerHTML;
        bindFilterEvents();
        applyLanguageUI(); // สั่งแปลภาษาปุ่มบน Header ทันทีที่โหลด
    }
}

function bindFilterEvents() {
    const parentSearchInput = window.parent.document.getElementById('globalSearchInput');
    if (parentSearchInput) {
        parentSearchInput.oninput = applyFilters;
    }
    window.parent.document.querySelectorAll('#filter-group-lostfound .filter-btn').forEach(btn => {
        btn.onclick = function() {
            this.parentElement.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentSubFilter = this.getAttribute('data-filter');
            applyFilters();
        };
    });
}

function fetchLostFound() {
    const gallery = document.getElementById('vehicleGallery');
    gallery.innerHTML = `<p class="lf-loading-text">${lfTranslations[currentLang].loading}</p>`;

    Promise.all([
        fetch(lfSheetUrlOld).then(res => res.text()),
        fetch(lfSheetUrlNew).then(res => res.text())
    ])
    .then(([oldText, newText]) => {
        let dataOld = extractJsonFromGviz(oldText);
        let dataNew = extractJsonFromGviz(newText);
        
        let combinedRows = [];
        if(dataOld && dataOld.table && dataOld.table.rows) combinedRows = combinedRows.concat(parseLFRows(dataOld.table.rows, false));
        if(dataNew && dataNew.table && dataNew.table.rows) combinedRows = combinedRows.concat(parseLFRows(dataNew.table.rows, true));
        
        combinedRows.sort((a,b) => b.timestamp - a.timestamp);
        allLostFound = combinedRows;
        
        setupMonthFilter(); 
        updateFilterCounts();
        applyFilters();
    })
    .catch(err => {
        console.error("LF Fetch Error:", err);
        gallery.innerHTML = `<p class="lf-loading-text" style="color: #ef4444;">${lfTranslations[currentLang].error}</p>`;
    });
}

function extractJsonFromGviz(text) {
    try {
        const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S\w]+)\);/);
        if (match && match[1]) return JSON.parse(match[1]);
        const jsonString = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
        return JSON.parse(jsonString);
    } catch(e) { return null; }
}

function parseCustomDate(dateStr) {
    if (!dateStr) return null;
    let str = String(dateStr).trim();
    if (str.startsWith('Date(')) {
        let p = str.match(/\d+/g);
        if (p) return new Date(p[0], p[1], p[2], p[3]||0, p[4]||0, p[5]||0);
    }
    let parts = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (parts) {
        let day = parseInt(parts[1]);
        let month = parseInt(parts[2]) - 1; 
        let year = parseInt(parts[3]);
        if (year > 2500) year -= 543; 
        let hr = parseInt(parts[4] || 0);
        let min = parseInt(parts[5] || 0);
        return new Date(year, month, day, hr, min, 0);
    }
    let d = new Date(str);
    if (!isNaN(d)) return d;
    return null;
}

// 🌟 ฟังก์ชันแปลงวันที่ให้รองรับ 2 ภาษา (ไทย/อังกฤษ)
function getLocalizedDateString(rawDateStr) {
    if (!rawDateStr) return '-';
    let d = parseCustomDate(rawDateStr);
    if (!d || isNaN(d) || d.getTime() === 0) return rawDateStr; 

    const t = lfTranslations[currentLang];
    let day = d.getDate();
    let month = t.months[d.getMonth()];
    let year = d.getFullYear();
    
    if (currentLang === 'th' && year < 2500) year += 543; 

    let hr = String(d.getHours()).padStart(2, '0');
    let min = String(d.getMinutes()).padStart(2, '0');

    if (hr === '00' && min === '00' && !rawDateStr.includes(':')) {
        return `${day} ${month} ${year}`;
    }
    let timeText = currentLang === 'en' ? 'at' : 'เวลา';
    let timeSuffix = currentLang === 'en' ? '' : ' น.';
    return `${day} ${month} ${year} ${timeText} ${hr}:${min}${timeSuffix}`;
}

function parseLFRows(rows, isNew) {
    return rows.map(row => {
        if (!row || !row.c) return null;
        const getV = (i) => (row.c[i] && (row.c[i].f || row.c[i].v)) ? (row.c[i].f || row.c[i].v).toString().trim() : '';

        let timestampStr = getV(0);
        let timestampObj = parseCustomDate(timestampStr) || new Date(0);
        let timestamp = timestampObj.getTime();

        let filterMonth = '';
        if (timestampObj.getTime() > 0) {
            let y = timestampObj.getFullYear();
            let m = String(timestampObj.getMonth() + 1).padStart(2, '0');
            filterMonth = `${y}-${m}`;
        }

        let type = '', title = '', location = '', dateVal = '', imgUrl = '', status = '', actionText = '', isReturned = false;

        if (isNew) {
            let rawType = getV(2);
            if (rawType.includes('หาย')) type = 'สิ่งของสูญหาย';
            else if (rawType.includes('พบ') || rawType.includes('เก็บ')) type = 'พบสิ่งของ';
            else if (rawType.includes('คืน')) type = 'รับของคืน';
            else type = 'พบสิ่งของ'; 

            title = getV(9); location = getV(10);
            let rawDate = getV(7) ? `${getV(7)} ${getV(8)}`.trim() : timestampStr;
            dateVal = getLocalizedDateString(rawDate);
            imgUrl = getV(11); status = getV(12); actionText = getV(13);
            if (status.includes('คืน') || type === 'รับของคืน') isReturned = true;
        } else {
            let rawDate = getV(0) || getV(1); 
            dateVal = getLocalizedDateString(rawDate);
            
            let fullText = row.c.map(c => c ? (c.f || c.v || '') : '').join(' ');
            if (fullText.includes('รับของคืน') || fullText.includes('รับคืนแล้ว')) isReturned = true;

            let colG = getV(6); 
            if (colG.includes('สูญหาย') || colG.includes('หาย')) type = 'สิ่งของสูญหาย';
            else if (colG.includes('พบ') || colG.includes('เก็บ')) type = 'พบสิ่งของ';
            else if (colG.includes('คืน')) type = 'รับของคืน';
            if (!type) {
                if (isReturned) type = 'รับของคืน';
                else if (fullText.includes('สูญหาย') || fullText.includes('หาย')) type = 'สิ่งของสูญหาย';
                else if (fullText.includes('พบสิ่งของ') || fullText.includes('เก็บ')) type = 'พบสิ่งของ';
                else return null; 
            }

            for (let i = 3; i <= 19; i++) {
                let v = getV(i);
                if (v.includes('drive.google.com')) { imgUrl = v; break; }
            }
            let titleCandidates = [getV(7), getV(6), getV(5)].filter(v => v && !v.includes('drive.google.com') && !['สิ่งของสูญหาย','พบสิ่งของ','รับของคืน'].includes(v));
            title = titleCandidates.length > 0 ? titleCandidates[0] : '';
            let locCandidates = [getV(8), getV(9), getV(10)].filter(v => v && !v.includes('drive.google.com') && v !== title);
            location = locCandidates.length > 0 ? locCandidates[0] : '';
            actionText = getV(17); status = getV(18); 
        }

        if (imgUrl) {
            let matchId = imgUrl.split(',')[0].match(/id=([a-zA-Z0-9_-]+)/) || imgUrl.split(',')[0].match(/\/d\/([a-zA-Z0-9_-]+)/);
            if (matchId && matchId[1]) imgUrl = `https://drive.google.com/thumbnail?id=${matchId[1]}&sz=w320`;
        }
        return { type, title, location, dateVal, imgUrl, status, actionText, isReturned, timestamp, filterMonth };
    }).filter(item => item !== null);
}

function setupMonthFilter() {
    const monthInput = window.parent.document.getElementById('sub-filter-lf-month');
    if (!monthInput) return;
    monthInput.style.display = 'inline-block';
    monthInput.value = currentLFMonth;
    monthInput.onchange = function() {
        if (this.value) currentLFMonth = this.value;
        else {
            const d = new Date();
            currentLFMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            this.value = currentLFMonth;
        }
        updateFilterCounts(); 
        applyFilters();
    };
}

function updateFilterCounts() {
    if (allLostFound.length > 0) {
        let baseData = allLostFound.filter(v => v.filterMonth === currentLFMonth);
        const filterBtns = window.parent.document.querySelectorAll('#filter-group-lostfound .filter-btn');
        if (filterBtns.length > 0) {
            filterBtns.forEach(btn => {
                const f = btn.getAttribute('data-filter');
                const count = (f === 'all') ? baseData.length : baseData.filter(v => v.type === f).length;
                const badge = btn.querySelector('.badge');
                if (badge) badge.innerText = count;
            });
        }
    }
}

function applyFilters() {
    const searchInput = window.parent.document.getElementById('globalSearchInput');
    const searchText = searchInput ? searchInput.value.toLowerCase() : '';
    let filteredData = allLostFound.filter(v => v.filterMonth === currentLFMonth);
    
    if (currentSubFilter !== 'all') filteredData = filteredData.filter(v => v.type === currentSubFilter);
    if (searchText.trim() !== '') {
        filteredData = filteredData.filter(v => 
            (v.title && v.title.toLowerCase().includes(searchText)) || 
            (v.location && v.location.toLowerCase().includes(searchText))
        );
    }
    displayLostFoundGallery(filteredData);
}

function displayLostFoundGallery(dataToDisplay) {
    const gallery = document.getElementById('vehicleGallery');
    if(!gallery) return;
    gallery.innerHTML = ''; 
    gallery.className = 'gallery-grid'; 
    const t = lfTranslations[currentLang]; 

    if (dataToDisplay.length === 0) {
        let dArr = currentLFMonth.split('-');
        let year = parseInt(dArr[0]);
        if(currentLang === 'th') year += 543;
        gallery.innerHTML = `<p class="lf-loading-text" style="color: #64748b;">${t.noData} ${t.months[parseInt(dArr[1])-1]} ${year}</p>`;
        return;
    }

    const fragment = document.createDocumentFragment();
    dataToDisplay.forEach((item) => {
        const card = document.createElement('div'); card.className = 'vehicle-card';
        let borderColor = "#bdc3c7", bgColor = "#ffffff";
        
        let finalStatusText = item.status ? item.status.trim() : t.pending;
        if (finalStatusText.includes('รอดำเนินการ') || finalStatusText === 'Pending') finalStatusText = t.pending;
        else if (finalStatusText.includes("รับของคืนแล้ว") || finalStatusText.includes("รับคืนแล้ว") || finalStatusText.includes("Returned")) finalStatusText = t.returnedStatus;

        if (finalStatusText === t.returnedStatus) { borderColor = "#15803d"; bgColor = "#f0faf4"; } 
        else if (finalStatusText !== t.pending) { borderColor = "#d35400"; bgColor = "#fffdf5"; }

        card.style.border = `2px solid ${borderColor}`;
        card.style.backgroundColor = bgColor;
        card.style.cursor = 'pointer';

        let displayType = item.type;
        let badgeColor = "#95a5a6";
        if(item.type === 'สิ่งของสูญหาย') { displayType = t.lost; badgeColor = "#e74c3c"; }
        else if(item.type === 'พบสิ่งของ') { displayType = t.found; badgeColor = "#27ae60"; }
        else if(item.type === 'รับของคืน') { displayType = t.returned; }
        
        let imgHtml = item.imgUrl 
            ? `<img src="${item.imgUrl}" loading="lazy" style="width: 100%; height: 100%; object-fit: contain; border-bottom: 1px solid #eee;" onerror="this.src='placeholder.png';">` 
            : `<div style="height:100%; display:flex; align-items:center; justify-content:center; color:#64748b; font-size: 14px; border-bottom: 1px solid #eee;">${t.noImage}</div>`;

        card.innerHTML = `
            <div class="card-image-wrapper" style="position: relative; height: 260px; background-color: #f1f2f6;">
                <span style="position: absolute; top: 10px; right: 10px; background: ${badgeColor}; color: white; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; z-index: 10; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">${displayType}</span>
                ${imgHtml}
            </div>
            <div class="card-content" style="padding: 15px; color: #0f172a; text-align: left;">
                <div style="font-size: 15px; font-weight: 600; margin-bottom: 5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 100%;" title="${item.title || t.notSpecified}">${item.title || t.notSpecified}</div>
                <div style="font-size: 14px; margin-bottom: 5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 100%; color: #475569;">📍 ${item.location || t.noLocation}</div>
                <div style="font-size: 13px; margin-bottom: 10px; width: 100%; color: #64748b;">📅 ${item.dateVal || '-'}</div>
                <div style="border-top: 1px solid rgba(0,0,0,0.08); padding-top: 8px; font-weight: bold; font-size: 14px; color: ${borderColor};">${finalStatusText}</div>
            </div>`;
        card.onclick = () => window.openLFModal(item.actionText, item.imgUrl);
        fragment.appendChild(card);
    });
    gallery.appendChild(fragment);
}

window.openLFModal = function(actionText, imgUrl) {
    const modalText = document.getElementById('lfModalText');
    const modalImgContainer = document.getElementById('lfModalImageContainer');
    const modalImg = document.getElementById('lfModalImage');
    const t = lfTranslations[currentLang];

    if (!actionText || actionText.trim() === '') {
        modalText.innerHTML = `<span style="color: #94a3b8; font-weight: bold;">${t.modalPending}</span>`;
    } else {
        modalText.innerHTML = `<span style="color: #2980b9; font-weight: bold;">${actionText.replace(/"/g, '')}</span>`;
    }

    if (imgUrl && imgUrl.trim() !== '') {
        modalImg.src = imgUrl.replace('sz=w320', 'sz=w1000').replace('sz=w500', 'sz=w1000');
        modalImgContainer.style.display = 'block';
    } else {
        modalImg.src = ''; modalImgContainer.style.display = 'none';
    }
    document.getElementById('lfActionModal').style.display = 'block';
};

function checkParentTheme() {
    if (window.parent && window.parent.document.body.classList.contains('dark-mode')) document.body.classList.add('dark-mode');
    else if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-mode');
}

window.checkGlobalTheme = function() {
    if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-mode');
    else document.body.classList.remove('dark-mode');
};

// 🌟 ฟังก์ชันนี้ถูกเรียกโดยหน้าหลักเมื่อมีการกดเปลี่ยนภาษา ให้แปลข้อมูลทันที
window.applyLanguageUI = function() {
    currentLang = localStorage.getItem('appLang') || localStorage.getItem('lang') || 'th';
    const t = lfTranslations[currentLang];

    // แปลภาษาปุ่ม Filter บน Header ด้านบน
    const pDoc = window.parent.document;
    if (pDoc) {
        const bAll = pDoc.querySelector('.filter-btn[data-filter="all"]');
        const bLost = pDoc.querySelector('.filter-btn[data-filter="สิ่งของสูญหาย"]');
        const bFound = pDoc.querySelector('.filter-btn[data-filter="พบสิ่งของ"]');
        const bRet = pDoc.querySelector('.filter-btn[data-filter="รับของคืน"]');
        const searchInp = pDoc.getElementById('globalSearchInput');

        if(bAll) bAll.innerHTML = `${t.all} <span class="badge">${bAll.querySelector('.badge')?.innerText || '0'}</span>`;
        if(bLost) bLost.innerHTML = `${t.btnLost} <span class="badge">${bLost.querySelector('.badge')?.innerText || '0'}</span>`;
        if(bFound) bFound.innerHTML = `${t.btnFound} <span class="badge">${bFound.querySelector('.badge')?.innerText || '0'}</span>`;
        if(bRet) bRet.innerHTML = `${t.btnReturned} <span class="badge">${bRet.querySelector('.badge')?.innerText || '0'}</span>`;
        if(searchInp) searchInp.placeholder = t.searchPlaceholder;
    }

    // สั่งให้วาดแกลเลอรีใหม่ เพื่อแปลภาษาในการ์ด
    if (allLostFound.length > 0) applyFilters();
};

window.onclick = function(event) {
    const modal = document.getElementById('lfActionModal');
    if (event.target == modal) modal.style.display = "none";
};