"use client"

import { useEffect, useState } from "react"
import { BarChart3, Target, Settings as SettingsIcon, History, Menu, X, ShieldCheck, Users, UserPlus, Loader2, Pencil, Trash2, Building2, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { AuthGuard } from "@/components/auth/auth-guard"
import { Avatar, AvatarPicker } from "@/components/shared/avatar"
import { api } from "@/lib/api"
import { getToken, getUser, setAuth } from "@/lib/auth"
import { NotificationsDropdown } from "@/components/shared/notifications-dropdown"
import { UserMenu } from "@/components/shared/user-menu"
import { CompanyBadge } from "@/components/shared/company-badge"
import { WebSocketIndicator } from "@/components/shared/websocket-indicator"
import { Logo } from "@/components/shared/logo"
import { formatDate } from "@/lib/utils"

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon; adminOnly?: boolean }[] = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/departments", label: "Departments", icon: Building2, adminOnly: true },
  { href: "/pipeline", label: "Pipeline", icon: Target },
  { href: "/pipeline/team", label: "Team Leads", icon: Users },
  { href: "/searches", label: "Search History", icon: History },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
]

type UserItem = {
  id: string
  email: string
  name: string
  avatar_url: string | null
  is_active: boolean
  is_admin: boolean
  created_at: string | null
}

