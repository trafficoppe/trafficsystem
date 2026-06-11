/* ==========================================
   SETTINGS JAVASCRIPT (page_settings_script.js)
   ========================================== */

// --- 1. ข้อมูลการแปลภาษา (Translations) ---
const translations = {
    th: {
        langTitle: "ภาษาของระบบ (Language)",
        langDesc: "เลือกภาษาที่ต้องการให้แสดงผลในระบบ",
        themeTitle: "โหมดหน้าจอ (Theme Mode)",
        themeDesc: "สลับหน้าจอระหว่างโหมดสว่างและโหมดมืด",
        themeBtnDark: "โหมดมืด",
        themeBtnLight: "โหมดสว่าง"
    },
    en: {
        langTitle: "System Language",
        langDesc: "Select the language to display in the system",
        themeTitle: "Display Theme",
        themeDesc: "Toggle between light and dark mode",
        themeBtnDark: "Dark Mode",
        themeBtnLight: "Light Mode"
    }
};

let currentLang = 'th'; // ตัวแปรเก็บภาษาปัจจุบัน

// --- 2. ฟังก์ชันทำงานเมื่อเริ่มโหลดหน้าเว็บ ---
window.onload = function() {
    initSettings();
};

function initSettings() {
    // โหลดค่าภาษาเดิมที่เคยบันทึกไว้ (ค่าเริ่มต้นคือ th)
    currentLang = localStorage.getItem('lang') || 'th';
    updateLangUI(currentLang);

    // โหลดค่า Theme เดิมที่เคยบันทึกไว้
    const isDark = localStorage.getItem('theme') === 'dark';
    if (isDark) {
        document.body.classList.add('dark-mode');
    }
    updateThemeUI(isDark);
}

// --- 3. ระบบโหมดหน้าจอ (Theme) ---
function toggleTheme() {
    // สลับคลาส dark-mode ที่ body
    const isDark = document.body.classList.toggle('dark-mode');
    
    // บันทึกค่าลง Local Storage
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    
    // อัปเดตหน้าตาปุ่มและไอคอน
    updateThemeUI(isDark);

    // แจ้งให้หน้าต่างหลัก (Parent Window) เปลี่ยนสีตาม
    if (window.parent && window.parent.document) {
        if (isDark) {
            window.parent.document.body.classList.add('dark-mode');
        } else {
            window.parent.document.body.classList.remove('dark-mode');
        }
        
        // ถ้าหน้าหลักมีฟังก์ชัน checkGlobalTheme ให้เรียกใช้ด้วย
        if (typeof window.parent.checkGlobalTheme === 'function') {
            window.parent.checkGlobalTheme();
        }
    }
}

function updateThemeUI(isDark) {
    const themeIconDisp = document.getElementById('themeIconDisp');
    const themeBtnIcon = document.getElementById('themeBtnIcon');
    const themeBtnText = document.getElementById('themeBtnText');

    if (isDark) {
        if (themeIconDisp) themeIconDisp.className = 'fa-solid fa-moon';
        if (themeBtnIcon) themeBtnIcon.className = 'fa-solid fa-sun';
        if (themeBtnText) themeBtnText.innerText = translations[currentLang].themeBtnLight;
    } else {
        if (themeIconDisp) themeIconDisp.className = 'fa-solid fa-sun';
        if (themeBtnIcon) themeBtnIcon.className = 'fa-solid fa-moon';
        if (themeBtnText) themeBtnText.innerText = translations[currentLang].themeBtnDark;
    }
}

// --- 4. ระบบเปลี่ยนภาษา (Language) ---
function setLang(lang) {
    currentLang = lang;
    localStorage.setItem('lang', lang);
    updateLangUI(lang);
    
    const isDark = document.body.classList.contains('dark-mode');
    updateThemeUI(isDark);

    // 🌟 สั่งให้หน้าเว็บหลักเปลี่ยนภาษา "ทันที" โดยไม่กระพริบ
    if (window.parent && typeof window.parent.setAppLanguage === 'function') {
        window.parent.setAppLanguage(lang);
    }
}

function updateLangUI(lang) {
    // จัดการสีของปุ่มเลือกภาษา
    const btnTH = document.getElementById('btnTH');
    const btnEN = document.getElementById('btnEN');
    
    if (btnTH) btnTH.classList.remove('active');
    if (btnEN) btnEN.classList.remove('active');
    
    if (lang === 'en') {
        if (btnEN) btnEN.classList.add('active');
    } else {
        if (btnTH) btnTH.classList.add('active');
    }

    // อัปเดตข้อความต่างๆ ในหน้าตั้งค่า
    const t = translations[lang];
    const elLangTitle = document.getElementById('txtLangTitle');
    const elLangDesc = document.getElementById('txtLangDesc');
    const elThemeTitle = document.getElementById('txtThemeTitle');
    const elThemeDesc = document.getElementById('txtThemeDesc');

    if (elLangTitle) elLangTitle.innerText = t.langTitle;
    if (elLangDesc) elLangDesc.innerText = t.langDesc;
    if (elThemeTitle) elThemeTitle.innerText = t.themeTitle;
    if (elThemeDesc) elThemeDesc.innerText = t.themeDesc;
}