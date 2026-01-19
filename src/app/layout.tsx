import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'RSL Smart Vote - ระบบเลือกตั้งสภานักเรียน',
  description: 'ระบบเลือกตั้งสภานักเรียนออนไลน์ ปลอดภัย โปร่งใส',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
        {children}
      </body>
    </html>
  )
}
