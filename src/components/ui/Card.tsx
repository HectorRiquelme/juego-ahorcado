import { cn } from '@/utils/cn'

interface CardProps {
  className?: string
  children: React.ReactNode
  glass?: boolean
  hover?: boolean
  onClick?: () => void
}

export default function Card({ className, children, glass, hover, onClick }: CardProps) {
  const interactive = !!onClick
  return (
    <div
      onClick={onClick}
      onKeyDown={interactive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.() } } : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      className={cn(
        'rounded-2xl border border-border p-6',
        glass ? 'glass' : 'bg-bg-surface',
        hover && 'cursor-pointer hover:border-border-light hover:bg-bg-surface2 transition-all duration-200',
        interactive && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  )
}
