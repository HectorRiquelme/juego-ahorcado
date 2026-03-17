-- ============================================================
-- PALABRA SECRETA — Schema completo de Supabase
-- ============================================================
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

-- ─── EXTENSIONES ────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── TIPOS ENUM ─────────────────────────────────────────────

CREATE TYPE game_mode AS ENUM (
  'quick', 'duel', 'competitive', 'casual', 'private', 'our_phrases'
);

CREATE TYPE match_status AS ENUM (
  'waiting', 'lobby', 'proposer_choosing', 'guesser_playing',
  'round_end', 'match_end', 'paused', 'abandoned'
);

CREATE TYPE round_result AS ENUM ('won', 'lost', 'timeout', 'abandoned');

CREATE TYPE powerup_type AS ENUM (
  'reveal_letter', 'eliminate_wrong', 'extra_hint',
  'shield', 'show_structure', 'time_freeze'
);

-- ─── TABLA: profiles ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      TEXT NOT NULL UNIQUE
                  CONSTRAINT username_length CHECK (char_length(username) BETWEEN 2 AND 30)
                  CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]+$'),
  display_name  TEXT,
  avatar_url    TEXT,
  bio           TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_username ON profiles (username);

-- ─── TABLA: duos ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS duos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  player2_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  duo_name     TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_played_at TIMESTAMPTZ,
  CONSTRAINT unique_duo UNIQUE (player1_id, player2_id),
  CONSTRAINT no_self_duo CHECK (player1_id != player2_id)
);

CREATE INDEX idx_duos_player1 ON duos (player1_id);
CREATE INDEX idx_duos_player2 ON duos (player2_id);

