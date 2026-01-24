// Mock Database for local development on Windows
// This file provides mock data when D1 is not available

import { getRequestContext } from '@cloudflare/next-on-pages'
import { hashPassword, verifyPassword, generateSessionToken } from './hash'

// Types
export interface User {
    id: number
    username: string
    password_hash: string
    role: 'admin' | 'committee'
    display_name: string | null
    is_active: number
    created_at: string
    last_login: string | null
}

export interface Session {
    id: number
    user_id: number
    session_token: string
    created_at: string
    expires_at: string | null
}

export interface ActivityLog {
    id: number
    action: string
    details: string | null
    user_id: number | null
    user_username: string | null
    ip_address: string | null
    user_agent: string | null
    created_at: string
}

export interface Student {
    id: number
    student_id: string
    prefix: string
    first_name: string
    last_name: string
    level: string
    room: string | null
    vote_status: 'voted' | 'absent' | null
    voted_at: string | null
}

export interface Party {
    id: number
    name: string
    number: number
    created_at: string
}

export interface Token {
    id: number
    code: string
    status: 'inactive' | 'activated' | 'voting' | 'used' | 'expired'
    station_level: string | null
    print_batch_id: string | null
    student_id: string | null
    activated_by: number | null
    activated_at: string | null
    voting_started_at: string | null
    used_at: string | null
    created_at: string
}

export interface Vote {
    id: number
    party_id: number | null
    station_level: string
    token_id: number
    is_abstain: number
    created_at: string
}

export interface PrintLog {
    id: number
    batch_id: string
    token_count: number
    station_level: string | null
    printed_at: string
    printed_by: string | null
}

// In-memory mock data stores
const mockParties: Party[] = [
    { id: 1, name: 'พรรคพัฒนาโรงเรียน', number: 1, created_at: new Date().toISOString() },
    { id: 2, name: 'พรรคเพื่อนักเรียน', number: 2, created_at: new Date().toISOString() },
    { id: 3, name: 'พรรคอนาคตใหม่', number: 3, created_at: new Date().toISOString() },
]

const mockTokens: Token[] = []
const mockVotes: Vote[] = []
// Global store check for persistence during HMR
const globalStore = (global as any)
if (!globalStore.mockPrintLogs) globalStore.mockPrintLogs = []
const mockPrintLogs: PrintLog[] = globalStore.mockPrintLogs
const mockStudents: Student[] = [
    { id: 1, student_id: '12345', prefix: 'นาย', first_name: 'ทดสอบ', last_name: 'ระบบ', level: 'ม.4', room: '1', vote_status: null, voted_at: null },
]

let tokenIdCounter = 1
let voteIdCounter = 1
const printLogIdCounter = 1

// Check if we're running locally (D1 not available)
function isLocalDev(): boolean {
    try {
        getRequestContext()
        return false
    } catch {
        return true
    }
}

// Get D1 database from request context (only works on Cloudflare)
function getDB() {
    if (isLocalDev()) {
        return null // Return null for local dev
    }
    const { env } = getRequestContext()
    return env.DB
}

// Students
export async function getStudentByStudentId(studentId: string): Promise<Student | null> {
    const db = getDB()
    if (!db) {
        return mockStudents.find(s => s.student_id === studentId) || null
    }
    const result = await db.prepare('SELECT * FROM students WHERE student_id = ?').bind(studentId).first<Student>()
    return result || null
}

export async function markStudentAsVoted(studentId: string): Promise<void> {
    const db = getDB()
    if (!db) {
        const student = mockStudents.find(s => s.student_id === studentId)
        if (student) {
            student.vote_status = 'voted'
            student.voted_at = new Date().toISOString()
        }
        return
    }
    await db.prepare('UPDATE students SET vote_status = "voted", voted_at = datetime("now") WHERE student_id = ?').bind(studentId).run()
}

