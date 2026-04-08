// 🌟 สำคัญมาก: ใส่ลิงก์ Web App ของคุณที่นี่ 🌟
const scriptURL = "https://script.google.com/macros/s/AKfycbzWc03wzCkfUHs3pIucqNs_tz7BguxUlODGOihfiMgHgkQFx5Kc1DRlITg_SDR9lu4/exec"; 

const lfSheetUrl = `https://docs.google.com/spreadsheets/d/14MJgb81aVEjT2qVp6n9zNKCCpJNVimX1q0hiYkH0f5I/gviz/tq?tqx=out:json&gid=751456190`;

let allVehicles = []; 
let allLostFound = []; 

let currentVehicleIndex = 0; 
let currentImageIndex = 0; 
let mainCategory = 'vehicle'; 
let currentSubFilter = 'all';
let currentExtinguisherType = 'all';
let currentNozzleType = 'all'; 
let currentUnit = 'all';

let currentMissionYear = 'all'; 

let currentRefillHistory = [];
let currentRefillHistoryPage = 1;
const REFILL_HISTORY_PER_PAGE = 2; 
let currentRefillVehicle = null;

const getSearchText = (v) => {
    return `${v.ประเภท || ''} ${v['ยี่ห้อ/รุ่น'] || ''} ${v.สี || ''} ${v.ทะเบียน || ''} ${v.หมายเลขครุภัณฑ์ || ''} ${v['ขนาด'] || ''} ${v['ชื่อแบบฟอร์ม'] || ''}`.toLowerCase();
};

const getUnit = (v) => (v['หน่วย'] || v['หน่วยงาน'] || v['Column 1'] || v['สังกัด'] || '').toLowerCase();

const fireKeywords = ['อุปกรณ์ดับเพลิง', 'ถังดับเพลิง', 'สายส่งน้ำดับเพลิง', 'สายฉีด', 'หัวฉีด', 'ปั๊มน้ำ', 'ตู้เก็บอุปกรณ์', 'หัวรับน้ำ', 'ppe', 'pee', 'ชุดดับเพลิง'];
const isFireEquip = (v) => fireKeywords.some(keyword => getSearchText(v).includes(keyword.toLowerCase()));

function getFireExtinguisherClasses(modelName) {
    let classes = [];
    let name = (modelName || '').toLowerCase();

    if (name.includes('impact') || name.includes('fast-tech') || name.includes('fast tech')) {
        classes = ['A', 'B', 'C', 'K'];
    } else if (name.includes('fireade') || name.includes('fire ade')) {
        classes = ['A', 'B', 'C', 'D', 'K'];
    } else if (name.includes('เคมีแห้ง')) {
        classes = ['A', 'B', 'C'];
    } else if (name.includes('co2') || name.includes('คาร์บอน')) {
        classes = ['B', 'C'];
    } else if (name.includes('น้ำยาเคมี') || name.includes('เหลวระเหย') || name.includes('สูตรน้ำ')) {
        classes = ['A', 'B', 'C', 'D', 'K']; 
    } else if (name.includes('โฟม')) {
        classes = ['A', 'B'];
    } else if (name.includes('น้ำ')) {
        classes = ['A'];
    }
    return classes;
}

function getDirectImageUrl(url) {
    if (!url) return "";
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
        return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
    }
    return url;
}

function parseCustomDate(dateStr) {
    if (!dateStr) return null;
    let str = String(dateStr).trim();
    let parts = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (parts) {
        let day = parseInt(parts[1]);
        let month = parseInt(parts[2]) - 1; 
        let year = parseInt(parts[3]);
        if (year > 2500) year -= 543; 
        let hr = parseInt(parts[4] || 0);
        let min = parseInt(parts[5] || 0);
        let sec = parseInt(parts[6] || 0);
        return new Date(year, month, day, hr, min, sec);
    }
    let d = new Date(str);
    if (!isNaN(d)) return d;
    return null;
}

function extractYear(dateStr) {
    let d = parseCustomDate(dateStr);
    if (d) {
        let y = d.getFullYear() + 543; 
        return y.toString();
    }
    return 'ไม่ระบุปี';
}

function initPageUI() {
    document.querySelectorAll('.sidebar-menu a').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.submenu').forEach(el => el.classList.remove('show-submenu'));
    document.querySelectorAll('.filter-buttons').forEach(el => el.style.display = 'none');
    
    const yearSelectContainer = document.getElementById('sub-filter-mission-year-container');
    if(yearSelectContainer) yearSelectContainer.style.display = 'none';
    
    const galleryElement = document.getElementById('vehicleGallery');
    if(galleryElement) galleryElement.classList.remove('form-list-mode'); 

    if(mainCategory === 'fire') {
        const menuFire = document.getElementById('menu-fire');
        if(menuFire) menuFire.classList.add('active');
        const submenuFire = document.getElementById('submenu-fire');
        if(submenuFire) submenuFire.classList.add('show-submenu');

        if (currentUnit === 'all' || currentUnit === '') {
            document.getElementById('page-title').innerText = 'อุปกรณ์ป้องกันอัคคีภัยทั้งหมด';
        } else {
            if (currentUnit === 'ถังดับเพลิง') {
                const item = document.getElementById('menu-fire-extinguisher');
                if(item) item.classList.add('active');
                document.getElementById('page-title').innerText = 'อุปกรณ์ดับเพลิง: ถังดับเพลิง';
                const subFilterExt = document.getElementById('sub-filter-extinguisher');
                if (subFilterExt) subFilterExt.style.display = 'flex';
            } else if (currentUnit === 'สายส่งน้ำดับเพลิง' || currentUnit === 'สายส่งน้ำ') {
                const item = document.getElementById('menu-fire-hose');
                if(item) item.classList.add('active');
                document.getElementById('page-title').innerText = 'อุปกรณ์ดับเพลิง: สายส่งน้ำดับเพลิง';
            } else if (currentUnit === 'หัวฉีด') {
                const item = document.getElementById('menu-fire-nozzle');
                if(item) item.classList.add('active');
                document.getElementById('page-title').innerText = 'อุปกรณ์ดับเพลิง: หัวฉีด';
                const subFilterNoz = document.getElementById('sub-filter-nozzle');
                if (subFilterNoz) subFilterNoz.style.display = 'flex';
            } else if (currentUnit === 'ปั๊มน้ำ') {
                const item = document.getElementById('menu-fire-pump');
                if(item) item.classList.add('active');
                document.getElementById('page-title').innerText = 'อุปกรณ์ดับเพลิง: ปั๊มน้ำ';
            } else if (currentUnit === 'ตู้เก็บอุปกรณ์') {
                const item = document.getElementById('menu-fire-cabinet');
                if(item) item.classList.add('active');
                document.getElementById('page-title').innerText = 'อุปกรณ์ดับเพลิง: ตู้เก็บอุปกรณ์';
            } else if (currentUnit === 'หัวรับน้ำ') {
                const item = document.getElementById('menu-fire-hydrant');
                if(item) item.classList.add('active');
                document.getElementById('page-title').innerText = 'อุปกรณ์ดับเพลิง: หัวรับน้ำดับเพลิง';
            } else if (currentUnit === 'ชุด ppe') {
                const item = document.getElementById('menu-fire-ppe');
                if(item) item.classList.add('active');
                document.getElementById('page-title').innerText = 'อุปกรณ์ดับเพลิง: ชุด PPE';
            }
        }
    } else if (mainCategory === 'vehicle') {
        const item = document.getElementById('menu-vehicle');
        if(item) item.classList.add('active');
        document.getElementById('page-title').innerText = 'ยานพาหนะงานจราจรทั้งหมด';
        const fg = document.getElementById('filter-group-vehicle');
        if(fg) fg.style.display = 'flex';
    } else if (mainCategory === 'form') { 
        const item = document.getElementById('menu-form');
        if(item) item.classList.add('active');
        document.getElementById('page-title').innerText = 'รวมแบบฟอร์มรายงานและคำร้องต่างๆ';
        if(galleryElement) galleryElement.classList.add('form-list-mode');
    } else if (mainCategory === 'mission') { 
        const item = document.getElementById('menu-mission');
        if(item) item.classList.add('active');
        const submenuMission = document.getElementById('submenu-mission');
        if(submenuMission) submenuMission.classList.add('show-submenu');

        if (currentUnit.includes('ตารางเวร')) { 
            const subItem = document.getElementById('menu-mission-schedule');
            if(subItem) subItem.classList.add('active');
            document.getElementById('page-title').innerText = 'ตารางเวรปฏิบัติงาน';
        } else {
            const fg = document.getElementById('filter-group-mission');
            if(fg) fg.style.display = 'flex';
            if (yearSelectContainer) yearSelectContainer.style.display = 'flex'; 

            if(currentUnit.includes('ตรวจพื้นที่')) {
                const subItem = document.getElementById('menu-mission-inspect');
                if(subItem) subItem.classList.add('active');
                document.getElementById('page-title').innerText = 'การดูแลพื้นที่ส่วนกลาง: ผลการตรวจพื้นที่';
            } else if (currentUnit.includes('ช่วยเหลือ')) {
                const subItem = document.getElementById('menu-mission-help');
                if(subItem) subItem.classList.add('active');
                document.getElementById('page-title').innerText = 'การดูแลพื้นที่ส่วนกลาง: การให้ความช่วยเหลือ';
            } else if (currentUnit.includes('การจราจร')) {
                const subItem = document.getElementById('menu-mission-traffic');
                if(subItem) subItem.classList.add('active');
                document.getElementById('page-title').innerText = 'การดูแลพื้นที่ส่วนกลาง: งานจราจร';
            } else {
                document.getElementById('page-title').innerText = 'การดูแลพื้นที่ส่วนกลางทั้งหมด';
            }
        }
    } else if (mainCategory === 'lostfound') { 
        const item = document.getElementById('menu-lostfound');
        if(item) item.classList.add('active');
        document.getElementById('page-title').innerText = 'ระบบแจ้งของหาย / เก็บของได้';
        const fg = document.getElementById('filter-group-lostfound');
        if(fg) fg.style.display = 'flex';
    } else { 
        const item = document.getElementById('menu-staff');
        if(item) item.classList.add('active');
        const submenuStaff = document.getElementById('submenu-staff');
        if(submenuStaff) submenuStaff.classList.add('show-submenu');

        if(currentUnit.includes('ยุทธศาสตร์')) {
            const subItem = document.getElementById('menu-staff-strat');
            if(subItem) subItem.classList.add('active');
            document.getElementById('page-title').innerText = 'บุคลากร: หน่วยยุทธศาสตร์และพัฒนาระบบความปลอดภัย';
        } else if (currentUnit.includes('ปฏิบัติการ')) {
            const subItem = document.getElementById('menu-staff-op');
            if(subItem) subItem.classList.add('active');
            document.getElementById('page-title').innerText = 'บุคลากร: หน่วยปฏิบัติการจราจรและรักษาความปลอดภัย';
        } else {
            document.getElementById('page-title').innerText = 'รายชื่อบุคลากรและพนักงานจราจรทั้งหมด';
        }
        const fg = document.getElementById('filter-group-staff');
        if(fg) fg.style.display = 'flex';
    }

    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    let activeGroup = null;
    if(mainCategory === 'vehicle') activeGroup = document.getElementById('filter-group-vehicle');
    if(mainCategory === 'staff') activeGroup = document.getElementById('filter-group-staff');
    if(mainCategory === 'mission' && !currentUnit.includes('ตารางเวร')) activeGroup = document.getElementById('filter-group-mission');
    if(mainCategory === 'lostfound') activeGroup = document.getElementById('filter-group-lostfound');
    
    if (activeGroup) {
        const targetBtn = activeGroup.querySelector(`[data-filter="${currentSubFilter}"]`) || activeGroup.querySelector('[data-filter="all"]');
        if(targetBtn) targetBtn.classList.add('active');
    }
    
    const searchInput = document.getElementById('searchInput');
    if(searchInput) searchInput.value = '';
}

