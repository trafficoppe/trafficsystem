/* ==========================================
   TRAFFIC JAVASCRIPT (page_traffic_script.js)
   ========================================== */

const trafficSheetUrl = "https://docs.google.com/spreadsheets/d/1lYRhXtLgec6ISM6Ugt-YKLrh47NRt7ihcVLcD8mI_Yg/gviz/tq?tqx=out:json&gid=1509680619";

let allTrafficData = [];

window.onload = function() {
    injectUI();
    fetchTrafficData();
};

function injectUI() {
    const pDoc = window.parent.document;
    if (!pDoc) return;

    const headerSlot = pDoc.getElementById('headerFilterSlot');
    const headerTemplate = document.getElementById('trafficFilterTemplate');
    
    if (headerSlot && headerTemplate) {
        headerSlot.innerHTML = headerTemplate.innerHTML;
        const searchInput = pDoc.getElementById('globalSearchInput');
        if (searchInput) searchInput.oninput = displayTrafficData;
    }
}

// ระบบแปลงวันที่เพื่อนำมาจัดเรียง
function parseDateToTimestamp(dateStr, fileName) {
    try {
        if (dateStr) {
            let str = dateStr.toString().trim();
            if (str.startsWith('Date(')) {
                let p = str.match(/\d+/g);
                if (p && p.length >= 3) {
                    return new Date(parseInt(p[0]), parseInt(p[1]), parseInt(p[2]), p[3] ? parseInt(p[3]) : 0, p[4] ? parseInt(p[4]) : 0).getTime();
                }
            }
            let parts = str.split(/[\/\-\s:]+/);
            if (parts.length >= 3) {
                let day = parseInt(parts[0]);
                let month = parseInt(parts[1]) - 1;
                let year = parseInt(parts[2]);
                if (year > 2500) year -= 543;
                let hour = parts[3] ? parseInt(parts[3]) : 0;
                let minute = parts[4] ? parseInt(parts[4]) : 0;
                let parsed = new Date(year, month, day, hour, minute).getTime();
                if (!isNaN(parsed)) return parsed;
            }
        }
        if (fileName) {
            let match = fileName.match(/(\d{4})(\d{2})(\d{2})_?(\d{2})?(\d{2})?/);
            if (match && match[1] && parseInt(match[1]) >= 2020) {
                let year = parseInt(match[1]);
                let month = parseInt(match[2]) - 1;
                let day = parseInt(match[3]);
                let hour = match[4] ? parseInt(match[4]) : 0;
                let minute = match[5] ? parseInt(match[5]) : 0;
                let parsed = new Date(year, month, day, hour, minute).getTime();
                if (!isNaN(parsed)) return parsed;
            }
        }
    } catch (e) {}
    return 0;
}

