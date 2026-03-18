import { supabase, db } from '@/lib/supabase'
import type { Room, GameMode } from '@/types'

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export interface CreateRoomParams {
  hostId: string
  mode: GameMode
  maxRounds: number
  maxErrors: number
  timerSeconds: number | null
  initialPowerups: number
  isPrivate: boolean
}

export async function createRoom(params: CreateRoomParams): Promise<Room> {
  let code = generateCode()
  let attempts = 0

  while (attempts < 5) {
    const { data: existing } = await supabase
      .from('rooms').select('id').eq('code', code).eq('status', 'waiting').maybeSingle()
    if (!existing) break
    code = generateCode()
    attempts++
  }

  const { data, error } = await db.from('rooms').insert({
    host_id: params.hostId,
    mode: params.mode,
    max_rounds: params.maxRounds,
    max_errors: params.maxErrors,
    timer_seconds: params.timerSeconds,
    initial_powerups: params.initialPowerups,
    is_private: params.isPrivate,
    code,
  }).select().single()

  if (error) throw error
  return data as Room
}

export async function joinRoom(code: string, guestId: string): Promise<Room> {
  // BUG 4 FIX: UPDATE atómico con condición — evita race condition TOCTOU.
  // Si dos usuarios intentan unirse simultáneamente, solo uno puede actualizar
  // la fila que tiene guest_id IS NULL y status = 'waiting'.
  const { data, error } = await db.from('rooms')
    .update({ guest_id: guestId, status: 'lobby', updated_at: new Date().toISOString() })
    .eq('code', code.toUpperCase())
    .eq('status', 'waiting')
    .is('guest_id', null)
    .neq('host_id', guestId)   // No puede unirse a su propia sala
    .select()
    .single()

  if (error || !data) throw new Error('Sala no encontrada o ya está en uso')
  return data as Room
}

export async function getRoomByCode(code: string): Promise<Room | null> {
  const { data, error } = await supabase
    .from('rooms').select('*').eq('code', code.toUpperCase()).single()
  if (error) return null
  return data as Room
}

export async function updateRoomStatus(roomId: string, status: Room['status']): Promise<void> {
  const { error } = await db.from('rooms')
    .update({ status, updated_at: new Date().toISOString() }).eq('id', roomId)
  if (error) throw error
}
