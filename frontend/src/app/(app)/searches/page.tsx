"use client"

import { Fragment, useEffect, useState } from "react"
import { Eye, RotateCcw, Loader2, Inbox, Calendar, ChevronRight, ChevronDown, Archive } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { formatDate, formatRelativeTime, getScoreBgColor } from "@/lib/utils"
import { STAGE_LABELS } from "@/lib/constants"
import type { LeadListItem } from "@/hooks/use-leads"

type SearchItem = {
  id: string
  query: string
  status: string
  candidates_discovered: number
  leads_qualified: number
  leads_returned: number
  lead_count: number
  department_id: string | null
  created_at: string
  completed_at: string | null
}

export default function SearchesPage() {
  const [items, setItems] = useState<SearchItem[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [rerunning, setRerunning] = useState<string | null>(null)
  const [archiving, setArchiving] = useState<string | null>(null)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [searchLeads, setSearchLeads] = useState<Record<string, LeadListItem[]>>({})
  const [loadingLeads, setLoadingLeads] = useState<string | null>(null)
  const router = useRouter()

  async function load(p = page) {
    try {
      setLoading(true)
      const data = await api.listSearches({ page: String(p), page_size: String(pageSize), archived: String(showArchived) })
      setItems(data.items)
      setTotal(data.total)
    } catch (err: any) {
      setMsg({ ok: false, text: err.message || "Failed to load search history" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    load(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchived])

  function goToPage(p: number) {
    setPage(p)
    load(p)
  }

async function rerun(s: SearchItem) {
    setRerunning(s.id)
    setMsg(null)
    try {
      let departmentId = s.department_id || null
      if (!departmentId) {
        const depts = await api.listDepartments()
        departmentId = depts?.[0]?.id || null
      }
      if (!departmentId) {
        setMsg({ ok: false, text: "Create a department in Settings before re-running searches" })
        return
      }
      const result = await api.searchLeads({ query: s.query, max_leads: 10, department_id: departmentId })
      setMsg({ ok: true, text: `Re-ran "${s.query}" — ${result.leads?.length ?? 0} leads found` })
      load(page)
    } catch (err: any) {
      setMsg({ ok: false, text: err.message || "Re-run failed" })
    } finally {
      setRerunning(null)
    }
  }

  async function archive(s: SearchItem) {
    if (!confirm(`Archive "${s.query}"? Its leads stay in the pipeline; the search is hidden from history.`)) return
    setArchiving(s.id)
    setMsg(null)
    try {
      await api.deleteSearch(s.id)
      setMsg({ ok: true, text: "Search archived" })
      load(page)
    } catch (err: any) {
      setMsg({ ok: false, text: err.message || "Archive failed" })
    } finally {
      setArchiving(null)
    }
  }

  async function restore(s: SearchItem) {
    setRestoring(s.id)
    setMsg(null)
    try {
      await api.restoreSearch(s.id)
      setMsg({ ok: true, text: "Search restored" })
      load(page)
    } catch (err: any) {
      setMsg({ ok: false, text: err.message || "Restore failed" })
    } finally {
      setRestoring(null)
    }
  }

  function toggleArchived() {
    setShowArchived((v) => !v)
    setPage(1)
  }

  async function toggleExpand(s: SearchItem) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(s.id)) {
        next.delete(s.id)
      } else {
        next.add(s.id)
      }
      return next
    })
    if (!expanded.has(s.id) && !searchLeads[s.id] && s.lead_count > 0) {
      setLoadingLeads(s.id)
      try {
        const result = await api.listLeads({ search_id: s.id, page_size: "200" })
        setSearchLeads((prev) => ({ ...prev, [s.id]: result.items }))
      } catch {
        setSearchLeads((prev) => ({ ...prev, [s.id]: [] }))
      } finally {
        setLoadingLeads(null)
      }
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            {showArchived ? "Archived searches" : "Search history"}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {showArchived
              ? "Searches you've archived — restore them anytime"
              : "Every lead search you've run, with results at a glance"}
          </p>
        </div>
        <button
          onClick={toggleArchived}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            showArchived
              ? "bg-[#57A3AF]/15 text-[#41808B] hover:bg-[#57A3AF]/25"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          <Archive className="w-4 h-4" />
          {showArchived ? "Show active" : "Archived"}
        </button>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-lg text-sm ${
          msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
        }`}>
          {msg.text}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading && items.length === 0 ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <Inbox className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-base font-medium text-slate-600">{showArchived ? "No archived searches" : "No searches yet"}</p>
            <p className="text-sm text-slate-400 mt-1">
              {showArchived ? "Archived searches will appear here" : "Run a lead search to see history here"}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Query</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3.5 text-right text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Candidates</th>
                <th className="px-6 py-3.5 text-right text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Qualified</th>
                <th className="px-6 py-3.5 text-right text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Leads</th>
                <th className="px-6 py-3.5 text-right text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => {
                const isExpanded = expanded.has(s.id)
                return (
                  <Fragment key={s.id}>
                    <tr
                      onClick={() => toggleExpand(s)}
                      className={`border-b border-slate-100 last:border-0 hover:bg-slate-50/80 transition-colors cursor-pointer ${isExpanded ? "bg-[#57A3AF]/[0.04]" : ""} ${showArchived ? "opacity-60 hover:opacity-100" : ""}`}
                    >
                      <td className="px-6 py-4 max-w-[340px]">
                        <span className="flex items-start gap-2.5">
                          <span className="mt-0.5 shrink-0">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-[#F46036]" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[15px] font-semibold text-slate-900 truncate">{s.query}</span>
                            <span className="block text-xs text-slate-400 mt-0.5">{formatRelativeTime(s.created_at)}</span>
                          </span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {formatDate(s.created_at)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${
                          s.status === "completed"
                            ? "bg-green-50 text-green-700"
                            : "bg-amber-50 text-amber-700"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${s.status === "completed" ? "bg-green-500" : "bg-amber-500"}`} />
                          {s.status}
                        </span>
                        {showArchived && (
                          <span className="ml-1.5 inline-flex text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-500">
                            Archived
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-[15px] font-semibold tabular-nums text-slate-700">{s.candidates_discovered}</td>
                      <td className="px-6 py-4 text-right text-[15px] font-semibold tabular-nums text-slate-700">{s.leads_qualified}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={`inline-flex min-w-[2rem] justify-center text-[15px] font-bold tabular-nums ${s.lead_count > 0 ? "text-[#41808B]" : "text-slate-300"}`}>
                          {s.lead_count}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => router.push(`/pipeline?search_id=${s.id}&q=${encodeURIComponent(s.query)}`)}
                            disabled={s.lead_count === 0}
                            title={s.lead_count === 0 ? "No leads from this search" : "View leads"}
                            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#41808B] hover:text-white bg-[#57A3AF]/15 hover:bg-[#57A3AF] border border-[#57A3AF]/25 hover:border-[#57A3AF] rounded-lg disabled:opacity-30 disabled:pointer-events-none transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View leads
                          </button>
                          {!showArchived && (
                            <button
                              onClick={() => rerun(s)}
                              disabled={rerunning === s.id}
                              title="Re-run this search"
                              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 rounded-lg disabled:opacity-50 transition-colors"
                            >
                              {rerunning === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                              Re-run
                            </button>
                          )}
                          {showArchived ? (
                            <button
                              onClick={() => restore(s)}
                              disabled={restoring === s.id}
                              title="Restore this search"
                              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 hover:border-emerald-300 rounded-lg disabled:opacity-50 transition-colors"
                            >
                              {restoring === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                              Restore
                            </button>
                          ) : (
                            <button
                              onClick={() => archive(s)}
                              disabled={archiving === s.id}
                              title="Archive this search"
                              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 rounded-lg disabled:opacity-50 transition-colors"
                            >
                              {archiving === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5" />}
                              Archive
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-b border-slate-200 bg-slate-50/60">
                        <td colSpan={7} className="px-8 py-5">
                          {loadingLeads === s.id ? (
                            <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Loading leads…
                            </div>
                          ) : (searchLeads[s.id] || []).length === 0 ? (
                            <p className="text-sm text-slate-500 py-2">No leads stored for this search</p>
                          ) : (
                            <div className="rounded-lg border border-slate-200 overflow-hidden bg-white shadow-sm">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="bg-slate-50 text-left border-b border-slate-200">
                                    <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Company</th>
                                    <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Score</th>
                                    <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Stage</th>
                                    <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Assigned To</th>
                                    <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Email</th>
                                    <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Last Activity</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(searchLeads[s.id] || []).map((lead) => (
                                    <tr
                                      key={lead.id}
                                      className="border-t border-slate-100 first:border-t-0 hover:bg-slate-50 transition-colors cursor-pointer"
                                      onClick={() => router.push(`/pipeline/leads/${lead.id}`)}
                                    >
                                      <td className="px-4 py-3 font-medium text-slate-900">
                                        <Link
                                          href={`/pipeline/leads/${lead.id}`}
                                          className="hover:text-[#F46036] transition-colors"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {lead.business_name}
                                        </Link>
                                      </td>
                                      <td className="px-4 py-3">
                                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${getScoreBgColor(lead.lead_score)}`}>
                                          {lead.lead_score}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3">
                                        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                          {STAGE_LABELS[lead.pipeline_stage] || lead.pipeline_stage}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3">
                                        {lead.assigned_user_name ? (
                                          <span className="inline-flex items-center gap-1.5 text-xs text-[#41808B]">
                                            <span className="w-4 h-4 rounded-full bg-[#57A3AF]/30 flex items-center justify-center text-[8px] font-bold">
                                              {lead.assigned_user_name.charAt(0).toUpperCase()}
                                            </span>
                                            {lead.assigned_user_name}
                                          </span>
                                        ) : (
                                          <span className="text-xs text-slate-400">Unassigned</span>
                                        )}
                                      </td>
                                      <td className="px-4 py-3">
                                        <span className={lead.email_status === "verified" ? "text-green-600" : "text-slate-500"}>
                                          {lead.email_status}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-slate-500">
                                        {formatRelativeTime(lead.last_activity_at)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50/50">
            <p className="text-xs text-slate-500">
              Page {page} of {totalPages} · {total} searches
            </p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => goToPage(page - 1)}
                className="px-4 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg disabled:opacity-30 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => goToPage(page + 1)}
                className="px-4 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg disabled:opacity-30 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