// 🌟 ระบบนำทางฉบับ SPA เปลี่ยนหน้าทันที (แก้ไขบั๊กหน่วยยุทธศาสตร์) 🌟
function setupSeamlessNavigation() {
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');

            // 1. จัดการการคลิกเปิด-ปิดเมนูย่อย (Dropdown)
            if (this.parentElement.classList.contains('has-submenu') && (!href || href === '#' || !href.includes('?'))) {
                e.preventDefault();
                const submenu = this.nextElementSibling;
                if (submenu && submenu.classList.contains('submenu')) {
                    submenu.classList.toggle('show-submenu');
                }
                return;
            }

            // 2. โหมด SPA (เปลี่ยนแท็บรวดเร็ว ไม่ต้องรีเฟรชหน้า)
            const isCurrentIndex = window.location.pathname.endsWith('/') || window.location.pathname.includes('index.html');
            
            if (href && href.includes('index.html') && isCurrentIndex) {
                e.preventDefault();

                const urlObj = new URL(href, window.location.href);
                window.history.pushState({ path: href }, '', href);

                const urlParams = urlObj.searchParams;
                mainCategory = urlParams.has('main') ? urlParams.get('main') : 'staff';
                currentUnit = urlParams.has('unit') ? urlParams.get('unit').toLowerCase() : 'all';

                // 🌟 FIX BUG: ป้องกันไม่ให้เอาชื่อหน่วยงาน (ยุทธศาสตร์) ไปค้นหาในประเภทพนักงาน
                if (mainCategory === 'staff') {
                    currentSubFilter = 'all'; // รีเซ็ตฟิลเตอร์พนักงานเป็นทั้งหมดเสมอ
                } else {
                    currentSubFilter = currentUnit !== 'all' ? currentUnit : 'all';
                }

                currentExtinguisherType = 'all';
                currentNozzleType = 'all';
                currentMissionYear = 'all';

                initPageUI();
                updateFilterCounts();
                applyFilters();

                document.querySelector('.main-content').scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }
        });
    });

    window.addEventListener('popstate', function(e) {
        if (window.location.pathname.endsWith('/') || window.location.pathname.includes('index.html')) {
            const urlParams = new URLSearchParams(window.location.search);
            mainCategory = urlParams.has('main') ? urlParams.get('main') : 'staff';
            currentUnit = urlParams.has('unit') ? urlParams.get('unit').toLowerCase() : 'all';
            
            if (mainCategory === 'staff') {
                currentSubFilter = 'all';
            } else {
                currentSubFilter = currentUnit !== 'all' ? currentUnit : 'all';
            }
            
            initPageUI();
            updateFilterCounts();
            applyFilters();
        }
    });
}

window.onload = function() { 
    const urlParams = new URLSearchParams(window.location.search);
    if(urlParams.has('main')) mainCategory = urlParams.get('main');
    if(urlParams.has('unit')) currentUnit = urlParams.get('unit').toLowerCase();
    
    // 🌟 FIX BUG: ป้องกันไม่ให้เอาชื่อหน่วยงาน (ยุทธศาสตร์) ไปค้นหาตอนโหลดหน้าแรกครั้งแรกด้วย
    if (mainCategory === 'staff') {
        currentSubFilter = 'all';
    } else if (currentUnit !== 'all') {
        currentSubFilter = currentUnit;
    }

    initPageUI();               
    setupSeamlessNavigation();  
    fetchVehicles();            
    fetchLostFound(); 
};

function fetchVehicles() {
    if(mainCategory !== 'lostfound') {
        document.getElementById('vehicleGallery').innerHTML = '<p class="loading">กำลังโหลดข้อมูลล่าสุด...</p>';
    }

    const fetchURL = scriptURL + "?t=" + new Date().getTime();

    fetch(fetchURL)
        .then(response => response.json())
        .then(data => {
            allVehicles = data;
            if(mainCategory !== 'lostfound') {
                updateFilterCounts(); 
                generateExtinguisherSubFilters(); 
                generateNozzleSubFilters(); 
                generateMissionYearSubFilters(); 
                applyFilters(); 
            }
        })
        .catch(error => { 
            console.error("Error fetching data: ", error);
        });
}

function fetchLostFound() {
    if(mainCategory === 'lostfound') {
        document.getElementById('vehicleGallery').innerHTML = '<p class="loading">กำลังเชื่อมต่อฐานข้อมูล L&F...</p>';
    }

    fetch(lfSheetUrl)
        .then(res => res.text())
        .then(text => {
            let data;
            try {
                const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S\w]+)\);/);
                if (match && match[1]) {
                    data = JSON.parse(match[1]);
                } else {
                    const jsonString = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
                    data = JSON.parse(jsonString);
                }
                processLostFoundData(data.table.rows);
            } catch (err) {
                console.error("JSON Parse Error:", err);
                document.getElementById('vehicleGallery').innerHTML = '<p class="loading" style="color: red;">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
            }
        })
        .catch(err => console.error("LF Fetch Error:", err));
}

function processLostFoundData(rows) {
    allLostFound = rows.map(row => {
        if (!row || !row.c) return null;
        
        const getV = (i) => (row.c[i] && (row.c[i].f || row.c[i].v)) ? (row.c[i].f || row.c[i].v).toString().trim() : '';

        let dateVal = getV(0) || getV(1); 
        
        let isReturned = false;
        let fullText = row.c.map(c => c ? (c.f || c.v || '') : '').join(' ');
        if (fullText.includes('รับของคืน') || fullText.includes('รับคืนแล้ว')) isReturned = true;

        let type = '';
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

        let imgUrl = '';
        for (let i = 3; i <= 19; i++) {
            let v = getV(i);
            if (v.includes('drive.google.com')) {
                imgUrl = v; break;
            }
        }

        let titleCandidates = [getV(7), getV(6), getV(5)].filter(v => v && !v.includes('drive.google.com') && !['สิ่งของสูญหาย','พบสิ่งของ','รับของคืน'].includes(v));
        let title = titleCandidates.length > 0 ? titleCandidates[0] : 'ไม่มีระบุ';

        let locCandidates = [getV(8), getV(9), getV(10)].filter(v => v && !v.includes('drive.google.com') && v !== title);
        let location = locCandidates.length > 0 ? locCandidates[0] : 'ไม่ระบุสถานที่';

        let actionText = getV(17); 
        let status = getV(18); 

        if (imgUrl) {
            let firstLink = imgUrl.split(',')[0].trim();
            let matchId = firstLink.match(/id=([a-zA-Z0-9_-]+)/) || firstLink.match(/\/d\/([a-zA-Z0-9_-]+)/);
            if (matchId && matchId[1]) {
                imgUrl = `https://drive.google.com/thumbnail?id=${matchId[1]}&sz=w320`;
            }
        }

        return { type, title, location, dateVal, imgUrl, status, actionText, isReturned };
    }).filter(item => item !== null).reverse();
    
    if (mainCategory === 'lostfound') {
        updateFilterCounts();
        applyFilters();
    }
}

