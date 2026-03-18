import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, db } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useGameStore } from '@/stores/gameStore'
import { useRoomStore } from '@/stores/roomStore'
import toast from 'react-hot-toast'

export function useAuth() {
  const { user, profile, loading } = useAuthStore()
  const navigate = useNavigate()

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const signUp = useCallback(async (email: string, password: string, username: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    })
    if (error) throw error

    if (data.user) {
      // BUG 6 FIX: si falla la creación del perfil, hacer signOut para evitar
      // cuenta huérfana (usuario en auth.users sin fila en profiles).
      const { error: profileError } = await db.from('profiles').insert({
        id: data.user.id,
        username,
        display_name: username,
      })

      if (profileError) {
        // Limpiar la sesión recién creada para evitar cuenta huérfana
        await supabase.auth.signOut()

        const msg = (profileError as { message?: string })?.message ?? ''
        if (msg.includes('relation') || msg.includes('does not exist')) {
          throw new Error('relation "profiles" does not exist')
        }
        if (msg.includes('duplicate') || msg.includes('unique')) {
          throw new Error('duplicate key username')
        }
        throw profileError
      }

      // Crear stats iniciales (el trigger lo hace también, esto es por seguridad)
      await db.from('user_stats').insert({ user_id: data.user.id }).maybeSingle()
    }

    return data
  }, [])

  const signOut = useCallback(async () => {
    useGameStore.getState().reset()
    useRoomStore.getState().reset()
    await supabase.auth.signOut()
    navigate('/')
    toast.success('Sesión cerrada')
  }, [navigate])

  return { user, profile, loading, signIn, signUp, signOut }
}
