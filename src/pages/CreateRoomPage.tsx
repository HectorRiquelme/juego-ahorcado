import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'
import { useRoomStore } from '@/stores/roomStore'
import { createRoom } from '@/features/rooms/services/roomService'
import type { GameMode } from '@/types'
import { GAME_MODE_LABELS, GAME_MODE_DESCRIPTIONS, GAME_MODE_CONFIG } from '@/utils/constants'
import Layout from '@/components/layout/Layout'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { slideUp, staggerChildren } from '@/animations/variants'
import toast from 'react-hot-toast'

const MODES: GameMode[] = ['quick', 'duel', 'competitive', 'casual', 'our_phrases']

export default function CreateRoomPage() {
  const { user } = useAuthStore()
  const { setRoom } = useRoomStore()
  const navigate = useNavigate()

  const [selectedMode, setSelectedMode] = useState<GameMode>('quick')
  const [customRounds, setCustomRounds] = useState(4)
  const [loading, setLoading] = useState(false)

  const config = GAME_MODE_CONFIG[selectedMode]
  const rounds = config.rounds === 'custom' ? customRounds : config.rounds

  const handleCreate = async () => {
    if (!user) return
    setLoading(true)
    try {
      const room = await createRoom({
        hostId: user.id,
        mode: selectedMode,
        maxRounds: rounds,
        maxErrors: config.maxErrors,
        timerSeconds: config.timerSeconds,
        initialPowerups: config.initialPowerups,
        isPrivate: false,
      })
      setRoom(room)
      navigate(`/rooms/${room.code}/lobby`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear sala')
    } finally {
      setLoading(false)
    }
  }

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
            <button
              onClick={() => navigate('/home')}
              className="text-text-muted text-sm hover:text-text mb-4 flex items-center gap-1 transition-colors"
            >
              ← Volver
            </button>
            <h1 className="text-2xl font-bold text-text">Crear sala</h1>
            <p className="text-text-muted text-sm mt-1">
              Elige el modo de juego y comparte el código
            </p>
          </motion.div>

          {/* Modos de juego */}
          <motion.div variants={slideUp} className="flex flex-col gap-3">
            <label className="text-sm font-medium text-text-muted">Modo de juego</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {MODES.map((mode) => {
                const cfg = GAME_MODE_CONFIG[mode]
                return (
                  <button
                    key={mode}
                    onClick={() => setSelectedMode(mode)}
                    className={`text-left p-4 rounded-xl border transition-all duration-200 ${
                      selectedMode === mode
                        ? 'border-primary bg-primary/10 text-text'
                        : 'border-border bg-bg-surface text-text-muted hover:border-border-light'
                    }`}
                  >
                    <div className="font-semibold text-sm mb-0.5">
                      {GAME_MODE_LABELS[mode]}
                    </div>
                    <div className="text-xs opacity-70">{GAME_MODE_DESCRIPTIONS[mode]}</div>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <span className="text-xs bg-bg-surface2 rounded px-1.5 py-0.5">
                        {cfg.rounds === 'custom' ? '⚙️ rondas config.' : `${cfg.rounds} rondas`}
                      </span>
                      {cfg.timerSeconds && (
                        <span className="text-xs bg-accent/20 text-accent rounded px-1.5 py-0.5">
                          ⏱ {cfg.timerSeconds}s
                        </span>
                      )}
                      <span className="text-xs bg-primary/20 text-primary-light rounded px-1.5 py-0.5">
                        {cfg.initialPowerups} comodines
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </motion.div>

          {/* Configuración extra si es custom */}
          {config.rounds === 'custom' && (
            <motion.div variants={slideUp}>
              <Card>
                <label className="text-sm font-medium text-text-muted block mb-3">
                  Número de rondas: <span className="text-text font-bold">{customRounds}</span>
                </label>
                <input
                  type="range"
                  min={2}
                  max={10}
                  step={2}
                  value={customRounds}
                  onChange={(e) => setCustomRounds(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-text-subtle mt-1">
                  <span>2</span><span>4</span><span>6</span><span>8</span><span>10</span>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Resumen */}
          <motion.div variants={slideUp}>
            <Card glass>
              <h3 className="text-sm font-semibold text-text-muted mb-3">Resumen de la sala</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <SummaryRow label="Modo" value={GAME_MODE_LABELS[selectedMode]} />
                <SummaryRow label="Rondas" value={String(rounds)} />
                <SummaryRow label="Errores máx." value={String(config.maxErrors)} />
                <SummaryRow
                  label="Temporizador"
                  value={config.timerSeconds ? `${config.timerSeconds}s` : 'Sin límite'}
                />
                <SummaryRow label="Comodines" value={String(config.initialPowerups)} />
                <SummaryRow
                  label="Cuenta para ranking"
                  value={config.countForRanking ? 'Sí' : 'No'}
                />
              </div>
            </Card>
          </motion.div>

          <motion.div variants={slideUp}>
            <Button onClick={handleCreate} loading={loading} size="lg" fullWidth>
              Crear sala y obtener código
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </Layout>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="text-text-muted">{label}</span>
      <span className="text-text font-medium">{value}</span>
    </>
  )
}
