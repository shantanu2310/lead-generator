"use client"

import { ArrowRight, Flame, Star } from "lucide-react"
import Link from "next/link"
import type { PriorityLead } from "@/hooks/use-dashboard-data"
import { STAGE_LABELS } from "@/lib/constants"
import { formatRelativeTime } from "@/lib/utils"

const STAGE_BADGES: Record<string, string> = {
  new_lead: "bg-indigo-50 text-indigo-700 border-indigo-200",
  qualified: "bg-violet-50 text-violet-700 border-violet-200",
  contact_found: "bg-purple-50 text-purple-700 border-purple-200",
  verified: "bg-cyan-50 text-cyan-700 border-cyan-200",
  research_complete: "bg-emerald-50 text-emerald-700 border-emerald-200",
  outreach_ready: "bg-green-50 text-green-700 border-green-200",
  email_sent: "bg-yellow-50 text-yellow-700 border-yellow-200",
  follow_up: "bg-orange-50 text-orange-700 border-orange-200",
  meeting: "bg-red-50 text-red-700 border-red-200",
  proposal: "bg-pink-50 text-pink-700 border-pink-200",
  negotiation: "bg-rose-50 text-rose-700 border-rose-200",
  won: "bg-green-50 text-green-700 border-green-200",
  lost: "bg-slate-100 text-slate-600 border-slate-200",
}

function scoreColor(score: number) {
  if (score >= 90) return "text-green-600"
  if (score >= 75) return "text-amber-600"
  return "text-slate-600"
}

export function PriorityLeads({
  data,
  loading,
}: {
  data?: PriorityLead[]
  loading?: boolean
}) {
  const leads = data || []

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-[#F46036]" />
          <h3 className="font-semibold text-lg text-slate-900">Priority Leads</h3>
        </div>
        <Link
          href="/pipeline"
          className="flex items-center gap-1 text-xs text-[#41808B] hover:text-[#F46036] transition-colors"
        >
          View all
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      {loading && leads.length === 0 ? (
        <p className="text-sm text-slate-500">Loading priority leads…</p>
      ) : leads.length === 0 ? (
        <p className="text-sm text-slate-500">
          No priority leads yet. Generate leads and your highest-potential ones will appear here.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                <th className="py-2 pr-4 font-medium">Company</th>
                <th className="py-2 pr-4 font-medium">Contact</th>
                <th className="py-2 pr-4 font-medium">Score</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Reason</th>
                <th className="py-2 pr-4 font-medium">Last Activity</th>
                <th className="py-2 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {lead.company_logo_url ? (
                        <img
                          src={lead.company_logo_url}
                          alt=""
                          className="w-8 h-8 rounded-md object-cover bg-slate-100 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold text-slate-400">
                            {(lead.business_name || "?").charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className="font-medium text-slate-900 truncate">{lead.business_name}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="text-slate-600">{lead.contact_name || "—"}</span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`font-semibold tabular-nums ${scoreColor(lead.lead_score)}`}>
                      {lead.lead_score}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="flex items-center gap-1.5">
                      {lead.pipeline_stage === "outreach_ready" && (
                        <Flame className="w-3.5 h-3.5 text-[#F46036]" />
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-full border text-[11px] whitespace-nowrap ${
                          STAGE_BADGES[lead.pipeline_stage] || "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {STAGE_LABELS[lead.pipeline_stage] || lead.pipeline_stage.replace("_", " ")}
                      </span>
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="text-xs text-slate-500">{lead.reason}</span>
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap text-xs text-slate-400">
                    {lead.last_activity_at ? formatRelativeTime(lead.last_activity_at) : "—"}
                  </td>
                  <td className="py-3 text-right">
                    <Link
                      href={`/pipeline/leads/${lead.id}`}
                      className="inline-flex items-center gap-1 text-xs text-[#41808B] hover:text-[#F46036] transition-colors"
                    >
                      View
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}