"use client"

import { AlertCircle, Clock, Lightbulb, RefreshCw, TrendingUp } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { api } from "@/lib/api"
import { formatRelativeTime } from "@/lib/utils"
import Link from "next/link"

type InsightItem = {
  id: string
  title: string
  message: string | null
  lead_id: string | null
  created_at: string
}

type InsightKind = "warning" | "info" | "opportunity"

const ICONS = {
  warning: Clock,
  info: AlertCircle,
  opportunity: TrendingUp,
}

const BORDERS: Record<InsightKind, string> = {
  opportunity: "border-green-500/30",
  warning: "border-yellow-500/30",
  info: "border-blue-500/30",
}

const BGS: Record<InsightKind, string> = {
  opportunity: "bg-green-500/5",
  warning: "bg-yellow-500/5",
  info: "bg-blue-500/5",
}

const ICON_COLORS: Record<InsightKind, string> = {
  opportunity: "text-green-400",
  warning: "text-yellow-400",
  info: "text-blue-400",
}

function kindOf(title: string, message: string | null): InsightKind {
  const text = `${title} ${message || ""}`.toLowerCase()
  if (text.includes("stuck") || text.includes("dropped") || text.includes("no activity") || text.includes("inactive")) {
    return "warning"
  }
  if (text.includes("convert") || text.includes("funding") || text.includes("opportunity")) {
    return "opportunity"
  }
  return "info"
}

export function AIInsightsPanel() {
  const [insights, setInsights] = useState<InsightItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await api.getPipelineInsights(30)
      setInsights(result)
    } catch (err: any) {
      setError(err.message || "Failed to load insights")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-yellow-400" />
          <h3 className="font-semibold text-lg text-white">AI Insights</h3>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>
      <div className="space-y-3">
        {loading && insights.length === 0 ? (
          <p className="text-sm text-gray-500">Loading insights…</p>
        ) : error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : insights.length === 0 ? (
          <p className="text-sm text-gray-500">
            No insights yet. They're generated automatically as leads sit too long in a stage or go
            inactive.
          </p>
        ) : (
          insights.map((insight) => {
            const kind = kindOf(insight.title, insight.message)
            const Icon = ICONS[kind]
            const body = (
              <div
                className={`flex items-start gap-3 p-3 rounded-lg border ${BORDERS[kind]} ${BGS[kind]}`}
              >
                <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${ICON_COLORS[kind]}`} />
                <div className="min-w-0">
                  <p className="text-sm text-gray-200 font-medium">{insight.title}</p>
                  {insight.message && <p className="text-sm text-gray-400 mt-0.5">{insight.message}</p>}
                  <p className="text-[11px] text-gray-600 mt-1">{formatRelativeTime(insight.created_at)}</p>
                </div>
              </div>
            )
            return insight.lead_id ? (
              <Link key={insight.id} href={`/pipeline/leads/${insight.lead_id}`} className="block">
                {body}
              </Link>
            ) : (
              <div key={insight.id}>{body}</div>
            )
          })
        )}
      </div>
    </div>
  )
}