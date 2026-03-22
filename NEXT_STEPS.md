# NEXT_STEPS.md — Cuellito

> Estado real del proyecto derivado de auditoria de codigo (2026-03-22).
> Cada item indica que se hizo, que falta, en que archivo y el siguiente paso exacto.

---

## Lo que ya se hizo (confirmado en codigo y commits)

### MVP completo y desplegado
- Auth (registro, login, logout) via Supabase Auth
- 13 paginas funcionales con routing protegido (RequireAuth)
- 6 modos de juego configurados en `src/utils/constants.ts`
- Ronda completa en tiempo real: proponente elige palabra → desafiado adivina por chat
- 6 comodines implementados (reveal_letter, eliminate_wrong, extra_hint, shield, show_structure, time_freeze)
- Scoring dinamico: 100 base, +10/correcta, -15/error, -10/powerup, +50 velocidad
- Teclado QWERTY+N con estados visuales
- HangmanSVG animado con Framer Motion
- Chat en vivo entre jugadores
- Estadisticas individuales persistentes (user_stats)
- Estadisticas de pareja (duo_stats) — tabla y servicio existen
- Perfil editable (username, display_name, bio)
- Gestion de palabras (crear, listar, eliminar)
- Modo demo interactivo y jugable sin Supabase (`/demo`)
- 12 categorias del sistema pre-cargadas en BD
- Suite E2E con 20 tests (4 archivos)
- Deploy automatico en Vercel desde `main`
- Chunks de build optimizados en `vite.config.ts`

### Bugs corregidos (ultimos commits)
- `09811f2` — bugs 7, 13, 14 y timeout de ronda
- `13e29e1` — boton iniciar partida cuando guest_id existe en BD
- `44f5bb9` — bugs medios y de UX
- `20fa5cb` — 8 bugs criticos de juego multijugador

### Sistema de contexto creado (sin commitear, adoptado como oficial)
- `CLAUDE.md` — instrucciones para el asistente (stack, reglas, paleta, estructura)
- `AGENTS.md` — prompt de continuidad completo (reemplazo contenido de proyecto anterior que tenia datos del portfolio-ingeniero)
- `PROJECT_CONTEXT.md` — estado del desarrollo, BD, rutas, servicios, stores
- `NEXT_STEPS.md` — este archivo
- **Decision tomada (2026-03-22):** estos 4 archivos son el sistema de contexto oficial del proyecto
- **Verificacion completa:** estructura de archivos, logica de juego, BD, rutas, servicios, paleta de colores — todo alineado con el codigo real. Se corrigieron nombres de funciones en PROJECT_CONTEXT.md y se agregaron 7 tokens de color faltantes en CLAUDE.md y AGENTS.md

---

## Lo que queda pendiente (priorizado)

---

### CRITICO: Logica de desconexion no implementada

- **Estado:** 40% — infraestructura lista, logica ausente
- **Que se hizo:**
  - Constantes definidas: `DISCONNECT_PAUSE_SECONDS=30`, `DISCONNECT_ABANDON_SECONDS=600` en `src/utils/constants.ts:38-39`
  - Eventos definidos: `player_disconnected`, `player_reconnected` en `src/features/game/hooks/useRealtime.ts:15-16`
  - Presencia Supabase tracked: `useRealtime.ts:75-87` recolecta `onlineIds`
  - BD soporta estados `paused` y `abandoned` en enum `match_status`
- **Que falta:**
  - Disparar evento `player_disconnected` cuando un jugador sale del canal Realtime
  - Implementar countdown de 30s antes de pausar la partida
  - Implementar abandono automatico a los 600s
  - UI "Jugador reconectando..." con countdown visual
  - Logica de reanudacion cuando el jugador vuelve
  - Recuperacion de estado de sesion (actualmente el juego queda colgado)
