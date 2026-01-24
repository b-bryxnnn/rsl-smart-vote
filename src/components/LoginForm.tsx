'use client'

import { useState, FormEvent } from 'react'
import { Loader2, User, Lock, Eye, EyeOff } from 'lucide-react'

interface LoginFormProps {
    title?: string
    onLogin: (username: string, password: string) => Promise<{ success: boolean; message?: string }>
    loading?: boolean
}

export function LoginForm({ title = 'เข้าสู่ระบบ', onLogin, loading = false }: LoginFormProps) {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (!username || !password) {
            setError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน')
            return
        }

        setIsSubmitting(true)
        setError(null)

        try {
            const result = await onLogin(username, password)
            if (!result.success) {
                setError(result.message || 'เข้าสู่ระบบไม่สำเร็จ')
            }
        } catch {
            setError('เกิดข้อผิดพลาดในการเชื่อมต่อ')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6">
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-xl font-bold text-gray-900">{title}</h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            ชื่อผู้ใช้
                        </label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none"
                                placeholder="username"
                                disabled={isSubmitting || loading}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            รหัสผ่าน
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none"
                                placeholder="••••••••"
                                disabled={isSubmitting || loading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm text-center">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting || loading}
                        className="w-full py-3 bg-gray-900 text-white font-medium rounded-xl hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
                        เข้าสู่ระบบ
                    </button>
                </form>
            </div>
        </div>
    )
}

export default LoginForm
