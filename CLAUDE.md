# CLAUDE.md — Cuellito

> Instrucciones para el asistente. Leer completo antes de proponer o modificar cualquier cosa.

## Identidad del proyecto

- **Nombre:** Cuellito
- **Tipo:** Juego del ahorcado multijugador en tiempo real (SPA)
- **URL produccion:** https://cuellito.vercel.app
- **Repositorio:** GitHub (rama principal: `main`)

## Stack (no cambiar sin autorizacion)

| Capa | Tecnologia |
|------|-----------|
| UI | React 18 + TypeScript |
| Build | Vite 5 |
| Estilos | Tailwind CSS 3 |
| Animaciones | Framer Motion 11 |
| Estado | Zustand 4 (stores: auth, game, room) |
| Backend | Supabase (PostgreSQL + Auth + Realtime) |
| Routing | React Router v6 |
| Tests | Playwright E2E |
| Deploy | Vercel (auto-deploy desde `main`) |

## Estructura del proyecto

```
src/
  main.tsx              # Entry point React
  App.tsx               # Rutas + RequireAuth guard + modo demo
  index.css             # Estilos globales Tailwind
  lib/
    supabase.ts         # Cliente Supabase (auth, realtime)
    demo.ts             # Modo demo sin Supabase real
  types/
    database.ts         # Tipos auto-generados de Supabase
    game.ts             # Tipos del estado de juego
    index.ts            # Re-exports
  stores/
    authStore.ts        # user, profile, loading
    gameStore.ts        # gameState, roundState, letras, powerups
    roomStore.ts        # room, hostProfile, guestProfile
  utils/
    constants.ts        # Config de modos, scoring, timeouts
    scoreCalculator.ts  # Calculo de puntaje
    wordNormalizer.ts   # Encoding/normalizacion de palabras
    cn.ts               # clsx + tailwind-merge
    dates.ts            # Utilidades de fecha
  hooks/
    useAuth.ts, useProfile.ts, useSupabase.ts
  animations/
    variants.ts         # Variantes de Framer Motion (hangmanPart, letterReveal, scoreUpdate)
  components/
    layout/             # Layout.tsx, Navbar.tsx (incluye hamburger mobile)
    shared/             # DemoBanner.tsx, ErrorBoundary.tsx
    ui/                 # Badge, Button, Card, Input, Modal
  features/
    game/
      components/       # ChatPanel, GameTimer, HangmanSVG, Keyboard, PowerupBar, ProposerForm, ScoreBoard, WordDisplay
      hooks/            # useChat, useGameState, usePowerups, useRealtime
      services/         # gameService.ts
    rooms/
      services/         # roomService.ts
    stats/
      services/         # statsService.ts
  pages/                # 13 paginas (Landing, Auth, Home, CreateRoom, JoinRoom, Lobby, Game, RoundEnd, MatchEnd, Stats, Words, Profile, DemoGame)

supabase/
  schema.sql            # Schema completo (12 tablas, enums, RLS, seeds)

e2e/
  helpers.ts            # Credenciales de test, helpers
  01-auth.spec.ts       # 7 tests autenticacion
  02-navigation.spec.ts # 8 tests navegacion
  03-room.spec.ts       # 3 tests salas
  04-game.spec.ts       # 2 tests partida completa
```

## Convenciones de codigo

- **Idioma del codigo:** Ingles (variables, funciones, tipos, comentarios)
- **Idioma del contenido UI:** Espanol
- **Path alias:** `@/` → `./src/`
- **CSS:** Tailwind utility classes. Colores definidos en `tailwind.config.js` (no hardcodear)
- **Estado:** Zustand stores con patron immutable (spread + set)
- **Componentes:** Functional components con hooks. Export default para paginas
- **Tipado:** Strict TypeScript. Tipos de BD en `types/database.ts`, tipos de juego en `types/game.ts`
- **Imports:** Agrupados: librerias externas > types > stores > componentes > utils

