'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Trophy } from 'lucide-react'

export default function LiveScorePage() {
    const [data, setData] = useState<any>(null)

    useEffect(() => {
        const fetchScores = async () => {
            const res = await fetch('/api/scores')
            const json = await res.json()
            if (json.success) setData(json.data)
        }
        fetchScores()
        const interval = setInterval(fetchScores, 10000)
        return () => clearInterval(interval)
    }, [])

    const chartData = data?.partyVotes.map((p: any) => ({
        name: p.name,
        number: p.number,
        votes: p.vote_count,
    })) || []

    if (data?.abstainCount > 0) {
        chartData.push({ name: 'ไม่ประสงค์ลงคะแนน', number: 0, votes: data.abstainCount })
    }

    chartData.sort((a: any, b: any) => b.votes - a.votes)

    return (
        <div className="min-h-screen bg-gray-50 p-8 flex flex-col items-center">
            <header className="mb-12 text-center">
                <h1 className="text-3xl font-bold text-gray-900">ผลคะแนนเลือกตั้ง 2569</h1>
                <p className="text-gray-500 mt-2">Update Realtime • Total Votes: {data?.totalVotes || 0}</p>
            </header>

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
        </div>
    )
}
