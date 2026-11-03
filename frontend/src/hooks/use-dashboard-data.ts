"use client"

import { useCallback, useEffect, useRef, useState } from "react"
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

export function useDashboardData(productId = "") {
  const [snapshot, setSnapshot] = useState<{ productId: string; data: DashboardData | null; error: string | null } | null>(null)
  const requestId = useRef(0)

  const fetch = useCallback(() => {
    const id = ++requestId.current
    return api.getPipelineDashboard(productId).then((result) => {
      if (id === requestId.current) setSnapshot({ productId, data: result, error: null })
    }).catch(() => {
      if (id === requestId.current) {
        setSnapshot({ productId, data: null, error: "Failed to load dashboard data. Please try again." })
      }
    })
  }, [productId])

  useEffect(() => {
    const counter = requestId
    fetch()
    const interval = setInterval(fetch, 30000)
    const onChanged = () => fetch()
    window.addEventListener("pipeline:changed", onChanged)
    return () => {
      counter.current++
      clearInterval(interval)
      window.removeEventListener("pipeline:changed", onChanged)
    }
  }, [fetch])

  const data = snapshot?.productId === productId ? snapshot.data : null
  const error = snapshot?.productId === productId ? snapshot.error : null
  return { data, loading: !snapshot || snapshot.productId !== productId, error, refetch: fetch }
}
