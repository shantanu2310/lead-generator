"use client"

import { useEffect, useState } from "react"

import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Mail, Phone, Globe, MapPin, Map, Target, TrendingUp, Building2, Users, UserCheck, UserPlus, UserX, Loader2, PhoneCall, CalendarClock } from "lucide-react"
import { AuthGuard } from "@/components/auth/auth-guard"
import { api } from "@/lib/api"
import { getUser } from "@/lib/auth"
import { CONTACT_CHANNELS, CONTACT_OUTCOMES, outcomeStyle, outcomeTargetStage, PIPELINE_STAGES, STAGE_LABELS, CALL_ATTEMPT_OUTCOMES } from "@/lib/constants"
import { formatNumber, formatDate } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { LeadTimeline } from "@/components/pipeline/pipeline-timeline"

const outcomeOptions = CONTACT_OUTCOMES.map((o) => (
  <option key={o.value} value={o.value}>
    {o.label}
  </option>
))

const stageOptions = PIPELINE_STAGES.map((o) => (
  <option key={o.value} value={o.value}>
    {o.label}
  </option>
))

function toLocalInput(d: Date): string {
  const shifted = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return shifted.toISOString().slice(0, 16)
}

const EMPTY_LOG_FORM = {
  activity_type: "call",
  contacted_at: "",
  outcome: "no_answer",
  next_followup_at: "",
  summary: "",
}

