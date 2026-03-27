import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'
import { getUserStats, getDuoStats, getDuoForUser } from '@/features/stats/services/statsService'
import type { UserStats, DuoStats, Profile } from '@/types'
import { IS_DEMO, DEMO_STATS, DEMO_DUO_STATS, DEMO_PARTNER_PROFILE } from '@/lib/demo'
import Layout from '@/components/layout/Layout'
import Card from '@/components/ui/Card'
import { staggerChildren, slideUp } from '@/animations/variants'
import { calculateLetterAccuracy } from '@/utils/scoreCalculator'

type Tab = 'personal' | 'duo'

export default function StatsPage() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<Tab>('personal')
  const [stats, setStats] = useState<UserStats | null>(null)
  const [duoStats, setDuoStats] = useState<DuoStats | null>(null)
  const [partner, setPartner] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [duoLoading, setDuoLoading] = useState(false)

  // Cargar stats personales
  useEffect(() => {
    if (IS_DEMO) { setStats(DEMO_STATS); setLoading(false); return }
    if (!user) return
    getUserStats(user.id)
      .then(setStats)
      .catch((err) => console.error('Error cargando stats:', err))
      .finally(() => setLoading(false))
  }, [user])

  // Cargar stats de pareja cuando se abre el tab
  useEffect(() => {
    if (activeTab !== 'duo' || duoStats) return

    if (IS_DEMO) {
      setDuoStats(DEMO_DUO_STATS)
      setPartner(DEMO_PARTNER_PROFILE)
      return
    }

    if (!user) return
    setDuoLoading(true)
    getDuoForUser(user.id)
      .then(async (duo) => {
        if (!duo) return
        setPartner(duo.partnerProfile)
        const ds = await getDuoStats(duo.duoId)
        setDuoStats(ds)
      })
      .catch((err) => console.error('Error cargando duo stats:', err))
      .finally(() => setDuoLoading(false))
  }, [activeTab, user, duoStats])

  if (loading) {
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
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-1 bg-bg-surface rounded-xl p-1 mb-6">
          <TabButton active={activeTab === 'personal'} onClick={() => setActiveTab('personal')}>
            Personal
          </TabButton>
          <TabButton active={activeTab === 'duo'} onClick={() => setActiveTab('duo')}>
            Pareja
          </TabButton>
        </div>

        {activeTab === 'personal' ? (
          <PersonalStats stats={stats} />
        ) : (
          <DuoStatsTab
            duoStats={duoStats}
            partner={partner}
            loading={duoLoading}
            userId={user?.id ?? ''}
          />
        )}
      </div>
    </Layout>
  )
}

// ─── TAB BUTTON ──────────────────────────────────────────────────────────────

