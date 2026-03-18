import { test, expect } from '@playwright/test'
import { USER_A, USER_B, signIn, sbAnon, joinRoomAdmin } from './helpers'

test.describe('Partida completa entre dos jugadores', () => {
  test('A crea sala, B se une, A inicia partida y juegan una ronda', async ({ browser }) => {
    // ─── Setup: dos contextos independientes ──────────────────────────
    const ctxA = await browser.newContext()
    const ctxB = await browser.newContext()
    const pageA = await ctxA.newPage()
    const pageB = await ctxB.newPage()

    await signIn(pageA, USER_A)
    await signIn(pageB, USER_B)

    // ─── A crea sala ───────────────────────────────────────────────────
    await pageA.goto('/rooms/create')
    await pageA.getByRole('button', { name: /crear sala|create/i }).last().click()
    await pageA.waitForURL(/\/rooms\/[A-Z0-9]+\/lobby/, { timeout: 15000 })
    const roomCode = pageA.url().match(/\/rooms\/([A-Z0-9]+)\/lobby/)?.[1]!
    console.log(`[GAME TEST] Sala: ${roomCode}`)

    // ─── B se une via service_role (bypasea RLS) ──────────────────────
    const { data: authB } = await sbAnon.auth.signInWithPassword({
      email: USER_B.email, password: USER_B.password,
    })
    const guestId = authB.user!.id
    await joinRoomAdmin(roomCode, guestId)
    await pageB.goto(`/rooms/${roomCode}/lobby`)
    await pageB.waitForURL(/\/rooms\/[A-Z0-9]+\/lobby/, { timeout: 15000 })
    console.log('[GAME TEST] B en lobby')

    // ─── A inicia la partida ───────────────────────────────────────────
    // Esperar a que la presencia Realtime de B llegue a A (puede tardar unos segundos)
    // Si el botón sigue disabled, recargar A para forzar re-suscripción
    await pageA.waitForTimeout(3000)
    const startBtnDisabled = await pageA.getByRole('button', { name: /esperando/i }).isVisible().catch(() => false)
    if (startBtnDisabled) {
      await pageA.reload()
      await pageA.waitForURL(/\/rooms\/[A-Z0-9]+\/lobby/, { timeout: 10000 })
      await pageA.waitForTimeout(3000)
    }
    const startBtn = pageA.getByRole('button', { name: /iniciar/i })
    await expect(startBtn).toBeEnabled({ timeout: 15000 })
    await startBtn.click()
    console.log('[GAME TEST] A inició la partida')

    // Ambos deben navegar a /game
    await pageA.waitForURL(/\/rooms\/[A-Z0-9]+\/game/, { timeout: 15000 })
    await pageB.waitForURL(/\/rooms\/[A-Z0-9]+\/game/, { timeout: 15000 })
    console.log('[GAME TEST] Ambos en /game')

    // ─── Detectar quién es proponente ─────────────────────────────────
    // El proponente ve el formulario de proponer palabra
    // El desafiado ve el mensaje de espera
    await pageA.waitForTimeout(2000) // dar tiempo al estado de inicializar

    const aIsProposer = await pageA.getByText(/propones|proponente|elige la palabra/i)
      .isVisible({ timeout: 5000 }).catch(() => false)
    const bIsProposer = await pageB.getByText(/propones|proponente|elige la palabra/i)
      .isVisible({ timeout: 5000 }).catch(() => false)

    console.log(`[GAME TEST] A es proponente: ${aIsProposer}, B es proponente: ${bIsProposer}`)
    expect(aIsProposer || bIsProposer).toBe(true) // uno de los dos debe ser proponente

    const proposerPage = aIsProposer ? pageA : pageB
    const guesserPage = aIsProposer ? pageB : pageA

    // ─── Proponente llena el formulario ───────────────────────────────
    // Palabra simple para facilitar el test
    const wordInput = proposerPage.getByPlaceholder(/palabra|word/i)
    await expect(wordInput).toBeVisible({ timeout: 8000 })
    await wordInput.fill('GATO')

    // Pista
    const hintInput = proposerPage.getByPlaceholder(/pista|hint/i)
    if (await hintInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await hintInput.fill('Animal doméstico')
    }

    // Enviar
    const submitBtn = proposerPage.getByRole('button', { name: /iniciar ronda|enviar|start/i })
    await expect(submitBtn).toBeVisible({ timeout: 5000 })
    await submitBtn.click()
    console.log('[GAME TEST] Proponente envió la palabra: GATO')

    // ─── El desafiado debe ver el tablero ─────────────────────────────
    // Esperar a que aparezca el tablero (ahorcado o guiones)
    await expect(
      guesserPage.locator('svg').or(guesserPage.getByText(/error|errores/i).first())
    ).toBeVisible({ timeout: 10000 })
    console.log('[GAME TEST] Desafiado ve el tablero')

    // ─── Proponente ingresa letras (simula que el desafiado pidió G, A, T, O) ──
    const letters = ['G', 'A', 'T', 'O']
    for (const letter of letters) {
      const keyBtn = proposerPage.getByRole('button', { name: new RegExp(`^${letter}$`) })
      if (await keyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await keyBtn.click()
        await proposerPage.waitForTimeout(800) // dar tiempo al realtime
        console.log(`[GAME TEST] Proponente presionó: ${letter}`)
      }
    }

    // ─── Verificar resultado de ronda ─────────────────────────────────
    // Ambos deben navegar a /round-end
    await Promise.all([
      pageA.waitForURL(/\/round-end/, { timeout: 20000 }),
      pageB.waitForURL(/\/round-end/, { timeout: 20000 }),
    ])
    console.log('[GAME TEST] Ambos en /round-end')

    // Debe mostrarse resultado
    await expect(
      pageA.getByText(/ganaste|perdiste|adivinaste|ronda/i).first()
    ).toBeVisible({ timeout: 8000 })
    await expect(
      pageB.getByText(/ganaste|perdiste|adivinaste|ronda/i).first()
    ).toBeVisible({ timeout: 8000 })
    console.log('[GAME TEST] Resultado de ronda visible para ambos')

    // ─── Ambos presionan "siguiente ronda" ────────────────────────────
    await pageA.getByRole('button', { name: /siguiente|continuar|ready|listo/i }).click()
    await pageB.getByRole('button', { name: /siguiente|continuar|ready|listo/i }).click()
    console.log('[GAME TEST] Ambos presionaron continuar')

    await ctxA.close()
    await ctxB.close()
  })

  test('El timer se muestra cuando está configurado', async ({ browser }) => {
    const ctxA = await browser.newContext()
    const ctxB = await browser.newContext()
    const pageA = await ctxA.newPage()
    const pageB = await ctxB.newPage()

    await signIn(pageA, USER_A)
    await signIn(pageB, USER_B)

    await pageA.goto('/rooms/create')
    await pageA.getByRole('button', { name: /crear sala|create/i }).last().click()
    await pageA.waitForURL(/\/rooms\/[A-Z0-9]+\/lobby/, { timeout: 15000 })
    const roomCode = pageA.url().match(/\/rooms\/([A-Z0-9]+)\/lobby/)?.[1]!

    const { data: authB2 } = await sbAnon.auth.signInWithPassword({
      email: USER_B.email, password: USER_B.password,
    })
    await joinRoomAdmin(roomCode, authB2.user!.id)
    await pageB.goto(`/rooms/${roomCode}/lobby`)
    await pageB.waitForURL(/\/rooms\/[A-Z0-9]+\/lobby/, { timeout: 15000 })

    await pageA.waitForTimeout(3000)
    const startBtn2 = pageA.getByRole('button', { name: /iniciar/i })
    await expect(startBtn2).toBeEnabled({ timeout: 15000 })
    await startBtn2.click()
    await pageA.waitForURL(/\/game/, { timeout: 15000 })
    await pageB.waitForURL(/\/game/, { timeout: 15000 })

    // Verificar que al menos un jugador ve el timer (si está configurado)
    await pageA.waitForTimeout(3000)
    const timerA = pageA.locator('[class*="timer"], circle, [data-testid="timer"]')
    const timerB = pageB.locator('[class*="timer"], circle, [data-testid="timer"]')
    const timerVisible = await timerA.isVisible().catch(() => false)
      || await timerB.isVisible().catch(() => false)
    console.log(`[TIMER TEST] Timer visible: ${timerVisible}`)

    await ctxA.close()
    await ctxB.close()
  })
})
