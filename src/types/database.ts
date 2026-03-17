// Tipos de base de datos en el formato que requiere @supabase/supabase-js v2

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type GameMode =
  | 'quick'
  | 'duel'
  | 'competitive'
  | 'casual'
  | 'private'
  | 'our_phrases'

export type MatchStatus =
  | 'waiting'
  | 'lobby'
  | 'proposer_choosing'
  | 'guesser_playing'
  | 'round_end'
  | 'match_end'
  | 'paused'
  | 'abandoned'

export type RoundResult = 'won' | 'lost' | 'timeout' | 'abandoned'

export type PowerupType =
  | 'reveal_letter'
  | 'eliminate_wrong'
  | 'extra_hint'
  | 'shield'
  | 'show_structure'
  | 'time_freeze'

// ─── ROW TYPES ───────────────────────────────────────────────────────────────

export interface Profile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  created_at: string
  updated_at: string
}

export interface Duo {
  id: string
  player1_id: string
  player2_id: string
  created_at: string
  last_played_at: string | null
  duo_name: string | null
}

export interface Room {
  id: string
  code: string
  host_id: string
  guest_id: string | null
  mode: GameMode
  max_rounds: number
  max_errors: number
  timer_seconds: number | null
  initial_powerups: number
  is_private: boolean
  duo_id: string | null
  status: MatchStatus
  created_at: string
  updated_at: string
}

export interface Match {
  id: string
  room_id: string
  duo_id: string | null
  player1_id: string
  player2_id: string
  mode: GameMode
  status: MatchStatus
  current_round: number
  total_rounds: number
  player1_score: number
  player2_score: number
  winner_id: string | null
  started_at: string | null
  ended_at: string | null
  created_at: string
  updated_at: string
}

export interface Round {
  id: string
  match_id: string
  round_number: number
  proposer_id: string
  guesser_id: string
  category_id: string | null
  word_entry_id: string | null
  word_encoded: string
  hint: string | null
  hint_extra: string | null
  status: MatchStatus
  result: RoundResult | null
  correct_letters: string[]
  wrong_letters: string[]
  max_errors: number
  errors_count: number
  powerups_available: string[]
  timer_seconds: number | null
  timer_started_at: string | null
  score: number | null
  started_at: string | null
  ended_at: string | null
  created_at: string
  updated_at: string
}

export interface RoundEvent {
  id: string
  round_id: string
  player_id: string
  event_type: 'letter_guess' | 'powerup_used' | 'round_start' | 'round_end'
  payload: Json
  created_at: string
}

export interface RoundPowerupUse {
  id: string
  round_id: string
  match_id: string
  player_id: string
  powerup_type: PowerupType
  used_at: string
  result_payload: Json | null
}

export interface Category {
  id: string
  name: string
  description: string | null
  emoji: string | null
  color_hex: string | null
  is_system: boolean
  is_public: boolean
  created_by: string | null
  duo_id: string | null
  created_at: string
}

export interface WordEntry {
  id: string
  category_id: string | null
  word: string
  hint: string | null
  language: string
  difficulty: number
  created_by: string | null
  duo_id: string | null
  is_public: boolean
  times_used: number
  times_guessed: number
  created_at: string
}

export interface UserStats {
  id: string
  user_id: string
  matches_played: number
  matches_won: number
  matches_lost: number
  matches_abandoned: number
  rounds_played: number
  rounds_won: number
  rounds_lost: number
  total_correct_letters: number
  total_wrong_letters: number
  powerups_used_total: number
  powerups_by_type: Json
  words_proposed: number
  words_guessed_correctly: number
  longest_word_guessed: number
  current_streak: number
  best_streak: number
  avg_time_per_round_seconds: number | null
  total_play_time_seconds: number
  updated_at: string
}

export interface DuoStats {
  id: string
  duo_id: string
  total_matches: number
  matches_completed: number
  player1_wins: number
  player2_wins: number
  ties: number
  total_rounds_played: number
  shared_streak: number
  best_shared_streak: number
  favorite_category_id: string | null
  private_words_created: number
  our_phrases_count: number
  avg_match_duration_seconds: number | null
  last_played_at: string | null
  updated_at: string
}

export interface MatchStatsSnapshot {
  id: string
  match_id: string
  player_id: string
  score: number
  rounds_won: number
  rounds_lost: number
  correct_letters: number
  wrong_letters: number
  powerups_used: number
  avg_time_per_round_seconds: number | null
  created_at: string
}

