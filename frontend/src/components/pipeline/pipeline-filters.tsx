"use client"

import { Search, X } from "lucide-react"
import { PIPELINE_STAGES } from "@/lib/constants"
import { useState } from "react"

type Filters = {
  search: string
  pipeline_stage: string
  priority: string
  email_status: string
  assigned_to: string
}

export function PipelineFilters({
  onFilterChange,
}: {
  onFilterChange: (filters: Filters) => void
}) {
  const [filters, setFilters] = useState<Filters>({
    search: "",
    pipeline_stage: "",
    priority: "",
    email_status: "",
    assigned_to: "",
  })

  function update(key: keyof Filters, value: string) {
    const updated = { ...filters, [key]: value }
    setFilters(updated)
    onFilterChange(updated)
  }

  function clear() {
    const cleared = { search: "", pipeline_stage: "", priority: "", email_status: "", assigned_to: "" }
    setFilters(cleared)
    onFilterChange(cleared)
  }

  const activeCount = Object.values(filters).filter((v) => v !== "").length

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Filter companies..."
          value={filters.search}
          onChange={(e) => update("search", e.target.value)}
          className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/20"
        />
      </div>

      <select
        value={filters.pipeline_stage}
        onChange={(e) => update("pipeline_stage", e.target.value)}
        className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-white/20"
      >
        <option value="">All Stages</option>
        {PIPELINE_STAGES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>

      <select
        value={filters.priority}
        onChange={(e) => update("priority", e.target.value)}
        className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-white/20"
      >
        <option value="">All Priorities</option>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
        <option value="critical">Critical</option>
      </select>

      <select
        value={filters.email_status}
        onChange={(e) => update("email_status", e.target.value)}
        className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-white/20"
      >
        <option value="">All Email Status</option>
        <option value="pending">Pending</option>
        <option value="verified">Verified</option>
        <option value="invalid">Invalid</option>
        <option value="bounced">Bounced</option>
      </select>

      <select
        value={filters.assigned_to}
        onChange={(e) => update("assigned_to", e.target.value)}
        className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-white/20"
      >
        <option value="">All Assignments</option>
        <option value="me">My Leads</option>
        <option value="unassigned">Unassigned</option>
      </select>

      {activeCount > 0 && (
        <button
          onClick={clear}
          className="flex items-center gap-1 px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
          Clear ({activeCount})
        </button>
      )}
    </div>
  )
}
