import { cn } from '@/utils/cn'

interface CardProps {
  className?: string
  children: React.ReactNode
  glass?: boolean
  hover?: boolean
  onClick?: () => void
}

export default function Card({ className, children, glass, hover, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-2xl border border-border p-6',
        glass ? 'glass' : 'bg-bg-surface',
        hover && 'cursor-pointer hover:border-border-light hover:bg-bg-surface2 transition-all duration-200',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  )
}
