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
    if (frame) frame.src = url;

    const titleElement = document.getElementById('dynamicPageTitle');
    if (titleElement) {
        titleElement.setAttribute('data-th', thTitle);
        titleElement.setAttribute('data-en', enTitle);
        titleElement.textContent = (currentLang === 'th') ? thTitle : enTitle;
    }

    // 🌟 โค้ดที่เพิ่ม: ล้างช่อง Filter บน Header ให้โล่งทุกครั้งที่ย้ายหน้า
    const filterSlot = document.getElementById('headerFilterSlot');
    if (filterSlot) {
        filterSlot.innerHTML = ''; 
    }

    if (clickedElement) {
        document.querySelectorAll('.sidebar-menu a').forEach(el => el.classList.remove('active'));
        clickedElement.classList.add('active');
        
        // เช็คว่าเมนูที่กด อยู่ในเมนูย่อยหรือไม่
        const parentSubmenu = clickedElement.closest('.submenu');
        
        if (parentSubmenu) {
            // ถ้าอยู่ในเมนูย่อย ให้ไฮไลท์ปุ่มแม่ด้วย
            const parentLi = parentSubmenu.closest('.has-submenu');
            if(parentLi) {
                const parentA = parentLi.querySelector('a');
                if(parentA) parentA.classList.add('active');
            }
        } else {
            // 🌟 ถ้ากดที่เมนูหลัก (เช่น หน้าหลัก, ยานพาหนะ, ตั้งค่า) 
            // ให้สั่ง "พับ" เมนูย่อยทั้งหมดเก็บเข้าที่ทันที
            document.querySelectorAll('.submenu').forEach(sub => {
                sub.classList.remove('show-submenu');
            });
            // หมุนลูกศรกลับคืน
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