function updateFilterCounts() {
    const vehicleData = allVehicles.filter(v => v.Data_Category === 'Asset' && !isFireEquip(v));
    document.querySelectorAll('#filter-group-vehicle .filter-btn').forEach(btn => {
        const f = btn.getAttribute('data-filter');
        const count = (f === 'all') ? vehicleData.length : vehicleData.filter(v => getSearchText(v).includes(f.toLowerCase())).length;
        const badge = btn.querySelector('.badge');
        if(badge) badge.innerText = count;
        btn.style.display = (count === 0 && f !== 'all') ? 'none' : 'inline-flex';
    });

    let staffData = allVehicles.filter(v => v.Data_Category === 'Staff');
    if (currentUnit.includes('ยุทธศาสตร์')) {
        staffData = staffData.filter(v => getUnit(v).includes('ยุทธศาสตร์') || (v.ประเภท && v.ประเภท.includes('หัวหน้างาน')));
    }
    if (currentUnit.includes('ปฏิบัติการ')) {
        staffData = staffData.filter(v => getUnit(v).includes('ปฏิบัติการ') || (v.ประเภท && v.ประเภท.includes('หัวหน้างาน')));
    }

    document.querySelectorAll('#filter-group-staff .filter-btn').forEach(btn => {
        const f = btn.getAttribute('data-filter');
        let count = 0;
        if (f === 'all') { count = staffData.length; } 
        else if (f === 'จราจร') { count = staffData.filter(v => v.ประเภท && v.ประเภท.includes('จราจร') && !v.ประเภท.includes('หัวหน้า')).length; } 
        else { count = staffData.filter(v => v.ประเภท && v.ประเภท.includes(f)).length; }
        const badge = btn.querySelector('.badge');
        if(badge) badge.innerText = count;
        btn.style.display = (count === 0 && f !== 'all') ? 'none' : 'inline-flex';
    });

    let missionData = allVehicles.filter(v => v.Data_Category === 'Mission');
    if (currentUnit.includes('ตรวจพื้นที่')) {
        missionData = missionData.filter(v => v.ประเภท && v.ประเภท.includes('ตรวจพื้นที่'));
    } else if (currentUnit.includes('ช่วยเหลือ')) {
        missionData = missionData.filter(v => v.ประเภท && v.ประเภท.includes('ช่วยเหลือ'));
    } else if (currentUnit.includes('การจราจร')) {
        missionData = missionData.filter(v => v.ประเภท && v.ประเภท.includes('การจราจร'));
    }
    
    document.querySelectorAll('#filter-group-mission .filter-btn').forEach(btn => {
        const f = btn.getAttribute('data-filter');
        const count = (f === 'all') ? missionData.length : missionData.filter(v => getSearchText(v).includes(f.toLowerCase())).length;
        const badge = btn.querySelector('.badge');
        if(badge) badge.innerText = count;
        btn.style.display = (count === 0 && f !== 'all') ? 'none' : 'inline-flex';
    });

    if (allLostFound.length > 0) {
        document.querySelectorAll('#filter-group-lostfound .filter-btn').forEach(btn => {
            const f = btn.getAttribute('data-filter');
            const count = (f === 'all') ? allLostFound.length : allLostFound.filter(v => v.type === f).length;
            const badge = btn.querySelector('.badge');
            if (badge) badge.innerText = count;
        });
    }
}

function generateMissionYearSubFilters() {
    const selectEl = document.getElementById('sub-filter-mission-year-select');
    const container = document.getElementById('sub-filter-mission-year-container');
    if (!selectEl || !container) return;

    const missions = allVehicles.filter(v => v.Data_Category === 'Mission');
    
    let years = missions.map(v => extractYear(v.สี)).filter(y => y !== '' && y !== 'ไม่ระบุปี');
    years = [...new Set(years)].sort((a, b) => parseInt(b) - parseInt(a));

    if (years.length === 0) {
        container.style.display = 'none';
        return;
    }

    let html = `<option value="all">แสดงทุกปี</option>`;
    years.forEach(year => {
        html += `<option value="${year}">ปี พ.ศ. ${year}</option>`;
    });

    selectEl.innerHTML = html;

    selectEl.onchange = function() {
        currentMissionYear = this.value;
        applyFilters();
    };
}

function generateExtinguisherSubFilters() {
    const subFilterContainer = document.getElementById('sub-filter-extinguisher');
    if (!subFilterContainer) return;

    const extinguishers = allVehicles.filter(v => {
        if (v.Data_Category !== 'Asset' || !isFireEquip(v)) return false;
        const t = getSearchText(v);
        return t.includes('ถัง') || t.includes('co2') || t.includes('เคมี') || t.includes('โฟม');
    });
    
    const uniqueModels = [...new Set(extinguishers.map(v => v['ยี่ห้อ/รุ่น'] ? v['ยี่ห้อ/รุ่น'].trim() : '').filter(m => m !== '' && m !== '-'))];

    if (uniqueModels.length === 0) {
        subFilterContainer.innerHTML = '';
        return;
    }

    let html = `<button class="sub-filter-btn active" data-subfilter="all">ทุกชนิด <span class="badge">${extinguishers.length}</span></button>`;
    
    uniqueModels.forEach(model => {
        const count = extinguishers.filter(v => v['ยี่ห้อ/รุ่น'] && v['ยี่ห้อ/รุ่น'].trim() === model).length;
        html += `<button class="sub-filter-btn" data-subfilter="${model}">${model} <span class="badge">${count}</span></button>`;
    });

    subFilterContainer.innerHTML = html;

    subFilterContainer.querySelectorAll('.sub-filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            subFilterContainer.querySelectorAll('.sub-filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentExtinguisherType = this.getAttribute('data-subfilter');
            applyFilters();
        });
    });
}

function generateNozzleSubFilters() {
    const subFilterContainer = document.getElementById('sub-filter-nozzle');
    if (!subFilterContainer) return;

    const nozzles = allVehicles.filter(v => {
        if (v.Data_Category !== 'Asset' || !isFireEquip(v)) return false;
        return getSearchText(v).includes('หัวฉีด');
    });
    
    const uniqueModels = [...new Set(nozzles.map(v => v['ยี่ห้อ/รุ่น'] ? v['ยี่ห้อ/รุ่น'].trim() : '').filter(m => m !== '' && m !== '-'))];

    if (uniqueModels.length === 0) {
        subFilterContainer.innerHTML = '';
        return;
    }

    let html = `<button class="sub-filter-btn active" data-subfilter="all">ทุกชนิด <span class="badge">${nozzles.length}</span></button>`;
    
    uniqueModels.forEach(model => {
        const count = nozzles.filter(v => v['ยี่ห้อ/รุ่น'] && v['ยี่ห้อ/รุ่น'].trim() === model).length;
        html += `<button class="sub-filter-btn" data-subfilter="${model}">${model} <span class="badge">${count}</span></button>`;
    });

    subFilterContainer.innerHTML = html;

    subFilterContainer.querySelectorAll('.sub-filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            subFilterContainer.querySelectorAll('.sub-filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentNozzleType = this.getAttribute('data-subfilter');
            applyFilters();
        });
    });
}

