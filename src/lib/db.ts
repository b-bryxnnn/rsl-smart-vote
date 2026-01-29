import { Pool } from 'pg';
import { hashPassword, verifyPassword, generateSessionToken } from './hash';

// Types
export interface User {
    id: number
    username: string
    password_hash: string
    role: 'admin' | 'committee'
    display_name: string | null
    is_active: boolean
    created_at: Date
    last_login: Date | null
}

export interface Session {
    id: number
    user_id: number
    session_token: string
    created_at: Date
    expires_at: Date | null
}

export interface ActivityLog {
    id: number
    action: string
    details: string | null
    user_id: number | null
    user_username: string | null
    ip_address: string | null
    user_agent: string | null
    created_at: Date
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
    voted_at: Date | null
}

export interface Party {
    id: number
    name: string
    number: number
    created_at: Date
}

export interface Token {
    id: number
    code: string
    status: 'inactive' | 'activated' | 'voting' | 'used' | 'expired'
    station_level: string | null
    print_batch_id: string | null
    student_id: string | null
    activated_by: number | null
    activated_at: Date | null
    voting_started_at: Date | null
    used_at: Date | null
    created_at: Date
}

export interface Vote {
    id: number
    party_id: number | null
    station_level: string
    token_id: number
    is_abstain: number
    created_at: Date
}

export interface PrintLog {
    id: number
    batch_id: string
    token_count: number
    station_level: string | null
    printed_at: Date
    printed_by: string | null
}

// Database Connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Helper to get Thailand Time as ISO string (for compatibility if needed, though Postgres handles dates better)
function getThailandISOString(): string {
    return new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' });
}

function getThailandDate(): Date {
    return new Date();
}

// Students
export async function getStudentByStudentId(studentId: string): Promise<Student | null> {
    const { rows } = await pool.query<Student>(
        'SELECT * FROM students WHERE student_id = $1',
        [studentId]
    );
    return rows[0] || null;
}

export async function markStudentAsVoted(studentId: string): Promise<void> {
    await pool.query(
        'UPDATE students SET vote_status = \'voted\', voted_at = CURRENT_TIMESTAMP WHERE student_id = $1',
        [studentId]
    );
}

export async function getStudentVoteStats(): Promise<{ total: number; voted: number }> {
    const totalRes = await pool.query<{ count: string }>('SELECT COUNT(*) as count FROM students');
    const votedRes = await pool.query<{ count: string }>('SELECT COUNT(*) as count FROM students WHERE vote_status = \'voted\'');

    return {
        total: parseInt(totalRes.rows[0]?.count || '0'),
        voted: parseInt(votedRes.rows[0]?.count || '0')
    };
}

export async function getStudentStatsByLevel(): Promise<{ level: string; total: number; voted: number }[]> {
    const { rows } = await pool.query<{ level: string; total: string; voted: string }>(`
        SELECT level, COUNT(*) as total, SUM(CASE WHEN vote_status = 'voted' THEN 1 ELSE 0 END) as voted
        FROM students
        GROUP BY level
        ORDER BY level
    `);

    return rows.map(row => ({
        level: row.level,
        total: parseInt(row.total),
        voted: parseInt(row.voted)
    }));
}

// Parties
export async function getAllParties(): Promise<Party[]> {
    const { rows } = await pool.query<Party>('SELECT * FROM parties ORDER BY number ASC');
    return rows;
}

export async function createParty(name: string, number: number): Promise<Party> {
    const { rows } = await pool.query<Party>(
        'INSERT INTO parties (name, number) VALUES ($1, $2) RETURNING *',
        [name, number]
    );
    return rows[0];
}

export async function updateParty(id: number, name: string, number: number): Promise<void> {
    await pool.query(
        'UPDATE parties SET name = $1, number = $2 WHERE id = $3',
        [name, number, id]
    );
}

export async function deleteParty(id: number): Promise<void> {
    await pool.query('DELETE FROM parties WHERE id = $1', [id]);
}

// Tokens
export async function getTokenByCode(code: string): Promise<Token | null> {
    const { rows } = await pool.query<Token>('SELECT * FROM tokens WHERE code = $1', [code]);
    return rows[0] || null;
}

