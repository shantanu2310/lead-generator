"use client"

import { useState, useRef, useEffect } from "react"
import { LogOut, Settings, ChevronDown } from "lucide-react"
import { useRouter } from "next/navigation"
import { getUser, logout, type AuthUser } from "@/lib/auth"
import { Avatar } from "@/components/shared/avatar"

export function ProfileDropdown() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const sync = () => setUser(getUser())
    sync()
    window.addEventListener("auth:changed", sync)
    window.addEventListener("storage", sync)
    return () => {
      window.removeEventListener("auth:changed", sync)
      window.removeEventListener("storage", sync)
    }
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    document.addEventListener("keydown", handleKey)
    return () => {
      document.removeEventListener("mousedown", handleClick)
      document.removeEventListener("keydown", handleKey)
    }
  }, [])

  if (!user || !user.is_admin) return null

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 p-1 pr-2 rounded-full hover:bg-slate-100 transition-colors"
        aria-label="Account menu"
      >
        <Avatar name={user.name} src={user.avatar_url} className="w-8 h-8 ring-2 ring-slate-200" />
        <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3.5 border-b border-slate-200 bg-slate-50">
            <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
            <p className="text-xs text-slate-500 truncate">{user.email} · Admin</p>
          </div>

          <div className="p-1.5">
            <button
              onClick={() => {
                setOpen(false)
                router.push("/settings")
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              Account
            </button>
            <button
              onClick={() => logout()}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-4 h-4 text-slate-400" />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
