# AGENTS.md — Cuellito

> Prompt de continuidad para agentes de IA. Fuente de verdad para continuar el desarrollo sin reinventar lo existente.

---

## 1. Identidad del proyecto

- **Nombre:** Cuellito
- **Tipo:** Juego del ahorcado multijugador en tiempo real (SPA)
- **Objetivo:** Dos jugadores se enfrentan: uno propone una palabra/frase y el otro adivina letra por letra a traves de un chat en vivo, con comodines y puntuacion dinamica.
- **URL produccion:** https://cuellito.vercel.app
- **Estado:** MVP funcional desplegado. Auditoria de 104 issues completada (0 pendientes). Version publica operativa.

---

## 2. Stack tecnologico

| Tecnologia | Version | Uso |
|---|---|---|
| React | ^18.2.0 | UI (SPA) |
| TypeScript | ^5.2.2 | Tipado estatico |
| Vite | ^5.1.6 | Bundler + dev server |
| Tailwind CSS | ^3.4.1 | Estilos utility-first |
| Framer Motion | ^11.0.8 | Animaciones |
| Supabase JS | ^2.39.7 | Auth + DB + Realtime |
| Zustand | ^4.5.2 | Estado global |
| React Router | ^6.22.3 | Routing SPA |
| Playwright | ^1.58.2 | Tests E2E |
| react-hot-toast | ^2.4.1 | Notificaciones |
| clsx + tailwind-merge | ^2.1.0 / ^2.2.1 | Manejo de clases CSS |

**Deploy:** Vercel (auto-deploy desde rama `main`)
**Backend:** Supabase (PostgreSQL + Auth + Realtime WebSocket)

---

## 3. Arquitectura

```
[Navegador]
    |
    v
[React SPA] ← Vite dev/build
    |
    ├─ Pages (13) ← React Router v6
    ├─ Features (game, rooms, stats) ← logica de negocio
    ├─ Stores (auth, game, room) ← Zustand
    └─ Supabase Client ← @supabase/supabase-js
         |
         ├─ Auth (JWT, session persistence)
         ├─ Database (PostgREST API → PostgreSQL)
         └─ Realtime (WebSocket → rooms, matches, rounds)
```

### Flujo de una partida
```
Auth → Home → CreateRoom/JoinRoom → Lobby (espera oponente)
  → Proponente elige palabra → Desafiado adivina por chat
  → RoundEnd (puntaje) → siguiente ronda o MatchEnd
```

### Roles por ronda (se alternan)
- **Proponente:** elige palabra, categoria, pista. Confirma letras desde el teclado
- **Desafiado:** pide letras por chat. Usa comodines. Adivina la palabra

---

## 4. Estructura del proyecto

```
src/
  main.tsx            # Entry point
  App.tsx             # Rutas + RequireAuth + ErrorBoundary + modo demo
  index.css           # Tailwind globals
  animations/         # variants.ts (Framer Motion: hangmanPart, letterReveal, scoreUpdate)
  lib/                # supabase.ts, demo.ts
  types/              # database.ts (auto-gen), game.ts, index.ts
  stores/             # authStore, gameStore, roomStore
  utils/              # constants, scoreCalculator, wordNormalizer, cn, dates
  hooks/              # useAuth, useProfile, useSupabase
  components/
    layout/           # Layout, Navbar (hamburger mobile)
    shared/           # DemoBanner, ErrorBoundary
    ui/               # Badge, Button, Card, Input, Modal
  features/
    game/
      components/     # ChatPanel, GameTimer, HangmanSVG, Keyboard, PowerupBar, ProposerForm, ScoreBoard, WordDisplay
      hooks/          # useChat, useGameState, usePowerups, useRealtime
      services/       # gameService.ts
    rooms/services/   # roomService.ts
    stats/services/   # statsService.ts
  pages/              # 13 paginas

supabase/schema.sql   # Schema completo (12 tablas, enums, RLS, seeds)
e2e/                  # 4 suites, 20 tests, helpers.ts
```

---

## 5. Base de datos (Supabase PostgreSQL)

### Tablas principales
| Tabla | Descripcion |
|-------|-----------|
| profiles | Usuarios (username, display_name, avatar) |
| duos | Parejas de jugadores |
| categories | Categorias de palabras (12 del sistema + custom) |
| word_entries | Palabras/frases con pistas |
| rooms | Salas de juego (code de 6 letras, config de modo) |
| matches | Partidas completas |
| rounds | Rondas individuales (word_encoded, letras, errores) |
| round_events | Log de eventos por ronda |
| round_powerup_uses | Registro de comodines usados |
| user_stats | Estadisticas individuales |
| duo_stats | Estadisticas de pareja |
| match_stats_snapshots | Snapshot de stats por partida |

### Enums
- `game_mode`: quick, duel, competitive, casual, private, our_phrases
- `match_status`: waiting, lobby, proposer_choosing, guesser_playing, round_end, match_end, paused, abandoned
- `round_result`: won, lost, timeout, abandoned
- `powerup_type`: reveal_letter, eliminate_wrong, extra_hint, shield, show_structure, time_freeze

### RPCs (funciones PostgreSQL)
- `append_letter_to_round` — UPDATE atomico de letras (elimina race condition)
- `get_round_safe` — retorna ronda ocultando word_encoded al guesser
- `create_user_stats_on_profile` — trigger: crea stats al registrarse
- `update_updated_at_column` — trigger: actualiza updated_at en cada UPDATE

