'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, Loader2, SwitchCamera, Clock, AlertTriangle } from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'
import { LoginForm } from '@/components/LoginForm'
import { SystemClosedOverlay } from '@/components/SystemClosedOverlay'

interface Student {
    student_id: string
    prefix: string
    first_name: string
    last_name: string
    level: string
    room: string
    vote_status: 'voted' | 'absent' | null
}

export default function VerifyPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [authLoading, setAuthLoading] = useState(true)
    const [sessionToken, setSessionToken] = useState<string | null>(null)
    const [userName, setUserName] = useState('')

    const [electionStatus, setElectionStatus] = useState<'open' | 'closed' | 'loading'>('loading')
    const [scheduledOpenTime, setScheduledOpenTime] = useState<string | null>(null)

    const [step, setStep] = useState<'search' | 'verify' | 'confirm' | 'scan' | 'success'>('search')
    const [studentId, setStudentId] = useState('')
    const [tokenCode, setTokenCode] = useState('')
    const [pendingTokenCode, setPendingTokenCode] = useState<string | null>(null) // For confirmation
    const [student, setStudent] = useState<Student | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
    const scannerRef = useRef<Html5Qrcode | null>(null)

    // Check session on mount
    useEffect(() => {
        const checkAuth = async () => {
            const token = sessionStorage.getItem('session_token')
            if (token) {
                try {
                    const res = await fetch('/api/auth/verify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ sessionToken: token })
                    })
                    const data = await res.json() as any
                    if (data.success) {
                        setSessionToken(token)
                        setIsAuthenticated(true)
                        setUserName(data.user.displayName || data.user.username)
                    } else {
                        sessionStorage.removeItem('session_token')
                    }
                } catch {
                    sessionStorage.removeItem('session_token')
                }
            }
            setAuthLoading(false)
        }
        checkAuth()
    }, [])

    // Check election status
    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await fetch('/api/election-status')
                const data = await res.json() as any
                if (data.success) {
                    setElectionStatus(data.status === 'open' ? 'open' : 'closed')
                    setScheduledOpenTime(data.scheduledOpenTime || null)
                }
            } catch {
                setElectionStatus('open')
            }
        }
        checkStatus()
    }, [])

    const handleLogin = async (username: string, password: string) => {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        })
        const data = await res.json() as any

        if (data.success) {
            sessionStorage.setItem('session_token', data.sessionToken)
            sessionStorage.setItem('user_info', JSON.stringify(data.user))
            setSessionToken(data.sessionToken)
            setIsAuthenticated(true)
            setUserName(data.user.displayName || data.user.username)
            return { success: true }
        }
        return { success: false, message: data.message }
    }

    const searchStudent = async () => {
        if (!studentId) return
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`/api/students/${studentId}`)
            const data = await res.json() as any
            if (data.success) {
                setStudent(data.student)
                setStep('verify')
            } else setError(data.message)
        } finally { setLoading(false) }
    }

    // When QR scanned, show confirmation instead of activating immediately
    const onQRScanned = useCallback((code: string) => {
        // Stop scanner
        if (scannerRef.current?.isScanning) {
            scannerRef.current.stop().catch(() => { })
        }
        // Set pending code and show confirmation
        setPendingTokenCode(code.toUpperCase().trim())
        setError(null)
        setStep('confirm')
    }, [])

    // Actually activate the token after confirmation
    const confirmActivation = async () => {
        if (!sessionToken || !pendingTokenCode || !student) return
        setLoading(true)
        setError(null)
        setTokenCode(pendingTokenCode)
        try {
            const res = await fetch('/api/activate-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tokenCode: pendingTokenCode,
                    studentId: student.student_id,
                    sessionToken,
                    stationLevel: student.level // Pass student's level for vote breakdown
                })
            })
            const data = await res.json() as any
            if (data.success) {
                setStep('success')
                setTimeout(reset, 3000)
            } else {
                setError(data.message)
                setStep('scan')
                setTimeout(() => { restartScanner() }, 2000)
            }
        } catch {
            setError('การเชื่อมต่อล้มเหลว')
            setStep('scan')
            setTimeout(() => { restartScanner() }, 2000)
        } finally { setLoading(false) }
    }

    const cancelConfirmation = () => {
        setPendingTokenCode(null)
        setStep('scan')
        setTimeout(() => { restartScanner() }, 300)
    }

    const restartScanner = useCallback(async () => {
        if (scannerRef.current?.isScanning) {
            await scannerRef.current.stop().catch(() => { })
        }
        scannerRef.current = null

        await new Promise(r => setTimeout(r, 300))

        if (!document.getElementById('verify-scanner')) return

        try {
            const scanner = new Html5Qrcode('verify-scanner')
            scannerRef.current = scanner
            await scanner.start(
                { facingMode },
                { fps: 10, qrbox: { width: 220, height: 220 } },
                onQRScanned,
                () => { }
            )
        } catch (e) {
            console.error("Scanner restart failed", e)
            setError('ไม่สามารถเปิดกล้องได้')
        }
    }, [facingMode, onQRScanned])

    const startScanner = async () => {
        setStep('scan')
        setError(null)
        setTimeout(async () => {
            const scanner = new Html5Qrcode('verify-scanner')
            scannerRef.current = scanner
            try {
                await scanner.start({ facingMode }, { fps: 10, qrbox: { width: 220, height: 220 } }, onQRScanned, () => { })
            } catch (e) {
                console.error("Scanner failed", e)
                setError('ไม่สามารถเปิดกล้องได้')
            }
        }, 100)
    }

    const switchCamera = async () => {
        const newFacingMode = facingMode === 'environment' ? 'user' : 'environment'
        setFacingMode(newFacingMode)

        if (scannerRef.current?.isScanning) {
            await scannerRef.current.stop().catch(() => { })
        }
        scannerRef.current = null

        setTimeout(async () => {
            if (!document.getElementById('verify-scanner')) return
            try {
                const scanner = new Html5Qrcode('verify-scanner')
                scannerRef.current = scanner
                await scanner.start(
                    { facingMode: newFacingMode },
                    { fps: 10, qrbox: { width: 220, height: 220 } },
                    onQRScanned,
                    () => { }
                )
            } catch (e) {
                console.error("Camera switch failed", e)
                setError('ไม่สามารถสลับกล้องได้')
            }
        }, 300)
    }

    const reset = () => {
        setStep('search')
        setStudentId('')
        setStudent(null)
        setTokenCode('')
        setPendingTokenCode(null)
        setError(null)
        if (scannerRef.current?.isScanning) scannerRef.current.stop().catch(() => { })
    }

    // Loading state
    if (authLoading || electionStatus === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        )
    }

    // Show login if not authenticated
    if (!isAuthenticated) {
        return <LoginForm title="กรรมการเลือกตั้ง" onLogin={handleLogin} />
    }

    // Show closed overlay
    if (electionStatus === 'closed') {
        return <SystemClosedOverlay scheduledOpenTime={scheduledOpenTime} />
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
                <div className="max-w-md mx-auto flex justify-between items-center">
                    <h1 className="font-bold text-gray-900">ตรวจสอบสิทธิ์</h1>
                    <span className="text-sm text-gray-500">{userName}</span>
                </div>
            </header>

            <main className="flex-1 p-6 flex flex-col items-center max-w-md mx-auto w-full">
                <AnimatePresence mode="wait">
                    {step === 'search' && (
                        <motion.div key="search" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="w-full space-y-4">
                            <input
                                autoFocus
                                type="text"
                                placeholder="รหัสนักเรียน"
                                value={studentId}
                                onChange={e => setStudentId(e.target.value)}
                                className="w-full text-center text-3xl font-bold p-6 rounded-2xl border border-gray-200 bg-white focus:ring-2 focus:ring-gray-900 outline-none"
                                onKeyDown={e => e.key === 'Enter' && searchStudent()}
                            />
                            <button
                                onClick={searchStudent}
                                disabled={!studentId || loading}
                                className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold shadow-lg shadow-gray-200 hover:shadow-xl transition-all disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="animate-spin mx-auto" /> : 'ค้นหา'}
                            </button>
                            {error && <p className="text-red-600 text-center text-sm bg-red-50 p-3 rounded-lg">{error}</p>}
                        </motion.div>
                    )}

                    {step === 'verify' && student && (
                        <motion.div key="verify" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full bg-white p-8 rounded-3xl shadow-xl border border-gray-100 text-center">
                            <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl">🎓</div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-1">{student.prefix}{student.first_name} {student.last_name}</h2>
                            <p className="text-gray-500 mb-6">{student.student_id} | {student.level} ห้อง {student.room}</p>

                            {student.vote_status === 'voted' ? (
                                <div className="bg-red-50 text-red-600 p-4 rounded-xl font-bold mb-4">ใช้สิทธิ์ไปแล้ว</div>
                            ) : student.vote_status === 'absent' ? (
                                <div className="bg-orange-50 text-orange-600 p-4 rounded-xl font-bold mb-4">ถูกตัดสิทธิ์แล้ว (ไม่มาใช้สิทธิ์)</div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={reset} className="py-3 text-gray-500 font-medium hover:bg-gray-50 rounded-xl">ยกเลิก</button>
                                    <button onClick={startScanner} className="py-3 bg-gray-900 text-white font-bold rounded-xl shadow-lg">สแกนบัตร</button>
                                </div>
                            )}
                            {student.vote_status !== null ? <button onClick={reset} className="w-full py-3 text-gray-500">กลับ</button> : null}
                        </motion.div>
                    )}

                    {step === 'scan' && (
                        <motion.div key="scan" className="w-full">
                            {/* Student info reminder */}
                            {student && (
                                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4 text-center">
                                    <p className="text-sm text-blue-800">
                                        กำลังเปิดสิทธิ์ให้: <span className="font-bold">{student.prefix}{student.first_name}</span>
                                    </p>
                                </div>
                            )}

                            <div className="bg-white p-2 rounded-3xl shadow-xl border border-gray-100 overflow-hidden relative">
                                <div id="verify-scanner" className="w-full aspect-square bg-black rounded-2xl overflow-hidden" />
                                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                    <div className="w-56 h-56 border-2 border-white/50 rounded-xl" />
                                </div>
                                <button
                                    onClick={switchCamera}
                                    className="absolute top-4 right-4 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-all"
                                    title={facingMode === 'environment' ? 'สลับเป็นกล้องหน้า' : 'สลับเป็นกล้องหลัง'}
                                >
                                    <SwitchCamera className="w-5 h-5" />
                                </button>
                            </div>
                            <p className="text-center text-gray-400 text-xs mt-2">
                                {facingMode === 'environment' ? '📷 กล้องหลัง' : '🤳 กล้องหน้า'}
                            </p>

                            {/* Warning about 30-min timeout */}
                            <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-2">
                                <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                <p className="text-sm text-amber-800">
                                    <span className="font-bold">สำคัญ:</span> บัตรจะมีอายุ 30 นาที หากนักเรียนไม่ลงคะแนนภายในเวลา จะถือว่าไม่มาใช้สิทธิ์
                                </p>
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm text-center"
                                >
                                    <span className="font-bold">Error:</span> {error}
                                </motion.div>
                            )}
                            <button onClick={reset} className="w-full mt-4 py-4 text-gray-500 font-medium">ยกเลิก</button>
                        </motion.div>
                    )}

                    {/* NEW: Confirmation Dialog */}
                    {step === 'confirm' && student && pendingTokenCode && (
                        <motion.div
                            key="confirm"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full"
                        >
                            <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 text-center">
                                <div className="w-20 h-20 bg-amber-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                                    <AlertTriangle className="w-10 h-10 text-amber-600" />
                                </div>

                                <h2 className="text-xl font-bold text-gray-900 mb-2">ยืนยันเปิดสิทธิ์</h2>

                                <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2">
                                    <p className="text-gray-600">
                                        <span className="text-gray-400 text-sm">ชื่อนักเรียน:</span><br />
                                        <span className="font-bold text-lg text-gray-900">{student.prefix}{student.first_name} {student.last_name}</span>
                                    </p>
                                    <p className="text-gray-600">
                                        <span className="text-gray-400 text-sm">รหัสนักเรียน:</span><br />
                                        <span className="font-semibold">{student.student_id}</span>
                                    </p>
                                    <p className="text-gray-600">
                                        <span className="text-gray-400 text-sm">ระดับชั้น:</span><br />
                                        <span className="font-semibold">{student.level} ห้อง {student.room}</span>
                                    </p>
                                </div>

                                <div className="bg-blue-50 rounded-xl p-3 mb-6">
                                    <p className="text-blue-800 text-sm">
                                        <span className="text-blue-500 text-xs">เลขที่บัตรเลือกตั้ง:</span><br />
                                        <span className="font-mono font-bold text-lg">{pendingTokenCode}</span>
                                    </p>
                                </div>

                                {error && (
                                    <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">
                                        {error}
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={cancelConfirmation}
                                        disabled={loading}
                                        className="py-4 text-gray-500 font-medium hover:bg-gray-50 rounded-xl border border-gray-200 disabled:opacity-50"
                                    >
                                        ยกเลิก
                                    </button>
                                    <button
                                        onClick={confirmActivation}
                                        disabled={loading}
                                        className="py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                                        ยืนยันเปิดสิทธิ์
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {step === 'success' && (
                        <motion.div key="success" className="text-center py-10">
                            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="w-12 h-12" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900">เรียบร้อย</h2>
                            <p className="text-gray-500">เปิดสิทธิ์สำเร็จแล้ว</p>
                            <p className="text-amber-600 text-sm mt-2 flex items-center justify-center gap-1">
                                <Clock className="w-4 h-4" />
                                บัตรมีอายุ 30 นาที
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    )
}
