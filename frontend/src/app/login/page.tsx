"use client"

import { Target, Loader2, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { FormEvent, useEffect, useState } from "react"
import { api } from "@/lib/api"
import { setAuth } from "@/lib/auth"

export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState<"signin" | "signup">("signin")
  const [bootstrap, setBootstrap] = useState<boolean | null>(null)
  const [checkFailed, setCheckFailed] = useState(false)
  const [checking, setChecking] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function checkBootstrap() {
    setCheckFailed(false)
    setChecking(true)
    for (let i = 1; i <= 4; i++) {
      try {
        const r = await api.bootstrapRequired()
        setBootstrap(r.bootstrap_required)
        return
      } catch {
        if (i < 4) {
          await new Promise((res) => setTimeout(res, i * 4000))
        }
      }
    }
    setCheckFailed(true)
  }

  useEffect(() => {
    checkBootstrap()
  }, [])

  async function finishAuth(accessToken: string, user: any) {
    setAuth(accessToken, user)
    router.push("/dashboard")
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await api.registerUser({ name, email, password })
      const res = await api.login({ email, password })
      await finishAuth(res.access_token, res.user)
    } catch (err: any) {
      setError(err.message || "Failed to create account")
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await api.login({ email, password })
      await finishAuth(res.access_token, res.user)
    } catch (err: any) {
      setError(err.message || "Login failed")
    } finally {
      setLoading(false)
    }
  }

  const inputCls =
    "w-full px-4 py-3 bg-[#0f172a] border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Target className="w-8 h-8 text-blue-400" />
            <span className="font-bold text-white text-2xl">LeadGen</span>
          </div>
          <p className="text-center text-gray-400 text-sm mb-6">
            AI lead discovery and sales pipeline
          </p>

          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-white/5 mb-6">
            <button
              type="button"
              onClick={() => setTab("signin")}
              className={`py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                tab === "signin"
                  ? "bg-blue-500 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setTab("signup")}
              className={`py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                tab === "signup"
                  ? "bg-blue-500 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Sign Up
            </button>
          </div>

          {checking && (
            <p className="flex items-center justify-center gap-2 text-xs text-gray-500 mb-4">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Connecting to server…
            </p>
          )}
          {checkFailed && !checking && (
            <p className="flex items-center justify-center gap-2 text-xs text-amber-400 mb-4">
              Could not reach the server
              <button
                type="button"
                onClick={checkBootstrap}
                className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
            </p>
          )}

          {tab === "signin" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm text-gray-400 mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm text-gray-400 mb-1.5">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputCls}
                />
              </div>

              {error && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 text-white font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              {bootstrap === true && (
                <div className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-2.5">
                  This system has no accounts yet — the first account created becomes the
                  administrator.
                </div>
              )}
              {bootstrap === false && (
                <div className="text-xs text-gray-400 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5">
                  New accounts are created by an administrator. If you were invited, use the
                  credentials they shared.
                </div>
              )}
              <div>
                <label htmlFor="name" className="block text-sm text-gray-400 mb-1.5">
                  Your name
                </label>
                <input
                  id="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm text-gray-400 mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm text-gray-400 mb-1.5">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="min 6 characters"
                  className={inputCls}
                />
              </div>

              {error && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 text-white font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {loading ? "Creating…" : "Sign Up"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
