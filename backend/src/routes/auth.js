const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../db/pool');

const authMiddleware = require('../middleware/auth');
const { sendVerificationEmail, transporter } = require('../utils/mailer');


// ───────────────── REGISTER ─────────────────
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Tous les champs sont requis' });
  }

  try {
    const hash = await bcrypt.hash(password, 12);
    const emailToken = crypto.randomBytes(32).toString('hex');

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, email_verify_token, email_verified, role)
       VALUES ($1, $2, $3, $4, true, 'user')
       RETURNING id, username, email, score, role, email_verified`,
      [username, email, hash, emailToken]
    );

    const user = result.rows[0];

    // Envoi email en arrière-plan (non bloquant)
    sendVerificationEmail(email, username, emailToken).catch(err => {
      console.error('Email error:', err.message);
    });

    res.json({
      message: 'Compte créé avec succès ! Tu peux maintenant te connecter.',
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });

  } catch (err) {
    console.error('Register error:', err.message, err.stack);
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
       SET email_verified = true, email_verify_token = null
       WHERE email_verify_token = $1
       RETURNING id`,
      [token]
    );

    if (!result.rows[0]) {
      return res.status(400).json({ error: 'Token invalide ou déjà utilisé' });
    }

    res.json({
      message: 'Email vérifié avec succès ! Tu peux maintenant te connecter.'
    });

  } catch (err) {
    console.error('Verify error:', err.message, err.stack);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});


// ───────────────── LOGIN ─────────────────
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $1',
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

    // Récupérer le rôle école si membre
    const schoolMember = await pool.query(
      'SELECT school_id, role as school_role FROM school_members WHERE user_id=$1 LIMIT 1',
      [user.id]
    );
    const sm = schoolMember.rows[0] || {};

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        is_admin: user.role === 'superadmin' || user.role === 'manager',
        school_id: sm.school_id || null,
        school_role: sm.school_role || null,
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
        is_admin: user.role === 'superadmin' || user.role === 'manager',
        school_id: sm.school_id || null,
        school_role: sm.school_role || null,
      }
    });

  } catch (err) {
    console.error('Login error:', err.message, err.stack);
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
router.post('/resend-verification', async (req, res) => {
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
      'UPDATE users SET email_verify_token = $1 WHERE email = $2',
      [emailToken, email]
    );

    await sendVerificationEmail(email, user.username, emailToken);

    res.json({ message: 'Email de vérification renvoyé !' });

  } catch (err) {
    console.error('Resend error:', err.message, err.stack);
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



// ─── MOT DE PASSE OUBLIÉ ──────────────────────────────

// POST /auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requis' });

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    // Répondre immédiatement — ne pas révéler si l'email existe
    res.json({ message: 'Si cet email existe, un lien a été envoyé.' });

    // Envoyer l'email en arrière-plan seulement si l'user existe
    if (!result.rows[0]) return;

    const user = result.rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1h

    await pool.query(
      'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
      [token, expires, user.id]
    );

    const url = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    transporter.sendMail({
      from: `"NKTCTF" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: '🔑 NKTCTF — Réinitialisation de mot de passe',
      html: `
        <div style="background:#080d14;color:#c9d8e8;font-family:monospace;padding:40px;max-width:500px;margin:0 auto;border:1px solid #1a2a3a;border-radius:8px;">
          <div style="text-align:center;margin-bottom:30px;">
            <h1 style="color:#00ff88;font-size:28px;letter-spacing:4px;margin:0;">NKTCTF</h1>
            <p style="color:#4a6070;font-size:11px;letter-spacing:6px;margin:5px 0;">WHERE HACKERS RISE</p>
          </div>
          <div style="border-top:1px solid #1a2a3a;padding-top:25px;">
            <p style="color:#c9d8e8;">Salut <strong style="color:#00ff88;">${user.username}</strong>,</p>
            <p style="color:#4a6070;font-size:13px;">Tu as demandé à réinitialiser ton mot de passe.</p>
            <div style="text-align:center;margin:30px 0;">
              <a href="${url}" style="background:#00ff88;color:#080d14;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:700;font-size:13px;letter-spacing:2px;">
                RÉINITIALISER MON MOT DE PASSE
              </a>
            </div>
            <p style="color:#4a6070;font-size:11px;">Ou copie ce lien :</p>
            <p style="color:#00d4ff;font-size:11px;word-break:break-all;">${url}</p>
            <p style="color:#4a6070;font-size:11px;margin-top:20px;">⚠️ Expire dans 1 heure.</p>
          </div>
        </div>
      `,
    }).catch(err => console.error('Email send error:', err));

  } catch (err) {
    console.error('Forgot password error:', err);
    // Ne pas retourner d'erreur si res déjà envoyé
  }
});

// POST /auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token et mot de passe requis' });
  if (password.length < 6) return res.status(400).json({ error: 'Minimum 6 caractères' });

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
      [token]
    );
    if (!result.rows[0]) return res.status(400).json({ error: 'Lien invalide ou expiré' });

    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
      [hash, result.rows[0].id]
    );

    res.json({ message: 'Mot de passe mis à jour !' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;