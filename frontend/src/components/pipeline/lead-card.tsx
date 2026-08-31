"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Phone, Mail, MessageCircle, CalendarClock } from "lucide-react"
import Link from "next/link"
import { api } from "@/lib/api"
import { getScoreBgColor, formatRelativeTime } from "@/lib/utils"
import type { LeadListItem } from "@/hooks/use-leads"

const BADGE_COLORS: Record<string, string> = {
  verified_email: "bg-green-50 text-green-700",
  verified_phone: "bg-blue-50 text-blue-700",
  ai_researched: "bg-purple-50 text-purple-700",
  hot_lead: "bg-red-50 text-red-700",
  new_lead: "bg-indigo-50 text-indigo-700",
}

export function LeadCard({ lead }: { lead: LeadListItem }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  async function quickContactAction(
    leadId: string,
    activityType: "call" | "email" | "whatsapp",
    phone?: string,
    email?: string
  ) {
    const outcome = activityType === "call" ? "no_answer" : "sent"
    const channelLabels = { call: "Call", email: "Email", whatsapp: "WhatsApp" }
    const summary = `Quick action: ${channelLabels[activityType]}`
    try {
      await api.createContactActivity(leadId, {
        activity_type: activityType,
        outcome,
        summary,
        contacted_at: new Date().toISOString(),
      })
      window.dispatchEvent(new Event("pipeline:changed"))
    } catch (err) {
      console.error("Failed to log quick contact:", err)
    }
  }

  const hasPhone = !!lead.phone
  const hasEmail = !!lead.email

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white border border-slate-200 rounded-lg p-3 hover:border-slate-300 hover:shadow-sm transition-all group cursor-pointer"
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-1 text-slate-400 hover:text-slate-700 transition-colors cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <Link href={`/pipeline/leads/${lead.id}`} className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-semibold text-slate-900 truncate">{lead.business_name}</h4>
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${getScoreBgColor(lead.lead_score)}`}>
              {lead.lead_score}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600 mb-2">
            {lead.city && <span>{lead.city}</span>}
            {lead.industry && <span>• {lead.industry}</span>}
            {lead.employee_count && <span>• {lead.employee_count} emp</span>}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {lead.email_status && (
              <span className={lead.email_status === "verified" ? "text-green-700 font-medium" : "text-slate-500"}>
                {lead.email_status === "verified" ? "✓" : "○"} Email
              </span>
            )}
            <span>• {formatRelativeTime(lead.last_activity_at)}</span>
          </div>
          {lead.assigned_user_name && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="w-4 h-4 rounded-full bg-[#41808B]/15 flex items-center justify-center text-[8px] font-bold text-[#41808B]">
                {lead.assigned_user_name.charAt(0).toUpperCase()}
              </span>
              <span className="text-[10px] font-medium text-[#41808B] truncate">{lead.assigned_user_name}</span>
            </div>
          )}
          {lead.next_followup_date && (() => {
            const due = new Date(lead.next_followup_date)
            const isOverdue = due < new Date()
            return (
              <div className={`flex items-center gap-1 mt-1.5 text-[10px] font-medium ${isOverdue ? "text-red-600" : "text-amber-600"}`}>
                <CalendarClock className="w-3 h-3" />
                {isOverdue ? "Overdue" : `Due ${due.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
              </div>
            )
          })()}
          {lead.badges && lead.badges.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {lead.badges.map((badge) => (
                <span
                  key={badge}
                  className={`text-[10px] px-1.5 py-0.5 rounded ${BADGE_COLORS[badge] || "bg-slate-100 text-slate-500"}`}
                >
                  {badge.replace("_", " ")}
                </span>
              ))}
            </div>
          )}
        </Link>
        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-100">
          {hasPhone && lead.phone && (
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                quickContactAction(lead.id, "call", lead.phone!)
                window.open(`tel:${lead.phone}`, "_self")
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-[#41808B] hover:bg-slate-100 transition-colors"
              title="Call"
            >
              <Phone className="w-4 h-4" />
            </button>
          )}
          {hasEmail && lead.email && (
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                quickContactAction(lead.id, "email", undefined, lead.email!)
                window.open(`mailto:${lead.email}`, "_self")
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-[#41808B] hover:bg-slate-100 transition-colors"
              title="Email"
            >
              <Mail className="w-4 h-4" />
            </button>
          )}
          {hasPhone && lead.phone && (
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                quickContactAction(lead.id, "whatsapp", lead.phone!)
                window.open(`https://wa.me/${lead.phone!.replace(/\D/g, "")}`, "_blank")
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-slate-100 transition-colors"
              title="WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function LeadCardSkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 animate-pulse">
      <div className="flex gap-2">
        <div className="w-4 h-4 bg-slate-100 rounded mt-1" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-slate-100 rounded w-3/4" />
          <div className="h-3 bg-slate-100 rounded w-1/2" />
          <div className="h-3 bg-slate-100 rounded w-1/3" />
        </div>
      </div>
    </div>
  )
}
