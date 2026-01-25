/**
 * Test Excel Import Parsing (Local Debug Script)
 * Usage: node test-import.js path/to/your/excel.xlsx
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Get file path from command line
const filePath = process.argv[2];
if (!filePath) {
    console.log('Usage: node test-import.js path/to/your/excel.xlsx');
    process.exit(1);
}

if (!fs.existsSync(filePath)) {
    console.log('File not found:', filePath);
    process.exit(1);
}

// Read Excel file
console.log('\n📂 Reading file:', filePath);
const wb = XLSX.readFile(filePath);
console.log('📋 Sheets found:', wb.SheetNames.join(', '));

const students = [];

wb.SheetNames.forEach(sheetName => {
    console.log('\n' + '='.repeat(60));
    console.log('📄 Processing sheet:', sheetName);
    console.log('='.repeat(60));

    const ws = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

    let currentLevel = '';
    let currentRoom = '';
    let headerFound = false;
    const colMap = {};

    // Detect Level from sheet name
    if (sheetName.includes('ม.')) {
        currentLevel = sheetName.split(' ')[0];
        console.log('📍 Level from sheet name:', currentLevel);
    }

    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;

        const rowStr = row.map(c => c != null ? String(c) : '').join(' ').trim();

        // Detect Level/Room from header (Thai school format)
        const levelMatch = rowStr.match(/ชั้นมัธยมศึกษาปีที่\s*(\d+)\/(\d+)/);
        if (levelMatch) {
            currentLevel = `ม.${levelMatch[1]}`;
            currentRoom = levelMatch[2];
            console.log(`📍 Level/Room from header: ${currentLevel}/${currentRoom}`);
        }

        // Detect Table Header
        const rowContents = row.map(c => c != null ? String(c).trim() : '');
        const hasHeader = rowContents.some(c =>
            c.includes('เลขประจำตัว') || c.includes('รหัสประจำตัว') || c === 'เลขที่'
        );

        if (!headerFound && hasHeader) {
            headerFound = true;
            console.log('\n🔍 Header row found at index:', i);
            console.log('   Raw row:', JSON.stringify(row));

            // Map columns
            row.forEach((cell, idx) => {
                const val = cell != null ? String(cell).trim() : '';
                if (!val) return;

                console.log(`   [${idx}] "${val}" (type: ${typeof cell})`);

                if (val.includes('เลขประจำตัว') || val.includes('รหัสประจำตัว')) {
                    colMap['id'] = idx;
                    console.log(`       → Mapped to: id`);
                }
                else if (val.includes('คำนำหน้า')) {
                    colMap['prefix'] = idx;
                    console.log(`       → Mapped to: prefix`);
                }
                else if (val === 'นามสกุล' || val === 'สกุล') {
                    colMap['last_name'] = idx;
                    console.log(`       → Mapped to: last_name`);
                }
                else if (val.includes('ชื่อ') && val.includes('สกุล')) {
                    colMap['name'] = idx;
                    console.log(`       → Mapped to: name (combined)`);
                }
                else if (val === 'ชื่อ' && !colMap['first_name']) {
                    colMap['first_name'] = idx;
                    console.log(`       → Mapped to: first_name`);
                }
            });

            console.log('\n📊 Column mapping result:', colMap);
            continue;
        }

        // Extract data
        if (headerFound && colMap['id'] !== undefined && row[colMap['id']]) {
            const studentId = String(row[colMap['id']]).trim();

            // Skip non-numeric IDs
            if (!studentId || !/^\d+$/.test(studentId)) continue;

            // DEBUG: Show first 3 raw student rows
            if (students.length < 3) {
                console.log(`\n📝 Raw student row #${students.length + 1} (ID: ${studentId}):`);
                row.forEach((cell, idx) => {
                    if (cell != null) {
                        console.log(`   [${idx}] "${String(cell).substring(0, 60)}" (${typeof cell})`);
                    }
                });
            }

            let prefix = '';
            let firstName = '';
            let lastName = '';

            // Separate columns format
            if (colMap['prefix'] !== undefined && colMap['first_name'] !== undefined) {
                prefix = row[colMap['prefix']] ? String(row[colMap['prefix']]).trim() : '';
                firstName = row[colMap['first_name']] ? String(row[colMap['first_name']]).trim() : '';
                lastName = colMap['last_name'] !== undefined && row[colMap['last_name']]
                    ? String(row[colMap['last_name']]).trim()
                    : '';
            }
            // Combined name column format  
            else if (colMap['name'] !== undefined || colMap['first_name'] !== undefined) {
                const nameColIdx = colMap['name'] !== undefined ? colMap['name'] : colMap['first_name'];
                const cellValue = row[nameColIdx] ? String(row[nameColIdx]).trim() : '';

                // Check if this looks like just a prefix (merged cell case)
                const prefixList = ['ด.ช.', 'ด.ญ.', 'นาย', 'นางสาว', 'นาง', 'น.ส.', 'เด็กชาย', 'เด็กหญิง'];
                const isJustPrefix = prefixList.includes(cellValue);

                if (isJustPrefix && row[nameColIdx + 1] && row[nameColIdx + 2]) {
                    // Merged header case: column has prefix, next columns have first/last name
                    prefix = cellValue;
                    firstName = String(row[nameColIdx + 1]).trim();
                    lastName = String(row[nameColIdx + 2]).trim();
                } else {
                    // True combined name - parse from single cell
                    let coreName = cellValue;
                    for (const p of prefixList) {
                        if (coreName.startsWith(p)) {
                            prefix = p;
                            coreName = coreName.replace(p, '').trim();
                            break;
                        }
                    }

                    const nameParts = coreName.split(/\s+/);
                    firstName = nameParts[0] || '';
                    lastName = nameParts.slice(1).join(' ') || '';
                }
            }

            students.push({
                student_id: studentId,
                prefix,
                first_name: firstName,
                last_name: lastName,
                level: currentLevel || 'ไม่ระบุ',
                room: currentRoom || ''
            });
        }
    }
});

// Output results
console.log('\n' + '='.repeat(60));
console.log('📊 PARSING RESULTS');
console.log('='.repeat(60));
console.log(`Total students parsed: ${students.length}`);

if (students.length > 0) {
    console.log('\n🔎 First 5 students:');
    students.slice(0, 5).forEach((s, i) => {
        console.log(`  ${i + 1}. ID: ${s.student_id}`);
        console.log(`     Prefix: "${s.prefix}"`);
        console.log(`     First Name: "${s.first_name}"`);
        console.log(`     Last Name: "${s.last_name}"`);
        console.log(`     Level/Room: ${s.level}/${s.room}`);
    });

    // Check for empty names
    const emptyNames = students.filter(s => !s.first_name);
    if (emptyNames.length > 0) {
        console.log(`\n⚠️  WARNING: ${emptyNames.length} students have empty first_name!`);
    }
} else {
    console.log('\n❌ No students were parsed. Check the column mapping above.');
}
