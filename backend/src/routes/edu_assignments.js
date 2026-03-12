const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const authMiddleware = require('../middleware/auth');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const isSuperAdmin = (req, res, next) => {
  if (req.user.role === 'superadmin') return next();
  res.status(403).json({ error: 'SuperAdmin requis' });
};

// ─── ADMIN — Gérer les devoirs ────────────────────────

// POST créer un devoir
router.post('/', authMiddleware, isSuperAdmin, async (req, res) => {
  const { school_id, title, description, due_date, course_id } = req.body;
  if (!school_id || !title) return res.status(400).json({ error: 'school_id et title requis' });
  try {
    const result = await pool.query(
      `INSERT INTO assignments (school_id, title, description, due_date, course_id, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [school_id, title, description, due_date, course_id, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET devoirs d'une école
router.get('/school/:schoolId', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM assignments WHERE school_id=$1 ORDER BY due_date ASC',
      [req.params.schoolId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET mes devoirs
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*,
        asub.submitted_at, asub.grade, asub.feedback,
        CASE WHEN asub.id IS NOT NULL THEN true ELSE false END as submitted
      FROM assignments a
      JOIN school_members sm ON sm.school_id = a.school_id AND sm.user_id = $1
      LEFT JOIN assignment_submissions asub ON asub.assignment_id = a.id AND asub.user_id = $1
      ORDER BY a.due_date ASC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST rendre un devoir
router.post('/:id/submit', authMiddleware, upload.single('file'), async (req, res) => {
  const { content } = req.body;
  try {
    const file_name = req.file ? req.file.originalname : null;
    const file_data = req.file ? req.file.buffer.toString('base64') : null;

    const result = await pool.query(`
      INSERT INTO assignment_submissions (assignment_id, user_id, content, file_name, file_data)
      VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (assignment_id, user_id)
      DO UPDATE SET content=$3, file_name=$4, file_data=$5, submitted_at=NOW()
      RETURNING *
    `, [req.params.id, req.user.id, content, file_name, file_data]);

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET rendus d'un devoir (admin)
router.get('/:id/submissions', authMiddleware, isSuperAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT asub.*, u.username, u.email
      FROM assignment_submissions asub
      JOIN users u ON u.id = asub.user_id
      WHERE asub.assignment_id = $1
      ORDER BY asub.submitted_at DESC
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST noter un devoir
router.post('/:id/submissions/:userId/grade', authMiddleware, isSuperAdmin, async (req, res) => {
  const { grade, feedback } = req.body;
  try {
    const result = await pool.query(`
      UPDATE assignment_submissions SET grade=$1, feedback=$2, graded_at=NOW()
      WHERE assignment_id=$3 AND user_id=$4 RETURNING *
    `, [grade, feedback, req.params.id, req.params.userId]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;