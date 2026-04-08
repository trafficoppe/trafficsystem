// 🌟 ใส่ลิงก์ Web App ของคุณที่นี่ 🌟
const scriptURL = "https://script.google.com/macros/s/AKfycbzWc03wzCkfUHs3pIucqNs_tz7BguxUlODGOihfiMgHgkQFx5Kc1DRlITg_SDR9lu4/exec"; 

const vehicleItems = ["ลมยาง (ระดับความดันปกติ ไม่แบนรั่ว)", "สภาพเนื้อยาง / ดอกยาง (ไม่มีรอยปริแตก ซึม หรือฉีกขาด)", "สภาพกะทะล้อ / น็อตล้อ (ไม่คดดุ้ง ขันแน่น)", "ระบบเบรก (หน้า-หลัง / เบรกมือ)", "ระบบบังคับเลี้ยว / โช้คอัพ / ช่วงล่าง", "ระบบไฟฟ้า / ส่องสว่าง / แตร / สัญญาณเตือน", "แบตเตอรี่ / สายชาร์จ / ระดับของเหลว", "ระบบขับเคลื่อน (โซ่ / สายพาน / มอเตอร์)", "สภาพตัวถัง / เบาะนั่ง / กระจกมองข้าง"];
const fireExtinguisherItems = ["สภาพตัวถัง (ไม่บุบ ไม่เป็นสนิม)", "แรงดันในเกจ์วัด (เข็มต้องอยู่ในแถบสีเขียว)", "สายส่งน้ำดับเพลิงและหัวฉีด (ไม่แตก ไม่ตัน)", "สลักล็อกและซีลตะกั่ว (ต้องอยู่ครบ ไม่ถูกดึงออก)", "คันบีบและข้อต่อ (ไม่ค้าง ไม่หลวม)", "ป้ายคำแนะนำการใช้ (ชัดเจน ไม่หลุดลอก)", "ตำแหน่งที่ติดตั้ง (เข้าถึงง่าย ไม่มีสิ่งกีดขวาง)", "ฐานรองหรือที่แขวน (มั่นคงแข็งแรง)", "อายุการใช้งาน (ยังไม่หมดอายุตามป้ายระบุ)"];

const fireKeywords = ['อุปกรณ์ดับเพลิง', 'ถังดับเพลิง', 'สายส่งน้ำดับเพลิง', 'สายฉีด', 'หัวฉีด', 'ปั๊มน้ำ', 'ตู้เก็บอุปกรณ์', 'หัวรับน้ำ'];

window.onload = () => {
    const urlParams = new URLSearchParams(window.location.search);
    if(urlParams.has('type')) {
        let type = urlParams.get('type');
        
        const isFire = fireKeywords.some(keyword => type.includes(keyword));
        if(isFire) type = 'อุปกรณ์ดับเพลิง';
        else if(type.includes('กอล์ฟ')) type = 'รถกอล์ฟ'; 
        else if(type.includes('จักรยานยนต์')) type = 'รถจักรยานยนต์';
        else if(type.includes('จักรยานไฟฟ้า') || type.includes('ไฟฟ้า')) type = 'รถจักรยานไฟฟ้า';

        document.getElementById('vehicleType').value = type;
        updateFormFields(); 

        setTimeout(() => {
            if(document.getElementsByName('vehicleDetail')[0]) document.getElementsByName('vehicleDetail')[0].value = urlParams.get('detail') || '';
            if(document.getElementsByName('color')[0]) document.getElementsByName('color')[0].value = urlParams.get('color') || '';
            if(document.getElementsByName('licensePlate')[0]) document.getElementsByName('licensePlate')[0].value = urlParams.get('plate') || '';
            if(document.getElementsByName('equipNumber')[0]) document.getElementsByName('equipNumber')[0].value = urlParams.get('equip') || '';
        }, 200);
    }
};