export async function createTokens(tokens: { code: string; print_batch_id: string }[]): Promise<void> {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const queryText = 'INSERT INTO tokens (code, print_batch_id) VALUES ($1, $2)';
        for (const t of tokens) {
            await client.query(queryText, [t.code, t.print_batch_id]);
        }
        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

export async function activateToken(code: string): Promise<boolean> {
    const { rowCount } = await pool.query(
        'UPDATE tokens SET status = \'activated\', activated_at = CURRENT_TIMESTAMP WHERE code = $1 AND status = \'inactive\'',
        [code]
    );
    return (rowCount || 0) > 0;
}

export async function useToken(code: string): Promise<boolean> {
    const { rowCount } = await pool.query(
        'UPDATE tokens SET status = \'used\', used_at = CURRENT_TIMESTAMP WHERE code = $1 AND status = \'activated\'',
        [code]
    );
    return (rowCount || 0) > 0;
}

export async function getTokenStats(): Promise<{ inactive: number; activated: number; used: number }> {
    const inactiveRes = await pool.query<{ count: string }>('SELECT COUNT(*) as count FROM tokens WHERE status = \'inactive\'');
    const activatedRes = await pool.query<{ count: string }>('SELECT COUNT(*) as count FROM tokens WHERE status = \'activated\'');
    const usedRes = await pool.query<{ count: string }>('SELECT COUNT(*) as count FROM tokens WHERE status = \'used\'');

    return {
        inactive: parseInt(inactiveRes.rows[0]?.count || '0'),
        activated: parseInt(activatedRes.rows[0]?.count || '0'),
        used: parseInt(usedRes.rows[0]?.count || '0'),
    };
}

// Votes
export async function createVote(partyId: number | null, stationLevel: string, tokenId: number, isAbstain: boolean): Promise<void> {
    await pool.query(
        'INSERT INTO votes (party_id, station_level, token_id, is_abstain) VALUES ($1, $2, $3, $4)',
        [partyId, stationLevel, tokenId, isAbstain ? 1 : 0]
    );
}

export async function getVoteResults(): Promise<{
    partyVotes: { id: number; name: string; number: number; vote_count: number }[];
    abstainCount: number;
    totalVotes: number;
}> {
    const { rows: partyVotes } = await pool.query<{ id: number; name: string; number: number; vote_count: string }>(`
        SELECT p.id, p.name, p.number, COALESCE(COUNT(v.id), 0) as vote_count
        FROM parties p
        LEFT JOIN votes v ON p.id = v.party_id AND v.is_abstain = 0
        GROUP BY p.id
        ORDER BY p.number ASC
    `);

    const abstainRes = await pool.query<{ count: string }>('SELECT COUNT(*) as count FROM votes WHERE is_abstain = 1');
    const totalRes = await pool.query<{ count: string }>('SELECT COUNT(*) as count FROM votes');

    return {
        partyVotes: partyVotes.map(p => ({ ...p, vote_count: parseInt(p.vote_count) })),
        abstainCount: parseInt(abstainRes.rows[0]?.count || '0'),
        totalVotes: parseInt(totalRes.rows[0]?.count || '0'),
    };
}

export async function getPartyVotesByLevel(): Promise<{ station_level: string; party_id: number; party_name: string; party_number: number; vote_count: number }[]> {
    // Party votes
    const { rows: partyRows } = await pool.query<{ station_level: string; party_id: number; party_name: string; party_number: number; vote_count: string }>(`
        SELECT v.station_level, p.id as party_id, p.name as party_name, p.number as party_number, COUNT(*) as vote_count
        FROM votes v
        JOIN parties p ON v.party_id = p.id
        WHERE v.is_abstain = 0
        GROUP BY v.station_level, p.id, p.name, p.number
        ORDER BY v.station_level, p.number
    `);

    // Abstain votes
    const { rows: abstainRows } = await pool.query<{ station_level: string; party_id: number; party_name: string; party_number: number; vote_count: string }>(`
        SELECT station_level, 0 as party_id, 'ไม่ประสงค์ลงคะแนน' as party_name, 0 as party_number, COUNT(*) as vote_count
        FROM votes
        WHERE is_abstain = 1
        GROUP BY station_level
    `);

    return [
        ...partyRows.map(r => ({ ...r, vote_count: parseInt(r.vote_count) })),
        ...abstainRows.map(r => ({ ...r, vote_count: parseInt(r.vote_count) }))
    ];
}

// Print Logs
export async function createPrintLog(batchId: string, tokenCount: number, stationLevel?: string, printedBy?: string): Promise<void> {
    await pool.query(
        'INSERT INTO print_logs (batch_id, token_count, station_level, printed_by) VALUES ($1, $2, $3, $4)',
        [batchId, tokenCount, stationLevel || null, printedBy || null]
    );
}

export async function getPrintLogs(): Promise<PrintLog[]> {
    const { rows } = await pool.query<PrintLog>('SELECT * FROM print_logs ORDER BY printed_at DESC');
    return rows;
}

export async function getTokensByBatchId(batchId: string): Promise<Token[]> {
    const { rows } = await pool.query<Token>('SELECT * FROM tokens WHERE print_batch_id = $1', [batchId]);
    return rows;
}

export async function deleteTokensByBatchId(batchId: string): Promise<{ deleted: number; hasUsedTokens: boolean }> {
    // Check if any tokens in this batch have been used
    const { rows } = await pool.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM tokens WHERE print_batch_id = $1 AND status = \'used\'',
        [batchId]
    );

    if (parseInt(rows[0]?.count || '0') > 0) {
        return { deleted: 0, hasUsedTokens: true };
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Delete tokens
        const tokenRes = await client.query('DELETE FROM tokens WHERE print_batch_id = $1', [batchId]);

        // Delete print log
        await client.query('DELETE FROM print_logs WHERE batch_id = $1', [batchId]);

        await client.query('COMMIT');
        return { deleted: tokenRes.rowCount || 0, hasUsedTokens: false };
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

// Party count for stats
export async function getPartyCount(): Promise<number> {
    const { rows } = await pool.query<{ count: string }>('SELECT COUNT(*) as count FROM parties');
    return parseInt(rows[0]?.count || '0');
}

// =====================================================
// USER AUTHENTICATION
// =====================================================

export async function createUser(username: string, passwordHash: string, role: 'admin' | 'committee', displayName?: string): Promise<User | null> {
    const { rows } = await pool.query<User>(
        'INSERT INTO users (username, password_hash, role, display_name) VALUES ($1, $2, $3, $4) RETURNING *',
        [username, passwordHash, role, displayName || null]
    );
    return rows[0] || null;
}

export async function getUserByUsername(username: string): Promise<User | null> {
    const { rows } = await pool.query<User>('SELECT * FROM users WHERE username = $1 AND is_active = TRUE', [username]);
    return rows[0] || null;
}

export async function getUserById(id: number): Promise<User | null> {
    const { rows } = await pool.query<User>('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0] || null;
}

export async function getAllUsers(): Promise<User[]> {
    const { rows } = await pool.query<User>('SELECT * FROM users ORDER BY created_at DESC');
    return rows;
}

export async function updateUser(id: number, updates: Partial<Pick<User, 'display_name' | 'role' | 'is_active'>>): Promise<boolean> {
    const sets: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.display_name !== undefined) { sets.push(`display_name = $${idx++}`); values.push(updates.display_name); }
    if (updates.role !== undefined) { sets.push(`role = $${idx++}`); values.push(updates.role); }
    if (updates.is_active !== undefined) { sets.push(`is_active = $${idx++}`); values.push(updates.is_active); }

    if (sets.length === 0) return false;
    values.push(id);

    const { rowCount } = await pool.query(
        `UPDATE users SET ${sets.join(', ')} WHERE id = $${idx}`,
        values
    );
    return (rowCount || 0) > 0;
}

export async function updateUserPassword(id: number, newPasswordHash: string): Promise<boolean> {
    const { rowCount } = await pool.query(
        'UPDATE users SET password_hash = $1 WHERE id = $2',
        [newPasswordHash, id]
    );
    return (rowCount || 0) > 0;
}

export async function deleteUser(id: number): Promise<boolean> {
    const { rowCount } = await pool.query('DELETE FROM users WHERE id = $1', [id]);
    return (rowCount || 0) > 0;
}

// =====================================================
// SESSION MANAGEMENT
// =====================================================

export async function createSession(userId: number, sessionToken: string): Promise<Session | null> {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update last login
    await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [userId]);

    const { rows } = await pool.query<Session>(
        'INSERT INTO sessions (user_id, session_token, expires_at) VALUES ($1, $2, $3) RETURNING *',
        [userId, sessionToken, expiresAt]
    );
    return rows[0] || null;
}

export async function getSessionByToken(sessionToken: string): Promise<{ session: Session; user: User } | null> {
    const { rows: sessionRows } = await pool.query<Session>('SELECT * FROM sessions WHERE session_token = $1', [sessionToken]);
    const session = sessionRows[0];

    if (!session) return null;

    const { rows: userRows } = await pool.query<User>('SELECT * FROM users WHERE id = $1', [session.user_id]);
    const user = userRows[0];

    if (!user) return null;
    return { session, user };
}

export async function deleteSession(sessionToken: string): Promise<boolean> {
    const { rowCount } = await pool.query('DELETE FROM sessions WHERE session_token = $1', [sessionToken]);
    return (rowCount || 0) > 0;
}

export async function deleteUserSessions(userId: number): Promise<void> {
    await pool.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
}

// =====================================================
// ACTIVITY LOGGING
// =====================================================

export async function logActivity(action: string, details?: object, userId?: number, username?: string, ip?: string, userAgent?: string): Promise<void> {
    const detailsJson = details ? JSON.stringify(details) : null;
    await pool.query(
        'INSERT INTO activity_logs (action, details, user_id, user_username, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6)',
        [action, detailsJson, userId || null, username || null, ip || null, userAgent || null]
    );
}

export async function getActivityLogs(limit: number = 100): Promise<ActivityLog[]> {
    const { rows } = await pool.query<ActivityLog>('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT $1', [limit]);
    return rows;
}

// =====================================================
// SYSTEM SETTINGS
// =====================================================

export async function getSystemSetting(key: string): Promise<string | null> {
    const { rows } = await pool.query<{ value: string }>('SELECT value FROM system_settings WHERE key = $1', [key]);
    return rows[0]?.value || null;
}

export async function setSystemSetting(key: string, value: string): Promise<void> {
    await pool.query(
        'INSERT INTO system_settings (key, value, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP',
        [key, value]
    );
}

export async function getElectionStatus(): Promise<{ status: string; openTime: string | null; closeTime: string | null }> {
    const status = await getSystemSetting('election_status') || 'closed';
    const openTime = await getSystemSetting('election_open_time');
    const closeTime = await getSystemSetting('election_close_time');
    return { status, openTime, closeTime };
}

// =====================================================
// ENHANCED TOKEN FUNCTIONS
// =====================================================

export async function activateTokenForStudent(code: string, studentId: string, activatedBy: number, stationLevel: string): Promise<boolean> {
    const { rowCount } = await pool.query(
        'UPDATE tokens SET status = \'activated\', student_id = $1, activated_by = $2, activated_at = CURRENT_TIMESTAMP, station_level = $3 WHERE code = $4 AND status = \'inactive\'',
        [studentId, activatedBy, stationLevel, code]
    );
    return (rowCount || 0) > 0;
}

export async function setTokenVoting(code: string): Promise<boolean> {
    const { rowCount } = await pool.query(
        'UPDATE tokens SET status = \'voting\', voting_started_at = CURRENT_TIMESTAMP WHERE code = $1 AND status = \'activated\'',
        [code]
    );
    return (rowCount || 0) > 0;
}

export async function completeVoteAndClearLink(code: string): Promise<{ success: boolean; studentId: string | null }> {
    // Get student_id before clearing
    const { rows } = await pool.query<{ student_id: string }>('SELECT student_id FROM tokens WHERE code = $1 AND status = \'voting\'', [code]);
    const token = rows[0];

    if (!token) return { success: false, studentId: null };

    const { rowCount } = await pool.query(
        'UPDATE tokens SET status = \'used\', student_id = NULL, used_at = CURRENT_TIMESTAMP WHERE code = $1 AND status = \'voting\'',
        [code]
    );
    return { success: (rowCount || 0) > 0, studentId: token.student_id };
}

export async function markStudentAsAbsent(studentId: string): Promise<void> {
    await pool.query('UPDATE students SET vote_status = \'absent\', voted_at = CURRENT_TIMESTAMP WHERE student_id = $1', [studentId]);
}

export async function expireOldTokens(timeoutMinutes: number = 30): Promise<{ expiredCount: number; absentStudents: string[] }> {
    // Calculate cutoff time using SQL
    // But since we need to return absentStudents, we first select them

    const { rows: tokensToExpire } = await pool.query<{ id: number; student_id: string | null }>(
        'SELECT id, student_id FROM tokens WHERE status = \'activated\' AND activated_at < NOW() - ($1 || \' minutes\')::INTERVAL',
        [timeoutMinutes]
    );

    if (!tokensToExpire || tokensToExpire.length === 0) {
        return { expiredCount: 0, absentStudents: [] };
    }

    const absentStudents: string[] = [];
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        for (const token of tokensToExpire) {
            if (token.student_id) {
                absentStudents.push(token.student_id);
                // Mark student as absent
                await client.query('UPDATE students SET vote_status = \'absent\', voted_at = CURRENT_TIMESTAMP WHERE student_id = $1', [token.student_id]);
            }
        }

        // Expire tokens
        await client.query(
            'UPDATE tokens SET status = \'expired\', student_id = NULL WHERE status = \'activated\' AND activated_at < NOW() - ($1 || \' minutes\')::INTERVAL',
            [timeoutMinutes]
        );

        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }

    return { expiredCount: tokensToExpire.length, absentStudents };
}

