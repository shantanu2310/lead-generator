"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronDown, ChevronUp, Search } from "lucide-react"
import { useLeads, type LeadListItem } from "@/hooks/use-leads"
import { api } from "@/lib/api"
import { STAGE_LABELS } from "@/lib/constants"
import { formatNumber, formatRelativeTime, formatDate, getScoreBgColor } from "@/lib/utils"
import Link from "next/link"
import { useRouter } from "next/navigation"

type SearchInfo = { query: string; created_at: string | null }

export function PipelineTable() {
  const { data, loading, params, setParams } = useLeads()
  const router = useRouter()
  const [sortField, setSortField] = useState("created_at")
  const [sortDir, setSortDir] = useState("desc")
  const [searches, setSearches] = useState<Record<string, SearchInfo>>({})

  useEffect(() => {
    api.listSearches({ page_size: "200" }).then((res) => {
      const map: Record<string, SearchInfo> = {}
      for (const s of res.items) {
        map[s.id] = { query: s.query, created_at: s.created_at }
      }
      setSearches(map)
    }).catch(() => {})
  }, [])

  const groups = useMemo(() => {
    if (!data) return []
    const order: string[] = []
    const bySearch: Record<string, typeof data.items> = {}
    for (const lead of data.items) {
      const key = lead.search_id || "none"
      if (!bySearch[key]) {
        bySearch[key] = []
        order.push(key)
      }
      bySearch[key].push(lead)
    }
    return order.map((key) => ({
      key,
      info: key === "none" ? null : searches[key] || null,
      leads: bySearch[key],
    }))
  }, [data, searches])

  function toggleSort(field: string) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDir("desc")
    }
    setParams({ ...params, sort_by: field, sort_order: sortDir === "asc" ? "desc" : "asc" })
  }

  function SortIcon({ field }: { field: string }) {
    if (sortField !== field) return null
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <Th onClick={() => toggleSort("business_name")}>
                Company <SortIcon field="business_name" />
              </Th>
              <Th onClick={() => toggleSort("pipeline_stage")}>
                Stage <SortIcon field="pipeline_stage" />
              </Th>
              <Th onClick={() => toggleSort("lead_score")}>
                Score <SortIcon field="lead_score" />
              </Th>
              <Th>Industry</Th>
              <Th onClick={() => toggleSort("deal_value")}>
                Value <SortIcon field="deal_value" />
              </Th>
              <Th>Assigned To</Th>
              <Th>Email</Th>
              <Th onClick={() => toggleSort("last_activity_at")}>
                Last Activity <SortIcon field="last_activity_at" />
              </Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i} className="border-b border-white/5 animate-pulse">
                  {[...Array(8)].map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-white/5 rounded w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data?.items.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                  No leads found
                </td>
              </tr>
            ) : (
              groups.map((group) => (
                <GroupRows
                  key={group.key}
                  group={group}
                  onLeadClick={(id) => router.push(`/pipeline/leads/${id}`)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
      {data && data.total_pages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
          <p className="text-xs text-gray-400">
            Showing {data.items.length} of {formatNumber(data.total)} leads
          </p>
          <div className="flex gap-2">
            <button
              disabled={data.page <= 1}
              onClick={() => setParams({ ...params, page: String(data.page - 1) })}
              className="px-3 py-1 text-xs bg-white/5 rounded-lg disabled:opacity-30 text-gray-300 hover:text-white transition-colors"
            >
              Previous
            </button>
            <button
              disabled={data.page >= data.total_pages}
              onClick={() => setParams({ ...params, page: String(data.page + 1) })}
              className="px-3 py-1 text-xs bg-white/5 rounded-lg disabled:opacity-30 text-gray-300 hover:text-white transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

type Group = { key: string; info: SearchInfo | null; leads: LeadListItem[] }

function GroupRows({ group, onLeadClick }: { group: Group; onLeadClick: (id: string) => void }) {
  return (
    <>
      <tr className="border-b border-white/10 bg-[#0a0f1e]/40">
        <td colSpan={8} className="px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-blue-400" />
            {group.info ? (
              <>
                <span className="text-xs font-semibold text-blue-300 truncate">{group.info.query}</span>
                {group.info.created_at && (
                  <span className="text-[11px] text-gray-500 whitespace-nowrap">
                    {formatDate(group.info.created_at)}
                  </span>
                )}
              </>
            ) : (
              <span className="text-xs font-semibold text-gray-400">Other / Unknown search</span>
            )}
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-gray-300 ml-auto whitespace-nowrap">
              {group.leads.length} lead{group.leads.length === 1 ? "" : "s"}
            </span>
          </div>
        </td>
      </tr>
      {group.leads.map((lead) => (
        <tr
          key={lead.id}
          onClick={() => onLeadClick(lead.id)}
          className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
        >
          <td className="px-4 py-3 font-medium text-white">
            <Link
              href={`/pipeline/leads/${lead.id}`}
              className="hover:text-blue-400 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {lead.business_name}
            </Link>
          </td>
          <td className="px-4 py-3">
            <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-gray-300">
              {STAGE_LABELS[lead.pipeline_stage] || lead.pipeline_stage}
            </span>
          </td>
          <td className="px-4 py-3">
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${getScoreBgColor(lead.lead_score)}`}>
              {formatNumber(lead.lead_score)}
            </span>
          </td>
          <td className="px-4 py-3 text-gray-400">{lead.industry || "—"}</td>
          <td className="px-4 py-3 text-gray-300">${formatNumber(lead.deal_value)}</td>
          <td className="px-4 py-3">
            {lead.assigned_user_name ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-blue-300">
                <span className="w-4 h-4 rounded-full bg-blue-500/30 flex items-center justify-center text-[8px] font-bold">
                  {lead.assigned_user_name.charAt(0).toUpperCase()}
                </span>
                {lead.assigned_user_name}
              </span>
            ) : (
              <span className="text-xs text-gray-600">Unassigned</span>
            )}
          </td>
          <td className="px-4 py-3">
            <span className={lead.email_status === "verified" ? "text-green-400" : "text-gray-500"}>
              {lead.email_status}
            </span>
          </td>
          <td className="px-4 py-3 text-gray-400">{formatRelativeTime(lead.last_activity_at)}</td>
        </tr>
      ))}
    </>
  )
}

function Th({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <th
      onClick={onClick}
      className={`px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider ${
        onClick ? "cursor-pointer hover:text-white transition-colors" : ""
      }`}
    >
      <span className="inline-flex items-center gap-1">{children}</span>
    </th>
  )
}