window.toggleReason = function(index, isAbnormal) {
    const reasonInput = document.getElementById(`reason_${index}`);
    if(isAbnormal) { reasonInput.classList.add('show'); reasonInput.setAttribute('required', 'true'); } 
    else { reasonInput.classList.remove('show'); reasonInput.removeAttribute('required'); reasonInput.value = ''; }
};

function updateFormFields() {
    const type = document.getElementById('vehicleType').value;
    const dynamicFields = document.getElementById('dynamicFields');
    let html = ''; let currentItems = [];

    if (type === 'รถจักรยานยนต์') {
        html += `<div class="form-group"><label>ยี่ห้อ/รุ่น:</label><input type="text" name="vehicleDetail" required></div>
                 <div class="form-group"><label>สีรถ:</label><input type="text" name="color" required></div>
                 <div class="form-group"><label>ทะเบียน:</label><input type="text" name="licensePlate" required></div>
                 <div class="form-group"><label>หมายเลขครุภัณฑ์:</label><input type="text" name="equipNumber" required></div>`;
        currentItems = vehicleItems;
    } else if (type === 'รถจักรยานไฟฟ้า' || type === 'รถกอล์ฟ') {
        let labelName = (type === 'รถกอล์ฟ') ? "ชื่อรถกอล์ฟ" : "รายละเอียดรถ";
        html += `<div class="form-group"><label>${labelName}:</label><input type="text" name="vehicleDetail" required></div>
                 <div class="form-group"><label>สีรถ:</label><input type="text" name="color" required></div>
                 <input type="hidden" name="licensePlate" value="-"><input type="hidden" name="equipNumber" value="-">`;
        currentItems = vehicleItems;
    } else if (type === 'อุปกรณ์ดับเพลิง') {
        html += `<div class="form-group"><label>ชื่ออุปกรณ์ / ชนิดถัง:</label><input type="text" name="vehicleDetail" placeholder="เช่น ถังดับเพลิง CO2 / สายส่งน้ำดับเพลิง" required></div>
                 <div class="form-group"><label>ตำแหน่งที่ติดตั้ง:</label><input type="text" name="color" placeholder="เช่น หน้าตึก A ชั้น 1" required></div>
                 <div class="form-group"><label>รหัสถัง/รหัสอุปกรณ์:</label><input type="text" name="licensePlate" placeholder="ถ้าไม่มีให้ใส่ -" required></div>
                 <div class="form-group"><label>หมายเลขครุภัณฑ์:</label><input type="text" name="equipNumber" placeholder="ถ้าไม่มีให้ใส่ -" required></div>`;
        currentItems = fireExtinguisherItems;
    }

    if (type !== '') {
        html += `<div class="checklist-container"><h4>รายการตรวจสภาพ (${type})</h4>`;
        currentItems.forEach((item, idx) => {
            html += `<div class="checklist-item"><span class="chk-label">${idx + 1}. ${item}</span>
                    <div class="checklist-options">
                        <label class="radio-label"><input type="radio" name="chk_${idx}" value="ปกติ" onchange="toggleReason(${idx}, false)" required checked> ปกติ</label>
                        <label class="radio-label check-fail"><input type="radio" name="chk_${idx}" value="ไม่ปกติ" onchange="toggleReason(${idx}, true)" required> ไม่ปกติ</label>
                    </div><input type="text" id="reason_${idx}" name="reason_${idx}" class="reason-input" placeholder="ระบุสาเหตุที่ ไม่ปกติ..."></div>`;
        });
        html += `</div><div class="final-status-box form-group"><label>สรุปสถานะหลังการตรวจสภาพ:</label>
                    <select name="finalStatus" required style="font-weight:bold; font-size:16px;">
                        <option value="สามารถใช้งานได้" selected>สามารถใช้งานได้</option><option value="ไม่สามารถใช้งานได้ (ต้องส่งซ่อม/แก้ไข)">ไม่สามารถใช้งานได้ (ต้องแก้ไข)</option>
                    </select></div>`;
    }
    dynamicFields.innerHTML = html;
}