export async function getStudentVoteStats(): Promise<{ total: number; voted: number }> {
    const db = getDB()
    if (!db) {
        const total = mockStudents.length
        const voted = mockStudents.filter(s => s.vote_status === 'voted').length
        return { total, voted }
    }
    const total = await db.prepare('SELECT COUNT(*) as count FROM students').first<{ count: number }>()
    const voted = await db.prepare('SELECT COUNT(*) as count FROM students WHERE vote_status = "voted"').first<{ count: number }>()
    return { total: total?.count || 0, voted: voted?.count || 0 }
}

export async function getStudentStatsByLevel(): Promise<{ level: string; total: number; voted: number }[]> {
    const db = getDB()
    if (!db) {
        // Mock data
        const levels = [...new Set(mockStudents.map(s => s.level))]
        return levels.map(level => ({
            level,
            total: mockStudents.filter(s => s.level === level).length,
            voted: mockStudents.filter(s => s.level === level && s.vote_status === 'voted').length
        })).sort((a, b) => a.level.localeCompare(b.level))
    }
    const { results } = await db.prepare(`
        SELECT level, COUNT(*) as total, SUM(CASE WHEN vote_status = 'voted' THEN 1 ELSE 0 END) as voted
        FROM students
        GROUP BY level
        ORDER BY level
    `).all<{ level: string; total: number; voted: number }>()
    return results || []
}

// Parties
export async function getAllParties(): Promise<Party[]> {
    const db = getDB()
    if (!db) {
        return [...mockParties].sort((a, b) => a.number - b.number)
    }
    const { results } = await db.prepare('SELECT * FROM parties ORDER BY number ASC').all<Party>()
    return results || []
}

export async function createParty(name: string, number: number): Promise<Party> {
    const db = getDB()
    if (!db) {
        const newParty: Party = {
            id: mockParties.length + 1,
            name,
            number,
            created_at: new Date().toISOString()
        }
        mockParties.push(newParty)
        return newParty
    }
    const result = await db.prepare('INSERT INTO parties (name, number) VALUES (?, ?) RETURNING *').bind(name, number).first<Party>()
    if (!result) throw new Error('Failed to create party')
    return result
}

export async function updateParty(id: number, name: string, number: number): Promise<void> {
    const db = getDB()
    if (!db) {
        const party = mockParties.find(p => p.id === id)
        if (party) {
            party.name = name
            party.number = number
        }
        return
    }
    await db.prepare('UPDATE parties SET name = ?, number = ? WHERE id = ?').bind(name, number, id).run()
}

export async function deleteParty(id: number): Promise<void> {
    const db = getDB()
    if (!db) {
        const index = mockParties.findIndex(p => p.id === id)
        if (index !== -1) mockParties.splice(index, 1)
        return
    }
    await db.prepare('DELETE FROM parties WHERE id = ?').bind(id).run()
}

// Tokens
export async function getTokenByCode(code: string): Promise<Token | null> {
    const db = getDB()
    if (!db) {
        return mockTokens.find(t => t.code === code) || null
    }
    const result = await db.prepare('SELECT * FROM tokens WHERE code = ?').bind(code).first<Token>()
    return result || null
}

export async function createTokens(tokens: { code: string; print_batch_id: string }[]): Promise<void> {
    const db = getDB()
    if (!db) {
        for (const t of tokens) {
            mockTokens.push({
                id: tokenIdCounter++,
                code: t.code,
                status: 'inactive',
                station_level: null,
                print_batch_id: t.print_batch_id,
                student_id: null,
                activated_by: null,
                activated_at: null,
                voting_started_at: null,
                used_at: null,
                created_at: new Date().toISOString()
            })
        }
        return
    }
    const stmt = db.prepare('INSERT INTO tokens (code, print_batch_id) VALUES (?, ?)')
    const batch = tokens.map(t => stmt.bind(t.code, t.print_batch_id))
    await db.batch(batch)
}

