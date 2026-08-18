"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts"
import { usePipelineAnalytics } from "@/hooks/use-pipeline-analytics"
import { STAGE_LABELS } from "@/lib/constants"
import { formatNumber } from "@/lib/utils"

const CHART_COLORS = [
  "#57A3AF", "#41808B", "#F46036", "#7FB800", "#10b981",
  "#22c55e", "#eab308", "#f97316", "#ef4444", "#ec4899",
  "#f43f5e", "#22c55e", "#94a3b8",
]

export function PipelineCharts({ searchId }: { searchId?: string }) {
  const { data, loading } = usePipelineAnalytics(searchId)

  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 animate-pulse">
            <div className="h-4 bg-slate-100 rounded w-1/3 mb-4" />
            <div className="h-64 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    )
  }

  const funnelData = data.stages.map((s) => ({
    name: STAGE_LABELS[s.stage] || s.label,
    value: s.count,
    fill: CHART_COLORS[data.stages.indexOf(s)] || "#6366f1",
  }))

  const pieData = [
    { name: "Won", value: data.stages.find((s) => s.stage === "won")?.count || 0 },
    { name: "Lost", value: data.stages.find((s) => s.stage === "lost")?.count || 0 },
    { name: "Active", value: data.total_leads - (data.stages.find((s) => s.stage === "won")?.count || 0) - (data.stages.find((s) => s.stage === "lost")?.count || 0) },
  ].filter((d) => d.value > 0)

  const valueData = data.stages
    .filter((s) => s.total_value > 0)
    .map((s) => ({
      name: STAGE_LABELS[s.stage] || s.label,
      value: s.total_value,
    }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
        <h3 className="text-sm font-medium text-slate-900 mb-4">Leads by Stage</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={funnelData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} />
            <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px" }}
              labelStyle={{ color: "#0f172a" }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {funnelData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
        <h3 className="text-sm font-medium text-slate-900 mb-4">Win / Loss Ratio</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey="value"
            >
              {pieData.map((_, i) => (
                <Cell key={i} fill={i === 0 ? "#22c55e" : i === 1 ? "#94a3b8" : "#57A3AF"} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px" }}
              labelStyle={{ color: "#0f172a" }}
            />
            <Legend formatter={(value) => <span className="text-slate-500 text-xs">{value}</span>} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {valueData.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 lg:col-span-2">
          <h3 className="text-sm font-medium text-slate-900 mb-4">Pipeline Value by Stage</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={valueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px" }}
                labelStyle={{ color: "#0f172a" }}
                formatter={(value: any) => [`$${Number(value).toLocaleString()}`, "Value"]}
              />
              <Bar dataKey="value" fill="#41808B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
