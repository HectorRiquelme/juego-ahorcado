import { motion } from 'framer-motion'
import { hangmanPart } from '@/animations/variants'

interface HangmanSVGProps {
  errors: number
  maxErrors?: number
}

/**
 * SVG minimalista del ahorcado.
 * Estética de trazo elegante — sin gore.
 * 6 partes: cabeza, cuerpo, brazo izq, brazo der, pierna izq, pierna der
 */
// Colores de tailwind.config.js — centralizados para SVG inline
const COLORS = {
  gallows: '#2D2D44',   // border
  accent: '#E94560',    // accent
  primary: '#A78BFA',   // primary-light
  text: '#F1F5F9',      // text
} as const

export default function HangmanSVG({ errors, maxErrors = 6 }: HangmanSVGProps) {
  const strokeColor = errors >= maxErrors ? COLORS.accent : COLORS.primary
  const figureColor = errors >= maxErrors ? COLORS.accent : COLORS.text

  return (
    <svg
      viewBox="0 0 200 220"
      className="w-full max-w-[220px] mx-auto"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Horca — siempre visible */}
      {/* Base */}
      <line x1="20" y1="210" x2="100" y2="210" stroke={COLORS.gallows} strokeWidth="4" />
      {/* Poste vertical */}
      <line x1="60" y1="210" x2="60" y2="20" stroke={COLORS.gallows} strokeWidth="4" />
      {/* Viga horizontal */}
      <line x1="60" y1="20" x2="130" y2="20" stroke={COLORS.gallows} strokeWidth="4" />
      {/* Cuerda */}
      <line x1="130" y1="20" x2="130" y2="45" stroke={COLORS.gallows} strokeWidth="3" strokeDasharray="4 2" />

      {/* Cabeza */}
      {errors >= 1 && (
        <motion.circle
          cx="130"
          cy="60"
          r="16"
          stroke={strokeColor}
          strokeWidth="2.5"
          variants={hangmanPart}
          initial="hidden"
          animate="visible"
        />
      )}

      {/* Cuerpo */}
      {errors >= 2 && (
        <motion.line
          x1="130"
          y1="76"
          x2="130"
          y2="130"
          stroke={figureColor}
          strokeWidth="2.5"
          variants={hangmanPart}
          initial="hidden"
          animate="visible"
        />
      )}

      {/* Brazo izquierdo */}
      {errors >= 3 && (
        <motion.line
          x1="130"
          y1="92"
          x2="108"
          y2="115"
          stroke={figureColor}
          strokeWidth="2.5"
          variants={hangmanPart}
          initial="hidden"
          animate="visible"
        />
      )}

      {/* Brazo derecho */}
      {errors >= 4 && (
        <motion.line
          x1="130"
          y1="92"
          x2="152"
          y2="115"
          stroke={figureColor}
          strokeWidth="2.5"
          variants={hangmanPart}
          initial="hidden"
          animate="visible"
        />
      )}

      {/* Pierna izquierda */}
      {errors >= 5 && (
        <motion.line
          x1="130"
          y1="130"
          x2="112"
          y2="160"
          stroke={figureColor}
          strokeWidth="2.5"
          variants={hangmanPart}
          initial="hidden"
          animate="visible"
        />
      )}

      {/* Pierna derecha + cara triste al morir */}
      {errors >= 6 && (
        <>
          <motion.line
            x1="130"
            y1="130"
            x2="148"
            y2="160"
            stroke={figureColor}
            strokeWidth="2.5"
            variants={hangmanPart}
            initial="hidden"
            animate="visible"
          />
          {/* Ojos cerrados (X) */}
          <motion.g
            variants={hangmanPart}
            initial="hidden"
            animate="visible"
          >
            <line x1="124" y1="56" x2="127" y2="59" stroke={COLORS.accent} strokeWidth="1.5" />
            <line x1="127" y1="56" x2="124" y2="59" stroke={COLORS.accent} strokeWidth="1.5" />
            <line x1="133" y1="56" x2="136" y2="59" stroke={COLORS.accent} strokeWidth="1.5" />
            <line x1="136" y1="56" x2="133" y2="59" stroke={COLORS.accent} strokeWidth="1.5" />
            {/* Boca triste */}
            <path d="M 125 66 Q 130 62 135 66" stroke={COLORS.accent} strokeWidth="1.5" />
          </motion.g>
        </>
      )}

      {/* Cara feliz si está adivinando bien (0 errors, ojos y sonrisa) */}
      {errors === 0 && (
        <></>
      )}
    </svg>
  )
}
