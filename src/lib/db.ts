// D1 Database wrapper for Cloudflare
// This file provides database operations using D1

import { getRequestContext } from '@cloudflare/next-on-pages'

// Types
export interface Student {
    id: number
    student_id: string
    prefix: string
    first_name: string
    last_name: string
    level: string
    room: string | null
    has_voted: number
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
    status: 'inactive' | 'activated' | 'used'
    station_level: string | null
    print_batch_id: string | null
    activated_at: string | null
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

// Get D1 database from request context
function getDB() {
    const { env } = getRequestContext()
    return env.DB
}

// Students
export async function getStudentByStudentId(studentId: string): Promise<Student | null> {
    const db = getDB()
    const result = await db.prepare('SELECT * FROM students WHERE student_id = ?').bind(studentId).first<Student>()
    return result || null
}

export async function markStudentAsVoted(studentId: string): Promise<void> {
    const db = getDB()
    await db.prepare('UPDATE students SET has_voted = 1, voted_at = datetime("now") WHERE student_id = ?').bind(studentId).run()
}

export async function getStudentVoteStats(): Promise<{ total: number; voted: number }> {
    const db = getDB()
    const total = await db.prepare('SELECT COUNT(*) as count FROM students').first<{ count: number }>()
    const voted = await db.prepare('SELECT COUNT(*) as count FROM students WHERE has_voted = 1').first<{ count: number }>()
    return { total: total?.count || 0, voted: voted?.count || 0 }
}

// Parties
export async function getAllParties(): Promise<Party[]> {
    const db = getDB()
    const { results } = await db.prepare('SELECT * FROM parties ORDER BY number ASC').all<Party>()
    return results || []
}

export async function createParty(name: string, number: number): Promise<Party> {
    const db = getDB()
    const result = await db.prepare('INSERT INTO parties (name, number) VALUES (?, ?) RETURNING *').bind(name, number).first<Party>()
    if (!result) throw new Error('Failed to create party')
    return result
}

export async function updateParty(id: number, name: string, number: number): Promise<void> {
    const db = getDB()
    await db.prepare('UPDATE parties SET name = ?, number = ? WHERE id = ?').bind(name, number, id).run()
}

export async function deleteParty(id: number): Promise<void> {
    const db = getDB()
    await db.prepare('DELETE FROM parties WHERE id = ?').bind(id).run()
}

// Tokens
export async function getTokenByCode(code: string): Promise<Token | null> {
    const db = getDB()
    const result = await db.prepare('SELECT * FROM tokens WHERE code = ?').bind(code).first<Token>()
    return result || null
}

export async function createTokens(tokens: { code: string; print_batch_id: string }[]): Promise<void> {
    const db = getDB()
    const stmt = db.prepare('INSERT INTO tokens (code, print_batch_id) VALUES (?, ?)')
    const batch = tokens.map(t => stmt.bind(t.code, t.print_batch_id))
    await db.batch(batch)
}

export async function activateToken(code: string): Promise<boolean> {
    const db = getDB()
    const result = await db.prepare(
        'UPDATE tokens SET status = "activated", activated_at = datetime("now") WHERE code = ? AND status = "inactive"'
    ).bind(code).run()
    return result.meta.changes > 0
}

export async function useToken(code: string): Promise<boolean> {
    const db = getDB()
    const result = await db.prepare(
        'UPDATE tokens SET status = "used", used_at = datetime("now") WHERE code = ? AND status = "activated"'
    ).bind(code).run()
    return result.meta.changes > 0
}

export async function getTokenStats(): Promise<{ inactive: number; activated: number; used: number }> {
    const db = getDB()
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

// Print Logs
export async function createPrintLog(batchId: string, tokenCount: number, stationLevel?: string, printedBy?: string): Promise<void> {
    const db = getDB()
    await db.prepare(
        'INSERT INTO print_logs (batch_id, token_count, station_level, printed_by) VALUES (?, ?, ?, ?)'
    ).bind(batchId, tokenCount, stationLevel || null, printedBy || null).run()
}

export async function getPrintLogs(): Promise<PrintLog[]> {
    const db = getDB()
    const { results } = await db.prepare('SELECT * FROM print_logs ORDER BY printed_at DESC').all<PrintLog>()
    return results || []
}

export async function getTokensByBatchId(batchId: string): Promise<Token[]> {
    const db = getDB()
    const { results } = await db.prepare('SELECT * FROM tokens WHERE print_batch_id = ?').bind(batchId).all<Token>()
    return results || []
}

export async function deleteTokensByBatchId(batchId: string): Promise<{ deleted: number; hasUsedTokens: boolean }> {
    const db = getDB()

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
    const result = await db.prepare('SELECT COUNT(*) as count FROM parties').first<{ count: number }>()
    return result?.count || 0
}
