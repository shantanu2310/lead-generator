"use client"

import { Target } from "lucide-react"
import { useRouter } from "next/navigation"
import { FormEvent, useState } from "react"
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
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Target className="w-8 h-8 text-blue-400" />
            <span className="font-bold text-white text-2xl">LeadGen</span>
          </div>
          <p className="text-center text-gray-400 text-sm mb-8">
            Sign in to your sales pipeline
          </p>

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
                className="w-full px-4 py-3 bg-[#0f172a] border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
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
                className="w-full px-4 py-3 bg-[#0f172a] border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
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

          <p className="text-center text-xs text-gray-600 mt-6">
            Accounts are created by an administrator
          </p>
        </div>
      </div>
    </div>
  )
}
