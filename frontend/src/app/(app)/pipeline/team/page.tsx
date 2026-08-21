"use client"

import { useCallback, useEffect, useState } from "react"
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  Calendar,
  Clock,
  Globe,
  Inbox,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react"
import Link from "next/link"
import { Avatar } from "@/components/shared/avatar"
import { api } from "@/lib/api"
import { getUser } from "@/lib/auth"
import { CONTACT_CHANNELS, CONTACT_OUTCOMES, PIPELINE_STAGES, STAGE_LABELS } from "@/lib/constants"
import { formatDate, formatRelativeTime } from "@/lib/utils"

type TeamLead = {
  id: string
  business_name: string
  website: string | null
  email: string | null
  phone: string | null
  pipeline_stage: string
  lead_score: number
  priority: string
  email_status: string
  next_followup_date: string | null
  last_activity_at: string | null
  assigned_user_id: string | null
  assigned_user_name: string | null
  created_at: string
}

type TeamUser = {
  id: string
  name: string
  email: string
  avatar_url: string | null
  is_admin: boolean
  is_active: boolean
  total: number
  by_stage: Record<string, number>
  leads: TeamLead[]
}

type TeamData = {
  users: TeamUser[]
  unassigned: { total: number; by_stage: Record<string, number>; leads: TeamLead[] }
}

export default function TeamPage() {
  const [team, setTeam] = useState<TeamData | null>(null)
  const [myLeads, setMyLeads] = useState<TeamLead[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const me = getUser()
  const isAdmin = me?.is_admin === true

  const load = useCallback(async () => {
    try {
      setLoading(true)
      if (isAdmin) {
        setTeam(await api.getTeamLeads())
      } else {
        const res = await api.listLeads({ assigned_to: "me", page_size: "200" })
        setMyLeads(res.items || [])
      }
    } catch (err: any) {
      setMsg({ ok: false, text: err.message || "Failed to load leads" })
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin])

  useEffect(() => {
    load()
  }, [load])

  function matchesQuery(lead: TeamLead): boolean {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return [lead.business_name, lead.website, lead.email, lead.phone, lead.assigned_user_name]
      .filter(Boolean)
      .some((v) => (v as string).toLowerCase().includes(q))
  }

  function patchLeadStage(id: string, stage: string) {
    const patch = (lead: TeamLead) => (lead.id === id ? { ...lead, pipeline_stage: stage } : lead)
    setTeam((prev) =>
      prev
        ? {
            users: prev.users.map((u) => ({ ...u, leads: u.leads.map(patch) })),
            unassigned: { ...prev.unassigned, leads: prev.unassigned.leads.map(patch) },
          }
        : prev
    )
    setMyLeads((prev) => (prev ? prev.map(patch) : prev))
  }

  const allLeads: { lead: TeamLead; user?: TeamUser }[] = []
  if (isAdmin && team) {
    for (const u of team.users) for (const l of u.leads) allLeads.push({ lead: l, user: u })
    for (const l of team.unassigned.leads) allLeads.push({ lead: l })
  } else if (myLeads) {
    for (const l of myLeads) allLeads.push({ lead: l })
  }
  const visibleLeads = allLeads.filter(({ lead }) => matchesQuery(lead))

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-0 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Left pane: lead list */}
      <div className={`w-full lg:w-[400px] xl:w-[440px] shrink-0 flex flex-col min-h-0 border-r border-slate-200 ${selectedId ? "hidden lg:flex" : "flex"}`}>
        <div className="p-4 border-b border-slate-200 space-y-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {isAdmin ? "Assigned leads per user" : "Leads assigned to you"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAdmin ? "Select a lead to view details" : "Everything you own across the pipeline"}
            </p>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search leads, emails, phones…"
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#F46036] transition-colors"
            />
          </div>
          {msg && (
            <div
              className={`text-xs rounded-lg px-3 py-2 border ${
                msg.ok
                  ? "text-green-700 bg-green-50 border-green-200"
                  : "text-red-700 bg-red-50 border-red-200"
              }`}
            >
              {msg.text}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="space-y-3 p-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : isAdmin && team ? (
            <>
              {team.users.map((u) => {
                const visible = u.leads.filter(matchesQuery)
                return (
                  <section key={u.id}>
                    <header className="sticky top-0 z-10 flex items-center gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100">
                      <Avatar name={u.name} src={u.avatar_url} className="w-6 h-6" />
                      <p className="text-xs font-semibold text-slate-700 truncate">{u.name}</p>
                      {u.id === me?.id && <span className="text-[10px] text-slate-400">(you)</span>}
                      {u.is_admin && <ShieldCheck className="w-3 h-3 text-violet-500" />}
                      <span className="ml-auto text-[11px] text-slate-400">{visible.length}</span>
                    </header>
                    {visible.length === 0 ? (
                      <p className="px-4 py-3 text-xs text-slate-400">
                        {u.total === 0 ? "No leads assigned" : "No leads match your search"}
                      </p>
                    ) : (
                      visible.map((lead) => (
                        <LeadRow key={lead.id} lead={lead} selected={lead.id === selectedId} onSelect={() => setSelectedId(lead.id)} />
                      ))
                    )}
                  </section>
                )
              })}
              <section>
                <header className="sticky top-0 z-10 flex items-center gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100">
                  <Inbox className="w-3.5 h-3.5 text-slate-400" />
                  <p className="text-xs font-semibold text-slate-700">Unassigned</p>
                  <span className="ml-auto text-[11px] text-slate-400">{team.unassigned.leads.filter(matchesQuery).length}</span>
                </header>
                {team.unassigned.leads.filter(matchesQuery).length === 0 ? (
                  <p className="px-4 py-3 text-xs text-slate-400">
                    {team.unassigned.total === 0 ? "No unassigned leads" : "No leads match your search"}
                  </p>
                ) : (
                  team.unassigned.leads.filter(matchesQuery).map((lead) => (
                    <LeadRow key={lead.id} lead={lead} selected={lead.id === selectedId} onSelect={() => setSelectedId(lead.id)} />
                  ))
                )}
              </section>
            </>
          ) : myLeads ? (
            myLeads.length === 0 ? (
              <div className="py-14 text-center">
                <UserRound className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="mt-3 text-sm text-slate-500">No leads assigned to you yet</p>
                <p className="text-xs text-slate-400 mt-1">Leads will appear here once your admin assigns them</p>
              </div>
            ) : (
              myLeads.filter(matchesQuery).map((lead) => (
                <LeadRow key={lead.id} lead={lead} selected={lead.id === selectedId} onSelect={() => setSelectedId(lead.id)} />
              ))
            )
          ) : null}
        </div>
      </div>

      {/* Right pane: lead detail */}
      <div className={`flex-1 min-w-0 flex-col min-h-0 ${selectedId ? "flex" : "hidden lg:flex"}`}>
        {selectedId ? (
          <LeadDetailPane
            key={selectedId}
            leadId={selectedId}
            onBack={() => setSelectedId(null)}
            onStageMoved={(stage) => patchLeadStage(selectedId, stage)}
          />
        ) : (
          <EmptyDetailState count={visibleLeads.length} />
        )}
      </div>
    </div>
  )
}

