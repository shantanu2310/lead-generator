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
      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 animate-pulse">
        <div className="h-96 bg-white/5 rounded" />
      </div>
    )
  }

  const maxCount = Math.max(...data.stages.map((s) => s.count), 1)

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-8">
      <h2 className="text-xl font-bold text-white mb-6">Sales Funnel</h2>
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
                  className="absolute left-full ml-4 top-0 bg-gray-900 rounded-lg p-3 border border-white/10 w-48 z-10"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <p className="text-white text-sm font-medium mb-1">
                    {STAGE_LABELS[stage.stage] || stage.label}
                  </p>
                  <div className="space-y-1 text-xs text-gray-400">
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
  const colors = ["#6366f1", "#8b5cf6", "#a855f7", "#06b6d4", "#10b981", "#22c55e", "#eab308", "#f97316", "#ef4444", "#ec4899", "#f43f5e", "#22c55e", "#6b7280"]
  return colors[i % colors.length]
}

function getGradientEnd(i: number): string {
  const colors = ["#4f46e5", "#7c3aed", "#9333ea", "#0891b2", "#059669", "#16a34a", "#ca8a04", "#ea580c", "#dc2626", "#db2777", "#e11d48", "#16a34a", "#4b5563"]
  return colors[i % colors.length]
}
