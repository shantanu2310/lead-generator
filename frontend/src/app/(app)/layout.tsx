"use client"

import { BarChart3, Building2, History, Menu, Settings as SettingsIcon, ShieldCheck, Target, Users, X, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { AuthGuard } from "@/components/auth/auth-guard"
import { CompanyBadge } from "@/components/shared/company-badge"
import { Logo } from "@/components/shared/logo"
import { NotificationsDropdown } from "@/components/shared/notifications-dropdown"
import { ProfileDropdown } from "@/components/shared/profile-dropdown"
import { UserMenu } from "@/components/shared/user-menu"
import { WebSocketIndicator } from "@/components/shared/websocket-indicator"
import { getUser } from "@/lib/auth"

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon; adminOnly?: boolean }[] = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3, adminOnly: true },
  { href: "/departments", label: "Departments", icon: Building2, adminOnly: true },
  { href: "/pipeline", label: "Pipeline", icon: Target, adminOnly: true },
  { href: "/pipeline/team", label: "My Leads", icon: Users },
  { href: "/searches", label: "Search History", icon: History, adminOnly: true },
  { href: "/settings", label: "Account", icon: SettingsIcon },
]

const TITLES: [prefix: string, title: string][] = [
  ["/pipeline/leads", "Lead Details"],
  ["/pipeline/team", "My Leads"],
  ["/pipeline", "Sales Pipeline"],
  ["/dashboard", "Dashboard"],
  ["/departments", "Departments"],
  ["/users", "Users"],
  ["/searches", "Search History"],
  ["/settings", "Account"],
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const user = getUser()

  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  useEffect(() => {
    if (user && !user.is_admin) {
      const allowed =
        pathname.startsWith("/pipeline/team") || pathname.startsWith("/settings")
      const blocked = ["/dashboard", "/pipeline", "/searches", "/departments", "/users"]
      if (!allowed && blocked.some((p) => pathname.startsWith(p))) {
        router.replace("/pipeline/team")
      }
    }
  }, [user, pathname, router])

  let title = TITLES.find(([prefix]) => pathname.startsWith(prefix))?.[1] || "LeadPilot"

  return (
    <AuthGuard>
      <div className="flex h-screen">
        <aside className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-[#41808B] transform transition-transform duration-200
          lg:relative lg:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}>
          <div className="relative h-16 bg-white border-b border-slate-200 flex items-center justify-center">
            <Logo className="h-8" variant="full" />
            <button onClick={() => setSidebarOpen(false)} className="absolute right-4 lg:hidden text-slate-500 hover:text-slate-900">
              <X className="w-5 h-5" />
            </button>
          </div>
          <nav className="p-4 space-y-1">
            {[...NAV_ITEMS.filter((item) => !item.adminOnly || user?.is_admin), ...(user?.is_admin ? [{ href: "/users", label: "Users", icon: ShieldCheck }] : [])].map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
                    isActive
                      ? "bg-white/20 text-white font-semibold"
                      : "text-teal-50 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
          <UserMenu />
        </aside>

        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        <div className="flex-1 flex flex-col min-w-0">
          <header className="relative z-40 flex items-center justify-between h-16 px-6 border-b border-slate-200 bg-white">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-500 hover:text-slate-900">
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="text-lg font-bold text-slate-900">{title}</h1>
              <CompanyBadge />
            </div>
            <div className="flex items-center gap-4">
              <WebSocketIndicator />
              <NotificationsDropdown />
              <ProfileDropdown />
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </AuthGuard>
  )
}