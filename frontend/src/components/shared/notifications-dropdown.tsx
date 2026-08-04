"use client"

import { useState, useRef, useEffect } from "react"
import {
  Bell,
  CheckCheck,
  Mail,
  Users,
  Flame,
  Trophy,
  XCircle,
  Sparkles,
  ArrowRight,
  Inbox,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useNotifications } from "@/hooks/use-notifications"
import { formatRelativeTime } from "@/lib/utils"

const TYPE_STYLES: Record<string, { icon: any; color: string; bg: string }> = {
  new_lead: { icon: Users, color: "text-blue-400", bg: "bg-blue-500/15" },
  email_verified: { icon: Mail, color: "text-green-400", bg: "bg-green-500/15" },
  high_score_lead: { icon: Flame, color: "text-orange-400", bg: "bg-orange-500/15" },
  deal_won: { icon: Trophy, color: "text-green-400", bg: "bg-green-500/15" },
  deal_lost: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/15" },
  ai_insight: { icon: Sparkles, color: "text-purple-400", bg: "bg-purple-500/15" },
}

function getStyle(type: string) {
  return TYPE_STYLES[type] || { icon: Bell, color: "text-gray-400", bg: "bg-white/10" }
}

export function NotificationsDropdown() {
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  async function handleNotificationClick(n: (typeof notifications)[number]) {
    if (!n.read) await markRead(n.id)
    if (n.lead_id) {
      setOpen(false)
      router.push(`/pipeline/leads/${n.lead_id}`)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-white/5 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-400" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-0.5 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-gray-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/3">
            <h3 className="text-sm font-medium text-white">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 text-xs text-gray-400">({unreadCount} unread)</span>
              )}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="space-y-3 p-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-9 h-9 rounded-lg bg-white/5 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-white/5 rounded w-3/4" />
                      <div className="h-2.5 bg-white/5 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-10">
                <Inbox className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No notifications yet</p>
                <p className="text-xs text-gray-600 mt-1">New leads and events will appear here</p>
              </div>
            ) : (
              notifications.slice(0, 20).map((n) => {
                const { icon: Icon, color, bg } = getStyle(n.type)
                return (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`w-full text-left flex items-start gap-3 px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors ${
                      !n.read ? "bg-blue-500/5" : ""
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${bg}`}>
                      <Icon className={`w-4.5 h-4.5 ${color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${n.read ? "text-gray-300" : "text-white font-medium"} leading-snug`}>
                        {n.title}
                      </p>
                      {n.message && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-snug">{n.message}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[11px] text-gray-600">{formatRelativeTime(n.created_at)}</span>
                        {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                      </div>
                    </div>
                    {n.lead_id && (
                      <ArrowRight className="w-3.5 h-3.5 text-gray-600 flex-shrink-0 mt-1" />
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
