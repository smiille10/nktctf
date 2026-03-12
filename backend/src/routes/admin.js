const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// ─── MIDDLEWARE ───────────────────────────────────────

const isAdminOrManager = (req, res, next) => {
  if (req.user.role === 'superadmin' || req.user.role === 'manager') return next();
  res.status(403).json({ error: 'Accès refusé' });
};

const isSuperAdmin = (req, res, next) => {
  if (req.user.role === 'superadmin') return next();
  res.status(403).json({ error: 'Accès refusé — SuperAdmin requis' });
};

// ─── STATS ───────────────────────────────────────────

router.get('/stats', authMiddleware, isAdminOrManager, async (req, res) => {
  const users       = await pool.query('SELECT COUNT(*) FROM users');
  const challenges  = await pool.query('SELECT COUNT(*) FROM challenges');
  const solves      = await pool.query('SELECT COUNT(*) FROM solves');
  const submissions = await pool.query('SELECT COUNT(*) FROM submissions');
  res.json({
    users:       parseInt(users.rows[0].count),
    challenges:  parseInt(challenges.rows[0].count),
    solves:      parseInt(solves.rows[0].count),
    submissions: parseInt(submissions.rows[0].count),
  });
});

// ─── CHALLENGES ───────────────────────────────────────

router.get('/challenges', authMiddleware, isAdminOrManager, async (req, res) => {
  const result = await pool.query('SELECT * FROM challenges ORDER BY created_at DESC');
  res.json(result.rows);
});

// POST créer challenge avec fichier
router.post('/challenges', authMiddleware, isAdminOrManager, upload.single('file'), async (req, res) => {
  const { title, category, description, points, flag, hint, difficulty } = req.body;

  if (!title || !category || !description || !points || !flag) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Champs requis manquants' });
  }

  try {
    const file_name = req.file ? req.file.originalname : null;
    const file_path = req.file ? req.file.filename : null;

    const result = await pool.query(
      `INSERT INTO challenges (title, category, description, points, flag, hint, difficulty, file_name, file_path, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true) RETURNING *`,
      [title, category, description, parseInt(points), flag, hint || null, difficulty || 'Easy', file_name, file_path]
    );
    res.json(result.rows[0]);
  } catch (err) {
    if (req.file) fs.unlinkSync(req.file.path);
    console.error(err);
    res.status(500).json({ error: 'Erreur création challenge' });
  }
});

