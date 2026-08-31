"use client"

import { useState, Suspense } from "react"
import { History, SearchX } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { KanbanBoard } from "@/components/pipeline/kanban-board"
import { PipelineFilters } from "@/components/pipeline/pipeline-filters"
import { PipelineTable } from "@/components/pipeline/pipeline-table"
import { PipelineCharts } from "@/components/pipeline/pipeline-charts"
import { useLeads } from "@/hooks/use-leads"

type Tab = "kanban" | "table" | "charts"

export default function PipelinePage() {
  return (
    <Suspense fallback={<div className="animate-pulse bg-slate-100 rounded-xl h-96" />}>
      <PipelinePageContent />
    </Suspense>
  )
}

function PipelinePageContent() {
  const [activeTab, setActiveTab] = useState<Tab>("kanban")
  const searchParams = useSearchParams()
  const searchId = searchParams.get("search_id") || ""
  const searchQuery = searchParams.get("q") || ""
  const initialParams: Record<string, string> = searchId ? { search_id: searchId } : {}
  const { data, setParams } = useLeads(initialParams)

  function handleFilterChange(filters: Record<string, string>) {
    const params: Record<string, string> = {}
    if (searchId) params.search_id = searchId
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params[key] = value
    })
    setParams(params)
  }

  function clearSearchFilter() {
    setParams({})
    window.history.replaceState(null, "", "/pipeline")
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      {searchId && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-[#57A3AF]/25 bg-[#57A3AF]/5">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <SearchX className="w-4 h-4 text-[#41808B]" />
            <span>
              Showing leads from this search{searchQuery ? `: "${searchQuery}"` : ""}
            </span>
            <Link
              href="/searches"
              className="text-xs text-[#41808B] hover:text-[#F46036] ml-1 flex items-center gap-1"
            >
              <History className="w-3 h-3" />
              Search history
            </Link>
          </div>
          <button
            onClick={clearSearchFilter}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 transition-colors"
          >
            <SearchX className="w-3.5 h-3.5" />
            Clear filter
          </button>
        </div>
      )}

      {!searchId && <PipelineFilters onFilterChange={handleFilterChange} />}

      <div className="flex items-center gap-1 border-b border-slate-200">
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
          ? "text-[#F46036] border-[#F46036]"
          : "text-slate-600 border-transparent hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  )
}