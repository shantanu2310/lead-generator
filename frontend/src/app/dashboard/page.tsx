"use client"

import { BarChart3, Target, Settings as SettingsIcon, History, TrendingUp, Users, ShieldCheck, Menu, X, Building2, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { AuthGuard } from "@/components/auth/auth-guard"
import { PriorityLeads } from "@/components/dashboard/priority-leads"
import { SalesFunnel } from "@/components/dashboard/sales-funnel"
import { LeadSearchForm } from "@/components/pipeline/lead-search-form"
import { AIInsightsPanel } from "@/components/pipeline/ai-insights-panel"
import { StatCards } from "@/components/dashboard/stat-cards"
import { NotificationsDropdown } from "@/components/shared/notifications-dropdown"
import { UserMenu } from "@/components/shared/user-menu"
import { CompanyBadge } from "@/components/shared/company-badge"
import { WebSocketIndicator } from "@/components/shared/websocket-indicator"
import { Logo } from "@/components/shared/logo"
import { useDashboardData } from "@/hooks/use-dashboard-data"
import { getUser } from "@/lib/auth"

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon; adminOnly?: boolean }[] = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/departments", label: "Departments", icon: Building2, adminOnly: true },
  { href: "/pipeline", label: "Pipeline", icon: Target },
  { href: "/pipeline/team", label: "Team Leads", icon: Users },
  { href: "/searches", label: "Search History", icon: History },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
]

function buildStatCards(k: { total_leads: number; qualified: number; qualified_percent: number; verified_email: number; verified_email_percent: number; hot_leads: number }) {
  return [
    { key: "total_leads", label: "Total Leads", value: k.total_leads, icon: "Users" as const },
    { key: "qualified", label: "Qualified", value: `${k.qualified} (${k.qualified_percent.toFixed(0)}%)`, icon: "TrendingUp" as const },
    { key: "verified_contacts", label: "Verified Contacts", value: `${k.verified_email} (${k.verified_email_percent.toFixed(0)}%)`, icon: "ShieldCheck" as const },
    { key: "hot_leads", label: "Hot Leads", value: k.hot_leads, icon: "Flame" as const },
  ]
}

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const { data, loading, refetch } = useDashboardData()
  const user = getUser()

  useEffect(() => {
    refetch()
  }, [refreshKey, refetch])

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
            const isActive = typeof window !== "undefined" && window.location.pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-white/15 text-white font-medium"
                    : "text-teal-50/80 hover:text-white hover:bg-white/10"
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
            <h1 className="text-lg font-semibold text-slate-900">Dashboard</h1>
            <CompanyBadge />
          </div>
          <div className="flex items-center gap-4">
            <WebSocketIndicator />
            <NotificationsDropdown />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <LeadSearchForm onComplete={() => setRefreshKey((k) => k + 1)} />
            <StatCards data={data ? buildStatCards(data.kpis) : undefined} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <SalesFunnel data={data?.funnel} loading={loading} />
              </div>
              <AIInsightsPanel />
            </div>
            <PriorityLeads data={data?.priority_leads} loading={loading} />
          </div>
        </main>
      </div>
    </div>
    </AuthGuard>
  )
}
