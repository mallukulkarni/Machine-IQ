import { useState, useEffect, useRef, useCallback } from 'react'
import type { SensorReading, AIAnalysis } from '@/types'
import { supabase } from '@/utils/supabase'

interface WSMessage {
  reading: SensorReading
  analysis: AIAnalysis
}

interface UseWebSocketResult {
  latest: WSMessage | null
  connected: boolean
  sendScenario: (scenario: string) => void
}

export function useWebSocket(materialId: string, autoConnect = true): UseWebSocketResult {
  const [latest, setLatest] = useState<WSMessage | null>(null)
  const [connected, setConnected] = useState(false)
  const ws = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const active = useRef(false)
  const scenario = useRef('normal')
  
  const connect = useCallback(() => {
    if (!active.current) return
    const sessionRequest = supabase
      ? supabase.auth.getSession()
      : Promise.resolve({ data: { session: null }, error: null })
    void sessionRequest.then(({ data, error }) => {
      if (error) {
        console.error('[Auth Error] Could not retrieve WebSocket token', error.message)
        setConnected(false)
        return
      }
      if (!active.current) return
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = new URL(`/api/v1/sensors/ws/${encodeURIComponent(materialId)}`, window.location.origin)
      wsUrl.protocol = protocol
      const accessToken = data.session?.access_token
      ws.current = new WebSocket(wsUrl)
      ws.current.onopen = () => {
        setConnected(true)
        ws.current?.send(JSON.stringify({ scenario: scenario.current, token: accessToken }))
      }
      ws.current.onclose = () => {
        setConnected(false)
        if (active.current) reconnectTimer.current = setTimeout(connect, 3000)
      }
      ws.current.onerror = () => setConnected(false)
      ws.current.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data) as WSMessage
          setLatest(msg)
        } catch { /* ignore malformed server messages */ }
      }
    })
  }, [materialId])
  
  useEffect(() => {
    if (!autoConnect) return
    active.current = true
    connect()
    return () => {
      active.current = false
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      ws.current?.close()
    }
  }, [connect, autoConnect])
  
  const sendScenario = useCallback((sc: string) => {
    scenario.current = sc
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ scenario: sc }))
    }
  }, [])
  
  return { latest, connected, sendScenario }
}
