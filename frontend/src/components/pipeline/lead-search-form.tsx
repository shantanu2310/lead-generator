"use client"

import { Sparkles, Loader2 } from "lucide-react"
import { useState } from "react"
import { api } from "@/lib/api"

export function LeadSearchForm({
  onComplete,
}: {
  onComplete?: (count: number) => void
}) {
  const [query, setQuery] = useState("")
  const [maxLeads, setMaxLeads] = useState(5)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  async function run() {
    const trimmed = query.trim()
    if (!trimmed) {
      setMessage({ ok: false, text: "Please enter a search query, e.g. \"plumbers in Austin Texas\"" })
      return
    }
    setLoading(true)
    setMessage(null)
    try {
      const result = await api.searchLeads({ query: trimmed, max_leads: maxLeads })
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
    <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 backdrop-blur-xl">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
          <input
            type="text"
            placeholder='e.g. plumbers in Austin Texas'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") run()
            }}
            disabled={loading}
            className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-400/40 disabled:opacity-50"
          />
        </div>

        <select
          value={maxLeads}
          onChange={(e) => setMaxLeads(Number(e.target.value))}
          disabled={loading}
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-white/20 disabled:opacity-50"
        >
          {[5, 10, 15, 25].map((n) => (
            <option key={n} value={n}>{n} leads</option>
          ))}
        </select>

        <button
          onClick={run}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2 bg-blue-500 hover:bg-blue-400 disabled:bg-blue-500/40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
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
        <p className={`mt-3 text-sm ${message.ok ? "text-green-400" : "text-red-400"}`}>
          {message.text}
        </p>
      )}
    </div>
  )
}
