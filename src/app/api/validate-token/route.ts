import { NextRequest, NextResponse } from 'next/server'
import { getTokenByCode, setTokenVoting, getElectionStatus, logActivity, checkRateLimit } from '@/lib/db'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as { code?: string }
        const { code } = body

        const ip = request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || 'unknown'
        const userAgent = request.headers.get('user-agent') || 'unknown'

        if (!code || typeof code !== 'string') {
            return NextResponse.json(
                { success: false, message: 'กรุณากรอกรหัส' },
                { status: 400 }
            )
        }

        // Check election status
        const electionStatus = await getElectionStatus()

        // Check scheduled status
        let effectiveStatus = electionStatus.status
        const now = new Date()
        if (electionStatus.status === 'scheduled') {
            if (electionStatus.openTime && new Date(electionStatus.openTime) <= now) {
                if (!electionStatus.closeTime || new Date(electionStatus.closeTime) > now) {
                    effectiveStatus = 'open'
                } else {
                    effectiveStatus = 'closed'
                }
            } else {
                effectiveStatus = 'closed'
            }
        }

        if (effectiveStatus === 'closed') {
            return NextResponse.json(
                {
                    success: false,
                    message: 'ระบบเลือกตั้งปิดอยู่',
                    electionClosed: true,
                    scheduledOpenTime: electionStatus.openTime
                },
                { status: 403 }
            )
        }

        // Rate limiting
        const rateCheck = await checkRateLimit(ip, 'validate_token', 20, 5)
        if (!rateCheck.allowed) {
            return NextResponse.json(
                { success: false, message: 'สแกนเร็วเกินไป กรุณารอสักครู่' },
                { status: 429 }
            )
        }

        const cleanCode = code.toUpperCase().trim()

        // Look up token
        const token = await getTokenByCode(cleanCode)

        if (!token) {
            await logActivity('validate_failed', { tokenCode: cleanCode, reason: 'not_found' }, undefined, undefined, ip, userAgent)
            return NextResponse.json(
                { success: false, message: 'ไม่พบรหัสนี้ในระบบ' },
                { status: 404 }
            )
        }

        // Check token status
        switch (token.status) {
            case 'inactive':
                await logActivity('validate_failed', { tokenCode: cleanCode, reason: 'not_activated' }, undefined, undefined, ip, userAgent)
                return NextResponse.json(
                    { success: false, message: 'บัตรนี้ยังไม่ได้เปิดสิทธิ์ กรุณาติดต่อกรรมการ' },
                    { status: 400 }
                )

            case 'used':
                await logActivity('validate_failed', { tokenCode: cleanCode, reason: 'already_used' }, undefined, undefined, ip, userAgent)
                return NextResponse.json(
                    { success: false, message: 'บัตรนี้ถูกใช้ไปแล้ว' },
                    { status: 400 }
                )

            case 'expired':
                await logActivity('validate_failed', { tokenCode: cleanCode, reason: 'expired' }, undefined, undefined, ip, userAgent)
                return NextResponse.json(
                    { success: false, message: 'บัตรนี้หมดอายุแล้ว' },
                    { status: 400 }
                )

            case 'voting':
                await logActivity('validate_failed', { tokenCode: cleanCode, reason: 'already_voting' }, undefined, undefined, ip, userAgent)
                return NextResponse.json(
                    { success: false, message: 'บัตรนี้กำลังใช้งานอยู่ที่เครื่องอื่น' },
                    { status: 400 }
                )

            case 'activated':
                // Valid token - change status to 'voting'
                const updated = await setTokenVoting(cleanCode)
                if (!updated) {
                    return NextResponse.json(
                        { success: false, message: 'ไม่สามารถเริ่มลงคะแนนได้' },
                        { status: 500 }
                    )
                }

                await logActivity('token_voting_started', { tokenCode: cleanCode, stationLevel: token.station_level }, undefined, undefined, ip, userAgent)

                return NextResponse.json({
                    success: true,
                    message: 'รหัสถูกต้อง',
                    token: {
                        code: token.code,
                        stationLevel: token.station_level,
                    },
                })

            default:
                return NextResponse.json(
                    { success: false, message: 'สถานะบัตรไม่ถูกต้อง' },
                    { status: 400 }
                )
        }
    } catch (error) {
        console.error('Error validating token:', error)
        return NextResponse.json(
            { success: false, message: 'เกิดข้อผิดพลาดในระบบ' },
            { status: 500 }
        )
    }
}
