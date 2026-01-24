'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Plus, Trash2, Edit2, Printer, History, Users, QrCode,
    CheckCircle, XCircle, Loader2, Save, AlertCircle, RefreshCw,
    Upload, FileSpreadsheet, LayoutGrid, RotateCcw, ShieldAlert, LogOut, Settings, ClipboardList
} from 'lucide-react'
import QRCode from 'qrcode'
import { LoginForm } from '@/components/LoginForm'

interface Party {
    id: number
    name: string
    number: number
}

interface PrintLog {
    id: number
    batch_id: string
    token_count: number
    station_level: string | null
    printed_at: string
    printed_by: string | null
}

interface Stats {
    parties: number
    tokens: { inactive: number; activated: number; used: number }
    students: { total: number; voted: number }
    studentsByLevel?: { level: string; total: number; voted: number }[]
    partyVotesByLevel?: { station_level: string; party_id: number; party_name: string; party_number: number; vote_count: number }[]
}

interface GeneratedToken {
    code: string
    qrDataUrl: string
}

export default function AdminDashboardPage() {
    // Auth state
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [authLoading, setAuthLoading] = useState(true)
    const [sessionToken, setSessionToken] = useState<string | null>(null)
    const [adminUser, setAdminUser] = useState<{ username: string; displayName: string | null } | null>(null)

    const [activeTab, setActiveTab] = useState<'parties' | 'tokens' | 'students' | 'history' | 'stats' | 'settings' | 'logs'>('parties')
    const [parties, setParties] = useState<Party[]>([])
    const [printLogs, setPrintLogs] = useState<PrintLog[]>([])
    const [stats, setStats] = useState<Stats | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    // Party form state
    const [showPartyForm, setShowPartyForm] = useState(false)
    const [editingParty, setEditingParty] = useState<Party | null>(null)
    const [partyName, setPartyName] = useState('')
    const [partyNumber, setPartyNumber] = useState('')
    const [savingParty, setSavingParty] = useState(false)

    // User Management State
    const [users, setUsers] = useState<any[]>([])
    const [showUserModal, setShowUserModal] = useState(false)
    const [editingUser, setEditingUser] = useState<any | null>(null)
    const [userForm, setUserForm] = useState({ username: '', password: '', role: 'committee', displayName: '' })

    // System Settings State
    const [electionStatus, setElectionStatus] = useState<'open' | 'closed' | 'scheduled'>('closed')
    const [scheduledOpen, setScheduledOpen] = useState('')
    const [scheduledClose, setScheduledClose] = useState('')

    // Logs State
    const [activityLogs, setActivityLogs] = useState<any[]>([])

    // Token generation state
    const [tokenCount, setTokenCount] = useState('6')
    const [generatingTokens, setGeneratingTokens] = useState(false)
    const [generatedTokens, setGeneratedTokens] = useState<GeneratedToken[]>([])
    const [previewTokenCodes, setPreviewTokenCodes] = useState<string[]>([])
    const [showPrintPreview, setShowPrintPreview] = useState(false)
    const [currentBatchId, setCurrentBatchId] = useState('')
    const [tokenStartNumber, setTokenStartNumber] = useState(1)
    const [resetting, setResetting] = useState(false)
    const [confirmingPrint, setConfirmingPrint] = useState(false)

    // CSV upload state
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [uploading, setUploading] = useState(false)

    // Check session on mount
    useEffect(() => {
        const checkAuth = async () => {
            const token = sessionStorage.getItem('session_token')
            if (token) {
                try {
                    const res = await fetch('/api/auth/verify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ sessionToken: token })
                    })
                    const data = await res.json() as any
                    if (data.success && data.user.role === 'admin') {
                        setSessionToken(token)
                        setIsAuthenticated(true)
                        setAdminUser({ username: data.user.username, displayName: data.user.displayName })
                    } else {
                        sessionStorage.removeItem('session_token')
                        sessionStorage.removeItem('user_info')
                    }
                } catch {
                    sessionStorage.removeItem('session_token')
                }
            }
            setAuthLoading(false)
        }
        checkAuth()
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
            setSessionToken(data.sessionToken)
            setIsAuthenticated(true)
            setAdminUser({ username: data.user.username, displayName: data.user.displayName })
            return { success: true }
        }
        return { success: false, message: data.message }
    }

    const handleLogout = async () => {
        if (sessionToken) {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionToken })
            }).catch(() => { })
        }
        sessionStorage.removeItem('session_token')
        sessionStorage.removeItem('user_info')
        setIsAuthenticated(false)
        setSessionToken(null)
        setAdminUser(null)
    }

    useEffect(() => {
        if (isAuthenticated) fetchData()
    }, [isAuthenticated])

    const fetchData = async () => {
        setLoading(true)
        const headers = { 'Authorization': `Bearer ${sessionToken}` }

        // Fetch each independently to prevent one error blocking all data
        try {
            // Parties
            fetch('/api/parties').then(res => res.json()).then((data: any) => {
                if (data.success) setParties(data.parties)
            }).catch(console.error)

            // Print Logs
            fetch('/api/print-logs', { headers }).then(res => res.json()).then((data: any) => {
                if (data.success) setPrintLogs(data.logs)
            }).catch(console.error)

            // Stats
            fetch('/api/stats').then(res => res.json()).then((data: any) => {
                if (data.success) setStats(data.stats)
            }).catch(console.error)

            // Users (Auth Required)
            fetch('/api/users', { headers }).then(res => res.json()).then((data: any) => {
                if (data.success) setUsers(data.users)
            }).catch(console.error)

            // Election Status (Auth Required)
            fetch('/api/election-status', { headers }).then(res => res.json()).then((data: any) => {
                if (data.success) {
                    setElectionStatus(data.status)
                    setScheduledOpen(data.scheduledOpenTime || '')
                    setScheduledClose(data.scheduledCloseTime || '')
                }
            }).catch(console.error)

            // Activity Logs (Auth Required)
            fetch('/api/activity-logs', { headers }).then(res => res.json()).then((data: any) => {
                if (data.success) setActivityLogs(data.logs)
            }).catch(console.error)

        } catch (e) {
            console.error(e)
            setError('เกิดข้อผิดพลาดบางอย่างในการโหลดข้อมูล')
        } finally {
            // Wait a bit just to ensure UI doesn't flash too fast
            setTimeout(() => setLoading(false), 500)
        }
    }

    // --- Actions ---
    const handleSaveParty = async () => {
        if (!partyName.trim() || !partyNumber) return
        setSavingParty(true)
        setError(null)
        try {
            const url = editingParty ? `/api/parties/${editingParty.id}` : '/api/parties'
            const method = editingParty ? 'PUT' : 'POST'
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: partyName.trim(), number: parseInt(partyNumber) }),
            })
            const data = await response.json() as any
            if (data.success) {
                await fetchData()
                resetPartyForm()
                setSuccess('บันทึกสำเร็จ')
                setTimeout(() => setSuccess(null), 3000)
            } else setError(data.message)
        } catch {
            setError('เกิดข้อผิดพลาด')
        } finally {
            setSavingParty(false)
        }
    }

    const handleDeleteParty = async (id: number) => {
        if (!confirm('ยืนยันการลบ?')) return
        try {
            const response = await fetch(`/api/parties/${id}`, { method: 'DELETE' })
            const data = await response.json() as any
            if (data.success) {
                await fetchData()
                setSuccess('ลบสำเร็จ')
                setTimeout(() => setSuccess(null), 3000)
            } else setError(data.message)
        } catch { setError('เกิดข้อผิดพลาด') }
    }

    const handleEditParty = (party: Party) => {
        setEditingParty(party)
        setPartyName(party.name)
        setPartyNumber(party.number.toString())
        setShowPartyForm(true)
    }

    const resetPartyForm = () => {
        setShowPartyForm(false)
        setEditingParty(null)
        setPartyName('')
        setPartyNumber('')
    }

    const handleGenerateTokens = async () => {
        const count = parseInt(tokenCount)
        if (isNaN(count) || count < 1 || count > 120) {
            setError('กรุณาระบุจำนวน 1-120')
            return
        }
        setGeneratingTokens(true)
        setError(null)
        try {
            // Use preview API - does NOT save to database
            const response = await fetch('/api/tokens/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ count }),
            })
            const data = await response.json() as any
            if (data.success) {
                const tokensWithQR: GeneratedToken[] = await Promise.all(
                    data.tokens.map(async (code: string) => {
                        const qrDataUrl = await QRCode.toDataURL(code, {
                            width: 400,
                            margin: 0,
                            color: { dark: '#000000', light: '#ffffff' },
                            errorCorrectionLevel: 'H',
                        })
                        return { code, qrDataUrl }
                    })
                )
                setGeneratedTokens(tokensWithQR)
                setPreviewTokenCodes(data.tokens)
                setCurrentBatchId(data.batchId)
                setTokenStartNumber(data.startNumber || 1)
                setShowPrintPreview(true)
                // NOT fetching data here - tokens not saved yet
            } else setError(data.message)
        } catch {
            setError('เกิดข้อผิดพลาดในการสร้าง Token')
        } finally {
            setGeneratingTokens(false)
        }
    }

    // Confirm print - saves tokens to database
    const handleConfirmPrint = async () => {
        setConfirmingPrint(true)
        setError(null)
        try {
            const response = await fetch('/api/tokens/confirm-print', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tokens: previewTokenCodes,
                    batchId: currentBatchId,
                    startNumber: tokenStartNumber,
                }),
            })
            const data = await response.json() as any
            if (data.success) {
                // Print first
                window.print()
                // Then close modal and clear state
                setShowPrintPreview(false)
                setGeneratedTokens([])
                setPreviewTokenCodes([])
                setCurrentBatchId('')
                // Refresh data to show new tokens in history
                await fetchData()
                setSuccess(`พิมพ์และบันทึก ${previewTokenCodes.length} Token เรียบร้อย`)
                setTimeout(() => setSuccess(null), 3000)
            } else {
                setError(data.message || 'เกิดข้อผิดพลาดในการบันทึก')
            }
        } catch (err) {
            console.error('Print error:', err)
            setError('เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่')
        } finally {
            setConfirmingPrint(false)
        }
    }

    // Cancel batch
    const handleCancelBatch = async (batchId: string) => {
        if (!confirm(`ยืนยันยกเลิก Batch ${batchId}?`)) return
        try {
            const res = await fetch('/api/tokens/cancel-batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ batchId }),
            })
            const data = await res.json() as any
            if (data.success) {
                await fetchData()
                setSuccess(data.message)
                setTimeout(() => setSuccess(null), 3000)
            } else {
                setError(data.message)
            }
        } catch {
            setError('เกิดข้อผิดพลาด')
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setUploading(true)
        setError(null)

        try {
            const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
            let body: any = {}

            if (isExcel) {
                // Read as Base64 for Excel using FileReader (Browser native)
                const base64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader()
                    reader.onload = () => {
                        const result = reader.result as string
                        // Remove data URL prefix (e.g., "data:application/vnd...;base64,")
                        const base64Clean = result.split(',')[1] || ''
                        resolve(base64Clean)
                    }
                    reader.onerror = reject
                    reader.readAsDataURL(file)
                })
                body = { fileType: 'excel', fileData: base64 }
            } else {
                // Read as Text for CSV
                const text = await file.text()
                body = { csvData: text }
            }

            const response = await fetch('/api/students/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })
            const data = await response.json() as any
            if (data.success) {
                setSuccess(`นำเข้าสำเร็จ ${data.count} รายการ`)
                setTimeout(() => setSuccess(null), 3000)
                await fetchData()
            } else setError(data.message)
        } catch (err: any) {
            setError('เกิดข้อผิดพลาดในการอัปโหลด: ' + err.message)
        } finally {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleClearHistory = async () => {
        if (!confirm('ยืนยันลบประวัติการพิมพ์ทั้งหมด? ข้อมูล Token จะไม่ถูกลบ')) return
        setResetting(true)
        try {
            const res = await fetch('/api/print-logs/clear', { method: 'POST' })
            const data = await res.json() as any
            if (data.success) {
                await fetchData()
                setSuccess('ลบประวัติแล้ว')
                setTimeout(() => setSuccess(null), 3000)
            } else setError(data.message)
        } finally { setResetting(false) }
    }

    const handleUpdateStatus = async (status: 'open' | 'closed' | 'scheduled') => {
        try {
            const res = await fetch('/api/election-status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionToken}`
                },
                body: JSON.stringify({ status, scheduledOpenTime: scheduledOpen, scheduledCloseTime: scheduledClose })
            })
            const data = await res.json() as any
            if (data.success) {
                setElectionStatus(status)
                setSuccess('อัปเดตสถานะสำเร็จ')
                setTimeout(() => setSuccess(null), 3000)
            } else setError(data.message)
        } catch { setError('อัปเดตล้มเหลว') }
    }

    const resetUserForm = () => {
        setUserForm({ username: '', password: '', role: 'committee', displayName: '' })
        setEditingUser(null)
        setShowUserModal(false)
    }

    const handleEditUser = (user: any) => {
        setEditingUser(user)
        setUserForm({
            username: user.username,
            password: '',
            role: user.role,
            displayName: user.display_name || ''
        })
        setShowUserModal(true)
    }

    const handleSaveUser = async () => {
        if (!userForm.username) return setError('กรุณาระบุ Username')
        if (!editingUser && !userForm.password) return setError('กรุณาระบุ Password')

        try {
            const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users'
            const method = editingUser ? 'PUT' : 'POST'

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionToken}`
                },
                body: JSON.stringify(userForm)
            })
            const data = await res.json() as any

            if (data.success) {
                setSuccess(editingUser ? 'แก้ไขผู้ใช้สำเร็จ' : 'สร้างผู้ใช้สำเร็จ')
                setTimeout(() => setSuccess(null), 3000)
                resetUserForm()
                fetchData()
            } else setError(data.message)
        } catch { setError('บันทึกผู้ใช้ล้มเหลว') }
    }

    const handleDeleteUser = async (id: number) => {
        if (!confirm('ยืนยันลบผู้ใช้นี้?')) return
        try {
            const res = await fetch(`/api/users/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${sessionToken}` }
            })
            const data = await res.json() as any
            if (data.success) {
                setSuccess('ลบผู้ใช้สำเร็จ')
                setTimeout(() => setSuccess(null), 3000)
                fetchData()
            } else setError(data.message)
        } catch { setError('ลบผู้ใช้ล้มเหลว') }
    }

    // --- Render ---

    // Auth loading
    if (authLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin" /></div>
    }

    // Not authenticated - show login
    if (!isAuthenticated) {
        return <LoginForm title="Admin Dashboard" onLogin={handleLogin} />
    }

    if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30 no-print">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <h1 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                        <LayoutGrid className="w-6 h-6 text-slate-600" />
                        Admin Dashboard
                    </h1>
                    <button onClick={fetchData} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <RefreshCw className="w-5 h-5 text-slate-500" />
                    </button>
                </div>
            </header>

            {/* Tabs */}
            <div className="bg-white border-b border-slate-200 no-print">
                <div className="max-w-6xl mx-auto px-6 flex items-center gap-8 overflow-x-auto">
                    {[
                        { id: 'parties', label: 'พรรคการเมือง', icon: Users },
                        { id: 'tokens', label: 'พิมพ์บัตรเลือกตั้ง', icon: Printer },
                        { id: 'students', label: 'ฐานข้อมูล', icon: FileSpreadsheet },
                        { id: 'history', label: 'ประวัติ', icon: History },
                        { id: 'stats', label: 'สถิติ', icon: AlertCircle },
                        { id: 'settings', label: 'ตั้งค่า & ผู้ใช้', icon: Settings },
                        { id: 'logs', label: 'Logs', icon: ClipboardList },
                    ].map(tab => (
                        <button
                            key={`tab-${tab.id}`}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                                ? 'border-slate-900 text-slate-900'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <main className="max-w-6xl mx-auto px-6 py-8 no-print">
                <AnimatePresence>
                    {error && (
                        <motion.div key="error-banner" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-100 flex items-center gap-3">
                            <AlertCircle className="w-5 h-5" />
                            {error}
                            <button onClick={() => setError(null)} className="ml-auto"><XCircle className="w-5 h-5" /></button>
                        </motion.div>
                    )}
                    {success && (
                        <motion.div key="success-banner" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-6 p-4 bg-green-50 text-green-700 rounded-lg border border-green-100 flex items-center gap-3">
                            <CheckCircle className="w-5 h-5" />
                            {success}
                        </motion.div>
                    )}
                    {activeTab === 'stats' && (
                        <motion.div key="stats-view" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.2 }} className="space-y-6">
                            {!stats ? (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                    <Loader2 className="w-8 h-8 animate-spin mb-4" />
                                    <p>กำลังโหลดข้อมูลสถิติ...</p>
                                    <button onClick={fetchData} className="mt-4 text-sm text-slate-600 hover:text-slate-900 underline">
                                        ลองใหม่อีกครั้ง
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {/* Summary Cards */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                            <p className="text-sm text-slate-500 mb-1">จำนวนพรรค</p>
                                            <p className="text-3xl font-bold text-slate-900">{stats.parties}</p>
                                        </div>
                                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                            <p className="text-sm text-slate-500 mb-1">Token ทั้งหมด</p>
                                            <p className="text-3xl font-bold text-blue-600">
                                                {stats.tokens.inactive + stats.tokens.activated + stats.tokens.used}
                                            </p>
                                        </div>
                                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                            <p className="text-sm text-slate-500 mb-1">ใช้สิทธิ์แล้ว</p>
                                            <p className="text-3xl font-bold text-green-600">{stats.students.voted}</p>
                                        </div>
                                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                            <p className="text-sm text-slate-500 mb-1">ยังไม่ใช้สิทธิ์</p>
                                            <p className="text-3xl font-bold text-orange-500">
                                                {stats.students.total - stats.students.voted}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Stats by Level (Turnout) */}
                                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                                            <h3 className="font-bold text-slate-800">สถิติการใช้สิทธิ์แยกตามชั้นปี</h3>
                                            <span className="text-xs text-slate-500 font-normal">* ข้อมูลจะแสดงเมื่อมีการนำเข้า &quot;ฐานข้อมูลรายชื่อ&quot;</span>
                                        </div>
                                        {stats.studentsByLevel && stats.studentsByLevel.length > 0 ? (
                                            <table className="w-full text-left">
                                                <thead className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                                    <tr>
                                                        <th className="px-6 py-3">ระดับชั้น</th>
                                                        <th className="px-6 py-3 text-right">ทั้งหมด</th>
                                                        <th className="px-6 py-3 text-right">ใช้สิทธิ์แล้ว</th>
                                                        <th className="px-6 py-3 text-right">ยังไม่ใช้</th>
                                                        <th className="px-6 py-3 text-right">% การใช้สิทธิ์</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {stats.studentsByLevel.map((levelStat: any) => {
                                                        const percentage = levelStat.total > 0 ? (levelStat.voted / levelStat.total) * 100 : 0
                                                        return (
                                                            <tr key={levelStat.level} className="hover:bg-slate-50/50">
                                                                <td className="px-6 py-3 font-medium text-slate-900">{levelStat.level}</td>
                                                                <td className="px-6 py-3 text-right text-slate-600">{levelStat.total}</td>
                                                                <td className="px-6 py-3 text-right text-green-600 font-medium">{levelStat.voted}</td>
                                                                <td className="px-6 py-3 text-right text-orange-500">{levelStat.total - levelStat.voted}</td>
                                                                <td className="px-6 py-3 text-right">
                                                                    <div className="flex items-center justify-end gap-2">
                                                                        <span className="text-sm font-medium">{percentage.toFixed(1)}%</span>
                                                                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                            <div className="h-full bg-green-500 rounded-full" style={{ width: `${percentage}%` }}></div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )
                                                    })}
                                                </tbody>
                                            </table>
                                        ) : (
                                            <div className="p-8 text-center text-slate-400 bg-slate-50/50">
                                                ยังไม่มีข้อมูลนักเรียน (กรุณาไปที่เมนู &quot;ฐานข้อมูล&quot; เพื่อนำเข้าไฟล์ Excel)
                                            </div>
                                        )}
                                    </div>

                                    {/* Stats by Party (Vote Breakdown) */}
                                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                                            <h3 className="font-bold text-slate-800">ผลคะแนนแยกตามชั้นปี (Vote Breakdown)</h3>
                                        </div>
                                        {stats.partyVotesByLevel && stats.partyVotesByLevel.length > 0 ? (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left whitespace-nowrap">
                                                    <thead className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                                        <tr>
                                                            <th className="px-6 py-3">ระดับชั้น</th>
                                                            <th className="px-6 py-3">พรรค / ผู้สมัคร</th>
                                                            <th className="px-6 py-3 text-right">คะแนน</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {stats.partyVotesByLevel.map((vote: any, idx: number) => (
                                                            <tr key={`${vote.station_level}-${vote.party_id}-${idx}`} className="hover:bg-slate-50/50">
                                                                <td className="px-6 py-2 font-medium text-slate-900">{vote.station_level}</td>
                                                                <td className="px-6 py-2 text-slate-700">
                                                                    {vote.party_number > 0 ? (
                                                                        <span className="inline-flex items-center gap-2">
                                                                            <span className="w-5 h-5 bg-slate-800 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                                                                {vote.party_number}
                                                                            </span>
                                                                            {vote.party_name}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-slate-500 italic">{vote.party_name}</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-6 py-2 text-right font-medium text-slate-900">{vote.vote_count}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="p-8 text-center text-slate-400 bg-slate-50/50">
                                                ยังไม่มีการลงคะแนน
                                            </div>
                                        )}
                                    </div>

                                    {/* System Management (Refined) */}
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mt-8">
                                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                                            <ShieldAlert className="w-5 h-5 text-slate-600" />
                                            จัดการข้อมูลระบบ (System Data Management)
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <div className="flex flex-col gap-2">
                                                <button
                                                    onClick={handleClearHistory}
                                                    disabled={resetting}
                                                    className="w-full px-4 py-3 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 font-medium flex items-center justify-center gap-2 transition-colors"
                                                >
                                                    <History className="w-4 h-4" /> ล้างประวัติการพิมพ์
                                                </button>
                                                <p className="text-xs text-slate-500 text-center">ลบรายการในหน้า &quot;ประวัติ&quot; (History) เท่านั้น ข้อมูลอื่นยังอยู่ครบ</p>
                                            </div>

                                            <div className="flex flex-col gap-2">
                                                <button
                                                    onClick={async () => {
                                                        if (!confirm('ยืนยันลบ "รายชื่อนักเรียน" ทั้งหมด? (ข้อมูลอื่นๆ จะยังอยู่)')) return
                                                        setResetting(true)
                                                        try {
                                                            const res = await fetch('/api/admin/reset', {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ mode: 'students' })
                                                            })
                                                            const data = await res.json() as any
                                                            if (data.success) {
                                                                await fetchData()
                                                                setSuccess('ลบรายชื่อนักเรียนเรียบร้อย')
                                                            } else setError(data.message)
                                                        } finally { setResetting(false) }
                                                    }}
                                                    disabled={resetting}
                                                    className="w-full px-4 py-3 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 font-medium flex items-center justify-center gap-2 transition-colors"
                                                >
                                                    <Users className="w-4 h-4" /> ลบรายชื่อนักเรียน
                                                </button>
                                                <p className="text-xs text-slate-500 text-center">ลบฐานข้อมูลนักเรียนทั้งหมด เพื่อเตรียมนำเข้าไฟล์ใหม่</p>
                                            </div>

                                            <div className="flex flex-col gap-2">
                                                <button
                                                    onClick={async () => {
                                                        const code = prompt('พิมพ์ "RESET" เพื่อยืนยันการล้างคะแนนและบัตรเลือกตั้ง (เก็บรายชื่อและพรรคไว้)')
                                                        if (code !== 'RESET') return
                                                        setResetting(true)
                                                        try {
                                                            const res = await fetch('/api/admin/reset', {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ mode: 'votes' })
                                                            })
                                                            const data = await res.json() as any
                                                            if (data.success) {
                                                                await fetchData()
                                                                setSuccess('รีเซ็ตระบบเลือกตั้งเรียบร้อย')
                                                            } else setError(data.message)
                                                        } finally { setResetting(false) }
                                                    }}
                                                    disabled={resetting}
                                                    className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium flex items-center justify-center gap-2 shadow-sm transition-colors"
                                                >
                                                    <RotateCcw className="w-4 h-4" /> รีเซ็ตระบบเลือกตั้ง
                                                </button>
                                                <p className="text-xs text-slate-500 text-center">ลบคะแนนและ Token ทั้งหมด (รีเซ็ตเป็น 0) แต่ **เก็บ** รายชื่อนักเรียนและพรรคไว้</p>
                                            </div>

                                            <div className="flex flex-col gap-2">
                                                <button
                                                    onClick={async () => {
                                                        const code = prompt('⚠️ อันตราย: พิมพ์ "FACTORY RESET" เพื่อล้างข้อมูลทุกอย่าง (นักเรียน, พรรค, คะแนน, LOG)')
                                                        if (code !== 'FACTORY RESET') return
                                                        setResetting(true)
                                                        try {
                                                            const res = await fetch('/api/admin/reset', {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ mode: 'all' })
                                                            })
                                                            const data = await res.json() as any
                                                            if (data.success) {
                                                                await fetchData()
                                                                setSuccess('ล้างข้อมูลทั้งระบบเรียบร้อย')
                                                            } else setError(data.message)
                                                        } finally { setResetting(false) }
                                                    }}
                                                    disabled={resetting}
                                                    className="w-full px-4 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-900 font-medium flex items-center justify-center gap-2 shadow-sm transition-colors"
                                                >
                                                    <ShieldAlert className="w-4 h-4" /> ล้างข้อมูลทั้งหมด
                                                </button>
                                                <p className="text-xs text-slate-500 text-center">**ล้างทุกอย่าง** ให้เหมือนติดตั้งใหม่ (ลบนักเรียน/พรรค/คะแนน/Log)</p>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'parties' && (
                        <motion.div key="parties-view" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.2 }} className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-bold">พรรคการเมือง</h2>
                                <button onClick={() => setShowPartyForm(true)} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors">
                                    <Plus className="w-4 h-4" /> เพิ่มพรรค
                                </button>
                            </div>
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {parties.map(p => (
                                    <div key={`party-${p.id}`} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                                        <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-xl font-bold text-slate-700">{p.number}</div>
                                        <div className="flex-1">
                                            <div className="font-bold text-slate-900">{p.name}</div>
                                            <div className="text-sm text-slate-500">หมายเลข {p.number}</div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleEditParty(p)} className="p-2 text-slate-400 hover:text-slate-600"><Edit2 className="w-4 h-4" /></button>
                                            <button onClick={() => handleDeleteParty(p.id)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'tokens' && (
                        <motion.div key="tokens-view" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.2 }} className="max-w-2xl mx-auto bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <Printer className="w-6 h-6 text-slate-700" />
                                พิมพ์บัตรเลือกตั้ง
                            </h2>
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">จำนวนบัตรที่ต้องการพิมพ์</label>
                                    <div className="flex gap-3">
                                        <input
                                            type="number"
                                            value={tokenCount}
                                            onChange={e => setTokenCount(e.target.value)}
                                            className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none"
                                            placeholder="เช่น 6, 12, 60"
                                        />
                                        <button
                                            onClick={handleGenerateTokens}
                                            disabled={generatingTokens}
                                            className="bg-slate-900 text-white px-8 py-3 rounded-xl font-medium hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {generatingTokens ? <Loader2 className="animate-spin w-5 h-5" /> : 'สร้าง Preview'}
                                        </button>
                                    </div>
                                    <p className="text-sm text-slate-500 mt-2">
                                        * ระบบจะจัดหน้ากระดาษ A4 ให้โดยอัตโนมัติ (6 ใบ/แผ่น)
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'students' && (
                        <motion.div key="students-view" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.2 }} className="max-w-2xl mx-auto bg-white p-10 rounded-2xl border border-slate-200 shadow-sm text-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <FileSpreadsheet className="w-8 h-8 text-slate-400" />
                            </div>
                            <h2 className="text-xl font-bold mb-2">นำเข้าข้อมูลนักเรียน</h2>
                            <p className="text-slate-500 mb-8">อัปโหลดไฟล์ CSV เพื่ออัปเดตฐานข้อมูล</p>
                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv, .xlsx, .xls" className="hidden" id="csv" />
                            <label htmlFor="csv" className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl cursor-pointer hover:bg-slate-800 transition-colors">
                                {uploading ? <Loader2 className="animate-spin w-5 h-5" /> : <Upload className="w-5 h-5" />}
                                เลือกไฟล์ CSV หรือ Excel
                            </label>
                        </motion.div>
                    )}

                    {activeTab === 'history' && (
                        <motion.div key="history-view" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.2 }} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold text-slate-700">Batch ID</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700">จำนวน</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700">เวลาที่สร้าง</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700 text-center">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {printLogs.map(log => (
                                        <tr key={`log-${log.id}`} className="hover:bg-slate-50">
                                            <td className="px-6 py-4 font-mono text-slate-600 text-sm">{log.batch_id}</td>
                                            <td className="px-6 py-4 text-slate-900">{log.token_count}</td>
                                            <td className="px-6 py-4 text-slate-500 text-sm">{new Date(log.printed_at).toLocaleString('th-TH')}</td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => handleCancelBatch(log.batch_id)}
                                                    className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium flex items-center gap-1 mx-auto"
                                                >
                                                    <Trash2 className="w-4 h-4" /> ยกเลิก
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {printLogs.length === 0 && (
                                <div className="p-8 text-center text-slate-400">ยังไม่มีประวัติการพิมพ์</div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
                {activeTab === 'settings' && (
                    <motion.div key="settings-view" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="space-y-6">
                        {/* Election Status Control */}
                        <div className="bg-white rounded-xl shadow border border-slate-200 p-6">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Settings className="w-5 h-5" /> ควบคุมระบบเลือกตั้ง</h2>
                            <div className="flex flex-wrap gap-4 mb-4">
                                <button
                                    onClick={() => handleUpdateStatus('open')}
                                    className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 ${electionStatus === 'open' ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                >
                                    <CheckCircle className="w-4 h-4" /> เปิดระบบ
                                </button>
                                <button
                                    onClick={() => handleUpdateStatus('closed')}
                                    className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 ${electionStatus === 'closed' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                >
                                    <XCircle className="w-4 h-4" /> ปิดระบบ
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">เวลาเปิดอัตโนมัติ</label>
                                    <input type="datetime-local" value={scheduledOpen} onChange={e => setScheduledOpen(e.target.value)} className="w-full border p-2 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">เวลาปิดอัตโนมัติ</label>
                                    <input type="datetime-local" value={scheduledClose} onChange={e => setScheduledClose(e.target.value)} className="w-full border p-2 rounded-lg" />
                                </div>
                            </div>
                            <button onClick={() => handleUpdateStatus('scheduled')} className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800">บันทึกเวลา</button>
                        </div>

                        {/* User Management */}
                        <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
                            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                                <h2 className="text-xl font-bold flex items-center gap-2"><Users className="w-5 h-5" /> จัดการผู้ใช้งาน</h2>
                                <button onClick={() => { resetUserForm(); setShowUserModal(true) }} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-green-700">
                                    <Plus className="w-4 h-4" /> เพิ่มผู้ใช้
                                </button>
                            </div>
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Username</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">ชื่อแสดงผล</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">สิทธิ์</th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {users.map(user => (
                                        <tr key={user.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4 text-sm font-medium text-slate-900">{user.username}</td>
                                            <td className="px-6 py-4 text-sm text-slate-500">{user.display_name}</td>
                                            <td className="px-6 py-4 text-sm">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right flex justify-end gap-2">
                                                <button onClick={() => handleEditUser(user)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="w-4 h-4" /></button>
                                                <button onClick={() => handleDeleteUser(user.id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'logs' && (
                    <motion.div key="logs-view" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="space-y-6">
                        <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
                            <div className="p-6 border-b border-slate-200 bg-slate-50">
                                <h2 className="text-xl font-bold flex items-center gap-2"><ClipboardList className="w-5 h-5" /> บันทึกการใช้งาน (Activity Logs)</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">เวลา</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">ผู้ใช้</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">กิจกรรม</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">รายละเอียด</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">IP</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {activityLogs.map(log => (
                                            <tr key={log.id} className="hover:bg-slate-50">
                                                <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                                                    {new Date(log.created_at).toLocaleString('th-TH')}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-medium text-slate-900">{log.user_username || 'System'}</td>
                                                <td className="px-6 py-4 text-sm text-slate-700 font-medium">{log.action}</td>
                                                <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">{log.details}</td>
                                                <td className="px-6 py-4 text-sm text-slate-400 font-mono text-xs">{log.ip_address}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </motion.div>
                )}
            </main>

            {/* User Modal */}
            {showUserModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                        <h3 className="text-lg font-bold mb-4">{editingUser ? 'แก้ไขผู้ใช้งาน' : 'เพิ่มผู้ใช้งาน'}</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-slate-500">Username</label>
                                <input type="text" placeholder="username" value={userForm.username} onChange={e => setUserForm({ ...userForm, username: e.target.value })} className="w-full border p-2 rounded-lg" disabled={!!editingUser} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500">ชื่อแสดงผล</label>
                                <input type="text" placeholder="ชื่อสกุล" value={userForm.displayName} onChange={e => setUserForm({ ...userForm, displayName: e.target.value })} className="w-full border p-2 rounded-lg" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500">รหัสผ่าน {editingUser && '(เว้นว่างหากไม่เปลี่ยน)'}</label>
                                <input type="password" placeholder="password" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} className="w-full border p-2 rounded-lg" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500">สิทธิ์การใช้งาน</label>
                                <select value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })} className="w-full border p-2 rounded-lg">
                                    <option value="committee">Committee (กรรมการ)</option>
                                    <option value="admin">Admin (ผู้ดูแลระบบ)</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={resetUserForm} className="flex-1 py-3 text-slate-600 hover:bg-slate-50 rounded-lg">ยกเลิก</button>
                            <button onClick={handleSaveUser} className="flex-1 py-3 bg-slate-900 text-white rounded-lg">บันทึก</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modals */}
            {showPartyForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                        <h3 className="text-lg font-bold mb-4">{editingParty ? 'แก้ไขพรรค' : 'เพิ่มพรรค'}</h3>
                        <div className="space-y-3">
                            <input type="number" placeholder="เบอร์" value={partyNumber} onChange={e => setPartyNumber(e.target.value)} className="w-full border p-3 rounded-lg" />
                            <input type="text" placeholder="ชื่อพรรค" value={partyName} onChange={e => setPartyName(e.target.value)} className="w-full border p-3 rounded-lg" />
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={resetPartyForm} className="flex-1 py-3 text-slate-600 hover:bg-slate-50 rounded-lg">ยกเลิก</button>
                            <button onClick={handleSaveParty} className="flex-1 py-3 bg-slate-900 text-white rounded-lg">บันทึก</button>
                        </div>
                    </div>
                </div>
            )}

            {showPrintPreview && (
                <div className="fixed inset-0 z-[100] bg-slate-900/90 flex flex-col no-print">
                    <div className="bg-white p-4 flex justify-between items-center shadow-md z-10">
                        <div>
                            <h2 className="font-bold text-lg">Print Preview</h2>
                            <p className="text-sm text-slate-500">{generatedTokens.length} บัตร (A4 {Math.ceil(generatedTokens.length / 6)} แผ่น) - <span className="text-amber-600 font-medium">ยังไม่บันทึก</span></p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => { setShowPrintPreview(false); setGeneratedTokens([]); setPreviewTokenCodes([]) }} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg">ยกเลิก</button>
                            <button
                                onClick={handleConfirmPrint}
                                disabled={confirmingPrint}
                                className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold flex items-center gap-2 hover:bg-green-700 disabled:opacity-50"
                            >
                                {confirmingPrint ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                                พิมพ์และบันทึก
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto p-8 bg-slate-500">
                        <div className="flex flex-col items-center gap-8">
                            {/* Show ALL pages in preview */}
                            <PrintLayout tokens={generatedTokens} batchId={currentBatchId} startNumber={tokenStartNumber} prefix="preview" debugMode />
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden Print Layout - only render when there are tokens */}
            {generatedTokens.length > 0 && (
                <div className="hidden print:block">
                    <PrintLayout tokens={generatedTokens} batchId={currentBatchId} startNumber={tokenStartNumber} prefix="print" />
                </div>
            )}
        </div>
    )
}

// ----------------------------------------------------------------------
// Perfect A4 Layout: 6 Cards (2 cols x 3 rows)
// ----------------------------------------------------------------------
function PrintLayout({ tokens, batchId, startNumber, prefix = 'layout', debugMode = false }: { tokens: GeneratedToken[]; batchId: string; startNumber: number; prefix?: string; debugMode?: boolean }) {
    const pages = []
    for (let i = 0; i < tokens.length; i += 6) {
        pages.push(tokens.slice(i, i + 6))
    }

    return (
        <>
            <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          html, body {
            margin: 0;
            padding: 0;
            width: 210mm;
            height: 297mm;
          }
        }
        .a4-page {
          width: 210mm;
          height: 296mm; 
          background: white;
          padding: 5mm; /* Reduced padding from 10mm to 5mm to prevent overflow */
          box-sizing: border-box;
          display: grid;
          grid-template-columns: 1fr 1fr;
          grid-template-rows: 1fr 1fr 1fr;
          gap: 0;
          page-break-after: always;
        }
        .ballot-card {
          border: 1px dashed #d1d5db;
          margin: 1px; /* Slight separation */
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 8px; /* Reduced padding inside card */
          justify-content: space-between;
          height: 100%;
        }
      `}</style>

            {pages.map((pageTokens, pageIndex) => (
                <div key={`${prefix}-page-${pageIndex}`} className="a4-page">
                    {pageTokens.map((token, index) => {
                        const globalIndex = pageIndex * 6 + index
                        const currentNumber = startNumber + globalIndex
                        return (
                            <div key={`${prefix}-card-${globalIndex}`} className="ballot-card">
                                {/* Header & Logo */}
                                <div className="w-full flex items-center justify-between border-b-2 border-slate-900 pb-1.5 mb-1">
                                    {/* Logo - put logo.png in /public folder */}
                                    <img
                                        src="/logo.png"
                                        alt="Logo"
                                        className="w-10 h-10 object-contain"
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                    />
                                    <div className="text-right">
                                        <h1 className="text-base font-extrabold text-slate-900 leading-none tracking-tight">RSL SMART VOTE</h1>
                                        <p className="text-[8px] text-slate-500 font-semibold uppercase">Student Council Election 2569</p>
                                    </div>
                                </div>

                                {/* QR Code - LARGER */}
                                <div className="flex-1 flex flex-col items-center justify-center py-1">
                                    <div className="p-1 border-2 border-slate-900 rounded-lg">
                                        <img src={token.qrDataUrl} alt="QR" className="w-[130px] h-[130px] object-contain block" style={{ imageRendering: 'pixelated' }} />
                                    </div>
                                    <p className="text-xl font-mono font-bold text-slate-900 tracking-[0.15em] mt-1">{token.code}</p>
                                </div>

                                {/* Instructions - Compact */}
                                <div className="w-full text-left bg-slate-50 p-1.5 rounded border border-slate-100 mb-1">
                                    <p className="text-[7px] text-slate-600 leading-tight">
                                        <span className="font-bold">วิธีใช้:</span> สแกน QR ที่จุดลงคะแนน → เลือกเบอร์ → ยืนยัน (1 คน 1 เสียง)
                                    </p>
                                </div>

                                {/* Footer */}
                                <div className="w-full flex justify-between items-end border-t border-slate-200 pt-1">
                                    <span className="text-[8px] font-mono text-slate-400">{batchId}</span>
                                    <span className="text-[10px] font-bold text-slate-900">NO. {currentNumber}/2569</span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ))}
        </>
    )
}
