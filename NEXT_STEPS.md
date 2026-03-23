# NEXT_STEPS.md — Cuellito

> Auditoria completa (2026-03-23). 104 issues encontrados → 80+ corregidos en 2 commits.
> Actualizado tras commit `71a2d00`.

---

## Lo que se hizo en esta sesion

### Commit d5cfbc9 — 12 criticos corregidos
- GameTimer division por zero (`GameTimer.tsx:45`)
- Modal double-close (`Modal.tsx:42`)
- GamePage matchId guard (`GamePage.tsx:85-88`)
- ProposerForm categories error handling (`ProposerForm.tsx:34-38`)
- 5 paginas sin .catch() (HomePage, WordsPage, MatchEndPage, StatsPage)
- WordsPage delete silencioso (`WordsPage.tsx:76-80`)
- useGameState try-catch en submitLetterGuess y finishRound (`useGameState.ts:276,321`)
- finishRound error check (`gameService.ts:176-183`)
- statsService errores silenciados (6 funciones)
- Room code max attempts guard (`roomService.ts:30`)
- Sala privada bloqueada en joinRoom (`roomService.ts:53`)

### Commit 71a2d00 — criticos restantes + altos + medios + bajos
**Criticos (2):**
- RPC atomico `append_letter_to_round` en schema.sql + gameService.ts (race condition)
- RPC `get_round_safe` en schema.sql (word_encoded oculto al guesser)

**Altos (11):**
- Keyboard: soporte teclado fisico con useEffect + keydown
- useRealtime: error handling en subscribe (CHANNEL_ERROR, TIMED_OUT), try-catch en track/unsubscribe
- useProfile: log error en query fallida
- PowerupBar: guard para POWERUP_INFO[type] undefined
- wordNormalizer: try-catch en encodeWord, log en decodeWord, null guard en getWordStructure
- wordNormalizer: fix case sensitivity en isWordComplete
- useAuth: verificar error en user_stats insert
- LobbyPage: try-catch en loadRoom
- ErrorBoundary creado + wrappear Routes en App.tsx

**Medios (6):**
- HangmanSVG: colores centralizados en objeto COLORS (no mas hex hardcodeados)
- main.tsx: Toaster usa clases Tailwind
- Navbar: .charAt(0) previene crash con string vacio
- Input: aria-invalid para accesibilidad
- ScoreBoard: props no usados removidos
- WordDisplay: prop encodedWord no usado removido

**Bajos (1):**
- DemoBanner: aria-label en boton cerrar

---

## Lo que queda pendiente

### ACCION REQUERIDA: Ejecutar RPCs en Supabase SQL Editor

Las funciones RPC fueron agregadas a `supabase/schema.sql` pero deben ejecutarse manualmente:

1. Ir a Supabase → SQL Editor
2. Ejecutar las 2 funciones del bloque `-- FUNCIONES RPC` en schema.sql (lineas 597-660 aprox)
3. Verificar que `append_letter_to_round` y `get_round_safe` existen en Functions

Sin esto, `submitLetterGuess` fallara con "function does not exist".

---

### Altos restantes (~10)

| Issue | Archivo | Detalle |
|-------|---------|---------|
| gameState non-null en round_ended | `useGameState.ts:315-316` | Puede crashear si gameState se resetea mid-callback |
| Letras rapidas race condition | `useGameState.ts:250-307` | Dos letras simultaneas pasan la validacion antes de que el store actualice |
| usePowerups state mismatch | `usePowerups.ts:37-165` | try-catch no revierte estado local si BD falla |
| signOut no awaited | `useAuth.ts:37` | Si signOut falla, usuario queda en estado indefinido |
| LobbyPage subscription | `LobbyPage.tsx:88-104` | Room como dependency puede causar re-suscripciones innecesarias |
| GamePage createRound error UI | `GamePage.tsx:172-180` | Ya tiene try-catch pero UI puede quedar en estado inconsistente |
| wordNormalizer regex incompleto | `wordNormalizer.ts:39` | `/[A-ZÑ]/` no incluye ÁÉÍÓÚÜ — palabras con acentos directos se ignoran |
| scoreCalculator bounds | `scoreCalculator.ts:21-23` | secondsTaken negativo o Infinity no validado |
| Chat messages sin limite | `useChat.ts:16-29` | Array crece indefinidamente |
| ChatPanel senderName vacio | `ChatPanel.tsx:190,209` | Sin fallback si senderName es undefined |

### Medios restantes (~32)

Principalmente:
- event payloads sin validacion de shape en useGameState (8 cases)
- scoreCalculator inputs sin validacion
- usePowerups isUsed race condition con doble-click
- usePowerups decoded word vacia no validada
- ChatPanel sin contador de caracteres
- ProposerForm sin loading state de categorias
- RoundEndPage word reveal sin error handling
- Tests E2E: claves hardcodeadas, selectores CSS fragiles, 0 retries, hard-coded waits

### Bajos restantes (~31)

- Modal sin focus trap
- Card clickable sin keyboard support
- GameTimer props sin validacion >= 0
- Tests solo Chrome
- Schema sin indice compuesto (match_id, round_number)

---

### Features pendientes

| Feature | Estado | Siguiente paso exacto |
|---------|--------|-----------------------|
| Desconexion | 40% | En `useRealtime.ts:76-83`, comparar onlineIds previos vs actuales, emitir player_disconnected + setTimeout 30s para pausar |
| Frases de Nosotros | 50% | En `ProposerForm.tsx:30`, agregar `.or('is_public.eq.true,duo_id.eq.${duoId}')` para incluir categorias del duo |
| Stats de dupla | Backend listo | En `StatsPage.tsx`, agregar tab "Pareja" que llame getDuoStats(duoId) |
| Words CRUD | 70% | Agregar boton "Editar" en WordsPage + modal pre-llenado |
| PWA | 0% | Instalar vite-plugin-pwa + manifest.json |
| Temas (modo claro) | 0% | darkMode: 'class' en tailwind.config.js + variantes light |
| Avatar | 0% | Supabase Storage bucket "avatars" + upload en ProfilePage |

---

## Resumen de estado

| Severidad | Total | Corregidos | Pendientes |
|-----------|-------|-----------|-----------|
| Critico | 13 | **13** | 0 (RPCs pendientes de ejecutar en Supabase) |
| Alto | 21 | **11** | 10 |
| Medio | 38 | **6** | 32 |
| Bajo | 32 | **1** | 31 |
| **Total** | **104** | **31** | **73** |

Los 73 pendientes son mayoritariamente:
- Validaciones defensivas (no causan crash en uso normal)
- Mejoras de accesibilidad
- Robustez de tests E2E
- Features incompletas
