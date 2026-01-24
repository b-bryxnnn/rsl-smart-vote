import { NextRequest, NextResponse } from 'next/server'
import { getActivityLogs, getSessionByToken } from '@/lib/db'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization')
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 })
        }

        const sessionToken = authHeader.substring(7)
        const result = await getSessionByToken(sessionToken)
        if (!result || result.user.role !== 'admin') {
            return NextResponse.json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 })
        }

        const url = new URL(request.url)
        const limit = parseInt(url.searchParams.get('limit') || '100')

        const logs = await getActivityLogs(limit)

        return NextResponse.json({ success: true, logs })
    } catch (error) {
        console.error('Get activity logs error:', error)
        return NextResponse.json(
            { success: false, message: 'เกิดข้อผิดพลาดในระบบ' },
            { status: 500 }
        )
    }
}
