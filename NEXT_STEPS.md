# NEXT_STEPS.md — Cuellito

> Auditoria completa de codigo (2026-03-23). 104 issues encontrados. 12 criticos corregidos.
> Cada item indica que se hizo, que falta, en que archivo y el siguiente paso exacto.

---

## Lo que ya se hizo

### MVP completo y desplegado
- Auth (registro, login, logout) via Supabase Auth
- 13 paginas funcionales con routing protegido (RequireAuth)
- 6 modos de juego configurados en `src/utils/constants.ts`
- Ronda completa en tiempo real: proponente elige palabra → desafiado adivina por chat
- 6 comodines implementados
- Scoring dinamico: 100 base, +10/correcta, -15/error, -10/powerup, +50 velocidad
- Teclado QWERTY+Ñ, HangmanSVG animado, Chat en vivo
- Estadisticas individuales y de pareja (tablas y servicios)
- Perfil editable, gestion de palabras, modo demo
- Suite E2E con 20 tests, deploy automatico en Vercel

### Bugs corregidos en commits anteriores
- `daaa18e` — sistema de contexto persistente
- `09811f2` — bugs 7, 13, 14 y timeout de ronda
- `13e29e1` — boton iniciar partida
- `44f5bb9` — bugs medios y de UX
- `20fa5cb` — 8 bugs criticos de juego multijugador

### Criticos corregidos en esta sesion (12 de 13)

| # | Issue | Archivo | Fix aplicado |
|---|-------|---------|-------------|
| 09 | GameTimer division por zero | `GameTimer.tsx:45` | Guard `total > 0 ? timeLeft/total : 0` + `Math.max(0, prev-1)` |
| 10 | Modal double-close | `Modal.tsx:42` | `e.stopPropagation()` en boton cerrar |
| 08 | GamePage matchId undefined | `GamePage.tsx:85-88` | useEffect guard que redirige a /home |
| 11 | ProposerForm sin error handling | `ProposerForm.tsx:34-38` | Chequeo de `error` en respuesta de Supabase |
| 07a | HomePage Promise.all sin catch | `HomePage.tsx:39-41` | `.catch()` agregado |
| 07b | WordsPage Promise.all sin catch | `WordsPage.tsx:42-47` | `.catch()` + `.finally()` + toast.error |
| 07c | WordsPage delete silencioso | `WordsPage.tsx:76-80` | Chequeo de `error` antes de actualizar UI |
| 07d | MatchEndPage sin try-catch | `MatchEndPage.tsx:33-91` | try-catch completo en update() + error check en match UPDATE |
| 07e | StatsPage sin catch | `StatsPage.tsx:20-22` | `.catch()` agregado |
| 13+03 | useGameState sin try-catch | `useGameState.ts:276,321` | try-catch en submitLetterGuess y finishRound |
| 02 | finishRound sin error check | `gameService.ts:176-183` | `if (error) throw error` despues de UPDATE |
| 12 | statsService errores silenciados | `statsService.ts` (6 funciones) | console.error en bailouts + throw/log en updates |
| 06 | Room code sin max attempts | `roomService.ts:30` | Guard `if (attempts >= 5) throw Error` |
| 05 | Sala privada sin control | `roomService.ts:53` | `.eq('is_private', false)` en joinRoom |

---

## Lo que queda pendiente

---

### CRITICO-01: Race condition en submitLetterGuess (NO corregido)

- **Estado:** Bug activo en produccion
- **Donde:** `src/features/game/services/gameService.ts:134-152`
- **Problema:** SELECT + UPDATE no es atomico. Dos clientes simultaneos pueden perder letras.
- **Por que no se corrigio:** Requiere crear una funcion RPC en PostgreSQL (`array_append` atomico) y modificar `schema.sql`. Es un cambio de BD, no solo de frontend.
- **Siguiente paso exacto:** Crear funcion RPC en `schema.sql`:
  ```sql
  CREATE OR REPLACE FUNCTION append_letter(p_round_id UUID, p_letter TEXT, p_correct BOOLEAN)
  RETURNS void AS $$
  BEGIN
    IF p_correct THEN
      UPDATE rounds SET correct_letters = array_append(correct_letters, p_letter), updated_at = NOW()
      WHERE id = p_round_id;
    ELSE
      UPDATE rounds SET wrong_letters = array_append(wrong_letters, p_letter),
        errors_count = errors_count + 1, updated_at = NOW()
      WHERE id = p_round_id;
    END IF;
  END;
  $$ LANGUAGE plpgsql;
  ```
  Luego reemplazar SELECT+UPDATE en `gameService.ts:134-152` por `supabase.rpc('append_letter', {...})`.

---

### CRITICO-04: word_encoded visible al guesser (NO corregido)

- **Estado:** Vulnerabilidad de seguridad activa
- **Donde:** `supabase/schema.sql` (politicas RLS de rounds)
- **Problema:** RLS permite SELECT de toda la fila incluyendo word_encoded. El guesser puede decodificar con `atob()` desde la consola del browser.
- **Por que no se corrigio:** Requiere cambio de schema (funcion RPC o tabla separada) + deploy en Supabase.
- **Siguiente paso exacto:** Crear funcion RPC `get_round_for_guesser(round_id)` que retorne todos los campos EXCEPTO word_encoded. O mover word_encoded a tabla `round_secrets` con RLS solo para proposer.

---

### ALTO: 21 issues identificados (NO corregidos)

Resumen por categoria:

