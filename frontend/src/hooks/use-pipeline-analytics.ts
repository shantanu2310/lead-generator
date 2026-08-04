"use client"

import { useCallback, useEffect, useState } from "react"
import { api } from "@/lib/api"

export type StageData = {
  stage: string
  label: string
  count: number
  total_value: number
  avg_time_hours: number
}

export type AnalyticsData = {
  stages: StageData[]
  total_leads: number
  qualified_percent: number
  conversion_percent: number
  avg_deal_size: number
  avg_response_time_hours: number
  avg_sales_cycle_days: number
  win_rate: number
  loss_rate: number
  revenue_generated: number
  pipeline_value: number
  forecast_revenue: number
}

export function usePipelineAnalytics(searchId?: string) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    try {
      setLoading(true)
      const result = await api.getPipelineAnalytics(searchId)
      setData(result)
    } catch (err) {
      console.error("Failed to fetch analytics", err)
    } finally {
      setLoading(false)
    }
  }, [searchId])

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
