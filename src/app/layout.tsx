import type { Metadata } from 'next'
import './globals.css'
import PwaClient from './components/PwaClient'

export const metadata: Metadata = {
  title: 'Sistem Distribusi PO Bordir',
  description: 'Aplikasi internal untuk menyalurkan Purchase Order kepada vendor bordir',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
        <PwaClient />
        {children}
      </body>
    </html>
  )
}
