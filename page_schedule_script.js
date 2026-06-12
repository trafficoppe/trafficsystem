/* ==========================================
   SCHEDULE JAVASCRIPT (วาดตารางเวรแบบ HTML Native)
   ========================================== */

const scheduleSheetUrl = "https://docs.google.com/spreadsheets/d/1lYRhXtLgec6ISM6Ugt-YKLrh47NRt7ihcVLcD8mI_Yg/gviz/tq?tqx=out:json&gid=1075222543";

let parsedSchedule = {
    monthTitle: "ตารางเวรปฏิบัติงาน",
    shifts: [],
    data: []
};

window.onload = function() {
    injectUI();
    fetchScheduleData();
};

function injectUI() {
    const pDoc = window.parent.document;
    if (!pDoc) return;
    const headerSlot = pDoc.getElementById('headerFilterSlot');
    const headerTemplate = document.getElementById('scheduleFilterTemplate');
    if (headerSlot && headerTemplate) {
        headerSlot.innerHTML = headerTemplate.innerHTML;
        const searchInput = pDoc.getElementById('globalSearchInput');
        if (searchInput) searchInput.oninput = displayScheduleTable;
    }
}

function fetchScheduleData() {
    const loadingEl = document.getElementById('assetLoading');
    if(loadingEl) loadingEl.style.display = 'block';

    fetch(scheduleSheetUrl)
        .then(res => res.text())
        .then(text => {
            const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S\w]+)\);/);
            if (match && match[1]) {
                const json = JSON.parse(match[1]);
                const rows = json.table.rows;

                // 1. หาชื่อหัวข้อเดือน
                for (let r = 0; r < Math.min(5, rows.length); r++) {
                    if (!rows[r] || !rows[r].c) continue;
                    for (let c = 0; c < rows[r].c.length; c++) {
                        let val = rows[r].c[c] ? String(rows[r].c[c].v).trim() : "";
                        if (val.includes("ตารางเวรประจำเดือน") || val.includes("ตารางเวรปฏิบัติงาน")) {
                            parsedSchedule.monthTitle = val;
                        }
                    }
                }

                // 2. หาคอลัมน์ผลัด และดึงรายชื่อพนักงาน
                let shiftHeaderRowIndex = -1;
                for (let r = 0; r < Math.min(15, rows.length); r++) {
                    if (!rows[r] || !rows[r].c) continue;
                    for (let c = 0; c < rows[r].c.length; c++) {
                        let val = rows[r].c[c] ? String(rows[r].c[c].v).trim() : "";
                        if (val.startsWith("ผลัด")) {
                            shiftHeaderRowIndex = r;
                            break;
                        }
                    }
                    if (shiftHeaderRowIndex !== -1) break;
                }

                if (shiftHeaderRowIndex !== -1) {
                    let headerRow = rows[shiftHeaderRowIndex];
                    for (let c = 0; c < headerRow.c.length; c++) {
                        let val = headerRow.c[c] ? String(headerRow.c[c].v).trim() : "";
                        if (val.startsWith("ผลัด")) {
                            parsedSchedule.shifts.push({ colIndex: c, name: val, staff: [] });
                        }
                    }

                    // สแกนลงมาเพื่อดึงรายชื่อคน จนกว่าจะเจอคำว่า เช้า/บ่าย/ดึก หรือตัวเลขเวลา
                    for (let r = shiftHeaderRowIndex + 1; r < shiftHeaderRowIndex + 10; r++) {
                        if (!rows[r] || !rows[r].c) continue;
                        
                        let isTimeRow = false;
                        parsedSchedule.shifts.forEach(shift => {
                            let val = rows[r].c[shift.colIndex] ? String(rows[r].c[shift.colIndex].v).trim() : "";
                            if (val === "เช้า" || val === "บ่าย" || val === "ดึก" || val.includes(".") || val === "พักกะ") {
                                isTimeRow = true;
                            }
                        });
                        
                        if (isTimeRow) break;

                        parsedSchedule.shifts.forEach(shift => {
                            let name = rows[r].c[shift.colIndex] ? String(rows[r].c[shift.colIndex].v).trim() : "";
                            if (name && name !== "-" && name !== "null") {
                                shift.staff.push(name);
                            }
                        });
                    }
                }

                // 3. ดึงข้อมูลตารางเวลาแต่ละวัน
                rows.forEach(row => {
                    if (!row || !row.c) return;
                    let col0 = row.c[0] ? String(row.c[0].f || row.c[0].v).trim() : "";
                    
                    // ถ้าคอลัมน์แรกมีเครื่องหมาย / แปลว่าเป็นวันที่แน่นอน
                    if (col0.includes("/") && col0.split("/").length >= 2 && /\d/.test(col0)) {
                        let rowData = { date: col0, shiftValues: [], rawText: col0 };
                        parsedSchedule.shifts.forEach(shift => {
                            let val = row.c[shift.colIndex] ? String(row.c[shift.colIndex].f || row.c[shift.colIndex].v).trim() : "-";
                            if (val === "null") val = "-";
                            rowData.shiftValues.push(val);
                            rowData.rawText += " " + val;
                        });
                        parsedSchedule.data.push(rowData);
                    }
                });

                if(loadingEl) loadingEl.style.display = 'none';
                displayScheduleTable();
            }
        }).catch(err => {
            console.error(err);
            if(loadingEl) loadingEl.innerHTML = `<span style="color:red;">❌ เกิดข้อผิดพลาดในการเชื่อมต่อข้อมูล</span>`;
        });
}

