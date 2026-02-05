import './globals.css'
import { Noto_Sans_Thai } from 'next/font/google'

const notoThai = Noto_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-noto-thai',
})

export const metadata = {
  title: 'Madre Tools',
  description: 'Business management tools for Madre Cafe & Restaurant',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th">
      <body className={`${notoThai.variable} font-sans antialiased`}>{children}</body>
    </html>
  )
}
