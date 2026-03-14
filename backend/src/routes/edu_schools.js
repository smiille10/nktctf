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
  const { name, email, phone, country, city, plan, expires_at, allowed_domain } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Nom et email requis' });

  const plans = { starter: 50, school: 200, enterprise: 99999 };
  const max_students = plans[plan] || 50;
  const access_code = generateCode();

  try {
    const result = await pool.query(
      `INSERT INTO schools (name, email, phone, country, city, plan, max_students, access_code, expires_at, allowed_domain)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [name, email, phone, country || 'Mauritanie', city, plan || 'starter', max_students, access_code, expires_at, allowed_domain || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email déjà utilisé' });
    res.status(500).json({ error: err.message });
  }
});

// PUT modifier une école
router.put('/:id', authMiddleware, isSuperAdmin, async (req, res) => {
  const { name, email, phone, plan, expires_at, is_active, allowed_domain } = req.body;
  const plans = { starter: 50, school: 200, enterprise: 99999 };
  const max_students = plans[plan] || 50;
  try {
    const result = await pool.query(
      `UPDATE schools SET name=$1, email=$2, phone=$3, plan=$4,
       max_students=$5, expires_at=$6, is_active=$7, allowed_domain=$8
       WHERE id=$9 RETURNING *`,
      [name, email, phone, plan, max_students, expires_at, is_active, allowed_domain || null, req.params.id]
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

    // ✅ Vérif domaine email
    if (s.allowed_domain) {
      const userRow = await pool.query('SELECT email FROM users WHERE id=$1', [req.user.id]);
      const userEmail = userRow.rows[0]?.email || '';
      const emailDomain = userEmail.split('@')[1]?.toLowerCase();
      const allowed = s.allowed_domain.toLowerCase().replace('@', '');
      if (emailDomain !== allowed) {
        return res.status(403).json({
          error: `Email non autorisé. Seuls les emails @${allowed} peuvent rejoindre cette école.`
        });
      }
    }

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

    // Update role uniquement si pas superadmin/manager
    if (!['superadmin', 'manager'].includes(req.user.role)) {
      await pool.query('UPDATE users SET role=$1 WHERE id=$2', ['student', req.user.id]);
    }

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
      SELECT u.id, u.username, u.email, u.score,
             sm.user_id, sm.role as school_role, sm.joined_at
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

// PUT changer le rôle d'un membre
router.put('/:id/members/:userId/role', authMiddleware, isSuperAdmin, async (req, res) => {
  const { role } = req.body;
  if (!['student', 'teacher'].includes(role))
    return res.status(400).json({ error: 'Rôle invalide (student ou teacher)' });
  try {
    await pool.query(
      'UPDATE school_members SET role=$1 WHERE school_id=$2 AND user_id=$3',
      [role, req.params.id, req.params.userId]
    );
    res.json({ message: 'Rôle mis à jour' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE retirer un membre
router.delete('/:id/members/:userId', authMiddleware, isSuperAdmin, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM school_members WHERE school_id=$1 AND user_id=$2',
      [req.params.id, req.params.userId]
    );
    res.json({ message: 'Membre retiré' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ─── ROUTES /my/* — données de l'école de l'utilisateur connecté ───

// GET mon école complète (infos + membres + stats)
router.get('/my/full', authMiddleware, async (req, res) => {
  try {
    const sm = await pool.query(
      'SELECT school_id, role FROM school_members WHERE user_id=$1 LIMIT 1',
      [req.user.id]
    );
    if (!sm.rows[0]) return res.status(404).json({ error: 'Tu n\'es pas dans une école' });
    const { school_id, role } = sm.rows[0];

    const [school, members, examCount, assignCount, courseCount] = await Promise.all([
      pool.query('SELECT * FROM schools WHERE id=$1', [school_id]),
      pool.query(`
        SELECT u.id, u.username, u.email, u.score,
               sm2.role as school_role, sm2.joined_at
        FROM school_members sm2
        JOIN users u ON u.id = sm2.user_id
        WHERE sm2.school_id = $1
        ORDER BY sm2.role ASC, u.score DESC
      `, [school_id]),
      pool.query('SELECT COUNT(*)::int as c FROM exams WHERE school_id=$1 AND status=$2', [school_id, 'active']),
      pool.query('SELECT COUNT(*)::int as c FROM assignments WHERE school_id=$1', [school_id]),
      pool.query('SELECT COUNT(*)::int as c FROM courses WHERE school_id=$1 AND is_published=true', [school_id]),
    ]);

    res.json({
      school: school.rows[0],
      my_role: role,
      members: members.rows,
      stats: {
        students: members.rows.filter(m => m.school_role === 'student').length,
        teachers: members.rows.filter(m => m.school_role === 'teacher').length,
        exams: examCount.rows[0].c,
        assignments: assignCount.rows[0].c,
        courses: courseCount.rows[0].c,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET classement de mon école
router.get('/my/leaderboard', authMiddleware, async (req, res) => {
  try {
    const sm = await pool.query(
      'SELECT school_id FROM school_members WHERE user_id=$1 LIMIT 1',
      [req.user.id]
    );
    if (!sm.rows[0]) return res.status(404).json({ error: 'Non membre' });
    const school_id = sm.rows[0].school_id;

    const result = await pool.query(`
      SELECT u.id, u.username, u.score,
             COUNT(DISTINCT es.exam_id) FILTER (WHERE es.status='finished')::int as exams_done,
             COALESCE(SUM(es.score) FILTER (WHERE es.status='finished'), 0)::int as exam_score,
             COUNT(DISTINCT cert.id)::int as certificates,
             sm2.joined_at
      FROM school_members sm2
      JOIN users u ON u.id = sm2.user_id
      LEFT JOIN exam_sessions es ON es.user_id = u.id
      LEFT JOIN certificates cert ON cert.user_id = u.id
      WHERE sm2.school_id = $1 AND sm2.role = 'student'
      GROUP BY u.id, u.username, u.score, sm2.joined_at
      ORDER BY exam_score DESC, u.score DESC
    `, [school_id]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET feed activité de mon école
router.get('/my/feed', authMiddleware, async (req, res) => {
  try {
    const sm = await pool.query(
      'SELECT school_id FROM school_members WHERE user_id=$1 LIMIT 1',
      [req.user.id]
    );
    if (!sm.rows[0]) return res.status(404).json({ error: 'Non membre' });
    const school_id = sm.rows[0].school_id;

    const [exams, assignments, courses, certs] = await Promise.all([
      pool.query(`
        SELECT 'exam' as type, id, title, created_at, status,
               'Nouvel examen disponible' as subtitle
        FROM exams WHERE school_id=$1 AND status='active'
        ORDER BY created_at DESC LIMIT 5
      `, [school_id]),
      pool.query(`
        SELECT 'assignment' as type, id, title, created_at,
               'Devoir à rendre' as subtitle, due_date
        FROM assignments WHERE school_id=$1
        ORDER BY created_at DESC LIMIT 5
      `, [school_id]),
      pool.query(`
        SELECT 'course' as type, id, title, created_at,
               'Nouveau cours publié' as subtitle
        FROM courses WHERE school_id=$1 AND is_published=true
        ORDER BY created_at DESC LIMIT 5
      `, [school_id]),
      pool.query(`
        SELECT 'certificate' as type, c.id, e.title, c.created_at,
               'Certificat obtenu' as subtitle, u.username
        FROM certificates c
        JOIN exams e ON e.id = c.exam_id
        JOIN users u ON u.id = c.user_id
        JOIN school_members sm2 ON sm2.user_id = c.user_id AND sm2.school_id = $1
        ORDER BY c.created_at DESC LIMIT 5
      `, [school_id]),
    ]);

    const feed = [
      ...exams.rows,
      ...assignments.rows,
      ...courses.rows,
      ...certs.rows,
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 20);

    res.json(feed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET certificats des étudiants (teacher/admin)
router.get('/my/certificates', authMiddleware, async (req, res) => {
  try {
    const sm = await pool.query(
      'SELECT school_id, role FROM school_members WHERE user_id=$1 LIMIT 1',
      [req.user.id]
    );
    if (!sm.rows[0]) return res.status(404).json({ error: 'Non membre' });
    if (sm.rows[0].role !== 'teacher' && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Réservé aux enseignants' });
    }

    const result = await pool.query(`
      SELECT c.*, u.username, u.email, e.title as exam_title
      FROM certificates c
      JOIN users u ON u.id = c.user_id
      JOIN exams e ON e.id = c.exam_id
      JOIN school_members sm2 ON sm2.user_id = c.user_id AND sm2.school_id = $1
      ORDER BY c.created_at DESC
    `, [sm.rows[0].school_id]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ─── ROUTES PUBLIQUES (sans auth) ─────────────────────

// GET toutes les écoles actives (page listing)
router.get('/public', async (req, res) => {
  try {
    // Ensure column exists
    await pool.query(`ALTER TABLE schools ADD COLUMN IF NOT EXISTS allowed_domain VARCHAR(100) DEFAULT NULL`).catch(()=>{});
    const result = await pool.query(`
      SELECT s.id, s.name, s.city, s.country, s.plan,
             s.allowed_domain, s.is_active,
             COUNT(sm.user_id) FILTER (WHERE sm.role='student')::int as student_count,
             COUNT(sm.user_id) FILTER (WHERE sm.role='teacher')::int as teacher_count
      FROM schools s
      LEFT JOIN school_members sm ON sm.school_id = s.id
      WHERE s.is_active = true
      GROUP BY s.id
      ORDER BY s.name ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET une école par ID (page portail)
router.get('/public/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, city, country, plan, allowed_domain, is_active,
              COUNT(sm.user_id) FILTER (WHERE sm.role='student')::int as student_count,
              COUNT(sm.user_id) FILTER (WHERE sm.role='teacher')::int as teacher_count
       FROM schools s
       LEFT JOIN school_members sm ON sm.school_id = s.id
       WHERE s.id = $1 AND s.is_active = true
       GROUP BY s.id`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'École introuvable' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST register depuis portail école
router.post('/portal/:id/register', async (req, res) => {
  const { username, email, password, role } = req.body;
  if (!username || !email || !password || !role)
    return res.status(400).json({ error: 'Tous les champs sont requis' });
  if (!['student', 'teacher'].includes(role))
    return res.status(400).json({ error: 'Rôle invalide' });

  try {
    const school = await pool.query('SELECT * FROM schools WHERE id=$1 AND is_active=true', [req.params.id]);
    if (!school.rows[0]) return res.status(404).json({ error: 'École introuvable' });
    const s = school.rows[0];

    // Vérif domaine
    if (s.allowed_domain) {
      const domain = email.split('@')[1]?.toLowerCase();
      const allowed = s.allowed_domain.toLowerCase().replace('@','');
      if (domain !== allowed)
        return res.status(403).json({ error: `Seuls les emails @${allowed} sont autorisés` });
    }

    // Vérif limite
    const count = await pool.query("SELECT COUNT(*) FROM school_members WHERE school_id=$1 AND role='student'", [s.id]);
    if (role === 'student' && parseInt(count.rows[0].count) >= s.max_students)
      return res.status(403).json({ error: 'Limite d\'étudiants atteinte' });

    // Vérif email/username unique
    const exists = await pool.query('SELECT id FROM users WHERE email=$1 OR username=$2', [email, username]);
    if (exists.rows[0]) return res.status(400).json({ error: 'Email ou nom d\'utilisateur déjà pris' });

    const bcrypt = require('bcrypt');
    const jwt = require('jsonwebtoken');
    const hash = await bcrypt.hash(password, 10);

    const user = await pool.query(
      `INSERT INTO users (username, email, password_hash, role, email_verified)
       VALUES ($1,$2,$3,$4,true) RETURNING *`,
      [username, email, hash, role === 'teacher' ? 'teacher' : 'user']
    );

    await pool.query(
      'INSERT INTO school_members (school_id, user_id, role) VALUES ($1,$2,$3)',
      [s.id, user.rows[0].id, role]
    );

    const token = jwt.sign(
      { id: user.rows[0].id, username, role: user.rows[0].role, school_id: s.id, school_role: role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.rows[0].id, username, email, role: user.rows[0].role, school_id: s.id, school_role: role, score: 0 },
      school: { id: s.id, name: s.name }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST login depuis portail école
router.post('/portal/:id/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });

  try {
    const school = await pool.query('SELECT * FROM schools WHERE id=$1 AND is_active=true', [req.params.id]);
    if (!school.rows[0]) return res.status(404).json({ error: 'École introuvable' });
    const s = school.rows[0];

    // Vérif domaine
    if (s.allowed_domain) {
      const domain = email.split('@')[1]?.toLowerCase();
      const allowed = s.allowed_domain.toLowerCase().replace('@','');
      if (domain !== allowed)
        return res.status(403).json({ error: `Seuls les emails @${allowed} sont autorisés` });
    }

    const userRes = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    if (!userRes.rows[0]) return res.status(400).json({ error: 'Email introuvable' });
    const user = userRes.rows[0];

    const bcrypt = require('bcrypt');
    const jwt = require('jsonwebtoken');
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(400).json({ error: 'Mot de passe incorrect' });

    // Vérif membre école
    const member = await pool.query(
      'SELECT role FROM school_members WHERE school_id=$1 AND user_id=$2',
      [s.id, user.id]
    );
    if (!member.rows[0]) return res.status(403).json({ error: 'Tu n\'es pas membre de cette école' });

    const school_role = member.rows[0].role;

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, school_id: s.id, school_role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role, school_id: s.id, school_role, score: user.score || 0 },
      school: { id: s.id, name: s.name }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;