-- ─── TABLA: categories ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  emoji       TEXT,
  color_hex   TEXT,
  is_system   BOOLEAN NOT NULL DEFAULT FALSE,
  is_public   BOOLEAN NOT NULL DEFAULT TRUE,
  created_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  duo_id      UUID REFERENCES duos(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categories_created_by ON categories (created_by);
CREATE INDEX idx_categories_duo ON categories (duo_id);
CREATE INDEX idx_categories_public ON categories (is_public) WHERE is_public = TRUE;

-- ─── TABLA: word_entries ────────────────────────────────────

CREATE TABLE IF NOT EXISTS word_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id   UUID REFERENCES categories(id) ON DELETE SET NULL,
  word          TEXT NOT NULL CONSTRAINT word_length CHECK (char_length(word) BETWEEN 2 AND 60),
  hint          TEXT,
  language      TEXT NOT NULL DEFAULT 'es',
  difficulty    SMALLINT NOT NULL DEFAULT 2 CHECK (difficulty BETWEEN 1 AND 3),
  created_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  duo_id        UUID REFERENCES duos(id) ON DELETE CASCADE,
  is_public     BOOLEAN NOT NULL DEFAULT FALSE,
  times_used    INTEGER NOT NULL DEFAULT 0,
  times_guessed INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_word_entries_category ON word_entries (category_id);
CREATE INDEX idx_word_entries_created_by ON word_entries (created_by);
CREATE INDEX idx_word_entries_duo ON word_entries (duo_id);
CREATE INDEX idx_word_entries_public ON word_entries (is_public) WHERE is_public = TRUE;

-- ─── TABLA: rooms ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rooms (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code             CHAR(6) NOT NULL UNIQUE,
  host_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  guest_id         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  duo_id           UUID REFERENCES duos(id) ON DELETE SET NULL,
  mode             game_mode NOT NULL DEFAULT 'quick',
  max_rounds       SMALLINT NOT NULL DEFAULT 2 CHECK (max_rounds BETWEEN 2 AND 20),
  max_errors       SMALLINT NOT NULL DEFAULT 6 CHECK (max_errors BETWEEN 3 AND 10),
  timer_seconds    INTEGER CHECK (timer_seconds IS NULL OR timer_seconds BETWEEN 10 AND 300),
  initial_powerups SMALLINT NOT NULL DEFAULT 3 CHECK (initial_powerups BETWEEN 0 AND 4),
  is_private       BOOLEAN NOT NULL DEFAULT FALSE,
  status           match_status NOT NULL DEFAULT 'waiting',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rooms_code ON rooms (code);
CREATE INDEX idx_rooms_host ON rooms (host_id);
CREATE INDEX idx_rooms_status ON rooms (status) WHERE status IN ('waiting', 'lobby');

-- ─── TABLA: matches ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS matches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id         UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  duo_id          UUID REFERENCES duos(id) ON DELETE SET NULL,
  player1_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  player2_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mode            game_mode NOT NULL,
  status          match_status NOT NULL DEFAULT 'waiting',
  current_round   SMALLINT NOT NULL DEFAULT 1,
  total_rounds    SMALLINT NOT NULL,
  player1_score   INTEGER NOT NULL DEFAULT 0,
  player2_score   INTEGER NOT NULL DEFAULT 0,
  winner_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  started_at      TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT different_players CHECK (player1_id != player2_id)
);

CREATE INDEX idx_matches_player1 ON matches (player1_id);
CREATE INDEX idx_matches_player2 ON matches (player2_id);
CREATE INDEX idx_matches_duo ON matches (duo_id);
CREATE INDEX idx_matches_status ON matches (status);
CREATE INDEX idx_matches_room ON matches (room_id);

-- ─── TABLA: rounds ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rounds (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id          UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  round_number      SMALLINT NOT NULL,
  proposer_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  guesser_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id       UUID REFERENCES categories(id) ON DELETE SET NULL,
  word_entry_id     UUID REFERENCES word_entries(id) ON DELETE SET NULL,
  -- Palabra codificada en base64 (ofuscación, no criptografía real)
  -- RLS previene que el guesser la lea directamente
  word_encoded      TEXT NOT NULL,
  hint              TEXT,
  hint_extra        TEXT,  -- Solo visible con comodín extra_hint
  status            match_status NOT NULL DEFAULT 'proposer_choosing',
  result            round_result,
  correct_letters   TEXT[] NOT NULL DEFAULT '{}',
  wrong_letters     TEXT[] NOT NULL DEFAULT '{}',
  max_errors        SMALLINT NOT NULL DEFAULT 6,
  errors_count      SMALLINT NOT NULL DEFAULT 0,
  powerups_available powerup_type[] NOT NULL DEFAULT '{}',
  timer_seconds     INTEGER,
  timer_started_at  TIMESTAMPTZ,
  score             INTEGER,
  started_at        TIMESTAMPTZ,
  ended_at          TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_round_in_match UNIQUE (match_id, round_number)
);

CREATE INDEX idx_rounds_match ON rounds (match_id);
CREATE INDEX idx_rounds_proposer ON rounds (proposer_id);
CREATE INDEX idx_rounds_guesser ON rounds (guesser_id);

-- ─── TABLA: round_events ────────────────────────────────────

CREATE TABLE IF NOT EXISTS round_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id    UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  player_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL CHECK (event_type IN ('letter_guess','powerup_used','round_start','round_end')),
  payload     JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_round_events_round ON round_events (round_id);
CREATE INDEX idx_round_events_player ON round_events (player_id);

-- ─── TABLA: round_powerup_uses ──────────────────────────────

CREATE TABLE IF NOT EXISTS round_powerup_uses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id        UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  match_id        UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  powerup_type    powerup_type NOT NULL,
  used_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  result_payload  JSONB DEFAULT '{}'
);

CREATE INDEX idx_powerup_uses_round ON round_powerup_uses (round_id);
CREATE INDEX idx_powerup_uses_player ON round_powerup_uses (player_id);

