"use client"

import { useEffect, useState } from "react"
import { BarChart3, Target, Settings as SettingsIcon, History, Menu, X, Building2, Plus, Pencil, Trash2, Loader2, CheckCircle2, XCircle, Users, ShieldCheck, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { AuthGuard } from "@/components/auth/auth-guard"
import { api } from "@/lib/api"
import { getUser } from "@/lib/auth"
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

type Department = {
  id: string
  name: string
  lead_count: number
}

export default function DepartmentsPage() {
  const user = getUser()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [departments, setDepartments] = useState<Department[]>([])
  const [newDept, setNewDept] = useState("")
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null)
  const [editingDeptName, setEditingDeptName] = useState("")
  const [savingDept, setSavingDept] = useState(false)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function reloadDepartments() {
    const d = await api.listDepartments()
    setDepartments(d || [])
  }

  useEffect(() => {
    reloadDepartments()
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function addDepartment() {
    const name = newDept.trim()
    if (!name) {
      setMsg({ ok: false, text: "Enter a department name" })
      return
    }
    setSavingDept(true)
    setMsg(null)
    try {
      await api.createDepartment(name)
      setNewDept("")
      await reloadDepartments()
      setMsg({ ok: true, text: `Department "${name}" added` })
    } catch (err: any) {
      setMsg({ ok: false, text: err.message || "Failed to add department" })
    } finally {
      setSavingDept(false)
    }
  }

  async function saveDepartmentRename(d: Department) {
    const name = editingDeptName.trim()
    if (!name) {
      setMsg({ ok: false, text: "Enter a department name" })
      return
    }
    setSavingDept(true)
    setMsg(null)
    try {
      await api.updateDepartment(d.id, name)
      setEditingDeptId(null)
      await reloadDepartments()
      setMsg({ ok: true, text: "Department renamed" })
    } catch (err: any) {
      setMsg({ ok: false, text: err.message || "Failed to rename department" })
    } finally {
      setSavingDept(false)
    }
  }

  async function deleteDepartment(d: Department) {
    if (!confirm(`Delete department "${d.name}"? Its leads keep their data but will no longer be filtered by it.`)) return
    setSavingDept(true)
    setMsg(null)
    try {
      await api.deleteDepartment(d.id)
      await reloadDepartments()
      setMsg({ ok: true, text: "Department deleted" })
    } catch (err: any) {
      setMsg({ ok: false, text: err.message || "Failed to delete department" })
    } finally {
      setSavingDept(false)
    }
  }

  return (
    <AuthGuard>
    <div className="flex h-screen">
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-[#41808B] border-r border-white/10 transform transition-transform duration-200
        lg:relative lg:translate-x-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="flex items-center rounded-lg bg-white p-1.5">
              <Logo className="h-6" />
            </span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-teal-100 hover:text-white">
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
        <header className="relative z-40 flex items-center justify-between h-16 px-6 border-b border-slate-200 bg-white/70 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-500 hover:text-slate-900">
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-slate-900">Departments</h1>
            <CompanyBadge />
          </div>
          <div className="flex items-center gap-4">
            <WebSocketIndicator />
            <NotificationsDropdown />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {msg && (
              <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${
                msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
              }`}>
                {msg.ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {msg.text}
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="w-5 h-5 text-[#F46036]" />
                <h2 className="font-semibold text-lg text-slate-900">Departments</h2>
              </div>
              <p className="text-sm text-slate-500 mb-5">
                A department is required to generate leads. Search results are tagged with the department you pick.
              </p>

              <div className="flex items-center gap-3 mb-5">
                <input
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addDepartment()
                  }}
                  placeholder="New department name, e.g. Plumbers"
                  className="flex-1 max-w-sm px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#F46036]"
                />
                <button
                  onClick={addDepartment}
                  disabled={savingDept}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#F46036] hover:bg-[#D94A22] disabled:bg-[#F46036]/40 text-sm font-medium text-white rounded-lg transition-colors"
                >
                  {savingDept ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Add
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : departments.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6 border border-dashed border-slate-300 rounded-lg">
                  No departments yet. Add your first one to start generating leads.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {departments.map((d) => (
                    <div key={d.id} className="flex items-center justify-between gap-4 py-3">
                      {editingDeptId === d.id ? (
                        <div className="flex items-center gap-2 flex-1 max-w-sm">
                          <input
                            value={editingDeptName}
                            onChange={(e) => setEditingDeptName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveDepartmentRename(d)
                              if (e.key === "Escape") setEditingDeptId(null)
                            }}
                            autoFocus
                            className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-[#F46036]"
                          />
                          <button
                            onClick={() => saveDepartmentRename(d)}
                            disabled={savingDept}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-[#F46036] hover:bg-[#D94A22] rounded-lg transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingDeptId(null)}
                            className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3 min-w-0">
                            <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                            <p className="text-sm font-medium text-slate-900">{d.name}</p>
                            <span className="text-xs text-slate-500">{d.lead_count} leads</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => { setEditingDeptId(d.id); setEditingDeptName(d.name); setMsg(null) }}
                              className="p-2 text-slate-400 hover:text-slate-900 transition-colors"
                              title="Rename"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteDepartment(d)}
                              className="p-2 text-red-500 hover:text-red-600 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
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