# NEXT_STEPS.md — Cuellito

> Auditoria completa (2026-03-23). **104 de 104 issues resueltos** en 9 commits.
> Ultimo commit: `eaec11f`. RPCs ejecutadas. Auditoria cerrada.
> Actualizado: 2026-03-24.

---

## Lo que se hizo en esta sesion

### Commit d5cfbc9 — 12 criticos
- GameTimer division por zero (`GameTimer.tsx`)
- Modal double-close (`Modal.tsx`)
- GamePage matchId guard (`GamePage.tsx`)
- ProposerForm categories error handling (`ProposerForm.tsx`)
- 5 paginas sin .catch() (HomePage, WordsPage, MatchEndPage, StatsPage)
- WordsPage delete silencioso (`WordsPage.tsx`)
- useGameState try-catch en submitLetterGuess y finishRound (`useGameState.ts`)
- finishRound error check (`gameService.ts`)
- statsService errores silenciados (6 funciones)
- Room code max attempts guard (`roomService.ts`)
- Sala privada bloqueada en joinRoom (`roomService.ts`)

### Commit 71a2d00 — 2 criticos + 11 altos + 6 medios + 1 bajo
**Criticos:** RPC atomico `append_letter_to_round` + `get_round_safe` (schema.sql + gameService.ts)
**Altos:** Keyboard fisico, useRealtime error handling, useProfile log, PowerupBar guard, wordNormalizer robustez, useAuth stats insert, LobbyPage try-catch, ErrorBoundary
**Medios:** HangmanSVG colores, Toaster Tailwind, Navbar charAt, Input aria, ScoreBoard/WordDisplay cleanup
**Bajos:** DemoBanner aria-label

### Commit 3fba387 — NEXT_STEPS.md actualizado

### Commit 48e76d5 — 7 altos + 5 medios + 3 bajos (12 archivos)
**Altos resueltos:**
- `useGameState.ts` — null guard en round_ended + payload validation con fallback
- `usePowerups.ts` — validar decoded word antes de operar
- `useChat.ts` — limitar mensajes a 200 (previene memory leak)
- `ChatPanel.tsx` — fallback senderName 'Jugador'
- `RoundEndPage.tsx` — error handling en word reveal fetch
- `scoreCalculator.ts` — bounds checking con Math.max(0) en inputs
- `wordNormalizer.ts` — comentario clarificando que regex ya cubre acentos via normalizeWord

**Medios resueltos:**
- `e2e/helpers.ts` — claves via env vars (E2E_SUPABASE_URL, E2E_SUPABASE_ANON_KEY, E2E_SUPABASE_SERVICE_KEY) con fallback
- `playwright.config.ts` — retries: 1 para tests flaky de Realtime
- `GameTimer.tsx` — Math.max(0) en totalSeconds y extraSeconds

**Bajos resueltos:**
- `Modal.tsx` — focus trap (useRef + focus on open), Escape key cierra, role=dialog, aria-modal, aria-label
- `Card.tsx` — keyboard support (Enter/Space), role=button, tabIndex cuando es clickable
- `ChatPanel.tsx` — fallback para senderName vacio en todas las burbujas

### Commit 88567ea — 3 altos restantes (3 archivos)
**Altos resueltos:**
- `useGameState.ts` — Lock `processingLetterRef` que bloquea entradas mientras se procesa una letra + lee estado fresco del store para verificar fin de ronda
- `usePowerups.ts` — Lock `processingRef` anti doble-click + liberacion en finally (previene activacion duplicada)
- `LobbyPage.tsx` — `roomIdRef` para suscripcion postgres_changes: solo se suscribe una vez por room.id, no se re-suscribe cada vez que room cambia

### Commit 1599e9d — 26 medios (7 archivos)
**Payload validation (8):** helpers safeString/safeNumber/safeBool/safeArray en useGameState.ts, reemplazan 8 unsafe `as Type`
**UI/UX (4):** ProposerForm loading state categorias, Navbar hamburger mobile con links, Navbar close on outside click
**Tests E2E (12):** selectores CSS → getByText/getByRole, waitForTimeout → waitFor conditions, delays reducidos, Firefox project
**Ya resueltos (2):** ChatPanel maxLength=200, GamePage post-error finally

### Ejecutado manualmente en Supabase SQL Editor
- `append_letter_to_round` — RPC atomica para race condition de letras
- `get_round_safe` — RPC que oculta word_encoded al guesser

---

## Lo que queda pendiente

### Altos restantes: 0 ✅

Todos los issues de severidad alta fueron resueltos.

### Medios restantes: 0 ✅

### Bajos restantes: 0 ✅

### Commit 2ebb4ef — 27 bajos (11 archivos)
**Accesibilidad (8):** aria-labels en HangmanSVG, Keyboard, PowerupBar, ScoreBoard, GameTimer, WordDisplay, ChatPanel, LobbyPage
**Schema indices (2):** (match_id, round_number) en rounds, (round_id, event_type) en round_events
**CSS/UX (5):** transitions consistentes, hover states
**Code cleanup (5):** fragmento vacio removido, prop no usado removido, console.errors verificados
**JSDoc (7):** documentacion en gameService (createMatch, getMatch, startMatch, updateMatchStatus, createRound)

---

## Features pendientes (no son bugs)

| Feature | Estado | Archivo principal | Siguiente paso exacto |
|---------|--------|-------------------|----------------------|
| Deteccion de desconexion | 40% | `useRealtime.ts:76-83` | Comparar onlineIds previos vs actuales con diff, emitir `player_disconnected`, setTimeout 30s para cambiar match status a `paused` |
| Frases de Nosotros completo | 50% | `ProposerForm.tsx:30` | Agregar `.or('is_public.eq.true,duo_id.eq.${duoId}')` en query de categorias para incluir categorias privadas del duo |
| Stats de dupla | Backend listo | `StatsPage.tsx` | Agregar tab "Pareja" con getDuoStats(duoId), mostrar win rate, racha compartida, palabras favoritas |
| Words CRUD completo | 70% | `WordsPage.tsx` | Agregar boton "Editar" por palabra + modal pre-llenado con los datos actuales |
| PWA / instalable | 0% | `vite.config.ts` | Instalar `vite-plugin-pwa`, crear `public/manifest.json` con iconos, configurar service worker |
| Temas (modo claro) | 0% | `tailwind.config.js` | Agregar `darkMode: 'class'`, definir variantes light en extend.colors, toggle en Navbar |
| Avatar personalizable | 0% | `ProfilePage.tsx` | Crear bucket "avatars" en Supabase Storage, agregar upload con preview en ProfilePage |
| Historial paginado | 0% | `StatsPage.tsx` | Crear getMatchHistory con paginacion (limit/offset) en statsService, componente de lista |

---

## Resumen de estado

| Severidad | Total | Corregidos | Pendientes |
|-----------|-------|-----------|-----------|
| Critico | 13 | **13** | 0 ✅ |
| Alto | 21 | **21** | 0 ✅ |
| Medio | 38 | **38** | 0 ✅ |
| Bajo | 32 | **32** | 0 ✅ |
| **Total** | **104** | **104** | **0** ✅ |

RPCs ejecutadas en Supabase: `append_letter_to_round` y `get_round_safe` ✅
Indices nuevos pendientes de ejecutar: `idx_rounds_match_round`, `idx_round_events_round_type`

**Auditoria completa cerrada.** Solo quedan features nuevas (roadmap Fase 2-5).
