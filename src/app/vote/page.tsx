'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Loader2 } from 'lucide-react'

interface Party {
    id: number
    name: string
    number: number
}

export default function VotePage() {
    const router = useRouter()
    const [parties, setParties] = useState<Party[]>([])
    const [selectedParty, setSelectedParty] = useState<Party | null>(null)
    const [isAbstain, setIsAbstain] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        const token = sessionStorage.getItem('voting_token')
        if (!token) return router.push('/')
        fetch('/api/parties')
            .then(res => res.json() as any)
            .then(data => {
                if (data.success) setParties(data.parties)
            })
            .finally(() => setLoading(false))
    }, [router])

    const handleSelect = (party: Party | null) => {
        setSelectedParty(party)
        setIsAbstain(!party)
        setShowConfirm(true)
    }

    const handleConfirm = async () => {
        const token = sessionStorage.getItem('voting_token')
        if (!token) return
        setSubmitting(true)
        try {
            const res = await fetch('/api/submit-vote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, partyId: selectedParty?.id, isAbstain }),
            })
            if ((await res.json() as any).success) {
                sessionStorage.removeItem('voting_token')
                router.push('/success')
            }
        } catch {
            // Handle error
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-gray-400" /></div>

    return (
        <div className="min-h-screen bg-gray-50 p-6 flex flex-col">
            <header className="max-w-4xl mx-auto w-full mb-8 pt-4">
                <h1 className="text-xl font-bold text-gray-900">บัตรลงคะแนน</h1>
                <p className="text-gray-500 text-sm">เลือก 1 หมายเลข หรือ ไม่ประสงค์ลงคะแนน</p>
            </header>

            <main className="max-w-4xl mx-auto w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pb-24">
                {parties.map((party) => (
                    <motion.button
                        key={party.id}
                        whileHover={{ y: -2 }}
                        onClick={() => handleSelect(party)}
                        className="group relative bg-white border border-gray-200 rounded-xl p-8 text-center hover:border-gray-900 transition-colors shadow-sm hover:shadow-md"
                    >
                        <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center text-2xl font-bold text-gray-900 mb-4 group-hover:bg-gray-900 group-hover:text-white transition-colors">
                            {party.number}
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">{party.name}</h3>
                    </motion.button>
                ))}

                <button
                    onClick={() => handleSelect(null)}
                    className="sm:col-span-2 md:col-span-3 border-2 border-dashed border-gray-300 rounded-xl p-6 text-gray-500 hover:border-gray-900 hover:text-gray-900 transition-colors font-medium mt-4"
                >
                    ไม่ประสงค์ลงคะแนน
                </button>
            </main>

            {/* Modern Confirm Sheet / Modal */}
            <AnimatePresence>
                {showConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center p-6"
                        onClick={() => setShowConfirm(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white border border-gray-100 shadow-2xl rounded-2xl p-8 max-w-sm w-full text-center"
                        >
                            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-6">ยืนยันการเลือก</h2>

                            <div className="mb-8">
                                {isAbstain ? (
                                    <span className="text-2xl font-bold text-gray-900">ไม่ประสงค์ลงคะแนน</span>
                                ) : (
                                    <>
                                        <div className="text-6xl font-black text-gray-900 mb-2">{selectedParty?.number}</div>
                                        <div className="text-xl font-medium text-gray-600">{selectedParty?.name}</div>
                                    </>
                                )}
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowConfirm(false)}
                                    disabled={submitting}
                                    className="flex-1 py-3 text-gray-600 font-medium hover:bg-gray-50 rounded-xl transition-colors"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    disabled={submitting}
                                    className="flex-1 py-3 bg-gray-900 text-white font-medium rounded-xl hover:bg-gray-800 flex items-center justify-center gap-2"
                                >
                                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                    ยืนยัน
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