export default function UsersPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [avatar, setAvatar] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
const [editing, setEditing] = useState<UserItem | null>(null)
  const [editForm, setEditForm] = useState({ name: "", email: "", password: "", is_admin: false, avatar_url: null as string | null })
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const me = getUser()

  async function load() {
    try {
      setLoading(true)
      setUsers(await api.listUsers())
    } catch (err: any) {
      setMsg({ ok: false, text: err.message || "Failed to load users" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

async function addUser(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      const created = await api.registerUser({ name, email, password })
      if (avatar) await api.updateUser(created.id, { avatar_url: avatar })
      setMsg({ ok: true, text: `Account created for ${email}` })
      setName("")
      setEmail("")
      setPassword("")
      setAvatar(null)
      setShowAdd(false)
      await load()
    } catch (err: any) {
      setMsg({ ok: false, text: err.message || "Failed to create account" })
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(u: UserItem) {
    setTogglingId(u.id)
    setMsg(null)
    try {
      await api.setUserActive(u.id, !u.is_active)
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_active: !u.is_active } : x)))
      setMsg({
        ok: true,
        text: `${u.email} ${u.is_active ? "disabled" : "enabled"}`,
      })
    } catch (err: any) {
      setMsg({ ok: false, text: err.message || "Failed to update user" })
    } finally {
      setTogglingId(null)
    }
  }

function openEdit(u: UserItem) {
    setEditing(u)
    setEditForm({ name: u.name, email: u.email, password: "", is_admin: u.is_admin, avatar_url: u.avatar_url ?? null })
    setMsg(null)
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    setSavingEdit(true)
    setMsg(null)
    try {
const body: any = { name: editForm.name, email: editForm.email, is_admin: editForm.is_admin, avatar_url: editForm.avatar_url ?? "" }
      if (editForm.password) body.password = editForm.password
      const updated = await api.updateUser(editing.id, body)
      if (editing.id === me?.id) {
        const me2 = await api.getMe()
        setAuth(getToken() || "", me2)
        window.location.reload()
        return
      }
      setMsg({ ok: true, text: `${updated.email} updated` })
      setEditing(null)
      await load()
    } catch (err: any) {
      setMsg({ ok: false, text: err.message || "Failed to update user" })
    } finally {
      setSavingEdit(false)
    }
  }

  async function confirmDelete(u: UserItem) {
    if (u.id === me?.id) return
    if (!window.confirm(`Delete ${u.name} (${u.email})? Their leads will be unassigned. This cannot be undone.`)) return
    setDeletingId(u.id)
    setMsg(null)
    try {
      await api.deleteUser(u.id)
      setMsg({ ok: true, text: `${u.email} deleted` })
      await load()
    } catch (err: any) {
      setMsg({ ok: false, text: err.message || "Failed to delete user" })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <AuthGuard adminOnly>
<div className="flex h-screen">
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-[#41808B] transform transition-transform duration-200
        lg:relative lg:translate-x-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="relative h-16 bg-white border-b border-slate-200 flex items-center justify-center">
          <Logo className="h-8" variant="full" />
          <button onClick={() => setSidebarOpen(false)} className="absolute right-4 lg:hidden text-slate-500 hover:text-slate-900">
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="p-4 space-y-1">
          {[...NAV_ITEMS.filter((item) => !item.adminOnly || me?.is_admin), { href: "/users", label: "Users", icon: ShieldCheck }].map((item) => {
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
            <h1 className="text-lg font-semibold text-slate-900">Users</h1>
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
                <h2 className="text-xl font-bold text-slate-900">Team Accounts</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Invite team members and control who can log in
                </p>
              </div>
              <button
                onClick={() => setShowAdd((v) => !v)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F46036] hover:bg-[#D94A22] text-white text-sm font-semibold transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                Add User
              </button>
            </div>

            {showAdd && (
              <form
                onSubmit={addUser}
                className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-4"
              >
                <h3 className="font-semibold text-slate-900">New Account</h3>
                <AvatarPicker value={avatar} onChange={setAvatar} size={72} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-slate-500 mb-1.5">Name</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder="Jane Doe"
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#F46036] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-500 mb-1.5">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="jane@company.com"
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#F46036] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-500 mb-1.5">Temporary password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="min 6 characters"
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#F46036] transition-colors"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F46036] hover:bg-[#D94A22] text-white text-sm font-semibold disabled:opacity-50 transition-colors"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    Create Account
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAdd(false)}
                    className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {editing && (
              <form
                onSubmit={saveEdit}
                className="rounded-xl border border-[#F46036]/30 bg-orange-50/60 p-6 space-y-4"
              >
                <h3 className="font-semibold text-slate-900">
                  Edit Account — {editing.email}
                </h3>
                <AvatarPicker value={editForm.avatar_url} onChange={(v) => setEditForm({ ...editForm, avatar_url: v })} size={72} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-slate-500 mb-1.5">Name</label>
                    <input
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      required
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#F46036] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-500 mb-1.5">Email</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      required
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#F46036] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-500 mb-1.5">
                      New password <span className="text-slate-400">(blank = keep)</span>
                    </label>
                    <input
                      type="password"
                      value={editForm.password}
                      onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                      minLength={6}
                      placeholder="optional"
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#F46036] transition-colors"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.is_admin}
                      disabled={editing.id === me?.id}
                      onChange={(e) => setEditForm({ ...editForm, is_admin: e.target.checked })}
                      className="w-4 h-4 accent-[#F46036]"
                    />
                    Admin role
                  </label>
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F46036] hover:bg-[#D94A22] text-white text-sm font-semibold disabled:opacity-50 transition-colors"
                  >
                    {savingEdit && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {msg && (
              <div
                className={`text-sm rounded-lg px-4 py-2.5 border ${
                  msg.ok
                    ? "text-green-700 bg-green-50 border-green-200"
                    : "text-red-700 bg-red-50 border-red-200"
                }`}
              >
                {msg.text}
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              {loading ? (
                <div className="p-8 animate-pulse space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-14 bg-slate-100 rounded-xl" />
                  ))}
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 text-left">
                      <th className="px-5 py-3 text-xs font-medium text-slate-500">User</th>
                      <th className="px-5 py-3 text-xs font-medium text-slate-500">Role</th>
                      <th className="px-5 py-3 text-xs font-medium text-slate-500">Created</th>
                      <th className="px-5 py-3 text-xs font-medium text-slate-500">Status</th>
                      <th className="px-5 py-3 text-xs font-medium text-slate-500 text-right">Access</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar name={u.name} src={u.avatar_url} className="w-9 h-9" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-900">
                                {u.name}
                                {u.id === me?.id && <span className="text-xs text-slate-400 ml-2">(you)</span>}
                              </p>
                              <p className="text-xs text-slate-500 truncate">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {u.is_admin ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-medium">
                              <ShieldCheck className="w-3 h-3" />
                              Admin
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs">Member</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-500">
                          {u.created_at ? formatDate(u.created_at) : "—"}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                              u.is_active
                                ? "bg-green-50 text-green-700"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? "bg-green-600" : "bg-red-600"}`} />
                            {u.is_active ? "Active" : "Disabled"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => toggleActive(u)}
                              disabled={togglingId === u.id || u.id === me?.id}
                              title={u.id === me?.id ? "You cannot disable your own account" : u.is_active ? "Revoke login access" : "Grant login access"}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-40 ${
                                u.is_active
                                  ? "text-red-600 border-red-200 hover:bg-red-50"
                                  : "text-green-700 border-green-200 hover:bg-green-50"
                              }`}
                            >
                              {togglingId === u.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" />
                              ) : u.is_active ? (
                                "Disable"
                              ) : (
                                "Enable"
                              )}
                            </button>
                            <button
                              onClick={() => openEdit(u)}
                              title="Edit user"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => confirmDelete(u)}
                              disabled={deletingId === u.id || u.id === me?.id}
                              title={u.id === me?.id ? "You cannot delete your own account" : "Delete user"}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 bg-white border border-slate-200 hover:bg-red-50 transition-colors disabled:opacity-40"
                            >
                              {deletingId === u.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
    </AuthGuard>
  )
}
