import { useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useGameStore } from '@/stores/gameStore'
import { useAuthStore } from '@/stores/authStore'
import { useRealtime } from './useRealtime'
import type { GameEvent } from './useRealtime'
import type { PowerupType, MatchStatus } from '@/types'
import type { GameStatus, ChatMessage } from '@/types/game'
import {
  isWordComplete,
  normalizeWord,
} from '@/utils/wordNormalizer'
import { submitLetterGuess, finishRound, updateMatchStatus } from '../services/gameService'
import { updateUserStatsAfterRound } from '@/features/stats/services/statsService'
import {
  PROPOSER_WIN_BASE,
  PROPOSER_WIN_PER_ERROR,
  DISCONNECT_PAUSE_SECONDS,
  DISCONNECT_ABANDON_SECONDS,
} from '@/utils/constants'

interface UseGameStateOptions {
  roomCode: string
  /** Callback cuando llega un mensaje de chat del otro jugador */
  onChatMessage?: (msg: ChatMessage) => void
  /** Callback cuando el proponente ingresa una letra (para mensaje de sistema en chat) */
  onLetterResult?: (letter: string, correct: boolean) => void
  /** Callback cuando el oponente activa time_freeze (para congelar el timer local) */
  onTimeFreeze?: () => void
}

/**
 * NUEVA MECÁNICA:
 * - El PROPONENTE controla el teclado y activa escudos.
 *   Cuando el desafiado pide una letra (vía chat), el proponente
 *   la selecciona en el teclado. El sistema valida si está en la palabra.
 * - El DESAFIADO ve el tablero, activa comodines y se comunica por chat.
 * - Ambos pueden activar comodines (el desafiante también si se le pide).
 */