- **Archivos:**
  - `src/features/game/hooks/useRealtime.ts` — agregar logica de disparo de eventos en `handlePresenceUpdate`
  - `src/pages/GamePage.tsx` — escuchar eventos de desconexion y mostrar UI de pausa
  - `src/features/game/services/gameService.ts` — funcion para pausar/reanudar partida en BD
- **Siguiente paso exacto:** En `useRealtime.ts`, dentro del handler de presencia (~linea 80), comparar `onlineIds` previos vs actuales. Si un jugador desaparece, llamar `sendEvent('player_disconnected', { userId })` e iniciar un `setTimeout` de 30s que llame `updateMatchStatus(matchId, 'paused')`.

---

### ALTA: Modo "Frases de Nosotros" incompleto

- **Estado:** 50% — modo configurado, flujo de juego no diferenciado
- **Que se hizo:**
  - Modo `our_phrases` definido en `GAME_MODE_CONFIG` (4 rondas, 7 errores, 3 comodines)
  - BD soporta palabras por pareja: `word_entries.duo_id` y `categories.duo_id` existen con indices
  - Categorias seed incluyen "Frases de Nosotros" (emoji 💑, is_system=false, is_public=false) y "Recuerdos" (📸)
  - Duos se crean automaticamente al iniciar partida: `src/pages/LobbyPage.tsx:117-128` llama `getOrCreateDuo()`
- **Que falta:**
  - `ProposerForm` no filtra por duo: `src/features/game/components/ProposerForm.tsx:28-35` carga solo categorias publicas (`is_public=true`), no incluye las del duo
  - `createRound()` no diferencia modo: `src/features/game/services/gameService.ts:55-87` trata todos los modos igual
  - `WordsPage` no muestra palabras compartidas del duo: `src/pages/WordsPage.tsx:40-44` solo filtra por `created_by === user.id`
  - No hay UI para crear/ver colecciones privadas de la pareja
- **Archivos:**
  - `src/features/game/components/ProposerForm.tsx:28-35` — agregar query `.or('is_public.eq.true,duo_id.eq.${duoId}')`
  - `src/pages/WordsPage.tsx:40-44` — agregar tab/filtro para palabras del duo
  - `src/features/game/services/gameService.ts:55-87` — validar que en modo `our_phrases` solo se usen palabras del duo
- **Siguiente paso exacto:** En `ProposerForm.tsx`, modificar la query de categorias (linea 30) para incluir categorias del duo actual. Requiere recibir `duoId` como prop desde `GamePage` → `ProposerForm`.

---

### ALTA: Error Boundary inexistente

- **Estado:** 0% — no hay ningun Error Boundary en el proyecto
- **Que se hizo:** Nada. Si un componente crashea, la app entera se rompe sin feedback al usuario.
- **Que falta:**
  - Crear componente `ErrorBoundary` con fallback UI
  - Wrappear `App.tsx` o las rutas criticas (especialmente `GamePage`)
  - Manejo de errores inconsistente en servicios: `gameService.ts` y `roomService.ts` hacen `throw error` sin try/catch; las paginas lo manejan con toast a veces si y a veces no
- **Archivos:**
  - Crear `src/components/shared/ErrorBoundary.tsx`
  - `src/App.tsx` — wrappear rutas con ErrorBoundary
  - `src/features/game/services/gameService.ts` — considerar wrapping consistente
- **Siguiente paso exacto:** Crear `src/components/shared/ErrorBoundary.tsx` como class component con `componentDidCatch`, mostrar pantalla de "Algo salio mal" con boton de reintentar. Luego wrappear `<Routes>` en `App.tsx` con este componente.

---

### ALTA: Tests E2E fragiles y con gaps de cobertura

- **Estado:** 20 tests funcionan, pero con problemas estructurales
- **Que se hizo:**
  - 4 suites: auth (8 tests), navigation (8), room (3), game (2)
  - Cuentas QA dedicadas: `qa_a@cuellito.test`, `qa_b@cuellito.test` en `e2e/helpers.ts`
  - Helpers para signup, signin, toast detection
