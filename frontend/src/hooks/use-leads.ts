"use client"

import { useCallback, useEffect, useState } from "react"
import { api } from "@/lib/api"

export type LeadListItem = {
  id: string
  search_id: string | null
  business_name: string
  website: string | null
  email: string | null
  phone: string | null
  pipeline_stage: string
  lead_score: number
  ai_confidence: number
  priority: string
  industry: string | null
  country: string | null
  city: string | null
  employee_count: number | null
  deal_value: number
  email_status: string
  meeting_status: string
  next_followup_date: string | null
  last_activity_at: string | null
  assigned_user_id: string | null
  assigned_user_name: string | null
  badges: string[] | null
  created_at: string
}

export type PaginatedResult = {
  items: LeadListItem[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export function useLeads(initialParams?: Record<string, string>) {
  const [data, setData] = useState<PaginatedResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [params, setParams] = useState<Record<string, string>>(initialParams || {})

  const fetch = useCallback(async () => {
    try {
      setLoading(true)
      const result = await api.listLeads(params)
      setData(result)
    } catch (err) {
      console.error("Failed to fetch leads", err)
    } finally {
      setLoading(false)
    }
  }, [params])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { data, loading, params, setParams, refetch: fetch }
}
