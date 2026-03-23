import { useState, useCallback, useRef, useEffect } from 'react'
import type { ChatMessage, ChatMessageType } from '@/types/game'
import type { PowerupType } from '@/types'
import type { GameEventType } from './useRealtime'

interface UseChatOptions {
  userId: string
  userName: string
  /** Función para emitir eventos de juego (viene de useRealtime) */
  sendEvent: (type: GameEventType, payload: Record<string, unknown>) => void
  /** Mensaje de bienvenida inicial */
  welcomeMessage?: string
}

export function useChat({ userId, userName, sendEvent, welcomeMessage }: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const initial: ChatMessage[] = []
    if (welcomeMessage) {
      initial.push({
        id: 'system-start',
        senderId: 'system',
        senderName: 'Cuellito',
        text: welcomeMessage,
        timestamp: new Date().toISOString(),
        type: 'system',
      })
    }
    return initial
  })

  const bottomRef = useRef<HTMLDivElement | null>(null)

  // Auto-scroll al último mensaje
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const MAX_MESSAGES = 200

  /** Agrega un mensaje recibido del otro jugador (viene por Realtime) */
  const receiveMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => {
      // Evitar duplicados por si llega dos veces
      if (prev.some((m) => m.id === msg.id)) return prev
      const next = [...prev, msg]
      return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next
    })
  }, [])

  /** Agrega un mensaje del sistema localmente (sin broadcast) */
  const addSystemMessage = useCallback((text: string) => {
    const msg: ChatMessage = {
      id: `sys-${Date.now()}`,
      senderId: 'system',
      senderName: 'Cuellito',
      text,
      timestamp: new Date().toISOString(),
      type: 'system',
    }
    setMessages((prev) => [...prev, msg])
  }, [])

  /** Envía un mensaje de texto libre */
  const sendText = useCallback(
    (text: string) => {
      if (!text.trim()) return
      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        senderId: userId,
        senderName: userName,
        text: text.trim(),
        timestamp: new Date().toISOString(),
        type: 'text',
      }
      setMessages((prev) => [...prev, msg])
      sendEvent('chat_message', { message: msg })
    },
    [userId, userName, sendEvent]
  )

  /** El desafiado pide una letra (aparece resaltado en el chat) */
  const requestLetter = useCallback(
    (letter: string) => {
      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        senderId: userId,
        senderName: userName,
        text: `¿Me das la ${letter}?`,
        timestamp: new Date().toISOString(),
        type: 'letter_request',
        meta: { letter },
      }
      setMessages((prev) => [...prev, msg])
      sendEvent('chat_message', { message: msg })
    },
    [userId, userName, sendEvent]
  )

  /** Notifica en el chat que se activó un comodín (broadcast a ambos) */
  const notifyPowerup = useCallback(
    (powerupType: PowerupType, activatorName: string, label: string) => {
      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        senderId: 'system',
        senderName: 'Cuellito',
        text: `✨ ${activatorName} activó "${label}"`,
        timestamp: new Date().toISOString(),
        type: 'powerup_notif',
        meta: { powerupType },
      }
      setMessages((prev) => [...prev, msg])
      sendEvent('chat_message', { message: msg })
    },
    [sendEvent]
  )

  return {
    messages,
    bottomRef,
    receiveMessage,
    addSystemMessage,
    sendText,
    requestLetter,
    notifyPowerup,
  }
}

// Re-exportamos el tipo para usarlo en otros lados
export type { ChatMessageType }
