import { NextRequest, NextResponse } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as any
        const { mode } = body // 'all' | 'votes'

        const { env } = getRequestContext()
        const db = env.DB

        if (mode === 'all') {
            // Reset everything - clear all tables
            await db.batch([
                db.prepare('DELETE FROM votes'),
                db.prepare('DELETE FROM tokens'),
                db.prepare('DELETE FROM print_logs'),
                db.prepare('UPDATE students SET has_voted = 0, voted_at = NULL'),
            ])
        } else if (mode === 'votes') {
            // Clear votes, tokens, and reset student vote status
            await db.batch([
                db.prepare('DELETE FROM votes'),
                db.prepare('DELETE FROM tokens'),
                db.prepare('DELETE FROM print_logs'),
                db.prepare('UPDATE students SET has_voted = 0, voted_at = NULL'),
            ])
        }

        return NextResponse.json({ success: true, message: 'รีเซ็ตระบบเรียบร้อย' })
    } catch (error) {
        console.error('Reset error:', error)
        return NextResponse.json({ success: false, message: 'เกิดข้อผิดพลาด' }, { status: 500 })
    }
}
