"use client"

import { useEffect, useState } from "react"
import { BarChart3, Target, Settings as SettingsIcon, History, Menu, X, ShieldCheck, UserPlus, Loader2, Mail, Pencil, Trash2 } from "lucide-react"
import Link from "next/link"
import { AuthGuard } from "@/components/auth/auth-guard"
import { api } from "@/lib/api"
import { getToken, getUser, setAuth } from "@/lib/auth"
import { NotificationsDropdown } from "@/components/shared/notifications-dropdown"
import { UserMenu } from "@/components/shared/user-menu"
import { WebSocketIndicator } from "@/components/shared/websocket-indicator"
import { formatDate } from "@/lib/utils"

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/pipeline", label: "Pipeline", icon: Target },
  { href: "/searches", label: "Search History", icon: History },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
]

type UserItem = {
  id: string
  email: string
  name: string
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
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [editing, setEditing] = useState<UserItem | null>(null)
  const [editForm, setEditForm] = useState({ name: "", email: "", password: "", is_admin: false })
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
      await api.registerUser({ name, email, password })
      setMsg({ ok: true, text: `Account created for ${email}` })
      setName("")
      setEmail("")
      setPassword("")
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
    setEditForm({ name: u.name, email: u.email, password: "", is_admin: u.is_admin })
    setMsg(null)
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    setSavingEdit(true)
    setMsg(null)
    try {
      const body: any = { name: editForm.name, email: editForm.email, is_admin: editForm.is_admin }
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
          {[...NAV_ITEMS.filter((item) => item.href !== "/settings" || me?.is_admin), { href: "/users", label: "Users", icon: ShieldCheck }].map((item) => {
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
            <h1 className="text-lg font-semibold text-white">Users</h1>
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
                <h2 className="text-xl font-bold text-white">Team Accounts</h2>
                <p className="text-sm text-gray-400 mt-1">
                  Invite team members and control who can log in
                </p>
              </div>
              <button
                onClick={() => setShowAdd((v) => !v)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                <UserPlus className="w-4 h-4" />
                Add User
              </button>
            </div>

            {showAdd && (
              <form
                onSubmit={addUser}
                className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 space-y-4"
              >
                <h3 className="font-semibold text-white">New Account</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Name</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder="Jane Doe"
                      className="w-full px-4 py-2.5 bg-[#0f172a] border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="jane@company.com"
                      className="w-full px-4 py-2.5 bg-[#0f172a] border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Temporary password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="min 6 characters"
                      className="w-full px-4 py-2.5 bg-[#0f172a] border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-400 disabled:opacity-50 transition-colors"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    Create Account
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAdd(false)}
                    className="px-5 py-2.5 rounded-xl bg-white/5 text-gray-300 text-sm hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {editing && (
              <form
                onSubmit={saveEdit}
                className="rounded-xl border border-blue-500/30 bg-blue-500/5 backdrop-blur-xl p-6 space-y-4"
              >
                <h3 className="font-semibold text-white">
                  Edit Account — {editing.email}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Name</label>
                    <input
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      required
                      className="w-full px-4 py-2.5 bg-[#0f172a] border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Email</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      required
                      className="w-full px-4 py-2.5 bg-[#0f172a] border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">
                      New password <span className="text-gray-600">(blank = keep)</span>
                    </label>
                    <input
                      type="password"
                      value={editForm.password}
                      onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                      minLength={6}
                      placeholder="optional"
                      className="w-full px-4 py-2.5 bg-[#0f172a] border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.is_admin}
                      disabled={editing.id === me?.id}
                      onChange={(e) => setEditForm({ ...editForm, is_admin: e.target.checked })}
                      className="w-4 h-4 accent-blue-500"
                    />
                    Admin role
                  </label>
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-400 disabled:opacity-50 transition-colors"
                  >
                    {savingEdit && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="px-5 py-2.5 rounded-xl bg-white/5 text-gray-300 text-sm hover:bg-white/10 transition-colors"
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
                    ? "text-green-400 bg-green-500/10 border-green-500/20"
                    : "text-red-400 bg-red-500/10 border-red-500/20"
                }`}
              >
                {msg.text}
              </div>
            )}

            <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden">
              {loading ? (
                <div className="p-8 animate-pulse space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-14 bg-white/5 rounded-xl" />
                  ))}
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10 text-left">
                      <th className="px-5 py-3 text-xs font-medium text-gray-400">User</th>
                      <th className="px-5 py-3 text-xs font-medium text-gray-400">Role</th>
                      <th className="px-5 py-3 text-xs font-medium text-gray-400">Created</th>
                      <th className="px-5 py-3 text-xs font-medium text-gray-400">Status</th>
                      <th className="px-5 py-3 text-xs font-medium text-gray-400 text-right">Access</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-white/5 last:border-0">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                              <Mail className="w-4 h-4 text-blue-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-white">
                                {u.name}
                                {u.id === me?.id && <span className="text-xs text-gray-500 ml-2">(you)</span>}
                              </p>
                              <p className="text-xs text-gray-500 truncate">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {u.is_admin ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-300 text-xs font-medium">
                              <ShieldCheck className="w-3 h-3" />
                              Admin
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-white/5 text-gray-400 text-xs">Member</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-400">
                          {u.created_at ? formatDate(u.created_at) : "—"}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                              u.is_active
                                ? "bg-green-500/10 text-green-400"
                                : "bg-red-500/10 text-red-400"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? "bg-green-400" : "bg-red-400"}`} />
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
                                  ? "text-red-400 border-red-500/30 hover:bg-red-500/10"
                                  : "text-green-400 border-green-500/30 hover:bg-green-500/10"
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
                              className="p-1.5 rounded-lg text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => confirmDelete(u)}
                              disabled={deletingId === u.id || u.id === me?.id}
                              title={u.id === me?.id ? "You cannot delete your own account" : "Delete user"}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 bg-white/5 hover:bg-red-500/10 transition-colors disabled:opacity-40"
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