function applyFilters() {
    const searchInput = document.getElementById('searchInput');
    const searchText = searchInput ? searchInput.value.toLowerCase() : '';
    
    if (mainCategory === 'lostfound') {
        let filteredData = allLostFound;
        if (currentSubFilter !== 'all') {
            filteredData = filteredData.filter(v => v.type === currentSubFilter);
        }
        if (searchText.trim() !== '') {
            filteredData = filteredData.filter(v => 
                (v.title && v.title.toLowerCase().includes(searchText)) || 
                (v.location && v.location.toLowerCase().includes(searchText))
            );
        }
        displayLostFoundGallery(filteredData);
        return; 
    }

    let filteredData = allVehicles;

    if (mainCategory === 'staff') {
        filteredData = filteredData.filter(v => v.Data_Category === 'Staff');
        if (currentUnit.includes('ยุทธศาสตร์')) {
            filteredData = filteredData.filter(v => getUnit(v).includes('ยุทธศาสตร์') || (v.ประเภท && v.ประเภท.includes('หัวหน้างาน')));
        }
        if (currentUnit.includes('ปฏิบัติการ')) {
            filteredData = filteredData.filter(v => getUnit(v).includes('ปฏิบัติการ') || (v.ประเภท && v.ประเภท.includes('หัวหน้างาน')));
        }
    }
    else if (mainCategory === 'fire') filteredData = filteredData.filter(v => v.Data_Category === 'Asset' && isFireEquip(v));
    else if (mainCategory === 'form') filteredData = filteredData.filter(v => v.Data_Category === 'Form');
    else if (mainCategory === 'mission') {
        if (currentUnit.includes('ตารางเวร')) {
            filteredData = filteredData.filter(v => v.Data_Category === 'Schedule'); 
        } else {
            filteredData = filteredData.filter(v => v.Data_Category === 'Mission');
            
            if (currentUnit.includes('ตรวจพื้นที่')) {
                filteredData = filteredData.filter(v => v.ประเภท && v.ประเภท.includes('ตรวจพื้นที่'));
            } else if (currentUnit.includes('ช่วยเหลือ')) {
                filteredData = filteredData.filter(v => v.ประเภท && v.ประเภท.includes('ช่วยเหลือ'));
            } else if (currentUnit.includes('การจราจร')) {
                filteredData = filteredData.filter(v => v.ประเภท && v.ประเภท.includes('การจราจร'));
            }

            if (currentMissionYear !== 'all') {
                filteredData = filteredData.filter(v => extractYear(v.สี) === currentMissionYear);
            }
            
            filteredData.sort((a, b) => {
                let dA = parseCustomDate(a.สี);
                let dB = parseCustomDate(b.สี);
                let timeA = dA ? dA.getTime() : 0;
                let timeB = dB ? dB.getTime() : 0;
                return timeB - timeA; 
            });
        }
    } 
    else filteredData = filteredData.filter(v => v.Data_Category === 'Asset' && !isFireEquip(v));

    if (currentSubFilter !== 'all' && mainCategory !== 'form' && mainCategory !== 'mission') {
        if (currentSubFilter === 'ถังดับเพลิง') {
            filteredData = filteredData.filter(v => { const t = getSearchText(v); return t.includes('ถัง') || t.includes('co2') || t.includes('เคมี') || t.includes('โฟม'); });
        } else if (currentSubFilter === 'สายส่งน้ำดับเพลิง') {
            filteredData = filteredData.filter(v => getSearchText(v).includes('สายส่งน้ำ') || getSearchText(v).includes('สายฉีด'));
        } else if (currentSubFilter === 'ชุด ppe') {
            filteredData = filteredData.filter(v => {
                const t = getSearchText(v);
                return t.includes('ppe') || t.includes('pee') || t.includes('ชุดดับเพลิง');
            });
        } else if (mainCategory === 'staff') {
            if (currentSubFilter === 'จราจร') {
                filteredData = filteredData.filter(v => v.ประเภท && v.ประเภท.includes('จราจร') && !v.ประเภท.includes('หัวหน้า'));
            } else {
                filteredData = filteredData.filter(v => v.ประเภท && v.ประเภท.includes(currentSubFilter));
            }
        } else {
            filteredData = filteredData.filter(v => getSearchText(v).includes(currentSubFilter.toLowerCase()));
        }
    }

    if (mainCategory === 'fire' && currentSubFilter === 'ถังดับเพลิง' && currentExtinguisherType !== 'all') {
        filteredData = filteredData.filter(v => v['ยี่ห้อ/รุ่น'] && v['ยี่ห้อ/รุ่น'].trim() === currentExtinguisherType);
    }
    
    if (mainCategory === 'fire' && currentSubFilter === 'หัวฉีด' && currentNozzleType !== 'all') {
        filteredData = filteredData.filter(v => v['ยี่ห้อ/รุ่น'] && v['ยี่ห้อ/รุ่น'].trim() === currentNozzleType);
    }

    if (searchText.trim() !== '') filteredData = filteredData.filter(v => getSearchText(v).includes(searchText));
    
    displayGallery(filteredData); 
}

const searchInputEl = document.getElementById('searchInput');
if(searchInputEl) searchInputEl.addEventListener('input', applyFilters);

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        this.parentElement.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentSubFilter = this.getAttribute('data-filter');
        
        const subFilterExt = document.getElementById('sub-filter-extinguisher');
        const subFilterNoz = document.getElementById('sub-filter-nozzle'); 
        
        if(currentSubFilter === 'ถังดับเพลิง' && subFilterExt) {
            subFilterExt.style.display = 'flex';
        } else if (subFilterExt) {
            subFilterExt.style.display = 'none';
            currentExtinguisherType = 'all'; 
            subFilterExt.querySelectorAll('.sub-filter-btn').forEach(b => b.classList.remove('active'));
            const allSubBtn = subFilterExt.querySelector('.sub-filter-btn[data-subfilter="all"]');
            if(allSubBtn) allSubBtn.classList.add('active');
        }

        if(currentSubFilter === 'หัวฉีด' && subFilterNoz) {
            subFilterNoz.style.display = 'flex';
        } else if (subFilterNoz) {
            subFilterNoz.style.display = 'none';
            currentNozzleType = 'all'; 
            subFilterNoz.querySelectorAll('.sub-filter-btn').forEach(b => b.classList.remove('active'));
            const allSubBtn = subFilterNoz.querySelector('.sub-filter-btn[data-subfilter="all"]');
            if(allSubBtn) allSubBtn.classList.add('active');
        }

        applyFilters();
    });
});