export async function activateToken(code: string): Promise<boolean> {
    const db = getDB()
    if (!db) {
        const token = mockTokens.find(t => t.code === code && t.status === 'inactive')
        if (token) {
            token.status = 'activated'
            token.activated_at = new Date().toISOString()
            return true
        }
        return false
    }
    const result = await db.prepare(
        'UPDATE tokens SET status = "activated", activated_at = datetime("now") WHERE code = ? AND status = "inactive"'
    ).bind(code).run()
    return result.meta.changes > 0
}

export async function useToken(code: string): Promise<boolean> {
    const db = getDB()
    if (!db) {
        const token = mockTokens.find(t => t.code === code && t.status === 'activated')
        if (token) {
            token.status = 'used'
            token.used_at = new Date().toISOString()
            return true
        }
        return false
    }
    const result = await db.prepare(
        'UPDATE tokens SET status = "used", used_at = datetime("now") WHERE code = ? AND status = "activated"'
    ).bind(code).run()
    return result.meta.changes > 0
}

export async function getTokenStats(): Promise<{ inactive: number; activated: number; used: number }> {
    const db = getDB()
    if (!db) {
        return {
            inactive: mockTokens.filter(t => t.status === 'inactive').length,
            activated: mockTokens.filter(t => t.status === 'activated').length,
            used: mockTokens.filter(t => t.status === 'used').length,
        }
    }
    const inactive = await db.prepare('SELECT COUNT(*) as count FROM tokens WHERE status = "inactive"').first<{ count: number }>()
    const activated = await db.prepare('SELECT COUNT(*) as count FROM tokens WHERE status = "activated"').first<{ count: number }>()
    const used = await db.prepare('SELECT COUNT(*) as count FROM tokens WHERE status = "used"').first<{ count: number }>()
    return {
        inactive: inactive?.count || 0,
        activated: activated?.count || 0,
        used: used?.count || 0,
    }
}

// Votes
export async function createVote(partyId: number | null, stationLevel: string, tokenId: number, isAbstain: boolean): Promise<void> {
    const db = getDB()
    if (!db) {
        mockVotes.push({
            id: voteIdCounter++,
            party_id: partyId,
            station_level: stationLevel,
            token_id: tokenId,
            is_abstain: isAbstain ? 1 : 0,
            created_at: new Date().toISOString()
        })
        return
    }
    await db.prepare(
        'INSERT INTO votes (party_id, station_level, token_id, is_abstain) VALUES (?, ?, ?, ?)'
    ).bind(partyId, stationLevel, tokenId, isAbstain ? 1 : 0).run()
}

export async function getVoteResults(): Promise<{
    partyVotes: { id: number; name: string; number: number; vote_count: number }[];
    abstainCount: number;
    totalVotes: number;
}> {
    const db = getDB()
    if (!db) {
        const partyVotes = mockParties.map(p => ({
            id: p.id,
            name: p.name,
            number: p.number,
            vote_count: mockVotes.filter(v => v.party_id === p.id && !v.is_abstain).length
        }))
        const abstainCount = mockVotes.filter(v => v.is_abstain === 1).length
        const totalVotes = mockVotes.length
        return { partyVotes, abstainCount, totalVotes }
    }

    const { results: partyVotes } = await db.prepare(`
        SELECT p.id, p.name, p.number, COALESCE(COUNT(v.id), 0) as vote_count
        FROM parties p
        LEFT JOIN votes v ON p.id = v.party_id AND v.is_abstain = 0
        GROUP BY p.id
        ORDER BY p.number ASC
    `).all<{ id: number; name: string; number: number; vote_count: number }>()

    const abstain = await db.prepare('SELECT COUNT(*) as count FROM votes WHERE is_abstain = 1').first<{ count: number }>()
    const total = await db.prepare('SELECT COUNT(*) as count FROM votes').first<{ count: number }>()

    return {
        partyVotes: partyVotes || [],
        abstainCount: abstain?.count || 0,
        totalVotes: total?.count || 0,
    }
}

