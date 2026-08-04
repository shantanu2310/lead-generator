"use client"

import { useEffect, useState } from "react"
import { BarChart3, Target, Settings as SettingsIcon, History, Menu, X, KeyRound, Save, CheckCircle2, XCircle, Loader2, Database, Server, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { AuthGuard } from "@/components/auth/auth-guard"
import { api } from "@/lib/api"
import { getUser } from "@/lib/auth"
import { NotificationsDropdown } from "@/components/shared/notifications-dropdown"
import { UserMenu } from "@/components/shared/user-menu"
import { CompanyBadge } from "@/components/shared/company-badge"
import { WebSocketIndicator } from "@/components/shared/websocket-indicator"

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/pipeline", label: "Pipeline", icon: Target },
  { href: "/searches", label: "Search History", icon: History },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
]

type Provider = {
  key: string
  name: string
  configured: boolean
  masked_key: string
}

const PIPELINE_FIELDS: { key: string; label: string }[] = [
  { key: "max_leads", label: "Max Leads" },
  { key: "minimum_lead_score", label: "Minimum Lead Score" },
  { key: "default_candidate_target", label: "Default Candidate Target" },
  { key: "max_website_pages", label: "Max Website Pages" },
  { key: "website_concurrency", label: "Website Concurrency" },
  { key: "provider_concurrency", label: "Provider Concurrency" },
]

const PROVIDER_INPUT_KEY: Record<string, string> = {
  llm: "llm_api_key",
  google_places: "google_places_api_key",
  brave_search: "brave_search_api_key",
  hunter: "hunter_api_key",
}

