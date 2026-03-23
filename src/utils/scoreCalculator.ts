import {
  SCORE_BASE,
  SCORE_SPEED_BONUS_MAX,
  SCORE_PER_CORRECT_LETTER,
  SCORE_PENALTY_PER_ERROR,
  SCORE_PENALTY_PER_POWERUP,
} from './constants'

interface ScoreParams {
  won: boolean
  secondsTaken: number
  correctLetters: number
  wrongLetters: number
  powerupsUsed: number
  timerSeconds: number | null
}

export function calculateRoundScore(params: ScoreParams): number {
  if (!params.won) return 0

  const safeSecs = Math.max(0, params.secondsTaken || 0)
  const speedBonus = params.timerSeconds
    ? Math.max(0, SCORE_SPEED_BONUS_MAX - Math.floor(safeSecs / 2))
    : Math.max(0, SCORE_SPEED_BONUS_MAX - Math.floor(safeSecs / 5))

  const score =
    SCORE_BASE +
    speedBonus +
    params.correctLetters * SCORE_PER_CORRECT_LETTER -
    params.wrongLetters * SCORE_PENALTY_PER_ERROR -
    params.powerupsUsed * SCORE_PENALTY_PER_POWERUP

  return Math.max(0, Math.round(score))
}

/** Calcula precisión de letras como porcentaje */
export function calculateLetterAccuracy(correct: number, wrong: number): number {
  const c = Math.max(0, correct || 0)
  const w = Math.max(0, wrong || 0)
  const total = c + w
  if (total === 0) return 100
  return Math.round((c / total) * 100)
}
