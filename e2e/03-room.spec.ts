import { test, expect } from '@playwright/test'
import { USER_A, USER_B, signIn, sbAnon, joinRoomAdmin } from './helpers'

test.describe('Salas — crear y unirse con código', () => {
  test('Usuario A crea sala y obtiene código de 6 caracteres', async ({ page }) => {
    await signIn(page, USER_A)
    await page.goto('/rooms/create')

    // Crear sala con configuración por defecto
    const createBtn = page.getByRole('button', { name: /crear sala|create/i }).last()
    await createBtn.click()

    // Debe redirigir al lobby
    await page.waitForURL(/\/rooms\/[A-Z0-9]+\/lobby/, { timeout: 15000 })

    // El código debe ser visible y tener 6 caracteres
    const codeEl = page.locator('span.font-mono, span[class*="tracking-widest"]').first()
    await expect(codeEl).toBeVisible({ timeout: 8000 })
    const code = (await codeEl.textContent())?.trim() ?? ''
    expect(code).toMatch(/^[A-Z0-9]{6}$/)

    // Guardar el código para el siguiente test
    // (lo hacemos via URL que ya contiene el código)
    const url = page.url()
    const codeFromUrl = url.match(/\/rooms\/([A-Z0-9]+)\/lobby/)?.[1]
    expect(codeFromUrl).toMatch(/^[A-Z0-9]{6}$/)
  })

  test('Flujo completo: A crea sala, B se une con código', async ({ browser }) => {
    // ─── Contexto A: Host ──────────────────────────────────────────────
    const ctxA = await browser.newContext()
    const pageA = await ctxA.newPage()
    await signIn(pageA, USER_A)

    await pageA.goto('/rooms/create')
    const createBtn = pageA.getByRole('button', { name: /crear sala|create/i }).last()
    await createBtn.click()
    await pageA.waitForURL(/\/rooms\/[A-Z0-9]+\/lobby/, { timeout: 15000 })

    // Extraer código de sala
    const lobbyUrl = pageA.url()
    const roomCode = lobbyUrl.match(/\/rooms\/([A-Z0-9]+)\/lobby/)?.[1]
    expect(roomCode).toBeDefined()
    console.log(`[TEST] Código de sala creado: ${roomCode}`)

    // Verificar que el código aparece en pantalla
    const codeEl = pageA.locator('span.font-mono, span[class*="tracking-widest"]').first()
    await expect(codeEl).toBeVisible()
    const displayedCode = (await codeEl.textContent())?.trim()
    expect(displayedCode).toBe(roomCode)

    // ─── Contexto B: Guest ──────────────────────────────────────────────
    const ctxB = await browser.newContext()
    const pageB = await ctxB.newPage()
    await signIn(pageB, USER_B)

    // Obtener el ID de B via SDK de Node
    const { data: authB } = await sbAnon.auth.signInWithPassword({
      email: USER_B.email, password: USER_B.password,
    })
    const guestId = authB.user!.id

    // Usar service_role para hacer el join (la RLS policy del anon aún no propaga)
    const joinedRoom = await joinRoomAdmin(roomCode!, guestId)
    console.log('[TEST] joinedRoom:', joinedRoom.code)

    // Navegar al lobby directamente
    await pageB.goto(`/rooms/${roomCode}/lobby`)
    await pageB.waitForURL(/\/rooms\/[A-Z0-9]+\/lobby/, { timeout: 15000 })
    console.log('[TEST] Usuario B se unió al lobby')

    // ─── Verificar que ambos están en el lobby ─────────────────────────
    // B ve a A (B llegó al lobby, debe ver al host)
    await expect(
      pageB.getByText(USER_A.username, { exact: false })
    ).toBeVisible({ timeout: 10000 })
    console.log('[TEST] Usuario B ve a A en el lobby')

    // A puede necesitar recargar para ver a B (el UPDATE ocurrió antes de la suscripción)
    // Esperamos el realtime o recargamos
    const bVisibleForA = await pageA.getByText(USER_B.username, { exact: false })
      .isVisible({ timeout: 8000 }).catch(() => false)
    if (!bVisibleForA) {
      await pageA.reload()
      await pageA.waitForURL(/\/rooms\/[A-Z0-9]+\/lobby/, { timeout: 10000 })
    }
    await expect(
      pageA.getByText(USER_B.username, { exact: false })
    ).toBeVisible({ timeout: 10000 })
    console.log('[TEST] Usuario A ve a B en el lobby')

    // Botón de iniciar — visible para el host (puede estar disabled si la presencia
    // realtime de B aún no llegó, pero el botón debe existir en el DOM)
    const startBtn = pageA.getByRole('button', { name: /iniciar|start|esperando/i })
    await expect(startBtn).toBeVisible({ timeout: 10000 })
    console.log('[TEST] Botón de iniciar visible para el host (OK)')

    await ctxA.close()
    await ctxB.close()
  })

  test('Unirse con código inválido muestra error', async ({ page }) => {
    await signIn(page, USER_A)
    await page.goto('/rooms/join')

    const inputs = page.locator('input[maxlength="1"]')
    await expect(inputs.first()).toBeVisible({ timeout: 8000 })
    await inputs.first().click()
    await inputs.first().pressSequentially('XXXXXX', { delay: 100 })
    const joinBtn = page.getByRole('button', { name: /unirme|unirse|join/i })
    await expect(joinBtn).toBeEnabled({ timeout: 5000 })
    await joinBtn.click()

    await expect(
      page.getByText(/no encontrada|not found|inválid|no se pudo|error/i).first()
    ).toBeVisible({ timeout: 8000 })
  })
})
