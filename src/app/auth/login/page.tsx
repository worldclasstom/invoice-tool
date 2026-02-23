'use client'

import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      router.push('/dashboard')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-primary p-6">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-tropical/20" />
        <div className="absolute -right-10 top-1/4 h-48 w-48 rounded-full bg-gold/15" />
        <div className="absolute -bottom-16 left-1/4 h-56 w-56 rounded-full bg-accent/15" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="flex flex-col items-center gap-6">
          <div className="w-full rounded-2xl bg-card p-6 shadow-xl shadow-foreground/10">
            <div className="mb-4 flex flex-col items-center gap-2">
              <div className="relative h-[100px] w-[100px]">
                <Image
                  src="/assets/logos/AW_LOGO_MADRE-01.png"
                  alt="Madre Cafe and Restaurant Logo"
                  fill
                  priority
                  sizes="100px"
                  className="object-contain drop-shadow-lg"
                />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Restaurant Management Suite</p>
            </div>
            <h1 className="mb-1 text-xl font-bold text-foreground">Welcome back</h1>
            <p className="mb-6 text-sm text-muted-foreground">
              Sign in to Madre Tools
            </p>
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@madre.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium text-foreground">
                    Password
                  </label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Forgot password?
                  </Link>
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
              </div>
              {error && (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-all hover:brightness-110 disabled:opacity-50"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  )
}
