import { NextRequest, NextResponse } from 'next/server'
import { getSessionByToken } from '@/lib/db'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as { sessionToken?: string }
        const { sessionToken } = body

        if (!sessionToken) {
            return NextResponse.json(
                { success: false, message: 'ไม่พบ session token' },
                { status: 401 }
            )
        }

        const result = await getSessionByToken(sessionToken)

        if (!result) {
            return NextResponse.json(
                { success: false, message: 'Session ไม่ถูกต้องหรือหมดอายุ' },
                { status: 401 }
            )
        }

        const { user } = result

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                displayName: user.display_name
            }
        })
    } catch (error) {
        console.error('Session verify error:', error)
        return NextResponse.json(
            { success: false, message: 'เกิดข้อผิดพลาดในระบบ' },
            { status: 500 }
        )
    }
}
