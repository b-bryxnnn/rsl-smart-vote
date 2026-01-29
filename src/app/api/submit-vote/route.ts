import { NextRequest, NextResponse } from 'next/server'
import { getTokenByCode, completeVoteAndClearLink, createVote, markStudentAsVoted } from '@/lib/db'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as { token?: string; partyId?: number; isAbstain?: boolean }
        const { token, partyId, isAbstain } = body

        if (!token) {
            return NextResponse.json(
                { success: false, message: 'ไม่พบรหัสบัตร' },
                { status: 400 }
            )
        }

        const cleanCode = token.toUpperCase().trim()

        // Verify token is in 'voting' status
        const tokenRecord = await getTokenByCode(cleanCode)

        if (!tokenRecord) {
            return NextResponse.json(
                { success: false, message: 'ไม่พบบัตรนี้ในระบบ' },
                { status: 404 }
            )
        }

        if (tokenRecord.status !== 'voting') {
            const messages: Record<string, string> = {
                'inactive': 'บัตรนี้ยังไม่ได้เปิดสิทธิ์',
                'activated': 'บัตรนี้ยังไม่ได้สแกนที่จุดลงคะแนน',
                'used': 'บัตรนี้ถูกใช้ไปแล้ว',
                'expired': 'บัตรนี้หมดอายุแล้ว'
            }
            return NextResponse.json(
                { success: false, message: messages[tokenRecord.status] || 'สถานะบัตรไม่ถูกต้อง' },
                { status: 400 }
            )
        }

        // Complete vote and clear student link (for anonymity)
        const result = await completeVoteAndClearLink(cleanCode)

        if (!result.success) {
            return NextResponse.json(
                { success: false, message: 'ไม่สามารถบันทึกคะแนนได้' },
                { status: 500 }
            )
        }

        // Mark student as voted (now that we have the student_id before it was cleared)
        if (result.studentId) {
            await markStudentAsVoted(result.studentId)
        }

        // Create vote record (anonymous - no student link)
        const stationLevel = tokenRecord.station_level || 'unknown'
        await createVote(
            isAbstain ? null : partyId || null,
            stationLevel,
            tokenRecord.id,
            isAbstain || false
        )

        return NextResponse.json({
            success: true,
            message: 'บันทึกคะแนนเรียบร้อย',
        })
    } catch (error) {
        console.error('Error submitting vote:', error)
        return NextResponse.json(
            { success: false, message: 'เกิดข้อผิดพลาดในระบบ' },
            { status: 500 }
        )
    }
}
