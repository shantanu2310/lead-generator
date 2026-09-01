"use client"

import { Loader2, Mail } from "lucide-react"
import Link from "next/link"
import { FormEvent, useState } from "react"
import LandingBackground from "@/components/landing/landing-background"
import { Logo } from "@/components/shared/logo"
import { api } from "@/lib/api"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await api.forgotPassword(email)
      setSent(true)
    } catch (err: any) {
      setError(err.message || "Failed to send reset email")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#E5ECE9] p-4 text-slate-900">
      <LandingBackground />

      <main className="glass-card-glow relative z-10 w-full max-w-md p-8">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4">
            <Logo className="h-8" variant="compact" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Reset your password
          </h1>
          <p className="mt-1.5 text-sm font-medium text-slate-600">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <Mail className="h-6 w-6 text-green-600" />
            </div>
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              If an account exists with <strong>{email}</strong>, you&apos;ll receive a password reset link shortly.
            </div>
            <Link
              href="/login"
              className="inline-block text-sm font-semibold text-[#41808B] transition-colors hover:text-[#F46036]"
            >
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-slate-600">
                Work Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="glass-input"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-gradient flex w-full items-center justify-center gap-2 px-5 py-3.5 text-sm">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Sending link…" : "Send Reset Link"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-slate-500">
          Remember your password?{" "}
          <Link href="/login" className="font-semibold text-[#41808B] transition-colors hover:text-[#F46036]">
            Sign In
          </Link>
        </p>
      </main>
    </div>
  )
}
