import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'LyreBird - Master Languages with AI',
  description: 'Learn languages interactively with AI-powered conversations, 3D models, and gamified learning experiences.',
  keywords: ['language learning', 'AI chat', 'interactive learning', 'flashcards', 'quizzes'],
  authors: [{ name: 'LyreBird Team' }],
  icons: {
    icon: '/logo.ico',
    shortcut: '/logo.ico',
    apple: '/logo.ico',
  },
  openGraph: {
    title: 'LyreBird - Master Languages with AI',
    description: 'Learn languages interactively with AI-powered conversations, 3D models, and gamified learning experiences.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
} 