import QRCode from 'qrcode'

// Generate random alphanumeric token code
export function generateTokenCode(length: number = 8): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Removed confusing chars: I, O, 0, 1
    let result = ''
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
}

// Generate batch of unique token codes
export function generateTokenCodes(count: number, length: number = 8): string[] {
    const codes = new Set<string>()
    while (codes.size < count) {
        codes.add(generateTokenCode(length))
    }
    return Array.from(codes)
}

// Generate batch ID
export function generateBatchId(): string {
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
    const timeStr = now.toISOString().slice(11, 19).replace(/:/g, '')
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    return `BATCH-${dateStr}-${timeStr}-${random}`
}

// Generate QR code as data URL
export async function generateQRCodeDataURL(data: string): Promise<string> {
    try {
        return await QRCode.toDataURL(data, {
            width: 200,
            margin: 2,
            color: {
                dark: '#1e3a8a',
                light: '#ffffff',
            },
            errorCorrectionLevel: 'H',
        })
    } catch (error) {
        console.error('Error generating QR code:', error)
        throw error
    }
}

// Generate QR code as SVG string
export async function generateQRCodeSVG(data: string): Promise<string> {
    try {
        return await QRCode.toString(data, {
            type: 'svg',
            width: 200,
            margin: 2,
            color: {
                dark: '#1e3a8a',
                light: '#ffffff',
            },
            errorCorrectionLevel: 'H',
        })
    } catch (error) {
        console.error('Error generating QR code:', error)
        throw error
    }
}

// Format date for Thai locale
export function formatThaiDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

// Format date for short Thai locale
export function formatThaiDateShort(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('th-TH', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

// Validate token code format
export function isValidTokenCode(code: string): boolean {
    // 8 alphanumeric characters (excluding confusing chars)
    const validChars = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/
    return validChars.test(code.toUpperCase())
}

// Sanitize student ID input
export function sanitizeStudentId(input: string): string {
    return input.replace(/[^0-9]/g, '').slice(0, 10)
}

// Level options
export const LEVEL_OPTIONS = [
    { value: 'ม.1', label: 'มัธยมศึกษาปีที่ 1' },
    { value: 'ม.2', label: 'มัธยมศึกษาปีที่ 2' },
    { value: 'ม.3', label: 'มัธยมศึกษาปีที่ 3' },
    { value: 'ม.4', label: 'มัธยมศึกษาปีที่ 4' },
    { value: 'ม.5', label: 'มัธยมศึกษาปีที่ 5' },
    { value: 'ม.6', label: 'มัธยมศึกษาปีที่ 6' },
]

// Station level from sessionStorage (clears when tab is closed)
export function getStationLevel(): string | null {
    if (typeof window === 'undefined') return null
    return sessionStorage.getItem('station_level')
}

export function setStationLevel(level: string): void {
    if (typeof window === 'undefined') return
    sessionStorage.setItem('station_level', level)
}

export function clearStationLevel(): void {
    if (typeof window === 'undefined') return
    sessionStorage.removeItem('station_level')
}
