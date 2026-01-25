import { NextResponse } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

// Get current Thailand time
function getThailandNow(): Date {
    const now = new Date()
    const thailandOffset = 7 * 60 * 60 * 1000
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60 * 1000
    return new Date(utcTime + thailandOffset)
}

export async function GET() {
    try {
        let envInfo = "Attempting to getRequestContext"
        let dbStatus = "Unknown"
        let errorMsg = null
        let electionSettings: any[] = []

        try {
            const ctx = getRequestContext()
            envInfo = "Context retrieved"

            if (ctx.env) {
                const keys = Object.keys(ctx.env)
                envInfo += `. Env keys: ${keys.join(', ')}`

                if (ctx.env.DB) {
                    dbStatus = "DB binding found"

                    // Query election settings from system_settings
                    const { results } = await ctx.env.DB.prepare(
                        "SELECT key, value, updated_at FROM system_settings WHERE key LIKE 'election%'"
                    ).all()
                    electionSettings = results || []
                } else {
                    dbStatus = "DB binding MISSING in ctx.env"
                }
            } else {
                envInfo += ". ctx.env is undefined"
            }

        } catch (e: any) {
            envInfo = "Error calling getRequestContext: " + e.message
            errorMsg = e.toString()
        }

        const thailandNow = getThailandNow()

        return NextResponse.json({
            status: 'Debug Info',
            envInfo,
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