### Seguridad
- RLS habilitado en todas las tablas
- `word_encoded` protegido via RPC `get_round_safe` + RLS
- Realtime habilitado en: rooms, matches, rounds
- Locks anti-concurrencia en hooks: `processingLetterRef`, `processingRef`, `roomIdRef`
- Payload validation con helpers: `safeString`, `safeNumber`, `safeBool`, `safeArray`

---

## 6. Mecanicas del juego

### Modos
| Modo | Rondas | Timer | Errores max | Comodines | Ranking |
|------|--------|-------|-------------|-----------|---------|
| quick | 2 | No | 6 | 3 | No |
| duel | custom | No | 6 | 2 | Si |
| competitive | 6 | 60s | 5 | 1 | Si |
| casual | custom | No | 8 | 3 | No |
| private | custom | No | 6 | 3 | No |
| our_phrases | 4 | No | 7 | 3 | No |

### Comodines (6 tipos)
- reveal_letter, eliminate_wrong, extra_hint, shield, show_structure, time_freeze

### Puntuacion (definida en constants.ts)
- Base: 100 pts (desafiado gana)
- +10 por letra correcta
- -15 por error
- -10 por comodin usado
- +50 max bonus por velocidad
- Proponente gana: 60 base + 5 por error del desafiado

### Timeouts
- Desconexion → pausa: 30 segundos
- Desconexion → abandono: 600 segundos

---

## 7. Variables de entorno

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
VITE_DEMO_MODE=true   # Opcional: modo demo sin Supabase
```

---

## 8. Comandos

```bash
npm run dev         # Dev server
npm run build       # tsc && vite build
npm run lint        # ESLint
npm run preview     # Preview build
npx playwright test # E2E (contra produccion)
```

---

## 9. Tests E2E

- Framework: Playwright (Chromium + Firefox)
- Base URL: https://cuellito.vercel.app (produccion)
- Secuenciales (el juego multijugador requiere orden), retries: 1
- 4 suites: auth (7), navigation (8), room (3), game (2) = 20 tests
- Claves via env vars: `E2E_SUPABASE_URL`, `E2E_SUPABASE_ANON_KEY`, `E2E_SUPABASE_SERVICE_KEY`

---

## 10. Decisiones tecnicas ya tomadas

1. **SPA con React + Vite.** No hay plan de migrar a Next.js o SSR
2. **Supabase como backend completo.** No hay API custom ni servidor propio
3. **Zustand para estado.** No Redux, no Context API para estado global
4. **Tailwind para estilos.** Paleta oscura con violeta/rojo accent. No CSS modules
5. **Framer Motion para animaciones.** No CSS puro para animaciones complejas
6. **Modo demo** permite explorar la UI sin Supabase real (`VITE_DEMO_MODE=true`)
7. **word_encoded en base64.** Seguridad dependiente de RLS, no de encriptacion
8. **Tests E2E contra produccion.** No hay mock server ni Supabase local
9. **Chunks manuales** en vite.config.ts para optimizar bundle size
10. **Path alias** `@/` → `./src/`

---

## 11. Restricciones para el agente

1. No cambiar el stack sin autorizacion
2. No modificar `schema.sql` sin entender dependencias (RLS, triggers, realtime)
3. Usar colores de `tailwind.config.js`, no hardcodear hex
4. No instalar dependencias sin justificar y confirmar
5. Respetar tipado estricto — evitar `any`
6. No romper el modo demo (`IS_DEMO` en `lib/demo.ts`)
7. Leer archivos antes de editar
8. No modificar datos de demo sin necesidad
9. Idioma del codigo: ingles. Idioma de la UI: espanol
10. Trabajar paso a paso. Mostrar cambios antes de aplicar
11. Si algo no esta claro, preguntar antes de asumir

---

## 12. Paleta de colores (tailwind.config.js)

| Token | Hex | Uso |
|-------|-----|-----|
| bg | #0F0F1A | Fondo principal |
| bg-surface | #1A1A2E | Tarjetas |
| bg-surface2 | #16213E | Superficie alternativa |
| accent | #E94560 | Acciones, errores |
| accent-hover | #C73652 | Hover de accent |
| primary | #7C3AED | Botones primarios |
| primary-light | #A78BFA | Primary suave |
| primary-hover | #6D28D9 | Hover de primary |
| success | #10B981 | Correcto, exito |
| success-light | #34D399 | Success suave |
| warning | #F59E0B | Alertas, powerups |
| warning-light | #FCD34D | Warning suave |
| text | #F1F5F9 | Texto principal |
| text-muted | #94A3B8 | Texto secundario |
| text-subtle | #64748B | Texto terciario |
| border | #2D2D44 | Bordes |
| border-light | #3D3D5C | Bordes suaves |

Fuentes: Inter (sans), JetBrains Mono (mono)

---

## 13. Roadmap (fases del DEPLOY.md)

- **Fase 1 (MVP):** Completada — auth, salas, juego realtime, stats, comodines, UI responsive
- **Fase 2:** Estadisticas ampliadas (graficos, historial paginado, rendimiento por categoria)
- **Fase 3:** Experiencia de pareja (Frases de Nosotros completo, colecciones privadas)
- **Fase 4:** Personalizacion (temas, avatares, categorias tematicas)
- **Fase 5:** Torneos y rankings (multiplayer 3+, logros, anti-trampa)
