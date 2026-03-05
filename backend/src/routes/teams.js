const express  = require('express');
const router   = express.Router();
const pool     = require('../db/pool');
const auth     = require('../middleware/auth');
const crypto   = require('crypto');

// Génère un code invite unique (6 chars)
const genCode = () => crypto.randomBytes(3).toString('hex').toUpperCase();

// ── GET ma team ──────────────────────────────────────
router.get('/mine', auth, async (req, res) => {
  try {
    const member = await pool.query(
      'SELECT team_id FROM team_members WHERE user_id = $1',
      [req.user.id]
    );
    if (!member.rows[0]) return res.json(null);

    const teamId = member.rows[0].team_id;

    const team = await pool.query(`
      SELECT t.*, u.username AS captain_name
      FROM teams t
      JOIN users u ON u.id = t.captain_id
      WHERE t.id = $1
    `, [teamId]);

    const members = await pool.query(`
      SELECT u.id, u.username, u.score, tm.joined_at,
             (t.captain_id = u.id) AS is_captain
      FROM team_members tm
      JOIN users u ON u.id = tm.user_id
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.team_id = $1
      ORDER BY u.score DESC
    `, [teamId]);

    const solves = await pool.query(`
      SELECT s.solved_at, u.username, c.title, c.category, c.difficulty, c.points
      FROM solves s
      JOIN users u ON u.id = s.user_id
      JOIN challenges c ON c.id = s.challenge_id
      WHERE s.user_id = ANY(
        SELECT user_id FROM team_members WHERE team_id = $1
      )
      ORDER BY s.solved_at DESC
    `, [teamId]);

    const totalScore = members.rows.reduce((acc, m) => acc + (m.score || 0), 0);

    res.json({
      ...team.rows[0],
      members: members.rows,
      solves: solves.rows,
      total_score: totalScore,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST créer une team ──────────────────────────────
router.post('/create', auth, async (req, res) => {
  const { name } = req.body;
  if (!name || name.trim().length < 3) {
    return res.status(400).json({ error: 'Nom trop court (min 3 caractères)' });
  }
  try {
    // Vérifie si déjà dans une team
    const already = await pool.query(
      'SELECT id FROM team_members WHERE user_id = $1', [req.user.id]
    );
    if (already.rows[0]) {
      return res.status(400).json({ error: 'Tu es déjà dans une team' });
    }

    let invite_code;
    let exists = true;
    while (exists) {
      invite_code = genCode();
      const check = await pool.query('SELECT id FROM teams WHERE invite_code = $1', [invite_code]);
      exists = check.rows.length > 0;
    }

    const team = await pool.query(
      'INSERT INTO teams (name, captain_id, invite_code) VALUES ($1, $2, $3) RETURNING *',
      [name.trim(), req.user.id, invite_code]
    );

    await pool.query(
      'INSERT INTO team_members (team_id, user_id) VALUES ($1, $2)',
      [team.rows[0].id, req.user.id]
    );

    res.json(team.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Ce nom de team est déjà pris' });
    res.status(500).json({ error: err.message });
  }
});

// ── POST rejoindre une team ──────────────────────────
router.post('/join', auth, async (req, res) => {
  const { invite_code } = req.body;
  if (!invite_code) return res.status(400).json({ error: 'Code requis' });
  try {
    const already = await pool.query(
      'SELECT id FROM team_members WHERE user_id = $1', [req.user.id]
    );
    if (already.rows[0]) {
      return res.status(400).json({ error: 'Tu es déjà dans une team' });
    }

    const team = await pool.query(
      'SELECT * FROM teams WHERE invite_code = $1', [invite_code.toUpperCase()]
    );
    if (!team.rows[0]) return res.status(404).json({ error: 'Code invalide' });

    const count = await pool.query(
      'SELECT COUNT(*) FROM team_members WHERE team_id = $1', [team.rows[0].id]
    );
    if (parseInt(count.rows[0].count) >= 4) {
      return res.status(400).json({ error: 'Team complète (max 4 membres)' });
    }

    await pool.query(
      'INSERT INTO team_members (team_id, user_id) VALUES ($1, $2)',
      [team.rows[0].id, req.user.id]
    );

    res.json({ message: 'Rejoint avec succès !', team: team.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE quitter la team ───────────────────────────
router.delete('/leave', auth, async (req, res) => {
  try {
    const member = await pool.query(
      'SELECT team_id FROM team_members WHERE user_id = $1', [req.user.id]
    );
    if (!member.rows[0]) return res.status(400).json({ error: 'Tu n\'es pas dans une team' });

    const teamId = member.rows[0].team_id;
    const team = await pool.query('SELECT * FROM teams WHERE id = $1', [teamId]);

    if (team.rows[0].captain_id === req.user.id) {
      // Captain qui part → détruire la team
      await pool.query('DELETE FROM teams WHERE id = $1', [teamId]);
    } else {
      await pool.query(
        'DELETE FROM team_members WHERE user_id = $1 AND team_id = $2',
        [req.user.id, teamId]
      );
    }

    res.json({ message: 'Quitté avec succès' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE kick un membre (captain seulement) ────────
router.delete('/:teamId/kick/:userId', auth, async (req, res) => {
  try {
    const team = await pool.query('SELECT * FROM teams WHERE id = $1', [req.params.teamId]);
    if (!team.rows[0]) return res.status(404).json({ error: 'Team introuvable' });
    if (team.rows[0].captain_id !== req.user.id) {
      return res.status(403).json({ error: 'Seul le captain peut kick' });
    }
    if (parseInt(req.params.userId) === req.user.id) {
      return res.status(400).json({ error: 'Tu ne peux pas te kick toi-même' });
    }

    await pool.query(
      'DELETE FROM team_members WHERE user_id = $1 AND team_id = $2',
      [req.params.userId, req.params.teamId]
    );

    res.json({ message: 'Membre kické' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET messages du chat ─────────────────────────────
router.get('/:teamId/messages', auth, async (req, res) => {
  try {
    // Vérifie que l'user est dans la team
    const member = await pool.query(
      'SELECT id FROM team_members WHERE user_id = $1 AND team_id = $2',
      [req.user.id, req.params.teamId]
    );
    if (!member.rows[0]) return res.status(403).json({ error: 'Non autorisé' });

    const messages = await pool.query(`
      SELECT tm.id, tm.message, tm.created_at, u.username,
             (t.captain_id = tm.user_id) AS is_captain
      FROM team_messages tm
      JOIN users u ON u.id = tm.user_id
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.team_id = $1
      ORDER BY tm.created_at ASC
      LIMIT 100
    `, [req.params.teamId]);

    res.json(messages.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST envoyer un message ──────────────────────────
router.post('/:teamId/messages', auth, async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) return res.status(400).json({ error: 'Message vide' });
  try {
    const member = await pool.query(
      'SELECT id FROM team_members WHERE user_id = $1 AND team_id = $2',
      [req.user.id, req.params.teamId]
    );
    if (!member.rows[0]) return res.status(403).json({ error: 'Non autorisé' });

    const msg = await pool.query(`
      INSERT INTO team_messages (team_id, user_id, message)
      VALUES ($1, $2, $3)
      RETURNING id, message, created_at
    `, [req.params.teamId, req.user.id, message.trim()]);

    res.json({
      ...msg.rows[0],
      username: req.user.username,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;