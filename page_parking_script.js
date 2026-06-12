const parkingSheetUrl = "https://docs.google.com/spreadsheets/d/1lYRhXtLgec6ISM6Ugt-YKLrh47NRt7ihcVLcD8mI_Yg/gviz/tq?tqx=out:json&gid=591543024";
let allParkingLots = [];
let currentFilter = 'all';

window.onload = function() {
    injectUI();
    fetchParkingLots();
};

function injectUI() {
    const pDoc = window.parent.document;
    if (!pDoc) return;

    const headerSlot = pDoc.getElementById('headerFilterSlot');
    const headerTemplate = document.getElementById('parkingFilterTemplate');
    
    if (headerSlot && headerTemplate) {
        headerSlot.innerHTML = headerTemplate.innerHTML;
        
        const searchInput = pDoc.getElementById('globalSearchInput');
        if (searchInput) searchInput.oninput = displayParkingLots;
        
        pDoc.querySelectorAll('#filter-group-parking .filter-btn').forEach(btn => {
            btn.onclick = function() {
                pDoc.querySelectorAll('#filter-group-parking .filter-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                currentFilter = this.getAttribute('data-filter');
                displayParkingLots();
            };
        });
    }
}

function fetchParkingLots() {
    const loadingEl = document.getElementById('assetLoading');
    if(loadingEl) loadingEl.style.display = 'block';

    fetch(parkingSheetUrl)
        .then(res => res.text())
        .then(text => {
            const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S\w]+)\);/);
            if (match && match[1]) {
                const data = JSON.parse(match[1]);
                allParkingLots = data.table.rows.map(row => {
                    if (!row || !row.c) return null;
                    const getV = (i) => (row.c[i] && (row.c[i].f || row.c[i].v)) ? (row.c[i].f || row.c[i].v).toString().trim() : '';
                    
                    let caretakerCol = 2; 
                    for(let i=1; i<=4; i++) {
                        let val = getV(i);
                        if(val === 'ส่วนกลาง' || val === 'ส่วนงาน') { caretakerCol = i; break; }
                    }
                    
                    let name = '', caretaker = '', capacity = '', p1 = '';

                    if (caretakerCol === 3) {
                        let id = getV(1); let n = getV(2);
                        name = (id && id !== '-' && id !== n) ? `${id} - ${n}` : n;
                        caretaker = getV(3); capacity = getV(4); p1 = getV(5);
                    } else if (caretakerCol === 2) {
                        name = getV(1); caretaker = getV(2); capacity = getV(3); p1 = getV(4);
                    } else if (caretakerCol === 1) {
                        name = getV(0); caretaker = getV(1); capacity = getV(2); p1 = getV(3);
                    } else {
                        name = getV(1); caretaker = getV(2); capacity = getV(3);
                    }
                    
                    if(!name || name === '-') return null;
                    
                    return { 
                        name: name.trim(), 
                        type: caretaker, 
                        capacity: parseInt(capacity) || 0, 
                        image: p1 
                    };
                }).filter(item => item !== null);
                
                if(loadingEl) loadingEl.style.display = 'none';
                
                updateFilterCounts(); 
                displayParkingLots();
            }
        }).catch(err => {
            console.error("Parking Fetch Error:", err);
            if(loadingEl) loadingEl.innerHTML = `<span style="color:red;">❌ เกิดข้อผิดพลาดในการโหลดข้อมูลลานจอดรถ</span>`;
        });
}

function updateFilterCounts() {
    const pDoc = window.parent.document;
    if (!pDoc) return;

    let totalLots = allParkingLots.length;
    let totalCars = allParkingLots.reduce((sum, item) => sum + item.capacity, 0);

    let centralLots = allParkingLots.filter(item => item.type === 'ส่วนกลาง');
    let centralCars = centralLots.reduce((sum, item) => sum + item.capacity, 0);

    let deptLots = allParkingLots.filter(item => item.type === 'ส่วนงาน');
    let deptCars = deptLots.reduce((sum, item) => sum + item.capacity, 0);

    const btnAll = pDoc.querySelector('#filter-group-parking .filter-btn[data-filter="all"] .badge');
    const btnCentral = pDoc.querySelector('#filter-group-parking .filter-btn[data-filter="ส่วนกลาง"] .badge');
    const btnDept = pDoc.querySelector('#filter-group-parking .filter-btn[data-filter="ส่วนงาน"] .badge');

    if (btnAll) btnAll.innerText = `${totalLots} ลาน (${totalCars} คัน)`;
    if (btnCentral) btnCentral.innerText = `${centralLots.length} ลาน (${centralCars} คัน)`;
    if (btnDept) btnDept.innerText = `${deptLots.length} ลาน (${deptCars} คัน)`;
}

function getDirectImageUrl(url) {
    if (!url) return "";
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w600`;
    return url;
}

function displayParkingLots() {
    const gallery = document.getElementById('parkingGallery');
    if(!gallery) return;
    
    const pDoc = window.parent.document;
    let searchInput = pDoc ? pDoc.getElementById('globalSearchInput') : null;
    let keyword = searchInput ? searchInput.value.toLowerCase().trim() : '';
    
    let filtered = allParkingLots;

    if (currentFilter !== 'all') {
        filtered = filtered.filter(v => v.type === currentFilter);
    }

    if (keyword !== '') {
        filtered = filtered.filter(v => v.name.toLowerCase().includes(keyword));
    }
    
    if (filtered.length === 0) {
        gallery.innerHTML = `<div class="loading-text" style="grid-column: 1/-1;">🔍 ไม่พบข้อมูลลานจอดรถที่ค้นหา</div>`;
        return;
    }

    gallery.innerHTML = filtered.map(v => {
        // ✨ เช็คว่ามีรูปหรือไม่ ถ้าไม่มีให้ข้ามการวาดกรอบรูปไปเลย
        let hasImage = v.image && v.image !== '-' && v.image.trim() !== '';
        let imgHtml = '';
        
        if (hasImage) {
            let imgUrl = getDirectImageUrl(v.image);
            // เพิ่ม onerror="this.style.display='none'" เผื่อลิงก์รูปพังจะได้ซ่อนไปเลยไม่กระพริบ
            imgHtml = `
            <div class="card-image-wrapper" style="height: 200px; background-color: #f8fafc; overflow: hidden; display: flex; align-items: center; justify-content: center;">
                <img src="${imgUrl}" onerror="this.parentElement.style.display='none'" style="width: 100%; height: 100%; object-fit: cover; transform: translateZ(0);">
            </div>`;
        }

        return `
        <div class="vehicle-card">
            ${imgHtml}
            <div class="card-content" style="padding: 20px; text-align: center;">
                <h3 class="card-title" style="color: #0ea5e9; font-size: 18px; margin-bottom: 10px; white-space: normal;">${v.name}</h3>
                <div style="font-size: 14px; color: #475569; margin-bottom: 5px;"><strong>ผู้ดูแล:</strong> <span style="color: ${v.type === 'ส่วนกลาง' ? '#059669' : '#d35400'}; font-weight: 500;">${v.type || '-'}</span></div>
                <div style="font-size: 14px; color: #475569;"><strong>ความจุ:</strong> ${v.capacity || '0'} คัน</div>
            </div>
        </div>
        `;
    }).join('');
}