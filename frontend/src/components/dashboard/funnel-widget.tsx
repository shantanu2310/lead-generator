"use client"

import { motion } from "framer-motion"
import { useEffect } from "react"
import { usePipelineAnalytics } from "@/hooks/use-pipeline-analytics"
import { STAGE_LABELS } from "@/lib/constants"
import { formatNumber, formatPercent } from "@/lib/utils"

export function FunnelWidget({ refreshKey = 0 }: { refreshKey?: number }) {
  const { data, loading, refetch } = usePipelineAnalytics()

  useEffect(() => {
    refetch()
  }, [refreshKey, refetch])

  if (loading || !data) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
        <h3 className="font-semibold text-lg text-white mb-4">Sales Funnel</h3>
        <div className="animate-pulse space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-8 bg-white/5 rounded" style={{ width: `${80 - i * 10}%` }} />
          ))}
        </div>
      </div>
    )
  }

  const maxCount = Math.max(...data.stages.map((s) => s.count), 1)

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
      <h3 className="font-semibold text-lg text-white mb-4">Sales Funnel</h3>
      <div className="space-y-2">
        {data.stages.map((stage, i) => {
          const widthPercent = (stage.count / maxCount) * 100
          return (
            <div key={stage.stage}>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>{STAGE_LABELS[stage.stage] || stage.label}</span>
                <span>{formatNumber(stage.count)}</span>
              </div>
              <div className="h-6 bg-white/5 rounded-full overflow-hidden relative">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(widthPercent, 2)}%`,
                    background: `linear-gradient(135deg, ${getGradientStart(i)}, ${getGradientEnd(i)})`,
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(widthPercent, 2)}%` }}
                  transition={{ duration: 0.8, delay: i * 0.1, ease: "easeOut" }}
                />
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold text-white">{formatNumber(data.total_leads)}</p>
          <p className="text-xs text-gray-400">Total Leads</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-green-400">{formatPercent(data.conversion_percent)}</p>
          <p className="text-xs text-gray-400">Conversion</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-blue-400">{formatPercent(data.qualified_percent)}</p>
          <p className="text-xs text-gray-400">Qualified</p>
        </div>
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
