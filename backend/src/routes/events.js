const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const authMiddleware = require('../middleware/auth');

// GET tous les events publics
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*,
        COUNT(DISTINCT er.user_id) as participants,
        BOOL_OR(er.user_id = $1) as is_registered
      FROM events e
      LEFT JOIN event_registrations er ON er.event_id = e.id
      WHERE e.is_active = true
      GROUP BY e.id
      ORDER BY e.start_date DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET un event
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*,
        COUNT(DISTINCT er.user_id) as participants,
        BOOL_OR(er.user_id = $1) as is_registered
      FROM events e
      LEFT JOIN event_registrations er ON er.event_id = e.id
      WHERE e.id = $2
      GROUP BY e.id
    `, [req.user.id, req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Event introuvable' });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST register à un event
router.post('/:id/register', authMiddleware, async (req, res) => {
  try {
    const event = await pool.query('SELECT * FROM events WHERE id = $1', [req.params.id]);
    if (!event.rows[0]) return res.status(404).json({ error: 'Event introuvable' });

    const count = await pool.query(
      'SELECT COUNT(*) FROM event_registrations WHERE event_id = $1',
      [req.params.id]
    );
    if (parseInt(count.rows[0].count) >= event.rows[0].max_participants) {
      return res.status(400).json({ error: 'Event complet !' });
    }

    await pool.query(
      'INSERT INTO event_registrations (event_id, user_id) VALUES ($1, $2)',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Inscription réussie !' });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Tu es déjà inscrit !' });
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST unregister
router.delete('/:id/register', authMiddleware, async (req, res) => {
  await pool.query(
    'DELETE FROM event_registrations WHERE event_id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  res.json({ message: 'Désinscription réussie' });
});

module.exports = router;