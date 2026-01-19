'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LEVEL_OPTIONS, setStationLevel } from '@/lib/utils'
import { Lock, TestTube, ArrowRight } from 'lucide-react'

const ADMIN_PIN = '151225'

export default function StationSetupPage() {
    const router = useRouter()
    const [pin, setPin] = useState('')
    const [auth, setAuth] = useState(false)
    const [error, setError] = useState(false)
    const [testMode, setTestMode] = useState(false)

    const handlePinSubmit = (e?: React.FormEvent) => {
        e?.preventDefault()
        if (pin === ADMIN_PIN) {
            setAuth(true)
            setError(false)
        } else if (pin.length >= 6) {
            setError(true)
            setPin('')
        }
    }

    // Enable Test Mode access
    const enableTestMode = () => {
        setTestMode(true)
        sessionStorage.setItem('test_mode', 'true')
    }

    if (!auth) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
                <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mb-6">
                    <Lock className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-xl font-bold text-slate-900 mb-2">Station Setup</h1>
                <p className="text-sm text-slate-500 mb-8">กรุณากรอก PIN เพื่อเข้าสู่ระบบ</p>

                <form onSubmit={handlePinSubmit} className="w-full max-w-xs">
                    <div className="relative">
                        <input
                            autoFocus
                            type="password"
                            maxLength={6}
                            placeholder="••••••"
                            className={`w-full text-center text-3xl font-mono tracking-[0.5em] py-4 px-6 border-2 rounded-xl outline-none transition-all ${error
                                    ? 'border-red-500 bg-red-50 animate-shake'
                                    : 'border-slate-200 focus:border-slate-900'
                                }`}
                            value={pin}
                            onChange={e => {
                                setPin(e.target.value)
                                setError(false)
                            }}
                        />
                        <button
                            type="submit"
                            className="absolute right-2 top-2 bottom-2 aspect-square bg-slate-900 text-white rounded-lg flex items-center justify-center hover:bg-slate-800 transition-colors"
                        >
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                    {error && (
                        <p className="text-red-500 text-sm text-center mt-3">รหัส PIN ไม่ถูกต้อง</p>
                    )}
                </form>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-md mx-auto">
                <h1 className="text-2xl font-bold text-slate-900 mb-2">เลือกระดับชั้น</h1>
                <p className="text-slate-500 mb-6">สำหรับจุดลงคะแนนนี้</p>

                <div className="grid gap-3 mb-8">
                    {LEVEL_OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => {
                                setStationLevel(opt.value)
                                if (testMode) {
                                    sessionStorage.setItem('test_mode', 'true')
                                }
                                router.push('/')
                            }}
                            className="p-5 bg-white border border-slate-200 rounded-xl hover:border-slate-900 hover:shadow-md text-left font-medium transition-all flex items-center justify-between group"
                        >
                            <span>{opt.label}</span>
                            <span className="text-slate-400 group-hover:text-slate-900">{opt.value}</span>
                        </button>
                    ))}
                </div>

                {/* Test Mode Toggle */}
                <div className="border-t border-slate-200 pt-6">
                    <button
                        onClick={enableTestMode}
                        className={`w-full p-4 rounded-xl border-2 border-dashed flex items-center justify-center gap-3 font-medium transition-all ${testMode
                                ? 'border-amber-500 bg-amber-50 text-amber-700'
                                : 'border-slate-300 text-slate-500 hover:border-amber-500 hover:text-amber-600'
                            }`}
                    >
                        <TestTube className="w-5 h-5" />
                        {testMode ? 'โหมดทดสอบ: เปิดใช้งาน ✓' : 'เปิดใช้งานโหมดทดสอบ'}
                    </button>
                    {testMode && (
                        <p className="text-xs text-amber-600 text-center mt-2">
                            โหมดทดสอบ: Token จะไม่ถูกใช้จริง สามารถทดสอบกระบวนการได้ซ้ำ
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}
