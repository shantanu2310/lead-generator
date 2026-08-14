"use client"

import { useEffect, useState } from "react"
import {
  BarChart3,
  Building2,
  History,
  Inbox,
  Loader2,
  Menu,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  Target,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"
import { AuthGuard } from "@/components/auth/auth-guard"
import { Avatar } from "@/components/shared/avatar"
import { NotificationsDropdown } from "@/components/shared/notifications-dropdown"
import { UserMenu } from "@/components/shared/user-menu"
import { CompanyBadge } from "@/components/shared/company-badge"
import { WebSocketIndicator } from "@/components/shared/websocket-indicator"
import { api } from "@/lib/api"
import { getUser } from "@/lib/auth"
import { PIPELINE_STAGES, STAGE_LABELS } from "@/lib/constants"
import { formatDate } from "@/lib/utils"

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon; adminOnly?: boolean }[] = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/departments", label: "Departments", icon: Building2, adminOnly: true },
  { href: "/pipeline", label: "Pipeline", icon: Target },
  { href: "/pipeline/team", label: "Team Leads", icon: Users },
  { href: "/searches", label: "Search History", icon: History },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
]

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
  return (
    <AuthGuard>
      <TeamPageContent />
    </AuthGuard>
  )
}

function TeamPageContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [team, setTeam] = useState<TeamData | null>(null)
  const [myLeads, setMyLeads] = useState<TeamLead[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [query, setQuery] = useState("")
  const me = getUser()
  const isAdmin = me?.is_admin === true

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        if (isAdmin) {
          setTeam(await api.getTeamLeads())
        } else {
          const res = await api.listLeads({ assigned_to: "me", page_size: "200" })
          if (!cancelled) setMyLeads(res.items || [])
        }
      } catch (err: any) {
        if (!cancelled) setMsg({ ok: false, text: err.message || "Failed to load leads" })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function matchesQuery(lead: TeamLead): boolean {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return [lead.business_name, lead.website, lead.email, lead.phone, lead.assigned_user_name]
      .filter(Boolean)
      .some((v) => (v as string).toLowerCase().includes(q))
  }

  const renderUserCard = (u: TeamUser) => {
    const visible = u.leads.filter(matchesQuery)
    return (
      <section key={u.id} className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden">
        <header className="flex flex-wrap items-center gap-4 px-5 py-4 border-b border-white/10">
          <Avatar name={u.name} src={u.avatar_url} className="w-10 h-10" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-white truncate">{u.name}</p>
              {u.id === me?.id && <span className="text-xs text-gray-500">(you)</span>}
              {u.is_admin ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 text-[11px] font-medium">
                  <ShieldCheck className="w-3 h-3" />
                  Admin
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-white/5 text-gray-400 text-[11px]">Member</span>
              )}
              {!u.is_active && (
                <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-[11px]">Disabled</span>
              )}
            </div>
            <p className="text-xs text-gray-500 truncate">{u.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-2xl font-bold text-white leading-none">{u.total}</p>
              <p className="text-[11px] text-gray-500 mt-1">assigned</p>
            </div>
            <div className="flex flex-wrap gap-1.5 max-w-[240px] justify-end">
              {Object.entries(u.by_stage).map(([stage, count]) => (
                <span
                  key={stage}
                  className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                  style={{
                    background: `${stageColor(stage)}1f`,
                    color: stageColor(stage),
                  }}
                >
                  {STAGE_LABELS[stage] || stage.replace(/_/g, " ")} {count}
                </span>
              ))}
            </div>
          </div>
        </header>

        {visible.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-500 text-center">
            {u.total === 0 ? "No leads assigned" : "No leads match your search"}
          </p>
        ) : (
          <div className="divide-y divide-white/5">
            {visible.map((lead) => (
              <LeadRow key={lead.id} lead={lead} />
            ))}
          </div>
        )}
      </section>
    )
  }

  const unassignedVisible = team?.unassigned.leads.filter(matchesQuery) || []

  return (
    <div className="flex h-screen">
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-[#0a0f1e] border-r border-white/5 transform transition-transform duration-200
        lg:relative lg:translate-x-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Target className="w-6 h-6 text-blue-400" />
            <span className="font-bold text-white text-lg">LeadGen</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="p-4 space-y-1">
          {[...NAV_ITEMS.filter((item) => !item.adminOnly || me?.is_admin), ...(me?.is_admin ? [{ href: "/users", label: "Users", icon: ShieldCheck }] : [])].map((item) => {
            const Icon = item.icon
            const isActive = typeof window !== "undefined" && window.location.pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-blue-500/10 text-blue-400"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
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
        <header className="relative z-40 flex items-center justify-between h-16 px-6 border-b border-white/5 bg-[#0a0f1e]/50 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-400 hover:text-white">
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-white">
              {isAdmin ? "Team Leads" : "My Leads"}
            </h1>
            <CompanyBadge />
          </div>
          <div className="flex items-center gap-4">
            <WebSocketIndicator />
            <NotificationsDropdown />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {isAdmin ? "Assigned leads per user" : "Leads assigned to you"}
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  {isAdmin
                    ? "See every team member's workload and track unassigned leads"
                    : "Everything you own across the pipeline"}
                </p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search leads, emails, phones…"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#0f172a] border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {msg && (
              <div
                className={`text-sm rounded-lg px-4 py-2.5 border ${
                  msg.ok
                    ? "text-green-400 bg-green-500/10 border-green-500/20"
                    : "text-red-400 bg-red-500/10 border-red-500/20"
                }`}
              >
                {msg.text}
              </div>
            )}

            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-40 bg-white/5 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : isAdmin && team ? (
              <>
                <div className="space-y-4">
                  {team.users.map((u) => renderUserCard(u))}
                </div>

                <section className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden">
                  <header className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-white/10">
                    <div className="w-10 h-10 rounded-full bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                      <Inbox className="w-4.5 h-4.5 text-gray-400" style={{ width: 18, height: 18 }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">Unassigned</p>
                      <p className="text-xs text-gray-500">Leads with no owner yet</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-white leading-none">{team.unassigned.total}</p>
                        <p className="text-[11px] text-gray-500 mt-1">leads</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-w-[240px] justify-end">
                        {Object.entries(team.unassigned.by_stage).map(([stage, count]) => (
                          <span
                            key={stage}
                            className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                            style={{ background: `${stageColor(stage)}1f`, color: stageColor(stage) }}
                          >
                            {STAGE_LABELS[stage] || stage.replace(/_/g, " ")} {count}
                          </span>
                        ))}
                      </div>
                    </div>
                  </header>
                  {unassignedVisible.length === 0 ? (
                    <p className="px-5 py-6 text-sm text-gray-500 text-center">
                      {team.unassigned.total === 0 ? "No unassigned leads" : "No leads match your search"}
                    </p>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {unassignedVisible.map((lead) => (
                        <LeadRow key={lead.id} lead={lead} />
                      ))}
                    </div>
                  )}
                </section>
              </>
            ) : myLeads ? (
              myLeads.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl py-14 text-center">
                  <UserRound className="w-10 h-10 text-gray-600 mx-auto" />
                  <p className="mt-3 text-sm text-gray-400">
                    No leads assigned to you yet
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Leads will appear here once your admin assigns them
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl divide-y divide-white/5 overflow-hidden">
                  {myLeads.filter(matchesQuery).map((lead) => (
                    <LeadRow key={lead.id} lead={lead} />
                  ))}
                  {myLeads.filter(matchesQuery).length === 0 && (
                    <p className="px-5 py-6 text-sm text-gray-500 text-center">No leads match your search</p>
                  )}
                </div>
              )
            ) : null}
          </div>
        </main>
      </div>
    </div>
  )
}

