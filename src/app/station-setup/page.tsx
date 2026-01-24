'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LEVEL_OPTIONS, setStationLevel } from '@/lib/utils'
import { LoginForm } from '@/components/LoginForm'

export default function StationSetupPage() {
    const router = useRouter()
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [loading, setLoading] = useState(true)
    const [userName, setUserName] = useState('')

    useEffect(() => {
        // Check if already logged in
        const sessionToken = sessionStorage.getItem('session_token')
        const storedUser = sessionStorage.getItem('user_info')
        if (sessionToken && storedUser) {
            // Verify session is still valid
            fetch('/api/auth/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionToken })
            })
                .then(res => res.json())
                .then((data: any) => {
                    if (data.success && data.user.role === 'admin') {
                        setIsAuthenticated(true)
                        setUserName(data.user.displayName || data.user.username)
                    } else {
                        sessionStorage.removeItem('session_token')
                        sessionStorage.removeItem('user_info')
                    }
                })
                .catch(() => {
                    sessionStorage.removeItem('session_token')
                    sessionStorage.removeItem('user_info')
                })
                .finally(() => setLoading(false))
        } else {
            setLoading(false)
        }
    }, [])

    const handleLogin = async (username: string, password: string) => {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        })
        const data = await res.json() as any

        if (data.success) {
            if (data.user.role !== 'admin') {
                return { success: false, message: 'ต้องใช้บัญชี Admin เท่านั้น' }
            }
            sessionStorage.setItem('session_token', data.sessionToken)
            sessionStorage.setItem('user_info', JSON.stringify(data.user))
            setIsAuthenticated(true)
            setUserName(data.user.displayName || data.user.username)
            return { success: true }
        }
        return { success: false, message: data.message }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        )
    }

    if (!isAuthenticated) {
        return <LoginForm title="Station Setup" onLogin={handleLogin} />
    }

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-md mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">เลือกระดับชั้น</h1>
                        <p className="text-slate-500">สำหรับจุดลงคะแนนนี้</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-slate-500">เข้าสู่ระบบโดย</p>
                        <p className="font-medium text-slate-900">{userName}</p>
                    </div>
                </div>

                <div className="grid gap-3 mb-8">
                    {LEVEL_OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => {
                                setStationLevel(opt.value)
                                router.push('/')
                            }}
                            className="p-5 bg-white border border-slate-200 rounded-xl hover:border-slate-900 hover:shadow-md text-left font-medium transition-all flex items-center justify-between group"
                        >
                            <span>{opt.label}</span>
                            <span className="text-slate-400 group-hover:text-slate-900">{opt.value}</span>
                        </button>
                    ))}
                </div>

                <div className="text-center">
                    <button
                        onClick={() => router.push('/admin/dashboard')}
                        className="text-slate-500 hover:text-slate-900 text-sm underline"
                    >
                        ไปหน้า Admin Dashboard
                    </button>
                </div>
            </div>
        </div>
    )
}