function displayScheduleTable() {
    const gallery = document.getElementById('scheduleGallery');
    if(!gallery) return;

    const pDoc = window.parent.document;
    let searchInput = pDoc ? pDoc.getElementById('globalSearchInput') : null;
    let keyword = searchInput ? searchInput.value.toLowerCase().trim() : '';

    // กรองแถวตามคำค้นหา
    let filteredData = parsedSchedule.data;
    if (keyword !== '') {
        filteredData = filteredData.filter(row => row.rawText.toLowerCase().includes(keyword));
    }

    gallery.innerHTML = '';
    gallery.className = ''; 

    const tableContainer = document.createElement('div');
    tableContainer.className = 'schedule-table-container';

    // หัวข้อเดือน
    const dateHeader = document.createElement('div');
    dateHeader.className = 'schedule-date-header';
    dateHeader.innerText = parsedSchedule.monthTitle;
    tableContainer.appendChild(dateHeader);

    // สร้างตาราง
    const table = document.createElement('table');
    table.className = 'schedule-table';

    // แถวแรก: ชื่อผลัด (สีเขียว)
    let topHeaderRow = '<tr class="shift-header">';
    topHeaderRow += `<th>วันที่</th>`;
    parsedSchedule.shifts.forEach(s => {
        topHeaderRow += `<th>${s.name}</th>`;
    });
    topHeaderRow += '</tr>';

    // แถวสอง: รายชื่อพนักงาน (สีขาว)
    let nameHeaderRow = '<tr class="name-header">';
    nameHeaderRow += `<th></th>`;
    parsedSchedule.shifts.forEach(s => {
        let namesHtml = s.staff.join('<br>');
        nameHeaderRow += `<th>${namesHtml}</th>`;
    });
    nameHeaderRow += '</tr>';

    let thead = `<thead>${topHeaderRow}${nameHeaderRow}</thead>`;

    // ข้อมูลกะการทำงาน
    let tbody = '<tbody>';
    if (filteredData.length === 0) {
        tbody += `<tr><td colspan="${parsedSchedule.shifts.length + 1}" style="padding:20px;">🔍 ไม่พบข้อมูลที่ค้นหา</td></tr>`;
    } else {
        filteredData.forEach(row => {
            tbody += `<tr>`;
            tbody += `<td style="font-weight: 500;">${row.date}</td>`;
            row.shiftValues.forEach(val => {
                if (val.trim() === 'พักกะ') {
                    tbody += `<td class="cell-rest">${val}</td>`;
                } else {
                    tbody += `<td>${val}</td>`;
                }
            });
            tbody += '</tr>';
        });
    }
    tbody += '</tbody>';

    table.innerHTML = thead + tbody;
    tableContainer.appendChild(table);
    gallery.appendChild(tableContainer);
}