export async function getPartyVotesByLevel(): Promise<{ station_level: string; party_id: number; party_name: string; party_number: number; vote_count: number }[]> {
    const db = getDB()
    if (!db) {
        // Mock data
        const stats: any[] = []
        const levels = [...new Set(mockVotes.map(v => v.station_level))]
        levels.forEach(level => {
            mockParties.forEach(party => {
                const count = mockVotes.filter(v => v.station_level === level && v.party_id === party.id && !v.is_abstain).length
                if (count > 0) {
                    stats.push({
                        station_level: level,
                        party_id: party.id,
                        party_name: party.name,
                        party_number: party.number,
                        vote_count: count
                    })
                }
            })
            // Abstain
            const abstain = mockVotes.filter(v => v.station_level === level && v.is_abstain).length
            if (abstain > 0) {
                stats.push({
                    station_level: level,
                    party_id: 0, // 0 for abstain
                    party_name: 'ไม่ประสงค์ลงคะแนน',
                    party_number: 0,
                    vote_count: abstain
                })
            }
        })
        return stats
    }

    // Party votes
    const { results } = await db.prepare(`
        SELECT v.station_level, p.id as party_id, p.name as party_name, p.number as party_number, COUNT(*) as vote_count
        FROM votes v
        JOIN parties p ON v.party_id = p.id
        WHERE v.is_abstain = 0
        GROUP BY v.station_level, p.id
        ORDER BY v.station_level, p.number
    `).all<{ station_level: string; party_id: number; party_name: string; party_number: number; vote_count: number }>()

    // Abstain votes
    const { results: abstainResults } = await db.prepare(`
        SELECT station_level, 0 as party_id, 'ไม่ประสงค์ลงคะแนน' as party_name, 0 as party_number, COUNT(*) as vote_count
        FROM votes
        WHERE is_abstain = 1
        GROUP BY station_level
    `).all<{ station_level: string; party_id: number; party_name: string; party_number: number; vote_count: number }>()

    return [...(results || []), ...(abstainResults || [])]
}

// Print Logs
export async function createPrintLog(batchId: string, tokenCount: number, stationLevel?: string, printedBy?: string): Promise<void> {
    const db = getDB()
    if (!db) {
        mockPrintLogs.push({
            id: Date.now(),
            batch_id: batchId,
            token_count: tokenCount,
            station_level: stationLevel || null,
            printed_at: new Date().toISOString(),
            printed_by: printedBy || null
        })
        return
    }
    await db.prepare(
        'INSERT INTO print_logs (batch_id, token_count, station_level, printed_by) VALUES (?, ?, ?, ?)'
    ).bind(batchId, tokenCount, stationLevel || null, printedBy || null).run()
}

export async function getPrintLogs(): Promise<PrintLog[]> {
    const db = getDB()
    if (!db) {
        return [...mockPrintLogs].sort((a, b) => new Date(b.printed_at).getTime() - new Date(a.printed_at).getTime())
    }
    const { results } = await db.prepare('SELECT * FROM print_logs ORDER BY printed_at DESC').all<PrintLog>()
    return results || []
}

export async function getTokensByBatchId(batchId: string): Promise<Token[]> {
    const db = getDB()
    if (!db) {
        return mockTokens.filter(t => t.print_batch_id === batchId)
    }
    const { results } = await db.prepare('SELECT * FROM tokens WHERE print_batch_id = ?').bind(batchId).all<Token>()
    return results || []
}

