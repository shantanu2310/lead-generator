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
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
        <h3 className="font-semibold text-lg text-slate-900 mb-4">Sales Funnel</h3>
        <div className="animate-pulse space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-8 bg-slate-100 rounded" style={{ width: `${80 - i * 10}%` }} />
          ))}
        </div>
      </div>
    )
  }

  const maxCount = Math.max(...data.stages.map((s) => s.count), 1)

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
      <h3 className="font-semibold text-lg text-slate-900 mb-4">Sales Funnel</h3>
      <div className="space-y-2">
        {data.stages.map((stage, i) => {
          const widthPercent = (stage.count / maxCount) * 100
          return (
            <div key={stage.stage}>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>{STAGE_LABELS[stage.stage] || stage.label}</span>
                <span>{formatNumber(stage.count)}</span>
              </div>
              <div className="h-6 bg-slate-100 rounded-full overflow-hidden relative">
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
      <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold text-slate-900">{formatNumber(data.total_leads)}</p>
          <p className="text-xs text-slate-500">Total Leads</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-[#41808B]">{formatPercent(data.conversion_percent)}</p>
          <p className="text-xs text-slate-500">Conversion</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-[#F46036]">{formatPercent(data.qualified_percent)}</p>
          <p className="text-xs text-slate-500">Qualified</p>
        </div>
      </div>
    </div>
  )
}

function getGradientStart(i: number): string {
  const colors = ["#57A3AF", "#41808B", "#F46036", "#7FB800", "#10b981", "#22c55e", "#eab308", "#f97316", "#ef4444", "#ec4899", "#f43f5e", "#22c55e", "#6b7280"]
  return colors[i % colors.length]
}

function getGradientEnd(i: number): string {
  const colors = ["#41808B", "#2d5c66", "#D94A22", "#6aa300", "#059669", "#16a34a", "#ca8a04", "#ea580c", "#dc2626", "#db2777", "#e11d48", "#16a34a", "#4b5563"]
  return colors[i % colors.length]
}
