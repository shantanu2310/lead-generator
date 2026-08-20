"use client"

import { BarChart3, Target, Settings as SettingsIcon, History, TrendingUp, Users, ShieldCheck, Menu, X, Building2, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { AuthGuard } from "@/components/auth/auth-guard"
import { FunnelWidget } from "@/components/dashboard/funnel-widget"
import { RecentSearches } from "@/components/dashboard/recent-searches"
import { LeadSearchForm } from "@/components/pipeline/lead-search-form"
import { StatCards } from "@/components/dashboard/stat-cards"
import { NotificationsDropdown } from "@/components/shared/notifications-dropdown"
import { UserMenu } from "@/components/shared/user-menu"
import { CompanyBadge } from "@/components/shared/company-badge"
import { WebSocketIndicator } from "@/components/shared/websocket-indicator"
import { Logo } from "@/components/shared/logo"
import { usePipelineAnalytics, type AnalyticsData } from "@/hooks/use-pipeline-analytics"
import { getUser } from "@/lib/auth"
import { formatCurrency, formatPercent } from "@/lib/utils"

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon; adminOnly?: boolean }[] = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/departments", label: "Departments", icon: Building2, adminOnly: true },
  { href: "/pipeline", label: "Pipeline", icon: Target },
  { href: "/pipeline/team", label: "Team Leads", icon: Users },
  { href: "/searches", label: "Search History", icon: History },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
]

function buildStatCards(a: AnalyticsData) {
  const won = a.stages.find((s) => s.stage === "won")?.count ?? 0
  const lost = a.stages.find((s) => s.stage === "lost")?.count ?? 0
  return [
    { key: "total_leads", label: "Total Leads", value: a.total_leads, icon: "Users" as const },
    { key: "qualified", label: "Qualified", value: `${formatPercent(a.qualified_percent)}`, icon: "Flame" as const },
    { key: "conversion", label: "Conversion", value: `${formatPercent(a.conversion_percent)}`, icon: "TrendingUp" as const },
    { key: "won_deals", label: "Won Deals", value: won, icon: "Trophy" as const },
    { key: "lost_deals", label: "Lost Deals", value: lost, icon: "XCircle" as const },
    { key: "revenue_pipeline", label: "Revenue Pipeline", value: formatCurrency(a.pipeline_value), icon: "DollarSign" as const },
    { key: "avg_deal_size", label: "Avg. Deal Size", value: formatCurrency(a.avg_deal_size), icon: "Calendar" as const },
    { key: "forecast", label: "Forecast", value: formatCurrency(a.forecast_revenue), icon: "MessageSquare" as const },
  ]
}

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const { data: analytics, refetch } = usePipelineAnalytics()
  const user = getUser()

  useEffect(() => {
    refetch()
  }, [refreshKey, refetch])

  return (
    <AuthGuard>
<div className="flex h-screen flex-col">
      <header className="relative z-40 shrink-0 flex items-center justify-between h-16 px-6 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-4">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-500 hover:text-slate-900">
            <Menu className="w-5 h-5" />
          </button>
          <Logo className="h-7" />
          <h1 className="text-lg font-semibold text-slate-900">Dashboard</h1>
          <CompanyBadge />
        </div>
        <div className="flex items-center gap-4">
          <WebSocketIndicator />
          <NotificationsDropdown />
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
      <aside className={`
        w-64 shrink-0 bg-[#41808B] border-r border-white/10
        max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-50 max-lg:transform max-lg:transition-transform max-lg:duration-200
        ${sidebarOpen ? "max-lg:translate-x-0" : "max-lg:-translate-x-full"}
      `}>
        <div className="flex justify-end p-2 lg:hidden">
          <button onClick={() => setSidebarOpen(false)} className="text-teal-100 hover:text-white">
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

<main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <LeadSearchForm onComplete={() => setRefreshKey((k) => k + 1)} />
            <StatCards data={analytics ? buildStatCards(analytics) : undefined} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <FunnelWidget refreshKey={refreshKey} />
              </div>
<div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
                <h3 className="font-semibold text-lg text-slate-900 mb-4">Quick Stats</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">Win Rate</span>
                    <span className="text-sm font-medium text-green-600">
                      {analytics ? formatPercent(analytics.win_rate) : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">Avg. Deal Size</span>
                    <span className="text-sm font-medium text-slate-900">
                      {analytics ? formatCurrency(analytics.avg_deal_size) : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">Sales Cycle</span>
                    <span className="text-sm font-medium text-slate-900">
                      {analytics ? `${analytics.avg_sales_cycle_days.toFixed(0)} days` : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">Response Time</span>
                    <span className="text-sm font-medium text-slate-900">
                      {analytics ? `${analytics.avg_response_time_hours.toFixed(1)} hrs` : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">Pipeline Value</span>
                    <span className="text-sm font-medium text-[#41808B]">
                      {analytics ? formatCurrency(analytics.pipeline_value) : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <RecentSearches refreshKey={refreshKey} />
          </div>
        </main>
      </div>
    </div>
    </AuthGuard>
  )
}
