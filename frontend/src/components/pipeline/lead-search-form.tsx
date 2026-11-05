"use client"

import { Sparkles, Loader2 } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { api } from "@/lib/api"
import { useProducts } from "@/hooks/use-products"

type SearchResult = { search_id: string | null; leads: unknown[] }

type SearchMode = "company" | "person"

async function getCoords(): Promise<{ latitude?: number; longitude?: number }> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return {}
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve({}),
      { timeout: 8000, maximumAge: 60000 },
    )
  })
}

export function LeadSearchForm({
  onComplete,
  onGeneratingChange,
}: {
  onComplete?: (result: SearchResult) => void
  onGeneratingChange?: (generating: boolean) => void
}) {
  const { products, productsError, productsLoading } = useProducts()
  const [query, setQuery] = useState("")
  const [maxLeads, setMaxLeads] = useState(5)
  const [chosenProductId, setProductId] = useState("")
  const [mode, setMode] = useState<SearchMode>("company")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const productId = products.some((p) => p.id === chosenProductId) ? chosenProductId : products[0]?.id || ""

  async function run(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = query.trim()
    if (!trimmed || !productId) {
      setMessage({ ok: false, text: !trimmed ? "Enter a company or opportunity to search for." : "Select a product before generating leads." })
      return
    }
    setLoading(true)
    onGeneratingChange?.(true)
    setMessage(null)
    try {
      const coords = await getCoords()
      const result: SearchResult = await api.searchLeads({
        query: trimmed,
        max_leads: maxLeads,
        department_id: productId,
        mode,
        ...coords,
      })
      setMessage({ ok: true, text: `${result.leads.length} lead${result.leads.length === 1 ? "" : "s"} generated for “${trimmed}”.` })
      onComplete?.(result)
    } catch (err: unknown) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Generation failed. Check the search history and try again." })
    } finally {
      setLoading(false)
      onGeneratingChange?.(false)
    }
  }

  return (
    <form onSubmit={run} className="grid grid-cols-1 sm:grid-cols-2 items-end gap-3">
      <div className="min-w-0 sm:col-span-2">
        <div className="flex items-center justify-between mb-1.5 gap-3">
          <label htmlFor="lead-query" className="block text-xs font-medium text-slate-600">Search</label>
          <div role="group" aria-label="Search mode" className="flex rounded-lg border border-slate-300 overflow-hidden text-xs font-medium shrink-0">
            <button type="button" onClick={() => setMode("company")} disabled={loading}
              aria-pressed={mode === "company"}
              className={`px-3 py-1 transition-colors disabled:opacity-50 ${mode === "company" ? "bg-[#F46036] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>
              Company
            </button>
            <button type="button" onClick={() => setMode("person")} disabled={loading}
              aria-pressed={mode === "person"}
              className={`px-3 py-1 transition-colors disabled:opacity-50 ${mode === "person" ? "bg-[#F46036] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>
              Person
            </button>
          </div>
        </div>
        <input id="lead-query" value={query} onChange={(e) => setQuery(e.target.value)} disabled={loading}
          placeholder={mode === "person" ? "e.g. HR managers in Amsterdam" : "e.g. recruitment agencies in Amsterdam"}
          className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#F46036] disabled:opacity-50" />
      </div>
        <div className="min-w-0">
          <label htmlFor="lead-product" className="block text-xs font-medium text-slate-600 mb-1.5">Product</label>
          <select id="lead-product" value={productId} onChange={(e) => setProductId(e.target.value)} disabled={loading || !products.length}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 disabled:opacity-50">
            {!products.length && <option value="">No products</option>}
            {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
          </select>
        </div>
        <div className="min-w-0">
          <label htmlFor="lead-count" className="block text-xs font-medium text-slate-600 mb-1.5">Number of leads</label>
          <select id="lead-count" value={maxLeads} onChange={(e) => setMaxLeads(Number(e.target.value))} disabled={loading}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 disabled:opacity-50">
            {[5, 10, 15].map((n) => <option key={n} value={n}>{n} leads</option>)}
          </select>
        </div>
      <button type="submit" disabled={loading || !productId}
        className="sm:col-span-2 flex items-center justify-center gap-2 px-5 py-2 bg-[#F46036] hover:bg-[#D94A22] disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap">
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating leads…</> : <><Sparkles className="w-4 h-4" /> Generate Leads</>}
      </button>
      {!products.length && <p className="col-span-full text-sm text-slate-500">{productsLoading ? "Loading products…" : productsError || <>Add a product in <Link className="text-[#41808B] underline" href="/settings#products">Settings</Link> to start generating leads.</>}</p>}
      {loading && <p role="status" className="col-span-full text-xs text-slate-500">Searching and verifying companies. This may take a few minutes.</p>}
      {message && <p role="status" className={`col-span-full text-sm ${message.ok ? "text-green-700" : "text-red-700"}`}>{message.text}</p>}
    </form>
  )
}
