"use client"

import { Fragment, useEffect, useState } from "react"
import { BarChart3, Target, Settings as SettingsIcon, History, Menu, X, Eye, RotateCcw, Loader2, Inbox, Calendar, ShieldCheck, Users, ChevronRight, ChevronDown, Archive, Building2, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AuthGuard } from "@/components/auth/auth-guard"
import { api } from "@/lib/api"
import { getUser } from "@/lib/auth"
import { formatDate, formatRelativeTime, getScoreBgColor } from "@/lib/utils"
import { STAGE_LABELS } from "@/lib/constants"
import type { LeadListItem } from "@/hooks/use-leads"
import { NotificationsDropdown } from "@/components/shared/notifications-dropdown"
import { UserMenu } from "@/components/shared/user-menu"
import { CompanyBadge } from "@/components/shared/company-badge"
import { WebSocketIndicator } from "@/components/shared/websocket-indicator"
import { Logo } from "@/components/shared/logo"

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon; adminOnly?: boolean }[] = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/departments", label: "Departments", icon: Building2, adminOnly: true },
  { href: "/pipeline", label: "Pipeline", icon: Target },
  { href: "/pipeline/team", label: "Team Leads", icon: Users },
  { href: "/searches", label: "Search History", icon: History },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
]

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
  const [sidebarOpen, setSidebarOpen] = useState(false)
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
  const user = getUser()
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
      setMsg({ ok: true, text: `Re-ran "${s.query}" â€” ${result.leads?.length ?? 0} leads found` })
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
    <AuthGuard>
