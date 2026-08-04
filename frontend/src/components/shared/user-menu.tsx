"use client"

import { LogOut, User as UserIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { getUser, logout, type AuthUser } from "@/lib/auth"

export function UserMenu() {
  const [user, setUser] = useState<AuthUser | null>(null)

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

  if (!user) return null

  return (
    <div className="p-4 border-t border-white/5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
          <UserIcon className="w-4 h-4 text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{user.name}</p>
          <p className="text-xs text-gray-500 truncate">
            {user.email}
            {user.is_admin ? " · Admin" : ""}
          </p>
        </div>
        <button
          onClick={logout}
          title="Log out"
          className="text-gray-400 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
