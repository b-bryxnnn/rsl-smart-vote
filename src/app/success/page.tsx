'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

export default function SuccessPage() {
    const router = useRouter()

    useEffect(() => {
        const timer = setTimeout(() => router.push('/'), 3000)
        return () => clearTimeout(timer)
    }, [router])

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
            <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', duration: 0.8 }}
                className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-green-200"
            >
                <Check className="w-12 h-12 text-white" strokeWidth={3} />
            </motion.div>

            <motion.h1
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-2xl font-bold text-gray-900 mb-2"
            >
                บันทึกคะแนนแล้ว
            </motion.h1>

            <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-gray-500"
            >
                ขอบคุณที่ใช้สิทธิ์เลือกตั้ง
            </motion.p>
        </div>
    )
}