// =====================================================
// RATE LIMITING
// =====================================================

export async function checkRateLimit(identifier: string, action: string, maxAttempts: number = 5, windowMinutes: number = 15): Promise<{ allowed: boolean; remainingAttempts: number }> {
    // Clean old entries
    await pool.query('DELETE FROM rate_limits WHERE window_start < NOW() - ($1 || \' minutes\')::INTERVAL', [windowMinutes]);

    // Check current attempts
    // Using window_start > NOW - windowMinutes
    const { rows } = await pool.query<{ attempt_count: number }>(
        'SELECT attempt_count FROM rate_limits WHERE identifier = $1 AND action = $2 AND window_start > NOW() - ($3 || \' minutes\')::INTERVAL',
        [identifier, action, windowMinutes]
    );

    const currentCount = rows[0]?.attempt_count || 0;

    if (currentCount >= maxAttempts) {
        return { allowed: false, remainingAttempts: 0 };
    }

    // Increment or insert
    if (rows[0]) {
        await pool.query(
            'UPDATE rate_limits SET attempt_count = attempt_count + 1 WHERE identifier = $1 AND action = $2',
            [identifier, action]
        );
    } else {
        await pool.query(
            'INSERT INTO rate_limits (identifier, action, attempt_count) VALUES ($1, $2, 1)',
            [identifier, action]
        );
    }

    return { allowed: true, remainingAttempts: maxAttempts - currentCount - 1 };
}

