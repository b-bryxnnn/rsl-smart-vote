import { NextRequest, NextResponse } from 'next/server'
import { createTokens, createPrintLog } from '@/lib/db'
import { generateTokenCodes, generateBatchId } from '@/lib/utils'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { count, stationLevel, printedBy } = body

        const tokenCount = parseInt(count)

        if (isNaN(tokenCount) || tokenCount < 1 || tokenCount > 120) {
            return NextResponse.json(
                { success: false, message: 'จำนวนต้องอยู่ระหว่าง 1-120' },
                { status: 400 }
            )
        }

        // Generate batch ID and token codes
        const batchId = generateBatchId()
        const codes = generateTokenCodes(tokenCount)

        // Create tokens in database
        const tokensToCreate = codes.map(code => ({
            code,
            print_batch_id: batchId,
        }))

        await createTokens(tokensToCreate)

        // Log the print batch
        await createPrintLog(batchId, tokenCount, stationLevel, printedBy)

        return NextResponse.json({
            success: true,
            batchId,
            tokens: codes,
            count: tokenCount,
            startNumber: 1,
        })
    } catch (error) {
        console.error('Error generating tokens:', error)
        return NextResponse.json(
            { success: false, message: 'เกิดข้อผิดพลาดในระบบ' },
            { status: 500 }
        )
    }
}