-- ─── TABLA: user_stats ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_stats (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  matches_played              INTEGER NOT NULL DEFAULT 0,
  matches_won                 INTEGER NOT NULL DEFAULT 0,
  matches_lost                INTEGER NOT NULL DEFAULT 0,
  matches_abandoned           INTEGER NOT NULL DEFAULT 0,
  rounds_played               INTEGER NOT NULL DEFAULT 0,
  rounds_won                  INTEGER NOT NULL DEFAULT 0,
  rounds_lost                 INTEGER NOT NULL DEFAULT 0,
  total_correct_letters       INTEGER NOT NULL DEFAULT 0,
  total_wrong_letters         INTEGER NOT NULL DEFAULT 0,
  powerups_used_total         INTEGER NOT NULL DEFAULT 0,
  powerups_by_type            JSONB NOT NULL DEFAULT '{}',
  words_proposed              INTEGER NOT NULL DEFAULT 0,
  words_guessed_correctly     INTEGER NOT NULL DEFAULT 0,
  longest_word_guessed        INTEGER NOT NULL DEFAULT 0,
  current_streak              INTEGER NOT NULL DEFAULT 0,
  best_streak                 INTEGER NOT NULL DEFAULT 0,
  avg_time_per_round_seconds  NUMERIC(8,2),
  total_play_time_seconds     INTEGER NOT NULL DEFAULT 0,
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_stats_user ON user_stats (user_id);

-- ─── TABLA: duo_stats ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS duo_stats (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  duo_id                      UUID NOT NULL UNIQUE REFERENCES duos(id) ON DELETE CASCADE,
  total_matches               INTEGER NOT NULL DEFAULT 0,
  matches_completed           INTEGER NOT NULL DEFAULT 0,
  player1_wins                INTEGER NOT NULL DEFAULT 0,
  player2_wins                INTEGER NOT NULL DEFAULT 0,
  ties                        INTEGER NOT NULL DEFAULT 0,
  total_rounds_played         INTEGER NOT NULL DEFAULT 0,
  shared_streak               INTEGER NOT NULL DEFAULT 0,
  best_shared_streak          INTEGER NOT NULL DEFAULT 0,
  favorite_category_id        UUID REFERENCES categories(id) ON DELETE SET NULL,
  private_words_created       INTEGER NOT NULL DEFAULT 0,
  our_phrases_count           INTEGER NOT NULL DEFAULT 0,
  avg_match_duration_seconds  NUMERIC(8,2),
  last_played_at              TIMESTAMPTZ,
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_duo_stats_duo ON duo_stats (duo_id);

-- ─── TABLA: match_stats_snapshots ───────────────────────────

CREATE TABLE IF NOT EXISTS match_stats_snapshots (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id                  UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id                 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score                     INTEGER NOT NULL DEFAULT 0,
  rounds_won                INTEGER NOT NULL DEFAULT 0,
  rounds_lost               INTEGER NOT NULL DEFAULT 0,
  correct_letters           INTEGER NOT NULL DEFAULT 0,
  wrong_letters             INTEGER NOT NULL DEFAULT 0,
  powerups_used             INTEGER NOT NULL DEFAULT 0,
  avg_time_per_round_seconds NUMERIC(8,2),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_snapshots_match ON match_stats_snapshots (match_id);
CREATE INDEX idx_snapshots_player ON match_stats_snapshots (player_id);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Trigger: auto-update de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_rooms_updated_at BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_matches_updated_at BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_rounds_updated_at BEFORE UPDATE ON rounds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: crear user_stats automáticamente al crear perfil
CREATE OR REPLACE FUNCTION create_user_stats_on_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_stats (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_create_user_stats AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION create_user_stats_on_profile();

-- ============================================================
-- REALTIME
-- ============================================================

-- Habilitar realtime en tablas que necesitan sync
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE rounds;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE duos ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_powerup_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE duo_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_stats_snapshots ENABLE ROW LEVEL SECURITY;

-- ── PROFILES ────────────────────────────────────────────────

-- Cualquiera puede ver perfiles (username, display_name, avatar)
CREATE POLICY "profiles: read public"
  ON profiles FOR SELECT
  USING (TRUE);

-- Solo el dueño puede modificar su perfil
CREATE POLICY "profiles: update own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Insertar solo con el propio UID
CREATE POLICY "profiles: insert own"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ── DUOS ────────────────────────────────────────────────────

-- Solo participantes del duo pueden verlo
CREATE POLICY "duos: read if member"
  ON duos FOR SELECT
  USING (auth.uid() IN (player1_id, player2_id));

-- Cualquier usuario autenticado puede crear un duo
CREATE POLICY "duos: insert authenticated"
  ON duos FOR INSERT
  WITH CHECK (
    auth.uid() IN (player1_id, player2_id)
    AND player1_id < player2_id  -- normalización por FK
  );

-- Solo participantes pueden actualizar
CREATE POLICY "duos: update if member"
  ON duos FOR UPDATE
  USING (auth.uid() IN (player1_id, player2_id));

-- ── CATEGORIES ──────────────────────────────────────────────

-- Categorías públicas o del sistema son legibles por todos
CREATE POLICY "categories: read public or system"
  ON categories FOR SELECT
  USING (
    is_public = TRUE
    OR is_system = TRUE
    OR auth.uid() = created_by
    OR duo_id IN (
      SELECT id FROM duos WHERE auth.uid() IN (player1_id, player2_id)
    )
  );

-- Solo usuarios autenticados pueden crear categorías propias
CREATE POLICY "categories: insert own"
  ON categories FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND is_system = FALSE
  );

-- Solo el dueño puede editar
CREATE POLICY "categories: update own"
  ON categories FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "categories: delete own"
  ON categories FOR DELETE
  USING (auth.uid() = created_by);

-- ── WORD ENTRIES ────────────────────────────────────────────

-- Leer: públicas, propias, o del duo del usuario
CREATE POLICY "words: read authorized"
  ON word_entries FOR SELECT
  USING (
    is_public = TRUE
    OR auth.uid() = created_by
    OR duo_id IN (
      SELECT id FROM duos WHERE auth.uid() IN (player1_id, player2_id)
    )
  );

CREATE POLICY "words: insert own"
  ON word_entries FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "words: update own"
  ON word_entries FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "words: delete own"
  ON word_entries FOR DELETE
  USING (auth.uid() = created_by);

-- ── ROOMS ───────────────────────────────────────────────────

-- Leer: si eres host o guest
CREATE POLICY "rooms: read if participant"
  ON rooms FOR SELECT
  USING (
    auth.uid() IN (host_id, guest_id)
    OR status = 'waiting'  -- Para unirse a sala
  );

-- Crear sala: solo para el host
CREATE POLICY "rooms: insert as host"
  ON rooms FOR INSERT
  WITH CHECK (auth.uid() = host_id);

-- Actualizar: solo host o guest
CREATE POLICY "rooms: update if participant"
  ON rooms FOR UPDATE
  USING (auth.uid() IN (host_id, guest_id));

-- ── MATCHES ─────────────────────────────────────────────────

CREATE POLICY "matches: read if participant"
  ON matches FOR SELECT
  USING (auth.uid() IN (player1_id, player2_id));

CREATE POLICY "matches: insert if participant"
  ON matches FOR INSERT
  WITH CHECK (auth.uid() IN (player1_id, player2_id));

CREATE POLICY "matches: update if participant"
  ON matches FOR UPDATE
  USING (auth.uid() IN (player1_id, player2_id));

-- ── ROUNDS ──────────────────────────────────────────────────

-- ATENCIÓN: el guesser NO debe poder leer word_encoded.
-- Esto se maneja a nivel de aplicación + column-level RLS workaround.
-- En Supabase se puede usar una función que devuelva null al guesser.

CREATE POLICY "rounds: read if participant"
  ON rounds FOR SELECT
  USING (
    auth.uid() IN (proposer_id, guesser_id)
    OR auth.uid() IN (
      SELECT p1_or_p2 FROM (
        SELECT player1_id AS p1_or_p2 FROM matches WHERE id = rounds.match_id
        UNION ALL
        SELECT player2_id FROM matches WHERE id = rounds.match_id
      ) sub
    )
  );

CREATE POLICY "rounds: insert if proposer"
  ON rounds FOR INSERT
  WITH CHECK (auth.uid() = proposer_id);

-- Solo participantes pueden actualizar (el guesser actualiza correct/wrong letters)
CREATE POLICY "rounds: update if participant"
  ON rounds FOR UPDATE
  USING (auth.uid() IN (proposer_id, guesser_id));

-- ── ROUND EVENTS ────────────────────────────────────────────

CREATE POLICY "round_events: read if participant"
  ON round_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rounds r
      JOIN matches m ON m.id = r.match_id
      WHERE r.id = round_events.round_id
        AND auth.uid() IN (m.player1_id, m.player2_id)
    )
  );

CREATE POLICY "round_events: insert own"
  ON round_events FOR INSERT
  WITH CHECK (auth.uid() = player_id);

-- ── ROUND POWERUP USES ──────────────────────────────────────

CREATE POLICY "powerup_uses: read if participant"
  ON round_powerup_uses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = round_powerup_uses.match_id
        AND auth.uid() IN (m.player1_id, m.player2_id)
    )
  );

