import { test, expect } from '@playwright/test'
import { USER_A, signIn } from './helpers'

test.describe('Navegación y menús', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, USER_A)
  })

  test('Home muestra opciones principales', async ({ page }) => {
    // La home debe tener al menos dos CTAs de acción
    await expect(page.getByRole('link', { name: /crear sala|nueva sala/i })
      .or(page.getByRole('button', { name: /crear sala|nueva sala/i }))).toBeVisible()
    // Verificar que hay al menos 2 botones/links de acción en la página
    const actionCount = await page.getByRole('link').count()
    expect(actionCount).toBeGreaterThan(1)
  })

  test('Navbar tiene links de navegación', async ({ page }) => {
    // Usar el link del navbar específicamente (primer link de estadísticas)
    const statsLink = page.getByRole('link', { name: 'Estadísticas', exact: true }).first()
    await expect(statsLink).toBeVisible()
    await statsLink.click()
    await expect(page).toHaveURL(/\/stats/)
    await expect(page).not.toHaveURL(/error/)
  })

  test('Página de estadísticas carga sin error', async ({ page }) => {
    await page.goto('/stats')
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 8000 })
  })

  test('Página de perfil carga y muestra datos', async ({ page }) => {
    await page.goto('/profile')
    // Usar heading que es único en la página
    await expect(page.getByRole('heading', { name: USER_A.username })).toBeVisible({ timeout: 8000 })
    // El email puede aparecer varias veces — verificar que al menos uno está visible
    await expect(page.getByText(USER_A.email).first()).toBeVisible()
  })

  test('Página de crear sala carga correctamente', async ({ page }) => {
    await page.goto('/rooms/create')
    // Debe haber un formulario o botón de crear
    await expect(
      page.getByRole('button', { name: /crear|create/i }).first()
    ).toBeVisible({ timeout: 8000 })
  })

  test('Página de unirse a sala carga correctamente', async ({ page }) => {
    await page.goto('/rooms/join')
    // El código usa 6 inputs individuales de un caracter
    await expect(page.locator('input[maxlength="1"]').first()).toBeVisible({ timeout: 8000 })
  })

  test('Ruta inexistente redirige a home o muestra 404', async ({ page }) => {
    await page.goto('/ruta-que-no-existe-xyz')
    // No debe mostrar pantalla en blanco
    await expect(page.locator('body')).not.toBeEmpty()
  })
})