function EmptyDetailState({ count }: { count: number }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
        <Building2 className="w-6 h-6 text-slate-300" />
      </div>
      <p className="mt-4 text-sm font-medium text-slate-600">Select a lead to view details</p>
      <p className="mt-1 text-xs text-slate-400">
        {count > 0 ? "Click any lead on the left — details open here instantly" : "No leads match your search"}
      </p>
    </div>
  )
}

function LeadRow({ lead, selected, onSelect }: { lead: TeamLead; selected: boolean; onSelect: () => void }) {
  const color = stageColor(lead.pipeline_stage)
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left flex items-center gap-3 px-4 py-3 border-l-2 transition-colors ${
        selected
          ? "bg-[#57A3AF]/10 border-[#41808B]"
          : "border-transparent hover:bg-slate-50"
      }`}
    >
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium truncate ${selected ? "text-[#41808B]" : "text-slate-900"}`}>
          {lead.business_name}
        </p>
        <p className="text-xs text-slate-500 truncate">
          {lead.email || lead.phone || lead.website || "—"}
        </p>
      </div>
      <span className="text-xs font-bold text-slate-900 tabular-nums shrink-0">
        {lead.lead_score}
        <span className="text-slate-400 font-normal">/100</span>
      </span>
    </button>
  )
}

function toLocalInput(d: Date): string {
  const shifted = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return shifted.toISOString().slice(0, 16)
}

const EMPTY_LOG_FORM = {
  activity_type: "call",
  outcome: "no_answer",
  summary: "",
  next_followup_at: "",
}

