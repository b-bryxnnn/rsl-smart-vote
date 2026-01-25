import { NextRequest, NextResponse } from 'next/server'
import { getElectionStatus, setSystemSetting, getSessionByToken } from '@/lib/db'

export const runtime = 'edge'

// Get current Thailand time
function getThailandNow(): Date {
    const now = new Date()
    // Thailand is UTC+7
    const thailandOffset = 7 * 60 * 60 * 1000
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60 * 1000
    return new Date(utcTime + thailandOffset)
}

// Public GET - anyone can check election status
export async function GET() {
    try {
        const status = await getElectionStatus()

        // Check if scheduled time has passed - use Thailand time
        const now = getThailandNow()
        let effectiveStatus = status.status

        if (status.status === 'scheduled') {
            if (status.openTime) {
                const openTime = new Date(status.openTime)
                if (openTime <= now) {
                    if (!status.closeTime || new Date(status.closeTime) > now) {
                        effectiveStatus = 'open'
                    } else {
                        effectiveStatus = 'closed'
                    }
                } else {
                    effectiveStatus = 'closed'
                }
            } else {
                effectiveStatus = 'closed'
            }
        }

        return NextResponse.json({
            success: true,
            status: effectiveStatus,
            scheduledOpenTime: status.openTime,
            scheduledCloseTime: status.closeTime,
            rawStatus: status.status,
            serverTime: now.toISOString() // For debugging
        })
    } catch (error) {
        console.error('Get election status error:', error)
        return NextResponse.json(
            { success: false, message: 'เกิดข้อผิดพลาดในระบบ' },
            { status: 500 }
        )
    }
}

// Admin POST - update election status
export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization')
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 })
        }

        const sessionToken = authHeader.substring(7)
        const result = await getSessionByToken(sessionToken)
        if (!result || result.user.role !== 'admin') {
            return NextResponse.json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 })
        }

        const body = await request.json() as {
            status?: 'open' | 'closed' | 'scheduled'
            openTime?: string
            closeTime?: string
        }

        if (body.status) {
            await setSystemSetting('election_status', body.status)
        }
        if (body.openTime !== undefined) {
            await setSystemSetting('election_open_time', body.openTime)
        }
        if (body.closeTime !== undefined) {
            await setSystemSetting('election_close_time', body.closeTime)
        }

        return NextResponse.json({ success: true, message: 'อัปเดตสถานะเรียบร้อย' })
    } catch (error) {
        console.error('Update election status error:', error)
        return NextResponse.json(
            { success: false, message: 'เกิดข้อผิดพลาดในระบบ' },
            { status: 500 }
        )
    }
}
