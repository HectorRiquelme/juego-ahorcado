# PROJECT_CONTEXT.md — Cuellito

> Contexto del proyecto para entender el estado actual, la arquitectura y las decisiones tomadas.

---

## Resumen

**Cuellito** es un juego del ahorcado multijugador en tiempo real para dos personas. Un jugador propone una palabra/frase y el otro adivina letra por letra a traves de un chat en vivo. Incluye comodines, multiples modos de juego, estadisticas persistentes y puntuacion dinamica.

- **URL:** https://cuellito.vercel.app
- **Estado:** MVP + Fase 2-3 parcial. Auditoria cerrada (104/104). 3 features nuevas: desconexion, duo stats, frases de nosotros
- **Rama principal:** `main`

---

## Estado actual del desarrollo

### Implementado (confirmado en codigo)

- [x] Autenticacion completa (registro, login, logout) via Supabase Auth
- [x] Landing page publica con CTA y descripcion
- [x] Home con opciones: crear sala, unirse, ver stats
- [x] Creacion de salas con codigo de 6 letras
- [x] Union a salas por codigo
- [x] Lobby de espera con perfiles de ambos jugadores
- [x] 6 modos de juego (quick, duel, competitive, casual, private, our_phrases)
- [x] Ronda de ahorcado en tiempo real via Supabase Realtime
- [x] Chat en vivo entre jugadores
- [x] Teclado interactivo para confirmar/pedir letras
- [x] Dibujo SVG del ahorcado (HangmanSVG)
- [x] Display de la palabra con guiones y letras reveladas
- [x] 6 tipos de comodines funcionales
- [x] Sistema de puntuacion (base + bonus velocidad + penalizaciones)
- [x] Pantalla de fin de ronda con desglose de puntaje
- [x] Pantalla de fin de partida con resultado final
- [x] Estadisticas individuales persistentes (user_stats)
- [x] Estadisticas de pareja (duo_stats)
- [x] Pagina de estadisticas (/stats)
- [x] Pagina de perfil (/profile)
- [x] Gestion de palabras (/words)
- [x] Modo demo interactivo sin Supabase (/demo)
- [x] Banner de modo demo
- [x] UI responsive (mobile-first con Tailwind)
- [x] Animaciones con Framer Motion
- [x] Notificaciones con react-hot-toast
- [x] Guard de autenticacion (RequireAuth)
- [x] Manejo de desconexion (pausa 30s, abandono 600s)
- [x] RLS en todas las tablas de Supabase
- [x] Proteccion de word_encoded (guesser no puede leerlo)
- [x] 12 categorias del sistema pre-cargadas (seed en schema.sql)
- [x] Suite E2E con Playwright (20 tests)
- [x] Deploy automatico en Vercel
- [x] Chunks de build optimizados
- [x] ErrorBoundary global envolviendo todas las rutas
- [x] RPCs atomicas en Supabase (append_letter_to_round, get_round_safe)
- [x] Locks anti-concurrencia en hooks (processingLetterRef, processingRef, roomIdRef)
- [x] Payload validation en eventos Realtime (safeString/safeNumber/safeBool/safeArray)
- [x] Accesibilidad: aria-labels en Keyboard, PowerupBar, ScoreBoard, HangmanSVG, WordDisplay, GameTimer, Modal, Card
- [x] Navbar responsive con hamburger menu mobile
- [x] Tests E2E en Chromium + Firefox con retries
- [x] Deteccion de desconexion completa (presencia Realtime → 30s pausa → 600s abandono → overlay)
- [x] Stats de dupla con tabs Personal/Pareja (victorias comparadas, rachas juntos, tiempo)
- [x] Modo "Frases de Nosotros" completo (ProposerForm duo-aware + WordsPage duo tab + counters)
- [x] Palabras de pareja CRUD (crear/eliminar desde WordsPage tab "De pareja")
- [x] Lobby presence gate (bloquea inicio si oponente no en presencia real)

### No implementado (confirmado)

- [ ] Graficos de progreso temporal en stats
- [ ] Historial de partidas paginado
- [ ] Temas visuales alternativos (modo claro, paletas)
- [ ] Avatar personalizable
- [ ] Categorias tematicas avanzadas
- [ ] Importar/exportar palabras
- [ ] Rankings entre amigos
- [ ] Torneos multiplayer (3+ jugadores)
- [ ] Logros y medallas
- [ ] Edge Functions para anti-trampa
- [ ] PWA / instalable en movil
- [ ] Internacionalizacion (i18n)
- [ ] Tests unitarios (solo hay E2E)

---

## Base de datos

12 tablas en PostgreSQL (Supabase):

