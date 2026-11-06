"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Archive, Building2, Globe, Inbox, Loader2, Mail, MapPin, Phone, RotateCcw, Search } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LeadSearchForm } from "@/components/pipeline/lead-search-form"
import { api } from "@/lib/api"
import { STAGE_LABELS } from "@/lib/constants"

const LEADS_PAGE_SIZE = 50
const MAX_GENERATED_LEADS = 15

type SearchItem = {
  id: string
  query: string
  status: string
  mode: string | null
  department_id: string | null
  department_name: string | null
  max_leads: number
  leads_returned: number
  lead_count: number
  created_at: string
}

type GeneratedLead = {
  id: string
  business_name: string
  contact_name: string | null
  contact_job_title: string | null
  contact_linkedin_url: string | null
  contact_headline: string | null
  contact_seniority: string | null
  email: string | null
  phone: string | null
  website: string | null
  address: string | null
  organization: string | null
  department_name: string | null
  pipeline_stage: string
}

function ModePill({ mode }: { mode: string | null }) {
  if (!mode) return null
  const person = mode === "person"
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${person ? "bg-orange-50 text-[#F46036]" : "bg-[#57A3AF]/10 text-[#41808B]"}`}>
      {person ? "Person" : "Company"}
    </span>
  )
}

export default function LeadGeneratorPage() {
  const [items, setItems] = useState<SearchItem[]>([])
  const [selected, setSelected] = useState<SearchItem | null>(null)
  const [pendingSelection, setPendingSelection] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [archived, setArchived] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [rerunning, setRerunning] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [leadState, setLeadState] = useState<{ key: string; leads: GeneratedLead[]; pages: number; error: string | null } | null>(null)
  const [leadPage, setLeadPage] = useState(1)
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([])
  const [enriching, setEnriching] = useState(false)
  const [enrichError, setEnrichError] = useState<string | null>(null)
  const requestId = useRef(0)
  const router = useRouter()
  const selectedId = selected?.id
  const leadKey = selected ? `${selected.id}:${selected.status}:${selected.lead_count}:${leadPage}` : ""
  const leads = leadState?.key === leadKey ? leadState.leads : []
  const leadPages = leadState?.key === leadKey ? leadState.pages : 1
  const leadError = leadState?.key === leadKey ? leadState.error : null
  const leadsLoading = !!selected && leadState?.key !== leadKey

  const loadHistory = useCallback(() => {
    const id = ++requestId.current
    return api.listSearches({ page: String(page), page_size: "20", archived: String(archived) }).then((result) => {
      if (id !== requestId.current) return
      if (page > result.total_pages) { setPage(result.total_pages); return }
      const records: SearchItem[] = result.items
      setItems(records)
      setTotalPages(result.total_pages)
      setHistoryError(null)
      setSelected((current) => records.find((item) => item.id === current?.id) || current)
      if (pendingSelection) {
        const match = records.find((item) => item.id === pendingSelection)
        if (match) { setSelected(match); setPendingSelection(null); setLeadPage(1) }
      }
    }).catch((err: unknown) => {
      if (id === requestId.current) setHistoryError(err instanceof Error ? err.message : "Failed to load search history.")
    }).finally(() => {
      if (id === requestId.current) setLoading(false)
    })
  }, [page, archived, pendingSelection])

  useEffect(() => {
    const counter = requestId
    void loadHistory()
    return () => { counter.current++ }
  }, [loadHistory, revision])

  useEffect(() => {
    if (!generating && !rerunning && !items.some((item) => item.status === "running" || item.status === "pending")) return
    const interval = setInterval(() => void loadHistory(), 5000)
    return () => clearInterval(interval)
  }, [generating, rerunning, items, loadHistory])

  useEffect(() => {
    if (!selectedId) return
    let active = true
    api.listLeads({ search_id: selectedId, page: String(leadPage), page_size: String(LEADS_PAGE_SIZE) })
      .then((result) => {
        if (active) setLeadState({ key: leadKey, leads: result.items, pages: result.total_pages, error: null })
      })
      .catch((err: unknown) => {
        if (active) setLeadState({ key: leadKey, leads: [], pages: 1, error: err instanceof Error ? err.message : "Failed to load leads." })
      })
    return () => { active = false }
  }, [selectedId, leadKey, leadPage])

  function selectSearch(item: SearchItem) {
    setSelected(item)
    setLeadPage(1)
    setSelectedLeadIds([])
    setEnrichError(null)
  }

  function toggleLead(id: string) {
    setSelectedLeadIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    )
  }

  async function enrichSelected() {
    if (selectedLeadIds.length === 0 || enriching) return
    const firstLeadId = selectedLeadIds[0]
    setEnriching(true)
    setEnrichError(null)
    try {
      await api.enrichLeadsBatch(selectedLeadIds)
      // Open the first selected lead so the fresh data is immediately visible.
      router.push(`/pipeline/leads/${firstLeadId}`)
    } catch (err) {
      setEnrichError(err instanceof Error ? err.message : "Enrichment failed.")
    } finally {
      setEnriching(false)
    }
  }

  function showNewSearch(id: string | null) {
    setArchived(false)
    setPage(1)
    setPendingSelection(id)
    setRevision((v) => v + 1)
  }

  async function rerun(item: SearchItem) {
    if (!item.department_id || !item.department_name) {
      setMessage("This historical search has no available product. Start a new search and select a product.")
      return
    }
    if (!Number.isInteger(item.max_leads) || item.max_leads < 1 || item.max_leads > MAX_GENERATED_LEADS) {
      setMessage(`This search requested ${item.max_leads} leads, which is outside the supported range of 1–${MAX_GENERATED_LEADS}. Start a new search with a supported quantity.`)
      return
    }
    setRerunning(item.id)
    setMessage(null)
    try {
      const result = await api.searchLeads({
        query: item.query,
        max_leads: item.max_leads,
        department_id: item.department_id,
        mode: item.mode === "person" || item.mode === "company" ? item.mode : undefined,
      })
      showNewSearch(result.search_id)
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Re-run failed.")
    } finally {
      setRerunning(null)
      setRevision((v) => v + 1)
    }
  }

  async function changeArchive(item: SearchItem) {
    if (!archived && !window.confirm(`Archive “${item.query}”? Its leads will remain available.`)) return
    setBusy(item.id)
    try {
      if (archived) await api.restoreSearch(item.id)
      else await api.deleteSearch(item.id)
      if (selected?.id === item.id) setSelected(null)
      setRevision((v) => v + 1)
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Could not update search history.")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="max-w-[1600px] mx-auto h-[calc(100dvh-8rem)] min-h-[480px] flex flex-col gap-4">
      {message && <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div>}
      {historyError && <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{historyError} <button onClick={() => void loadHistory()} className="underline">Retry</button></div>}
      <div className="grid grid-rows-2 lg:grid-rows-1 lg:grid-cols-2 flex-1 min-h-0 gap-5">
        <div className="flex flex-col min-h-0 min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="shrink-0 max-h-[65%] overflow-y-auto p-4 border-b border-slate-200">
            <h2 className="text-base font-semibold text-slate-900 mb-3">Generate Leads</h2>
            <LeadSearchForm
              onComplete={(result) => showNewSearch(result.search_id)}
              onGeneratingChange={(active) => { setGenerating(active); if (active) setMessage(null); else setRevision((v) => v + 1) }}
            />
          </div>
          <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-200">
            <div><h2 className="font-semibold text-slate-900">Search History</h2><p className="text-xs text-slate-500">Select a search to view its leads.</p></div>
            <button onClick={() => { setArchived(!archived); setPage(1); setItems([]); setSelected(null) }}
              className="inline-flex items-center gap-1.5 text-xs text-[#41808B] hover:text-[#F46036]">
              <Archive className="w-4 h-4" /> {archived ? "Active searches" : "Archived"}
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100">
            {loading && items.length === 0 ? <div className="p-6 text-sm text-slate-500">Loading history…</div> : historyError && items.length === 0 ? <div className="p-6 text-sm text-slate-500">Search history is unavailable.</div> : items.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500"><Inbox className="w-8 h-8 mx-auto mb-2 text-slate-300" />{archived ? "No archived searches." : "No searches yet."}</div>
            ) : items.map((item) => (
              <div key={item.id} className={`flex items-center gap-4 p-4 ${selected?.id === item.id ? "bg-[#57A3AF]/10" : "hover:bg-slate-50"}`}>
                <button onClick={() => selectSearch(item)} className="flex-1 min-w-0 text-left">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-semibold text-sm text-slate-900 break-words">{item.query}</span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      <ModePill mode={item.mode} />
                      {item.status !== "completed" && <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${item.status === "failed" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{item.status}</span>}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1.5">{item.department_name || "Unassigned product"} · {item.max_leads} requested · {item.leads_returned} generated</p>
                  <p className="text-xs text-slate-400 mt-1">{new Date(item.created_at).toLocaleString()}</p>
                </button>
                <div className="flex w-20 shrink-0 flex-col items-start gap-2">
                  {!archived && <button onClick={() => rerun(item)} disabled={!!rerunning || generating || item.status === "running" || item.status === "pending"}
                    className="inline-flex items-center gap-1 text-xs text-[#41808B] hover:text-[#F46036] disabled:opacity-40">
                    {rerunning === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />} Re-run
                  </button>}
                  <button onClick={() => changeArchive(item)} disabled={busy === item.id || item.status === "running" || item.status === "pending"}
                    className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-[#F46036] disabled:opacity-40">
                    {busy === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Archive className="w-3 h-3" />} {archived ? "Restore" : "Archive"}
                  </button>
                </div>
              </div>
            ))}
          </div>
          {totalPages > 1 && <div className="shrink-0 flex items-center justify-between px-5 py-3 border-t border-slate-200 text-xs text-slate-600">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="disabled:opacity-40">Previous</button>
            <span>Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="disabled:opacity-40">Next</button>
          </div>}
        </div>

        <div className="flex flex-col min-h-0 min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="shrink-0 p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-slate-900">Generated Leads</h2>
                <ModePill mode={selected?.mode ?? null} />
              </div>
              <p className="truncate text-sm text-slate-500 mt-1" title={selected ? `${selected.query} · ${selected.department_name || "Unassigned product"}` : undefined}>{selected ? `${selected.query} · ${selected.department_name || "Unassigned product"}` : "Choose a search from the history to view its leads."}</p>
              {enrichError && <p role="alert" className="mt-1 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{enrichError}</p>}
            </div>
            {selected && selected.lead_count > 0 && (
              <div className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => void enrichSelected()}
                  disabled={selectedLeadIds.length === 0 || enriching}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#F46036] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#d94e2a] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {enriching && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  Enrich selected{selectedLeadIds.length > 0 ? ` (${selectedLeadIds.length})` : ""}
                </button>
                <Link className="text-sm text-[#41808B] hover:text-[#F46036]" href={`/pipeline?search_id=${encodeURIComponent(selected.id)}&q=${encodeURIComponent(selected.query)}`}>View in Pipeline</Link>
              </div>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {!selected ? <div className="p-12 text-center text-sm text-slate-500"><Search className="w-9 h-9 mx-auto mb-3 text-slate-300" />No search selected.</div> :
              leadsLoading ? <p className="p-6 text-sm text-slate-500">Loading leads…</p> :
              leadError ? <p role="alert" className="p-6 text-sm text-red-700">{leadError}</p> :
              leads.length === 0 ? <p className="p-8 text-sm text-slate-500">{selected.status === "running" || selected.status === "pending" ? "Generation is in progress. Leads will appear when it finishes." : "No saved leads for this search."}</p> : (
                <ol start={(leadPage - 1) * LEADS_PAGE_SIZE + 1} className="divide-y divide-slate-100">
                  {leads.map((lead, index) => (
                    <li key={lead.id} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50">
                      <label className="flex shrink-0 items-center pt-0.5">
                        <input
                          type="checkbox"
                          checked={selectedLeadIds.includes(lead.id)}
                          onChange={() => toggleLead(lead.id)}
                          aria-label={`Select ${lead.business_name}`}
                          className="h-4 w-4 accent-[#F46036]"
                        />
                      </label>
                      <Link href={`/pipeline/leads/${lead.id}`} className="group flex min-w-0 flex-1 items-start gap-4 focus-visible:bg-slate-50 focus-visible:outline-2 focus-visible:outline-[#41808B]">
                        <span className="w-7 shrink-0 pt-0.5 text-sm font-semibold tabular-nums text-slate-500">{(leadPage - 1) * LEADS_PAGE_SIZE + index + 1}.</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-slate-900 group-hover:text-[#F46036]" title={lead.business_name}>{lead.business_name}</span>
                          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                            {lead.website && (
                              <span className="inline-flex items-center gap-1">
                                <Globe className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                                <span>{lead.website.replace(/^https?:\/\//, "")}</span>
                              </span>
                            )}
                            {lead.address && (
                              <span className="inline-flex items-center gap-1" title={lead.address}>
                                <MapPin className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                                <span>{lead.address}</span>
                              </span>
                            )}
                            {lead.organization && (
                              <span className="inline-flex items-center gap-1">
                                <Building2 className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                                <span>{lead.organization}</span>
                              </span>
                            )}
                            {lead.email && (
                              <span className="inline-flex items-center gap-1">
                                <Mail className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                                <span>{lead.email}</span>
                              </span>
                            )}
                            {lead.phone && (
                              <span className="inline-flex items-center gap-1">
                                <Phone className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                                <span>{lead.phone}</span>
                              </span>
                            )}
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                              {STAGE_LABELS[lead.pipeline_stage] || lead.pipeline_stage}
                            </span>
                          </span>
                          {lead.contact_name && (
                            <span className="mt-1 flex items-center gap-2 overflow-x-auto whitespace-nowrap text-xs text-slate-700">
                              {lead.contact_name !== lead.business_name && (
                                <span className="font-medium">Contact: {lead.contact_name}</span>
                              )}
                              {(lead.contact_headline || lead.contact_job_title) && (
                                <span>{lead.contact_headline || lead.contact_job_title}</span>
                              )}
                              {lead.contact_seniority && <span className="text-slate-500">{lead.contact_seniority}</span>}
                              {lead.contact_linkedin_url && (
                                <a href={lead.contact_linkedin_url} target="_blank" rel="noopener noreferrer"
                                  className="text-[#0a66c2] hover:underline font-medium">
                                  LinkedIn ↗
                                </a>
                              )}
                            </span>
                          )}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
          </div>
          {selected && leadPages > 1 && <div className="shrink-0 flex items-center justify-between px-5 py-3 border-t border-slate-200 text-xs text-slate-600">
            <button disabled={leadPage <= 1} onClick={() => setLeadPage(leadPage - 1)} className="disabled:opacity-40">Previous</button>
            <span>Page {leadPage} of {leadPages}</span>
            <button disabled={leadPage >= leadPages} onClick={() => setLeadPage(leadPage + 1)} className="disabled:opacity-40">Next</button>
          </div>}
        </div>
      </div>
    </div>
  )
}
