import { NextResponse } from 'next/server'
import { getPrintLogs } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET() {
    try {
        const logs = await getPrintLogs()

        return NextResponse.json({
            success: true,
            logs,
        })
    } catch (error) {
        console.error('Error fetching print logs:', error)
        return NextResponse.json(
            { success: false, message: 'เกิดข้อผิดพลาดในระบบ' },
            { status: 500 }
        )
    }
}