| Tabla | Registros clave |
|-------|----------------|
| profiles | id, username, display_name, avatar_url |
| duos | player1_id, player2_id, duo_name |
| categories | name, emoji, is_system (12 del sistema) |
| word_entries | word, hint, hint_extra, category_id, difficulty |
| rooms | code (6 chars), host_id, guest_id, mode, status |
| matches | room_id, player1/2_id, scores, winner_id |
| rounds | word_encoded (base64), correct/wrong_letters, errors_count |
| round_events | event_type, payload (JSONB) |
| round_powerup_uses | powerup_type, result_payload |
| user_stats | matches/rounds played/won, streaks, averages |
| duo_stats | total_matches, player1/2_wins, shared_streak |
| match_stats_snapshots | score, letters, powerups per match |

### Enums
- game_mode: quick, duel, competitive, casual, private, our_phrases
- match_status: waiting, lobby, proposer_choosing, guesser_playing, round_end, match_end, paused, abandoned
- round_result: won, lost, timeout, abandoned
- powerup_type: reveal_letter, eliminate_wrong, extra_hint, shield, show_structure, time_freeze

---

## Rutas de la aplicacion

| Ruta | Pagina | Auth |
|------|--------|------|
| / | LandingPage | No |
| /auth | AuthPage | No |
| /home | HomePage | Si |
| /rooms/create | CreateRoomPage | Si |
| /rooms/join | JoinRoomPage | Si |
| /rooms/:code/lobby | LobbyPage | Si |
| /rooms/:code/game | GamePage | Si |
| /rooms/:code/round-end | RoundEndPage | Si |
| /rooms/:code/match-end | MatchEndPage | Si |
| /stats | StatsPage | Si |
| /words | WordsPage | Si |
| /profile | ProfilePage | Si |
| /demo | DemoGamePage | No |
| * | Redirect → / | — |

---

## Servicios principales

### gameService.ts
- createMatch, getMatch, startMatch, updateMatchStatus
- createRound, getRound, getCurrentRound
- submitLetterGuess, finishRound
- recordPowerupUse, getMatchHistory
- generatePowerupList (helper interno)

### roomService.ts
- createRoom, getRoomByCode, joinRoom, updateRoomStatus

### statsService.ts
- getUserStats, getDuoStats, getDuoForUser, getOrCreateDuo
- updateUserStatsAfterRound, updateUserStatsAfterMatch
- updateDuoStatsAfterMatch (con shared_streak, our_phrases_count)

---

## Stores (Zustand)

### authStore
- user (Supabase User), profile (Profile), loading
- setUser, setProfile, setLoading, reset

### gameStore
- gameState (GameState), roundState (RoundState)
- updateGameStatus, addCorrectLetter, addWrongLetter
- markPowerupUsed, incrementErrors, updateScores
- setDisconnected, clearDisconnected, reset

### roomStore
- room (Room), hostProfile, guestProfile
- setRoom, setHostProfile, setGuestProfile, reset

---

## Auditoria completada (9 commits, 104 issues)

| Commit | Descripcion |
|--------|-----------|
| `d5cfbc9` | 12 criticos: error handling, guards, RLS |
| `71a2d00` | 2 criticos + 11 altos + 6 medios + 1 bajo: RPCs, ErrorBoundary, Keyboard fisico |
| `48e76d5` | 7 altos + 5 medios + 3 bajos: payload validation, bounds checking, Modal a11y |
| `88567ea` | 3 altos: race condition locks, re-suscripcion Realtime |
| `1599e9d` | 26 medios: payload validation, Navbar mobile, E2E robustos, Firefox |
| `2ebb4ef` | 27 bajos: accesibilidad, indices BD, cleanup, JSDoc |

RPCs ejecutadas en Supabase SQL Editor:
- `append_letter_to_round` — UPDATE atomico de letras
- `get_round_safe` — oculta word_encoded al guesser

### Features post-auditoria (3 commits)

| Commit | Descripcion |
|--------|-----------|
| `90b371a` | Deteccion de desconexion: useRealtime emit, useGameState timers, GamePage overlay, LobbyPage gate |
| `c11d86c` | Stats de dupla: getDuoForUser, shared_streak fix, StatsPage tabs Personal/Pareja |
| `59091be` | Frases de Nosotros: ProposerForm duo-aware, WordsPage duo tab, counters |

Indices pendientes de ejecutar en Supabase:
- `idx_rounds_match_round` (match_id, round_number)
- `idx_round_events_round_type` (round_id, event_type)

---

## Puntos delicados

1. **word_encoded en base64** — seguridad reforzada con RPC `get_round_safe` + RLS
2. **Realtime free tier** — limite de 200 conexiones simultaneas
3. **Tests contra produccion** — no hay entorno de staging ni Supabase local (env vars configuradas para futuro staging)
4. **Modo demo** — debe mantenerse funcional para demos sin backend
5. **Alternancia de roles** — proponente/desafiado se alternan cada ronda, logica critica en gameService
6. **Timer competitivo** — solo activo en modo competitive (60s), usa timer_started_at en la BD
7. **Locks en hooks** — processingLetterRef y processingRef previenen race conditions en UI
