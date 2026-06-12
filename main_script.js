let currentLang = localStorage.getItem('appLang') || 'th';

document.addEventListener('DOMContentLoaded', () => {
    // โหลดสถานะ Theme โหมดมืดจากความจำ
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
    }

    // โหลดภาษาตอนเริ่มต้น
    updateLanguageUI();

    // ปุ่มเปิด-ปิด Submenu
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

    // เปิด Sidebar บนมือถือ
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
});

// ==========================================
// 🌟 ฟังก์ชันทำงาน (เปลี่ยนภาษา/สี) เรียกโดย page_settings.html
// ==========================================
window.setAppLanguage = function(lang) {
    currentLang = lang;
    localStorage.setItem('appLang', lang); // บันทึกลงเครื่อง
    
    // 🌟 สั่งให้หน้าหลักเปลี่ยนข้อความทันที (ไม่ต้องรีเฟรช)
    updateLanguageUI(); 
    
    // 🌟 เปลี่ยนข้อความที่ Header Title ด้านบนด้วย
    const titleElement = document.getElementById('dynamicPageTitle');
    if (titleElement) {
        titleElement.textContent = titleElement.getAttribute(`data-${lang}`);
    }

    // 🌟 สั่งให้หน้าลูกเปลี่ยนภาษาด้วย (ถ้าหน้าลูกรองรับ)
    syncIframeThemeLanguage();
}

window.toggleAppTheme = function() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    syncIframeThemeLanguage();
}

function updateLanguageUI() {
    document.querySelectorAll('[data-th][data-en]').forEach(el => {
        el.textContent = el.getAttribute(`data-${currentLang}`);
    });
}

function loadPage(url, thTitle, enTitle, clickedElement) {
    const frame = document.getElementById('contentFrame');
    let isInstantFilter = false; // 🌟 ตัวแปรเช็คว่าเป็นการกรองแบบทันทีหรือไม่

    if (frame) {
        const targetBasePage = url.split('?')[0]; // ดึงชื่อไฟล์ เช่น page_fire.html
        const currentSrc = frame.src || '';
        
        // 🌟 ถ้ากำลังเปิดหน้าเดิมอยู่แล้ว (เช่น อยู่หน้าดับเพลิง แล้วกดเมนูดับเพลิงอันอื่น)
        if (currentSrc.includes(targetBasePage) && frame.contentWindow && typeof frame.contentWindow.applyInstantFilter === 'function') {
            isInstantFilter = true; // เปิดโหมดเปลี่ยนทันที
            
            let unit = 'all';
            if (url.includes('?')) {
                const params = new URLSearchParams(url.split('?')[1]);
                if (params.has('unit')) unit = decodeURIComponent(params.get('unit'));
            }
            // สั่งให้หน้าลูกเปลี่ยนการ์ดทันที โดยไม่รีโหลดเว็บ!
            frame.contentWindow.applyInstantFilter(unit);
        } else {
            // ถ้าเป็นหน้าใหม่จริงๆ ถึงจะยอมให้รีโหลด iframe
            frame.src = url;
        }
    }

    const titleElement = document.getElementById('dynamicPageTitle');
    if (titleElement) {
        titleElement.setAttribute('data-th', thTitle);
        titleElement.setAttribute('data-en', enTitle);
        titleElement.textContent = (currentLang === 'th') ? thTitle : enTitle;
    }

    // 🌟 ถ้ารีโหลดหน้าใหม่ ให้ล้าง Header ทิ้ง แต่ถ้าเปลี่ยนแค่ Filter ให้ล้างแค่คำค้นหาพอ
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

// ==================================================
// 🌟 ระบบเสกเมนูย่อยผ่าน Javascript (ป้องกันเมนูค้าง และ main.html ไม่รก)
// ==================================================
document.addEventListener('DOMContentLoaded', () => {
    
    // โค้ดก้อนเมนูอุปกรณ์ดับเพลิง
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
    
    // สั่งยัดเมนูลงไปใน <ul id="submenu-fire"> ในหน้า main.html อัตโนมัติ
    const fireMenuSlot = document.getElementById('submenu-fire');
    if (fireMenuSlot) {
        fireMenuSlot.innerHTML = fireSubmenuHTML;
    }
});
// ==========================================
// 🌟 ระบบย้าย Footer ไปไว้ล่างสุดของเนื้อหาในหน้าลูก (Iframe)
// ==========================================
document.getElementById('contentFrame').addEventListener('load', function() {
    try {
        const iframeDoc = this.contentDocument || this.contentWindow.document;
        
        // เช็คว่ามี Footer อยู่แล้วหรือยัง ถ้ายังไม่มีให้สร้างใหม่
        if (!iframeDoc.getElementById('dynamic-footer')) {
            const footer = iframeDoc.createElement('footer');
            footer.id = 'dynamic-footer';
            
            // จัดทรง Footer ให้ไปอยู่ล่างสุด (ใช้ var() เพื่อรองรับการเปลี่ยนสีโหมดมืดอัตโนมัติ)
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
                margin-top: 40px; /* ดันให้ห่างจากเนื้อหาด้านบน */
                font-family: 'Prompt', sans-serif;
            `;
            
            // ใส่ข้อความลิขสิทธิ์
            footer.innerHTML = `
                <div data-th="© 2026 งานจราจรและความปลอดภัย กองกายภาพและสิ่งแวดล้อม มหาวิทยาลัยมหิดล" data-en="© 2026 Traffic and Security, Mahidol University">© 2026 งานจราจรและความปลอดภัย กองกายภาพและสิ่งแวดล้อม มหาวิทยาลัยมหิดล</div>
                <div data-th="โทรศัพท์: 02-441-4400 กด 0" data-en="Tel: 02-441-9318">โทรศัพท์: 02-441-9318</div>
            `;
            
            // นำไปต่อท้ายสุดของหน้าเนื้อหา
            iframeDoc.body.appendChild(footer);
        }
    } catch (e) {
        console.log("ไม่สามารถแทรก Footer ได้:", e);
    }
});