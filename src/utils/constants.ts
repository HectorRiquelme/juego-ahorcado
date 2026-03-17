import type { GameMode } from '@/types'

export const GAME_MODE_LABELS: Record<GameMode, string> = {
  quick: 'Partida Rápida',
  duel: 'Duelo',
  competitive: 'Competitivo',
  casual: 'Casual',
  private: 'Privado',
  our_phrases: 'Frases de Nosotros',
}

export const GAME_MODE_DESCRIPTIONS: Record<GameMode, string> = {
  quick: '2 rondas rápidas, sin presión',
  duel: 'Elige cuántas rondas quieres jugar',
  competitive: '6 rondas con timer, puntos acumulados',
  casual: 'Sin puntaje, solo diversión',
  private: 'Solo para ustedes dos',
  our_phrases: 'Adivinen sus frases especiales',
}

export const GAME_MODE_CONFIG: Record<GameMode, {
  rounds: number | 'custom'
  maxErrors: number
  timerSeconds: number | null
  initialPowerups: number
  countForRanking: boolean
}> = {
  quick: { rounds: 2, maxErrors: 6, timerSeconds: null, initialPowerups: 3, countForRanking: false },
  duel: { rounds: 'custom', maxErrors: 6, timerSeconds: null, initialPowerups: 2, countForRanking: true },
  competitive: { rounds: 6, maxErrors: 5, timerSeconds: 60, initialPowerups: 1, countForRanking: true },
  casual: { rounds: 'custom', maxErrors: 8, timerSeconds: null, initialPowerups: 3, countForRanking: false },
  private: { rounds: 'custom', maxErrors: 6, timerSeconds: null, initialPowerups: 3, countForRanking: false },
  our_phrases: { rounds: 4, maxErrors: 7, timerSeconds: null, initialPowerups: 3, countForRanking: false },
}

export const MAX_WRONG_LETTERS = 6

export const DISCONNECT_PAUSE_SECONDS = 30
export const DISCONNECT_ABANDON_SECONDS = 600

// Score calculation constants
export const SCORE_BASE = 100
export const SCORE_SPEED_BONUS_MAX = 50
export const SCORE_PER_CORRECT_LETTER = 10
export const SCORE_PENALTY_PER_ERROR = 15
export const SCORE_PENALTY_PER_POWERUP = 10

/**
 * Puntos que gana el PROPONENTE cuando el desafiado NO adivina la palabra.
 * Se suman errores * 5 para premiar palabras más difíciles.
 */
export const PROPOSER_WIN_BASE = 60
export const PROPOSER_WIN_PER_ERROR = 5
