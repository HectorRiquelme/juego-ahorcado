import { useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useGameStore } from '@/stores/gameStore'
import { useAuthStore } from '@/stores/authStore'
import { useRealtime } from './useRealtime'
import type { GameEvent } from './useRealtime'
import type { PowerupType } from '@/types'
import type { RevealLetterResult, ChatMessage } from '@/types/game'
import {
  isWordComplete,
  normalizeWord,
  decodeWord,
} from '@/utils/wordNormalizer'
import { submitLetterGuess, finishRound } from '../services/gameService'
import { updateUserStatsAfterRound } from '@/features/stats/services/statsService'
import { PROPOSER_WIN_BASE, PROPOSER_WIN_PER_ERROR } from '@/utils/constants'

interface UseGameStateOptions {
  roomCode: string
  /** Callback cuando llega un mensaje de chat del otro jugador */
  onChatMessage?: (msg: ChatMessage) => void
}

/**
 * NUEVA MECÁNICA:
 * - El PROPONENTE controla el teclado y activa escudos.
 *   Cuando el desafiado pide una letra (vía chat), el proponente
 *   la selecciona en el teclado. El sistema valida si está en la palabra.
 * - El DESAFIADO ve el tablero, activa comodines y se comunica por chat.
 * - Ambos pueden activar comodines (el desafiante también si se le pide).
 */
