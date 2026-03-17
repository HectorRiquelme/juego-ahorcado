import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase, db } from '@/lib/supabase'
import { useGameStore } from '@/stores/gameStore'
import { useAuthStore } from '@/stores/authStore'
import {
  updateUserStatsAfterMatch,
  updateDuoStatsAfterMatch,
} from '@/features/stats/services/statsService'
import Button from '@/components/ui/Button'
import { staggerChildren, slideUp, roundEndCard } from '@/animations/variants'

export default function MatchEndPage() {
  const { code: _code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { gameState, reset } = useGameStore()
  const [statsUpdated, setStatsUpdated] = useState(false)

  const myId = user?.id ?? ''
  const myScore = gameState?.myScore ?? 0
  const opponentScore = gameState?.opponentScore ?? 0
  const won = myScore > opponentScore
  const tie = myScore === opponentScore
  const matchId = gameState?.matchId

  // Actualizar estadísticas al llegar
  useEffect(() => {
    if (!matchId || !user || statsUpdated) return
    setStatsUpdated(true)

    const update = async () => {
      // Obtener match completo
      const { data: match } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single()

      if (!match) return

      // Determinar ganador
      const winnerId = myScore > opponentScore
        ? myId
        : opponentScore > myScore
        ? gameState?.opponentId
        : null

      const typedMatchData = match as { player1_id: string; duo_id: string | null; started_at: string | null; current_round: number }
      // Actualizar match en DB
      await db.from('matches').update({
        status: 'match_end',
        winner_id: winnerId,
        player1_score: typedMatchData.player1_id === myId ? myScore : opponentScore,
        player2_score: typedMatchData.player1_id === myId ? opponentScore : myScore,
        ended_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', matchId)

      // Actualizar user stats
      await updateUserStatsAfterMatch({
        userId: myId,
        won: won && !tie,
        lost: !won && !tie,
        abandoned: false,
      })

      // Actualizar duo stats si hay duo
      if (typedMatchData.duo_id) {
        const startedAt = typedMatchData.started_at ? new Date(typedMatchData.started_at).getTime() : Date.now()
        const durationSeconds = Math.floor((Date.now() - startedAt) / 1000)
        const isPlayer1 = typedMatchData.player1_id === myId
        await updateDuoStatsAfterMatch({
          duoId: typedMatchData.duo_id,
          completed: true,
          player1Won: isPlayer1 ? won && !tie : !won && !tie,
          player2Won: isPlayer1 ? !won && !tie : won && !tie,
          tie,
          roundsPlayed: typedMatchData.current_round ?? 1,
          matchDurationSeconds: durationSeconds,
        })
      }
    }

    update()
  }, [matchId, user, statsUpdated, myId, myScore, opponentScore, won, tie, gameState])

  const handlePlayAgain = () => {
    reset()
    navigate('/rooms/create')
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className={`absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-3xl ${
          tie ? 'bg-warning/10' : won ? 'bg-success/10' : 'bg-accent/10'
        }`} />
      </div>

      <motion.div
        variants={staggerChildren}
        initial="hidden"
        animate="visible"
        className="relative z-10 max-w-md w-full flex flex-col gap-6"
      >
        {/* Resultado */}
        <motion.div variants={roundEndCard} className="text-center">
          <div className="text-8xl mb-4">
            {tie ? '🤝' : won ? '🏆' : '💫'}
          </div>
          <h1 className={`text-4xl font-black ${
            tie ? 'text-warning' : won ? 'text-success' : 'text-accent'
          }`}>
            {tie ? '¡Empate!' : won ? '¡Ganaste!' : '¡Perdiste!'}
          </h1>
          <p className="text-text-muted mt-2">
            {tie
              ? 'Muy parejo — fue un duelo increíble'
              : won
              ? `¡Superaste a ${gameState?.opponentName ?? 'tu oponente'}!`
              : `${gameState?.opponentName ?? 'Tu oponente'} ganó esta vez`}
          </p>
        </motion.div>

        {/* Marcador final — con indicador de ganador */}
        <motion.div variants={slideUp} className="glass-strong rounded-2xl p-6">
          <h2 className="text-sm text-text-muted text-center mb-4 uppercase tracking-wider">
            Resultado final
          </h2>
          <div className="flex items-center justify-center gap-4">
            {/* Yo */}
            <div className={`text-center flex-1 rounded-xl py-3 ${won && !tie ? 'bg-success/10 border border-success/30' : ''}`}>
              <p className="text-xs text-text-muted mb-1">Tú {won && !tie ? '👑' : ''}</p>
              <p className={`text-4xl font-black tabular-nums ${won ? 'text-success' : 'text-text'}`}>
                {myScore}
              </p>
              {won && !tie && <p className="text-xs text-success mt-1">Ganador</p>}
            </div>

            <div className="text-center shrink-0">
              <p className="text-2xl text-text-subtle">vs</p>
            </div>

            {/* Oponente */}
            <div className={`text-center flex-1 rounded-xl py-3 ${!won && !tie ? 'bg-success/10 border border-success/30' : ''}`}>
              <p className="text-xs text-text-muted mb-1">{gameState?.opponentName ?? 'Oponente'} {!won && !tie ? '👑' : ''}</p>
              <p className={`text-4xl font-black tabular-nums ${!won && !tie ? 'text-success' : 'text-text'}`}>
                {opponentScore}
              </p>
              {!won && !tie && <p className="text-xs text-success mt-1">Ganador</p>}
            </div>
          </div>

          {tie && (
            <p className="text-center text-warning text-sm mt-3">
              🤝 Empate perfecto — {myScore} puntos cada uno
            </p>
          )}
        </motion.div>

        {/* Acciones */}
        <motion.div variants={slideUp} className="flex flex-col gap-3">
          <Button onClick={handlePlayAgain} size="lg" fullWidth>
            Jugar de nuevo
          </Button>
          <Link to="/stats">
            <Button variant="secondary" size="lg" fullWidth>
              Ver estadísticas
            </Button>
          </Link>
          <Link to="/home">
            <Button variant="ghost" fullWidth>
              Ir al inicio
            </Button>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  )
}
