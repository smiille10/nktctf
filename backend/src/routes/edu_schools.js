const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const authMiddleware = require('../middleware/auth');
const crypto = require('crypto');

const isSuperAdmin = (req, res, next) => {
  if (req.user.role === 'superadmin') return next();
  res.status(403).json({ error: 'SuperAdmin requis' });
};

const isTeacherOrAdmin = (req, res, next) => {
  if (['superadmin', 'teacher'].includes(req.user.role)) return next();
  res.status(403).json({ error: 'Accès refusé' });
};

// Génère un code unique
const generateCode = () => crypto.randomBytes(4).toString('hex').toUpperCase();

// ─── ADMIN — Gérer les écoles ─────────────────────────

// GET toutes les écoles
router.get('/', authMiddleware, isSuperAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, COUNT(sm.user_id)::int as member_count
      FROM schools s
      LEFT JOIN school_members sm ON sm.school_id = s.id
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST créer une école
router.post('/', authMiddleware, isSuperAdmin, async (req, res) => {
  const { name, email, phone, country, city, plan, expires_at } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Nom et email requis' });

  const plans = { starter: 50, school: 200, enterprise: 99999 };
  const max_students = plans[plan] || 50;
  const access_code = generateCode();

  try {
    const result = await pool.query(
      `INSERT INTO schools (name, email, phone, country, city, plan, max_students, access_code, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name, email, phone, country || 'Mauritanie', city, plan || 'starter', max_students, access_code, expires_at]
    );
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email déjà utilisé' });
    res.status(500).json({ error: err.message });
  }
});

// PUT modifier une école
router.put('/:id', authMiddleware, isSuperAdmin, async (req, res) => {
  const { name, email, phone, plan, expires_at, is_active } = req.body;
  const plans = { starter: 50, school: 200, enterprise: 99999 };
  const max_students = plans[plan] || 50;
  try {
    const result = await pool.query(
      `UPDATE schools SET name=$1, email=$2, phone=$3, plan=$4,
       max_students=$5, expires_at=$6, is_active=$7 WHERE id=$8 RETURNING *`,
      [name, email, phone, plan, max_students, expires_at, is_active, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE supprimer une école
router.delete('/:id', authMiddleware, isSuperAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM schools WHERE id = $1', [req.params.id]);
    res.json({ message: 'École supprimée' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST régénérer le code d'accès
router.post('/:id/regenerate-code', authMiddleware, isSuperAdmin, async (req, res) => {
  const access_code = generateCode();
  try {
    const result = await pool.query(
      'UPDATE schools SET access_code=$1 WHERE id=$2 RETURNING access_code',
      [access_code, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── REJOINDRE UNE ÉCOLE ──────────────────────────────

// POST rejoindre avec un code
router.post('/join', authMiddleware, async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Code requis' });

  try {
    const school = await pool.query(
      'SELECT * FROM schools WHERE access_code = $1 AND is_active = true',
      [code.toUpperCase()]
    );
    if (!school.rows[0]) return res.status(404).json({ error: 'Code invalide ou école inactive' });

    const s = school.rows[0];

    // Vérif expiration
    if (s.expires_at && new Date(s.expires_at) < new Date()) {
      return res.status(403).json({ error: 'Abonnement expiré' });
    }

    // Vérif limite étudiants
    const count = await pool.query(
      'SELECT COUNT(*) FROM school_members WHERE school_id = $1',
      [s.id]
    );
    if (parseInt(count.rows[0].count) >= s.max_students) {
      return res.status(403).json({ error: 'Limite d\'étudiants atteinte' });
    }

    // Déjà membre ?
    const existing = await pool.query(
      'SELECT * FROM school_members WHERE school_id=$1 AND user_id=$2',
      [s.id, req.user.id]
    );
    if (existing.rows[0]) return res.status(400).json({ error: 'Tu es déjà membre de cette école' });

    await pool.query(
      'INSERT INTO school_members (school_id, user_id, role) VALUES ($1,$2,$3)',
      [s.id, req.user.id, 'student']
    );

    // Update role utilisateur
    await pool.query('UPDATE users SET role=$1 WHERE id=$2', ['student', req.user.id]);

    res.json({ message: `Bienvenue dans ${s.name} !`, school: { id: s.id, name: s.name } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET ma school
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, sm.role as my_role
      FROM schools s
      JOIN school_members sm ON sm.school_id = s.id
      WHERE sm.user_id = $1
    `, [req.user.id]);
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET membres d'une école
router.get('/:id/members', authMiddleware, isTeacherOrAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.username, u.email, u.score, sm.role, sm.joined_at
      FROM school_members sm
      JOIN users u ON u.id = sm.user_id
      WHERE sm.school_id = $1
      ORDER BY sm.joined_at DESC
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;