const form = document.getElementById('inspectionForm');
form.addEventListener('submit', e => {
    e.preventDefault();
    const btn = document.getElementById('submitBtn'); const msg = document.getElementById('message');
    btn.innerText = "กำลังบันทึกข้อมูล..."; btn.disabled = true;

    const formData = new FormData(form);
    const type = document.getElementById('vehicleType').value;
    let targetItems = (type === 'อุปกรณ์ดับเพลิง') ? fireExtinguisherItems : vehicleItems;

    if (document.getElementsByName('chk_0').length > 0) {
        let checksArray = [];
        for(let i=0; i < targetItems.length; i++) {
            let chkStatus = formData.get(`chk_${i}`); 
            let reason = formData.get(`reason_${i}`);
            let itemName = targetItems[i].split('(')[0].trim(); 
            
            if (chkStatus === 'ไม่ปกติ') checksArray.push(`(${itemName}) ไม่ปกติ: ${reason}`);
            else checksArray.push(`(${itemName}) ปกติ`);
        }
        formData.append('checklistJSON', JSON.stringify({ checks: checksArray, finalStatus: formData.get('finalStatus') }));
    }

    fetch(scriptURL, { method: 'POST', body: formData }).then(response => {
        msg.innerText = "บันทึกข้อมูลสำเร็จ! กำลังกลับสู่หน้าหลัก..."; msg.style.color = "green";
        form.reset(); document.getElementById('dynamicFields').innerHTML = ''; 
        setTimeout(() => { window.history.back(); }, 2000); 
    }).catch(error => {
        msg.innerText = "เกิดข้อผิดพลาดในการบันทึก"; msg.style.color = "red";
        btn.innerText = "บันทึกข้อมูล"; btn.disabled = false;
    });
});
// ========================================================
// 🌟 โค้ดพิเศษ: ระบบจำสถานะ Sidebar (ไม่ให้กระพริบตอนเปลี่ยนหน้า) 🌟
// ========================================================
document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    // 1. เช็คว่าก่อนหน้านี้เมนูเปิดอยู่หรือไม่ (ถ้าเปิดอยู่ ให้ใส่คลาส keep-open ค้างไว้)
    if (sessionStorage.getItem('sidebarOpen') === 'true') {
        sidebar.classList.add('keep-open');
    }

    // 2. เมื่อเอาเมาส์เข้าพื้นที่เมนู ให้จำค่าไว้ว่าเปิดอยู่
    sidebar.addEventListener('mouseenter', () => {
        sessionStorage.setItem('sidebarOpen', 'true');
        sidebar.classList.add('keep-open');
    });

    // 3. เมื่อเอาเมาส์ออก ให้ล้างค่าความจำและซ่อนเมนู
    sidebar.addEventListener('mouseleave', () => {
        sessionStorage.setItem('sidebarOpen', 'false');
        sidebar.classList.remove('keep-open');
    });
});
// ========================================================
// 🌟 ระบบควบคุมเมนูย่อย (Dropdown Toggle) สำหรับ Sidebar 🌟
// ========================================================
document.addEventListener('DOMContentLoaded', () => {
    // หาเมนูหลักทุกอันที่มีเมนูย่อยซ่อนอยู่
    const submenuLinks = document.querySelectorAll('.has-submenu > a');
    
    submenuLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // 1. ป้องกันไม่ให้หน้าเว็บกระตุกเด้งกลับไปด้านบน
            e.preventDefault(); 
            // 2. ป้องกันคำสั่งซ้อนทับกัน
            e.stopImmediatePropagation(); 
            
            // 3. หาเมนูย่อยที่อยู่ติดกับเมนูหลักที่เพิ่งถูกคลิก
            const submenu = this.nextElementSibling;
            
            if (submenu && submenu.classList.contains('submenu')) {
                // 4. สลับสถานะเปิด-ปิด (ถ้าปิดอยู่จะเปิด ถ้าเปิดอยู่จะปิด)
                submenu.classList.toggle('show-submenu');
            }
        });
    });
});