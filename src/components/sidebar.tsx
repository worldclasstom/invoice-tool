'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Receipt,
  Wallet,
  LogOut,
  Menu,
  X,
  TrendingUp,
} from 'lucide-react'
import { useState } from 'react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, color: 'text-foreground' },
  { name: 'Analytics', href: '/analytics', icon: TrendingUp, color: 'text-pink-500' },
  { name: 'Sales Report', href: '/sales', icon: BarChart3, color: 'text-amber-500' },
  { name: 'Invoice', href: '/invoices', icon: FileText, color: 'text-sky-500' },
  { name: 'Receipts', href: '/receipts', icon: Receipt, color: 'text-rose-500' },
  { name: 'Fixed Costs', href: '/fixed-costs', icon: Wallet, color: 'text-violet-500' },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const navContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 pb-4 pt-6">
        <Image
          src="/assets/logos/AW_LOGO_MADRE-01.png"
          alt="Madre Logo"
          width={36}
          height={50}
          priority
        />
        <div>
          <h1 className="text-lg font-bold text-foreground tracking-tight">Madre Tools</h1>
          <p className="text-[11px] font-medium text-muted-foreground tracking-wide uppercase">Restaurant Suite</p>
        </div>
      </div>

      <div className="mx-4 mb-4 h-px bg-border" />

      {/* Navigation */}
      <nav className="flex-1 px-3">
        <ul className="flex flex-col gap-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                      : 'text-foreground/70 hover:bg-secondary hover:text-foreground'
                  )}
                >
                  <item.icon className={cn('h-[18px] w-[18px] shrink-0', isActive ? 'text-primary-foreground' : item.color)} />
                  {item.name}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="mx-4 mb-2 h-px bg-border" />
      <div className="px-3 pb-5 pt-2">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          Sign Out
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-md lg:hidden">
        <nav className="flex items-center justify-around px-1 py-1.5">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-medium transition-all',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground'
                )}
              >
                <item.icon className={cn('h-5 w-5', isActive ? 'text-primary' : item.color)} />
                <span>{item.name.split(' ')[0]}</span>
              </Link>
            )
          })}
          <button
            onClick={() => setMobileOpen(true)}
            className="flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-medium text-muted-foreground"
          >
            <Menu className="h-5 w-5" />
            <span>Menu</span>
          </button>
        </nav>
      </div>

      {/* Mobile top header */}
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-md lg:hidden">
        <Image
          src="/assets/logos/AW_LOGO_MADRE-01.png"
          alt="Madre Logo"
          width={24}
          height={33}
          priority
        />
        <span className="text-sm font-bold text-foreground tracking-tight">Madre Tools</span>
      </div>

      {/* Mobile full overlay menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-foreground/30 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-72 bg-card shadow-2xl">
            <div className="absolute right-3 top-4">
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-xl p-2 text-muted-foreground hover:bg-secondary"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {navContent}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-60 lg:flex-col lg:border-r lg:border-border lg:bg-card">
        {navContent}
      </aside>
    </>
  )
}
