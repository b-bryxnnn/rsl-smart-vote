import { NextRequest, NextResponse } from 'next/server'
import { getAllParties, createParty } from '@/lib/db'

export const runtime = 'edge'

export async function GET() {
    try {
        const parties = await getAllParties()
        return NextResponse.json({ success: true, parties })
    } catch (error) {
        console.error('Error fetching parties:', error)
        return NextResponse.json(
            { success: false, message: 'เกิดข้อผิดพลาดในระบบ' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { name, number } = body

        if (!name || !number) {
            return NextResponse.json(
                { success: false, message: 'กรุณากรอกข้อมูลให้ครบ' },
                { status: 400 }
            )
        }

        const party = await createParty(name.trim(), parseInt(number))

        return NextResponse.json({
            success: true,
            party,
        })
    } catch (error) {
        console.error('Error creating party:', error)

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
