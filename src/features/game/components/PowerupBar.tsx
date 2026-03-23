import { motion } from 'framer-motion'
import type { PowerupType } from '@/types'
import { cn } from '@/utils/cn'

const POWERUP_INFO: Record<
  PowerupType,
  { label: string; icon: string; description: string; color: string }
> = {
  reveal_letter: {
    label: 'Revelar',
    icon: '✨',
    description: 'Revela una letra aleatoria',
    color: 'border-primary/60 hover:bg-primary/20',
  },
  eliminate_wrong: {
    label: 'Eliminar',
    icon: '🗑️',
    description: 'Elimina 3 letras del teclado',
    color: 'border-warning/60 hover:bg-warning/20',
  },
  extra_hint: {
    label: 'Pista',
    icon: '💡',
    description: 'Muestra una pista extra',
    color: 'border-warning/60 hover:bg-warning/20',
  },
  shield: {
    label: 'Escudo',
    icon: '🛡️',
    description: 'El próximo error no cuenta',
    color: 'border-success/60 hover:bg-success/20',
  },
  show_structure: {
    label: 'Estructura',
    icon: '🔤',
    description: 'Ver longitud de cada palabra',
    color: 'border-primary-light/60 hover:bg-primary-light/20',
  },
  time_freeze: {
    label: '+30s',
    icon: '⏱️',
    description: 'Congela el tiempo 30 segundos',
    color: 'border-accent/60 hover:bg-accent/20',
  },
}

interface PowerupBarProps {
  available: PowerupType[]
  used: PowerupType[]
  shieldActive: boolean
  onUse: (type: PowerupType) => void
  disabled?: boolean
}

export default function PowerupBar({
  available,
  used,
  shieldActive,
  onUse,
  disabled = false,
}: PowerupBarProps) {
  if (available.length === 0) return null

  return (
    <div className="flex flex-wrap justify-center gap-2">
      {available.map((type) => {
        const info = POWERUP_INFO[type]
        if (!info) return null
        const isUsed = used.includes(type)
        const isShield = type === 'shield'
        const isActive = isShield && shieldActive

        return (
          <motion.button
            key={type}
            whileTap={!isUsed && !disabled ? { scale: 0.9 } : undefined}
            onClick={() => !isUsed && !disabled && onUse(type)}
            disabled={isUsed || disabled}
            title={info.description}
            className={cn(
              'flex flex-col items-center gap-1 px-3 py-2 rounded-xl border text-xs font-medium',
              'transition-all duration-200',
              isUsed
                ? 'opacity-30 cursor-not-allowed bg-bg-surface border-border'
                : isActive
                ? 'bg-success/20 border-success text-success animate-pulse-glow'
                : cn('bg-bg-surface cursor-pointer', info.color, 'text-text-muted hover:text-text')
            )}
          >
            <span className="text-base">{info.icon}</span>
            <span>{info.label}</span>
            {isUsed && <span className="text-[10px] opacity-60">Usado</span>}
            {isActive && <span className="text-[10px] text-success">Activo</span>}
          </motion.button>
        )
      })}
    </div>
  )
}
