import { NextRequest, NextResponse } from 'next/server'
import { getUserByUsername, createSession } from '@/lib/db'
import { verifyPassword, generateSessionToken } from '@/lib/hash'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as { username?: string; password?: string }
        const { username, password } = body

        if (!username || !password) {
            return NextResponse.json(
                { success: false, message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' },
                { status: 400 }
            )
        }

        // Get user
        const user = await getUserByUsername(username)
        if (!user) {
            return NextResponse.json(
                { success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
                { status: 401 }
            )
        }

        // Verify password
        const isValid = await verifyPassword(password, user.password_hash)
        if (!isValid) {
            return NextResponse.json(
                { success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
                { status: 401 }
            )
        }

        // Create session
        const sessionToken = generateSessionToken()
        const session = await createSession(user.id, sessionToken)

        if (!session) {
            return NextResponse.json(
                { success: false, message: 'ไม่สามารถสร้าง session ได้' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'เข้าสู่ระบบสำเร็จ',
            sessionToken,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                displayName: user.display_name
            }
        })
    } catch (error) {
        console.error('Login error:', error)
        return NextResponse.json(
            { success: false, message: 'เกิดข้อผิดพลาดในระบบ' },
            { status: 500 }
        )
    }
}
