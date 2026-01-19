import { NextRequest, NextResponse } from 'next/server'
import { getTokenByCode, activateToken, markStudentAsVoted, getStudentByStudentId } from '@/lib/db'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { tokenCode, studentId } = body

        if (!tokenCode || !studentId) {
            return NextResponse.json(
                { success: false, message: 'กรุณาระบุข้อมูลให้ครบ' },
                { status: 400 }
            )
        }

        const cleanCode = tokenCode.toUpperCase().trim()

        // Check if student exists and hasn't voted
        const student = await getStudentByStudentId(studentId)

        if (!student) {
            return NextResponse.json(
                { success: false, message: 'ไม่พบข้อมูลนักเรียน' },
                { status: 404 }
            )
        }

        if (student.has_voted === 1) {
            return NextResponse.json(
                { success: false, message: 'นักเรียนคนนี้ใช้สิทธิ์ไปแล้ว' },
                { status: 400 }
            )
        }

        // Check token status
        const token = await getTokenByCode(cleanCode)

        if (!token) {
            return NextResponse.json(
                { success: false, message: 'ไม่พบบัตรนี้ในระบบ' },
                { status: 404 }
            )
        }

        if (token.status !== 'inactive') {
            return NextResponse.json(
                { success: false, message: token.status === 'used' ? 'บัตรนี้ถูกใช้ไปแล้ว' : 'บัตรนี้เปิดสิทธิ์ไปแล้ว' },
                { status: 400 }
            )
        }

        // Activate token and mark student as voted
        const activated = await activateToken(cleanCode)

        if (!activated) {
            return NextResponse.json(
                { success: false, message: 'ไม่สามารถเปิดสิทธิ์บัตรได้' },
                { status: 500 }
            )
        }

        // Mark student as voted (but don't link to token for anonymity)
        await markStudentAsVoted(studentId)

        return NextResponse.json({
            success: true,
            message: 'เปิดสิทธิ์สำเร็จ',
        })
    } catch (error) {
        console.error('Error activating token:', error)
        return NextResponse.json(
            { success: false, message: 'เกิดข้อผิดพลาดในระบบ' },
            { status: 500 }
        )
    }
}
