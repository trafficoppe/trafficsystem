let currentLang = localStorage.getItem('appLang') || 'th';

// =======================================================
// 🌟 ทำงานหลังจากโครงสร้างหน้าจอ (DOM) โหลดพร้อมใช้งานแล้ว
// =======================================================
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. นำชื่อพนักงานที่ล็อกอินสำเร็จจาก sessionStorage มาแสดงที่มุมขวาบน
    const nameDisplay = document.getElementById('displayUserName');
    if (nameDisplay) {
        nameDisplay.textContent = sessionStorage.getItem('loggedInUser');
    }

    // 2. โหลดสถานะ Theme โหมดมืดจากความจำ
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
    }

    // 3. โหลดภาษาของระบบตอนเริ่มต้น
    updateLanguageUI();

    // 4. ตั้งค่าปุ่มเปิด-ปิด เมนูย่อย (Submenu)
    const submenuLinks = document.querySelectorAll('.has-submenu > a');
    submenuLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const submenu = this.nextElementSibling;
            const arrow = this.querySelector('.arrow-icon');
            if (submenu) {
                document.querySelectorAll('.submenu').forEach(sub => {
                    if (sub !== submenu) {
                        sub.classList.remove('show-submenu');
                        const prevArrow = sub.previousElementSibling.querySelector('.arrow-icon');
                        if (prevArrow) prevArrow.style.transform = 'rotate(0deg)';
                    }
                });
                submenu.classList.toggle('show-submenu');
                if (submenu.classList.contains('show-submenu')) {
                    if (arrow) arrow.style.transform = 'rotate(180deg)';
                } else {
                    if (arrow) arrow.style.transform = 'rotate(0deg)';
                }
            }
        });
    });

    // 5. ตั้งค่าเปิด-ปิด Sidebar บนหน้าจอมือถือ
    const toggleBtn = document.getElementById('mobileToggleBtn');
    const sidebar = document.getElementById('mainSidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (toggleBtn && sidebar && overlay) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.add('open');
            overlay.classList.add('show');
        });
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('show');
        });
    }

    // 6. โค้ดเสกเมนูย่อยของอุปกรณ์ดับเพลิงอัตโนมัติ
    const fireSubmenuHTML = `
        <li><a href="#" onclick="loadPage('page_fire.html?unit=all', 'อุปกรณ์ดับเพลิงทั้งหมด', 'All Fire Equipment', this)"><span class="menu-text" data-th="แสดงทั้งหมด" data-en="All Equipment">แสดงทั้งหมด</span></a></li>
        <li><a href="#" onclick="loadPage('page_fire.html?unit=ถังดับเพลิง', 'ข้อมูลถังดับเพลิง', 'Fire Extinguishers', this)"><span class="menu-text" data-th="ถังดับเพลิง" data-en="Fire Extinguishers">ถังดับเพลิง</span></a></li>
        <li><a href="#" onclick="loadPage('page_fire.html?unit=สายส่งน้ำ', 'ข้อมูลสายส่งน้ำดับเพลิง', 'Fire Hoses', this)"><span class="menu-text" data-th="สายส่งน้ำ" data-en="Fire Hoses">สายส่งน้ำ</span></a></li>
        <li><a href="#" onclick="loadPage('page_fire.html?unit=หัวฉีด', 'ข้อมูลหัวฉีดดับเพลิง', 'Nozzles', this)"><span class="menu-text" data-th="หัวฉีด" data-en="Nozzles">หัวฉีด</span></a></li>
        <li><a href="#" onclick="loadPage('page_fire.html?unit=ปั๊มน้ำ', 'ข้อมูลปั๊มน้ำ', 'Water Pumps', this)"><span class="menu-text" data-th="ปั๊มน้ำ" data-en="Water Pumps">ปั๊มน้ำ</span></a></li>
        <li><a href="#" onclick="loadPage('page_fire.html?unit=ตู้เก็บอุปกรณ์', 'ข้อมูลตู้เก็บอุปกรณ์', 'Cabinets', this)"><span class="menu-text" data-th="ตู้เก็บอุปกรณ์" data-en="Cabinets">ตู้เก็บอุปกรณ์</span></a></li>
        <li><a href="#" onclick="loadPage('page_fire.html?unit=หัวรับน้ำ', 'ข้อมูลหัวรับน้ำ', 'Fire Hydrants', this)"><span class="menu-text" data-th="หัวรับน้ำ" data-en="Fire Hydrants">หัวรับน้ำ</span></a></li>
        <li><a href="#" onclick="loadPage('page_fire.html?unit=ชุด ppe', 'ข้อมูลชุด PPE', 'PPE Suits', this)"><span class="menu-text" data-th="ชุด PPE" data-en="PPE Suits">ชุด PPE</span></a></li>
    `;
    
    const fireMenuSlot = document.getElementById('submenu-fire');
    if (fireMenuSlot) {
        fireMenuSlot.innerHTML = fireSubmenuHTML;
    }
});

// ==========================================
// 🌟 ฟังก์ชันทำงาน (เปลี่ยนภาษา/สี) เรียกโดย page_settings.html
// ==========================================
window.setAppLanguage = function(lang) {
    currentLang = lang;
    localStorage.setItem('appLang', lang); // ภาษายังเก็บข้ามวันได้
    updateLanguageUI(); 
    
    const titleElement = document.getElementById('dynamicPageTitle');
    if (titleElement) {
        titleElement.textContent = titleElement.getAttribute(`data-${lang}`);
    }
    syncIframeThemeLanguage();
}

