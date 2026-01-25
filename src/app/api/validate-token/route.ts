import { NextRequest, NextResponse } from 'next/server'
import { getTokenByCode, setTokenVoting, getElectionStatus } from '@/lib/db'

export const runtime = 'edge'

// Get current Thailand time
function getThailandNow(): Date {
    const now = new Date()
    const thailandOffset = 7 * 60 * 60 * 1000
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60 * 1000
    return new Date(utcTime + thailandOffset)
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as { code?: string; stationLevel?: string }
        const { code, stationLevel } = body

        if (!code || typeof code !== 'string') {
            return NextResponse.json(
                { success: false, message: 'กรุณากรอกรหัส' },
                { status: 400 }
            )
        }

        // Check election status
        const electionStatus = await getElectionStatus()

        // Check scheduled status - use Thailand time
        let effectiveStatus = electionStatus.status
        const now = getThailandNow()
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

        const cleanCode = code.toUpperCase().trim()

        // Look up token
        const token = await getTokenByCode(cleanCode)

        if (!token) {
            return NextResponse.json(
                { success: false, message: 'ไม่พบรหัสนี้ในระบบ' },
                { status: 404 }
            )
        }

        // Check token status
        switch (token.status) {
            case 'inactive':
                return NextResponse.json(
                    { success: false, message: 'บัตรนี้ยังไม่ได้เปิดสิทธิ์ กรุณาติดต่อกรรมการ' },
                    { status: 400 }
                )

            case 'used':
                return NextResponse.json(
                    { success: false, message: 'บัตรนี้ถูกใช้ไปแล้ว' },
                    { status: 400 }
                )

            case 'expired':
                return NextResponse.json(
                    { success: false, message: 'บัตรนี้หมดอายุแล้ว' },
                    { status: 400 }
                )

            case 'voting':
                return NextResponse.json(
                    { success: false, message: 'บัตรนี้กำลังใช้งานอยู่ที่เครื่องอื่น' },
                    { status: 400 }
                )

            case 'activated':
                // Check station level restriction
                // If stationLevel is provided (from scanning device) and token has station_level set
                if (stationLevel && token.station_level && stationLevel !== token.station_level) {
                    return NextResponse.json(
                        {
                            success: false,
                            message: `บัตรนี้เปิดสิทธิ์สำหรับ ${token.station_level} ไม่สามารถใช้ที่จุดลงคะแนน ${stationLevel} ได้`
                        },
                        { status: 400 }
                    )
                }

                // Valid token - change status to 'voting'
                const updated = await setTokenVoting(cleanCode)
                if (!updated) {
                    return NextResponse.json(
                        { success: false, message: 'ไม่สามารถเริ่มลงคะแนนได้' },
                        { status: 500 }
                    )
                }

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
