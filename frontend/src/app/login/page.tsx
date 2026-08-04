"use client"

import { Target } from "lucide-react"
import { useRouter } from "next/navigation"
import { FormEvent, useState } from "react"
import { api } from "@/lib/api"
import { setAuth } from "@/lib/auth"
import { API_BASE } from "@/lib/constants"

export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState<"signin" | "signup">("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function finishAuth(accessToken: string, user: any) {
    setAuth(accessToken, user)
    router.push("/dashboard")
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await api.registerUser({ name, email, password, company_name: companyName })
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
              <div className="text-xs text-gray-400 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5">
                Signing up creates a new company workspace — you become its administrator
                and can invite teammates.
              </div>
              <div>
                <label htmlFor="companyName" className="block text-sm text-gray-400 mb-1.5">
                  Company name
                </label>
                <input
                  id="companyName"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Inc."
                  className={inputCls}
                />
              </div>
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
          <p className="text-center text-[10px] text-gray-700 mt-2">API: {API_BASE}</p>
        </div>
      </div>
    </div>
  )
}
