import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'
import { getUserStats } from '@/features/stats/services/statsService'
import type { UserStats } from '@/types'
import { IS_DEMO, DEMO_STATS } from '@/lib/demo'
import Layout from '@/components/layout/Layout'
import Card from '@/components/ui/Card'
import { staggerChildren, slideUp } from '@/animations/variants'
import { calculateLetterAccuracy } from '@/utils/scoreCalculator'

export default function StatsPage() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (IS_DEMO) { setStats(DEMO_STATS); setLoading(false); return }
    if (!user) return
    getUserStats(user.id)
      .then(setStats)
      .finally(() => setLoading(false))
  }, [user])

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    )
  }

  if (!stats) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <p className="text-text-muted">Aún no tienes estadísticas. ¡Juega tu primera partida!</p>
        </div>
      </Layout>
    )
  }

  const winRate = stats.matches_played > 0
    ? Math.round((stats.matches_won / stats.matches_played) * 100)
    : 0

  const letterAccuracy = calculateLetterAccuracy(
    stats.total_correct_letters,
    stats.total_wrong_letters
  )

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <motion.div
          variants={staggerChildren}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-6"
        >
          <motion.div variants={slideUp}>
            <h1 className="text-2xl font-bold text-text">Mis estadísticas</h1>
            <p className="text-text-muted text-sm mt-1">Tu historial completo de juego</p>
          </motion.div>

          {/* Resumen general */}
          <motion.div variants={slideUp}>
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
              General
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Partidas" value={stats.matches_played} />
              <StatCard label="Ganadas" value={stats.matches_won} color="success" />
              <StatCard label="Perdidas" value={stats.matches_lost} color="error" />
              <StatCard label="% Victoria" value={`${winRate}%`} />
            </div>
          </motion.div>

          {/* Rachas */}
          <motion.div variants={slideUp}>
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
              Rachas
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <Card className="text-center py-5">
                <p className="text-3xl font-black text-text">{stats.current_streak}</p>
                <p className="text-xs text-text-muted mt-1">🔥 Racha actual</p>
              </Card>
              <Card className="text-center py-5">
                <p className="text-3xl font-black text-text">{stats.best_streak}</p>
                <p className="text-xs text-text-muted mt-1">⭐ Mejor racha</p>
              </Card>
            </div>
          </motion.div>

          {/* Rondas */}
          <motion.div variants={slideUp}>
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
              Rondas
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <StatCard label="Rondas jugadas" value={stats.rounds_played} />
              <StatCard label="Rondas ganadas" value={stats.rounds_won} color="success" />
              <StatCard label="Rondas perdidas" value={stats.rounds_lost} color="error" />
            </div>
          </motion.div>

          {/* Letras */}
          <motion.div variants={slideUp}>
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
              Letras
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Correctas" value={stats.total_correct_letters} color="success" />
              <StatCard label="Incorrectas" value={stats.total_wrong_letters} color="error" />
              <StatCard label="Precisión" value={`${letterAccuracy}%`} />
              <StatCard label="Palabra más larga" value={`${stats.longest_word_guessed} letras`} />
            </div>
          </motion.div>

          {/* Comodines */}
          <motion.div variants={slideUp}>
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
              Comodines
            </h2>
            <Card>
              <p className="text-sm text-text-muted">
                Total de comodines usados:{' '}
                <span className="text-text font-bold">{stats.powerups_used_total}</span>
              </p>
            </Card>
          </motion.div>

          {/* Tiempo */}
          {stats.avg_time_per_round_seconds && (
            <motion.div variants={slideUp}>
              <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
                Tiempo
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label="Tiempo promedio/ronda"
                  value={`${Math.round(stats.avg_time_per_round_seconds)}s`}
                />
                <StatCard
                  label="Tiempo total de juego"
                  value={`${Math.round(stats.total_play_time_seconds / 60)}m`}
                />
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </Layout>
  )
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string
  value: number | string
  color?: 'success' | 'error'
}) {
  const textColor =
    color === 'success'
      ? 'text-success'
      : color === 'error'
      ? 'text-accent'
      : 'text-text'

  return (
    <Card className="text-center py-4">
      <p className={`text-2xl font-bold tabular-nums ${textColor}`}>{value}</p>
      <p className="text-xs text-text-muted mt-1">{label}</p>
    </Card>
  )
}
