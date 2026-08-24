"use client"

import { useEffect, useState } from "react"
import { KeyRound, Save, CheckCircle2, XCircle, Loader2, Database, Server, UserRound, Target } from "lucide-react"
import { AvatarPicker } from "@/components/shared/avatar"
import { api } from "@/lib/api"
import { getToken, getUser, setAuth } from "@/lib/auth"

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
  const [avatar, setAvatar] = useState<string | null>(user?.avatar_url ?? null)
  const [profileName, setProfileName] = useState(user?.name || "")
  const [savingProfile, setSavingProfile] = useState(false)
  const [password, setPassword] = useState("")
  const [savingPassword, setSavingPassword] = useState(false)

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
    if (user?.is_admin) load()
    else setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  async function saveProfile() {
    setSavingProfile(true)
    setMsg(null)
    try {
      const updated = await api.updateMe({
        name: profileName.trim(),
        avatar_url: avatar ?? "",
      })
      setAuth(getToken() || "", updated)
      setMsg({ ok: true, text: "Profile updated" })
      window.location.reload()
    } catch (err: any) {
      setMsg({ ok: false, text: err.message || "Failed to save profile" })
    } finally {
      setSavingProfile(false)
    }
  }

  async function changePassword() {
    if (password.length < 6) {
      setMsg({ ok: false, text: "Password must be at least 6 characters" })
      return
    }
    setSavingPassword(true)
    setMsg(null)
    try {
      await api.updateMe({ password })
      setPassword("")
      setMsg({ ok: true, text: "Password updated" })
    } catch (err: any) {
      setMsg({ ok: false, text: err.message || "Failed to update password" })
    } finally {
      setSavingPassword(false)
    }
  }

  return (
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
                <UserRound className="w-5 h-5 text-[#F46036]" />
                <h2 className="font-semibold text-lg text-slate-900">Profile</h2>
              </div>
              <p className="text-sm text-slate-500 mb-5">
                Your photo shows in the sidebar menu, user list and team leads view.
              </p>
              <div className="space-y-5">
                <AvatarPicker value={avatar} onChange={setAvatar} />
                <div className="max-w-sm">
                  <label className="block text-xs text-slate-500 mb-1.5">Display name</label>
                  <input
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-[#F46036]"
                  />
                </div>
                <button
                  onClick={saveProfile}
                  disabled={savingProfile}
                  className="flex items-center gap-2 px-5 py-2 bg-[#F46036] hover:bg-[#D94A22] disabled:bg-[#F46036]/40 text-sm font-medium text-white rounded-lg transition-colors"
                >
                  {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save profile
                </button>

                <div className="pt-5 border-t border-slate-200 max-w-sm">
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">New password</label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-[#F46036]"
                    />
                    <button
                      onClick={changePassword}
                      disabled={savingPassword || !password}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-40 text-sm font-medium text-slate-700 rounded-lg transition-colors"
                    >
                      {savingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                      Update
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {user?.is_admin && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
              <div className="flex items-center gap-2 mb-1">
                <KeyRound className="w-5 h-5 text-[#F46036]" />
                <h2 className="font-semibold text-lg text-slate-900">API Providers</h2>
              </div>
              <p className="text-sm text-slate-500 mb-5">
                Keys are stored in <code className="text-slate-700">.env</code> and take effect immediately — no restart needed.
              </p>

              <div className="space-y-4">
                {providers.map((p) => {
                  const editing = editingKey === p.key
                  const saving = savingKey === p.key
                  return (
                    <div key={p.key} className="flex items-center justify-between gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-900">{p.name}</p>
                          {p.configured ? (
                            <span className="flex items-center gap-1 text-[11px] text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" /> Configured
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[11px] text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                              <XCircle className="w-3 h-3" /> Not configured
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1 font-mono">
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
                            className="w-56 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#F46036]"
                          />
                          <button
                            onClick={() => saveProvider(p)}
                            disabled={saving}
                            className="flex items-center gap-1.5 px-4 py-2 bg-[#F46036] hover:bg-[#D94A22] disabled:bg-[#F46036]/40 text-sm font-medium text-white rounded-lg transition-colors"
                          >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save
                          </button>
                          <button
                            onClick={() => setEditingKey(null)}
                            className="px-3 py-2 text-sm text-slate-500 hover:text-slate-900 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingKey(p.key); setMsg(null) }}
                          className="flex-shrink-0 px-4 py-2 text-sm text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                          {p.configured ? "Replace key" : "Add key"}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="flex items-center gap-3 mt-5 pt-5 border-t border-slate-200">
                <label className="text-sm text-slate-500">LLM Model</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-[#F46036]"
                >
                  <option value="gpt-4o">gpt-4o</option>
                  <option value="gpt-4o-mini">gpt-4o-mini</option>
                  <option value="gpt-4.1">gpt-4.1</option>
                  <option value="gpt-4.1-mini">gpt-4.1-mini</option>
                </select>
                <button
                  onClick={saveModel}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Save model
                </button>
              </div>
            </div>
            )}

            {user?.is_admin && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
              <h2 className="font-semibold text-lg text-slate-900 mb-1">Pipeline Defaults</h2>
              <p className="text-sm text-slate-500 mb-5">Defaults used for new lead searches and scoring.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PIPELINE_FIELDS.map((f) => (
                  <div key={f.key}>
                    <label className="block text-xs text-slate-500 mb-1.5">{f.label}</label>
                    <input
                      type="number"
                      value={pipelineForm[f.key] ?? ""}
                      onChange={(e) => setPipelineForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-[#F46036]"
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={savePipeline}
                disabled={savingPipeline}
                className="mt-5 flex items-center gap-2 px-5 py-2 bg-[#F46036] hover:bg-[#D94A22] disabled:bg-[#F46036]/40 text-sm font-medium text-white rounded-lg transition-colors"
              >
                {savingPipeline ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save pipeline settings
              </button>
            </div>
            )}

            {app && user?.is_admin && (
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
                <h2 className="font-semibold text-lg text-slate-900 mb-4">Application</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Server className="w-4 h-4" />
                    Version <span className="text-slate-900">{app.version}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <Target className="w-4 h-4" />
                    Environment <span className="text-slate-900 capitalize">{app.environment}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <Database className="w-4 h-4" />
                    Database <span className="text-slate-900">{app.database}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
  )
}
