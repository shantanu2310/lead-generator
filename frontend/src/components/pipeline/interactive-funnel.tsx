"use client"

import { motion } from "framer-motion"
import { usePipelineAnalytics } from "@/hooks/use-pipeline-analytics"
import { STAGE_LABELS } from "@/lib/constants"
import { formatNumber, formatPercent } from "@/lib/utils"
import { useState } from "react"

export function InteractiveFunnel({ onStageClick, searchId }: { onStageClick?: (stage: string) => void; searchId?: string }) {
  const { data, loading } = usePipelineAnalytics(searchId)
  const [hoveredStage, setHoveredStage] = useState<string | null>(null)

  if (loading || !data) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-8 animate-pulse">
        <div className="h-96 bg-slate-100 rounded" />
      </div>
    )
  }

  const maxCount = Math.max(...data.stages.map((s) => s.count), 1)

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-8">
      <h2 className="text-xl font-bold text-slate-900 mb-6">Sales Funnel</h2>
      <div className="flex flex-col items-center gap-1.5">
        {data.stages.map((stage, i) => {
          const ratio = stage.count / maxCount
          const width = 40 + ratio * 50
          const isHovered = hoveredStage === stage.stage

          return (
            <motion.button
              key={stage.stage}
              className="relative w-full cursor-pointer text-left group"
              onClick={() => onStageClick?.(stage.stage)}
              onMouseEnter={() => setHoveredStage(stage.stage)}
              onMouseLeave={() => setHoveredStage(null)}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div
                className="relative h-10 rounded-lg flex items-center px-4 transition-all duration-200"
                style={{
                  width: `${width}%`,
                  background: isHovered
                    ? `linear-gradient(135deg, ${getGradientStart(i)}, ${getGradientEnd(i)})`
                    : `linear-gradient(135deg, ${getGradientStart(i)}88, ${getGradientEnd(i)}88)`,
                  boxShadow: isHovered ? `0 0 20px ${getGradientStart(i)}44` : "none",
                }}
              >
                <span className="text-sm font-medium text-white truncate flex-1">
                  {STAGE_LABELS[stage.stage] || stage.label}
                </span>
                <span className="text-sm font-bold text-white ml-2">{formatNumber(stage.count)}</span>
              </div>
              {isHovered && (
                <motion.div
                  className="absolute left-full ml-4 top-0 bg-white rounded-lg p-3 border border-slate-200 shadow-lg w-48 z-10"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <p className="text-slate-900 text-sm font-medium mb-1">
                    {STAGE_LABELS[stage.stage] || stage.label}
                  </p>
                  <div className="space-y-1 text-xs text-slate-500">
                    <p>Leads: {formatNumber(stage.count)}</p>
                    <p>Value: ${stage.total_value.toLocaleString()}</p>
                    <p>Avg time: {stage.avg_time_hours.toFixed(1)}h</p>
                  </div>
                </motion.div>
              )}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

function getGradientStart(i: number): string {
  const colors = ["#57A3AF", "#41808B", "#F46036", "#7FB800", "#10b981", "#22c55e", "#eab308", "#f97316", "#ef4444", "#ec4899", "#f43f5e", "#22c55e", "#94a3b8"]
  return colors[i % colors.length]
}

function getGradientEnd(i: number): string {
  const colors = ["#41808B", "#2d5c66", "#D94A22", "#6aa300", "#059669", "#16a34a", "#ca8a04", "#ea580c", "#dc2626", "#db2777", "#e11d48", "#16a34a", "#64748b"]
  return colors[i % colors.length]
}
