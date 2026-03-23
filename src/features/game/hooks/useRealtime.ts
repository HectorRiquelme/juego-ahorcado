import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'
// FIX BUG 1+8: onEvent se guarda en ref para evitar que el canal se
// destruya y recree con cada cambio de estado (stale closure + doble canal)

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

  // Guardar callbacks en refs para que el canal NO se recree cuando cambian
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent
  const onPresenceChangeRef = useRef(onPresenceChange)
  onPresenceChangeRef.current = onPresenceChange

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
    // Usamos la ref para evitar recrear el canal con cada cambio de onEvent
    channel.on('broadcast', { event: 'game_event' }, ({ payload }) => {
      if (payload?.senderId !== userId) {
        onEventRef.current(payload as GameEvent)
      }
    })

    // Presencia: saber quién está online
    const handlePresenceUpdate = () => {
      if (!onPresenceChangeRef.current) return
      const state = channel.presenceState()
      const onlineIds = Object.values(state)
        .flat()
        .map((p) => (p as unknown as { user_id: string }).user_id)
      onPresenceChangeRef.current(onlineIds)
    }

    channel.on('presence', { event: 'sync' }, handlePresenceUpdate)
    channel.on('presence', { event: 'join' }, handlePresenceUpdate)
    channel.on('presence', { event: 'leave' }, handlePresenceUpdate)

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        try {
          await channel.track({ user_id: userId, online_at: new Date().toISOString() })
        } catch (err) {
          console.error('Realtime track failed:', err)
        }
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error('Realtime channel error:', status)
      }
    })

    channelRef.current = channel

    return () => {
      try { channel.unsubscribe() } catch { /* cleanup */ }
      channelRef.current = null
    }
    // Solo roomCode y userId crean/destruyen el canal real
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, userId])

  return { sendEvent }
}
