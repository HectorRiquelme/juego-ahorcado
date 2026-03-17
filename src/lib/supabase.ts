import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan variables de entorno: VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY son requeridas.'
  )
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

/**
 * Helper para ignorar el tipado estricto de Supabase en insert/update
 * cuando los tipos inferidos son incorrectos (limitación conocida del SDK v2).
 * Retorna el mismo cliente pero tipado como `any` para esas operaciones.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = supabase as ReturnType<typeof createClient<any>>

export type SupabaseClient = typeof supabase