// PUT modifier challenge
router.put('/challenges/:id', authMiddleware, isAdminOrManager, upload.single('file'), async (req, res) => {
  const { title, category, description, points, flag, hint, difficulty } = req.body;
  try {
    const existing = await pool.query('SELECT * FROM challenges WHERE id = $1', [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'Challenge introuvable' });

    let file_name = existing.rows[0].file_name;
    let file_path = existing.rows[0].file_path;

    if (req.file) {
      // Supprime l'ancien fichier
      if (file_path) {
        const oldPath = path.join(__dirname, '../../uploads', file_path);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      file_name = req.file.originalname;
      file_path = req.file.filename;
    }

    const result = await pool.query(
      `UPDATE challenges SET title=$1, category=$2, description=$3, points=$4,
       flag=$5, hint=$6, difficulty=$7, file_name=$8, file_path=$9
       WHERE id=$10 RETURNING *`,
      [title, category, description, parseInt(points), flag, hint || null, difficulty || 'Easy', file_name, file_path, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur modification challenge' });
  }
});

// PATCH toggle challenge actif/inactif
router.patch('/challenges/:id/toggle', authMiddleware, isAdminOrManager, async (req, res) => {
  const result = await pool.query(
    'UPDATE challenges SET is_active = NOT is_active WHERE id = $1 RETURNING *',
    [req.params.id]
  );
  res.json(result.rows[0]);
});

// DELETE challenge
router.delete('/challenges/:id', authMiddleware, isAdminOrManager, async (req, res) => {
  const ch = await pool.query('SELECT file_path FROM challenges WHERE id = $1', [req.params.id]);
  if (ch.rows[0]?.file_path) {
    const filePath = path.join(__dirname, '../../uploads', ch.rows[0].file_path);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  await pool.query('DELETE FROM challenges WHERE id = $1', [req.params.id]);
  res.json({ message: 'Challenge supprimé' });
});

// ─── USERS ────────────────────────────────────────────

router.get('/users', authMiddleware, isSuperAdmin, async (req, res) => {
  const result = await pool.query(
    'SELECT id, username, email, role, score, email_verified, created_at FROM users ORDER BY created_at DESC'
  );
  res.json(result.rows);
});

router.post('/users', authMiddleware, isSuperAdmin, async (req, res) => {
  const { username, email, password, role } = req.body;
  try {
    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, role, email_verified)
       VALUES ($1, $2, $3, $4, true) RETURNING id, username, email, role`,
      [username, email, hash, role || 'user']
    );
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Username ou email déjà utilisé' });
    res.status(500).json({ error: 'Erreur création utilisateur' });
  }
});

router.patch('/users/:id/role', authMiddleware, isSuperAdmin, async (req, res) => {
  const { role } = req.body;
  await pool.query('UPDATE users SET role = $1 WHERE id = $2', [role, req.params.id]);
  res.json({ message: 'Rôle mis à jour' });
});

router.delete('/users/:id', authMiddleware, isSuperAdmin, async (req, res) => {
  await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
  res.json({ message: 'Utilisateur supprimé' });
});

// ─── EVENTS ───────────────────────────────────────────

router.get('/events', authMiddleware, isAdminOrManager, async (req, res) => {
  const result = await pool.query(`
    SELECT e.*, COUNT(er.user_id) as participants
    FROM events e
    LEFT JOIN event_registrations er ON er.event_id = e.id
    GROUP BY e.id ORDER BY e.created_at DESC
  `);
  res.json(result.rows);
});

router.post('/events', authMiddleware, isAdminOrManager, async (req, res) => {
  const { title, description, mode, is_free, price, max_participants, start_date, end_date, status } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO events (title, description, mode, is_free, price, max_participants, start_date, end_date, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [title, description, mode || 'solo', is_free !== false, price || 0, max_participants || 50, start_date, end_date, status || 'upcoming']
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur création event' });
  }
});

router.patch('/events/:id', authMiddleware, isAdminOrManager, async (req, res) => {
  const { title, description, mode, is_free, price, max_participants, start_date, end_date, status } = req.body;
  const result = await pool.query(
    `UPDATE events SET title=$1, description=$2, mode=$3, is_free=$4, price=$5,
     max_participants=$6, start_date=$7, end_date=$8, status=$9
     WHERE id=$10 RETURNING *`,
    [title, description, mode, is_free, price, max_participants, start_date, end_date, status, req.params.id]
  );
  res.json(result.rows[0]);
});

router.delete('/events/:id', authMiddleware, isAdminOrManager, async (req, res) => {
  await pool.query('DELETE FROM events WHERE id = $1', [req.params.id]);
  res.json({ message: 'Event supprimé' });
});

// ─── DATABASE VIEWER ──────────────────────────────────

router.get('/db/:table', authMiddleware, isSuperAdmin, async (req, res) => {
  const allowed = [
    'users', 'challenges', 'solves', 'submissions', 'events',
    'event_registrations', 'subscriptions', 'teams', 'team_members', 'team_messages',
    'schools', 'school_members', 'courses', 'chapters', 'lessons',
    'exams', 'exam_challenges', 'exam_sessions', 'exam_submissions',
    'assignments', 'assignment_submissions', 'certificates', 'course_progress'
  ];
  if (!allowed.includes(req.params.table)) {
    return res.status(400).json({ error: 'Table non autorisée' });
  }
  const result = await pool.query(`SELECT * FROM ${req.params.table} ORDER BY id DESC LIMIT 100`);
  res.json(result.rows);
});

// PATCH modifier un user complet
router.patch('/users/:id', authMiddleware, isSuperAdmin, async (req, res) => {
  const { username, email, password } = req.body;
  try {
    if (password) {
      const hash = await bcrypt.hash(password, 12);
      await pool.query(
        'UPDATE users SET username=$1, email=$2, password_hash=$3 WHERE id=$4',
        [username, email, hash, req.params.id]
      );
    } else {
      await pool.query(
        'UPDATE users SET username=$1, email=$2 WHERE id=$3',
        [username, email, req.params.id]
      );
    }
    const updated = await pool.query(
      'SELECT id, username, email, role, score, email_verified FROM users WHERE id=$1',
      [req.params.id]
    );
    res.json(updated.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Username ou email déjà utilisé' });
    res.status(500).json({ error: err.message });
  }
});


// GET télécharger le fichier d'un challenge (accessible pendant examen)
router.get('/challenges/:id/file', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT file_name, file_data FROM challenges WHERE id=$1',
      [req.params.id]
    );
    const ch = result.rows[0];
    if (!ch || !ch.file_data) return res.status(404).json({ error: 'Fichier introuvable' });

    const buffer = Buffer.from(ch.file_data, 'base64');
    res.setHeader('Content-Disposition', `attachment; filename="${ch.file_name}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;