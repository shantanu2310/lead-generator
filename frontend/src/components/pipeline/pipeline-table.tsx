"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { CheckSquare, ChevronDown, ChevronUp, Download, Loader2, Search, X } from "lucide-react"
import { useLeads, type LeadListItem } from "@/hooks/use-leads"
import { api } from "@/lib/api"
import { getUser } from "@/lib/auth"
import { PIPELINE_STAGES, STAGE_LABELS } from "@/lib/constants"
import { formatNumber, formatRelativeTime, formatDate, getScoreBgColor } from "@/lib/utils"
import Link from "next/link"
import { useRouter } from "next/navigation"

type SearchInfo = { query: string; created_at: string | null }

export function PipelineTable() {
  const { data, loading, params, setParams, refetch } = useLeads()
  const router = useRouter()
  const [sortField, setSortField] = useState("created_at")
  const [sortDir, setSortDir] = useState("desc")
  const [searches, setSearches] = useState<Record<string, SearchInfo>>({})
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [users, setUsers] = useState<Array<{ id: string; name: string; avatar_url: string | null }>>([])
  const [targetUserId, setTargetUserId] = useState<string>("")
  const [assigning, setAssigning] = useState(false)
  const [bulkStaging, setBulkStaging] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [targetStage, setTargetStage] = useState("")
  const [exporting, setExporting] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const mainCheckboxRef = useRef<HTMLInputElement>(null)
  const me = getUser()
  const isAdmin = !!me?.is_admin

  useEffect(() => {
    const t = setTimeout(() => setMsg(null), 4000)
    return () => clearTimeout(t)
  }, [msg])

  useEffect(() => {
    api.listSearches({ page_size: "200" }).then((res) => {
      const map: Record<string, SearchInfo> = {}
      for (const s of res.items) {
        map[s.id] = { query: s.query, created_at: s.created_at }
      }
      setSearches(map)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    api.listUsers().then((res) => setUsers(res)).catch(() => {})
  }, [isAdmin])

  const pageIds = useMemo(() => data?.items.map((l) => l.id) ?? [], [data])
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id))

  useEffect(() => {
    if (mainCheckboxRef.current) {
      mainCheckboxRef.current.indeterminate =
        pageIds.length > 0 && !allSelected && pageIds.some((id) => selected.has(id))
    }
  }, [selected, pageIds, allSelected])

  const groups = useMemo(() => {
    if (!data) return []
    const order: string[] = []
    const bySearch: Record<string, LeadListItem[]> = {}
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

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        pageIds.forEach((id) => next.delete(id))
      } else {
        pageIds.forEach((id) => next.add(id))
      }
      return next
    })
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function applyBulkAssign() {
    if (selected.size === 0) return
    setAssigning(true)
    setMsg(null)
    try {
      const ids = Array.from(selected)
      const res = await api.bulkAssignLeads(ids, targetUserId || null)
      setMsg({
        ok: true,
        text: `${res.assigned} lead${res.assigned === 1 ? "" : "s"} updated${res.skipped ? `, ${res.skipped} skipped` : ""}.`,
      })
      setSelected(new Set())
      setTargetUserId("")
      await refetch()
    } catch (err: any) {
      setMsg({ ok: false, text: err.message || "Bulk assign failed" })
    } finally {
      setAssigning(false)
    }
  }

  async function applyBulkStage() {
    if (selected.size === 0 || !targetStage) return
    setBulkStaging(true)
    setMsg(null)
    try {
      const ids = Array.from(selected)
      const res = await api.bulkMoveStage(ids, targetStage)
      setMsg({ ok: true, text: `${res.affected} lead${res.affected === 1 ? "" : "s"} moved to "${STAGE_LABELS[targetStage] || targetStage}".` })
      setSelected(new Set())
      setTargetStage("")
      await refetch()
      window.dispatchEvent(new Event("pipeline:changed"))
    } catch (err: any) {
      setMsg({ ok: false, text: err.message || "Bulk stage move failed" })
    } finally {
      setBulkStaging(false)
    }
  }

  async function applyBulkDelete() {
    if (selected.size === 0) return
    if (!confirm(`Delete ${selected.size} lead${selected.size === 1 ? "" : "s"}? This cannot be undone.`)) return
    setBulkDeleting(true)
    setMsg(null)
    try {
      const ids = Array.from(selected)
      const res = await api.bulkDeleteLeads(ids)
      setMsg({ ok: true, text: `${res.affected} lead${res.affected === 1 ? "" : "s"} deleted.` })
      setSelected(new Set())
      await refetch()
      window.dispatchEvent(new Event("pipeline:changed"))
    } catch (err: any) {
      setMsg({ ok: false, text: err.message || "Bulk delete failed" })
    } finally {
      setBulkDeleting(false)
    }
  }

  async function exportCsv() {
    setExporting(true)
    try {
      await api.exportLeads({ ...params, page_size: "5000", page: "1" })
    } catch (err: any) {
      setMsg({ ok: false, text: err.message || "Export failed" })
    } finally {
      setExporting(false)
    }
  }

  function toggleSort(field: string) {
    const nextDir = sortField === field ? (sortDir === "asc" ? "desc" : "asc") : "desc"
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
    }
    setParams({ ...params, sort_by: field, sort_order: nextDir })
  }

  function SortIcon({ field }: { field: string }) {
    if (sortField !== field) return null
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-end px-4 py-2 border-b border-slate-200">
        <button
          onClick={exportCsv}
          disabled={exporting}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#F46036] transition-colors disabled:opacity-50"
        >
          {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          Export CSV
        </button>
      </div>
      {isAdmin && selected.size > 0 && (
        <div className="flex items-center gap-3 flex-wrap px-4 py-3 border-b border-[#F46036]/20 bg-orange-50">
          <span className="flex items-center gap-2 text-xs font-semibold text-[#D94A22] whitespace-nowrap">
            <CheckSquare className="w-4 h-4" />
            {selected.size} selected
          </span>
          <select
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg text-xs text-slate-700 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#F46036] min-w-[160px]"
          >
            <option value="">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <button
            onClick={applyBulkAssign}
            disabled={assigning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F46036] text-white text-xs font-semibold hover:bg-[#D94A22] transition-colors disabled:opacity-50"
          >
            {assigning && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {targetUserId ? "Assign to user" : "Unassign"}
          </button>
          <div className="w-px h-5 bg-slate-300" />
          <select
            value={targetStage}
            onChange={(e) => setTargetStage(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg text-xs text-slate-700 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#F46036] min-w-[140px]"
          >
            <option value="">Move to stage…</option>
            {PIPELINE_STAGES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <button
            onClick={applyBulkStage}
            disabled={bulkStaging || !targetStage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#41808B] text-white text-xs font-semibold hover:bg-[#356a6f] transition-colors disabled:opacity-50"
          >
            {bulkStaging && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Move
          </button>
          <div className="w-px h-5 bg-slate-300" />
          <button
            onClick={applyBulkDelete}
            disabled={bulkDeleting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {bulkDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Delete
          </button>
          <button
            onClick={() => {
              setSelected(new Set())
              setTargetUserId("")
              setTargetStage("")
            }}
            disabled={assigning || bulkStaging || bulkDeleting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </button>
          {msg && (
            <span className={`text-xs ${msg.ok ? "text-green-700" : "text-red-700"} ml-auto`}>{msg.text}</span>
          )}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {isAdmin && (
                <th className="px-4 py-3 w-8">
                  <input
                    ref={mainCheckboxRef}
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="accent-[#F46036]"
                  />
                </th>
              )}
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
                <tr key={i} className="border-b border-slate-100 animate-pulse">
                  {[...Array(isAdmin ? 9 : 8)].map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-slate-100 rounded w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data?.items.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 9 : 8} className="px-4 py-12 text-center text-slate-500">
                  No leads found
                </td>
              </tr>
            ) : (
              groups.map((group) => (
                <GroupRows
                  key={group.key}
                  group={group}
                  isAdmin={isAdmin}
                  selected={selected}
                  onToggle={toggleOne}
                  onLeadClick={(id) => router.push(`/pipeline/leads/${id}`)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
      {data && data.total_pages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
          <p className="text-xs text-slate-500">
            Showing {data.items.length} of {formatNumber(data.total)} leads
          </p>
          <div className="flex gap-2">
            <button
              disabled={data.page <= 1}
              onClick={() => setParams({ ...params, page: String(data.page - 1) })}
              className="px-3 py-1 text-xs bg-white border border-slate-200 rounded-lg disabled:opacity-30 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            >
              Previous
            </button>
            <button
              disabled={data.page >= data.total_pages}
              onClick={() => setParams({ ...params, page: String(data.page + 1) })}
              className="px-3 py-1 text-xs bg-white border border-slate-200 rounded-lg disabled:opacity-30 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
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

function GroupRows({
  group,
  isAdmin,
  selected,
  onToggle,
  onLeadClick,
}: {
  group: Group
  isAdmin: boolean
  selected: Set<string>
  onToggle: (id: string) => void
  onLeadClick: (id: string) => void
}) {
  return (
    <>
      <tr className="border-b border-slate-200 bg-slate-50">
        <td colSpan={isAdmin ? 9 : 8} className="px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-[#41808B]" />
            {group.info ? (
              <>
                <span className="text-xs font-semibold text-slate-700 truncate">{group.info.query}</span>
                {group.info.created_at && (
                  <span className="text-[11px] text-slate-400 whitespace-nowrap">
                    {formatDate(group.info.created_at)}
                  </span>
                )}
              </>
            ) : (
              <span className="text-xs font-semibold text-slate-500">Other / Unknown search</span>
            )}
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 ml-auto whitespace-nowrap">
              {group.leads.length} lead{group.leads.length === 1 ? "" : "s"}
            </span>
          </div>
        </td>
      </tr>
      {group.leads.map((lead) => (
        <tr
          key={lead.id}
          onClick={() => {
            if (isAdmin) {
              onToggle(lead.id)
            } else {
              onLeadClick(lead.id)
            }
          }}
          className={`border-b border-slate-100 transition-colors cursor-pointer ${
            selected.has(lead.id) ? "bg-orange-50" : "hover:bg-slate-50"
          }`}
        >
          {isAdmin && (
            <td className="px-4 py-3">
              <input
                type="checkbox"
                checked={selected.has(lead.id)}
                onChange={() => onToggle(lead.id)}
                onClick={(e) => e.stopPropagation()}
                className="accent-[#F46036]"
              />
            </td>
          )}
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
            <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">
              {STAGE_LABELS[lead.pipeline_stage] || lead.pipeline_stage}
            </span>
          </td>
          <td className="px-4 py-3">
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${getScoreBgColor(lead.lead_score)}`}>
              {formatNumber(lead.lead_score)}
            </span>
          </td>
          <td className="px-4 py-3 text-slate-600">{lead.industry || "—"}</td>
          <td className="px-4 py-3 text-slate-700">${formatNumber(lead.deal_value)}</td>
          <td className="px-4 py-3">
            {lead.assigned_user_name ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-[#41808B]">
                <span className="w-4 h-4 rounded-full bg-[#57A3AF]/25 flex items-center justify-center text-[8px] font-bold">
                  {lead.assigned_user_name.charAt(0).toUpperCase()}
                </span>
                {lead.assigned_user_name}
              </span>
            ) : (
              <span className="text-xs text-slate-500">Unassigned</span>
            )}
          </td>
          <td className="px-4 py-3">
            <span className={lead.email_status === "verified" ? "text-green-700 font-medium" : "text-slate-600"}>
              {lead.email_status}
            </span>
          </td>
          <td className="px-4 py-3 text-slate-500">{formatRelativeTime(lead.last_activity_at)}</td>
        </tr>
      ))}
    </>
  )
}

function Th({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <th
      onClick={onClick}
      className={`px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider ${
        onClick ? "cursor-pointer hover:text-[#F46036] transition-colors" : ""
      }`}
    >
      <span className="inline-flex items-center gap-1">{children}</span>
    </th>
  )
}