export async function deleteTokensByBatchId(batchId: string): Promise<{ deleted: number; hasUsedTokens: boolean }> {
    const db = getDB()
    if (!db) {
        const usedCount = mockTokens.filter(t => t.print_batch_id === batchId && t.status === 'used').length
        if (usedCount > 0) {
            return { deleted: 0, hasUsedTokens: true }
        }
        const beforeCount = mockTokens.length
        const filteredTokens = mockTokens.filter(t => t.print_batch_id !== batchId)
        mockTokens.length = 0
        mockTokens.push(...filteredTokens)

        const filteredLogs = mockPrintLogs.filter(l => l.batch_id !== batchId)
        mockPrintLogs.length = 0
        mockPrintLogs.push(...filteredLogs)

        return { deleted: beforeCount - mockTokens.length, hasUsedTokens: false }
    }

    // Check if any tokens in this batch have been used
    const usedCheck = await db.prepare(
        'SELECT COUNT(*) as count FROM tokens WHERE print_batch_id = ? AND status = "used"'
    ).bind(batchId).first<{ count: number }>()

    if (usedCheck && usedCheck.count > 0) {
        return { deleted: 0, hasUsedTokens: true }
    }

    // Delete tokens
    const result = await db.prepare('DELETE FROM tokens WHERE print_batch_id = ?').bind(batchId).run()

    // Delete print log
    await db.prepare('DELETE FROM print_logs WHERE batch_id = ?').bind(batchId).run()

    return { deleted: result.meta.changes, hasUsedTokens: false }
}

// Party count for stats
export async function getPartyCount(): Promise<number> {
    const db = getDB()
    if (!db) {
        return mockParties.length
    }
    const result = await db.prepare('SELECT COUNT(*) as count FROM parties').first<{ count: number }>()
    return result?.count || 0
}

// =====================================================
// USER AUTHENTICATION
// =====================================================

// Mock users for local dev - includes default admin
// Use DEV_MODE: prefix to indicate plaintext password for dev testing
const mockUsers: User[] = [
    {
        id: 1,
        username: 'admin',
        password_hash: 'DEV_MODE:scrsl12345678', // Special dev mode - plaintext check
        role: 'admin',
        display_name: 'ผู้ดูแลระบบ',
        is_active: 1,
        created_at: new Date().toISOString(),
        last_login: null
    }
]
const mockSessions: Session[] = []
const mockActivityLogs: ActivityLog[] = []
const mockSystemSettings: Record<string, string> = {
    election_status: 'open', // Default to open for dev testing
    election_open_time: '',
    election_close_time: ''
}

export async function createUser(username: string, passwordHash: string, role: 'admin' | 'committee', displayName?: string): Promise<User | null> {
    const db = getDB()
    if (!db) {
        const newUser: User = {
            id: mockUsers.length + 1,
            username,
            password_hash: passwordHash,
            role,
            display_name: displayName || null,
            is_active: 1,
            created_at: new Date().toISOString(),
            last_login: null
        }
        mockUsers.push(newUser)
        return newUser
    }
    const result = await db.prepare(
        'INSERT INTO users (username, password_hash, role, display_name) VALUES (?, ?, ?, ?) RETURNING *'
    ).bind(username, passwordHash, role, displayName || null).first<User>()
    return result || null
}

export async function getUserByUsername(username: string): Promise<User | null> {
    const db = getDB()
    if (!db) {
        return mockUsers.find(u => u.username === username) || null
    }
    const result = await db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').bind(username).first<User>()
    return result || null
}

export async function getUserById(id: number): Promise<User | null> {
    const db = getDB()
    if (!db) {
        return mockUsers.find(u => u.id === id) || null
    }
    const result = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<User>()
    return result || null
}

export async function getAllUsers(): Promise<User[]> {
    const db = getDB()
    if (!db) {
        return [...mockUsers]
    }
    const { results } = await db.prepare('SELECT * FROM users ORDER BY created_at DESC').all<User>()
    return results || []
}

