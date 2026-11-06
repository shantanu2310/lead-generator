"use client"

import { useEffect, useRef, useState } from "react"

import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, MapPin, Map as MapIcon, Building2, UserCheck, UserPlus, UserX, Loader2, PhoneCall, CalendarClock, Pencil, Trash2, Plus, StickyNote, X, Crown, ShieldCheck, Globe, ChevronDown, ChevronUp } from "lucide-react"
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

const EMPTY_EDIT_FORM = {
  business_name: "",
  website: "",
  email: "",
  phone: "",
  address: "",
  industry: "",
  employee_count: "",
  revenue: "",
  country: "",
  state: "",
  city: "",
  priority: "medium",
  deal_value: "",
  next_followup_date: "",
  department_id: "",
}

const EMPTY_CONTACT_FORM = {
  name: "",
  job_title: "",
  email: "",
  phone: "",
  linkedin_url: "",
  is_primary: false,
}

function LinkedInIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

export default function LeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const me = getUser()
  const [lead, setLead] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [logForm, setLogForm] = useState({ ...EMPTY_LOG_FORM, contacted_at: toLocalInput(new Date()) })
  const [savingLog, setSavingLog] = useState(false)
  const [movingStage, setMovingStage] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ ...EMPTY_EDIT_FORM })
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingLead, setDeletingLead] = useState(false)
  const [showAddContact, setShowAddContact] = useState(false)
  const [contactForm, setContactForm] = useState({ ...EMPTY_CONTACT_FORM })
  const [addingContact, setAddingContact] = useState(false)
  const [deletingContactId, setDeletingContactId] = useState<string | null>(null)
  const [enriching, setEnriching] = useState(false)
  const [activeTab, setActiveTab] = useState<"people" | "decisionMakers" | "company">("people")
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([])
  const [companyCollapsed, setCompanyCollapsed] = useState(false)
  const [descExpanded, setDescExpanded] = useState(false)
  const [notes, setNotes] = useState("")
  const notesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const notesSavingRef = useRef(false)

  const isAdmin = me?.is_admin === true
  const isAssignee = lead?.assigned_user_id === me?.id

  useEffect(() => {
    if (me?.is_admin) {
      api.listUsers().then(setUsers).catch(() => {})
    }
    api.listDepartments().then(setDepartments).catch(() => {})
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

  useEffect(() => {
    if (lead) setNotes(lead.notes || "")
  }, [params.id, lead?.notes])

  const saveNotes = (value: string) => {
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current)
    notesTimerRef.current = setTimeout(async () => {
      if (notesSavingRef.current) return
      notesSavingRef.current = true
      try {
        await api.updateLead(lead.id, { notes: value || null })
      } catch {
        // silent
      } finally {
        notesSavingRef.current = false
      }
    }, 800)
  }

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

  function openEdit() {
    setEditForm({
      business_name: lead.business_name || "",
      website: lead.website || "",
      email: lead.email || "",
      phone: lead.phone || "",
      address: lead.address || "",
      industry: lead.industry || "",
      employee_count: lead.employee_count != null ? String(lead.employee_count) : "",
      revenue: lead.revenue || "",
      country: lead.country || "",
      state: lead.state || "",
      city: lead.city || "",
      priority: lead.priority || "medium",
      deal_value: lead.deal_value != null ? String(lead.deal_value) : "",
      next_followup_date: lead.next_followup_date ? toLocalInput(new Date(lead.next_followup_date)) : "",
      department_id: lead.department_id || "",
    })
    setEditing(true)
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    setSavingEdit(true)
    setMsg(null)
    try {
      const body: any = {
        business_name: editForm.business_name || null,
        website: editForm.website || null,
        email: editForm.email || null,
        phone: editForm.phone || null,
        address: editForm.address || null,
        industry: editForm.industry || null,
        employee_count: editForm.employee_count ? Number(editForm.employee_count) : null,
        revenue: editForm.revenue || null,
        country: editForm.country || null,
        state: editForm.state || null,
        city: editForm.city || null,
        priority: editForm.priority || null,
        deal_value: editForm.deal_value ? Number(editForm.deal_value) : 0,
        next_followup_date: editForm.next_followup_date
          ? new Date(editForm.next_followup_date).toISOString()
          : null,
        department_id: editForm.department_id || null,
      }
      const updated = await api.updateLead(lead.id, body)
      setLead(updated)
      setEditing(false)
      setMsg({ ok: true, text: "Lead updated" })
    } catch (err: any) {
      setMsg({ ok: false, text: err.message || "Failed to update lead" })
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleDeleteLead() {
    if (!confirm(`Delete "${lead.business_name}"? This cannot be undone (all contacts, activities and timeline are removed).`)) return
    setDeletingLead(true)
    setMsg(null)
    try {
      await api.deleteLead(lead.id)
      router.replace("/pipeline")
    } catch (err: any) {
      setMsg({ ok: false, text: err.message || "Failed to delete lead" })
      setDeletingLead(false)
    }
  }

  async function handleAddContact(e: React.FormEvent) {
    e.preventDefault()
    setAddingContact(true)
    setMsg(null)
    try {
      const body: any = {
        name: contactForm.name,
        job_title: contactForm.job_title || null,
        email: contactForm.email || null,
        phone: contactForm.phone || null,
        linkedin_url: contactForm.linkedin_url || null,
        is_primary: contactForm.is_primary,
      }
      await api.createContact(lead.id, body)
      const updatedLead = await api.getLead(lead.id)
      setLead(updatedLead)
      setContactForm({ ...EMPTY_CONTACT_FORM })
      setShowAddContact(false)
      setMsg({ ok: true, text: "Contact added" })
    } catch (err: any) {
      setMsg({ ok: false, text: err.message || "Failed to add contact" })
    } finally {
      setAddingContact(false)
    }
  }

  async function handleDeleteContact(contactId: string) {
    setDeletingContactId(contactId)
    setMsg(null)
    try {
      await api.deleteContact(lead.id, contactId)
      setLead(await api.getLead(lead.id))
      setMsg({ ok: true, text: "Contact removed" })
    } catch (err: any) {
      setMsg({ ok: false, text: err.message || "Failed to remove contact" })
    } finally {
      setDeletingContactId(null)
    }
  }

  async function handleEnrichPersons() {
    setEnriching(true)
    setMsg(null)
    try {
      const result = await api.enrichLeadPersons(lead.id)
      setLead(await api.getLead(lead.id))
      setMsg({ ok: true, text: result.message || "Graph8 enrichment complete" })
    } catch (err: any) {
      setMsg({ ok: false, text: err.message || "Failed to find contacts" })
    } finally {
      setEnriching(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto animate-pulse space-y-6">
        <div className="h-8 bg-slate-100 rounded w-1/3" />
        <div className="grid grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-100 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-slate-100 rounded-xl" />
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="p-8 max-w-5xl mx-auto text-center">
        <p className="text-slate-500">Lead not found</p>
      </div>
    )
  }

  const contacts: any[] = lead.contacts || []
  const decisionMakers = contacts.filter(isDecisionMaker)
  const groupMap = new Map<string, any[]>()
  for (const c of contacts) {
    const key = c.department || "Other"
    const list = groupMap.get(key)
    if (list) list.push(c)
    else groupMap.set(key, [c])
  }
  const groups = Array.from(groupMap.entries()).sort((a, b) => b[1].length - a[1].length)

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-[#F46036] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{lead.business_name}</h1>
          <div className="flex items-center gap-2 mt-1">
            {lead.department_name && (
              <span className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700">
                <Building2 className="w-3.5 h-3.5" />
                {lead.department_name}
              </span>
            )}
            <span className="text-slate-500">Stage:</span>
            <select
              value={lead.pipeline_stage}
              onChange={(e) => handleMoveStage(e.target.value)}
              disabled={movingStage}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-[#F46036] disabled:opacity-40 transition-colors"
            >
              {stageOptions}
            </select>
            {movingStage && <Loader2 className="w-4 h-4 animate-spin text-[#F46036]" />}
          </div>
          <p className="text-slate-500 mt-1">
            Score: {lead.lead_score}
            {" · "}AI: {(lead.ai_confidence * 100).toFixed(0)}%
          </p>
        </div>
        <div className="flex flex-col items-end gap-3 shrink-0">
          {isAdmin && (
            <div className="flex gap-2">
              <button
                onClick={openEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
              <button
                onClick={handleDeleteLead}
                disabled={deletingLead}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                {deletingLead ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Delete
              </button>
            </div>
          )}
          {lead.company_logo_url && (
            <img src={lead.company_logo_url} alt="" className="w-16 h-16 rounded-xl bg-white border border-slate-200 object-contain" />
          )}
        </div>
      </div>

      {/* Enriched data tabs: People / Decision makers / Company */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
          <TabPill active={activeTab === "people"} onClick={() => setActiveTab("people")}>
            People · {contacts.length}
          </TabPill>
          <TabPill active={activeTab === "decisionMakers"} onClick={() => setActiveTab("decisionMakers")}>
            Decision makers · {decisionMakers.length}
          </TabPill>
          <TabPill active={activeTab === "company"} onClick={() => setActiveTab("company")}>
            Company
          </TabPill>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleEnrichPersons}
            disabled={enriching}
            title="Find LinkedIn profiles and person contacts via Graph8"
            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-[#F46036] hover:bg-[#D94A22] px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {enriching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LinkedInIcon className="w-3.5 h-3.5" />}
            {enriching ? "Searching…" : "Find contacts"}
          </button>
          <button
            onClick={() => setShowAddContact((s) => !s)}
            className="flex items-center gap-1.5 text-xs text-[#41808B] hover:text-[#F46036] transition-colors"
          >
            {showAddContact ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showAddContact ? "Cancel" : "Add contact"}
          </button>
        </div>
      </div>

      {activeTab === "people" && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          {showAddContact && (
            <form onSubmit={handleAddContact} className="border-b border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  placeholder="Name *"
                  required
                  className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#F46036]"
                />
                <input
                  value={contactForm.job_title}
                  onChange={(e) => setContactForm({ ...contactForm, job_title: e.target.value })}
                  placeholder="Job title"
                  className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#F46036]"
                />
                <input
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  placeholder="Email"
                  type="email"
                  className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#F46036]"
                />
                <input
                  value={contactForm.phone}
                  onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                  placeholder="Phone"
                  className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#F46036]"
                />
                <input
                  value={contactForm.linkedin_url}
                  onChange={(e) => setContactForm({ ...contactForm, linkedin_url: e.target.value })}
                  placeholder="LinkedIn URL"
                  className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#F46036]"
                />
                <label className="flex items-center gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={contactForm.is_primary}
                    onChange={(e) => setContactForm({ ...contactForm, is_primary: e.target.checked })}
                    className="accent-[#F46036]"
                  />
                  Primary contact
                </label>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={addingContact}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#F46036] text-white text-sm font-semibold hover:bg-[#D94A22] transition-colors disabled:opacity-50"
                >
                  {addingContact && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save contact
                </button>
              </div>
            </form>
          )}

          {contacts.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-10">
              No contacts yet — click <span className="font-medium text-[#F46036]">Find contacts</span> to pull LinkedIn profiles from Graph8
            </p>
          ) : (
            groups.map(([dept, list]) => {
              const collapsed = collapsedGroups.includes(dept)
              return (
                <div key={dept}>
                  <button
                    onClick={() =>
                      setCollapsedGroups((cur) =>
                        cur.includes(dept) ? cur.filter((d) => d !== dept) : [...cur, dept]
                      )
                    }
                    className="w-full flex items-center gap-2 px-5 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    {collapsed ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
                    <span className="text-sm font-semibold text-slate-900">{dept}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">{list.length}</span>
                  </button>
                  {!collapsed &&
                    list.map((c) => (
                      <PersonRow
                        key={c.id}
                        contact={c}
                        deleting={deletingContactId === c.id}
                        onDelete={() => handleDeleteContact(c.id)}
                      />
                    ))}
                </div>
              )
            })
          )}
        </div>
      )}

      {activeTab === "decisionMakers" && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          {decisionMakers.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-10">
              No decision makers found yet — run <span className="font-medium text-[#F46036]">Find contacts</span> first.
            </p>
          ) : (
            decisionMakers.map((c) => (
              <PersonRow
                key={c.id}
                contact={c}
                deleting={deletingContactId === c.id}
                onDelete={() => handleDeleteContact(c.id)}
              />
            ))
          )}
        </div>
      )}

      {activeTab === "company" && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <button
            onClick={() => setCompanyCollapsed(!companyCollapsed)}
            className="w-full flex items-center justify-between px-5 py-4"
          >
            <span className="font-semibold text-slate-900">Company</span>
            {companyCollapsed ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronUp className="w-5 h-5 text-slate-400" />}
          </button>
          {!companyCollapsed && (
            <div className="px-5 pb-5 space-y-4">
              <div className="flex items-center gap-3">
                {lead.company_logo_url && (
                  <img src={lead.company_logo_url} alt="" className="w-9 h-9 rounded-lg border border-slate-200 object-contain bg-white" />
                )}
                <span className="text-lg font-semibold text-slate-900">{lead.organization || lead.business_name}</span>
              </div>
              {lead.company_description && (
                <div>
                  <p className={`text-sm text-slate-600 leading-relaxed ${descExpanded ? "" : "line-clamp-3"}`}>
                    {lead.company_description}
                  </p>
                  {lead.company_description.length > 180 && (
                    <button
                      onClick={() => setDescExpanded(!descExpanded)}
                      className="text-xs font-medium text-[#41808B] hover:text-[#F46036] mt-1"
                    >
                      {descExpanded ? "less" : "more"}
                    </button>
                  )}
                </div>
              )}
              <div className="flex items-center gap-4 text-slate-400">
                {lead.website && (
                  <a href={lead.website} target="_blank" rel="noopener noreferrer" title="Website" className="hover:text-[#F46036] transition-colors">
                    <Globe className="w-5 h-5" />
                  </a>
                )}
                {lead.company_linkedin_url && (
                  <a href={lead.company_linkedin_url} target="_blank" rel="noopener noreferrer" title="LinkedIn" className="hover:opacity-70 transition-opacity">
                    <LinkedInIcon className="w-5 h-5 text-[#0A66C2]" />
                  </a>
                )}
                {lead.company_twitter_url && (
                  <a href={lead.company_twitter_url} target="_blank" rel="noopener noreferrer" title="X" className="hover:text-slate-600 transition-colors">
                    <XIcon className="w-5 h-5" />
                  </a>
                )}
                {lead.company_facebook_url && (
                  <a href={lead.company_facebook_url} target="_blank" rel="noopener noreferrer" title="Facebook" className="hover:text-slate-600 transition-colors">
                    <FacebookIcon className="w-5 h-5" />
                  </a>
                )}
              </div>
              <div className="border-t border-slate-100 pt-4">
                <dl className="space-y-1">
                  <InfoLine label="Industry" value={lead.industry} />
                  <InfoLine
                    label="Company size"
                    value={lead.company_size || (lead.employee_count ? formatNumber(lead.employee_count) : null)}
                  />
                  <InfoLine label="Revenue" value={lead.revenue} />
                  <InfoLine
                    label="Address"
                    value={lead.address || [lead.city, lead.state, lead.country].filter(Boolean).join(", ")}
                  />
                  <InfoLine
                    label="Website"
                    value={lead.website ? lead.website.replace("https://", "").replace("http://", "") : null}
                    href={lead.website || undefined}
                    external
                  />
                  <InfoLine
                    label="Email"
                    value={lead.email}
                    href={lead.email ? `mailto:${lead.email}` : undefined}
                    badge={lead.email ? (lead.email_verified ? "Verified" : "Pending") : undefined}
                    badgeTone={lead.email_verified ? "green" : "yellow"}
                  />
                  <InfoLine
                    label="Phone"
                    value={lead.phone}
                    href={lead.phone ? `tel:${lead.phone}` : undefined}
                  />
                  <InfoLine label="Deal value" value={lead.deal_value ? `$${formatNumber(lead.deal_value)}` : null} />
                  <InfoLine label="Priority" value={lead.priority} />
                </dl>
              </div>
            </div>
          )}
        </div>
      )}

      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#41808B]" />
            <h3 className="font-semibold text-slate-900">Assigned To</h3>
          </div>
          {isAdmin && lead.assigned_user_id && (
            <button
              onClick={() => handleAssign(null)}
              disabled={assigning}
              className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 disabled:opacity-40 transition-colors"
            >
              <UserX className="w-3.5 h-3.5" />
              Unassign
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#57A3AF]/20 flex items-center justify-center shrink-0">
              <UserCheck className="w-4 h-4 text-[#41808B]" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">
                {lead.assigned_user_name || "Unassigned"}
              </p>
              <p className="text-xs text-slate-500">
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
              className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-[#F46036] disabled:opacity-40 transition-colors"
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
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F46036] text-white text-sm font-medium hover:bg-[#D94A22] disabled:opacity-40 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Claim this lead
            </button>
          ) : null}
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <PhoneCall className="w-5 h-5 text-green-600" />
          <h3 className="font-semibold text-slate-900">Contact Log</h3>
          <div className="ml-auto flex items-center gap-2">
            {(() => {
              const callAttempts = activities.filter(
                (a) => a.activity_type === "call" && CALL_ATTEMPT_OUTCOMES.includes(a.outcome)
              ).length
              return callAttempts > 0 ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">
                  {callAttempts} call attempt{callAttempts > 1 ? "s" : ""}
                </span>
              ) : null
            })()}
            <span className="text-xs text-slate-500">{activities.length} activit{activities.length === 1 ? "y" : "ies"}</span>
          </div>
        </div>

        {msg && (
          <div
            className={`mb-4 text-sm rounded-lg px-4 py-2.5 border ${
              msg.ok
                ? "text-green-700 bg-green-50 border-green-200"
                : "text-red-700 bg-red-50 border-red-200"
            }`}
          >
            {msg.text}
          </div>
        )}

        <form onSubmit={handleLogContact} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-slate-600 mb-1.5">Channel</label>
              <select
                value={logForm.activity_type}
                onChange={(e) => setLogForm({ ...logForm, activity_type: e.target.value })}
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-[#F46036] transition-colors"
              >
                {CONTACT_CHANNELS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1.5">Contacted At</label>
              <input
                type="datetime-local"
                value={logForm.contacted_at}
                onChange={(e) => setLogForm({ ...logForm, contacted_at: e.target.value })}
                required
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-[#F46036] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1.5">Result</label>
              <select
                value={logForm.outcome}
                onChange={(e) => setLogForm({ ...logForm, outcome: e.target.value })}
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-[#F46036] transition-colors"
              >
                {outcomeOptions}
              </select>
              {outcomeTargetStage(logForm.outcome) && (
                <label className="block text-xs text-[#41808B] mt-1.5">
                  Moves lead to: {outcomeTargetStage(logForm.outcome)}
                </label>
              )}
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1.5">Next Follow-up (optional)</label>
              <input
                type="datetime-local"
                value={logForm.next_followup_at}
                onChange={(e) => setLogForm({ ...logForm, next_followup_at: e.target.value })}
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-[#F46036] transition-colors"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <input
              value={logForm.summary}
              onChange={(e) => setLogForm({ ...logForm, summary: e.target.value })}
              placeholder="Notes — what happened, what was said…"
              className="flex-1 px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#F46036] transition-colors"
            />
            <button
              type="submit"
              disabled={savingLog}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F46036] hover:bg-[#D94A22] text-white text-sm font-semibold disabled:opacity-50 transition-colors"
            >
              {savingLog && <Loader2 className="w-4 h-4 animate-spin" />}
              Log Contact
            </button>
          </div>
        </form>

        <div className="mt-4 space-y-3">
          {activities.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-6">
              No contact attempts logged yet
            </p>
          )}
          {activities.map((a) => {
            const o = outcomeStyle(a.outcome)
            return (
              <div key={a.id} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="w-9 h-9 rounded-full bg-[#57A3AF]/20 flex items-center justify-center shrink-0">
                  <PhoneCall className="w-4 h-4 text-[#41808B]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-slate-900">{a.user_name || "Unknown"}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 capitalize">
                      {a.activity_type}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${o.color}`}>{o.label}</span>
                    <span className="text-xs text-slate-500 ml-auto">
                      {formatDate(a.contacted_at)}
                    </span>
                  </div>
                  {a.summary && <p className="text-sm text-slate-700 mt-1.5">{a.summary}</p>}
                  {a.next_followup_at && (
                    <p className="flex items-center gap-1.5 text-xs text-amber-600 mt-1.5">
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

      <Card>
        <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-[#41808B]" />
          Notes
        </h3>
        <textarea
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value)
            saveNotes(e.target.value)
          }}
          placeholder="Private notes about this lead — auto-saves…"
          rows={4}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#41808B] focus:bg-white resize-none transition-colors"
        />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <LocationMap lead={lead} />

          <Card>
            <h3 className="font-semibold text-slate-900 mb-4">Verification Status</h3>
            <div className="grid grid-cols-2 gap-3">
              <StatusBadge label="Business Active" active={lead.business_active} />
              <StatusBadge label="Website Verified" active={lead.website_identity_verified} />
              <StatusBadge label="Email Verified" active={lead.email_verified} />
              <StatusBadge label="Phone Verified" active={lead.phone_cross_verified} />
              <StatusBadge label="Location Match" active={lead.location_match} />
            </div>
          </Card>

        </div>

        <div>
          <Card>
            <h3 className="font-semibold text-slate-900 mb-4">Timeline</h3>
            <LeadTimeline leadId={lead.id} />
          </Card>
        </div>
      </div>


      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-lg text-slate-900">Edit Lead</h3>
              <button
                onClick={() => setEditing(false)}
                className="text-slate-400 hover:text-slate-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Business name">
                <input value={editForm.business_name} onChange={(e) => setEditForm({ ...editForm, business_name: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#F46036] transition-colors" />
              </Field>
              <Field label="Website">
                <input value={editForm.website} onChange={(e) => setEditForm({ ...editForm, website: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#F46036] transition-colors" />
              </Field>
              <Field label="Email">
                <input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#F46036] transition-colors" />
              </Field>
              <Field label="Phone">
                <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#F46036] transition-colors" />
              </Field>
              <Field label="Address">
                <input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#F46036] transition-colors" />
              </Field>
              <Field label="Industry">
                <input value={editForm.industry} onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#F46036] transition-colors" />
              </Field>
              <Field label="Employees">
                <input value={editForm.employee_count} onChange={(e) => setEditForm({ ...editForm, employee_count: e.target.value })} type="number" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#F46036] transition-colors" />
              </Field>
              <Field label="Revenue">
                <input value={editForm.revenue} onChange={(e) => setEditForm({ ...editForm, revenue: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#F46036] transition-colors" />
              </Field>
              <Field label="Country">
                <input value={editForm.country} onChange={(e) => setEditForm({ ...editForm, country: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#F46036] transition-colors" />
              </Field>
              <Field label="State">
                <input value={editForm.state} onChange={(e) => setEditForm({ ...editForm, state: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#F46036] transition-colors" />
              </Field>
              <Field label="City">
                <input value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#F46036] transition-colors" />
              </Field>
              <Field label="Priority">
                <select value={editForm.priority} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#F46036] transition-colors">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </Field>
              <Field label="Product">
                <select value={editForm.department_id} onChange={(e) => setEditForm({ ...editForm, department_id: e.target.value })} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#F46036] transition-colors">
                  <option value="">None</option>
                  {departments.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Deal value ($)">
                <input value={editForm.deal_value} onChange={(e) => setEditForm({ ...editForm, deal_value: e.target.value })} type="number" step="0.01" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#F46036] transition-colors" />
              </Field>
              <Field label="Next follow-up">
                <input value={editForm.next_followup_date} onChange={(e) => setEditForm({ ...editForm, next_followup_date: e.target.value })} type="datetime-local" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#F46036] transition-colors" />
              </Field>
              <div className="sm:col-span-2 flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#F46036] hover:bg-[#D94A22] text-white text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {savingEdit && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoLine({
  label,
  value,
  href,
  external,
  badge,
  badgeTone = "green",
}: {
  label: string
  value: string | null | undefined
  href?: string
  external?: boolean
  badge?: string
  badgeTone?: "green" | "yellow"
}) {
  return (
    <div className="flex gap-1.5 py-0.5 min-w-0">
      <dt className="text-sm font-semibold text-slate-800 shrink-0">{label} :</dt>
      <dd className="text-sm text-slate-700 min-w-0 break-words">
        {value ? (
          <>
            {href ? (
              <a
                href={href}
                target={external ? "_blank" : undefined}
                rel={external ? "noreferrer" : undefined}
                className="text-[#41808B] hover:text-[#F46036] transition-colors"
              >
                {value}
              </a>
            ) : (
              value
            )}
            {badge && (
              <span className={`ml-2 text-xs ${badgeTone === "green" ? "text-green-600" : "text-yellow-600"}`}>
                {badge}
              </span>
            )}
          </>
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </dd>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-slate-600 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function StatusBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg ${active ? "bg-green-50" : "bg-slate-50"}`}>
      <div className={`w-2 h-2 rounded-full ${active ? "bg-green-600" : "bg-slate-400"}`} />
      <div>
        <p className="text-xs text-slate-600">{label}</p>
        <p className={`text-xs font-medium ${active ? "text-green-700" : "text-slate-500"}`}>
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
          <MapIcon className="w-5 h-5 text-[#41808B]" />
          <h3 className="font-semibold text-slate-900">Location</h3>
        </div>
        <p className="text-sm text-slate-500 text-center py-8">Location not available</p>
      </Card>
    )
  }

  const embedUrl = `https://maps.google.com/maps?q=${query}&z=15&output=embed`
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MapIcon className="w-5 h-5 text-[#41808B]" />
          <h3 className="font-semibold text-slate-900">Location</h3>
        </div>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-[#41808B] hover:text-[#F46036] transition-colors"
        >
          <MapPin className="w-3.5 h-3.5" />
          Open in Google Maps
        </a>
      </div>
      {lead.address && <p className="text-sm text-slate-500 mb-3">{lead.address}</p>}
      <div className="rounded-lg overflow-hidden border border-slate-200">
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

const DECISION_MAKER_KEYWORDS = [
  "owner",
  "founder",
  "ceo",
  "chief",
  "president",
  "partner",
  "managing director",
  "general manager",
  "director",
  "head",
  "manager",
]
const DECISION_MAKER_SENIORITY = [
  "c-suite",
  "vp",
  "vice president",
  "director",
  "head",
  "manager",
  "owner",
  "founder",
  "partner",
]

function isDecisionMaker(contact: any): boolean {
  const title = `${contact.job_title || ""} ${contact.linkedin_headline || ""}`.toLowerCase()
  if (DECISION_MAKER_KEYWORDS.some((k) => title.includes(k))) return true
  const seniority = (contact.seniority || "").toLowerCase()
  return DECISION_MAKER_SENIORITY.some((k) => seniority.includes(k))
}

function abbreviateName(name: string): string {
  const parts = (name || "").trim().split(/\s+/)
  if (parts.length <= 1) return parts[0] || ""
  return `${parts[0]} ${parts[parts.length - 1][0]}.`
}

function TabPill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
      }`}
    >
      {children}
    </button>
  )
}

function PersonRow({
  contact,
  deleting,
  onDelete,
}: {
  contact: any
  deleting: boolean
  onDelete: () => void
}) {
  return (
    <div className="flex items-start gap-3 px-5 py-3.5 border-b border-slate-100 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-semibold text-slate-900">{abbreviateName(contact.name)}</span>
          {isDecisionMaker(contact) && <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" aria-label="Decision maker" />}
          <span className="text-slate-300">|</span>
          <span className="text-sm text-slate-600 truncate">{contact.job_title || contact.linkedin_headline || "—"}</span>
        </div>
        <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
          {contact.email ? (
            <span className="flex items-center gap-1.5 min-w-0">
              <span className="truncate">{contact.email}</span>
              <ShieldCheck className="w-4 h-4 text-green-600 shrink-0" aria-label="Email found" />
            </span>
          ) : (
            <span className="text-slate-300">No email</span>
          )}
          {contact.phone && (
            <a href={`tel:${contact.phone}`} className="hover:text-[#F46036] transition-colors shrink-0">
              {contact.phone}
            </a>
          )}
          {contact.linkedin_url && (
            <a
              href={contact.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              title="Open LinkedIn profile"
              className="text-[#0A66C2] hover:opacity-70 transition-opacity shrink-0"
            >
              <LinkedInIcon className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
      <button
        onClick={onDelete}
        disabled={deleting}
        className="text-red-600 hover:text-red-700 transition-colors disabled:opacity-40 shrink-0"
        title="Remove contact"
      >
        {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
      </button>
    </div>
  )
}

function XIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
    </svg>
  )
}

function FacebookIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}