// ─── DATABASE TYPE (formato supabase-js v2) ──────────────────────────────────

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'> & {
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Profile, 'id' | 'created_at'>> & { updated_at?: string }
      }
      duos: {
        Row: Duo
        Insert: Pick<Duo, 'player1_id' | 'player2_id'> & { duo_name?: string | null }
        Update: Partial<Pick<Duo, 'duo_name' | 'last_played_at'>>
      }
      rooms: {
        Row: Room
        Insert: Omit<Room, 'id' | 'created_at' | 'updated_at' | 'guest_id' | 'duo_id' | 'status' | 'code'> & {
          code?: string
          guest_id?: string | null
          duo_id?: string | null
          status?: MatchStatus
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Room, 'id' | 'created_at'>> & { updated_at?: string }
      }
      matches: {
        Row: Match
        Insert: Omit<Match, 'id' | 'created_at' | 'updated_at' | 'status' | 'current_round' | 'player1_score' | 'player2_score' | 'winner_id' | 'started_at' | 'ended_at' | 'duo_id'> & {
          duo_id?: string | null
          status?: MatchStatus
          current_round?: number
          player1_score?: number
          player2_score?: number
          winner_id?: string | null
          started_at?: string | null
          ended_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Match, 'id' | 'created_at'>> & { updated_at?: string }
      }
      rounds: {
        Row: Round
        Insert: Omit<Round, 'id' | 'created_at' | 'updated_at' | 'result' | 'correct_letters' | 'wrong_letters' | 'errors_count' | 'score' | 'timer_started_at' | 'started_at' | 'ended_at' | 'word_entry_id' | 'hint' | 'hint_extra' | 'timer_seconds' | 'status' | 'powerups_available' | 'category_id'> & {
          category_id?: string | null
          word_entry_id?: string | null
          hint?: string | null
          hint_extra?: string | null
          status?: MatchStatus
          result?: RoundResult | null
          correct_letters?: string[]
          wrong_letters?: string[]
          errors_count?: number
          powerups_available?: string[]
          timer_seconds?: number | null
          timer_started_at?: string | null
          score?: number | null
          started_at?: string | null
          ended_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Round, 'id' | 'created_at'>> & { updated_at?: string }
      }
      round_events: {
        Row: RoundEvent
        Insert: Omit<RoundEvent, 'id' | 'created_at'> & { created_at?: string }
        Update: never
      }
      round_powerup_uses: {
        Row: RoundPowerupUse
        Insert: Omit<RoundPowerupUse, 'id'> & { used_at?: string }
        Update: never
      }
      categories: {
        Row: Category
        Insert: Omit<Category, 'id' | 'created_at'> & {
          created_at?: string
          is_system?: boolean
          is_public?: boolean
          created_by?: string | null
          duo_id?: string | null
        }
        Update: Partial<Omit<Category, 'id' | 'created_at' | 'is_system'>>
      }
      word_entries: {
        Row: WordEntry
        Insert: Omit<WordEntry, 'id' | 'created_at' | 'times_used' | 'times_guessed'> & {
          created_at?: string
          times_used?: number
          times_guessed?: number
          category_id?: string | null
          hint?: string | null
          language?: string
          difficulty?: number
          created_by?: string | null
          duo_id?: string | null
          is_public?: boolean
        }
        Update: Partial<Omit<WordEntry, 'id' | 'created_at'>>
      }
      user_stats: {
        Row: UserStats
        Insert: Pick<UserStats, 'user_id'> & Partial<Omit<UserStats, 'id' | 'user_id'>>
        Update: Partial<Omit<UserStats, 'id' | 'user_id'>>
      }
      duo_stats: {
        Row: DuoStats
        Insert: Pick<DuoStats, 'duo_id'> & Partial<Omit<DuoStats, 'id' | 'duo_id'>>
        Update: Partial<Omit<DuoStats, 'id' | 'duo_id'>>
      }
      match_stats_snapshots: {
        Row: MatchStatsSnapshot
        Insert: Omit<MatchStatsSnapshot, 'id' | 'created_at'> & { created_at?: string }
        Update: never
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      game_mode: GameMode
      match_status: MatchStatus
      round_result: RoundResult
      powerup_type: PowerupType
    }
    CompositeTypes: Record<string, never>
  }
}

// ─── INSERT/UPDATE HELPERS (aliases para claridad en servicios) ──────────────

export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type DuoInsert = Database['public']['Tables']['duos']['Insert']
export type DuoUpdate = Database['public']['Tables']['duos']['Update']

export type RoomInsert = Database['public']['Tables']['rooms']['Insert']
export type RoomUpdate = Database['public']['Tables']['rooms']['Update']

export type MatchInsert = Database['public']['Tables']['matches']['Insert']
export type MatchUpdate = Database['public']['Tables']['matches']['Update']

export type RoundInsert = Database['public']['Tables']['rounds']['Insert']
export type RoundUpdate = Database['public']['Tables']['rounds']['Update']

export type RoundEventInsert = Database['public']['Tables']['round_events']['Insert']

export type RoundPowerupUseInsert = Database['public']['Tables']['round_powerup_uses']['Insert']

export type CategoryInsert = Database['public']['Tables']['categories']['Insert']
export type CategoryUpdate = Database['public']['Tables']['categories']['Update']

export type WordEntryInsert = Database['public']['Tables']['word_entries']['Insert']
export type WordEntryUpdate = Database['public']['Tables']['word_entries']['Update']

export type UserStatsInsert = Database['public']['Tables']['user_stats']['Insert']
export type UserStatsUpdate = Database['public']['Tables']['user_stats']['Update']

export type DuoStatsInsert = Database['public']['Tables']['duo_stats']['Insert']
export type DuoStatsUpdate = Database['public']['Tables']['duo_stats']['Update']

export type MatchStatsSnapshotInsert = Database['public']['Tables']['match_stats_snapshots']['Insert']