function displayGallery(dataToDisplay) {
    const gallery = document.getElementById('vehicleGallery');
    if(!gallery) return;
    
    gallery.innerHTML = ''; 
    gallery.className = 'gallery-grid'; 

    if (mainCategory === 'form') {
        gallery.className = 'form-list-mode'; 
        const fragment = document.createDocumentFragment();

        dataToDisplay.forEach((item) => {
            const formBar = document.createElement('a');
            formBar.className = 'form-bar'; 
            let formName = item['ชื่อแบบฟอร์ม'] || 'แบบฟอร์มไม่มีชื่อ';

            if (formName.includes('ยานพาหนะ') || formName.includes('รถ')) {
                formBar.href = "index.html?main=vehicle";
            } else if (formName.includes('ถังดับเพลิง') || formName.includes('อุปกรณ์ดับเพลิง')) {
                formBar.href = "index.html?main=fire&unit=" + encodeURIComponent("ถังดับเพลิง");
            } else {
                formBar.href = item['ลิงก์'] && item['ลิงก์'].trim() !== "" ? item['ลิงก์'] : "#";
                formBar.target = "_blank"; 
            }

            formBar.innerHTML = `<div class="form-name">${formName}</div>`;
            fragment.appendChild(formBar);
        });

        const wasteFormBar = document.createElement('a');
        wasteFormBar.className = 'form-bar'; 
        wasteFormBar.href = "waste_form.html"; 
        wasteFormBar.innerHTML = `<div class="form-name">แบบฟอร์มบันทึกการคัดแยกขยะ</div>`;
        fragment.appendChild(wasteFormBar);

        gallery.appendChild(fragment);
        return; 
    }

    if (dataToDisplay.length === 0) {
        gallery.innerHTML = '<p class="loading" style="grid-column: 1 / -1;">ไม่มีข้อมูลที่ตรงกับการค้นหา</p>';
        return;
    }

    if (dataToDisplay[0].Data_Category === 'Schedule') {
        gallery.className = ''; 
        
        const tableContainer = document.createElement('div');
        tableContainer.className = 'schedule-table-container';

        const scheduleMonth = dataToDisplay[0].Schedule_Month || 'ตารางเวรปฏิบัติงาน';
        const dateHeader = document.createElement('div');
        dateHeader.className = 'schedule-date-header';
        dateHeader.innerText = scheduleMonth; 
        tableContainer.appendChild(dateHeader);

        const table = document.createElement('table');
        table.className = 'schedule-table';
        
        const headers = Object.keys(dataToDisplay[0]).filter(k => k !== 'Data_Category' && k !== 'Schedule_Month');
        
        let topHeaderRow = '<tr class="shift-header">';
        let shiftCount = 1;
        headers.forEach(h => {
            if (h === 'วันที่') {
                topHeaderRow += `<th>วันที่</th>`;
            } else {
                topHeaderRow += `<th>ผลัด ${shiftCount}</th>`;
                shiftCount++;
            }
        });
        topHeaderRow += '</tr>';
        
        let nameHeaderRow = '<tr class="name-header">';
        headers.forEach(h => {
            if (h === 'วันที่') {
                nameHeaderRow += `<th></th>`; 
            } else {
                nameHeaderRow += `<th>${h}</th>`; 
            }
        });
        nameHeaderRow += '</tr>';
        
        let thead = `<thead>${topHeaderRow}${nameHeaderRow}</thead>`;
        
        let tbody = '<tbody>';
        dataToDisplay.forEach(item => {
            tbody += '<tr>';
            headers.forEach(h => {
                let cellValue = item[h] || '-';
                if(cellValue.trim() === 'พักกะ') {
                     tbody += `<td class="cell-rest">${cellValue}</td>`;
                } else {
                     tbody += `<td>${cellValue}</td>`;
                }
            });
            tbody += '</tr>';
        });
        tbody += '</tbody>';
        
        table.innerHTML = thead + tbody;
        tableContainer.appendChild(table);
        gallery.appendChild(tableContainer);
        return; 
    }

    const fragment = document.createDocumentFragment();
    dataToDisplay.forEach((item) => {
        const originalIndex = allVehicles.indexOf(item);
        const card = document.createElement('div'); 
        card.className = 'vehicle-card';

        const images = [item.URL_รูปภาพ_1, item.URL_รูปภาพ_2, item.URL_รูปภาพ_3, item.URL_รูปภาพ_4, item.URL_รูปภาพ_5].filter(url => url && url !== "");
        const imageWrapper = document.createElement('div'); imageWrapper.className = 'card-image-wrapper';
        const track = document.createElement('div'); track.className = 'image-slide-track';
        
        if(images.length === 0) images.push('placeholder.png');
        
        images.forEach(url => {
            const img = document.createElement('img'); 
            img.src = getDirectImageUrl(url); 
            img.setAttribute('loading', 'lazy'); 
            img.onerror = function() { this.src = 'placeholder.png'; };
            track.appendChild(img);
        });
        imageWrapper.appendChild(track);
        
        if (item.Data_Category === 'Asset') {
            let statusText = item.RequiresRepair ? 'ใช้งานไม่ได้' : 'ใช้งานได้';
            let statusBg = item.RequiresRepair ? '#e74c3c' : '#27ae60';
            let statusBadge = document.createElement('span');
            statusBadge.style.cssText = `position: absolute; top: 10px; right: 10px; background: ${statusBg}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 13px; font-weight: bold; z-index: 10; box-shadow: 0 2px 5px rgba(0,0,0,0.2);`;
            statusBadge.innerText = statusText;
            imageWrapper.appendChild(statusBadge);
        }

        const contentContainer = document.createElement('div'); 
        contentContainer.className = 'card-content';
        
        const alignStyle = 'center';
        contentContainer.style.alignItems = 'center';
        contentContainer.style.textAlign = alignStyle;
        
        let subtitle = item.สี; 
        if (item.Data_Category === 'Staff') {
            subtitle = item['หัวหน้าหน่วย'] ? item['หัวหน้าหน่วย'] : item.ประเภท;
        } else if (item.Data_Category === 'Mission') {
            let dateObj = parseCustomDate(item.สี);
            if(dateObj) {
                subtitle = dateObj.toLocaleString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            }
        }

        let sizeHtml = '';
        if (item['ขนาด'] && item['ขนาด'].toString().trim() !== '' && item['ขนาด'].toString().trim() !== '-') {
            sizeHtml = `<div style="font-size: 14px; color: #2980b9; margin-bottom: 5px; font-weight: 500; text-align: ${alignStyle}; width: 100%;">ขนาด: ${item['ขนาด']}</div>`;
        }

        let fireClassHtml = '';
        if (isFireEquip(item) && item['ยี่ห้อ/รุ่น'] && item['ยี่ห้อ/รุ่น'].includes('ถังดับเพลิง')) {
            let classes = getFireExtinguisherClasses(item['ยี่ห้อ/รุ่น']);
            if(classes.length > 0) {
                 let badgesHtml = classes.map(c => `<span class="fire-class-badge class-${c.toLowerCase()}" style="display:inline-flex; margin-right:4px;">${c}</span>`).join('');
                 fireClassHtml = `<div style="display: flex; align-items: center; margin-bottom: 8px; justify-content: center;">${badgesHtml}</div>`;
            }
        }

        let plateHtml = '';
        if (item.ทะเบียน && item.ทะเบียน.trim() !== '' && item.ทะเบียน.trim() !== '-') {
            let plateDisplay = '';
            let isLarge = false; 
            
            if (item.Data_Category === 'Staff') {
                plateDisplay = `รหัสพนักงาน: ${item.ทะเบียน}`;
            } else if (isFireEquip(item)) {
                isLarge = true; 
                let t = getSearchText(item);
                let sameModelCount = allVehicles.filter(v => v['ยี่ห้อ/รุ่น'] === item['ยี่ห้อ/รุ่น']).length;
                
                if (t.includes('สายส่งน้ำ') || t.includes('สายฉีด')) {
                    plateDisplay = `สายที่ ${item.ทะเบียน}`;
                } else if (t.includes('หัวฉีด')) {
                    plateDisplay = sameModelCount === 1 ? `1 อัน` : `อันที่ ${item.ทะเบียน}`;
                } else if (t.includes('ตู้')) {
                    plateDisplay = sameModelCount === 1 ? `1 ตู้` : `ตู้ที่ ${item.ทะเบียน}`;
                } else if (t.includes('ถัง')) {
                    plateDisplay = `ถังที่ ${item.ทะเบียน}`;
                } else if (t.includes('หัวรับน้ำ')) { 
                    plateDisplay = `จุดที่ ${item.ทะเบียน}`;
                } else if (t.includes('ppe') || t.includes('pee')) { 
                    plateDisplay = `ชุดที่ ${item.ทะเบียน}`;
                } else {
                    plateDisplay = `ลำดับที่ ${item.ทะเบียน}`;
                }
            } else if (item.Data_Category === 'Asset') {
                plateDisplay = `ทะเบียน: ${item.ทะเบียน}`; 
            } else {
                plateDisplay = `รหัส/ทะเบียน: ${item.ทะเบียน}`;
            }

            let plateClass = isLarge ? 'card-plate large' : 'card-plate';
            plateHtml = `<div class="${plateClass}" style="text-align: ${alignStyle}; width: 100%; margin-bottom: 6px;">${plateDisplay}</div>`;
        }

        let cardHTML = '';
        if (isFireEquip(item)) {
            cardHTML = `
                ${plateHtml}
                <h3 class="card-title" title="${item['ยี่ห้อ/รุ่น']}" style="text-align: ${alignStyle}; width: 100%; margin-bottom: 8px;">${item['ยี่ห้อ/รุ่น']}</h3>
                ${sizeHtml}
                ${fireClassHtml}
            `;
        } else if (item.Data_Category === 'Asset') {
            cardHTML = `
                <h3 class="card-title" title="${item['ยี่ห้อ/รุ่น']}" style="text-align: ${alignStyle}; width: 100%;">${item['ยี่ห้อ/รุ่น']}</h3>
                ${sizeHtml}
                ${plateHtml}
            `;
        } else {
            cardHTML = `
                <h3 class="card-title" title="${item['ยี่ห้อ/รุ่น']}" style="text-align: ${alignStyle}; width: 100%;">${item['ยี่ห้อ/รุ่น']}</h3>
                ${sizeHtml}
                ${plateHtml}
                <div class="card-subtitle" style="width: 100%; text-align: ${alignStyle}; margin-top: 8px;">${subtitle}</div>
            `;
        }
        
        contentContainer.innerHTML = cardHTML;
        
        contentContainer.onclick = () => openModal(originalIndex); 
        imageWrapper.onclick = () => openModal(originalIndex);
        
        card.appendChild(imageWrapper); 
        card.appendChild(contentContainer); 
        fragment.appendChild(card);
    });

    gallery.appendChild(fragment);
}

