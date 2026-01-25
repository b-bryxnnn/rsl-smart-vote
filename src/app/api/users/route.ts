import { NextRequest, NextResponse } from 'next/server'
import { getAllUsers, createUser, getSessionByToken } from '@/lib/db'
import { hashPassword } from '@/lib/hash'

export const runtime = 'edge'

// Middleware to check admin auth
async function requireAdmin(request: NextRequest) {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null
    }
    const sessionToken = authHeader.substring(7)
    const result = await getSessionByToken(sessionToken)
    if (!result || result.user.role !== 'admin') {
        return null
    }
    return result.user
}

export async function GET(request: NextRequest) {
    try {
        const admin = await requireAdmin(request)
        if (!admin) {
            return NextResponse.json(
                { success: false, message: 'ไม่มีสิทธิ์เข้าถึง' },
                { status: 403 }
            )
        }

        const users = await getAllUsers()
        // Don't return password hashes
        const safeUsers = users.map(u => ({
            id: u.id,
            username: u.username,
            role: u.role,
            displayName: u.display_name,
            isActive: u.is_active === 1,
            createdAt: u.created_at,
            lastLogin: u.last_login
        }))

        return NextResponse.json({ success: true, users: safeUsers })
    } catch (error) {
        console.error('Get users error:', error)
        return NextResponse.json(
            { success: false, message: 'เกิดข้อผิดพลาดในระบบ' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        const admin = await requireAdmin(request)
        if (!admin) {
            return NextResponse.json(
                { success: false, message: 'ไม่มีสิทธิ์เข้าถึง' },
                { status: 403 }
            )
        }

        const body = await request.json() as {
            username?: string
            password?: string
            role?: 'admin' | 'committee'
            displayName?: string
        }
        const { username, password, role, displayName } = body

        if (!username || !password || !role) {
            return NextResponse.json(
                { success: false, message: 'กรุณากรอกข้อมูลให้ครบ' },
                { status: 400 }
            )
        }

        if (!['admin', 'committee'].includes(role)) {
            return NextResponse.json(
                { success: false, message: 'Role ไม่ถูกต้อง' },
                { status: 400 }
            )
        }

        const passwordHash = await hashPassword(password)
        const user = await createUser(username, passwordHash, role, displayName)

        if (!user) {
            return NextResponse.json(
                { success: false, message: 'ไม่สามารถสร้างผู้ใช้ได้ (อาจซ้ำ)' },
                { status: 400 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'สร้างผู้ใช้สำเร็จ',
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                displayName: user.display_name
            }
        })
    } catch (error) {
        console.error('Create user error:', error)
        return NextResponse.json(
            { success: false, message: 'เกิดข้อผิดพลาดในระบบ' },
            { status: 500 }
        )
    }
}
