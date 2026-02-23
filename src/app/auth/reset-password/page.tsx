'use client'

import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Supabase will set the session from the URL hash automatically
    // when the user arrives from the reset email link
    const supabase = createClient()
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsReady(true)
      }
    })
    // Also check if we already have a session (page reload case)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setIsReady(true)
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    const supabase = createClient()
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setSuccess(true)
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
            </div>
            <h1 className="mb-1 text-xl font-bold text-foreground">Set New Password</h1>
            <p className="mb-6 text-sm text-muted-foreground">
              Enter your new password below.
            </p>

            {success ? (
              <div className="flex flex-col gap-4">
                <div className="rounded-xl bg-tropical/10 px-4 py-3">
                  <p className="text-sm font-medium text-foreground">Password updated</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Your password has been successfully reset. You can now sign in with your new password.
                  </p>
                </div>
                <Link
                  href="/auth/login"
                  className="mt-2 block rounded-xl bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-all hover:brightness-110"
                >
                  Sign In
                </Link>
              </div>
            ) : !isReady ? (
              <div className="flex flex-col gap-4">
                <div className="rounded-xl bg-gold/10 px-4 py-3">
                  <p className="text-sm font-medium text-foreground">Verifying your link...</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    If this takes more than a few seconds, the reset link may have expired. Please request a new one.
                  </p>
                </div>
                <Link
                  href="/auth/forgot-password"
                  className="text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Request a new reset link
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="password" className="text-sm font-medium text-foreground">
                    New Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    placeholder="Minimum 8 characters"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    placeholder="Re-enter your password"
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
                  {isLoading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
