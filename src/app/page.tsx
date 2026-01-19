'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Html5Qrcode } from 'html5-qrcode'
import { Scan, ArrowRight, X, Loader2, Vote, Settings } from 'lucide-react'
import { getStationLevel } from '@/lib/utils'

export default function HomePage() {
  const router = useRouter()
  const [showScanner, setShowScanner] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [stationLevel, setStationLevel] = useState<string | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const mountedRef = useRef(false)

  // 1. Check Station Level & Auto-Open Scanner
  useEffect(() => {
    if (mountedRef.current) return
    mountedRef.current = true

    // Check station setup
    const level = getStationLevel()
    if (!level) {
      router.push('/station-setup')
      return
    }
    setStationLevel(level)

    // Auto-open scanner
    setShowScanner(true)
  }, [router])

  const validateToken = useCallback(async (code: string) => {
    setLoading(true)
    setError(null)

    // Check if test mode is enabled - skip validation
    const isTestMode = sessionStorage.getItem('test_mode') === 'true'
    if (isTestMode) {
      sessionStorage.setItem('voting_token', code.toUpperCase() || 'TEST0001')
      setShowScanner(false)
      router.push('/vote')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/validate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.toUpperCase() }),
      })

      const data = await response.json()

      if (data.success) {
        sessionStorage.setItem('voting_token', code.toUpperCase())
        setShowScanner(false)
        router.push('/vote')
      } else {
        setError(data.message || 'รหัสไม่ถูกต้อง หรือถูกใช้ไปแล้ว')
        setManualCode('')
      }
    } catch {
      setError('การเชื่อมต่อล้มเหลว')
    } finally {
      setLoading(false)
    }
  }, [router])

  // Manage Scanner Lifecycle
  useEffect(() => {
    if (showScanner) {
      const initScanner = async () => {
        await new Promise(r => setTimeout(r, 300)) // Wait for modal animation

        if (!document.getElementById('popup-qr-reader')) return

        try {
          // If scanner already running, don't start
          if (scannerRef.current?.isScanning) return

          const scanner = new Html5Qrcode('popup-qr-reader')
          scannerRef.current = scanner

          await scanner.start(
            { facingMode: 'environment' },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0
            },
            (decodedText) => {
              scanner.stop().then(() => {
                validateToken(decodedText)
              }).catch(console.error)
            },
            () => { }
          )
        } catch (e) {
          console.error("Scanner failed", e)
          // Don't show error immediately to avoid spamming user if they just denied permission once
          // setError('ไม่สามารถเปิดกล้องได้')
        }
      }
      initScanner()
    } else {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error)
        scannerRef.current = null
      }
    }

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error)
      }
    }
  }, [showScanner, validateToken])

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualCode.length >= 6) validateToken(manualCode)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col relative overflow-hidden font-sans">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-slate-900 z-10" />

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10 w-full max-w-md mx-auto">

        {/* Branding */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-900 rounded-2xl mb-6 shadow-xl shadow-slate-200">
            <Vote className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
            RSL Smart Vote
          </h1>
          <p className="text-slate-500 font-medium">
            ระบบเลือกตั้งสภานักเรียน 2569
          </p>
          {stationLevel && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-slate-600 text-xs font-semibold">
              <span>จุดลงคะแนนสำหรับ {stationLevel}</span>
            </div>
          )}
        </motion.div>

        {/* Action Button (In case pop-up closed) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full space-y-4"
        >
          <button
            onClick={() => setShowScanner(true)}
            className="w-full py-5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
          >
            <Scan className="w-6 h-6" />
            เปิดสแกนบัตรเลือกตั้ง
          </button>
        </motion.div>

        {/* Footer Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-16 text-center"
        >
          <p className="text-slate-400 text-xs">หากต้องการเปลี่ยนระดับชั้น กรุณาปิดแท็บและเข้าใหม่</p>
        </motion.div>

      </main>

      {/* Scanner Popup Modal */}
      <AnimatePresence>
        {showScanner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-sm overflow-hidden relative shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 flex items-center gap-2 justify-center">
                  <Scan className="w-5 h-5" />
                  สแกนหรือกรอกรหัส
                </h3>
              </div>

              {/* Camera Area */}
              <div className="relative aspect-square bg-black shrink-0">
                <div id="popup-qr-reader" className="w-full h-full object-cover opacity-80" />

                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-64 h-64 border-2 border-white/50 rounded-2xl relative">
                    <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-white rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-white rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-white rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-white rounded-br-lg" />
                    <div className="absolute left-4 right-4 h-0.5 bg-red-500 top-1/2 scan-animation shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                  </div>
                </div>

                <div className="absolute bottom-4 inset-x-0 text-center pointer-events-none">
                  <span className="bg-black/50 text-white text-xs px-3 py-1 rounded-full backdrop-blur-md">
                    วาง QR Code ให้ตรงกรอบ
                  </span>
                </div>
              </div>

              {/* Manual Input Area (Inside Popup) */}
              <div className="p-5 bg-slate-50 border-t border-slate-100">
                <p className="text-xs text-center text-slate-500 mb-3 font-medium uppercase tracking-wide">หรือกรอกรหัสด้วยตนเอง</p>

                <form onSubmit={handleManualSubmit} className="relative">
                  <input
                    autoFocus
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                    placeholder="รหัส 8 หลัก"
                    maxLength={8}
                    className="w-full py-3 pl-4 pr-12 bg-white border border-slate-200 rounded-xl text-center font-mono text-xl font-bold text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none shadow-sm uppercase tracking-widest placeholder:normal-case placeholder:tracking-normal placeholder:font-sans placeholder:text-base placeholder:text-slate-400"
                  />
                  <button
                    type="submit"
                    disabled={manualCode.length < 6 || loading}
                    className="absolute right-1 top-1 bottom-1 aspect-square bg-slate-900 text-white rounded-lg flex items-center justify-center hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 transition-all"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  </button>
                </form>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-red-600 text-sm justify-center"
                  >
                    <span className="font-bold">Error:</span> {error}
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
