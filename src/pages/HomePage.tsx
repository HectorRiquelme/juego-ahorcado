import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useProfile } from '@/hooks/useProfile'
import Layout from '@/components/layout/Layout'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { staggerChildren, slideUp, fadeIn } from '@/animations/variants'
import { getUserStats } from '@/features/stats/services/statsService'
import type { getMatchHistory } from '@/features/game/services/gameService'
import { getMatchHistory as fetchMatchHistory } from '@/features/game/services/gameService'
import type { UserStats } from '@/types'
import { timeAgo } from '@/utils/dates'
import { GAME_MODE_LABELS } from '@/utils/constants'
import { IS_DEMO, DEMO_STATS, DEMO_MATCH_HISTORY } from '@/lib/demo'

type MatchHistoryItem = Awaited<ReturnType<typeof getMatchHistory>>[number]

export default function HomePage() {
  const { user } = useAuthStore()
  const { profile } = useProfile()
  const [stats, setStats] = useState<UserStats | null>(null)
  const [recentMatches, setRecentMatches] = useState<MatchHistoryItem[]>([])

  useEffect(() => {
    if (IS_DEMO) {
      setStats(DEMO_STATS)
      setRecentMatches(DEMO_MATCH_HISTORY as MatchHistoryItem[])
      return
    }
    if (!user) return
    Promise.all([
      getUserStats(user.id),
      fetchMatchHistory(user.id, 5),
    ]).then(([s, matches]) => {
      setStats(s)
      setRecentMatches(matches)
    })
  }, [user])

  const displayName = profile?.display_name ?? profile?.username ?? 'Jugador'

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <motion.div
          variants={staggerChildren}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-8"
        >
          {/* Saludo */}
          <motion.div variants={slideUp}>
            <h1 className="text-3xl font-bold text-text">
              Hola, <span className="text-gradient">{displayName}</span> 👋
            </h1>
            <p className="text-text-muted mt-1">¿Listo para jugar?</p>
          </motion.div>

          {/* Acciones principales */}
          <motion.div variants={slideUp} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link to="/rooms/create">
              <Card hover className="h-full group">
                <div className="flex items-start gap-4">
                  <div className="text-4xl">🎮</div>
                  <div>
                    <h2 className="text-lg font-bold text-text group-hover:text-primary-light transition-colors">
                      Crear sala
                    </h2>
                    <p className="text-text-muted text-sm mt-1">
                      Genera un código y compártelo con alguien
                    </p>
                  </div>
                </div>
              </Card>
            </Link>

            <Link to="/rooms/join">
              <Card hover className="h-full group">
                <div className="flex items-start gap-4">
                  <div className="text-4xl">🚪</div>
                  <div>
                    <h2 className="text-lg font-bold text-text group-hover:text-primary-light transition-colors">
                      Unirme a sala
                    </h2>
                    <p className="text-text-muted text-sm mt-1">
                      Ingresa un código de 6 letras para entrar
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          </motion.div>

          {/* Stats rápidas */}
          {stats && (
            <motion.div variants={slideUp}>
              <h2 className="text-lg font-semibold text-text mb-3">Mis estadísticas</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Partidas" value={stats.matches_played} />
                <StatCard
                  label="% Victoria"
                  value={
                    stats.matches_played > 0
                      ? `${Math.round((stats.matches_won / stats.matches_played) * 100)}%`
                      : '—'
                  }
                />
                <StatCard label="Racha actual" value={stats.current_streak} suffix="🔥" />
                <StatCard label="Mejor racha" value={stats.best_streak} suffix="⭐" />
              </div>
            </motion.div>
          )}

          {/* Historial reciente */}
          {recentMatches.length > 0 && (
            <motion.div variants={slideUp}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-text">Partidas recientes</h2>
                <Link to="/stats" className="text-sm text-primary-light hover:text-primary transition-colors">
                  Ver todas →
                </Link>
              </div>
              <div className="flex flex-col gap-2">
                {recentMatches.map((match) => {
                  const isWinner = match.winner_id === user?.id
                  const isAbandoned = match.status === 'abandoned'
                  const opponentName = match.player1_id === user?.id
                    ? (match.player2?.display_name ?? match.player2?.username ?? 'Oponente')
                    : (match.player1?.display_name ?? match.player1?.username ?? 'Oponente')
                  const myScore = match.player1_id === user?.id ? match.player1_score : match.player2_score
                  const theirScore = match.player1_id === user?.id ? match.player2_score : match.player1_score
                  const modeLabel = GAME_MODE_LABELS[match.mode as keyof typeof GAME_MODE_LABELS] ?? match.mode
                  return (
                    <Card key={match.id} className="py-3 px-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">
                            {isAbandoned ? '💨' : isWinner ? '🏆' : '💀'}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-text">
                              vs {opponentName}
                            </p>
                            <p className="text-xs text-text-muted">
                              {modeLabel} •{' '}
                              {match.ended_at ? timeAgo(match.ended_at) : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-mono font-bold text-text">
                            {myScore}
                            <span className="text-text-subtle mx-1">-</span>
                            {theirScore}
                          </span>
                          <Badge variant={isAbandoned ? 'default' : isWinner ? 'success' : 'error'}>
                            {isAbandoned ? 'Abandonada' : isWinner ? 'Ganaste' : 'Perdiste'}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* Links rápidos */}
          <motion.div variants={fadeIn} className="flex gap-3 flex-wrap">
            <Link to="/stats" className="text-sm text-text-muted hover:text-text transition-colors">
              📊 Estadísticas completas
            </Link>
            <span className="text-border">·</span>
            <Link to="/words" className="text-sm text-text-muted hover:text-text transition-colors">
              📝 Mis palabras
            </Link>
            <span className="text-border">·</span>
            <Link to="/profile" className="text-sm text-text-muted hover:text-text transition-colors">
              👤 Mi perfil
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </Layout>
  )
}

function StatCard({ label, value, suffix }: { label: string; value: number | string; suffix?: string }) {
  return (
    <Card className="text-center py-4">
      <p className="text-2xl font-bold text-text tabular-nums">
        {value}{suffix && <span className="ml-1 text-lg">{suffix}</span>}
      </p>
      <p className="text-xs text-text-muted mt-1">{label}</p>
    </Card>
  )
}
