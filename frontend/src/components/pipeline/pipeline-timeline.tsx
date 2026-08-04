"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { formatDate } from "@/lib/utils"
import { motion } from "framer-motion"
import {
  Search,
  Globe,
  Mail,
  Users,
  FileText,
  Send,
  MessageSquare,
  Calendar,
  CheckCircle,
  XCircle,
  ArrowRight,
  Plus,
} from "lucide-react"

const EVENT_ICONS: Record<string, typeof Search> = {
  company_found: Search,
  website_verified: Globe,
  email_verified: Mail,
  contact_found: Users,
  ai_summary_generated: FileText,
  cold_email_created: FileText,
  email_sent: Send,
  email_opened: Mail,
  reply_received: MessageSquare,
  meeting_scheduled: Calendar,
  proposal_sent: FileText,
  deal_won: CheckCircle,
  deal_lost: XCircle,
  stage_changed: ArrowRight,
  note_added: Plus,
}

export function LeadTimeline({ leadId }: { leadId: string }) {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      try {
        const data = await api.getLeadTimeline(leadId)
        setEvents(data)
      } catch (err) {
        console.error("Failed to fetch timeline", err)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [leadId])

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-8 h-8 bg-white/5 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-white/5 rounded w-1/2" />
              <div className="h-3 bg-white/5 rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 text-sm">No timeline events yet</p>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-px bg-white/10" />
      <div className="space-y-6">
        {events.map((event, i) => {
          const Icon = EVENT_ICONS[event.event_type] || ArrowRight
          return (
            <motion.div
              key={event.id}
              className="flex gap-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="relative z-10">
                <div className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-gray-400" />
                </div>
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <p className="text-sm text-white">{event.description || event.event_type.replace(/_/g, " ")}</p>
                <p className="text-xs text-gray-500 mt-0.5">{formatDate(event.created_at)}</p>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