export default function LeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const me = getUser()
  const [lead, setLead] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [logForm, setLogForm] = useState({ ...EMPTY_LOG_FORM, contacted_at: toLocalInput(new Date()) })
  const [savingLog, setSavingLog] = useState(false)
  const [movingStage, setMovingStage] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const isAdmin = me?.is_admin === true
  const isAssignee = lead?.assigned_user_id === me?.id

  useEffect(() => {
    if (me?.is_admin) {
      api.listUsers().then(setUsers).catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    async function fetch() {
      try {
        const data = await api.getLead(params.id as string)
        setLead(data)
        setActivities(await api.getContactActivities(params.id as string))
      } catch (err) {
        console.error("Failed to fetch lead", err)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [params.id])

  async function handleAssign(userId: string | null) {
    setAssigning(true)
    setMsg(null)
    try {
      const updated = await api.assignLead(lead.id, userId)
      setLead(updated)
    } catch (err: any) {
      setMsg({ ok: false, text: err.message || "Failed to update assignment" })
    } finally {
      setAssigning(false)
    }
  }

  async function handleLogContact(e: React.FormEvent) {
    e.preventDefault()
    setSavingLog(true)
    setMsg(null)
    const prevStage = lead.pipeline_stage
    try {
      const body: any = {
        activity_type: logForm.activity_type,
        outcome: logForm.outcome,
        summary: logForm.summary || null,
      }
      if (logForm.contacted_at) body.contacted_at = new Date(logForm.contacted_at).toISOString()
      if (logForm.next_followup_at) body.next_followup_at = new Date(logForm.next_followup_at).toISOString()
      const created = await api.createContactActivity(lead.id, body)
      setActivities((prev) => [created, ...prev])
      const updatedLead = await api.getLead(lead.id)
      setLead(updatedLead)
      setLogForm({ ...EMPTY_LOG_FORM, contacted_at: toLocalInput(new Date()) })
      if (updatedLead.pipeline_stage !== prevStage) {
        const label = STAGE_LABELS[updatedLead.pipeline_stage] || updatedLead.pipeline_stage
        setMsg({ ok: true, text: `Logged — lead moved to "${label}"` })
      }
    } catch (err: any) {
      setMsg({ ok: false, text: err.message || "Failed to log contact" })
    } finally {
      setSavingLog(false)
    }
  }

  async function handleMoveStage(stage: string) {
    setMovingStage(true)
    setMsg(null)
    try {
      await api.moveLeadStage(lead.id, stage)
      const updatedLead = await api.getLead(lead.id)
      setLead(updatedLead)
      setMsg({ ok: true, text: `Lead moved to "${STAGE_LABELS[stage] || stage}"` })
    } catch (err: any) {
      setMsg({ ok: false, text: err.message || "Failed to move lead" })
    } finally {
      setMovingStage(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto animate-pulse space-y-6">
        <div className="h-8 bg-white/5 rounded w-1/3" />
        <div className="grid grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-white/5 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-white/5 rounded-xl" />
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="p-8 max-w-5xl mx-auto text-center">
        <p className="text-gray-500">Lead not found</p>
      </div>
    )
  }

  return (
    <AuthGuard>
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{lead.business_name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-gray-400">Stage:</span>
            <select
              value={lead.pipeline_stage}
              onChange={(e) => handleMoveStage(e.target.value)}
              disabled={movingStage}
              className="px-3 py-1.5 bg-[#0f172a] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-40 transition-colors"
            >
              {stageOptions}
            </select>
            {movingStage && <Loader2 className="w-4 h-4 animate-spin text-blue-400" />}
          </div>
          <p className="text-gray-400 mt-1">
            Score: {lead.lead_score}
            {" · "}AI: {(lead.ai_confidence * 100).toFixed(0)}%
          </p>
        </div>
        {lead.company_logo_url && (
          <img src={lead.company_logo_url} alt="" className="w-16 h-16 rounded-xl bg-white/5 object-contain" />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-start gap-3">
            <Globe className="w-5 h-5 text-blue-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500 mb-1">Website</p>
              <p className="text-sm text-white truncate max-w-[200px]">
                {lead.website ? (
                  <a href={lead.website} target="_blank" className="hover:text-blue-400 transition-colors">
                    {lead.website.replace("https://", "").replace("http://", "")}
                  </a>
                ) : "—"}
              </p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-green-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500 mb-1">Email</p>
              <p className={`text-sm ${lead.email ? "text-white" : "text-gray-500"}`}>
                {lead.email || "—"}
              </p>
              {lead.email && (
                <span className={`text-xs ${lead.email_verified ? "text-green-400" : "text-yellow-400"}`}>
                  {lead.email_verified ? "Verified" : "Pending"}
                </span>
              )}
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start gap-3">
            <Phone className="w-5 h-5 text-purple-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500 mb-1">Phone</p>
              {lead.phone ? (
                <a
                  href={`tel:${lead.phone}`}
                  className="inline-flex items-center gap-2 text-sm text-white hover:text-blue-400 transition-colors"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  {lead.phone}
                </a>
              ) : (
                <p className="text-sm text-white">—</p>
              )}
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-white">Assigned To</h3>
          </div>
          {isAdmin && lead.assigned_user_id && (
            <button
              onClick={() => handleAssign(null)}
              disabled={assigning}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 disabled:opacity-40 transition-colors"
            >
              <UserX className="w-3.5 h-3.5" />
              Unassign
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
              <UserCheck className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">
                {lead.assigned_user_name || "Unassigned"}
              </p>
              <p className="text-xs text-gray-500">
                {lead.assigned_user_name ? (
                  isAssignee ? "Assigned to you" : "Owner of this lead"
                ) : "No owner yet — anyone can log contacts"}
              </p>
            </div>
          </div>

          {isAdmin ? (
            <select
              value={lead.assigned_user_id || ""}
              onChange={(e) => handleAssign(e.target.value || null)}
              disabled={assigning}
              className="px-3 py-2 bg-[#0f172a] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-40 transition-colors"
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          ) : !lead.assigned_user_id ? (
            <button
              onClick={() => handleAssign(me?.id || null)}
              disabled={assigning}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-400 disabled:opacity-40 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Claim this lead
            </button>
          ) : null}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <h3 className="font-semibold text-white mb-4">Company Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <DetailRow icon={Building2} label="Industry" value={lead.industry} />
              <DetailRow icon={Users} label="Employees" value={lead.employee_count ? formatNumber(lead.employee_count) : null} />
              <DetailRow icon={TrendingUp} label="Revenue" value={lead.revenue} />
              <DetailRow icon={MapPin} label="Location" value={lead.address || [lead.city, lead.state, lead.country].filter(Boolean).join(", ") || null} />
              <DetailRow icon={Target} label="Deal Value" value={lead.deal_value ? `$${formatNumber(lead.deal_value)}` : null} />
              <DetailRow icon={Target} label="Priority" value={lead.priority} />
            </div>
          </Card>

          <LocationMap lead={lead} />

          <Card>
            <h3 className="font-semibold text-white mb-4">Verification Status</h3>
            <div className="grid grid-cols-2 gap-3">
              <StatusBadge label="Business Active" active={lead.business_active} />
              <StatusBadge label="Website Verified" active={lead.website_identity_verified} />
              <StatusBadge label="Email Verified" active={lead.email_verified} />
              <StatusBadge label="Phone Verified" active={lead.phone_cross_verified} />
              <StatusBadge label="Location Match" active={lead.location_match} />
            </div>
          </Card>

          {lead.contacts && lead.contacts.length > 0 && (
            <Card>
              <h3 className="font-semibold text-white mb-4">Contacts</h3>
              <div className="space-y-3">
                {lead.contacts.map((contact: any) => (
                  <div key={contact.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <div>
                      <p className="text-sm font-medium text-white">
                        {contact.name}
                        {contact.is_primary && <span className="text-xs text-blue-400 ml-2">Primary</span>}
                      </p>
                      {contact.job_title && <p className="text-xs text-gray-400">{contact.job_title}</p>}
                    </div>
                    <div className="text-right text-xs text-gray-400">
                      {contact.email && <p>{contact.email}</p>}
                      {contact.phone && (
                        <a href={`tel:${contact.phone}`} className="text-white hover:text-blue-400 transition-colors">
                          {contact.phone}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div>
          <Card>
            <h3 className="font-semibold text-white mb-4">Timeline</h3>
            <LeadTimeline leadId={lead.id} />
          </Card>
        </div>
      </div>

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <PhoneCall className="w-5 h-5 text-green-400" />
          <h3 className="font-semibold text-white">Contact Log</h3>
          <div className="ml-auto flex items-center gap-2">
            {(() => {
              const callAttempts = activities.filter(
                (a) => a.activity_type === "call" && CALL_ATTEMPT_OUTCOMES.includes(a.outcome)
              ).length
              return callAttempts > 0 ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-medium">
                  {callAttempts} call attempt{callAttempts > 1 ? "s" : ""}
                </span>
              ) : null
            })()}
            <span className="text-xs text-gray-500">{activities.length} activit{activities.length === 1 ? "y" : "ies"}</span>
          </div>
        </div>

        {msg && (
          <div
            className={`mb-4 text-sm rounded-lg px-4 py-2.5 border ${
              msg.ok
                ? "text-green-400 bg-green-500/10 border-green-500/20"
                : "text-red-400 bg-red-500/10 border-red-500/20"
            }`}
          >
            {msg.text}
          </div>
        )}

        <form onSubmit={handleLogContact} className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Channel</label>
              <select
                value={logForm.activity_type}
                onChange={(e) => setLogForm({ ...logForm, activity_type: e.target.value })}
                className="w-full px-3 py-2.5 bg-[#0f172a] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              >
                {CONTACT_CHANNELS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Contacted At</label>
              <input
                type="datetime-local"
                value={logForm.contacted_at}
                onChange={(e) => setLogForm({ ...logForm, contacted_at: e.target.value })}
                required
                className="w-full px-3 py-2.5 bg-[#0f172a] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Result</label>
              <select
                value={logForm.outcome}
                onChange={(e) => setLogForm({ ...logForm, outcome: e.target.value })}
                className="w-full px-3 py-2.5 bg-[#0f172a] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              >
                {outcomeOptions}
              </select>
              {outcomeTargetStage(logForm.outcome) && (
                <label className="block text-xs text-blue-400 mt-1.5">
                  Moves lead to: {outcomeTargetStage(logForm.outcome)}
                </label>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Next Follow-up (optional)</label>
              <input
                type="datetime-local"
                value={logForm.next_followup_at}
                onChange={(e) => setLogForm({ ...logForm, next_followup_at: e.target.value })}
                className="w-full px-3 py-2.5 bg-[#0f172a] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <input
              value={logForm.summary}
              onChange={(e) => setLogForm({ ...logForm, summary: e.target.value })}
              placeholder="Notes — what happened, what was said…"
              className="flex-1 px-4 py-2.5 bg-[#0f172a] border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button
              type="submit"
              disabled={savingLog}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {savingLog && <Loader2 className="w-4 h-4 animate-spin" />}
              Log Contact
            </button>
          </div>
        </form>

        <div className="mt-4 space-y-3">
          {activities.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-6">
              No contact attempts logged yet
            </p>
          )}
          {activities.map((a) => {
            const o = outcomeStyle(a.outcome)
            return (
              <div key={a.id} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="w-9 h-9 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                  <PhoneCall className="w-4 h-4 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-white">{a.user_name || "Unknown"}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-300 capitalize">
                      {a.activity_type}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${o.color}`}>{o.label}</span>
                    <span className="text-xs text-gray-500 ml-auto">
                      {formatDate(a.contacted_at)}
                    </span>
                  </div>
                  {a.summary && <p className="text-sm text-gray-300 mt-1.5">{a.summary}</p>}
                  {a.next_followup_at && (
                    <p className="flex items-center gap-1.5 text-xs text-amber-400 mt-1.5">
                      <CalendarClock className="w-3.5 h-3.5" />
                      Next follow-up: {formatDate(a.next_followup_at)}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
    </AuthGuard>
  )
}

function DetailRow({ icon: Icon, label, value }: { icon: any; label: string; value: string | null }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-gray-500" />
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm text-white">{value || "—"}</p>
      </div>
    </div>
  )
}

function StatusBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg ${active ? "bg-green-500/10" : "bg-white/5"}`}>
      <div className={`w-2 h-2 rounded-full ${active ? "bg-green-400" : "bg-gray-500"}`} />
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className={`text-xs font-medium ${active ? "text-green-400" : "text-gray-500"}`}>
          {active ? "Yes" : "No"}
        </p>
      </div>
    </div>
  )
}

function LocationMap({ lead }: { lead: any }) {
  const hasCoords = typeof lead.latitude === "number" && typeof lead.longitude === "number"
  const query = hasCoords
    ? `${lead.latitude},${lead.longitude}`
    : lead.address
      ? encodeURIComponent(lead.address)
      : null

  if (!query) {
    return (
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Map className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold text-white">Location</h3>
        </div>
        <p className="text-sm text-gray-500 text-center py-8">Location not available</p>
      </Card>
    )
  }

  const embedUrl = `https://maps.google.com/maps?q=${query}&z=15&output=embed`
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Map className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold text-white">Location</h3>
        </div>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          <MapPin className="w-3.5 h-3.5" />
          Open in Google Maps
        </a>
      </div>
      {lead.address && <p className="text-sm text-gray-400 mb-3">{lead.address}</p>}
      <div className="rounded-lg overflow-hidden border border-white/10">
        <iframe
          title="Lead location map"
          src={embedUrl}
          width="100%"
          height="260"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="grayscale-[20%]"
        />
      </div>
    </Card>
  )
}
