import './globals.css'
import { Noto_Sans_Thai } from 'next/font/google'

const notoThai = Noto_Sans_Thai({ subsets: ['thai'], weight: ['400', '700'] })

export const metadata = {
  title: 'Madre Cafe & Restaurant Invoice Generator',
  description: 'Madre Cafe & Restaurant Invoice Generator',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={notoThai.className}>{children}</body>
    </html>
  )
}