function displayLostFoundGallery(dataToDisplay) {
    const gallery = document.getElementById('vehicleGallery');
    if(!gallery) return;
    gallery.innerHTML = ''; 
    gallery.className = 'gallery-grid'; 

    if (dataToDisplay.length === 0) {
        gallery.innerHTML = '<p class="loading" style="grid-column: 1 / -1; color: #000;">ไม่มีข้อมูลที่ตรงกับการค้นหา</p>';
        return;
    }

    const fragment = document.createDocumentFragment();
    dataToDisplay.forEach((item) => {
        const card = document.createElement('div'); 
        card.className = 'vehicle-card';
        
        let borderColor = "rgba(0,0,0,0.15)";
        let bgColor = "#fff";
        
        let finalStatusText = (item.status && item.status.trim() !== '') ? item.status.trim() : 'รอดำเนินการ';
        
        if (finalStatusText === 'รอดำเนินการ') {
            borderColor = "#bdc3c7"; 
            bgColor = "#fff"; 
        } else if (finalStatusText.includes("รับของคืนแล้ว") || finalStatusText.includes("รับคืนแล้ว")) {
            borderColor = "#15803d"; 
            bgColor = "#f0faf4"; 
            finalStatusText = "รับของคืนแล้ว";
        } else {
            borderColor = "#d35400"; 
            bgColor = "#fffdf5"; 
        }

        card.style.border = `2px solid ${borderColor}`;
        card.style.backgroundColor = bgColor;
        card.style.cursor = 'pointer';

        let badgeColor = "#95a5a6";
        if(item.type === "สิ่งของสูญหาย") badgeColor = "#e74c3c";
        else if (item.type === "พบสิ่งของ") badgeColor = "#27ae60";
        
        let imgHtml = item.imgUrl 
            ? `<img src="${item.imgUrl}" loading="lazy" style="width: 100%; height: 100%; object-fit: contain; border-bottom: 1px solid #eee;" onerror="this.src='placeholder.png';">` 
            : `<div style="height:100%; display:flex; align-items:center; justify-content:center; color:#000; font-size: 15px; border-bottom: 1px solid #eee;">ไม่มีภาพประกอบ</div>`;

        card.innerHTML = `
            <div class="card-image-wrapper" style="position: relative; height: 260px; background-color: #f1f2f6;">
                <span style="position: absolute; top: 10px; right: 10px; background: ${badgeColor}; color: white; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; z-index: 10; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">${item.type}</span>
                ${imgHtml}
            </div>
            <div class="card-content" style="padding: 15px; color: #000; text-align: left; align-items: flex-start;">
                <div style="font-size: 15px; font-weight: bold; margin-bottom: 5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 100%; text-align: left;" title="${item.title || 'ไม่มีระบุ'}">${item.title || 'ไม่มีระบุ'}</div>
                <div style="font-size: 15px; margin-bottom: 5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 100%; text-align: left;">${item.location || 'ไม่ระบุสถานที่'}</div>
                <div style="font-size: 15px; margin-bottom: 10px; width: 100%; text-align: left;">${item.dateVal || '-'}</div>
                <div style="border-top: 1px solid rgba(0,0,0,0.1); padding-top: 8px; font-weight: bold; font-size: 15px; text-align: left; width: 100%; color: ${borderColor};">${finalStatusText}</div>
            </div>
        `;
        
        card.onclick = () => openLFModal(item.actionText, item.imgUrl);
        fragment.appendChild(card);
    });
    gallery.appendChild(fragment);
}

window.openLFModal = function(actionText, imgUrl) {
    const modalText = document.getElementById('lfModalText');
    const modalImgContainer = document.getElementById('lfModalImageContainer');
    const modalImg = document.getElementById('lfModalImage');

    if (!actionText || actionText.trim() === '') {
        modalText.innerHTML = '<span style="color: #7f8c8d; font-weight: bold;">ยังไม่ได้ดำเนินการ</span>';
    } else {
        modalText.innerHTML = `<span style="color: #2980b9; font-weight: bold;">${actionText.replace(/"/g, '')}</span>`;
    }

    if (imgUrl && imgUrl.trim() !== '') {
        let highResUrl = imgUrl.replace('sz=w320', 'sz=w1000').replace('sz=w500', 'sz=w1000');
        modalImg.src = highResUrl;
        modalImgContainer.style.display = 'block';
    } else {
        modalImg.src = '';
        modalImgContainer.style.display = 'none';
    }

    document.getElementById('lfActionModal').style.display = 'block';
};

function openModal(index) {
    currentVehicleIndex = index; currentImageIndex = 0; 
    const vehicle = allVehicles[index];
    const images = [vehicle.URL_รูปภาพ_1, vehicle.URL_รูปภาพ_2, vehicle.URL_รูปภาพ_3, vehicle.URL_รูปภาพ_4, vehicle.URL_รูปภาพ_5].filter(url => url && url !== "");
    
    let autoFillURL = `form.html?type=${encodeURIComponent(vehicle.ประเภท)}&detail=${encodeURIComponent(vehicle['ยี่ห้อ/รุ่น'])}&color=${encodeURIComponent(vehicle.สี)}&plate=${encodeURIComponent(vehicle.ทะเบียน)}&equip=${encodeURIComponent(vehicle.หมายเลขครุภัณฑ์)}`;
    
    let detailText = '';

    let modalSizeHtml = (vehicle['ขนาด'] && vehicle['ขนาด'].toString().trim() !== '' && vehicle['ขนาด'].toString().trim() !== '-') 
        ? `<p><strong>ขนาด:</strong> ${vehicle['ขนาด']}</p>` : '';

    let purchaseYearHtml = (vehicle['ปีที่ซื้อ'] && vehicle['ปีที่ซื้อ'].toString().trim() !== '' && vehicle['ปีที่ซื้อ'].toString().trim() !== '-') 
        ? `<p><strong>ปีที่ซื้อ:</strong> ${vehicle['ปีที่ซื้อ']}</p>` : '';
        
    let companyHtml = (vehicle['บริษัทที่ซื้อ'] && vehicle['บริษัทที่ซื้อ'].toString().trim() !== '' && vehicle['บริษัทที่ซื้อ'].toString().trim() !== '-') 
        ? `<p><strong>ซื้อจากบริษัท:</strong> ${vehicle['บริษัทที่ซื้อ']}</p>` : '';

    let showInspectBtn = false;
    let showRefillBtn = false;
    let showCleanBtn = false; 
    
    if (vehicle.Data_Category === 'Asset') {
        if (!isFireEquip(vehicle)) {
            showInspectBtn = true; 
            showCleanBtn = true; 
        } else {
            let t = getSearchText(vehicle);
            if (t.includes('ถัง') || t.includes('co2') || t.includes('เคมี') || t.includes('โฟม') || t.includes('fireade') || t.includes('impact') || t.includes('fast')) {
                showInspectBtn = true; 
                showRefillBtn = true; 
            }
        }
    }
    
    let actionButtonsHtml = '';
    if (showInspectBtn || showRefillBtn || showCleanBtn) {
        actionButtonsHtml += `<div class="action-buttons" style="flex-direction: column; gap: 10px; margin-top: 20px;">`;
        if (showInspectBtn) {
            actionButtonsHtml += `<a href="${autoFillURL}" class="action-btn btn-inspect" style="width: 100%;">ตรวจสอบสภาพ</a>`;
        }
        if (showCleanBtn) {
            actionButtonsHtml += `<button onclick="openCleanFormModal(${index})" class="action-btn" style="width: 100%; background-color: #3498db; border: none; cursor: pointer; font-family: 'Kanit', sans-serif; font-size: 16px; padding: 10px; border-radius: 4px; color: white;">ทำความสะอาดยานพาหนะ</button>`;
        }
        if (showRefillBtn) {
            actionButtonsHtml += `<button onclick="openRefillHistoryModal(${index})" class="action-btn" style="width: 100%; background-color: #f39c12; border: none; cursor: pointer; font-family: 'Kanit', sans-serif; font-size: 16px; padding: 10px; border-radius: 4px; color: white;">ดูประวัติการเติมสาร</button>`;
            actionButtonsHtml += `<button onclick="openRefillFormModal(${index})" class="action-btn" style="width: 100%; background-color: #27ae60; border: none; cursor: pointer; text-align: center; text-decoration: none; padding: 10px; border-radius: 4px; color: white; font-family: 'Kanit', sans-serif; font-size: 16px;">บันทึกการเติมสารใหม่</button>`;
        }
        actionButtonsHtml += `</div>`;
    }
    
    if (vehicle.Data_Category === 'Staff') {
        let unitText = getUnit(vehicle) ? `<p><strong>สังกัดหน่วย:</strong> ${vehicle['หน่วย'] || vehicle['หน่วยงาน']}</p>` : '';
        let headText = vehicle['หัวหน้าหน่วย'] ? `<p><strong>หน้าที่รับผิดชอบ:</strong> ${vehicle['หัวหน้าหน่วย']}</p>` : '';
        
        detailText = `<h2>${vehicle['ยี่ห้อ/รุ่น']}</h2>
         <p><strong>ตำแหน่ง:</strong> ${vehicle.ประเภท}</p>
         ${headText}
         ${unitText}
         <p><strong>เบอร์โทรศัพท์:</strong> ${vehicle.สี}</p>
         <p><strong>รหัสพนักงาน:</strong> ${vehicle.ทะเบียน}</p>`;
         document.getElementById('modalDetails').innerHTML = `${detailText}`; 
         
    } else if (vehicle.Data_Category === 'Mission') {
        let dateObj = parseCustomDate(vehicle.สี);
        let timeString = dateObj ? dateObj.toLocaleString('th-TH', { dateStyle: 'full', timeStyle: 'medium' }) : vehicle.สี;
        
        detailText = `<h2>${vehicle['ยี่ห้อ/รุ่น']}</h2>
         <p><strong>วัน/เวลาที่บันทึก:</strong> ${timeString}</p>
         <p><strong>หมวดหมู่:</strong> ${vehicle.ประเภท || 'การดูแลพื้นที่ส่วนกลาง'}</p>`;
         document.getElementById('modalDetails').innerHTML = `${detailText}`; 
         
    } else if (isFireEquip(vehicle)) {
        let t = getSearchText(vehicle);
        let sameModelCount = allVehicles.filter(v => v['ยี่ห้อ/รุ่น'] === vehicle['ยี่ห้อ/รุ่น']).length;
        let equipLabel = '';
        let equipValue = vehicle.ทะเบียน;

        if (t.includes('สายส่งน้ำ') || t.includes('สายฉีด')) {
            equipLabel = 'สายที่:';
        } else if (t.includes('หัวฉีด')) {
            if (sameModelCount === 1) { equipLabel = 'จำนวน:'; equipValue = '1 อัน'; }
            else { equipLabel = 'อันที่:'; }
        } else if (t.includes('ตู้')) {
            if (sameModelCount === 1) { equipLabel = 'จำนวน:'; equipValue = '1 ตู้'; }
            else { equipLabel = 'ตู้ที่:'; }
        } else if (t.includes('ถัง')) {
            equipLabel = 'ถังที่:';
        } else if (t.includes('หัวรับน้ำ')) { 
            equipLabel = 'จุดที่:';
        } else if (t.includes('ppe') || t.includes('pee')) { 
            equipLabel = 'ชุดที่:';
        } else {
            equipLabel = 'ลำดับที่:';
        }

        let modalFireClassHtml = '';
        if (t.includes('ถัง')) {
            let classes = getFireExtinguisherClasses(vehicle['ยี่ห้อ/รุ่น']);
            if(classes.length > 0) {
                let badgesHtml = classes.map(c => `<span class="fire-class-badge class-${c.toLowerCase()}" style="display:inline-flex; margin-right:6px;">${c}</span>`).join('');
                modalFireClassHtml = `<div style="display: flex; align-items: center; margin-bottom: 10px;"><strong>ประเภทไฟที่ดับได้:</strong> <div style="margin-left: 10px;">${badgesHtml}</div></div>`;
            }
        }

        detailText = `<h2>${vehicle['ยี่ห้อ/รุ่น']}</h2>
         ${modalFireClassHtml}
         <p><strong>ประเภท:</strong> ${vehicle.ประเภท}</p>
         ${modalSizeHtml}
         <p><strong>ตำแหน่งที่ตั้ง:</strong> ${vehicle.สี}</p>
         <p><strong>${equipLabel}</strong> ${equipValue}</p>
         <p><strong>หมายเลขครุภัณฑ์:</strong> ${vehicle.หมายเลขครุภัณฑ์}</p>
         ${purchaseYearHtml}
         ${companyHtml}`;
         
         document.getElementById('modalDetails').innerHTML = `${detailText}${actionButtonsHtml}`;
         
    } else {
        detailText = `<h2>${vehicle['ยี่ห้อ/รุ่น']}</h2>
         <p><strong>ประเภท:</strong> ${vehicle.ประเภท}</p>
         <p><strong>สี:</strong> ${vehicle.สี}</p>
         <p><strong>ทะเบียน:</strong> ${vehicle.ทะเบียน}</p>
         <p><strong>หมายเลขครุภัณฑ์:</strong> ${vehicle.หมายเลขครุภัณฑ์}</p>
         ${purchaseYearHtml}
         ${companyHtml}`;
         
         document.getElementById('modalDetails').innerHTML = `${detailText}${actionButtonsHtml}`;
    }

    const prevBtn = document.getElementById('prevImageBtn');
    const nextBtn = document.getElementById('nextImageBtn');
    if(prevBtn) prevBtn.style.display = images.length > 1 ? "block" : "none";
    if(nextBtn) nextBtn.style.display = images.length > 1 ? "block" : "none";
    
    const modal = document.getElementById('vehicleModal');
    if(modal) modal.style.display = "block"; 
    
    changeImage(); 
}