CREATE POLICY "powerup_uses: insert own"
  ON round_powerup_uses FOR INSERT
  WITH CHECK (auth.uid() = player_id);

-- ── USER STATS ──────────────────────────────────────────────

-- Solo el dueño ve sus stats completas
CREATE POLICY "user_stats: read own"
  ON user_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_stats: insert own"
  ON user_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_stats: update own"
  ON user_stats FOR UPDATE
  USING (auth.uid() = user_id);

-- ── DUO STATS ───────────────────────────────────────────────

CREATE POLICY "duo_stats: read if member"
  ON duo_stats FOR SELECT
  USING (
    duo_id IN (
      SELECT id FROM duos WHERE auth.uid() IN (player1_id, player2_id)
    )
  );

CREATE POLICY "duo_stats: insert if member"
  ON duo_stats FOR INSERT
  WITH CHECK (
    duo_id IN (
      SELECT id FROM duos WHERE auth.uid() IN (player1_id, player2_id)
    )
  );

CREATE POLICY "duo_stats: update if member"
  ON duo_stats FOR UPDATE
  USING (
    duo_id IN (
      SELECT id FROM duos WHERE auth.uid() IN (player1_id, player2_id)
    )
  );

-- ── MATCH STATS SNAPSHOTS ───────────────────────────────────

