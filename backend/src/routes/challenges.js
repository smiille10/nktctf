const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const authMiddleware = require('../middleware/auth');
const { flagLimiter } = require('../middleware/rateLimit');
const path = require('path');
const fs = require('fs');

// GET tous les challenges
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.id, c.title, c.category, c.description, c.points,
        c.hint, c.file_name, c.file_path, c.is_active, c.difficulty,
        BOOL_OR(s.user_id = $1) as solved,
        COUNT(DISTINCT s.user_id) as solves
      FROM challenges c
      LEFT JOIN solves s ON s.challenge_id = c.id
      WHERE c.is_active = true
      GROUP BY c.id
      ORDER BY c.points ASC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET un challenge
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.id, c.title, c.category, c.description, c.points,
        c.hint, c.file_name, c.is_active, c.difficulty,
        BOOL_OR(s.user_id = $1) as solved,
        COUNT(DISTINCT s.user_id) as solves
      FROM challenges c
      LEFT JOIN solves s ON s.challenge_id = c.id
      WHERE c.id = $2
      GROUP BY c.id
    `, [req.user.id, req.params.id]);

    if (!result.rows[0]) return res.status(404).json({ error: 'Challenge introuvable' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST submit flag
router.post('/:id/submit', authMiddleware, flagLimiter, async (req, res) => {
  const { flag } = req.body;
  console.log('=== SUBMIT FLAG ===');
  console.log('user:', req.user);
  console.log('challenge id:', req.params.id);
  console.log('flag reçu:', flag);

  if (!flag) return res.status(400).json({ error: 'Flag manquant' });

  try {
    const ch = await pool.query('SELECT * FROM challenges WHERE id = $1', [req.params.id]);
    console.log('challenge trouvé:', ch.rows[0]);

    if (!ch.rows[0]) return res.status(404).json({ error: 'Challenge introuvable' });

    const already = await pool.query(
      'SELECT id FROM solves WHERE challenge_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (already.rows[0]) return res.status(400).json({ error: 'Déjà résolu !' });

    const isCorrect = flag.trim() === ch.rows[0].flag.trim();
    console.log('flag attendu:', ch.rows[0].flag);
    console.log('isCorrect:', isCorrect);

    await pool.query(
      'INSERT INTO submissions (challenge_id, user_id, submitted_flag, is_correct) VALUES ($1, $2, $3, $4)',
      [req.params.id, req.user.id, flag.trim(), isCorrect]
    );

    if (isCorrect) {
      await pool.query('INSERT INTO solves (challenge_id, user_id) VALUES ($1, $2)', [req.params.id, req.user.id]);
      await pool.query('UPDATE users SET score = score + $1 WHERE id = $2', [ch.rows[0].points, req.user.id]);
      return res.json({ correct: true, points: ch.rows[0].points, message: '🎉 Correct ! +' + ch.rows[0].points + ' pts' });
    }

    return res.json({ correct: false, message: '❌ Flag incorrect !' });

  } catch (err) {
    console.error('=== ERREUR SUBMIT ===', err.message);
    console.error(err.stack);
    res.status(500).json({ error: err.message });
  }
});

// GET download fichier
router.get('/:id/download', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT file_path, file_name FROM challenges WHERE id = $1',
      [req.params.id]
    );
    const ch = result.rows[0];
    if (!ch || !ch.file_path) return res.status(404).json({ error: 'Fichier introuvable' });

    const filePath = path.join(__dirname, '../../uploads', ch.file_path);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Fichier introuvable sur le serveur' });

    res.download(filePath, ch.file_name);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;