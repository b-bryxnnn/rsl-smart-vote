import { NextRequest, NextResponse } from 'next/server'
import { getTokenByCode } from '@/lib/db'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as any
        const { code } = body

        if (!code || typeof code !== 'string') {
            return NextResponse.json(
                { success: false, message: 'กรุณากรอกรหัส' },
                { status: 400 }
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

            case 'activated':
                // Valid token - can proceed to vote
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