export async function updateUser(id: number, updates: Partial<Pick<User, 'display_name' | 'role' | 'is_active'>>): Promise<boolean> {
    const db = getDB()
    if (!db) {
        const user = mockUsers.find(u => u.id === id)
        if (user) {
            if (updates.display_name !== undefined) user.display_name = updates.display_name
            if (updates.role !== undefined) user.role = updates.role
            if (updates.is_active !== undefined) user.is_active = updates.is_active
            return true
        }
        return false
    }
    const sets: string[] = []
    const values: any[] = []
    if (updates.display_name !== undefined) { sets.push('display_name = ?'); values.push(updates.display_name) }
    if (updates.role !== undefined) { sets.push('role = ?'); values.push(updates.role) }
    if (updates.is_active !== undefined) { sets.push('is_active = ?'); values.push(updates.is_active) }
    if (sets.length === 0) return false
    values.push(id)
    const result = await db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).bind(...values).run()
    return result.meta.changes > 0
}

export async function updateUserPassword(id: number, newPasswordHash: string): Promise<boolean> {
    const db = getDB()
    if (!db) {
        const user = mockUsers.find(u => u.id === id)
        if (user) {
            user.password_hash = newPasswordHash
            return true
        }
        return false
    }
    const result = await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(newPasswordHash, id).run()
    return result.meta.changes > 0
}

export async function deleteUser(id: number): Promise<boolean> {
    const db = getDB()
    if (!db) {
        const idx = mockUsers.findIndex(u => u.id === id)
        if (idx !== -1) {
            mockUsers.splice(idx, 1)
            return true
        }
        return false
    }
    const result = await db.prepare('DELETE FROM users WHERE id = ?').bind(id).run()
    return result.meta.changes > 0
}

// =====================================================
// SESSION MANAGEMENT
// =====================================================

export async function createSession(userId: number, sessionToken: string): Promise<Session | null> {
    const db = getDB()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    if (!db) {
        const session: Session = {
            id: mockSessions.length + 1,
            user_id: userId,
            session_token: sessionToken,
            created_at: new Date().toISOString(),
            expires_at: expiresAt
        }
        mockSessions.push(session)
        // Update last login
        const user = mockUsers.find(u => u.id === userId)
        if (user) user.last_login = new Date().toISOString()
        return session
    }
    await db.prepare('UPDATE users SET last_login = datetime("now") WHERE id = ?').bind(userId).run()
    const result = await db.prepare(
        'INSERT INTO sessions (user_id, session_token, expires_at) VALUES (?, ?, ?) RETURNING *'
    ).bind(userId, sessionToken, expiresAt).first<Session>()
    return result || null
}

export async function getSessionByToken(sessionToken: string): Promise<{ session: Session; user: User } | null> {
    const db = getDB()
    if (!db) {
        const session = mockSessions.find(s => s.session_token === sessionToken)
        if (!session) return null
        const user = mockUsers.find(u => u.id === session.user_id)
        if (!user) return null
        return { session, user }
    }
    const session = await db.prepare('SELECT * FROM sessions WHERE session_token = ?').bind(sessionToken).first<Session>()
    if (!session) return null
    const user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(session.user_id).first<User>()
    if (!user) return null
    return { session, user }
}

export async function deleteSession(sessionToken: string): Promise<boolean> {
    const db = getDB()
    if (!db) {
        const idx = mockSessions.findIndex(s => s.session_token === sessionToken)
        if (idx !== -1) {
            mockSessions.splice(idx, 1)
            return true
        }
        return false
    }
    const result = await db.prepare('DELETE FROM sessions WHERE session_token = ?').bind(sessionToken).run()
    return result.meta.changes > 0
}

export async function deleteUserSessions(userId: number): Promise<void> {
    const db = getDB()
    if (!db) {
        const toRemove = mockSessions.filter(s => s.user_id === userId)
        toRemove.forEach(s => {
            const idx = mockSessions.indexOf(s)
            if (idx !== -1) mockSessions.splice(idx, 1)
        })
        return
    }
    await db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId).run()
}

// =====================================================
// ACTIVITY LOGGING
// =====================================================

