-- ─── ÉCOLES ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schools (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  phone         VARCHAR(50),
  country       VARCHAR(100) DEFAULT 'Mauritanie',
  city          VARCHAR(100),
  plan          VARCHAR(50) DEFAULT 'starter', -- starter / school / enterprise
  max_students  INT DEFAULT 50,
  access_code   VARCHAR(20) NOT NULL UNIQUE,
  expires_at    TIMESTAMP,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- ─── MEMBRES ÉCOLE ────────────────────────────────────
CREATE TABLE IF NOT EXISTS school_members (
  id          SERIAL PRIMARY KEY,
  school_id   INT REFERENCES schools(id) ON DELETE CASCADE,
  user_id     INT REFERENCES users(id) ON DELETE CASCADE,
  role        VARCHAR(20) DEFAULT 'student', -- teacher / student
  joined_at   TIMESTAMP DEFAULT NOW(),
  UNIQUE(school_id, user_id)
);

-- ─── COURS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS courses (
  id           SERIAL PRIMARY KEY,
  title        VARCHAR(255) NOT NULL,
  description  TEXT,
  thumbnail    TEXT,
  category     VARCHAR(100), -- forensics / crypto / osint / misc / web
  difficulty   VARCHAR(50) DEFAULT 'beginner', -- beginner / intermediate / advanced
  is_published BOOLEAN DEFAULT false,
  created_by   INT REFERENCES users(id),
  created_at   TIMESTAMP DEFAULT NOW()
);

-- ─── CHAPITRES ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chapters (
  id          SERIAL PRIMARY KEY,
  course_id   INT REFERENCES courses(id) ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL,
  order_index INT DEFAULT 0,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ─── LEÇONS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lessons (
  id               SERIAL PRIMARY KEY,
  chapter_id       INT REFERENCES chapters(id) ON DELETE CASCADE,
  course_id        INT REFERENCES courses(id) ON DELETE CASCADE,
  title            VARCHAR(255) NOT NULL,
  content          TEXT,        -- markdown
  type             VARCHAR(20) DEFAULT 'text', -- text / video / quiz
  video_url        TEXT,
  order_index      INT DEFAULT 0,
  duration_minutes INT DEFAULT 5,
  created_at       TIMESTAMP DEFAULT NOW()
);

-- ─── PROGRESSION COURS ────────────────────────────────
CREATE TABLE IF NOT EXISTS course_progress (
  id           SERIAL PRIMARY KEY,
  user_id      INT REFERENCES users(id) ON DELETE CASCADE,
  lesson_id    INT REFERENCES lessons(id) ON DELETE CASCADE,
  course_id    INT REFERENCES courses(id) ON DELETE CASCADE,
  completed    BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  UNIQUE(user_id, lesson_id)
);

-- ─── EXAMENS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exams (
  id               SERIAL PRIMARY KEY,
  school_id        INT REFERENCES schools(id) ON DELETE CASCADE,
  title            VARCHAR(255) NOT NULL,
  description      TEXT,
  duration_minutes INT DEFAULT 60,
  start_date       TIMESTAMP,
  end_date         TIMESTAMP,
  status           VARCHAR(20) DEFAULT 'draft', -- draft / active / finished
  access_code      VARCHAR(20) NOT NULL UNIQUE,
  created_by       INT REFERENCES users(id),
  created_at       TIMESTAMP DEFAULT NOW()
);

-- ─── CHALLENGES DANS EXAMEN ───────────────────────────
CREATE TABLE IF NOT EXISTS exam_challenges (
  id           SERIAL PRIMARY KEY,
  exam_id      INT REFERENCES exams(id) ON DELETE CASCADE,
  challenge_id INT REFERENCES challenges(id) ON DELETE CASCADE,
  points       INT DEFAULT 100,
  order_index  INT DEFAULT 0,
  UNIQUE(exam_id, challenge_id)
);

-- ─── SESSIONS EXAMEN ──────────────────────────────────
CREATE TABLE IF NOT EXISTS exam_sessions (
  id          SERIAL PRIMARY KEY,
  exam_id     INT REFERENCES exams(id) ON DELETE CASCADE,
  user_id     INT REFERENCES users(id) ON DELETE CASCADE,
  started_at  TIMESTAMP DEFAULT NOW(),
  finished_at TIMESTAMP,
  score       INT DEFAULT 0,
  status      VARCHAR(20) DEFAULT 'in_progress', -- in_progress / finished / timed_out
  UNIQUE(exam_id, user_id)
);

-- ─── SOUMISSIONS EXAMEN ───────────────────────────────
CREATE TABLE IF NOT EXISTS exam_submissions (
  id           SERIAL PRIMARY KEY,
  session_id   INT REFERENCES exam_sessions(id) ON DELETE CASCADE,
  challenge_id INT REFERENCES challenges(id),
  submitted_flag VARCHAR(500),
  is_correct   BOOLEAN DEFAULT false,
  submitted_at TIMESTAMP DEFAULT NOW()
);

-- ─── DEVOIRS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assignments (
  id          SERIAL PRIMARY KEY,
  school_id   INT REFERENCES schools(id) ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  due_date    TIMESTAMP,
  course_id   INT REFERENCES courses(id),
  created_by  INT REFERENCES users(id),
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ─── RENDUS DE DEVOIRS ────────────────────────────────
CREATE TABLE IF NOT EXISTS assignment_submissions (
  id            SERIAL PRIMARY KEY,
  assignment_id INT REFERENCES assignments(id) ON DELETE CASCADE,
  user_id       INT REFERENCES users(id) ON DELETE CASCADE,
  content       TEXT,
  file_name     VARCHAR(255),
  file_data     TEXT, -- base64
  grade         INT,  -- /100
  feedback      TEXT,
  submitted_at  TIMESTAMP DEFAULT NOW(),
  graded_at     TIMESTAMP,
  UNIQUE(assignment_id, user_id)
);

-- ─── CERTIFICATS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS certificates (
  id          SERIAL PRIMARY KEY,
  user_id     INT REFERENCES users(id) ON DELETE CASCADE,
  exam_id     INT REFERENCES exams(id),
  course_id   INT REFERENCES courses(id),
  type        VARCHAR(20), -- exam / course
  score       INT,
  issued_at   TIMESTAMP DEFAULT NOW()
);
