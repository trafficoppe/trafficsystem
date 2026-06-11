const scriptURL = "https://script.google.com/macros/s/AKfycbzWc03wzCkfUHs3pIucqNs_tz7BguxUlODGOihfiMgHgkQFx5Kc1DRlITg_SDR9lu4/exec"; 

const formTranslations = {
    th: {
        loading: "⌛ กำลังโหลดรายการแบบฟอร์ม...",
        error: "❌ เกิดข้อผิดพลาดในการโหลดข้อมูล",
        untitled: "แบบฟอร์มไม่มีชื่อ",
        formInspect: "📝 ฟอร์มบันทึกและตรวจสภาพ (ยานพาหนะ/อุปกรณ์ดับเพลิง)",
        formWaste: "♻️ แบบฟอร์มบันทึกการคัดแยกขยะ"
    },
    en: {
        loading: "⌛ Loading forms...",
        error: "❌ Error loading data",
        untitled: "Untitled Form",
        formInspect: "📝 Inspection & Record Form (Vehicle/Fire Ext.)",
        formWaste: "♻️ Waste Sorting Record Form"
    }
};

let currentLang = localStorage.getItem('appLang') || localStorage.getItem('lang') || 'th';
let globalFormsData = [];

window.onload = function() {
    checkParentTheme();
    fetchForms();
    applyLanguageUI();
};

function fetchForms() {
    const loadingStatus = document.getElementById('loadingStatus');
    loadingStatus.style.display = 'block';

    fetch(scriptURL + "?t=" + new Date().getTime())
        .then(response => response.json())
        .then(data => {
            // กรองเอาเฉพาะข้อมูลที่เป็นฟอร์ม
            globalFormsData = data.filter(v => v.Data_Category === 'Form');
            displayForms();
        })
        .catch(error => {
            console.error("Error fetching forms: ", error);
            loadingStatus.innerHTML = `<span style="color:#ef4444;">${formTranslations[currentLang].error}</span>`;
        });
}

function displayForms() {
    const gallery = document.getElementById('formGallery');
    const loading = document.getElementById('loadingStatus');
    const t = formTranslations[currentLang];
    
    if (loading) loading.style.display = 'none';
    gallery.innerHTML = '';
    
    const fragment = document.createDocumentFragment();

    // 🌟 1. เพิ่มฟอร์มในระบบ (เปิดในแท็บใหม่เพื่อป้องกันหน้าจอซ้อนกัน)
    const localForms = [
        { name: t.formInspect, link: 'form.html', color: '#3b82f6' },
        { name: t.formWaste, link: 'waste_form.html', color: '#10b981' }
    ];

    localForms.forEach(hf => {
        const fBar = document.createElement('a');
        fBar.className = 'form-bar';
        fBar.href = hf.link;
        fBar.target = '_blank'; // เปิดแท็บใหม่
        fBar.innerHTML = `<div class="form-name" style="color: ${hf.color}; font-weight: 600;">${hf.name}</div> <i class="fa-solid fa-up-right-from-square" style="color: #cbd5e1; font-size: 14px;"></i>`;
        fragment.appendChild(fBar);
    });

    // 🌟 2. เพิ่มฟอร์มที่ดึงจาก Google Sheets (พวกลิงก์ Google Forms ต่างๆ)
    globalFormsData.forEach((item) => {
        const formBar = document.createElement('a');
        formBar.className = 'form-bar'; 
        let formName = item['ชื่อแบบฟอร์ม'] || t.untitled;

        formBar.href = item['ลิงก์'] && item['ลิงก์'].trim() !== "" ? item['ลิงก์'] : "#";
        formBar.target = "_blank"; 

        let iconClass = "fa-file-lines";
        let iconColor = "#64748b";
        if (formName.includes('รถ') || formName.includes('ยานพาหนะ')) { iconClass = "fa-car"; iconColor = "#0ea5e9"; }
        else if (formName.includes('ดับเพลิง') || formName.includes('อัคคีภัย')) { iconClass = "fa-fire-extinguisher"; iconColor = "#ef4444"; }

        formBar.innerHTML = `<i class="fa-solid ${iconClass}" style="font-size: 24px; color: ${iconColor}; margin-right: 15px; width: 30px; text-align: center;"></i> <div class="form-name">${formName}</div> <i class="fa-solid fa-chevron-right" style="color: #cbd5e1;"></i>`;
        fragment.appendChild(formBar);
    });

    gallery.appendChild(fragment);
}

// ระบบอัปเดตสี (Dark Mode)
function checkParentTheme() {
    if (window.parent && window.parent.document.body.classList.contains('dark-mode')) {
        document.body.classList.add('dark-mode');
    } else if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
    }
}
window.checkGlobalTheme = function() {
    if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-mode');
    else document.body.classList.remove('dark-mode');
};

// ระบบแปลภาษา (ถูกเรียกใช้งานจาก main_script)
window.applyLanguageUI = function() {
    currentLang = localStorage.getItem('appLang') || localStorage.getItem('lang') || 'th';
    const t = formTranslations[currentLang];
    
    const statusEl = document.getElementById('loadingStatus');
    if (statusEl && statusEl.style.display !== 'none') {
        if (statusEl.innerText.includes('กำลัง') || statusEl.innerText.includes('Loading')) statusEl.innerText = t.loading;
        else statusEl.innerText = t.error;
    }

    if (globalFormsData.length > 0 || currentLang) displayForms();
};