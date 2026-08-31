"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { getUser } from "@/lib/auth"
import type { LeadListItem } from "@/hooks/use-leads"

export function useFollowupReminders() {
  const alertedRef = useRef(new Set<string>())
  const mountedRef = useRef(false)

  const check = useCallback(async () => {
    const user = getUser()
    if (!user) return
    try {
      const leads: LeadListItem[] = await api.getDueFollowups(24)
      for (const lead of leads) {
        if (!alertedRef.current.has(lead.id)) {
          alertedRef.current.add(lead.id)
          const dueDate = lead.next_followup_date ? new Date(lead.next_followup_date) : null
          const isOverdue = dueDate ? dueDate < new Date() : false
          const label = isOverdue ? "Overdue" : "Due today"

          toast(`${label}: ${lead.business_name}`, {
            description: dueDate
              ? dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
              : "Follow-up needed",
            action: {
              label: "View",
              onClick: () => {
                window.location.href = `/pipeline/leads/${lead.id}`
              },
            },
            duration: 10000,
          })
        }
      }
    } catch {
      // silent — non-critical background check
    }
  }, [])

  useEffect(() => {
    if (mountedRef.current) return
    mountedRef.current = true
    check()
    const interval = setInterval(check, 60000)
    return () => clearInterval(interval)
  }, [check])

  const dismiss = useCallback((leadId: string) => {
    alertedRef.current.delete(leadId)
  }, [])

  return { dismiss, refresh: check }
}
