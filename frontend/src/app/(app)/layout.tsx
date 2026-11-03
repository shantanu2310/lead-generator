"use client"

import { BarChart3, History, Menu, ShieldCheck, Target, Users, X, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Toaster } from "sonner"
import { AuthGuard } from "@/components/auth/auth-guard"
import { CompanyBadge } from "@/components/shared/company-badge"
import { Logo } from "@/components/shared/logo"
import { NotificationsDropdown } from "@/components/shared/notifications-dropdown"
import { ProfileDropdown } from "@/components/shared/profile-dropdown"
import { UserMenu } from "@/components/shared/user-menu"
import { WebSocketIndicator } from "@/components/shared/websocket-indicator"
import { useFollowupReminders } from "@/hooks/use-followup-reminders"
import { getUser } from "@/lib/auth"
import { ProductsProvider, useProducts } from "@/hooks/use-products"

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon; adminOnly?: boolean }[] = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3, adminOnly: true },
  { href: "/searches", label: "Lead Generator", icon: History, adminOnly: true },
  { href: "/pipeline", label: "Pipeline", icon: Target, adminOnly: true },
  { href: "/pipeline/team", label: "Team Leads", icon: Users },
  { href: "/users", label: "Users", icon: ShieldCheck, adminOnly: true },
]

const TITLES: [prefix: string, title: string][] = [
  ["/pipeline/leads", "Lead Details"],
  ["/pipeline/team", "Team Leads"],
  ["/pipeline", "Sales Pipeline"],
  ["/dashboard", "Dashboard"],
  ["/departments", "Products"],
  ["/users", "Users"],
  ["/searches", "Lead Generator"],
  ["/settings", "Settings"],
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <ProductsProvider><AppShell>{children}</AppShell></ProductsProvider>
}

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sidebarOpenPath, setSidebarOpenPath] = useState<string | null>(null)
  const sidebarOpen = sidebarOpenPath === pathname
  const router = useRouter()
  const user = getUser()
  const { products, selectedProductId, setSelectedProductId, productsError } = useProducts()
  useFollowupReminders()

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
  if (!user?.is_admin && pathname.startsWith("/pipeline/team")) {
    title = "My Leads"
  }

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
            <button onClick={() => setSidebarOpenPath(null)} className="absolute right-4 lg:hidden text-slate-500 hover:text-slate-900">
              <X className="w-5 h-5" />
            </button>
          </div>
          <nav className="p-4 space-y-1">
            {NAV_ITEMS.filter((item) => !item.adminOnly || user?.is_admin).map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || (item.href === "/pipeline" && pathname.startsWith("/pipeline/") && !pathname.startsWith("/pipeline/team"))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpenPath(null)}
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
          {!user?.is_admin && <UserMenu />}
        </aside>

        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpenPath(null)} />
        )}

        <div className="flex-1 flex flex-col min-w-0">
          <header className="relative z-40 flex flex-wrap items-center justify-between gap-2 min-h-16 px-4 py-2 sm:px-6 border-b border-slate-200 bg-white">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <button onClick={() => setSidebarOpenPath(pathname)} className="lg:hidden text-slate-500 hover:text-slate-900">
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="text-lg font-bold text-slate-900">{title}</h1>
              <CompanyBadge />
              {user?.is_admin && pathname === "/dashboard" && (
                <div>
                  <select
                    aria-label="Filter dashboard by product"
                    value={selectedProductId}
                    onChange={(event) => setSelectedProductId(event.target.value)}
                    className="max-w-36 sm:max-w-48 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 focus:outline-none focus:border-[#41808B]"
                  >
                    <option value="">All Products</option>
                    {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                  </select>
                  {productsError && <p className="text-xs text-red-600">{productsError}</p>}
                </div>
              )}
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
      <Toaster position="top-right" richColors closeButton />
    </AuthGuard>
  )
}
