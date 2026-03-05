const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../db/pool');

const authMiddleware = require('../middleware/auth'); // ✅ IMPORTANT
const { authLimiter } = require('../middleware/rateLimit');
const { sendVerificationEmail } = require('../utils/mailer');


// ───────────────── REGISTER ─────────────────
router.post('/register', authLimiter, async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Tous les champs sont requis' });
  }

  try {
    const hash = await bcrypt.hash(password, 12);
    const emailToken = crypto.randomBytes(32).toString('hex');

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, email_verify_token, email_verified, role)
       VALUES ($1, $2, $3, $4, false, 'user')
       RETURNING id, username, email, score, role, email_verified`,
      [username, email, hash, emailToken]
    );

    const user = result.rows[0];

    try {
      await sendVerificationEmail(email, username, emailToken);
    } catch (mailErr) {
      console.error('Email error:', mailErr.message);
    }

    res.json({
      message: 'Compte créé ! Vérifie ton email pour activer ton compte.',
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });

  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Username ou email déjà utilisé' });
    }
    res.status(500).json({ error: 'Erreur serveur' });
  }
});


// ───────────────── VERIFY EMAIL ─────────────────
router.get('/verify-email', async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: 'Token manquant' });
  }

  try {
    const result = await pool.query(
      `UPDATE users
       SET email_verified = true, email_token = null
       WHERE email_token = $1
       RETURNING id`,
      [token]
    );

    if (!result.rows[0]) {
      return res.status(400).json({ error: 'Token invalide ou déjà utilisé' });
    }

    res.json({
      message: 'Email vérifié avec succès ! Tu peux maintenant te connecter.'
    });

  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});


// ───────────────── LOGIN ─────────────────
router.post('/login', authLimiter, async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ error: 'Utilisateur introuvable' });
    }

    if (!user.email_verified) {
      return res.status(400).json({ error: 'Email non vérifié. Vérifie ta boîte mail !' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(400).json({ error: 'Mot de passe incorrect' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        is_admin: user.role === 'superadmin' || user.role === 'manager'
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        score: user.score,
        role: user.role,
        is_admin: user.role === 'superadmin' || user.role === 'manager'
      }
    });

  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});


// ───────────────── ME ─────────────────
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, email, score, role, email_verified, created_at
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );

    res.json(result.rows[0]);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ───────────────── RESEND VERIFICATION ─────────────────
router.post('/resend-verification', authLimiter, async (req, res) => {
  const { email } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ error: 'Email introuvable' });
    }

    if (user.email_verified) {
      return res.status(400).json({ error: 'Email déjà vérifié' });
    }

    const emailToken = crypto.randomBytes(32).toString('hex');

    await pool.query(
      'UPDATE users SET email_token = $1 WHERE email = $2',
      [emailToken, email]
    );

    await sendVerificationEmail(email, user.username, emailToken);

    res.json({ message: 'Email de vérification renvoyé !' });

  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});


// ───────────────── UPDATE USERNAME ─────────────────
router.patch('/update-username', authMiddleware, async (req, res) => {
  const { username } = req.body;

  if (!username || username.length < 3) {
    return res.status(400).json({ error: 'Username trop court (min 3 caractères)' });
  }

  try {
    const existing = await pool.query(
      'SELECT id FROM users WHERE username = $1 AND id != $2',
      [username, req.user.id]
    );

    if (existing.rows[0]) {
      return res.status(400).json({ error: 'Username déjà pris' });
    }

    await pool.query(
      'UPDATE users SET username = $1 WHERE id = $2',
      [username, req.user.id]
    );

    res.json({ message: 'Username mis à jour !' });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ───────────────── UPDATE PASSWORD ─────────────────
router.patch('/update-password', authMiddleware, async (req, res) => {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Champs requis manquants' });
  }

  if (new_password.length < 6) {
    return res.status(400).json({ error: 'Minimum 6 caractères' });
  }

  try {
    const user = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    );

    const valid = await bcrypt.compare(
      current_password,
      user.rows[0].password_hash
    );

    if (!valid) {
      return res.status(400).json({ error: 'Mot de passe actuel incorrect' });
    }

    const hash = await bcrypt.hash(new_password, 12);

    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [hash, req.user.id]
    );

    res.json({ message: 'Mot de passe mis à jour !' });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;