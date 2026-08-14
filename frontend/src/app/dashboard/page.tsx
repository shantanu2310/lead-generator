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
    <div className="flex h-screen">
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-[#0a0f1e] border-r border-white/5 transform transition-transform duration-200
        lg:relative lg:translate-x-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Target className="w-6 h-6 text-blue-400" />
            <span className="font-bold text-white text-lg">LeadGen</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-white">
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
                    ? "bg-blue-500/10 text-blue-400"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
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
        <header className="relative z-40 flex items-center justify-between h-16 px-6 border-b border-white/5 bg-[#0a0f1e]/50 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-400 hover:text-white">
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-white">Dashboard</h1>
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
            <StatCards data={analytics ? buildStatCards(analytics) : undefined} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <FunnelWidget refreshKey={refreshKey} />
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
                <h3 className="font-semibold text-lg text-white mb-4">Quick Stats</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Win Rate</span>
                    <span className="text-sm font-medium text-green-400">
                      {analytics ? formatPercent(analytics.win_rate) : "â€”"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Avg. Deal Size</span>
                    <span className="text-sm font-medium text-white">
                      {analytics ? formatCurrency(analytics.avg_deal_size) : "â€”"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Sales Cycle</span>
                    <span className="text-sm font-medium text-white">
                      {analytics ? `${analytics.avg_sales_cycle_days.toFixed(0)} days` : "â€”"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Response Time</span>
                    <span className="text-sm font-medium text-white">
                      {analytics ? `${analytics.avg_response_time_hours.toFixed(1)} hrs` : "â€”"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Pipeline Value</span>
                    <span className="text-sm font-medium text-blue-400">
                      {analytics ? formatCurrency(analytics.pipeline_value) : "â€”"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <RecentSearches />
          </div>
        </main>
      </div>
    </div>
    </AuthGuard>
  )
}
