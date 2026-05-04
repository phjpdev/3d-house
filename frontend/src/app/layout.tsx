import type { Metadata } from 'next'
import { Cormorant_Garamond, DM_Sans } from 'next/font/google'
import { ThreeConsoleNoiseFilter } from '@/components/system/ThreeConsoleNoiseFilter'
import './globals.css'

const display = Cormorant_Garamond({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
})

const body = DM_Sans({
  variable: '--font-body',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
})

export const metadata: Metadata = {
  title: 'VividHome — Photoreal interior design',
  description:
    'Build 3D furniture with Meshy, edit a sunlit home, and walk it in first person.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${display.variable} ${body.variable} min-h-screen font-sans antialiased`}
      >
        <ThreeConsoleNoiseFilter />
        {children}
      </body>
    </html>
  )
}