CREATE POLICY "snapshots: read own"
  ON match_stats_snapshots FOR SELECT
  USING (auth.uid() = player_id);

CREATE POLICY "snapshots: insert own"
  ON match_stats_snapshots FOR INSERT
  WITH CHECK (auth.uid() = player_id);

-- ============================================================
-- SEEDS — Categorías del sistema
-- ============================================================

INSERT INTO categories (name, description, emoji, color_hex, is_system, is_public) VALUES
  ('Películas y Series', 'Títulos del cine y televisión', '🎬', '#7C3AED', TRUE, TRUE),
  ('Canciones y Artistas', 'Música, artistas y álbumes', '🎵', '#E94560', TRUE, TRUE),
  ('Lugares', 'Ciudades, países y monumentos', '🌍', '#10B981', TRUE, TRUE),
  ('Comida y Bebidas', 'Platos, ingredientes y más', '🍕', '#F59E0B', TRUE, TRUE),
  ('Objetos Cotidianos', 'Cosas del día a día', '🏠', '#3B82F6', TRUE, TRUE),
  ('Videojuegos', 'Juegos, personajes y franquicias', '🎮', '#8B5CF6', TRUE, TRUE),
  ('Deportes', 'Equipos, jugadores y eventos', '⚽', '#06B6D4', TRUE, TRUE),
  ('Animales', 'Especies y personajes animales', '🐾', '#84CC16', TRUE, TRUE),
  ('Frases Célebres', 'Citas y frases conocidas', '💬', '#EC4899', TRUE, TRUE),
  ('Frases de Nosotros', 'Frases especiales de la pareja', '💑', '#F97316', FALSE, FALSE),
  ('Recuerdos', 'Momentos especiales compartidos', '📸', '#A855F7', FALSE, FALSE),
  ('Libre', 'Sin categoría específica', '🎯', '#6B7280', TRUE, TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEEDS — Palabras de ejemplo (categoría Libre)
-- ============================================================

-- Insertar algunas palabras de muestra en la categoría Libre
DO $$
DECLARE
  libre_cat_id UUID;
BEGIN
  SELECT id INTO libre_cat_id FROM categories WHERE name = 'Libre' AND is_system = TRUE;

  INSERT INTO word_entries (category_id, word, hint, language, difficulty, is_public) VALUES
    (libre_cat_id, 'mariposa', 'Insecto que vuela', 'es', 1, TRUE),
    (libre_cat_id, 'telescopio', 'Instrumento para ver lejos', 'es', 2, TRUE),
    (libre_cat_id, 'laberinto', 'Difícil de encontrar la salida', 'es', 2, TRUE),
    (libre_cat_id, 'murciélago', 'Vuela de noche', 'es', 2, TRUE),
    (libre_cat_id, 'ferrocarril', 'Transporte sobre rieles', 'es', 3, TRUE),
    (libre_cat_id, 'hipopótamo', 'Animal africano', 'es', 2, TRUE)
  ON CONFLICT DO NOTHING;
END $$;