window.openRefillHistoryModal = function(index) {
    const vehicle = allVehicles[index];
    currentRefillVehicle = vehicle;
    const equipNumber = vehicle.หมายเลขครุภัณฑ์;
    const plate = vehicle.ทะเบียน;

    currentRefillHistory = allVehicles.filter(v => 
        (v.Data_Category === 'Refill' || v.Data_Category === 'ประวัติการเติม' || v.Data_Category === 'ประวัติการเติมสารถังดับเพลิง') && 
        ((equipNumber && equipNumber !== '-' && v.หมายเลขครุภัณฑ์ === equipNumber) || 
         (plate && plate !== '-' && v.ทะเบียน === plate))
    );

    currentRefillHistory.reverse();

    currentRefillHistoryPage = 1;

    renderRefillHistoryPage();
    document.getElementById('refillHistoryModal').style.display = 'block';
};

function renderRefillHistoryPage() {
    const vehicle = currentRefillVehicle;
    const equipNumber = vehicle.หมายเลขครุภัณฑ์;
    const plate = vehicle.ทะเบียน;

    let html = `<p style="margin-bottom: 5px;"><strong>ถังดับเพลิง:</strong> <span style="color: #2980b9;">${vehicle['ยี่ห้อ/รุ่น']}</span></p>
                <p style="margin-bottom: 5px;"><strong>หมายเลขครุภัณฑ์:</strong> ${equipNumber || '-'}</p>
                <p style="margin-bottom: 5px;"><strong>รหัส/ถังที่:</strong> ${plate || '-'}</p>
                <hr style="margin: 15px 0; border: 0; border-top: 1px solid #ddd;">`;

    if (currentRefillHistory.length === 0) {
        html += `<p style="text-align:center; color:#7f8c8d; padding: 20px 0; font-size: 15px;">
                    ไม่มีประวัติการเติมสารสำหรับถังนี้
                 </p>`;
    } else {
        const start = (currentRefillHistoryPage - 1) * REFILL_HISTORY_PER_PAGE;
        const end = start + REFILL_HISTORY_PER_PAGE;
        const itemsToShow = currentRefillHistory.slice(start, end);

        html += `<div style="min-height: 230px;">`; 
        itemsToShow.forEach(record => {
            let dateStr = record['วันที่เติม'] || record['วันที่'] || record.สี || '-';
            let company = record['บริษัทที่เติม'] || record['บริษัท'] || record['ผู้ดำเนินการ'] || record.ประเภท || '-';
            let chemical = record['สารเคมีที่เติม'] || '-';
            
            let weightBefore = record['น้ำหนักก่อนเติม'] || '-';
            let weightAfter = record['น้ำหนักหลังเติม'] || '-';
            
            let note = record['หมายเหตุ'] || record['รายละเอียด'] || '-';
            let docLink = record['เอกสารการเติม'] || '';
            
            let dateObj = new Date(dateStr);
            if (!isNaN(dateObj)) {
                dateStr = dateObj.toLocaleString('th-TH', { dateStyle: 'long' });
            }

            let docHtml = docLink ? `<div style="margin-top: 8px;"><a href="${docLink}" target="_blank" style="color: #2980b9; text-decoration: underline; font-size: 15px;">เปิดดูใบ PO / ใบเสร็จ</a></div>` : '';

            html += `
            <div style="background: #fdfaf3; border-left: 5px solid #f39c12; padding: 12px 15px; margin-bottom: 12px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div style="font-size: 15px; color: #444; margin-bottom: 4px;"><strong>วันที่เติม:</strong> <span style="color: #d35400; font-weight: bold;">${dateStr}</span></div>
                <div style="font-size: 15px; color: #444; margin-bottom: 4px;"><strong>น้ำหนักก่อนเติม:</strong> <span style="color: #c0392b;">${weightBefore}</span> Kg. | <strong>หลังเติม:</strong> <span style="color: #27ae60;">${weightAfter}</span> Kg.</div>
                <div style="font-size: 15px; color: #444; margin-bottom: 4px;"><strong>สารเคมีที่เติม:</strong> ${chemical}</div>
                <div style="font-size: 15px; color: #444; margin-bottom: 4px;"><strong>บริษัทที่รับเติม:</strong> ${company}</div>
                <div style="font-size: 15px; color: #7f8c8d;"><strong>หมายเหตุ:</strong> ${note}</div>
                ${docHtml}
            </div>`;
        });
        html += `</div>`;

        const totalPages = Math.ceil(currentRefillHistory.length / REFILL_HISTORY_PER_PAGE);
        if (totalPages > 1) {
            html += `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px; border-top: 1px solid #eee; padding-top: 15px;">
                <button onclick="changeRefillHistoryPage(-1)" ${currentRefillHistoryPage === 1 ? 'disabled style="opacity:0.5; cursor:not-allowed; padding:8px 16px; border:none; border-radius:6px; background:#bdc3c7; color:#fff; font-family:\'Kanit\'; font-weight:bold;"' : 'style="cursor:pointer; padding:8px 16px; border:none; border-radius:6px; background:#34495e; color:#fff; font-family:\'Kanit\'; font-weight:bold; transition:0.3s;"'}>ก่อนหน้า</button>
                <span style="font-size: 15px; color: #34495e; font-weight: 600;">หน้า ${currentRefillHistoryPage} / ${totalPages}</span>
                <button onclick="changeRefillHistoryPage(1)" ${currentRefillHistoryPage === totalPages ? 'disabled style="opacity:0.5; cursor:not-allowed; padding:8px 16px; border:none; border-radius:6px; background:#bdc3c7; color:#fff; font-family:\'Kanit\'; font-weight:bold;"' : 'style="cursor:pointer; padding:8px 16px; border:none; border-radius:6px; background:#f39c12; color:#fff; font-family:\'Kanit\'; font-weight:bold; transition:0.3s;"'}>ถัดไป</button>
            </div>`;
        }
    }

    document.getElementById('refillDetailsContent').innerHTML = html;
}

