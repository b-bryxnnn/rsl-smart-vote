import { NextResponse } from 'next/server'
import { getTokenStats, getStudentVoteStats, getPartyCount, getStudentStatsByLevel, getPartyVotesByLevel } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET() {
    try {
        const [tokenStats, studentStats, partyCount, studentsByLevel, partyVotesByLevel] = await Promise.all([
            getTokenStats(),
            getStudentVoteStats(),
            getPartyCount(),
            getStudentStatsByLevel(),
            getPartyVotesByLevel(),
        ])

        return NextResponse.json({
            success: true,
            stats: {
                parties: partyCount,
                tokens: tokenStats,
                students: studentStats,
                studentsByLevel,
                partyVotesByLevel,
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
