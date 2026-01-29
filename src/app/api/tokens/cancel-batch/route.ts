import { NextRequest, NextResponse } from 'next/server'
import { deleteTokensByBatchId } from '@/lib/db'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as any
        const { batchId } = body

        if (!batchId) {
            return NextResponse.json({ success: false, message: 'กรุณาระบุ Batch ID' }, { status: 400 })
        }

        const result = await deleteTokensByBatchId(batchId)

        if (result.hasUsedTokens) {
            return NextResponse.json({
                success: false,
                message: 'ไม่สามารถยกเลิกได้ มี Token ที่ถูกใช้แล้ว'
            }, { status: 400 })
        }

        if (result.deleted === 0) {
            return NextResponse.json({ success: false, message: 'ไม่พบ Batch นี้ในระบบ' }, { status: 404 })
        }

        return NextResponse.json({
            success: true,
            message: `ยกเลิก Batch ${batchId} เรียบร้อย (${result.deleted} ใบ)`
        })
    } catch (error) {
        console.error('Error canceling batch:', error)
        return NextResponse.json({ success: false, message: 'เกิดข้อผิดพลาดในการยกเลิก' }, { status: 500 })
    }
}