**Error handling en hooks (6):**
- `useGameState.ts:315-316` — gameState asumido non-null en round_ended
- `useGameState.ts:250-307` — letras rapidas causan race condition
- `useRealtime.ts:89-93` — subscribe() no maneja CHANNEL_ERROR/TIMED_OUT
- `usePowerups.ts:37-165` — try-catch no previene mismatch estado local/BD
- `useAuth.ts:29-46` — signOut no awaited si profile creation falla
- `useProfile.ts:12-19` — query falla → loading infinito

**Error handling en servicios (3):**
- `wordNormalizer.ts:80` — btoa() crash sin try-catch
- `wordNormalizer.ts:88-91` — decode falla → retorna "" silenciosamente
- `statsService.ts:45-46,84-85,107-108` — stats row missing → bailout (parcialmente corregido con logs)

**Error handling en paginas (3):**
- `LobbyPage.tsx:62` — getRoomByCode rejection no capturada
- `LobbyPage.tsx:101-103` — subscription memory leak
- `GamePage.tsx:172-180` — createRound error → UI transiciona sin round

**Componentes (3):**
- `Keyboard.tsx` — sin soporte de teclado fisico (accesibilidad)
- `PowerupBar.tsx:66-67` — POWERUP_INFO[type] undefined → crash
- `ScoreBoard.tsx:11-12` — props myAvatar/opponentAvatar declarados pero no usados

**Siguiente paso exacto:** Priorizar `wordNormalizer.ts` (btoa crash) y `Keyboard.tsx` (accesibilidad). El btoa crash es 1 linea de try-catch. El teclado fisico es un useEffect con keydown listener.

---

### MEDIO: 38 issues identificados (NO corregidos)

Categorias principales:
- **Error handling inconsistente (12):** gameService funciones retornan null en vez de throw, event payloads sin validacion de shape, sendEvent sin error handling
- **Logica de juego (8):** case sensitivity bugs en wordNormalizer, regex incompleto para acentos (falta ÁÉÍÓÚÜ), scoreCalculator sin bounds checking
- **UI/UX (8):** colores hardcodeados en HangmanSVG y main.tsx (viola regla CLAUDE.md), sin loading state en ProposerForm categories, Navbar empty string crash
- **Memoria/Performance (5):** chat messages array sin limite, auto-scroll sin debounce
- **Tipos/Seguridad (5):** App.tsx demo cast a any, db export como any, store actualiza local sin confirmar server

**Siguiente paso exacto:** Arreglar los colores hardcodeados en `HangmanSVG.tsx:28-34` y `main.tsx:17-28` (viola regla explicita de CLAUDE.md). Luego el regex de acentos en `wordNormalizer.ts:39`.

---

### BAJO: 32 issues identificados (NO corregidos)

- Accesibilidad: Modal sin focus trap, Card sin keyboard support, aria-labels faltantes
- Tipos: props no usados en ScoreBoard/WordDisplay, validaciones de runtime
- Performance: tests solo Chrome, sin indice compuesto en schema

---

### Features pendientes (sin bugs, solo incompletas)

| Feature | Estado | Archivo principal | Siguiente paso |
|---------|--------|-------------------|---------------|
| Desconexion | 40% — infra lista, logica ausente | `useRealtime.ts` | Implementar deteccion de salida de presencia + countdown 30s |
| Frases de Nosotros | 50% — modo configurado | `ProposerForm.tsx`, `WordsPage.tsx` | Filtrar categorias/palabras por duo |
| Stats de dupla | Backend listo, UI ausente | `StatsPage.tsx` | Agregar tab "Pareja" que llame getDuoStats() |
| Words CRUD | 70% — falta editar/filtrar | `WordsPage.tsx` | Agregar boton "Editar" + modal pre-llenado |
| Error Boundary | 0% | crear `ErrorBoundary.tsx` | Class component con componentDidCatch |
| PWA | 0% | `vite.config.ts`, `public/` | vite-plugin-pwa + manifest.json |
| Temas (modo claro) | 0% | `tailwind.config.js` | darkMode: 'class' + variantes light |
| Avatar | 0% | `ProfilePage.tsx` | Supabase Storage bucket + upload |

---

## Deuda tecnica

| Item | Donde | Impacto |
|------|-------|---------|
| Race condition letras | `gameService.ts:134-152` | **Critico** — requiere RPC en BD |
| word_encoded visible | `schema.sql` RLS | **Critico** — requiere cambio de schema |
| 0 Error Boundaries | `App.tsx` | Alto — crash = pantalla blanca |
| Claves hardcodeadas | `e2e/helpers.ts:5-6` | Alto — SERVICE_ROLE_KEY en codigo |
| Tests contra prod | `playwright.config.ts:11` | Medio — sin staging |
| 0 retries en tests | `playwright.config.ts:8` | Medio — Realtime flaky |
| Colores hardcodeados | `HangmanSVG.tsx`, `main.tsx` | Medio — viola regla CLAUDE.md |
| word_encoded base64 | `wordNormalizer.ts` | Medio — no es encriptacion |
| as any x2 | `App.tsx:56`, `supabase.ts:32` | Bajo — documentado |

---

## Plan de accion siguiente

1. **Commit y deploy** de los 12 fixes criticos (esta sesion)
2. **RPC atomico** para submitLetterGuess (requiere acceso a Supabase SQL Editor)
3. **Error Boundary** — 1 archivo nuevo, ~20 min
4. **wordNormalizer btoa try-catch** — 1 linea
5. **Teclado fisico** en Keyboard.tsx — 1 useEffect
6. **Colores hardcodeados** en HangmanSVG y main.tsx — alinear con Tailwind
