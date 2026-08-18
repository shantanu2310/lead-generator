"use client"

import { LogOut } from "lucide-react"
import { useEffect, useState } from "react"
import { getUser, logout, type AuthUser } from "@/lib/auth"
import { Avatar } from "@/components/shared/avatar"

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
    <div className="p-4 border-t border-white/10">
      <div className="flex items-center gap-3">
        <Avatar name={user.name} src={user.avatar_url} className="w-9 h-9" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{user.name}</p>
          <p className="text-xs text-teal-100/70 truncate">
            {user.email}
            {user.is_admin ? " · Admin" : ""}
          </p>
        </div>
        <button
          onClick={logout}
          title="Log out"
          className="text-teal-100/70 hover:text-red-300 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
