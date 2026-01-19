import { NextRequest, NextResponse } from 'next/server'
import { createTokens, createPrintLog } from '@/lib/db'

export const runtime = 'edge'

// Confirm print - saves tokens to database
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { tokens, batchId, stationLevel, printedBy } = body

        if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
            return NextResponse.json(
                { success: false, message: 'ไม่พบข้อมูล Token' },
                { status: 400 }
            )
        }

        if (!batchId) {
            return NextResponse.json(
                { success: false, message: 'ไม่พบ Batch ID' },
                { status: 400 }
            )
        }

        // Create tokens in database
        const tokensToCreate = tokens.map((code: string) => ({
            code,
            print_batch_id: batchId,
        }))

        await createTokens(tokensToCreate)

        // Log the print batch
        await createPrintLog(batchId, tokens.length, stationLevel, printedBy)

        return NextResponse.json({
            success: true,
            message: `บันทึก ${tokens.length} Token เรียบร้อย`,
            batchId,
            count: tokens.length,
        })
    } catch (error) {
        console.error('Error confirming print:', error)
        return NextResponse.json(
            { success: false, message: 'เกิดข้อผิดพลาดในระบบ' },
            { status: 500 }
        )
    }
}
