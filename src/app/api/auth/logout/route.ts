import { NextRequest, NextResponse } from 'next/server'
import { deleteSession, getSessionByToken, logActivity } from '@/lib/db'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as { sessionToken?: string }
        const { sessionToken } = body

        if (!sessionToken) {
            return NextResponse.json({ success: true, message: 'ออกจากระบบสำเร็จ' })
        }

        const ip = request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || 'unknown'
        const userAgent = request.headers.get('user-agent') || 'unknown'

        // Get user info before deleting session
        const result = await getSessionByToken(sessionToken)
        if (result) {
            await logActivity('logout', {}, result.user.id, result.user.username, ip, userAgent)
        }

        await deleteSession(sessionToken)

        return NextResponse.json({ success: true, message: 'ออกจากระบบสำเร็จ' })
    } catch (error) {
        console.error('Logout error:', error)
        return NextResponse.json(
            { success: false, message: 'เกิดข้อผิดพลาดในระบบ' },
            { status: 500 }
        )
    }
}
