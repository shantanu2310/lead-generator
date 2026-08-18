"use client"

import { Building2 } from "lucide-react"
import { getUser } from "@/lib/auth"

export function CompanyBadge() {
  const user = getUser()
  if (!user?.company_name) return null
  return (
    <span
      title={user.company_name}
      className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#57A3AF]/10 border border-[#57A3AF]/25 text-xs font-medium text-[#41808B] truncate max-w-[200px]"
    >
      <Building2 className="w-3 h-3 shrink-0" />
      <span className="truncate">{user.company_name}</span>
    </span>
  )
}
