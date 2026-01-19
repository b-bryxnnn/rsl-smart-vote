'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, CheckCircle, XCircle, ArrowLeft, Loader2, Scan } from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'

interface Student {
    student_id: string
    prefix: string
    first_name: string
    last_name: string
    level: string
    room: string
    has_voted: number
}

export default function VerifyPage() {
    const [step, setStep] = useState<'search' | 'verify' | 'scan' | 'success'>('search')
    const [studentId, setStudentId] = useState('')
    const [student, setStudent] = useState<Student | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const scannerRef = useRef<Html5Qrcode | null>(null)

    // Verify functions same as before but minimal UI...
    const searchStudent = async () => {
        if (!studentId) return
        setLoading(true)
        try {
            const res = await fetch(`/api/students/${studentId}`)
            const data = await res.json() as any
            if (data.success) {
                setStudent(data.student)
                setStep('verify')
            } else setError(data.message)
        } finally { setLoading(false) }
    }

    const activateToken = async (code: string) => {
        setLoading(true)
        try {
            const res = await fetch('/api/activate-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tokenCode: code, studentId: student?.student_id })
            })
            const data = await res.json() as any
            if (data.success) {
                if (scannerRef.current?.isScanning) scannerRef.current.stop()
                setStep('success')
                setTimeout(reset, 2000)
            } else setError(data.message)
        } finally { setLoading(false) }
    }

    const startScanner = async () => {
        setStep('scan')
        setTimeout(async () => {
            // Small delay for UI render
            const scanner = new Html5Qrcode('verify-scanner')
            scannerRef.current = scanner
            await scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 220, height: 220 } }, activateToken, () => { })
        }, 100)
    }

    const reset = () => {
        setStep('search')
        setStudentId('')
        setStudent(null)
        setError(null)
        if (scannerRef.current?.isScanning) scannerRef.current.stop().catch(() => { })
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-white border-b border-gray-200 p-4 text-center sticky top-0 z-10">
                <h1 className="font-bold text-gray-900">ตรวจสอบสิทธิ์</h1>
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

                            {student.has_voted ? (
                                <div className="bg-red-50 text-red-600 p-4 rounded-xl font-bold mb-4">ใช้สิทธิ์ไปแล้ว</div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={reset} className="py-3 text-gray-500 font-medium hover:bg-gray-50 rounded-xl">ยกเลิก</button>
                                    <button onClick={startScanner} className="py-3 bg-gray-900 text-white font-bold rounded-xl shadow-lg">ยืนยัน</button>
                                </div>
                            )}
                            {student.has_voted ? <button onClick={reset} className="w-full py-3 text-gray-500">กลับ</button> : null}
                        </motion.div>
                    )}

                    {step === 'scan' && (
                        <motion.div key="scan" className="w-full">
                            <div className="bg-white p-2 rounded-3xl shadow-xl border border-gray-100 overflow-hidden relative">
                                <div id="verify-scanner" className="w-full aspect-square bg-black rounded-2xl overflow-hidden" />
                                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                    <div className="w-56 h-56 border-2 border-white/50 rounded-xl" />
                                </div>
                            </div>
                            <button onClick={reset} className="w-full mt-6 py-4 text-gray-500 font-medium">ยกเลิก</button>
                        </motion.div>
                    )}

                    {step === 'success' && (
                        <motion.div key="success" className="text-center py-10">
                            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="w-12 h-12" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900">เรียบร้อย</h2>
                            <p className="text-gray-500">เปิดสิทธิ์สำเร็จแล้ว</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    )
}
