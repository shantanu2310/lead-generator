"use client"

import { Lightbulb, RefreshCw, TrendingUp, TrendingDown, AlertCircle, Clock, Zap } from "lucide-react"
import { useState } from "react"

type Insight = {
  id: string
  type: "opportunity" | "warning" | "info"
  message: string
  icon: typeof Lightbulb
}

const DEFAULT_INSIGHTS: Insight[] = [
  {
    id: "1",
    type: "opportunity",
    message: "Manufacturing companies convert 22% better than average",
    icon: TrendingUp,
  },
  {
    id: "2",
    type: "warning",
    message: "Reply rate dropped 15% this week",
    icon: TrendingDown,
  },
  {
    id: "3",
    type: "warning",
    message: "45 leads are stuck in Outreach for more than 7 days",
    icon: Clock,
  },
  {
    id: "4",
    type: "info",
    message: "Follow up with these 15 companies today",
    icon: AlertCircle,
  },
  {
    id: "5",
    type: "opportunity",
    message: "8 leads recently raised funding — high priority",
    icon: Zap,
  },
]

export function AIInsightsPanel() {
  const [insights] = useState<Insight[]>(DEFAULT_INSIGHTS)
  const [regenerating, setRegenerating] = useState(false)

  async function regenerate() {
    setRegenerating(true)
    await new Promise((r) => setTimeout(r, 1500))
    setRegenerating(false)
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-yellow-400" />
          <h3 className="font-semibold text-lg text-white">AI Insights</h3>
        </div>
        <button
          onClick={regenerate}
          disabled={regenerating}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>
      <div className="space-y-3">
        {insights.map((insight) => {
          const Icon = insight.icon
          const borderColor =
            insight.type === "opportunity"
              ? "border-green-500/30"
              : insight.type === "warning"
              ? "border-yellow-500/30"
              : "border-blue-500/30"
          const bgColor =
            insight.type === "opportunity"
              ? "bg-green-500/5"
              : insight.type === "warning"
              ? "bg-yellow-500/5"
              : "bg-blue-500/5"

          return (
            <div
              key={insight.id}
              className={`flex items-start gap-3 p-3 rounded-lg border ${borderColor} ${bgColor}`}
            >
              <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                insight.type === "opportunity" ? "text-green-400" :
                insight.type === "warning" ? "text-yellow-400" : "text-blue-400"
              }`} />
              <p className="text-sm text-gray-300">{insight.message}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
