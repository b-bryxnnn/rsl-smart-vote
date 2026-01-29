import { NextResponse } from 'next/server'
import { getVoteResults } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET() {
    try {
        const results = await getVoteResults()

        return NextResponse.json({
            success: true,
            data: results,
        })
    } catch (error) {
        console.error('Error fetching scores:', error)
        return NextResponse.json(
            { success: false, message: 'เกิดข้อผิดพลาดในระบบ' },
            { status: 500 }
        )
    }
}
