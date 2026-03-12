const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const authMiddleware = require('../middleware/auth');

const isSuperAdmin = (req, res, next) => {
  if (req.user.role === 'superadmin') return next();
  res.status(403).json({ error: 'SuperAdmin requis' });
};

// ─── COURS ────────────────────────────────────────────

// GET tous les cours publiés
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*,
        COUNT(DISTINCT ch.id)::int as chapter_count,
        COUNT(DISTINCT l.id)::int as lesson_count,
        BOOL_OR(cp.user_id = $1 AND cp.completed = true) as started
      FROM courses c
      LEFT JOIN chapters ch ON ch.course_id = c.id
      LEFT JOIN lessons l ON l.course_id = c.id
      LEFT JOIN course_progress cp ON cp.course_id = c.id AND cp.user_id = $1
      WHERE c.is_published = true
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET un cours avec chapitres et leçons
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const course = await pool.query('SELECT * FROM courses WHERE id=$1', [req.params.id]);
    if (!course.rows[0]) return res.status(404).json({ error: 'Cours introuvable' });

    const chapters = await pool.query(
      'SELECT * FROM chapters WHERE course_id=$1 ORDER BY order_index ASC',
      [req.params.id]
    );

    const lessons = await pool.query(`
      SELECT l.*,
        COALESCE(cp.completed, false) as completed
      FROM lessons l
      LEFT JOIN course_progress cp ON cp.lesson_id = l.id AND cp.user_id = $1
      WHERE l.course_id = $2
      ORDER BY l.order_index ASC
    `, [req.user.id, req.params.id]);

    // Groupe les leçons par chapitre
    const chaptersWithLessons = chapters.rows.map(ch => ({
      ...ch,
      lessons: lessons.rows.filter(l => l.chapter_id === ch.id)
    }));

    res.json({ ...course.rows[0], chapters: chaptersWithLessons });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET une leçon
router.get('/:courseId/lessons/:lessonId', authMiddleware, async (req, res) => {
  try {
    const lesson = await pool.query(
      'SELECT * FROM lessons WHERE id=$1 AND course_id=$2',
      [req.params.lessonId, req.params.courseId]
    );
    if (!lesson.rows[0]) return res.status(404).json({ error: 'Leçon introuvable' });
    res.json(lesson.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST marquer une leçon comme complétée
router.post('/:courseId/lessons/:lessonId/complete', authMiddleware, async (req, res) => {
  try {
    await pool.query(`
      INSERT INTO course_progress (user_id, lesson_id, course_id, completed, completed_at)
      VALUES ($1,$2,$3,true,NOW())
      ON CONFLICT (user_id, lesson_id) DO UPDATE SET completed=true, completed_at=NOW()
    `, [req.user.id, req.params.lessonId, req.params.courseId]);
    res.json({ message: 'Leçon complétée !' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ADMIN — Créer/modifier les cours ─────────────────

// POST créer un cours
router.post('/', authMiddleware, isSuperAdmin, async (req, res) => {
  const { title, description, category, difficulty, thumbnail } = req.body;
  if (!title) return res.status(400).json({ error: 'Titre requis' });
  try {
    const result = await pool.query(
      `INSERT INTO courses (title, description, category, difficulty, thumbnail, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [title, description, category, difficulty || 'beginner', thumbnail, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT modifier un cours
router.put('/:id', authMiddleware, isSuperAdmin, async (req, res) => {
  const { title, description, category, difficulty, thumbnail, is_published } = req.body;
  try {
    const result = await pool.query(
      `UPDATE courses SET title=$1, description=$2, category=$3,
       difficulty=$4, thumbnail=$5, is_published=$6 WHERE id=$7 RETURNING *`,
      [title, description, category, difficulty, thumbnail, is_published, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE supprimer un cours
router.delete('/:id', authMiddleware, isSuperAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM courses WHERE id=$1', [req.params.id]);
    res.json({ message: 'Cours supprimé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST créer un chapitre
router.post('/:courseId/chapters', authMiddleware, isSuperAdmin, async (req, res) => {
  const { title, order_index } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO chapters (course_id, title, order_index) VALUES ($1,$2,$3) RETURNING *',
      [req.params.courseId, title, order_index || 0]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST créer une leçon
router.post('/:courseId/chapters/:chapterId/lessons', authMiddleware, isSuperAdmin, async (req, res) => {
  const { title, content, type, video_url, order_index, duration_minutes } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO lessons (chapter_id, course_id, title, content, type, video_url, order_index, duration_minutes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.params.chapterId, req.params.courseId, title, content, type || 'text', video_url, order_index || 0, duration_minutes || 5]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT modifier une leçon
router.put('/:courseId/lessons/:lessonId', authMiddleware, isSuperAdmin, async (req, res) => {
  const { title, content, type, video_url, duration_minutes } = req.body;
  try {
    const result = await pool.query(
      `UPDATE lessons SET title=$1, content=$2, type=$3, video_url=$4, duration_minutes=$5
       WHERE id=$6 RETURNING *`,
      [title, content, type, video_url, duration_minutes, req.params.lessonId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE supprimer une leçon
router.delete('/:courseId/lessons/:lessonId', authMiddleware, isSuperAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM lessons WHERE id=$1', [req.params.lessonId]);
    res.json({ message: 'Leçon supprimée' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;