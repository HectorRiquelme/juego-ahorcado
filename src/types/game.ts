import type { PowerupType, GameMode, RoundResult } from './database'

// Estado del juego en memoria (frontend)
export interface GameState {
  matchId: string
  roomCode: string
  mode: GameMode
  currentRound: number
  totalRounds: number
  myScore: number
  opponentScore: number
  myId: string
  opponentId: string
  opponentName: string
  opponentAvatar: string | null
  status: GameStatus
  roundState: RoundState | null
  /** Timestamp (Date.now()) de cuando se detectó la desconexión del oponente */
  disconnectedAt: number | null
  /** ID del jugador desconectado */
  disconnectedPlayerId: string | null
}

export type GameStatus =
  | 'loading'
  | 'proposer_choosing'
  | 'guesser_playing'
  | 'round_end'
  | 'match_end'
  | 'paused'
  | 'abandoned'

export interface RoundState {
  roundId: string
  roundNumber: number
  isProposer: boolean   // ¿Yo soy el proponente en esta ronda?
  isGuesser: boolean    // ¿Yo soy el desafiado?
  word: string | null   // Solo el proponente la ve
  wordLength: number
  wordStructure: number[]
  hint: string | null
  hintExtra: string | null
  category: string
  categoryEmoji: string
  correctLetters: string[]
  wrongLetters: string[]
  maxErrors: number
  errorsCount: number
  powerupsAvailable: PowerupType[]
  powerupsUsed: PowerupType[]
  shieldActive: boolean
  timerSeconds: number | null
  timeLeft: number | null
  result: RoundResult | null
  score: number | null
  opponentReady: boolean
}

// ─── CHAT ─────────────────────────────────────────────────────────────────────

export type ChatMessageType =
  | 'text'               // Mensaje libre
  | 'letter_request'     // El desafiado pide una letra
  | 'powerup_notif'      // Notificación de comodín activado
  | 'system'             // Mensaje del sistema (inicio de ronda, etc.)

export interface ChatMessage {
  id: string
  senderId: string
  senderName: string
  text: string
  timestamp: string
  type: ChatMessageType
  meta?: {
    letter?: string           // Para letter_request
    powerupType?: PowerupType // Para powerup_notif
  }
}

// ─── POWERUPS ─────────────────────────────────────────────────────────────────

export interface PowerupInfo {
  type: PowerupType
  label: string
  description: string
  icon: string
  color: string
  available: boolean
  used: boolean
}

export interface RevealLetterResult {
  letter: string
  positions: number[]
}

export interface EliminateWrongResult {
  eliminatedLetters: string[]
}

// ─── TECLADO ──────────────────────────────────────────────────────────────────

export const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
] as const

export type KeyStatus = 'unused' | 'correct' | 'wrong' | 'eliminated'

export interface KeyState {
  letter: string
  status: KeyStatus
}

// ─── PROPONENTE ───────────────────────────────────────────────────────────────

export interface ProposerFormData {
  word: string
  categoryId: string
  hint: string
  hintExtra: string
  powerupsGranted: number
  difficulty: 1 | 2 | 3
}
