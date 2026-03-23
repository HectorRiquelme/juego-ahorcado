import { supabase, db } from '@/lib/supabase'
import type { UserStats, DuoStats } from '@/types'

export async function getUserStats(userId: string): Promise<UserStats | null> {
  const { data, error } = await supabase.from('user_stats').select('*').eq('user_id', userId).single()
  if (error) return null
  return data as UserStats
}

export async function getDuoStats(duoId: string): Promise<DuoStats | null> {
  const { data, error } = await supabase.from('duo_stats').select('*').eq('duo_id', duoId).single()
  if (error) return null
  return data as DuoStats
}

export async function getOrCreateDuo(userId1: string, userId2: string) {
  const [p1, p2] = [userId1, userId2].sort()

  const { data: existing } = await supabase
    .from('duos').select('*').eq('player1_id', p1).eq('player2_id', p2).maybeSingle()

  if (existing) return existing as { id: string; player1_id: string; player2_id: string }

  const { data: duo, error } = await db.from('duos')
    .insert({ player1_id: p1, player2_id: p2 }).select().single()

  if (error) throw error
  const typedDuo = duo as { id: string; player1_id: string; player2_id: string }
  await db.from('duo_stats').insert({ duo_id: typedDuo.id })
  return typedDuo
}

export async function updateUserStatsAfterRound(params: {
  userId: string
  roundWon: boolean
  correctLetters: number
  wrongLetters: number
  powerupsUsed: number
  wordLength: number
  secondsTaken: number
  isProposer: boolean
}): Promise<void> {
  const { data: rawCurrent } = await supabase
    .from('user_stats').select('*').eq('user_id', params.userId).single()
  const current = rawCurrent as UserStats | null
  if (!current) {
    console.error('updateUserStatsAfterRound: no stats row for user', params.userId)
    return
  }

  const roundsPlayed = current.rounds_played + 1
  const newStreak = params.roundWon ? current.current_streak + 1 : 0
  const newBestStreak = Math.max(current.best_streak, newStreak)
  const newAvgTime = current.avg_time_per_round_seconds == null
    ? params.secondsTaken
    : Math.round((current.avg_time_per_round_seconds * current.rounds_played + params.secondsTaken) / roundsPlayed)

  const { error } = await db.from('user_stats').update({
    rounds_played: roundsPlayed,
    rounds_won: current.rounds_won + (params.roundWon ? 1 : 0),
    rounds_lost: current.rounds_lost + (params.roundWon ? 0 : 1),
    total_correct_letters: current.total_correct_letters + params.correctLetters,
    total_wrong_letters: current.total_wrong_letters + params.wrongLetters,
    powerups_used_total: current.powerups_used_total + params.powerupsUsed,
    words_proposed: current.words_proposed + (params.isProposer ? 1 : 0),
    words_guessed_correctly: current.words_guessed_correctly + (!params.isProposer && params.roundWon ? 1 : 0),
    longest_word_guessed: Math.max(current.longest_word_guessed, params.wordLength),
    current_streak: newStreak,
    best_streak: newBestStreak,
    avg_time_per_round_seconds: newAvgTime,
    total_play_time_seconds: current.total_play_time_seconds + params.secondsTaken,
    updated_at: new Date().toISOString(),
  }).eq('user_id', params.userId)

  if (error) {
    console.error('Error updating user stats after round:', error)
    throw error
  }
}

export async function updateUserStatsAfterMatch(params: {
  userId: string
  won: boolean
  lost: boolean
  abandoned: boolean
}): Promise<void> {
  const { data: rawCurrent } = await supabase
    .from('user_stats').select('matches_played, matches_won, matches_lost, matches_abandoned')
    .eq('user_id', params.userId).single()
  const current = rawCurrent as { matches_played: number; matches_won: number; matches_lost: number; matches_abandoned: number } | null
  if (!current) {
    console.error('updateUserStatsAfterMatch: no stats row for user', params.userId)
    return
  }

  const { error } = await db.from('user_stats').update({
    matches_played: current.matches_played + 1,
    matches_won: current.matches_won + (params.won ? 1 : 0),
    matches_lost: current.matches_lost + (params.lost ? 1 : 0),
    matches_abandoned: current.matches_abandoned + (params.abandoned ? 1 : 0),
    updated_at: new Date().toISOString(),
  }).eq('user_id', params.userId)

  if (error) console.error('Error updating user stats after match:', error)
}

export async function updateDuoStatsAfterMatch(params: {
  duoId: string
  completed: boolean
  player1Won: boolean
  player2Won: boolean
  tie: boolean
  roundsPlayed: number
  matchDurationSeconds: number
}): Promise<void> {
  const { data: rawCurrent } = await supabase
    .from('duo_stats').select('*').eq('duo_id', params.duoId).single()
  const current = rawCurrent as DuoStats | null
  if (!current) {
    console.error('updateDuoStatsAfterMatch: no stats row for duo', params.duoId)
    return
  }

  const newAvgDuration = current.avg_match_duration_seconds == null
    ? params.matchDurationSeconds
    : Math.round(
        (current.avg_match_duration_seconds * current.matches_completed + params.matchDurationSeconds) /
        (current.matches_completed + (params.completed ? 1 : 0))
      )

  const { error } = await db.from('duo_stats').update({
    total_matches: current.total_matches + 1,
    matches_completed: current.matches_completed + (params.completed ? 1 : 0),
    player1_wins: current.player1_wins + (params.player1Won ? 1 : 0),
    player2_wins: current.player2_wins + (params.player2Won ? 1 : 0),
    ties: current.ties + (params.tie ? 1 : 0),
    total_rounds_played: current.total_rounds_played + params.roundsPlayed,
    avg_match_duration_seconds: newAvgDuration,
    last_played_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('duo_id', params.duoId)

  if (error) console.error('Error updating duo stats:', error)
}
