import { NextRequest, NextResponse } from 'next/server'
import { importStudentsBatch } from '@/lib/db'

export const runtime = 'nodejs'

// Parse Thai prefix from name
function parseThaiName(fullName: string): { prefix: string; firstName: string; lastName: string } {
    const prefixes = ['นาย', 'นางสาว', 'น.ส.', 'ด.ช.', 'ด.ญ.', 'เด็กชาย', 'เด็กหญิง']
    let prefix = ''
    let restOfName = fullName.trim()

    for (const p of prefixes) {
        if (restOfName.startsWith(p)) {
            prefix = p
            restOfName = restOfName.substring(p.length).trim()
            break
        }
    }

    const parts = restOfName.split(/\s+/)
    const firstName = parts[0] || ''
    const lastName = parts.slice(1).join(' ') || ''

    return { prefix, firstName, lastName }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as { data?: any[]; level?: string }
        const { data, level } = body

        if (!data || !Array.isArray(data) || data.length === 0) {
            return NextResponse.json({ success: false, message: 'ไม่พบข้อมูลนักเรียน' }, { status: 400 })
        }

        if (!level) {
            return NextResponse.json({ success: false, message: 'กรุณาระบุระดับชั้น' }, { status: 400 })
        }

        let currentRoom = '1'
        let lastRowNum = 0
        const studentsToImport: { student_id: string; prefix: string; first_name: string; last_name: string; level: string; room: string }[] = []

        // Process students one by one
        for (const row of data) {
            if (!row.student_id || !row.name) continue

            const rowNum = parseInt(row.row_number)
            if (!isNaN(rowNum)) {
                if (lastRowNum > 0 && rowNum < lastRowNum) {
                    currentRoom = String(parseInt(currentRoom) + 1)
                }
                lastRowNum = rowNum
            }

            const { prefix, firstName, lastName } = parseThaiName(row.name)

            studentsToImport.push({
                student_id: row.student_id,
                prefix,
                first_name: firstName,
                last_name: lastName,
                level,
                room: row.room || currentRoom
            })
        }

        await importStudentsBatch(studentsToImport)

        return NextResponse.json({
            success: true,
            count: studentsToImport.length,
            message: `นำเข้านักเรียน ${level} จำนวน ${studentsToImport.length} คน`
        })
    } catch (error) {
        console.error('Error importing Excel data:', error)
        return NextResponse.json({ success: false, message: 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล' }, { status: 500 })
    }
}
