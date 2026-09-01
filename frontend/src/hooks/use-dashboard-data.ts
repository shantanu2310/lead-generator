"use client"

import { useCallback, useEffect, useState } from "react"
import { api } from "@/lib/api"

export type DashboardKpis = {
  total_leads: number
  qualified: number
  qualified_percent: number
  verified_email: number
  verified_email_percent: number
  hot_leads: number
}

export type DashboardFunnelStage = {
  key: string
  label: string
  count: number
  conversion_percent: number
  dropoff_percent: number
}

export type PriorityLead = {
  id: string
  business_name: string
  company_logo_url: string | null
  contact_name: string | null
  lead_score: number
  priority: string
  pipeline_stage: string
  reason: string
  last_activity_at: string | null
}

export type DashboardData = {
  kpis: DashboardKpis
  funnel: DashboardFunnelStage[]
  priority_leads: PriorityLead[]
}

export function useDashboardData(dateRange?: { start_date?: string; end_date?: string }) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    try {
      setLoading(true)
      const result = await api.getPipelineDashboard(dateRange)
      setData(result)
    } catch (err) {
      console.error("Failed to fetch dashboard data", err)
    } finally {
      setLoading(false)
    }
  }, [dateRange?.start_date, dateRange?.end_date])

  useEffect(() => {
    fetch()
    const interval = setInterval(fetch, 30000)
    const onChanged = () => fetch()
    window.addEventListener("pipeline:changed", onChanged)
    return () => {
      clearInterval(interval)
      window.removeEventListener("pipeline:changed", onChanged)
    }
  }, [fetch])

  return { data, loading, refetch: fetch }
}