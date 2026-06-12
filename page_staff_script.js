/* ==========================================
   STAFF JAVASCRIPT (page_staff_script.js)
   ========================================== */

const staffApiUrl = "https://script.google.com/macros/s/AKfycbzWc03wzCkfUHs3pIucqNs_tz7BguxUlODGOihfiMgHgkQFx5Kc1DRlITg_SDR9lu4/exec";

let allStaffData = [];

window.onload = function() {
    injectUI();
    fetchStaffData();
};

function injectUI() {
    const pDoc = window.parent.document;
    if (!pDoc) return;

    const headerSlot = pDoc.getElementById('headerFilterSlot');
    const headerTemplate = document.getElementById('staffFilterTemplate');
    
    if (headerSlot && headerTemplate) {
        headerSlot.innerHTML = headerTemplate.innerHTML;
        
        const searchInput = pDoc.getElementById('globalSearchInput');
        const unitSelect = pDoc.getElementById('staffUnitSelect');
        const roleSelect = pDoc.getElementById('staffRoleSelect');
        
        // รับค่าจาก URL (เผื่อกดมาจากเมนูด้านข้าง)
        const urlParams = new URLSearchParams(window.location.search);
        if(urlParams.has('unit')) {
            let u = urlParams.get('unit').toLowerCase();
            if(u.includes('ยุทธศาสตร์')) unitSelect.value = 'ยุทธศาสตร์';
            else if(u.includes('ปฏิบัติการ')) unitSelect.value = 'ปฏิบัติการ';
        }

        if (searchInput) searchInput.oninput = displayStaffData;
        if (unitSelect) unitSelect.onchange = displayStaffData;
        if (roleSelect) roleSelect.onchange = displayStaffData;
    }
}

function fetchStaffData() {
    const loadingEl = document.getElementById('assetLoading');
    if(loadingEl) loadingEl.style.display = 'block';

    fetch(staffApiUrl)
        .then(res => res.json())
        .then(data => {
            // กรองเอาเฉพาะหมวดหมู่บุคลากร
            allStaffData = data.filter(item => item.Data_Category === 'Staff');
            
            if(loadingEl) loadingEl.style.display = 'none';
            displayStaffData();
        }).catch(err => {
            console.error("Fetch Error:", err);
            if(loadingEl) loadingEl.innerHTML = `<span style="color:red;">❌ เกิดข้อผิดพลาดในการเชื่อมต่อข้อมูล</span>`;
        });
}

function displayStaffData() {
    const gallery = document.getElementById('staffGallery');
    if(!gallery) return;
    
    const pDoc = window.parent.document;
    let searchInput = pDoc ? pDoc.getElementById('globalSearchInput') : null;
    let unitSelect = pDoc ? pDoc.getElementById('staffUnitSelect') : null;
    let roleSelect = pDoc ? pDoc.getElementById('staffRoleSelect') : null;

    let keyword = searchInput ? searchInput.value.toLowerCase().trim() : '';
    let selUnit = unitSelect ? unitSelect.value : 'all';
    let selRole = roleSelect ? roleSelect.value : 'all';

    let filtered = allStaffData;

    // กรองตามหน่วยงาน (สำหรับการกรอง ยังคงใช้ชื่อหน่วยอยู่เพื่อให้ Dropdown ทำงานได้ปกติ)
    if (selUnit !== 'all') {
        filtered = filtered.filter(v => {
            let unitName = (v['หน่วย'] || v['หน่วยงาน'] || '').toLowerCase();
            return unitName.includes(selUnit);
        });
    }

    // กรองตามประเภท/กะ
    if (selRole !== 'all') {
        filtered = filtered.filter(v => {
            let roleName = (v.ประเภท || '').toLowerCase();
            if(selRole === 'หัวหน้า') return roleName.includes('หัวหน้า');
            if(selRole === 'จราจร') return roleName.includes('จราจร') && !roleName.includes('หัวหน้า');
            return roleName.includes(selRole.toLowerCase());
        });
    }

    // กรองตามคำค้นหา
    if (keyword !== '') {
        filtered = filtered.filter(v => {
            let combinedText = `${v['ยี่ห้อ/รุ่น'] || ''} ${v.ประเภท || ''} ${v.ทะเบียน || ''} ${v['ตำแหน่ง'] || ''} ${v['หัวหน้าหน่วย'] || ''}`.toLowerCase();
            return combinedText.includes(keyword);
        });
    }

    if (filtered.length === 0) {
        gallery.innerHTML = `<div class="loading-text" style="grid-column: 1/-1;">🔍 ไม่พบรายชื่อบุคลากรที่ค้นหา</div>`;
        return;
    }

    gallery.innerHTML = filtered.map(v => {
        let imgHtml = '';
        let imgUrl = v.URL_รูปภาพ_1 || '';
        
        if (imgUrl) {
            const match = imgUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/) || imgUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
            if (match && match[1]) {
                const fileId = match[1];
                const cleanUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
                imgHtml = `<img src="${cleanUrl}" style="width: 100%; height: 100%; object-fit: cover; object-position: top; border-radius: 8px;">`;
            } else {
                imgHtml = `<img src="${imgUrl}" style="width: 100%; height: 100%; object-fit: cover; object-position: top; border-radius: 8px;">`;
            }
        } else {
            imgHtml = `<div style="display:flex; align-items:center; justify-content:center; width:100%; height:100%; background:#e2e8f0; color:#94a3b8; font-size:40px;"><i class="fa-solid fa-user"></i></div>`;
        }

        let staffName = v['ยี่ห้อ/รุ่น'] || 'ไม่ระบุชื่อ';
        let staffRole = v.ประเภท || '-';
        let staffId = v.ทะเบียน || '-';
        let staffPhone = v.สี || '-';

        // 🌟 เปลี่ยนมาดึงข้อมูล "ตำแหน่ง" ตามชีท (เช็คจากคอลัมน์ "ตำแหน่ง", "หัวหน้าหน่วย" หรือถ้าไม่มีจริงๆ ถึงจะโชว์ "หน่วย")
        let staffPosition = v['ตำแหน่ง'] || v['หัวหน้าหน่วย'] || v['หน่วย'] || v['หน่วยงาน'] || '-';

        return `
        <div class="vehicle-card" style="background: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); overflow: hidden;">
            <div class="card-image-wrapper" style="height: 280px; background-color: #f1f5f9; overflow: hidden; padding: 5px;">
                ${imgHtml}
            </div>
            <div class="card-content" style="padding: 15px 20px;">
                <div style="font-size: 13px; color: #64748b; margin-bottom: 5px; font-weight: 500; text-align: left;">รหัสพนักงาน: ${staffId}</div>
                <h3 class="card-title" style="color: #000000; font-size: 18px; margin: 0 0 5px 0; font-weight: 600; word-break: break-word; text-align: left;">${staffName}</h3>
                <div style="font-size: 14px; color: #000000; font-weight: 600; margin-bottom: 5px; text-align: left;">${staffRole}</div>
                
                <div style="font-size: 13px; color: #000000; margin-bottom: 5px; text-align: center; min-height: 40px; display: flex; align-items: center; justify-content: center;">${staffPosition}</div>
                
                <div style="font-size: 13px; color: #000000; font-weight: 500; margin-top: 10px; padding-top: 10px; border-top: 1px solid #f1f5f9; text-align: left;">
                    <i class="fa-solid fa-phone" style="margin-right: 5px; color: #3b82f6;"></i> ${staffPhone}
                </div>
            </div>
        </div>
        `;
    }).join('');
}