import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

/** Carga el perfil del usuario autenticado y lo almacena en el store */
export function useProfile() {
  const { user, profile, setProfile } = useAuthStore()

  useEffect(() => {
    if (!user || profile) return

    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (!error && data) setProfile(data)
      })
  }, [user, profile, setProfile])

  return { profile, loading: !profile && !!user }
}