- **Problemas encontrados:**
  - **Claves hardcodeadas:** `SUPABASE_SERVICE_ROLE_KEY` (bypass RLS) en `e2e/helpers.ts:5-6` — deberian ser env vars
  - **0 retries** en `playwright.config.ts:8` — tests de Realtime son inherentemente flaky
  - **Hard-coded waits:** `waitForTimeout(1500)`, `waitForTimeout(2000)`, `waitForTimeout(3000)` en `e2e/04-game.spec.ts` en vez de esperar condiciones
  - **Selectores fragiles:** `span.font-mono`, `span[class*="tracking-widest"]` en `e2e/03-room.spec.ts:17,47` — se rompen al cambiar estilos
  - **Race condition documentada:** en `e2e/04-game.spec.ts:49-74`, B no recibe evento Realtime y el test inyecta matchId via `localStorage + page.evaluate` como workaround
  - **Solo Chrome:** `playwright.config.ts:17-20` solo tiene proyecto `chromium`
- **Que NO se testea:**
  - Comodines (0 tests)
  - Chat (0 tests)
  - Multi-ronda / swap de roles (solo 1 ronda testeada)
  - Match end (0 tests)
  - Modo demo (0 tests)
  - Scoring (0 tests)
  - Palabras CRUD (0 tests)
  - Estadisticas (solo navegacion, no datos)
  - Mobile viewport (0 tests)
  - Errores de red / Supabase caido (0 tests)
- **Archivos:**
  - `e2e/helpers.ts:5-6` — mover claves a env vars
  - `playwright.config.ts:8` — agregar `retries: 1` minimo
  - `e2e/04-game.spec.ts` — reemplazar `waitForTimeout` por `waitForSelector` o `expect().toBeVisible()`
  - `e2e/03-room.spec.ts:17,47` — usar `data-testid` en vez de clases CSS
- **Siguiente paso exacto:** Mover `SUPABASE_SERVICE_ROLE_KEY` y `VITE_SUPABASE_ANON_KEY` de `e2e/helpers.ts` a variables de entorno (`process.env`). Luego agregar `retries: 1` en `playwright.config.ts`.

---

### MEDIA: Estadisticas de dupla sin UI

- **Estado:** Backend listo, frontend ausente
- **Que se hizo:**
  - Tabla `duo_stats` existe en BD con: total_matches, player1/2_wins, shared_streak, avg_match_duration
  - `statsService.ts` exporta `getDuoStats(duoId)` (linea 10-14) y `updateDuoStatsAfterMatch()` — funciones completas
  - `StatsPage.tsx` muestra stats individuales completas: matches, rounds, letras, streaks, powerups, tiempos
- **Que falta:**
  - No hay seccion de "Estadisticas de pareja" en `StatsPage.tsx`
  - No se llama `getDuoStats()` desde ninguna pagina
  - No hay graficos ni visualizacion temporal (solo cards de texto)
  - No hay historial de partidas (tabla `matches` tiene los datos, `getMatchHistory()` existe en gameService pero no se usa en UI)
- **Archivos:**
  - `src/pages/StatsPage.tsx` — agregar tab/seccion para duo stats
  - `src/features/stats/services/statsService.ts:10-14` — `getDuoStats` ya existe, solo falta llamarlo
  - `src/features/game/services/gameService.ts` — `getMatchHistory()` ya existe, falta UI
- **Siguiente paso exacto:** En `StatsPage.tsx`, agregar un toggle "Individual / Pareja". Cuando se seleccione "Pareja", llamar `getDuoStats(duoId)` y renderizar los campos de `DuoStats`. Requiere obtener el `duoId` del usuario actual (query a tabla `duos`).

---

### MEDIA: Words page — CRUD incompleto

- **Estado:** 70% — crear y eliminar funcionan, editar y filtrar no
- **Que se hizo:**
  - Crear palabra: modal con word, hint, category, difficulty, public flag (`src/pages/WordsPage.tsx:166-209`)
  - Listar: palabras del usuario actual (`WordsPage.tsx:40-44`, query `created_by === user.id`)
  - Eliminar: boton con handler (`WordsPage.tsx:76-80, 146-155`)
