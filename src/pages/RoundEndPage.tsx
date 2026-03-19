import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useGameStore } from '@/stores/gameStore'
import { useAuthStore } from '@/stores/authStore'
import { useRoomStore } from '@/stores/roomStore'
import { supabase, db } from '@/lib/supabase'
import { useRealtime } from '@/features/game/hooks/useRealtime'
import type { GameEvent } from '@/features/game/hooks/useRealtime'
import { decodeWord } from '@/utils/wordNormalizer'
import Button from '@/components/ui/Button'
import { roundEndCard, staggerChildren, slideUp } from '@/animations/variants'
import { cn } from '@/utils/cn'

/**
 * Quién gana la ronda:
 *   result === 'won'          → el DESAFIADO adivinó      → Desafiado gana / Proponente pierde
 *   result === 'lost'|timeout → el DESAFIADO no adivinó   → Proponente gana / Desafiado pierde
 */
function getRoundOutcome(result: string | null | undefined, isProposer: boolean) {
  if (result === 'timeout') return 'timeout' as const
  const guesserWon = result === 'won'
  // ¿Gané YO esta ronda?
  const iWon = isProposer ? !guesserWon : guesserWon
  return iWon ? 'win' as const : 'loss' as const
}

export default function RoundEndPage() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { gameState, updateGameStatus, setRoundState } = useGameStore()
  const { room } = useRoomStore()
  const [opponentReady, setOpponentReady] = useState(false)
  const [iAmReady, setIAmReady] = useState(false)
  const [revealedWord, setRevealedWord] = useState<string | null>(null)

  const roundState = gameState?.roundState
  const result = roundState?.result
  const isProposer = roundState?.isProposer ?? false
  const outcome = getRoundOutcome(result, isProposer)

  // Revelar la palabra al terminar la ronda (siempre, para ambos)
  useEffect(() => {
    if (!roundState?.roundId) return
    supabase
      .from('rounds')
      .select('word_encoded')
      .eq('id', roundState.roundId)
      .single()
      .then(({ data }) => {
        const typedData = data as { word_encoded: string } | null
        if (typedData) setRevealedWord(decodeWord(typedData.word_encoded))
      })
  }, [roundState?.roundId])

  // Realtime: sincronizar "listo para siguiente ronda"
  const { sendEvent } = useRealtime({
    roomCode: code ?? '',
    userId: user?.id ?? '',
    onEvent: (event: GameEvent) => {
      if (event.type === 'player_ready') setOpponentReady(true)
    },
  })

  const handleReady = () => {
    setIAmReady(true)
    sendEvent('player_ready', {})
    // BUG 15 FIX: NO llamar goToNextPhase aquí — el useEffect de abajo
    // se encarga cuando ambos están listos, evitando doble ejecución
  }

  const goToNextPhase = () => {
    if (!gameState) return
    const isLastRound = gameState.currentRound >= gameState.totalRounds
    if (isLastRound) {
      updateGameStatus('match_end')
      navigate(`/rooms/${code}/match-end`)
    } else {
      const nextRound = gameState.currentRound + 1

      // BUG 13 FIX: persistir current_round en BD para poder recuperar la partida
      // Solo el host (player1) hace el update para evitar escrituras dobles
      const isHost = room?.host_id === gameState.myId
      if (isHost) {
        void db.from('matches')
          .update({ current_round: nextRound, updated_at: new Date().toISOString() })
          .eq('id', gameState.matchId)
      }

      const nextProposerId =
        gameState.currentRound % 2 === 0 ? gameState.opponentId : gameState.myId
      const isMyProposerTurn = nextProposerId === user?.id
      setRoundState(null)
      updateGameStatus(isMyProposerTurn ? 'proposer_choosing' : 'guesser_playing')
      useGameStore.setState((s) => ({
        gameState: s.gameState
          ? { ...s.gameState, currentRound: nextRound, roundState: null }
          : null,
      }))
      navigate(`/rooms/${code}/game`)
    }
  }

  // Único punto donde se avanza de fase — cuando ambos están listos
  useEffect(() => {
    if (opponentReady && iAmReady) goToNextPhase()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opponentReady, iAmReady])

  // Si el oponente ya estaba listo cuando yo presiono el botón,
  // el useEffect anterior se dispara correctamente por el cambio de iAmReady

  if (!roundState) {
    return (
      // BUG 17 FIX: escape si se recarga la página y no hay estado en memoria
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-text-muted text-sm">Cargando resultado...</p>
        <button
          onClick={() => navigate('/home')}
          className="text-xs text-text-subtle underline mt-2"
        >
          Volver al inicio si tarda demasiado
        </button>
      </div>
    )
  }

  // ── Textos según rol y resultado ──────────────────────────────────────────

  const ui = getOutcomeUI(outcome, isProposer, revealedWord)

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Fondo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className={cn(
          'absolute -top-20 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full blur-3xl',
          outcome === 'win' ? 'bg-success/10' : outcome === 'timeout' ? 'bg-warning/10' : 'bg-accent/10'
        )} />
      </div>

      <motion.div
        variants={staggerChildren}
        initial="hidden"
        animate="visible"
        className="relative z-10 max-w-md w-full flex flex-col gap-6"
      >
        {/* Resultado principal */}
        <motion.div variants={roundEndCard} className="text-center">
          <div className="text-7xl mb-4">{ui.emoji}</div>

          <h1 className={cn('text-3xl font-black', ui.titleColor)}>
            {ui.title}
          </h1>

          <p className="text-text-muted mt-2 text-sm max-w-xs mx-auto">
            {ui.subtitle}
          </p>

          {/* Badge de rol */}
          <div className="mt-3 flex justify-center">
            <span className={cn(
              'text-xs px-3 py-1 rounded-full border font-medium',
              isProposer
                ? 'bg-primary/10 border-primary/30 text-primary-light'
                : 'bg-success/10 border-success/30 text-success'
            )}>
              {isProposer ? '🎯 Eras el proponente' : '🔍 Eras el desafiado'}
            </span>
          </div>
        </motion.div>

        {/* Puntos de esta ronda */}
        <motion.div variants={slideUp} className="glass-strong rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
              Ronda {roundState.roundNumber}
            </h2>
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full border font-medium',
              isProposer
                ? 'bg-primary/10 border-primary/30 text-primary-light'
                : 'bg-success/10 border-success/30 text-success'
            )}>
              {isProposer ? '🎯 Desafiante' : '🔍 Desafiado'}
            </span>
          </div>

          {/* Puntos ganados esta ronda — resaltado grande */}
          <div className={cn(
            'text-center rounded-xl py-4 border',
            outcome === 'win'
              ? 'bg-success/10 border-success/30'
              : outcome === 'timeout'
              ? 'bg-warning/10 border-warning/30'
              : 'bg-bg-surface border-border'
          )}>
            <p className="text-xs text-text-subtle mb-1">
              {outcome === 'win' ? '¡Puntos ganados esta ronda!' : 'Puntos esta ronda'}
            </p>
            <p className={cn(
              'text-4xl font-black tabular-nums',
              outcome === 'win' ? 'text-success' : 'text-text-muted'
            )}>
              +{roundState.score ?? 0}
            </p>
            {outcome !== 'win' && (
              <p className="text-xs text-text-subtle mt-1">
                {isProposer ? 'El desafiado adivinó tu palabra' : 'No adivinaste la palabra'}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <StatItem label="Errores" value={roundState.errorsCount} />
            <StatItem label="Letras" value={roundState.correctLetters.length} />
            <StatItem label="Comodines" value={roundState.powerupsUsed.length} />
          </div>

          {/* Palabra revelada — siempre visible para ambos */}
          {revealedWord && (
            <div className="text-center p-3 bg-bg-surface rounded-xl">
              <p className="text-xs text-text-subtle mb-1">La palabra era</p>
              <p className="text-xl font-bold text-text">{revealedWord}</p>
            </div>
          )}
        </motion.div>

        {/* Marcador acumulado */}
        <motion.div variants={slideUp}
          className="grid grid-cols-3 items-center gap-2 glass rounded-2xl px-4 py-3"
        >
          <div className="text-center">
            <p className="text-xs text-text-subtle mb-0.5">Tú</p>
            <p className={cn('text-2xl font-black tabular-nums',
              (gameState?.myScore ?? 0) >= (gameState?.opponentScore ?? 0) ? 'text-primary-light' : 'text-text'
            )}>
              {gameState?.myScore ?? 0}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-text-subtle">Total</p>
            <p className="text-text-subtle text-sm">vs</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-text-subtle mb-0.5">
              {gameState?.opponentName ?? 'Oponente'}
            </p>
            <p className={cn('text-2xl font-black tabular-nums',
              (gameState?.opponentScore ?? 0) > (gameState?.myScore ?? 0) ? 'text-accent' : 'text-text'
            )}>
              {gameState?.opponentScore ?? 0}
            </p>
          </div>
        </motion.div>

        {/* Botón continuar */}
        <motion.div variants={slideUp}>
          <Button onClick={handleReady} disabled={iAmReady} size="lg" fullWidth>
            {iAmReady
              ? opponentReady
                ? 'Cargando...'
                : 'Esperando al otro jugador...'
              : gameState && gameState.currentRound >= gameState.totalRounds
              ? 'Ver resultado final →'
              : 'Siguiente ronda →'}
          </Button>

          {iAmReady && !opponentReady && (
            <p className="text-xs text-text-subtle text-center mt-2 animate-pulse">
              Esperando que {gameState?.opponentName ?? 'el otro jugador'} esté listo...
            </p>
          )}
        </motion.div>
      </motion.div>
    </div>
  )
}

