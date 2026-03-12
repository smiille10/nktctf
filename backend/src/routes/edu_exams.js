const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const authMiddleware = require('../middleware/auth');
const crypto = require('crypto');

const isSuperAdmin = (req, res, next) => {
  if (req.user.role === 'superadmin') return next();
  res.status(403).json({ error: 'SuperAdmin requis' });
};

const generateCode = () => crypto.randomBytes(4).toString('hex').toUpperCase();

// ─── ADMIN — Gérer les examens ────────────────────────

// GET tous les examens
router.get('/', authMiddleware, isSuperAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*, s.name as school_name,
        COUNT(DISTINCT ec.challenge_id)::int as challenge_count,
        COUNT(DISTINCT es.user_id)::int as participant_count
      FROM exams e
      LEFT JOIN schools s ON s.id = e.school_id
      LEFT JOIN exam_challenges ec ON ec.exam_id = e.id
      LEFT JOIN exam_sessions es ON es.exam_id = e.id
      GROUP BY e.id, s.name
      ORDER BY e.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST créer un examen
router.post('/', authMiddleware, isSuperAdmin, async (req, res) => {
  const { school_id, title, description, duration_minutes, start_date, end_date, challenge_ids } = req.body;
  if (!school_id || !title) return res.status(400).json({ error: 'school_id et title requis' });

  const access_code = generateCode();
  try {
    const exam = await pool.query(
      `INSERT INTO exams (school_id, title, description, duration_minutes, start_date, end_date, access_code, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [school_id, title, description, duration_minutes || 60, start_date, end_date, access_code, req.user.id]
    );

    // Ajouter les challenges
    if (challenge_ids && challenge_ids.length > 0) {
      for (let i = 0; i < challenge_ids.length; i++) {
        await pool.query(
          'INSERT INTO exam_challenges (exam_id, challenge_id, order_index) VALUES ($1,$2,$3)',
          [exam.rows[0].id, challenge_ids[i], i]
        );
      }
    }

    res.json(exam.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT modifier un examen
router.put('/:id', authMiddleware, isSuperAdmin, async (req, res) => {
  const { title, description, duration_minutes, start_date, end_date, status } = req.body;
  try {
    const result = await pool.query(
      `UPDATE exams SET title=$1, description=$2, duration_minutes=$3,
       start_date=$4, end_date=$5, status=$6 WHERE id=$7 RETURNING *`,
      [title, description, duration_minutes, start_date, end_date, status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE supprimer un examen
router.delete('/:id', authMiddleware, isSuperAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM exams WHERE id=$1', [req.params.id]);
    res.json({ message: 'Examen supprimé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET résultats d'un examen
router.get('/:id/results', authMiddleware, isSuperAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT es.*, u.username, u.email
      FROM exam_sessions es
      JOIN users u ON u.id = es.user_id
      WHERE es.exam_id = $1
      ORDER BY es.score DESC
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ÉTUDIANT — Passer un examen ──────────────────────

// POST rejoindre un examen avec code
router.post('/join', authMiddleware, async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Code requis' });

  try {
    const exam = await pool.query(
      'SELECT * FROM exams WHERE access_code=$1 AND status=$2',
      [code.toUpperCase(), 'active']
    );
    if (!exam.rows[0]) return res.status(404).json({ error: 'Examen introuvable ou non actif' });

    const e = exam.rows[0];

    // Vérif que l'étudiant est bien dans l'école
    const member = await pool.query(
      'SELECT * FROM school_members WHERE school_id=$1 AND user_id=$2',
      [e.school_id, req.user.id]
    );
    if (!member.rows[0]) return res.status(403).json({ error: 'Tu n\'es pas membre de cette école' });

    // Déjà une session ?
    const existing = await pool.query(
      'SELECT * FROM exam_sessions WHERE exam_id=$1 AND user_id=$2',
      [e.id, req.user.id]
    );
    if (existing.rows[0]) return res.json({ exam: e, session: existing.rows[0] });

    // Créer la session
    const session = await pool.query(
      'INSERT INTO exam_sessions (exam_id, user_id) VALUES ($1,$2) RETURNING *',
      [e.id, req.user.id]
    );

    res.json({ exam: e, session: session.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET challenges de l'examen (seulement si session active)
router.get('/:id/challenges', authMiddleware, async (req, res) => {
  try {
    const session = await pool.query(
      'SELECT * FROM exam_sessions WHERE exam_id=$1 AND user_id=$2 AND status=$3',
      [req.params.id, req.user.id, 'in_progress']
    );
    if (!session.rows[0]) return res.status(403).json({ error: 'Session introuvable ou terminée' });

    // Vérif timer
    const exam = await pool.query('SELECT * FROM exams WHERE id=$1', [req.params.id]);
    const e = exam.rows[0];
    const elapsed = (Date.now() - new Date(session.rows[0].started_at)) / 1000 / 60;
    if (elapsed > e.duration_minutes) {
      await pool.query(
        'UPDATE exam_sessions SET status=$1, finished_at=NOW() WHERE id=$2',
        ['timed_out', session.rows[0].id]
      );
      return res.status(403).json({ error: 'Temps écoulé !' });
    }

    const challenges = await pool.query(`
      SELECT c.id, c.title, c.description, c.category, c.hint, c.file_name,
             ec.points, ec.order_index,
             BOOL_OR(es2.is_correct AND es2.session_id=$1) as solved
      FROM exam_challenges ec
      JOIN challenges c ON c.id = ec.challenge_id
      LEFT JOIN exam_submissions es2 ON es2.challenge_id = c.id AND es2.session_id=$1
      WHERE ec.exam_id = $2
      GROUP BY c.id, ec.points, ec.order_index
      ORDER BY ec.order_index ASC
    `, [session.rows[0].id, req.params.id]);

    const timeLeft = Math.max(0, e.duration_minutes * 60 - elapsed * 60);

    res.json({
      challenges: challenges.rows,
      session: session.rows[0],
      time_left_seconds: Math.floor(timeLeft)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST soumettre un flag pendant l'examen
router.post('/:id/submit', authMiddleware, async (req, res) => {
  const { challenge_id, flag } = req.body;
  if (!challenge_id || !flag) return res.status(400).json({ error: 'challenge_id et flag requis' });

  try {
    const session = await pool.query(
      'SELECT * FROM exam_sessions WHERE exam_id=$1 AND user_id=$2 AND status=$3',
      [req.params.id, req.user.id, 'in_progress']
    );
    if (!session.rows[0]) return res.status(403).json({ error: 'Session introuvable ou terminée' });

    // Vérif timer
    const exam = await pool.query('SELECT * FROM exams WHERE id=$1', [req.params.id]);
    const elapsed = (Date.now() - new Date(session.rows[0].started_at)) / 1000 / 60;
    if (elapsed > exam.rows[0].duration_minutes) {
      await pool.query('UPDATE exam_sessions SET status=$1, finished_at=NOW() WHERE id=$2', ['timed_out', session.rows[0].id]);
      return res.status(403).json({ error: 'Temps écoulé !' });
    }

    // Déjà résolu ?
    const already = await pool.query(
      'SELECT * FROM exam_submissions WHERE session_id=$1 AND challenge_id=$2 AND is_correct=true',
      [session.rows[0].id, challenge_id]
    );
    if (already.rows[0]) return res.status(400).json({ error: 'Déjà résolu !' });

    // Vérif flag
    const challenge = await pool.query(
      'SELECT c.flag, ec.points FROM challenges c JOIN exam_challenges ec ON ec.challenge_id=c.id WHERE c.id=$1 AND ec.exam_id=$2',
      [challenge_id, req.params.id]
    );
    if (!challenge.rows[0]) return res.status(404).json({ error: 'Challenge introuvable' });

    const isCorrect = flag.trim() === challenge.rows[0].flag.trim();

    await pool.query(
      'INSERT INTO exam_submissions (session_id, challenge_id, submitted_flag, is_correct) VALUES ($1,$2,$3,$4)',
      [session.rows[0].id, challenge_id, flag.trim(), isCorrect]
    );

    if (isCorrect) {
      await pool.query(
        'UPDATE exam_sessions SET score = score + $1 WHERE id=$2',
        [challenge.rows[0].points, session.rows[0].id]
      );
      return res.json({ correct: true, points: challenge.rows[0].points, message: '🎉 Correct !' });
    }

    return res.json({ correct: false, message: '❌ Flag incorrect' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST terminer l'examen
router.post('/:id/finish', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE exam_sessions SET status='finished', finished_at=NOW()
       WHERE exam_id=$1 AND user_id=$2 AND status='in_progress' RETURNING *`,
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Session introuvable' });

    // Certificat si score >= 70%
    const examChallenges = await pool.query(
      'SELECT SUM(points) as total FROM exam_challenges WHERE exam_id=$1',
      [req.params.id]
    );
    const totalPoints = parseInt(examChallenges.rows[0].total) || 0;
    const score = result.rows[0].score;
    const percentage = totalPoints > 0 ? (score / totalPoints) * 100 : 0;

    if (percentage >= 70) {
      await pool.query(
        'INSERT INTO certificates (user_id, exam_id, type, score) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING',
        [req.user.id, req.params.id, 'exam', score]
      );
    }

    res.json({
      session: result.rows[0],
      percentage: Math.round(percentage),
      certificate: percentage >= 70
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET mes examens
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*, es.score, es.status as session_status, es.started_at, es.finished_at,
             s.name as school_name
      FROM exams e
      JOIN schools s ON s.id = e.school_id
      JOIN school_members sm ON sm.school_id = e.school_id AND sm.user_id = $1
      LEFT JOIN exam_sessions es ON es.exam_id = e.id AND es.user_id = $1
      ORDER BY e.start_date DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;