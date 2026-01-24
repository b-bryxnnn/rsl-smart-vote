'use client'

import { useState, useEffect } from 'react'
import { Lock, Clock } from 'lucide-react'

interface SystemClosedOverlayProps {
    scheduledOpenTime?: string | null
    message?: string
}

export function SystemClosedOverlay({ scheduledOpenTime, message }: SystemClosedOverlayProps) {
    const [countdown, setCountdown] = useState<string | null>(null)
    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => {
        if (!scheduledOpenTime) return

        const updateCountdown = () => {
            const now = new Date()
            const openTime = new Date(scheduledOpenTime)
            const diff = openTime.getTime() - now.getTime()

            if (diff <= 0) {
                setIsOpen(true)
                setCountdown(null)
                // Reload page when time is reached
                window.location.reload()
                return
            }

            const hours = Math.floor(diff / (1000 * 60 * 60))
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
            const seconds = Math.floor((diff % (1000 * 60)) / 1000)

            if (hours > 0) {
                setCountdown(`${hours} ชั่วโมง ${minutes} นาที ${seconds} วินาที`)
            } else if (minutes > 0) {
                setCountdown(`${minutes} นาที ${seconds} วินาที`)
            } else {
                setCountdown(`${seconds} วินาที`)
            }
        }

        updateCountdown()
        const interval = setInterval(updateCountdown, 1000)
        return () => clearInterval(interval)
    }, [scheduledOpenTime])

    if (isOpen) return null

    return (
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center">
                <div className="w-20 h-20 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-6">
                    {countdown ? (
                        <Clock className="w-10 h-10 text-amber-400" />
                    ) : (
                        <Lock className="w-10 h-10 text-gray-400" />
                    )}
                </div>

                <h1 className="text-2xl font-bold text-white mb-4">
                    {message || 'ระบบการเลือกตั้งปิดอยู่'}
                </h1>

                {countdown ? (
                    <div className="space-y-4">
                        <p className="text-gray-400">ระบบจะเปิดทำการภายใน</p>
                        <div className="bg-gray-800 rounded-2xl px-6 py-4 inline-block">
                            <span className="text-3xl font-mono font-bold text-amber-400">
                                {countdown}
                            </span>
                        </div>
                        <p className="text-gray-500 text-sm">
                            เวลาเปิด: {new Date(scheduledOpenTime!).toLocaleString('th-TH')}
                        </p>
                    </div>
                ) : (
                    <p className="text-gray-400">
                        กรุณาติดต่อผู้ดูแลระบบ
                    </p>
                )}
            </div>
        </div>
    )
}

export default SystemClosedOverlay
