// Hash utilities for password handling
// Uses Web Crypto API (works in Edge Runtime)

export async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    return hashHex
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    // Support DEV_MODE for local development mock users
    if (hash.startsWith('DEV_MODE:')) {
        const expectedPassword = hash.substring(9) // Remove 'DEV_MODE:' prefix
        return password === expectedPassword
    }
    const passwordHash = await hashPassword(password)
    return passwordHash === hash
}

export function generateSessionToken(): string {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('')
}

export function generateTokenCode(): string {
    // Format: RSL-XXXX-XXXXXXXX (12 chars total, not counting dashes)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Exclude confusing chars: I, O, 0, 1
    const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    const part2 = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    return `RSL-${part1}-${part2}`
}