export function useGameState({ roomCode, onChatMessage, onLetterResult, onTimeFreeze }: UseGameStateOptions) {
  const { user } = useAuthStore()
  const {
    gameState,
    setRoundState,
    addCorrectLetter,
    addWrongLetter,
    updateRoundState,
    updateGameStatus,
    setDisconnected,
    clearDisconnected,
  } = useGameStore()
  const navigate = useNavigate()
  const roundStartTime = useRef<number>(Date.now())
  const shieldConsumedRef = useRef(false)
  const processingLetterRef = useRef(false)
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abandonTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevStatusRef = useRef<GameStatus | null>(null)

  const myId = user?.id ?? ''

  // Ref para callbacks que no deben recrear el canal
  const onTimeFreezeRef = useRef(onTimeFreeze)
  onTimeFreezeRef.current = onTimeFreeze

  // ─── Helpers para validar payloads de eventos ──────────────────────────

  function safeString(val: unknown, fallback = ''): string {
    return typeof val === 'string' ? val : fallback
  }
  function safeNumber(val: unknown, fallback = 0): number {
    return typeof val === 'number' && isFinite(val) ? val : fallback
  }
  function safeBool(val: unknown, fallback = false): boolean {
    return typeof val === 'boolean' ? val : fallback
  }
  function safeArray<T>(val: unknown, fallback: T[] = []): T[] {
    return Array.isArray(val) ? val : fallback
  }

  // ─── Manejar eventos entrantes del otro jugador ──────────────────────────

  const handleEvent = useCallback(
    (event: GameEvent) => {
      const p = (event.payload ?? {}) as Record<string, unknown>

      switch (event.type) {

        // El proponente ingresó una letra → el desafiado actualiza su vista
        case 'letter_guessed': {
          const letter = safeString(p.letter)
          const correct = safeBool(p.correct)
          if (!letter) break
          if (correct) {
            addCorrectLetter(letter)
          } else {
            addWrongLetter(letter)
          }
          onLetterResult?.(letter, correct)
          break
        }

        // Comodín activado por el otro jugador
        case 'powerup_used': {
          const powerupType = safeString(p.powerupType) as PowerupType
          if (!powerupType) break
          updateRoundState({
            powerupsUsed: [...(gameState?.roundState?.powerupsUsed ?? []), powerupType],
          })
          if (powerupType === 'reveal_letter') {
            const letter = safeString(p.letter)
            if (letter) addCorrectLetter(letter)
          }
          if (powerupType === 'shield') {
            updateRoundState({ shieldActive: true })
          }
          if (powerupType === 'time_freeze') {
            onTimeFreezeRef.current?.()
          }
          break
        }

        case 'round_ended': {
          const currentState = useGameStore.getState().gameState
          if (!currentState?.roundState) break

          const roundResult = safeString(p.result, 'lost') as 'won' | 'lost' | 'timeout'
          const guesserScore = safeNumber(p.guesserScore)
          const proposerScore = safeNumber(p.proposerScore)

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

          // BUG 11 FIX: calcular tiempo real tomado por el desafiado
          const secondsTaken = Math.floor((Date.now() - roundStartTime.current) / 1000)
          void updateUserStatsAfterRound({
            userId: myId,
            roundWon: roundResult === 'won',
            correctLetters: gameState?.roundState?.correctLetters.length ?? 0,
            wrongLetters: gameState?.roundState?.wrongLetters.length ?? 0,
            powerupsUsed: gameState?.roundState?.powerupsUsed.length ?? 0,
            wordLength: gameState?.roundState?.wordLength ?? 0,
            secondsTaken,
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
          const roundId = safeString(p.roundId)
          const roundNumber = safeNumber(p.roundNumber, 1)
          if (!roundId) break
          void loadRoundAsGuesser(roundId, roundNumber, {
            wordLength: safeNumber(p.wordLength),
            wordStructure: safeArray<number>(p.wordStructure),
            hint: typeof p.hint === 'string' ? p.hint : null,
            categoryId: safeString(p.categoryId),
            maxErrors: safeNumber(p.maxErrors, 6),
            timerSeconds: typeof p.timerSeconds === 'number' ? p.timerSeconds : null,
            powerupsAvailable: safeArray<string>(p.powerupsAvailable),
          })
          break
        }

        case 'chat_message': {
          const message = p.message as ChatMessage | undefined
          if (message?.id && message?.text) onChatMessage?.(message)
          break
        }

        case 'player_disconnected': {
          const disconnectedId = safeString(p.userId)
          if (!disconnectedId || !gameState?.matchId) break

          // Guardar estado actual antes de pausar
          const currentStatus = useGameStore.getState().gameState?.status
          if (currentStatus && currentStatus !== 'paused' && currentStatus !== 'abandoned') {
            prevStatusRef.current = currentStatus
          }

          setDisconnected(disconnectedId)
          toast('Tu oponente se desconectó', { icon: '⚠️', duration: 5000 })

          // Timer de pausa: 30 segundos
          if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current)
          pauseTimerRef.current = setTimeout(() => {
            const gs = useGameStore.getState().gameState
            if (!gs || gs.status === 'abandoned' || gs.status === 'match_end') return
            updateGameStatus('paused')
            void updateMatchStatus(gs.matchId, 'paused').catch(() => {})
            toast('Partida pausada por desconexión', { icon: '⏸️', duration: 8000 })
          }, DISCONNECT_PAUSE_SECONDS * 1000)

          // Timer de abandono: 600 segundos
          if (abandonTimerRef.current) clearTimeout(abandonTimerRef.current)
          abandonTimerRef.current = setTimeout(() => {
            const gs = useGameStore.getState().gameState
            if (!gs || gs.status === 'match_end') return
            updateGameStatus('abandoned')
            void updateMatchStatus(gs.matchId, 'abandoned').catch(() => {})
            toast.error('Partida abandonada por desconexión prolongada')
            navigate(`/rooms/${roomCode}/match-end`)
          }, DISCONNECT_ABANDON_SECONDS * 1000)

          break
        }

        case 'player_reconnected': {
          const reconnectedId = safeString(p.userId)
          if (!reconnectedId) break

          // Limpiar timers
          if (pauseTimerRef.current) { clearTimeout(pauseTimerRef.current); pauseTimerRef.current = null }
          if (abandonTimerRef.current) { clearTimeout(abandonTimerRef.current); abandonTimerRef.current = null }

          clearDisconnected()

          // Restaurar estado previo si estaba pausado
          const currentStatus = useGameStore.getState().gameState?.status
          if (currentStatus === 'paused' && prevStatusRef.current) {
            updateGameStatus(prevStatusRef.current)
            const gs = useGameStore.getState().gameState
            if (gs) void updateMatchStatus(gs.matchId, prevStatusRef.current as MatchStatus).catch(() => {})
            prevStatusRef.current = null
          }

          toast.success('Tu oponente se reconectó', { icon: '✅', duration: 3000 })
          break
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gameState, roomCode, onChatMessage, onLetterResult]
  )

  const { sendEvent } = useRealtime({
    roomCode,
    userId: myId,
    onEvent: handleEvent,
  })

  // ─── Cargar ronda como desafiado ────────────────────────────────────────
  // BUG 5 FIX: los datos vienen del evento round_created, NO de word_encoded en BD

  interface RoundEventData {
    wordLength: number
    wordStructure: number[]
    hint: string | null
    categoryId: string
    maxErrors: number
    timerSeconds: number | null
    powerupsAvailable: string[]
  }

  const loadRoundAsGuesser = useCallback(
    async (roundId: string, roundNumber: number, eventData: RoundEventData) => {
      if (!gameState) return

      roundStartTime.current = Date.now()
      shieldConsumedRef.current = false

      // Solo cargamos la categoría (nombre/emoji) — sin tocar word_encoded
      const { data: rawCat } = await supabase
        .from('categories')
        .select('name, emoji')
        .eq('id', eventData.categoryId)
        .maybeSingle()
      const category = rawCat as { name: string; emoji: string | null } | null

      setRoundState({
        roundId,
        roundNumber,
        isProposer: false,
        isGuesser: true,
        word: null,
        wordLength: eventData.wordLength,
        wordStructure: eventData.wordStructure,
        hint: eventData.hint,
        hintExtra: null,
        category: category?.name ?? 'Libre',
        categoryEmoji: category?.emoji ?? '🎯',
        correctLetters: [],
        wrongLetters: [],
        maxErrors: eventData.maxErrors,
        errorsCount: 0,
        powerupsAvailable: eventData.powerupsAvailable as PowerupType[],
        powerupsUsed: [],
        shieldActive: false,
        timerSeconds: eventData.timerSeconds,
        timeLeft: eventData.timerSeconds,
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
      // Bloquear si ya se está procesando otra letra (previene race condition)
      if (processingLetterRef.current) return
      processingLetterRef.current = true

      try {
        const round = useGameStore.getState().gameState?.roundState
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
        try {
          await submitLetterGuess({
            roundId: round.roundId,
            matchId: gameState!.matchId,
            playerId: myId,
            letter,
            isCorrect,
            isShieldActive,
          })
        } catch (err) {
          console.error('Error persistiendo letra:', err)
        }

        // Notificar al desafiado vía Realtime
        sendEvent('letter_guessed', { letter, correct: isCorrect })

        // Verificar fin de ronda — leer estado fresco del store
        const freshRound = useGameStore.getState().gameState?.roundState
        const updatedCorrect = freshRound?.correctLetters ?? (isCorrect
          ? [...round.correctLetters, letter]
          : round.correctLetters)
        const errorsCount = freshRound?.errorsCount ?? (isCorrect
          ? round.errorsCount
          : isShieldActive
          ? round.errorsCount
          : round.errorsCount + 1)

        const won = isWordComplete(wordReal, updatedCorrect)
        const lost = errorsCount >= round.maxErrors

        if (won || lost) {
          const secondsTaken = Math.floor((Date.now() - roundStartTime.current) / 1000)
          await handleRoundEnd(won ? 'won' : 'lost', secondsTaken, wordReal)
        }
      } finally {
        processingLetterRef.current = false
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
      let guesserScore: number
      try {
        guesserScore = await finishRound({
          roundId: round.roundId,
          matchId: gameState!.matchId,
          result,
          secondsTaken,
          correctLetters: round.correctLetters.length,
          wrongLetters: round.wrongLetters.length,
          powerupsUsed: round.powerupsUsed.length,
          timerSeconds: round.timerSeconds,
        })
      } catch (err) {
        console.error('Error finalizando ronda:', err)
        guesserScore = 0
      }

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

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current)
      if (abandonTimerRef.current) clearTimeout(abandonTimerRef.current)
    }
  }, [])

  return { guessLetter, sendEvent, handleRoundEnd }
}
