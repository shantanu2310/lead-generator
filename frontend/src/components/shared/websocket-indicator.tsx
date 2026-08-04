"use client"

import { useWebSocket } from "@/hooks/use-websocket"
import { Wifi, WifiOff } from "lucide-react"

export function WebSocketIndicator() {
  const { connected } = useWebSocket()

  return (
    <div className="flex items-center gap-1.5">
      {connected ? (
        <>
          <Wifi className="w-3.5 h-3.5 text-green-400" />
          <span className="text-xs text-green-400">Live</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-xs text-gray-500">Offline</span>
        </>
      )}
    </div>
  )
}
