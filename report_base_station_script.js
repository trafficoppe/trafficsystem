const thaiMonths = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
let allData = [];
let signatureMap = {};

function getDirectImageUrl(url) {
    if (!url || url.includes('ใส่ลิงก์') || url.trim() === '') return "";
    
    let match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/) || url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
        return `https://wsrv.nl/?url=drive.google.com/uc?id=${match[1]}&output=png&w=200`;
    }
    // ส่งลิงก์คืนไปแบบตรงๆ ให้รองรับ Github / AWS S3
    return url.trim(); 
}

window.onload = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    document.getElementById('reportDate').value = `${y}-${m}-${d}`;
    fetchData();
};

window.changeDate = function(offset) {
    const dateInput = document.getElementById('reportDate');
    if (!dateInput.value) return;
    const d = new Date(dateInput.value);
    d.setDate(d.getDate() + offset);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    dateInput.value = `${y}-${m}-${day}`;
    renderData();
};

window.fetchData = function() {
    const urlReport = 'https://docs.google.com/spreadsheets/d/1lYRhXtLgec6ISM6Ugt-YKLrh47NRt7ihcVLcD8mI_Yg/gviz/tq?tqx=out:json&gid=1354124607&headers=1';
    const urlStaff = 'https://docs.google.com/spreadsheets/d/1lYRhXtLgec6ISM6Ugt-YKLrh47NRt7ihcVLcD8mI_Yg/gviz/tq?tqx=out:json&gid=1285036850&headers=1';
    
    document.getElementById('tableBody').innerHTML = '<tr><td colspan="5" style="text-align: center;">กำลังโหลดข้อมูล...</td></tr>';
    
    Promise.all([
        fetch(urlReport).then(res => res.text()),
        fetch(urlStaff).then(res => res.text())
    ])
    .then(([textReport, textStaff]) => {
        const jsonStaffStr = textStaff.match(/google\.visualization\.Query\.setResponse\(([\s\S\w]+)\);/)[1];
        const dataStaff = JSON.parse(jsonStaffStr);
        signatureMap = {}; 
        
        let sigColIdx = 8; 
        dataStaff.table.cols.forEach((col, idx) => {
            if (col.label && (col.label.includes('ลายเซน') || col.label.includes('ลายเซ็น'))) {
                sigColIdx = idx;
            }
        });

        dataStaff.table.rows.forEach(row => {
            if (row && row.c && row.c[0] && row.c[0].v) {
                let name = String(row.c[0].v).trim();
                let sigUrl = row.c[sigColIdx] ? String(row.c[sigColIdx].v || '') : '';
                signatureMap[name] = sigUrl;
            }
        });

        const jsonReportStr = textReport.match(/google\.visualization\.Query\.setResponse\(([\s\S\w]+)\);/)[1];
        const dataReport = JSON.parse(jsonReportStr);
        
        allData = dataReport.table.rows.map(row => {
            const c = row.c;
            if (!c) return null;
            
            let d = null;
            if (c[0] && c[0].v) {
                if (typeof c[0].v === 'string' && c[0].v.startsWith('Date(')) {
                    let p = c[0].v.match(/\d+/g);
                    d = new Date(p[0], p[1], p[2], p[3]||0, p[4]||0);
                } else {
                    d = new Date(c[0].f || c[0].v);
                }
            }

            return {
                dateObj: d,
                operator: c[1] ? (c[1].v || '') : '',
                unit: c[2] ? (c[2].v || '') : '',
                reporter: c[3] ? (c[3].v || '') : '',
                incident: c[4] ? (c[4].v || '') : '',
                location: c[5] ? (c[5].v || '') : '',
                details: c[6] ? (c[6].v || '') : '',
                action: c[7] ? (c[7].v || '') : ''
            };
        }).filter(item => item && item.dateObj && !isNaN(item.dateObj));

        renderData(); 
    })
    .catch(err => {
        console.error('Error:', err);
        document.getElementById('tableBody').innerHTML = '<tr><td colspan="5" style="text-align: center; color: red;">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>';
    });
};

// ==========================================
// 🌟 ฟังก์ชันกรองข้อมูล วาดตาราง และสร้างระบบลายเซ็น
// ==========================================
window.renderData = function() {
    const dateStr = document.getElementById('reportDate').value;
    if (!dateStr) return;
    const targetDate = new Date(dateStr);
    
    document.getElementById('docDateText').innerText = `ประจำวันที่ ${targetDate.getDate()} ${thaiMonths[targetDate.getMonth()]} พ.ศ. ${targetDate.getFullYear() + 543}`;

    const filteredData = allData.filter(item => {
        return item.dateObj.getFullYear() === targetDate.getFullYear() &&
               item.dateObj.getMonth() === targetDate.getMonth() &&
               item.dateObj.getDate() === targetDate.getDate();
    });

    const tbody = document.getElementById('tableBody');
    let html = '';

    if (filteredData.length === 0) {
        html = '<tr><td colspan="5" style="text-align: center; height: 100px; vertical-align: middle; color: #000;">ไม่มีบันทึกเหตุการณ์ในวันที่เลือก</td></tr>';
    } else {
        filteredData.forEach(item => {
            let h = String(item.dateObj.getHours()).padStart(2, '0');
            let m = String(item.dateObj.getMinutes()).padStart(2, '0');
            let timeStr = `${h}.${m} น.`;
            
            // 🌟 ถอดตัวหนาออก และบังคับตัวอักษรเป็นสีดำ (#000)
            let actionText = item.action ? `<br><span style="color:#000;">การดำเนินการ: ${item.action}</span>` : '';

            html += `
            <tr style="color: #000; font-weight: normal;">
                <td style="text-align: center;">${timeStr}</td>
                <td>${item.incident}<br>สถานที่: ${item.location}</td>
                <td>${item.reporter}<br><span style="font-size:15px; color:#000;">(${item.unit})</span></td>
                <td>${item.details}${actionText}</td>
                <td style="text-align: center;">${item.operator.replace(/^(นาย|นาง|นางสาว)\s*/, "")}</td>
            </tr>`;
        });
    }
    tbody.innerHTML = html;

    // ==========================================
    // 🌟 สร้างพื้นที่ลายเซ็น
    // ==========================================
    let sigContainer = document.getElementById('signatureSection');
    
    let bossRawUrl = signatureMap["นายยุทธภูมิ ญานเพิ่ม"];
    let bossSigImgUrl = getDirectImageUrl(bossRawUrl);
    
    let bossImgTag = bossSigImgUrl 
        ? `<img src="${bossSigImgUrl}" style="position: absolute; top: -35px; left: 50%; transform: translateX(-50%); height: 75px; object-fit: contain; z-index: 1; opacity: 0.85;">` 
        : ``;

    // 🌟 เพิ่ม margin-top เป็น 120px เพื่อให้ขยับลงมาอีกประมาณ 2 บรรทัด
    sigContainer.innerHTML = `
        <div style="display: flex; justify-content: flex-end; width: 100%; margin-top: 120px;">
            <div style="width: 350px; text-align: center; position: relative;">
                ${bossImgTag}
                <div style="position: relative; z-index: 2; color: #000; font-weight: normal;">
                    ลงชื่อ .................................................................... ผู้ตรวจสอบ<br>
                    (นายยุทธภูมิ ญานเพิ่ม)<br>
                    หัวหน้างานจราจรและความปลอดภัย
                </div>
            </div>
        </div>
    `;
};