function LeadDetailPane({
  leadId,
  onBack,
  onStageMoved,
}: {
  leadId: string
  onBack: () => void
  onStageMoved: (stage: string) => void
}) {
  const [lead, setLead] = useState<any>(null)
  const [contacts, setContacts] = useState<any[]>([])
  const [timeline, setTimeline] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [movingStage, setMovingStage] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [logForm, setLogForm] = useState({ ...EMPTY_LOG_FORM })
  const [savingLog, setSavingLog] = useState(false)
  const [logMsg, setLogMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const refreshDetail = useCallback(async () => {
    const [leadData, , timelineData] = await Promise.all([
      api.getLead(leadId),
      Promise.resolve(null),
      api.getLeadTimeline(leadId).catch(() => []),
    ])
    setLead(leadData)
    setTimeline(timelineData || [])
    return leadData
  }, [leadId])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [leadData, contactData, timelineData] = await Promise.all([
          api.getLead(leadId),
          api.getLeadContacts(leadId).catch(() => []),
          api.getLeadTimeline(leadId).catch(() => []),
        ])
        if (cancelled) return
        setLead(leadData)
        setContacts(contactData || [])
        setTimeline(timelineData || [])
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Failed to load lead")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [leadId])

  async function handleLogContact(e: React.FormEvent) {
    e.preventDefault()
    if (!lead) return
    setSavingLog(true)
    setLogMsg(null)
    const prevStage = lead.pipeline_stage
    try {
      const body: any = {
        activity_type: logForm.activity_type,
        outcome: logForm.outcome,
        summary: logForm.summary || null,
      }
      if (logForm.next_followup_at) body.next_followup_at = new Date(logForm.next_followup_at).toISOString()
      await api.createContactActivity(lead.id, body)
      const updated = await refreshDetail()
      setLogForm({ ...EMPTY_LOG_FORM })
      if (updated.pipeline_stage !== prevStage) {
        onStageMoved(updated.pipeline_stage)
        window.dispatchEvent(new Event("pipeline:changed"))
      }
      setLogMsg({
        ok: true,
        text:
          updated.pipeline_stage !== prevStage
            ? `Logged — lead moved to "${STAGE_LABELS[updated.pipeline_stage] || updated.pipeline_stage}"`
            : "Contact logged",
      })
    } catch (err: any) {
      setLogMsg({ ok: false, text: err.message || "Failed to log contact" })
    } finally {
      setSavingLog(false)
    }
  }

  async function handleStageMove(stage: string) {
    if (!lead || !stage || stage === lead.pipeline_stage) return
    setMovingStage(true)
    try {
      await api.moveLeadStage(lead.id, stage)
      const updated = await refreshDetail()
      onStageMoved(stage)
      window.dispatchEvent(new Event("pipeline:changed"))
      setError(updated ? null : "Failed to reload lead")
    } catch (err: any) {
      setError(err.message || "Failed to move lead")
    } finally {
      setMovingStage(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-6 space-y-5 animate-pulse">
        <div className="h-8 bg-slate-100 rounded w-1/2" />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-lg" />
          ))}
        </div>
        <div className="h-40 bg-slate-100 rounded-lg" />
      </div>
    )
  }

  if (error || !lead) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <p className="text-sm text-red-600">{error || "Lead not found"}</p>
        <button onClick={onBack} className="mt-3 text-xs text-[#41808B] hover:text-[#F46036]">
          Back to list
        </button>
      </div>
    )
  }

  const stageColorValue = stageColor(lead.pipeline_stage)

  return (
    <div className="flex-1 overflow-y-auto min-h-0">
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-5 py-3 flex items-center gap-3">
        <button onClick={onBack} className="lg:hidden p-1.5 -ml-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-slate-900 truncate">{lead.business_name}</h2>
          {lead.website && (
            <a
              href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[#41808B] hover:text-[#F46036] transition-colors truncate max-w-full"
            >
              <Globe className="w-3 h-3 shrink-0" />
              <span className="truncate">{lead.website}</span>
            </a>
          )}
        </div>
        <Link
          href={`/pipeline/leads/${lead.id}`}
          className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:text-[#F46036] hover:border-[#F46036]/40 transition-colors"
        >
          Full page
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
        <button onClick={onBack} className="hidden lg:block p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
            style={{ background: `${stageColorValue}1f`, color: stageColorValue }}
          >
            {STAGE_LABELS[lead.pipeline_stage] || lead.pipeline_stage.replace(/_/g, " ")}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] capitalize">
            {lead.priority || "medium"} priority
          </span>
          <span className="text-sm font-bold text-slate-900 tabular-nums">
            {lead.lead_score}
            <span className="text-slate-400 font-normal text-xs">/100</span>
          </span>
          <div className="ml-auto flex items-center gap-2">
            {movingStage && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
            <select
              value={lead.pipeline_stage}
              onChange={(e) => handleStageMove(e.target.value)}
              disabled={movingStage}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-[#F46036] disabled:opacity-50"
            >
              {PIPELINE_STAGES.map((s) => (
                <option key={s.value} value={s.value}>
                  Move to: {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InfoRow icon={Mail} label="Email" value={lead.email} href={lead.email ? `mailto:${lead.email}` : undefined} />
          <InfoRow icon={Phone} label="Phone" value={lead.phone} href={lead.phone ? `tel:${lead.phone}` : undefined} />
          <InfoRow icon={MapPin} label="Location" value={[lead.city, lead.state, lead.country].filter(Boolean).join(", ") || null} />
          <InfoRow icon={Building2} label="Industry" value={lead.industry} />
          <InfoRow icon={UserRound} label="Assigned to" value={lead.assigned_user_name} />
          <InfoRow icon={Calendar} label="Next follow-up" value={lead.next_followup_date ? formatDate(lead.next_followup_date) : null} />
          <InfoRow icon={Clock} label="Last activity" value={lead.last_activity_at ? formatRelativeTime(lead.last_activity_at) : null} />
          <InfoRow icon={Calendar} label="Created" value={lead.created_at ? formatDate(lead.created_at) : null} />
        </div>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Log contact
          </h3>
          <form onSubmit={handleLogContact} className="rounded-lg border border-slate-200 p-3.5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Channel</label>
                <select
                  value={logForm.activity_type}
                  onChange={(e) => setLogForm({ ...logForm, activity_type: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#F46036]"
                >
                  {CONTACT_CHANNELS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Outcome</label>
                <select
                  value={logForm.outcome}
                  onChange={(e) => setLogForm({ ...logForm, outcome: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#F46036]"
                >
                  {CONTACT_OUTCOMES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Summary</label>
              <textarea
                value={logForm.summary}
                onChange={(e) => setLogForm({ ...logForm, summary: e.target.value })}
                rows={2}
                placeholder="What happened on this touchpoint?"
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#F46036] resize-none"
              />
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[160px]">
                <label className="block text-[11px] text-slate-400 mb-1">Next follow-up</label>
                <input
                  type="datetime-local"
                  value={logForm.next_followup_at}
                  onChange={(e) => setLogForm({ ...logForm, next_followup_at: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#F46036]"
                />
              </div>
              <button
                type="submit"
                disabled={savingLog}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#F46036] hover:bg-[#D94A22] disabled:opacity-50 text-white text-xs font-semibold transition-colors"
              >
                {savingLog && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Log contact
              </button>
            </div>
            {logMsg && (
              <p className={`text-xs ${logMsg.ok ? "text-green-700" : "text-red-600"}`}>{logMsg.text}</p>
            )}
          </form>
        </section>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Contacts ({contacts.length})
          </h3>
          {contacts.length === 0 ? (
            <p className="text-sm text-slate-400 border border-dashed border-slate-200 rounded-lg px-4 py-3">
              No contacts found for this lead
            </p>
          ) : (
            <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 overflow-hidden">
              {contacts.map((c) => (
                <div key={c.id} className="flex items-center gap-3 px-4 py-2.5">
                  <Avatar name={c.name} className="w-7 h-7" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {c.name}
                      {c.is_primary && <span className="ml-2 text-[10px] text-[#41808B] font-semibold">PRIMARY</span>}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{[c.job_title, c.email, c.phone].filter(Boolean).join(" · ") || "—"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Recent activity
          </h3>
          {timeline.length === 0 ? (
            <p className="text-sm text-slate-400 border border-dashed border-slate-200 rounded-lg px-4 py-3">
              No timeline events yet
            </p>
          ) : (
            <div className="space-y-0 rounded-lg border border-slate-200 overflow-hidden divide-y divide-slate-100">
              {timeline.slice(0, 12).map((event) => (
                <div key={event.id} className="flex items-start gap-3 px-4 py-2.5">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#57A3AF] shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-700 capitalize">
                      {(event.event_type || "").replace(/_/g, " ")}
                    </p>
                    {event.description && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{event.description}</p>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0">
                    {formatRelativeTime(event.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof Mail
  label: string
  value: string | null | undefined
  href?: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/60 px-3.5 py-2.5">
      <Icon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[11px] text-slate-400">{label}</p>
        {value ? (
          href ? (
            <a href={href} className="text-sm text-slate-900 hover:text-[#F46036] transition-colors truncate block">
              {value}
            </a>
          ) : (
            <p className="text-sm text-slate-900 truncate">{value}</p>
          )
        ) : (
          <p className="text-sm text-slate-300">—</p>
        )}
      </div>
    </div>
  )
}

function stageColor(stage: string): string {
  return PIPELINE_STAGES.find((s) => s.value === stage)?.color || "#64748b"
}