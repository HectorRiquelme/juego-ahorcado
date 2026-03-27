/**
 * GamePage — Mecánica rediseñada:
 *
 * PROPONENTE (desafiante):
 *   - Ve la palabra real todo el tiempo
 *   - Controla el teclado: ingresa las letras que el desafiado pide
 *   - Puede activar ESCUDO y todos los comodines
 *   - Comparte el chat
 *
 * DESAFIADO (guesser):
 *   - Ve el tablero (ahorcado + guiones) pero NO la palabra
 *   - No tiene teclado — pide letras por chat
 *   - Puede activar todos los comodines (excepto escudo, que es del proponente)
 *   - Comparte el chat
 *
 * CHAT:
 *   - Tiempo real vía Supabase Realtime (broadcast)
 *   - Mensajes de texto libre
 *   - Petición de letra con un toque (desafiado)
 *   - Notificaciones automáticas de comodines
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useGameStore } from '@/stores/gameStore'
import { useRoomStore } from '@/stores/roomStore'
import { useGameState } from '@/features/game/hooks/useGameState'
import { useChat } from '@/features/game/hooks/useChat'
import { usePowerups } from '@/features/game/hooks/usePowerups'
import type { PowerupType } from '@/types'
import type { ChatMessage, ProposerFormData, RevealLetterResult, EliminateWrongResult } from '@/types/game'
import { getWordStructure } from '@/utils/wordNormalizer'
import { createRound } from '@/features/game/services/gameService'

import HangmanSVG from '@/features/game/components/HangmanSVG'
import WordDisplay from '@/features/game/components/WordDisplay'
import Keyboard from '@/features/game/components/Keyboard'
import PowerupBar from '@/features/game/components/PowerupBar'
import ProposerForm from '@/features/game/components/ProposerForm'
import GameTimer from '@/features/game/components/GameTimer'
import ScoreBoard from '@/features/game/components/ScoreBoard'
import ChatPanel from '@/features/game/components/ChatPanel'

import { slideUp, fadeIn } from '@/animations/variants'
import { useProfile } from '@/hooks/useProfile'
import { cn } from '@/utils/cn'
import toast from 'react-hot-toast'

// Nombres de comodines para notificaciones en chat
const POWERUP_LABELS: Record<PowerupType, string> = {
  reveal_letter: 'Revelar letra',
  eliminate_wrong: 'Eliminar letras',
  extra_hint: 'Pista extra',
  shield: 'Escudo',
  show_structure: 'Ver estructura',
  time_freeze: 'Congelar tiempo',
}

export default function GamePage() {
  const { code } = useParams<{ code: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { profile } = useProfile()
  const { gameState, setGameState, setRoundState, updateRoundState, addCorrectLetter } = useGameStore()
  const { room } = useRoomStore()

  // Estado local de comodines / efectos visuales
  const [eliminatedLetters, setEliminatedLetters] = useState<string[]>([])
  const [shownHintExtra, setShownHintExtra] = useState<string | null>(null)
  const [wordStructure, setWordStructure] = useState<number[] | null>(null)
  const [timeFrozen, setTimeFrozen] = useState(false)
  const [proposerLoading, setProposerLoading] = useState(false)

  // Tab móvil: 'game' | 'chat'
  const [activeTab, setActiveTab] = useState<'game' | 'chat'>('game')
  const [unreadChat, setUnreadChat] = useState(0)

  const matchId = (location.state as { matchId?: string })?.matchId ?? gameState?.matchId
  const firstProposerId = (location.state as { firstProposerId?: string })?.firstProposerId
  const myId = user?.id ?? ''

  // CRITICO-08: guard si matchId es undefined (recarga directa de URL)
  useEffect(() => {
    if (!matchId && !gameState) {
      navigate('/home')
    }
  }, [matchId, gameState, navigate])
  const myName = profile?.display_name ?? profile?.username ?? 'Tú'
  const roundState = gameState?.roundState

  const roundWordRef = useRef<string>('')

  // ─── Inicializar estado del juego ──────────────────────────────────────

  useEffect(() => {
    if (!matchId || !user || !room || gameState?.matchId === matchId) return
    const proposerId = firstProposerId ?? room.host_id
    const isMyTurnToPropose = proposerId === myId
    setGameState({
      matchId,
      roomCode: code ?? '',
      mode: room.mode,
      currentRound: 1,
      totalRounds: room.max_rounds,
      myScore: 0,
      opponentScore: 0,
      myId,
      opponentId: isMyTurnToPropose ? room.guest_id ?? '' : room.host_id,
      opponentName: 'Oponente',
      opponentAvatar: null,
      status: isMyTurnToPropose ? 'proposer_choosing' : 'guesser_playing',
      roundState: null,
      disconnectedAt: null,
      disconnectedPlayerId: null,
    })
  }, [matchId, user, room, code, myId, firstProposerId, gameState, setGameState])

  // ─── Chat: recibir mensajes del otro jugador ──────────────────────────

  const handleIncomingChatMessage = useCallback(
    (msg: ChatMessage) => {
      chat.receiveMessage(msg)
      // Si el usuario está en la tab de juego → marcar como no leído
      if (activeTab === 'game') {
        setUnreadChat((n) => n + 1)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeTab]
  )

  // ─── Hook de gameState (lógica de letra/fin de ronda) ──────────────────
  // Un único canal Realtime vive aquí dentro — no hay segundo useRealtime

  const { guessLetter, sendEvent, handleRoundEnd } = useGameState({
    roomCode: code ?? '',
    onChatMessage: handleIncomingChatMessage,
    onLetterResult: (letter, correct) => {
      chat.addSystemMessage(
        correct ? `✅ La ${letter} está en la palabra` : `❌ La ${letter} no está`
      )
      if (activeTab === 'game') setUnreadChat((n) => n + 1)
    },
    // BUG 16 FIX: congelar el timer cuando el oponente activa time_freeze
    onTimeFreeze: () => {
      setTimeFrozen(true)
      setTimeout(() => setTimeFrozen(false), 30000)
    },
  })

  // ─── Chat hook ─────────────────────────────────────────────────────────

  const chat = useChat({
    userId: myId,
    userName: myName,
    sendEvent,
    welcomeMessage: roundState?.isProposer
      ? '¡Tú propones! Usa el teclado cuando el desafiado pida una letra.'
      : '¡Pide letras con el botón 🔡 o escribe aquí!',
  })

  // Limpiar badge al cambiar a tab chat
  useEffect(() => {
    if (activeTab === 'chat') setUnreadChat(0)
  }, [activeTab])

  // BUG 1 FIX: eliminado el segundo useRealtime — ahora hay un único canal
  // gestionado dentro de useGameState → useRealtime. Los eventos de chat y
  // letter_guessed se manejan a través de onChatMessage y del store compartido.

  // ─── Proponente envía la palabra ──────────────────────────────────────

  const handleProposerSubmit = async (formData: ProposerFormData) => {
    if (!gameState || !room || !user) return
    setProposerLoading(true)
    try {
      const round = await createRound({
        matchId: gameState.matchId,
        roundNumber: gameState.currentRound,
        proposerId: myId,
        guesserIdParam: gameState.opponentId,
        formData,
        maxErrors: room.max_errors,
        timerSeconds: room.timer_seconds,
      })

      const { data: rawCat } = await supabase
        .from('categories').select('name, emoji').eq('id', formData.categoryId).maybeSingle()
      const cat = rawCat as { name: string; emoji: string | null } | null

      roundWordRef.current = formData.word
      const structure = getWordStructure(formData.word)

      setRoundState({
        roundId: round.id,
        roundNumber: gameState.currentRound,
        isProposer: true,
        isGuesser: false,
        word: formData.word,
        wordLength: formData.word.replace(/\s/g, '').length,
        wordStructure: structure,
        hint: formData.hint || null,
        hintExtra: formData.hintExtra || null,
        category: cat?.name ?? 'Libre',
        categoryEmoji: cat?.emoji ?? '🎯',
        correctLetters: [],
        wrongLetters: [],
        maxErrors: room.max_errors,
        errorsCount: 0,
        powerupsAvailable: round.powerups_available as PowerupType[],
        powerupsUsed: [],
        shieldActive: false,
        timerSeconds: room.timer_seconds,
        timeLeft: room.timer_seconds,
        result: null,
        score: null,
        opponentReady: false,
      })

      // BUG 5 FIX: el proponente envía wordLength y wordStructure en el evento
      // para que el desafiado NO necesite leer word_encoded de la BD
      sendEvent('round_created', {
        roundId: round.id,
        roundNumber: gameState.currentRound,
        wordLength: formData.word.replace(/\s/g, '').length,
        wordStructure: structure,
        hint: formData.hint || null,
        categoryId: formData.categoryId,
        maxErrors: room.max_errors,
        timerSeconds: room.timer_seconds,
        powerupsAvailable: round.powerups_available,
      })
      chat.addSystemMessage('¡Ronda iniciada! El desafiado está esperando tu primer movimiento.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear ronda')
    } finally {
      setProposerLoading(false)
    }
  }

  // ─── Comodines — disponibles para AMBOS jugadores ─────────────────────

  const handleRevealLetter = (result: RevealLetterResult) => {
    addCorrectLetter(result.letter)
    sendEvent('powerup_used', { powerupType: 'reveal_letter', letter: result.letter })
    chat.notifyPowerup('reveal_letter', myName, POWERUP_LABELS.reveal_letter)
    chat.addSystemMessage(`✨ Se reveló la letra: ${result.letter}`)
  }
  const handleEliminateWrong = (result: EliminateWrongResult) => {
    setEliminatedLetters((p) => [...p, ...result.eliminatedLetters])
    sendEvent('powerup_used', { powerupType: 'eliminate_wrong' })
    chat.notifyPowerup('eliminate_wrong', myName, POWERUP_LABELS.eliminate_wrong)
  }
  const handleShowHint = (hint: string) => {
    setShownHintExtra(hint)
    chat.addSystemMessage(`💡 Pista extra: ${hint}`)
  }
  const handleActivateShield = () => {
    updateRoundState({ shieldActive: true })
    sendEvent('powerup_used', { powerupType: 'shield' })
    chat.notifyPowerup('shield', myName, POWERUP_LABELS.shield)
  }
  const handleShowStructure = (structure: number[]) => {
    setWordStructure(structure)
    sendEvent('powerup_used', { powerupType: 'show_structure' })
    chat.notifyPowerup('show_structure', myName, POWERUP_LABELS.show_structure)
  }
  const handleFreezeTime = () => {
    setTimeFrozen(true)
    setTimeout(() => setTimeFrozen(false), 30000)
    sendEvent('powerup_used', { powerupType: 'time_freeze' })
    chat.notifyPowerup('time_freeze', myName, POWERUP_LABELS.time_freeze)
  }

  // BUG 14 FIX: el proponente tiene la palabra real en roundState.word.
  // El desafiado tiene word=null — usePowerups solo se usa con la palabra real
  // (el proponente ejecuta reveal_letter y eliminate_wrong que la necesitan).
  // Para show_structure, el desafiado usa la estructura ya disponible en roundState.
  const { usePowerup } = usePowerups({
    roundId: roundState?.roundId ?? '',
    matchId: gameState?.matchId ?? '',
    userId: myId,
    wordEncoded: roundState?.word
      ? btoa(unescape(encodeURIComponent(roundState.word)))
      : roundWordRef.current
      ? btoa(unescape(encodeURIComponent(roundWordRef.current)))
      : '',
    correctLetters: roundState?.correctLetters ?? [],
    wrongLetters: roundState?.wrongLetters ?? [],
    powerupsUsed: roundState?.powerupsUsed ?? [],
    shieldActive: roundState?.shieldActive ?? false,
    onRevealLetter: handleRevealLetter,
    onEliminateWrong: handleEliminateWrong,
    onShowHint: handleShowHint,
    onActivateShield: handleActivateShield,
    // Para el desafiado, show_structure usa la estructura ya disponible en roundState
    onShowStructure: (structure) => handleShowStructure(
      roundState?.isGuesser ? (roundState.wordStructure ?? structure) : structure
    ),
    onFreezeTime: handleFreezeTime,
  })

  const handlePowerup = async (type: PowerupType) => {
    if (!roundState) return
    await usePowerup(type)
    updateRoundState({ powerupsUsed: [...(roundState.powerupsUsed ?? []), type] })
  }

  // Escudo: solo el proponente lo puede activar desde el PowerupBar
  const powerupsForProposer = roundState?.powerupsAvailable ?? []
  // BUG 14 FIX: el desafiado no tiene la palabra real, así que los comodines
  // que requieren conocerla (reveal_letter, eliminate_wrong) los ejecuta el
  // proponente. El desafiado solo puede activar los que no dependen de la palabra.
  const GUESSER_POWERUPS: PowerupType[] = ['extra_hint', 'show_structure', 'time_freeze']
  const powerupsForGuesser = (roundState?.powerupsAvailable ?? []).filter(
    (p) => GUESSER_POWERUPS.includes(p)
  )

  const handleTimeUp = useCallback(async () => {
    if (!roundState || !gameState) return
    // BUG 3 FIX: solo el PROPONENTE finaliza la ronda por timeout.
    // El desafiado simplemente espera el evento 'round_ended' via Realtime.
    if (!roundState.isProposer) return
    toast.error('¡Se acabó el tiempo!')
    // Delegar en handleRoundEnd para calcular puntos correctamente y emitir
    // el payload { result, guesserScore, proposerScore } al desafiado.
    const word = roundState.word ?? roundWordRef.current
    await handleRoundEnd('timeout', roundState.timerSeconds ?? 60, word)
  }, [roundState, gameState, handleRoundEnd])

  // ─── Guard de carga ────────────────────────────────────────────────────

  if (!gameState) {
    return (
      // BUG 17 FIX: mostrar opción de escape si no hay estado (recarga de página)
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-text-muted text-sm">Cargando partida...</p>
        <button
          onClick={() => navigate('/home')}
          className="text-xs text-text-subtle underline mt-2"
        >
          Volver al inicio si tarda demasiado
        </button>
      </div>
    )
  }

  const isProposerChoosing = !roundState
  const isPlaying = !!roundState && !roundState.result

  // ─── DISCONNECT OVERLAY ────────────────────────────────────────────────

  const isDisconnected = !!gameState.disconnectedAt
  const isPaused = gameState.status === 'paused'
  const isAbandoned = gameState.status === 'abandoned'
  const showDisconnectOverlay = isDisconnected || isPaused || isAbandoned

  // ─── RENDER ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-dvh flex flex-col bg-gradient-game">
      {/* Overlay de desconexión */}
      {showDisconnectOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 text-center px-6 max-w-sm">
            {isAbandoned ? (
              <>
                <span className="text-5xl">💔</span>
                <h2 className="text-xl font-bold text-accent">Partida abandonada</h2>
                <p className="text-text-muted text-sm">
                  Tu oponente no se reconectó a tiempo
                </p>
                <button
                  onClick={() => navigate('/home')}
                  className="mt-2 px-6 py-2.5 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl transition-colors"
                >
                  Volver al inicio
                </button>
              </>
            ) : isPaused ? (
              <>
                <span className="text-5xl animate-pulse">⏸️</span>
                <h2 className="text-xl font-bold text-warning">Partida pausada</h2>
                <p className="text-text-muted text-sm">
                  Esperando a que tu oponente se reconecte...
                </p>
                <div className="w-6 h-6 border-2 border-warning border-t-transparent rounded-full animate-spin mt-2" />
              </>
            ) : (
              <>
                <span className="text-5xl">📡</span>
                <h2 className="text-xl font-bold text-text">Oponente desconectado</h2>
                <p className="text-text-muted text-sm">
                  La partida se pausará automáticamente en unos segundos...
                </p>
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mt-2" />
              </>
            )}
          </div>
        </div>
      )}

      {/* Marcador */}
      <div className="px-4 pt-3 pb-2 shrink-0">
        <ScoreBoard
          myName={myName}
          opponentName={gameState.opponentName}
          myScore={gameState.myScore}
          opponentScore={gameState.opponentScore}
          currentRound={gameState.currentRound}
          totalRounds={gameState.totalRounds}
        />
      </div>

      {/* Formulario del proponente / espera del desafiado */}
      {isProposerChoosing && (
        <div className="flex-1 overflow-y-auto px-4 py-4 max-w-lg mx-auto w-full">
          <motion.div variants={slideUp} initial="hidden" animate="visible">
            {gameState.status === 'guesser_playing' ? (
              // BUG 18 FIX: el desafiado ve feedback mientras el proponente elige
              <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                <div className="text-5xl animate-pulse">🤔</div>
                <h2 className="text-xl font-bold text-text">
                  {gameState.opponentName} está eligiendo la palabra...
                </h2>
                <p className="text-text-muted text-sm">Prepárate para adivinar</p>
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mt-2" />
              </div>
            ) : (
              <ProposerForm
                onSubmit={handleProposerSubmit}
                maxPowerups={room?.initial_powerups ?? 3}
                loading={proposerLoading}
                gameMode={room?.mode}
                duoId={room?.duo_id ?? null}
              />
            )}
          </motion.div>
        </div>
      )}

      {/* Juego activo — layout con chat */}
      {isPlaying && roundState && (
        <>
          {/* ── MOBILE: tabs ── */}
          <div className="lg:hidden flex shrink-0">
            <TabButton
              active={activeTab === 'game'}
              onClick={() => setActiveTab('game')}
              label="🎮 Tablero"
            />
            <TabButton
              active={activeTab === 'chat'}
              onClick={() => { setActiveTab('chat'); setUnreadChat(0) }}
              label={`💬 Chat${unreadChat > 0 ? ` (${unreadChat})` : ''}`}
              badge={unreadChat}
            />
          </div>

          <div className="flex-1 flex min-h-0 overflow-hidden">
            {/* ── PANEL IZQUIERDO: tablero + teclado ── */}
            <div className={cn(
              'flex flex-col min-h-0 overflow-y-auto',
              // Mobile: ocupa todo si tab activa, hidden si chat
              activeTab === 'game' ? 'flex' : 'hidden',
              'lg:flex lg:flex-1 lg:border-r lg:border-border',
            )}>
              <GameBoard
                roundState={roundState}
                eliminatedLetters={eliminatedLetters}
                shownHintExtra={shownHintExtra}
                wordStructure={wordStructure}
                timeFrozen={timeFrozen}
                onTimeUp={handleTimeUp}
                onGuessLetter={guessLetter}        // Solo el proponente puede usarlo
                onUsePowerup={handlePowerup}
                powerupsForProposer={powerupsForProposer}
                powerupsForGuesser={powerupsForGuesser}
              />
            </div>

            {/* ── PANEL DERECHO: chat ── */}
            <div className={cn(
              'flex flex-col min-h-0',
              activeTab === 'chat' ? 'flex flex-1' : 'hidden',
              'lg:flex lg:w-80 xl:w-96 shrink-0',
            )}>
              <div className="px-3 py-2 border-b border-border shrink-0">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Chat de la partida
                </p>
                <p className="text-[10px] text-text-subtle mt-0.5">
                  {roundState.isGuesser
                    ? 'Pide letras con 🔡 o escribe libremente'
                    : 'Espera que el desafiado pida letras, luego úsalas en el teclado'}
                </p>
              </div>
              <div className="flex-1 min-h-0">
                <ChatPanel
                  messages={chat.messages}
                  myId={myId}
                  myName={myName}
                  isGuesser={roundState.isGuesser}
                  usedLetters={[...roundState.correctLetters, ...roundState.wrongLetters]}
                  bottomRef={chat.bottomRef}
                  onSendText={chat.sendText}
                  onRequestLetter={chat.requestLetter}
                  disabled={!!roundState.result}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Sub-componente: tablero de juego ──────────────────────────────────────────

interface GameBoardProps {
  roundState: NonNullable<import('@/types/game').RoundState>
  eliminatedLetters: string[]
  shownHintExtra: string | null
  wordStructure: number[] | null
  timeFrozen: boolean
  onTimeUp: () => void
  onGuessLetter: (letter: string) => void
  onUsePowerup: (type: PowerupType) => void
  powerupsForProposer: PowerupType[]
  powerupsForGuesser: PowerupType[]
}

function GameBoard({
  roundState,
  eliminatedLetters,
  shownHintExtra,
  wordStructure,
  timeFrozen,
  onTimeUp,
  onGuessLetter,
  onUsePowerup,
  powerupsForProposer,
  powerupsForGuesser,
}: GameBoardProps) {
  return (
    <motion.div
      variants={fadeIn}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-4 px-4 py-4 max-w-lg mx-auto w-full"
    >
      {/* Categoría y pista */}
      <div className="flex flex-wrap items-center gap-2 justify-center">
        <span className="text-xs bg-bg-surface2 border border-border px-3 py-1 rounded-full text-text-muted">
          {roundState.categoryEmoji} {roundState.category}
        </span>
        {roundState.hint && (
          <span className="text-xs bg-warning/10 border border-warning/30 text-warning px-3 py-1 rounded-full">
            💡 {roundState.hint}
          </span>
        )}
        {/* Badge de rol */}
        <span className={cn(
          'text-xs px-2 py-0.5 rounded-full border font-medium',
          roundState.isProposer
            ? 'bg-primary/10 border-primary/30 text-primary-light'
            : 'bg-success/10 border-success/30 text-success'
        )}>
          {roundState.isProposer ? '🎯 Tú propones' : '🔍 Tú adivinas'}
        </span>
      </div>

      {/* Timer */}
      {roundState.timerSeconds && (
        <div className="flex justify-center">
          <GameTimer
            totalSeconds={roundState.timerSeconds}
            frozen={timeFrozen}
            onTimeUp={onTimeUp}
            active={true}
          />
        </div>
      )}

      {/* Ahorcado */}
      <HangmanSVG errors={roundState.errorsCount} maxErrors={roundState.maxErrors} />

      {/* Palabra */}
      <WordDisplay
        word={roundState.word ?? '_'.repeat(roundState.wordLength)}
        wordLength={roundState.wordLength}
        correctLetters={roundState.correctLetters}
      />

      {/* Estructura de frase */}
      {wordStructure && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="text-center text-xs text-primary-light"
        >
          {wordStructure.map((n, i) => (
            <span key={i}>{n}{i < wordStructure.length - 1 ? ' · ' : ''} </span>
          ))} letras por palabra
        </motion.div>
      )}

      {/* Pista extra */}
      {shownHintExtra && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="text-center text-sm bg-primary/10 border border-primary/30 rounded-xl p-3"
        >
          <span className="text-primary-light">💡 Pista extra: </span>
          <span className="text-text">{shownHintExtra}</span>
        </motion.div>
      )}

      {/* Contador de errores */}
      <div className="flex items-center justify-between text-sm px-1">
        <span className="text-text-muted">
          Errores: <span className="text-accent font-bold">{roundState.errorsCount}</span>
          <span className="text-text-subtle">/{roundState.maxErrors}</span>
        </span>
        {roundState.shieldActive && (
          <span className="text-xs bg-success/20 border border-success/30 text-success px-2 py-0.5 rounded-full animate-pulse">
            🛡️ Escudo activo
          </span>
        )}
        <span className="text-text-subtle text-xs">
          Ronda {roundState.roundNumber}
        </span>
      </div>

      {/* PROPONENTE: sus comodines (incluye escudo) + teclado activo */}
      {roundState.isProposer && (
        <>
          <PowerupBar
            available={powerupsForProposer}
            used={roundState.powerupsUsed}
            shieldActive={roundState.shieldActive}
            onUse={onUsePowerup}
          />
          <div className="mt-1">
            <p className="text-xs text-center text-text-subtle mb-2">
              Usa el teclado para ingresar la letra que pida el desafiado
            </p>
            <Keyboard
              correctLetters={roundState.correctLetters}
              wrongLetters={roundState.wrongLetters}
              eliminatedLetters={eliminatedLetters}
              onLetterPress={onGuessLetter}
              disabled={false}
            />
          </div>
        </>
      )}

      {/* DESAFIADO: sus comodines (sin escudo) + teclado visual (deshabilitado) */}
      {roundState.isGuesser && (
        <>
          <PowerupBar
            available={powerupsForGuesser}
            used={roundState.powerupsUsed.filter((p) => p !== 'shield')}
            shieldActive={false}
            onUse={onUsePowerup}
          />
          <div className="mt-1">
            <p className="text-xs text-center text-text-subtle mb-2">
              Pide letras por el chat 💬 — el proponente las ingresa
            </p>
            <Keyboard
              correctLetters={roundState.correctLetters}
              wrongLetters={roundState.wrongLetters}
              eliminatedLetters={eliminatedLetters}
              onLetterPress={() => {/* no-op para el desafiado */}}
              disabled={true}
            />
          </div>
        </>
      )}
    </motion.div>
  )
}

// ─── Tab button móvil ──────────────────────────────────────────────────────────

function TabButton({
  active, onClick, label, badge,
}: {
  active: boolean
  onClick: () => void
  label: string
  badge?: number
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 py-2.5 text-sm font-semibold border-b-2 transition-all relative',
        active
          ? 'border-primary text-primary-light bg-primary/5'
          : 'border-border text-text-muted hover:text-text'
      )}
    >
      {label}
      {badge && badge > 0 && (
        <span className="absolute top-1.5 right-1/4 w-4 h-4 bg-accent rounded-full text-[10px] text-white flex items-center justify-center">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  )
}
