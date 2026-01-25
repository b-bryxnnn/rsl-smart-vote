import { NextRequest, NextResponse } from 'next/server'
import { deleteSession } from '@/lib/db'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as { sessionToken?: string }
        const { sessionToken } = body

        if (!sessionToken) {
            return NextResponse.json({ success: true, message: 'ออกจากระบบสำเร็จ' })
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
