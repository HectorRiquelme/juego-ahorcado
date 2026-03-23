import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useAuth } from '@/hooks/useAuth'
import { useState } from 'react'

export default function Navbar() {
  const { user, profile } = useAuthStore()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  if (!user) return null

  return (
    <nav className="sticky top-0 z-40 glass border-b border-border">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/home" className="flex items-center gap-2">
          <span className="text-2xl">🪢</span>
          <span className="font-bold text-text text-lg hidden sm:block">
            <span className="text-gradient">Cuellito</span>
          </span>
        </Link>

        {/* Nav links - desktop */}
        <div className="hidden md:flex items-center gap-1">
          <NavLink to="/home">Inicio</NavLink>
          <NavLink to="/stats">Estadísticas</NavLink>
          <NavLink to="/words">Palabras</NavLink>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          {/* Avatar + menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-bg-surface2 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center text-primary-light font-bold text-sm">
                {(profile?.display_name || profile?.username || 'U').charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-text-muted hidden sm:block">
                {profile?.display_name ?? profile?.username ?? 'Usuario'}
              </span>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 glass-strong rounded-xl border border-border overflow-hidden z-50">
                <button
                  onClick={() => { navigate('/profile'); setMenuOpen(false) }}
                  className="w-full px-4 py-3 text-left text-sm text-text hover:bg-bg-surface2 transition-colors"
                >
                  Mi perfil
                </button>
                <hr className="border-border" />
                <button
                  onClick={() => { signOut(); setMenuOpen(false) }}
                  className="w-full px-4 py-3 text-left text-sm text-accent hover:bg-accent/10 transition-colors"
                >
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="px-4 py-2 text-sm text-text-muted hover:text-text rounded-lg hover:bg-bg-surface2 transition-all duration-200"
    >
      {children}
    </Link>
  )
}
