const express = require('express');
const router  = express.Router();
const pool    = require('../db/pool');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.score, u.created_at,
       COUNT(s.id)::int as solves
       FROM users u
       LEFT JOIN solves s ON s.user_id = u.id
       GROUP BY u.id
       ORDER BY u.score DESC, u.created_at ASC
       LIMIT 100`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Scoreboard error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
