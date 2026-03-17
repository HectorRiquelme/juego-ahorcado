import { supabase, db } from '@/lib/supabase'
import type { Match, Round, RoundEvent, RoundPowerupUse, MatchInsert } from '@/types'
import type { ProposerFormData } from '@/types/game'
import { encodeWord } from '@/utils/wordNormalizer'
import { calculateRoundScore } from '@/utils/scoreCalculator'

// ─── MATCH ───────────────────────────────────────────────────────────────────

export async function createMatch(params: {
  roomId: string
  player1Id: string
  player2Id: string
  mode: Match['mode']
  totalRounds: number
  duoId?: string | null
}): Promise<Match> {
  const insert: MatchInsert = {
    room_id: params.roomId,
    player1_id: params.player1Id,
    player2_id: params.player2Id,
    mode: params.mode,
    total_rounds: params.totalRounds,
    duo_id: params.duoId ?? null,
  }

  const { data, error } = await db.from('matches').insert(insert).select().single()
  if (error) throw error
  return data as Match
}

export async function getMatch(matchId: string): Promise<Match | null> {
  const { data, error } = await supabase.from('matches').select('*').eq('id', matchId).single()
  if (error) return null
  return data as Match
}

export async function startMatch(matchId: string): Promise<void> {
  const { error } = await db.from('matches').update({
    status: 'proposer_choosing',
    started_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', matchId)
  if (error) throw error
}

export async function updateMatchStatus(matchId: string, status: Match['status']): Promise<void> {
  const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
  if (status === 'match_end') updates.ended_at = new Date().toISOString()
  const { error } = await db.from('matches').update(updates).eq('id', matchId)
  if (error) throw error
}

// ─── ROUND ───────────────────────────────────────────────────────────────────

export async function createRound(params: {
  matchId: string
  roundNumber: number
  proposerId: string
  guesserIdParam: string
  formData: ProposerFormData
  maxErrors: number
  timerSeconds: number | null
}): Promise<Round> {
  const powerupTypes = generatePowerupList(params.formData.powerupsGranted)

  const { data, error } = await db.from('rounds').insert({
    match_id: params.matchId,
    round_number: params.roundNumber,
    proposer_id: params.proposerId,
    guesser_id: params.guesserIdParam,
    category_id: params.formData.categoryId || null,
    word_encoded: encodeWord(params.formData.word),
    hint: params.formData.hint || null,
    hint_extra: params.formData.hintExtra || null,
    max_errors: params.maxErrors,
    powerups_available: powerupTypes,
    timer_seconds: params.timerSeconds,
    status: 'guesser_playing',
    correct_letters: [],
    wrong_letters: [],
    errors_count: 0,
    started_at: new Date().toISOString(),
  }).select().single()

  if (error) throw error
  return data as Round
}

function generatePowerupList(count: number): string[] {
  const available = ['reveal_letter', 'extra_hint', 'shield', 'eliminate_wrong', 'show_structure', 'time_freeze']
  const base = ['reveal_letter', 'extra_hint']
  const rest = available.filter((p) => !base.includes(p))
  const selected = [...base, ...rest.slice(0, Math.max(0, count - base.length))]
  return selected.slice(0, count)
}

export async function getRound(roundId: string): Promise<Round | null> {
  const { data, error } = await supabase.from('rounds').select('*').eq('id', roundId).single()
  if (error) return null
  return data as Round
}

export async function getCurrentRound(matchId: string, roundNumber: number): Promise<Round | null> {
  const { data, error } = await supabase
    .from('rounds').select('*').eq('match_id', matchId).eq('round_number', roundNumber).single()
  if (error) return null
  return data as Round
}

// ─── LETRA ADIVINADA ─────────────────────────────────────────────────────────

export async function submitLetterGuess(params: {
  roundId: string
  matchId: string
  playerId: string
  letter: string
  isCorrect: boolean
  isShieldActive: boolean
}): Promise<void> {
  const now = new Date().toISOString()

  const eventInsert: Omit<RoundEvent, 'id' | 'created_at'> = {
    round_id: params.roundId,
    player_id: params.playerId,
    event_type: 'letter_guess',
    payload: {
      letter: params.letter,
      correct: params.isCorrect,
      shield_used: params.isShieldActive && !params.isCorrect,
    },
  }
  await db.from('round_events').insert(eventInsert)

  const { data: rawRound } = await supabase
    .from('rounds').select('correct_letters, wrong_letters, errors_count').eq('id', params.roundId).single()
  const round = rawRound as { correct_letters: string[]; wrong_letters: string[]; errors_count: number } | null
  if (!round) return

  if (params.isCorrect) {
    await db.from('rounds').update({
      correct_letters: [...round.correct_letters, params.letter],
      updated_at: now,
    }).eq('id', params.roundId)
  } else {
    const actualError = !params.isShieldActive
    await db.from('rounds').update({
      wrong_letters: [...round.wrong_letters, params.letter],
      errors_count: actualError ? round.errors_count + 1 : round.errors_count,
      updated_at: now,
    }).eq('id', params.roundId)
  }
}

// ─── FIN DE RONDA ────────────────────────────────────────────────────────────

export async function finishRound(params: {
  roundId: string
  matchId: string
  result: Round['result']
  secondsTaken: number
  correctLetters: number
  wrongLetters: number
  powerupsUsed: number
  timerSeconds: number | null
}): Promise<number> {
  const won = params.result === 'won'
  const score = calculateRoundScore({
    won,
    secondsTaken: params.secondsTaken,
    correctLetters: params.correctLetters,
    wrongLetters: params.wrongLetters,
    powerupsUsed: params.powerupsUsed,
    timerSeconds: params.timerSeconds,
  })

  await db.from('rounds').update({
    result: params.result,
    score,
    status: 'round_end',
    ended_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', params.roundId)

  return score
}

// ─── COMODINES ───────────────────────────────────────────────────────────────

export async function recordPowerupUse(insert: Omit<RoundPowerupUse, 'id' | 'used_at'>): Promise<void> {
  const { error } = await db.from('round_powerup_uses').insert({ ...insert, used_at: new Date().toISOString() })
  if (error) throw error
}

// ─── HISTORIAL ───────────────────────────────────────────────────────────────

export async function getMatchHistory(userId: string, limit = 10) {
  const { data, error } = await supabase
    .from('matches')
    .select(`
      id, mode, status, player1_score, player2_score, winner_id,
      player1_id, player2_id,
      started_at, ended_at,
      player1:profiles!matches_player1_id_fkey(username, display_name, avatar_url),
      player2:profiles!matches_player2_id_fkey(username, display_name, avatar_url)
    `)
    .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
    .in('status', ['match_end', 'abandoned'] as const)
    .order('ended_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as Array<{
    id: string
    mode: string
    status: string
    player1_score: number
    player2_score: number
    winner_id: string | null
    player1_id: string
    player2_id: string
    started_at: string | null
    ended_at: string | null
    player1: { username: string; display_name: string | null; avatar_url: string | null } | null
    player2: { username: string; display_name: string | null; avatar_url: string | null } | null
  }>
}
