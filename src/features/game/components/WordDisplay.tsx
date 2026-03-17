import { motion, AnimatePresence } from 'framer-motion'
import { buildDisplayWord } from '@/utils/wordNormalizer'
import { letterReveal } from '@/animations/variants'

interface WordDisplayProps {
  /** La palabra real (solo cuando el guesser la adivina o al revelarla) */
  word: string | null
  /** Largo de la palabra — siempre disponible */
  wordLength: number
  correctLetters: string[]
  result?: 'won' | 'lost' | null
  /** Palabra codificada para construir los guiones cuando no tenemos la palabra */
  encodedWord?: string
}

export default function WordDisplay({
  word,
  correctLetters,
  result,
}: WordDisplayProps) {
  if (!word) {
    // Estado de carga o sin palabra — mostrar placeholder
    return (
      <div className="flex items-center justify-center gap-1 flex-wrap min-h-[60px]">
        <span className="text-text-muted text-sm animate-pulse">Cargando...</span>
      </div>
    )
  }

  const displayChars = buildDisplayWord(word, correctLetters)

  return (
    <div className="flex items-end justify-center gap-1 flex-wrap px-4">
      {displayChars.map((char, index) => {
        if (char === ' ') {
          return <div key={index} className="w-4" />
        }

        const isRevealed = char !== '_'
        const isNewlyRevealed = isRevealed && correctLetters.includes(char)

        return (
          <div key={index} className="flex flex-col items-center gap-1">
            <AnimatePresence mode="wait">
              {isRevealed ? (
                <motion.span
                  key={`revealed-${index}`}
                  variants={letterReveal}
                  initial="hidden"
                  animate="visible"
                  className={`
                    font-mono font-bold text-2xl sm:text-3xl leading-none min-w-[24px] text-center
                    ${result === 'lost' && char === '_' ? 'text-accent' : ''}
                    ${isNewlyRevealed ? 'text-success' : 'text-text'}
                  `}
                >
                  {char}
                </motion.span>
              ) : (
                <motion.span
                  key={`hidden-${index}`}
                  className="font-mono font-bold text-2xl sm:text-3xl leading-none min-w-[24px] text-center text-text-subtle"
                >
                  _
                </motion.span>
              )}
            </AnimatePresence>
            {/* Línea debajo */}
            <div className={`h-0.5 w-full rounded-full transition-colors duration-300 ${
              isRevealed ? 'bg-success/60' : 'bg-border-light'
            }`} />
          </div>
        )
      })}
    </div>
  )
}
