import { forwardRef } from 'react'
import { cn } from '@/utils/cn'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const base =
      'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-bg disabled:opacity-50 disabled:cursor-not-allowed active:scale-95'

    const variants = {
      primary:
        'bg-primary hover:bg-primary-hover text-white focus:ring-primary glow-primary',
      secondary:
        'bg-bg-surface2 hover:bg-border text-text border border-border hover:border-border-light focus:ring-border',
      danger:
        'bg-accent hover:bg-accent-hover text-white focus:ring-accent',
      ghost:
        'bg-transparent hover:bg-bg-surface text-text-muted hover:text-text focus:ring-border',
      outline:
        'bg-transparent border border-primary text-primary hover:bg-primary/10 focus:ring-primary',
    }

    const sizes = {
      sm: 'text-sm px-3 py-1.5',
      md: 'text-sm px-5 py-2.5',
      lg: 'text-base px-7 py-3.5',
    }

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
export default Button
