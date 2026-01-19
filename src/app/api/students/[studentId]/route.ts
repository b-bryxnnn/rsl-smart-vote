import { NextRequest, NextResponse } from 'next/server'
import { getStudentByStudentId } from '@/lib/db'

export const runtime = 'edge'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ studentId: string }> }
) {
    try {
        const { studentId } = await params

        if (!studentId) {
            return NextResponse.json(
                { success: false, message: 'กรุณาระบุรหัสนักเรียน' },
                { status: 400 }
            )
        }

        const student = await getStudentByStudentId(studentId)

        if (!student) {
            return NextResponse.json(
                { success: false, message: 'ไม่พบข้อมูลนักเรียนรหัสนี้' },
                { status: 404 }
            )
        }

        return NextResponse.json({
            success: true,
            student: {
                id: student.id,
                student_id: student.student_id,
                prefix: student.prefix,
                first_name: student.first_name,
                last_name: student.last_name,
                level: student.level,
                room: student.room,
                has_voted: student.has_voted,
            },
        })
    } catch (error) {
        console.error('Error fetching student:', error)
        return NextResponse.json(
            { success: false, message: 'เกิดข้อผิดพลาดในระบบ' },
            { status: 500 }
        )
    }
}
