import { supabase } from '@/lib/supabase'

/** Re-exporta la instancia de supabase para uso en hooks */
export function useSupabase() {
  return supabase
}
