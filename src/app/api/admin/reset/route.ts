import { NextRequest, NextResponse } from 'next/server'
import { resetDatabase } from '@/lib/db'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as { mode?: 'all' | 'votes' | 'students' }
        const { mode } = body

        if (!mode || !['all', 'votes', 'students'].includes(mode)) {
            return NextResponse.json({ success: false, message: 'กรุณาระบุโหมดที่ถูกต้อง' }, { status: 400 })
        }

        await resetDatabase(mode)

        return NextResponse.json({ success: true, message: 'รีเซ็ตระบบเรียบร้อย' })
    } catch (error) {
        console.error('Reset error:', error)
        return NextResponse.json({ success: false, message: 'เกิดข้อผิดพลาด' }, { status: 500 })
    }
}
