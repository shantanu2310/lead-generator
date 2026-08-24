"use client"

import { ChevronDown, Filter } from "lucide-react"
import type { DashboardFunnelStage } from "@/hooks/use-dashboard-data"

const BAR_COLORS = [
  "bg-[#41808B]",
  "bg-[#57A3AF]",
  "bg-[#7FB8C1]",
  "bg-[#9DC9CF]",
  "bg-[#F46036]",
  "bg-[#F4785A]",
  "bg-[#F79A7E]",
  "bg-[#F8BDA9]",
  "bg-[#7FB800]",
]

export function SalesFunnel({ data, loading }: { data?: DashboardFunnelStage[]; loading?: boolean }) {
  const stages = data || []
  const max = stages[0]?.count ?? 0

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-[#F46036]" />
          <h3 className="font-semibold text-lg text-slate-900">Sales Funnel</h3>
        </div>
        {stages.length > 0 && (
          <span className="text-xs font-medium text-slate-500">{stages.length} stages</span>
        )}
      </div>
      <div className="space-y-3">
        {loading && stages.length === 0 ? (
          <p className="text-sm text-slate-500">Loading funnel…</p>
        ) : stages.length === 0 ? (
          <p className="text-sm text-slate-500">
            No leads yet. Run a search and generate leads to build your funnel.
          </p>
        ) : (
          stages.map((stage, i) => (
            <div key={stage.key} className="group">
              <div className="flex items-center justify-between text-sm mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-300 -rotate-90 group-hover:rotate-0 transition-transform ${
                      i === stages.length - 1 ? "rotate-0 text-slate-200" : ""
                    }`}
                  />
                  <span className="text-slate-800 font-medium truncate">{stage.label}</span>
                  <span className="text-[11px] font-medium text-slate-500 hidden sm:inline">
                    → {stage.conversion_percent.toFixed(0)}%
                  </span>
                  {stage.dropoff_percent > 0 && (
                    <span className="text-[11px] font-medium text-red-500 hidden sm:inline">
                      −{stage.dropoff_percent.toFixed(0)}%
                    </span>
                  )}
                </div>
                <span className="text-sm font-semibold text-slate-900 tabular-nums">
                  {stage.count}
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${BAR_COLORS[i % BAR_COLORS.length]}`}
                  style={{ width: max > 0 ? `${Math.max(2, (stage.count / max) * 100)}%` : "0%" }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}