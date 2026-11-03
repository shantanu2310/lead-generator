"use client"

import { PriorityLeads } from "@/components/dashboard/priority-leads"
import { SalesFunnel } from "@/components/dashboard/sales-funnel"
import { AIInsightsPanel } from "@/components/pipeline/ai-insights-panel"
import { StatCards } from "@/components/dashboard/stat-cards"
import { useDashboardData } from "@/hooks/use-dashboard-data"
import { useProducts } from "@/hooks/use-products"

function buildStatCards(k: { total_leads: number; qualified: number; qualified_percent: number; verified_email: number; verified_email_percent: number; hot_leads: number }) {
  return [
    { key: "total_leads", label: "Total Leads", value: k.total_leads, icon: "Users" as const },
    { key: "qualified", label: "Qualified", value: `${k.qualified} (${k.qualified_percent.toFixed(0)}%)`, icon: "TrendingUp" as const },
    { key: "verified_contacts", label: "Verified Contacts", value: `${k.verified_email} (${k.verified_email_percent.toFixed(0)}%)`, icon: "ShieldCheck" as const },
    { key: "hot_leads", label: "Hot Leads", value: k.hot_leads, icon: "Flame" as const },
  ]
}

export default function DashboardPage() {
  const { selectedProductId } = useProducts()
  const { data, loading, error, refetch } = useDashboardData(selectedProductId)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {error && <div className="text-sm text-red-700">{error} <button onClick={refetch} className="underline">Retry</button></div>}
      {data ? <StatCards data={buildStatCards(data.kpis)} /> : <div className="text-sm text-slate-500">{loading ? "Loading dashboard…" : "No dashboard data available."}</div>}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SalesFunnel data={data?.funnel} loading={loading} />
        </div>
        <AIInsightsPanel key={selectedProductId} productId={selectedProductId} />
      </div>
      <PriorityLeads data={data?.priority_leads} loading={loading} />
    </div>
  )
}
