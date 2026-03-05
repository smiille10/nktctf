const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const authMiddleware = require('../middleware/auth');

// GET mon profil + challenges résolus
router.get('/solved', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.id, c.title, c.category, c.difficulty, c.points, s.solved_at
      FROM solves s
      JOIN challenges c ON c.id = s.challenge_id
      WHERE s.user_id = $1
      ORDER BY s.solved_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET profil public d'un user
router.get('/:username', authMiddleware, async (req, res) => {
  try {
    const user = await pool.query(
      'SELECT id, username, score, plan, role, created_at FROM users WHERE username = $1',
      [req.params.username]
    );
    if (!user.rows[0]) return res.status(404).json({ error: 'Utilisateur introuvable' });

    const solved = await pool.query(`
      SELECT c.id, c.title, c.category, c.difficulty, c.points, s.solved_at
      FROM solves s
      JOIN challenges c ON c.id = s.challenge_id
      WHERE s.user_id = $1
      ORDER BY s.solved_at DESC
    `, [user.rows[0].id]);

    res.json({
      ...user.rows[0],
      solved_challenges: solved.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;