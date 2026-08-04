"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"
import Link from "next/link"
import { getScoreBgColor, formatRelativeTime } from "@/lib/utils"
import type { LeadListItem } from "@/hooks/use-leads"

const BADGE_COLORS: Record<string, string> = {
  verified_email: "bg-green-500/20 text-green-400",
  verified_phone: "bg-blue-500/20 text-blue-400",
  ai_researched: "bg-purple-500/20 text-purple-400",
  hot_lead: "bg-red-500/20 text-red-400",
  new_lead: "bg-indigo-500/20 text-indigo-400",
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
      className="bg-white/5 border border-white/10 rounded-lg p-3 hover:border-white/20 transition-colors group cursor-pointer"
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-1 text-gray-500 hover:text-white transition-colors cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <Link href={`/pipeline/leads/${lead.id}`} className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-medium text-white truncate">{lead.business_name}</h4>
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${getScoreBgColor(lead.lead_score)}`}>
              {lead.lead_score}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
            {lead.city && <span>{lead.city}</span>}
            {lead.industry && <span>• {lead.industry}</span>}
            {lead.employee_count && <span>• {lead.employee_count} emp</span>}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {lead.email_status && (
              <span className={lead.email_status === "verified" ? "text-green-400" : "text-gray-500"}>
                {lead.email_status === "verified" ? "✓" : "○"} Email
              </span>
            )}
            <span>• {formatRelativeTime(lead.last_activity_at)}</span>
          </div>
          {lead.assigned_user_name && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="w-4 h-4 rounded-full bg-blue-500/30 flex items-center justify-center text-[8px] font-bold text-blue-300">
                {lead.assigned_user_name.charAt(0).toUpperCase()}
              </span>
              <span className="text-[10px] text-blue-300/80 truncate">{lead.assigned_user_name}</span>
            </div>
          )}
          {lead.badges && lead.badges.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {lead.badges.map((badge) => (
                <span
                  key={badge}
                  className={`text-[10px] px-1.5 py-0.5 rounded ${BADGE_COLORS[badge] || "bg-white/10 text-gray-400"}`}
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
    <div className="bg-white/5 border border-white/10 rounded-lg p-3 animate-pulse">
      <div className="flex gap-2">
        <div className="w-4 h-4 bg-white/5 rounded mt-1" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-white/5 rounded w-3/4" />
          <div className="h-3 bg-white/5 rounded w-1/2" />
          <div className="h-3 bg-white/5 rounded w-1/3" />
        </div>
      </div>
    </div>
  )
}
