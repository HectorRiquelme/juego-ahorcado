import { forwardRef } from 'react'
import { cn } from '@/utils/cn'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: React.ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-text-muted">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            aria-invalid={!!error || undefined}
            className={cn(
              'w-full bg-bg-surface border border-border rounded-xl px-4 py-3 text-text placeholder:text-text-subtle',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
              'transition-all duration-200',
              leftIcon && 'pl-10',
              error && 'border-accent focus:ring-accent',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-accent">{error}</p>}
        {hint && !error && <p className="text-xs text-text-subtle">{hint}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
export default Input
