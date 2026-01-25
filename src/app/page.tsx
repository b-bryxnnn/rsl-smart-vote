'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Html5Qrcode } from 'html5-qrcode'
import { Scan, ArrowRight, Loader2, Vote, MapPin } from 'lucide-react'
import { getStationLevel } from '@/lib/utils'
import { SystemClosedOverlay } from '@/components/SystemClosedOverlay'
import { TokenInput } from '@/components/TokenInput'

export default function HomePage() {
  const router = useRouter()
  const [showScanner, setShowScanner] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [stationLevel, setStationLevel] = useState<string | null>(null)
  const [electionStatus, setElectionStatus] = useState<'open' | 'closed' | 'loading'>('loading')
  const [scheduledOpenTime, setScheduledOpenTime] = useState<string | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const mountedRef = useRef(false)

  // Check election status
  const checkElectionStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/election-status')
      const data = await res.json() as any
      if (data.success) {
        setElectionStatus(data.status === 'open' ? 'open' : 'closed')
        setScheduledOpenTime(data.scheduledOpenTime || null)
      }
    } catch {
      // Default to open if can't check
      setElectionStatus('open')
    }
  }, [])

  // Call expire check periodically
  useEffect(() => {
    const checkExpiredTokens = async () => {
      try {
        await fetch('/api/tokens/expire-check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      } catch { /* ignore */ }
    }

    // Check every 2 minutes
    const interval = setInterval(checkExpiredTokens, 2 * 60 * 1000)
    checkExpiredTokens() // Initial check

    return () => clearInterval(interval)
  }, [])

  // 1. Check Station Level & Auto-Open Scanner
  useEffect(() => {
    if (mountedRef.current) return
    mountedRef.current = true

    // Check election status first
    checkElectionStatus()

    // Check station setup
    const level = getStationLevel()
    if (!level) {
      router.push('/station-setup')
      return
    }
    setStationLevel(level)

    // Auto-open scanner (will check election status inside)
    setShowScanner(true)
  }, [router, checkElectionStatus])

  // Function to restart scanner after error
  const restartScanner = useCallback(async () => {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop().catch(console.error)
    }
    scannerRef.current = null

    // Small delay then restart
    await new Promise(r => setTimeout(r, 500))

    if (!document.getElementById('popup-qr-reader')) return

    try {
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
      console.error("Scanner restart failed", e)
    }
  }, [])

  const validateToken = useCallback(async (code: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/validate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.toUpperCase(), stationLevel }),
      })

      const data = await response.json() as any

      if (data.success) {
        sessionStorage.setItem('voting_token', code.toUpperCase())
        setShowScanner(false)
        router.push('/vote')
      } else {
        // Check if election is closed
        if (data.electionClosed) {
          setElectionStatus('closed')
          setScheduledOpenTime(data.scheduledOpenTime || null)
        }
        setError(data.message || 'รหัสไม่ถูกต้อง หรือถูกใช้ไปแล้ว')
        setManualCode('')
        // Auto-restart camera after 2 seconds
        setTimeout(() => {
          restartScanner()
        }, 2000)
      }
    } catch {
      setError('การเชื่อมต่อล้มเหลว')
      // Auto-restart camera after 2 seconds
      setTimeout(() => {
        restartScanner()
      }, 2000)
    } finally {
      setLoading(false)
    }
  }, [router, restartScanner])

  // Manage Scanner Lifecycle
  useEffect(() => {
    if (showScanner && electionStatus === 'open') {
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
  }, [showScanner, electionStatus, validateToken])

  const handleManualSubmit = () => {
    if (manualCode.length >= 16) validateToken(manualCode) // RSL-XXXX-XXXXXXXX = 16 chars
  }

  // Show loading state
  if (electionStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  // Show closed overlay
  if (electionStatus === 'closed') {
    return <SystemClosedOverlay scheduledOpenTime={scheduledOpenTime} />
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
              <MapPin className="w-3 h-3" />
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
              className="bg-white rounded-3xl w-full max-w-sm overflow-y-auto relative shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 flex items-center gap-2 justify-center">
                  <Scan className="w-5 h-5" />
                  สแกนหรือกรอกรหัส
                </h3>
                {stationLevel && (
                  <p className="text-center text-xs text-slate-500 mt-1 flex items-center justify-center gap-1">
                    <MapPin className="w-3 h-3" />
                    จุดลงคะแนน: {stationLevel}
                  </p>
                )}
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

                <div className="flex flex-col items-center gap-3">
                  <TokenInput
                    value={manualCode}
                    onChange={setManualCode}
                    onSubmit={handleManualSubmit}
                    disabled={loading}
                  />
                  <button
                    onClick={handleManualSubmit}
                    disabled={manualCode.length < 16 || loading}
                    className="w-full py-3 bg-slate-900 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-500 transition-all"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    ยืนยัน
                  </button>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm text-center"
                    style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
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
