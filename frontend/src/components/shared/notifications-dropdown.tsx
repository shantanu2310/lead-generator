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
  new_lead: { icon: Users, color: "text-[#41808B]", bg: "bg-[#57A3AF]/15" },
  email_verified: { icon: Mail, color: "text-green-600", bg: "bg-green-100" },
  high_score_lead: { icon: Flame, color: "text-orange-600", bg: "bg-orange-100" },
  deal_won: { icon: Trophy, color: "text-green-600", bg: "bg-green-100" },
  deal_lost: { icon: XCircle, color: "text-red-600", bg: "bg-red-100" },
  ai_insight: { icon: Sparkles, color: "text-[#F46036]", bg: "bg-[#F46036]/10" },
}

function getStyle(type: string) {
  return TYPE_STYLES[type] || { icon: Bell, color: "text-gray-500", bg: "bg-slate-100" }
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
        className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-0.5 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
            <h3 className="text-sm font-medium text-slate-900">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 text-xs text-slate-500">({unreadCount} unread)</span>
              )}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 transition-colors"
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
                    <div className="w-9 h-9 rounded-lg bg-slate-100 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-slate-100 rounded w-3/4" />
                      <div className="h-2.5 bg-slate-100 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-10">
                <Inbox className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">No notifications yet</p>
                <p className="text-xs text-slate-400 mt-1">New leads and events will appear here</p>
              </div>
            ) : (
              notifications.slice(0, 20).map((n) => {
                const { icon: Icon, color, bg } = getStyle(n.type)
                return (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`w-full text-left flex items-start gap-3 px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                      !n.read ? "bg-[#57A3AF]/5" : ""
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${bg}`}>
                      <Icon className={`w-4.5 h-4.5 ${color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${n.read ? "text-slate-600" : "text-slate-900 font-medium"} leading-snug`}>
                        {n.title}
                      </p>
                      {n.message && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-snug">{n.message}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[11px] text-slate-400">{formatRelativeTime(n.created_at)}</span>
                        {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-[#F46036]" />}
                      </div>
                    </div>
                    {n.lead_id && (
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-1" />
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
