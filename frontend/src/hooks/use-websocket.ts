"use client"

import { useEffect, useRef, useState } from "react"
import { WS_URL } from "@/lib/constants"

type WSEvent = {
  event: string
  data: Record<string, unknown>
}

type EventHandler = (data: Record<string, unknown>) => void

export function useWebSocket() {
  const [connected, setConnected] = useState(false)
  const handlersRef = useRef<Map<string, EventHandler[]>>(new Map())
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout>
    let closed = false

    function connect() {
      if (closed) return
      try {
        const ws = new WebSocket(WS_URL)
        wsRef.current = ws

        ws.onopen = () => setConnected(true)

        ws.onmessage = (msg) => {
          try {
            const parsed: WSEvent = JSON.parse(msg.data)
            const handlers = handlersRef.current.get(parsed.event) || []
            handlers.forEach((fn) => fn(parsed.data))
            if (parsed.event === "pipeline:changed") {
              window.dispatchEvent(new Event("pipeline:changed"))
            }
          } catch { /* ignore parse errors */ }
        }

        ws.onclose = () => {
          setConnected(false)
          wsRef.current = null
          if (!closed) {
            reconnectTimer = setTimeout(connect, 3000)
          }
        }

        ws.onerror = () => ws.close()
      } catch {
        if (!closed) {
          reconnectTimer = setTimeout(connect, 3000)
        }
      }
    }

    connect()

    return () => {
      closed = true
      clearTimeout(reconnectTimer)
      wsRef.current?.close()
    }
  }, [])

  function on(event: string, handler: EventHandler) {
    const existing = handlersRef.current.get(event) || []
    existing.push(handler)
    handlersRef.current.set(event, existing)
    return () => {
      const handlers = handlersRef.current.get(event) || []
      handlersRef.current.set(event, handlers.filter((h) => h !== handler))
    }
  }

  return { connected, on }
}
