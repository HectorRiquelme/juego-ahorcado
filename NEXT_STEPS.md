# NEXT_STEPS.md — Cuellito

> Ultimo commit: `59091be`. Auditoria cerrada + 3 features implementadas.
> Actualizado: 2026-03-27.

---

## Lo que se hizo

### Auditoria completa (104/104 issues, 9 commits)
- 13 criticos, 21 altos, 38 medios, 32 bajos — todos resueltos
- RPCs ejecutadas: `append_letter_to_round`, `get_round_safe`
- Detalle completo en PROJECT_CONTEXT.md

### Feature 1: Deteccion de desconexion (commit `90b371a`, 7 archivos, +191 lineas)

| Que se hizo | Archivo |
|-------------|---------|
| Emitir player_disconnected/reconnected via presencia Realtime | `useRealtime.ts` |
| Timers 30s→pausa, 600s→abandono + cleanup en unmount | `useGameState.ts` |
| disconnectedAt + disconnectedPlayerId en GameState | `types/game.ts` |
| setDisconnected() + clearDisconnected() en store | `gameStore.ts` |
| Overlay de desconexion con 3 estados (detectado/pausado/abandonado) | `GamePage.tsx` |
| Bloquear inicio si oponente no en presencia real | `LobbyPage.tsx` |
| Campos nuevos en inicializacion de GameState | `demo.ts` |

### Feature 2: Stats de dupla (commit `c11d86c`, 3 archivos, +376 lineas)

| Que se hizo | Archivo |
|-------------|---------|
| getDuoForUser() — busca duo mas reciente + partner profile | `statsService.ts` |
| Fix shared_streak + best_shared_streak en updateDuoStatsAfterMatch | `statsService.ts` |
| DEMO_DUO_STATS + DEMO_PARTNER_PROFILE | `demo.ts` |
| Tabs Personal/Pareja con cards: general, victorias comparadas (barra), rachas, tiempo, frases | `StatsPage.tsx` |

### Feature 3: Frases de Nosotros (commit `59091be`, 4 archivos, +254 lineas)

| Que se hizo | Archivo |
|-------------|---------|
| Props gameMode + duoId, carga categorias/palabras del duo, sugerencias clickeables | `ProposerForm.tsx` |
| Pasar gameMode y duoId desde room store | `GamePage.tsx` |
| Tab "De pareja" con CRUD completo + incremento de private_words_created | `WordsPage.tsx` |
| Param mode opcional + incremento our_phrases_count | `statsService.ts` |

---

## Lo que queda pendiente

### Acciones en Supabase SQL Editor (ejecutar manualmente)

```sql
CREATE INDEX IF NOT EXISTS idx_rounds_match_round ON rounds (match_id, round_number);
CREATE INDEX IF NOT EXISTS idx_round_events_round_type ON round_events (round_id, event_type);
```

### Features del roadmap (no iniciadas)

| Feature | Prioridad | Archivo principal | Siguiente paso exacto |
|---------|-----------|-------------------|----------------------|
| Graficos de progreso temporal | Media | `StatsPage.tsx` | Instalar libreria de graficos (recharts/chart.js), agregar tab o seccion con grafico de puntaje por partida |
| Historial de partidas paginado | Media | `StatsPage.tsx` | Crear getMatchHistory(userId, limit, offset) en statsService, componente MatchHistoryList con paginacion |
| Editar palabra existente | Media | `WordsPage.tsx` | Boton editar por card → modal pre-llenado → update en word_entries |
| PWA / instalable | Baja | `vite.config.ts` | Instalar vite-plugin-pwa, crear manifest.json con iconos, service worker basico |
| Temas (modo claro) | Baja | `tailwind.config.js` | darkMode: 'class', paleta light en extend.colors, toggle en Navbar, persistir en localStorage |
| Avatar personalizable | Baja | `ProfilePage.tsx` | Bucket "avatars" en Supabase Storage, upload con preview, actualizar avatar_url en profile |
| Categorias tematicas | Baja | `WordsPage.tsx` | UI para crear categorias custom (nombre + emoji), insert con created_by |
| Rankings entre amigos | Baja | Nueva pagina | Tabla de leaderboard por ranking_score, filtro por amigos |
| Torneos multiplayer | Baja | Nueva arquitectura | Requiere replantear rooms/matches para 3+ jugadores |
| Logros y medallas | Baja | Nueva tabla + pagina | Tabla achievements, trigger en updateUserStatsAfterMatch |
| Edge Functions anti-trampa | Baja | `supabase/functions/` | Mover scoring/validacion al server con Supabase Edge Functions |
| Internacionalizacion | Baja | Transversal | react-i18next, extraer strings de todos los componentes |
| Tests unitarios | Baja | Nueva carpeta | Vitest para scoreCalculator, wordNormalizer, helpers de gameState |

---

## Deuda tecnica residual

| Item | Impacto |
|------|---------|
| Tests solo E2E contra produccion | Medio — sin staging ni unit tests |
| match_stats_snapshots nunca populated | Bajo — tabla existe pero no se inserta |
| Logica de scoring client-side | Bajo — suficiente para scope actual |
| Sin monitoring/analytics | Bajo — no hay APM ni error tracking |