// ระบบแปลงวันที่รูปแบบเต็มภาษาไทย
function formatThaiDate(timestamp) {
    if (!timestamp) return '-';
    const d = new Date(timestamp);
    const thaiMonths = [
        "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
        "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];
    const day = d.getDate();
    const month = thaiMonths[d.getMonth()];
    const year = d.getFullYear() + 543; 
    
    let h = d.getHours();
    let m = d.getMinutes();
    
    if (h > 0 || m > 0) {
        return `${day} ${month} ${year} เวลา ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} น.`;
    }
    return `${day} ${month} ${year}`;
}

function fetchTrafficData() {
    const loadingEl = document.getElementById('assetLoading');
    if(loadingEl) loadingEl.style.display = 'block';

    fetch(trafficSheetUrl)
        .then(res => res.text())
        .then(text => {
            const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S\w]+)\);/);
            if (match && match[1]) {
                const data = JSON.parse(match[1]);
                allTrafficData = data.table.rows.map((row, index) => {
                    if (!row || !row.c) return null;
                    const getV = (i) => (row.c[i] && (row.c[i].f || row.c[i].v)) ? (row.c[i].f || row.c[i].v).toString().trim() : '';
                    
                    let dateStr = getV(0);
                    let fileName = getV(1);
                    let imageUrl = getV(2);
                    let category = getV(3);
                    
                    if(!imageUrl || imageUrl === '-' || imageUrl === '') return null;
                    
                    // 🌟 กรองเอาเฉพาะหมวดหมู่ที่เกี่ยวข้องกับ "จราจร"
                    if(!category.includes('จราจร')) return null;
                    
                    let timestamp = parseDateToTimestamp(dateStr, fileName);
                    let displayDate = formatThaiDate(timestamp);
                    if (displayDate === '-') displayDate = dateStr;
                    
                    return { 
                        date: dateStr,
                        displayDate: displayDate,
                        fileName: fileName,
                        image: imageUrl,
                        category: category,
                        timestamp: timestamp,
                        rowIndex: index
                    };
                }).filter(item => item !== null);
                
                // เรียงลำดับชั้นที่ 1 (วันที่ล่าสุด) และชั้นที่ 2 (แถวล่าสุด)
                allTrafficData.sort((a, b) => {
                    if (b.timestamp !== a.timestamp) return b.timestamp - a.timestamp;
                    return b.rowIndex - a.rowIndex;
                });

                // ดึง 20 ภาพล่าสุด
                allTrafficData = allTrafficData.slice(0, 20);
                
                if(loadingEl) loadingEl.style.display = 'none';
                displayTrafficData();
            }
        }).catch(err => {
            if(loadingEl) loadingEl.innerHTML = `<span style="color:red;">❌ เกิดข้อผิดพลาดในการโหลดข้อมูล</span>`;
        });
}

function displayTrafficData() {
    const gallery = document.getElementById('trafficGallery');
    if(!gallery) return;
    
    const pDoc = window.parent.document;
    let searchInput = pDoc ? pDoc.getElementById('globalSearchInput') : null;
    let keyword = searchInput ? searchInput.value.toLowerCase().trim() : '';
    
    let filtered = allTrafficData;

    if (keyword !== '') {
        filtered = filtered.filter(v => 
            (v.fileName && v.fileName.toLowerCase().includes(keyword)) || 
            (v.date && v.date.toLowerCase().includes(keyword)) ||
            (v.displayDate && v.displayDate.includes(keyword))
        );
    }
    
    if (filtered.length === 0) {
        gallery.innerHTML = `<div class="loading-text" style="grid-column: 1/-1;">🔍 ไม่พบข้อมูลงานจราจร</div>`;
        return;
    }

    gallery.innerHTML = filtered.map(v => {
        let imgHtml = '';
        if (v.image) {
            const match = v.image.match(/[?&]id=([a-zA-Z0-9_-]+)/) || v.image.match(/\/d\/([a-zA-Z0-9_-]+)/);
            if (match && match[1]) {
                const fileId = match[1];
                const imgUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
                imgHtml = `
                <div class="card-image-wrapper" style="height: 260px; background-color: #f1f5f9; overflow: hidden; display: flex; align-items: center; justify-content: center; padding: 5px;">
                    <img src="${imgUrl}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 8px;">
                </div>`;
            } else {
                imgHtml = `
                <div class="card-image-wrapper" style="height: 260px; background-color: #f1f5f9; overflow: hidden; display: flex; align-items: center; justify-content: center; padding: 5px;">
                    <img src="${v.image}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 8px;">
                </div>`;
            }
        }

        return `
        <div class="vehicle-card" style="background: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); overflow: hidden;">
            ${imgHtml}
            <div class="card-content" style="padding: 15px 20px; text-align: left;">
                <h3 class="card-title" style="color: #000000; font-size: 16px; margin: 0 0 10px 0; font-weight: 600; word-break: break-word;">${v.fileName || 'ภาพถ่ายงานจราจร'}</h3>
                <div style="font-size: 14px; color: #000000; margin-bottom: 5px;"><strong>เวลา:</strong> ${v.displayDate || '-'}</div>
                <div style="font-size: 14px; color: #000000; font-weight: 500;"><strong>หมวดหมู่:</strong> ${v.category || '-'}</div>
            </div>
        </div>
        `;
    }).join('');
}