function stageColor(stage: string): string {
  return PIPELINE_STAGES.find((s) => s.value === stage)?.color || "#64748b"
}

function LeadRow({ lead }: { lead: TeamLead }) {
  const color = stageColor(lead.pipeline_stage)
  return (
    <Link
      href={`/pipeline/leads/${lead.id}`}
      className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5 hover:bg-white/[0.03] transition-colors group"
    >
      <div className="min-w-0 flex-1 basis-52">
        <p className="text-sm font-medium text-white group-hover:text-blue-300 transition-colors truncate">
          {lead.business_name}
        </p>
        <p className="text-xs text-gray-500 truncate">
          {lead.email || lead.phone || lead.website || "—"}
        </p>
      </div>
      <span
        className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
        style={{ background: `${color}1f`, color }}
      >
        {STAGE_LABELS[lead.pipeline_stage] || lead.pipeline_stage.replace(/_/g, " ")}
      </span>
      <span className="text-xs font-bold text-white tabular-nums">
        {lead.lead_score}
        <span className="text-gray-600 font-normal">/100</span>
      </span>
      <span className="px-2 py-0.5 rounded-full bg-white/5 text-gray-400 text-[11px] capitalize">
        {lead.priority}
      </span>
      <span className="text-xs text-gray-500 w-28 text-right">
        {lead.next_followup_date
          ? `Next: ${formatDate(lead.next_followup_date)}`
          : lead.last_activity_at
            ? `Active: ${formatDate(lead.last_activity_at)}`
            : "No activity"}
      </span>
    </Link>
  )
}