// ─── Helper: textos y colores por rol + resultado ─────────────────────────────

type Outcome = 'win' | 'loss' | 'timeout'

function getOutcomeUI(outcome: Outcome, isProposer: boolean, revealedWord: string | null) {
  if (outcome === 'timeout') {
    return {
      emoji: '⏰',
      title: '¡Se acabó el tiempo!',
      subtitle: isProposer
        ? 'El desafiado no pudo adivinar a tiempo'
        : 'No alcanzaste a adivinar la palabra',
      titleColor: 'text-warning',
    }
  }

  if (outcome === 'win') {
    if (isProposer) {
      // El proponente gana cuando el desafiado no adivina
      return {
        emoji: '🏆',
        title: '¡Ganaste esta ronda!',
        subtitle: `El desafiado no pudo adivinar tu palabra${revealedWord ? ` "${revealedWord}"` : ''}`,
        titleColor: 'text-success',
      }
    } else {
      // El desafiado gana cuando adivina
      return {
        emoji: '🎉',
        title: '¡Adivinaste!',
        subtitle: `Descubriste la palabra${revealedWord ? ` "${revealedWord}"` : ''} — ¡bien jugado!`,
        titleColor: 'text-success',
      }
    }
  }

  // outcome === 'loss'
  if (isProposer) {
    // El proponente pierde cuando el desafiado adivina
    return {
      emoji: '😮',
      title: '¡Te la adivinaron!',
      subtitle: `El desafiado descubrió tu palabra${revealedWord ? ` "${revealedWord}"` : ''}`,
      titleColor: 'text-accent',
    }
  } else {
    // El desafiado pierde cuando no adivina
    return {
      emoji: '💀',
      title: '¡No pudiste!',
      subtitle: `La palabra era${revealedWord ? ` "${revealedWord}"` : ''} — ¡suerte en la próxima!`,
      titleColor: 'text-accent',
    }
  }
}

// ─── Helpers de UI ────────────────────────────────────────────────────────────

function StatItem({ label, value, accent, big }: {
  label: string; value: number; accent?: 'success' | 'error' | 'default'; big?: boolean
}) {
  const colorMap = { success: 'text-success', error: 'text-accent', default: 'text-text' }
  return (
    <div className="bg-bg-surface rounded-xl p-3 text-center">
      <p className={cn(big ? 'text-2xl' : 'text-xl', 'font-bold tabular-nums', colorMap[accent ?? 'default'])}>
        {value}
      </p>
      <p className="text-xs text-text-muted mt-0.5">{label}</p>
    </div>
  )
}