- **Que falta:**
  - **Editar:** No hay boton ni modal de edicion — una vez creada, la palabra no se puede modificar
  - **Filtros:** No se puede buscar por texto, filtrar por categoria ni por dificultad
  - **Palabras del duo:** No se muestran palabras compartidas de la pareja (ver item "Frases de Nosotros")
  - **Categorias custom:** No se pueden crear categorias nuevas (solo seleccionar las existentes)
- **Archivos:**
  - `src/pages/WordsPage.tsx` — agregar boton "Editar" en cada card, reutilizar modal de creacion en modo edicion
- **Siguiente paso exacto:** Agregar un boton "Editar" junto al boton "Eliminar" en cada WordCard. Al hacer click, abrir el modal de creacion pre-llenado con los datos actuales y hacer `update` en vez de `insert`.

---

### BAJA: PWA / instalable en movil

- **Estado:** 0%
- **Que se hizo:** Nada. El juego es responsive pero no instalable.
- **Que falta:** manifest.json, service worker, iconos en multiples tamanos, offline fallback
- **Archivos:** Crear `public/manifest.json`, agregar plugin `vite-plugin-pwa` en `vite.config.ts`, generar iconos en `public/`
- **Siguiente paso exacto:** Instalar `vite-plugin-pwa`, configurarlo en `vite.config.ts` con nombre "Cuellito", color `#0F0F1A`, y generar manifest + service worker automatico.

---

### BAJA: Temas visuales (modo claro)

- **Estado:** 0%
- **Que se hizo:** Paleta dark definida en `tailwind.config.js` con 17 tokens de color.
- **Que falta:** Sistema de temas (dark/light), preferencia persistida, toggle en UI
- **Archivos:** `tailwind.config.js`, `src/index.css`, posible `src/stores/themeStore.ts`
- **Siguiente paso exacto:** Agregar clase `dark` al sistema de Tailwind (`darkMode: 'class'` en config), definir variantes light de cada token, crear store con persistencia en localStorage.

---

### BAJA: Avatar personalizable

- **Estado:** 0%
- **Que se hizo:** ProfilePage muestra iniciales como avatar badge. Campo `avatar_url` existe en tabla `profiles`.
- **Que falta:** Upload de imagen, Supabase Storage bucket, crop/resize, fallback
- **Archivos:** `src/pages/ProfilePage.tsx`, crear bucket en Supabase Storage
- **Siguiente paso exacto:** Crear bucket "avatars" en Supabase Storage con policy publica de lectura. Luego agregar input file en ProfilePage que suba la imagen y actualice `avatar_url` en `profiles`.

---

### BAJA: Rankings y torneos (3+ jugadores)

- **Estado:** 0% — Fase 5 del roadmap
- **Archivos:** Requiere nuevas tablas, servicios, paginas. Cambio arquitectural mayor.
- **Siguiente paso exacto:** Disenar schema de torneos (tabla `tournaments`, `tournament_participants`, `tournament_matches`) antes de implementar.

---

### BAJA: Edge Functions para anti-trampa

- **Estado:** 0% — Fase 5 del roadmap
- **Que se hizo:** Toda la logica de scoring y validacion corre client-side (`src/utils/scoreCalculator.ts`, `src/features/game/services/gameService.ts`)
- **Que falta:** Mover `submitLetterGuess`, `finishRound` y scoring a Supabase Edge Functions
- **Archivos:** Crear `supabase/functions/`, modificar servicios frontend
- **Siguiente paso exacto:** Crear Edge Function `submit-letter` que reciba roundId + letra, valide contra `word_encoded` server-side, y retorne resultado. Luego modificar `gameService.submitLetterGuess` para llamar a la function en vez de hacer la logica local.

---

## Deuda tecnica detallada

