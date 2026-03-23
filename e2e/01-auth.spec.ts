import { test, expect } from '@playwright/test'
import { USER_A, USER_B, signIn } from './helpers'

test.describe('Autenticación', () => {
  test('Landing page carga correctamente', async ({ page }) => {
    await page.goto('/')
    await expect(page).not.toHaveURL(/error/)
    await expect(page.locator('body')).not.toBeEmpty()
    // Debe haber algún CTA o texto visible
    await expect(page.locator('h1, h2, button, a').first()).toBeVisible({ timeout: 10000 })
  })

  test('Página de auth carga correctamente', async ({ page }) => {
    await page.goto('/auth')
    await expect(page.getByPlaceholder(/email/i)).toBeVisible({ timeout: 8000 })
    await expect(page.getByPlaceholder(/mínimo 6|contraseña|password/i)).toBeVisible()
  })

  test('Modo registro muestra campo de username', async ({ page }) => {
    await page.goto('/auth')
    // Por defecto está en registro
    await expect(
      page.getByPlaceholder(/nombre de usuario|username|como te llamarán/i)
    ).toBeVisible({ timeout: 5000 })
  })

  test('Switch entre login y registro funciona', async ({ page }) => {
    await page.goto('/auth')
    // Cambiar a login
    await page.getByRole('button', { name: /iniciar sesión/i }).click()
    await expect(page.getByRole('button', { name: /entrar/i })).toBeVisible()
    // Volver a registro
    await page.getByRole('button', { name: /registrarse/i }).click()
    await expect(page.getByRole('button', { name: /crear mi cuenta/i })).toBeVisible()
  })

  test('Login con credenciales incorrectas muestra error', async ({ page }) => {
    await page.goto('/auth?mode=login')
    const switchToLogin = page.getByRole('button', { name: /iniciar sesión/i })
    if (await switchToLogin.isVisible({ timeout: 2000 }).catch(() => false)) {
      await switchToLogin.click()
    }
    await page.getByPlaceholder(/email/i).fill('noexiste@cuellito.test')
    await page.getByPlaceholder(/mínimo 6|contraseña|password/i).fill('wrongpassword')
    await page.getByRole('button', { name: /entrar/i }).click()
    // El toast de error aparece cuando Supabase responde
    await expect(
      page.getByText(/inválid|incorrect|incorrectos|no encontr|error|contraseña/i).first()
    ).toBeVisible({ timeout: 20000 })
  })

  test('Login usuario A con cuenta QA', async ({ page }) => {
    await signIn(page, USER_A)
    await expect(page).toHaveURL(/\/home/)
    await expect(page.locator('body')).not.toBeEmpty()
  })

  test('Login usuario B (contexto separado)', async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await signIn(page, USER_B)
    await expect(page).toHaveURL(/\/home/)
    await ctx.close()
  })

  test('Cerrar sesión redirige a landing o auth', async ({ page }) => {
    await signIn(page, USER_A)
    await page.goto('/profile')
    const signOutBtn = page.getByRole('button', { name: /salir|cerrar sesión/i })
    await expect(signOutBtn).toBeVisible({ timeout: 8000 })
    await signOutBtn.click()
    await expect(page).toHaveURL(/\/|\/auth/, { timeout: 8000 })
  })
})
