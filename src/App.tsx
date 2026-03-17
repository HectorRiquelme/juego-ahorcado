import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { IS_DEMO, DEMO_PROFILE } from '@/lib/demo'

// Pages
import LandingPage from '@/pages/LandingPage'
import AuthPage from '@/pages/AuthPage'
import HomePage from '@/pages/HomePage'
import CreateRoomPage from '@/pages/CreateRoomPage'
import JoinRoomPage from '@/pages/JoinRoomPage'
import LobbyPage from '@/pages/LobbyPage'
import GamePage from '@/pages/GamePage'
import RoundEndPage from '@/pages/RoundEndPage'
import MatchEndPage from '@/pages/MatchEndPage'
import StatsPage from '@/pages/StatsPage'
import WordsPage from '@/pages/WordsPage'
import ProfilePage from '@/pages/ProfilePage'
import DemoGamePage from '@/pages/DemoGamePage'
import DemoBanner from '@/components/shared/DemoBanner'

// Guard component
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-text-muted text-sm">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/auth" replace />
  return <>{children}</>
}

export default function App() {
  const { setUser, setProfile, setLoading } = useAuthStore()

  useEffect(() => {
    if (IS_DEMO) {
      // En modo demo: simular usuario autenticado con datos de ejemplo
      setUser({
        id: DEMO_PROFILE.id,
        email: 'demo@cuellito.app',
        app_metadata: {},
        user_metadata: { username: DEMO_PROFILE.username },
        aud: 'authenticated',
        created_at: DEMO_PROFILE.created_at,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      setProfile(DEMO_PROFILE)
      setLoading(false)
      return
    }

    // Modo real: inicializar sesión de Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    }).catch(() => {
      // Si falla la conexión (sin internet, URL incorrecta), no bloquear la app
      setUser(null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [setUser, setProfile, setLoading])

  return (
    <>
      {IS_DEMO && <DemoBanner />}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />

        <Route path="/home" element={<RequireAuth><HomePage /></RequireAuth>} />
        <Route path="/rooms/create" element={<RequireAuth><CreateRoomPage /></RequireAuth>} />
        <Route path="/rooms/join" element={<RequireAuth><JoinRoomPage /></RequireAuth>} />
        <Route path="/rooms/:code/lobby" element={<RequireAuth><LobbyPage /></RequireAuth>} />
        <Route path="/rooms/:code/game" element={<RequireAuth><GamePage /></RequireAuth>} />
        <Route path="/rooms/:code/round-end" element={<RequireAuth><RoundEndPage /></RequireAuth>} />
        <Route path="/rooms/:code/match-end" element={<RequireAuth><MatchEndPage /></RequireAuth>} />
        <Route path="/stats" element={<RequireAuth><StatsPage /></RequireAuth>} />
        <Route path="/words" element={<RequireAuth><WordsPage /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />

        {/* Demo interactivo del juego */}
        <Route path="/demo" element={<DemoGamePage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