| Item | Donde | Detalle | Impacto |
|------|-------|---------|---------|
| Sin Error Boundary | `src/App.tsx` | Si un componente crashea, app entera muere sin feedback | Alto |
| Claves en codigo | `e2e/helpers.ts:5-6` | `SUPABASE_SERVICE_ROLE_KEY` hardcodeada (bypass RLS) | Alto (seguridad) |
| Tests contra prod | `playwright.config.ts:11` | baseURL apunta a produccion, no hay staging | Medio |
| 0 retries en tests | `playwright.config.ts:8` | Realtime tests son flaky por naturaleza | Medio |
| Tests solo Chrome | `playwright.config.ts:17-20` | Sin cobertura Firefox/Safari | Medio |
| Hard-coded waits | `e2e/04-game.spec.ts` | `waitForTimeout(1500-3000)` en vez de condiciones | Medio |
| Selectores CSS fragiles | `e2e/03-room.spec.ts:17,47` | `span.font-mono`, `span[class*="tracking-widest"]` | Medio |
| Desconexion no funciona | `src/features/game/hooks/useRealtime.ts` | Constantes definidas pero logica no implementada | Medio |
| eslint-disable (7) | Varios archivos | 5x `react-hooks/exhaustive-deps`, 2x `no-explicit-any` | Bajo |
| `as any` (2) | `src/App.tsx:56`, `src/lib/supabase.ts:32` | Limitacion de tipos Supabase SDK v2 — documentado | Bajo |
| word_encoded base64 | `src/utils/wordNormalizer.ts` | No es encriptacion, depende de RLS | Bajo (MVP) |
| Logica client-side | `src/utils/scoreCalculator.ts` | Scoring manipulable por cliente | Bajo (MVP) |
| Sin monitoring | Global | No hay APM, error tracking ni analytics | Bajo |
| 0 console.log debug | Global | Codigo limpio — 2 `console.error` legitimos en catch blocks | OK |
| 0 TODO/FIXME | Global | No hay deuda marcada en codigo | OK |

---

## Archivos sin commitear

| Archivo | Estado | Accion sugerida |
|---------|--------|----------------|
| `CLAUDE.md` | Nuevo (untracked) | Commitear — instrucciones del asistente |
| `AGENTS.md` | Nuevo (reescrito, reemplazo contenido anterior) | Commitear — prompt de continuidad |
| `PROJECT_CONTEXT.md` | Nuevo (untracked) | Commitear — contexto del proyecto |
| `NEXT_STEPS.md` | Nuevo (untracked) | Commitear — este archivo |

## Decisiones pendientes

| Decision | Contexto | Impacto |
|----------|----------|---------|
| Eliminar `README.md` | Commiteado en `c9dcf80`. Info cubierta por PROJECT_CONTEXT.md y CLAUDE.md. Pero es documentacion publica (capturas, guia de uso) — podria valer mantenerlo como cara publica del repo | Bajo |
| Eliminar `DEPLOY.md` | No commiteado. Guia de deploy + roadmap de 5 fases. Info cubierta por AGENTS.md (roadmap) y PROJECT_CONTEXT.md (deploy). Pero tiene troubleshooting especifico de Supabase que no esta en otro lado | Bajo |

---

## Siguiente paso recomendado

**Paso inmediato:** Commitear los 4 archivos de contexto (`CLAUDE.md`, `AGENTS.md`, `PROJECT_CONTEXT.md`, `NEXT_STEPS.md`) y decidir si eliminar README.md/DEPLOY.md.

**Despues del commit, elegir direccion:**

**Opcion A (robustez):** Implementar Error Boundary + mover claves de test a env vars. Impacto alto, esfuerzo bajo.

**Opcion B (feature):** Completar modo "Frases de Nosotros" — la BD ya soporta todo, solo falta conectar la UI con filtros por duo.

**Opcion C (infraestructura):** Implementar logica de desconexion — la infraestructura existe, solo falta la logica en `useRealtime.ts`.
