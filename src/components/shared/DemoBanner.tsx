import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function DemoBanner() {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-warning/10 border-t border-warning/30 px-4 py-2.5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-warning font-semibold">🪢 Cuellito — Modo Demo</span>
        <span className="text-text-muted hidden sm:inline">
          Sin Supabase — UI navegable con datos de ejemplo.{' '}
          <Link to="/demo" className="text-primary-light underline hover:no-underline">
            Ver juego interactivo →
          </Link>
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-text-subtle hover:text-text text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors shrink-0"
      >
        Cerrar
      </button>
    </div>
  )
}
