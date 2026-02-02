import { NextResponse } from 'next/server'
import { getDebugElectionSettings } from '@/lib/db'

export const runtime = 'nodejs'

// Get current Thailand time
function getThailandNow(): Date {
    const now = new Date()
    const thailandOffset = 7 * 60 * 60 * 1000
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60 * 1000
    return new Date(utcTime + thailandOffset)
}

export async function GET() {
    try {
        let dbStatus = "Connected"
        let errorMsg = null
        let electionSettings: { key: string; value: string; updated_at: Date }[] = []

        try {
            electionSettings = await getDebugElectionSettings()
        } catch (e: any) {
            dbStatus = "Error: " + e.message
            errorMsg = e.toString()
        }

        const thailandNow = getThailandNow()

        return NextResponse.json({
            status: 'Debug Info',
            dbStatus,
            electionSettings,
            thailandTime: thailandNow.toISOString(),
            utcTime: new Date().toISOString(),
            error: errorMsg
        })
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            message: 'Fatal Debug Error',
            error: error.message
        }, { status: 500 })
    }
}
