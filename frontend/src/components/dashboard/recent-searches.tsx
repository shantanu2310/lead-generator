"use client"

import { useEffect, useState } from "react"
import { History, ArrowRight } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { formatRelativeTime } from "@/lib/utils"

type SearchItem = {
  id: string
  query: string
  lead_count: number
  created_at: string
}

export function RecentSearches({ refreshKey = 0 }: { refreshKey?: number }) {
  const [items, setItems] = useState<SearchItem[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const data = await api.listSearches({ page: "1", page_size: "5" })
        setItems(data.items)
      } catch (err) {
        console.error("Failed to fetch recent searches", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [refreshKey])

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg text-white">Recent Searches</h3>
        <Link href="/searches" className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors">
          View all
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 bg-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">No searches yet</p>
      ) : (
        <div className="space-y-2">
          {items.map((s) => (
            <button
              key={s.id}
              onClick={() => router.push(`/pipeline?search_id=${s.id}&q=${encodeURIComponent(s.query)}`)}
              className="w-full text-left flex items-center justify-between gap-3 p-3 rounded-lg bg-white/3 border border-white/5 hover:bg-white/5 hover:border-white/10 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <History className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <span className="text-sm text-gray-200 truncate">{s.query}</span>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-blue-400">{s.lead_count} leads</p>
                <p className="text-[11px] text-gray-600">{formatRelativeTime(s.created_at)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
