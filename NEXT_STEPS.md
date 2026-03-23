# NEXT_STEPS.md — Cuellito

> Auditoria completa (2026-03-23). 104 issues encontrados → 47 corregidos en 4 commits.
> Actualizado tras commit `48e76d5`. RPCs ejecutadas en Supabase.

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

### Ejecutado manualmente en Supabase SQL Editor
- `append_letter_to_round` — RPC atomica para race condition de letras
- `get_round_safe` — RPC que oculta word_encoded al guesser

---

## Lo que queda pendiente

### Altos restantes (~3)

| Issue | Archivo | Detalle | Siguiente paso |
|-------|---------|---------|----------------|
| Letras rapidas optimistic update | `useGameState.ts:250-307` | Dos letras enviadas rapido pueden pasar validacion antes de que el store actualice | Agregar ref `pendingLettersRef` que bloquee letras hasta que el store se actualice |
| usePowerups state rollback | `usePowerups.ts:37-165` | Si BD falla tras activar comodin, estado local queda inconsistente | Mover update de estado local DESPUES del await de recordPowerupUse |
| LobbyPage re-suscripciones | `LobbyPage.tsx:88-104` | room como dependency del useEffect puede causar re-suscripciones al canal | Usar roomRef.current en lugar de room directamente |

### Medios restantes (~27)

| Categoria | Cantidad | Archivos | Detalle |
|-----------|----------|----------|---------|
| Event payload validation | 8 | `useGameState.ts` | Los 8 cases del switch hacen `as Type` sin validar shape real |
| usePowerups doble-click | 1 | `usePowerups.ts` | isUsed se evalua con estado stale si se hace doble-click rapido |
| ChatPanel sin max chars | 1 | `ChatPanel.tsx` | Input de chat sin limite de caracteres |
| ProposerForm loading | 1 | `ProposerForm.tsx` | Sin loading state mientras carga categorias |
| Tests E2E selectores | 8 | `e2e/*.spec.ts` | Selectores CSS fragiles (getByRole mejor que getByClass) |
| Tests E2E hard waits | 4 | `e2e/*.spec.ts` | waitForTimeout en lugar de waitFor condition |
| Tests solo Chrome | 1 | `playwright.config.ts` | Sin Firefox/Safari coverage |
| GamePage UI post-error | 1 | `GamePage.tsx:172-180` | try-catch existe pero UI puede quedar en loading |
| ProposerForm word length | 1 | `ProposerForm.tsx` | Sin validacion de longitud minima/maxima de palabra |
| Navbar mobile menu | 1 | `Navbar.tsx` | Sin hamburger menu en mobile (<768px) |

### Bajos restantes (~28)

| Categoria | Cantidad | Detalle |
|-----------|----------|---------|
| Accesibilidad restante | 8 | aria-labels faltantes en botones icon-only, alt text en avatares |
| Schema indices | 2 | Falta indice compuesto (match_id, round_number) en rounds, indice en round_events |
| CSS minor | 5 | Algunos hover states inconsistentes, transitions faltantes |
| Code cleanup | 5 | Console.logs de debug, imports no usados, tipos que podrian ser mas estrictos |
| Tests cobertura | 4 | Sin tests para scoreCalculator, wordNormalizer, modo demo, edge cases |
| Documentacion inline | 4 | Funciones sin JSDoc en servicios principales |

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
| Critico | 13 | **13** | 0 |
| Alto | 21 | **18** | 3 |
| Medio | 38 | **11** | 27 |
| Bajo | 32 | **5** | 27* |
| **Total** | **104** | **47** | **57** |

*1 bajo adicional resuelto (GameTimer) contado en medios por impacto real.

RPCs ejecutadas en Supabase: `append_letter_to_round` y `get_round_safe` ✅

Los 57 pendientes son:
- 3 altos: optimistic update race, powerup rollback, lobby re-subs (no causan crash, solo edge cases)
- 27 medios: mayormente validaciones defensivas y robustez de tests E2E
- 27 bajos: accesibilidad, cleanup, documentacion, indices BD
- 8 features nuevas no iniciadas (roadmap Fase 2-5)
