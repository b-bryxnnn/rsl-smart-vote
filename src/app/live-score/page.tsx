'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Trophy, Loader2, RefreshCw, AlertCircle, Clock } from 'lucide-react'

export default function LiveScorePage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null)
    const [lastVoteCount, setLastVoteCount] = useState<number>(0)
    const [nextUpdateIn, setNextUpdateIn] = useState<number>(300) // 5 minutes in seconds

    const UPDATE_INTERVAL_SECONDS = 300 // 5 minutes
    const VOTE_THRESHOLD = 10 // Update if 10 new votes

    const fetchScores = useCallback(async (force = false) => {
        // Don't update if not forced and no reason to update
        if (!force && data && lastVoteCount === data.totalVotes) {
            return // No new votes, skip update
        }

        setLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/scores')
            const json = await res.json() as any
            if (json.success) {
                const newTotalVotes = json.data.totalVotes || 0

                // Only actually update state if there are new votes or first load
                if (!data || newTotalVotes > lastVoteCount) {
                    setData(json.data)
                    setLastUpdateTime(new Date())
                    setLastVoteCount(newTotalVotes)
                }
            } else {
                setError(json.message || 'ไม่สามารถโหลดข้อมูลได้')
            }
        } catch {
            setError('การเชื่อมต่อล้มเหลว')
        } finally {
            setLoading(false)
        }
    }, [data, lastVoteCount])

    // Check for updates conditionally
    const checkForUpdates = useCallback(async () => {
        try {
            const res = await fetch('/api/scores')
            const json = await res.json() as any
            if (json.success) {
                const newTotalVotes = json.data.totalVotes || 0
                const voteDiff = newTotalVotes - lastVoteCount

                // Update if: 10+ new votes OR it's the first load
                if (voteDiff >= VOTE_THRESHOLD || !data) {
                    setData(json.data)
                    setLastUpdateTime(new Date())
                    setLastVoteCount(newTotalVotes)
                    setNextUpdateIn(UPDATE_INTERVAL_SECONDS)
                }
            }
        } catch {
            // Silently fail - will retry next interval
        }
    }, [data, lastVoteCount])

    // Initial load
    useEffect(() => {
        fetchScores(true)
    }, [])

    // Timer effect - check every 5 minutes
    useEffect(() => {
        const timer = setInterval(() => {
            setNextUpdateIn(prev => {
                if (prev <= 1) {
                    checkForUpdates()
                    return UPDATE_INTERVAL_SECONDS
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(timer)
    }, [checkForUpdates])

    const formatTimeRemaining = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

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
                        onClick={() => fetchScores(true)}
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
                    Total Votes: {data?.totalVotes || 0}
                    {loading && <Loader2 className="w-4 h-4 animate-spin inline ml-2" />}
                </p>
                {/* Update info */}
                <div className="mt-3 flex items-center justify-center gap-4 text-sm">
                    <span className="text-gray-400 flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        อัพเดทถัดไปใน: {formatTimeRemaining(nextUpdateIn)}
                    </span>
                    <button
                        onClick={() => fetchScores(true)}
                        disabled={loading}
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        รีเฟรชตอนนี้
                    </button>
                </div>
                {lastUpdateTime && (
                    <p className="text-xs text-gray-400 mt-1">
                        อัพเดทล่าสุด: {lastUpdateTime.toLocaleTimeString('th-TH')}
                    </p>
                )}
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

                    {/* Info about update policy */}
                    <div className="mt-8 text-center text-gray-400 text-xs">
                        <p>ระบบอัพเดททุก 5 นาที หรือเมื่อมีโหวตเข้ามา 10 ครั้ง (เพื่อประหยัด quota)</p>
                    </div>
                </>
            )}
        </div>
    )
}
