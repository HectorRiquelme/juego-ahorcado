import type { Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://hgauhpizevbqybxwhlks.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhnYXVocGl6ZXZicXlieHdobGtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NTk0MjYsImV4cCI6MjA4OTMzNTQyNn0.whDMD7kQnvQf8T0s-wCtSI9VoJratGgnUbyCKCI_PDk'
// service_role solo para tests — nunca va al código de la app
const SUPABASE_SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhnYXVocGl6ZXZicXlieHdobGtzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc1OTQyNiwiZXhwIjoyMDg5MzM1NDI2fQ.K15QOopH6CX1-weXYg9CawWpdsiVCzblvBbiKfBXXQ4'

/** Cliente Supabase con anon key (igual que la app) */
export const sbAnon = createClient(SUPABASE_URL, SUPABASE_ANON)

/** Cliente Supabase con service_role — solo para tests, bypasea RLS */
export const sbAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE)

/**
 * Une a un usuario a una sala usando service_role.
 * Devuelve la sala actualizada.
 */
export async function joinRoomAdmin(roomCode: string, guestId: string) {
  const { data, error } = await sbAdmin.from('rooms')
    .update({ guest_id: guestId, status: 'lobby', updated_at: new Date().toISOString() })
    .eq('code', roomCode)
    .eq('status', 'waiting')
    .is('guest_id', null)
    .neq('host_id', guestId)
    .select()
    .single()
  if (error) throw new Error(`joinRoomAdmin failed: ${error.message}`)
  return data
}

// Cuentas QA pre-existentes en Supabase (sin confirm email requerido)
// Estas cuentas deben existir en el proyecto antes de correr los tests.
// Si no existen, créalas manualmente una vez en la app.
export const USER_A = {
  email: 'qa_a@cuellito.test',
  password: 'TestPass123!',
  username: 'qa_player_a',
}
export const USER_B = {
  email: 'qa_b@cuellito.test',
  password: 'TestPass123!',
  username: 'qa_player_b',
}

/**
 * Registra un usuario si no existe, luego inicia sesión.
 * Maneja el caso de "email ya registrado" silenciosamente.
 */
export async function signUp(page: Page, user: typeof USER_A) {
  await page.goto('/auth')

  // Cambiar a modo registro
  const switchToRegister = page.getByRole('button', { name: /registrarse/i })
  if (await switchToRegister.isVisible({ timeout: 3000 }).catch(() => false)) {
    await switchToRegister.click()
  }

  await page.getByPlaceholder(/nombre de usuario|username|como te llamarán/i).fill(user.username)
  await page.getByPlaceholder(/email/i).fill(user.email)
  await page.getByPlaceholder(/mínimo 6|contraseña|password/i).fill(user.password)
  await page.getByRole('button', { name: /crear mi cuenta/i }).click()

  // Puede redirigir a home, o mostrar "ya registrado" — ambos son OK
  await Promise.race([
    page.waitForURL(/\/home/, { timeout: 10000 }),
    page.getByText(/ya está registrado|already registered/i).waitFor({ timeout: 10000 }),
  ]).catch(() => {})

  // Si llegó a home, genial. Si no, hacer login
  if (!page.url().includes('/home')) {
    await signIn(page, user)
  }
}

/** Inicia sesión y espera al home */
export async function signIn(page: Page, user: typeof USER_A) {
  await page.goto('/auth?mode=login')

  // Asegurarse de estar en modo login
  const switchToLogin = page.getByRole('button', { name: /iniciar sesión/i })
  if (await switchToLogin.isVisible({ timeout: 2000 }).catch(() => false)) {
    await switchToLogin.click()
  }

  await page.getByPlaceholder(/email/i).fill(user.email)
  await page.getByPlaceholder(/mínimo 6|contraseña|password/i).fill(user.password)
  await page.getByRole('button', { name: /entrar/i }).click()
  await page.waitForURL(/\/home/, { timeout: 15000 })
}

/** Espera a que aparezca un toast con el texto dado */
export async function waitForToast(page: Page, text: RegExp | string) {
  await page.getByText(text).waitFor({ timeout: 8000 })
}
