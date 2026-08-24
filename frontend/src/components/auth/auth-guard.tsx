"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { getToken, setAuth } from "@/lib/auth"

export function AuthGuard({
  children,
  adminOnly = false,
}: {
  children: React.ReactNode
  adminOnly?: boolean
}) {
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "ok">("loading")

  useEffect(() => {
    let cancelled = false

    async function check() {
      const token = getToken()
      if (!token) {
        router.replace("/login")
        return
      }
      try {
        const me = await api.getMe()
        if (cancelled) return
        setAuth(token, me)
        if (adminOnly && !me.is_admin) {
          router.replace("/pipeline/team")
          return
        }
        setStatus("ok")
      } catch {
        if (!cancelled) {
          router.replace("/login")
        }
      }
    }

    check()
    return () => {
      cancelled = true
    }
  }, [router, adminOnly])

  if (status !== "ok") {
    return (
      <div className="min-h-screen bg-[#E5ECE9] flex items-center justify-center">
        <div className="animate-pulse text-slate-500">Loading…</div>
      </div>
    )
  }

  return <>{children}</>
}
