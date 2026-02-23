'use client'

import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      if (error) throw error
      setSent(true)
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
            <h1 className="mb-1 text-xl font-bold text-foreground">Reset Password</h1>
            <p className="mb-6 text-sm text-muted-foreground">
              {"Enter your email and we'll send you a link to reset your password."}
            </p>

            {sent ? (
              <div className="flex flex-col gap-4">
                <div className="rounded-xl bg-tropical/10 px-4 py-3">
                  <p className="text-sm font-medium text-foreground">Check your email</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {"We've sent a password reset link to"} <strong>{email}</strong>. Click the link in the email to set a new password.
                  </p>
                </div>
                <Link
                  href="/auth/login"
                  className="mt-2 block rounded-xl bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-all hover:brightness-110"
                >
                  Back to Sign In
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
                  {isLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
                <Link
                  href="/auth/login"
                  className="text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Back to Sign In
                </Link>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
