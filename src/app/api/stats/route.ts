import { NextResponse } from 'next/server'
import { getTokenStats, getStudentVoteStats, getPartyCount } from '@/lib/db'

export const runtime = 'edge'

export async function GET() {
    try {
        const [tokenStats, studentStats, partyCount] = await Promise.all([
            getTokenStats(),
            getStudentVoteStats(),
            getPartyCount(),
        ])

        return NextResponse.json({
            success: true,
            stats: {
                parties: partyCount,
                tokens: tokenStats,
                students: studentStats,
            },
        })
    } catch (error) {
        console.error('Error fetching stats:', error)
        return NextResponse.json(
            { success: false, message: 'เกิดข้อผิดพลาดในระบบ' },
            { status: 500 }
        )
    }
}