window.changeRefillHistoryPage = function(dir) {
    const totalPages = Math.ceil(currentRefillHistory.length / REFILL_HISTORY_PER_PAGE);
    if (currentRefillHistoryPage + dir >= 1 && currentRefillHistoryPage + dir <= totalPages) {
        currentRefillHistoryPage += dir;
        renderRefillHistoryPage();
    }
};

window.openRefillFormModal = function(index) {
    const vehicle = allVehicles[index];
    
    document.getElementById('rf_plate').value = vehicle.ทะเบียน || '-';
    document.getElementById('rf_equip').value = vehicle.หมายเลขครุภัณฑ์ || '-';
    document.getElementById('rf_date').value = new Date().toISOString().split('T')[0];
    
    document.getElementById('vehicleModal').style.display = 'none';
    document.getElementById('refillFormModal').style.display = 'block';
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

document.getElementById('cl_images').addEventListener('change', function(event) {
    const files = event.target.files;
    const preview = document.getElementById('cl_file_preview');
    preview.innerHTML = '';
    
    for(let i=1; i<=5; i++) {
        const b64 = document.getElementById(`cl_b64_${i}`);
        const m = document.getElementById(`cl_m_${i}`);
        const n = document.getElementById(`cl_n_${i}`);
        if(b64) b64.value = '';
        if(m) m.value = '';
        if(n) n.value = '';
    }

    let fileCount = Math.min(files.length, 5);
    if(files.length > 5) {
        alert("ระบบจำกัดให้ส่งรูปได้สูงสุด 5 รูป ระบบจะใช้แค่ 5 รูปแรกเท่านั้นครับ");
    }

    for (let i = 0; i < fileCount; i++) {
        let file = files[i];
        let reader = new FileReader();
        reader.onload = function(e) {
            let base64Data = e.target.result.split(',')[1];
            document.getElementById(`cl_b64_${i+1}`).value = base64Data;
            document.getElementById(`cl_m_${i+1}`).value = file.type;
            document.getElementById(`cl_n_${i+1}`).value = file.name;
            
            preview.innerHTML += `<div style="font-size:14px; color:#27ae60; margin-top:5px;">รูปที่ ${i+1}: ${file.name}</div>`;
        };
        reader.readAsDataURL(file);
    }
});

document.getElementById('cleanForm').addEventListener('submit', e => {
    e.preventDefault();
    const btn = document.getElementById('cl_submitBtn'); 
    const msg = document.getElementById('cl_message');
    btn.innerText = "กำลังบันทึกและอัปโหลดรูป..."; 
    btn.disabled = true;

    const form = document.getElementById('cleanForm');
    const formData = new FormData(form);

    fetch(scriptURL, { method: 'POST', body: formData })
        .then(response => {
            msg.innerText = "บันทึกการทำความสะอาดสำเร็จ!"; 
            msg.style.color = "green";
            form.reset(); 
            document.getElementById('cl_file_preview').innerHTML = '';
            
            setTimeout(() => { 
                document.getElementById('cleanFormModal').style.display = 'none';
                msg.innerText = "";
                btn.innerText = "บันทึกข้อมูลการทำความสะอาด";
                btn.disabled = false;
            }, 2000); 
        })
        .catch(error => {
            console.error('Fetch Error:', error);
            msg.innerText = "เกิดปัญหาการเชื่อมต่อ กรุณาลองส่งใหม่อีกครั้ง"; 
            msg.style.color = "#e74c3c";
            btn.innerText = "บันทึกข้อมูลการทำความสะอาด";
            btn.disabled = false;
        });
});

document.getElementById('rf_poFile').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        document.getElementById('rf_fileNameDisplay').innerText = "ไฟล์ที่เลือก: " + file.name;
        const reader = new FileReader();
        reader.onload = function(e) {
            const base64Data = e.target.result.split(',')[1]; 
            document.getElementById('rf_poFileBase64').value = base64Data;
            document.getElementById('rf_poFileName').value = file.name;
            document.getElementById('rf_poFileMimeType').value = file.type;
        };
        reader.readAsDataURL(file);
    } else {
        document.getElementById('rf_fileNameDisplay').innerText = "";
        document.getElementById('rf_poFileBase64').value = "";
        document.getElementById('rf_poFileName').value = "";
        document.getElementById('rf_poFileMimeType').value = "";
    }
});

document.getElementById('refillForm').addEventListener('submit', e => {
    e.preventDefault();
    const btn = document.getElementById('rf_submitBtn'); 
    const msg = document.getElementById('rf_message');
    btn.innerText = "กำลังบันทึกข้อมูล..."; 
    btn.disabled = true;

    const form = document.getElementById('refillForm');
    const formData = new FormData(form);

    fetch(scriptURL, { method: 'POST', body: formData })
        .then(response => {
            msg.innerText = "บันทึกประวัติสำเร็จ! กำลังรีเฟรชข้อมูล..."; 
            msg.style.color = "green";
            form.reset(); 
            document.getElementById('rf_fileNameDisplay').innerText = '';
            
            fetchVehicles(); 
            setTimeout(() => { 
                document.getElementById('refillFormModal').style.display = 'none';
                msg.innerText = "";
                btn.innerText = "บันทึกข้อมูลการเติมสาร";
                btn.disabled = false;
            }, 2000); 
        })
        .catch(error => {
            console.error('Fetch Error:', error);
            msg.innerText = "เกิดปัญหาการเชื่อมต่อ กรุณาลองส่งใหม่อีกครั้ง"; 
            msg.style.color = "#e74c3c";
            btn.innerText = "บันทึกข้อมูลการเติมสาร";
            btn.disabled = false;
        });
});

function changeImage() {
    const vehicle = allVehicles[currentVehicleIndex];
    const images = [vehicle.URL_รูปภาพ_1, vehicle.URL_รูปภาพ_2, vehicle.URL_รูปภาพ_3, vehicle.URL_รูปภาพ_4, vehicle.URL_รูปภาพ_5].filter(url => url && url !== "");
    const modalImage = document.getElementById('modalImage');
    const imageNumber = document.getElementById('imageNumber');
    
    if(modalImage) {
        modalImage.src = getDirectImageUrl(images[currentImageIndex]); 
        modalImage.onerror = function() { this.src = 'placeholder.png'; }; 
    }
    if(imageNumber) {
        imageNumber.innerText = images.length > 1 ? `รูปที่ ${currentImageIndex + 1}/${images.length}` : "";
    }
}

const modal = document.getElementById('vehicleModal');
const closeBtn = document.getElementsByClassName("close")[0];
if(closeBtn) closeBtn.onclick = () => modal.style.display = "none";

window.onclick = (e) => { 
    if (e.target == modal) modal.style.display = "none"; 
    
    const refillHistoryModal = document.getElementById('refillHistoryModal');
    if (refillHistoryModal && e.target == refillHistoryModal) refillHistoryModal.style.display = "none";

    const refillFormModal = document.getElementById('refillFormModal');
    if (refillFormModal && e.target == refillFormModal) refillFormModal.style.display = "none";

    const lfActionModal = document.getElementById('lfActionModal');
    if (lfActionModal && e.target == lfActionModal) lfActionModal.style.display = "none";

    const cleanFormModal = document.getElementById('cleanFormModal');
    if (cleanFormModal && e.target == cleanFormModal) cleanFormModal.style.display = "none";
}

const prevBtn = document.getElementById('prevImageBtn');
if(prevBtn) {
    prevBtn.onclick = () => {
        const vehicle = allVehicles[currentVehicleIndex];
        const images = [vehicle.URL_รูปภาพ_1, vehicle.URL_รูปภาพ_2, vehicle.URL_รูปภาพ_3, vehicle.URL_รูปภาพ_4, vehicle.URL_รูปภาพ_5].filter(url => url && url !== ""); 
        currentImageIndex = (currentImageIndex > 0) ? currentImageIndex - 1 : images.length - 1; 
        changeImage(); 
    };
}

const nextBtn = document.getElementById('nextImageBtn');
if(nextBtn) {
    nextBtn.onclick = () => {
        const vehicle = allVehicles[currentVehicleIndex];
        const images = [vehicle.URL_รูปภาพ_1, vehicle.URL_รูปภาพ_2, vehicle.URL_รูปภาพ_3, vehicle.URL_รูปภาพ_4, vehicle.URL_รูปภาพ_5].filter(url => url && url !== ""); 
        currentImageIndex = (currentImageIndex < images.length - 1) ? currentImageIndex + 1 : 0; 
        changeImage(); 
    };
}

document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    if (sessionStorage.getItem('sidebarOpen') === 'true') {
        sidebar.classList.add('keep-open');
    }

    sidebar.addEventListener('mouseenter', () => {
        sessionStorage.setItem('sidebarOpen', 'true');
        sidebar.classList.add('keep-open');
    });

    sidebar.addEventListener('mouseleave', () => {
        sessionStorage.setItem('sidebarOpen', 'false');
        sidebar.classList.remove('keep-open');
    });
});