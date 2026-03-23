import { motion } from 'framer-motion'
import { scoreUpdate } from '@/animations/variants'

interface ScoreBoardProps {
  myName: string
  opponentName: string
  myScore: number
  opponentScore: number
  currentRound: number
  totalRounds: number
}

export default function ScoreBoard({
  myName,
  opponentName,
  myScore,
  opponentScore,
  currentRound,
  totalRounds,
}: ScoreBoardProps) {
  return (
    <div className="flex items-center gap-3" role="status" aria-label={`Marcador: ${myName} ${myScore} - ${opponentName} ${opponentScore}, ronda ${currentRound} de ${totalRounds}`}>
      {/* Jugador */}
      <div className="flex-1 text-right">
        <p className="text-xs text-text-muted truncate">{myName}</p>
        <motion.p
          key={myScore}
          variants={scoreUpdate}
          initial="idle"
          animate="bump"
          className="text-2xl font-bold text-primary-light tabular-nums"
        >
          {myScore}
        </motion.p>
      </div>

      {/* Ronda */}
      <div className="flex flex-col items-center px-4 py-2 bg-bg-surface2 rounded-xl border border-border">
        <p className="text-xs text-text-subtle uppercase tracking-wider">Ronda</p>
        <p className="text-lg font-bold text-text">
          {currentRound} <span className="text-text-subtle text-base">/ {totalRounds}</span>
        </p>
      </div>

      {/* Oponente */}
      <div className="flex-1 text-left">
        <p className="text-xs text-text-muted truncate">{opponentName}</p>
        <motion.p
          key={opponentScore}
          variants={scoreUpdate}
          initial="idle"
          animate="bump"
          className="text-2xl font-bold text-accent tabular-nums"
        >
          {opponentScore}
        </motion.p>
      </div>
    </div>
  )
}