export function useGameState({ roomCode, onChatMessage }: UseGameStateOptions) {
  const { user } = useAuthStore()
  const {
    gameState,
    setRoundState,
    addCorrectLetter,
    addWrongLetter,
    updateRoundState,
    updateGameStatus,
  } = useGameStore()
  const navigate = useNavigate()
  const roundStartTime = useRef<number>(Date.now())
  const shieldConsumedRef = useRef(false)

  const myId = user?.id ?? ''

  // ─── Manejar eventos entrantes del otro jugador ──────────────────────────

  const handleEvent = useCallback(
    (event: GameEvent) => {
      switch (event.type) {

        // El proponente ingresó una letra → el desafiado actualiza su vista
        case 'letter_guessed': {
          const { letter, correct } = event.payload as { letter: string; correct: boolean }
          if (correct) {
            addCorrectLetter(letter)
          } else {
            addWrongLetter(letter)
          }
          break
        }

        // Comodín activado por el otro jugador
        case 'powerup_used': {
          const { powerupType } = event.payload as { powerupType: PowerupType }
          updateRoundState({
            powerupsUsed: [...(gameState?.roundState?.powerupsUsed ?? []), powerupType],
          })
          if (powerupType === 'reveal_letter') {
            const { letter } = event.payload as unknown as RevealLetterResult & { powerupType: string }
            if (letter) addCorrectLetter(letter)
          }
          if (powerupType === 'shield') {
            updateRoundState({ shieldActive: true })
          }
          break
        }

        case 'round_ended': {
          // El desafiado recibe el resultado y los puntos de ambos jugadores
          const { result: roundResult, guesserScore, proposerScore } = event.payload as {
            result: 'won' | 'lost' | 'timeout'
            guesserScore: number
            proposerScore: number
          }

          // Yo soy el desafiado → mis puntos son guesserScore
          const myRoundScore    = guesserScore
          const theirRoundScore = proposerScore

          useGameStore.getState().updateScores(
            (gameState?.myScore ?? 0) + myRoundScore,
            (gameState?.opponentScore ?? 0) + theirRoundScore,
          )

          // Guardar mi resultado en el roundState para que RoundEndPage lo muestre
          useGameStore.getState().updateRoundState({
            result: roundResult,
            score: myRoundScore,
          })

          // Actualizar mis stats como desafiado
          void updateUserStatsAfterRound({
            userId: myId,
            roundWon: roundResult === 'won',
            correctLetters: gameState?.roundState?.correctLetters.length ?? 0,
            wrongLetters: gameState?.roundState?.wrongLetters.length ?? 0,
            powerupsUsed: gameState?.roundState?.powerupsUsed.length ?? 0,
            wordLength: gameState?.roundState?.wordLength ?? 0,
            secondsTaken: 0,
            isProposer: false,
          })

          updateGameStatus('round_end')
          navigate(`/rooms/${roomCode}/round-end`)
          break
        }

        case 'match_ended': {
          updateGameStatus('match_end')
          navigate(`/rooms/${roomCode}/match-end`)
          break
        }

        case 'player_ready': {
          updateRoundState({ opponentReady: true })
          break
        }

        case 'round_created': {
          const { roundId, roundNumber } = event.payload as {
            roundId: string
            roundNumber: number
          }
          void loadRoundAsGuesser(roundId, roundNumber)
          break
        }

        // Mensaje de chat del otro jugador
        case 'chat_message': {
          const { message } = event.payload as { message: ChatMessage }
          onChatMessage?.(message)
          break
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gameState, roomCode, onChatMessage]
  )

  const { sendEvent } = useRealtime({
    roomCode,
    userId: myId,
    onEvent: handleEvent,
  })

  // ─── Cargar ronda como desafiado ────────────────────────────────────────

  const loadRoundAsGuesser = useCallback(
    async (roundId: string, roundNumber: number) => {
      const { data: rawRound } = await supabase
        .from('rounds')
        .select('*')
        .eq('id', roundId)
        .single()

      const round = rawRound as import('@/types').Round | null
      if (!round || !gameState) return

      roundStartTime.current = Date.now()
      shieldConsumedRef.current = false

      const { data: rawCat } = await supabase
        .from('categories')
        .select('name, emoji')
        .eq('id', round.category_id ?? '')
        .maybeSingle()
      const category = rawCat as { name: string; emoji: string | null } | null

      // El desafiado NO decodifica la palabra — solo sabe el largo
      const wordEncoded = round.word_encoded
      const tempDecoded = decodeWord(wordEncoded)
      const wordLength = tempDecoded.replace(/\s/g, '').length
      const wordStructure = tempDecoded.split(' ').map((t) => t.length)

      setRoundState({
        roundId: round.id,
        roundNumber,
        isProposer: false,
        isGuesser: true,
        word: null,
        wordLength,
        wordStructure,
        hint: round.hint,
        hintExtra: null,
        category: category?.name ?? 'Libre',
        categoryEmoji: category?.emoji ?? '🎯',
        correctLetters: round.correct_letters as string[],
        wrongLetters: round.wrong_letters as string[],
        maxErrors: round.max_errors,
        errorsCount: round.errors_count,
        powerupsAvailable: round.powerups_available as PowerupType[],
        powerupsUsed: [],
        shieldActive: false,
        timerSeconds: round.timer_seconds,
        timeLeft: round.timer_seconds,
        result: null,
        score: null,
        opponentReady: false,
      })

      updateGameStatus('guesser_playing')
    },
    [gameState, setRoundState, updateGameStatus]
  )

  // ─── PROPONENTE ingresa una letra (en nombre del desafiado) ─────────────
  // El desafiado pidió la letra via chat → el proponente la confirma
  // en el teclado → aquí se valida y persiste.

  const guessLetter = useCallback(
    async (letter: string) => {
      const round = gameState?.roundState
      // Solo el PROPONENTE puede ingresar letras ahora
      if (!round || !round.isProposer || round.result) return
      if (round.correctLetters.includes(letter) || round.wrongLetters.includes(letter)) return

      // El proponente conoce la palabra real
      const wordReal = round.word ?? ''
      const wordNorm = normalizeWord(wordReal)
      const isCorrect = wordNorm.includes(letter)

      const isShieldActive = round.shieldActive && !shieldConsumedRef.current

      // Actualizar estado local (optimistic)
      if (isCorrect) {
        addCorrectLetter(letter)
      } else {
        addWrongLetter(letter)
        if (isShieldActive) {
          shieldConsumedRef.current = true
          updateRoundState({ shieldActive: false })
        }
      }

      // Persistir en DB
      await submitLetterGuess({
        roundId: round.roundId,
        matchId: gameState!.matchId,
        playerId: myId,
        letter,
        isCorrect,
        isShieldActive,
      })

      // Notificar al desafiado vía Realtime
      sendEvent('letter_guessed', { letter, correct: isCorrect })

      // Verificar fin de ronda
      const updatedCorrect = isCorrect
        ? [...round.correctLetters, letter]
        : round.correctLetters
      const errorsCount = isCorrect
        ? round.errorsCount
        : isShieldActive
        ? round.errorsCount
        : round.errorsCount + 1

      const won = isWordComplete(wordReal, updatedCorrect)
      const lost = errorsCount >= round.maxErrors

      if (won || lost) {
        const secondsTaken = Math.floor((Date.now() - roundStartTime.current) / 1000)
        await handleRoundEnd(won ? 'won' : 'lost', secondsTaken, wordReal)
      }
    },
    [gameState, myId, sendEvent, addCorrectLetter, addWrongLetter, updateRoundState]
  )

  // ─── Fin de ronda ────────────────────────────────────────────────────────
  // Este método lo llama siempre el PROPONENTE (que controla el teclado).
  // Calcula puntos para ambos jugadores y los emite al desafiado vía Realtime.

  const handleRoundEnd = useCallback(
    async (result: 'won' | 'lost' | 'timeout', secondsTaken: number, word: string) => {
      const round = gameState?.roundState
      if (!round) return

      // ── Calcular puntos ───────────────────────────────────────────────
      // guesserScore: puntos para el desafiado (solo si adivinó)
      // proposerScore: puntos para el proponente (solo si el desafiado falló)
      const guesserScore = await finishRound({
        roundId: round.roundId,
        matchId: gameState!.matchId,
        result,
        secondsTaken,
        correctLetters: round.correctLetters.length,
        wrongLetters: round.wrongLetters.length,
        powerupsUsed: round.powerupsUsed.length,
        timerSeconds: round.timerSeconds,
      })

      // El proponente gana puntos cuando el desafiado NO adivina
      const proposerScore = result !== 'won'
        ? PROPOSER_WIN_BASE + round.wrongLetters.length * PROPOSER_WIN_PER_ERROR
        : 0

      // Puntos para mí (proponente) y para mi oponente (guesser)
      const myRoundScore    = proposerScore   // yo soy el proponente
      const theirRoundScore = guesserScore    // ellos son el desafiado

      // ── Actualizar estado local de puntajes ───────────────────────────
      useGameStore.getState().updateScores(
        (gameState?.myScore ?? 0) + myRoundScore,
        (gameState?.opponentScore ?? 0) + theirRoundScore,
      )

      await updateUserStatsAfterRound({
        userId: myId,
        roundWon: result !== 'won', // el proponente "gana" la ronda cuando el desafiado falla
        correctLetters: round.correctLetters.length,
        wrongLetters: round.wrongLetters.length,
        powerupsUsed: round.powerupsUsed.length,
        wordLength: word.replace(/\s/g, '').length,
        secondsTaken,
        isProposer: true,
      })

      // ── Notificar al desafiado: resultado + sus puntos + puntos del proponente
      sendEvent('round_ended', {
        result,
        guesserScore,   // puntos que ganó el desafiado esta ronda
        proposerScore,  // puntos que ganó el proponente esta ronda
      })

      updateRoundState({ result, score: myRoundScore, word })
      updateGameStatus('round_end')
      navigate(`/rooms/${roomCode}/round-end`)
    },
    [gameState, myId, updateRoundState, updateGameStatus, sendEvent, navigate, roomCode]
  )

  return { guessLetter, sendEvent, handleRoundEnd }
}
