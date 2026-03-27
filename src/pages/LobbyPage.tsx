import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase, db } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useRoomStore } from '@/stores/roomStore'
import { useGameStore } from '@/stores/gameStore'
import { getRoomByCode } from '@/features/rooms/services/roomService'
import { createMatch } from '@/features/game/services/gameService'
import { getOrCreateDuo } from '@/features/stats/services/statsService'
import { useRealtime } from '@/features/game/hooks/useRealtime'
import type { GameEvent } from '@/features/game/hooks/useRealtime'
import type { Profile } from '@/types'
import Layout from '@/components/layout/Layout'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { slideUp, staggerChildren } from '@/animations/variants'
import { GAME_MODE_LABELS } from '@/utils/constants'
import toast from 'react-hot-toast'

export default function LobbyPage() {
  const { code } = useParams<{ code: string }>()
  const { user } = useAuthStore()
  const { room, setRoom, setHostProfile, setGuestProfile, hostProfile, guestProfile } = useRoomStore()
  const { setGameState } = useGameStore()
  const navigate = useNavigate()

  const [onlinePlayers, setOnlinePlayers] = useState<string[]>([])
  const [startingGame, setStartingGame] = useState(false)
  const [copied, setCopied] = useState(false)

  const isHost = room?.host_id === user?.id
  // bothConnected: guest_id en BD + oponente realmente presente en Realtime
  const guestInPresence = room?.guest_id ? onlinePlayers.includes(room.guest_id) : false
  const bothConnected = room?.guest_id != null && guestInPresence

  // Manejar eventos del lobby
  const handleEvent = useCallback(
    (event: GameEvent) => {
      if (event.type === 'match_started') {
        // BUG 2 FIX: incluir firstProposerId para que el guest sepa quién propone primero
        const { matchId, firstProposerId } = event.payload as { matchId: string; firstProposerId: string }
        navigate(`/rooms/${code}/game`, { state: { matchId, firstProposerId } })
      }
    },
    [code, navigate]
  )

  const { sendEvent } = useRealtime({
    roomCode: code ?? '',
    userId: user?.id ?? '',
    onEvent: handleEvent,
    onPresenceChange: setOnlinePlayers,
  })

  // Cargar sala y perfiles si no están en el store
  useEffect(() => {
    if (!code || !user) return

    const loadRoom = async () => {
      if (!room) {
        try {
          const r = await getRoomByCode(code)
          if (!r) { navigate('/home'); return }
          setRoom(r)
        } catch (err) {
          console.error('Error loading room:', err)
          toast.error('Error cargando sala')
          navigate('/home')
        }
      }
    }
    loadRoom()
  }, [code, user, room, setRoom, navigate])

  // Cargar perfiles de los jugadores
  useEffect(() => {
    if (!room) return

    const loadProfiles = async () => {
      if (!hostProfile) {
        const { data } = await supabase.from('profiles').select('*').eq('id', room.host_id).single()
        if (data) setHostProfile(data as Profile)
      }
      if (room.guest_id && !guestProfile) {
        const { data } = await supabase.from('profiles').select('*').eq('id', room.guest_id).single()
        if (data) setGuestProfile(data as Profile)
      }
    }
    loadProfiles()
  }, [room, hostProfile, guestProfile, setHostProfile, setGuestProfile])

  // Suscripción a cambios de la sala (para detectar cuando entra el guest)
  // Usar ref del room.id para evitar re-suscripciones cada vez que room cambia
  const roomIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!room) return
    // Solo suscribirse una vez por room.id
    if (roomIdRef.current === room.id) return
    roomIdRef.current = room.id

    const subscription = supabase
      .channel(`room-db-${room.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'rooms',
        filter: `id=eq.${room.id}`,
      }, ({ new: updated }) => {
        setRoom(updated as typeof room)
      })
      .subscribe()

    return () => {
      roomIdRef.current = null
      subscription.unsubscribe()
    }
  }, [room?.id, setRoom]) // Solo room.id, no room completo

  const copyCode = () => {
    navigator.clipboard.writeText(room?.code ?? '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Código copiado')
  }

  const startGame = async () => {
    if (!room || !user || !room.guest_id) return
    setStartingGame(true)
    try {
      const duo = await getOrCreateDuo(room.host_id, room.guest_id)

      // Actualizar duo_id en la sala
      await db.from('rooms').update({ duo_id: duo.id }).eq('id', room.id)

      const match = await createMatch({
        roomId: room.id,
        player1Id: room.host_id,
        player2Id: room.guest_id ?? '',
        mode: room.mode,
        totalRounds: room.max_rounds,
        duoId: duo.id,
      })

      // Determinar quién va primero (aleatorio)
      const firstProposer = Math.random() < 0.5 ? room.host_id : room.guest_id

      setGameState({
        matchId: match.id,
        roomCode: code ?? '',
        mode: match.mode,
        currentRound: 1,
        totalRounds: match.total_rounds,
        myScore: 0,
        opponentScore: 0,
        myId: user.id,
        opponentId: room.guest_id,
        opponentName:
          guestProfile?.display_name ?? guestProfile?.username ?? 'Oponente',
        opponentAvatar: guestProfile?.avatar_url ?? null,
        status: 'proposer_choosing',
        roundState: null,
        disconnectedAt: null,
        disconnectedPlayerId: null,
      })

      // Notificar al otro jugador
      sendEvent('match_started', { matchId: match.id, firstProposerId: firstProposer })
      navigate(`/rooms/${code}/game`, { state: { matchId: match.id, firstProposerId: firstProposer } })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al iniciar')
      setStartingGame(false)
    }
  }

  if (!room) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-lg mx-auto px-4 py-8">
        <motion.div
          variants={staggerChildren}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-6"
        >
          <motion.div variants={slideUp}>
            <h1 className="text-2xl font-bold text-text">Sala de espera</h1>
            <p className="text-text-muted text-sm mt-1">
              Modo: {GAME_MODE_LABELS[room.mode]} · {room.max_rounds} rondas
            </p>
          </motion.div>

          {/* Código de sala */}
          <motion.div variants={slideUp}>
            <Card glass>
              <div className="text-center">
                <p className="text-sm text-text-muted mb-2">Código de sala</p>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-4xl font-mono font-black text-text tracking-widest">
                    {room.code}
                  </span>
                  <button
                    onClick={copyCode}
                    className="p-2 rounded-lg bg-bg-surface2 hover:bg-border transition-colors"
                    title="Copiar código"
                    aria-label="Copiar código de sala"
                  >
                    {copied ? (
                      <span className="text-success text-sm">✓</span>
                    ) : (
                      <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="text-xs text-text-subtle mt-2">
                  Comparte este código con tu compañero/a
                </p>
              </div>
            </Card>
          </motion.div>

          {/* Jugadores */}
          <motion.div variants={slideUp} className="flex flex-col gap-3">
            <PlayerCard
              name={hostProfile?.display_name ?? hostProfile?.username ?? 'Anfitrión'}
              role="Anfitrión"
              online={onlinePlayers.includes(room.host_id)}
              isYou={room.host_id === user?.id}
            />
            <PlayerCard
              name={
                guestProfile
                  ? (guestProfile.display_name ?? guestProfile.username ?? 'Invitado')
                  : 'Esperando...'
              }
              role="Invitado"
              online={room.guest_id ? onlinePlayers.includes(room.guest_id) : false}
              waiting={!room.guest_id}
              isYou={room.guest_id === user?.id}
            />
          </motion.div>

          {/* Botón de inicio */}
          {isHost && (
            <motion.div variants={slideUp}>
              <Button
                onClick={startGame}
                loading={startingGame}
                disabled={!bothConnected}
                size="lg"
                fullWidth
              >
                {bothConnected ? 'Iniciar partida →' : 'Esperando al otro jugador...'}
              </Button>
              {!bothConnected && (
                <p className="text-xs text-text-subtle text-center mt-2">
                  Ambos jugadores deben estar conectados para empezar
                </p>
              )}
            </motion.div>
          )}

          {!isHost && (
            <motion.div variants={slideUp}>
              <Card className="text-center">
                <p className="text-text-muted">
                  {bothConnected
                    ? '✅ Listos. El anfitrión iniciará la partida...'
                    : '⏳ Esperando a que el anfitrión inicie...'}
                </p>
              </Card>
            </motion.div>
          )}
        </motion.div>
      </div>
    </Layout>
  )
}

function PlayerCard({
  name,
  role,
  online,
  waiting,
  isYou,
}: {
  name: string
  role: string
  online: boolean
  waiting?: boolean
  isYou: boolean
}) {
  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl border ${
      isYou ? 'border-primary/50 bg-primary/5' : 'border-border bg-bg-surface'
    }`}>
      <div className="relative">
        <div className="w-10 h-10 rounded-full bg-bg-surface2 border border-border flex items-center justify-center font-bold text-text">
          {waiting ? '?' : (name || '?').charAt(0).toUpperCase()}
        </div>
        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-bg ${
          online ? 'bg-success' : 'bg-border'
        }`} />
      </div>
      <div className="flex-1">
        <p className="font-medium text-text text-sm">
          {name}
          {isYou && <span className="text-xs text-primary-light ml-2">(tú)</span>}
        </p>
        <p className="text-xs text-text-muted">{role}</p>
      </div>
      <span className={`text-xs ${online ? 'text-success' : waiting ? 'text-text-subtle' : 'text-accent'}`}>
        {waiting ? 'Esperando' : online ? 'En línea' : 'Desconectado'}
      </span>
    </div>
  )
}
