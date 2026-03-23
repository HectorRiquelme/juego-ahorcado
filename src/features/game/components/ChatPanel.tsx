import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ChatMessage } from '@/types/game'
import { KEYBOARD_ROWS } from '@/types/game'
import { cn } from '@/utils/cn'

interface ChatPanelProps {
  messages: ChatMessage[]
  myId: string
  myName: string
  isGuesser: boolean          // El desafiado ve el picker de letras
  usedLetters: string[]       // Letras ya pedidas (para no repetir)
  bottomRef: React.RefObject<HTMLDivElement>
  onSendText: (text: string) => void
  onRequestLetter: (letter: string) => void // Solo desafiado
  disabled?: boolean
}

const POWERUP_ICONS: Record<string, string> = {
  reveal_letter: '✨',
  eliminate_wrong: '🗑️',
  extra_hint: '💡',
  shield: '🛡️',
  show_structure: '🔤',
  time_freeze: '⏱️',
}

export default function ChatPanel({
  messages,
  myId,
  isGuesser,
  usedLetters,
  bottomRef,
  onSendText,
  onRequestLetter,
  disabled,
}: ChatPanelProps) {
  const [input, setInput] = useState('')
  const [showLetterPicker, setShowLetterPicker] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSend = () => {
    if (!input.trim() || disabled) return
    onSendText(input)
    setInput('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleLetterRequest = (letter: string) => {
    if (usedLetters.includes(letter)) return
    onRequestLetter(letter)
    setShowLetterPicker(false)
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Lista de mensajes */}
      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2 min-h-0">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <ChatBubble key={msg.id} msg={msg} isOwn={msg.senderId === myId} />
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Picker de letras (solo desafiado) */}
      <AnimatePresence>
        {showLetterPicker && isGuesser && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="border-t border-border bg-bg-surface2 px-3 py-2"
          >
            <p className="text-xs text-text-subtle mb-2">Toca una letra para pedirla:</p>
            <div className="flex flex-col items-center gap-1.5">
              {KEYBOARD_ROWS.map((row, i) => (
                <div key={i} className="flex gap-1">
                  {row.map((letter) => {
                    const alreadyUsed = usedLetters.includes(letter)
                    return (
                      <button
                        key={letter}
                        onClick={() => handleLetterRequest(letter)}
                        disabled={alreadyUsed}
                        className={cn(
                          'w-8 h-9 rounded-lg text-xs font-mono font-bold border transition-all',
                          alreadyUsed
                            ? 'bg-bg-surface border-border/50 text-text-subtle/40 cursor-not-allowed line-through'
                            : 'bg-bg-surface border-border text-text hover:bg-primary/20 hover:border-primary active:scale-90'
                        )}
                      >
                        {letter}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="border-t border-border px-3 py-2 flex gap-2 bg-bg-surface shrink-0">
        {/* Botón pedir letra (solo desafiado) */}
        {isGuesser && (
          <button
            onClick={() => setShowLetterPicker((v) => !v)}
            title="Pedir una letra"
            className={cn(
              'shrink-0 w-9 h-9 rounded-xl border flex items-center justify-center text-base transition-all',
              showLetterPicker
                ? 'bg-primary border-primary text-white'
                : 'bg-bg-surface2 border-border text-text-muted hover:border-primary hover:text-primary'
            )}
          >
            🔡
          </button>
        )}

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={isGuesser ? 'Escribe o pide una letra...' : 'Escribe al desafiado...'}
          maxLength={200}
          className="flex-1 bg-bg-surface2 border border-border rounded-xl px-3 py-2 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent min-w-0"
        />

        <button
          onClick={handleSend}
          disabled={!input.trim() || disabled}
          className="shrink-0 w-9 h-9 bg-primary hover:bg-primary-hover disabled:opacity-40 rounded-xl flex items-center justify-center transition-all active:scale-90"
        >
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ─── BURBUJA DE MENSAJE ────────────────────────────────────────────────────────

function ChatBubble({ msg, isOwn }: { msg: ChatMessage; isOwn: boolean }) {
  if (msg.type === 'system' || msg.senderId === 'system') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <span className="text-xs text-text-subtle bg-bg-surface2 px-3 py-1 rounded-full inline-block">
          {msg.type === 'powerup_notif' && msg.meta?.powerupType
            ? `${POWERUP_ICONS[msg.meta.powerupType] ?? '⚡'} ${msg.text}`
            : msg.text}
        </span>
      </motion.div>
    )
  }

  if (msg.type === 'letter_request') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}
      >
        <div className={cn(
          'px-3 py-2 rounded-2xl max-w-[80%] border',
          isOwn
            ? 'bg-primary/20 border-primary/40 rounded-br-sm'
            : 'bg-warning/15 border-warning/40 rounded-bl-sm'
        )}>
          {!isOwn && (
            <p className="text-[10px] text-text-subtle mb-0.5 font-medium">{msg.senderName || 'Jugador'}</p>
          )}
          <p className="text-sm font-bold text-text">
            <span className="text-warning mr-1">🔡</span>
            {msg.text}
          </p>
        </div>
      </motion.div>
    )
  }

  // Mensaje de texto normal
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex flex-col', isOwn ? 'items-end' : 'items-start')}
    >
      {!isOwn && (
        <p className="text-[10px] text-text-subtle mb-0.5 ml-3">{msg.senderName || 'Jugador'}</p>
      )}
      <div className={cn(
        'px-3 py-2 rounded-2xl max-w-[85%] text-sm',
        isOwn
          ? 'bg-primary text-white rounded-br-sm'
          : 'bg-bg-surface2 border border-border text-text rounded-bl-sm'
      )}>
        {msg.text}
      </div>
      <p className="text-[10px] text-text-subtle mt-0.5 mx-1">
        {new Date(msg.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
      </p>
    </motion.div>
  )
}
