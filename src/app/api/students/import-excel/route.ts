import { NextRequest, NextResponse } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'

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
        const body = await request.json() as any
        const { data, level } = body

        if (!data || !Array.isArray(data) || data.length === 0) {
            return NextResponse.json({ success: false, message: 'ไม่พบข้อมูลนักเรียน' }, { status: 400 })
        }

        if (!level) {
            return NextResponse.json({ success: false, message: 'กรุณาระบุระดับชั้น' }, { status: 400 })
        }

        const { env } = getRequestContext()
        const db = env.DB

        let currentRoom = '1'
        let lastRowNum = 0
        let addedCount = 0

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

            try {
                await db.prepare(
                    'INSERT OR REPLACE INTO students (student_id, prefix, first_name, last_name, level, room) VALUES (?, ?, ?, ?, ?, ?)'
                ).bind(row.student_id, prefix, firstName, lastName, level, row.room || currentRoom).run()
                addedCount++
            } catch (e) {
                console.error('Error inserting student:', e)
            }
        }

        return NextResponse.json({
            success: true,
            count: addedCount,
            message: `นำเข้านักเรียน ${level} จำนวน ${addedCount} คน`
        })
    } catch (error) {
        console.error('Error importing Excel data:', error)
        return NextResponse.json({ success: false, message: 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล' }, { status: 500 })
    }
}
