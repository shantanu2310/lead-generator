"use client"

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Sparkles } from "lucide-react"

const LEGACY = ["#a855f7", "#38bdf8", "#22c55e", "#f59e0b"]
const P = { stroke: "none", fillOpacity: 1 }

const FUNNEL = [
  { name: "Discovered", value: 240 },
  { name: "Qualified", value: 96 },
  { name: "Verified", value: 61 },
  { name: "Pipeline", value: 40 },
]

const STAGES = [
  { name: "Won", value: 38 },
  { name: "Lost", value: 24 },
  { name: "Open", value: 86 },
]

const REVENUE = [
  { m: "Jan", v: 12 }, { m: "Feb", v: 19 }, { m: "Mar", v: 15 },
  { m: "Apr", v: 28 }, { m: "May", v: 24 }, { m: "Jun", v: 38 },
]

const CATEGORIES = [
  { name: "Hospitals", value: 42 },
  { name: "Clinics", value: 37 },
  { name: "Dental", value: 26 },
  { name: "Labs", value: 18 },
]

const tooltipStyle = {
  background: "rgba(10,14,30,0.95)",
  border: "1px solid rgba(168,85,247,0.35)",
  borderRadius: "12px",
  fontSize: "12px",
}

function Widget({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#94a3b8]">{title}</p>
      <div className="h-36 text-xs">{children}</div>
    </div>
  )
}

export default function MiniCharts() {
  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#94a3b8]">
        <Sparkles className="h-3.5 w-3.5 text-[#06b6d4]" />
        Live Analytics Widgets
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Widget title="Conversion Funnel" color="#a855f7">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={FUNNEL} layout="vertical" margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={76} tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(168,85,247,0.08)" }} />
              <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                {FUNNEL.map((_, i) => (
                  <Cell key={i} fill={LEGACY[i % LEGACY.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Widget>

        <Widget title="Stage Mix" color="#38bdf8">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={STAGES} dataKey="value" nameKey="name" innerRadius={34} outerRadius={56} paddingAngle={3} stroke="none">
                {STAGES.map((_, i) => (
                  <Cell key={i} fill={["#22c55e", "#ef4444", "#38bdf8"][i]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </Widget>

        <Widget title="Revenue Trend" color="#22c55e">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={REVENUE} margin={{ left: -24, right: 8, top: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="m" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="v" stroke="#22c55e" strokeWidth={2} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </Widget>

        <Widget title="Top Categories" color="#f59e0b">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={CATEGORIES} margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(245,158,11,0.08)" }} />
              <Bar dataKey="value" fill="#f59e0b" radius={[6, 6, 0, 0]} {...P} />
            </BarChart>
          </ResponsiveContainer>
        </Widget>
      </div>
    </div>
  )
}