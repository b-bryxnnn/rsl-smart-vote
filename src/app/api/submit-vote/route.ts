import { NextRequest, NextResponse } from 'next/server'
import { getTokenByCode, useToken, createVote } from '@/lib/db'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { token, partyId, isAbstain } = body

        if (!token) {
            return NextResponse.json(
                { success: false, message: 'ไม่พบรหัสบัตร' },
                { status: 400 }
            )
        }

        const cleanCode = token.toUpperCase().trim()

        // Verify token is activated
        const tokenRecord = await getTokenByCode(cleanCode)

        if (!tokenRecord) {
            return NextResponse.json(
                { success: false, message: 'ไม่พบบัตรนี้ในระบบ' },
                { status: 404 }
            )
        }

        if (tokenRecord.status !== 'activated') {
            return NextResponse.json(
                { success: false, message: tokenRecord.status === 'used' ? 'บัตรนี้ถูกใช้ไปแล้ว' : 'บัตรนี้ยังไม่ได้เปิดสิทธิ์' },
                { status: 400 }
            )
        }

        // Mark token as used
        const used = await useToken(cleanCode)

        if (!used) {
            return NextResponse.json(
                { success: false, message: 'ไม่สามารถบันทึกคะแนนได้' },
                { status: 500 }
            )
        }

        // Create vote record
        const stationLevel = tokenRecord.station_level || 'unknown'
        await createVote(
            isAbstain ? null : partyId,
            stationLevel,
            tokenRecord.id,
            isAbstain
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
