import { NextResponse } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

export async function GET() {
    try {
        let envInfo = "Attempting to getRequestContext"
        let dbStatus = "Unknown"
        let errorMsg = null

        try {
            const ctx = getRequestContext()
            envInfo = "Context retrieved"

            if (ctx.env) {
                const keys = Object.keys(ctx.env)
                envInfo += `. Env keys: ${keys.join(', ')}`

                if (ctx.env.DB) {
                    dbStatus = "DB binding found"
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

        return NextResponse.json({
            status: 'Debug Info',
            envInfo,
            dbStatus,
            error: errorMsg,
            timestamp: new Date().toISOString()
        })
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            message: 'Fatal Debug Error',
            error: error.message
        }, { status: 500 })
    }
}
