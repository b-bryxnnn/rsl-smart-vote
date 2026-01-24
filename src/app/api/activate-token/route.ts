import { NextRequest, NextResponse } from 'next/server'
import { getTokenByCode, activateTokenForStudent, getStudentByStudentId, getSessionByToken, logActivity, getElectionStatus, checkRateLimit } from '@/lib/db'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as { tokenCode?: string; studentId?: string; sessionToken?: string }
        const { tokenCode, studentId, sessionToken } = body

        const ip = request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || 'unknown'
        const userAgent = request.headers.get('user-agent') || 'unknown'

        // Verify user session (committee or admin)
        if (!sessionToken) {
            return NextResponse.json(
                { success: false, message: 'กรุณาเข้าสู่ระบบ' },
                { status: 401 }
            )
        }

        const sessionResult = await getSessionByToken(sessionToken)
        if (!sessionResult) {
            return NextResponse.json(
                { success: false, message: 'Session หมดอายุ กรุณาเข้าสู่ระบบใหม่' },
                { status: 401 }
            )
        }

        const user = sessionResult.user

        // Check election status
        const electionStatus = await getElectionStatus()
        if (electionStatus.status === 'closed') {
            return NextResponse.json(
                { success: false, message: 'ระบบเลือกตั้งปิดอยู่' },
                { status: 403 }
            )
        }

        if (!tokenCode || !studentId) {
            return NextResponse.json(
                { success: false, message: 'กรุณาระบุข้อมูลให้ครบ' },
                { status: 400 }
            )
        }

        // Rate limiting
        const rateCheck = await checkRateLimit(ip, 'activate_token', 10, 5)
        if (!rateCheck.allowed) {
            await logActivity('activate_rate_limited', { ip }, user.id, user.username, ip, userAgent)
            return NextResponse.json(
                { success: false, message: 'ทำรายการเร็วเกินไป กรุณารอสักครู่' },
                { status: 429 }
            )
        }

        const cleanCode = tokenCode.toUpperCase().trim()

        // Check if student exists and hasn't voted
        const student = await getStudentByStudentId(studentId)

        if (!student) {
            await logActivity('activate_failed', { tokenCode: cleanCode, studentId, reason: 'student_not_found' }, user.id, user.username, ip, userAgent)
            return NextResponse.json(
                { success: false, message: 'ไม่พบข้อมูลนักเรียน' },
                { status: 404 }
            )
        }

        if (student.vote_status !== null) {
            await logActivity('activate_failed', { tokenCode: cleanCode, studentId, reason: 'already_voted' }, user.id, user.username, ip, userAgent)
            return NextResponse.json(
                { success: false, message: student.vote_status === 'voted' ? 'นักเรียนคนนี้ใช้สิทธิ์ไปแล้ว' : 'นักเรียนคนนี้ถูกตัดสิทธิ์แล้ว' },
                { status: 400 }
            )
        }

        // Check token status
        const token = await getTokenByCode(cleanCode)

        if (!token) {
            await logActivity('activate_failed', { tokenCode: cleanCode, studentId, reason: 'token_not_found' }, user.id, user.username, ip, userAgent)
            return NextResponse.json(
                { success: false, message: 'ไม่พบบัตรนี้ในระบบ' },
                { status: 404 }
            )
        }

        if (token.status !== 'inactive') {
            const statusMessages: Record<string, string> = {
                'activated': 'บัตรนี้เปิดสิทธิ์ไปแล้ว',
                'voting': 'บัตรนี้กำลังใช้งานอยู่',
                'used': 'บัตรนี้ถูกใช้ไปแล้ว',
                'expired': 'บัตรนี้หมดอายุแล้ว'
            }
            await logActivity('activate_failed', { tokenCode: cleanCode, studentId, reason: `token_${token.status}` }, user.id, user.username, ip, userAgent)
            return NextResponse.json(
                { success: false, message: statusMessages[token.status] || 'สถานะบัตรไม่ถูกต้อง' },
                { status: 400 }
            )
        }

        // Activate token with student link (temporary - will be cleared after vote)
        // DO NOT mark student as voted yet - that happens after they complete voting
        const activated = await activateTokenForStudent(cleanCode, studentId, user.id)

        if (!activated) {
            await logActivity('activate_failed', { tokenCode: cleanCode, studentId, reason: 'activation_error' }, user.id, user.username, ip, userAgent)
            return NextResponse.json(
                { success: false, message: 'ไม่สามารถเปิดสิทธิ์บัตรได้' },
                { status: 500 }
            )
        }

        await logActivity('token_activated', {
            tokenCode: cleanCode,
            studentId,
            studentName: `${student.prefix}${student.first_name} ${student.last_name}`,
            studentLevel: student.level
        }, user.id, user.username, ip, userAgent)

        return NextResponse.json({
            success: true,
            message: 'เปิดสิทธิ์สำเร็จ',
            warning: 'บัตรนี้จะมีอายุ 30 นาที หากไม่ลงคะแนนภายในเวลา จะถือว่าไม่มาใช้สิทธิ์'
        })
    } catch (error) {
        console.error('Error activating token:', error)
        return NextResponse.json(
            { success: false, message: 'เกิดข้อผิดพลาดในระบบ' },
            { status: 500 }
        )
    }
}
