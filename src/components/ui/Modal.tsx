import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/utils/cn'

interface ModalProps {
  open: boolean
  onClose?: () => void
  title?: string
  children: React.ReactNode
  className?: string
}

export default function Modal({ open, onClose, title, children, className }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Focus trap: focus panel on open, close on Escape
  useEffect(() => {
    if (!open) return
    panelRef.current?.focus()
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn(
              'relative z-10 w-full max-w-md glass-strong rounded-2xl p-6 outline-none',
              className
            )}
          >
            {title && (
              <h2 className="text-lg font-bold text-text mb-4">{title}</h2>
            )}
            {onClose && (
              <button
                onClick={(e) => { e.stopPropagation(); onClose() }}
                className="absolute top-4 right-4 text-text-subtle hover:text-text transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
