import { NextRequest, NextResponse } from 'next/server'
import { getUserById, updateUser, updateUserPassword, deleteUser, getSessionByToken } from '@/lib/db'
import { hashPassword } from '@/lib/hash'

export const runtime = 'edge'

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

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const admin = await requireAdmin(request)
        if (!admin) {
            return NextResponse.json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 })
        }

        const { id } = await params
        const user = await getUserById(parseInt(id))
        if (!user) {
            return NextResponse.json({ success: false, message: 'ไม่พบผู้ใช้' }, { status: 404 })
        }

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                displayName: user.display_name,
                isActive: user.is_active === 1,
                createdAt: user.created_at,
                lastLogin: user.last_login
            }
        })
    } catch (error) {
        console.error('Get user error:', error)
        return NextResponse.json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ' }, { status: 500 })
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const admin = await requireAdmin(request)
        if (!admin) {
            return NextResponse.json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 })
        }

        const { id } = await params
        const userId = parseInt(id)
        const body = await request.json() as {
            displayName?: string
            role?: 'admin' | 'committee'
            isActive?: boolean
            newPassword?: string
        }

        // Update password if provided
        if (body.newPassword) {
            const passwordHash = await hashPassword(body.newPassword)
            await updateUserPassword(userId, passwordHash)
        }

        // Update other fields
        const updates: any = {}
        if (body.displayName !== undefined) updates.display_name = body.displayName
        if (body.role !== undefined) updates.role = body.role
        if (body.isActive !== undefined) updates.is_active = body.isActive ? 1 : 0

        if (Object.keys(updates).length > 0) {
            await updateUser(userId, updates)
        }

        return NextResponse.json({ success: true, message: 'อัปเดตผู้ใช้สำเร็จ' })
    } catch (error) {
        console.error('Update user error:', error)
        return NextResponse.json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ' }, { status: 500 })
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const admin = await requireAdmin(request)
        if (!admin) {
            return NextResponse.json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 })
        }

        const { id } = await params
        const userId = parseInt(id)

        // Prevent deleting self
        if (userId === admin.id) {
            return NextResponse.json({ success: false, message: 'ไม่สามารถลบบัญชีตัวเองได้' }, { status: 400 })
        }

        const deleted = await deleteUser(userId)
        if (!deleted) {
            return NextResponse.json({ success: false, message: 'ไม่พบผู้ใช้' }, { status: 404 })
        }

        return NextResponse.json({ success: true, message: 'ลบผู้ใช้สำเร็จ' })
    } catch (error) {
        console.error('Delete user error:', error)
        return NextResponse.json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ' }, { status: 500 })
    }
}
