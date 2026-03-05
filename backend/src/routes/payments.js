const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const authMiddleware = require('../middleware/auth');

const PLANS = {
  pro: { monthly: 5, yearly: 40, label: 'PRO' },
  elite: { monthly: 15, yearly: 100, label: 'ELITE' },
};

// GET mon plan actuel
router.get('/my-plan', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.* FROM subscriptions s
       WHERE s.user_id = $1 AND s.status = 'active' AND s.expires_at > NOW()
       ORDER BY s.created_at DESC LIMIT 1`,
      [req.user.id]
    );
    const user = await pool.query('SELECT plan FROM users WHERE id = $1', [req.user.id]);
    res.json({
      subscription: result.rows[0] || null,
      plan: user.rows[0]?.plan || 'free'
    });
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── PAYPAL ───────────────────────────────────────────

const getPayPalToken = async () => {
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64');

  const res = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json();
  return data.access_token;
};

// POST — Créer ordre PayPal
router.post('/paypal/create-order', authMiddleware, async (req, res) => {
  const { plan, period } = req.body;
  if (!PLANS[plan]) return res.status(400).json({ error: 'Plan invalide' });

  const amount = period === 'yearly' ? PLANS[plan].yearly : PLANS[plan].monthly;

  try {
    const access_token = await getPayPalToken();

    const orderRes = await fetch('https://api-m.sandbox.paypal.com/v2/checkout/orders', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: 'USD',
            value: amount.toFixed(2)
          },
          description: `NKTCTF ${PLANS[plan].label} — ${period === 'yearly' ? 'Annuel' : 'Mensuel'}`,
        }],
        application_context: {
          return_url: `${process.env.FRONTEND_URL}/payment/success`,
          cancel_url: `${process.env.FRONTEND_URL}/pricing`,
          brand_name: 'NKTCTF',
          user_action: 'PAY_NOW',
        }
      }),
    });

    const order = await orderRes.json();
    if (!order.id) return res.status(500).json({ error: 'Erreur création ordre PayPal' });

    const approveUrl = order.links.find(l => l.rel === 'approve')?.href;
    res.json({ order_id: order.id, approve_url: approveUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST — Capturer paiement PayPal
router.post('/paypal/capture-order', authMiddleware, async (req, res) => {
  const { order_id, plan, period } = req.body;

  try {
    const access_token = await getPayPalToken();

    const captureRes = await fetch(
      `https://api-m.sandbox.paypal.com/v2/checkout/orders/${order_id}/capture`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        },
      }
    );

    const capture = await captureRes.json();
    if (capture.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Paiement non complété' });
    }

    const amount = capture.purchase_units[0].payments.captures[0].amount.value;
    const months = period === 'yearly' ? 12 : 1;
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + months);

    await pool.query(
      `INSERT INTO subscriptions (user_id, plan, payment_method, payment_id, amount, status, expires_at)
       VALUES ($1, $2, 'paypal', $3, $4, 'active', $5)`,
      [req.user.id, plan, order_id, amount, expiresAt]
    );

    await pool.query('UPDATE users SET plan = $1 WHERE id = $2', [plan, req.user.id]);

    res.json({ message: 'Abonnement activé !', plan, expires_at: expiresAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── BANKILY / SEDAD (Manuel) ──────────────────────────

router.post('/local/submit', authMiddleware, async (req, res) => {
  const { plan, period, method, transaction_ref, phone } = req.body;

  if (!['bankily', 'sedad'].includes(method))
    return res.status(400).json({ error: 'Méthode invalide' });

  if (!transaction_ref)
    return res.status(400).json({ error: 'Référence de transaction requise' });

  if (!PLANS[plan])
    return res.status(400).json({ error: 'Plan invalide' });

  try {
    const amount = period === 'yearly' ? PLANS[plan].yearly : PLANS[plan].monthly;

    const existing = await pool.query(
      'SELECT id FROM subscriptions WHERE transaction_ref = $1',
      [transaction_ref]
    );
    if (existing.rows[0]) {
      return res.status(400).json({ error: 'Cette référence a déjà été soumise' });
    }

    await pool.query(
      `INSERT INTO subscriptions (user_id, plan, payment_method, amount, status, transaction_ref, expires_at)
       VALUES ($1, $2, $3, $4, 'pending', $5, NOW() + INTERVAL '30 days')`,
      [req.user.id, plan, method, amount, transaction_ref]
    );

    res.json({
      message: `Paiement ${method} soumis ! En attente de vérification par l'admin (24-48h).`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ADMIN ─────────────────────────────────────────────

router.get('/admin/all', authMiddleware, async (req, res) => {
  if (req.user.role !== 'superadmin')
    return res.status(403).json({ error: 'Accès refusé' });

  const result = await pool.query(`
    SELECT s.*, u.username, u.email
    FROM subscriptions s
    JOIN users u ON u.id = s.user_id
    ORDER BY s.created_at DESC
  `);
  res.json(result.rows);
});

router.patch('/admin/approve/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'superadmin')
    return res.status(403).json({ error: 'Accès refusé' });

  try {
    const result = await pool.query(
      `UPDATE subscriptions SET status = 'active', expires_at = NOW() + INTERVAL '30 days'
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    const sub = result.rows[0];
    if (sub) await pool.query('UPDATE users SET plan = $1 WHERE id = $2', [sub.plan, sub.user_id]);
    res.json({ message: 'Abonnement approuvé !' });
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.patch('/admin/reject/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'superadmin')
    return res.status(403).json({ error: 'Accès refusé' });

  await pool.query(
    "UPDATE subscriptions SET status = 'rejected' WHERE id = $1",
    [req.params.id]
  );
  res.json({ message: 'Paiement rejeté' });
});

module.exports = router;