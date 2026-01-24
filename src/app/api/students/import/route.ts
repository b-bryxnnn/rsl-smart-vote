import { NextRequest, NextResponse } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'
import * as XLSX from 'xlsx'

export const runtime = 'nodejs' // Change to nodejs for xlsx compatibility

interface StudentRow {
    student_id: string
    prefix: string
    first_name: string
    last_name: string
    level: string
    room: string
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as any
        const { fileType, fileData, csvData } = body

        let students: StudentRow[] = []

        // --- CSV Handler (Legacy Support) ---
        if (csvData) {
            students = parseCSV(csvData)
        }
        // --- Excel Handler ---
        else if (fileType === 'excel' && fileData) {
            students = parseExcel(fileData)
        } else {
            return NextResponse.json(
                { success: false, message: 'กรุณาส่งข้อมูลไฟล์ (CSV หรือ Excel)' },
                { status: 400 }
            )
        }

        if (students.length === 0) {
            return NextResponse.json(
                { success: false, message: 'ไม่พบข้อมูลนักเรียนที่ถูกต้อง' },
                { status: 400 }
            )
        }

        // Insert into D1 database
        const { env } = getRequestContext()
        const db = env.DB

        // Insert students (skip duplicates)
        const stmt = db.prepare(
            'INSERT OR IGNORE INTO students (student_id, prefix, first_name, last_name, level, room) VALUES (?, ?, ?, ?, ?, ?)'
        )

        // Process in batches of 50 to avoid SQL limits
        const chunkSize = 50
        let successCount = 0

        for (let i = 0; i < students.length; i += chunkSize) {
            const chunk = students.slice(i, i + chunkSize)
            const batch = chunk.map(s =>
                stmt.bind(s.student_id, s.prefix, s.first_name, s.last_name, s.level, s.room)
            )
            try {
                await db.batch(batch)
                successCount += chunk.length
            } catch (err) {
                console.error('Batch insert error:', err)
            }
        }

        // Get total count
        const countResult = await db.prepare('SELECT COUNT(*) as count FROM students').first<{ count: number }>()

        return NextResponse.json({
            success: true,
            message: `นำเข้าสำเร็จ ${successCount} รายการ`,
            count: successCount,
            total: countResult?.count || 0,
        })
    } catch (error: any) {
        console.error('Error importing students:', error)
        return NextResponse.json(
            { success: false, message: 'เกิดข้อผิดพลาด: ' + error.message },
            { status: 500 }
        )
    }
}

function parseCSV(csvData: string): StudentRow[] {
    const lines = csvData.split('\n').filter((line: string) => line.trim())
    if (lines.length < 2) return []

    const header = lines[0].split(',').map((h: string) => h.trim().toLowerCase())
    const students: StudentRow[] = []

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map((v: string) => v.trim())
        if (values.length < header.length) continue

        const row: Record<string, string> = {}
        header.forEach((h: string, idx: number) => {
            row[h] = values[idx] || ''
        })

        if (row.student_id && row.first_name) {
            students.push({
                student_id: row.student_id,
                prefix: row.prefix || '',
                first_name: row.first_name,
                last_name: row.last_name || '',
                level: row.level || '',
                room: row.room || '',
            })
        }
    }
    return students
}

function parseExcel(base64Data: string): StudentRow[] {
    const wb = XLSX.read(base64Data, { type: 'base64' })
    const students: StudentRow[] = []

    wb.SheetNames.forEach(sheetName => {
        const ws = wb.Sheets[sheetName]
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]

        let currentLevel = ''
        let currentRoom = ''
        let headerFound = false
        const colMap: Record<string, number> = {}

        // 1. Try to detect Level/Room from Sheet Name (e.g. "ม.1", "1-1")
        if (sheetName.includes('ม.')) {
            currentLevel = sheetName.split(' ')[0]
        }

        for (let i = 0; i < data.length; i++) {
            const row = data[i]
            const rowStr = row.join(' ').trim()

            // 2. Detect Level/Room from Header Context (Thai School Format)
            // Example: "ชั้นมัธยมศึกษาปีที่ 1/1"
            const levelMatch = rowStr.match(/ชั้นมัธยมศึกษาปีที่\s*(\d+)\/(\d+)/)
            if (levelMatch) {
                currentLevel = `ม.${levelMatch[1]}`
                currentRoom = levelMatch[2]
            }

            // 3. Detect Table Header
            if (!headerFound && (row.includes('เลขประจำตัว') || row.includes('เลขที่'))) {
                headerFound = true
                // Map columns
                row.forEach((cell: any, idx: number) => {
                    if (typeof cell !== 'string') return
                    const val = cell.trim()
                    if (val.includes('เลขประจำตัว')) colMap['id'] = idx
                    else if (val.includes('ชื่อ') && val.includes('สกุล')) colMap['name'] = idx
                    else if (val.includes('ชื่อ') && !colMap['name']) colMap['name'] = idx // Fallback
                })
                continue
            }

            // 4. Extract Data
            if (headerFound) {
                // If ID column exists and has value
                if (colMap['id'] !== undefined && row[colMap['id']]) {
                    const studentId = String(row[colMap['id']]).trim()
                    const fullName = row[colMap['name']] ? String(row[colMap['name']]).trim() : ''

                    // Skip empty rows or footer text
                    if (!studentId || !/^\d+$/.test(studentId)) continue

                    // Parse Name (Prefix First Last)
                    let prefix = ''
                    let firstName = ''
                    let lastName = ''

                    // Simple thai prefix removal logic
                    const prefixes = ['ด.ช.', 'ด.ญ.', 'นาย', 'นางสาว', 'นาง']
                    let coreName = fullName
                    for (const p of prefixes) {
                        if (coreName.startsWith(p)) {
                            prefix = p
                            coreName = coreName.replace(p, '').trim()
                            break
                        }
                    }

                    const nameParts = coreName.split(/\s+/) // Split by whitespace
                    firstName = nameParts[0] || ''
                    lastName = nameParts.slice(1).join(' ') || ''

                    students.push({
                        student_id: studentId,
                        prefix,
                        first_name: firstName,
                        last_name: lastName,
                        level: currentLevel || 'ไม่ระบุ',
                        room: currentRoom || ''
                    })
                }
            }
        }
    })

    return students
}