<div className="flex h-screen">
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-[#41808B] transform transition-transform duration-200
        lg:relative lg:translate-x-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="relative h-16 bg-white border-b border-slate-200 flex items-center justify-center">
          <Logo className="h-8" />
          <button onClick={() => setSidebarOpen(false)} className="absolute right-4 lg:hidden text-slate-500 hover:text-slate-900">
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="p-4 space-y-1">
          {[...NAV_ITEMS.filter((item) => !item.adminOnly || user?.is_admin), ...(user?.is_admin ? [{ href: "/users", label: "Users", icon: ShieldCheck }] : [])].map((item) => {
            const Icon = item.icon
            const isActive = typeof window !== "undefined" && window.location.pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-white/15 text-white font-medium"
                    : "text-teal-50/80 hover:text-white hover:bg-white/10"
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <UserMenu />
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

<div className="flex-1 flex flex-col min-w-0">
        <header className="relative z-40 flex items-center justify-between h-16 px-6 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-500 hover:text-slate-900">
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-slate-900">Search History</h1>
            <CompanyBadge />
          </div>
          <div className="flex items-center gap-4">
            <WebSocketIndicator />
            <NotificationsDropdown />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {showArchived ? "Archived searches" : "Active searches"}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {showArchived ? "Search history you have archived" : "Past lead searches"}
                </p>
              </div>
              <button
                onClick={toggleArchived}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
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
                    <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="text-center py-16">
                  <Inbox className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">{showArchived ? "No archived searches" : "No searches yet"}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {showArchived ? "Archived searches will appear here" : "Run a lead search to see history here"}
                  </p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Query</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Candidates</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Qualified</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Leads</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((s) => {
                      const isExpanded = expanded.has(s.id)
                      return (
                        <Fragment key={s.id}>
                        <tr
                          onClick={() => toggleExpand(s)}
                          className={`border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer ${isExpanded ? "bg-slate-50" : ""} ${showArchived ? "opacity-60 hover:opacity-100" : ""}`}
                        >
                          <td className="px-4 py-3 font-medium text-slate-900 max-w-[260px] truncate">
                            <span className="flex items-center gap-2">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-[#F46036] shrink-0" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                              )}
                              {s.query}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              {formatDate(s.created_at)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              s.status === "completed"
                                ? "bg-green-50 text-green-700"
                                : "bg-amber-50 text-amber-700"
                            }`}>
                              {s.status}
                            </span>
                            {showArchived && (
                              <span className="ml-1.5 text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                                Archived
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-700">{s.candidates_discovered}</td>
                          <td className="px-4 py-3 text-right text-slate-700">{s.leads_qualified}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={`font-semibold ${s.lead_count > 0 ? "text-[#41808B]" : "text-slate-400"}`}>
                              {s.lead_count}
                            </span>
                          </td>
<td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => router.push(`/pipeline?search_id=${s.id}&q=${encodeURIComponent(s.query)}`)}
                                disabled={s.lead_count === 0}
                                title={s.lead_count === 0 ? "No leads from this search" : "View leads"}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#41808B] hover:text-white bg-[#57A3AF]/15 hover:bg-[#57A3AF] border border-[#57A3AF]/25 hover:border-[#57A3AF] rounded-lg disabled:opacity-30 disabled:pointer-events-none transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                View leads
                              </button>
                              {!showArchived && (
                                <button
                                  onClick={() => rerun(s)}
                                  disabled={rerunning === s.id}
                                  title="Re-run this search"
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 rounded-lg disabled:opacity-50 transition-colors"
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
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 hover:border-emerald-300 rounded-lg disabled:opacity-50 transition-colors"
                                >
                                  {restoring === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                                  Restore
                                </button>
                              ) : (
                                <button
                                  onClick={() => archive(s)}
                                  disabled={archiving === s.id}
                                  title="Archive this search"
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 rounded-lg disabled:opacity-50 transition-colors"
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
                            <td colSpan={7} className="px-6 py-4">
                              {loadingLeads === s.id ? (
                                <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Loading leads…
                                </div>
                              ) : (searchLeads[s.id] || []).length === 0 ? (
                                <p className="text-sm text-slate-500 py-2">No leads stored for this search</p>
                              ) : (
                                <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="bg-slate-50 text-left">
                                        <th className="px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider">Company</th>
                                        <th className="px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider">Score</th>
                                        <th className="px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider">Stage</th>
                                        <th className="px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider">Assigned To</th>
                                        <th className="px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                                        <th className="px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider">Last Activity</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(searchLeads[s.id] || []).map((lead) => (
                                        <tr
                                          key={lead.id}
                                          className="border-t border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                                          onClick={() => router.push(`/pipeline/leads/${lead.id}`)}
                                        >
                                          <td className="px-4 py-2.5 font-medium text-slate-900">
                                            <Link
                                              href={`/pipeline/leads/${lead.id}`}
                                              className="hover:text-[#F46036] transition-colors"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              {lead.business_name}
                                            </Link>
                                          </td>
                                          <td className="px-4 py-2.5">
                                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${getScoreBgColor(lead.lead_score)}`}>
                                              {lead.lead_score}
                                            </span>
                                          </td>
                                          <td className="px-4 py-2.5">
                                            <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                              {STAGE_LABELS[lead.pipeline_stage] || lead.pipeline_stage}
                                            </span>
                                          </td>
                                          <td className="px-4 py-2.5">
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
                                          <td className="px-4 py-2.5">
                                            <span className={lead.email_status === "verified" ? "text-green-600" : "text-slate-500"}>
                                              {lead.email_status}
                                            </span>
                                          </td>
                                          <td className="px-4 py-2.5 text-slate-500">
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
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
                  <p className="text-xs text-slate-500">
                    Page {page} of {totalPages} · {total} searches
                  </p>
                  <div className="flex gap-2">
                    <button
                      disabled={page <= 1}
                      onClick={() => goToPage(page - 1)}
                      className="px-3 py-1 text-xs bg-white border border-slate-200 rounded-lg disabled:opacity-30 text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      Previous
                    </button>
                    <button
                      disabled={page >= totalPages}
                      onClick={() => goToPage(page + 1)}
                      className="px-3 py-1 text-xs bg-white border border-slate-200 rounded-lg disabled:opacity-30 text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
    </AuthGuard>
  )
}