## Variables de entorno

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
VITE_DEMO_MODE=true   # Opcional: activa modo demo sin Supabase
```

## Comandos

```bash
npm run dev       # Servidor de desarrollo (Vite)
npm run build     # tsc && vite build → dist/
npm run lint      # ESLint
npm run preview   # Preview del build
npx playwright test                    # Todos los E2E
npx playwright test e2e/01-auth.spec.ts  # Suite especifica
```

## Reglas obligatorias

1. **No cambiar el stack** sin autorizacion explicita
2. **No modificar schema.sql** sin entender las dependencias (RLS, realtime, triggers)
3. **Usar los colores de `tailwind.config.js`**, no hardcodear hex
4. **No instalar dependencias** sin justificar y confirmar
5. **Respetar el tipado estricto** — no usar `any` salvo casos documentados
6. **No romper el modo demo** — `IS_DEMO` debe seguir funcionando
7. **Leer archivos antes de editar** — entender el contexto existente
8. **Tests E2E corren contra produccion** (`baseURL: https://cuellito.vercel.app`) — no contra localhost
9. **Supabase Realtime** esta habilitado en rooms, matches, rounds — cambios en estas tablas se propagan via WebSocket
10. **RLS habilitado** en todas las tablas — `word_encoded` esta protegido para que el guesser no lo lea directamente
11. **Scoring:** definido en `constants.ts` — 100 base, +10/correcta, -15/error, -10/powerup, +50 max velocidad
12. **Chunks de build:** separados manualmente en `vite.config.ts` (vendor-react, vendor-supabase, vendor-framer, vendor-misc)

## Paleta de colores (Tailwind)

| Token | Hex | Uso |
|-------|-----|-----|
| bg | #0F0F1A | Fondo principal |
| bg-surface | #1A1A2E | Tarjetas, paneles |
| bg-surface2 | #16213E | Superficie alternativa |
| accent | #E94560 | Acciones principales, errores |
| accent-hover | #C73652 | Hover de accent |
| primary | #7C3AED | Botones primarios, highlights |
| primary-light | #A78BFA | Primary suave |
| primary-hover | #6D28D9 | Hover de primary |
| success | #10B981 | Letras correctas, exito |
| success-light | #34D399 | Success suave |
| warning | #F59E0B | Alertas, powerups |
| warning-light | #FCD34D | Warning suave |
| text | #F1F5F9 | Texto principal |
| text-muted | #94A3B8 | Texto secundario |
| text-subtle | #64748B | Texto terciario |
| border | #2D2D44 | Bordes |
| border-light | #3D3D5C | Bordes suaves |

## Arquitectura de la partida

```
Landing → Auth → Home → CreateRoom/JoinRoom → Lobby → Game → RoundEnd → MatchEnd
                                                  ↕ (Supabase Realtime WebSocket)
                                              PostgreSQL (rooms, matches, rounds)
```

Roles por ronda (se alternan):
- **Proponente:** elige palabra, categoria, pista. Confirma letras con el teclado
- **Desafiado:** pide letras por chat. Usa comodines. Intenta adivinar

## RPCs en Supabase (ejecutadas manualmente)

- `append_letter_to_round(p_round_id, p_letter, p_correct, p_shield_active)` — UPDATE atomico de letras, elimina race condition
- `get_round_safe(p_round_id)` — retorna datos de ronda ocultando `word_encoded` al guesser via `auth.uid()`

## Patrones de seguridad en hooks

- `processingLetterRef` en `useGameState.ts` — lock para evitar procesamiento simultaneo de letras
- `processingRef` en `usePowerups.ts` — lock anti doble-click en comodines
- `roomIdRef` en `LobbyPage.tsx` — evita re-suscripciones multiples a Realtime
- `safeString/safeNumber/safeBool/safeArray` en `useGameState.ts` — validacion de payloads de eventos Realtime

## Tests E2E

- Chromium + Firefox (2 projects en `playwright.config.ts`)
- retries: 1 para tests flaky de Realtime
- Claves via env vars: `E2E_SUPABASE_URL`, `E2E_SUPABASE_ANON_KEY`, `E2E_SUPABASE_SERVICE_KEY` (con fallback hardcoded)

## Puntos delicados

- `word_encoded` usa base64 — la seguridad real depende del RLS de Supabase + RPC `get_round_safe`
- Realtime tiene limite de 200 conexiones simultaneas en free tier
- El modo demo simula datos sin tocar Supabase (ver `lib/demo.ts`)
- Los tests E2E son secuenciales por naturaleza del juego multijugador
- ErrorBoundary global envuelve todas las rutas en `App.tsx`
