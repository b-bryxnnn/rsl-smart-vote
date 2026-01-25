import { NextRequest, NextResponse } from 'next/server'
import { expireOldTokens } from '@/lib/db'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as { timeoutMinutes?: number }
        const timeoutMinutes = body.timeoutMinutes || 30

        const result = await expireOldTokens(timeoutMinutes)

        return NextResponse.json({
            success: true,
            expiredCount: result.expiredCount,
            absentStudentsCount: result.absentStudents.length
        })
    } catch (error) {
        console.error('Expire check error:', error)
        return NextResponse.json(
            { success: false, message: 'เกิดข้อผิดพลาดในระบบ' },
            { status: 500 }
        )
    }
}
