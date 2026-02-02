import { NextResponse } from 'next/server'
import { clearPrintLogs } from '@/lib/db'

export const runtime = 'nodejs'

export async function POST() {
    try {
        await clearPrintLogs()

        return NextResponse.json({ success: true, message: 'ลบประวัติการพิมพ์เรียบร้อย' })
    } catch (error) {
        console.error('Error clearing print logs:', error)
        return NextResponse.json({ success: false, message: 'เกิดข้อผิดพลาดในการลบข้อมูล' }, { status: 500 })
    }
}
