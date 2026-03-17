import { cn } from '@/utils/cn'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'error' | 'warning' | 'primary'
  size?: 'sm' | 'md'
  className?: string
}

export default function Badge({ children, variant = 'default', size = 'sm', className }: BadgeProps) {
  const variants = {
    default: 'bg-border text-text-muted',
    success: 'bg-success/20 text-success border border-success/30',
    error: 'bg-accent/20 text-accent border border-accent/30',
    warning: 'bg-warning/20 text-warning border border-warning/30',
    primary: 'bg-primary/20 text-primary-light border border-primary/30',
  }

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
  }

  return (
    <span className={cn('inline-flex items-center rounded-full font-medium', variants[variant], sizes[size], className)}>
      {children}
    </span>
  )
}