// =====================================================
// BULK & ADMIN OPERATIONS
// =====================================================

export async function importStudent(student: { student_id: string; prefix: string; first_name: string; last_name: string; level: string; room: string }): Promise<void> {
    // Postgres UPSERT
    await pool.query(
        'INSERT INTO students (student_id, prefix, first_name, last_name, level, room) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (student_id) DO UPDATE SET prefix = EXCLUDED.prefix, first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, level = EXCLUDED.level, room = EXCLUDED.room',
        [student.student_id, student.prefix, student.first_name, student.last_name, student.level, student.room]
    );
}

export async function importStudentsBatch(students: { student_id: string; prefix: string; first_name: string; last_name: string; level: string; room: string }[]): Promise<void> {
    if (students.length === 0) return;
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const queryText = 'INSERT INTO students (student_id, prefix, first_name, last_name, level, room) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (student_id) DO NOTHING';
        
        for (const s of students) {
           await client.query(queryText, [s.student_id, s.prefix, s.first_name, s.last_name, s.level, s.room]);
        }
        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

export async function clearPrintLogs(): Promise<void> {
    await pool.query('DELETE FROM print_logs');
}

export async function getDebugElectionSettings(): Promise<{ key: string; value: string; updated_at: Date }[]> {
    const { rows } = await pool.query<{ key: string; value: string; updated_at: Date }>(
        "SELECT key, value, updated_at FROM system_settings WHERE key LIKE 'election%'"
    );
    return rows;
}

export async function resetDatabase(mode: 'all' | 'votes' | 'students'): Promise<void> {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        if (mode === 'all') {
            await client.query('DELETE FROM votes');
            await client.query('DELETE FROM tokens');
            await client.query('DELETE FROM print_logs');
            await client.query('DELETE FROM students');
        } else if (mode === 'votes') {
            await client.query('DELETE FROM votes');
            await client.query('DELETE FROM tokens');
            await client.query('DELETE FROM print_logs');
            await client.query('UPDATE students SET vote_status = NULL, voted_at = NULL');
        } else if (mode === 'students') {
            await client.query('DELETE FROM students');
        }
        
        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}
