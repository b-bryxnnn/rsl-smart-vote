import { NextResponse } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'nodejs'

export async function POST() {
    try {
        const { env } = getRequestContext()
        const db = env.DB

        await db.prepare('DELETE FROM print_logs').run()

        return NextResponse.json({ success: true, message: 'ลบประวัติการพิมพ์เรียบร้อย' })
    } catch (error) {
        console.error('Error clearing print logs:', error)
        return NextResponse.json({ success: false, message: 'เกิดข้อผิดพลาดในการลบข้อมูล' }, { status: 500 })
    }
}
