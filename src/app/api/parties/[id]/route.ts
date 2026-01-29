import { NextRequest, NextResponse } from 'next/server'
import { updateParty, deleteParty } from '@/lib/db'

export const runtime = 'nodejs'

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await request.json() as any
        const { name, number } = body

        if (!name || !number) {
            return NextResponse.json(
                { success: false, message: 'กรุณากรอกข้อมูลให้ครบ' },
                { status: 400 }
            )
        }

        await updateParty(parseInt(id), name.trim(), parseInt(number))

        return NextResponse.json({
            success: true,
            message: 'อัปเดตพรรคสำเร็จ',
        })
    } catch (error) {
        console.error('Error updating party:', error)

        const errorMessage = error instanceof Error ? error.message : ''
        if (errorMessage.includes('UNIQUE constraint')) {
            return NextResponse.json(
                { success: false, message: 'เบอร์พรรคนี้ถูกใช้แล้ว' },
                { status: 400 }
            )
        }

        return NextResponse.json(
            { success: false, message: 'เกิดข้อผิดพลาดในระบบ' },
            { status: 500 }
        )
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        await deleteParty(parseInt(id))

        return NextResponse.json({
            success: true,
            message: 'ลบพรรคสำเร็จ',
        })
    } catch (error) {
        console.error('Error deleting party:', error)
        return NextResponse.json(
            { success: false, message: 'เกิดข้อผิดพลาดในระบบ' },
            { status: 500 }
        )
    }
}
