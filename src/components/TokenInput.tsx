'use client'

import { useState, useRef, KeyboardEvent, ClipboardEvent } from 'react'

interface TokenInputProps {
    value: string
    onChange: (value: string) => void
    onSubmit?: () => void
    disabled?: boolean
}

export function TokenInput({ value, onChange, onSubmit, disabled }: TokenInputProps) {
    const [part1, setPart1] = useState('')
    const [part2, setPart2] = useState('')

    const input1Ref = useRef<HTMLInputElement>(null)
    const input2Ref = useRef<HTMLInputElement>(null)

    const validChars = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]*$/

    const updateValue = (newPart1: string, newPart2: string) => {
        const cleanPart1 = newPart1.toUpperCase().replace(/[^ABCDEFGHJKLMNPQRSTUVWXYZ23456789]/g, '')
        const cleanPart2 = newPart2.toUpperCase().replace(/[^ABCDEFGHJKLMNPQRSTUVWXYZ23456789]/g, '')

        setPart1(cleanPart1.slice(0, 4))
        setPart2(cleanPart2.slice(0, 8))

        const fullCode = cleanPart1 || cleanPart2
            ? `RSL-${cleanPart1.slice(0, 4)}-${cleanPart2.slice(0, 8)}`
            : ''
        onChange(fullCode)
    }

    const handlePart1Change = (newValue: string) => {
        const cleaned = newValue.toUpperCase().replace(/[^ABCDEFGHJKLMNPQRSTUVWXYZ23456789]/g, '').slice(0, 4)
        updateValue(cleaned, part2)

        // Auto-focus to part2 when part1 is complete
        if (cleaned.length === 4) {
            input2Ref.current?.focus()
        }
    }

    const handlePart2Change = (newValue: string) => {
        const cleaned = newValue.toUpperCase().replace(/[^ABCDEFGHJKLMNPQRSTUVWXYZ23456789]/g, '').slice(0, 8)
        updateValue(part1, cleaned)
    }

    const handlePart1KeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && part1.length === 4 && part2.length === 8) {
            onSubmit?.()
        }
        if (e.key === '-' || e.key === ' ') {
            e.preventDefault()
            if (part1.length > 0) {
                input2Ref.current?.focus()
            }
        }
    }

    const handlePart2KeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && part1.length === 4 && part2.length === 8) {
            onSubmit?.()
        }
        if (e.key === 'Backspace' && part2.length === 0) {
            input1Ref.current?.focus()
        }
    }

    const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault()
        const pasted = e.clipboardData.getData('text').toUpperCase().trim()

        // Try to parse RSL-XXXX-XXXXXXXX format
        const match = pasted.match(/^(?:RSL-)?([ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4})-?([ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8})$/)
        if (match) {
            updateValue(match[1], match[2])
            input2Ref.current?.focus()
            return
        }

        // Otherwise just clean and split
        const cleaned = pasted.replace(/[^ABCDEFGHJKLMNPQRSTUVWXYZ23456789]/g, '')
        if (cleaned.length >= 12) {
            updateValue(cleaned.slice(0, 4), cleaned.slice(4, 12))
            input2Ref.current?.focus()
        } else if (cleaned.length >= 4) {
            updateValue(cleaned.slice(0, 4), cleaned.slice(4))
            input2Ref.current?.focus()
        } else {
            updateValue(cleaned, '')
        }
    }

    return (
        <div className="flex items-center justify-center gap-2 font-mono text-xl">
            <span className="font-bold text-gray-600">RSL</span>
            <span className="text-gray-400">-</span>
            <input
                ref={input1Ref}
                type="text"
                value={part1}
                onChange={(e) => handlePart1Change(e.target.value)}
                onKeyDown={handlePart1KeyDown}
                onPaste={handlePaste}
                maxLength={4}
                disabled={disabled}
                placeholder="XXXX"
                className="w-24 text-center py-3 px-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 focus:ring-2 focus:ring-gray-900 outline-none uppercase tracking-widest disabled:bg-gray-100"
            />
            <span className="text-gray-400">-</span>
            <input
                ref={input2Ref}
                type="text"
                value={part2}
                onChange={(e) => handlePart2Change(e.target.value)}
                onKeyDown={handlePart2KeyDown}
                onPaste={handlePaste}
                maxLength={8}
                disabled={disabled}
                placeholder="XXXXXXXX"
                className="w-40 text-center py-3 px-2 border-2 border-gray-300 rounded-lg focus:border-gray-900 focus:ring-2 focus:ring-gray-900 outline-none uppercase tracking-widest disabled:bg-gray-100"
            />
        </div>
    )
}

export default TokenInput
