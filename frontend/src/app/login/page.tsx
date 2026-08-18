"use client"

import { Loader2, Lock } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { FormEvent, useState } from "react"
import LandingBackground from "@/components/landing/landing-background"
import { Logo } from "@/components/shared/logo"
import { api } from "@/lib/api"
import { setAuth } from "@/lib/auth"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await api.login({ email, password })
      setAuth(res.access_token, res.user)
      router.push("/dashboard")
    } catch (err: any) {
      setError(err.message || "Login failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#E5ECE9] p-4 text-slate-900">
      <LandingBackground />

      <main className="glass-card-glow relative z-10 w-full max-w-md p-8">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 items-center justify-center rounded-2xl bg-white px-3 shadow-sm">
            <Logo className="h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back to <span className="gradient-text">Loggix</span>
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Sign in to your workspace to continue
          </p>
        </div>

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
          <div>
            <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-slate-600">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
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
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-500">
          <Lock className="h-3.5 w-3.5" />
          Secure workspace access
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          New to Loggix?{" "}
          <Link href="/#signup" className="font-semibold text-[#41808B] transition-colors hover:text-[#F46036]">
            Create your workspace
          </Link>
        </p>
      </main>
    </div>
  )
}
