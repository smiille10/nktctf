const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const authMiddleware = require('../middleware/auth');
const { flagLimiter } = require('../middleware/rateLimit');

// GET tous les challenges
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.id, c.title, c.category, c.description, c.points,
        c.hint, c.file_name, c.is_active, c.difficulty,
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
  if (!flag) return res.status(400).json({ error: 'Flag manquant' });

  try {
    const ch = await pool.query('SELECT * FROM challenges WHERE id = $1', [req.params.id]);
    if (!ch.rows[0]) return res.status(404).json({ error: 'Challenge introuvable' });

    const already = await pool.query(
      'SELECT id FROM solves WHERE challenge_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (already.rows[0]) return res.status(400).json({ error: 'Déjà résolu !' });

    const isCorrect = flag.trim() === ch.rows[0].flag.trim();

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
    console.error('ERREUR SUBMIT:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET download fichier — servi depuis la base de données
router.get('/:id/download', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT file_name, file_data FROM challenges WHERE id = $1',
      [req.params.id]
    );
    const ch = result.rows[0];

    if (!ch || !ch.file_data) {
      return res.status(404).json({ error: 'Aucun fichier pour ce challenge' });
    }

    const buffer = Buffer.from(ch.file_data, 'base64');
    res.setHeader('Content-Disposition', `attachment; filename="${ch.file_name}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);

  } catch (err) {
    console.error('ERREUR DOWNLOAD:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;