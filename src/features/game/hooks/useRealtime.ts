import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export type GameEventType =
  | 'match_started'
  | 'round_created'
  | 'letter_guessed'     // Proponente ingresó una letra
  | 'powerup_used'       // Cualquiera activó un comodín
  | 'round_ended'
  | 'match_ended'
  | 'player_ready'
  | 'player_disconnected'
  | 'player_reconnected'
  | 'chat_message'       // Mensaje de chat (texto, petición de letra, notif. comodín)

export interface GameEvent {
  type: GameEventType
  payload: Record<string, unknown>
  senderId: string
}

interface UseRealtimeOptions {
  roomCode: string
  userId: string
  onEvent: (event: GameEvent) => void
  onPresenceChange?: (online: string[]) => void
}

/** Hook para sincronización en tiempo real vía Supabase Realtime */
export function useRealtime({
  roomCode,
  userId,
  onEvent,
  onPresenceChange,
}: UseRealtimeOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null)

  const sendEvent = useCallback(
    (type: GameEventType, payload: Record<string, unknown>) => {
      if (!channelRef.current) return
      channelRef.current.send({
        type: 'broadcast',
        event: 'game_event',
        payload: { type, payload, senderId: userId },
      })
    },
    [userId]
  )

  useEffect(() => {
    const channel = supabase.channel(`room:${roomCode}`, {
      config: {
        broadcast: { self: false },
        presence: { key: userId },
      },
    })

    // Escuchar eventos de juego (broadcast)
    channel.on('broadcast', { event: 'game_event' }, ({ payload }) => {
      if (payload?.senderId !== userId) {
        onEvent(payload as GameEvent)
      }
    })

    // Presencia: saber quién está online
    if (onPresenceChange) {
      channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const onlineIds = Object.values(state)
          .flat()
          .map((p) => (p as unknown as { user_id: string }).user_id)
        onPresenceChange(onlineIds)
      })

      channel.on('presence', { event: 'join' }, () => {
        const state = channel.presenceState()
        const onlineIds = Object.values(state)
          .flat()
          .map((p) => (p as unknown as { user_id: string }).user_id)
        onPresenceChange(onlineIds)
      })

      channel.on('presence', { event: 'leave' }, () => {
        const state = channel.presenceState()
        const onlineIds = Object.values(state)
          .flat()
          .map((p) => (p as unknown as { user_id: string }).user_id)
        onPresenceChange(onlineIds)
      })
    }

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Trackear presencia
        await channel.track({ user_id: userId, online_at: new Date().toISOString() })
      }
    })

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
      channelRef.current = null
    }
  }, [roomCode, userId, onEvent, onPresenceChange])

  return { sendEvent }
}