export async function logActivity(action: string, details?: object, userId?: number, username?: string, ip?: string, userAgent?: string): Promise<void> {
    const db = getDB()
    const detailsJson = details ? JSON.stringify(details) : null
    if (!db) {
        mockActivityLogs.push({
            id: mockActivityLogs.length + 1,
            action,
            details: detailsJson,
            user_id: userId || null,
            user_username: username || null,
            ip_address: ip || null,
            user_agent: userAgent || null,
            created_at: new Date().toISOString()
        })
        return
    }
    await db.prepare(
        'INSERT INTO activity_logs (action, details, user_id, user_username, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(action, detailsJson, userId || null, username || null, ip || null, userAgent || null).run()
}

export async function getActivityLogs(limit: number = 100): Promise<ActivityLog[]> {
    const db = getDB()
    if (!db) {
        return [...mockActivityLogs].reverse().slice(0, limit)
    }
    const { results } = await db.prepare('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT ?').bind(limit).all<ActivityLog>()
    return results || []
}

// =====================================================
// SYSTEM SETTINGS
// =====================================================

export async function getSystemSetting(key: string): Promise<string | null> {
    const db = getDB()
    if (!db) {
        return mockSystemSettings[key] || null
    }
    const result = await db.prepare('SELECT value FROM system_settings WHERE key = ?').bind(key).first<{ value: string }>()
    return result?.value || null
}

export async function setSystemSetting(key: string, value: string): Promise<void> {
    const db = getDB()
    if (!db) {
        mockSystemSettings[key] = value
        return
    }
    await db.prepare(
        'INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES (?, ?, datetime("now"))'
    ).bind(key, value).run()
}

export async function getElectionStatus(): Promise<{ status: string; openTime: string | null; closeTime: string | null }> {
    const status = await getSystemSetting('election_status') || 'closed'
    const openTime = await getSystemSetting('election_open_time')
    const closeTime = await getSystemSetting('election_close_time')
    return { status, openTime, closeTime }
}

// =====================================================
// ENHANCED TOKEN FUNCTIONS
// =====================================================

export async function activateTokenForStudent(code: string, studentId: string, activatedBy: number): Promise<boolean> {
    const db = getDB()
    if (!db) {
        const token = mockTokens.find(t => t.code === code && t.status === 'inactive')
        if (token) {
            token.status = 'activated'
            token.student_id = studentId
            token.activated_by = activatedBy
            token.activated_at = new Date().toISOString()
            return true
        }
        return false
    }
    const result = await db.prepare(
        'UPDATE tokens SET status = "activated", student_id = ?, activated_by = ?, activated_at = datetime("now") WHERE code = ? AND status = "inactive"'
    ).bind(studentId, activatedBy, code).run()
    return result.meta.changes > 0
}

export async function setTokenVoting(code: string): Promise<boolean> {
    const db = getDB()
    if (!db) {
        const token = mockTokens.find(t => t.code === code && t.status === 'activated')
        if (token) {
            token.status = 'voting'
            token.voting_started_at = new Date().toISOString()
            return true
        }
        return false
    }
    const result = await db.prepare(
        'UPDATE tokens SET status = "voting", voting_started_at = datetime("now") WHERE code = ? AND status = "activated"'
    ).bind(code).run()
    return result.meta.changes > 0
}

export async function completeVoteAndClearLink(code: string): Promise<{ success: boolean; studentId: string | null }> {
    const db = getDB()
    if (!db) {
        const token = mockTokens.find(t => t.code === code && t.status === 'voting')
        if (token) {
            const studentId = token.student_id
            token.status = 'used'
            token.student_id = null // Clear for anonymity
            token.used_at = new Date().toISOString()
            return { success: true, studentId }
        }
        return { success: false, studentId: null }
    }
    // Get student_id before clearing
    const token = await db.prepare('SELECT student_id FROM tokens WHERE code = ? AND status = "voting"').bind(code).first<{ student_id: string }>()
    if (!token) return { success: false, studentId: null }

    const result = await db.prepare(
        'UPDATE tokens SET status = "used", student_id = NULL, used_at = datetime("now") WHERE code = ? AND status = "voting"'
    ).bind(code).run()
    return { success: result.meta.changes > 0, studentId: token.student_id }
}

export async function markStudentAsAbsent(studentId: string): Promise<void> {
    const db = getDB()
    if (!db) {
        const student = mockStudents.find(s => s.student_id === studentId)
        if (student) {
            student.vote_status = 'absent'
            student.voted_at = new Date().toISOString()
        }
        return
    }
    await db.prepare('UPDATE students SET vote_status = "absent", voted_at = datetime("now") WHERE student_id = ?').bind(studentId).run()
}

export async function expireOldTokens(timeoutMinutes: number = 30): Promise<{ expiredCount: number; absentStudents: string[] }> {
    const db = getDB()
    const cutoffTime = new Date(Date.now() - timeoutMinutes * 60 * 1000).toISOString()

    if (!db) {
        const expiredTokens = mockTokens.filter(t =>
            t.status === 'activated' &&
            t.activated_at &&
            new Date(t.activated_at) < new Date(cutoffTime)
        )
        const absentStudents: string[] = []
        for (const token of expiredTokens) {
            token.status = 'expired'
            if (token.student_id) {
                absentStudents.push(token.student_id)
                await markStudentAsAbsent(token.student_id)
                token.student_id = null
            }
        }
        return { expiredCount: expiredTokens.length, absentStudents }
    }

    // Get tokens to expire with their student_ids
    const { results: tokensToExpire } = await db.prepare(
        'SELECT id, student_id FROM tokens WHERE status = "activated" AND activated_at < ?'
    ).bind(cutoffTime).all<{ id: number; student_id: string | null }>()

    if (!tokensToExpire || tokensToExpire.length === 0) {
        return { expiredCount: 0, absentStudents: [] }
    }

    const absentStudents: string[] = []
    for (const token of tokensToExpire) {
        if (token.student_id) {
            absentStudents.push(token.student_id)
            await markStudentAsAbsent(token.student_id)
        }
    }

    // Expire tokens and clear student_id
    await db.prepare(
        'UPDATE tokens SET status = "expired", student_id = NULL WHERE status = "activated" AND activated_at < ?'
    ).bind(cutoffTime).run()

    return { expiredCount: tokensToExpire.length, absentStudents }
}

// =====================================================
// RATE LIMITING
// =====================================================

export async function checkRateLimit(identifier: string, action: string, maxAttempts: number = 5, windowMinutes: number = 15): Promise<{ allowed: boolean; remainingAttempts: number }> {
    const db = getDB()
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString()

    if (!db) {
        // Simple in-memory rate limiting for dev
        return { allowed: true, remainingAttempts: maxAttempts }
    }

    // Clean old entries
    await db.prepare('DELETE FROM rate_limits WHERE window_start < ?').bind(windowStart).run()

    // Check current attempts
    const current = await db.prepare(
        'SELECT attempt_count FROM rate_limits WHERE identifier = ? AND action = ? AND window_start > ?'
    ).bind(identifier, action, windowStart).first<{ attempt_count: number }>()

    const currentCount = current?.attempt_count || 0

    if (currentCount >= maxAttempts) {
        return { allowed: false, remainingAttempts: 0 }
    }

    // Increment or insert
    if (current) {
        await db.prepare(
            'UPDATE rate_limits SET attempt_count = attempt_count + 1 WHERE identifier = ? AND action = ?'
        ).bind(identifier, action).run()
    } else {
        await db.prepare(
            'INSERT INTO rate_limits (identifier, action, attempt_count) VALUES (?, ?, 1)'
        ).bind(identifier, action).run()
    }

    return { allowed: true, remainingAttempts: maxAttempts - currentCount - 1 }
}

export async function resetRateLimit(identifier: string, action: string): Promise<void> {
    const db = getDB()
    if (!db) return
    await db.prepare('DELETE FROM rate_limits WHERE identifier = ? AND action = ?').bind(identifier, action).run()
}
