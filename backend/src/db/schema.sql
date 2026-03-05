-- =============================================
-- NKTCTF — Schéma complet
-- =============================================

CREATE TABLE IF NOT EXISTS users (
  id                 SERIAL PRIMARY KEY,
  username           VARCHAR(50)  UNIQUE NOT NULL,
  email              VARCHAR(100) UNIQUE NOT NULL,
  password_hash      VARCHAR(255) NOT NULL,
  role               VARCHAR(20)  DEFAULT 'user',
  score              INTEGER      DEFAULT 0,
  plan               VARCHAR(20)  DEFAULT 'free',
  email_verified     BOOLEAN      DEFAULT false,
  email_verify_token VARCHAR(255),
  created_at         TIMESTAMP    DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS challenges (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(100) NOT NULL,
  category    VARCHAR(50)  NOT NULL,
  description TEXT,
  points      INTEGER      NOT NULL,
  flag        VARCHAR(255) NOT NULL,
  hint        TEXT,
  difficulty  VARCHAR(20)  DEFAULT 'Easy',
  file_name   VARCHAR(255),
  file_path   VARCHAR(500),
  is_active   BOOLEAN      DEFAULT true,
  created_at  TIMESTAMP    DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS solves (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER REFERENCES users(id)      ON DELETE CASCADE,
  challenge_id INTEGER REFERENCES challenges(id) ON DELETE CASCADE,
  solved_at    TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, challenge_id)
);

CREATE TABLE IF NOT EXISTS submissions (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER REFERENCES users(id)      ON DELETE CASCADE,
  challenge_id   INTEGER REFERENCES challenges(id) ON DELETE CASCADE,
  submitted_flag VARCHAR(255),
  is_correct     BOOLEAN,
  submitted_at   TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id               SERIAL PRIMARY KEY,
  title            VARCHAR(100) NOT NULL,
  description      TEXT,
  mode             VARCHAR(20)  DEFAULT 'solo',
  is_free          BOOLEAN      DEFAULT true,
  price            DECIMAL(10,2) DEFAULT 0,
  max_participants INTEGER      DEFAULT 50,
  participants     INTEGER      DEFAULT 0,
  start_date       TIMESTAMP,
  end_date         TIMESTAMP,
  status           VARCHAR(20)  DEFAULT 'upcoming',
  created_at       TIMESTAMP    DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_registrations (
  id            SERIAL PRIMARY KEY,
  event_id      INTEGER REFERENCES events(id) ON DELETE CASCADE,
  user_id       INTEGER REFERENCES users(id)  ON DELETE CASCADE,
  registered_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

CREATE TABLE IF NOT EXISTS teams (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(50) UNIQUE NOT NULL,
  captain_id  INTEGER REFERENCES users(id) ON DELETE CASCADE,
  invite_code VARCHAR(10) UNIQUE NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_members (
  id        SERIAL PRIMARY KEY,
  team_id   INTEGER REFERENCES teams(id) ON DELETE CASCADE,
  user_id   INTEGER REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS team_messages (
  id         SERIAL PRIMARY KEY,
  team_id    INTEGER REFERENCES teams(id) ON DELETE CASCADE,
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  message    TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Admin par défaut (password: Admin123!)
INSERT INTO users (username, email, password_hash, role, email_verified)
VALUES (
  'admin',
  'admin@nktctf.com',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewzpUMpCkNqphSiS',
  'superadmin',
  true
) ON CONFLICT DO NOTHING;