function TabButton({ active, onClick, children }: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${
        active
          ? 'bg-primary text-white'
          : 'text-text-muted hover:text-text hover:bg-bg-surface2'
      }`}
    >
      {children}
    </button>
  )
}

// ─── PERSONAL STATS ──────────────────────────────────────────────────────────

function PersonalStats({ stats }: { stats: UserStats | null }) {
  if (!stats) {
    return (
      <div className="text-center py-16">
        <p className="text-text-muted">Aún no tienes estadísticas. ¡Juega tu primera partida!</p>
      </div>
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

      {/* General */}
      <motion.div variants={slideUp}>
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">General</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Partidas" value={stats.matches_played} />
          <StatCard label="Ganadas" value={stats.matches_won} color="success" />
          <StatCard label="Perdidas" value={stats.matches_lost} color="error" />
          <StatCard label="% Victoria" value={`${winRate}%`} />
        </div>
      </motion.div>

      {/* Rachas */}
      <motion.div variants={slideUp}>
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Rachas</h2>
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
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Rondas</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard label="Rondas jugadas" value={stats.rounds_played} />
          <StatCard label="Rondas ganadas" value={stats.rounds_won} color="success" />
          <StatCard label="Rondas perdidas" value={stats.rounds_lost} color="error" />
        </div>
      </motion.div>

      {/* Letras */}
      <motion.div variants={slideUp}>
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Letras</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Correctas" value={stats.total_correct_letters} color="success" />
          <StatCard label="Incorrectas" value={stats.total_wrong_letters} color="error" />
          <StatCard label="Precisión" value={`${letterAccuracy}%`} />
          <StatCard label="Palabra más larga" value={`${stats.longest_word_guessed} letras`} />
        </div>
      </motion.div>

      {/* Comodines */}
      <motion.div variants={slideUp}>
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Comodines</h2>
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
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Tiempo</h2>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Tiempo promedio/ronda" value={`${Math.round(stats.avg_time_per_round_seconds)}s`} />
            <StatCard label="Tiempo total de juego" value={`${Math.round(stats.total_play_time_seconds / 60)}m`} />
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

// ─── DUO STATS TAB ───────────────────────────────────────────────────────────

function DuoStatsTab({ duoStats, partner, loading, userId }: {
  duoStats: DuoStats | null
  partner: Profile | null
  loading: boolean
  userId: string
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!duoStats || !partner) {
    return (
      <div className="text-center py-16">
        <span className="text-5xl block mb-4">💕</span>
        <p className="text-text-muted">Aún no tienes estadísticas de pareja.</p>
        <p className="text-text-subtle text-sm mt-1">Juega una partida para empezar.</p>
      </div>
    )
  }

  // Determinar quién es player1 y player2 (IDs ordenados alfabéticamente)
  const isPlayer1 = userId < partner.id
  const myWins = isPlayer1 ? duoStats.player1_wins : duoStats.player2_wins
  const theirWins = isPlayer1 ? duoStats.player2_wins : duoStats.player1_wins
  const myName = 'Tú'
  const theirName = partner.display_name ?? partner.username

  const totalDecided = myWins + theirWins + duoStats.ties
  const myWinPct = totalDecided > 0 ? Math.round((myWins / totalDecided) * 100) : 50

  return (
    <motion.div
      variants={staggerChildren}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-6"
    >
      {/* Header */}
      <motion.div variants={slideUp} className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center text-xl font-bold text-primary-light">
          {(theirName).charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text">
            Tú y {theirName}
          </h1>
          <p className="text-text-muted text-sm">Estadísticas de pareja</p>
        </div>
      </motion.div>

      {/* General */}
      <motion.div variants={slideUp}>
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">General</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Partidas juntos" value={duoStats.total_matches} />
          <StatCard label="Completadas" value={duoStats.matches_completed} />
          <StatCard label="Empates" value={duoStats.ties} />
          <StatCard label="Rondas totales" value={duoStats.total_rounds_played} />
        </div>
      </motion.div>

      {/* Victorias comparadas */}
      <motion.div variants={slideUp}>
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Victorias</h2>
        <Card className="py-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-primary-light">{myName}: {myWins}</span>
            <span className="text-sm font-semibold text-accent">{theirName}: {theirWins}</span>
          </div>
          <div className="w-full h-3 bg-border rounded-full overflow-hidden flex">
            <div
              className="h-full bg-primary-light transition-all duration-500"
              style={{ width: `${myWinPct}%` }}
            />
            <div
              className="h-full bg-accent transition-all duration-500"
              style={{ width: `${100 - myWinPct}%` }}
            />
          </div>
        </Card>
      </motion.div>

      {/* Rachas */}
      <motion.div variants={slideUp}>
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Rachas juntos</h2>
        <div className="grid grid-cols-2 gap-3">
          <Card className="text-center py-5">
            <p className="text-3xl font-black text-text">{duoStats.shared_streak}</p>
            <p className="text-xs text-text-muted mt-1">🔥 Racha actual</p>
          </Card>
          <Card className="text-center py-5">
            <p className="text-3xl font-black text-text">{duoStats.best_shared_streak}</p>
            <p className="text-xs text-text-muted mt-1">⭐ Mejor racha</p>
          </Card>
        </div>
      </motion.div>

      {/* Tiempo */}
      <motion.div variants={slideUp}>
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Tiempo</h2>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Duración promedio"
            value={duoStats.avg_match_duration_seconds
              ? `${Math.round(duoStats.avg_match_duration_seconds / 60)}m`
              : '—'}
          />
          <StatCard
            label="Última partida"
            value={duoStats.last_played_at
              ? formatRelativeDate(duoStats.last_played_at)
              : '—'}
          />
        </div>
      </motion.div>

      {/* Frases de nosotros */}
      {(duoStats.our_phrases_count > 0 || duoStats.private_words_created > 0) && (
        <motion.div variants={slideUp}>
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Nuestras frases</h2>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Palabras privadas" value={duoStats.private_words_created} />
            <StatCard label="Frases jugadas" value={duoStats.our_phrases_count} />
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

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

function formatRelativeDate(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return 'Hace un rato'
  if (hours < 24) return `Hace ${hours}h`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Ayer'
  if (days < 7) return `Hace ${days} días`
  return `Hace ${Math.floor(days / 7)} sem`
}
