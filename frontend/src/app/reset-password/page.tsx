"use client"

import { Loader2, CheckCircle } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { FormEvent, useState, Suspense } from "react"
import LandingBackground from "@/components/landing/landing-background"
import { Logo } from "@/components/shared/logo"
import { api } from "@/lib/api"

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token") || ""
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError("")

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }
    if (password !== confirm) {
      setError("Passwords do not match")
      return
    }
    if (!token) {
      setError("Invalid or missing reset token")
      return
    }

    setLoading(true)
    try {
      await api.resetPassword(token, password)
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || "Failed to reset password")
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Invalid or missing reset token. Please request a new link.
        </div>
        <Link
          href="/forgot-password"
          className="inline-block text-sm font-semibold text-[#41808B] transition-colors hover:text-[#F46036]"
        >
          Request a new reset link
        </Link>
      </div>
    )
  }

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-6 w-6 text-green-600" />
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Your password has been reset successfully.
        </div>
        <Link
          href="/login"
          className="inline-block text-sm font-semibold text-[#41808B] transition-colors hover:text-[#F46036]"
        >
          Sign In with your new password
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-slate-600">
          New Password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min 6 characters"
          className="glass-input"
        />
      </div>
      <div>
        <label htmlFor="confirm" className="mb-1.5 block text-xs font-medium text-slate-600">
          Confirm Password
        </label>
        <input
          id="confirm"
          type="password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repeat your password"
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
        {loading ? "Resetting…" : "Reset Password"}
      </button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#E5ECE9] p-4 text-slate-900">
      <LandingBackground />

      <main className="glass-card-glow relative z-10 w-full max-w-md p-8">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4">
            <Logo className="h-8" variant="compact" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Set new password
          </h1>
          <p className="mt-1.5 text-sm font-medium text-slate-600">
            Choose a strong password for your account.
          </p>
        </div>

        <Suspense fallback={<div className="animate-pulse bg-slate-100 rounded-xl h-40" />}>
          <ResetPasswordForm />
        </Suspense>

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
