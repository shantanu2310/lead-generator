"use client"

import { useCallback, useEffect, useState } from "react"
import { api } from "@/lib/api"

export type Notification = {
  id: string
  type: string
  title: string
  message: string | null
  lead_id: string | null
  read: boolean
  created_at: string
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    try {
      const [notifs, countResult] = await Promise.all([
        api.getNotifications(),
        api.getUnreadCount(),
      ])
      setNotifications(notifs)
      setUnreadCount(countResult.count)
    } catch (err) {
      console.error("Failed to fetch notifications", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch()
    const interval = setInterval(fetch, 15000)
    return () => clearInterval(interval)
  }, [fetch])

  const markRead = useCallback(async (id: string) => {
    await api.markNotificationRead(id)
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }, [])

  const markAllRead = useCallback(async () => {
    await api.markAllNotificationsRead()
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
  }, [])

  return { notifications, unreadCount, loading, markRead, markAllRead, refetch: fetch }
}
