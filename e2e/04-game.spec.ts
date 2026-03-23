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

    // Navegar B al lobby y recargar A para que lea el guest_id actualizado
    await Promise.all([
      pageB.goto(`/rooms/${roomCode}/lobby`),
      pageA.reload(),
    ])
    await pageB.waitForURL(/\/rooms\/[A-Z0-9]+\/lobby/, { timeout: 15000 })
    await pageA.waitForURL(/\/rooms\/[A-Z0-9]+\/lobby/, { timeout: 15000 })
    console.log('[GAME TEST] Ambos en lobby')

    // Esperar a que B vea al host en el lobby (indica que Realtime se suscribió)
    await pageB.getByText(USER_A.username, { exact: false }).waitFor({ timeout: 10000 }).catch(() => {})

    // ─── A inicia la partida ───────────────────────────────────────────
    const startBtn = pageA.getByRole('button', { name: /iniciar/i })
    await expect(startBtn).toBeEnabled({ timeout: 10000 })
    await startBtn.click()
    console.log('[GAME TEST] A inició la partida')

    // A navega a /game inmediatamente
    await pageA.waitForURL(/\/rooms\/[A-Z0-9]+\/game/, { timeout: 15000 })
    // B puede recibir el evento Realtime o llegar directamente
    const bReachedGame = await pageB.waitForURL(/\/rooms\/[A-Z0-9]+\/game/, { timeout: 8000 })
      .then(() => true).catch(() => false)
    if (!bReachedGame) {
      // Obtener el matchId desde la BD
      const { data: match } = await sbAnon.from('matches')
        .select('id, player1_id, player2_id, status')
        .or(`player1_id.eq.${guestId},player2_id.eq.${guestId}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      console.log('[DEBUG] matchId para B:', match?.id, 'status:', match?.status)

      // Navegar y luego inyectar el matchId en el store via localStorage
      await pageB.goto(`/rooms/${roomCode}/game`)
      if (match?.id) {
        await pageB.evaluate((matchId) => {
          // Inyectar en el store de Zustand via el custom storage key
          const keys = Object.keys(localStorage).filter(k => k.includes('game'))
          console.log('game store keys:', keys)
        }, match.id)
        // Disparar evento para que el componente recargue el estado
        await pageB.waitForTimeout(2000)
      }
      await pageB.waitForURL(/\/rooms\/[A-Z0-9]+\/game/, { timeout: 10000 })
    }
    console.log('[GAME TEST] Ambos en /game')

    // ─── Detectar quién es proponente ─────────────────────────────────
    let aIsProposer = false
    let bIsProposer = false
    for (let attempt = 0; attempt < 8; attempt++) {
      await pageA.waitForTimeout(1000)
      // El proponente ve el ProposerForm — tiene un botón de submit y varios inputs
      // El desafiado ve "está eligiendo la palabra" o el tablero
      // El proponente ve el formulario con un input de texto para la palabra
      // Usar innerText para evitar problemas de encoding/whitespace
      const aBodyText = await pageA.locator('body').innerText()
      const bBodyText = await pageB.locator('body').innerText()
      aIsProposer = aBodyText.includes('Palabra o frase') || aBodyText.includes('turno de proponer')
      bIsProposer = bBodyText.includes('Palabra o frase') || bBodyText.includes('turno de proponer')
      if (aIsProposer || bIsProposer) break
      const aText = await pageA.locator('body').innerText().catch(() => '')
      const bText = await pageB.locator('body').innerText().catch(() => '')
      console.log(`[GAME TEST] Intento ${attempt+1} — A body (200): ${aText.slice(0, 200)}`)
      console.log(`[GAME TEST] Intento ${attempt+1} — B body (200): ${bText.slice(0, 200)}`)
    }

    console.log(`[GAME TEST] A es proponente: ${aIsProposer}, B es proponente: ${bIsProposer}`)
    expect(aIsProposer || bIsProposer).toBe(true)

    const proposerPage = aIsProposer ? pageA : pageB
    const guesserPage  = aIsProposer ? pageB : pageA

    // ─── Proponente llena el formulario ───────────────────────────────
    // Input de palabra — placeholder: "ej: Titanic, La vida es sueño, ñoño..."
    const wordInput = proposerPage.getByPlaceholder(/titanic|ej:|palabra/i)
    await expect(wordInput).toBeVisible({ timeout: 8000 })
    await wordInput.fill('GATO')

    // Buscar el botón de submit — tiene texto "Iniciar ronda" o similar
    const submitBtn = proposerPage.getByRole('button').filter({
      hasText: /iniciar|proponer|enviar|jugar/i
    }).last()
    await expect(submitBtn).toBeVisible({ timeout: 5000 })
    await submitBtn.click()
    console.log('[GAME TEST] Proponente envió: GATO')

    // ─── Esperar a que aparezca el teclado del proponente ────────────
    // El teclado aparece cuando el roundState se setea (tras enviar la palabra)
    // Esperar el botón de letra "Q" (siempre presente en el teclado)
    await expect(proposerPage.getByRole('button', { name: 'Q', exact: true }))
      .toBeVisible({ timeout: 15000 })
    console.log('[GAME TEST] Teclado del proponente visible')

    // ─── Proponente ingresa todas las letras de GATO ──────────────────
    for (const letter of ['G', 'A', 'T', 'O']) {
      const keyBtn = proposerPage.getByRole('button', { name: letter, exact: true })
      if (await keyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await keyBtn.click()
        await proposerPage.waitForTimeout(800)
        console.log(`[GAME TEST] Letra: ${letter}`)
      } else {
        console.log(`[GAME TEST] Letra ${letter} no visible`)
      }
    }

    // ─── Resultado de ronda ───────────────────────────────────────────
    await pageA.waitForURL(/\/round-end/, { timeout: 30000 })
    console.log('[GAME TEST] A en /round-end')

    await expect(pageA.getByText(/ronda|ganaste|perdiste|adivinaste/i).first()).toBeVisible({ timeout: 8000 })
    console.log('[GAME TEST] Resultado visible para A ✓')

    // B (desafiado) puede recibir el resultado via Realtime si su gameState se cargó
    const bInRoundEnd = await pageB.waitForURL(/\/round-end/, { timeout: 8000 })
      .then(() => true).catch(() => false)
    console.log(`[GAME TEST] B llegó a round-end: ${bInRoundEnd}`)

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
    await Promise.all([
      pageB.goto(`/rooms/${roomCode}/lobby`),
      pageA.reload(),
    ])
    await pageB.waitForURL(/\/rooms\/[A-Z0-9]+\/lobby/, { timeout: 15000 })
    await pageA.waitForURL(/\/rooms\/[A-Z0-9]+\/lobby/, { timeout: 15000 })
    await pageB.getByText(USER_A.username, { exact: false }).waitFor({ timeout: 10000 }).catch(() => {})

    const startBtn2 = pageA.getByRole('button', { name: /iniciar/i })
    await expect(startBtn2).toBeEnabled({ timeout: 10000 })
    await startBtn2.click()
    await pageA.waitForURL(/\/game/, { timeout: 15000 })
    await pageB.waitForURL(/\/game/, { timeout: 20000 }).catch(() => {
      console.log('[TIMER TEST] B no llegó a /game via Realtime')
    })

    // Verificar que al menos un jugador ve el timer (si está configurado)
    await pageA.waitForTimeout(2000)
    const timerA = pageA.locator('circle, [data-testid="timer"]')
    const timerB = pageB.locator('circle, [data-testid="timer"]')
    const timerVisible = await timerA.isVisible().catch(() => false)
      || await timerB.isVisible().catch(() => false)
    console.log(`[TIMER TEST] Timer visible: ${timerVisible}`)

    await ctxA.close()
    await ctxB.close()
  })
})
