/**
 * DemoGamePage — versión interactiva sin Supabase.
 *
 * Mecánica:
 * - El usuario juega como PROPONENTE: conoce la palabra, controla el teclado.
 * - Hay un "CPU desafiado" simulado que pide letras aleatoriamente por chat.
 * - El usuario puede chatear y usar comodines.
 * - El usuario también puede ver cómo se vería la pantalla del desafiado.
 */
import { useState, useCallback, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import HangmanSVG from '@/features/game/components/HangmanSVG'
import WordDisplay from '@/features/game/components/WordDisplay'
import Keyboard from '@/features/game/components/Keyboard'
import PowerupBar from '@/features/game/components/PowerupBar'
import ScoreBoard from '@/features/game/components/ScoreBoard'
import ChatPanel from '@/features/game/components/ChatPanel'
import type { PowerupType } from '@/types'
import type { ChatMessage } from '@/types/game'
import {
  normalizeWord,
  isWordComplete,
  getUniqueLettersToGuess,
  getWrongCandidateLetters,
  decodeWord,
  encodeWord,
} from '@/utils/wordNormalizer'
import { calculateRoundScore } from '@/utils/scoreCalculator'
import { PROPOSER_WIN_BASE, PROPOSER_WIN_PER_ERROR } from '@/utils/constants'
import { slideUp, roundEndCard } from '@/animations/variants'
import { cn } from '@/utils/cn'
import toast from 'react-hot-toast'

const DEMO_WORDS = [
  { word: 'Interstellar',            hint: 'Película de Christopher Nolan',  category: '🎬 Películas' },
  { word: 'murciélago',              hint: 'Tiene todas las vocales',          category: '🐾 Animales' },
  { word: 'El señor de los anillos', hint: 'Trilogía épica de fantasía',      category: '🎬 Películas' },
  { word: 'Tetris',                  hint: 'Videojuego clásico de bloques',   category: '🎮 Videojuegos' },
  { word: 'Buenos Aires',            hint: 'Capital sudamericana',            category: '🌍 Lugares' },
  { word: 'hipopótamo',              hint: 'Animal africano semiacuático',    category: '🐾 Animales' },
]

const POWERUPS: PowerupType[] = ['reveal_letter', 'extra_hint', 'shield', 'eliminate_wrong', 'show_structure']
const MAX_ERRORS = 6

// Frases que la CPU-desafiada usa al pedir letras
const CPU_PHRASES = [
  '¿Me das la',
  'Dame la',
  'Prueba la',
  'Quiero la',
  '¿Estará la',
]

type GamePhase = 'proposer' | 'playing' | 'won' | 'lost'
type ActiveTab = 'game' | 'chat'

interface DemoState {
  phase: GamePhase
  word: string
  hint: string
  category: string
  correctLetters: string[]
  wrongLetters: string[]
  eliminatedLetters: string[]
  powerupsUsed: PowerupType[]
  shieldActive: boolean
  hintExtraRevealed: string | null
  structureRevealed: number[] | null
  score: number
  round: number
  myTotalScore: number
  opponentScore: number
  wordIndex: number
}

function makeInitialState(wordIndex: number, round: number, myTotal: number, opp: number): DemoState {
  const w = DEMO_WORDS[wordIndex % DEMO_WORDS.length]
  return {
    phase: 'proposer', word: w.word, hint: w.hint, category: w.category,
    correctLetters: [], wrongLetters: [], eliminatedLetters: [],
    powerupsUsed: [], shieldActive: false,
    hintExtraRevealed: null, structureRevealed: null,
    score: 0, round, myTotalScore: myTotal, opponentScore: opp, wordIndex,
  }
}

export default function DemoGamePage() {
  const [state, setState] = useState<DemoState>(() => makeInitialState(0, 1, 0, 0))
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'sys-0', senderId: 'system', senderName: 'Cuellito', text: '¡Hola! Soy tu desafiado (CPU). Pídeme las letras una a una usando el teclado 🎯', timestamp: new Date().toISOString(), type: 'system' },
  ])
  const [activeTab, setActiveTab] = useState<ActiveTab>('game')
  const [unreadChat, setUnreadChat] = useState(0)
  const startTime = useRef(Date.now())
  const cpuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  // Auto-scroll chat
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => { if (activeTab === 'chat') setUnreadChat(0) }, [activeTab])

  const addMsg = useCallback((msg: ChatMessage) => {
    setMessages((p) => [...p, msg])
    if (activeTab === 'game') setUnreadChat((n) => n + 1)
  }, [activeTab])

  const addSystemMsg = useCallback((text: string) => {
    addMsg({ id: `sys-${Date.now()}`, senderId: 'system', senderName: 'Cuellito', text, timestamp: new Date().toISOString(), type: 'system' })
  }, [addMsg])

  // CPU pide una letra aleatoria tras un delay
  const cpuRequestLetter = useCallback((word: string, usedLetters: string[]) => {
    if (cpuTimerRef.current) clearTimeout(cpuTimerRef.current)
    const allLetters = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('')
    const available = allLetters.filter((l) => !usedLetters.includes(l))
    if (available.length === 0) return
    const delay = 1500 + Math.random() * 2000
    cpuTimerRef.current = setTimeout(() => {
      const letter = available[Math.floor(Math.random() * available.length)]
      const phrase = CPU_PHRASES[Math.floor(Math.random() * CPU_PHRASES.length)]
      addMsg({
        id: `cpu-${Date.now()}`,
        senderId: 'cpu',
        senderName: 'Desafiado (CPU)',
        text: `${phrase} ${letter}?`,
        timestamp: new Date().toISOString(),
        type: 'letter_request',
        meta: { letter },
      })
      void word
    }, delay)
  }, [addMsg])

  // Arrancar CPU al iniciar la fase playing
  useEffect(() => {
    if (state.phase === 'playing') {
      const used = [...state.correctLetters, ...state.wrongLetters]
      cpuRequestLetter(state.word, used)
    }
    return () => { if (cpuTimerRef.current) clearTimeout(cpuTimerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase])

  // ─── Iniciar ronda ──────────────────────────────────────────────────────
  const handleStartPlaying = () => {
    startTime.current = Date.now()
    setState((s) => ({ ...s, phase: 'playing' }))
    addSystemMsg('¡Ronda iniciada! Espera que el desafiado pida letras.')
  }

  // ─── Proponente ingresa una letra (en respuesta al CPU) ─────────────────
  const handleProposerKey = useCallback((letter: string) => {
    setState((s) => {
      if (s.phase !== 'playing') return s
      if (s.correctLetters.includes(letter) || s.wrongLetters.includes(letter)) return s

      const wordNorm = normalizeWord(s.word)
      const isCorrect = wordNorm.includes(letter)
      const isShieldUsed = s.shieldActive && !isCorrect

      const newCorrect = isCorrect ? [...s.correctLetters, letter] : s.correctLetters
      const newWrong = !isCorrect ? [...s.wrongLetters, letter] : s.wrongLetters
      const newErrors = !isCorrect && !isShieldUsed ? newWrong.length : s.wrongLetters.length

      // Notificar en chat
      setTimeout(() => {
        addSystemMsg(isCorrect ? `✅ La ${letter} está en la palabra` : `❌ La ${letter} no está`)
      }, 100)

      const won = isWordComplete(s.word, newCorrect)
      const lost = newErrors >= MAX_ERRORS

      if (won || lost) {
        const seconds = Math.floor((Date.now() - startTime.current) / 1000)
        // won = desafiado adivinó → desafiado gana, proponente pierde (score=0)
        // lost = desafiado no adivinó → proponente gana → proponente recibe bonus
        const guesserWon = won
        const score = guesserWon
          ? 0  // proponente no gana puntos cuando el desafiado adivina
          : PROPOSER_WIN_BASE + newWrong.length * PROPOSER_WIN_PER_ERROR  // proponente gana al defender
        const cpuScore = guesserWon
          ? calculateRoundScore({ won: true, secondsTaken: seconds, correctLetters: newCorrect.length, wrongLetters: newWrong.length, powerupsUsed: s.powerupsUsed.length, timerSeconds: null })
          : 0
        setTimeout(() => addSystemMsg(
          guesserWon
            ? '😮 ¡El desafiado adivinó tu palabra! Ellos suman puntos.'
            : '🏆 ¡El desafiado no pudo! Tú sumas puntos como desafiante.'
        ), 300)
        return {
          ...s,
          correctLetters: newCorrect,
          wrongLetters: newWrong,
          shieldActive: isShieldUsed ? false : s.shieldActive,
          phase: guesserWon ? 'won' : 'lost',
          score,
          // El score del oponente (CPU desafiado) se acumula aparte
          opponentScore: s.opponentScore + cpuScore,
        }
      }

      // CPU pide otra letra
      setTimeout(() => cpuRequestLetter(s.word, [...newCorrect, ...newWrong]), 500)

      return { ...s, correctLetters: newCorrect, wrongLetters: newWrong, shieldActive: isShieldUsed ? false : s.shieldActive }
    })
  }, [addSystemMsg, cpuRequestLetter])

  // ─── Comodines ──────────────────────────────────────────────────────────
  const usePowerupDemo = useCallback((type: PowerupType) => {
    setState((s) => {
      if (s.powerupsUsed.includes(type)) { toast.error('Ya usaste ese comodín'); return s }
      let patch: Partial<DemoState> = { powerupsUsed: [...s.powerupsUsed, type] }
      switch (type) {
        case 'reveal_letter': {
          const remaining = getUniqueLettersToGuess(s.word).filter((l) => !s.correctLetters.includes(l))
          if (!remaining.length) { toast('No quedan letras', { icon: '🤷' }); return s }
          const letter = remaining[Math.floor(Math.random() * remaining.length)]
          const newCorrect = [...s.correctLetters, letter]
          patch = { ...patch, correctLetters: newCorrect, phase: isWordComplete(s.word, newCorrect) ? 'won' : s.phase }
          toast.success(`Letra revelada: ${letter}`, { icon: '✨' })
          setTimeout(() => addSystemMsg(`✨ Se activó "Revelar letra" — aparece la ${letter}`), 100)
          break
        }
        case 'eliminate_wrong': {
          const elim = getWrongCandidateLetters(s.word, [...s.correctLetters, ...s.wrongLetters], 3)
          patch = { ...patch, eliminatedLetters: [...s.eliminatedLetters, ...elim] }
          toast.success('3 letras eliminadas del teclado', { icon: '🗑️' })
          setTimeout(() => addSystemMsg('🗑️ Se activó "Eliminar letras"'), 100)
          break
        }
        case 'shield': {
          patch = { ...patch, shieldActive: true }
          toast.success('Escudo activado', { icon: '🛡️' })
          setTimeout(() => addSystemMsg('🛡️ Escudo activo — el próximo error no cuenta'), 100)
          break
        }
        case 'extra_hint': {
          patch = { ...patch, hintExtraRevealed: 'Protagonizada por un actor muy conocido' }
          toast.success('Pista extra revelada', { icon: '💡' })
          setTimeout(() => addSystemMsg('💡 Se activó "Pista extra"'), 100)
          break
        }
        case 'show_structure': {
          patch = { ...patch, structureRevealed: s.word.split(' ').map((t) => t.length) }
          toast.success('Estructura revelada', { icon: '🔤' })
          setTimeout(() => addSystemMsg('🔤 Se activó "Ver estructura"'), 100)
          break
        }
      }
      return { ...s, ...patch }
    })
  }, [addSystemMsg])

  // ─── Siguiente ronda / reset ─────────────────────────────────────────────
  const nextRound = () => {
    setState((s) => makeInitialState(s.wordIndex + 1, s.round + 1, s.myTotalScore + s.score, s.opponentScore + Math.floor(Math.random() * 80 + 40)))
    setMessages([{ id: `sys-nr-${Date.now()}`, senderId: 'system', senderName: 'Cuellito', text: '¡Nueva ronda! Espera que el desafiado pida letras.', timestamp: new Date().toISOString(), type: 'system' }])
    startTime.current = Date.now()
    setActiveTab('game')
  }
  const resetGame = () => {
    setState(makeInitialState(Math.floor(Math.random() * DEMO_WORDS.length), 1, 0, 0))
    setMessages([{ id: `sys-rst-${Date.now()}`, senderId: 'system', senderName: 'Cuellito', text: '¡Nueva partida! Presiona "Iniciar" para comenzar.', timestamp: new Date().toISOString(), type: 'system' }])
    setActiveTab('game')
  }

  const handleSendChat = (text: string) => {
    const msg: ChatMessage = { id: `me-${Date.now()}`, senderId: 'me', senderName: 'Tú', text, timestamp: new Date().toISOString(), type: 'text' }
    setMessages((p) => [...p, msg])
    // CPU responde brevemente
    setTimeout(() => {
      const replies = ['Hmm 🤔', '¡Interesante!', '¿Estás seguro?', 'Dale entonces...', '👀']
      addMsg({ id: `cpu-r-${Date.now()}`, senderId: 'cpu', senderName: 'Desafiado (CPU)', text: replies[Math.floor(Math.random() * replies.length)], timestamp: new Date().toISOString(), type: 'text' })
    }, 800 + Math.random() * 1200)
  }

  const w = DEMO_WORDS[state.wordIndex % DEMO_WORDS.length]
  const isPlaying = state.phase === 'playing'
  const isFinished = state.phase === 'won' || state.phase === 'lost'

  return (
    <div className="min-h-dvh flex flex-col bg-gradient-game">
      {/* Header */}
      <div className="px-4 pt-3 flex items-center justify-between shrink-0">
        <Link to="/home" className="text-text-muted text-sm hover:text-text transition-colors">← Inicio</Link>
        <span className="text-xs bg-warning/20 text-warning border border-warning/30 px-2 py-0.5 rounded-full">DEMO</span>
        <button onClick={resetGame} className="text-text-muted text-sm hover:text-text transition-colors">↺</button>
      </div>

      {/* Marcador */}
      <div className="px-4 py-2 shrink-0">
        <ScoreBoard myName="Tú (Proponente)" opponentName="Desafiado CPU" myScore={state.myTotalScore} opponentScore={state.opponentScore} currentRound={state.round} totalRounds={4} />
      </div>

      {/* Formulario inicial */}
      {state.phase === 'proposer' && (
        <div className="flex-1 overflow-y-auto px-4 py-4 max-w-lg mx-auto w-full">
          <motion.div variants={slideUp} initial="hidden" animate="visible" className="glass-strong rounded-2xl p-6 flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-bold text-text">Tú propones la palabra</h2>
              <p className="text-sm text-text-muted mt-1">En el demo, la palabra ya está elegida. Tú controlas el teclado.</p>
            </div>
            <div className="bg-bg-surface rounded-xl p-4">
              <p className="text-xs text-text-subtle mb-1">{state.category}</p>
              <p className="text-2xl font-bold text-text">{state.word}</p>
              <p className="text-sm text-text-muted mt-1">💡 {state.hint}</p>
            </div>
            <div className="text-xs text-text-subtle bg-bg-surface2 rounded-xl p-3">
              <p className="font-medium text-text-muted mb-1">¿Cómo funciona?</p>
              <ul className="space-y-0.5">
                <li>• El desafiado (CPU) pedirá letras por chat</li>
                <li>• Tú usas el teclado para ingresarlas</li>
                <li>• Ambos ven el resultado en tiempo real</li>
                <li>• Cualquiera puede activar comodines</li>
              </ul>
            </div>
            <button onClick={handleStartPlaying} className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-3.5 rounded-xl transition-all glow-primary">
              ¡Empezar ronda! →
            </button>
          </motion.div>
        </div>
      )}

      {/* Juego / Fin */}
      {(isPlaying || isFinished) && (
        <>
          {/* Tabs móvil */}
          {!isFinished && (
            <div className="lg:hidden flex shrink-0">
              {(['game', 'chat'] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={cn('flex-1 py-2.5 text-sm font-semibold border-b-2 transition-all relative',
                    activeTab === tab ? 'border-primary text-primary-light bg-primary/5' : 'border-border text-text-muted'
                  )}
                >
                  {tab === 'game' ? '🎮 Tablero' : `💬 Chat${unreadChat > 0 ? ` (${unreadChat})` : ''}`}
                  {tab === 'chat' && unreadChat > 0 && (
                    <span className="absolute top-1.5 right-1/4 w-4 h-4 bg-accent rounded-full text-[10px] text-white flex items-center justify-center">{unreadChat > 9 ? '9+' : unreadChat}</span>
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="flex-1 flex min-h-0 overflow-hidden">
            {/* Panel izquierdo: tablero */}
            <div className={cn('flex flex-col min-h-0 overflow-y-auto', isFinished ? 'flex flex-1' : (activeTab === 'game' ? 'flex' : 'hidden'), 'lg:flex lg:flex-1 lg:border-r lg:border-border')}>
              <div className="flex flex-col gap-4 px-4 py-4 max-w-lg mx-auto w-full">
                {/* Badges */}
                <div className="flex flex-wrap gap-2 justify-center">
                  <span className="text-xs bg-bg-surface2 border border-border px-3 py-1 rounded-full text-text-muted">{w.category}</span>
                  <span className="text-xs bg-warning/10 border border-warning/30 text-warning px-3 py-1 rounded-full">💡 {state.hint}</span>
                  <span className="text-xs bg-primary/10 border border-primary/30 text-primary-light px-2 py-0.5 rounded-full">🎯 Tú propones</span>
                </div>

                {/* Ahorcado */}
                <HangmanSVG errors={state.wrongLetters.length} maxErrors={MAX_ERRORS} />

                {/* Palabra */}
                <WordDisplay word={state.word} wordLength={state.word.replace(/\s/g, '').length} correctLetters={state.correctLetters} result={isFinished ? (state.phase === 'won' ? 'won' : 'lost') : null} />

                {/* Estructura */}
                {state.structureRevealed && (
                  <p className="text-center text-xs text-primary-light">
                    {state.structureRevealed.map((n, i) => <span key={i}>{n}{i < state.structureRevealed!.length - 1 ? ' · ' : ''}</span>)} letras
                  </p>
                )}

                {/* Pista extra */}
                {state.hintExtraRevealed && (
                  <div className="text-center text-sm bg-primary/10 border border-primary/30 rounded-xl p-3">
                    <span className="text-primary-light">💡 </span><span className="text-text">{state.hintExtraRevealed}</span>
                  </div>
                )}

                {/* Errores + escudo */}
                <div className="flex items-center justify-between text-sm px-1">
                  <span className="text-text-muted">Errores: <span className="text-accent font-bold">{state.wrongLetters.length}</span><span className="text-text-subtle">/{MAX_ERRORS}</span></span>
                  {state.shieldActive && <span className="text-xs bg-success/20 border border-success/30 text-success px-2 py-0.5 rounded-full animate-pulse">🛡️ Escudo</span>}
                </div>

                {/* Comodines del proponente (todos, incluye escudo) */}
                {!isFinished && (
                  <PowerupBar available={POWERUPS} used={state.powerupsUsed} shieldActive={state.shieldActive} onUse={usePowerupDemo} />
                )}

                {/* Teclado — proponente lo controla */}
                {!isFinished && (
                  <>
                    <p className="text-xs text-center text-text-subtle">Usa el teclado cuando el desafiado pida una letra</p>
                    <Keyboard correctLetters={state.correctLetters} wrongLetters={state.wrongLetters} eliminatedLetters={state.eliminatedLetters} onLetterPress={handleProposerKey} disabled={false} />
                  </>
                )}

                {/* Resultado final — desde perspectiva del DESAFIANTE */}
                {isFinished && (() => {
                  // state.phase === 'won'  → el desafiado (CPU) adivinó → desafiante PIERDE
                  // state.phase === 'lost' → el desafiado (CPU) falló  → desafiante GANA
                  const guesserWon   = state.phase === 'won'
                  const proposerWon  = state.phase === 'lost'

                  const emoji    = proposerWon ? '🏆' : '😮'
                  const title    = proposerWon ? '¡Ganaste esta ronda!' : '¡Te la adivinaron!'
                  const subtitle = proposerWon
                    ? `El desafiado no pudo adivinar "${state.word}" — ¡gran palabra!`
                    : `El desafiado descubrió "${state.word}"`
                  const titleColor = proposerWon ? 'text-success' : 'text-accent'

                  return (
                    <motion.div variants={roundEndCard} initial="hidden" animate="visible" className="flex flex-col gap-4">
                      {/* Header resultado */}
                      <div className="text-center">
                        <div className="text-6xl mb-2">{emoji}</div>
                        <h2 className={`text-2xl font-black ${titleColor}`}>{title}</h2>
                        <p className="text-text-muted text-sm mt-1 max-w-xs mx-auto">{subtitle}</p>
                        <span className="inline-block mt-2 text-xs bg-primary/10 border border-primary/30 text-primary-light px-2 py-0.5 rounded-full">
                          🎯 Tú eras el desafiante
                        </span>
                      </div>

                      {/* Puntos ganados */}
                      <div className={cn(
                        'text-center rounded-xl py-4 border',
                        proposerWon ? 'bg-success/10 border-success/30' : 'bg-bg-surface border-border'
                      )}>
                        <p className="text-xs text-text-subtle mb-1">
                          {proposerWon ? '¡Tus puntos esta ronda!' : 'Tus puntos esta ronda'}
                        </p>
                        <p className={`text-4xl font-black tabular-nums ${proposerWon ? 'text-success' : 'text-text-muted'}`}>
                          +{state.score}
                        </p>
                        {!proposerWon && (
                          <p className="text-xs text-text-subtle mt-1">El desafiado suma puntos por adivinar</p>
                        )}
                      </div>

                      {/* Stats de ronda */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-bg-surface rounded-xl p-3 text-center">
                          <p className="text-xl font-bold text-text">{state.wrongLetters.length}</p>
                          <p className="text-xs text-text-muted">Errores</p>
                        </div>
                        <div className="bg-bg-surface rounded-xl p-3 text-center">
                          <p className="text-xl font-bold text-text">{state.correctLetters.length}</p>
                          <p className="text-xs text-text-muted">Letras</p>
                        </div>
                        <div className="bg-bg-surface rounded-xl p-3 text-center">
                          <p className="text-xl font-bold text-text">{state.powerupsUsed.length}</p>
                          <p className="text-xs text-text-muted">Comodines</p>
                        </div>
                      </div>

                      {/* Marcador */}
                      <div className="glass rounded-xl px-4 py-3 flex items-center justify-between">
                        <div className="text-center">
                          <p className="text-xs text-text-subtle">Tú (desafiante)</p>
                          <p className={`text-2xl font-black tabular-nums ${proposerWon ? 'text-success' : 'text-text'}`}>
                            {state.myTotalScore + state.score}
                          </p>
                        </div>
                        <span className="text-text-subtle">vs</span>
                        <div className="text-center">
                          <p className="text-xs text-text-subtle">Desafiado (CPU)</p>
                          <p className={`text-2xl font-black tabular-nums ${guesserWon ? 'text-success' : 'text-text'}`}>
                            {state.opponentScore}
                          </p>
                        </div>
                      </div>

                      {/* Acciones */}
                      <div className="flex flex-col gap-2">
                        {state.round < 4
                          ? <button onClick={nextRound} className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-3 rounded-xl transition-all">Siguiente ronda →</button>
                          : <div className="text-center glass rounded-xl p-4">
                              <p className="font-bold text-text text-lg">¡Partida terminada!</p>
                              <p className="text-sm text-text-muted mt-1">
                                {state.myTotalScore + state.score > state.opponentScore
                                  ? '🏆 Ganaste la partida como desafiante'
                                  : state.myTotalScore + state.score < state.opponentScore
                                  ? '😮 El desafiado ganó la partida'
                                  : '🤝 Empate'}
                              </p>
                            </div>
                        }
                        <button onClick={resetGame} className="w-full bg-bg-surface border border-border text-text-muted font-medium py-2.5 rounded-xl hover:border-border-light transition-all">
                          ↺ Nueva partida
                        </button>
                      </div>
                    </motion.div>
                  )
                })()}
              </div>
            </div>

            {/* Panel derecho: chat */}
            {!isFinished && (
              <div className={cn('flex flex-col min-h-0', activeTab === 'chat' ? 'flex flex-1' : 'hidden', 'lg:flex lg:w-80 xl:w-96 shrink-0')}>
                <div className="px-3 py-2 border-b border-border shrink-0">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Chat de partida</p>
                  <p className="text-[10px] text-text-subtle mt-0.5">El desafiado (CPU) pedirá letras aquí</p>
                </div>
                <div className="flex-1 min-h-0">
                  <ChatPanel
                    messages={messages}
                    myId="me"
                    myName="Tú"
                    isGuesser={false}
                    usedLetters={[...state.correctLetters, ...state.wrongLetters]}
                    bottomRef={bottomRef as React.RefObject<HTMLDivElement>}
                    onSendText={handleSendChat}
                    onRequestLetter={() => {}}
                    disabled={isFinished}
                  />
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

void decodeWord
void encodeWord
