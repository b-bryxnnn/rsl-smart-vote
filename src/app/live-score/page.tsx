'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Trophy, Loader2, RefreshCw, AlertCircle } from 'lucide-react'

export default function LiveScorePage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchScores = async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/scores')
            const json = await res.json() as any
            if (json.success) {
                setData(json.data)
            } else {
                setError(json.message || 'ไม่สามารถโหลดข้อมูลได้')
            }
        } catch {
            setError('การเชื่อมต่อล้มเหลว')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchScores()
        const interval = setInterval(fetchScores, 10000)
        return () => clearInterval(interval)
    }, [])

    const chartData = data?.partyVotes?.map((p: any) => ({
        name: p.name,
        number: p.number,
        votes: p.vote_count,
    })) || []

    if (data?.abstainCount > 0) {
        chartData.push({ name: 'ไม่ประสงค์ลงคะแนน', number: 0, votes: data.abstainCount })
    }

    chartData.sort((a: any, b: any) => b.votes - a.votes)

    // Loading state
    if (loading && !data) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">กำลังโหลดข้อมูลคะแนน...</p>
                </div>
            </div>
        )
    }

    // Error state
    if (error && !data) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
                    <p className="text-gray-700 font-medium mb-2">เกิดข้อผิดพลาด</p>
                    <p className="text-gray-500 mb-4">{error}</p>
                    <button
                        onClick={fetchScores}
                        className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 flex items-center gap-2 mx-auto"
                    >
                        <RefreshCw className="w-4 h-4" /> ลองใหม่
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8 flex flex-col items-center">
            <header className="mb-12 text-center">
                <h1 className="text-3xl font-bold text-gray-900">ผลคะแนนเลือกตั้ง 2569</h1>
                <p className="text-gray-500 mt-2">
                    Update Realtime • Total Votes: {data?.totalVotes || 0}
                    {loading && <Loader2 className="w-4 h-4 animate-spin inline ml-2" />}
                </p>
            </header>

            {chartData.length === 0 ? (
                <div className="w-full max-w-5xl bg-white rounded-3xl shadow-xl border border-gray-100 p-16 text-center">
                    <Trophy className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 text-lg">ยังไม่มีข้อมูลคะแนน</p>
                    <p className="text-gray-400 text-sm mt-2">รอให้มีการลงคะแนนเสียง</p>
                </div>
            ) : (
                <>
                    <div className="w-full max-w-5xl bg-white rounded-3xl shadow-xl border border-gray-100 p-10">
                        <div className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 14 }} dy={10} />
                                    <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                                    <Bar dataKey="votes" radius={[12, 12, 12, 12]} barSize={60}>
                                        {chartData.map((entry: any, index: number) => (
                                            <Cell key={index} fill={index === 0 ? '#111827' : '#E5E7EB'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="mt-12 grid grid-cols-3 gap-6 w-full max-w-4xl">
                        {chartData.slice(0, 3).map((p: any, i: number) => (
                            <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 text-center shadow-sm">
                                <div className="text-sm text-gray-400 mb-1">{i === 0 ? 'WINNER' : `RANK ${i + 1}`}</div>
                                <div className="text-3xl font-bold text-gray-900 mb-1">{p.votes}</div>
                                <div className="text-gray-600 font-medium">{p.name}</div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}

