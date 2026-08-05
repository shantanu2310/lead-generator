"use client"

import { useState, Suspense } from "react"
import { Target, Menu, X, BarChart3, Settings as SettingsIcon, History, SearchX, ShieldCheck, Users } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { AuthGuard } from "@/components/auth/auth-guard"
import { InteractiveFunnel } from "@/components/pipeline/interactive-funnel"
import { KanbanBoard } from "@/components/pipeline/kanban-board"
import { PipelineTable } from "@/components/pipeline/pipeline-table"
import { PipelineCharts } from "@/components/pipeline/pipeline-charts"
import { PipelineFilters } from "@/components/pipeline/pipeline-filters"
import { LeadSearchForm } from "@/components/pipeline/lead-search-form"
import { AIInsightsPanel } from "@/components/pipeline/ai-insights-panel"
import { NotificationsDropdown } from "@/components/shared/notifications-dropdown"
import { UserMenu } from "@/components/shared/user-menu"
import { CompanyBadge } from "@/components/shared/company-badge"
import { WebSocketIndicator } from "@/components/shared/websocket-indicator"
import { useLeads } from "@/hooks/use-leads"
import { getUser } from "@/lib/auth"

type Tab = "kanban" | "table" | "charts"

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
{ href: "/pipeline", label: "Pipeline", icon: Target },
  { href: "/pipeline/team", label: "Team Leads", icon: Users },
  { href: "/searches", label: "Search History", icon: History },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
]

export default function PipelinePage() {
  return (
    <Suspense fallback={<div className="h-screen animate-pulse bg-white/5" />}>
      <AuthGuard>
        <PipelinePageContent />
      </AuthGuard>
    </Suspense>
  )
}

function PipelinePageContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>("kanban")
  const [filters, setFilters] = useState<any>({})
  const searchParams = useSearchParams()
  const searchId = searchParams.get("search_id") || ""
  const searchQuery = searchParams.get("q") || ""
  const user = getUser()
  const initialParams: Record<string, string> = searchId ? { search_id: searchId } : {}
  const { data, loading, params, setParams, refetch } = useLeads(initialParams)

  function handleFilterChange(newFilters: any) {
    setFilters(newFilters)
    const queryParams: Record<string, string> = {}
    if (searchId) queryParams.search_id = searchId
    if (newFilters.search) queryParams.search = newFilters.search
    if (newFilters.pipeline_stage) queryParams.pipeline_stage = newFilters.pipeline_stage
    if (newFilters.priority) queryParams.priority = newFilters.priority
    if (newFilters.email_status) queryParams.email_status = newFilters.email_status
    if (newFilters.assigned_to) queryParams.assigned_to = newFilters.assigned_to
    setParams(queryParams)
  }

  function clearSearchFilter() {
    setFilters({})
    setParams({})
    window.history.replaceState(null, "", "/pipeline")
  }

  return (
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
          {[...NAV_ITEMS.filter((item) => item.href !== "/settings" || user?.is_admin), ...(user?.is_admin ? [{ href: "/users", label: "Users", icon: ShieldCheck }] : [])].map((item) => {
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
            <h1 className="text-lg font-semibold text-white">Sales Pipeline</h1>
            <CompanyBadge />
          </div>
          <div className="flex items-center gap-4">
            <WebSocketIndicator />
            <NotificationsDropdown />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-[1600px] mx-auto space-y-6">
            <LeadSearchForm onComplete={refetch} />

            {searchId && (
              <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-blue-500/20 bg-blue-500/5 backdrop-blur-xl">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <SearchX className="w-4 h-4 text-blue-400" />
                  <span>
                    Showing leads from this search{searchQuery ? `: "${searchQuery}"` : ""}
                  </span>
                  <Link
                    href="/searches"
                    className="text-xs text-blue-400 hover:text-blue-300 ml-1 flex items-center gap-1"
                  >
                    <History className="w-3 h-3" />
                    Search history
                  </Link>
                </div>
                <button
                  onClick={clearSearchFilter}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
                >
                  <SearchX className="w-3.5 h-3.5" />
                  Clear filter
                </button>
              </div>
            )}

            <PipelineFilters onFilterChange={handleFilterChange} />

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
              <div className="xl:col-span-3">
                <InteractiveFunnel
                  searchId={searchId || undefined}
                  onStageClick={(stage) => setParams({ ...params, pipeline_stage: stage })}
                />
              </div>
              <div className="xl:col-span-1">
                <AIInsightsPanel />
              </div>
            </div>

            <div className="flex items-center gap-1 border-b border-white/10">
              <TabButton active={activeTab === "kanban"} onClick={() => setActiveTab("kanban")}>
                Kanban
              </TabButton>
              <TabButton active={activeTab === "table"} onClick={() => setActiveTab("table")}>
                Table
              </TabButton>
              <TabButton active={activeTab === "charts"} onClick={() => setActiveTab("charts")}>
                Charts
              </TabButton>
            </div>

            {activeTab === "kanban" && (
              <KanbanBoard leads={data?.items || []} />
            )}
            {activeTab === "table" && <PipelineTable />}
            {activeTab === "charts" && <PipelineCharts searchId={searchId || undefined} />}
          </div>
        </main>
      </div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
        active
          ? "text-blue-400 border-blue-400"
          : "text-gray-400 border-transparent hover:text-white"
      }`}
    >
      {children}
    </button>
  )
}
