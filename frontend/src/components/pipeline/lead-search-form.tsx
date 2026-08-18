"use client"

import { Sparkles, Loader2, Building2 } from "lucide-react"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"

type Department = { id: string; name: string; lead_count?: number }

export function LeadSearchForm({
  onComplete,
}: {
  onComplete?: (count: number) => void
}) {
  const [query, setQuery] = useState("")
  const [maxLeads, setMaxLeads] = useState(5)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [departmentId, setDepartmentId] = useState("")
  const [departmentsLoaded, setDepartmentsLoaded] = useState(false)

  useEffect(() => {
    api
      .listDepartments()
      .then((depts) => {
        setDepartments(depts || [])
        if (depts && depts.length > 0) setDepartmentId(depts[0].id)
      })
      .catch(() => {})
      .finally(() => setDepartmentsLoaded(true))
  }, [])

  const hasDepartments = departments.length > 0

  async function run() {
    const trimmed = query.trim()
    if (!hasDepartments) {
      setMessage({ ok: false, text: "Create a department in Settings before generating leads" })
      return
    }
    if (!departmentId) {
      setMessage({ ok: false, text: "Please select a department" })
      return
    }
    if (!trimmed) {
      setMessage({ ok: false, text: "Please enter a search query, e.g. \"plumbers in Austin Texas\"" })
      return
    }
    setLoading(true)
    setMessage(null)
    try {
      const result = await api.searchLeads({ query: trimmed, max_leads: maxLeads, department_id: departmentId })
      const count = result.leads?.length ?? 0
      setMessage({
        ok: true,
        text: `${count} lead${count === 1 ? "" : "s"} generated for "${trimmed}"`,
      })
      onComplete?.(count)
    } catch (err: any) {
      setMessage({ ok: false, text: err.message || "Search failed. Check backend logs." })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 rounded-xl border border-[#57A3AF]/25 bg-[#57A3AF]/5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#41808B]" />
          <input
            type="text"
            placeholder='e.g. plumbers in Austin Texas'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") run()
            }}
            disabled={loading}
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#F46036] disabled:opacity-50"
          />
        </div>

        {!departmentsLoaded ? (
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading departments...
          </div>
        ) : !hasDepartments ? (
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg">
            <Building2 className="w-4 h-4" />
            Create a department in Settings to generate leads
          </div>
        ) : (
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            disabled={loading}
            title="Department for these leads"
            className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-[#F46036] disabled:opacity-50"
          >
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        )}

        <select
          value={maxLeads}
          onChange={(e) => setMaxLeads(Number(e.target.value))}
          disabled={loading}
          className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-[#F46036] disabled:opacity-50"
        >
          {[5, 10, 15, 25].map((n) => (
            <option key={n} value={n}>{n} leads</option>
          ))}
        </select>

        <button
          onClick={run}
          disabled={loading || !hasDepartments}
          className="flex items-center gap-2 px-5 py-2 bg-[#F46036] hover:bg-[#D94A22] disabled:bg-[#F46036]/40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate Leads
            </>
          )}
        </button>
      </div>

      {message && (
        <p className={`mt-3 text-sm ${message.ok ? "text-green-700" : "text-red-700"}`}>
          {message.text}
        </p>
      )}
    </div>
  )
}