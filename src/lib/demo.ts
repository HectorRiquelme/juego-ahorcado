/**
 * Cuellito — Modo demo
 * Permite navegar la UI sin Supabase real.
 * Se activa con VITE_DEMO_MODE=true en .env
 */

export const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true'

import type {
  Profile, UserStats, DuoStats, Category, WordEntry, Room, Match, Round,
} from '@/types'
import type { GameState, RoundState } from '@/types/game'

// ─── DATOS DE DEMO ────────────────────────────────────────────────────────────

export const DEMO_USER_ID = 'demo-user-001'
export const DEMO_OPPONENT_ID = 'demo-user-002'

export const DEMO_PROFILE: Profile = {
  id: DEMO_USER_ID,
  username: 'jugador_demo',
  display_name: 'Jugador Demo',
  avatar_url: null,
  bio: 'Modo demo — sin Supabase',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export const DEMO_STATS: UserStats = {
  id: 'stats-001',
  user_id: DEMO_USER_ID,
  matches_played: 24,
  matches_won: 15,
  matches_lost: 7,
  matches_abandoned: 2,
  rounds_played: 89,
  rounds_won: 58,
  rounds_lost: 31,
  total_correct_letters: 342,
  total_wrong_letters: 98,
  powerups_used_total: 47,
  powerups_by_type: { reveal_letter: 20, shield: 12, extra_hint: 15 },
  words_proposed: 44,
  words_guessed_correctly: 42,
  longest_word_guessed: 12,
  current_streak: 5,
  best_streak: 11,
  avg_time_per_round_seconds: 38,
  total_play_time_seconds: 14400,
  updated_at: new Date().toISOString(),
}

export const DEMO_DUO_STATS: DuoStats = {
  id: 'duo-stats-001',
  duo_id: 'duo-demo-001',
  total_matches: 24,
  matches_completed: 22,
  player1_wins: 12,
  player2_wins: 8,
  ties: 2,
  total_rounds_played: 89,
  shared_streak: 5,
  best_shared_streak: 11,
  favorite_category_id: 'cat-1',
  private_words_created: 8,
  our_phrases_count: 15,
  avg_match_duration_seconds: 720,
  last_played_at: new Date(Date.now() - 86400000).toISOString(),
  updated_at: new Date().toISOString(),
}

export const DEMO_PARTNER_PROFILE: Profile = {
  id: DEMO_OPPONENT_ID,
  username: 'tu_pareja',
  display_name: 'Tu Pareja',
  avatar_url: null,
  bio: 'Partner de demo',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export const DEMO_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Películas y Series', description: null, emoji: '🎬', color_hex: '#7C3AED', is_system: true, is_public: true, created_by: null, duo_id: null, created_at: new Date().toISOString() },
  { id: 'cat-2', name: 'Canciones y Artistas', description: null, emoji: '🎵', color_hex: '#E94560', is_system: true, is_public: true, created_by: null, duo_id: null, created_at: new Date().toISOString() },
  { id: 'cat-3', name: 'Lugares', description: null, emoji: '🌍', color_hex: '#10B981', is_system: true, is_public: true, created_by: null, duo_id: null, created_at: new Date().toISOString() },
  { id: 'cat-4', name: 'Comida y Bebidas', description: null, emoji: '🍕', color_hex: '#F59E0B', is_system: true, is_public: true, created_by: null, duo_id: null, created_at: new Date().toISOString() },
  { id: 'cat-5', name: 'Videojuegos', description: null, emoji: '🎮', color_hex: '#8B5CF6', is_system: true, is_public: true, created_by: null, duo_id: null, created_at: new Date().toISOString() },
  { id: 'cat-6', name: 'Libre', description: null, emoji: '🎯', color_hex: '#6B7280', is_system: true, is_public: true, created_by: null, duo_id: null, created_at: new Date().toISOString() },
]

export const DEMO_WORDS: WordEntry[] = [
  { id: 'w-1', category_id: 'cat-1', word: 'El señor de los anillos', hint: 'Trilogía épica de fantasía', language: 'es', difficulty: 2, created_by: DEMO_USER_ID, duo_id: null, is_public: true, times_used: 5, times_guessed: 4, created_at: new Date().toISOString() },
  { id: 'w-2', category_id: 'cat-4', word: 'murciélago', hint: 'Tiene todas las vocales', language: 'es', difficulty: 2, created_by: DEMO_USER_ID, duo_id: null, is_public: false, times_used: 3, times_guessed: 2, created_at: new Date().toISOString() },
]

export const DEMO_ROOM: Room = {
  id: 'room-demo-001',
  code: 'DEMO01',
  host_id: DEMO_USER_ID,
  guest_id: DEMO_OPPONENT_ID,
  mode: 'duel',
  max_rounds: 4,
  max_errors: 6,
  timer_seconds: null,
  initial_powerups: 3,
  is_private: false,
  duo_id: 'duo-demo-001',
  status: 'guesser_playing',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export const DEMO_MATCH: Match = {
  id: 'match-demo-001',
  room_id: 'room-demo-001',
  duo_id: 'duo-demo-001',
  player1_id: DEMO_USER_ID,
  player2_id: DEMO_OPPONENT_ID,
  mode: 'duel',
  status: 'guesser_playing',
  current_round: 2,
  total_rounds: 4,
  player1_score: 145,
  player2_score: 120,
  winner_id: null,
  started_at: new Date(Date.now() - 600000).toISOString(),
  ended_at: null,
  created_at: new Date(Date.now() - 600000).toISOString(),
  updated_at: new Date().toISOString(),
}

export const DEMO_ROUND: Round = {
  id: 'round-demo-001',
  match_id: 'match-demo-001',
  round_number: 2,
  proposer_id: DEMO_OPPONENT_ID,
  guesser_id: DEMO_USER_ID,
  category_id: 'cat-1',
  word_entry_id: null,
  word_encoded: btoa(unescape(encodeURIComponent('Interstellar'))),
  hint: 'Una película de ciencia ficción',
  hint_extra: 'Protagonizada por Matthew McConaughey',
  status: 'guesser_playing',
  result: null,
  correct_letters: ['I', 'T', 'E', 'R'],
  wrong_letters: ['X', 'Z'],
  max_errors: 6,
  errors_count: 2,
  powerups_available: ['reveal_letter', 'extra_hint', 'shield'],
  timer_seconds: null,
  timer_started_at: null,
  score: null,
  started_at: new Date().toISOString(),
  ended_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export const DEMO_GAME_STATE: GameState = {
  matchId: 'match-demo-001',
  roomCode: 'DEMO01',
  mode: 'duel',
  currentRound: 2,
  totalRounds: 4,
  myScore: 145,
  opponentScore: 120,
  myId: DEMO_USER_ID,
  opponentId: DEMO_OPPONENT_ID,
  opponentName: 'Tu pareja',
  opponentAvatar: null,
  status: 'guesser_playing',
  roundState: null,
  disconnectedAt: null,
  disconnectedPlayerId: null,
}

export const DEMO_ROUND_STATE: RoundState = {
  roundId: 'round-demo-001',
  roundNumber: 2,
  isProposer: false,
  isGuesser: true,
  word: null,
  wordLength: 12,
  wordStructure: [12],
  hint: 'Una película de ciencia ficción',
  hintExtra: 'Protagonizada por Matthew McConaughey',
  category: 'Películas y Series',
  categoryEmoji: '🎬',
  correctLetters: ['I', 'T', 'E', 'R'],
  wrongLetters: ['X', 'Z'],
  maxErrors: 6,
  errorsCount: 2,
  powerupsAvailable: ['reveal_letter', 'extra_hint', 'shield'],
  powerupsUsed: [],
  shieldActive: false,
  timerSeconds: null,
  timeLeft: null,
  result: null,
  score: null,
  opponentReady: false,
}

export const DEMO_MATCH_HISTORY = [
  {
    id: 'match-h-1',
    mode: 'duel',
    status: 'match_end',
    player1_score: 320,
    player2_score: 280,
    winner_id: DEMO_USER_ID,
    player1_id: DEMO_USER_ID,
    player2_id: DEMO_OPPONENT_ID,
    started_at: new Date(Date.now() - 86400000).toISOString(),
    ended_at: new Date(Date.now() - 86400000 + 1800000).toISOString(),
    player1: { username: 'jugador_demo', display_name: 'Jugador Demo', avatar_url: null },
    player2: { username: 'tu_pareja', display_name: 'Tu Pareja', avatar_url: null },
  },
  {
    id: 'match-h-2',
    mode: 'competitive',
    status: 'match_end',
    player1_score: 180,
    player2_score: 240,
    winner_id: DEMO_OPPONENT_ID,
    player1_id: DEMO_USER_ID,
    player2_id: DEMO_OPPONENT_ID,
    started_at: new Date(Date.now() - 172800000).toISOString(),
    ended_at: new Date(Date.now() - 172800000 + 2400000).toISOString(),
    player1: { username: 'jugador_demo', display_name: 'Jugador Demo', avatar_url: null },
    player2: { username: 'tu_pareja', display_name: 'Tu Pareja', avatar_url: null },
  },
  {
    id: 'match-h-3',
    mode: 'quick',
    status: 'match_end',
    player1_score: 95,
    player2_score: 95,
    winner_id: null,
    player1_id: DEMO_USER_ID,
    player2_id: DEMO_OPPONENT_ID,
    started_at: new Date(Date.now() - 259200000).toISOString(),
    ended_at: new Date(Date.now() - 259200000 + 900000).toISOString(),
    player1: { username: 'jugador_demo', display_name: 'Jugador Demo', avatar_url: null },
    player2: { username: 'tu_pareja', display_name: 'Tu Pareja', avatar_url: null },
  },
]
