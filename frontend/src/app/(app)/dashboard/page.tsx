"use client"

import { useState } from "react"
import { Calendar } from "lucide-react"
import { PriorityLeads } from "@/components/dashboard/priority-leads"
import { SalesFunnel } from "@/components/dashboard/sales-funnel"
import { LeadSearchForm } from "@/components/pipeline/lead-search-form"
import { AIInsightsPanel } from "@/components/pipeline/ai-insights-panel"
import { StatCards } from "@/components/dashboard/stat-cards"
import { useDashboardData } from "@/hooks/use-dashboard-data"

function buildStatCards(k: { total_leads: number; qualified: number; qualified_percent: number; verified_email: number; verified_email_percent: number; hot_leads: number }) {
  return [
    { key: "total_leads", label: "Total Leads", value: k.total_leads, icon: "Users" as const },
    { key: "qualified", label: "Qualified", value: `${k.qualified} (${k.qualified_percent.toFixed(0)}%)`, icon: "TrendingUp" as const },
    { key: "verified_contacts", label: "Verified Contacts", value: `${k.verified_email} (${k.verified_email_percent.toFixed(0)}%)`, icon: "ShieldCheck" as const },
    { key: "hot_leads", label: "Hot Leads", value: k.hot_leads, icon: "Flame" as const },
  ]
}

type DatePreset = { label: string; start?: string; end?: string }

const PRESETS: DatePreset[] = [
  { label: "All time" },
  { label: "This week", start: "week" },
  { label: "This month", start: "month" },
  { label: "Last quarter", start: "quarter" },
]

function getPresetRange(preset: DatePreset): { start_date?: string; end_date?: string } {
  if (!preset.start) return {}
  const now = new Date()
  const end = now.toISOString().split("T")[0]
  let start: string
  if (preset.start === "week") {
    const d = new Date(now)
    d.setDate(d.getDate() - 7)
    start = d.toISOString().split("T")[0]
  } else if (preset.start === "month") {
    const d = new Date(now)
    d.setMonth(d.getMonth() - 1)
    start = d.toISOString().split("T")[0]
  } else {
    const d = new Date(now)
    d.setMonth(d.getMonth() - 3)
    start = d.toISOString().split("T")[0]
  }
  return { start_date: start, end_date: end }
}

export default function DashboardPage() {
  const [activePreset, setActivePreset] = useState("All time")
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")

  const presetObj = PRESETS.find((p) => p.label === activePreset) || PRESETS[0]
  const dateRange = customStart || customEnd
    ? { start_date: customStart || undefined, end_date: customEnd || undefined }
    : getPresetRange(presetObj)

  const { data, loading, refetch } = useDashboardData(dateRange)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <LeadSearchForm onComplete={refetch} />
        <div className="flex items-center gap-2 ml-auto">
          <Calendar className="w-4 h-4 text-slate-400" />
          <div className="flex items-center gap-1">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => { setActivePreset(p.label); setCustomStart(""); setCustomEnd("") }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  activePreset === p.label && !customStart && !customEnd
                    ? "bg-[#41808B] text-white"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <input
            type="date"
            value={customStart}
            onChange={(e) => { setCustomStart(e.target.value); setActivePreset("") }}
            className="px-2 py-1 border border-slate-200 rounded-lg text-xs text-slate-600 focus:outline-none focus:border-[#41808B]"
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => { setCustomEnd(e.target.value); setActivePreset("") }}
            className="px-2 py-1 border border-slate-200 rounded-lg text-xs text-slate-600 focus:outline-none focus:border-[#41808B]"
          />
        </div>
      </div>
      <StatCards data={data ? buildStatCards(data.kpis) : undefined} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SalesFunnel data={data?.funnel} loading={loading} />
        </div>
        <AIInsightsPanel />
      </div>
      <PriorityLeads data={data?.priority_leads} loading={loading} />
    </div>
  )
}