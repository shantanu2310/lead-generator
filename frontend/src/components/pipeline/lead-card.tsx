"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"
import Link from "next/link"
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
            <h4 className="text-sm font-medium text-slate-900 truncate">{lead.business_name}</h4>
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${getScoreBgColor(lead.lead_score)}`}>
              {lead.lead_score}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
            {lead.city && <span>{lead.city}</span>}
            {lead.industry && <span>• {lead.industry}</span>}
            {lead.employee_count && <span>• {lead.employee_count} emp</span>}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            {lead.email_status && (
              <span className={lead.email_status === "verified" ? "text-green-600" : "text-slate-400"}>
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
              <span className="text-[10px] text-[#41808B]/80 truncate">{lead.assigned_user_name}</span>
            </div>
          )}
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
