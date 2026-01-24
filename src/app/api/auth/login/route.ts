import { NextRequest, NextResponse } from 'next/server'
import { getUserByUsername, createSession, logActivity, checkRateLimit } from '@/lib/db'
import { verifyPassword, generateSessionToken } from '@/lib/hash'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as { username?: string; password?: string }
        const { username, password } = body

        const ip = request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || 'unknown'
        const userAgent = request.headers.get('user-agent') || 'unknown'

        if (!username || !password) {
            return NextResponse.json(
                { success: false, message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' },
                { status: 400 }
            )
        }

        // Rate limiting
        const rateCheck = await checkRateLimit(ip, 'login', 5, 15)
        if (!rateCheck.allowed) {
            await logActivity('login_rate_limited', { username, ip }, undefined, undefined, ip, userAgent)
            return NextResponse.json(
                { success: false, message: 'ลองเข้าสู่ระบบหลายครั้งเกินไป กรุณารอ 15 นาที' },
                { status: 429 }
            )
        }

        // Get user
        const user = await getUserByUsername(username)
        if (!user) {
            await logActivity('login_failed', { username, reason: 'user_not_found' }, undefined, undefined, ip, userAgent)
            return NextResponse.json(
                { success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
                { status: 401 }
            )
        }

        // Verify password
        const isValid = await verifyPassword(password, user.password_hash)
        if (!isValid) {
            await logActivity('login_failed', { username, reason: 'invalid_password' }, undefined, undefined, ip, userAgent)
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

        // Log success
        await logActivity('login_success', { username, role: user.role }, user.id, user.username, ip, userAgent)

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
