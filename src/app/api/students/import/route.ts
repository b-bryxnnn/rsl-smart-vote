import { NextRequest, NextResponse } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

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
        const { csvData } = body

        if (!csvData || typeof csvData !== 'string') {
            return NextResponse.json(
                { success: false, message: 'กรุณาส่งข้อมูล CSV' },
                { status: 400 }
            )
        }

        const lines = csvData.split('\n').filter((line: string) => line.trim())

        if (lines.length < 2) {
            return NextResponse.json(
                { success: false, message: 'ไฟล์ CSV ต้องมีอย่างน้อย 1 แถวของข้อมูล' },
                { status: 400 }
            )
        }

        // Parse header
        const header = lines[0].split(',').map((h: string) => h.trim().toLowerCase())
        const requiredFields = ['student_id', 'prefix', 'first_name', 'last_name', 'level']

        for (const field of requiredFields) {
            if (!header.includes(field)) {
                return NextResponse.json(
                    { success: false, message: `ไม่พบคอลัมน์ ${field} ในไฟล์ CSV` },
                    { status: 400 }
                )
            }
        }

        // Parse data rows
        const students: StudentRow[] = []

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map((v: string) => v.trim())

            if (values.length < header.length) continue

            const row: Record<string, string> = {}
            header.forEach((h: string, idx: number) => {
                row[h] = values[idx] || ''
            })

            if (row.student_id && row.first_name && row.last_name) {
                students.push({
                    student_id: row.student_id,
                    prefix: row.prefix || '',
                    first_name: row.first_name,
                    last_name: row.last_name,
                    level: row.level || '',
                    room: row.room || '',
                })
            }
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

        const batch = students.map(s =>
            stmt.bind(s.student_id, s.prefix, s.first_name, s.last_name, s.level, s.room || null)
        )

        await db.batch(batch)

        // Get total count
        const countResult = await db.prepare('SELECT COUNT(*) as count FROM students').first<{ count: number }>()

        return NextResponse.json({
            success: true,
            message: `นำเข้าข้อมูลสำเร็จ`,
            count: students.length,
            total: countResult?.count || 0,
        })
    } catch (error) {
        console.error('Error importing students:', error)
        return NextResponse.json(
            { success: false, message: 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล' },
            { status: 500 }
        )
    }
}