export default function SettingsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [providers, setProviders] = useState<Provider[]>([])
  const [pipeline, setPipeline] = useState<Record<string, any>>({})
  const [app, setApp] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [keyValues, setKeyValues] = useState<Record<string, string>>({})
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [model, setModel] = useState("gpt-4o")
  const [pipelineForm, setPipelineForm] = useState<Record<string, string>>({})
  const [savingPipeline, setSavingPipeline] = useState(false)
  const user = getUser()

  async function load() {
    try {
      const data = await api.getSettings()
      setProviders(data.providers)
      setPipeline(data.pipeline)
      setApp(data.app)
      setModel(data.pipeline.llm_model || "gpt-4o")
      setPipelineForm(
        Object.fromEntries(
          PIPELINE_FIELDS.map((f) => [f.key, String(data.pipeline[f.key] ?? "")])
        )
      )
    } catch (err: any) {
      setMsg({ ok: false, text: err.message || "Failed to load settings" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function saveProvider(p: Provider) {
    const value = (keyValues[p.key] || "").trim()
    if (!value) {
      setMsg({ ok: false, text: `Enter a value for ${p.name}` })
      return
    }
    setSavingKey(p.key)
    setMsg(null)
    try {
      const data = await api.updateProviderSettings({
        [PROVIDER_INPUT_KEY[p.key]]: value,
      })
      setProviders(data.providers)
      setEditingKey(null)
      setKeyValues((prev) => ({ ...prev, [p.key]: "" }))
      setMsg({ ok: true, text: `${p.name} key saved. It is active immediately.` })
    } catch (err: any) {
      setMsg({ ok: false, text: err.message || "Failed to save" })
    } finally {
      setSavingKey(null)
    }
  }

  async function saveModel() {
    setMsg(null)
    try {
      const data = await api.updateProviderSettings({ llm_model: model })
      setProviders(data.providers)
      setMsg({ ok: true, text: `LLM model set to ${model}` })
    } catch (err: any) {
      setMsg({ ok: false, text: err.message || "Failed to save model" })
    }
  }

  async function savePipeline() {
    const body: Record<string, number> = {}
    for (const f of PIPELINE_FIELDS) {
      const v = Number(pipelineForm[f.key])
      if (Number.isNaN(v) || v < 0) {
        setMsg({ ok: false, text: `${f.label} must be a valid number` })
        return
      }
      body[f.key] = v
    }
    setSavingPipeline(true)
    setMsg(null)
    try {
      const data = await api.updatePipelineSettings(body)
      setPipeline(data.pipeline)
      setMsg({ ok: true, text: "Pipeline settings saved" })
    } catch (err: any) {
      setMsg({ ok: false, text: err.message || "Failed to save pipeline settings" })
    } finally {
      setSavingPipeline(false)
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
          {[...NAV_ITEMS.filter((item) => item.href !== "/settings" || user?.is_admin), ...(user?.is_admin ? [{ href: "/users", label: "Users", icon: ShieldCheck }] : [])].map((item) => {
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
            <h1 className="text-lg font-semibold text-white">Settings</h1>
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
                msg.ok ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
              }`}>
                {msg.ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {msg.text}
              </div>
            )}

            <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
              <div className="flex items-center gap-2 mb-1">
                <KeyRound className="w-5 h-5 text-blue-400" />
                <h2 className="font-semibold text-lg text-white">API Providers</h2>
              </div>
              <p className="text-sm text-gray-400 mb-5">
                Keys are stored in <code className="text-gray-300">.env</code> and take effect immediately â€” no restart needed.
              </p>

              <div className="space-y-4">
                {providers.map((p) => {
                  const editing = editingKey === p.key
                  const saving = savingKey === p.key
                  return (
                    <div key={p.key} className="flex items-center justify-between gap-4 p-4 rounded-lg bg-white/3 border border-white/5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-white">{p.name}</p>
                          {p.configured ? (
                            <span className="flex items-center gap-1 text-[11px] text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" /> Configured
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[11px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                              <XCircle className="w-3 h-3" /> Not configured
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1 font-mono">
                          {p.configured ? p.masked_key : "No key set"}
                        </p>
                      </div>

                      {editing ? (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <input
                            type="password"
                            placeholder="Paste new API key"
                            value={keyValues[p.key] || ""}
                            onChange={(e) => setKeyValues((prev) => ({ ...prev, [p.key]: e.target.value }))}
                            className="w-56 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-400/40"
                          />
                          <button
                            onClick={() => saveProvider(p)}
                            disabled={saving}
                            className="flex items-center gap-1.5 px-4 py-2 bg-blue-500 hover:bg-blue-400 disabled:bg-blue-500/40 text-sm font-medium text-white rounded-lg transition-colors"
                          >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save
                          </button>
                          <button
                            onClick={() => setEditingKey(null)}
                            className="px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingKey(p.key); setMsg(null) }}
                          className="flex-shrink-0 px-4 py-2 text-sm text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                        >
                          {p.configured ? "Replace key" : "Add key"}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="flex items-center gap-3 mt-5 pt-5 border-t border-white/5">
                <label className="text-sm text-gray-400">LLM Model</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-white/20"
                >
                  <option value="gpt-4o">gpt-4o</option>
                  <option value="gpt-4o-mini">gpt-4o-mini</option>
                  <option value="gpt-4.1">gpt-4.1</option>
                  <option value="gpt-4.1-mini">gpt-4.1-mini</option>
                </select>
                <button
                  onClick={saveModel}
                  className="px-4 py-2 text-sm text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  Save model
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
              <h2 className="font-semibold text-lg text-white mb-1">Pipeline Defaults</h2>
              <p className="text-sm text-gray-400 mb-5">Defaults used for new lead searches and scoring.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PIPELINE_FIELDS.map((f) => (
                  <div key={f.key}>
                    <label className="block text-xs text-gray-400 mb-1.5">{f.label}</label>
                    <input
                      type="number"
                      value={pipelineForm[f.key] ?? ""}
                      onChange={(e) => setPipelineForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-blue-400/40"
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={savePipeline}
                disabled={savingPipeline}
                className="mt-5 flex items-center gap-2 px-5 py-2 bg-blue-500 hover:bg-blue-400 disabled:bg-blue-500/40 text-sm font-medium text-white rounded-lg transition-colors"
              >
                {savingPipeline ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save pipeline settings
              </button>
            </div>

            {app && (
              <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
                <h2 className="font-semibold text-lg text-white mb-4">Application</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Server className="w-4 h-4" />
                    Version <span className="text-white">{app.version}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <Target className="w-4 h-4" />
                    Environment <span className="text-white capitalize">{app.environment}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <Database className="w-4 h-4" />
                    Database <span className="text-white">{app.database}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
    </AuthGuard>
  )
}
