"use client"

import { Loader2, Lock, Sparkles } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { FormEvent, useState } from "react"
import LandingBackground from "@/components/landing/landing-background"
import { Logo } from "@/components/shared/logo"
import { api } from "@/lib/api"
import { setAuth } from "@/lib/auth"

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
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

    setLoading(true)
    try {
      await api.registerUser(
        { name, email, password, company_name: companyName },
        { public: true }
      )
      const res = await api.login({ email, password })
      setAuth(res.access_token, res.user)
      router.push("/dashboard")
    } catch (err: any) {
      setError(err.message || "Failed to create workspace")
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
            Create your <span className="gradient-text">LeadPilot</span> workspace
          </h1>
          <p className="mt-1.5 text-sm font-medium text-slate-600">
            Start your free trial. No credit card required.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label htmlFor="fullName" className="mb-1.5 block text-xs font-medium text-slate-600">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              className="glass-input"
            />
          </div>
          <div>
            <label htmlFor="companyName" className="mb-1.5 block text-xs font-medium text-slate-600">
              Company Name
            </label>
            <input
              id="companyName"
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Acme Inc."
              className="glass-input"
            />
          </div>
          <div>
            <label htmlFor="workEmail" className="mb-1.5 block text-xs font-medium text-slate-600">
              Work Email
            </label>
            <input
              id="workEmail"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="glass-input"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-slate-600">
              Password
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
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {loading ? "Creating workspace…" : "Create Workspace"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs text-slate-500">Free trial · No credit card</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
          <Lock className="h-3.5 w-3.5" />
          Your workspace is private and secure
        </div>

        <p className="mt-5 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-[#41808B] transition-colors hover:text-[#F46036]">
            Sign In
          </Link>
        </p>
      </main>
    </div>
  )
}
