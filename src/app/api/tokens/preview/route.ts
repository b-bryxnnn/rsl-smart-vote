import { NextRequest, NextResponse } from 'next/server'
import { generateTokenCodes, generateBatchId } from '@/lib/utils'

export const runtime = 'edge'

// Preview only - does NOT save to database
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { count } = body

        const tokenCount = parseInt(count)

        if (isNaN(tokenCount) || tokenCount < 1 || tokenCount > 120) {
            return NextResponse.json(
                { success: false, message: 'จำนวนต้องอยู่ระหว่าง 1-120' },
                { status: 400 }
            )
        }

        // Generate batch ID and token codes (NOT saved yet)
        const batchId = generateBatchId()
        const codes = generateTokenCodes(tokenCount)

        return NextResponse.json({
            success: true,
            batchId,
            tokens: codes,
            count: tokenCount,
            startNumber: 1, // Start number is managed differently on edge
            preview: true,
        })
    } catch (error) {
        console.error('Error generating preview:', error)
        return NextResponse.json(
            { success: false, message: 'เกิดข้อผิดพลาดในระบบ' },
            { status: 500 }
        )
    }
}
