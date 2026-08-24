"use client"

import { motion } from "framer-motion"
import { TrendingUp, Users, Flame, MessageSquare, Calendar, DollarSign, Trophy, XCircle, ShieldCheck } from "lucide-react"
import { Card } from "@/components/ui/card"
import { formatCurrency, formatNumber } from "@/lib/utils"

const icons = {
  TrendingUp, Users, Flame, MessageSquare, Calendar, DollarSign, Trophy, XCircle, ShieldCheck,
} as const

type StatCardData = {
  key: string
  label: string
  value: string | number
  icon: keyof typeof icons
  trend?: number
}

const defaultStats: StatCardData[] = [
  { key: "today_leads", label: "Today's Leads", value: 0, icon: "Users" },
  { key: "hot_leads", label: "Hot Leads", value: 0, icon: "Flame" },
  { key: "new_replies", label: "New Replies", value: 0, icon: "MessageSquare" },
  { key: "meetings_today", label: "Meetings Today", value: 0, icon: "Calendar" },
  { key: "revenue_pipeline", label: "Revenue Pipeline", value: "$0", icon: "DollarSign" },
  { key: "forecast", label: "Forecast", value: "$0", icon: "TrendingUp" },
  { key: "won_deals", label: "Won Deals", value: 0, icon: "Trophy" },
  { key: "lost_deals", label: "Lost Deals", value: 0, icon: "XCircle" },
]

export function StatCards({ data }: { data?: StatCardData[] }) {
  const stats = data || defaultStats
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, i) => {
        const Icon = icons[stat.icon] || TrendingUp
        const isCurrency = typeof stat.value === "string" && stat.value.startsWith("$")
        return (
          <motion.div
            key={stat.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">{stat.label}</p>
                  <motion.p
                    className="text-2xl font-bold text-slate-900"
                    key={String(stat.value)}
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    {isCurrency || typeof stat.value === "string" ? stat.value : formatNumber(Number(stat.value))}
                  </motion.p>
                </div>
                <div className="p-2 rounded-lg bg-slate-100">
                  <Icon className="w-5 h-5 text-[#41808B]" />
                </div>
              </div>
              {stat.trend !== undefined && (
                <p className={`text-xs mt-2 ${stat.trend >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {stat.trend >= 0 ? "+" : ""}{stat.trend}% vs last week
                </p>
              )}
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}
