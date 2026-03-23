import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { formatDuration } from '@/utils/dates'

interface GameTimerProps {
  totalSeconds: number
  frozen?: boolean
  extraSeconds?: number
  onTimeUp: () => void
  active: boolean
}

export default function GameTimer({
  totalSeconds,
  frozen = false,
  extraSeconds = 0,
  onTimeUp,
  active,
}: GameTimerProps) {
  const safeTotal = Math.max(0, totalSeconds)
  const safeExtra = Math.max(0, extraSeconds)
  const [timeLeft, setTimeLeft] = useState(safeTotal + safeExtra)
  const onTimeUpRef = useRef(onTimeUp)
  onTimeUpRef.current = onTimeUp

  useEffect(() => {
    setTimeLeft(safeTotal + safeExtra)
  }, [safeExtra, safeTotal])

  useEffect(() => {
    if (!active || frozen) return

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          onTimeUpRef.current()
          return 0
        }
        return Math.max(0, prev - 1)
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [active, frozen])

  const total = safeTotal + safeExtra
  const ratio = total > 0 ? timeLeft / total : 0
  const isUrgent = timeLeft <= 10

  return (
    <div className="flex flex-col items-center gap-1" role="timer" aria-label={`Tiempo restante: ${formatDuration(timeLeft)}`} aria-live="off">
      <div
        className={`
          text-2xl font-mono font-bold tabular-nums
          ${isUrgent ? 'text-accent animate-pulse' : 'text-text'}
        `}
      >
        {formatDuration(timeLeft)}
      </div>

      {/* Progress bar */}
      <div className="w-32 h-1.5 bg-border rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full transition-colors ${
            isUrgent ? 'bg-accent' : ratio > 0.5 ? 'bg-success' : 'bg-warning'
          }`}
          animate={{ width: `${ratio * 100}%` }}
          transition={{ duration: 0.9, ease: 'linear' }}
        />
      </div>

      {frozen && (
        <span className="text-xs text-primary-light animate-pulse">⏱ Congelado</span>
      )}
    </div>
  )
}