window.toggleAppTheme = function() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light'); // สีโหมดมืดยังเก็บข้ามวันได้
    syncIframeThemeLanguage();
}

function updateLanguageUI() {
    document.querySelectorAll('[data-th][data-en]').forEach(el => {
        el.textContent = el.getAttribute(`data-${currentLang}`);
    });
}

function loadPage(url, thTitle, enTitle, clickedElement) {
    const frame = document.getElementById('contentFrame');
    let isInstantFilter = false; 

    if (frame) {
        const targetBasePage = url.split('?')[0]; 
        const currentSrc = frame.src || '';
        
        if (currentSrc.includes(targetBasePage) && frame.contentWindow && typeof frame.contentWindow.applyInstantFilter === 'function') {
            isInstantFilter = true; 
            let unit = 'all';
            if (url.includes('?')) {
                const params = new URLSearchParams(url.split('?')[1]);
                if (params.has('unit')) unit = decodeURIComponent(params.get('unit'));
            }
            frame.contentWindow.applyInstantFilter(unit);
        } else {
            frame.src = url;
        }
    }

    const titleElement = document.getElementById('dynamicPageTitle');
    if (titleElement) {
        titleElement.setAttribute('data-th', thTitle);
        titleElement.setAttribute('data-en', enTitle);
        titleElement.textContent = (currentLang === 'th') ? thTitle : enTitle;
    }

    if (!isInstantFilter) {
        const filterSlot = document.getElementById('headerFilterSlot');
        if (filterSlot) filterSlot.innerHTML = ''; 
    } else {
        const searchInput = document.getElementById('globalSearchInput');
        if (searchInput) searchInput.value = '';
    }

    if (clickedElement) {
        document.querySelectorAll('.sidebar-menu a').forEach(el => el.classList.remove('active'));
        clickedElement.classList.add('active');
        
        const parentSubmenu = clickedElement.closest('.submenu');
        if (parentSubmenu) {
            const parentLi = parentSubmenu.closest('.has-submenu');
            if(parentLi) {
                const parentA = parentLi.querySelector('a');
                if(parentA) parentA.classList.add('active');
            }
        } else {
            document.querySelectorAll('.submenu').forEach(sub => {
                sub.classList.remove('show-submenu');
            });
            document.querySelectorAll('.arrow-icon').forEach(arrow => {
                arrow.style.transform = 'rotate(0deg)';
            });
        }
    }

    if (window.innerWidth <= 768) {
        document.getElementById('mainSidebar').classList.remove('open');
        document.getElementById('sidebarOverlay').classList.remove('show');
    }
}

function syncIframeThemeLanguage() {
    const iframe = document.getElementById('contentFrame');
    if (iframe && iframe.contentWindow) {
        try {
            if (typeof iframe.contentWindow.checkGlobalTheme === 'function') iframe.contentWindow.checkGlobalTheme();
            if (typeof iframe.contentWindow.applyLanguageUI === 'function') iframe.contentWindow.applyLanguageUI();
        } catch (e) {}
    }
}

// ==========================================
// 🌟 ระบบย้าย Footer ไปไว้ล่างสุดของเนื้อหาในหน้าลูก (Iframe)
// ==========================================
document.getElementById('contentFrame').addEventListener('load', function() {
    try {
        const iframeDoc = this.contentDocument || this.contentWindow.document;
        
        if (!iframeDoc.getElementById('dynamic-footer')) {
            const footer = iframeDoc.createElement('footer');
            footer.id = 'dynamic-footer';
            
            footer.style.cssText = `
                background-color: var(--bg-color, #ffffff);
                color: var(--text-color, #475569);
                border-top: 1px solid var(--border-color, #cbd5e1);
                padding: 15px 30px;
                font-size: 14px;
                display: flex;
                flex-wrap: wrap;
                justify-content: space-between;
                align-items: center;
                margin-top: 40px;
                font-family: 'Prompt', sans-serif;
            `;
            
            footer.innerHTML = `
                <div data-th="© 2026 งานจราจรและความปลอดภัย กองกายภาพและสิ่งแวดล้อม มหาวิทยาลัยมหิดล" data-en="© 2026 Traffic and Security, Mahidol University">© 2026 งานจราจรและความปลอดภัย กองกายภาพและสิ่งแวดล้อม มหาวิทยาลัยมหิดล</div>
                <div data-th="โทรศัพท์: 02-441-4400 กด 0" data-en="Tel: 02-441-9318">โทรศัพท์: 02-441-9318</div>
            `;
            
            iframeDoc.body.appendChild(footer);
        }
    } catch (e) {
        console.log("ไม่สามารถแทรก Footer ได้:", e);
    }
});

// ==========================================
// 🌟 ฟังก์ชันสำหรับออกจากระบบ (Logout)
// ==========================================
window.logout = function() {
    sessionStorage.removeItem('loggedInUser'); // ลบข้อมูลการล็อกอินออก
    window.location.replace('login.html'); // เด้งกลับไปหน้าล็อกอินและเคลียร์ History ป้องกันการกด Back
};