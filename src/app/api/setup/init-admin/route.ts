import { NextRequest, NextResponse } from 'next/server'
import { getAllUsers, createUser } from '@/lib/db'
import { hashPassword } from '@/lib/hash'

export const runtime = 'edge'

// This API creates the first admin user
// Only works when there are NO users in the database
export async function POST(request: NextRequest) {
    try {
        // Check if any users exist
        const existingUsers = await getAllUsers()
        if (existingUsers.length > 0) {
            return NextResponse.json(
                { success: false, message: 'มี user อยู่แล้วในระบบ กรุณาใช้ admin dashboard ในการสร้าง user เพิ่ม' },
                { status: 403 }
            )
        }

        const body = await request.json() as { username?: string; password?: string; displayName?: string }
        const { username, password, displayName } = body

        if (!username || !password) {
            return NextResponse.json(
                { success: false, message: 'กรุณาระบุ username และ password' },
                { status: 400 }
            )
        }

        // Hash password
        const passwordHash = await hashPassword(password)

        // Create admin user
        const user = await createUser(username, passwordHash, 'admin', displayName || 'ผู้ดูแลระบบ')

        if (!user) {
            return NextResponse.json(
                { success: false, message: 'ไม่สามารถสร้าง user ได้' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'สร้าง admin คนแรกสำเร็จ!',
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                displayName: user.display_name
            }
        })
    } catch (error) {
        console.error('Init admin error:', error)
        return NextResponse.json(
            { success: false, message: 'เกิดข้อผิดพลาดในระบบ' },
            { status: 500 }
        )
    }
}
