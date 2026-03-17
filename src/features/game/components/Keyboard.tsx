import { motion } from 'framer-motion'
import { KEYBOARD_ROWS } from '@/types/game'
import type { KeyStatus } from '@/types/game'
import { cn } from '@/utils/cn'

interface KeyboardProps {
  correctLetters: string[]
  wrongLetters: string[]
  eliminatedLetters?: string[]
  onLetterPress: (letter: string) => void
  disabled?: boolean
}

export default function Keyboard({
  correctLetters,
  wrongLetters,
  eliminatedLetters = [],
  onLetterPress,
  disabled = false,
}: KeyboardProps) {
  const getKeyStatus = (letter: string): KeyStatus => {
    if (correctLetters.includes(letter)) return 'correct'
    if (wrongLetters.includes(letter)) return 'wrong'
    if (eliminatedLetters.includes(letter)) return 'eliminated'
    return 'unused'
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <div key={rowIndex} className="flex gap-1.5 sm:gap-2">
          {row.map((letter) => {
            const status = getKeyStatus(letter)
            const isUsed = status !== 'unused'

            return (
              <motion.button
                key={letter}
                whileTap={!isUsed && !disabled ? { scale: 0.9 } : undefined}
                onClick={() => !isUsed && !disabled && onLetterPress(letter)}
                disabled={isUsed || disabled}
                className={cn(
                  'w-9 h-11 sm:w-10 sm:h-12 rounded-lg font-mono font-semibold text-sm sm:text-base',
                  'border transition-all duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-primary/50',
                  {
                    // Sin usar
                    'bg-bg-surface2 border-border text-text hover:bg-border hover:border-border-light cursor-pointer':
                      status === 'unused' && !disabled,
                    'bg-bg-surface2 border-border text-text-subtle cursor-not-allowed opacity-60':
                      status === 'unused' && disabled,
                    // Correcta
                    'bg-success/20 border-success text-success cursor-default':
                      status === 'correct',
                    // Incorrecta
                    'bg-accent/20 border-accent/50 text-accent/70 cursor-default line-through':
                      status === 'wrong',
                    // Eliminada por comodín
                    'bg-bg-surface border-border/50 text-text-subtle/40 cursor-default line-through':
                      status === 'eliminated',
                  }
                )}
              >
                {letter}
              </motion.button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
